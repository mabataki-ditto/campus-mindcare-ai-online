<script setup lang="ts">
import { onLaunch } from "@dcloudio/uni-app";
import useLoginStore from "@/stores/login";

const loginStore = useLoginStore();

onLaunch(() => {
  loginStore.loadLocalCache();
});
</script>

<style>
/* 全局样式 - 移动端适配 */
page {
  background-color: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  /* H5 端禁止缩放 */
  /* #ifdef H5 */
  max-width: 750px;
  margin: 0 auto;
  /* #endif */
}

/* 安全区域底部间距 */
.safe-area-bottom {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

/* 禁止长按选中 */
view, text {
  user-select: none;
  -webkit-user-select: none;
}

/* 点击态优化（仅限可交互元素） */
button:active, .action-card:active, .menu-item:active, .send-btn:active {
  opacity: 0.8;
}

/* 图片自适应 */
image {
  height: auto;
}
</style>
