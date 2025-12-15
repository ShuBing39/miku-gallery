import { createRouter, createWebHistory } from 'vue-router'
import { createClient } from '@supabase/supabase-js'

// 引入所有组件
import HomeView from '../views/HomeView.vue'
import ItemDetail from '../views/ItemDetail.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import AdminDashboard from '../views/AdminDashboard.vue'
import UserDashboard from '../views/UserDashboard.vue'
import SubmitWork from '../views/SubmitWork.vue'
// ❌ 已删除 CircleCenter 的引用

// 初始化 Supabase 客户端
const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { 
      path: '/', 
      name: 'home', 
      component: HomeView 
    },
    { 
      path: '/item/:id', 
      name: 'item-detail', 
      component: ItemDetail 
    },
    { 
      path: '/login', 
      name: 'login', 
      component: LoginView 
    },
    { 
      path: '/register', 
      name: 'register', 
      component: RegisterView 
    },
    { 
      path: '/profile', 
      name: 'profile', 
      component: UserDashboard,
      meta: { requiresAuth: true } // 需要登录
    },
    { 
      path: '/admin', 
      name: 'admin', 
      component: AdminDashboard, 
      meta: { requiresAuth: true } // 需要登录
    },
    {
      path: '/submit',
      name: 'submit',
      component: SubmitWork,
      meta: { requiresAuth: true } // 需要登录
    }
    // ❌ 已删除 /circle 路由，因为社团功能已合并进 /profile
  ],
  // 切换页面时自动滚动到顶部
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// 路由守卫：检查权限
router.beforeEach(async (to, from, next) => {
  // 检查目标页面是否需要登录
  if (to.meta.requiresAuth) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      next('/login') // 没登录就踢走
    } else {
      next() // 已登录，请进
    }
  } else {
    next() // 不需要登录的页面直接进
  }
})

export default router