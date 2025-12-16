import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv'; 

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
  console.error("❌ 错误：找不到 Key！请确认 .env 里有 SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const BASE_URL = 'https://blog.piapro.net/category/event';
const MAX_PAGES = 500; 

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 📅 智能日期提取器 (V2.0)
// 目标：提取 "文章发布日" 和 "活动结束日"
function analyzeDates(html, bodyText) {
  const $ = cheerio.load(html);
  
  // 1. 获取文章发布日期 (基础)
  let publishDate = null;
  let dateText = $('.entry-date').text() || $('.published').text() || $('.date').text();
  if (dateText) {
    const match = dateText.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (match) publishDate = `${match[1]}-${match[2].padStart(2,'0')}-${match[3].padStart(2,'0')}`;
  }
  if (!publishDate) publishDate = new Date().toISOString().split('T')[0]; // 兜底

  // 2. 🕵️‍♂️ 侦测活动真实时间 (进阶)
  // 我们试图寻找 “~ M月D日” 或者 “～ M月D日” 这种模式，通常表示结束时间
  // 还要寻找年份，防止跨年活动出错
  let eventEndDate = null;
  let eventStartDate = publishDate; // 默认开始时间是发布日，除非找到更晚的日期

  // 匹配模式： "2月4日（火）～2月11日（火）" 或 "2025年2月4日..."
  // 这里的正则比较宽泛，为了尽可能捕获
  const periodRegex = /(\d{4}年)?(\d{1,2})月(\d{1,2})日\s*[（(].*?[）)]?\s*[～~]\s*(\d{1,2})月(\d{1,2})日/;
  const match = bodyText.match(periodRegex);

  if (match) {
    // match[1] = 年份 (可能为空), match[4] = 结束月, match[5] = 结束日
    const currentYear = match[1] ? match[1].replace('年', '') : new Date(publishDate).getFullYear();
    const endMonth = match[4].padStart(2, '0');
    const endDay = match[5].padStart(2, '0');
    
    // 组装结束日期
    eventEndDate = `${currentYear}-${endMonth}-${endDay}`;

    // 如果结束日期比发布日期还早 (跨年了?)，可能年份要+1
    if (eventEndDate < publishDate && !match[1]) {
       eventEndDate = `${parseInt(currentYear) + 1}-${endMonth}-${endDay}`;
    }

    // 如果找到了范围，开始日期也可以优化 (match[2], match[3])
    if (match[2] && match[3]) {
        const startMonth = match[2].padStart(2, '0');
        const startDay = match[3].padStart(2, '0');
        eventStartDate = `${currentYear}-${startMonth}-${startDay}`;
    }
  } else {
    // 如果找不到明确的时间范围，默认给一个宽限期
    // 比如演唱会或活动通常在发布后会持续 1-2 个月
    // 为了不让它立刻变灰，我们假设它有效期为发布后 30 天
    // *注意：这只是权宜之计，最好还是人工后台修正，但爬虫能做个大概*
    const d = new Date(publishDate);
    d.setDate(d.getDate() + 30); // 默认有效期30天
    eventEndDate = d.toISOString().split('T')[0];
  }

  return { publishDate, eventStartDate, eventEndDate };
}

// 🕵️‍♂️ 角色探测
function findCharactersInText(text) {
  const found = new Set();
  const lower = text.toLowerCase();
  if (text.includes('ミク') || text.includes('初音') || lower.includes('miku')) found.add('初音未来');
  if (text.includes('リン') || text.includes('鏡音') || lower.includes('rin')) found.add('镜音铃');
  if (text.includes('レン') || text.includes('鏡音') || lower.includes('len')) found.add('镜音连');
  if (text.includes('ルカ') || text.includes('巡音') || lower.includes('luka')) found.add('巡音流歌');
  if (text.includes('MEIKO') || text.includes('メイコ')) found.add('MEIKO');
  if (text.includes('KAITO') || text.includes('カイト')) found.add('KAITO');
  return found;
}

// ✨ 元数据分析
function analyzeEventMetadata($, title) {
  const images = [];
  $('.entry-content img').each((i, el) => {
    const src = $(el).attr('src');
    if (src && !src.includes('avatar') && !src.includes('icon') && !src.includes('banner')) images.push(src);
  });

  let externalLink = null;
  $('.entry-content a').each((i, el) => {
    const text = $(el).text();
    const href = $(el).attr('href');
    if (href && !href.includes('piapro.net') && (text.includes('こちら') || text.includes('サイト') || text.includes('WEB') || text.includes('詳細'))) {
        externalLink = href;
    }
  });

  const fullText = `${title} ${$('.entry-content').text()}`;
  const characterSet = findCharactersInText(fullText);
  let character = characterSet.size > 0 ? Array.from(characterSet).join('/') : '全员/混合';
  if (characterSet.size > 2) character = '全员/混合';

  let category = '线下活动'; 
  if (fullText.includes('マジカルミライ') || fullText.includes('Magical Mirai')) category = '魔法未来';
  else if (fullText.includes('SNOW MIKU') || fullText.includes('雪ミク')) category = '雪未来';
  else if (fullText.includes('MIKU EXPO')) category = 'MIKU EXPO';
  else if (fullText.includes('シンフォニー') || fullText.includes('Symphony')) category = '交响乐会';
  else if (fullText.includes('ライブ') || fullText.includes('コンサート')) category = '演唱会';
  else if (fullText.includes('カフェ') || fullText.includes('コラボ')) category = '联动/咖啡厅';
  else if (fullText.includes('展') || fullText.includes('フェス')) category = '展览/漫展';

  return { images, externalLink, character, category, fullText };
}

async function scrapeEvents() {
  console.log(`🚀 启动【活动情报爬虫 V2 - 智能日期版】...`);
  
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  for (let page = 1; page <= MAX_PAGES; page++) {
    let currentListUrl = page === 1 ? BASE_URL : `${BASE_URL}/page/${page}`;
    console.log(`\n📄 [第 ${page} 页] 扫描中...`);

    try {
      const listResponse = await axios.get(currentListUrl, { headers });
      const $list = cheerio.load(listResponse.data);
      const links = [];

      $list('h1, h2, h3').find('a').each((i, el) => {
        const link = $list(el).attr('href');
        if (link && link.includes('blog.piapro.net')) {
          if (!links.includes(link)) links.push(link);
        }
      });

      if (links.length === 0) break;

      for (const detailUrl of links) {
        // 我们这次每次都更新，因为我们要修正日期逻辑
        const { data: existing } = await supabase.from('items').select('id').eq('link', detailUrl).single();
        
        try {
          const detailResponse = await axios.get(detailUrl, { headers });
          const $ = cheerio.load(detailResponse.data);
          
          const title = $('.entry-title').text().trim();
          const { images, externalLink, character, category, fullText } = analyzeEventMetadata($, title);
          
          // 🔥 关键：智能日期分析
          const { publishDate, eventStartDate, eventEndDate } = analyzeDates(detailResponse.data, fullText);

          const mainImage = images.length > 0 ? images[0] : null; 

          const itemData = { 
            name: title,
            price: 0,
            image_url: mainImage, 
            link: detailUrl, 
            external_link: externalLink,
            character: character, 
            category: category, 
            author: '官方', 
            // 🔥 这里做个区分：
            // release_date 用来排序（用活动开始时间，这样未来的活动会排在最上面）
            release_date: eventStartDate, 
            // event_end_date 用来判断是否结束
            event_end_date: eventEndDate,
            is_ai: false 
          };

          let itemId = null;

          if (existing) {
             process.stdout.write(`   🔄 更新 [${category}] ${eventStartDate}~${eventEndDate} `);
             await supabase.from('items').update(itemData).eq('id', existing.id);
             itemId = existing.id;
          } else {
             process.stdout.write(`   🆕 新增 [${category}] ${eventStartDate}~${eventEndDate} `);
             const { data: newItem, error } = await supabase.from('items').insert([itemData]).select();
             if (!error && newItem) itemId = newItem[0].id;
          }

          if (itemId && images.length > 0) {
            await supabase.from('item_images').delete().eq('item_id', itemId);
            const imageInserts = images.map(url => ({ item_id: itemId, image_url: url }));
            await supabase.from('item_images').insert(imageInserts);
            process.stdout.write(`+${images.length}图 ✅`);
          } else {
            console.log('✅');
          }
          
          console.log('');
          await sleep(200); 

        } catch (innerErr) { console.log(`❌ 跳过: ${innerErr.message}`); }
      }
    } catch (err) { 
      if (err.response && err.response.status === 404) { console.log("🛑 结束"); break; }
      console.error(`❌ 错误: ${err.message}`); 
      await sleep(1000);
    }
  }
}

scrapeEvents();