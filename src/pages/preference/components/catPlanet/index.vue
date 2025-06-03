<script setup lang="ts">
import { 
  LoadingOutlined, 
  ExperimentOutlined, 
  UpCircleOutlined, 
  SearchOutlined,
  LockOutlined,
  UnlockOutlined,
  ReloadOutlined,
  PlusOutlined,
  HeartOutlined,
  GiftOutlined
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, onMounted, ref, onUnmounted } from 'vue'

// 导入钱包组件和工具
import { useWallet } from '@/composables/wallet/useWallet'
import { useWalletUI } from '@/composables/wallet/useWalletUI'
import { PasswordManager } from '@/utils/PasswordManager'
// 添加解锁组件导入
import WalletUnlockModal from '@/components/wallet/WalletUnlockModal.vue'
// 导入猫咪基因处理工具
import { 
  parseGene, 
  getCatGeneDetails, 
  getCatAppearanceStyle, 
  getCatColorClass,
  type GeneParseResult,
  type CatAppearance,
  type CatGeneDetails
} from '@/utils/catGeneParser'
// 导入区块链操作工具
import {
  checkCatHasAvailableExp,
  mintCat as chainMintCat,
  feedCat as chainFeedCat,
  upgradeCat as chainUpgradeCat,
  checkCatAction as chainCheckCatAction,
  getUserCats as chainGetUserCats,
  getCatInteractions as chainGetCatInteractions
} from '@/utils/chainOperations'

// 猫咪数据结构接口
interface CatInfo {
  id: number
  owner: string
  genes: number
  birth_time: number
  stamina: number
  level: number
  experience: number
  last_external_check: number
  last_processed_log_id: number
}

interface InteractionInfo {
  id: number
  cat_id: number
  owner: string
  action_type: string
  attribute_change: number
  timestamp: string
}

// 使用钱包hooks
const wallet = useWallet()
const walletUI = useWalletUI()

// 状态变量
const loading = ref(false)
const catsList = ref<CatInfo[]>([])
const interactions = ref<InteractionInfo[]>([])
const selectedCatId = ref<number | null>(null)
const showPasswordModal = ref(false)
const password = ref('')
const actionType = ref<'upgrade' | 'checkaction' | 'mint' | 'feed' | null>(null)
const errorMessage = ref('')
const refreshingCat = ref<number | null>(null)
const interactionsLoading = ref(false)
const catsLoading = ref(false)
const isPatting = ref(false)
const isHovering = ref(false)
const hasAvailableExp = ref(false)
const checkInterval = ref<number | null>(null)

// 计算属性
const isWalletConnected = computed(() => walletUI.isWalletConnected.value)
const isWalletLocked = computed(() => walletUI.isWalletLocked.value)
const accountName = computed(() => walletUI.walletAddress.value || '')

// 生成基于基因的猫咪颜色CSS类
const getCatColor = (genes: number) => {
  return getCatColorClass(genes);
}

// 格式化时间戳
const formatTime = (timestamp: number) => {
  if (!timestamp) return '未知'
  const date = new Date(timestamp * 1000)
  return date.toLocaleString()
}

// 格式化ISO格式的时间字符串，转换为+8时区
const formatISOTime = (timeStr: string) => {
  if (!timeStr) return '未知'
  try {
    // 解析ISO时间字符串
    const date = new Date(timeStr)
    // 添加8小时调整为北京时间
    const chinaTime = new Date(date.getTime() + 8 * 60 * 60 * 1000)
    // 格式化为友好的本地时间显示
    return chinaTime.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  } catch (e) {
    console.error('时间格式化错误:', e)
    return timeStr
  }
}

// 计算距离上次检查的时间（小时）
const getHoursSinceLastCheck = (timestamp: number) => {
  if (!timestamp) return '从未检查'
  const now = Math.floor(Date.now() / 1000)
  const hours = Math.floor((now - timestamp) / 3600)
  return `${hours}小时前`
}

// 计算指定等级所需的总经验值
const xpForLevel = (level: number) => {
  // 使用二次方程式: xp = 100 * (level^2) + 500 * level
  return 100 * level * level + 500 * level
}

// 计算经验进度百分比
const getExpProgressPercent = (exp: number, level: number) => {
  // 下一等级所需总经验
  const nextLevelExp = xpForLevel(level)
  // 当前已获得的总经验
  const currentExp = exp || 0
  
  // 计算进度百分比，确保在0-100之间
  return Math.min(Math.max(Math.floor((currentExp / nextLevelExp) * 100), 0), 100)
}

// 获取经验显示文本
const getExpDisplayText = (exp: number, level: number) => {
  // 下一等级所需总经验
  const nextLevelExp = xpForLevel(level)
  // 当前已获得的总经验
  const currentExp = exp || 0
  
  return `${currentExp}/${nextLevelExp}`
}

// 判断猫咪是否可升级
const canUpgrade = (exp: number, level: number) => {
  const nextLevelExp = xpForLevel(level)
  return exp >= nextLevelExp
}

// 在errorMessage赋值时添加自动关闭计时器的函数
const showErrorWithTimeout = (message: any, timeout: number = 3000): void => {
  errorMessage.value = typeof message === 'string' ? message : String(message);
  setTimeout(() => {
    errorMessage.value = '';
  }, timeout);
}

// 获取用户的猫咪列表
const fetchUserCats = async () => {
  if (!wallet) {
    console.error('钱包未连接或初始化失败');
    showErrorWithTimeout('钱包未连接，请先连接钱包');
    return;
  }

  loading.value = true;
  catsLoading.value = true;

  try {
    catsList.value = await chainGetUserCats(
      wallet, 
      accountName.value,
      (message, data) => walletUI.addDebugLog(message, data)
    );
    
    if (catsList.value.length > 0 && !selectedCatId.value) {
      // 默认选择第一只猫
      selectedCatId.value = catsList.value[0].id;
      // 获取该猫的互动记录
      await fetchCatInteractions(selectedCatId.value);
    } else if (catsList.value.length === 0) {
      message.info('您还没有猫咪，请先获取一只猫咪');
    }
  } catch (error: any) {
    console.error('获取猫咪失败:', error);
    console.error('错误详情:', {
      isWalletConnected: !!wallet,
      accountName: accountName.value,
      errorMessage: error?.message || '未知错误',
      errorStack: error?.stack
    });
    showErrorWithTimeout(`获取猫咪失败: ${error?.message || '请检查网络连接'}`);
  } finally {
    loading.value = false;
    catsLoading.value = false;
  }
};

// 获取猫咪的互动记录
const fetchCatInteractions = async (catId: number) => {
  if (!wallet) {
    console.error('钱包未连接或初始化失败');
    message.error('钱包未连接，请先连接钱包');
    return;
  }

  interactionsLoading.value = true;

  try {
    interactions.value = await chainGetCatInteractions(
      wallet,
      catId,
      (message, data) => walletUI.addDebugLog(message, data)
    );
  } catch (error: any) {
    console.error('获取互动记录失败:', error);
    console.error('错误详情:', {
      isWalletConnected: !!wallet,
      accountName: accountName.value,
      errorMessage: error?.message || '未知错误',
      errorStack: error?.stack
    });
    message.error(`获取互动记录失败: ${error?.message || '请检查网络连接'}`);
  } finally {
    interactionsLoading.value = false;
  }
};

// 定时检查是否有可获取的经验
const startCheckingForExp = () => {
  // 清除之前的定时器
  if (checkInterval.value) {
    clearInterval(checkInterval.value);
  }
  
  // 设置新的定时器，每分钟检查一次
  checkInterval.value = window.setInterval(async () => {
    try {
      if (
        !isWalletConnected.value || 
        isWalletLocked.value || 
        !selectedCatId.value || 
        !wallet
      ) {
        hasAvailableExp.value = false;
        return;
      }
      
      const selectedCat = catsList.value.find(cat => cat.id === selectedCatId.value);
      if (!selectedCat) {
        hasAvailableExp.value = false;
        return;
      }
      
      // 检查是否有可获取的经验
      hasAvailableExp.value = await checkCatHasAvailableExp(
        wallet,
        accountName.value,
        selectedCatId.value,
        selectedCat.last_external_check,
        (message, data) => walletUI.addDebugLog(message, data)
      );
      
      console.log('检查经验结果:', hasAvailableExp.value);
    } catch (error) {
      console.error('检查可获取经验出错:', error);
      hasAvailableExp.value = false;
    }
  }, 10*1000); // 60000毫秒 = 1分钟
  
  // 立即执行一次检查
  setTimeout(async () => {
    try {
      if (
        isWalletConnected.value && 
        !isWalletLocked.value && 
        selectedCatId.value && 
        wallet
      ) {
        const selectedCat = catsList.value.find(cat => cat.id === selectedCatId.value);
        if (selectedCat) {
          hasAvailableExp.value = await checkCatHasAvailableExp(
            wallet,
            accountName.value,
            selectedCatId.value,
            selectedCat.last_external_check,
            (message, data) => walletUI.addDebugLog(message, data)
          );
          walletUI.addDebugLog(`初始检查经验结果: ${hasAvailableExp.value}`)
        }
      }
    } catch (error) {
      console.error('初始检查可获取经验出错:', error);
      walletUI.addDebugLog('初始检查可获取经验出错:', error)
    }
  }, 1000);
}

// 组件卸载时清除定时器
onUnmounted(() => {
  if (checkInterval.value) {
    clearInterval(checkInterval.value);
    checkInterval.value = null;
  }
});

// 选择猫咪
const selectCat = (catId: number) => {
  selectedCatId.value = catId
  fetchCatInteractions(catId)
  
  // 重新开始检查经验
  startCheckingForExp()
}

// 执行合约操作前的检查
const prepareAction = (type: 'upgrade' | 'checkaction' | 'mint' | 'feed') => {
  if (!isWalletConnected.value) {
    showErrorWithTimeout('请先连接钱包');
    return false;
  }
  
  if (isWalletLocked.value) {
    message.warning('钱包已锁定，请先解锁',5)
    walletUI.modals.unlockWallet = true
    walletUI.addDebugLog('猫星球页面触发钱包解锁对话框')
    return false
  }
  
  // 对于mint操作不需要选择猫咪
  if (type !== 'mint' && !selectedCatId.value) {
    showErrorWithTimeout('请先选择一只猫咪')
    return false
  }
  
  actionType.value = type
  showPasswordModal.value = true
  return true
}

// 准备铸造猫咪
const mintCat = async () => {
  if (!prepareAction('mint')) return;
}

// 升级猫咪
const upgradeCat = async () => {
  if (!prepareAction('upgrade')) return;
}

// 执行检查操作
const checkCatAction = async () => {
  if (!prepareAction('checkaction')) return;
}

// 喂养猫咪
const feedCat = async () => {
  if (!prepareAction('feed')) return;
}

// 处理密码输入确认
const handlePasswordConfirm = async () => {
  if (!password.value || !actionType.value) {
    message.error('请输入密码')
    return
  }
  
  // 对于非mint操作，需要选择猫咪
  if (actionType.value !== 'mint' && !selectedCatId.value) {
    message.error('请选择猫咪')
    return
  }
  
  try {
    loading.value = true
    
    // 验证密码
    const isValid = await PasswordManager.verifyPassword(password.value)
    if (!isValid) {
      message.error('密码不正确')
      return
    }
    
    // 获取加密的钱包数据
    const encryptedWallet = localStorage.getItem('bongo-cat-wallet-encrypted')
    if (!encryptedWallet) {
      message.error('找不到钱包数据')
      return
    }
    
    // 解密获取私钥
    const walletData = await PasswordManager.decryptData(encryptedWallet, password.value)
    const privateKey = walletData.privateKey
    
    // 检查钱包对象是否可用
    if (!wallet) {
      throw new Error('钱包未初始化或尚未连接')
    }
    
    let result;
    walletUI.addDebugLog(`准备执行${actionType.value}操作`);
    
    // 根据不同操作类型执行相应的链上操作
    switch (actionType.value) {
      case 'mint':
        result = await chainMintCat(
          wallet,
          accountName.value,
          (message, data) => walletUI.addDebugLog(message, data)
        );
        break;
      case 'feed':
        if (!selectedCatId.value) throw new Error('未选择猫咪');
        result = await chainFeedCat(
          wallet,
          accountName.value,
          selectedCatId.value,
          (message, data) => walletUI.addDebugLog(message, data)
        );
        break;
      case 'upgrade':
        if (!selectedCatId.value) throw new Error('未选择猫咪');
        result = await chainUpgradeCat(
          wallet,
          accountName.value,
          selectedCatId.value,
          (message, data) => walletUI.addDebugLog(message, data)
        );
        break;
      case 'checkaction':
        if (!selectedCatId.value) throw new Error('未选择猫咪');
        result = await chainCheckCatAction(
          wallet,
          accountName.value,
          selectedCatId.value,
          (message, data) => walletUI.addDebugLog(message, data)
        );
        break;
    }
    
    // 关闭密码对话框
    showPasswordModal.value = false;
    password.value = '';
    
    // 刷新猫咪数据
    await fetchUserCats();
    if (selectedCatId.value) {
      await fetchCatInteractions(selectedCatId.value);
    }
    
    // 重置经验检查状态
    hasAvailableExp.value = false;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : '未知错误';
    walletUI.addDebugLog(`执行${actionType.value}操作失败`, err);
    message.error(`操作失败: ${errMsg}`);
  } finally {
    loading.value = false;
  }
}

// 刷新数据
const refreshData = async () => {
  await fetchUserCats()
  if (selectedCatId.value) {
    await fetchCatInteractions(selectedCatId.value)
  }
}

// 添加猫咪拍打互动函数
const patCat = () => {
  if (isPatting.value) return
  
  isPatting.value = true
  message.success('喵~', 1)
  
  // 1秒后重置状态
  setTimeout(() => {
    isPatting.value = false
  }, 1000)
}

// 计算猫咪详情
const getSelectedCatGeneDetails = computed(() => {
  if (!selectedCatId.value || !catsList.value.length) return null
  
  const selectedCat = catsList.value.find(cat => cat.id === selectedCatId.value)
  if (!selectedCat) return null
  
  const geneValue = selectedCat.genes || 0
  return getCatGeneDetails(geneValue);
})

// 获取猫咪外观样式
const getCatAppearance = computed(() => {
  if (!selectedCatId.value || !catsList.value.length) return null
  
  const selectedCat = catsList.value.find(cat => cat.id === selectedCatId.value)
  if (!selectedCat) return null
  
  const geneValue = selectedCat.genes || 0
  return getCatAppearanceStyle(geneValue);
})

// 组件挂载时获取数据
onMounted(async () => {
  try {
    // 检查钱包是否连接且解锁
    if (isWalletConnected.value && !isWalletLocked.value) {
      // 检查钱包对象是否正确初始化
      if (!wallet) {
        showErrorWithTimeout('钱包实例未正确初始化，请刷新页面或重新连接钱包')
        walletUI.addDebugLog('钱包组件挂载时发现 dfsWallet 未初始化')
        return
      }
      
      // 获取猫咪数据
      await fetchUserCats()
      
      // 开始检查经验
      startCheckingForExp()
    } else if (isWalletConnected.value && isWalletLocked.value) {
      // 钱包已连接但锁定
      showErrorWithTimeout('钱包已锁定，请先解锁钱包')
      walletUI.addDebugLog('钱包组件挂载时发现钱包已锁定')
    } else {
      // 钱包未连接
      showErrorWithTimeout('请先连接钱包')
      walletUI.addDebugLog('钱包组件挂载时发现钱包未连接')
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : '未知错误'
    showErrorWithTimeout(`初始化猫咪数据失败: ${errMsg}`)
    walletUI.addDebugLog('钱包组件挂载时出错', err)
  }
})
</script>

<template>
  <div class="cat-planet p-4">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-xl font-bold">喵星球</h2>
      <div class="flex gap-2">
        <a-button @click="refreshData" :loading="loading">
          <ReloadOutlined /> 刷新数据
        </a-button>
        <a-button v-if="isWalletLocked" @click="walletUI.showUnlockDialog" type="primary">
          <UnlockOutlined /> 解锁钱包
        </a-button>
        <a-button v-else @click="walletUI.handleLockWallet">
          <LockOutlined /> 锁定钱包
        </a-button>
      </div>
    </div>
    
    <!-- 钱包连接状态 -->
    <a-alert
      v-if="!isWalletConnected"
      type="warning"
      class="mb-4"
      message="请先连接钱包"
      description="在钱包页面连接或创建钱包以管理您的猫咪。"
      show-icon
    />
    
    <a-alert
      v-else-if="isWalletLocked"
      type="warning"
      class="mb-4"
      message="钱包已锁定"
      description="请解锁钱包以管理您的猫咪。"
      show-icon
    />
    
    <a-alert
      v-if="errorMessage"
      type="error"
      class="mb-4"
      :message="errorMessage"
      show-icon
      closable
      @close="errorMessage = ''"
    />
    
    <!-- 内容区 -->
    <a-row :gutter="16">
      <!-- 左侧猫咪列表 -->
      <a-col :span="10">
        <a-card title="我的猫咪" :loading="loading">
          <template #extra>
            <a-button v-if="catsList.length === 0" type="primary" @click="mintCat" :disabled="!isWalletConnected || isWalletLocked">
              <PlusOutlined /> 铸造猫咪
            </a-button>
          </template>
          
          <!-- 猫咪列表 -->
          <div v-if="!isWalletConnected || isWalletLocked" class="text-center p-4">
            <p>请先连接并解锁钱包</p>
          </div>
          
          <a-empty v-else-if="catsList.length === 0" description="暂无猫咪" />
          
          <div v-else class="cat-list space-y-2">
            <a-card
              v-for="cat in catsList"
              :key="cat.id"
              size="small"
              :class="[
                'cursor-pointer transition-all hover:shadow-md',
                selectedCatId === cat.id ? 'border-primary-5 border-2' : ''
              ]"
              @click="selectCat(cat.id)"
            >
              <div class="flex justify-between items-center">
                <div class="flex items-center gap-2">
                  <div 
                    :class="['size-8 rounded-full flex items-center justify-center text-white', getCatColor(cat.genes)]"
                  >
                    #{{ cat.id }}
                  </div>
                  <div class="flex flex-col">
                    <span class="font-medium">Lv.{{ cat.level }}</span>
                    <span class="text-xs text-gray-500">
                      经验: {{ getExpDisplayText(cat.experience, cat.level) }}
                    </span>
                  </div>
                </div>
                <div class="text-right">
                  <div>体力: {{ cat.stamina }}/100</div>
                  <div class="text-xs text-gray-500">
                    {{ getHoursSinceLastCheck(cat.last_external_check) }}
                  </div>
                </div>
              </div>
            </a-card>
          </div>
          
         <!-- 猫咪图形区域 -->
         <div v-if="catsList.length > 0" class="cat-illustration mt-4 border rounded-lg p-4 flex justify-center items-center" style="min-height: 200px;">
            <div class="relative">
              <div class="cat-tooltip" v-show="isHovering">摸摸我</div>
              <div class="exp-notification" v-if="hasAvailableExp">
                <GiftOutlined class="mr-1" /> 有经验可以获取!
                <a-button 
                  type="primary" 
                  size="small" 
                  class="ml-2" 
                  @click="checkCatAction"
                >
                  点击检查
                </a-button>
              </div>
              <svg 
                width="180" 
                height="140" 
                viewBox="0 0 180 140" 
                xmlns="http://www.w3.org/2000/svg"
                @click="patCat"
                :class="{ 'pat-animation': isPatting }"
                @mouseenter="isHovering = true"
                @mouseleave="isHovering = false"
              >
                <!-- 渐变定义 -->
                <defs>
                  <linearGradient id="cat-body-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" :style="`stop-color:${getCatAppearance?.colors.body1 || '#ffb84d'};stop-opacity:1`" />
                    <stop offset="100%" :style="`stop-color:${getCatAppearance?.colors.body2 || '#e67700'};stop-opacity:1`" />
                  </linearGradient>
                  
                  <linearGradient id="cat-head-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" :style="`stop-color:${getCatAppearance?.colors.body1 || '#ffb84d'};stop-opacity:1`" />
                    <stop offset="100%" :style="`stop-color:${getCatAppearance?.colors.body2 || '#e67700'};stop-opacity:1`" />
                  </linearGradient>
                  
                  <!-- 花纹渐变 -->
                  <pattern v-if="getCatAppearance?.pattern.hasPattern" id="cat-pattern" patternUnits="userSpaceOnUse" width="20" height="20">
                    <rect width="20" height="20" fill="none"/>
                    <g v-if="getCatAppearance?.pattern.type === 1"> <!-- 虎斑 -->
                      <path d="M0,0 L20,20" stroke="rgba(0,0,0,0.2)" stroke-width="4"/>
                      <path d="M20,0 L0,20" stroke="rgba(0,0,0,0.2)" stroke-width="4"/>
                    </g>
                    <g v-else-if="getCatAppearance?.pattern.type === 2"> <!-- 斑点 -->
                      <circle cx="5" cy="5" r="3" fill="rgba(0,0,0,0.2)"/>
                      <circle cx="15" cy="15" r="3" fill="rgba(0,0,0,0.2)"/>
                    </g>
                    <g v-else-if="getCatAppearance?.pattern.type === 3"> <!-- 双色 -->
                      <rect x="0" y="0" width="10" height="20" fill="rgba(0,0,0,0.15)"/>
                    </g>
                  </pattern>
                </defs>
                
                <!-- 猫咪身体 - 更圆润的形状 -->
                <ellipse 
                  class="cat-body" 
                  cx="90" 
                  cy="95" 
                  rx="55" 
                  ry="40" 
                  :fill="getCatAppearance?.pattern.hasPattern ? 'url(#cat-pattern)' : 'url(#cat-body-gradient)'" 
                  :stroke="getCatAppearance?.colors.stroke || '#e09112'" 
                  :stroke-width="getCatAppearance?.fur.strokeWidth || 2"
                />
                
                <!-- 猫咪头部 - 更精致的形状 -->
                <circle 
                  class="cat-body" 
                  cx="90" 
                  cy="60" 
                  r="38" 
                  :fill="getCatAppearance?.pattern.hasPattern ? 'url(#cat-pattern)' : 'url(#cat-head-gradient)'" 
                  :stroke="getCatAppearance?.colors.stroke || '#e09112'" 
                  :stroke-width="getCatAppearance?.fur.strokeWidth || 2"
                />
                
                <!-- 尾巴 -->
                <path 
                  class="cat-tail" 
                  d="M30,90 Q35,60 45,80 Q55,95 40,105" 
                  :fill="getCatAppearance?.pattern.hasPattern ? 'url(#cat-pattern)' : 'url(#cat-body-gradient)'" 
                  :stroke="getCatAppearance?.colors.stroke || '#e09112'" 
                  :stroke-width="getCatAppearance?.fur.strokeWidth || 2" 
                  stroke-linecap="round"
                />
                
                <!-- 耳朵 - 更自然的形状 -->
                <path 
                  class="cat-body" 
                  :d="getCatAppearance?.ears.left || 'M65,35 L60,10 Q75,15 85,30'" 
                  :fill="getCatAppearance?.pattern.hasPattern ? 'url(#cat-pattern)' : 'url(#cat-body-gradient)'" 
                  :stroke="getCatAppearance?.colors.stroke || '#e09112'" 
                  :stroke-width="getCatAppearance?.fur.strokeWidth || 2"
                />
                <path 
                  class="cat-body" 
                  :d="getCatAppearance?.ears.right || 'M115,35 L120,10 Q105,15 95,30'" 
                  :fill="getCatAppearance?.pattern.hasPattern ? 'url(#cat-pattern)' : 'url(#cat-body-gradient)'" 
                  :stroke="getCatAppearance?.colors.stroke || '#e09112'" 
                  :stroke-width="getCatAppearance?.fur.strokeWidth || 2"
                />
                
                <!-- 耳朵内部 -->
                <path 
                  class="cat-body" 
                  :d="getCatAppearance?.ears.leftInner || 'M67,30 L65,15 Q75,20 80,28'" 
                  :fill="getCatAppearance?.colors.ear || '#ffb380'"
                />
                <path 
                  class="cat-body" 
                  :d="getCatAppearance?.ears.rightInner || 'M113,30 L115,15 Q105,20 100,28'" 
                  :fill="getCatAppearance?.colors.ear || '#ffb380'"
                />
                
                <!-- 脸颊 -->
                <ellipse 
                  class="cat-body" 
                  cx="65" 
                  cy="70" 
                  rx="12" 
                  ry="10" 
                  :fill="getCatAppearance?.colors.ear || '#ffb380'" 
                  opacity="0.6"
                />
                <ellipse 
                  class="cat-body" 
                  cx="115" 
                  cy="70" 
                  rx="12" 
                  ry="10" 
                  :fill="getCatAppearance?.colors.ear || '#ffb380'" 
                  opacity="0.6"
                />
                
                <!-- 眼睛 - 更大更有神 -->
                <g class="cat-eyes">
                  <ellipse cx="75" cy="55" rx="9" ry="11" fill="white" stroke="#333" stroke-width="1.5"/>
                  <ellipse cx="105" cy="55" rx="9" ry="11" fill="white" stroke="#333" stroke-width="1.5"/>
                  
                  <!-- 眼睛高光 -->
                  <circle cx="73" cy="51" r="3" fill="white"/>
                  <circle cx="103" cy="51" r="3" fill="white"/>
                  
                  <!-- 瞳孔 - 猫眼竖瞳 -->
                  <ellipse cx="75" cy="55" rx="4" ry="8" :fill="getCatAppearance?.eyes.leftColor || '#333'"/>
                  <ellipse cx="105" cy="55" rx="4" ry="8" :fill="getCatAppearance?.eyes.rightColor || '#333'"/>
                </g>
                
                <!-- 鼻子 - 更精致 -->
                <path class="cat-body" d="M87,65 Q90,67 93,65 L93,68 Q90,70 87,68 Z" fill="#ff9999" stroke="#d67979" stroke-width="0.5"/>
                
                <!-- 嘴 - 更自然的微笑 -->
                <path class="cat-body" d="M85,72 Q90,77 95,72" stroke="#333" stroke-width="1.5" fill="none"/>
                <path class="cat-body" d="M90,68 L90,72" stroke="#333" stroke-width="1" fill="none"/>
                
                <!-- 胡须 - 更自然的曲线 -->
                <g class="cat-whiskers">
                  <path d="M65,70 Q72,71 78,70" stroke="#333" stroke-width="1" fill="none"/>
                  <path d="M65,75 Q73,75 80,74" stroke="#333" stroke-width="1" fill="none"/>
                  <path d="M65,80 Q72,79 78,78" stroke="#333" stroke-width="1" fill="none"/>
                  
                  <path d="M115,70 Q108,71 102,70" stroke="#333" stroke-width="1" fill="none"/>
                  <path d="M115,75 Q107,75 100,74" stroke="#333" stroke-width="1" fill="none"/>
                  <path d="M115,80 Q108,79 102,78" stroke="#333" stroke-width="1" fill="none"/>
                </g>
                
                <!-- 前爪 - 更可爱的设计 -->
                <path 
                  class="cat-body" 
                  d="M65,110 C60,115 62,125 70,125 Q72,120 70,115" 
                  :fill="getCatAppearance?.pattern.hasPattern ? 'url(#cat-pattern)' : 'url(#cat-body-gradient)'" 
                  :stroke="getCatAppearance?.colors.stroke || '#e09112'" 
                  :stroke-width="getCatAppearance?.fur.strokeWidth || 2"
                />
                <path 
                  class="cat-body" 
                  d="M115,110 C120,115 118,125 110,125 Q108,120 110,115" 
                  :fill="getCatAppearance?.pattern.hasPattern ? 'url(#cat-pattern)' : 'url(#cat-body-gradient)'" 
                  :stroke="getCatAppearance?.colors.stroke || '#e09112'" 
                  :stroke-width="getCatAppearance?.fur.strokeWidth || 2"
                />
                
                <!-- 爪子细节 -->
                <path class="cat-body" d="M65,123 L67,119" :stroke="getCatAppearance?.colors.stroke || '#e09112'" stroke-width="1.5"/>
                <path class="cat-body" d="M68,123 L69,119" :stroke="getCatAppearance?.colors.stroke || '#e09112'" stroke-width="1.5"/>
                <path class="cat-body" d="M115,123 L113,119" :stroke="getCatAppearance?.colors.stroke || '#e09112'" stroke-width="1.5"/>
                <path class="cat-body" d="M112,123 L111,119" :stroke="getCatAppearance?.colors.stroke || '#e09112'" stroke-width="1.5"/>
                
                <!-- 毛发特效 -->
                <g v-if="getCatAppearance?.fur.type === 'long'" class="cat-fur-effect">
                  <path d="M65,40 Q60,35 58,30" stroke-width="1" :stroke="getCatAppearance?.colors.stroke || '#e09112'" fill="none" />
                  <path d="M115,40 Q120,35 122,30" stroke-width="1" :stroke="getCatAppearance?.colors.stroke || '#e09112'" fill="none" />
                  <path d="M50,90 Q45,85 40,83" stroke-width="1" :stroke="getCatAppearance?.colors.stroke || '#e09112'" fill="none" />
                  <path d="M130,90 Q135,85 140,83" stroke-width="1" :stroke="getCatAppearance?.colors.stroke || '#e09112'" fill="none" />
                </g>
                <g v-if="getCatAppearance?.fur.type === 'curly'" class="cat-fur-effect">
                  <path d="M65,40 Q60,38 62,32 Q64,30 66,32" stroke-width="1" :stroke="getCatAppearance?.colors.stroke || '#e09112'" fill="none" />
                  <path d="M115,40 Q120,38 118,32 Q116,30 114,32" stroke-width="1" :stroke="getCatAppearance?.colors.stroke || '#e09112'" fill="none" />
                  <path d="M50,90 Q45,88 47,83 Q49,80 51,82" stroke-width="1" :stroke="getCatAppearance?.colors.stroke || '#e09112'" fill="none" />
                  <path d="M130,90 Q135,88 133,83 Q131,80 129,82" stroke-width="1" :stroke="getCatAppearance?.colors.stroke || '#e09112'" fill="none" />
                </g>
              </svg>
            </div>
          </div>
        </a-card>
      </a-col>
      
      <!-- 右侧猫咪详情 -->
      <a-col :span="14">
        <a-card title="猫咪详情" :loading="loading">
          <div v-if="!isWalletConnected || isWalletLocked" class="text-center p-4">
            <p>请先连接并解锁钱包</p>
          </div>
          
          <div v-else-if="!selectedCatId" class="text-center p-4">
            <p>请选择一只猫咪查看详情</p>
          </div>
          
          <div v-else>
            <!-- 猫咪信息 -->
            <div class="cat-info mb-4">
              <div v-if="selectedCatId && catsList.length > 0">
                <div class="flex justify-between items-start mb-4">
                  <div class="flex items-center gap-2">
                    <div 
                      :class="[
                        'size-16 rounded-full flex items-center justify-center text-xl font-bold text-white',
                        getCatColor(catsList.find(c => c.id === selectedCatId)?.genes || 0)
                      ]"
                    >
                      #{{ selectedCatId }}
                    </div>
                    <div>
                      <h3 class="text-lg font-medium">猫咪 #{{ selectedCatId }}</h3>
                      <p class="text-sm text-gray-500">
                        出生于 {{ formatTime(catsList.find(c => c.id === selectedCatId)?.birth_time || 0) }}
                      </p>
                    </div>
                  </div>
                  
                  <a-button type="dashed" @click="checkCatAction" class="flex items-center justify-center gap-1">
                    <ExperimentOutlined /> 检查
                  </a-button>
                </div>
                
                <!-- 属性信息 -->
                <div class="attributes bg-gray-50 p-4 rounded-lg mb-4">
                  <div class="grid grid-cols-1 gap-5">
                    <div>
                      <div class="text-sm text-gray-500 mb-1">等级</div>
                      <div class="flex items-center">
                        <div class="text-2xl font-medium mr-2">
                          {{ catsList.find(c => c.id === selectedCatId)?.level || 0 }}
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <div class="flex justify-between text-sm text-gray-500 mb-1">
                        <span>经验</span>
                      </div>
                      <div class="flex flex-col">
                        <div class="relative w-full" style="height: 24px;">
                          <a-progress 
                            :percent="getExpProgressPercent(
                              catsList.find(c => c.id === selectedCatId)?.experience || 0,
                              catsList.find(c => c.id === selectedCatId)?.level || 1
                            )" 
                            :format="() => ''"
                            stroke-color="#1890ff"
                            :stroke-width="24"
                          />
                          <div class="absolute inset-0 flex items-center justify-center text-xs font-medium" style="line-height: 1;">
                            {{ getExpDisplayText(
                              catsList.find(c => c.id === selectedCatId)?.experience || 0,
                              catsList.find(c => c.id === selectedCatId)?.level || 1
                            ) }} 经验
                          </div>
                          <a-button 
                            type="primary" 
                            size="small" 
                            shape="circle"
                            @click="upgradeCat" 
                            :disabled="!canUpgrade(
                              catsList.find(c => c.id === selectedCatId)?.experience || 0,
                              catsList.find(c => c.id === selectedCatId)?.level || 1
                            )"
                            class="absolute flex items-center justify-center"
                            style="top: -4px; right: -4px; z-index: 10;"
                          >
                            <UpCircleOutlined />
                          </a-button>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <div class="flex justify-between text-sm text-gray-500 mb-1">
                        <span>体力</span>
                      </div>
                      <div class="flex flex-col">
                        <div class="relative w-full" style="height: 24px;">
                          <a-progress
                            :percent="catsList.find(c => c.id === selectedCatId)?.stamina || 0"
                            :stroke-color="((catsList.find(c => c.id === selectedCatId)?.stamina || 0) >= 50) ? '#52c41a' : '#faad14'"
                            :stroke-width="24"
                            :format="() => ''"
                          />
                          <div class="absolute inset-0 flex items-center justify-center text-xs font-medium" style="line-height: 1;">
                            {{ catsList.find(c => c.id === selectedCatId)?.stamina || 0 }}% 体力
                          </div>
                          <a-button 
                            type="primary" 
                            danger 
                            size="small" 
                            shape="circle"
                            @click="feedCat"
                            class="absolute flex items-center justify-center"
                            style="top: -4px; right: -4px; z-index: 10;"
                          >
                            <HeartOutlined />
                          </a-button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- 基因详情 -->
                <div class="gene-details bg-gray-50 p-4 rounded-lg mb-4" v-if="false">
                  <h3 class="text-lg font-medium mb-3">基因详情</h3>
                  
                  <div class="gene-section mb-3">
                    <h4 class="text-base font-medium mb-2">外观特征</h4>
                    <div class="gene-item flex justify-between mb-1">
                      <span class="text-sm text-gray-600">基础色系:</span>
                      <span class="text-sm font-medium">{{ getSelectedCatGeneDetails?.baseColor || '未知' }}</span>
                    </div>
                    <div class="gene-item flex justify-between mb-1">
                      <span class="text-sm text-gray-600">毛发类型:</span>
                      <span class="text-sm font-medium">{{ getSelectedCatGeneDetails?.furLength || '未知' }}</span>
                    </div>
                    <div class="gene-item flex justify-between mb-1">
                      <span class="text-sm text-gray-600">耳朵形状:</span>
                      <span class="text-sm font-medium">{{ getSelectedCatGeneDetails?.earShape || '未知' }}</span>
                    </div>
                    <div class="gene-item flex justify-between mb-1">
                      <span class="text-sm text-gray-600">眼睛颜色:</span>
                      <span class="text-sm font-medium">{{ getSelectedCatGeneDetails?.eyeColor || '未知' }}</span>
                    </div>
                    <div class="gene-item flex justify-between mb-1">
                      <span class="text-sm text-gray-600">特殊花纹:</span>
                      <span class="text-sm font-medium">{{ getSelectedCatGeneDetails?.pattern || '未知' }}</span>
                    </div>
                  </div>
                  
                  <div class="gene-section mb-3">
                    <h4 class="text-base font-medium mb-2">性格与能力</h4>
                    <div class="gene-item flex justify-between mb-1">
                      <span class="text-sm text-gray-600">性格倾向:</span>
                      <span class="text-sm font-medium">{{ getSelectedCatGeneDetails?.personality || '未知' }}</span>
                    </div>
                    <div class="gene-item flex justify-between mb-1">
                      <span class="text-sm text-gray-600">稀有度:</span>
                      <span class="text-sm font-medium">{{ getSelectedCatGeneDetails?.rarity || '未知' }}</span>
                    </div>
                    <div class="gene-item flex justify-between mb-1">
                      <span class="text-sm text-gray-600">成长潜力:</span>
                      <span class="text-sm font-medium" :class="{'text-green-600': getSelectedCatGeneDetails?.growthPotential.includes('高')}">
                        {{ getSelectedCatGeneDetails?.growthPotential || '未知' }}
                      </span>
                    </div>
                    <div class="gene-item flex justify-between mb-1">
                      <span class="text-sm text-gray-600">体力恢复:</span>
                      <span class="text-sm font-medium">{{ getSelectedCatGeneDetails?.staminaRecovery || '未知' }}</span>
                    </div>
                    <div class="gene-item flex justify-between mb-1">
                      <span class="text-sm text-gray-600">幸运值:</span>
                      <span class="text-sm font-medium">{{ getSelectedCatGeneDetails?.luck || '未知' }}</span>
                    </div>
                  </div>
                  
                  <div class="gene-section">
                    <h4 class="text-base font-medium mb-2">特殊能力</h4>
                    <div v-if="getSelectedCatGeneDetails?.specialAbilities.length">
                      <div 
                        v-for="(ability, index) in getSelectedCatGeneDetails?.specialAbilities" 
                        :key="index"
                        class="gene-ability bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm inline-block mr-2 mb-2"
                      >
                        {{ ability }}
                      </div>
                    </div>
                    <div v-else class="text-sm text-gray-500">
                      暂无特殊能力
                    </div>
                    
                    <div v-if="getSelectedCatGeneDetails?.hiddenTrait" class="mt-2">
                      <div class="gene-ability bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm inline-block">
                        隐藏特质：神秘基因
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- 互动记录 -->
                <div>
                  <div class="flex justify-between items-center mb-2">
                    <h4 class="font-medium">互动记录</h4>
                    <a-button 
                      type="primary" 
                      size="small" 
                      @click="fetchCatInteractions(selectedCatId)"
                      :loading="interactionsLoading"
                    >
                      <ReloadOutlined /> 刷新
                    </a-button>
                  </div>
                  
                  <a-empty v-if="interactions.length === 0" description="暂无互动记录" />
                  
                  <a-timeline v-else>
                    <a-timeline-item 
                      v-for="interaction in interactions" 
                      :key="interaction.id"
                      :color="
                        interaction.action_type === 'upgrade' ? 'green' : 
                        interaction.action_type === 'feed' ? 'red' :
                        interaction.action_type === 'addxp' ? 'blue' :
                        interaction.action_type === 'external' ? 'purple' :
                        'gray'
                      "
                    >
                      <p>
                        <span class="font-medium">
                          {{ 
                            interaction.action_type === 'upgrade' ? '升级' : 
                            interaction.action_type === 'addxp' ? '获得经验' :
                            interaction.action_type === 'feed' ? '喂养' :
                            interaction.action_type === 'external' ? '外部检查' :
                            interaction.action_type === 'checkaction' ? '检查活动' :
                            interaction.action_type 
                          }}
                        </span>
                        <span v-if="interaction.attribute_change" class="text-green-500 ml-1">
                          +{{ interaction.attribute_change }}
                        </span>
                      </p>
                      <p class="text-xs text-gray-500">
                        {{ formatISOTime(interaction.timestamp) }}
                      </p>
                    </a-timeline-item>
                  </a-timeline>
                </div>
              </div>
            </div>
          </div>
        </a-card>
      </a-col>
    </a-row>
    
    <!-- 密码输入对话框 -->
    <a-modal
      v-model:visible="showPasswordModal"
      :title="actionType === 'upgrade' ? '升级猫咪' : actionType === 'mint' ? '铸造猫咪' : actionType === 'feed' ? '喂养猫咪' : '检查活动'"
      :confirm-loading="loading"
      @ok="handlePasswordConfirm"
    >
      <p>请输入钱包密码以确认操作</p>
      <a-input-password
        v-model:value="password"
        placeholder="输入钱包密码"
        class="mt-4"
        @keyup.enter="handlePasswordConfirm"
      />
      <div class="mt-2 text-gray-500 text-sm">
        <template v-if="actionType === 'upgrade'">
          升级将提升猫咪等级，消耗经验值
        </template>
        <template v-else-if="actionType === 'mint'">
          铸造猫咪将从您的钱包中扣除 <span class="font-bold text-red-500">1.0000 DFS</span>
        </template>
        <template v-else-if="actionType === 'feed'">
          喂养猫咪将从您的钱包中扣除 <span class="font-bold text-red-500">0.0100 DFS</span>
        </template>
        <template v-else>
          检查活动可能会发现新的经验或属性增长
        </template>
      </div>
    </a-modal>

    <!-- 解锁钱包对话框 -->
    <WalletUnlockModal
      v-model:visible="walletUI.modals.unlockWallet"
      @unlock="walletUI.handleUnlockWallet"
    />
  </div>
</template>

<style scoped>
.cat-list {
  max-height: 450px;
  overflow-y: auto;
  padding-right: 5px;
}

/* 猫咪动画效果 */
@keyframes breathe {
  0% { transform: scale(1); }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); }
}

@keyframes tailWag {
  0% { transform: translateX(0) rotate(0deg); }
  25% { transform: translateX(2px) rotate(3deg); }
  75% { transform: translateX(-2px) rotate(-3deg); }
  100% { transform: translateX(0) rotate(0deg); }
}

@keyframes blinkEyes {
  0% { transform: scaleY(1); }
  5% { transform: scaleY(0.8); }
  10% { transform: scaleY(1); }
  100% { transform: scaleY(1); }
}

/* 点击猫咪时的动画 */
@keyframes patReaction {
  0% { transform: scale(1); }
  30% { transform: scale(0.95); }
  60% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.cat-illustration svg {
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.cat-illustration svg:hover {
  transform: scale(1.05);
}

.cat-illustration .cat-body {
  animation: breathe 4s infinite ease-in-out;
}

.cat-illustration .cat-tail {
  animation: tailWag 3s infinite ease-in-out;
  transform-origin: 40px 90px;
}

.cat-illustration .cat-eyes {
  animation: blinkEyes 7s infinite;
}

.cat-illustration .cat-whiskers path {
  transition: all 0.3s ease;
}

.cat-illustration svg:hover .cat-whiskers path {
  transform: translateY(1px);
}

.pat-animation {
  animation: patReaction 0.5s ease-in-out;
}

/* 添加词泡提示效果 */
.cat-tooltip {
  position: absolute;
  top: -25px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  z-index: 10;
  white-space: nowrap;
}

.exp-notification {
  position: absolute;
  top: -60px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(255, 255, 255, 0.95);
  color: #1890ff;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 14px;
  z-index: 20;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border: 1px solid #1890ff;
  display: flex;
  align-items: center;
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%, 100% {
    transform: translateX(-50%) translateY(0);
  }
  50% {
    transform: translateX(-50%) translateY(-5px);
  }
}

/* 猫咪毛发特效样式 */
.cat-fur-effect path {
  animation: furWave 3s infinite ease-in-out;
}

@keyframes furWave {
  0% { transform: translateY(0); }
  50% { transform: translateY(-1px); }
  100% { transform: translateY(0); }
}

/* 基因详情样式 */
.gene-details {
  border: 1px solid #f0f0f0;
  transition: all 0.3s ease;
}

.gene-details:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.09);
}

.gene-section {
  border-bottom: 1px dashed #f0f0f0;
  padding-bottom: 12px;
}

.gene-section:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.gene-ability {
  transition: all 0.3s ease;
}

.gene-ability:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 6px rgba(24, 144, 255, 0.2);
}
</style>
