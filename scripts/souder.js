import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv'; // 1. 引入 dotenv

// 2. 启动加载
dotenv.config();

// 3. 从环境变量里取值 (process.env.变量名)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY; // 对应 .env 里的名字

// ...后面的代码完全不用变...
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BASE_URL = 'https://blog.piapro.net/category/goods';
const MAX_PAGES = 3; 

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 🧠 新增：鉴定师函数
function analyzeTitle(title) {
  let character = '其他角色'; // 默认值
  let category = '一般周边';   // 默认值

  // 1. 鉴定角色 (简单的关键词匹配)
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
  if (title.includes('缶バッジ') || title.includes('キーホルダー') || title.includes('スタンド')) category = '小谷子(吧唧/立牌)';
  if (title.includes('CD') || title.includes('DVD') || title.includes('楽曲')) category = '音乐/影音';
  if (title.includes('お菓子') || title.includes('コラボカフェ')) category = '食品/联动餐饮';

  return { character, category };
}

async function scrapeAllPages() {
  console.log(`🚀 启动智能爬虫！准备抓取并自动分类...`);

  for (let page = 1; page <= MAX_PAGES; page++) {
    let currentListUrl = page === 1 ? BASE_URL : `${BASE_URL}/page/${page}`;
    console.log(`\n📄 [第 ${page} 页] 正在扫描: ${currentListUrl}`);

    try {
      const listResponse = await axios.get(currentListUrl);
      const $ = cheerio.load(listResponse.data);
      const links = [];

      $('h1, h2, h3').find('a').each((i, el) => {
        const link = $(el).attr('href');
        if (link && link.includes('blog.piapro.net') && $(el).text().trim().length > 5) {
          if (!links.includes(link)) links.push(link);
        }
      });

      for (let i = 0; i < links.length; i++) {
        const detailUrl = links[i];
        
        // 检查是否存在
        const { data: existing } = await supabase
          .from('items')
          .select('id')
          .eq('link', detailUrl)
          .single();

        if (existing) {
          process.stdout.write('.'); // 存在就打印个点，不刷屏
          continue; 
        }

        try {
          const detailResponse = await axios.get(detailUrl);
          const $detail = cheerio.load(detailResponse.data);

          const title = $detail('.entry-title').text().trim();
          const image = $detail('.entry-content img').first().attr('src');
          
          const contentText = $detail('.entry-content').text();
          const priceMatch = contentText.match(/([0-9,]+)円/);
          let finalPrice = 0;
          if (priceMatch) finalPrice = parseInt(priceMatch[1].replace(/,/g, ''));

          // 🧠 调用鉴定师，获取标签
          const tags = analyzeTitle(title);

          const { error } = await supabase
              .from('items')
              .insert([{ 
                  name: title, 
                  price: finalPrice, 
                  image_url: image || null,
                  link: detailUrl,
                  character: tags.character, // ✨ 存入新字段
                  category: tags.category    // ✨ 存入新字段
              }]);

          if (!error) {
              console.log(`\n   🏷️ [${tags.character} | ${tags.category}] ${title.substring(0, 15)}...`);
          }

        } catch (err) {
          console.error('   ❌ 抓取失败:', err.message);
        }
        await sleep(1000); 
      }
    } catch (err) {
      console.error(`❌ 第 ${page} 页失败:`, err.message);
    }
    await sleep(2000);
  }
  console.log('\n🎉 任务完成！');
}

scrapeAllPages();