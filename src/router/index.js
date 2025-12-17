import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../supabase'

// 视图组件引入
import HomeView from '../views/HomeView.vue'
import WikiView from '../views/WikiView.vue'
import EventsView from '../views/EventsView.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import ItemDetail from '../views/ItemDetail.vue'

// ✅ 修正 1：引入正确的新文件 (ProjectDetail.vue)
import ProjectDetail from '../views/ProjectDetail.vue'

// ✅ 修正 2：这里改回 UserDashboard.vue (因为您的文件名叫这个)
import Dashboard from '../views/UserDashboard.vue'

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
    
    // ✅ 修正 3：企划详情页路由指向新组件
    { 
      path: '/project/:id', 
      name: 'project-detail', 
      component: ProjectDetail, 
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
    
    // ✅ 修正 4：社团/个人中心路由
    // 路径设为 /dashboard，但文件读取的是 UserDashboard.vue
    { 
      path: '/dashboard', 
      name: 'dashboard', 
      component: Dashboard, 
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