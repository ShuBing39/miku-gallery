import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../supabase'

// 视图组件引入
import HomeView from '../views/HomeView.vue'
import WikiView from '../views/WikiView.vue'
import EventsView from '../views/EventsView.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import ItemDetail from '../views/ItemDetail.vue'

// 🔥 注意：这里修改了文件名，匹配上一轮生成的代码
import ProjectDetailView from '../views/ProjectDetailView.vue'

import UserDashboard from '../views/UserDashboard.vue' 
import AdminDashboard from '../views/AdminDashboard.vue'
import ProjectsView from '../views/Projects.vue' 
import SubmitWork from '../views/SubmitWork.vue'
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
    // 企划详情页路由
    { 
      path: '/project/:id', 
      name: 'project-detail', 
      component: ProjectDetailView, 
      props: true 
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
    
    // 登录注册及周边详情页
    { path: '/login', name: 'login', component: LoginView },
    { path: '/register', name: 'register', component: RegisterView },
    { path: '/item/:id', name: 'item-detail', component: ItemDetail }
  ],
  scrollBehavior(to, from, savedPosition) {
    return savedPosition || { top: 0 }
  }
})

// 路由守卫
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