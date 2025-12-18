<template>
    <div class="banner-wrapper">
      <div v-if="banners.length > 0" class="carousel-container">
        <div 
          v-for="(b, index) in banners" 
          :key="b.id" 
          class="banner-slide" 
          :class="{ active: index === activeIndex }"
          :style="{ backgroundImage: `url(${b.image_url})` }"
          @click="handleClick(b)"
        >
          <div v-if="b.title || b.description" class="banner-text">
            <h2 v-if="b.title">{{ b.title }}</h2>
            <p v-if="b.description">{{ b.description }}</p>
          </div>
        </div>
        
        <div class="indicators">
          <span 
            v-for="(b, idx) in banners" 
            :key="idx" 
            :class="{ active: idx === activeIndex }"
            @click="activeIndex = idx"
          ></span>
        </div>
      </div>
  
      <div v-else class="banner-content default-banner">
        <img src="https://ec.crypton.co.jp/pages/prod/vocaloid/img/main_mikuv4x_b.png" class="banner-bg" />
        <div class="banner-text">
          <h2>Miku World</h2>
          <p>Loading...</p>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, onUnmounted } from 'vue'
  
  const props = defineProps({
    banners: { type: Array, default: () => [] }
  })
  
  const activeIndex = ref(0)
  let timer = null
  
  const startCarousel = () => {
    timer = setInterval(() => {
      if (props.banners.length > 1) {
        activeIndex.value = (activeIndex.value + 1) % props.banners.length
      }
    }, 5000)
  }
  
  const handleClick = (b) => {
    if (b.link_url) {
      if (b.link_url.startsWith('http')) window.open(b.link_url, '_blank')
      else window.location.href = b.link_url // 简单跳转
    }
  }
  
  onMounted(startCarousel)
  onUnmounted(() => { if(timer) clearInterval(timer) })
  </script>
  
  <style scoped>
  .banner-wrapper { height: 200px; border-radius: 12px; overflow: hidden; position: relative; margin-bottom: 20px; background: #333; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
  .carousel-container { width: 100%; height: 100%; position: relative; }
  .banner-slide { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-size: cover; background-position: center; opacity: 0; transition: opacity 0.5s ease; cursor: pointer; }
  .banner-slide.active { opacity: 1; z-index: 1; }
  .banner-text { position: absolute; bottom: 20px; left: 30px; color: white; text-shadow: 0 2px 4px rgba(0,0,0,0.5); z-index: 2; }
  .banner-text h2 { margin: 0; font-size: 24px; }
  .banner-text p { margin: 5px 0 0 0; opacity: 0.9; }
  .indicators { position: absolute; bottom: 15px; right: 20px; display: flex; gap: 8px; z-index: 3; }
  .indicators span { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.5); cursor: pointer; transition: 0.3s; }
  .indicators span.active { background: white; transform: scale(1.2); }
  .default-banner .banner-bg { width: 100%; height: 100%; object-fit: cover; opacity: 0.6; }
  </style>