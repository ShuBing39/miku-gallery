<template>
    <nav class="home-nav">
      <div class="nav-content">
        <div class="logo" @click="$router.push('/')">
          ✨ Miku Gallery
        </div>
  
        <div class="nav-links">
          <router-link to="/" active-class="active">首页</router-link>
          <router-link to="/wiki" active-class="active">周边Wiki</router-link>
          <router-link to="/encyclopedia" active-class="active">百科</router-link>
          <router-link to="/projects" active-class="active">企划</router-link>
          <router-link to="/events" active-class="active">活动</router-link>
          <router-link to="/circle" active-class="active">社团</router-link>
        </div>
  
        <div class="nav-actions">
          <button class="btn-create" @click="$router.push('/group-buy/new')">
            📦 一键开团
          </button>
          
          <div v-if="user" class="user-menu">
            <span class="username" @click="$router.push('/dashboard')">
              {{ user.user_metadata?.username || user.email }}
            </span>
          </div>
          <div v-else class="auth-btns">
            <router-link to="/login" class="btn-login">登录</router-link>
            <router-link to="/register" class="btn-register">注册</router-link>
          </div>
        </div>
      </div>
    </nav>
  </template>
  
  <script setup>
  import { computed } from 'vue'
  import { useUserStore } from '../../stores/userStore'
  
  const userStore = useUserStore()
  const user = computed(() => userStore.user)
  </script>
  
  <style scoped>
  .home-nav { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); border-bottom: 1px solid #eee; position: sticky; top: 0; z-index: 1000; box-shadow: 0 2px 10px rgba(0,0,0,0.03); }
  .nav-content { max-width: 1200px; margin: 0 auto; padding: 0 20px; height: 64px; display: flex; align-items: center; justify-content: space-between; }
  .logo { font-size: 20px; font-weight: 800; color: #39C5BB; cursor: pointer; letter-spacing: -0.5px; }
  .nav-links { display: flex; gap: 30px; }
  .nav-links a { text-decoration: none; color: #555; font-weight: 500; font-size: 15px; transition: 0.2s; position: relative; }
  .nav-links a:hover, .nav-links a.active { color: #39C5BB; }
  .nav-actions { display: flex; align-items: center; gap: 15px; }
  .btn-create { background: #39C5BB; color: white; border: none; padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: bold; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 8px rgba(57, 197, 187, 0.2); }
  .btn-create:hover { background: #2da8a0; transform: translateY(-1px); }
  .auth-btns { display: flex; gap: 10px; }
  .btn-login { color: #666; text-decoration: none; font-size: 14px; }
  .btn-register { background: #333; color: white; text-decoration: none; padding: 6px 14px; border-radius: 4px; font-size: 14px; }
  .username { cursor: pointer; font-weight: bold; color: #333; }
  </style>