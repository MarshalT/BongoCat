<template>
  <div v-if="visible" class="custom-modal">
    <div class="modal-backdrop" @click="onCancel"></div>
    <div class="modal-content" :style="{ maxWidth: width + 'px' }">
      <div class="modal-header">
        <h3>{{ title }}</h3>
        <button class="close-btn" @click="onCancel">&times;</button>
      </div>
      
      <div class="modal-body">
        <slot></slot>
      </div>
      
      <div class="modal-footer">
        <slot name="footer">
          <button class="cancel-btn" @click="onCancel">{{ cancelText }}</button>
          <button 
            class="submit-btn" 
            @click="onConfirm"
            :disabled="confirmDisabled"
          >
            {{ confirmText }}
          </button>
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 组件属性
interface Props {
  visible: boolean;
  title: string;
  width?: number;
  cancelText?: string;
  confirmText?: string;
  confirmDisabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  width: 500,
  cancelText: '取消',
  confirmText: '确定',
  confirmDisabled: false
});

// 定义事件
const emit = defineEmits<{
  (e: 'cancel'): void;
  (e: 'confirm'): void;
  (e: 'update:visible', visible: boolean): void;
}>();

// 取消事件
const onCancel = () => {
  emit('cancel');
  emit('update:visible', false);
};

// 确认事件
const onConfirm = () => {
  emit('confirm');
};
</script>

<style scoped>
.custom-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100000;
}

.modal-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
}

.modal-content {
  position: relative;
  width: 90%;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  z-index: 100001;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #999;
}

.modal-body {
  padding: 20px;
  max-height: 70vh;
  overflow-y: auto;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  padding: 12px 20px;
  border-top: 1px solid #f0f0f0;
  gap: 8px;
}

.cancel-btn {
  padding: 6px 15px;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  cursor: pointer;
}

.submit-btn {
  padding: 6px 15px;
  background: #1890ff;
  border: 1px solid #1890ff;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.submit-btn:hover:not(:disabled) {
  background: #40a9ff;
  border-color: #40a9ff;
}

.submit-btn:disabled {
  background: #bae7ff;
  border-color: #bae7ff;
  color: #fff;
  cursor: not-allowed;
  opacity: 0.7;
}
</style> 