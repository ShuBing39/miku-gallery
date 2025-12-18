export const formatDate = (isoString) => {
    if (!isoString) return '待定'
    const date = new Date(isoString)
    if (isNaN(date.getTime())) return '无效日期'
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
  }
  
  export const formatPrice = (price) => {
    return price ? Number(price).toFixed(2) : '0.00'
  }
  
  export const handleImgError = (e) => {
    e.target.src = 'https://via.placeholder.com/300x200?text=No+Image'
  }