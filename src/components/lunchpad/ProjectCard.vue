<script setup lang="ts">
import {
  FireOutlined,
  HeartOutlined,
  SendOutlined,
  TwitterOutlined,
} from '@ant-design/icons-vue'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { info } from '@tauri-apps/plugin-log'
import { inf } from 'date-fns';
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
  // 模拟随机进度，实际项目中应根据实际数据计算
  return `${Math.floor(Math.random() * 100)}%`
})

// 使用响应式变量存储倒计时
const countdown = ref('00 : 00 : 00');
let countdownInterval: ReturnType<typeof setInterval> | null = null;
// 添加一个变量来跟踪项目是否已停止
const isStopped = ref(false);

// 计算下一轮时间
function calculateNextRound() {
  try {
    // 如果项目已经被标记为停止，直接返回停止状态
    if (isStopped.value) {
      return '已停止';
    }
    
    // 检查必要的属性是否存在
    if (!props.project.last_round || !props.project.sec_per_round) {
      return '00 : 00 : 00';
    }
    
    // 解析上一轮时间
    // 检查 last_round 是否已经是时间戳（秒）
    let lastRoundTimestamp;
    
    if (typeof props.project.last_round === 'number') {
      // 如果是数字，则认为已经是时间戳（秒）
      lastRoundTimestamp = props.project.last_round * 1000; // 转换为毫秒
    } else {
      // 如果是字符串，尝试解析为日期
      try {
        const lastRoundDate = new Date(props.project.last_round);
        if (isNaN(lastRoundDate.getTime())) {
          console.error('Invalid last_round date:', props.project.last_round);
          return '00 : 00 : 00';
        }
        lastRoundTimestamp = lastRoundDate.getTime();
      } catch (error) {
        console.error('Error parsing last_round:', error);
        return '00 : 00 : 00';
      }
    }
    
    if(props.project.isStop) {
      isStopped.value = true;
      return '已停止';
    }else{
      isStopped.value = false;
      // info(`项目 #${props.project.id} 的 isStop: ${props.project.isStop}`)
    }

    // 计算下一轮时间 = 上一轮时间 + 轮次间隔秒数
    const nextRoundDate = new Date(lastRoundTimestamp + props.project.sec_per_round * 1000);
    
 
    // 计算当前时间到下一轮的剩余时间（毫秒）
    const now = new Date();
    let remainingTime = nextRoundDate.getTime() - now.getTime();
    
    // 如果已经过了下一轮时间，则计算再下一轮
    if (remainingTime < 0) {
      // 计算已经过了多少个完整的轮次
      const passedRounds = Math.ceil(Math.abs(remainingTime) / (props.project.sec_per_round * 1000));
      // 计算实际的下一轮时间
      const actualNextRound = new Date(nextRoundDate.getTime() + passedRounds * props.project.sec_per_round * 1000);
      remainingTime = actualNextRound.getTime() - now.getTime();
    }
    
    // 转换为小时、分钟、秒
    const hours = Math.floor(remainingTime / (1000 * 60 * 60));
    const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);
    
    // 格式化输出
    return `${String(hours).padStart(2, '0')} : ${String(minutes).padStart(2, '0')} : ${String(seconds).padStart(2, '0')}`;
  } catch (error) {
    console.error('Error calculating next round time:', error);
    return '00 : 00 : 00';
  }
}

// 标记组件是否已卸载
let isComponentUnmounted = false;

// 更新倒计时
function updateCountdown() {
  if (!isComponentUnmounted) {
    // 获取当前倒计时状态
    const currentStatus = calculateNextRound();
    
    // 如果状态为"已停止"，则设置isStopped为true以确保状态持久化
    if (currentStatus === '已停止') {
      isStopped.value = true;
    }
    
    // 更新倒计时显示
    countdown.value = currentStatus;
    
    // 如果项目已停止，清除定时器
    if (isStopped.value && countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
      console.log(`项目 #${props.project.id} 倒计时已停止，清除定时器`);
    }
  }
}

// 组件挂载时启动倒计时
onMounted(() => {
  // 立即执行一次
  updateCountdown();
  
  // 设置定时器，每秒更新一次
  countdownInterval = setInterval(updateCountdown, 1000);
});

// 组件卸载时清除定时器
onUnmounted(() => {
  isComponentUnmounted = true;
  if (countdownInterval) {
    console.log('清除倒计时定时器:', props.project.id);
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
});

// 格式化的倒计时
const formattedNextRound = computed(() => {
  return countdown.value;
})

// 格式化交易费用百分比
const feePercent = computed(() => {
  return props.project.trade_fee_ratio/100 + '%'
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

</script>

<template>
  <div class="project-card" @click="$emit('click')">
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
            href="#"
            @click.stop
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
          {{ project.issuance || 0 }}
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
          {{ project.sec_per_round/3600 || '' }} Hours
        </div>

        <div class="stat-label">
          涨幅:
        </div>
        <div
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

    <!-- <div class="card-actions">
      <a-button class="action-btn" @click.stop>
        <TwitterOutlined />
      </a-button>
      <a-button class="action-btn" @click.stop>
        <HeartOutlined />
      </a-button>
      <a-button class="action-btn" @click.stop>
        <SendOutlined />
      </a-button>
      <a-button
        class="action-btn"
        type="primary"
        @click.stop
      >
        购买
      </a-button>
    </div> -->
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
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
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
