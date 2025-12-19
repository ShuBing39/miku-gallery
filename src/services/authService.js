import { supabase } from './supabase'

// 1. 提交人工审核资料
export const submitManualKYC = async (userId, formData) => {
  const isMinor = checkIsMinor(formData.id_number)

  const { data, error } = await supabase
    .from('user_verifications')
    .insert([{
      user_id: userId,
      real_name: formData.real_name,
      id_number: formData.id_number,
      id_photos: formData.photos,
      is_minor: isMinor,
      status: 'pending'
    }])
    .select()
    .single()

  if (error) throw error
  return data
}

// 2. 获取当前用户的认证状态
export const getIdentityStatus = async (userId) => {
  const { data, error } = await supabase
    .from('user_verifications')
    .select('status, is_minor, reject_reason')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('获取认证状态失败:', error)
    return null
  }
  return data
}

// 3. [管理员] 审核通过/驳回 (🔴 强力侦测版)
export const auditVerification = async (verifyId, userId, status, reason = '') => {
  console.log('正在执行审核:', { verifyId, userId, status }); // 用于调试

  // 1. 先检查 ID 是否存在
  if (!verifyId) {
    alert('❌ 程序错误：无法获取审核记录 ID (verifyId 为空)');
    throw new Error('ID 缺失');
  }

  // 2. 执行更新，并要求数据库返回“受影响行数”
  const { data, error: vError, count } = await supabase
    .from('user_verifications')
    .update({ 
      status, 
      reject_reason: reason,
      updated_at: new Date()
    })
    .eq('id', verifyId)
    .select('*', { count: 'exact' }); // 👈 关键点：强制计算修改行数

  // 3. 捕捉常规数据库报错
  if (vError) {
    console.error('Supabase 报错:', vError);
    throw vError;
  }

  // 4. 捕捉“隐形权限”问题 (这是你遇到问题的最大嫌疑人)
  // 如果数据库没报错，但 count 为 0，说明它悄悄忽略了操作
  if (count === 0) {
    const msg = `⚠️ 警告：操作失败！\n\n数据库虽然没有报错，但拒绝了修改 (受影响行数: 0)。\n这通常是因为 Supabase 的 RLS (权限策略) 没配置好。\n\n请检查 'user_verifications' 表是否允许 UPDATE 操作。`;
    alert(msg);
    throw new Error('数据库权限拦截 (RLS) 或 记录ID不存在');
  }

  // 5. 如果通过，同步更新 profiles 表
  if (status === 'approved') {
    const { data: vData } = await supabase.from('user_verifications').select('is_minor').eq('id', verifyId).single();
    
    await supabase.from('profiles').update({
      is_verified: true,
      is_minor: vData?.is_minor || false
    }).eq('id', userId);
  }
  
  return data;
}

// 4. [预留接口] 方案A：自动认证
export const startSmartAuth = async () => {
  console.log('方案A接口预留')
}

// 辅助函数
const checkIsMinor = (idNumber) => {
  if (!idNumber || idNumber.length !== 18) return false 
  const birthYear = parseInt(idNumber.substring(6, 10))
  const birthMonth = parseInt(idNumber.substring(10, 12))
  const birthDay = parseInt(idNumber.substring(12, 14))
  const today = new Date()
  let age = today.getFullYear() - birthYear
  if (today.getMonth() + 1 < birthMonth || (today.getMonth() + 1 === birthMonth && today.getDate() < birthDay)) {
    age--
  }
  return age < 18
}