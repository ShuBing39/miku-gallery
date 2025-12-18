import { createRouter, createWebHistory } from 'vue-router'
// ✅ 关键修复：导入统一的 supabase 实例
import { supabase } from '../supabase' 

// 引入组件
import HomeView from '../views/HomeView.vue'
import ItemDetail from '../views/ItemDetail.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import AdminDashboard from '../views/AdminDashboard.vue'
import UserDashboard from '../views/UserDashboard.vue'
import SubmitWork from '../views/SubmitWork.vue'
import ProjectsView from '../views/ProjectsView.vue' // 企划大厅

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/item/:id', name: 'item-detail', component: ItemDetail },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/register', name: 'register', component: RegisterView },
    { 
      path: '/profile', 
      name: 'profile', 
      component: UserDashboard,
      meta: { requiresAuth: true }
    },
    { 
      path: '/admin', 
      name: 'admin', 
      component: AdminDashboard, 
      meta: { requiresAuth: true }
    },
    {
      path: '/submit',
      name: 'submit',
      component: SubmitWork,
      meta: { requiresAuth: true }
    },
    {
      path: '/projects',
      name: 'projects',
      component: ProjectsView
    }
  ],
  scrollBehavior(to, from, savedPosition) {
    return savedPosition || { top: 0 }
  }
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
  // 检查是否需要登录
  if (to.meta.requiresAuth) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      next('/login')
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router