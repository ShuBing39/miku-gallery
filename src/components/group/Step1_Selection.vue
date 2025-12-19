<template>
    <div class="step-content">
      <h3>🛍️ 第一步：选品与定性</h3>
      <p class="sub-title">导入商品并标记属性。如果是盲抽商品，请务必勾选“盲抽”标记。</p>
  
      <div class="import-box">
        <div class="tabs">
          <button :class="{active: mode==='library'}" @click="mode='library'">📚 搜周边库</button>
          <button :class="{active: mode==='url'}" @click="mode='url'">🌏 官网抓取</button>
          <button :class="{active: mode==='manual'}" @click="mode='manual'">✍️ 手动录入</button>
        </div>
  
        <div v-if="mode==='library'" class="input-row">
          <input v-model="searchKey" @keyup.enter="searchLibrary" placeholder="输入关键词 (如: 魔法未来2025)" class="std-input">
          <button @click="searchLibrary" class="btn-primary">🔍 搜索</button>
        </div>
  
        <div v-if="mode==='url'" class="input-row">
          <input v-model="targetUrl" placeholder="输入官网链接..." class="std-input">
          <button @click="runScraper" :disabled="loading" class="btn-primary">
            {{ loading ? '抓取中...' : '🕷️ 开始抓取' }}
          </button>
        </div>

        <div v-if="mode==='manual'" class="input-row manual-box">
          <div class="manual-guide">
             <span>找不到想要的周边？手动添加一个吧！</span>
             <button @click="showManualModal = true" class="btn-primary">➕ 打开录入窗口</button>
          </div>
        </div>
      </div>
  
      <div v-if="searchResults.length > 0" class="selection-pool">
        <div class="pool-header">
           <h4>👇 点击添加商品到列表</h4>
           <button @click="clearSearch" class="btn-close-pool" title="关闭搜索结果">✕ 关闭</button>
        </div>
        <div class="pool-grid">
          <div v-for="item in searchResults" :key="item.id" class="pool-item" @click="addItem(item)">
            <img :src="item.image_url" class="pool-img">
            <div class="pool-name">{{ item.name }}</div>
          </div>
        </div>
      </div>
  
      <div class="selected-area" v-if="data.items.length > 0">
        <div class="tool-bar">
          <span>🎨 属性刷:</span>
          <div class="brush-group">
            <button v-for="type in ITEM_TYPES" :key="type.key" 
              class="brush-btn" 
              :class="[type.key, { active: activeBrush === type.key }]"
              @click="activeBrush = type.key"
              :title="type.desc"
            >
              {{ type.icon }} {{ type.label }}
            </button>
          </div>
          <div class="tip">选中刷子，然后点击下方商品即可打标</div>
        </div>
  
        <div class="items-list">
          <div v-for="(item, index) in data.items" :key="index" 
            class="list-item" 
            :class="[item.type, { 'is-blind': item.is_blind_box }]"
            @click="applyBrush(index)"
          >
            <div class="img-wrap">
                <img :src="item.image_url" class="item-thumb">
                <div v-if="item.is_blind_box" class="blind-badge">🎲 盲抽</div>
            </div>
            
            <div class="item-info">
              <div class="item-name">{{ item.name }}</div>
              <div class="item-meta">
                <span class="price">¥<span class="price-num">{{ item.price }}</span></span>
                <span class="type-badge">{{ getLabel(item.type) }}</span>
              </div>
            </div>
            
            <div class="item-actions" @click.stop>
              <label class="check-label" title="勾选后将按盲抽/抱盒规则处理">
                <input type="checkbox" v-model="item.is_blind_box"> 盲抽
              </label>
              
              <div class="divider"></div>

              <label class="check-label">
                 自留 <input v-model.number="item.self_keep" type="number" class="keep-input">
              </label>
              
              <button @click="removeItem(index)" class="btn-del" title="删除">×</button>
            </div>
          </div>
        </div>
      </div>
  
      <div class="footer-actions">
        <div class="summary">已选 <span class="summary-num">{{ data.items.length }}</span> 件商品</div>
        <button class="btn-next" @click="validateAndNext" :disabled="data.items.length === 0">
          下一步: 定价 ➔
        </button>
      </div>

      <div v-if="showManualModal" class="modal-overlay">
        <div class="modal-content">
          <h3>✍️ 手动录入商品</h3>
          
          <div class="form-group">
            <label>商品原名 (日文/官方名，选填)</label>
            <input v-model="manualForm.original_name" class="std-input" placeholder="例如：初音ミク 缶バッジ">
          </div>

          <div class="form-group">
            <label>中文属性/备注 <span style="color:red">*</span></label>
            <input v-model="manualForm.category_name" class="std-input" placeholder="例如：徽章 / 挂件 / 色纸">
            <p class="input-hint">若是盲抽，这里填“徽章”即可，系统会自动生成“初音未来 徽章”等。</p>
          </div>
          
          <div class="form-group checkbox-row">
            <label class="checkbox-label">
                <input type="checkbox" v-model="manualForm.is_blind_box">
                <span style="font-weight:bold; color:#673ab7;">🎲 这是一个盲抽/随机类商品</span>
            </label>
            
            <transition name="fade">
                <div v-if="manualForm.is_blind_box" class="sub-checkbox">
                    <label class="checkbox-label" title="自动生成：初音/铃/连/流歌/KAITO/MEIKO 6款商品">
                        <input type="checkbox" v-model="manualForm.auto_v6">
                        <span class="highlight-text">✨ 一键生成 V 家六人 (初音/双子/流歌/KM)</span>
                    </label>
                </div>
            </transition>
          </div>

          <div class="form-group">
            <label>日元价格 (¥)</label>
            <input v-model.number="manualForm.price" type="number" class="std-input" placeholder="0">
          </div>

          <div class="form-group">
            <label>商品图片 (全员图)</label>
            <div class="upload-preview" @click="!uploading && $refs.fileInput.click()">
               <div v-if="uploading" class="upload-placeholder">
                  <span>☁️ 正在上传服务器...</span>
               </div>
               <img v-else-if="manualForm.image_url" :src="manualForm.image_url" class="preview-img">
               <div v-else class="upload-placeholder">
                 <span>📷 点击上传图片</span>
               </div>
            </div>
            <input type="file" ref="fileInput" style="display:none" @change="handleManualFile" accept="image/*">
          </div>

          <div class="modal-actions">
            <button @click="showManualModal = false" class="btn-cancel">取消</button>
            <button @click="confirmManualAdd" class="btn-primary" :disabled="uploading">
                {{ uploading ? '上传中...' : (manualForm.auto_v6 ? '✨ 批量添加 (6)' : '确认添加') }}
            </button>
          </div>
        </div>
      </div>

    </div>
</template>
  
<script setup>
import { ref, reactive, watch } from 'vue'
import { supabase } from '../../services/supabase' 
import { scrapeOfficialSite } from '../../services/scraperService'

const props = defineProps(['data'])
const emit = defineEmits(['next', 'prev', 'update:data'])

const mode = ref('library')
const searchKey = ref('')
const targetUrl = ref('')
const loading = ref(false)
const uploading = ref(false) 
const searchResults = ref([])
const activeBrush = ref('hot') 

// V家角色列表
const VSINGER_CHARS = ['初音未来', '镜音铃', '镜音连', '巡音流歌', 'KAITO', 'MEIKO']

const showManualModal = ref(false)
const manualForm = reactive({
    original_name: '', 
    category_name: '', 
    is_blind_box: false, 
    auto_v6: false, // 🔴 新增：是否自动生成6人
    price: '',
    image_url: ''
})

// 监听盲抽状态，如果取消盲抽，自动取消一键生成
watch(() => manualForm.is_blind_box, (val) => {
    if (!val) manualForm.auto_v6 = false
})

const ITEM_TYPES = [
{ key: 'hot', label: '热门', icon: '🔥', desc: '需捆绑/竞价' },
{ key: 'normal', label: '普通', icon: '✨', desc: '正常售卖' },
{ key: 'cold', label: '调价', icon: '❄️', desc: '被捆绑/降价' },
{ key: 'hidden', label: '隐藏', icon: '🕵️', desc: '特殊分配' },
{ key: 'bonus', label: '特典', icon: '🎁', desc: '满赠/分配' }
]

// 搜索库内
const searchLibrary = async () => {
    if (!searchKey.value) return
    loading.value = true
    const { data } = await supabase
        .from('items')
        .select('*')
        .ilike('name', `%${searchKey.value}%`)
        .limit(10) 

    searchResults.value = data || []
    loading.value = false
}

// 关闭搜索结果
const clearSearch = () => {
    searchResults.value = []
    searchKey.value = ''
}

// 抓取
const runScraper = async () => {
    loading.value = true
    try {
        const items = await scrapeOfficialSite(targetUrl.value)
        searchResults.value = items.map(i => ({...i, id: Date.now() + Math.random()})) 
    } catch (e) {
        alert('爬虫连接失败，加载演示数据...')
        searchResults.value = [
        { name: '初音未来 2025 盲抽徽章 (Box)', price: 6000, is_blind_box: true, image_url: 'https://placehold.co/100x100?text=BlindBox' },
        { name: '镜音双子 亚克力立牌', price: 1500, image_url: 'https://placehold.co/100x100?text=RinLen' },
        { name: 'KAITO 应援毛巾', price: 2000, image_url: 'https://placehold.co/100x100?text=Kaito' },
        { name: '全员特典色纸 (随机)', price: 0, image_url: 'https://placehold.co/100x100?text=Bonus' }
        ]
    } finally {
        loading.value = false
    }
}

// 图片上传
const handleManualFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
        uploading.value = true 
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
        const filePath = `items/${fileName}` 

        const { error: uploadError } = await supabase.storage
            .from('user_uploads') 
            .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data } = supabase.storage
            .from('user_uploads')
            .getPublicUrl(filePath)

        manualForm.image_url = data.publicUrl
        
    } catch (err) {
        console.error(err)
        alert('图片上传失败: ' + err.message)
        e.target.value = '' 
    } finally {
        uploading.value = false
    }
}

// 🔴 核心逻辑：确认添加 (支持批量生成)
const confirmManualAdd = () => {
    if(!manualForm.category_name) return alert('请务必填写中文属性(如:雨伞/吧唧)，以免发错货')
    if(uploading.value) return alert('图片正在上传中，请稍后...')

    const commonPrice = Number(manualForm.price) || 0
    const commonImg = manualForm.image_url || 'https://placehold.co/100x100?text=NoImg'

    if (manualForm.is_blind_box && manualForm.auto_v6) {
        // ✨ 批量生成逻辑
        VSINGER_CHARS.forEach(char => {
            const fullName = `${char} ${manualForm.category_name}`
            addItem({
                id: Date.now() + Math.random(),
                name: fullName,
                price: commonPrice,
                is_blind_box: true,
                image_url: commonImg
            })
        })
    } else {
        // 普通添加
        let finalName = manualForm.category_name
        if (manualForm.original_name) {
            finalName = `${manualForm.original_name} (${manualForm.category_name})`
        }
        
        addItem({
            id: Date.now(), 
            name: finalName, 
            price: commonPrice, 
            is_blind_box: manualForm.is_blind_box, 
            image_url: commonImg
        })
    }

    // 重置表单
    manualForm.original_name = ''
    manualForm.category_name = ''
    manualForm.is_blind_box = false
    manualForm.auto_v6 = false // 重置
    manualForm.price = ''
    manualForm.image_url = ''
    showManualModal.value = false
}

const addItem = (item) => {
    props.data.items.push({
        ...item,
        type: 'normal', 
        self_keep: 0,
        price_cny: 0,
        is_blind_box: item.is_blind_box || false 
    })
    // 自动填充标题 (如果是第一次添加)
    if (!props.data.title && props.data.items.length === 1) {
        props.data.title = `[拼团] ${item.name.replace('初音未来 ', '')} 等`
    }
}

const removeItem = (idx) => {
    props.data.items.splice(idx, 1)
}

const applyBrush = (idx) => {
    props.data.items[idx].type = activeBrush.value
}

const getLabel = (key) => ITEM_TYPES.find(t => t.key === key)?.label

const validateAndNext = () => {
    if (props.data.items.length === 0) return alert('请至少添加一件商品')
    emit('next')
}
</script>
  
<style scoped>
/* 全局字体优化 */
.step-content { 
    padding: 10px; 
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #333;
}
h3 { margin: 0 0 5px 0; color: #333; font-weight: 700; }
.sub-title { color: #888; font-size: 13px; margin-bottom: 20px; }

/* 导入控制台 */
.import-box { background: #f8f9fa; padding: 15px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #eef2f5; }
.tabs { display: flex; gap: 10px; margin-bottom: 12px; }
.tabs button { 
    background: white; border: 1px solid #ddd; padding: 6px 14px; border-radius: 20px; 
    cursor: pointer; font-size: 13px; color: #666; transition: 0.2s; 
}
.tabs button.active { 
    background: #39C5BB; color: white; border-color: #39C5BB; font-weight: bold; 
    box-shadow: 0 2px 6px rgba(57,197,187,0.3);
}

.input-row { display: flex; gap: 10px; }
.manual-guide { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; gap: 10px; padding: 10px; color: #666; font-size: 14px; }

/* 输入框美化 */
.std-input { 
    flex: 1; padding: 10px 15px; border: 1px solid #ddd; border-radius: 8px; 
    transition: 0.2s; outline: none; font-size: 14px;
}
.std-input:focus { border-color: #39C5BB; box-shadow: 0 0 0 3px rgba(57,197,187,0.1); }

.btn-primary { 
    background: #39C5BB; color: white; border: none; padding: 8px 24px; border-radius: 8px; 
    cursor: pointer; font-weight: 600; transition: 0.2s; 
}
.btn-primary:hover:not(:disabled) { background: #26a69a; transform: translateY(-1px); }
.btn-primary:disabled { background: #ccc; cursor: not-allowed; }

/* 搜索结果池 */
.selection-pool { margin-bottom: 20px; border: 1px dashed #39C5BB; background: #e0f7fa; padding: 12px; border-radius: 10px; position: relative; }
.pool-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.pool-header h4 { margin: 0; color: #00796b; font-size: 14px; }
.btn-close-pool { background: white; border: 1px solid #00796b; color: #00796b; border-radius: 4px; cursor: pointer; font-size: 12px; padding: 2px 8px; }
.btn-close-pool:hover { background: #00796b; color: white; }

.pool-grid { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 5px; }
.pool-item { width: 100px; flex-shrink: 0; background: white; border-radius: 8px; padding: 6px; cursor: pointer; transition: 0.2s; border: 1px solid #eee; }
.pool-item:hover { transform: translateY(-3px); box-shadow: 0 4px 10px rgba(0,0,0,0.1); border-color: #39C5BB; }
.pool-img { width: 100%; height: 80px; object-fit: cover; border-radius: 6px; }
.pool-name { font-size: 11px; margin-top: 5px; height: 2.4em; overflow: hidden; line-height: 1.2; text-align: center; }

/* 工具栏 */
.tool-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; background: white; padding: 12px; border-radius: 10px; position: sticky; top: 0; z-index: 10; box-shadow: 0 4px 10px rgba(0,0,0,0.05); border: 1px solid #f0f0f0; }
.brush-group { display: flex; gap: 5px; }
.brush-btn { border: 1px solid #e0e0e0; background: white; padding: 5px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; transition: 0.2s; }
.brush-btn:hover { background: #f5f5f5; }
.brush-btn.active { transform: scale(1.05); font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }

.brush-btn.hot.active { background: #ffebee; color: #d32f2f; border-color: #ef5350; }
.brush-btn.normal.active { background: #e3f2fd; color: #1976d2; border-color: #42a5f5; }
.brush-btn.cold.active { background: #e0f7fa; color: #006064; border-color: #26c6da; }
.brush-btn.hidden.active { background: #f3e5f5; color: #7b1fa2; border-color: #ab47bc; }
.brush-btn.bonus.active { background: #fff3e0; color: #f57c00; border-color: #ffa726; }
.tip { font-size: 11px; color: #999; margin-left: auto; }

/* 商品列表 */
.items-list { display: flex; flex-direction: column; gap: 12px; }
.list-item { 
    display: flex; gap: 12px; padding: 12px; background: white; 
    border: 1px solid #eee; border-radius: 10px; align-items: center; 
    cursor: pointer; transition: 0.2s; position: relative; 
}
.list-item:hover { border-color: #39C5BB; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }

/* 选中状态高亮 */
.list-item.hot { border-left: 4px solid #ef5350; background: #fffbfb; }
.list-item.cold { border-left: 4px solid #26c6da; background: #f0ffff; }
.list-item.hidden { border-left: 4px solid #ab47bc; background: #fdf5ff; }
.list-item.bonus { border-left: 4px solid #ffa726; background: #fffbf0; }

.img-wrap { position: relative; width: 56px; height: 56px; flex-shrink: 0; }
.item-thumb { width: 100%; height: 100%; border-radius: 6px; object-fit: cover; border: 1px solid #eee; }
.blind-badge { position: absolute; top: -6px; right: -8px; background: #673ab7; color: white; font-size: 10px; padding: 2px 5px; border-radius: 4px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }

.item-info { flex: 1; margin-left: 5px; overflow: hidden; }
.item-name { font-size: 15px; font-weight: 600; color: #333; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item-meta { display: flex; gap: 10px; font-size: 12px; align-items: center; }
.price { color: #f57c00; font-size: 12px; }
.price-num { font-size: 15px; font-weight: bold; font-family: 'DIN Alternate', Arial, sans-serif; }
.type-badge { background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 11px; color: #666; }

.item-actions { display: flex; gap: 12px; align-items: center; }
.check-label { font-size: 12px; color: #666; display: flex; align-items: center; gap: 4px; cursor: pointer; }
.keep-input { width: 40px; padding: 4px; border: 1px solid #ddd; border-radius: 4px; text-align: center; font-size: 13px; outline: none; }
.keep-input:focus { border-color: #39C5BB; }
.btn-del { width: 24px; height: 24px; border-radius: 50%; border: none; background: #ffebee; color: #c62828; cursor: pointer; display: flex; justify-content: center; align-items: center; font-size: 14px; transition: 0.2s; }
.btn-del:hover { background: #ef5350; color: white; }
.divider { width: 1px; height: 18px; background: #eee; }

/* 底部操作栏 */
.footer-actions { 
    margin-top: 30px; display: flex; justify-content: space-between; align-items: center; 
    border-top: 1px solid #eee; padding-top: 20px; 
}
.summary { font-size: 14px; color: #666; }
.summary-num { font-weight: bold; color: #39C5BB; font-size: 16px; margin: 0 2px; }

.btn-next { 
    background: #39C5BB; color: white; border: none; padding: 12px 40px; border-radius: 30px; 
    font-weight: bold; cursor: pointer; font-size: 15px;
    box-shadow: 0 4px 12px rgba(57,197,187,0.3); transition: all 0.2s ease;
}
.btn-next:hover:not(:disabled) { 
    transform: translateY(-2px); 
    box-shadow: 0 6px 16px rgba(57,197,187,0.4); 
    background: #26a69a;
}
.btn-next:disabled { background: #e0e0e0; box-shadow: none; cursor: not-allowed; color: #aaa; }

/* 弹窗样式 */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; backdrop-filter: blur(2px); }
.modal-content { background: white; padding: 30px; border-radius: 16px; width: 380px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
.form-group { margin-bottom: 20px; }
.form-group label { display: block; font-weight: 600; margin-bottom: 8px; font-size: 14px; color: #333; }
.input-hint { font-size: 12px; color: #999; margin-top: 6px; }

.modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 25px; }
.btn-cancel { background: #f5f5f5; border: 1px solid #ddd; padding: 10px 25px; border-radius: 8px; cursor: pointer; font-weight: 500; transition: 0.2s; }
.btn-cancel:hover { background: #e0e0e0; }

.checkbox-row { border: 1px dashed #673ab7; padding: 12px; border-radius: 8px; background: #f3e5f5; }
.checkbox-label { display: flex; align-items: center; gap: 10px; cursor: pointer; margin-bottom: 0 !important; }
.sub-checkbox { margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(103, 58, 183, 0.2); }
.highlight-text { color: #673ab7; font-weight: bold; font-size: 13px; }

/* 动画 */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* 图片上传预览框 */
.upload-preview { width: 100%; height: 160px; background: #fafafa; border: 2px dashed #e0e0e0; border-radius: 10px; display: flex; justify-content: center; align-items: center; cursor: pointer; overflow: hidden; transition: 0.2s; }
.upload-preview:hover { border-color: #39C5BB; background: #f0fdfc; }
.preview-img { width: 100%; height: 100%; object-fit: contain; }
.upload-placeholder { color: #aaa; font-size: 14px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
</style>