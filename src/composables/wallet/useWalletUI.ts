import { info } from '@tauri-apps/plugin-log'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'

import { useWallet, WalletStatus, WalletType } from './useWallet'
import { PasswordManager } from '@/utils/PasswordManager'

import { getDFSPriceFromAPI, getTokenPrice } from '@/utils/tokenPrice'

// 用于管理钱包UI状态的composable
export function useWalletUI() {
  const wallet = useWallet()

  // UI状态
  const activeTab = ref('assets')
  const debugLogs = ref<string[]>([])
  const showDebugLogs = ref(true)
  const loadingBalances = ref(false)

  // DFS价格状态
  const dfsPrice = ref(1.80) // 默认价格
  const dfsPriceLoading = ref(false)
  const lastPriceUpdate = ref<Date | null>(null)

  // 模态框状态
  const modals = reactive({
    send: false,
    receive: false,
    createWallet: false,
    importWallet: false,
    backup: false,
    exportPrivateKey: false,
    passwordRequired: false,
    unlockWallet: false,
  })

  // 表单状态
  const forms = reactive({
    // 发送交易表单
    send: {
      recipient: '',
      amount: '',
      currency: 'DFS',
      gasPrice: 'medium',
      memo: '',
      reset() {
        this.recipient = ''
        this.amount = ''
        this.memo = ''
        this.currency = 'DFS'
        this.gasPrice = 'medium'
      },
    },

    // 新钱包表单
    newWallet: {
      accountName: '',
      isCreating: false,
      reset() {
        this.accountName = ''
        this.isCreating = false
      },
    },

    // 导入钱包表单
    importWallet: {
      privateKey: '',
      accountName: '',
      isImporting: false,
      reset() {
        this.privateKey = ''
        this.accountName = ''
        this.isImporting = false
      },
    },

    // 备份信息
    backup: {
      privateKey: '',
      showPrivateKey: false,
      reset() {
        this.privateKey = ''
        this.showPrivateKey = false
      },
    },
  })

  // 资产列表管理
  const assetList = ref<Array<{
    key: string
    name: string
    balance: string
    value: number
    color: string
  }>>([
    {
      key: 'DFS',
      name: 'DFS Chain',
      balance: wallet.balances[WalletType.DFS],
      value: Number.parseFloat(wallet.balances[WalletType.DFS]) * 0.5,
      color: 'bg-blue-500',
    },
  ])

  // 计算属性
  const isWalletConnected = computed(() => {
    // 检查钱包状态是否为已连接，同时确保有currentWallet
    const connected = wallet.walletStatus.value === WalletStatus.CONNECTED && wallet.currentWallet.value !== null

    // 记录计算结果到调试日志
    console.log('isWalletConnected computed: ', {
      status: wallet.walletStatus.value,
      hasWallet: wallet.currentWallet.value !== null,
      result: connected,
    })

    return connected
  })

  // 钱包是否锁定的计算属性
  const isWalletLocked = computed(() => wallet.isWalletLocked.value)

  const walletAddress = computed(() => wallet.currentWallet.value?.address || 'bongo1234567890')

  // 计算资产总价值（美元）
  const calculateTotalAssetValue = computed(() => {
    let total = 0

    // 遍历所有资产并计算总价值
    assetList.value.forEach((asset) => {
      const amount = Number.parseFloat(asset.balance)
      if (!isNaN(amount)) {
        if (asset.key === 'DFS') {
          // 使用实时DFS价格
          total += amount * dfsPrice.value
        } else {
          // 其他代币使用已计算的价值
          total += asset.value
        }
      }
    })

    return total.toFixed(4)
  })

  // 钱包余额（以美元显示）
  const walletBalance = computed(() => {
    const balance = wallet.balances[WalletType.DFS]
    return calculateTotalAssetValue.value
  })

  // 修改检查密码是否已设置的逻辑
  const hasSetupPassword = computed(() => {
    // 检查是否存在密码哈希存储
    return !!localStorage.getItem('bongo-cat-wallet-password-hash')
  })

  // 检查是否已设置节点URL
  const hasSetupNodeUrl = computed(() => {
    return !!localStorage.getItem('bongo-cat-wallet-node-url')
  })

  // 添加调试日志
  const addDebugLog = (message: string, data?: any) => {
    info(message, data)
    const timestamp = new Date().toLocaleTimeString()
    const logMessage = data ? `${timestamp} - ${message}: ${JSON.stringify(data)}` : `${timestamp} - ${message}`
    debugLogs.value.push(logMessage)

    console.log(message, data)

    if (debugLogs.value.length > 300) {
      debugLogs.value.shift()
    }
  }

  // 获取DFS实时价格
  const fetchDFSPrice = async () => {
    try {
      dfsPriceLoading.value = true
      addDebugLog('正在获取DFS价格...')

      const price = await getDFSPriceFromAPI()
      dfsPrice.value = price
      lastPriceUpdate.value = new Date()

      addDebugLog(`DFS价格获取成功: ${price}`)
      return price
    } catch (err) {
      addDebugLog('获取DFS价格失败', err)
      return dfsPrice.value // 返回当前值
    } finally {
      dfsPriceLoading.value = false
    }
  }

  // 获取指定token的价格
  const fetchTokenPrice = async (tokenName: string): Promise<number | null> => {
    try {
      addDebugLog(`正在获取${tokenName}价格...`)

      if (tokenName === 'DFS') {
        return await fetchDFSPrice()
      }

      const price = await getTokenPrice(tokenName)

      if (price !== null) {
        addDebugLog(`${tokenName}价格获取成功: ${price}`)
      } else {
        addDebugLog(`未能获取${tokenName}价格`)
      }

      return price
    } catch (err) {
      addDebugLog(`获取${tokenName}价格失败`, err)
      return null
    }
  }

  // 初始化函数
  const initialize = async () => {
    // 获取DFS价格
    await fetchDFSPrice()
  }

  // 组件挂载时初始化
  onMounted(() => {
    initialize()
  })

  // 刷新余额和资产列表 - 使用真实价格
  const refreshWalletBalance = async () => {
    if (!isWalletConnected.value) {
      addDebugLog('钱包未连接，无法刷新余额')
      return
    }

    // 如果钱包已锁定，提示用户
    if (isWalletLocked.value) {
      message.warning('钱包已锁定，请先解锁')
      modals.unlockWallet = true
      return
    }

    // 重置自动锁定计时器
    resetWalletLockTimer()

    try {
      addDebugLog('正在刷新余额...')
      loadingBalances.value = true
      message.loading('正在刷新余额...', 1)

      // 同时获取最新DFS价格
      await fetchDFSPrice()

      const result = await wallet.refreshBalance()
      if (result) {
        // 更新资产列表，获取所有token的实时价格
        const tokenList = result.assetsList.map(asset => asset.key)
        addDebugLog(`获取到的token列表: ${tokenList}`)

        // 获取多个token的价格
        const tokenPrices: Record<string, number | null> = {}

        // 创建一个promises数组，确保异步计算准确
        const valueCalculationPromises = result.assetsList.map(async (asset) => {
          // 计算资产价值
          const amount = Number.parseFloat(asset.balance)
          let calculatedValue = 0

          try {
            // 使用新的calculateAssetValue函数计算价值
            calculatedValue = await calculateAssetValue(asset.balance, asset.key)
            addDebugLog(`计算${asset.key}资产价值: ${calculatedValue}`)
          } catch (error) {
            addDebugLog(`计算${asset.key}资产价值失败:`, error)
            // 失败时使用默认计算
            if (asset.key === 'DFS') {
              calculatedValue = amount * dfsPrice.value
            } else {
              calculatedValue = amount // 默认价格为1.0
            }
          }

          return {
            ...asset,
            value: calculatedValue,
          }
        })

        // 等待所有价值计算完成
        assetList.value = await Promise.all(valueCalculationPromises)

        addDebugLog('余额更新成功', assetList.value)
        addDebugLog(`总资产价值: $${calculateTotalAssetValue.value}`)
      }
    } catch (err) {
      addDebugLog('刷新余额失败', err)
    } finally {
      loadingBalances.value = false
    }
  }

  // 复制到剪贴板
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    message.success('已复制到剪贴板')

    // 添加按钮动画效果
    const copyBtn = document.querySelector('.qr-copy-btn')
    if (copyBtn) {
      copyBtn.classList.add('qr-copy-active')
      setTimeout(() => {
        copyBtn.classList.remove('qr-copy-active')
      }, 500)
    }
  }

  // 格式化地址
  const formatAddress = (address: string) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // 格式化交易时间
  const formatTransactionDate = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch (err) {
      console.error('日期格式化错误:', err)
      return dateString
    }
  }

 

  // 断开钱包连接
  const handleDisconnectWallet = async () => {
    if (!isWalletConnected.value) {
      return
    }

    addDebugLog('尝试断开钱包连接')
    try {
      await wallet.disconnectWallet()
      addDebugLog('钱包断开成功')
      message.success('钱包已断开连接')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      addDebugLog(`断开钱包失败: ${errorMessage}`)
      message.error(`断开钱包失败: ${errorMessage}`)
    }
  }

  // 发送代币
  const handleSendTokens = async () => {
    if (!isWalletConnected.value) {
      message.error('钱包未连接')
      return false
    }

    // 检查钱包是否锁定
    if (isWalletLocked.value) {
      message.warning('钱包已锁定，请先解锁')
      modals.unlockWallet = true
      return false
    }

    // 重置自动锁定计时器
    resetWalletLockTimer()

    addDebugLog('开始执行发送交易', forms.send)

    if (!forms.send.recipient || !forms.send.amount) {
      message.error('请填写完整的交易信息')
      return
    }

    try {
      message.loading('正在处理交易...')
      addDebugLog('发送交易参数:', {
        to: forms.send.recipient,
        amount: forms.send.amount,
        currency: forms.send.currency,
        memo: forms.send.memo,
      })

      const txId = await wallet.sendTransaction(
        forms.send.recipient,
        forms.send.amount,
        forms.send.currency,
        forms.send.memo,
      )

      modals.send = false
      // forms.send.reset();

      addDebugLog('交易发送成功:', { txId })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误'
      addDebugLog(`交易发送失败: ${errorMessage}`)
      message.error(`交易发送失败: ${errorMessage}`)
    }
  }

  // 使用密码发送代币（用于密码输入对话框）
  const handleSendTokensWithPassword = async (password: string) => {
    if (!isWalletConnected.value) {
      message.error('钱包未连接')
      return false
    }

    // 重置自动锁定计时器
    resetWalletLockTimer()

    addDebugLog('开始执行发送交易（带密码）')

    if (!forms.send.recipient || !forms.send.amount) {
      message.error('请填写完整的交易信息')
      return false
    }

    try {
      message.loading('正在处理交易...')
      addDebugLog('发送交易参数:', {
        to: forms.send.recipient,
        amount: forms.send.amount,
        currency: forms.send.currency,
        memo: forms.send.memo,
      })

      // 使用密码发送交易
      const txId = await wallet.sendTransaction(
        forms.send.recipient,
        forms.send.amount,
        forms.send.currency,
        forms.send.memo,
        password // 传递密码参数
      )

      modals.send = false
      // forms.send.reset();

      addDebugLog('交易发送成功:', { txId })
      message.success('交易发送成功')
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误'
      addDebugLog(`交易发送失败: ${errorMessage}`)
      message.error(`交易发送失败: ${errorMessage}`)
      throw err
    }
  }

  // 完成备份过程
  const completeBackup = () => {
    modals.backup = false
    forms.backup.reset()
    addDebugLog('备份过程完成')
  }

  // 切换私钥显示状态
  const togglePrivateKeyVisibility = () => {
    forms.backup.showPrivateKey = !forms.backup.showPrivateKey
  }

  // 导出私钥
  const exportPrivateKey = async (password?: string): Promise<string | null> => {
    // 检查钱包是否锁定
    if (isWalletLocked.value) {
      message.warning('钱包已锁定，请先解锁')
      modals.unlockWallet = true
      return null
    }

    try {
      // 如果提供了密码，验证密码
      if (password) {
        // 验证密码是否正确
        const isValid = await PasswordManager.verifyPassword(password)
        if (!isValid) {
          message.error('密码不正确')
          return null
        }

        // 获取加密的钱包数据
        const encryptedWallet = localStorage.getItem('bongo-cat-wallet-encrypted')
        if (!encryptedWallet) {
          throw new Error('找不到钱包数据')
        }

        // 解密获取完整的钱包数据
        const walletData = await PasswordManager.decryptData(encryptedWallet, password)
        
        // 重置自动锁定计时器
        resetWalletLockTimer()
        
        // 获取真实的私钥
        return walletData.privateKey
      }

      // 如果没有提供密码，返回null (UI层需要处理密码输入)
      return null
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      addDebugLog(`获取私钥失败: ${errorMessage}`)
      message.error(`获取私钥失败: ${errorMessage}`)
      return null
    }
  }

  // 计算资产的美元价值
  const calculateAssetValue = async (amount: string, currency: string): Promise<number> => {
    const numAmount = Number.parseFloat(amount) || 0

    // 如果金额为0，直接返回0
    if (numAmount === 0) {
      return 0
    }

    if (currency === 'DFS') {
      // 使用已获取的DFS价格
      return numAmount * dfsPrice.value
    }

    // 获取其他token价格
    const tokenPrice = await fetchTokenPrice(currency)
    if (tokenPrice !== null) {
      return numAmount * tokenPrice
    }

    // 如果获取不到价格，使用默认价格1.0
    return numAmount * 1.0
  }

  // 模拟价格变动数据
  const getPriceChange = () => {
    // 这里可以根据需要计算实际价格变动
    // 目前仍然返回固定值，但使用真实价格计算资产价值
    const fixedValue = -2.06
    return fixedValue.toFixed(2)
  }

  // 锁定钱包
  const handleLockWallet = () => {
    if (!isWalletConnected.value) {
      message.error('钱包未连接')
      return
    }

    wallet.lockWallet()
    addDebugLog('钱包已锁定')
    message.success('钱包已锁定')
  }

  // 解锁钱包
  const handleUnlockWallet = async (password: string) => {
    if (!isWalletConnected.value) {
      message.error('钱包未连接')
      return false
    }

    try {
      addDebugLog('尝试解锁钱包')
      const success = await wallet.unlockWallet(password)
      
      if (success) {
        addDebugLog('钱包解锁成功')
        message.success('钱包解锁成功')
        
        // 关闭解锁对话框
        modals.unlockWallet = false
        
        // 刷新钱包余额
        await refreshWalletBalance()
        return true
      } else {
        addDebugLog('钱包解锁失败')
        message.error('钱包解锁失败，请检查密码')
        return false
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误'
      addDebugLog(`解锁钱包出错: ${errorMessage}`)
      message.error(`解锁钱包失败: ${errorMessage}`)
      throw err
    }
  }

  // 显示解锁对话框
  const showUnlockDialog = () => {
    if (isWalletLocked.value) {
      console.log('显示解锁对话框，当前状态:', modals.unlockWallet)
      modals.unlockWallet = true
      console.log('设置后状态:', modals.unlockWallet)
    }
  }

  // 重置锁定计时器（用户操作时）
  const resetWalletLockTimer = () => {
    wallet.refreshLockTimer()
  }

  return {
    // 状态
    wallet,
    activeTab,
    debugLogs,
    showDebugLogs,
    loadingBalances,
    modals,
    forms,
    assetList,
    dfsPrice,
    dfsPriceLoading,
    lastPriceUpdate,

    // 计算属性
    isWalletConnected,
    isWalletLocked,
    walletAddress,
    walletBalance,
    calculateTotalAssetValue,
    hasSetupPassword,
    hasSetupNodeUrl,

    // 方法
    addDebugLog,
    refreshWalletBalance,
    fetchDFSPrice,
    fetchTokenPrice,
    copyToClipboard,
    formatAddress,
    formatTransactionDate,
    handleDisconnectWallet,
    handleSendTokens,
    handleSendTokensWithPassword,
    completeBackup,
    togglePrivateKeyVisibility,
    exportPrivateKey,
    calculateAssetValue,
    getPriceChange,
    handleUnlockWallet,
    handleLockWallet,
    showUnlockDialog,
    resetWalletLockTimer,
  }
}
