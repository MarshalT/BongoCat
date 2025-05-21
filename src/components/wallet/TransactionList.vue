<script setup lang="ts">
import type { Transaction } from '@/composables/wallet/useWallet'

import { PlusOutlined, SwapOutlined } from '@ant-design/icons-vue'

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
              :class="transaction.type === 'receive' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'"
            >
              <SwapOutlined v-if="transaction.type === 'send'" />
              <PlusOutlined v-else />
            </div>
            <div>
              <h3 class="font-medium">
                {{ transaction.type === 'receive' ? '收到' : '发送' }} {{ transaction.currency }}
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
              :class="transaction.type === 'receive' ? 'text-green-600' : 'text-orange-600'"
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
