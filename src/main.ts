import { createPlugin } from '@tauri-store/pinia'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import Antd from 'ant-design-vue'

import App from './App.vue'
import router from './router'
import { registerIcons } from './components/icons'
import 'virtual:uno.css'
import 'ant-design-vue/dist/reset.css'
import './assets/css/global.scss'

const pinia = createPinia()
pinia.use(createPlugin({ saveOnChange: true }))

const app = createApp(App)
app.use(router).use(pinia).use(Antd)
registerIcons(app)
app.mount('#app')
