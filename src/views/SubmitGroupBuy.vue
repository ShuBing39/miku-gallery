<template>
  <div class="publish-container">
    <div class="steps-header">
      <button class="back-btn" @click="handleBack">⬅</button>
      <div class="steps-bar">
        <div class="step" :class="{ active: currentStep >= 1 }">1. 选品</div>
        <div class="line" :class="{ active: currentStep >= 2 }"></div>
        <div class="step" :class="{ active: currentStep >= 2 }">2. 定价</div>
        <div class="line" :class="{ active: currentStep >= 3 }"></div>
        <div class="step" :class="{ active: currentStep >= 3 }">3. 规则</div>
        <div class="line" :class="{ active: currentStep >= 4 }"></div>
        <div class="step" :class="{ active: currentStep >= 4 }">4. 发布</div>
      </div>
    </div>

    <div class="content-body">
      <keep-alive>
        <component 
          :is="currentStepComponent" 
          v-model:data="groupData"
          @next="nextStep"
          @prev="prevStep"
        />
      </keep-alive>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/userStore'
import { getIdentityStatus } from '../services/authService'

// 引入分步组件 (稍后创建)
import Step1_Selection from '../components/group/Step1_Selection.vue'
import Step2_Pricing from '../components/group/Step2_Pricing.vue'
import Step3_Rules from '../components/group/Step3_Rules.vue'
import Step4_Confirm from '../components/group/Step4_Confirm.vue'

const router = useRouter()
const userStore = useUserStore()

const currentStep = ref(1)
const loading = ref(true)

// 核心数据模型 (贯穿所有步骤)
const groupData = reactive({
  // Step 1: 选品
  title: '',
  cover_image: '',
  items: [], // [{ name, price, image, type: 'hot'/'cold'..., self_keep: 0 }]
  
  // Step 2: 定价
  exchange_rate: 0.055,
  fees: [], // [{ name: '车马费', amount: 10 }]
  
  // Step 3: 规则
  logistics: { mode: 'weight', price: 0 },
  rules: {
    box_strategy: 'pool_mix', // 盲盒策略
    cut_priority: 'deposit_first', // 砍单优先级
    bind_rule: 'random_bind', // 捆绑模式
    surplus_rule: 'public_sale', // 余量处理
    bonus_rule: 'pool_split' // 特典分配
  },
  
  // Step 4: 隐私与模式
  mode: 'online', // 'online' | 'solo'
  visibility: 'public', // 'public' | 'private'
  contact: { type: 'qq', value: '', visible: 'joined' }
})

// 动态组件映射
const steps = {
  1: Step1_Selection,
  2: Step2_Pricing,
  3: Step3_Rules,
  4: Step4_Confirm
}
const currentStepComponent = computed(() => steps[currentStep.value])

onMounted(async () => {
  loading.value = true
  if (!userStore.user) {
    await userStore.initialize()
    if (!userStore.user) return router.replace('/login')
  }

  // 🔒 核心风控：检查实名状态
  const kyc = await getIdentityStatus(userStore.user.id)
  if (!kyc || kyc.status !== 'approved') {
    alert('⚠️ 根据平台规则，发布团购前必须完成实名认证。')
    router.replace('/verify')
    return
  }

  // 🔞 未成年风控提示
  if (kyc.is_minor) {
    alert('🔞 提示：您未满18周岁，仅可使用【记账工具】或发布【私密团】，不可发布公开团购。')
    // 可以在这里强制锁定 visibility 选项，稍后在 Step 4 处理
  }
  
  loading.value = false
})

// 流程控制
const nextStep = () => {
  if (currentStep.value < 4) currentStep.value++
}
const prevStep = () => {
  if (currentStep.value > 1) currentStep.value--
}
const handleBack = () => {
  if (currentStep.value > 1) prevStep()
  else router.go(-1)
}
</script>

<style scoped>
.publish-container { max-width: 800px; margin: 0 auto; padding: 20px; font-family: 'Segoe UI', sans-serif; min-height: 100vh; background: #f9f9f9; }

/* 步骤条样式 */
.steps-header { display: flex; align-items: center; margin-bottom: 30px; background: white; padding: 15px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.03); }
.back-btn { background: #f0f0f0; border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-weight: bold; margin-right: 20px; }
.steps-bar { flex: 1; display: flex; align-items: center; justify-content: space-between; }
.step { font-size: 14px; color: #999; font-weight: bold; transition: 0.3s; }
.step.active { color: #39C5BB; transform: scale(1.05); }
.line { flex: 1; height: 2px; background: #eee; margin: 0 10px; transition: 0.3s; }
.line.active { background: #39C5BB; }

.content-body { background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); min-height: 500px; }

@media (max-width: 600px) {
  .publish-container { padding: 10px; }
  .content-body { padding: 20px; }
  .step { font-size: 12px; }
}
</style>