import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../services/supabase' 

// ✅ 1. 引入组件 (路径已修正为纯英文，请确保文件夹名与之一致)
// 假设你已将 "AdminDash#后台" 改为 "AdminDash"，以此类推
import HomeView from '../views/AdminDash/HomeView.vue'
import LoginView from '../views/Auth/LoginView.vue'
import RegisterView from '../views/Auth/RegisterView.vue'
import RealNameVerify from '../views/Auth/RealNameVerify.vue'

import ItemDetail from '../views/Archive/ItemDetail.vue'
import SubmitWork from '../views/Archive/SubmitWork.vue'

import EventsView from '../views/Events/EventList.vue'
import EventDetail from '../views/Events/EventDetail.vue'

import AdminDashboard from '../views/AdminDash/AdminDashboard.vue'
import UserDashboard from '../views/AdminDash/UserDashboard.vue'

import ProjectsView from '../views/Projects/ProjectsList.vue'
import ProjectDetail from '../views/Projects/ProjectDetail.vue'
import SubmitProject from '../views/Projects/SubmitProject.vue'

import EncyclopediaView from '../views/Encyclopedia/EncyclopediaList.vue'
// 懒加载编辑页

import TicketCenter from '../views/TicketCenter/TicketCenter.vue'
import CircleCenter from '../views/Circle/CircleCenter.vue'

import GroupBuyLobby from '../views/Group/GroupBuyLobby.vue'
import GroupBuyDetail from '../views/Group/GroupBuyDetail.vue'
import SubmitGroupBuy from '../views/Group/SubmitGroupBuy.vue'
import GroupBuyTool from '../views/Group/GroupBuyTool.vue'

// ✅ 2. 管理员邮箱白名单
const ADMIN_EMAILS = [
  '949058921@qq.com', // 替换为你的管理员邮箱
  // 'admin2@example.com' 
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

    // --- 周边库 (Archive) ---
    // ⚠️ 修复了 .vue.vue 双后缀错误
    { path: '/items', name: 'items', component: () => import('../views/Archive/GoodsWikiView.vue') }, 
    { path: '/item/:id', name: 'item-detail', component: ItemDetail },
    { path: '/submit', name: 'submit', component: SubmitWork, meta: { requiresAuth: true } },

    // --- 活动 (Events) ---
    { path: '/events', name: 'events', component: EventsView },
    { path: '/event/:id', name: 'event-detail', component: EventDetail },
    
    // --- 百科 (Encyclopedia) ---
    { path: '/wiki', name: 'wiki', component: EncyclopediaView },
    { path: '/wiki/new', name: 'wiki-new', component: () => import('../views/Encyclopedia/EncyclopediaEdit.vue') },
    { path: '/wiki/:id/edit', name: 'wiki-edit', component: () => import('../views/Encyclopedia/EncyclopediaEdit.vue') },

    // --- 票务 & 社团 (Ticket & Circle) ---
    { path: '/tickets', name: 'tickets', component: TicketCenter },
    { path: '/circles', name: 'circles', component: CircleCenter },
    
    // --- 企划 (Projects) ---
    { path: '/projects', name: 'projects', component: ProjectsView },
    { path: '/project/:id', name: 'project-detail', component: ProjectDetail },
    { path: '/submit-project', name: 'submit-project', component: SubmitProject, meta: { requiresAuth: true } },

    // --- 团购 (Group) ---
    { path: '/group-buys', name: 'group-buys', component: GroupBuyLobby },
    { path: '/group-buy/:id', name: 'group-buy-detail', component: GroupBuyDetail }, 
    { path: '/submit-group-buy', name: 'submit-group-buy', component: SubmitGroupBuy, meta: { requiresAuth: true } },
    { path: '/group-buy-tool', name: 'group-buy-tool', component: GroupBuyTool, meta: { requiresAuth: true } },

    // --- 后台管理 (Admin) ---
    { 
      path: '/admin', 
      name: 'admin', 
      component: AdminDashboard, 
      // ✅ 加上权限标记
      meta: { requiresAuth: true, requiresAdmin: true } 
    }
  ],
  scrollBehavior(to, from, savedPosition) {
    return savedPosition || { top: 0 }
  }
})

// ✅ 3. 路由守卫 (包含管理员检查)
router.beforeEach(async (to, from, next) => {
  const { data: { session }, error } = await supabase.auth.getSession()

  // Token 异常处理
  if (error) {
    await supabase.auth.signOut()
    return next('/login')
  }

  const user = session?.user

  // A. 检查是否需要登录
  if (to.meta.requiresAuth && !user) {
    return next('/login')
  }

  // B. 检查是否需要管理员权限
  if (to.meta.requiresAdmin) {
    if (!user || !ADMIN_EMAILS.includes(user.email)) {
      alert('🚫 权限不足：只有管理员才能进入后台。')
      return next('/') // 拒绝访问，跳回首页
    }
  }

  next()
})

export default router