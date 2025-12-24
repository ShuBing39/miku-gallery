import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// ... (初始化部分保持不变) ...
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!SUPABASE_KEY || !GEMINI_API_KEY) {
  console.error("❌ 错误：缺少 Key！");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const BASE_DOMAIN = 'https://blog.piapro.net';
const BASE_URL = 'https://blog.piapro.net/category/event/';
const MAX_PAGES = 3; 

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 🧠 AI 只负责翻译，不再负责猜时间，防止它瞎猜
async function analyzeWithGemini(title, content) {
  try {
    const prompt = `
    你是一个活动情报员。请分析以下初音未来活动信息：
    标题：${title}
    内容片段：${content.slice(0, 800)}

    请返回纯 JSON 格式：
    {
      "localized_title": "中文标题(精简)",
      "localized_description": "中文简介(50字内)",
      "event_type": "concert/exhibition/collab/sale/other",
      "needs_reservation": true/false
    }
    `;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().replace(/```json|```/g, '').trim();
    return JSON.parse(text);
  } catch (error) {
    return { localized_title: "", localized_description: "", event_type: 'other', needs_reservation: false };
  }
}

// 📅 贪婪抓取所有日期
function extractAllDates(html) {
  const $ = cheerio.load(html);
  const text = $('.entry-content').text().replace(/\s+/g, ' '); 
  
  // 匹配各种格式：
  // 2025年10月18日
  // 10月18日
  // 2025/10/18
  // 2025.10.18
  const regex = /((202[4-9]年)?\d{1,2}月\d{1,2}日|(202[4-9][\/\.]\d{1,2}[\/\.]\d{1,2}))/g;
  
  const matches = [...text.matchAll(regex)].map(m => m[0]);
  
  // 去重并拼接
  const uniqueDates = [...new Set(matches)];
  
  if (uniqueDates.length === 0) return null;
  return uniqueDates.join(' | '); // 用竖线分隔，方便查看
}

function parsePublishDate(html) {
  const $ = cheerio.load(html);
  let dateText = $('.entry-date').text() || $('.published').text();
  let match = dateText.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (match) return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
  return new Date().toISOString().split('T')[0];
}

async function fetchHtml(url) {
  try {
    const response = await fetch(url, { method: 'GET', headers: HEADERS, redirect: 'follow' });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.text();
  } catch (error) {
    throw new Error(`下载失败: ${error.message}`);
  }
}

function fixImageUrl(imgUrl) {
  if (!imgUrl) return null;
  if (imgUrl.startsWith('/')) return `${BASE_DOMAIN}${imgUrl}`;
  if (imgUrl.startsWith('http://')) return imgUrl.replace('http://', 'https://');
  return imgUrl;
}

// 🚀 主程序
async function scrapeEvents() {
  console.log(`🚀 启动【全量日期捕获爬虫 V8.0】...`);
  
  console.log(`🧹 清理旧数据...`);
  await supabase.from('events').delete().neq('id', 0); 
  
  let totalProcessed = 0;

  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      console.log(`\n📄 [第 ${page} 页] 扫描中...`);
      const listUrl = page === 1 ? BASE_URL : `${BASE_URL}page/${page}/`;
      let html;
      try { html = await fetchHtml(listUrl); } catch (e) { continue; }

      const $ = cheerio.load(html);
      const links = [];
      $('h1, h2, h3').find('a').each((i, el) => {
        const link = $(el).attr('href');
        if (link && link.includes('blog.piapro.net')) links.push(link);
      });

      for (const link of links) {
        try {
          const detailHtml = await fetchHtml(link);
          const $$ = cheerio.load(detailHtml);
          
          const title = $$('.entry-title').text().trim();
          const content = $$('.entry-content').text().trim();
          let rawImage = $$('.entry-content img').first().attr('src');
          if (!rawImage) rawImage = $$('.entry-content img').first().attr('data-src');
          if (!rawImage) rawImage = $$('meta[property="og:image"]').attr('content');
          const mainImage = fixImageUrl(rawImage);
          const publishDate = parsePublishDate(detailHtml);

          if (!title) continue;

          process.stdout.write(`\n   🤖 分析: ${title.slice(0, 10)}... `);
          
          const aiData = await analyzeWithGemini(title, content);
          
          // ✅ 核心改变：抓取所有日期候选
          const allDates = extractAllDates(detailHtml);
          
          // 默认开始时间依然用发布时间兜底（防止空值），但我们有了备忘录！
          // 管理员在后台会看到 allDates，然后手动修改
          
          const eventData = {
            title: title,
            description: content.slice(0, 200),
            localized_title: aiData.localized_title,
            localized_description: aiData.localized_description,
            event_type: aiData.event_type || 'other',
            start_date: publishDate, // 先默认填发布日
            end_date: publishDate,
            date_candidates: allDates, // ✅ 把“情报源”全存进去！
            image_url: mainImage,
            source_url: link,
            status: 'upcoming',
            life_cycle_status: 'normal'
          };

          const { error } = await supabase.from('events').insert([eventData]);
          if (!error) {
             process.stdout.write(`[抓获日期: ${allDates ? allDates.slice(0, 20)+'...' : '无'}]`);
             totalProcessed++;
          }
          await sleep(1500); 

        } catch (err) {
          console.error(`❌ 跳过`);
        }
      }
    }
    console.log(`\n🎉 完成！共收录 ${totalProcessed} 条。`);
  } catch (fatalError) {
    console.error(`\n💥 错误: ${fatalError.message}`);
  }
}

scrapeEvents();