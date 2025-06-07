<script setup lang="ts">
// @ts-ignore
import {
  FilterOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue'
import { info } from '@tauri-apps/plugin-log'
import { message } from 'ant-design-vue'
import { computed, onMounted, ref } from 'vue'

import MyNFTView from './MyNFTView.vue'
import ProjectCard from './ProjectCard.vue'
import ProjectDetailModal from './ProjectDetailModal.vue'

// 导入钱包hook以使用getTableRows方法
import { useWallet } from '@/composables/wallet/useWallet'
// 导入购买NFT函数
import { executeBatchBuy, executeBuyNftByid } from '@/utils/buynft'
import { getAllProjects } from '@/utils/tokenPrice'

// 导入我的NFT视图组件

// 获取钱包实例
const wallet = useWallet()

// 项目列表数据
const projects = ref<any[]>([])
const loading = ref(false)
const searchQuery = ref('')
const sortBy = ref('newest') // 默认按最新排序
const sortOrder = ref('desc') // 默认降序

// 视图切换状态
const currentView = ref<'projects' | 'myNfts'>('projects')

// 创建对MyNFTView组件的引用
// 定义组件实例类型，包含refreshNfts方法
interface MyNFTViewInstance {
  refreshNfts: () => void
}
const myNFTViewRef = ref<MyNFTViewInstance | null>(null)

// 项目详情相关状态
const selectedProject = ref<any>(null)
const showProjectDetail = ref(false)
const projectDetails = ref<any[]>([])
const detailsLoading = ref(false)

// 交易量数据
const txsData = ref<Record<string, any>>({})
const txsLoading = ref(false)

// 奖池数据
const rewardPoolsData = ref<Record<string, any>>({})
const rewardPoolsLoading = ref(false)

// 资金池数据
const fundingPoolsData = ref<Record<string, any>>({})
const fundingPoolsLoading = ref(false)

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

// 定义表格列的类型
interface TableColumnRenderProps {
  text: any
  record: any
  index: number
}

// 获取项目列表
async function fetchProjects() {
  loading.value = true
  try {
    // 并行获取所有数据
    await Promise.all([
      fetchTransactionData(),
      fetchRewardPoolsData(),
      fetchFundingPoolsData(),
    ])

    const projectList = await getAllProjects()

    // 处理项目数据，添加所需字段
    const processedProjects = []

    // 对每个项目获取 registry 表中的数据条数
    for (const project of projectList) {

      //只显示 244  1 2 66 115   109
      if (project.id != 244 && project.id != 1 && project.id != 2 && project.id != 66 && project.id != 115 && project.id != 109) {
        continue
      }
      // 解析token信息
      const tokenParts = project.token_per_nft ? project.token_per_nft.split(' ') : ['0', '']
      const tokenSymbol = tokenParts.length > 1 ? tokenParts[1] : ''

      // 获取交易量数据
      const projectTxs = txsData.value[project.id]
      const transactions = projectTxs ? projectTxs.total_txs : 0
      const transactions24h = projectTxs ? projectTxs.txs_24 : 0
      const volume = projectTxs ? projectTxs.total_volume : 0
      const volume24h = projectTxs ? projectTxs.volume_24h : 0

      // 获取奖池数据
      const rewardPool = rewardPoolsData.value[project.id] || []
      let rewardPoolFormatted = '$0'
      if (rewardPool && rewardPool.length > 0) {
        // 找到DFS代币的奖池
        const dfsReward = rewardPool.find((item: any) => item.cnt === 'eosio.token' && item.balance.includes('DFS'))
        if (dfsReward) {
          const dfsAmount = Number.parseFloat(dfsReward.balance.split(' ')[0])
          rewardPoolFormatted = `$${dfsAmount.toFixed(2)}`
        }
      }

      // 获取资金池数据
      const fundingPool = fundingPoolsData.value[project.mid]
      let fundingPoolFormatted = '0.00 / 0.00'
      if (fundingPool) {
        const reserve0 = fundingPool.reserve0 ? fundingPool.reserve0.split(' ')[0] : '0.00'
        const reserve1 = fundingPool.reserve1 ? fundingPool.reserve1.split(' ')[0] : '0.00'
        // 符号
        const symbol0 = fundingPool.reserve0 ? fundingPool.reserve0.split(' ')[1] : ''
        const symbol1 = fundingPool.reserve1 ? fundingPool.reserve1.split(' ')[1] : ''
        fundingPoolFormatted = `${Number(reserve0).toFixed(2)} ${symbol0} / ${Number(reserve1).toFixed(2)} ${symbol1}`
      }

      // 处理时区问题
      const lastRoundDate = new Date(project.last_round)
      const lastRound = lastRoundDate.getTime() / 1000 + 8 * 3600

      // 获取项目的 registry 数据条数作为发行量和最新的 last_trade 时间
      let issuance = 0
      let isStop = false
      const latestLastTrade = null

      try {
        if (wallet) {
          const pid = project.id
          // 调用区块链API获取项目详情
          const result = await wallet.getTableRows(
            'dfs3protocol', // code: 合约账户名
            'dfs3protocol', // scope: 表的作用域
            'registry', // table: 表名
            pid.toString(), // lower_bound: 项目ID
            pid.toString(), // upper_bound: 项目ID
            2, // index_position: 使用二级索引
            'i64', // key_type: 索引键类型
            1000, // limit: 最大结果数 (增大以获取更多记录)
            false, // reverse: 不反转结果
          )

          // 如果有数据，设置发行量为数据条数
          if (result && Array.isArray(result)) {
            issuance = result.length
            console.log(`项目 #${pid} 的发行量: ${issuance}`)

            // 查找最新的 last_trade 时间
            if (issuance > 0) {
              // info(`项目 #${pid} 的 last_round: ${new Date(project.last_round).getTime()+8*3600*1000}`)
              // 这里获取所有的last_trade 当前时间和last_trade 相差大于sec_per_round/3600 每个last_trade 和last_round 相差大于sec_per_round/3600 的 都算作是停止的
              const lastTrade = result.map(item => item.last_trade)
              // info(`项目 #${pid} 的 last_trade: ${JSON.stringify(lastTrade)}`)
              // //输出 每个last_trade 和last_round 相差的时间
              // info(`项目 #${pid} 的 last_round: ${project.last_round}`)
              // lastTrade.forEach(item => {
              //   // 输出每一个last_trade 的 时间
              //   info(`项目 #${pid} 的 last_trade: ${item}`)
              //   info(`项目 #${pid} 的 last_round: ${project.last_round}`)//小时
              // })

              const stopCount = lastTrade.filter((item) => {
                const lastRoundMs = new Date().getTime()
                const lastTradeMs = new Date(item).getTime() + 8 * 3600 * 1000
                const diffMs = Math.abs(lastRoundMs - lastTradeMs)
                const diffHours = diffMs / (3600 * 1000)
                const hoursPerRound = project.sec_per_round / 3600

                // // 输出详细的时间差计算信息
                // info(`项目 #${pid} 的时间差计算: last_round=${lastRoundMs}, last_trade=${lastTradeMs}, 差值=${diffMs}毫秒, ${diffHours}小时, 阈值=${hoursPerRound}小时`);

                return diffHours > hoursPerRound
              }).length

              info(`项目 #${pid} 的停止数量: ${stopCount}`)
              if (stopCount == issuance) {
                isStop = true
              }
            }
          }
        }
      } catch (error) {
        info(`获取项目 #${project.id} 的发行量和最新 last_trade 失败: ${JSON.stringify(error)}`)
        console.error(`获取项目 #${project.id} 的发行量和最新 last_trade 失败:`, error)
      }

      processedProjects.push({
        ...project,
        tokenSymbol,
        marketCap: `$${0 || 0}`, // 使用交易量作为市值
        volume: `$${0 || 0}`,
        volume24h: `$${0 || 0}`,
        transactions: transactions || 0,
        transactions24h: transactions24h || 0,
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
        // 设置发行量
        issuance,
        isStop,
        isHot: Math.random() > 0.7, // 30%的项目标记为热门
        // 添加奖池和资金池数据
        rewardPool: rewardPoolFormatted,
        fundingPool: fundingPoolFormatted,
      })
    }

    projects.value = processedProjects

    // 添加调试日志，输出项目数据结构
    console.log('项目列表数据结构示例:', projects.value.length > 0 ? projects.value[0] : '无数据')
    console.log('是否有id=244的项目:', projects.value.some(p => p.id === 244 || p.id === '244'))

    // 查找并输出id为244的项目
    const project244 = projects.value.find(p =>
      p.id !== undefined && p.id.toString() === '244',
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
      (project.id !== undefined && project.id.toString().includes(query))
      || project.title?.toLowerCase().includes(query)
      || project.tokenSymbol?.toLowerCase().includes(query)
      || project.creator?.toLowerCase().includes(query)
      || project.description?.toLowerCase().includes(query),
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

// 打开项目详情
function openProjectDetail(project: any) {
  selectedProject.value = project
  showProjectDetail.value = true
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
      'dfs3protocol', // code: 合约账户名
      'dfs3protocol', // scope: 表的作用域
      'registry', // table: 表名
      pid.toString(), // lower_bound: 项目ID
      pid.toString(), // upper_bound: 项目ID
      2, // index_position: 使用二级索引
      'i64', // key_type: 索引键类型
      100, // limit: 最大结果数
      false, // reverse: 不反转结果
    )

    console.log('获取到的原始数据:', result)

    if (result && Array.isArray(result)) {
      // 不需要额外筛选，因为我们已经使用了项目ID作为查询条件
      console.log('项目详情数据:', result)

      // 添加更多调试日志，输出数据结构
      if (result.length > 0) {
        console.log('第一条记录的字段:', Object.keys(result[0]))
        console.log('第一条记录的内容:', result[0])
      }

      projectDetails.value = result

      if (result.length > 0) {
        message.success(`已获取项目 #${pid} 的详情数据，共 ${result.length} 条记录`)
      } else {
        message.warning(`未找到项目 #${pid} 的详情数据`)
        projectDetails.value = [] // 只有在结果为空时才设置为空数组
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

// 获取交易量数据
async function fetchTransactionData() {
  txsLoading.value = true
  try {
    const response = await fetch('https://api.dfs.land/dfschain/pppvolume2')
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    txsData.value = data
    info(`获取交易量数据成功: ${Object.keys(data).length} 个项目`)
  } catch (error) {
    console.error('获取交易量数据失败:', error)
    info(`获取交易量数据失败: ${JSON.stringify(error)}`)
  } finally {
    txsLoading.value = false
  }
}

async function fetchRewardPoolsData() {
  rewardPoolsLoading.value = true
  info(`开始获取奖池数据...`)

  try {
  //   const response = await fetch('https://api.dfs.land/sse/reward_pools', {
  //     // Add some basic fetch options for better error handling
  //     mode: 'cors', // explicitly set CORS mode
  //     headers: {
  //       'Content-Type': 'application/json',
  //     },
  //   });

    //   if (!response.ok) {
    //     const errorData = await response.text(); // Try to read error response
    //     throw new Error(`HTTP error! Status: ${response.status}, Response: ${errorData}`);
    //   }

    //   const data = await response.json();
    //   info(`获取奖池数据: ${JSON.stringify(data)}`);
    //   rewardPoolsData.value = data;
    //   info(`获取奖池数据成功: ${Object.keys(data).length} 个项目`);
    //   return data;
    // } catch (error) {
    //   console.error('获取奖池数据失败:', error);

    //   // More detailed error information
    //   const errorMsg = error instanceof TypeError && error.message === 'Failed to fetch'
    //     ? '网络连接失败，请检查您的网络连接或API服务是否可用'
    //     : error.message;

    //   info(`获取奖池数据失败: ${errorMsg}`);

    //   // Set default empty object
    //   rewardPoolsData.value = {};
    return {}
  } finally {
    rewardPoolsLoading.value = false
  }
}
// 获取资金池数据
async function fetchFundingPoolsData() {
  fundingPoolsLoading.value = true
  try {
    const response = await wallet.getTableRows(
      'swapswapswap',
      'swapswapswap',
      'markets',
      '',
      '',
      1,
      '',
      1000,
      false,
    )
    // info(`获取资金池数据: ${JSON.stringify(response)}`)

    // 将数据转换为以 mid 为键的对象
    const poolsMap: Record<string, any> = {}
    if (Array.isArray(response)) {
      response.forEach((row: any) => {
        if (row.mid) {
          poolsMap[row.mid] = row
        }
      })
    }

    fundingPoolsData.value = poolsMap
    info(`获取资金池数据成功: ${Object.keys(poolsMap).length} 个项目`)
  } catch (error) {
    console.error('获取资金池数据失败:', error)
    info(`获取资金池数据失败2: ${JSON.stringify(error)}`)
  } finally {
    fundingPoolsLoading.value = false
  }
}

// 添加购买NFT的方法
async function buyNft(id: string | number, price: string) {
  try {
    if (!wallet) {
      message.error('钱包未初始化')
      info('购买NFT失败: 钱包未初始化')
      return
    }

    // 检查价格格式是否正确
    if (!price || typeof price !== 'string' || !price.includes(' ')) {
      const errorMsg = `价格格式不正确: ${price}`
      message.error(errorMsg)
      info(`购买NFT失败: ${errorMsg}`)
      return
    }

    // 检查钱包是否连接
    const currentWallet = wallet.currentWallet?.value
    if (!currentWallet || !currentWallet.address) {
      const errorMsg = '钱包未连接或未找到用户账号'
      message.error(errorMsg)
      info(`购买NFT失败: ${errorMsg}`)
      return
    }

    info(`开始购买NFT #${id}, 价格: ${price}, 账户: ${currentWallet.address}`)
    message.loading({ content: `正在购买 NFT #${id}...`, key: `buy-${id}` })

    const txId = await executeBuyNftByid(
      wallet,
      id,
      price,
      (msg, data) => info(msg),
    )

    if (txId) {
      message.success({ content: `成功购买 NFT #${id}`, key: `buy-${id}` })
      info(`成功购买 NFT #${id}, 交易ID: ${txId}`)
      // 刷新项目详情
      if (selectedProject.value) {
        await fetchProjectDetails(selectedProject)
      }
    } else {
      const errorMsg = `购买 NFT #${id} 失败: 未返回交易ID`
      message.error({ content: errorMsg, key: `buy-${id}` })
      info(errorMsg)
    }
  } catch (error: any) {
    console.error('购买NFT失败:', error)
    const errorMsg = `购买 NFT #${id} 失败: ${error.message || '未知错误'}`
    message.error({ content: errorMsg, key: `buy-${id}` })
    info(`购买NFT失败: ${error.message || '未知错误'}`)
  }
}

// 添加选中的NFT列表
const selectedNfts = ref<Set<number>>(new Set())

// 切换NFT选中状态
function toggleNftSelection(id: number) {
  if (selectedNfts.value.has(id)) {
    selectedNfts.value.delete(id)
  } else {
    selectedNfts.value.add(id)
  }
}

// 批量购买相关状态
const batchBuyInProgress = ref(false)
const abortController = ref<AbortController | null>(null)

// 停止批量购买
function stopBatchBuy() {
  if (abortController.value) {
    abortController.value.abort()
    abortController.value = null
    batchBuyInProgress.value = false
    message.warning({ content: '批量购买已停止', key: 'batch-buy' })
    info('批量购买已被用户停止')
  }
}

// 批量购买选中的NFT
async function batchBuySelectedNfts() {
  try {
    if (selectedNfts.value.size === 0) {
      message.warning('请先选择要购买的NFT')
      return
    }

    if (!wallet) {
      message.error('钱包未初始化')
      info('批量购买NFT失败: 钱包未初始化')
      return
    }

    // 准备ID和价格数组
    const ids: number[] = []
    const prices: string[] = []

    // 从项目详情中获取选中的NFT信息
    projectDetails.value.forEach((nft) => {
      if (selectedNfts.value.has(nft.id)) {
        ids.push(nft.id)
        prices.push(nft.current_price)
      }
    })

    if (ids.length === 0) {
      message.warning('未找到选中NFT的数据')
      return
    }

    // 创建取消控制器
    abortController.value = new AbortController()
    batchBuyInProgress.value = true

    message.loading({ content: `正在批量购买 ${ids.length} 个NFT...`, key: 'batch-buy' })
    info(`开始批量购买 ${ids.length} 个NFT`)

    // 调用批量购买函数
    const result = await executeBatchBuy(
      wallet,
      ids,
      prices,
      (msg, data) => info(msg),
      abortController.value.signal,
    )

    message.success({
      content: `批量购买完成，成功: ${result.success}，失败: ${result.failed}，总计: ${result.total}`,
      key: 'batch-buy',
    })

    // 清空选择和状态
    selectedNfts.value.clear()
    batchBuyInProgress.value = false
    abortController.value = null

    // 刷新项目详情
    if (selectedProject.value) {
      await fetchProjectDetails(selectedProject.value)
    }
  } catch (error: any) {
    console.error('批量购买NFT失败:', error)

    // 检查是否是用户取消
    if (error.message === '批量购买已被用户取消') {
      message.warning({ content: '批量购买已被用户取消', key: 'batch-buy' })
    } else {
      const errorMsg = `批量购买NFT失败: ${error.message || '未知错误'}`
      message.error({ content: errorMsg, key: 'batch-buy' })
      info(errorMsg)
    }

    // 重置状态
    batchBuyInProgress.value = false
    abortController.value = null
  }
}

// 刷新项目列表
function refreshProjects() {
  fetchProjects()
}

// 统一刷新数据函数，根据当前视图刷新不同的数据
function refreshData() {
  if (currentView.value === 'projects') {
    fetchProjects()
  } else {
    // 刷新我的NFT列表
    // 使用ref引用调用子组件的刷新方法
    if (myNFTViewRef.value && typeof myNFTViewRef.value.refreshNfts === 'function') {
      myNFTViewRef.value.refreshNfts()
      message.info('正在刷新我的NFT列表')
    } else {
      message.warning('无法刷新NFT列表，请尝试切换视图后再试')
    }
  }
}

onMounted(() => {
  fetchProjects()
})
</script>

<template>
  <div class="lunchpad-container">
    <div class="lunchpad-header">
      <div class="lunchpad-title-section">
        <!-- 视图切换按钮移到标题旁边 -->
        <a-button-group style="margin-right: 20px;">
          <a-button
            style="min-width: 80px;"
            :type="currentView === 'projects' ? 'primary' : 'default'"
            @click="currentView = 'projects'"
          >
            项目列表
          </a-button>
          <a-button
            style="min-width: 80px;"
            :type="currentView === 'myNfts' ? 'primary' : 'default'"
            @click="currentView = 'myNfts'"
          >
            我的NFT
          </a-button>
        </a-button-group>

        <!-- <h1 class="lunchpad-title">
          {{ currentView === 'projects' ? '项目列表' : '我的NFT' }}
        </h1> -->
      </div>

      <div class="lunchpad-actions">
        <!-- 项目列表视图的操作按钮 -->
        <template v-if="currentView === 'projects'">
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
        </template>

        <!-- 搜索框 - 移动到刷新按钮左侧，所有视图都显示 -->
        <div class="search-bar">
          <SearchOutlined />
          <input
            v-model="searchQuery"
            :placeholder="currentView === 'projects' ? 'Search ID or Project Name' : '搜索NFT ID或项目名称'"
            style="width: 200px;"
            type="text"
          >
        </div>

        <!-- 刷新按钮 -->
        <a-button
          :loading="loading"
          @click="refreshData"
        >
          <ReloadOutlined />
        </a-button>
      </div>
    </div>

    <!-- 根据当前视图显示不同内容 -->
    <div v-if="currentView === 'projects'">
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
              @click="openProjectDetail(project)"
            />
          </div>
        </a-spin>
      </div>
    </div>

    <!-- 我的NFT视图 -->
    <div v-else>
      <MyNFTView ref="myNFTViewRef" />
    </div>

    <!-- 使用抽离出的项目详情模态框组件 -->
    <ProjectDetailModal
      v-model:visible="showProjectDetail"
      :project="selectedProject"
      @refresh="refreshProjects"
    />

    <!-- 批量购买状态浮动提示 -->
    <div
      v-if="batchBuyInProgress"
      class="batch-buy-status"
    >
      <a-alert
        class="status-alert"
        description="正在处理多个NFT购买请求，您可以随时停止操作。"
        message="批量购买进行中..."
        show-icon
        type="info"
      >
        <template #icon>
          <a-spin />
        </template>
        <template #action>
          <a-button
            danger
            type="primary"
            @click="stopBatchBuy"
          >
            停止
          </a-button>
        </template>
      </a-alert>
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

.lunchpad-title-section {
  display: flex;
  align-items: center;
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
  width: 200px;
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

.batch-buy-status {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
}

.status-alert {
  width: 300px;
}
</style>
