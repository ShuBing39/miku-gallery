<script setup>
    import { ref, onMounted } from 'vue';
    import { useRoute } from 'vue-router';
    import { supabase } from '../supabase'; // 确保这一行路径是对的
    
    const route = useRoute();
    const project = ref(null);
    const loading = ref(true);
    const errorMsg = ref('');
    
    onMounted(async () => {
      try {
        const projectId = route.params.id;
        // 简单的获取数据
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();
    
        if (error) throw error;
        project.value = data;
      } catch (e) {
        console.error(e);
        errorMsg.value = '加载失败: ' + e.message;
      } finally {
        loading.value = false;
      }
    });
    </script>
    
    <template>
      <div style="padding: 20px;">
        <div v-if="loading">正在读取数据库...</div>
    
        <div v-else-if="errorMsg" style="color: red;">
          出错了：{{ errorMsg }}
        </div>
    
        <div v-else-if="project">
          <h1>{{ project.title }}</h1>
          <p style="color: gray;">状态: {{ project.status }}</p>
          <hr />
          <p>{{ project.description }}</p>
          <br />
          <div style="background: #f0f0f0; padding: 10px;">
            <p>金额: ¥{{ project.current_amount }} / ¥{{ project.target_amount }}</p>
          </div>
        </div>
    
        <div v-else>没有找到该企划。</div>
      </div>
    </template>