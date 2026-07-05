<template>
  <div class="articleDetail-container">
    <!-- 顶部横幅：图标 + 页面标题 -->
    <div class="header-section">
      <div class="header-content">
        <el-image :src="iconUrl" style="width: 60px; height: 60px" />
        <h1>知识文章详情</h1>
      </div>
    </div>
    <div class="content">
      <!-- 文章信息卡片：分类、标题、摘要、作者、阅读量 -->
      <div class="diary-card">
        <p class="title">文章信息</p>
        <div class="sub-title">
          <el-tag size="large" class="category-tag">{{ articleDetail.categoryName }}</el-tag>
          <div class="flex-box">
            <el-icon><List /></el-icon>
            <span>{{ dayjs(articleDetail.updatedAt).format('YYYY-MM-DD') }}</span>
          </div>
        </div>
        <h1 class="article-title">{{ articleDetail.title }}</h1>
        <!-- 摘要：绿色左边框高亮显示 -->
        <div class="summary-content" v-if="articleDetail.summary">
          <p>{{ articleDetail.summary }}</p>
        </div>
        <div :style="{ marginTop: '20px' }" class="flex-box">
          <div class="item flex-box">
            <el-icon><Avatar /></el-icon>
            <span>{{ articleDetail.authorName }}</span>
          </div>
          <div class="item flex-box">
            <el-icon><Platform /></el-icon>
            <span> {{ articleDetail.readCount }} 次阅读</span>
          </div>
        </div>
      </div>
      <!-- 正文内容卡片：v-html 渲染后端返回的富文本 HTML -->
      <div class="diary-card">
        <div class="title">正文内容</div>
        <div :style="{ marginTop: '20px' }" class="content-wrapper" v-html="articleDetail.content || ''"></div>
        <!-- 标签列表：后端返回逗号分隔的 tags，已由接口转为 tagArray -->
        <div class="tags-content" v-if="articleDetail.tagArray && articleDetail.tagArray.length">
          <h4 class="tags-title">相关标签</h4>
          <div class="tags-list">
            <el-tag v-for="tag in articleDetail.tagArray" :key="tag" type="info" effect="light" class="tag-item">{{
              tag
            }}</el-tag>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { getKnowledgeDetail } from '@/service/frontend/frontend'
import { onMounted, ref, watch } from 'vue'
import { dayjs } from 'element-plus'

// 路由参数 /knowledge/article/:id，通过 props 接收
const props = defineProps({
  id: String
})

const articleDetail = ref({})

// 加载文章详情：调用后端接口，返回数据包含 title/content/summary/tagArray 等
const loadDetail = () => {
  getKnowledgeDetail(props.id).then((res) => {
    articleDetail.value = res
  })
}

onMounted(loadDetail)

// 监听路由参数变化（如从文章列表点击另一篇文章时），重新加载详情
watch(() => props.id, loadDetail)

// 页面顶部图标（Vite 静态资源引入方式，确保构建后路径正确）
const iconUrl = new URL('@/assets/images/book.png', import.meta.url).href
</script>

<style lang="scss" scoped>
.articleDetail-container {
  background: linear-gradient(135deg, #fafbfc 0%, #f7f9fc 50%, #f2f6fa 100%);
  .flex-box {
    display: flex;
    align-items: center;
    .item {
      margin-right: 20px;
      span {
        margin-left: 5px;
      }
    }
  }
  .header-section {
    background: linear-gradient(135deg, #f59e0b 0%, #8b5cf6 100%);
    color: white;
    padding: 48px;
    .header-content {
      display: flex;
      align-items: center;
      gap: 12px;
    }
  }
  .content {
    margin: 0 auto;
    max-width: 980px;
    width: 100%;
    padding: 20px;
    box-sizing: border-box;
    .diary-card {
      margin-bottom: 20px;
      background: white;
      border-radius: 10px;
      padding: 20px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
      .title {
        margin-bottom: 15px;
        font-size: 20px;
        font-weight: 600;
        color: #374151;
      }
      .sub-title {
        margin-top: 20px;
        display: flex;
        align-items: center;
        .category-tag {
          margin-right: 20px;
        }
      }
      .article-title {
        font-size: 28px;
        font-weight: bold;
        color: #111827;
        margin-top: 30px;
        margin-bottom: 10px;
      }
      .summary-content {
        background: rgba(126, 211, 33, 0.1);
        border-left: 4px solid #7ed321;
        padding: 10px 15px;
        border-radius: 0 8px 8px 0;
        position: relative;
      }
      .content-wrapper {
        font-size: 15px;
        color: #374151;
        :deep(p) {
          margin-bottom: 10px;
        }
        :deep(h1),
        :deep(h2),
        :deep(h3),
        :deep(h4),
        :deep(h5),
        :deep(h6) {
          margin: 15px 0 10px;
          color: #111827;
          font-weight: 600;
        }
        :deep(h2) {
          font-size: 15px;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 5px;
        }
        :deep(h3) {
          font-size: 13px;
        }
        :deep(ul),
        :deep(ol) {
          padding-left: 15px;
          margin-bottom: 10px;
        }
        :deep(li) {
          margin-bottom: 5px;
        }
      }
      .tags-content {
        margin-top: 20px;
        padding-top: 15px;
        border-top: 1px solid #e5e7eb;
        .tags-title {
          margin-bottom: 10px;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
        }
        .tags-list {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .articleDetail-container {
    .header-section {
      padding: 24px 15px;
      .header-content {
        h1 {
          font-size: 20px;
        }
      }
    }
    .content {
      padding: 15px;
      .diary-card {
        padding: 15px;
        .article-title {
          font-size: 20px;
          margin-top: 20px;
        }
        .sub-title {
          flex-wrap: wrap;
          gap: 10px;
          .category-tag {
            margin-right: 0;
          }
        }
        .content-wrapper {
          font-size: 14px;
          :deep(img) {
            max-width: 100%;
            height: auto;
          }
        }
      }
    }
  }
}
</style>
