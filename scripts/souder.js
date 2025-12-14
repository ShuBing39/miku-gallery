import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

// ⚠️⚠️⚠️ 记得检查这里是不是填好了你的 URL 和 KEY ⚠️⚠️⚠️
const SUPABASE_URL = 'https://rsktcmqaaycjxgwxgwxq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJza3RjbXFhYXljanhnd3hnd3hxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ0MTQzNSwiZXhwIjoyMDgxMDE3NDM1fQ.oFLjppdU6euAvrWBjc1VLMIxoTcaI0aL7F-JDrMXaXc';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 基础链接
const BASE_URL = 'https://blog.piapro.net/category/goods';

// 🛑 配置：你想抓多少页？(建议先设为 3 页测试一下)
const MAX_PAGES = 3; 

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeAllPages() {
  console.log(`🚀 启动强力爬虫！准备抓取前 ${MAX_PAGES} 页数据...`);

  // --- 外层循环：控制页码 (第1页 到 第N页) ---
  for (let page = 1; page <= MAX_PAGES; page++) {
    
    // 构造当前页面的 URL
    let currentListUrl = BASE_URL;
    if (page > 1) {
      currentListUrl = `${BASE_URL}/page/${page}`;
    }

    console.log(`\n📄 [第 ${page} 页] 正在读取列表: ${currentListUrl}`);

    try {
      const listResponse = await axios.get(currentListUrl);
      const $ = cheerio.load(listResponse.data);
      const links = [];

      // 收集这一页的所有商品链接
      $('h1, h2, h3').find('a').each((i, el) => {
        const link = $(el).attr('href');
        const text = $(el).text();
        if (link && link.includes('blog.piapro.net') && text.trim().length > 5) {
          if (!links.includes(link)) links.push(link);
        }
      });

      console.log(`   👀 本页发现 ${links.length} 个商品，开始入库...`);

      // --- 内层循环：处理这一页里的每个商品 ---
      // (这里去掉了 maxItems 限制，既然要抓就全抓！)
      for (let i = 0; i < links.length; i++) {
        const detailUrl = links[i];
        
        // 检查数据库里是不是已经有了？(防止重复抓取浪费时间)
        const { data: existing } = await supabase
          .from('items')
          .select('id')
          .eq('link', detailUrl)
          .single();

        if (existing) {
          console.log(`   ⏭️ 跳过 (已存在): ${detailUrl.slice(-20)}`);
          continue; // 跳过本次循环，直接下一个
        }

        try {
          // 访问详情页
          const detailResponse = await axios.get(detailUrl);
          const $detail = cheerio.load(detailResponse.data);

          const title = $detail('.entry-title').text().trim();
          const image = $detail('.entry-content img').first().attr('src');
          
          // 清洗价格
          const contentText = $detail('.entry-content').text();
          const priceMatch = contentText.match(/([0-9,]+)円/);
          let finalPrice = 0;
          if (priceMatch) {
              const rawPrice = priceMatch[1].replace(/,/g, ''); 
              finalPrice = parseInt(rawPrice);
          }

          // 入库
          const { error } = await supabase
              .from('items')
              .insert([{ 
                  name: title, 
                  price: finalPrice, 
                  image_url: image || null,
                  link: detailUrl
              }]);

          if (!error) {
              console.log(`   💾 [成功] ${title.substring(0, 15)}...`);
          }

        } catch (err) {
          console.error('   ❌ 详情页抓取失败:', err.message);
        }

        // 这里的 sleep 很重要！翻页抓取量大，不休息会被封号
        await sleep(1000); 
      }

    } catch (err) {
      console.error(`❌ 第 ${page} 页列表读取失败:`, err.message);
    }
    
    // 每翻一页，额外多休息 2 秒
    console.log('🍵 翻页休息中...');
    await sleep(2000);
  }

  console.log('\n🎉 所有页面抓取任务完成！');
}

scrapeAllPages();