<template>
  <a-card class="wallet-summary mb-6" :bordered="false">
    <div class="flex justify-between">
      <div>
        <p class="text-gray-500 mb-1">账户资产(USDT)</p>
        <h1 class="text-2xl font-bold">${{ balance }}</h1>
        <p class="text-sm">
          DFS价格: ${{ dfsPrice.toFixed(2) }} 
          <a-tooltip title="刷新价格">
            <sync-outlined @click="onRefreshPrice" :spin="isRefreshing" class="ml-1 cursor-pointer" />
          </a-tooltip>
        </p>
        <!-- <p v-if="isLocked" class="text-sm text-red-500 mt-1">
          <LockOutlined class="mr-1" />钱包已锁定
        </p> -->
      </div>
      <div class="flex items-center">
        <div class="bg-gray-100 rounded-full p-2 flex items-center address-container" :class="{ 'address-locked': isLocked }">
          <span class="text-sm mr-1 address-text" @click="onExportPrivateKey">{{ address }}</span>
          <div class="address-actions">
            <a-button type="text" size="small" @click="onCopy" title="复制地址">
              <CopyOutlined />
            </a-button>
            <!-- <a-button type="text" size="small" @click="onExportPrivateKey" title="导出私钥">
              <KeyOutlined />
            </a-button> -->
          </div>
        </div>
      </div>
    </div>
  </a-card>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CopyOutlined, KeyOutlined, LockOutlined, SyncOutlined } from '@ant-design/icons-vue';

// 组件属性
interface Props {
  balance: string;
  address: string;
  isLocked?: boolean;
  dfsPrice: number;
}

const props = defineProps<Props>();
const isRefreshing = ref(false);

// 定义事件
const emit = defineEmits<{
  (e: 'copy', address: string): void;
  (e: 'exportPrivateKey'): void;
  (e: 'refreshPrice'): void;
}>();

// 复制地址
const onCopy = () => {
  emit('copy', props.address);
};

// 导出私钥
const onExportPrivateKey = () => {
  emit('exportPrivateKey');
};

// 刷新价格
const onRefreshPrice = async () => {
  isRefreshing.value = true;
  emit('refreshPrice');
  setTimeout(() => {
    isRefreshing.value = false;
  }, 1500);
};
</script>

<style scoped>
.wallet-summary {
  background: linear-gradient(to right, #f5f7fa, #eef2f7);
}

.address-container {
  transition: all 0.3s ease;
}

.address-container:hover {
  background-color: #f0f0f0;
}

.address-text {
  cursor: pointer;
  user-select: all;
}

.address-text:hover {
  text-decoration: underline;
  color: #1890ff;
}

.address-actions {
  display: flex;
  align-items: center;
}

.address-locked {
  border: 1px solid #ff4d4f;
  background-color: rgba(255, 77, 79, 0.05);
}
</style> 