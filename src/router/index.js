import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../supabase'

// 视图组件引入
import HomeView from '../views/HomeView.vue'
import WikiView from '../views/WikiView.vue'
import EventsView from '../views/EventsView.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import ItemDetail from '../views/ItemDetail.vue'
import ProjectDetail from '../views/ProjectDetail.vue'
import Dashboard from '../views/UserDashboard.vue'
import CircleCenter from '../views/CircleCenter.vue'
import AdminDashboard from '../views/AdminDashboard.vue'
import ProjectsView from '../views/Projects.vue' 
import SubmitWork from '../views/SubmitWork.vue'
import SubmitProject from '../views/SubmitProject.vue' 
import EncyclopediaView from '../views/EncyclopediaView.vue'
import EncyclopediaEdit from '../views/EncyclopediaEdit.vue'
import TicketCenter from '../views/TicketCenter.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/wiki', name: 'wiki', component: WikiView },
    { path: '/events', name: 'events', component: EventsView },
    { path: '/projects', name: 'projects', component: ProjectsView },
    
    { path: '/project/:id', name: 'project-detail', component: ProjectDetail, props: true },
    { path: '/submit-project', name: 'submit-project', component: SubmitProject, meta: { requiresAuth: true } },
    { path: '/submit', name: 'submit', component: SubmitWork, meta: { requiresAuth: true } },
    { path: '/dashboard', alias: '/profile', name: 'dashboard', component: Dashboard, meta: { requiresAuth: true } },
    { path: '/circle', name: 'circle-center', component: CircleCenter, meta: { requiresAuth: true } },
    { path: '/admin', name: 'admin', component: AdminDashboard, meta: { requiresAuth: true } },
    { path: '/encyclopedia', name: 'encyclopedia', component: EncyclopediaView },
    { path: '/encyclopedia/edit', name: 'encyclopedia-edit', component: EncyclopediaEdit, meta: { requiresAuth: true } },
    { path: '/tickets', name: 'tickets', component: TicketCenter, meta: { requiresAuth: true } },
    
    { path: '/login', name: 'login', component: LoginView },
    { path: '/register', name: 'register', component: RegisterView },
    { path: '/item/:id', name: 'item-detail', component: ItemDetail }
  ],
  scrollBehavior(to, from, savedPosition) {
    return savedPosition || { top: 0 }
  }
})

// 🔥 路由守卫
router.beforeEach(async (to, from, next) => {
  if (to.meta.requiresAuth) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      // 记录来源
      next({ path: '/login', query: { redirect: to.fullPath } })
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router