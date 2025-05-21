<script setup lang="ts">
import { CopyOutlined, SyncOutlined } from '@ant-design/icons-vue'
import { ref } from 'vue'

// 组件属性
interface Props {
  balance: string
  address: string
  isLocked?: boolean
  dfsPrice: number
}

const props = defineProps<Props>()
// 定义事件
const emit = defineEmits<{
  (e: 'copy', address: string): void
  (e: 'exportPrivateKey'): void
  (e: 'refreshPrice'): void
}>()

const isRefreshing = ref(false)

// 复制地址
function onCopy() {
  emit('copy', props.address)
}

// 导出私钥
function onExportPrivateKey() {
  emit('exportPrivateKey')
}

// 刷新价格
async function onRefreshPrice() {
  isRefreshing.value = true
  emit('refreshPrice')
  setTimeout(() => {
    isRefreshing.value = false
  }, 1500)
}
</script>

<template>
  <a-card
    :bordered="false"
    class="wallet-summary mb-6"
  >
    <div class="flex justify-between">
      <div>
        <p class="mb-1 text-gray-500">
          账户资产(USDT)
        </p>
        <h1 class="text-2xl font-bold">
          ${{ balance }}
        </h1>
        <p class="text-sm">
          DFS价格: ${{ dfsPrice.toFixed(2) }}
          <a-tooltip title="刷新价格">
            <SyncOutlined
              class="ml-1 cursor-pointer"
              :spin="isRefreshing"
              @click="onRefreshPrice"
            />
          </a-tooltip>
        </p>
        <!-- <p v-if="isLocked" class="text-sm text-red-500 mt-1">
          <LockOutlined class="mr-1" />钱包已锁定
        </p> -->
      </div>
      <div class="flex items-center">
        <div
          class="address-container flex items-center rounded-full bg-gray-100 p-2"
          :class="{ 'address-locked': isLocked }"
        >
          <span
            class="address-text mr-1 text-sm"
            @click="onExportPrivateKey"
          >{{ address }}</span>
          <div class="address-actions">
            <a-button
              size="small"
              title="复制地址"
              type="text"
              @click="onCopy"
            >
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
