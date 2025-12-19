import { supabase } from './supabase'

// 1. 创建团购
export const createGroupBuy = async (payload, items) => {
  // 先创建团购主表
  const { data: gb, error } = await supabase.from('group_buys').insert(payload).select().single()
  if (error) throw error
  
  // 再插入商品清单
  if (items && items.length > 0) {
    const itemsPayload = items.map(i => ({
      group_buy_id: gb.id,
      name: i.name,
      price_jpy: i.price,
      price_cny: (i.price * payload.exchange_rate).toFixed(2),
      image_url: i.image_url
    }))
    const { error: itemsError } = await supabase.from('group_buy_items').insert(itemsPayload)
    if (itemsError) throw itemsError
  }

  // 触发通知 (给关注了该Wiki词条的人)
  if (payload.wiki_id) {
    notifySubscribers(payload.wiki_id, gb.id, payload.title)
  }

  return gb
}

// 2. 获取团购详情 (含商品和订单)
export const getGroupBuyDetail = async (id) => {
  const { data: gb, error } = await supabase.from('group_buys').select(`
    *,
    uploader:uploader_id(username, id),
    items:group_buy_items(*),
    orders:group_buy_orders(
      *,
      user:user_id(username, id),
      item:item_id(name, price_cny)
    )
  `).eq('id', id).single()
  
  if (error) throw error
  return gb
}

// 3. 买家下单
export const placeOrder = async (orderData) => {
  // orderData: { group_buy_id, user_id, item_id, quantity, agreed_rules }
  if (!orderData.agreed_rules) throw new Error("必须同意团购规则才能下单")
  return await supabase.from('group_buy_orders').insert(orderData)
}

// 4. 团长生成收款表 (计算逻辑)
// 计算每个人：(商品总价 + 调价/捆物) + (平摊运费/车马)
export const generatePaymentTable = (orders, extraCosts = { shipping: 0, ticket: 0, other: 0 }) => {
  const userMap = {}
  
  // 1. 聚合每个人的订单
  orders.forEach(o => {
    const uid = o.user_id
    if (!userMap[uid]) {
      userMap[uid] = { 
        username: o.user.username, 
        items: [], 
        total_items_price: 0,
        adjustment: 0 
      }
    }
    const price = o.item.price_cny * o.quantity
    userMap[uid].items.push({ name: o.item.name, qty: o.quantity, price: price })
    userMap[uid].total_items_price += price
    userMap[uid].adjustment += (o.adjustment_fee || 0)
  })

  // 2. 计算均摊费用 (按人数均摊)
  const userCount = Object.keys(userMap).length
  const sharedCostPerPerson = userCount > 0 
    ? (extraCosts.ticket + extraCosts.other) / userCount 
    : 0

  // 3. 生成最终账单
  return Object.keys(userMap).map(uid => {
    const u = userMap[uid]
    // 假设 extraCosts.shipping 是单人运费，或者你可以改为按件数算
    const finalShipping = extraCosts.shipping 
    const finalTotal = u.total_items_price + u.adjustment + sharedCostPerPerson + finalShipping
    
    return {
      user_id: uid,
      username: u.username,
      details: u.items,
      breakdown: {
        goods: u.total_items_price,
        adjustment: u.adjustment,
        shared: sharedCostPerPerson,
        shipping: finalShipping
      },
      final_total: finalTotal.toFixed(2)
    }
  })
}

// 辅助：通知逻辑
const notifySubscribers = async (wikiId, gbId, title) => {
  const { data: subs } = await supabase.from('wiki_subscriptions').select('user_id').eq('wiki_id', wikiId)
  if (!subs || subs.length === 0) return

  // 简单的系统通知写入 (假设有 notifications 表或使用 comments 表作为消息)
  const msgs = subs.map(s => ({
    user_id: s.user_id,
    content: `你关注的周边有了新团购: ${title}`,
    link: `/group-buy/${gbId}`,
    type: 'system',
    is_read: false
  }))
  await supabase.from('project_comments').insert(msgs) // 借用 comments 表或新建 notifications 表
}