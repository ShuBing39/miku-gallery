import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv'; 

dotenv.config();

// 优先读取 Service Key (红钥匙)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
  console.error("❌ 错误：找不到 Key！请确认 .env 里有 SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const BASE_URL = 'https://blog.piapro.net/category/goods';
const MAX_PAGES = 10; // ⚠️ 为了精准修复，建议先跑 10 页看看效果

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ✨ 新的核心技术：从网页文字里抠出日期
// 目标格式： "2025年11月27日" -> "2025-11-27"
function extractDateFromHTML(html) {
  const $ = cheerio.load(html);
  // 1. 尝试找 .entry-date 或 .published (标准博客结构)
  let dateText = $('.entry-date').text() || $('.published').text() || $('.date').text();
  
  // 2. 如果找不到，就在全文里搜正则 (最暴力但也最有效)
  if (!dateText) {
    const bodyText = $('body').text();
    // 匹配 "202x年xx月xx日"
    const match = bodyText.match(/20\d{2}年\d{1,2}月\d{1,2}日/);
    if (match) dateText = match[0];
  }

  if (dateText) {
    // 把 "2025年11月27日" 转换成 "2025-11-27"
    const match = dateText.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (match) {
      const year = match[1];
      const month = match[2].padStart(2, '0'); // 补零: 9 -> 09
      const day = match[3].padStart(2, '0');   // 补零: 5 -> 05
      return `${year}-${month}-${day}`;
    }
  }
  return null;
}

// 标签分析 (保持不变)
function analyzeTitle(title) {
  let character = null;
  let category = null;
  if (title.includes('ミク')) character = '初音未来';
  if (title.includes('リン') || title.includes('レン')) character = '镜音双子';
  if (title.includes('ルカ')) character = '巡音流歌';
  if (title.includes('MEIKO')) character = 'MEIKO';
  if (title.includes('KAITO')) character = 'KAITO';
  if (title.includes('ピアプロキャラクターズ')) character = '全员/混合';

  if (title.includes('フィギュア') || title.includes('ねんどろいど')) category = '手办模型';
  if (title.includes('ぬいぐるみ')) category = '毛绒玩偶';
  if (title.includes('アパレル') || title.includes('Tシャツ')) category = '服饰穿搭';
  if (title.includes('缶バッジ') || title.includes('キーホルダー')) category = '小谷子';
  return { character, category };
}

async function scrapeAllPages() {
  console.log(`🚀 启动【精准日期修复版】爬虫...`);
  
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  for (let page = 1; page <= MAX_PAGES; page++) {
    let currentListUrl = page === 1 ? BASE_URL : `${BASE_URL}/page/${page}`;
    console.log(`\n📄 [第 ${page} 页] 正在读取列表...`);

    try {
      const listResponse = await axios.get(currentListUrl, { headers, timeout: 10000 });
      const $ = cheerio.load(listResponse.data);
      const links = [];

      $('h1, h2, h3').find('a').each((i, el) => {
        const link = $(el).attr('href');
        if (link && link.includes('blog.piapro.net')) {
          if (!links.includes(link)) links.push(link);
        }
      });

      console.log(`   found ${links.length} links.`);

      for (const detailUrl of links) {
        // 1. 检查数据库有没有这条数据
        const { data: existing } = await supabase
          .from('items')
          .select('id, release_date')
          .eq('link', detailUrl)
          .single();

        // 🛑 核心修改：不管数据库里有没有日期，我们都重新抓一次网页，获取最准确的日期
        // 除非已经手动确认过 (为了节省时间，如果日期看起来很完美比如不是01号，也许可以跳过，但为了修复之前的错误，建议全部跑一遍)
        
        try {
            // 获取详情页 HTML
            const detailResponse = await axios.get(detailUrl, { headers, timeout: 10000 });
            
            // ✨ 提取精准日期
            const realDate = extractDateFromHTML(detailResponse.data);
            
            // 解析其他信息 (如果是新数据需要用到)
            const $detail = cheerio.load(detailResponse.data);
            const title = $detail('.entry-title').text().trim();
            const image = $detail('.entry-content img').first().attr('src');
            
            // 价格提取
            const contentText = $detail('.entry-content').text();
            const priceMatch = contentText.match(/([0-9,]+)円/);
            let finalPrice = 0;
            if (priceMatch) finalPrice = parseInt(priceMatch[1].replace(/,/g, ''));
            const tags = analyzeTitle(title);

            // 🔄 分支 A: 更新旧数据
            if (existing) {
                // 如果抓到了新日期，并且 (旧日期不存在 OR 旧日期和新日期不一样)
                if (realDate && existing.release_date !== realDate) {
                    process.stdout.write(`   🛠️ 修正日期 ID:${existing.id}: ${existing.release_date || '无'} -> ${realDate} `);
                    await supabase.from('items').update({ release_date: realDate }).eq('id', existing.id);
                    console.log('✅');
                } else {
                    process.stdout.write('.'); // 日期一致，无需修改
                }
            } 
            // 🆕 分支 B: 插入新数据
            else {
                process.stdout.write(`   🆕 新增: ${title.substring(0, 10)}... [${realDate}] `);
                await supabase.from('items').insert([{ 
                    name: title, 
                    price: finalPrice, 
                    image_url: image,
                    link: detailUrl,
                    character: tags.character, 
                    category: tags.category,
                    release_date: realDate // 存入精准日期
                }]);
                console.log('✨');
            }

            // 休息一下，因为我们要频繁请求详情页
            await sleep(800); 

        } catch (innerErr) {
            console.log(`   ❌ 读取详情失败: ${detailUrl} - ${innerErr.message}`);
        }
      }
    } catch (err) {
      console.error(`❌ 列表页失败: ${err.message}`);
    }
  }
  console.log('\n🎉 修复完成！');
}

scrapeAllPages();