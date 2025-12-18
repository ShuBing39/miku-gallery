<template>
    <div class="card" @click="goDetail">
      <div class="card-img-box">
        <span class="id-badge">#{{ item.id }}</span>
        <img :src="item.image_url" class="card-image" loading="lazy" @error="handleImgError" />
        <span v-if="item.is_fan_work" class="fan-tag">🎨 同人作品</span>
      </div>
      <div class="card-info">
        <div class="tags">
           <span class="tag char-tag">{{ item.character }}</span>
           <span class="tag cat-tag">{{ item.category }}</span>
        </div>
        <h3 class="card-title">{{ item.name }}</h3>
        <div class="card-footer">
           <div class="price-box">
             <p v-if="item.market_price" class="market-price">¥{{ item.market_price }}</p>
             <p class="price" :class="{ 'original-crossed': item.market_price }">¥{{ item.price }}</p>
           </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { useRouter } from 'vue-router'
  import { handleImgError } from '../../utils/formatters'
  
  const props = defineProps({
    item: { type: Object, required: true }
  })
  
  const router = useRouter()
  
  const goDetail = () => {
    router.push(`/item/${props.item.id}`)
  }
  </script>
  
  <style scoped>
  .card { background: white; border-radius: 10px; border: 1px solid #f0f0f0; overflow: hidden; text-decoration: none; color: inherit; position: relative; transition: transform 0.2s; box-shadow: 0 2px 5px rgba(0,0,0,0.03); cursor: pointer; }
  .card:hover { transform: translateY(-3px); box-shadow: 0 5px 15px rgba(0,0,0,0.08); border-color: #39C5BB; }
  .card-img-box { position: relative; width: 100%; aspect-ratio: 1/1; background: #fff; padding: 10px; box-sizing: border-box; }
  .card-image { width: 100%; height: 100%; object-fit: contain; }
  .id-badge { position: absolute; top: 6px; right: 6px; background: rgba(0,0,0,0.4); color: white; font-size: 10px; padding: 2px 5px; border-radius: 4px; z-index: 2; }
  .fan-tag { position: absolute; top: 6px; left: 6px; background: rgba(255, 152, 0, 0.9); color: white; font-size: 10px; padding: 3px 6px; border-radius: 4px; z-index: 2; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2); backdrop-filter: blur(2px); }
  .card-info { padding: 10px; }
  .tags { margin-bottom: 5px; }
  .tag { font-size: 10px; padding: 2px 6px; background: #f0f0f0; border-radius: 4px; color: #666; margin-right: 4px; }
  .cat-tag { background-color: #f3e5f5; color: #4a148c; }
  .char-tag { background-color: #e0f7fa; color: #006064; }
  .card-title { font-size: 13px; margin: 0 0 8px 0; height: 2.8em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .card-footer { display: flex; justify-content: space-between; align-items: flex-end; } 
  .price-box { display: flex; flex-direction: column; align-items: flex-start; }
  .price { color: #ff5588; font-weight: bold; font-size: 15px; margin: 0; }
  .original-crossed { text-decoration: line-through; color: #ccc; font-size: 12px; font-weight: normal; }
  .market-price { color: #ff5500; font-weight: 800; font-size: 15px; margin: 0; }
  </style>