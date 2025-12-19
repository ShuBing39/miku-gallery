import axios from 'axios'
import * as cheerio from 'cheerio'
import { supabase } from './supabase'

// 简单的字典映射
const DICT = {
  'Tシャツ': 'T恤', 'ペンライト': '应援棒', 'マフラータオル': '毛巾',
  'アクリルスタンド': '立牌', '缶バッジ': '徽章', 'キーホルダー': '挂件',
  '初音ミク': '初音未来', '鏡音リン': '镜音铃', '鏡音レン': '镜音连',
  '巡音ルカ': '巡音流歌', 'マジカルミライ': '魔法未来'
}

const translate = (text) => {
  let res = text
  Object.keys(DICT).forEach(key => {
    res = res.replace(new RegExp(key, 'g'), DICT[key])
  })
  return res
}

// 抓取并解析 Magical Mirai 官网
export const scrapeOfficialSite = async (url) => {
  try {
    // 使用公共代理绕过 CORS
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
    const { data } = await axios.get(proxyUrl)
    const $ = cheerio.load(data)
    const items = []

    // 针对 Magical Mirai 结构的解析 (根据实际网页结构调整选择器)
    // 假设官网结构是 .item_box -> .name, .price
    // 注意: 这里需要根据具体年份的官网HTML结构调整选择器
    // 以下是基于常见结构的通用尝试：
    $('div[class*="item"], li[class*="item"]').each((i, el) => {
      const nameJP = $(el).find('h3, .name, .title').text().trim()
      const priceStr = $(el).find('.price').text().trim()
      const imgRelative = $(el).find('img').attr('src')
      
      if (nameJP && priceStr) {
        // 处理图片链接
        const baseUrl = url.substring(0, url.lastIndexOf('/'))
        const imgFull = imgRelative.startsWith('http') ? imgRelative : `${baseUrl}/${imgRelative}`

        items.push({
          name: translate(nameJP),
          original_name: nameJP,
          price: parseInt(priceStr.replace(/[^0-9]/g, '')) || 0,
          image_url: imgFull,
          description: '官网自动抓取',
          category: '自动抓取'
        })
      }
    })

    return items
  } catch (error) {
    console.error('抓取失败:', error)
    throw new Error('无法读取该网页，可能是由于反爬虫限制。')
  }
}

// 将抓取结果批量存入 Wiki
export const batchImportWiki = async (items) => {
  const { data, error } = await supabase.from('items').insert(items).select()
  if (error) throw error
  return data
}