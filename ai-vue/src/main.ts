import { createApp } from 'vue'
import './assets/css/reset.css'
import App from './App.vue'
import router from './router'
import registerStore from './stores'
import { registerIcons } from '@/global/register-icons'
import 'element-plus/dist/index.css'
import './router/guard'

const app = createApp(App)

registerIcons(app)
app.use(router)
registerStore(app)
app.mount('#app')