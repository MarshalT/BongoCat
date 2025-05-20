<template>
  <div class="send-token-form">
    <div class="form-group">
      <label>接收地址</label>
      <input v-model="form.recipient" placeholder="输入DFS接收地址" class="form-input" />
      <div class="form-help">DFS地址格式: accountname1235 (12个字符，仅支持a-z、1-5和点号)</div>
    </div>
    
    <div class="form-group">
      <label>数量</label>
      <input v-model="form.amount" placeholder="0.00000000" class="form-input" />
      <div class="form-help-row">
        <span>可用: {{ availableBalance }} DFS</span>
        <a class="link" @click="setMaxAmount">最大</a>
      </div>
    </div>
    
    <div class="form-group">
      <label>备注 (可选)</label>
      <input v-model="form.memo" placeholder="交易备注信息" class="form-input" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue';

// 组件属性
interface Props {
  availableBalance: string;
}

const props = defineProps<Props>();

// 表单状态
const form = reactive({
  recipient: '',
  amount: '',
  currency: 'DFS',
  memo: ''
});

// 定义事件
const emit = defineEmits<{
  (e: 'update:form', form: typeof form): void;
  (e: 'validate'): boolean;
}>();

// 监听表单变化
watch(form, () => {
  emit('update:form', form);
}, { deep: true });

// 设置最大金额
const setMaxAmount = () => {
  form.amount = props.availableBalance;
};

// 表单验证
const validate = (): boolean => {
  if (!form.recipient) {
    return false;
  }
  
  if (!form.amount || parseFloat(form.amount) <= 0) {
    return false;
  }
  
  if (parseFloat(form.amount) > parseFloat(props.availableBalance)) {
    return false;
  }
  
  return true;
};

// 向外暴露验证方法
defineExpose({
  validate,
  form
});
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
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 14px;
}

.form-help {
  margin-top: 4px;
  color: #999;
  font-size: 12px;
}

.form-help-row {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  color: #999;
  font-size: 12px;
}

.link {
  color: #1890ff;
  cursor: pointer;
}
</style> 