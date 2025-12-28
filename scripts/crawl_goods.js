import dotenv from 'dotenv';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ProxyAgent, setGlobalDispatcher } from 'undici'; 
import { HttpsProxyAgent } from 'https-proxy-agent'; 
import process from 'process';
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import { fileURLToPath } from 'url';

// ⚠️ 忽略 SSL 证书错误 (解决代理连接的关键)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// === 🔧 路径定位 ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TARGET_ENV_PATH = path.resolve(__dirname, '..', '.env');

// 1. 加载配置
dotenv.config({ path: TARGET_ENV_PATH });

// === 🎨 日志颜色工具 ===
const colors = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  magenta: (text) => `\x1b[35m${text}\x1b[0m`,
  gray: (text) => `\x1b[90m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`
};

// === 🔧 获取环境变量 ===
function getEnvExplicit(keyName) {
  let val = process.env[keyName];
  if (!val && fs.existsSync(TARGET_ENV_PATH)) {
    try {
      const fileContent = fs.readFileSync(TARGET_ENV_PATH, 'utf-8');
      const regex = new RegExp(`(?:^|\\n)\\s*${keyName}\\s*=\\s*([^\\n\\r]+)`);
      const match = fileContent.match(regex);
      if (match && match[1]) val = match[1].trim().replace(/['"]/g, ''); 
    } catch (e) {}
  }
  return val;
}

// === 🔌 网络代理配置 ===
const proxyEnv = getEnvExplicit('HTTPS_PROXY');
let httpsAgent = null;

if (proxyEnv) {
  try {
    // 1. 给 Gemini (undici) 配置全局代理
    const dispatcher = new ProxyAgent({
        uri: proxyEnv,
        connect: { timeout: 30000 }
    });
    setGlobalDispatcher(dispatcher);
    
    // 2. 给 Axios 配置代理
    httpsAgent = new HttpsProxyAgent(proxyEnv);

    console.log(colors.magenta(`🔌 已启用全局网络代理: ${proxyEnv}`));
  } catch (e) {
    console.error(colors.red(`⚠️ 代理设置失败: ${e.message}`));
  }
} else {
  console.log(colors.yellow("⚠️ 未检测到 HTTPS_PROXY，连接可能会失败。"));
}

// === 配置区 ===
const BASE_URL = 'https://blog.piapro.net/category/goods';
const TABLE_NAME = 'items';
const SLEEP_MS = 2000; 
const FALLBACK_DATE = '2007-08-30'; 
const RECENT_MONTHS_LIMIT = 6; 

// === 初始化服务 ===
const supabaseUrl = getEnvExplicit('VITE_SUPABASE_URL') || getEnvExplicit('SUPABASE_URL');
const supabaseKey = getEnvExplicit('SUPABASE_SERVICE_KEY') || getEnvExplicit('VITE_SUPABASE_ANON_KEY');
const geminiKey = getEnvExplicit('GEMINI_API_KEY');

if (!supabaseUrl || !supabaseKey || !geminiKey) {
  console.error(colors.red("❌ 错误: 缺少配置！请检查 .env 文件。"));
  throw new Error("Missing Config");
}

const supabase = createClient(supabaseUrl, supabaseKey);
const genAI = new GoogleGenerativeAI(geminiKey);

// ✅ 核心修复：使用最新的模型名称
// 根据测试，gemini-2.0-flash-exp 是可用的（但可能有配额限制）
const modelNames = [
  "gemini-2.0-flash-exp",      // Gemini 2.0 Flash 实验版（可用，但需要配额）
  "gemini-1.5-pro",            // Gemini 1.5 Pro (备用)
  "gemini-pro"                 // Gemini Pro (最后备用)
];

// 当前使用的模型索引
let currentModelIndex = 0;
let model = genAI.getGenerativeModel({ model: modelNames[currentModelIndex] });

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// === 🛠️ 网络请求 (Axios) ===
async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await axios.get(url, { 
        timeout: 30000, 
        maxRedirects: 10, // 放宽重定向
        httpsAgent: httpsAgent,
        httpAgent: httpsAgent, 
        proxy: false, 
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3'
        }
      });
    } catch (err) {
      if (err.response && err.response.status === 404) throw err;
      // 忽略重定向错误，尝试继续
      if (err.message && err.message.includes('redirects')) {
          console.log(colors.gray(`   ⚠️ 重定向次数过多 (可能是死链)，跳过...`));
          throw err; 
      }
      if (i === retries - 1) throw err;
      console.log(colors.gray(`   ⚠️ 连接波动 (${err.message})，重试中...`));
      await sleep(3000);
    }
  }
}

// === 🧠 AI 分析博客内容 ===
async function analyzeBlogWithGemini(title, htmlContent) {
  // 1. 结构清洗
  const $ = cheerio.load(htmlContent);
  $('script, style, iframe, nav, footer, header, .related-posts, .share-buttons').remove();
  
  let cleanText = "";
  $('body').children().each((i, el) => {
      const tag = $(el).prop('tagName').toLowerCase();
      if(['h2','h3','h4','p','div','ul','ol'].includes(tag)) {
          $(el).find('a').each((j, a) => {
              const href = $(a).attr('href');
              if(href && href.startsWith('http')) {
                  $(a).replaceWith(` [LINK: ${href}] `);
              }
          });
          cleanText += $(el).text().trim() + "\n";
      }
  });

  const prompt = `
  Role: You are a data extraction expert for an Anime Merchandise Wiki.
  Task: Analyze the following blog post content (from Piapro/Hatsune Miku blog) and extract merchandise items.

  Blog Title: "${title}"
  
  Content Summary:
  ${cleanText.substring(0, 15000)} 
  (Content truncated if too long)

  Instructions:
  1. Identify all distinct merchandise items mentioned.
  2. For each item, find the *best* specific purchase URL mentioned in the text.
  3. **CRITICAL**: Determine the 'link_type' for the URL:
     - 'deep_link': Points directly to a specific product page (e.g., contains /pd/, /item/, /detail/, or refers to a specific ID).
     - 'home_page': Points to a shop's homepage, category list, or search page.
     - 'none': No link found.
  4. **CRITICAL**: Determine 'is_blind_box':
     - true: If text mentions "Random", "Trading", "Blind", "全x種" (collection), "BOX", "ランダム".
     - false: If it's a specific item.
  5. Extract 'name', 'price_jpy' (number only), 'manufacturer'.

  Output Format: Pure JSON Array. No markdown formatting.
  `;

  // 尝试多个模型，如果当前模型失败则尝试下一个
  let lastError = null;
  for (let attempt = 0; attempt < modelNames.length; attempt++) {
    try {
      // 每次尝试都创建新的模型实例，确保使用正确的模型名称
      const currentModel = genAI.getGenerativeModel({ model: modelNames[attempt] });
      
      if (attempt > 0) {
        console.log(colors.cyan(`   🔄 尝试模型: ${modelNames[attempt]}`));
      }
      
      const result = await currentModel.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      // 成功时更新全局模型引用
      currentModelIndex = attempt;
      model = currentModel;
      
      return JSON.parse(text);
    } catch (e) {
      lastError = e;
      const errorMsg = e.message || String(e);
      const is404Error = errorMsg.includes("404") || errorMsg.includes("not found") || errorMsg.includes("Not Found");
      const is429Error = errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("Quota");
      
      // 如果是配额错误，提示用户但继续尝试其他模型
      if (is429Error && attempt < modelNames.length - 1) {
        console.log(colors.yellow(`   ⚠️ 模型 "${modelNames[attempt]}" 配额已用完，尝试下一个...`));
        continue;
      }
      
      // 如果是 404 错误且还有备用模型，继续尝试
      if (is404Error && attempt < modelNames.length - 1) {
        console.log(colors.yellow(`   ⚠️ 模型 "${modelNames[attempt]}" 不可用 (404)，尝试下一个...`));
        continue;
      }
      
      // 最后一个模型也失败
      if (attempt === modelNames.length - 1) {
        console.error(colors.red(`   ⚠️ AI 分析失败: ${errorMsg.substring(0, 200)}`));
        if (is404Error) {
          console.error(colors.yellow(`   👉 所有模型都不可用。已尝试: ${modelNames.join(', ')}`));
          console.error(colors.yellow(`   💡 提示：请检查你的 API Key 是否有权限访问这些模型，或查看 Google AI Studio 获取最新可用模型列表。`));
        } else if (is429Error) {
          console.error(colors.yellow(`   👉 所有模型的配额都已用完。`));
          console.error(colors.yellow(`   💡 提示：请等待配额重置，或升级到付费计划。查看配额: https://ai.dev/usage?tab=rate-limit`));
        }
        return [];
      }
    }
  }
  
  // 如果所有尝试都失败
  if (lastError) {
    console.error(colors.red(`   ⚠️ AI 分析失败: ${lastError.message || String(lastError)}`));
  }
  return [];
}

// === 🔗 辅助: 生成精准搜索链接 ===
function generateSearchUrl(itemName) {
  if (!itemName) return null;
  const cleanName = itemName.replace(/[【】\[\]（）\(\)]/g, ' ').trim().split(/\s+/).slice(0, 3).join(' ');
  return `https://www.animate-onlineshop.jp/products/list.php?mode=search&smt=${encodeURIComponent(cleanName)}`;
}

// === 🔗 辅助: 抓取 OG 图片 ===
async function fetchOGTags(url) {
  try {
    const { data } = await axios.get(url, { 
      timeout: 10000, 
      httpsAgent: httpsAgent,
      httpAgent: httpsAgent,
      proxy: false,
      headers: { 'User-Agent': 'Twitterbot/1.0' } 
    });
    const $ = cheerio.load(data);
    const ogImage = $('meta[property="og:image"]').attr('content');
    return ogImage || null;
  } catch (e) {
    return null;
  }
}

// === 📅 辅助: 日期处理 ===
function normalizeDate(raw) {
  if (!raw) return null;
  let d = raw.replace(/\s+/g, '').replace(/[年月日\.]/g, '-');
  if (d.endsWith('-')) d = d.slice(0, -1);
  const match = d.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
  return null;
}

function isRecent(dateStr) {
  if (!dateStr) return false;
  const postDate = new Date(dateStr);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - RECENT_MONTHS_LIMIT);
  return postDate > sixMonthsAgo;
}

// === 🔎 二分法查找最大页数 ===
async function findTrueMaxPage() {
  console.log(colors.magenta("\n🔍 正在探测最大页数..."));
  let min = 1, max = 1000, lastValidPage = 1;

  while (min <= max) {
    let mid = Math.floor((min + max) / 2);
    process.stdout.write(`   👉 测试第 ${mid} 页... `);
    try {
      const res = await axios.head(`${BASE_URL}/page/${mid}`, {
        timeout: 10000,
        httpsAgent: httpsAgent,
        httpAgent: httpsAgent,
        proxy: false,
        validateStatus: status => status >= 200 && status < 500,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (res.status === 200) {
        console.log(colors.green("✅ 存在"));
        lastValidPage = mid;
        min = mid + 1;
      } else {
        console.log(colors.red("❌ 404"));
        max = mid - 1;
      }
    } catch (e) {
      max = mid - 1;
    }
    await sleep(200);
  }
  return lastValidPage;
}

// === 🕷️ 核心处理逻辑 ===
async function processArticle(link, title, pubDate, dryRun = false) {
  console.log(colors.cyan(`\nProcessing: ${title}`));
  console.log(colors.gray(`   Link: ${link} | Date: ${pubDate}`));

  try {
    const { data } = await fetchWithRetry(link);
    const $ = cheerio.load(data);
    const contentHtml = $('.entry-content').html() || $('body').html(); 
    const blogCover = $('.entry-content img').first().attr('src') || null;

    let aiItems = [];
    const shouldUseAI = dryRun || isRecent(pubDate);

    if (shouldUseAI) {
        process.stdout.write(colors.yellow(`   🤖 正在调用 Gemini (1.5 Flash) 分析... `));
        aiItems = await analyzeBlogWithGemini(title, contentHtml);
        console.log(colors.green(`完成! 识别到 ${aiItems.length} 个商品`));
    } else {
        console.log(colors.gray(`   ⏳ 文章较旧，跳过 AI 分析。`));
        aiItems = [{
            name: title,
            url: null,
            link_type: 'none',
            is_blind_box: false,
            price_jpy: 0,
            manufacturer: 'Unknown'
        }];
    }

    if (dryRun) {
        console.log(colors.magenta("\n--- [🧪 AI 分析结果预览] ---"));
        console.log(JSON.stringify(aiItems, null, 2));
        
        console.log(colors.magenta("\n--- [🔗 链接处理模拟] ---"));
        for (const item of aiItems) {
            let note = "";
            let ogResult = "未抓取 (DryRun)";
            let finalLink = item.url;
            
            if (item.link_type === 'deep_link') {
                note = "✅ 直达链接 (尝试抓取 OG)";
                const og = await fetchOGTags(item.url);
                ogResult = og ? `📸 成功: ${og.substring(0,25)}...` : "❌ 无OG";
            } else {
                finalLink = generateSearchUrl(item.name);
                note = `🔄 泛链接 (生成搜索: ${finalLink})`;
            }
            
            console.log(`商品: ${item.name}`);
            console.log(`   原始链接: ${item.url || '无'}`);
            console.log(`   判定类型: ${item.link_type}`);
            console.log(`   处理结果: ${note}`);
            console.log(`   OG图测试: ${ogResult}`);
            console.log("-----------------------------------");
        }
        return;
    }

    // --- 🚀 生产模式入库逻辑 ---
    const isCollection = shouldUseAI && aiItems.length > 1;
    
    const mainData = {
        name: isCollection ? `${title} (合集)` : (aiItems[0]?.name || title),
        category: '情报',
        image_url: JSON.stringify([blogCover]),
        cover_image_url: blogCover,
        release_date: pubDate || FALLBACK_DATE,
        purchase_link: link, 
        is_collection: isCollection,
        is_fan_work: false,
        status: 'approved',
        link_url: null 
    };

    if (!isCollection && aiItems.length === 1) {
        const item = aiItems[0];
        mainData.price_jpy = item.price_jpy;
        mainData.manufacturer = item.manufacturer;
        mainData.is_blind_box = item.is_blind_box;
        
        if (item.link_type === 'deep_link') {
            mainData.link_url = item.url;
            const ogImg = await fetchOGTags(item.url);
            if (ogImg) {
                mainData.cover_image_url = ogImg;
                mainData.image_url = JSON.stringify([ogImg]);
            }
        } else {
            mainData.link_url = generateSearchUrl(item.name || title);
        }
    }

    const { data: parentRecord, error: parentError } = await supabase
        .from(TABLE_NAME)
        .upsert(mainData, { onConflict: 'purchase_link' }) 
        .select()
        .single();

    if (parentError) throw parentError;
    console.log(colors.green(`   ✅ 主记录已存入 (ID: ${parentRecord.id})`));

    if (isCollection) {
        await supabase.from(TABLE_NAME).delete().eq('parent_id', parentRecord.id);
        for (const item of aiItems) {
            let childImg = blogCover;
            let childLink = item.url;

            if (item.link_type === 'deep_link') {
                const ogImg = await fetchOGTags(item.url);
                if (ogImg) childImg = ogImg;
            } else {
                childLink = generateSearchUrl(item.name);
            }

            const childData = {
                parent_id: parentRecord.id,
                name: item.name,
                price_jpy: item.price_jpy,
                manufacturer: item.manufacturer,
                is_blind_box: item.is_blind_box,
                cover_image_url: childImg,
                image_url: JSON.stringify([childImg]),
                link_url: childLink,
                is_collection: false,
                is_fan_work: false,
                status: 'approved',
                release_date: pubDate
            };
            await supabase.from(TABLE_NAME).insert(childData);
        }
        console.log(colors.cyan(`   ✨ 已挂载 ${aiItems.length} 个子商品`));
    }

  } catch (e) {
    console.error(colors.red(`   ❌ 处理出错: ${e.message}`));
  }
}

// === 🎮 交互式入口 ===
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

console.log(colors.cyan("\n🤖 葱葱维基爬虫 V17.0 (Gemini 1.5 Flash + 依赖清理提示)"));
console.log("------------------------------------------------");
console.log("[1] 🧪 测试模式");
console.log("[2] 🚀 生产模式");
console.log("------------------------------------------------");

rl.question('请输入数字: ', async (answer) => {
    try {
        if (answer.trim() === '1') {
            rl.question('\n🔗 输入URL: ', async (url) => {
                if (url) await processArticle(url, "测试文章", new Date().toISOString().split('T')[0], true); 
                console.log("\n✅ 测试结束。");
                rl.close(); 
            });
        } else if (answer.trim() === '2') {
            console.log("\n🚀 启动全量抓取...");
            const maxPage = await findTrueMaxPage();
            console.log(`📄 总页数: ${maxPage}`);
            for (let page = maxPage; page >= 1; page--) {
                console.log(colors.yellow(`\n📂 读取第 ${page} 页...`));
                const res = await fetchWithRetry(`${BASE_URL}/page/${page}`);
                const $ = cheerio.load(res.data);
                const articles = [];
                $('article').each((i, el) => {
                    const title = $(el).find('.entry-title a').text().trim();
                    const link = $(el).find('.entry-title a').attr('href');
                    let dateStr = $(el).find('.time').text().trim() || $(el).find('.entry-date').text().trim();
                    let pubDate = normalizeDate(dateStr);
                    if(link) articles.push({ link, title, pubDate });
                });
                articles.reverse();
                for (const art of articles) {
                    await processArticle(art.link, art.title, art.pubDate, false);
                    await sleep(SLEEP_MS);
                }
            }
            rl.close(); 
        } else {
            rl.close();
        }
    } catch (err) {
        console.error("Fatal Error:", err);
        rl.close();
    }
});