import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv'; 

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY; 

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BASE_URL = 'https://blog.piapro.net/category/goods';
const MAX_PAGES = 999; 

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function analyzeTitle(title) {
  let character = null; // 默认留空，不填“其他”
  let category = null;

  // 1. 鉴定角色
  if (title.includes('ミク')) character = '初音未来';
  if (title.includes('リン') || title.includes('レン')) character = '镜音双子';
  if (title.includes('ルカ')) character = '巡音流歌';
  if (title.includes('MEIKO')) character = 'MEIKO';
  if (title.includes('KAITO')) character = 'KAITO';
  if (title.includes('ピアプロキャラクターズ')) character = '全员/混合';

  // 2. 鉴定分类
  if (title.includes('フィギュア') || title.includes('ねんどろいど')) category = '手办模型';
  if (title.includes('ぬいぐるみ') || title.includes('マスコット')) category = '毛绒玩偶';
  if (title.includes('アパレル') || title.includes('Tシャツ') || title.includes('パーカー')) category = '服饰穿搭';
  if (title.includes('缶バッジ') || title.includes('キーホルダー') || title.includes('スタンド')) category = '小谷子';
  if (title.includes('CD') || title.includes('DVD') || title.includes('楽曲')) category = '音乐/影音';
  if (title.includes('お菓子') || title.includes('コラボカフェ')) category = '食品/餐饮';

  return { character, category };
}

// ... 前面的 import 和 analyzeTitle 函数保持不变 ...

async function scrapeAllPages() {
  console.log(`🚀 启动超级爬虫 (伪装版)...`);

  // ✨ 伪装成真实的浏览器 (非常重要！)
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,ja;q=0.7',
    'Referer': 'https://blog.piapro.net/' // 告诉它你是从它主页点进来的
  };

  // ⚠️ 建议修改这里：上次停在16页，我们从第 15 页开始续爬，看看会发生什么
  // 如果想爬完，可以把 endPage 设为 50 (先别设 999，太大了容易再次被封)
  const startPage = 37; 
  const endPage = 999;   

  for (let page = startPage; page <= endPage; page++) {
    let currentListUrl = page === 1 ? BASE_URL : `${BASE_URL}/page/${page}`;
    console.log(`\n📄 [第 ${page} 页] 正在扫描: ${currentListUrl}`);

    try {
      // ✨ 这是一个更稳健的请求写法
      const listResponse = await axios.get(currentListUrl, { headers, timeout: 10000 });
      
      const $ = cheerio.load(listResponse.data);
      const links = [];

      // 获取链接
      $('h1, h2, h3').find('a').each((i, el) => {
        const link = $(el).attr('href');
        if (link && link.includes('blog.piapro.net') && $(el).text().trim().length > 5) {
          if (!links.includes(link)) links.push(link);
        }
      });

      console.log(`   -> 本页发现 ${links.length} 个商品链接`);

      // 如果这一页没找到链接，可能是因为被反爬了，或者页面结构变了
      if (links.length === 0) {
        console.warn(`   ⚠️ 警告：第 ${page} 页没有抓到任何链接！可能是被封 IP 了，或者是最后一页。`);
        // 打印一下网页标题看看是不是 403 Forbidden
        console.log(`   网页标题: ${$('title').text()}`);
      }

      for (const detailUrl of links) {
        try {
          // 检查数据库
          const { data: existing } = await supabase
            .from('items')
            .select('id')
            .eq('link', detailUrl)
            .single();

          if (existing) {
             process.stdout.write('↻'); 
             continue; // 如果只为了抓新数据，这里可以直接跳过详细页请求
          }

          // 抓取详情页 (带 Headers)
          const detailResponse = await axios.get(detailUrl, { headers, timeout: 10000 });
          const $detail = cheerio.load(detailResponse.data);

          const title = $detail('.entry-title').text().trim();
          const image = $detail('.entry-content img').first().attr('src');
          const contentText = $detail('.entry-content').text();
          const priceMatch = contentText.match(/([0-9,]+)円/);
          let finalPrice = 0;
          if (priceMatch) finalPrice = parseInt(priceMatch[1].replace(/,/g, ''));

          const tags = analyzeTitle(title);

          // 插入数据
          const { error } = await supabase
              .from('items')
              .insert([{ 
                  name: title, 
                  price: finalPrice, 
                  image_url: image || null,
                  link: detailUrl,
                  character: tags.character, 
                  category: tags.category    
              }]);

          if (error) {
            // ✨ 详细打印数据库错误
            console.error(`\n   ❌ 数据库拒绝写入: ${title}`);
            console.error(`   原因: ${error.message}`);
          } else {
            console.log(`\n   ✨ 新增: [${tags.character}] ${title.substring(0, 15)}...`);
          }

        } catch (err) {
          // ✨ 详细打印网络错误状态码
          if (err.response) {
            console.error(`   ❌ 请求失败 (HTTP ${err.response.status}): ${detailUrl}`);
            if (err.response.status === 403 || err.response.status === 429) {
              console.error(`   🚨 严重警告：你被网站屏蔽了！请立刻停止爬虫，休息 1 小时再试。`);
              return; // 直接结束程序
            }
          } else {
            console.error('   ❌ 未知错误:', err.message);
          }
        }
        
        // ⏱️ 增加随机延迟 (2秒 到 5秒 之间)，像人类一样阅读
        const randomDelay = Math.floor(Math.random() * 3000) + 2000;
        await sleep(randomDelay); 
      }
    } catch (err) {
      console.error(`❌ 第 ${page} 页列表抓取失败:`, err.message);
      if (err.response && (err.response.status === 403 || err.response.status === 429)) {
         console.error(`🚨 列表页被屏蔽，程序终止。`);
         return;
      }
    }
    
    // 翻页休息时间加长
    await sleep(5000);
  }
  console.log('\n🎉 任务完成！');
}

scrapeAllPages();