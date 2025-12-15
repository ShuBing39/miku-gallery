import { createApp } from 'vue'
import App from './App.vue'
import router from './router' // 👈 1. 一定要引入 router

// import './style.css' (保留你原有的样式引入，可能有差异，不用动)

const app = createApp(App)

app.use(router) // 👈 2. 一定要使用 router
app.mount('#app')