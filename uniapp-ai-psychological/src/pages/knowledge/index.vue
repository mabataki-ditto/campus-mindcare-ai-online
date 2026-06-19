<template>
  <view class="knowledge-page">
    <view class="status-bar-placeholder"></view>
    <view class="search-bar"
      ><input
        v-model="keyword"
        class="search-input"
        placeholder="搜索文章"
        confirm-type="search"
        @confirm="handleSearch"
    /></view>
    <scroll-view scroll-x class="category-scroll">
      <view
        :class="['category-tag', selectedCategory === null ? 'active' : '']"
        @tap="selectCategory(null)"
        ><text>全部</text></view
      >
      <view
        v-for="cat in categories"
        :key="cat.id"
        :class="['category-tag', selectedCategory === cat.id ? 'active' : '']"
        @tap="selectCategory(cat.id)"
        ><text>{{ cat.categoryName }}</text></view
      >
    </scroll-view>
    <scroll-view scroll-y class="article-list" @scrolltolower="loadMore">
      <view
        v-for="a in articles"
        :key="a.id"
        class="article-card"
        @tap="goDetail(a.id)"
      >
        <image
          v-if="a.coverImage"
          :src="getImageUrl(a.coverImage)"
          class="cover"
          mode="aspectFill"
        />
        <view class="article-info"
          ><text class="article-title">{{ a.title }}</text
          ><text class="article-meta"
            >{{ a.categoryName }} · {{ a.readCount }}次阅读</text
          ></view
        >
      </view>
      <view v-if="articles.length === 0 && !loading" class="empty-tip"
        ><text>暂无文章</text></view
      >
      <view v-if="loading" class="loading-tip"><text>加载中...</text></view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { getArticlePage, getCategoryTree } from "@/api/knowledge";
import { BASE_URL } from "@/config";
const keyword = ref(""),
  categories = ref<any[]>([]),
  selectedCategory = ref<number | null>(null);
const articles = ref<any[]>([]),
  currentPage = ref(1),
  total = ref(0),
  loading = ref(false);
onShow(() => {
  loadCategories();
  loadArticles();
});
const loadCategories = async () => {
  try {
    categories.value = ((await getCategoryTree()) as any) || [];
  } catch (e) {
    console.error(e);
  }
};
const loadArticles = async (reset = true) => {
  if (loading.value) return;
  if (reset) {
    currentPage.value = 1;
    articles.value = [];
  }
  loading.value = true;
  try {
    const p: any = { status: 1, currentPage: currentPage.value, size: 10 };
    if (selectedCategory.value) p.categoryId = selectedCategory.value;
    if (keyword.value) p.title = keyword.value;
    const res: any = await getArticlePage(p);
    // 统一响应格式：后端返回 { records, total }
    const r = res?.records || res?.list || (Array.isArray(res) ? res : []);
    const totalCount = res?.total || r.length;
    articles.value = reset ? r : [...articles.value, ...r];
    total.value = totalCount;
  } catch (e) {
    console.error("加载文章失败:", e);
  } finally {
    loading.value = false;
  }
};
const handleSearch = () => loadArticles(true);
const selectCategory = (id: number | null) => {
  selectedCategory.value = id;
  loadArticles(true);
};
const loadMore = () => {
  if (articles.value.length < total.value) {
    currentPage.value++;
    loadArticles(false);
  }
};
const goDetail = (id: number) =>
  uni.navigateTo({ url: `/pages/knowledge/detail?id=${id}` });
const getImageUrl = (url: string) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  // #ifdef H5
  return url;
  // #endif
  // #ifndef H5
  return `${BASE_URL.replace("/api", "")}${url}`;
  // #endif
};
</script>

<style lang="scss" scoped>
.knowledge-page {
  min-height: 100vh;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
  .status-bar-placeholder {
    height: var(--status-bar-height, 44px);
    background: #fff;
    flex-shrink: 0;
  }
}
.search-bar {
  padding: 24rpx 32rpx;
  background: #fff;
  .search-input {
    width: 100%;
    height: 72rpx;
    background: #f5f5f5;
    border-radius: 36rpx;
    padding: 0 28rpx;
    font-size: 28rpx;
    box-sizing: border-box;
  }
}
.category-scroll {
  white-space: nowrap;
  padding: 16rpx 32rpx;
  background: #fff;
  border-bottom: 1rpx solid #e4e7ed;
  /* #ifdef H5 */
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
  /* #endif */
  .category-tag {
    display: inline-block;
    padding: 12rpx 28rpx;
    border-radius: 32rpx;
    background: #f5f5f5;
    font-size: 26rpx;
    color: #303133;
    margin-right: 16rpx;
    flex-shrink: 0;
    &.active {
      background: rgba(74, 144, 217, 0.1);
      color: #4a90d9;
    }
  }
}
.article-list {
  flex: 1;
  height: 0; /* 让 scroll-view 正确计算高度 */
  padding: 24rpx 32rpx;
  box-sizing: border-box;
  .article-card {
    background: #fff;
    border-radius: 16rpx;
    margin-bottom: 20rpx;
    overflow: hidden;
    display: flex;
    .cover {
      width: 200rpx;
      height: 200rpx;
      flex-shrink: 0;
    }
    .article-info {
      flex: 1;
      padding: 20rpx 24rpx;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      .article-title {
        font-size: 30rpx;
        font-weight: 500;
        color: #303133;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .article-meta {
        font-size: 22rpx;
        color: #909399;
        margin-top: 8rpx;
      }
    }
  }
  .empty-tip,
  .loading-tip {
    text-align: center;
    padding: 80rpx 0;
    color: #909399;
    font-size: 28rpx;
  }
}
</style>
