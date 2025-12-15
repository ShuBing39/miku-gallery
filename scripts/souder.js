import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv'; 

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY; 

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BASE_URL = 'https://blog.piapro.net/category/goods';
const MAX_PAGES = 3; 

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

async function scrapeAllPages() {
  console.log(`🚀 启动智能爬虫 V2.0 (覆盖更新模式)...`);

  for (let page = 1; page <= MAX_PAGES; page++) {
    let currentListUrl = page === 1 ? BASE_URL : `${BASE_URL}/page/${page}`;
    console.log(`\n📄 [第 ${page} 页] 正在扫描...`);

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

      for (const detailUrl of links) {
        try {
          // 1. 不管存不存在，先抓取详情，获取最新信息
          const detailResponse = await axios.get(detailUrl);
          const $detail = cheerio.load(detailResponse.data);

          const title = $detail('.entry-title').text().trim();
          const image = $detail('.entry-content img').first().attr('src');
          
          const contentText = $detail('.entry-content').text();
          const priceMatch = contentText.match(/([0-9,]+)円/);
          let finalPrice = 0;
          if (priceMatch) finalPrice = parseInt(priceMatch[1].replace(/,/g, ''));

          // 2. 分析标签
          const tags = analyzeTitle(title);

          // 3. 检查数据库是否存在
          const { data: existing } = await supabase
            .from('items')
            .select('id')
            .eq('link', detailUrl)
            .single();

          if (existing) {
            // ✨ 关键修改：如果存在，执行 UPDATE 更新操作
            await supabase
              .from('items')
              .update({
                name: title,
                price: finalPrice,
                image_url: image || null,
                character: tags.character,
                category: tags.category
              })
              .eq('id', existing.id);
            
            process.stdout.write('↻'); // 打印刷新符号，代表更新
          } else {
            // ✨ 如果不存在，执行 INSERT 插入操作
            await supabase
              .from('items')
              .insert([{ 
                  name: title, 
                  price: finalPrice, 
                  image_url: image || null,
                  link: detailUrl,
                  character: tags.character, 
                  category: tags.category    
              }]);
            process.stdout.write('+'); // 打印加号，代表新增
          }

        } catch (err) {
          console.error('x');
        }
        await sleep(500); // 稍微快一点
      }
    } catch (err) {
      console.error(`❌ 页面错误:`, err.message);
    }
  }
  console.log('\n🎉 全部数据已同步最新标签！');
}

scrapeAllPages();