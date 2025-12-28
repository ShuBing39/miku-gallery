import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv'; 

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// 🔑 你的管理员 ID (从刚才的修复脚本里拿来的)
// 这样爬下来的商品会自动归属到你的名下，方便管理
const ADMIN_USER_ID = '13483eb4-8d32-4b7c-84d3-2d7b3f8abe04'; 

if (!SUPABASE_KEY) {
  console.error("❌ 错误：找不到 Key！请确认 .env 里有 SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const MM_GOODS_URL = 'https://magicalmirai.com/2025/goods.html'; 

// ⏳ 延时函数，防止请求太快被封 IP
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeMagicalMirai() {
  console.log(`\n🚀 启动【魔法未来 2025】专用爬虫...`);
  console.log(`🔗 目标网址: ${MM_GOODS_URL}`);

  try {
    // 伪装成浏览器
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
    };

    const response = await axios.get(MM_GOODS_URL, { headers });
    const $ = cheerio.load(response.data);
    
    // 📦 策略：魔法未来官网通常用 grid 布局，我们寻找包含“价格”和“图片”的容器
    const itemsFound = [];
    
    // 遍历所有图片，向上查找父容器
    $('img').each((i, img) => {
      const $img = $(img);
      const src = $img.attr('src');
      
      // 过滤掉导航栏图标、Logo等无关图片
      if (!src || src.match(/(logo|icon|banner|nav|footer|header|btn)/i)) return;

      // 向上寻找包含价格信息的父级 (尝试找 3 层)
      const $parent = $img.closest('div, li, dd, td');
      const text = $parent.text().trim();
      
      // 必须包含价格符号 (¥ 或 円) 或者是 Price 单词
      if (text.match(/(¥|円|Price|PRICE)/)) {
        
        // 1. 提取名称 (通常在 h3, h4, strong, .name, .title').first().text().trim();
        let name = $parent.find('h3, h4, strong, .name, .title').first().text().trim();
        if (!name) {
            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
            if (lines.length > 0) name = lines[0];
        }
        if (!name) name = '魔法未来2025周边';
        if (name.length > 60) name = name.substring(0, 60) + '...';

        // 2. 补全图片链接
        let fullImage = src;
        if (!src.startsWith('http')) {
          const baseUrlObj = new URL(MM_GOODS_URL);
          fullImage = new URL(src, baseUrlObj.href).href;
        }

        // 3. 提取价格
        let price = 0;
        const priceMatch = text.match(/([0-9,]+)\s*(?:円|¥)/);
        if (priceMatch) {
            price = parseInt(priceMatch[1].replace(/,/g, ''));
        }

        // 4. 查重并添加
        if (!itemsFound.some(it => it.image_url === fullImage)) {
           itemsFound.push({
             name: name,
             image_url: fullImage,
             price: price,
             link: MM_GOODS_URL,
             category: '魔法未来',
             author: 'Magical Mirai Official', // 这里的 author 是显示的文字作者
             status: 'approved',
             release_date: new Date().toISOString().split('T')[0],
             
             // ✅ [新增 1] 明确标记为官方制品 (防止混入同人区)
             is_fan_work: false, 
             
             // ✅ [新增 2] 绑定到管理员 ID (防止成为无主数据)
             user_id: ADMIN_USER_ID,
             
             is_ai: false
           });
        }
      }
    });

    console.log(`📦 扫描到 ${itemsFound.length} 个潜在商品，开始入库...`);

    if (itemsFound.length === 0) {
        console.warn("⚠️ 警告：没有找到商品。可能是官网页面结构还没更新，或者还没发布商品列表。");
    }

    for (const item of itemsFound) {
      // 查重：用图片链接查重
      const { data: existing } = await supabase.from('items').select('id').eq('image_url', item.image_url).single();

      if (existing) {
        process.stdout.write('.'); // 已存在
      } else {
        const { error } = await supabase.from('items').insert([item]);
        if (error) console.error(`❌ 入库失败: ${error.message}`);
        else process.stdout.write('✨');
      }
      await sleep(100); 
    }
    console.log('\n✅ 魔法未来商品抓取完成！');

  } catch (err) {
    console.error(`❌ 抓取失败: ${err.message}`);
    if (err.response && err.response.status === 404) {
        console.error("👉 原因：网址 404，请确认 goods.html 页面是否已经上线。");
    }
  }
}

scrapeMagicalMirai();