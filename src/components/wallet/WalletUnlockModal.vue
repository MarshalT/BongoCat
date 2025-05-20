<template>
  <a-modal
    :open="visible"
    title="解锁钱包"
    :mask-closable="false"
    :closable="false"
    :keyboard="false"
    ok-text="解锁"
    cancel-text="取消"
    @ok="handleUnlock"
    @cancel="handleCancel"
    :confirm-loading="loading"
  >
    <div class="unlock-form">
      <div class="form-group">
        <label>钱包密码</label>
        <a-input-password
          v-model:value="password"
          placeholder="请输入钱包密码"
          @press-enter="handleUnlock"
          class="form-input"
        />
      </div>
      
      <div class="hint-text" v-if="passwordHint">
        <span>密码提示：{{ passwordHint }}</span>
      </div>
      
      <div class="error-text" v-if="errorMessage">
        {{ errorMessage }}
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits, watch } from 'vue';

const props = defineProps<{
  visible: boolean;
}>();

const emits = defineEmits<{
  (e: 'update:visible', visible: boolean): void;
  (e: 'unlock', password: string): void;
}>();

const password = ref('');
const errorMessage = ref('');
const loading = ref(false);
const passwordHint = ref('');

// 监听visible变化，当变为true时，加载密码提示
watch(() => props.visible, (newValue) => {
  if (newValue) {
    password.value = '';
    errorMessage.value = '';
    loading.value = false;
    // 获取密码提示
    passwordHint.value = localStorage.getItem('bongo-cat-wallet-password-hint') || '';
    console.log('WalletUnlockModal visible changed:', newValue);
  }
});

// 处理解锁
const handleUnlock = async () => {
  console.log('解锁按钮点击');
  if (!password.value) {
    errorMessage.value = '请输入密码';
    return;
  }
  
  try {
    loading.value = true;
    errorMessage.value = '';
    
    // 发送解锁事件
    emits('unlock', password.value);
  } catch (error) {
    console.error('解锁失败:', error);
    errorMessage.value = error instanceof Error ? error.message : '解锁失败';
  } finally {
    loading.value = false;
  }
};

// 处理关闭对话框
const handleCancel = () => {
  console.log('取消按钮点击');
  emits('update:visible', false);
};
</script>

<style scoped>
.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
}

.form-input {
  width: 100%;
}

.error-text {
  color: #ff4d4f;
  margin-top: 8px;
}

.hint-text {
  color: #666;
  font-size: 12px;
  margin-top: 4px;
}
</style> 