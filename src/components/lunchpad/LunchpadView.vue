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
// 导入钱包hook以使用getTableRows方法
import { useWallet } from '@/composables/wallet/useWallet'

// 获取钱包实例
const wallet = useWallet()

// 项目列表数据
const projects = ref<any[]>([])
const loading = ref(false)
const searchQuery = ref('')
const sortBy = ref('newest') // 默认按最新排序
const sortOrder = ref('desc') // 默认降序

// 项目详情相关状态
const selectedProject = ref<any>(null)
const showProjectDetail = ref(false)
const projectDetails = ref<any[]>([])
const detailsLoading = ref(false)

// 排序选项
const sortOptions = [
  { label: '最新', value: 'newest' },
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

     // (new Date(log.create_time).getTime() / 1000) + 8 * 3600;


      
      const lastRoundDate = new Date(project.last_round);
      const lastRound = lastRoundDate.getTime() / 1000 + 8 * 3600;

      return {
        ...project,
        tokenSymbol,
        marketCap: `$${randomMarketCap}`,
        volume: `$${randomVolume}`,
        volume24h: `$${randomVolume24h}`,
        transactions: Math.floor(Math.random() * 1000),
        round: `Round#${project.round}`,
        // 保留 nextRound 字段以兼容旧代码，但实际计算将使用 last_round 和 sec_per_round
        nextRound: {
          hours: Math.floor(Math.random() * 24),
          minutes: Math.floor(Math.random() * 60),
          seconds: Math.floor(Math.random() * 60),
        },
        // 确保 last_round 字段存在
        last_round: lastRound,
        // 确保 sec_per_round 字段存在，默认为12小时（43200秒）
        sec_per_round: project.sec_per_round || 43200,
        isHot: Math.random() > 0.7, // 30%的项目标记为热门
      }
    })

    // 添加调试日志，输出项目数据结构
    console.log('项目列表数据结构示例:', projects.value.length > 0 ? projects.value[0] : '无数据')
    console.log('是否有id=244的项目:', projects.value.some(p => p.id === 244 || p.id === '244'))
    
    // 查找并输出id为244的项目
    const project244 = projects.value.find(p => 
      p.id !== undefined && p.id.toString() === '244'
    )
    console.log('找到的244项目:', project244 || '未找到')

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
    
    // 添加调试日志，输出搜索查询
    console.log('搜索查询:', query)
    
    result = result.filter(project =>
      // 只搜索项目ID(id)字段，确保将数值转换为字符串进行比较
      (project.id !== undefined && project.id.toString().includes(query)) ||
      project.title?.toLowerCase().includes(query) ||
      project.tokenSymbol?.toLowerCase().includes(query) ||
      project.creator?.toLowerCase().includes(query) ||
      project.description?.toLowerCase().includes(query)
    )
    
    // 添加调试日志，输出搜索结果
    console.log('搜索结果数量:', result.length)
    if (query === '244') {
      console.log('244搜索结果:', result)
    }
  }

  // 热门筛选
  if (filterActive.value && showHot.value) {
    result = result.filter(project => project.isHot)
  }

  // 排序
  // 添加调试日志，输出排序前的数据
  console.log('排序前的数据示例:', result.length > 0 ? result.slice(0, 5).map(p => ({ id: p.id, id_type: typeof p.id })) : '无数据')
  
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
      case 'newest':
        // 直接使用项目ID进行排序（假设ID越大表示越新）
        // 确保将id转换为数字类型进行比较
        valueA = a.id !== undefined ? Number(a.id) : 0
        valueB = b.id !== undefined ? Number(b.id) : 0
        break
      default:
        valueA = Number.parseFloat(a.volume.replace('$', ''))
        valueB = Number.parseFloat(b.volume.replace('$', ''))
    }

    return sortOrder.value === 'asc' ? valueA - valueB : valueB - valueA
  })

  // 添加调试日志，输出排序后的数据
  console.log('排序后的数据示例:', result.length > 0 ? result.slice(0, 5).map(p => ({ id: p.id, id_type: typeof p.id })) : '无数据')
  console.log('排序方式:', sortBy.value, '排序顺序:', sortOrder.value)
  
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

// 获取项目详情
async function fetchProjectDetails(project: any) {
  if (!wallet) {
    message.error('钱包未初始化')
    return
  }

  selectedProject.value = project
  detailsLoading.value = true
  showProjectDetail.value = true
  
  try {
    // 使用项目ID作为查询条件，使用id字段
    const pid = project.id || 244 // 使用id字段，默认使用244作为示例
    
    // 添加调试日志，输出项目信息
    console.log('获取详情的项目:', project)
    console.log('使用的项目ID:', pid)
    
    // 调用区块链API获取项目详情
    const result = await wallet.getTableRows(
      'dfs3protocol',       // code: 合约账户名
      'dfs3protocol',       // scope: 表的作用域
      'registry',           // table: 表名
      pid.toString(),       // lower_bound: 项目ID
      pid.toString(),       // upper_bound: 项目ID
      2,                    // index_position: 使用二级索引
      'i64',                // key_type: 索引键类型
      100,                  // limit: 最大结果数
      false                 // reverse: 不反转结果
    )
    
    console.log('获取到的原始数据:', result)
    
    if (result && Array.isArray(result)) {
      // 不需要额外筛选，因为我们已经使用了项目ID作为查询条件
      console.log('项目详情数据:', result);
      
      // 添加更多调试日志，输出数据结构
      if (result.length > 0) {
        console.log('第一条记录的字段:', Object.keys(result[0]));
        console.log('第一条记录的内容:', result[0]);
      }
      
      projectDetails.value = result;
      
      if (result.length > 0) {
        message.success(`已获取项目 #${pid} 的详情数据，共 ${result.length} 条记录`);
      } else {
        message.warning(`未找到项目 #${pid} 的详情数据`);
      }
    } else {
      projectDetails.value = []
      message.warning('未找到项目详情数据')
    }
  } catch (error) {
    console.error('获取项目详情失败:', error)
    message.error('获取项目详情失败')
    projectDetails.value = []
  } finally {
    detailsLoading.value = false
  }
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
            :key="project.id"
            :project="project"
            @click="fetchProjectDetails(project)"
          />
        </div>
      </a-spin>
    </div>
    
    <!-- 项目详情弹窗 -->
    <a-modal
      v-model:visible="showProjectDetail"
      :title="selectedProject ? `项目详情 #${selectedProject.id || ''}` : '项目详情'"
      width="800px"
      :footer="null"
      :maskClosable="true"
      class="project-detail-modal"
    >
      <a-spin :spinning="detailsLoading">
        <div v-if="projectDetails.length > 0" class="project-detail-content">
          <div class="project-header">
            <div class="project-logo-large">
              <img
                v-if="selectedProject?.logo_ipfs"
                :src="selectedProject.logo_ipfs"
                alt="项目Logo"
                class="logo-image"
              />
              <div v-else class="logo-placeholder-large">
                {{ selectedProject?.tokenSymbol?.[0] || 'P' }}
              </div>
            </div>
            <div class="project-info">
              <h2>{{ selectedProject?.title || `项目 #${selectedProject?.id || ''}` }}</h2>
              <p class="project-description">{{ selectedProject?.description || '暂无描述' }}</p>
              <div class="project-meta">
                <span class="meta-item">
                  <strong>创建者:</strong> {{ selectedProject?.creator || selectedProject?.owner || 'Unknown' }}
                </span>
                <span class="meta-item">
                  <strong>代币:</strong> {{ selectedProject?.tokenSymbol || 'Unknown' }}
                </span>
              </div>
            </div>
          </div>

          <a-divider />
          
          <h3>NFT列表</h3>
          <a-table
            :dataSource="projectDetails"
            :columns="[
              {
                title: 'ID',
                dataIndex: 'id',
                key: 'id',
                customRender: (obj) => {
                  return obj.text || '无';
                }
              },
              {
                title: 'NFT ID',
                dataIndex: 'cid',
                key: 'cid',
                customRender: (obj) => {
                  return obj.text || '无';
                }
              },
              {
                title: '项目ID',
                dataIndex: 'pid',
                key: 'pid',
                customRender: (obj) => {
                  return obj.text || '无';
                }
              },
              {
                title: '所有者',
                dataIndex: 'owner',
                key: 'owner',
                customRender: (obj) => {
                  return obj.text || '无';
                }
              },
              {
                title: '当前轮次',
                dataIndex: 'current_round',
                key: 'current_round',
                customRender: (obj) => {
                  return obj.text || '无';
                }
              },
              {
                title: '当前价格',
                dataIndex: 'current_price',
                key: 'current_price',
                customRender: (obj) => {
                  return obj.text || '无';
                }
              },
              {
                title: '最后交易',
                dataIndex: 'last_trade',
                key: 'last_trade',
                customRender: (obj) => {
                  return obj.text || '无';
                }
              },
              {
                title: '创建时间',
                dataIndex: 'create_time',
                key: 'create_time',
                customRender: (obj) => {
                  return obj.text ? new Date(obj.text).toLocaleString() : '无';
                }
              }
            ]"
            :pagination="{ pageSize: 10 }"
            :rowKey="record => String(record.id || Math.random())"
          />
        </div>
        <a-empty v-else description="暂无项目详情数据" />
        
        <div class="modal-footer">
          <a-button type="primary" @click="showProjectDetail = false">关闭</a-button>
          <a-button @click="() => { console.log('详情数据:', projectDetails); message.info('请查看控制台输出'); }" style="margin-left: 10px;">调试</a-button>
        </div>
        
        <!-- 添加调试信息显示区域 -->
        <div v-if="projectDetails.length > 0" class="debug-info" style="margin-top: 20px; padding: 10px; background-color: rgba(0,0,0,0.5); border-radius: 8px;">
          <h4>调试信息</h4>
          <div v-for="(item, index) in projectDetails.slice(0, 2)" :key="index" style="margin-bottom: 10px; border-bottom: 1px solid #977171; padding-bottom: 10px;">
            <div><strong>记录 #{{ index + 1 }}</strong></div>
            <div v-for="(value, key) in item" :key="key" style="display: flex;">
              <div style="width: 120px; font-weight: bold;">{{ key }}:</div>
              <div>{{ typeof value === 'object' ? JSON.stringify(value) : value }}</div>
            </div>
          </div>
          <div v-if="projectDetails.length > 2">... 更多记录 ...</div>
        </div>
      </a-spin>
    </a-modal>
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

/* 项目详情弹窗样式 */
:deep(.project-detail-modal) {
  width: 800px !important;
}

:deep(.project-detail-modal .ant-modal-content) {
  background-color: #a57a7a;
  border-radius: 12px;
  overflow: hidden;
}

:deep(.project-detail-modal .ant-modal-header) {
  background-color: #b48585;
  border-bottom: 1px solid #977171;
  padding: 16px 24px;
}

:deep(.project-detail-modal .ant-modal-title) {
  color: #fff;
  font-weight: bold;
  font-size: 18px;
}

:deep(.project-detail-modal .ant-modal-close) {
  color: #fff;
}

:deep(.project-detail-modal .ant-modal-body) {
  padding: 24px;
  max-height: 70vh;
  overflow-y: auto;
}

.project-header {
  display: flex;
  gap: 20px;
  margin-bottom: 24px;
}

.project-logo-large {
  width: 100px;
  height: 100px;
  border-radius: 16px;
  overflow: hidden;
  background-color: #333;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.logo-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.logo-placeholder-large {
  font-size: 48px;
  font-weight: bold;
  color: #fff;
}

.project-info {
  flex-grow: 1;
}

.project-info h2 {
  margin: 0 0 8px 0;
  color: #fff;
  font-size: 24px;
}

.project-description {
  color: #ddd;
  margin-bottom: 16px;
  font-size: 14px;
}

.project-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.meta-item {
  color: #ddd;
  font-size: 14px;
}

.meta-item strong {
  color: #fff;
}

.modal-footer {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
}

/* 表格样式 */
:deep(.ant-table) {
  background: transparent;
  color: #fff;
}

:deep(.ant-table-thead > tr > th) {
  background-color: #977171;
  color: #fff;
  border-bottom: 1px solid #977171;
}

:deep(.ant-table-tbody > tr > td) {
  border-bottom: 1px solid #977171;
  color: #fff;
  background-color: rgba(0, 0, 0, 0.3); /* 添加背景色，增强对比度 */
}

:deep(.ant-table-tbody > tr:hover > td) {
  background-color: rgba(255, 255, 255, 0.2); /* 悬停时背景色更亮 */
}

:deep(.ant-table-tbody > tr:nth-child(odd) > td) {
  background-color: rgba(0, 0, 0, 0.5); /* 奇数行更深的背景色 */
}

:deep(.ant-empty-description) {
  color: #ddd;
}

:deep(.ant-divider) {
  border-color: #977171;
}

:deep(.ant-pagination-item a) {
  color: #fff;
}

:deep(.ant-pagination-item-active) {
  background-color: #977171;
  border-color: #977171;
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

:deep(.ant-btn-primary) {
  background: #977171;
  border-color: #977171;
}

:deep(.ant-btn-primary:hover) {
  background: #b48585;
  border-color: #b48585;
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
