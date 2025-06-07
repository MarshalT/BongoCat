<script setup lang="ts">
import { info } from '@tauri-apps/plugin-log'
import { message } from 'ant-design-vue'
import { computed, onMounted, ref } from 'vue'

import { useWallet } from '@/composables/wallet/useWallet'
// 销毁或拆分NFT
import { executeburnorsplieNftByid } from '@/utils/buynft'
import { PasswordManager } from '@/utils/PasswordManager'
// 导入时间工具函数
import { formatISODate, formatTimeRemaining, isTimePassed, calculateProgress, parseTime } from '@/utils/timetool'
// 获取钱包实例
const wallet = useWallet()

// NFT列表数据
const myNfts = ref<any[]>([])
const loading = ref(false)
const searchQuery = ref('')
const operationInProgress = ref(false)

// 密码确认相关状态
const showPasswordModal = ref(false)
const password = ref('')
const actionType = ref<'burn' | 'split' | null>(null)
const pendingNftId = ref<number | null>(null)

// 计算属性：过滤后的NFT列表
const filteredNfts = computed(() => {
  if (!searchQuery.value) {
    return myNfts.value
  }

  const query = searchQuery.value.toLowerCase()
  return myNfts.value.filter(nft =>
    nft.id.toString().includes(query)
    || nft.pid.toString().includes(query)
    || (nft.project_title && nft.project_title.toLowerCase().includes(query)),
  )
})

// 格式化日期
function formatDate(timestamp: number | string) {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

// 判断NFT是否可以销毁
function canBurnNft(nft: any): boolean {
  if (!nft || !nft.last_trade || !nft.project_info) return false
  
  // 获取最后交易时间
  const lastTradeTime = new Date(nft.last_trade).getTime()
  
  // 使用isTimePassed函数判断是否已过销毁所需时间
  const secToBurnNft = nft.project_info.sec_to_burn_nft * 1000 // 转换为毫秒
  return isTimePassed(lastTradeTime, secToBurnNft)
}

// 判断NFT是否可以拆分
function canSplitNft(nft: any): boolean {
  if (!nft || !nft.current_price || !nft.project_info?.init_nft_price) return false
  
  // 获取初始价格
  const initPriceStr = nft.project_info.init_nft_price
  const initPrice = parseFloat(initPriceStr.split(' ')[0])
  
  // 获取当前价格
  const currentPrice = parseFloat(nft.current_price)
  
  // 当前价格超过初始价格的200%时可以拆分
  return currentPrice > (initPrice * 2)
}

// 获取剩余销毁时间（倒计时）
function getRemainingBurnTime(nft: any): string {
  if (!nft || !nft.last_trade || !nft.project_info) return '-'
  
  // 获取当前时间和最后交易时间
  const currentTime = new Date().getTime()
  const lastTradeTime = new Date(nft.last_trade).getTime()
  
  // 计算可销毁时间
  const secToBurnNft = nft.project_info.sec_to_burn_nft * 1000 // 转换为毫秒
  const burnTime = lastTradeTime + secToBurnNft
  
  // 计算剩余时间
  const remainingTime = burnTime - currentTime
  
  if (remainingTime <= 0) {
    return '可销毁'
  }
  
  // 使用formatTimeRemaining函数格式化剩余时间
  return formatTimeRemaining(remainingTime)
}

// 获取拆分进度百分比
function getSplitProgressPercent(nft: any): number {
  if (!nft || !nft.current_price || !nft.project_info?.init_nft_price) return 0
  
  // 获取初始价格
  const initPriceStr = nft.project_info.init_nft_price
  const initPrice = parseFloat(initPriceStr.split(' ')[0])
  
  // 获取当前价格
  const currentPrice = parseFloat(nft.current_price)
  
  // 计算进度百分比（当前价格 / 初始价格的两倍）
  const percent = (currentPrice / (initPrice * 2)) * 100
  return Math.min(Math.max(percent, 0), 100) // 确保在0-100之间
}

// 准备操作，显示密码确认对话框
function prepareAction(type: 'burn' | 'split', nftId: number) {
  if (!wallet) {
    message.error('钱包未初始化')
    info(`${type === 'burn' ? '销毁' : '拆分'}NFT失败: 钱包未初始化`)
    return false
  }

  // 检查钱包是否连接
  const currentWallet = wallet.currentWallet?.value
  if (!currentWallet || !currentWallet.address) {
    const errorMsg = '钱包未连接或未找到用户账号'
    message.error(errorMsg)
    info(`${type === 'burn' ? '销毁' : '拆分'}NFT失败: ${errorMsg}`)
    return false
  }

  // 设置待处理的操作信息
  actionType.value = type
  pendingNftId.value = nftId

  // 显示密码确认对话框
  showPasswordModal.value = true
  return true
}

// 处理密码确认取消
function handlePasswordCancel() {
  // 重置状态
  showPasswordModal.value = false
  password.value = ''
  actionType.value = null
  pendingNftId.value = null
}

// 处理密码确认
async function handlePasswordConfirm() {
  if (!password.value || !actionType.value || pendingNftId.value === null) {
    message.error('请输入密码')
    return
  }

  try {
    operationInProgress.value = true

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

    // 在解密前立即关闭密码对话框
    showPasswordModal.value = false
    
    // 保存操作类型和NFT ID，因为它们会在关闭对话框后被重置
    const currentActionType = actionType.value
    const currentNftId = pendingNftId.value
    
    // 保存密码，因为我们需要用它来解密数据
    const currentPassword = password.value
    
    // 重置密码和操作类型
    password.value = ''
    actionType.value = null
    pendingNftId.value = null

    // 解密获取私钥
    const walletData = await PasswordManager.decryptData(encryptedWallet, currentPassword)
    
    const privateKey = walletData.privateKey

    // 检查钱包对象是否可用
    if (!wallet) {
      throw new Error('钱包未初始化或尚未连接')
    }

    // 根据操作类型执行相应的操作
    if (currentActionType === 'burn') {
      // 执行销毁操作
      info(`开始销毁NFT #${currentNftId}`)
      message.loading({ content: `正在销毁 NFT #${currentNftId}...`, key: `burn-${currentNftId}` })
      
      const result = await executeburnorsplieNftByid(
        wallet,
        currentNftId,
        'burn',
        (msg, data) => {
          console.log(`销毁NFT调试日志: ${msg}`, data)
          info(`销毁NFT调试: ${msg}`)
        }
      )
      
      message.success({ content: `NFT #${currentNftId} 销毁成功`, key: `burn-${currentNftId}` })
      info(`NFT #${currentNftId} 销毁成功: ${result}`)
    } else if (currentActionType === 'split') {
      // 执行拆分操作
      info(`开始拆分NFT #${currentNftId}`)
      message.loading({ content: `正在拆分 NFT #${currentNftId}...`, key: `split-${currentNftId}` })
      
      const result = await executeburnorsplieNftByid(
        wallet,
        currentNftId,
        'split',
        (msg, data) => {
          console.log(`拆分NFT调试日志: ${msg}`, data)
          info(`拆分NFT调试: ${msg}`)
        }
      )
      
      message.success({ content: `NFT #${currentNftId} 拆分成功`, key: `split-${currentNftId}` })
      info(`NFT #${currentNftId} 拆分成功: ${result}`)
    }
    
    // 刷新NFT列表
    await fetchMyNfts()
  } catch (err: any) {
    const errMsg = err.message || JSON.stringify(err)
    info(`执行操作失败: ${errMsg}`)
    message.error(`操作失败: ${errMsg}`)
  } finally {
    operationInProgress.value = false
  }
}

// 处理销毁NFT
async function handleBurnNft(nft: any) {
  if (operationInProgress.value) {
    message.warning('操作进行中，请稍后再试')
    return
  }
  
  if (!canBurnNft(nft)) {
    message.warning('此NFT尚未达到可销毁条件')
    return
  }
  
  // 准备销毁操作，显示密码确认对话框
  prepareAction('burn', nft.id)
}

// 处理拆分NFT
async function handleSplitNft(nft: any) {
  if (operationInProgress.value) {
    message.warning('操作进行中，请稍后再试')
    return
  }
  
  if (!canSplitNft(nft)) {
    message.warning('此NFT尚未达到可拆分条件')
    return
  }
  
  // 准备拆分操作，显示密码确认对话框
  prepareAction('split', nft.id)
}

// 获取用户的NFT列表
async function fetchMyNfts() {
  if (!wallet || !wallet.currentWallet?.value?.address) {
    message.error('钱包未连接')
    return
  }

  const accountName = wallet.currentWallet.value.address
  loading.value = true

  try {
    info(`开始获取用户 ${accountName} 的NFT列表`)

    // 从registry表中获取owner为当前用户的所有NFT
    const result = await wallet.getTableRows(
      'dfs3protocol', // code: 合约账户名
      'dfs3protocol', // scope: 表的作用域
      'registry', // table: 表名
      accountName, // lower_bound: 使用账户名作为索引值
      accountName, // upper_bound: 使用账户名作为索引值
      3, // index_position: 使用第三个索引（假设第三个索引是owner字段）
      'name', // key_type: 索引键类型
      1000, // limit: 最大结果数
      false, // reverse: 不反转结果
    )

    console.log('获取到的NFT数据:', result)

    if (result && Array.isArray(result)) {
      // 处理NFT数据，添加项目信息
      const processedNfts = await Promise.all(result.map(async (nft) => {
        // 获取项目信息
        try {
          const projectInfo = await wallet.getTableRows(
            'dfs3protocol',
            'dfs3protocol',
            'projects',
            nft.pid.toString(),
            nft.pid.toString(),
            1,
            'i64',
            1,
            false,
          )

          if (projectInfo && projectInfo.length > 0) {
            return {
              ...nft,
              project_title: projectInfo[0].title || `项目 #${nft.pid}`,
              project_img: projectInfo[0].nft_img || '',
              token_symbol: projectInfo[0].token_per_nft ? projectInfo[0].token_per_nft.split(' ')[1] : '',
              project_info: projectInfo[0], // 保存完整的项目信息
            }
          }

          return {
            ...nft,
            project_title: `项目 #${nft.pid}`,
            project_img: '',
            token_symbol: '',
          }
        } catch (error) {
          console.error(`获取项目 #${nft.pid} 信息失败:`, error)
          return {
            ...nft,
            project_title: `项目 #${nft.pid}`,
            project_img: '',
            token_symbol: '',
          }
        }
      }))

      myNfts.value = processedNfts
      info(`成功获取用户 ${accountName} 的NFT列表，共 ${myNfts.value.length} 个`)
      message.success(`已加载 ${myNfts.value.length} 个NFT`)
    } else {
      myNfts.value = []
      info(`未找到用户 ${accountName} 的NFT`)
      message.info('未找到NFT')
    }
  } catch (error) {
    console.error('获取NFT列表失败:', error)
    info(`获取NFT列表失败: ${JSON.stringify(error)}`)
    message.error('获取NFT列表失败')
    myNfts.value = []
  } finally {
    loading.value = false
  }
}

// 刷新NFT列表
function refreshNfts() {
  fetchMyNfts()
}

// 暴露方法供父组件调用
defineExpose({
  refreshNfts,
})

// 组件挂载时获取NFT列表
onMounted(() => {
  fetchMyNfts()
})
</script>

<template>
  <div class="my-nft-container">
    <a-spin :spinning="loading || operationInProgress">
      <div
        v-if="filteredNfts.length === 0"
        class="no-nfts"
      >
        <p>{{ loading ? '加载中...' : '没有找到NFT' }}</p>
      </div>

      <div v-else class="nft-list-container">
        <div class="nft-table">
          <!-- 表头 -->
          <div class="table-header">
            <div class="table-cell select-cell">选择</div>
            <div class="table-cell id-cell">ID</div>
            <div class="table-cell owner-cell">所有者</div>
            <div class="table-cell round-cell">轮次</div>
            <div class="table-cell price-cell">当前价格</div>
            <div class="table-cell trade-cell">最后交易</div>
            <div class="table-cell action-cell">操作</div>
          </div>

          <!-- 表格内容 -->
          <div 
            v-for="nft in filteredNfts" 
            :key="nft.id"
            class="table-row"
            :class="{ 'row-dark': filteredNfts.indexOf(nft) % 2 === 1 }"
          >
            <div class="table-cell select-cell">
              <a-checkbox />
            </div>
            <div class="table-cell id-cell">{{ nft.id }}</div>
            <div class="table-cell owner-cell">{{ nft.owner }}</div>
            <div class="table-cell round-cell">{{ nft.current_round }}</div>
            <div class="table-cell price-cell">{{ nft.current_price }} DFS</div>
            <div class="table-cell trade-cell">{{ formatDate(nft.last_trade) }}</div>
            <div class="table-cell action-cell">
              <a-button 
                danger
                class="burn-button" 
                @click="handleBurnNft(nft)"
                :disabled="!canBurnNft(nft)"
              >
                销毁
              </a-button>
              <a-button 
                type="primary" 
                class="split-button" 
                @click="handleSplitNft(nft)"
                :disabled="!canSplitNft(nft)"
              >
                拆分
              </a-button>
            </div>
          </div>
        </div>
      </div>
    </a-spin>
  </div>

  <!-- 密码确认模态框 -->
  <a-modal
    v-model:visible="showPasswordModal"
    cancel-text="取消"
    :confirm-loading="operationInProgress"
    ok-text="确定"
    :title="actionType === 'burn' ? '销毁NFT' : '拆分NFT'"
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
      <template v-if="actionType === 'burn'">
        销毁NFT将从您的NFT列表中移除该NFT，并获得相应的代币奖励
      </template>
      <template v-else-if="actionType === 'split'">
        拆分NFT将生成两个新的NFT，原NFT将被销毁
      </template>
    </div>
  </a-modal>
</template>

<style scoped>
.my-nft-container {
  background: #000;
  color: #fff;
  padding: 20px;
  border-radius: 12px;
  min-height: 100vh;
}

.my-nft-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.my-nft-title {
  font-size: 24px;
  color: #fff;
  margin: 0;
}

.my-nft-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.nfts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.nft-card {
  background: #111;
  border-radius: 12px;
  overflow: hidden;
  transition: transform 0.3s;
}

.nft-card:hover {
  transform: translateY(-5px);
}

.nft-image-container {
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0a0a0a;
  overflow: hidden;
}

.nft-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.nft-image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  color: #333;
  background: #1a1a1a;
}

.nft-title {
  font-size: 16px;
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nft-info {
  font-size: 14px;
}

.nft-info p {
  margin-bottom: 5px;
}

.no-nfts {
  text-align: center;
  padding: 40px;
  color: #999;
}

.nft-list-container {
  overflow-x: auto;
}

.nft-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 16px;
}

.table-header {
  background-color: #1a1a1a;
  color: #fff;
  font-weight: bold;
  height: 60px;
  display: flex;
  align-items: center;
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
}

.table-row {
  display: flex;
  align-items: center;
  height: 60px;
  border-bottom: 1px solid #222;
}

.table-row:last-child {
  border-bottom: none;
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
}

.table-cell {
  padding: 0 15px;
  text-align: left;
  display: flex;
  align-items: center;
  height: 100%;
}

.select-cell {
  width: 80px;
  justify-content: center;
}

.id-cell {
  width: 150px;
  color: #aaa;
}

.owner-cell {
  width: 200px;
  color: #aaa;
}

.round-cell {
  width: 100px;
  color: #aaa;
}

.price-cell {
  width: 200px;
  color: #aaa;
}

.trade-cell {
  width: 250px;
  color: #aaa;
}

.action-cell {
  width: 200px;
  display: flex;
  gap: 8px;
  justify-content: center;
}

.table-row {
  background-color: #111;
}

.row-dark {
  background-color: #1a1a1a;
}

.burn-button,
.split-button {
  height: 36px;
  border-radius: 4px;
  font-size: 14px;
  padding: 0 15px;
}

.burn-button {
  background-color: #ff3b30;
  border-color: #ff3b30;
  color: #fff;
  font-weight: bold;
}

.split-button {
  background-color: #1677ff;
  border-color: #1677ff;
}

/* 自定义复选框样式 */
:deep(.ant-checkbox-inner) {
  background-color: transparent;
  border-color: #555;
}

:deep(.ant-checkbox-checked .ant-checkbox-inner) {
  background-color: #1677ff;
  border-color: #1677ff;
}

:deep(.ant-spin-container) {
  display: block;
}

/* 禁用按钮样式 */
:deep(.ant-btn[disabled]) {
  background-color: #333;
  border-color: #444;
  color: #666;
}
</style>
