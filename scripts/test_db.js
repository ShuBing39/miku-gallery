import { createClient } from '@supabase/supabase-js';

// ⚠️ 1. 这里填你的 URL (在 App.vue 里找)
const SUPABASE_URL = 'https://rsktcmqaaycjxgwxgwxq.supabase.co';

// ⚠️ 2. 这里一定要填 service_role (Secret) Key，不是 anon Key！
// 去 Supabase 后台 -> Settings -> API -> service_role secret -> Reveal -> 复制
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJza3RjbXFhYXljanhnd3hnd3hxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ0MTQzNSwiZXhwIjoyMDgxMDE3NDM1fQ.oFLjppdU6euAvrWBjc1VLMIxoTcaI0aL7F-JDrMXaXc';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testConnection() {
  console.log('🔌 正在尝试连接数据库...');

  const { data, error } = await supabase
    .from('items')
    .insert([
      { 
        name: '🤖 测试机器人', 
        price: 999, 
        image_url: null,
        link: 'http://test.com'
      }
    ])
    .select();

  if (error) {
    console.error('❌ 连接失败！原因如下：');
    console.error(error); // 👈 这里会打印出真正的罪魁祸首
  } else {
    console.log('✅ 连接成功！');
    console.log('数据已写入:', data);
    console.log('快去 Supabase 表格里看看有没有“测试机器人”？');
  }
}

testConnection();