<template>
  <a-card class="wallet-summary mb-6" :bordered="false">
    <div class="flex justify-between">
      <div>
        <p class="text-gray-500 mb-1">账户资产(USDT)</p>
        <h1 class="text-2xl font-bold">{{ balance }} USDT</h1>
        <p class="text-sm" :class="priceChange.startsWith('-') ? 'text-red-500' : 'text-green-500'">
          {{ priceChange }}% 24小时变动
        </p>
      </div>
      <div class="flex items-center">
        <div class="bg-gray-100 rounded-full p-2 flex items-center">
          <span class="text-sm mr-1">{{ address }}</span>
          <a-button type="text" size="small" @click="onCopy">
            <CopyOutlined />
          </a-button>
        </div>
      </div>
    </div>
  </a-card>
</template>

<script setup lang="ts">
import { CopyOutlined } from '@ant-design/icons-vue';

// 组件属性
interface Props {
  balance: string;
  address: string;
  priceChange: string;
}

const props = defineProps<Props>();

// 定义事件
const emit = defineEmits<{
  (e: 'copy', address: string): void;
}>();

// 复制地址
const onCopy = () => {
  emit('copy', props.address);
};
</script>

<style scoped>
.wallet-summary {
  background: linear-gradient(to right, #f5f7fa, #eef2f7);
}
</style> 