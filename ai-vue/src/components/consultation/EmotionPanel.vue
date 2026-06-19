<template>
  <div class="emotion-garden">
    <div class="garden-header">
      <div class="garden-title">情绪花园</div>
    </div>

    <div class="emotion-info">
      <div class="emotion-name">{{ emotion.primaryEmotion || '中性' }}</div>
      <div class="emotion-score">{{ emotion.emotionScore ?? 50 }}</div>
    </div>

    <div class="warm-tips">
      <div class="emotion-status-text">
        <span class="status-label">今天感觉</span>
        <span class="status-emotion">{{ emotion.isNegative ? '需要关注' : '很不错' }}</span>
      </div>

      <div class="emotion-intensity">
        <span class="intensity-dots">
          <span
            v-for="dot in 3"
            :key="dot"
            class="dot"
            :class="{ active: getIntensityClass(emotion.emotionScore ?? 50) >= dot }"
          ></span>
        </span>
        <span class="intensity-text">{{ getRiskText(emotion.riskLevel ?? 0) }}</span>
      </div>

      <div v-if="emotion.suggestion" class="warm-suggestion">
        <div class="suggestion-icon">💝</div>
        <div class="suggestion-content">
          <div class="suggestion-title">给你的小建议</div>
          <div class="suggestion-text">{{ emotion.suggestion }}</div>
        </div>
      </div>

      <div v-if="emotion.improvementSuggestions?.length > 0" class="healing-actions">
        <div class="actions-title">治愈小行动</div>
        <div class="actions-list">
          <div v-for="action in emotion.improvementSuggestions" :key="action" class="action-item">
            <div class="action-icon">✨</div>
            <div class="action-text">{{ action }}</div>
          </div>
        </div>
      </div>

      <div v-if="emotion.isNegative && emotion.riskLevel > 1" class="risk-notice">
        <div class="notice-icon">🤗</div>
        <div class="notice-content">
          <div class="notice-title">温馨提示</div>
          <div class="notice-text">{{ emotion.riskDescription }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  emotion: {
    type: Object,
    required: true
  },
  getIntensityClass: {
    type: Function,
    required: true
  },
  getRiskText: {
    type: Function,
    required: true
  }
})
</script>

<style lang="scss" scoped>
.emotion-garden {
  background: linear-gradient(135deg, #fef9e7 0%, #fcf4e6 50%, #f6f0e8 100%);
  border-radius: 20px;
  padding: 16px;
  margin-bottom: 20px;
  box-shadow: 0 8px 32px rgba(252, 244, 230, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.2);
  position: relative;
  overflow: hidden;
  min-height: 300px;

  .garden-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    position: relative;
    z-index: 2;

    .garden-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 600;
      color: #8b4513;
    }
  }

  .emotion-info {
    margin: 0 auto;
    width: 80px;
    height: 80px;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 10;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    border: 2px solid rgba(255, 255, 255, 0.8);
    background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%);
    color: #fff;

    .emotion-name {
      font-size: 15px;
      font-weight: 600;
      line-height: 1;
      margin-bottom: 2px;
    }

    .emotion-score {
      font-size: 14px;
      font-weight: 700;
      opacity: 0.9;
    }
  }

  .warm-tips {
    text-align: center;
    margin-bottom: 16px;

    .emotion-status-text {
      margin-bottom: 12px;

      .status-label {
        font-size: 14px;
        color: #8b7355;
        margin-right: 8px;
      }

      .status-emotion {
        font-size: 16px;
        font-weight: 600;
        padding: 4px 12px;
        border-radius: 16px;
        display: inline-block;
      }
    }

    .emotion-intensity {
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;

      .intensity-dots {
        display: flex;
        gap: 4px;

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #e0e0e0;
          transition: all 0.3s ease;

          &.active {
            background: linear-gradient(135deg, #ff9a9e, #fecfef);
            transform: scale(1.2);
            box-shadow: 0 2px 8px rgba(255, 154, 158, 0.4);
          }
        }
      }

      .intensity-text {
        font-size: 12px;
        color: #8b7355;
        font-weight: 500;
      }
    }

    .warm-suggestion {
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.8));
      border-radius: 16px;
      padding: 12px;
      margin-bottom: 16px;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      border: 1px solid rgba(255, 255, 255, 0.6);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);

      .suggestion-icon {
        font-size: 20px;
        flex-shrink: 0;
        margin-top: 2px;
      }

      .suggestion-content {
        text-align: left;
        flex: 1;

        .suggestion-title {
          font-size: 14px;
          font-weight: 600;
          color: #8b7355;
          margin-bottom: 6px;
        }

        .suggestion-text {
          font-size: 13px;
          color: #6b5b47;
          line-height: 1.5;
        }
      }
    }

    .healing-actions {
      margin-bottom: 16px;

      .actions-title {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 600;
        color: #8b7355;
        margin-bottom: 16px;
      }

      .actions-list {
        display: flex;
        flex-direction: column;
        gap: 10px;

        .action-item {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.7));
          border-radius: 12px;
          padding: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid rgba(255, 255, 255, 0.5);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
          text-align: left;

          .action-icon {
            font-size: 14px;
            color: #ffd700;
            flex-shrink: 0;
          }

          .action-text {
            font-size: 12px;
            color: #6b5b47;
            line-height: 1.4;
            flex: 1;
          }
        }
      }
    }

    .risk-notice {
      background: linear-gradient(135deg, #fff9e6, #ffeaa7);
      border-radius: 16px;
      padding: 16px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      border: 1px solid rgba(255, 234, 167, 0.6);
      box-shadow: 0 6px 20px rgba(255, 234, 167, 0.3);

      .notice-icon {
        font-size: 20px;
        flex-shrink: 0;
        margin-top: 2px;
      }

      .notice-content {
        flex: 1;

        .notice-title {
          font-size: 14px;
          font-weight: 600;
          color: #d4840f;
          margin-bottom: 6px;
        }

        .notice-text {
          font-size: 13px;
          color: #b8740c;
          line-height: 1.5;
        }
      }
    }
  }
}
</style>
