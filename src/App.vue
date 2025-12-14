<template>
  <div class="container">
    <h1 style="color: #39C5BB; text-align: center;">初音未来周边图鉴</h1>
    
    <div class="grid">
      <a 
        v-for="item in items" 
        :key="item.id" 
        :href="item.link" 
        target="_blank" 
        class="card"
      >
        <img :src="item.image_url" class="card-image" />
        
        <div class="card-info">
          <h3 class="card-title">{{ item.name }}</h3>
          <p class="price">¥{{ item.price }}</p>
        </div>
      </a>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rsktcmqaaycjxgwxgwxq.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJza3RjbXFhYXljanhnd3hnd3hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NDE0MzUsImV4cCI6MjA4MTAxNzQzNX0.qw1KfL-ZOnwhhWQ0JYGuCLBAh4vTTi61B2ynpf5wv1g'

const supabase = createClient(supabaseUrl, supabaseKey)
const items = ref([])

onMounted(async () => {
  const { data, error } = await supabase
    .from('items')
    .select('id, name, price, image_url, link')
    
  if (data) {
    items.value = data
  } else {
    console.error(error)
  }
})
</script>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  overflow: hidden;
  transition: transform 0.2s;
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}

.card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0,0,0,0.15);
}

.card-image {
  width: 100%;
  height: 200px;
  object-fit: contain;
  display: block;
  background-color: #fafafa;
}

.card-info {
  padding: 15px;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.card-title {
  margin: 0 0 10px 0;
  font-size: 1.1rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  height: 2.8em;
}

.price {
  color: #ffcc00;
  font-weight: bold;
  font-size: 1.2rem;
  margin: 0;
}
</style>