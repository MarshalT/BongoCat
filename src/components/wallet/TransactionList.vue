<script setup lang="ts">
import type { Transaction } from '@/composables/wallet/useWallet'

import { GiftOutlined, HeartOutlined, PlusOutlined, SwapOutlined } from '@ant-design/icons-vue'

// 组件属性
interface Props {
  transactions: Transaction[]
}

const props = defineProps<Props>()

// 格式化地址
function formatAddress(address: string): string {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// 格式化日期
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch (error) {
    console.error('格式化日期出错:', error)
    return dateString
  }
}

// 打开交易详情
function openTransaction(id: string) {
  console.log('查看交易:', id)
  // 此处可以添加查看交易详情的逻辑
  //   window.open(`https://dfstool.github.io/#/query/transaction?tab=summary&txid=${id}`, '_blank')
}

// 添加一个函数来获取交易图标和颜色
function getTransactionIconAndColor(transaction) {
  // 根据交易类型和备注确定图标和颜色
  if (transaction.memo?.includes('铸造猫咪')) {
    return {
      icon: 'gift',
      color: '#722ed1', // 紫色
    }
  } else if (transaction.memo?.includes('喂养猫咪')) {
    return {
      icon: 'heart',
      color: '#eb2f96', // 粉色
    }
  } else if (transaction.type === 'send') {
    return {
      icon: 'arrow-up',
      color: '#f5222d', // 红色
    }
  } else {
    return {
      icon: 'arrow-down',
      color: '#52c41a', // 绿色
    }
  }
}

// 获取交易类型显示文本
function getTransactionTypeText(transaction) {
  if (transaction.memo?.includes('铸造猫咪')) {
    return '铸造猫咪'
  } else if (transaction.memo?.includes('喂养猫咪')) {
    return '喂养猫咪'
  } else if (transaction.type === 'send') {
    return '发送'
  } else {
    return '接收'
  }
}
</script>

<template>
  <a-list
    :bordered="false"
    class="transaction-list"
  >
    <a-list-item
      v-for="transaction in transactions"
      :key="transaction.id"
    >
      <div class="w-full">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <div
              class="mr-3 h-10 w-10 flex items-center justify-center rounded-full"
              :style="{ backgroundColor: `${getTransactionIconAndColor(transaction).color}15`, color: getTransactionIconAndColor(transaction).color }"
            >
              <SwapOutlined v-if="getTransactionIconAndColor(transaction).icon === 'arrow-up'" />
              <PlusOutlined v-else-if="getTransactionIconAndColor(transaction).icon === 'arrow-down'" />
              <HeartOutlined v-else-if="getTransactionIconAndColor(transaction).icon === 'heart'" />
              <GiftOutlined v-else-if="getTransactionIconAndColor(transaction).icon === 'gift'" />
            </div>
            <div>
              <h3 class="font-medium">
                {{ getTransactionTypeText(transaction) }} {{ transaction.currency }}
              </h3>
              <p class="text-sm text-gray-500">
                {{ formatDate(transaction.date) }}
              </p>
              <p
                v-if="transaction.memo"
                class="text-xs text-gray-500"
              >
                备注: {{ transaction.memo }}
              </p>
            </div>
          </div>
          <div class="text-right">
            <p
              class="font-bold"
              :style="{ color: getTransactionIconAndColor(transaction).color }"
            >
              {{ transaction.type === 'receive' ? '+' : '-' }}{{ transaction.amount }} {{ transaction.currency }}
            </p>
            <p class="text-sm text-gray-500">
              {{ transaction.type === 'receive' ? '来自:' : '发送至:' }}
              {{ formatAddress(transaction.type === 'receive' ? transaction.from : transaction.to) }}
            </p>
            <p class="text-xs">
              <a
                class="text-blue-500"
                href=""
                @click.prevent="openTransaction(transaction.id)"
              >查看交易</a>
            </p>
          </div>
        </div>
      </div>
    </a-list-item>
    <a-empty
      v-if="transactions.length === 0"
      description="暂无交易记录"
    />
  </a-list>
</template>

<style scoped>
.transaction-list {
  max-height: 400px;
  overflow-y: auto;
}
</style>
