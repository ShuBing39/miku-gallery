// src/utils/formatters.js

// 🟢 核心修复：强制将 http 图片转换为 https
export const fixUrl = (url) => {
  if (!url) return ''
  if (typeof url === 'string' && url.startsWith('http://')) {
    return url.replace('http://', 'https://')
  }
  return url
}

export const formatDate = (isoString) => {
  if (!isoString) return '待定'
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return '无效日期'
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
}

export const formatPrice = (price) => {
  return price ? Number(price).toFixed(2) : '0.00'
}

// 🟢 修复报错：更换了更稳定的占位图服务
export const handleImgError = (e) => {
  // 如果已经替换过一次，就不要再替换了，防止死循环
  if (e.target.src.includes('placehold.co')) return
  e.target.src = 'https://placehold.co/300x200/e0e0e0/888888?text=No+Image'
}