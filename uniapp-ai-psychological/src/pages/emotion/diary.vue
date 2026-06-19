<template>
  <view class="diary-page">
    <view class="status-bar-placeholder"></view>
    <view class="page-header"
      ><text class="page-title">记录今天的心情</text></view
    >
    <view class="section mood-section">
      <text class="section-label">心情评分</text>
      <view class="mood-row">
        <view class="mood-numbers">
          <view
            v-for="n in 10"
            :key="n"
            :class="['mood-num', form.moodScore >= n ? 'active' : '']"
            @tap="form.moodScore = n"
            ><text>{{ n }}</text></view
          >
        </view>
        <text class="mood-label">{{ getMoodLabel(form.moodScore) }}</text>
      </view>
    </view>
    <view class="section">
      <text class="section-label">主要情绪</text>
      <view class="emotion-tags">
        <view
          v-for="e in emotions"
          :key="e"
          :class="['tag', form.dominantEmotion === e ? 'tag-active' : '']"
          @tap="form.dominantEmotion = e"
          ><text>{{ e }}</text></view
        >
      </view>
    </view>
    <view class="section"
      ><text class="section-label">今天想记录什么</text
      ><textarea
        v-model="form.diaryContent"
        placeholder="记录今天的心情..."
        class="diary-textarea"
        :maxlength="500"
      />
    </view>
    <view class="section metrics-row">
      <view class="metric-item"
        ><text class="metric-label">睡眠质量</text
        ><view class="metric-dots"
          ><view
            v-for="n in 5"
            :key="n"
            :class="['dot', form.sleepQuality >= n ? 'active' : '']"
            @tap="form.sleepQuality = n" /></view
      ></view>
      <view class="metric-item"
        ><text class="metric-label">压力等级</text
        ><view class="metric-dots"
          ><view
            v-for="n in 5"
            :key="n"
            :class="['dot stress', form.stressLevel >= n ? 'active' : '']"
            @tap="form.stressLevel = n" /></view
      ></view>
    </view>
    <button
      class="submit-btn"
      @tap="handleSubmit"
      :loading="submitting"
      :disabled="submitting"
    >
      保存日记
    </button>
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { addEmotionDiary } from "@/api/emotion-diary";
const emotions = [
  "开心",
  "平静",
  "焦虑",
  "低落",
  "愤怒",
  "疲惫",
  "感恩",
  "孤独",
];
const form = ref({
  moodScore: 5,
  dominantEmotion: "",
  diaryContent: "",
  sleepQuality: 3,
  stressLevel: 3,
});
const submitting = ref(false);
const getMoodLabel = (s: number) =>
  s <= 2
    ? "很差"
    : s <= 4
      ? "不太好"
      : s <= 6
        ? "一般"
        : s <= 8
          ? "不错"
          : "很好";
const handleSubmit = async () => {
  if (!form.value.dominantEmotion) {
    uni.showToast({ title: "请选择主要情绪", icon: "none" });
    return;
  }
  if (!form.value.diaryContent.trim()) {
    uni.showToast({ title: "请记录今天的心情", icon: "none" });
    return;
  }
  submitting.value = true;
  try {
    await addEmotionDiary({
      moodScore: form.value.moodScore,
      moodLabel: form.value.dominantEmotion,
      content: form.value.diaryContent,
      dominantEmotion: form.value.dominantEmotion,
      emotionTriggers: "",
      sleepQuality: String(form.value.sleepQuality),
      stressLevel: String(form.value.stressLevel),
      diaryDate: new Date().toISOString().split("T")[0],
    });
    uni.showToast({ title: "保存成功", icon: "success" });
    form.value = {
      moodScore: 5,
      dominantEmotion: "",
      diaryContent: "",
      sleepQuality: 3,
      stressLevel: 3,
    };
  } catch (e) {
    console.error("保存失败:", e);
  } finally {
    submitting.value = false;
  }
};
</script>

<style lang="scss" scoped>
.diary-page {
  padding: 32rpx;
  min-height: 100vh;
  background: #f5f5f5;
  .status-bar-placeholder {
    height: var(--status-bar-height, 44px);
    background: #f5f5f5;
    margin-left: -32rpx;
    margin-right: -32rpx;
    margin-top: -32rpx;
  }
}
.page-header {
  margin-bottom: 32rpx;
  .page-title {
    font-size: 40rpx;
    font-weight: bold;
    color: #303133;
  }
}
.section {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx 32rpx;
  margin-bottom: 24rpx;
  .section-label {
    font-size: 28rpx;
    font-weight: 500;
    color: #303133;
    display: block;
    margin-bottom: 20rpx;
  }
}
.mood-row {
  .mood-numbers {
    display: flex;
    justify-content: space-between;
    margin-bottom: 16rpx;
    .mood-num {
      width: 56rpx;
      height: 56rpx;
      border-radius: 50%;
      background: #f5f5f5;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24rpx;
      color: #909399;
      &.active {
        background: #4a90d9;
        color: #fff;
      }
    }
  }
  .mood-label {
    text-align: center;
    font-size: 28rpx;
    color: #4a90d9;
    display: block;
  }
}
.emotion-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  .tag {
    padding: 12rpx 28rpx;
    border-radius: 32rpx;
    background: #f5f5f5;
    font-size: 26rpx;
    color: #303133;
    &.tag-active {
      background: rgba(74, 144, 217, 0.1);
      color: #4a90d9;
      border: 2rpx solid #4a90d9;
    }
  }
}
.diary-textarea {
  width: 100%;
  height: 240rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 28rpx;
  box-sizing: border-box;
  line-height: 1.6;
}
.metrics-row {
  display: flex;
  justify-content: space-between;
  .metric-item {
    flex: 1;
    .metric-label {
      font-size: 26rpx;
      color: #909399;
      display: block;
      margin-bottom: 16rpx;
    }
    .metric-dots {
      display: flex;
      gap: 16rpx;
      .dot {
        width: 40rpx;
        height: 40rpx;
        border-radius: 50%;
        background: #f5f5f5;
        &.active {
          background: #67c23a;
        }
        &.stress.active {
          background: #e6a23c;
        }
      }
    }
  }
}
.submit-btn {
  width: 100%;
  height: 88rpx;
  background: #4a90d9;
  color: #fff;
  font-size: 32rpx;
  font-weight: bold;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 40rpx;
  border: none;
  &::after {
    border: none;
  }
}
</style>
