<script setup lang="ts">
import {
  FilterOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, onMounted, ref } from 'vue'

import ProjectCard from './ProjectCard.vue'

import { getAllProjects } from '@/utils/tokenPrice'

// 项目列表数据
const projects = ref<any[]>([])
const loading = ref(false)
const searchQuery = ref('')
const sortBy = ref('volume') // 默认按成交量排序
const sortOrder = ref('desc') // 默认降序

// 排序选项
const sortOptions = [
  { label: '成交量(24H)', value: 'volume24h' },
  { label: '成交量', value: 'volume' },
  { label: '市值', value: 'marketCap' },
  { label: '轮次', value: 'round' },
]

// 筛选选项
const filterActive = ref(false)
const showHot = ref(true)

// 获取项目列表
async function fetchProjects() {
  loading.value = true
  try {
    const projectList = await getAllProjects()
    // 处理项目数据，添加所需字段
    projects.value = projectList.map((project) => {
      // 解析token信息
      const tokenParts = project.token_per_nft ? project.token_per_nft.split(' ') : ['0', '']
      const tokenSymbol = tokenParts.length > 1 ? tokenParts[1] : ''

      // 计算随机市值（实际应用中应该从API获取）
      const randomMarketCap = Math.floor(Math.random() * 100000) / 100
      const randomVolume = Math.floor(Math.random() * 100000) / 100
      const randomVolume24h = Math.floor(Math.random() * 10000) / 100

      return {
        ...project,
        tokenSymbol,
        marketCap: `$${randomMarketCap}`,
        volume: `$${randomVolume}`,
        volume24h: `$${randomVolume24h}`,
        transactions: Math.floor(Math.random() * 1000),
        round: `Round#${Math.floor(Math.random() * 100)}`,
        nextRound: {
          hours: Math.floor(Math.random() * 24),
          minutes: Math.floor(Math.random() * 60),
          seconds: Math.floor(Math.random() * 60),
        },
        isHot: Math.random() > 0.7, // 30%的项目标记为热门
      }
    })

    message.success(`已加载 ${projects.value.length} 个项目`)
  } catch (error) {
    console.error('获取项目列表失败:', error)
    message.error('获取项目列表失败')
  } finally {
    loading.value = false
  }
}

// 根据搜索和筛选条件过滤项目
const filteredProjects = computed(() => {
  let result = [...projects.value]

  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(project =>
      project.title?.toLowerCase().includes(query)
      || project.tokenSymbol?.toLowerCase().includes(query)
      || project.creator?.toLowerCase().includes(query)
      || project.description?.toLowerCase().includes(query),
    )
  }

  // 热门筛选
  if (filterActive.value && showHot.value) {
    result = result.filter(project => project.isHot)
  }

  // 排序
  result.sort((a, b) => {
    let valueA, valueB

    switch (sortBy.value) {
      case 'volume24h':
        valueA = Number.parseFloat(a.volume24h.replace('$', ''))
        valueB = Number.parseFloat(b.volume24h.replace('$', ''))
        break
      case 'volume':
        valueA = Number.parseFloat(a.volume.replace('$', ''))
        valueB = Number.parseFloat(b.volume.replace('$', ''))
        break
      case 'marketCap':
        valueA = Number.parseFloat(a.marketCap.replace('$', ''))
        valueB = Number.parseFloat(b.marketCap.replace('$', ''))
        break
      case 'round':
        valueA = Number.parseInt(a.round.replace('Round#', ''))
        valueB = Number.parseInt(b.round.replace('Round#', ''))
        break
      default:
        valueA = Number.parseFloat(a.volume.replace('$', ''))
        valueB = Number.parseFloat(b.volume.replace('$', ''))
    }

    return sortOrder.value === 'asc' ? valueA - valueB : valueB - valueA
  })

  return result
})

// 切换排序方式
function toggleSort(field: string) {
  if (sortBy.value === field) {
    // 如果已经是按这个字段排序，则切换排序顺序
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    // 否则切换排序字段，默认降序
    sortBy.value = field
    sortOrder.value = 'desc'
  }
}

// 切换筛选
function toggleFilter() {
  filterActive.value = !filterActive.value
}

onMounted(() => {
  fetchProjects()
})
</script>

<template>
  <div class="lunchpad-container">
    <div class="lunchpad-header">
      <h1 class="lunchpad-title">
        项目列表
      </h1>

      <div class="lunchpad-actions">
        <!-- 搜索框 -->
        <div class="search-bar">
          <SearchOutlined />
          <input
            v-model="searchQuery"
            placeholder="Search ID or Project Name"
            type="text"
          >
        </div>

        <!-- 排序选择器 -->
        <a-dropdown>
          <a-button>
            <template #icon>
              <FilterOutlined />
            </template>
            {{ sortOptions.find(option => option.value === sortBy)?.label || '成交量' }}
            <span v-if="sortOrder === 'asc'">↑</span>
            <span v-else>↓</span>
          </a-button>
          <template #overlay>
            <a-menu>
              <a-menu-item
                v-for="option in sortOptions"
                :key="option.value"
                @click="toggleSort(option.value)"
              >
                {{ option.label }}
                <span v-if="sortBy === option.value">
                  {{ sortOrder === 'asc' ? '↑' : '↓' }}
                </span>
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>

        <!-- 筛选按钮 -->
        <a-dropdown>
          <a-button :class="{ active: filterActive }">
            全部
            <FilterOutlined />
          </a-button>
          <template #overlay>
            <a-menu>
              <a-menu-item>
                <a-checkbox v-model:checked="showHot">
                  热门项目
                </a-checkbox>
              </a-menu-item>
              <a-menu-item @click="toggleFilter">
                应用筛选
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>

        <!-- 刷新按钮 -->
        <a-button
          :loading="loading"
          @click="fetchProjects"
        >
          <ReloadOutlined />
        </a-button>
      </div>
    </div>

    <!-- 项目列表 -->
    <div class="project-list">
      <a-spin :spinning="loading">
        <div
          v-if="filteredProjects.length === 0"
          class="no-projects"
        >
          <p>没有找到符合条件的项目</p>
        </div>

        <div
          v-else
          class="projects-grid"
        >
          <ProjectCard
            v-for="project in filteredProjects"
            :key="project.mid"
            :project="project"
          />
        </div>
      </a-spin>
    </div>
  </div>
</template>

<style scoped>
.lunchpad-container {
  background: #000;
  color: #fff;
  padding: 20px;
  border-radius: 12px;
}

.lunchpad-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.lunchpad-title {
  font-size: 24px;
  color: #fff;
  margin: 0;
}

.lunchpad-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.search-bar {
  display: flex;
  align-items: center;
  background: #111;
  border-radius: 20px;
  padding: 8px 16px;
  width: 300px;
}

.search-bar input {
  background: transparent;
  border: none;
  color: #fff;
  margin-left: 8px;
  width: 100%;
  outline: none;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.no-projects {
  text-align: center;
  padding: 40px;
  color: #999;
}

.active {
  background: #1677ff;
  color: white;
}

:deep(.ant-btn) {
  background: #222;
  border-color: #333;
  color: #fff;
}

:deep(.ant-btn:hover) {
  background: #333;
  border-color: #444;
  color: #fff;
}

:deep(.ant-dropdown-menu) {
  background: #222;
}

:deep(.ant-dropdown-menu-item) {
  color: #fff;
}

:deep(.ant-dropdown-menu-item:hover) {
  background: #333;
}

:deep(.ant-checkbox-wrapper) {
  color: #fff;
}
</style>
