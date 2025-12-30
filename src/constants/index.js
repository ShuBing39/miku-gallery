// src/constants/index.js
// ==========================================
// 1. 全局基础配置
// ==========================================
export const APP_NAME = '葱葱维基'
export const THEME_COLOR = '#39C5BB'

// ==========================================
// 2. 周边商品分类 (Merch Categories)
// 用于：发布商品、筛选商品、自动分类
// ==========================================
export const MERCH_CATEGORIES = [
  '徽章/铁皮', // 吧唧
  '立牌/亚克力', // 所有的亚克力制品
  '手办/模型', // PVC, 景品, 粘土人
  '毛绒/玩偶', // fufu, 趴趴
  '服饰/穿戴', // T恤, 法披, 痛包, 戒指
  '挂件/钥匙扣', // 橡胶挂件等
  '色纸/收藏卡', // 纸片类
  '海报/挂画', // 墙面装饰
  'CD/专辑/书籍', // 影音刊物
  '生活用品', // 杯子, 鼠标垫, 联名耳机
  '痛车/车贴', // 痛车相关
  '其他'
]

// ==========================================
// 3. 官方活动字典 (Standard Events)
// 用于：活动列表筛选、关联商品来源
// ==========================================
export const STANDARD_EVENTS = {
  MAGIC_MIRAI: '魔法未来 (Magical Mirai)',
  SNOW_MIKU: '雪未来 (Snow Miku)',
  MIKU_EXPO: 'MIKU EXPO',
  SYMPHONY: '初音未来交响乐 (Symphony)',
  PROSECA: '世界计划 (PJSK)',
  RACING: '赛车初音 (Racing Miku)',
  COLLAB: '品牌联动/咖啡厅',
  BIRTHDAY: '诞生日/周年庆',
  OTHERS: '其他/非系列活动'
}

// 辅助数组：用于生成下拉菜单
export const OFFICIAL_EVENT_CATEGORIES = Object.values(STANDARD_EVENTS)

// ==========================================
// 4. 百科/文章分类 (Wiki Categories)
// 用于：文章投稿
// ==========================================
export const WIKI_CATEGORIES = [
  '科普',
  '攻略',
  '历史',
  '活动',
  '周边',
  '应援文化',
  '冷知识'
]

// ==========================================
// 5. 商品销售标签 (Item Sales Tags)
// 用于：拼团选品时的属性标记 (Hot/Cold/Normal)
// ==========================================
export const ITEM_SALES_TAGS = {
  HOT: {
    key: 'hot',
    label: '热门',
    icon: '🔥',
    desc: '需捆绑/竞价',
    color: '#f44336'
  },
  NORMAL: {
    key: 'normal',
    label: '普通',
    icon: '✨',
    desc: '正常售卖',
    color: '#2196f3'
  },
  COLD: {
    key: 'cold',
    label: '调价',
    icon: '❄️',
    desc: '被捆绑/降价',
    color: '#00bcd4'
  },
  HIDDEN: {
    key: 'hidden',
    label: '隐藏',
    icon: '🕵️',
    desc: '特殊分配',
    color: '#9c27b0'
  },
  BONUS: {
    key: 'bonus',
    label: '特典',
    icon: '🎁',
    desc: '满赠/分配',
    color: '#ff9800'
  }
}

// ==========================================
// 6. 拼团/订单状态 (Group Buy Status)
// 用于：控制团购进度的流转
// ==========================================
export const GROUP_STATUS = {
  RECRUITING: 'recruiting', // 正在拼团 (招募中)
  LOCKED: 'locked', // 截团/核算中
  PAYING: 'paying', // 收款中
  PURCHASING: 'purchasing', // 已下单/制作中
  SHIPPING: 'shipping', // 国际/国内物流中
  COMPLETED: 'completed', // 已完成
  CANCELLED: 'cancelled' // 已取消
}

// ==========================================
// 7. 创作者角色 (Roles)
// ==========================================
export const PRESET_ROLES = [
  '主催',
  '副主催',
  '画师',
  'PV',
  '作曲',
  '作词',
  '调音',
  '混音',
  '剧本',
  '财务',
  '外勤',
  '协力'
]

// ==========================================
// 8. 同人作品类型字典 (Fan Work Types)
// 用于：同人作品投稿时的类型选择
// ==========================================
export const FAN_WORK_TYPES = [
  '插画/漫画', // 对应 P站/微博图
  '原创音乐/翻调', // 对应 网易云/B站音频
  '视频/PV/MMD', // 对应 B站/YouTube
  'Cosplay/实写', // 对应 摄影作品
  '小说/文学', // 对应 专栏/文章
  '游戏/互动程序', // 对应 独立游戏
  '实物/手工', // 对应 手作粘土等
  '其他'
]

// ==========================================
// 9. 核心命名规范与字段映射 (DB Schema Map)
// ⚠️ 重要：全站必须统一使用以下字段名，禁止自己造词
// ==========================================
export const DB_FIELDS = {
  // 用户ID：数据库里永远叫 user_id
  USER_ID: 'user_id',

  // 创建者ID：如果是引用创建人，统一叫 created_by 或 user_id
  CREATED_BY: 'created_by',

  // 常用表名 (防止拼写错误)
  TABLES: {
    ITEMS: 'items',
    PROFILES: 'profiles',
    EVENTS: 'events',
    ORDERS: 'orders',
    GROUPS: 'group_buys'
  }
}
