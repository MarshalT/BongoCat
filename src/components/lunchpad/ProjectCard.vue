<script setup lang="ts">
import {
  FireOutlined,
  HeartOutlined,
  SendOutlined,
  TwitterOutlined,
} from '@ant-design/icons-vue'
import { computed } from 'vue'

const props = defineProps({
  project: {
    type: Object,
    required: true,
  },
})

// 格式化项目编号为"#123"格式
const projectId = computed(() => {
  return `#${props.project.mid}`
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
  // 模拟随机进度，实际项目中应根据实际数据计算
  return `${Math.floor(Math.random() * 100)}%`
})

// 格式化下一轮时间
const formattedNextRound = computed(() => {
  const { hours, minutes, seconds } = props.project.nextRound
  return `${String(hours).padStart(2, '0')} : ${String(minutes).padStart(2, '0')} : ${String(seconds).padStart(2, '0')}`
})

// 格式化交易费用百分比
const feePercent = computed(() => {
  // 模拟随机费率，实际项目中应根据实际数据计算
  return `${(Math.random() * 10).toFixed(2)}%`
})

// 格式化涨跌幅
const priceChangePercent = computed(() => {
  // 模拟随机涨跌幅，实际项目中应根据实际数据计算
  const change = (Math.random() * 20 - 10).toFixed(0)
  return `${change}%`
})

// 判断涨跌色彩
const priceChangeColor = computed(() => {
  const change = Number.parseFloat(priceChangePercent.value)
  return change >= 0 ? 'text-green-500' : 'text-red-500'
})
</script>

<template>
  <div class="project-card">
    <div class="card-header">
      <div class="project-logo">
        <img
          v-if="project.logo_ipfs"
          alt="Project Logo"
          class="logo-image"
          :src="project.logo_ipfs"
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
            href="#"
          >{{ project.creator || project.owner || 'Unknown' }}</a>
        </div>

        <div class="description">
          {{ project.description || '测试项目 BongoCat 是一个可爱的互动小游戏' }}
        </div>
      </div>
    </div>

    <div class="card-progress">
      <div class="round-info">
        <div class="current-round">
          {{ project.round || 'Round#1' }} next round:
        </div>
        <div class="countdown">
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

    <div class="card-stats">
      <div class="stat-row">
        <div class="stat-label">
          市值:
        </div>
        <div class="stat-value">
          {{ project.marketCap || '$0.00' }}
        </div>

        <div class="stat-label">
          成交量:
        </div>
        <div class="stat-value">
          {{ project.volume || '$0.00' }}
        </div>

        <div class="stat-label">
          TXS:
        </div>
        <div class="stat-value">
          {{ project.transactions || 0 }}
        </div>
      </div>

      <div class="stat-row">
        <div class="stat-label">
          发行量:
        </div>
        <div class="stat-value">
          {{ project.issuance || 10 }}
        </div>

        <div class="stat-label">
          成交量(24H):
        </div>
        <div class="stat-value">
          {{ project.volume24h || '$0.00' }}
        </div>

        <div class="stat-label">
          24H TXS:
        </div>
        <div class="stat-value">
          {{ project.transactions24h || 0 }}
        </div>
      </div>

      <div class="stat-row">
        <div class="stat-label">
          每轮:
        </div>
        <div class="stat-value">
          {{ project.roundInterval || '12 Hours' }}
        </div>

        <div class="stat-label">
          涨幅:
        </div>
        <div
          class="stat-value"
          :class="priceChangeColor"
        >
          {{ priceChangePercent }}
        </div>

        <div class="stat-label">
          手续费:
        </div>
        <div class="stat-value">
          {{ feePercent }}
        </div>
      </div>

      <div class="stat-row">
        <div class="stat-label">
          奖池:
        </div>
        <div class="stat-value">
          {{ project.rewardPool || '$0' }}
        </div>

        <div class="stat-label">
          资金池:
        </div>
        <div class="stat-value">
          {{ project.fundingPool || '0.00 / 0.00' }}
        </div>
      </div>
    </div>

    <div class="card-actions">
      <a-button class="action-btn">
        <TwitterOutlined />
      </a-button>
      <a-button class="action-btn">
        <HeartOutlined />
      </a-button>
      <a-button class="action-btn">
        <SendOutlined />
      </a-button>
      <a-button
        class="action-btn"
        type="primary"
      >
        购买
      </a-button>
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

.card-stats {
  margin-bottom: 16px;
}

.stat-row {
  display: grid;
  grid-template-columns: auto 1fr auto 1fr auto 1fr;
  gap: 8px;
  align-items: center;
  margin-bottom: 4px;
  font-size: 12px;
}

.stat-label {
  color: #999;
}

.stat-value {
  color: #fff;
  font-weight: 500;
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
