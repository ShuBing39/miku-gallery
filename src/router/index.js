import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import ItemDetail from '../views/ItemDetail.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/item/:id', // :id 是动态参数
      name: 'item-detail',
      component: ItemDetail
    }
  ],
  scrollBehavior() {
    return { top: 0 } // 切换页面自动回到顶部
  }
})

export default router