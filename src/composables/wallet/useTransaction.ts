import { message } from 'ant-design-vue'
import { ref } from 'vue'

import { useWallet } from './useWallet'

// 定义交易参数接口
export interface TransactionParams {
  to: string
  amount: string
  currency: string
  memo?: string
}

// 定义交易状态
export enum TransactionStatus {
  IDLE = 'idle',
  PREPARING = 'preparing',
  BROADCASTING = 'broadcasting',
  CONFIRMING = 'confirming',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
}

/**
 * 交易管理Composable
 * 提供交易创建、签名、发送和跟踪功能
 */
export function useTransaction() {
  const {
    currentWallet,
    isLoading: walletLoading,
    sendTransaction,
    refreshBalance,
  } = useWallet()

  const transactionStatus = ref<TransactionStatus>(TransactionStatus.IDLE)
  const currentTransactionId = ref<string | null>(null)
  const transactionError = ref<string | null>(null)
  const isLoading = ref(false)
  const gasFees = ref({
    low: { amount: '0.0001', time: '~10 分钟' },
    medium: { amount: '0.0005', time: '~3 分钟' },
    high: { amount: '0.001', time: '<1 分钟' },
  })
  const selectedGasFee = ref('medium')

  /**
   * 验证交易参数
   */
  const validateTransaction = (params: TransactionParams): string | null => {
    // 验证目标地址
    if (!params.to) {
      return '请输入有效的接收地址'
    }

    // 验证DFS地址格式
    if (!/^[a-z1-5.]{1,12}$/.test(params.to)) {
      return '无效的DFS地址格式'
    }

    // 验证金额
    if (!params.amount || Number.parseFloat(params.amount) <= 0) {
      return '请输入有效的金额'
    }

    // 验证币种
    if (!params.currency) {
      return '请选择币种'
    }

    return null
  }

  /**
   * 发送交易
   * @param params 交易参数
   */
  const sendTokens = async (params: TransactionParams) => {
    if (!currentWallet.value) {
      message.error('请先连接钱包')
      return null
    }

    try {
      isLoading.value = true
      transactionStatus.value = TransactionStatus.PREPARING
      transactionError.value = null

      // 验证参数
      const validationError = validateTransaction(params)
      if (validationError) {
        throw new Error(validationError)
      }

      // 准备交易
      transactionStatus.value = TransactionStatus.BROADCASTING
      message.loading('交易广播中...', 1)

      // 发送交易
      const txId = await sendTransaction(
        params.to,
        params.amount,
        params.currency,
        params.memo,
      )

      currentTransactionId.value = txId

      if (txId) {
        // 交易确认阶段
        transactionStatus.value = TransactionStatus.CONFIRMING
        message.loading('交易确认中...', 1)

        // 模拟区块链确认延迟
        await new Promise(resolve => setTimeout(resolve, 2000))

        // 交易完成
        transactionStatus.value = TransactionStatus.CONFIRMED
        message.success('交易已确认')

        // 刷新余额
        await refreshBalance()

        return txId
      } else {
        throw new Error('交易创建失败')
      }
    } catch (err: any) {
      const errMsg = JSON.stringify(err)
      console.error('交易发送失败:', errMsg)
      transactionError.value = errMsg
      transactionStatus.value = TransactionStatus.FAILED
      message.error(`交易失败: ${errMsg}`)
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 估算Gas费用
   * @param params 交易参数
   */
  const estimateGasFee = async (): Promise<{ [key: string]: string }> => {
    // DFS网络的Gas费用相对固定
    return {
      low: gasFees.value.low.amount,
      medium: gasFees.value.medium.amount,
      high: gasFees.value.high.amount,
    }
  }

  /**
   * 验证地址格式
   * @param address 待验证地址
   */
  const validateAddress = (address: string): boolean => {
    if (!address) return false

    // DFS账户名验证
    return /^[a-z1-5.]{1,12}$/.test(address)
  }

  /**
   * 重置交易状态
   */
  const resetTransactionState = () => {
    transactionStatus.value = TransactionStatus.IDLE
    currentTransactionId.value = null
    transactionError.value = null
  }

  /**
   * 获取交易手续费（基于选择的费率等级）
   */
  const getTransactionFee = (): string => {
    return gasFees.value[selectedGasFee.value as keyof typeof gasFees.value].amount
  }

  /**
   * 格式化交易记录展示信息
   */
  const formatTransaction = (txId: string): string => {
    return `${txId.substring(0, 8)}...${txId.substring(txId.length - 8)}`
  }

  return {
    // 状态
    transactionStatus,
    currentTransactionId,
    transactionError,
    isLoading,
    gasFees,
    selectedGasFee,

    // 方法
    sendTokens,
    estimateGasFee,
    validateAddress,
    resetTransactionState,
    getTransactionFee,
    formatTransaction,
  }
}
