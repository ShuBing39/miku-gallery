import { supabase } from './supabase'

// 1. 提交新订单 (线上买家)
export const createOrder = async (orderData) => {
  const { data, error } = await supabase
    .from('project_orders')
    .insert([{
      ...orderData,
      status: 'pending',
      is_offline: false
    }])
    .select()
    .single()

  if (error) throw error
  return data
}

// 2. 批量导入订单 (线下/Excel)
export const batchImportOrders = async (projectId, orders) => {
  // orders: [{ buyer_name, items: [...], total_amount, note }]
  const cleanOrders = orders.map(o => ({
    project_id: projectId,
    user_id: null, // 线下单没有关联用户
    buyer_name: o.buyer_name,
    items: o.items,
    total_amount: o.total_amount || 0,
    status: 'paid', // 导入通常默认已支付/已登记
    is_offline: true,
    note: 'Excel 导入'
  }))

  const { data, error } = await supabase
    .from('project_orders')
    .insert(cleanOrders)
    .select()

  if (error) throw error
  return data
}

// 3. 获取某团购的所有订单 (混合 线上+线下)
export const getProjectOrders = async (projectId) => {
  const { data, error } = await supabase
    .from('project_orders')
    .select(`
      *,
      profiles:user_id (id, username, avatar_url)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) throw error
  
  // 数据清洗与合并
  return data.map(o => ({
    ...o,
    // 如果有关联用户，优先用 profile 里的名字；否则用 buyer_name (线下)
    display_name: o.profiles?.username || o.buyer_name || '未知买家',
    avatar: o.profiles?.avatar_url || null,
    source: o.is_offline ? '📄 Excel' : '📱 APP'
  }))
}

// 4. 更新状态
export const updateOrderStatus = async (orderId, status) => {
  const { error } = await supabase.from('project_orders').update({ status }).eq('id', orderId)
  if (error) throw error
}

// 5. 删除订单
export const deleteOrder = async (orderId) => {
  const { error } = await supabase.from('project_orders').delete().eq('id', orderId)
  if (error) throw error
}