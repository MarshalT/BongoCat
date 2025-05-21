<script setup lang="ts">
import { CopyOutlined } from '@ant-design/icons-vue'
import QRCode from 'qrcode.vue'

// 组件属性
interface Props {
  value: string
  title?: string
  instructions?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  title: '扫描二维码接收DFS',
  instructions: () => ['扫描上方二维码向此钱包发送DFS', '或复制地址手动添加收款人'],
})

// 定义事件
const emit = defineEmits<{
  (e: 'copy', value: string): void
}>()

// 复制内容
function onCopy() {
  emit('copy', props.value)
}
</script>

<template>
  <div class="qr-code">
    <div class="qr-header">
      {{ title }}
    </div>
    <div class="qr-box">
      <QRCode
        class="qr-svg"
        level="M"
        :margin="0"
        render-as="svg"
        :size="200"
        :value="value"
      />
    </div>

    <div class="qr-address-container">
      <div class="qr-address-preview">
        {{ value }}
      </div>
      <button
        class="qr-copy-btn"
        @click="onCopy"
      >
        <CopyOutlined />
      </button>
    </div>

    <div class="qr-instructions">
      <p
        v-for="(instruction, index) in instructions"
        :key="index"
      >
        {{ instruction }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.qr-code {
  display: inline-block;
  background: white;
  padding: 16px;
  margin-bottom: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.qr-header {
  font-weight: 500;
  color: #333;
  margin-bottom: 12px;
  text-align: center;
}

.qr-box {
  width: 200px;
  height: 200px;
  margin: 0 auto;
  background-color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  padding: 4px;
}

.qr-svg {
  width: 100%;
  height: 100%;
}

.qr-address-container {
  display: flex;
  align-items: center;
  margin-top: 8px;
  background-color: #f9f9f9;
  padding: 6px 8px;
  border-radius: 4px;
  gap: 8px;
}

.qr-address-preview {
  flex: 1;
  font-size: 12px;
  color: #666;
  word-break: break-all;
  overflow: hidden;
  text-overflow: ellipsis;
}

.qr-copy-btn {
  padding: 4px 8px;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qr-copy-btn:hover {
  background: #f0f0f0;
  color: #1890ff;
}

.qr-copy-btn:active,
.qr-copy-active {
  background: #e6f7ff;
  color: #1890ff;
  border-color: #91d5ff;
  transform: scale(0.95);
}

.qr-instructions {
  margin-top: 12px;
  font-size: 14px;
  color: #666;
  text-align: center;
}

.qr-instructions p {
  margin: 4px 0;
  line-height: 1.4;
}
</style>
