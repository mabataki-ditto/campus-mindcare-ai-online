/*
  ESP32 环境感知节点 —— 校园AI心理陪伴系统
  目标板 : ESP32 Dev Module (WROOM-32)
  链路   : DHT22 + BH1750 + SEN0232 -> PubSubClient -> Mosquitto -> Express 后端
  依赖库 : WiFi(核心自带) Wire(核心自带) DHT sensor library(Adafruit)
           Adafruit Unified Sensor BH1750(Christopher Laws) PubSubClient 2.8
*/

#include <WiFi.h>
#include <Wire.h>
#include <time.h>
#include <DHT.h>
#include <BH1750.h>
#include <PubSubClient.h>

// ==================== 配置区：烧录前只改这几行 ====================
static const char *WIFI_SSID = "REPLACE_ME";
static const char *WIFI_PASS = "REPLACE_ME";

static const char *MQTT_HOST = "192.168.1.100";  // 跑 Mosquitto 的那台机器的局域网 IP
static const uint16_t MQTT_PORT = 1883;
static const char *MQTT_USER = "";               // Broker 未开认证就留空
static const char *MQTT_PASS = "";

static const char *DEVICE_ID = "esp32-node-01";  // 必须与后端设备表中的 deviceId 一致
// ================================================================

// ---------- 引脚 ----------
#define PIN_DHT 4
#define PIN_LED 2
#define PIN_SDA 21
#define PIN_SCL 22

// GPIO34 属于 ADC1。ADC2 的引脚在 WiFi 驱动工作时会读出一堆垃圾值，必须避开
#define PIN_NOISE 34

// ---------- 采集参数 ----------
#define SAMPLE_INTERVAL_MS 30000UL
#define MQTT_RETRY_MS 5000UL
#define NTP_TZ_OFFSET_SEC (8 * 3600)

// ---------- SEN0232 换算 ----------
// 该模块出厂不带标定，下面两个常数必须拿声级计或手机分贝 App 现场校准后才可信
#define NOISE_DB_FLOOR 30.0
#define NOISE_MV_PER_DB 50.0
#define NOISE_SAMPLES 256
#define NOISE_WINDOW_MS 200

// ---------- MQTT 主题 ----------
#define TOPIC_ROOT "mindcare/v1/"

static DHT dht(PIN_DHT, DHT22);
static BH1750 lightMeter;
static WiFiClient net;
static PubSubClient mqtt(net);

static char topicTelemetry[96];
static char topicStatus[96];
static uint32_t lastSampleAt = 0;
static uint32_t lastMqttAttempt = 0;
static uint8_t consecutiveSensorErrors = 0;

void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED, OUTPUT);

  analogReadResolution(11);
  analogSetAttenuation(ADC_11db);

  snprintf(topicTelemetry, sizeof(topicTelemetry), TOPIC_ROOT "%s/telemetry", DEVICE_ID);
  snprintf(topicStatus, sizeof(topicStatus), TOPIC_ROOT "%s/status", DEVICE_ID);

  dht.begin();
  Wire.begin(PIN_SDA, PIN_SCL);
  if (!lightMeter.begin()) {
    Serial.println("[WARN] BH1750 未响应，检查 I2C 接线与地址");
  }

  connectWiFi();

  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setBufferSize(512);
  mqtt.setKeepAlive(60);
  ensureMqtt();

  // SNTP 对时：没有真实时间戳，后端无法把环境数据和情绪日记做时间对齐
  configTime(NTP_TZ_OFFSET_SEC, 0, "ntp.aliyun.com", "pool.ntp.org");
}

void loop() {
  mqtt.loop();

  if (!mqtt.connected() && millis() - lastMqttAttempt > MQTT_RETRY_MS) {
    lastMqttAttempt = millis();
    if (WiFi.status() != WL_CONNECTED) connectWiFi();
    ensureMqtt();
  }

  if (millis() - lastSampleAt >= SAMPLE_INTERVAL_MS) {
    lastSampleAt = millis();
    sampleAndPublish();
  }
}

void connectWiFi() {
  Serial.printf("[WiFi] 连接 %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  uint32_t deadline = millis() + 20000UL;
  while (WiFi.status() != WL_CONNECTED && millis() < deadline) {
    delay(300);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WiFi] 已连接  IP=%s  RSSI=%d\n",
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());
  } else {
    Serial.println("\n[WiFi] 连接超时，稍后在 loop 中重试");
  }
}

void ensureMqtt() {
  char statusPayload[96];

  // 遗嘱消息：设备掉电或断网时由 Broker 代发 offline，后端据此翻转在线状态
  snprintf(statusPayload, sizeof(statusPayload),
           "{\"deviceId\":\"%s\",\"state\":\"offline\"}", DEVICE_ID);

  for (uint8_t attempt = 1; attempt <= 3 && !mqtt.connected(); attempt++) {
    bool ok = MQTT_USER[0]
                  ? mqtt.connect(DEVICE_ID, MQTT_USER, MQTT_PASS, topicStatus, 1, true, statusPayload)
                  : mqtt.connect(DEVICE_ID, topicStatus, 1, true, statusPayload);
    if (ok) {
      snprintf(statusPayload, sizeof(statusPayload),
               "{\"deviceId\":\"%s\",\"state\":\"online\"}", DEVICE_ID);
      mqtt.publish(topicStatus, statusPayload, true);
      Serial.println("[MQTT] 已连接并上报 online");
      return;
    }
    Serial.printf("[MQTT] 连接失败 rc=%d\n", mqtt.state());
    delay(1000);
  }
}

void sampleAndPublish() {
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  float light = lightMeter.readLightLevel();
  float noise = readNoiseDb();

  // DHT 失败返回 NAN；BH1750 失败返回 -1/-2 而非 NAN，两者判法不同。
  // 照度不可能为负，故 light < 0 即为读取失败
  bool valid = !isnan(temperature) && !isnan(humidity) && light >= 0.0;
  if (!valid) {
    consecutiveSensorErrors++;
    Serial.printf("[SENSOR] 读数无效，本次不上报 (连续 %d 次)\n", consecutiveSensorErrors);
    if (consecutiveSensorErrors >= 5) Serial.println("[SENSOR] 连续失败过多，检查接线与供电");
    return;
  }
  consecutiveSensorErrors = 0;

  // SNTP 未同步成功时 time() 会返回 1970 年附近的小值，
  // 这种时间戳一旦入库，后端与情绪日记的时间对齐就会整体错位，所以宁可不报
  time_t nowEpoch = time(nullptr);
  if (nowEpoch < 1700000000) {
    Serial.println("[TIME] SNTP 尚未同步，本次不上报");
    return;
  }

  char payload[256];
  snprintf(payload, sizeof(payload),
           "{\"deviceId\":\"%s\",\"ts\":%llu,\"temperature\":%.2f,\"humidity\":%.2f,"
           "\"light\":%.2f,\"noise\":%.2f,\"rssi\":%d,\"quality\":\"ok\"}",
           DEVICE_ID, (unsigned long long)nowEpoch, temperature, humidity,
           light, noise, WiFi.RSSI());

  if (mqtt.publish(topicTelemetry, payload)) {
    digitalWrite(PIN_LED, HIGH);
    delay(80);
    digitalWrite(PIN_LED, LOW);
    Serial.printf("[PUB] %s\n", payload);
  } else {
    Serial.println("[PUB] 发布失败，等待重连");
  }
}

// SEN0232 输出的是随声压波动的模拟电压。单次 analogRead 只能抓到瞬时值，
// 必须在一个短窗口内取峰峰值才能反映响度，所以这里密集采样 200ms。
float readNoiseDb() {
  uint16_t minimum = 4095;
  uint16_t maximum = 0;
  uint32_t start = millis();

  for (uint16_t i = 0; i < NOISE_SAMPLES && millis() - start < NOISE_WINDOW_MS; i++) {
    uint16_t raw = analogRead(PIN_NOISE);
    if (raw < minimum) minimum = raw;
    if (raw > maximum) maximum = raw;
  }

  float vppMv = (maximum - minimum) * 3300.0f / 4095.0f;
  float db = NOISE_DB_FLOOR + vppMv / NOISE_MV_PER_DB;
  return constrain(db, 0.0f, 130.0f);
}
