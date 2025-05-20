<template>
  <a-list :bordered="false" class="transaction-list">
    <a-list-item v-for="transaction in transactions" :key="transaction.id">
      <div class="w-full">
        <div class="flex justify-between items-center">
          <div class="flex items-center">
            <div class="w-10 h-10 rounded-full flex items-center justify-center mr-3"
                 :class="transaction.type === 'receive' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'">
              <SwapOutlined v-if="transaction.type === 'send'" />
              <PlusOutlined v-else />
            </div>
            <div>
              <h3 class="font-medium">{{ transaction.type === 'receive' ? '收到' : '发送' }} {{ transaction.currency }}</h3>
              <p class="text-gray-500 text-sm">{{ formatDate(transaction.date) }}</p>
              <p v-if="transaction.memo" class="text-gray-500 text-xs">备注: {{ transaction.memo }}</p>
            </div>
          </div>
          <div class="text-right">
            <p class="font-bold" :class="transaction.type === 'receive' ? 'text-green-600' : 'text-orange-600'">
              {{ transaction.type === 'receive' ? '+' : '-' }}{{ transaction.amount }} {{ transaction.currency }}
            </p>
            <p class="text-gray-500 text-sm">
              {{ transaction.type === 'receive' ? '来自:' : '发送至:' }} 
              {{ formatAddress(transaction.type === 'receive' ? transaction.from : transaction.to) }}
            </p>
            <p class="text-xs">
              <a href="" @click.prevent="openTransaction(transaction.id)" class="text-blue-500">查看交易</a>
            </p>
          </div>
        </div>
      </div>
    </a-list-item>
    <a-empty v-if="transactions.length === 0" description="暂无交易记录" />
  </a-list>
</template>

<script setup lang="ts">
import { SwapOutlined, PlusOutlined } from '@ant-design/icons-vue';
import { Transaction } from '@/composables/wallet/useWallet';

// 组件属性
interface Props {
  transactions: Transaction[];
}

const props = defineProps<Props>();

// 格式化地址
const formatAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// 格式化日期
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('格式化日期出错:', error);
    return dateString;
  }
};

// 打开交易详情
const openTransaction = (id: string) => {
  console.log('查看交易:', id);
  // 此处可以添加查看交易详情的逻辑
//   window.open(`https://dfstool.github.io/#/query/transaction?tab=summary&txid=${id}`, '_blank')

};
</script>

<style scoped>
.transaction-list {
  max-height: 400px;
  overflow-y: auto;
}
</style> 