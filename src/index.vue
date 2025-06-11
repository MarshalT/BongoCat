<script setup lang="ts">
import {
  ExperimentOutlined,
  GiftOutlined,
  HeartOutlined,
  LockOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  RocketOutlined,
  TrophyOutlined,
  UnlockOutlined,
  UpCircleOutlined,
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

// 导入钱包组件和工具
import LunchpadView from '@/components/lunchpad/LunchpadView.vue'
import WalletUnlockModal from '@/components/wallet/WalletUnlockModal.vue'
import { useWallet } from '@/composables/wallet/useWallet'
import { useWalletUI } from '@/composables/wallet/useWalletUI'
// 添加解锁组件导入
// 导入猫咪基因处理工具
import {

  getCatAppearanceStyle,
  getCatColorClass,
  getCatGeneDetails,
} from '@/utils/catGeneParser'
// 导入区块链操作工具
import {
  checkCatAction as chainCheckCatAction,
  feedCat as chainFeedCat,
  getCatInteractions as chainGetCatInteractions,
  getUserCats as chainGetUserCats,
  mintCat as chainMintCat,
  upgradeCat as chainUpgradeCat,
  checkCatHasAvailableExp,
  getAllCats,
} from '@/utils/chainOperations'
import { PasswordManager } from '@/utils/PasswordManager'
// 导入Lunchpad组件

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
const showHelpModal = ref(false)
const showRankingModal = ref(false)
const rankingList = ref<CatInfo[]>([])
const rankingLoading = ref(false)
// 添加Lunchpad状态变量
const showLunchpad = ref(false)

// 猫咪互动响应语句数组
const catResponses = [
  '喵~',
  '喵喵~',
  '喵？',
  '喵！',
  '喵呜~',
  '咕噜噜~',
  '呼噜噜~',
  '喵哈~',
  '喵嗷~',
  '喵呜喵~',
  '喵~❤',
  '喵喵喵~',
  '链上交互能快速获得经验', 
  '嗷呜~',
  '喵...（打哈欠）',
  '喵！（惊讶）',
  '喵~（满足）',
  '咪~',
  '喵~（撒娇）',
  '喵？（疑惑）',
  '喵！（兴奋）',
  '喵呜~（伸懒腰）',
  '喵喵？（好奇）',
  '喵~（蹭蹭）',
  '喵！（要吃饭）',
  '咕噜咕噜~（开心）',
  '喵嗷！（警觉）',
  '喵喵喵！（急切）',
  '喵~（晒太阳）',
  '喵哼~（不满）',
  '喵嘶~（生气）',
  '喵呜...（委屈）',
  '喵喵~（玩耍）',
  '喵~（想睡觉）',
  '喵喵！（发现宝藏）',
  '购买NFT可以提高经验获取',
  '喵~（摇尾巴）',
  '喵？（闻到食物）',
  '喵呜~（求抚摸）',
  '喵嗷~（高兴跳跃）',
  '猫咪等级越高，获得的奖励越多',
  '喵~（优雅走路）',
  '喵喵！（捉到老鼠）',
  '喵呼~（迷迷糊糊）'
]

// 计算属性
const isWalletConnected = computed(() => walletUI.isWalletConnected.value)
const isWalletLocked = computed(() => walletUI.isWalletLocked.value)
const accountName = computed(() => walletUI.walletAddress.value || '')

// 生成基于基因的猫咪颜色CSS类
function getCatColor(genes: number) {
  return getCatColorClass(genes)
}

// 格式化时间戳
function formatTime(timestamp: number) {
  if (!timestamp) return '未知'
  const date = new Date(timestamp * 1000)
  return date.toLocaleString()
}

// 格式化ISO格式的时间字符串，转换为+8时区
function formatISOTime(timeStr: string) {
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
      hour12: false,
    })
  } catch (e) {
    console.error('时间格式化错误:', e)
    return timeStr
  }
}

// 计算距离上次检查的时间（小时）
function getHoursSinceLastCheck(timestamp: number) {
  if (!timestamp) return '从未检查'
  const now = Math.floor(Date.now() / 1000)
  const hours = Math.floor((now - timestamp) / 3600)
  return `${hours}`
}

// 计算指定等级所需的总经验值
function xpForLevel(level: number) {
  // 使用二次方程式: xp = 100 * (level^2) + 500 * level
  return 100 * level * level + 500 * level
}

// 计算经验进度百分比
function getExpProgressPercent(exp: number, level: number) {
  // 下一等级所需总经验
  const nextLevelExp = xpForLevel(level)
  // 当前已获得的总经验
  const currentExp = exp || 0

  // 计算进度百分比，确保在0-100之间
  return Math.min(Math.max(Math.floor((currentExp / nextLevelExp) * 100), 0), 100)
}

// 获取经验显示文本
function getExpDisplayText(exp: number, level: number) {
  // 下一等级所需总经验
  const nextLevelExp = xpForLevel(level)
  // 当前已获得的总经验
  const currentExp = exp || 0

  return `${currentExp}/${nextLevelExp}`
}

// 判断猫咪是否可升级
function canUpgrade(exp: number, level: number) {
  const nextLevelExp = xpForLevel(level)
  return exp >= nextLevelExp
}

// 判断猫咪体力是否已满
function isStaminaFull(stamina: number) {
  // 体力上限为10000（显示为100.00）
  return stamina >= 10000
}

// 在errorMessage赋值时添加自动关闭计时器的函数
function showErrorWithTimeout(message: any, timeout: number = 3000): void {
  errorMessage.value = typeof message === 'string' ? message : String(message)
  setTimeout(() => {
    errorMessage.value = ''
  }, timeout)
}

// 获取用户的猫咪列表
async function fetchUserCats() {
  if (!wallet) {
    console.error('钱包未连接或初始化失败')
    showErrorWithTimeout('钱包未连接，请先连接钱包')
    return
  }

  loading.value = true
  catsLoading.value = true

  try {
    catsList.value = await chainGetUserCats(
      wallet,
      accountName.value,
      (message, data) => walletUI.addDebugLog(message, data),
    )

    if (catsList.value.length > 0 && !selectedCatId.value) {
      // 默认选择第一只猫
      selectedCatId.value = catsList.value[0].id
      // 获取该猫的互动记录
      await fetchCatInteractions(selectedCatId.value)
    } else if (catsList.value.length === 0) {
      message.info('您还没有猫咪，请先获取一只猫咪')
    }
  } catch (error: any) {
    const errMsg = JSON.stringify(error)
    showErrorWithTimeout(`获取猫咪失败: ${errMsg}`)
  } finally {
    loading.value = false
    catsLoading.value = false
  }
}

// 获取猫咪的互动记录
async function fetchCatInteractions(catId: number) {
  if (!wallet) {
    console.error('钱包未连接或初始化失败')
    message.error('钱包未连接，请先连接钱包')
    return
  }

  interactionsLoading.value = true

  try {
    interactions.value = await chainGetCatInteractions(
      wallet,
      catId,
      (message, data) => walletUI.addDebugLog(message, data),
    )
  } catch (error: any) {
    const errMsg = JSON.stringify(error)
    showErrorWithTimeout(`获取互动记录失败: ${errMsg}`)
  } finally {
    interactionsLoading.value = false
  }
}

// 定时检查是否有可获取的经验
function startCheckingForExp() {
  // 清除之前的定时器
  if (checkInterval.value) {
    clearInterval(checkInterval.value)
  }

  // 设置新的定时器，每分钟检查一次
  checkInterval.value = window.setInterval(async () => {
    try {
      if (
        !isWalletConnected.value
        || isWalletLocked.value
        || !selectedCatId.value
        || !wallet
      ) {
        hasAvailableExp.value = false
        return
      }

      const selectedCat = catsList.value.find(cat => cat.id === selectedCatId.value)
      if (!selectedCat) {
        hasAvailableExp.value = false
        return
      }

      // 检查是否有可获取的经验
      hasAvailableExp.value = await checkCatHasAvailableExp(
        wallet,
        accountName.value,
        selectedCatId.value,
        selectedCat.last_external_check,
        (message, data) => walletUI.addDebugLog(message, data),
      )

      console.log('检查经验结果:', hasAvailableExp.value)
    } catch (error) {
      console.error('检查可获取经验出错:', error)
      hasAvailableExp.value = false
    }
  }, 10 * 1000) // 60000毫秒 = 1分钟

  // 立即执行一次检查
  setTimeout(async () => {
    try {
      if (
        isWalletConnected.value
        && !isWalletLocked.value
        && selectedCatId.value
        && wallet
      ) {
        const selectedCat = catsList.value.find(cat => cat.id === selectedCatId.value)
        if (selectedCat) {
          hasAvailableExp.value = await checkCatHasAvailableExp(
            wallet,
            accountName.value,
            selectedCatId.value,
            selectedCat.last_external_check,
            (message, data) => walletUI.addDebugLog(message, data),
          )
          walletUI.addDebugLog(`初始检查经验结果: ${hasAvailableExp.value}`)
        }
      }
    } catch (error) {
      console.error('初始检查可获取经验出错:', error)
      walletUI.addDebugLog('初始检查可获取经验出错:', error)
    }
  }, 1000)
}

// 组件卸载时清除定时器
onUnmounted(() => {
  if (checkInterval.value) {
    clearInterval(checkInterval.value)
    checkInterval.value = null
  }
})

// 监听钱包解锁事件
watch(() => walletUI.isWalletLocked.value, async (newValue, oldValue) => {
  // 当钱包从锁定状态变为解锁状态时
  if (oldValue === true && newValue === false) {
    console.log('钱包已解锁，正在刷新猫咪数据...')
    await fetchUserCats()
    // 开始检查经验
    startCheckingForExp()
  }
})

// 选择猫咪
function selectCat(catId: number) {
  selectedCatId.value = catId
  fetchCatInteractions(catId)

  // 重新开始检查经验
  startCheckingForExp()
}

// 执行合约操作前的检查
function prepareAction(type: 'upgrade' | 'checkaction' | 'mint' | 'feed') {
  if (!isWalletConnected.value) {
    showErrorWithTimeout('请先连接钱包')
    return false
  }

  if (isWalletLocked.value) {
    message.warning('钱包已锁定，请先解锁', 5)
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
async function mintCat() {
  if (!prepareAction('mint')) return
}

// 升级猫咪
async function upgradeCat() {
  if (!prepareAction('upgrade')) return
}

// 执行检查操作
async function checkCatAction() {
  if (!prepareAction('checkaction')) return
}

// 喂养猫咪
async function feedCat() {
  if (!prepareAction('feed')) return
}

// 处理密码对话框取消
function handlePasswordCancel() {
  password.value = ''
  actionType.value = null
}

// 处理密码输入确认
async function handlePasswordConfirm() {
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

    let result
    walletUI.addDebugLog(`准备执行${actionType.value}操作`)

    // 根据不同操作类型执行相应的链上操作
    switch (actionType.value) {
      case 'mint':
        result = await chainMintCat(
          wallet,
          accountName.value,
          (message, data) => walletUI.addDebugLog(message, data),
        )
        break
      case 'feed':
        if (!selectedCatId.value) throw new Error('未选择猫咪')
        result = await chainFeedCat(
          wallet,
          accountName.value,
          selectedCatId.value,
          (message, data) => walletUI.addDebugLog(message, data),
        )
        break
      case 'upgrade':
        if (!selectedCatId.value) throw new Error('未选择猫咪')
        result = await chainUpgradeCat(
          wallet,
          accountName.value,
          selectedCatId.value,
          (message, data) => walletUI.addDebugLog(message, data),
        )
        break
      case 'checkaction':
        if (!selectedCatId.value) throw new Error('未选择猫咪')
        result = await chainCheckCatAction(
          wallet,
          accountName.value,
          selectedCatId.value,
          (message, data) => walletUI.addDebugLog(message, data),
        )
        break
    }

    // 关闭密码对话框
    showPasswordModal.value = false
    password.value = ''

    // 延时500ms
    await new Promise(resolve => setTimeout(resolve, 500))

    // 刷新猫咪数据
    await fetchUserCats()
    if (selectedCatId.value) {
      await fetchCatInteractions(selectedCatId.value)
    }

    // 刷新钱包余额和交易记录
    if (actionType.value === 'mint' || actionType.value === 'feed') {
      try {
        // 刷新钱包余额
        await walletUI.refreshWalletBalance()

        // 从本地存储重新加载交易记录
        const storedTx = localStorage.getItem('bongo-cat-transactions')
        if (storedTx) {
          wallet.transactions.value = JSON.parse(storedTx)
          walletUI.addDebugLog('已更新钱包交易记录')
        }
      } catch (refreshErr) {
        walletUI.addDebugLog('刷新钱包数据失败', refreshErr)
      }
    }

    // 重置经验检查状态
    hasAvailableExp.value = false
  } catch (err) {
    const errMsg = JSON.stringify(err)
    walletUI.addDebugLog(`执行${actionType.value}操作失败 ${errMsg}`)
    message.error(`操作失败: ${errMsg}`)
    password.value = ''
  } finally {
    loading.value = false
  }
}

// 刷新数据
async function refreshData() {
  await fetchUserCats()
  if (selectedCatId.value) {
    await fetchCatInteractions(selectedCatId.value)
  }
}

// 获取排行榜数据
async function fetchRankingData() {
  if (!wallet) {
    console.error('钱包未连接或初始化失败')
    showErrorWithTimeout('钱包未连接，请先连接钱包')
    return
  }

  rankingLoading.value = true
  showRankingModal.value = true

  try {
    rankingList.value = await getAllCats(
      wallet,
      50, // 最多显示50只猫咪
      (message, data) => walletUI.addDebugLog(message, data),
    )

    walletUI.addDebugLog(`获取到${rankingList.value.length}只猫咪排行数据`)
  } catch (error: any) {
    const errMsg = JSON.stringify(error)
    showErrorWithTimeout(`获取排行榜数据失败: ${errMsg}`)
  } finally {
    rankingLoading.value = false
  }
}

// 格式化体力值显示（将100-10000的值转换为1.00-100.00）
function formatStamina(stamina: number): number {
  if (!stamina && stamina !== 0) return 0
  return stamina / 100
}

// 获取体力值百分比（用于进度条）
function getStaminaPercent(stamina: number): number {
  if (!stamina && stamina !== 0) return 0
  // 确保百分比不超过100%
  return Math.min(100, formatStamina(stamina))
}

// 判断体力值颜色
function getStaminaColor(stamina: number): string {
  // 50%体力对应的原始值是5000
  return (stamina >= 5000) ? '#52c41a' : '#faad14'
}

// 添加猫咪拍打互动函数
function patCat() {
  if (isPatting.value) return

  isPatting.value = true

  // 随机选择一个猫咪响应语句
  const randomResponse = catResponses[Math.floor(Math.random() * catResponses.length)]

  // 使用自定义样式显示消息
  message.success({
    content: randomResponse,
    duration: 2,
    style: {
      fontSize: '16px',
      marginTop: '20px',
    },
  })

  // 1.5秒后重置状态，与动画时长匹配
  setTimeout(() => {
    isPatting.value = false
  }, 1500)
}

// 计算猫咪详情
const getSelectedCatGeneDetails = computed(() => {
  if (!selectedCatId.value || !catsList.value.length) return null

  const selectedCat = catsList.value.find(cat => cat.id === selectedCatId.value)
  if (!selectedCat) return null

  const geneValue = selectedCat.genes || 0
  return getCatGeneDetails(geneValue)
})

// 获取猫咪外观样式
const getCatAppearance = computed(() => {
  if (!selectedCatId.value || !catsList.value.length) return null

  const selectedCat = catsList.value.find(cat => cat.id === selectedCatId.value)
  if (!selectedCat) return null

  const geneValue = selectedCat.genes || 0
  return getCatAppearanceStyle(geneValue)
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
    const errMsg = JSON.stringify(err)
    showErrorWithTimeout(`初始化猫咪数据失败: ${errMsg}`)
    walletUI.addDebugLog('钱包组件挂载时出错', err)
  }
})

// 打开Lunchpad
function openLunchpad() {
  showLunchpad.value = true
}
</script>

<template>
  <div class="cat-planet p-4">
    <div class="mb-4 flex items-center justify-between">
      <div
        class="flex items-center"
        style="display: flex; align-items: center;"
      >
        <span
          class="text-xl font-bold"
          style="display: inline-block;"
        >喵星球</span>
        <span
          class="question-icon"
          style="display: inline-flex; cursor: pointer; margin-left: 4px; color: #1890ff;"
          @click="showHelpModal = true"
        >
          <QuestionCircleOutlined />
        </span>
      </div>
      <div class="flex gap-2">
        <a-button
          :loading="loading"
          @click="refreshData"
        >
          <ReloadOutlined /> 刷新数据
        </a-button>
        <a-button
          :loading="rankingLoading"
          @click="openLunchpad"
        >
          <RocketOutlined /> Lunchpad
        </a-button>
        <a-button
          :loading="rankingLoading"
          @click="fetchRankingData"
        >
          <TrophyOutlined /> 排行榜
        </a-button>
        <a-button
          v-if="isWalletLocked"
          type="primary"
          @click="walletUI.showUnlockDialog"
        >
          <UnlockOutlined /> 解锁钱包
        </a-button>
        <a-button
          v-else
          @click="walletUI.handleLockWallet"
        >
          <LockOutlined /> 锁定钱包
        </a-button>
      </div>
    </div>

    <!-- 钱包连接状态 -->
    <a-alert
      v-if="!isWalletConnected"
      class="mb-4"
      description="在钱包页面连接或创建钱包以管理您的猫咪。"
      message="请先连接钱包"
      show-icon
      type="warning"
    />

    <a-alert
      v-else-if="isWalletLocked"
      class="mb-4"
      description="请解锁钱包以管理您的猫咪。"
      message="钱包已锁定"
      show-icon
      type="warning"
    />

    <a-alert
      v-if="errorMessage"
      class="mb-4"

      closable
      :message="errorMessage"
      show-icon
      type="error"
      @close="errorMessage = ''"
    />

    <!-- 内容区 -->
    <a-row :gutter="16">
      <!-- 左侧猫咪列表 -->
      <a-col :span="10">
        <a-card
          :loading="loading"
          title="我的猫咪"
        >
          <template #extra>
            <a-button
              v-if="catsList.length === 0"
              :disabled="!isWalletConnected || isWalletLocked"
              type="primary"
              @click="mintCat"
            >
              <PlusOutlined /> 铸造猫咪
            </a-button>
          </template>

          <!-- 猫咪列表 -->
          <div
            v-if="!isWalletConnected || isWalletLocked"
            class="p-4 text-center"
          >
            <p>请先连接并解锁钱包</p>
          </div>

          <a-empty
            v-else-if="catsList.length === 0"
            description="暂无猫咪"
          />

          <div
            v-else
            class="cat-list space-y-2"
          >
            <div
              v-for="cat in catsList"
              :key="cat.id"
              class="mb-2 cursor-pointer transition-all"
              @click="selectCat(cat.id)"
            >
              <div
                class="cat-info-card"
                :class="{ 'cat-info-card-selected': selectedCatId === cat.id }"
              >
                <div class="flex items-center">
                  <div class="cat-badge mr-3">
                    <div class="cat-id-badge">
                      <span class="cat-id-number">#{{ cat.id }}</span>
                    </div>
                  </div>
                  <div class="flex-1">
                    <div class="mb-1 font-medium">
                      Lv.{{ cat.level }}
                    </div>
                    <div class="flex justify-between text-xs">
                      <span>体力:</span>
                      <span class="ml-1">{{ formatStamina(cat.stamina).toFixed(2) }}/100</span>
                    </div>
                    <div class="flex justify-between text-xs">
                      <span>经验:</span>
                      <span class="ml-1">{{ cat.experience }}/{{ xpForLevel(cat.level) }}</span>
                    </div>
                    <!-- <div class="text-xs text-gray-500">
                      {{ getHoursSinceLastCheck(cat.last_external_check) }}小时前
                    </div> -->
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 猫咪图形区域 -->
          <div
            v-if="catsList.length > 0"
            class="cat-illustration mt-4 flex items-center justify-center border rounded-lg p-4"
            style="min-height: 200px;"
          >
            <div class="relative">
              <div
                v-show="isHovering"
                class="cat-tooltip"
              >
                摸摸我
              </div>
              <div
                v-if="hasAvailableExp"
                class="exp-notification"
              >
                <GiftOutlined class="mr-1" /> 有经验可以获取!
                <a-button
                  class="ml-2"
                  size="small"
                  type="primary"
                  @click="checkCatAction"
                >
                  点击领取
                </a-button>
              </div>
              <svg
                :class="{ 'pat-animation': isPatting }"
                height="140"
                viewBox="0 0 180 140"
                width="180"
                xmlns="http://www.w3.org/2000/svg"
                @click="patCat"
                @mouseenter="isHovering = true"
                @mouseleave="isHovering = false"
              >
                <!-- 渐变定义 -->
                <defs>
                  <linearGradient
                    id="cat-body-gradient"
                    x1="0%"
                    x2="100%"
                    y1="0%"
                    y2="100%"
                  >
                    <stop
                      offset="0%"
                      :style="`stop-color:${getCatAppearance?.colors.body1 || '#ffb84d'};stop-opacity:1`"
                    />
                    <stop
                      offset="100%"
                      :style="`stop-color:${getCatAppearance?.colors.body2 || '#e67700'};stop-opacity:1`"
                    />
                  </linearGradient>

                  <linearGradient
                    id="cat-head-gradient"
                    x1="0%"
                    x2="100%"
                    y1="0%"
                    y2="100%"
                  >
                    <stop
                      offset="0%"
                      :style="`stop-color:${getCatAppearance?.colors.body1 || '#ffb84d'};stop-opacity:1`"
                    />
                    <stop
                      offset="100%"
                      :style="`stop-color:${getCatAppearance?.colors.body2 || '#e67700'};stop-opacity:1`"
                    />
                  </linearGradient>

                  <!-- 花纹渐变 -->
                  <pattern
                    v-if="getCatAppearance?.pattern.hasPattern"
                    id="cat-pattern"
                    height="20"
                    patternUnits="userSpaceOnUse"
                    width="20"
                  >
                    <rect
                      fill="none"
                      height="20"
                      width="20"
                    />
                    <g v-if="getCatAppearance?.pattern.type === 1"> <!-- 虎斑 -->
                      <path
                        d="M0,0 L20,20"
                        stroke="rgba(0,0,0,0.2)"
                        stroke-width="4"
                      />
                      <path
                        d="M20,0 L0,20"
                        stroke="rgba(0,0,0,0.2)"
                        stroke-width="4"
                      />
                    </g>
                    <g v-else-if="getCatAppearance?.pattern.type === 2"> <!-- 斑点 -->
                      <circle
                        cx="5"
                        cy="5"
                        fill="rgba(0,0,0,0.2)"
                        r="3"
                      />
                      <circle
                        cx="15"
                        cy="15"
                        fill="rgba(0,0,0,0.2)"
                        r="3"
                      />
                    </g>
                    <g v-else-if="getCatAppearance?.pattern.type === 3"> <!-- 双色 -->
                      <rect
                        fill="rgba(0,0,0,0.15)"
                        height="20"
                        width="10"
                        x="0"
                        y="0"
                      />
                    </g>
                  </pattern>
                </defs>

                <!-- 猫咪身体 - 更圆润的形状 -->
                <ellipse
                  class="cat-body"
                  cx="90"
                  cy="95"
                  :fill="getCatAppearance?.pattern.hasPattern ? 'url(#cat-pattern)' : 'url(#cat-body-gradient)'"
                  rx="55"
                  ry="40"
                  :stroke="getCatAppearance?.colors.stroke || '#e09112'"
                  :stroke-width="getCatAppearance?.fur.strokeWidth || 2"
                />

                <!-- 猫咪头部 - 更精致的形状 -->
                <circle
                  class="cat-body"
                  cx="90"
                  cy="60"
                  :fill="getCatAppearance?.pattern.hasPattern ? 'url(#cat-pattern)' : 'url(#cat-head-gradient)'"
                  r="38"
                  :stroke="getCatAppearance?.colors.stroke || '#e09112'"
                  :stroke-width="getCatAppearance?.fur.strokeWidth || 2"
                />

                <!-- 尾巴 -->
                <path
                  class="cat-tail"
                  d="M30,90 Q35,60 45,80 Q55,95 40,105"
                  :fill="getCatAppearance?.pattern.hasPattern ? 'url(#cat-pattern)' : 'url(#cat-body-gradient)'"
                  :stroke="getCatAppearance?.colors.stroke || '#e09112'"
                  stroke-linecap="round"
                  :stroke-width="getCatAppearance?.fur.strokeWidth || 2"
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
                  :fill="getCatAppearance?.colors.ear || '#ffb380'"
                  opacity="0.6"
                  rx="12"
                  ry="10"
                />
                <ellipse
                  class="cat-body"
                  cx="115"
                  cy="70"
                  :fill="getCatAppearance?.colors.ear || '#ffb380'"
                  opacity="0.6"
                  rx="12"
                  ry="10"
                />

                <!-- 眼睛 - 更大更有神 -->
                <g class="cat-eyes">
                  <ellipse
                    cx="75"
                    cy="55"
                    fill="white"
                    rx="9"
                    ry="11"
                    stroke="#333"
                    stroke-width="1.5"
                  />
                  <ellipse
                    cx="105"
                    cy="55"
                    fill="white"
                    rx="9"
                    ry="11"
                    stroke="#333"
                    stroke-width="1.5"
                  />

                  <!-- 眼睛高光 -->
                  <circle
                    cx="73"
                    cy="51"
                    fill="white"
                    r="3"
                  />
                  <circle
                    cx="103"
                    cy="51"
                    fill="white"
                    r="3"
                  />

                  <!-- 瞳孔 - 猫眼竖瞳 -->
                  <ellipse
                    cx="75"
                    cy="55"
                    :fill="getCatAppearance?.eyes.leftColor || '#333'"
                    rx="4"
                    ry="8"
                  />
                  <ellipse
                    cx="105"
                    cy="55"
                    :fill="getCatAppearance?.eyes.rightColor || '#333'"
                    rx="4"
                    ry="8"
                  />
                </g>

                <!-- 鼻子 - 更精致 -->
                <path
                  class="cat-body"
                  d="M87,65 Q90,67 93,65 L93,68 Q90,70 87,68 Z"
                  fill="#ff9999"
                  stroke="#d67979"
                  stroke-width="0.5"
                />

                <!-- 嘴 - 更自然的微笑 -->
                <path
                  class="cat-body"
                  d="M85,72 Q90,77 95,72"
                  fill="none"
                  stroke="#333"
                  stroke-width="1.5"
                />
                <path
                  class="cat-body"
                  d="M90,68 L90,72"
                  fill="none"
                  stroke="#333"
                  stroke-width="1"
                />

                <!-- 胡须 - 更自然的曲线 -->
                <g class="cat-whiskers">
                  <path
                    d="M65,70 Q72,71 78,70"
                    fill="none"
                    stroke="#333"
                    stroke-width="1"
                  />
                  <path
                    d="M65,75 Q73,75 80,74"
                    fill="none"
                    stroke="#333"
                    stroke-width="1"
                  />
                  <path
                    d="M65,80 Q72,79 78,78"
                    fill="none"
                    stroke="#333"
                    stroke-width="1"
                  />

                  <path
                    d="M115,70 Q108,71 102,70"
                    fill="none"
                    stroke="#333"
                    stroke-width="1"
                  />
                  <path
                    d="M115,75 Q107,75 100,74"
                    fill="none"
                    stroke="#333"
                    stroke-width="1"
                  />
                  <path
                    d="M115,80 Q108,79 102,78"
                    fill="none"
                    stroke="#333"
                    stroke-width="1"
                  />
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
                <path
                  class="cat-body"
                  d="M65,123 L67,119"
                  :stroke="getCatAppearance?.colors.stroke || '#e09112'"
                  stroke-width="1.5"
                />
                <path
                  class="cat-body"
                  d="M68,123 L69,119"
                  :stroke="getCatAppearance?.colors.stroke || '#e09112'"
                  stroke-width="1.5"
                />
                <path
                  class="cat-body"
                  d="M115,123 L113,119"
                  :stroke="getCatAppearance?.colors.stroke || '#e09112'"
                  stroke-width="1.5"
                />
                <path
                  class="cat-body"
                  d="M112,123 L111,119"
                  :stroke="getCatAppearance?.colors.stroke || '#e09112'"
                  stroke-width="1.5"
                />

                <!-- 毛发特效 -->
                <g
                  v-if="getCatAppearance?.fur.type === 'long'"
                  class="cat-fur-effect"
                >
                  <path
                    d="M65,40 Q60,35 58,30"
                    fill="none"
                    :stroke="getCatAppearance?.colors.stroke || '#e09112'"
                    stroke-width="1"
                  />
                  <path
                    d="M115,40 Q120,35 122,30"
                    fill="none"
                    :stroke="getCatAppearance?.colors.stroke || '#e09112'"
                    stroke-width="1"
                  />
                  <path
                    d="M50,90 Q45,85 40,83"
                    fill="none"
                    :stroke="getCatAppearance?.colors.stroke || '#e09112'"
                    stroke-width="1"
                  />
                  <path
                    d="M130,90 Q135,85 140,83"
                    fill="none"
                    :stroke="getCatAppearance?.colors.stroke || '#e09112'"
                    stroke-width="1"
                  />
                </g>
                <g
                  v-if="getCatAppearance?.fur.type === 'curly'"
                  class="cat-fur-effect"
                >
                  <path
                    d="M65,40 Q60,38 62,32 Q64,30 66,32"
                    fill="none"
                    :stroke="getCatAppearance?.colors.stroke || '#e09112'"
                    stroke-width="1"
                  />
                  <path
                    d="M115,40 Q120,38 118,32 Q116,30 114,32"
                    fill="none"
                    :stroke="getCatAppearance?.colors.stroke || '#e09112'"
                    stroke-width="1"
                  />
                  <path
                    d="M50,90 Q45,88 47,83 Q49,80 51,82"
                    fill="none"
                    :stroke="getCatAppearance?.colors.stroke || '#e09112'"
                    stroke-width="1"
                  />
                  <path
                    d="M130,90 Q135,88 133,83 Q131,80 129,82"
                    fill="none"
                    :stroke="getCatAppearance?.colors.stroke || '#e09112'"
                    stroke-width="1"
                  />
                </g>
              </svg>
            </div>
          </div>
        </a-card>
      </a-col>

      <!-- 右侧猫咪详情 -->
      <a-col :span="14">
        <a-card
          :loading="loading"
          title="猫咪详情"
        >
          <div
            v-if="!isWalletConnected || isWalletLocked"
            class="p-4 text-center"
          >
            <p>请先连接并解锁钱包</p>
          </div>

          <div
            v-else-if="!selectedCatId"
            class="p-4 text-center"
          >
            <p>请选择一只猫咪查看详情</p>
          </div>

          <div v-else>
            <!-- 猫咪信息 -->
            <div class="cat-info mb-4">
              <div v-if="selectedCatId && catsList.length > 0">
                <div class="mb-4 flex items-start justify-between">
                  <div class="flex items-center gap-2">
                    <div
                      class="size-16 flex items-center justify-center rounded-full bg-yellow-500 text-xl text-white font-bold"
                      style="position: relative; box-shadow: 0 2px 6px rgba(0,0,0,0.25); border: 2px solid rgba(255,255,255,0.5); aspect-ratio: 1/1;"
                    >
                      <div class="cat-id-badge-large">
                        <span class="cat-id-number-large">#{{ selectedCatId }}</span>
                      </div>
                    </div>
  <div>
                      <!-- <h3 class="text-lg font-medium">猫咪 #{{ selectedCatId }}</h3> -->
                      <h3 class="text-lg font-medium">
                        猫咪 #{{ selectedCatId }}
                      </h3>
                      <p class="text-sm text-gray-500">
                        出生于 {{ formatTime(catsList.find(c => c.id === selectedCatId)?.birth_time || 0) }}
                      </p>
  </div>
                  </div>

                  <a-button
                    class="flex items-center justify-center gap-1"
                    type="dashed"
                    @click="checkCatAction"
                  >
                    <ExperimentOutlined /> 检查
                  </a-button>
                </div>

                <!-- 属性信息 -->
                <div class="attributes mb-4 rounded-lg bg-gray-50 p-4">
                  <div class="grid grid-cols-1 gap-5">
                    <div>
                      <div class="mb-1 text-sm text-gray-500">
                        等级
                      </div>
                      <div class="flex items-center">
                        <div class="mr-2 text-2xl font-medium">
                          {{ catsList.find(c => c.id === selectedCatId)?.level || 0 }}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div class="mb-1 flex justify-between text-sm text-gray-500">
                        <span>经验</span>
                      </div>
                      <div class="flex flex-col">
                        <div
                          class="relative w-full"
                          style="height: 24px;"
                        >
                          <a-progress
                            :format="() => ''"
                            :percent="getExpProgressPercent(
                              catsList.find(c => c.id === selectedCatId)?.experience || 0,
                              catsList.find(c => c.id === selectedCatId)?.level || 1,
                            )"
                            stroke-color="#1890ff"
                            :stroke-width="24"
                          />
                          <div
                            class="absolute inset-0 flex items-center justify-center text-xs font-medium"
                            style="line-height: 1;"
                          >
                            {{ getExpDisplayText(
                              catsList.find(c => c.id === selectedCatId)?.experience || 0,
                              catsList.find(c => c.id === selectedCatId)?.level || 1,
                            ) }} 经验
                          </div>
                          <a-button
                            class="absolute flex items-center justify-center"
                            :disabled="!canUpgrade(
                              catsList.find(c => c.id === selectedCatId)?.experience || 0,
                              catsList.find(c => c.id === selectedCatId)?.level || 1,
                            )"
                            shape="circle"
                            size="small"
                            style="top: 0; margin-top: 0; right: -4px; z-index: 10; transform: translateY(0);"
                            type="primary"
                            @click="upgradeCat"
                          >
                            <UpCircleOutlined />
                          </a-button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div class="mb-1 flex justify-between text-sm text-gray-500">
                        <span>体力</span>
                      </div>
                      <div class="flex flex-col">
                        <div
                          class="relative w-full"
                          style="height: 24px;"
                        >
                          <a-progress
                            :format="() => ''"
                            :percent="getStaminaPercent(catsList.find(c => c.id === selectedCatId)?.stamina || 0)"
                            :stroke-color="getStaminaColor(catsList.find(c => c.id === selectedCatId)?.stamina || 0)"
                            :stroke-width="24"
                          />
                          <div
                            class="absolute inset-0 flex items-center justify-center text-xs font-medium"
                            style="line-height: 1;"
                          >
                            {{ formatStamina(catsList.find(c => c.id === selectedCatId)?.stamina || 0).toFixed(2) }}/100 体力
                          </div>
                          <a-button
                            class="absolute flex items-center justify-center"
                            danger
                            :disabled="isStaminaFull(catsList.find(c => c.id === selectedCatId)?.stamina || 0)"
                            shape="circle"
                            size="small"
                            style="top: 0; margin-top: 0; right: -4px; z-index: 10; transform: translateY(0);"
                            type="primary"
                            @click="feedCat"
                          >
                            <HeartOutlined />
                          </a-button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 基因详情 -->
                <div
                  v-if="false"
                  class="gene-details mb-4 rounded-lg bg-gray-50 p-4"
                >
                  <h3 class="mb-3 text-lg font-medium">
                    基因详情
                  </h3>

                  <div class="gene-section mb-3">
                    <h4 class="mb-2 text-base font-medium">
                      外观特征
                    </h4>
                    <div class="gene-item mb-1 flex justify-between">
                      <span class="text-sm text-gray-600">基础色系:</span>
                      <span class="text-sm font-medium">{{ getSelectedCatGeneDetails?.baseColor || '未知' }}</span>
                    </div>
                    <div class="gene-item mb-1 flex justify-between">
                      <span class="text-sm text-gray-600">毛发类型:</span>
                      <span class="text-sm font-medium">{{ getSelectedCatGeneDetails?.furLength || '未知' }}</span>
                    </div>
                    <div class="gene-item mb-1 flex justify-between">
                      <span class="text-sm text-gray-600">耳朵形状:</span>
                      <span class="text-sm font-medium">{{ getSelectedCatGeneDetails?.earShape || '未知' }}</span>
                    </div>
                    <div class="gene-item mb-1 flex justify-between">
                      <span class="text-sm text-gray-600">眼睛颜色:</span>
                      <span class="text-sm font-medium">{{ getSelectedCatGeneDetails?.eyeColor || '未知' }}</span>
                    </div>
                    <div class="gene-item mb-1 flex justify-between">
                      <span class="text-sm text-gray-600">特殊花纹:</span>
                      <span class="text-sm font-medium">{{ getSelectedCatGeneDetails?.pattern || '未知' }}</span>
                    </div>
                  </div>

                  <div class="gene-section mb-3">
                    <h4 class="mb-2 text-base font-medium">
                      性格与能力
                    </h4>
                    <div class="gene-item mb-1 flex justify-between">
                      <span class="text-sm text-gray-600">性格倾向:</span>
                      <span class="text-sm font-medium">{{ getSelectedCatGeneDetails?.personality || '未知' }}</span>
                    </div>
                    <div class="gene-item mb-1 flex justify-between">
                      <span class="text-sm text-gray-600">稀有度:</span>
                      <span class="text-sm font-medium">{{ getSelectedCatGeneDetails?.rarity || '未知' }}</span>
                    </div>
                    <div class="gene-item mb-1 flex justify-between">
                      <span class="text-sm text-gray-600">成长潜力:</span>
                      <span
                        class="text-sm font-medium"
                        :class="{ 'text-green-600': getSelectedCatGeneDetails?.growthPotential.includes('高') }"
                      >
                        {{ getSelectedCatGeneDetails?.growthPotential || '未知' }}
                      </span>
                    </div>
                    <div class="gene-item mb-1 flex justify-between">
                      <span class="text-sm text-gray-600">体力恢复:</span>
                      <span class="text-sm font-medium">{{ getSelectedCatGeneDetails?.staminaRecovery || '未知' }}</span>
                    </div>
                    <div class="gene-item mb-1 flex justify-between">
                      <span class="text-sm text-gray-600">幸运值:</span>
                      <span class="text-sm font-medium">{{ getSelectedCatGeneDetails?.luck || '未知' }}</span>
                    </div>
                  </div>

                  <div class="gene-section">
                    <h4 class="mb-2 text-base font-medium">
                      特殊能力
                    </h4>
                    <div v-if="getSelectedCatGeneDetails?.specialAbilities.length">
                      <div
                        v-for="(ability, index) in getSelectedCatGeneDetails?.specialAbilities"
                        :key="index"
                        class="gene-ability mb-2 mr-2 inline-block rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
                      >
                        {{ ability }}
                      </div>
                    </div>
                    <div
                      v-else
                      class="text-sm text-gray-500"
                    >
                      暂无特殊能力
                    </div>

                    <div
                      v-if="getSelectedCatGeneDetails?.hiddenTrait"
                      class="mt-2"
                    >
                      <div class="gene-ability inline-block rounded-full bg-purple-100 px-3 py-1 text-sm text-purple-800">
                        隐藏特质：神秘基因
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 互动记录 -->
                <div>
                  <div class="mb-2 flex items-center justify-between">
                    <h4 class="font-medium">
                      互动记录
                    </h4>
                    <a-button
                      :loading="interactionsLoading"
                      size="small"
                      type="primary"
                      @click="fetchCatInteractions(selectedCatId)"
                    >
                      <ReloadOutlined /> 刷新
                    </a-button>
                  </div>

                  <a-empty
                    v-if="interactions.length === 0"
                    description="暂无互动记录"
                  />

                  <a-timeline v-else>
                    <a-timeline-item
                      v-for="interaction in interactions"
                      :key="interaction.id"
                      :color="
                        interaction.action_type === 'upgrade' ? 'green'
                        : interaction.action_type === 'feed' ? 'red'
                          : interaction.action_type === 'addxp' ? 'blue'
                            : interaction.action_type === 'external' ? 'purple'
                              : interaction.action_type === 'ppp' ? 'gold'
                                : 'gray'
                      "
                    >
                      <p>
                        <span class="font-medium">
                          {{
                            interaction.action_type === 'upgrade' ? '升级'
                            : interaction.action_type === 'addxp' ? '获得经验'
                              : interaction.action_type === 'feed' ? '喂养'
                                : interaction.action_type === 'external' ? '外部检查'
                                  : interaction.action_type === 'checkaction' ? '检查活动'
                                    : interaction.action_type === 'ppp' ? 'PPP交易奖励'
                                      : interaction.action_type
                          }}
                        </span>
                        <span
                          v-if="interaction.attribute_change"
                          class="ml-1 text-green-500"
                        >
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
      cancel-text="取消"
      :confirm-loading="loading"
      ok-text="确定"
      :title="actionType === 'upgrade' ? '升级猫咪' : actionType === 'mint' ? '铸造猫咪' : actionType === 'feed' ? '喂养猫咪' : '检查活动'"
      @cancel="handlePasswordCancel"
      @ok="handlePasswordConfirm"
    >
      <p>请输入钱包密码以确认操作</p>
      <a-input-password
        v-model:value="password"
        class="mt-4"
        placeholder="输入钱包密码"
        @keyup.enter="handlePasswordConfirm"
      />
      <div class="mt-2 text-sm text-gray-500">
        <template v-if="actionType === 'upgrade'">
          升级将提升猫咪等级，消耗经验值
</template>
        <template v-else-if="actionType === 'mint'">
          铸造猫咪将从您的钱包中扣除 <span class="text-red-500 font-bold">30.0000 DFS</span>
        </template>
        <template v-else-if="actionType === 'feed'">
          喂养猫咪将从您的钱包中扣除 <span class="text-red-500 font-bold">1.0100 BGFISH</span>
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

    <!-- 玩法介绍弹窗 -->
    <a-modal
      v-model:visible="showHelpModal"
      :footer="null"
      :mask-closable="true"
      title="喵星球玩法介绍"
      width="600px"
    >
      <div class="help-content">
        <h3 class="mb-4 text-lg font-medium">
          欢迎来到喵星球！
        </h3>

        <div class="mb-4">
          <h4 class="mb-2 font-medium">
            基本概念
          </h4>
          <p>喵星球是一个基于区块链的猫咪养成游戏。每只猫咪都有独特的基因、等级、经验和体力值。</p>
        </div>

        <div class="mb-4">
          <h4 class="mb-2 font-medium">
            获取猫咪
          </h4>
          <p>您可以通过铸造(Mint)获得您的第一只猫咪，铸造需要消耗 30.0000 DFS。</p>
        </div>

        <div class="mb-4">
          <h4 class="mb-2 font-medium">
            猫咪属性
          </h4>
          <ul class="list-disc pl-5 space-y-1">
            <li><span class="font-medium">等级(Level)</span>：猫咪的当前等级，等级越高，获得的奖励越多。</li>
            <li><span class="font-medium">经验(Experience)</span>：积累足够的经验可以升级猫咪。</li>
            <li><span class="font-medium">体力(Stamina)</span>：体力值影响猫咪的活动能力，最大值为100.00。</li>
          </ul>
        </div>

        <div class="mb-4">
          <h4 class="mb-2 font-medium">
            主要操作
          </h4>
          <ul class="list-disc pl-5 space-y-1">
            <li><span class="font-medium">检查(Check)</span>：检查猫咪是否有可获取的经验或奖励。</li>
            <li><span class="font-medium">升级(Upgrade)</span>：当经验值足够时，可以升级猫咪。</li>
            <li><span class="font-medium">喂养(Feed)</span>：消耗 1.0000 BGFISH 为猫咪恢复体力。</li>
            <li><span class="font-medium">互动(Pat)</span>：点击猫咪图像可以与猫咪互动。</li>
          </ul>
        </div>

        <div class="mb-4">
          <h4 class="mb-2 font-medium">
            获取经验
          </h4>
          <p>猫咪可以通过以下方式获得经验：</p>
          <ul class="list-disc pl-5 space-y-1">
            <li>定期检查（每隔一段时间）</li>
            <li>参与链上活动</li>
            <li>完成特定任务</li>
          </ul>
        </div>

        <div class="mb-4">
          <h4 class="mb-2 font-medium">
            提示
          </h4>
          <ul class="list-disc pl-5 space-y-1">
            <li>当有经验可以获取时，会在猫咪图像上方显示提示。</li>
            <li>升级猫咪可以提高获取奖励的几率。</li>
            <li>保持足够的体力值以确保猫咪能够正常活动。</li>
          </ul>
        </div>

        <div class="mt-6 text-center">
          <a-button
            type="primary"
            @click="showHelpModal = false"
          >
            我知道了
          </a-button>
        </div>
      </div>
    </a-modal>

    <!-- 排行榜弹窗 -->
    <a-modal
      v-model:visible="showRankingModal"
      :footer="null"
      :mask-closable="true"
      title="猫咪排行榜"
      width="900px"
    >
      <div class="ranking-content">
        <a-spin :spinning="rankingLoading">
          <div v-if="rankingList.length > 0">
            <a-table
              :columns="[
                {
                  title: '排名',
                  key: 'rank',
                  width: 80,
                  customRender: ({ index }) => index + 1,
                },
                {
                  title: '猫咪ID',
                  dataIndex: 'id',
                  key: 'id',
                  width: 100,
                },
                {
                  title: '主人',
                  dataIndex: 'owner',
                  key: 'owner',
                  width: 150,
                  ellipsis: true,
                },
                {
                  title: '等级',
                  dataIndex: 'level',
                  key: 'level',
                  width: 80,
                  sorter: (a: CatInfo, b: CatInfo) => a.level - b.level,
                  defaultSortOrder: 'descend',
                },
                {
                  title: '经验',
                  dataIndex: 'experience',
                  key: 'experience',
                  width: 120,
                  sorter: (a: CatInfo, b: CatInfo) => a.experience - b.experience,
                },
                {
                  title: '体力',
                  key: 'stamina',
                  width: 120,
                  customRender: ({ record }: { record: CatInfo }) => `${formatStamina(record.stamina).toFixed(2)}`,
                },
                // {
                //   title: '出生时间',
                //   key: 'birth_time',
                //   customRender: ({ record }) => formatTime(record.birth_time)
                // }
              ]"
              :data-source="rankingList"
              :pagination="{ pageSize: 10 }"
              :row-key="(record: CatInfo) => record.id"
            >
              <template #bodyCell="{ column, record, index }: { column: any; record: CatInfo; index: number }">
                <template v-if="column.key === 'rank'">
                  <div class="flex items-center">
                    <div
                      v-if="index < 3"
                      class="rank-badge mr-2"
                      :class="{
                        'rank-1': index === 0,
                        'rank-2': index === 1,
                        'rank-3': index === 2,
                      }"
                    >
                      {{ index + 1 }}
                    </div>
                    <span v-else>{{ index + 1 }}</span>
                  </div>
                </template>

                <template v-if="column.key === 'owner'">
                  <span :class="{ 'font-bold text-blue-500': record.owner === accountName }">
                    {{ record.owner }}
                  </span>
                </template>
              </template>
            </a-table>
          </div>
          <a-empty
            v-else
            description="暂无排行数据"
          />
        </a-spin>

        <div class="mt-6 text-center">
          <a-button
            type="primary"
            @click="showRankingModal = false"
          >
            关闭
          </a-button>
          <a-button
            class="ml-2"
            :loading="rankingLoading"
            @click="fetchRankingData"
          >
            <ReloadOutlined /> 刷新数据
          </a-button>
        </div>
      </div>
    </a-modal>

    <!-- Lunchpad模态框 -->
    <a-modal
      v-model:visible="showLunchpad"
      class="lunchpad-modal"
      :footer="null"
      :mask-closable="true"
      title="项目列表"
      width="900px"
    >
      <LunchpadView />
    </a-modal>
  </div>
</template>

<style scoped>
.cat-list {
  max-height: 450px;
  overflow-y: auto;
  padding-right: 8px;
}

/* 猫咪信息卡片样式 */
.cat-info-card {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 12px;
  background-color: #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  position: relative;
  overflow: visible;
}

.cat-info-card-selected {
  border: 2px solid #1890ff;
  padding: 11px;
  background-color: #f0f8ff;
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.2);
}

/* 猫咪ID徽章样式 */
.cat-badge {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ffc53d 0%, #fa8c16 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  box-shadow: 0 2px 8px rgba(250, 140, 22, 0.4);
  border: 1.5px solid rgba(255, 255, 255, 0.5);
  position: relative;
  aspect-ratio: 1/1;
}

/* 猫咪动画效果 */
@keyframes breathe {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes tailWag {
  0% {
    transform: translateX(0) rotate(0deg);
  }
  25% {
    transform: translateX(2px) rotate(3deg);
  }
  75% {
    transform: translateX(-2px) rotate(-3deg);
  }
  100% {
    transform: translateX(0) rotate(0deg);
  }
}

@keyframes blinkEyes {
  0% {
    transform: scaleY(1);
  }
  5% {
    transform: scaleY(0.8);
  }
  10% {
    transform: scaleY(1);
  }
  100% {
    transform: scaleY(1);
  }
}

/* 点击猫咪时的动画 */
@keyframes patReaction {
  0% {
    transform: scale(1);
  }
  30% {
    transform: scale(0.95);
  }
  60% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
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
  0%,
  100% {
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

.help-content .font-medium {
  color: #1890ff;
}

/* 排行榜样式 */
.ranking-content {
  max-height: 600px;
  overflow-y: auto;
}

.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-weight: bold;
  color: white;
}

.rank-1 {
  background-color: #f5222d;
  box-shadow: 0 2px 4px rgba(245, 34, 45, 0.3);
}

.rank-2 {
  background-color: #fa8c16;
  box-shadow: 0 2px 4px rgba(250, 140, 22, 0.3);
}

.rank-3 {
  background-color: #faad14;
  box-shadow: 0 2px 4px rgba(250, 173, 20, 0.3);
}

/* Lunchpad模态框样式 */
:deep(.lunchpad-modal) {
  width: 900px !important;
}

:deep(.ant-modal-content) {
  background-color: #a57a7a;
  border-radius: 12px;
  overflow: hidden;
}

:deep(.ant-modal-header) {
  background-color: #b48585;
  border-bottom: 1px solid #977171;
}

:deep(.ant-modal-title) {
  color: #fff;
  font-weight: bold;
}

:deep(.ant-modal-close) {
  color: #fff;
}
</style>
