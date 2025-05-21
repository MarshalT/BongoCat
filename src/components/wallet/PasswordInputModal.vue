<script setup lang="ts">
import { defineEmits, defineProps, ref, watch } from 'vue'

const props = defineProps<{
  visible: boolean
  title?: string
  prompt?: string
}>()

const emits = defineEmits<{
  (e: 'update:visible', visible: boolean): void
  (e: 'confirm', password: string): void
  (e: 'cancel'): void
}>()

const password = ref('')
const loading = ref(false)

// 监听visible变化，当变为true时重置
watch(() => props.visible, (newValue) => {
  if (newValue) {
    password.value = ''
    loading.value = false
  }
})

// 处理确认
function handleConfirm() {
  if (!password.value) {
    return
  }

  loading.value = true
  try {
    // 发送确认事件
    emits('confirm', password.value)
  } finally {
    loading.value = false
    // 不在此处关闭对话框，由父组件控制
  }
}

// 处理取消
function handleCancel() {
  emits('cancel')
  emits('update:visible', false)
}
</script>

<template>
  <a-modal
    :title="title || '请输入密码'"
    :open="visible"
    :confirm-loading="loading"
    ok-text="确认"
    cancel-text="取消"
    @ok="handleConfirm"
    @cancel="handleCancel"
    :z-index="200000"
    :mask-style="{ zIndex: 199999 }"
    class="password-input-modal"
    getContainer="body"
    :destroyOnClose="true"
  >
    <div class="password-modal-content">
      <p v-if="prompt" class="prompt-text">{{ prompt }}</p>
      
      <a-input-password
        v-model:value="password"
        placeholder="请输入密码"
        @press-enter="handleConfirm"
      />
    </div>
  </a-modal>
</template>

<style scoped>
.password-modal-content {
  padding: 8px 0;
}

.prompt-text {
  margin-bottom: 16px;
  color: #555;
}

:deep(.password-input-modal) {
  z-index: 200000 !important;
}

:deep(.ant-modal-mask) {
  z-index: 199999 !important;
}

:deep(.ant-modal-wrap) {
  z-index: 200000 !important;
}
</style> 