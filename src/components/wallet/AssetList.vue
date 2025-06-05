<script setup lang="ts">
import { SyncOutlined } from '@ant-design/icons-vue'

// 定义资产类型
export interface Asset {
  key: string
  name: string
  balance: string
  value: number
  color: string
  logoUrl?: string // 添加 logo URL 字段
}

// 组件属性
interface Props {
  assets: Asset[]
  loading: boolean
}

const props = defineProps<Props>()

// 定义事件
const emit = defineEmits<{
  (e: 'refresh'): void
}>()

// 颜色映射表 - 将UnoCSS的颜色类转换为实际颜色值
const colorMap: Record<string, string> = {
  'bg-blue-500': '#3b82f6',
  'bg-green-500': '#22c55e',
  'bg-purple-500': '#a855f7',
  'bg-red-500': '#ef4444',
  'bg-yellow-500': '#eab308',
  'bg-indigo-500': '#6366f1',
  'bg-pink-500': '#ec4899',
}

// 获取背景色
function getBackgroundColor(color: string): string {
  return colorMap[color] || '#3b82f6' // 默认蓝色
}

// 检查图片是否存在
function handleImageError(event: Event) {
  const target = event.target as HTMLImageElement
  target.style.display = 'none'
  // 显示备用文本元素
  const textElement = target.nextElementSibling
  if (textElement) {
    (textElement as HTMLElement).style.display = 'block'
  }
}

// 刷新事件
function onRefresh() {
  emit('refresh')
}
</script>

<template>
  <div class="asset-list">
    <div class="mb-3 flex items-center justify-between">
      <div class="font-bold">
        全部资产
      </div>
      <a-button
        :loading="loading"
        size="small"
        @click="onRefresh"
      >
        <SyncOutlined />刷新资产
      </a-button>
    </div>

    <template v-if="assets.length > 0">
      <a-card
        v-for="asset in assets"
        :key="asset.key"
        :bordered="false"
        class="currency-card mb-2"
        :body-style="{ padding: '12px' }"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <div
              class="asset-icon mr-3 h-8 w-8 flex items-center justify-center rounded-full text-lg font-bold"
              :style="{ backgroundColor: getBackgroundColor(asset.color) }"
            >
              <!-- 显示 logo 图片 (如果有) -->
              <img
                v-if="asset.logoUrl"
                :src="asset.logoUrl"
                :alt="`${asset.name} logo`"
                class="token-logo"
                @error="handleImageError"
              >
              <!-- 备用显示：代币首字母 -->
              <span 
                :style="{ display: asset.logoUrl ? 'none' : 'block' }"
                class="token-letter"
              >
                {{ asset.key.charAt(0) }}
              </span>
            </div>
            <div class="asset-info">
              <h3 class="font-medium text-sm mb-0">
                {{ asset.name }}
              </h3>
              <p class="text-gray-500 text-xs mb-0">
                {{ asset.balance }} {{ asset.key }}
              </p>
            </div>
          </div>
          <div class="text-right">
            <p class="font-bold mb-0">
              ${{ asset.value.toFixed(2) }}
            </p>
          </div>
        </div>
      </a-card>
    </template>

    <a-empty
      v-else
      class="my-8"
      description="暂无资产"
    >
      <template #extra>
        <a-button
          :loading="loading"
          type="primary"
          @click="onRefresh"
        >
          <SyncOutlined />刷新
        </a-button>
      </template>
    </a-empty>
  </div>
</template>

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
  min-width: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(0, 0, 0, 0.1);
  color: white;
  overflow: hidden;
}

.token-logo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.token-letter {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
}

/* 紧凑型资产信息样式 */
.asset-info {
  line-height: 1.2;
}
</style>
