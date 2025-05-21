import type { Transaction, WalletInfo } from '../composables/wallet/useWallet'

import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'

import { WalletStatus, WalletType } from '../composables/wallet/useWallet'

/**
 * 钱包状态管理存储
 */
export const useWalletStore = defineStore('wallet', () => {
  // 钱包状态
  const status = ref<WalletStatus>(WalletStatus.DISCONNECTED)
  const currentWallet = ref<WalletInfo | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // 余额信息
  const balances = reactive({
    [WalletType.DFS]: '0.0000',
    [WalletType.ETH]: '0.0000',
    [WalletType.BTC]: '0.0000',
    [WalletType.USDT]: '0.0000',
  })

  // 交易历史
  const transactions = ref<Transaction[]>([])

  // 计算属性
  const isConnected = computed(() => status.value === WalletStatus.CONNECTED)
  const totalBalanceUSD = computed(() => {
    // 模拟价格，实际应用中应通过API获取实时价格
    const prices = {
      [WalletType.DFS]: 0.5,
      [WalletType.ETH]: 1700,
      [WalletType.BTC]: 28000,
      [WalletType.USDT]: 1,
    }

    let total = 0
    Object.keys(balances).forEach((key) => {
      const currency = key as WalletType
      const amount = Number.parseFloat(balances[currency]) || 0
      total += amount * prices[currency]
    })

    return total.toFixed(2)
  })

  // 方法
  /**
   * 更新钱包状态
   */
  function setWalletStatus(newStatus: WalletStatus) {
    status.value = newStatus
  }

  /**
   * 设置当前钱包信息
   */
  function setCurrentWallet(wallet: WalletInfo | null) {
    currentWallet.value = wallet
    if (wallet) {
      status.value = WalletStatus.CONNECTED
    } else {
      status.value = WalletStatus.DISCONNECTED
    }
  }

  /**
   * 更新余额信息
   */
  function updateBalance(currency: WalletType, balance: string) {
    balances[currency] = balance
  }

  /**
   * 添加交易记录
   */
  function addTransaction(transaction: Transaction) {
    transactions.value.unshift(transaction)
  }

  /**
   * 清空钱包数据
   */
  function clearWalletData() {
    currentWallet.value = null
    status.value = WalletStatus.DISCONNECTED
    Object.keys(balances).forEach((key) => {
      const currency = key as WalletType
      balances[currency] = '0.0000'
    })
    transactions.value = []
    error.value = null
  }

  /**
   * 设置错误信息
   */
  function setError(errorMessage: string | null) {
    error.value = errorMessage
    if (errorMessage) {
      status.value = WalletStatus.ERROR
    }
  }

  /**
   * 设置加载状态
   */
  function setLoading(loading: boolean) {
    isLoading.value = loading
  }

  return {
    // 状态
    status,
    currentWallet,
    isLoading,
    error,
    balances,
    transactions,

    // 计算属性
    isConnected,
    totalBalanceUSD,

    // 方法
    setWalletStatus,
    setCurrentWallet,
    updateBalance,
    addTransaction,
    clearWalletData,
    setError,
    setLoading,
  }
}, {
  persist: {
    enabled: true,
    strategies: [
      {
        key: 'bongo-cat-wallet',
        storage: localStorage,
        paths: ['currentWallet', 'balances', 'transactions'],
      },
    ],
  },
})
