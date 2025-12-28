// src/services/systemService.js

// 备用保底汇率（万一接口挂了，或者用户断网了，就用这个）
const FALLBACK_RATE = 0.047; 

// 缓存的键名
const CACHE_KEY = 'cached_jpy_rate';
const CACHE_TIME_KEY = 'cached_jpy_rate_time';
// 缓存有效期：24小时 (毫秒)
const CACHE_DURATION = 24 * 60 * 60 * 1000;

export const getExchangeRate = async () => {
  try {
    // 1. 先检查浏览器有没有存过“今天的汇率”
    const cachedRate = localStorage.getItem(CACHE_KEY);
    const cachedTime = localStorage.getItem(CACHE_TIME_KEY);

    // 如果有缓存，并且缓存还没过期（在24小时内）
    if (cachedRate && cachedTime && (Date.now() - cachedTime < CACHE_DURATION)) {
      console.log('💰 使用缓存汇率:', cachedRate);
      return parseFloat(cachedRate);
    }

    // 2. 如果没有缓存或过期了，向免费 API 发起请求
    // 使用 exchangerate-api.com 的免费接口
    console.log('🔄 正在从网络抓取最新汇率...');
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/JPY');
    const data = await response.json();

    // 3. 找到人民币 (CNY) 的汇率
    const rate = data.rates.CNY;

    if (rate) {
      // 4. 存入缓存，方便下次直接用
      localStorage.setItem(CACHE_KEY, rate);
      localStorage.setItem(CACHE_TIME_KEY, Date.now());
      console.log('✅ 获取并更新汇率成功:', rate);
      return rate;
    }

    throw new Error('未找到CNY汇率数据');

  } catch (error) {
    console.error('❌ 自动获取汇率失败 (使用保底值):', error);
    // 如果断网了或者接口崩了，返回我们写死的保底值，保证页面不报错
    return FALLBACK_RATE;
  }
}