<script setup lang="ts">
import {
  FireOutlined,
} from '@ant-design/icons-vue'
import { computed, onMounted, onUnmounted, ref } from 'vue'

// 导入时间工具函数
import { calculateProgress, calculateNextRound, formatTimeRemaining, parseTime } from '@/utils/timetool'

const props = defineProps({
  project: {
    type: Object,
    required: true,
  },
})

// 格式化项目编号为"#123"格式
const projectId = computed(() => {
  // 优先显示pid，如果不存在则显示mid
  if (props.project.id !== undefined) {
    return `#${props.project.id}`
  }
  return '#?'
})

// 根据项目排名着色，前3名特殊颜色
const rankColor = computed(() => {
  const mid = props.project.mid
  if (mid === 1) return 'bg-gradient-to-r from-yellow-400 to-yellow-600' // 金色
  if (mid === 2) return 'bg-gradient-to-r from-gray-300 to-gray-500' // 银色
  if (mid === 3) return 'bg-gradient-to-r from-amber-600 to-amber-800' // 铜色
  return ''
})

// 计算进度条宽度百分比
const progressPercent = computed(() => {
  try {
    // 如果项目已停止，进度条显示为满的（100%）
    if (isStopped.value || props.project.isStop) {
      return '100%'
    }

    // 检查必要的属性是否存在
    if (!props.project.last_round || !props.project.sec_per_round) {
      return '0%'
    }

    // 解析上一轮时间，使用parseTime函数统一处理
    const lastRoundTimestamp = parseTime(props.project.last_round)
    
    // 计算轮次周期（毫秒）
    const roundDurationMs = props.project.sec_per_round * 1000
    
    // 使用calculateProgress计算进度百分比
    return calculateProgress(lastRoundTimestamp, roundDurationMs)
  } catch (error) {
    console.error('Error calculating progress percent:', error)
    return '0%'
  }
})

// 使用响应式变量存储倒计时
const countdown = ref('00 : 00 : 00')
let countdownInterval: ReturnType<typeof setInterval> | null = null
// 添加一个变量来跟踪项目是否已停止
const isStopped = ref(false)

// 计算下一轮时间
function calculateNextRoundTime() {
  try {
    // 如果项目已经被标记为停止，直接返回停止状态
    if (isStopped.value) {
      return '已停止'
    }

    // 检查必要的属性是否存在
    if (!props.project.last_round || !props.project.sec_per_round) {
      return '00 : 00 : 00'
    }

    // 解析上一轮时间，使用parseTime函数统一处理
    const lastRoundTimestamp = parseTime(props.project.last_round)

    if (props.project.isStop) {
      isStopped.value = true
      return '已停止'
    } else {
      isStopped.value = false
    }

    // 计算轮次周期（毫秒）
    const roundDurationMs = props.project.sec_per_round * 1000

    // 使用calculateNextRound计算下一轮时间
    const nextRoundTimestamp = calculateNextRound(lastRoundTimestamp, roundDurationMs)
    
    // 计算当前时间到下一轮的剩余时间（毫秒）
    const now = Date.now()
    const remainingTime = nextRoundTimestamp - now
    
    // 使用formatTimeRemaining格式化剩余时间
    return formatTimeRemaining(remainingTime)
  } catch (error) {
    console.error('Error calculating next round time:', error)
    return '00 : 00 : 00'
  }
}

// 标记组件是否已卸载
let isComponentUnmounted = false

// 更新倒计时
function updateCountdown() {
  if (!isComponentUnmounted) {
    // 获取当前倒计时状态
    const currentStatus = calculateNextRoundTime()

    // 如果状态为"已停止"，则设置isStopped为true以确保状态持久化
    if (currentStatus === '已停止') {
      isStopped.value = true
    }

    // 更新倒计时显示
    countdown.value = currentStatus

    // 如果项目已停止，清除定时器
    if (isStopped.value && countdownInterval) {
      clearInterval(countdownInterval)
      countdownInterval = null
      console.log(`项目 #${props.project.id} 倒计时已停止，清除定时器`)
    }
  }
}

// 组件挂载时启动倒计时
onMounted(() => {
  // 立即执行一次
  updateCountdown()

  // 设置定时器，每秒更新一次
  countdownInterval = setInterval(updateCountdown, 1000)
})

// 组件卸载时清除定时器
onUnmounted(() => {
  isComponentUnmounted = true
  if (countdownInterval) {
    console.log('清除倒计时定时器:', props.project.id)
    clearInterval(countdownInterval)
    countdownInterval = null
  }
})

// 格式化的倒计时
const formattedNextRound = computed(() => {
  return countdown.value
})

// 格式化交易费用百分比
const feePercent = computed(() => {
  return `${props.project.trade_fee_ratio / 100}%`
})

// 格式化涨跌幅
const priceChangePercent = computed(() => {
  try {
    const change = ((props.project.increase_per_round / 100) - 1) * 100
    // 格式化为保留两位小数
    return `${change.toFixed(2)}%`
  } catch (error) {
    return '0.00%'
  }
})

// 处理创建者链接点击
function handleCreatorClick(event: MouseEvent) {
  // 阻止事件冒泡，防止触发卡片的点击事件
  event.stopPropagation()
  
  // 获取创建者地址
  const creatorAddress = props.project.creator || props.project.owner || ''
  
  // 如果有创建者地址，打开新窗口
  if (creatorAddress) {
    window.open(`https://www.dfsmoon.com/account/${creatorAddress}`, '_blank')
  }
}

const formatNumber = (value: number) => {
  if (!value) return '0'
  return value.toLocaleString('en-US', {
    maximumFractionDigits: 0,
    style: 'currency',
    currency: 'USD',
    currencyDisplay: 'narrowSymbol'
  }).replace('$', '') // 显示为纯数字格式
}
</script>

<template>
  <div
    class="project-card"
    @click="$emit('click')"
  >
    <div class="card-header">
      <div class="project-logo">
        <img
          v-if="project.nft_img"
          alt="Project Logo"
          class="logo-image"
          :src="project.nft_img"
        >
        <div
          v-else
          class="logo-placeholder"
        >
          {{ project.tokenSymbol?.[0] || 'P' }}
        </div>
      </div>

      <div class="project-title">
        <div class="title-row">
          <h3
            class="project-id"
            :class="[rankColor]"
          >
            {{ projectId }} {{ project.tokenSymbol || 'Token' }}
          </h3>
          <FireOutlined
            v-if="project.isHot"
            class="hot-icon"
          />
        </div>

        <div class="creator">
          创建者: <a
            class="creator-link"
            :href="`https://www.dfsmoon.com/account/${project.creator || project.owner || ''}`"
            target="_blank"
            @click.stop="handleCreatorClick"
          >{{ project.creator || project.owner || 'Unknown' }}</a>
        </div>

        <div class="description">
          {{ project.desc || '' }}
        </div>
      </div>
    </div>

    <div class="card-progress">
      <div class="round-info">
        <div class="current-round">
          {{ project.round || 'Round#1' }} next round:
        </div>
        <div
          class="countdown"
          :class="{ 'countdown-stopped': formattedNextRound === '已停止' }"
        >
          {{ formattedNextRound }}
        </div>
      </div>

      <div class="progress-bar">
        <div
          class="progress-inner"
          :style="{ width: progressPercent }"
        />
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-label">市值:</div>
      <div class="stat-value">{{ project.marketCap || '$0.00' }}</div>
      <div class="stat-label">成交量:</div>
      <div class="stat-value">{{ formatNumber(project.volume || 0) }}</div>
      <div class="stat-label">TXS:</div>
      <div class="stat-value">{{ formatNumber(project.transactions || 0) }}</div>

      <div class="stat-label">发行量:</div>
      <div class="stat-value">{{ project.issuance || 0 }}</div>
      <div class="stat-label">成交量(24H):</div>
      <div class="stat-value">{{ project.volume24h || '$0.00' }}</div>
      <div class="stat-label">24H TXS:</div>
      <div class="stat-value">{{ project.transactions24h || 0 }}</div>

      <div class="stat-label">每轮:</div>
      <div class="stat-value">{{ project.sec_per_round / 3600 || '' }} Hours</div>
      <div class="stat-label">涨幅:</div>
      <div class="stat-value">{{ priceChangePercent }}</div>
      <div class="stat-label">手续费:</div>
      <div class="stat-value">{{ feePercent }}</div>

      <div class="stat-label">奖池:</div>
      <div class="stat-value">{{ project.rewardPool || '$0' }}</div>
      <div class="stat-label">资金池:</div>
      <div class="stat-value">{{ project.fundingPool || '0.00 / 0.00' }}</div>
      <div class="stat-label"></div>
      <div class="stat-value"></div>
    </div>
  </div>
</template>

<style scoped>
.project-card {
  background: linear-gradient(145deg, #121212 0%, #000000 100%);
  border: 1px solid #333;
  border-radius: 12px;
  overflow: hidden;
  padding: 16px;
  position: relative;
  transition: all 0.3s ease;
  cursor: pointer; /* 添加指针样式，表示可点击 */
}

.project-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  border-color: #444;
}

.card-header {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.project-logo {
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  border-radius: 12px;
  overflow: hidden;
  background-color: #333;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.logo-placeholder {
  font-size: 32px;
  font-weight: bold;
  color: #fff;
}

.project-title {
  flex-grow: 1;
  overflow: hidden;
}

.title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.project-id {
  font-size: 18px;
  font-weight: bold;
  margin: 0;
  color: #fff;
  padding: 2px 6px;
  border-radius: 4px;
}

.hot-icon {
  color: #ff4d4f;
  font-size: 18px;
}

.creator {
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.creator-link {
  color: #1677ff;
  text-decoration: none;
}

.creator-link:hover {
  text-decoration: underline;
}

.description {
  font-size: 12px;
  color: #bbb;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-progress {
  margin-bottom: 16px;
}

.round-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
}

.current-round {
  color: #bbb;
}

.countdown {
  color: #1677ff;
  font-weight: bold;
}

.countdown-stopped {
  color: #ff4d4f;
  font-weight: bold;
  animation: blink 1.5s infinite;
}

@keyframes blink {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}

.progress-bar {
  height: 6px;
  background-color: #333;
  border-radius: 3px;
  overflow: hidden;
}

.progress-inner {
  height: 100%;
  background: linear-gradient(90deg, #1677ff, #4096ff);
  border-radius: 3px;
}

/* 新的网格布局统计样式 */
.stats-grid {
  display: grid;
  grid-template-columns: auto minmax(40px, 70px) auto minmax(40px, 70px) auto minmax(40px, 70px);
  grid-gap: 4px 8px;
  margin-bottom: 16px;
  align-items: baseline;
  font-size: 13px;
}

.stat-label {
  color: #999;
  white-space: nowrap;
  justify-self: end;
}

.stat-value {
  color: #fff;
  font-weight: 500;
  justify-self: start;
  font-family: 'Roboto Mono', monospace;
  white-space: nowrap;
}

.card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.action-btn {
  min-width: 36px;
  height: 36px;
  padding: 0 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
