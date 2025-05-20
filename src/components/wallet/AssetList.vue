<template>
  <div class="asset-list">
    <div class="flex justify-between items-center mb-3">
      <div class="font-bold">全部资产</div>
      <a-button size="small" @click="onRefresh" :loading="loading">
        <sync-outlined />刷新资产
      </a-button>
    </div>
    
    <template v-if="assets.length > 0">
      <a-card 
        v-for="asset in assets" 
        :key="asset.key" 
        class="currency-card mb-2" 
        :bordered="false"
      >
        <div class="flex justify-between items-center">
          <div class="flex items-center">
            <div 
              class="asset-icon w-10 h-10 rounded-full flex items-center justify-center mr-3 text-lg font-bold"
              :style="{ backgroundColor: getBackgroundColor(asset.color) }"
            >
              {{ asset.key.charAt(0) }}
            </div>
            <div>
              <h3 class="font-medium">{{ asset.name }}</h3>
              <p class="text-gray-500">{{ asset.balance }} {{ asset.key }}</p>
            </div>
          </div>
          <div class="text-right">
            <p class="font-bold">${{ asset.value.toFixed(2) }}</p>
          </div>
        </div>
      </a-card>
    </template>
    
    <a-empty v-else description="暂无资产" class="my-8">
      <template #extra>
        <a-button type="primary" @click="onRefresh" :loading="loading">
          <sync-outlined />刷新
        </a-button>
      </template>
    </a-empty>
  </div>
</template>

<script setup lang="ts">
import { SyncOutlined } from '@ant-design/icons-vue';

// 定义资产类型
export interface Asset {
  key: string;
  name: string;
  balance: string;
  value: number;
  color: string;
}

// 组件属性
interface Props {
  assets: Asset[];
  loading: boolean;
}

const props = defineProps<Props>();

// 定义事件
const emit = defineEmits<{
  (e: 'refresh'): void;
}>();

// 颜色映射表 - 将UnoCSS的颜色类转换为实际颜色值
const colorMap: Record<string, string> = {
  'bg-blue-500': '#3b82f6', 
  'bg-green-500': '#22c55e',
  'bg-purple-500': '#a855f7',
  'bg-red-500': '#ef4444',
  'bg-yellow-500': '#eab308',
  'bg-indigo-500': '#6366f1',
  'bg-pink-500': '#ec4899'
};

// 获取背景色
const getBackgroundColor = (color: string): string => {
  return colorMap[color] || '#3b82f6'; // 默认蓝色
};

// 刷新事件
const onRefresh = () => {
  emit('refresh');
};
</script>

<style scoped>
.currency-card {
  transition: all 0.3s ease;
}

.currency-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.asset-icon {
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  min-width: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(0, 0, 0, 0.1);
  color: white;
}
</style> 