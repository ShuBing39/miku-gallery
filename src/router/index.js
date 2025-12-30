import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../services/supabase' 

// ✅ 1. 引入组件
// 注意：请确认 HomeView 到底在哪里，这里暂时保留你原来的路径
import HomeView from '../views/AdminDash/HomeView.vue' 
// 如果你的首页其实在 src/views/HomeView.vue，请自己改一下上面这行

import LoginView from '../views/auth/LoginView.vue'
import RegisterView from '../views/auth/RegisterView.vue'
import RealNameVerify from '../views/auth/RealNameVerify.vue'

// 这里的路径对应你提供的结构
import ItemDetail from '../views/archive/ItemDetail.vue'
import SubmitWork from '../views/archive/SubmitWork.vue'

import EventsView from '../views/events/EventList.vue'
import EventDetail from '../views/events/EventDetail.vue'

import AdminDashboard from '../views/AdminDash/AdminDashboard.vue'
import UserDashboard from '../views/AdminDash/UserDashboard.vue'

import ProjectsView from '../views/projects/ProjectsList.vue'
import ProjectDetail from '../views/projects/ProjectDetail.vue'
import SubmitProject from '../views/projects/SubmitProject.vue'

import EncyclopediaView from '../views/encyclopedia/EncyclopediaList.vue'

import TicketCenter from '../views/TicketCenter/TicketCenter.vue'
import CircleCenter from '../views/circle/CircleCenter.vue'

import GroupBuyLobby from '../views/group/GroupBuyLobby.vue'
import GroupBuyDetail from '../views/group/GroupBuyDetail.vue'
import SubmitGroupBuy from '../views/group/SubmitGroupBuy.vue'
import GroupBuyTool from '../views/group/GroupBuyTool.vue'

// ✅ 2. 管理员邮箱白名单
const ADMIN_EMAILS = [
  '949058921@qq.com', 
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // --- 首页 & 基础 ---
    { path: '/', name: 'home', component: HomeView },
    
    // --- 认证相关 (Auth) ---
    { path: '/login', name: 'login', component: LoginView },
    { path: '/register', name: 'register', component: RegisterView },
    { path: '/verify', name: 'verify', component: RealNameVerify, meta: { requiresAuth: true } },
    { path: '/profile', name: 'profile', component: UserDashboard, meta: { requiresAuth: true } },

    // --- 周边维基 (Wiki / Archive) ---
    { 
      path: '/wiki', 
      name: 'wiki', 
      component: () => import('../views/archive/GoodsWikiView.vue') 
    },
    { path: '/items', redirect: '/wiki' }, 
    
    { path: '/wiki/item/:id', name: 'item-detail', component: ItemDetail },
    
    // 🔴 [核心修复] 使用函数式重定向，防止传递 ":id" 字符串
    { 
      path: '/item/:id', 
      redirect: to => {
        return { path: `/wiki/item/${to.params.id}` }
      }
    },
    
    { path: '/submit', name: 'submit', component: SubmitWork, meta: { requiresAuth: true } },

    // --- 葱葱百科 (Encyclopedia) ---
    { 
      path: '/encyclopedia', 
      name: 'encyclopedia', 
      component: EncyclopediaView 
    },
    { 
      path: '/encyclopedia/new', 
      name: 'wiki-new', 
      component: () => import('../views/encyclopedia/EncyclopediaEdit.vue') 
    },
    { 
      path: '/encyclopedia/:id/edit', 
      name: 'wiki-edit', 
      component: () => import('../views/encyclopedia/EncyclopediaEdit.vue') 
    },

    // --- 活动 (Events) ---
    { path: '/events', name: 'events', component: EventsView },
    { path: '/event/:id', name: 'event-detail', component: EventDetail },

    // --- 票务 & 社团 ---
    { path: '/tickets', name: 'tickets', component: TicketCenter },
    { path: '/circles', name: 'circles', component: CircleCenter },
    
    // --- 企划 (Projects) ---
    { path: '/projects', name: 'projects', component: ProjectsView },
    { path: '/project/:id', name: 'project-detail', component: ProjectDetail },
    { path: '/submit-project', name: 'submit-project', component: SubmitProject, meta: { requiresAuth: true } },

    // --- 团购 (Group) ---
    { path: '/group-buys', name: 'group-buys', component: GroupBuyLobby },
    { path: '/group-buy-lobby', name: 'group-buy-lobby', component: GroupBuyLobby },
    { path: '/group-buy/:id', name: 'group-buy-detail', component: GroupBuyDetail }, 
    { path: '/submit-group-buy', name: 'submit-group-buy', component: SubmitGroupBuy, meta: { requiresAuth: true } },
    { path: '/group-buy-tool', name: 'group-buy-tool', component: GroupBuyTool, meta: { requiresAuth: true } },

    // --- 后台管理 (Admin) ---
    { 
      path: '/admin', 
      name: 'admin', 
      component: AdminDashboard, 
      meta: { requiresAuth: true, requiresAdmin: true } 
    }
  ],
  scrollBehavior(to, from, savedPosition) {
    return savedPosition || { top: 0 }
  }
})

// ✅ 3. 路由守卫
router.beforeEach(async (to, from, next) => {
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error) {
    await supabase.auth.signOut()
    return next('/login')
  }

  const user = session?.user

  if (to.meta.requiresAuth && !user) {
    return next('/login')
  }

  if (to.meta.requiresAdmin) {
    if (!user || !ADMIN_EMAILS.includes(user.email)) {
      alert('🚫 权限不足：只有管理员才能进入后台。')
      return next('/')
    }
  }

  next()
})

export default router