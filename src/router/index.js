import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../supabase'

// 🔥 严格按照你截图中的文件名引入
import HomeView from '../views/HomeView.vue'
import WikiView from '../views/WikiView.vue'
import EventsView from '../views/EventsView.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import ItemDetail from '../views/ItemDetail.vue'
import ProjectDetail from '../views/ProjectDetail.vue'

// 后台与个人中心 (对应截图中的 UserDashboard 和 AdminDashboard)
import UserDashboard from '../views/UserDashboard.vue' 
import AdminDashboard from '../views/AdminDashboard.vue'

// 投稿与企划
// 注意：截图里有 Projects.vue 也有 ProjectsView.vue，这里我指向 Projects.vue (通常是新版)
import ProjectsView from '../views/Projects.vue' 
// 截图里有 SubmitWork.vue，这里对应“周边投稿”
import SubmitWork from '../views/SubmitWork.vue'
// 截图里有 SubmitProject.vue，这里对应“发布企划”
import SubmitProject from '../views/SubmitProject.vue' 

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { 
      path: '/', 
      name: 'home', 
      component: HomeView 
    },
    { 
      path: '/wiki', 
      name: 'wiki', 
      component: WikiView 
    },
    { 
      path: '/events', 
      name: 'events', 
      component: EventsView 
    },
    { 
      path: '/projects', 
      name: 'projects', 
      component: ProjectsView 
    },
    { 
      path: '/submit-project', 
      name: 'submit-project', 
      component: SubmitProject, 
      meta: { requiresAuth: true } 
    },
    { 
      path: '/submit', 
      name: 'submit', 
      component: SubmitWork, 
      meta: { requiresAuth: true } 
    },
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
    
    // 登录注册及详情页
    { path: '/login', name: 'login', component: LoginView },
    { path: '/register', name: 'register', component: RegisterView },
    { path: '/project/:id', name: 'project-detail', component: ProjectDetail, props: true },
    { path: '/item/:id', name: 'item-detail', component: ItemDetail }
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