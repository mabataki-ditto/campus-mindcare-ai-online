import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  
  return {
    plugins: [
      vue(),
      AutoImport({
        resolvers: [
          ElementPlusResolver({
            importStyle: 'css'
          })
        ],
        imports: ['vue', 'vue-router', 'pinia'],
        dts: 'src/auto-imports.d.ts'
      }),
      Components({
        resolvers: [
          ElementPlusResolver({
            importStyle: 'css'
          })
        ],
        dts: 'src/components.d.ts'
      })
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '/api')
        }
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('element-plus')) return 'element-plus'
            if (id.includes('echarts')) return 'echarts'
            if (id.includes('node_modules/vue/') || id.includes('node_modules/vue-router/') || id.includes('node_modules/pinia/')) return 'vendor'
          }
        }
      }
    }
  }
})