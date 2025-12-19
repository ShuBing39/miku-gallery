import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../services/supabase' 

// 引入组件
import HomeView from '../views/HomeView.vue'
import ItemDetail from '../views/ItemDetail.vue'
import EventDetail from '../views/EventDetail.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import AdminDashboard from '../views/AdminDashboard.vue'
import UserDashboard from '../views/UserDashboard.vue'
import SubmitWork from '../views/SubmitWork.vue'
import ProjectsView from '../views/Projects.vue'
import ProjectDetail from '../views/ProjectDetail.vue'
import EventsView from '../views/EventsView.vue'
import EncyclopediaView from '../views/EncyclopediaView.vue'
import EncyclopediaEdit from '../views/EncyclopediaEdit.vue'
import TicketCenter from '../views/TicketCenter.vue'
import CircleCenter from '../views/CircleCenter.vue'
import SubmitProject from '../views/SubmitProject.vue'
import SubmitGroupBuy from '../views/SubmitGroupBuy.vue'
import GroupBuyLobby from '../views/GroupBuyLobby.vue'
import RealNameVerify from '../views/RealNameVerify.vue'
import GroupBuyTool from '../views/GroupBuyTool.vue' 
import GroupBuyDetail from '../components/group/GroupBuyDetail.vue'

// ✅ 1. 补上 WikiView 的引入
import WikiView from '../views/WikiView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    
    // ✅ 2. 补上 Wiki 的路由规则
    { path: '/wiki', name: 'wiki', component: WikiView },

    { path: '/item/:id', name: 'item-detail', component: ItemDetail },
    { path: '/event/:id', name: 'event-detail', component: EventDetail },
    
    { path: '/events', name: 'events', component: EventsView },
    { path: '/projects', name: 'projects', component: ProjectsView },
    { path: '/project/:id', name: 'project-detail', component: ProjectDetail },
    
    { path: '/group-buy/:id', name: 'group-buy-detail', component: GroupBuyDetail },

    { path: '/encyclopedia', name: 'encyclopedia', component: EncyclopediaView },
    { path: '/encyclopedia/edit', name: 'encyclopedia-edit', component: EncyclopediaEdit },
    
    { path: '/tickets', name: 'tickets', component: TicketCenter },
    { path: '/circle', name: 'circle', component: CircleCenter, meta: { requiresAuth: true } },
    
    { path: '/group-buy-lobby', name: 'group-buy-lobby', component: GroupBuyLobby },
    { path: '/submit-group-buy', name: 'submit-group-buy', component: SubmitGroupBuy, meta: { requiresAuth: true } },
    { path: '/group-buy-tool', name: 'group-buy-tool', component: GroupBuyTool, meta: { requiresAuth: true } },

    { path: '/login', name: 'login', component: LoginView },
    { path: '/register', name: 'register', component: RegisterView },
    { path: '/profile', name: 'profile', component: UserDashboard, meta: { requiresAuth: true } },
    { path: '/admin', name: 'admin', component: AdminDashboard, meta: { requiresAuth: true } },
    { path: '/submit', name: 'submit', component: SubmitWork, meta: { requiresAuth: true } },
    { path: '/submit-project', name: 'submit-project', component: SubmitProject, meta: { requiresAuth: true } },
    
    { path: '/verify', name: 'verify', component: RealNameVerify, meta: { requiresAuth: true } }
  ],
  scrollBehavior(to, from, savedPosition) {
    return savedPosition || { top: 0 }
  }
})

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