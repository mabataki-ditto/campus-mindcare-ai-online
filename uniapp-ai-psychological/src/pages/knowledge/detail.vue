<template>
  <view class="detail-page">
    <view v-if="article" class="article-content">
      <text class="article-title">{{ article.title }}</text>
      <view class="article-meta"
        ><text class="meta-item">{{ article.categoryName }}</text
        ><text class="meta-item">{{ article.authorName || "佚名" }}</text
        ><text class="meta-item">{{ article.readCount }}次阅读</text></view
      >
      <view class="article-body"><rich-text :nodes="article.content" /></view>
    </view>
    <view v-else class="loading-tip"><text>加载中...</text></view>
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { getArticleDetail } from "@/api/knowledge";
const article = ref<any>(null);
onLoad((options: any) => {
  if (options?.id) loadArticle(options.id);
});
const loadArticle = async (id: number) => {
  try {
    article.value = await getArticleDetail(Number(id));
  } catch (e) {
    uni.showToast({ title: "加载失败", icon: "none" });
  }
};
</script>

<style lang="scss" scoped>
.detail-page {
  min-height: 100vh;
  background: #fff;
}
.article-content {
  padding: 40rpx 32rpx;
  .article-title {
    font-size: 40rpx;
    font-weight: bold;
    color: #303133;
    display: block;
    margin-bottom: 24rpx;
    line-height: 1.4;
  }
  .article-meta {
    display: flex;
    gap: 24rpx;
    margin-bottom: 32rpx;
    padding-bottom: 24rpx;
    border-bottom: 1rpx solid #e4e7ed;
    .meta-item {
      font-size: 24rpx;
      color: #909399;
    }
  }
  .article-body {
    font-size: 30rpx;
    color: #303133;
    line-height: 1.8;
  }
}
.loading-tip {
  text-align: center;
  padding: 120rpx 0;
  color: #909399;
  font-size: 28rpx;
}
</style>
