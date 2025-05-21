<script setup lang="ts">
import { reactive, watch } from 'vue'

// 定义资产类型
interface Asset {
  key: string
  name: string
  balance: string
  value: number
  color: string
}

// 定义表单类型
interface TokenForm {
  recipient: string
  amount: string
  currency: string
  memo: string
}

// 组件属性
interface Props {
  availableBalance: string
  assets: Asset[]
}

const props = withDefaults(defineProps<Props>(), {
  assets: () => [],
})

// 定义事件
const emit = defineEmits<{
  (e: 'update:form', form: TokenForm): void
  (e: 'validate'): boolean
}>()

// 表单状态
const form = reactive<TokenForm>({
  recipient: '',
  amount: '',
  currency: 'DFS',
  memo: '',
})

// 监听表单变化
watch(form, () => {
  emit('update:form', form)
}, { deep: true })

// 获取选定资产的可用余额
function getAvailableBalance(currency: string): string {
  const asset = props.assets.find(a => a.key === currency)
  if (asset) {
    return `${asset.balance} ${currency}`
  }
  return currency === 'DFS' ? `${props.availableBalance} DFS` : '0'
}

// 设置最大金额
function setMaxAmount() {
  const asset = props.assets.find(a => a.key === form.currency)
  if (asset) {
    form.amount = asset.balance
  } else if (form.currency === 'DFS') {
    form.amount = props.availableBalance
  }
}

// 表单验证
function validate(): boolean {
  if (!form.recipient) {
    return false
  }

  if (!form.amount || Number.parseFloat(form.amount) <= 0) {
    return false
  }

  // 检查余额是否足够
  const asset = props.assets.find(a => a.key === form.currency)
  const availableBalance = asset
    ? Number.parseFloat(asset.balance)
    : (form.currency === 'DFS' ? Number.parseFloat(props.availableBalance) : 0)

  if (Number.parseFloat(form.amount) > availableBalance) {
    return false
  }

  return true
}

// 向外暴露验证方法和表单
defineExpose({
  validate,
  form,
})
</script>

<template>
  <div class="send-token-form">
    <div class="form-group">
      <label>选择资产</label>
      <select
        v-model="form.currency"
        class="form-input"
      >
        <option
          v-for="asset in assets"
          :key="asset.key"
          :value="asset.key"
        >
          {{ asset.name }} ({{ asset.balance }} {{ asset.key }})
        </option>
      </select>
    </div>

    <div class="form-group">
      <label>接收地址</label>
      <input
        v-model="form.recipient"
        class="form-input"
        placeholder="输入接收地址"
      >
      <div class="form-help">
        DFS地址格式: accountname1235 (12个字符，仅支持a-z、1-5和点号)
      </div>
    </div>

    <div class="form-group">
      <label>数量</label>
      <input
        v-model="form.amount"
        class="form-input"
        placeholder="0.00000000"
      >
      <div class="form-help-row">
        <span>可用: {{ getAvailableBalance(form.currency) }}</span>
        <a
          class="link"
          @click="setMaxAmount"
        >最大</a>
      </div>
    </div>

    <div class="form-group">
      <label>备注 (可选)</label>
      <input
        v-model="form.memo"
        class="form-input"
        placeholder="交易备注信息"
      >
    </div>
  </div>
</template>

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
