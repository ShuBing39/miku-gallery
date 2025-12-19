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
const BASE_URL = 'https://blog.piapro.net/category/goods';
const MAX_PAGES = 500; 

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function extractDateFromHTML(html) {
  const $ = cheerio.load(html);
  let dateText = $('.entry-date').text() || $('.published').text() || $('.date').text();
  if (!dateText) {
    const bodyText = $('body').text();
    const match = bodyText.match(/20\d{2}年\d{1,2}月\d{1,2}日/);
    if (match) dateText = match[0];
  }
  if (dateText) {
    const match = dateText.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (match) {
      return `${match[1]}-${match[2].padStart(2,'0')}-${match[3].padStart(2,'0')}`;
    }
  }
  return null;
}

function findCharactersInText(text) {
  const found = new Set();
  const lower = text.toLowerCase();
  
  if (text.includes('ミク') || text.includes('初音') || lower.includes('miku') || text.includes('葱') || text.includes('ネギ') || text.includes('39')) found.add('初音未来');

  const rinFalsePositives = ['ドリンク', 'プリン', 'キーリング', 'スプリング', 'ペアリング', 'イヤリング'];
  let hasRin = text.includes('リン') || text.includes('鏡音') || lower.includes('rin') || text.includes('橘') || text.includes('ミカン') || text.includes('鈴');
  if (hasRin && !text.includes('鏡音') && !lower.includes('rin')) {
    let cleanText = text;
    rinFalsePositives.forEach(bad => cleanText = cleanText.split(bad).join(''));
    if (!cleanText.includes('リン') && !cleanText.includes('橘') && !cleanText.includes('ミカン') && !cleanText.includes('鈴')) hasRin = false;
  }
  if (hasRin) found.add('镜音铃');

  const lenFalsePositives = ['カレンダー', 'アレンジ', 'チャレンジ', 'オレンジ', 'フレンチ'];
  let hasLen = text.includes('レン') || text.includes('鏡音') || lower.includes('len') || text.includes('蕉') || text.includes('バナナ') || text.includes('連');
  if (hasLen && !text.includes('鏡音') && !lower.includes('len')) {
    let cleanText = text;
    lenFalsePositives.forEach(bad => cleanText = cleanText.split(bad).join(''));
    if (!cleanText.includes('レン') && !cleanText.includes('蕉') && !cleanText.includes('バナナ') && !cleanText.includes('連')) hasLen = false;
  }
  if (hasLen) found.add('镜音连');

  const lukaFalsePositives = ['グッドスマイルカンパニー', 'イルカ', 'メタルカ'];
  let hasLuka = text.includes('ルカ') || text.includes('巡音') || lower.includes('luka') || text.includes('章鱼') || text.includes('タコ');
  if (hasLuka && !text.includes('巡音') && !lower.includes('luka')) {
     let cleanText = text;
     lukaFalsePositives.forEach(bad => cleanText = cleanText.split(bad).join(''));
     if (!cleanText.includes('ルカ') && !cleanText.includes('タコ')) hasLuka = false;
  }
  if (hasLuka) found.add('巡音流歌');

  if (text.includes('MEIKO') || text.includes('メイコ') || lower.includes('meiko') || text.includes('大姐') || text.includes('姉さん') || text.includes('酒')) found.add('MEIKO');

  if (text.includes('KAITO') || text.includes('カイト') || lower.includes('kaito') || text.includes('大哥') || text.includes('兄さん') || text.includes('冰') || text.includes('アイス')) found.add('KAITO');
  
  return found;
}

function extractAuthors(text) {
  const authors = new Set();
  const cleanText = text.replace(/<[^>]*>/g, ''); 
  const regexList = [/Art by\s+([^\s,。、]+)/i, /illustration by\s+([^\s,。、]+)/i, /イラスト(?:：|:)\s*([^\s,。、]+)/];
  regexList.forEach(regex => { const match = cleanText.match(regex); if (match && match[1]) authors.add(match[1]); });
  if (cleanText.includes('描き') || cleanText.includes('原案') || cleanText.includes('イラスト') || cleanText.includes('デザイン') || cleanText.includes('ビジュアル')) {
    const matches = cleanText.matchAll(/([^\s,。、「」『』()（）]+)(?:さん|氏)/g);
    for (const match of matches) { const name = match[1]; if (name.length > 1 && name !== 'みな' && name !== '皆') authors.add(name); }
  }
  if (authors.size === 0) return null;
  return Array.from(authors).join(' / ');
}

function analyzeMetadata($, title) {
  const images = [];
  $('.entry-content img').each((i, el) => {
    let src = $(el).attr('src');
    // 🟢 修复：强制 HTTPS
    if (src && src.startsWith('http://')) {
        src = src.replace('http://', 'https://');
    }
    if (src && !src.includes('avatar') && !src.includes('icon') && !src.includes('banner')) images.push(src);
  });

  let externalLink = null;
  $('.entry-content a').each((i, el) => {
    const text = $(el).text();
    const href = $(el).attr('href');
    if (href && !href.includes('piapro.net') && (text.includes('こちら') || text.includes('サイト') || text.includes('予約') || text.includes('Web'))) externalLink = href;
  });

  const tags = [];
  $('.tag-links a').each((i, el) => tags.push($(el).text()));
  $('.cat-links a').each((i, el) => tags.push($(el).text()));
  const tagString = tags.join(' ');
  const fullText = `${title} ${tagString}`; 

  let character = '其他/混合';
  let titleChars = findCharactersInText(title);
  if (titleChars.size === 0) titleChars = findCharactersInText(tagString);
  if (titleChars.size === 1) character = Array.from(titleChars)[0];
  else if (titleChars.size === 2) {
    const hasRin = titleChars.has('镜音铃');
    const hasLen = titleChars.has('镜音连');
    if (hasRin && hasLen) character = '镜音双子'; 
    else character = '全员/混合'; 
  } else if (titleChars.size > 2) character = '全员/混合';
  else {
    if (tagString.includes('ピアプロキャラクターズ') || tagString.includes('全員')) character = '全员/混合';
    else character = '初音未来'; 
  }

  let category = '其他周边'; 
  if (fullText.includes('フィギュア') || fullText.includes('ねんどろいど') || fullText.includes('スケール') || fullText.includes('ドール')) category = '手办模型';
  else if (fullText.includes('ぬいぐるみ') || fullText.includes('マスコット') || fullText.includes('ふかふか') || fullText.includes('どでかジャンボ') || fullText.includes('寝そべり')) category = '毛绒玩偶';
  else if (fullText.includes('Tシャツ') || fullText.includes('パーカー') || fullText.includes('ファッション') || fullText.includes('リュック') || fullText.includes('法被') || fullText.includes('スニーカー')) category = '服饰穿搭';
  else if (fullText.includes('CD') || fullText.includes('アルバム') || fullText.includes('楽曲') || fullText.includes('ソング')) category = '音乐/CD';
  else if (fullText.includes('画集') || fullText.includes('ビジュアル') || fullText.includes('ブック')) category = '书籍/画册';
  else if (fullText.includes('イベント') || fullText.includes('ライブ') || fullText.includes('マジカルミライ') || fullText.includes('SNOW MIKU')) category = '线下活动';
  else if (fullText.includes('缶バッジ') || fullText.includes('ピンズ')) category = '徽章/吧唧';
  else if (fullText.includes('ペンライト') || fullText.includes('サイリウム') || fullText.includes('応援')) category = '应援棒/灯';
  else if (fullText.includes('お菓子') || fullText.includes('食品') || fullText.includes('カレー') || fullText.includes('ラーメン') || fullText.includes('ドリンク') || fullText.includes('茶')) category = '食品/饮料';
  else if (fullText.includes('アクリル') || fullText.includes('キーホルダー') || fullText.includes('スタンド') || fullText.includes('クリアファイル') || fullText.includes('グッズ')) category = '小谷子/立牌';
  else if (fullText.includes('ゲーム') || fullText.includes('コラボ')) category = '游戏联动';

  const bodyText = $('.entry-content').text();
  const author = extractAuthors(bodyText);

  return { images, externalLink, character, category, author };
}

async function scrapeAllPages() {
  console.log(`🚀 启动【V6.0 HTTPS 修复版】爬虫...`);
  
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  for (let page = 1; page <= MAX_PAGES; page++) {
    let currentListUrl = page === 1 ? BASE_URL : `${BASE_URL}/page/${page}`;
    console.log(`\n📄 [第 ${page} 页] 扫描列表...`);

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

      for (const detailUrl of links) {
        const { data: existing } = await supabase.from('items').select('id, release_date').eq('link', detailUrl).single();
        try {
          const detailResponse = await axios.get(detailUrl, { headers });
          const $ = cheerio.load(detailResponse.data);
          const title = $('.entry-title').text().trim();
          const releaseDate = extractDateFromHTML(detailResponse.data);
          const { images, externalLink, character, category, author } = analyzeMetadata($, title);
          const mainImage = images.length > 0 ? images[0] : null; 
          const extraImages = images.slice(1); 
          const contentText = $('.entry-content').text();
          const priceMatch = contentText.match(/([0-9,]+)円/);
          let finalPrice = 0;
          if (priceMatch) finalPrice = parseInt(priceMatch[1].replace(/,/g, ''));

          let itemId = null;
          if (existing) {
             process.stdout.write(`   🔄 修正 ID:${existing.id} [${category}]... `);
             await supabase.from('items').update({ 
               character, category, author, release_date: releaseDate || existing.release_date, external_link: externalLink
             }).eq('id', existing.id);
             itemId = existing.id;
          } else {
             process.stdout.write(`   🆕 新增 [${category}]... `);
             const { data: newItem, error } = await supabase.from('items').insert([{ 
                 name: title, price: finalPrice, image_url: mainImage, link: detailUrl, external_link: externalLink,
                 character: character, category: category, author: author, release_date: releaseDate
             }]).select();
             if (!error && newItem) itemId = newItem[0].id;
          }
          if (itemId && extraImages.length > 0) {
            await supabase.from('item_images').delete().eq('item_id', itemId);
            const imageInserts = extraImages.map(url => ({ item_id: itemId, image_url: url }));
            await supabase.from('item_images').insert(imageInserts);
            process.stdout.write(`+${extraImages.length}图 `);
          }
          console.log('✅');
          await sleep(200); 
        } catch (innerErr) { console.log(`❌ Err: ${innerErr.message}`); }
      }
    } catch (err) { console.error(`❌ 列表页失败: ${err.message}`); }
  }
}
scrapeAllPages();