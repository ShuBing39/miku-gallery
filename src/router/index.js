import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../supabase'

// 引入所有组件
import HomeView from '../views/HomeView.vue'
import WikiView from '../views/WikiView.vue' // 新增的资料库页面
import ProjectsView from '../views/ProjectsView.vue'
import ProjectDetail from '../views/ProjectDetail.vue'
import ItemDetail from '../views/ItemDetail.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import AdminDashboard from '../views/AdminDashboard.vue'
import UserDashboard from '../views/UserDashboard.vue'
import SubmitWork from '../views/SubmitWork.vue'
import EventsView from '../views/WikiView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    
    // 把原来的首页功能移到了这里
    { path: '/wiki', name: 'wiki', component: WikiView },

    { path: '/projects', name: 'projects', component: ProjectsView },
    { path: '/project/:id', name: 'project-detail', component: ProjectDetail, props: true },
    { path: '/item/:id', name: 'item-detail', component: ItemDetail },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/register', name: 'register', component: RegisterView },
    { path: '/profile', name: 'profile', component: UserDashboard, meta: { requiresAuth: true } },
    { path: '/admin', name: 'admin', component: AdminDashboard, meta: { requiresAuth: true } },
    { path: '/submit', name: 'submit', component: SubmitWork, meta: { requiresAuth: true } },
    { path: '/events', name: 'events', component: () => import('../views/EventsView.vue') },
  ],
  scrollBehavior(to, from, savedPosition) {
    return savedPosition || { top: 0 }
  }
})

// 路由守卫：检查登录权限
router.beforeEach(async (to, from, next) => {
  if (to.meta.requiresAuth) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) next('/login')
    else next()
  } else {
    next()
  }
})

export default router