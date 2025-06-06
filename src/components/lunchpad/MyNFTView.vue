<script setup lang="ts">
import { info } from '@tauri-apps/plugin-log'
import { message } from 'ant-design-vue'
import { computed, onMounted, ref } from 'vue'

import { useWallet } from '@/composables/wallet/useWallet'

// 获取钱包实例
const wallet = useWallet()

// NFT列表数据
const myNfts = ref<any[]>([])
const loading = ref(false)
const searchQuery = ref('')

// 计算属性：过滤后的NFT列表
const filteredNfts = computed(() => {
  if (!searchQuery.value) {
    return myNfts.value
  }

  const query = searchQuery.value.toLowerCase()
  return myNfts.value.filter(nft =>
    nft.id.toString().includes(query)
    || nft.pid.toString().includes(query)
    || (nft.project_title && nft.project_title.toLowerCase().includes(query)),
  )
})

// 获取用户的NFT列表
async function fetchMyNfts() {
  if (!wallet || !wallet.currentWallet?.value?.address) {
    message.error('钱包未连接')
    return
  }

  const accountName = wallet.currentWallet.value.address
  loading.value = true

  try {
    info(`开始获取用户 ${accountName} 的NFT列表`)

    // 从registry表中获取owner为当前用户的所有NFT
    const result = await wallet.getTableRows(
      'dfs3protocol', // code: 合约账户名
      'dfs3protocol', // scope: 表的作用域
      'registry', // table: 表名
      accountName, // lower_bound: 使用账户名作为索引值
      accountName, // upper_bound: 使用账户名作为索引值
      3, // index_position: 使用第三个索引（假设第三个索引是owner字段）
      'name', // key_type: 索引键类型
      1000, // limit: 最大结果数
      false, // reverse: 不反转结果
    )

    console.log('获取到的NFT数据:', result)

    if (result && Array.isArray(result)) {
      // 处理NFT数据，添加项目信息
      const processedNfts = await Promise.all(result.map(async (nft) => {
        // 获取项目信息
        try {
          const projectInfo = await wallet.getTableRows(
            'dfs3protocol',
            'dfs3protocol',
            'projects',
            nft.pid.toString(),
            nft.pid.toString(),
            1,
            'i64',
            1,
            false,
          )

          if (projectInfo && projectInfo.length > 0) {
            return {
              ...nft,
              project_title: projectInfo[0].title || `项目 #${nft.pid}`,
              project_img: projectInfo[0].nft_img || '',
              token_symbol: projectInfo[0].token_per_nft ? projectInfo[0].token_per_nft.split(' ')[1] : '',
            }
          }

          return {
            ...nft,
            project_title: `项目 #${nft.pid}`,
            project_img: '',
            token_symbol: '',
          }
        } catch (error) {
          console.error(`获取项目 #${nft.pid} 信息失败:`, error)
          return {
            ...nft,
            project_title: `项目 #${nft.pid}`,
            project_img: '',
            token_symbol: '',
          }
        }
      }))

      myNfts.value = processedNfts
      info(`成功获取用户 ${accountName} 的NFT列表，共 ${myNfts.value.length} 个`)
      message.success(`已加载 ${myNfts.value.length} 个NFT`)
    } else {
      myNfts.value = []
      info(`未找到用户 ${accountName} 的NFT`)
      message.info('未找到NFT')
    }
  } catch (error) {
    console.error('获取NFT列表失败:', error)
    info(`获取NFT列表失败: ${JSON.stringify(error)}`)
    message.error('获取NFT列表失败')
    myNfts.value = []
  } finally {
    loading.value = false
  }
}

// 刷新NFT列表
function refreshNfts() {
  fetchMyNfts()
}

// 暴露方法供父组件调用
defineExpose({
  refreshNfts,
})

// 组件挂载时获取NFT列表
onMounted(() => {
  fetchMyNfts()
})
</script>

<template>
  <div class="my-nft-container">
    <div class="my-nft-header">
      <h1 class="my-nft-title">
        <!-- 我的NFT -->
      </h1>

      <div class="my-nft-actions">
        <!-- 搜索框已移至父组件 -->
      </div>
    </div>

    <!-- NFT列表 -->
    <div class="nft-list">
      <a-spin :spinning="loading">
        <div
          v-if="filteredNfts.length === 0"
          class="no-nfts"
        >
          <p>{{ loading ? '加载中...' : '没有找到NFT' }}</p>
        </div>

        <div
          v-else
          class="nfts-grid"
        >
          <a-card
            v-for="nft in filteredNfts"
            :key="nft.id"
            :bordered="false"
            class="nft-card"
          >
            <template #cover>
              <div class="nft-image-container">
                <img
                  v-if="nft.project_img"
                  alt="NFT图片"
                  class="nft-image"
                  :src="nft.project_img"
                >
                <div
                  v-else
                  class="nft-image-placeholder"
                >
                  {{ nft.project_title?.[0] || 'N' }}
                </div>
              </div>
            </template>
            <template #title>
              <div class="nft-title">
                {{ nft.project_title }}
              </div>
            </template>
            <template #extra>
              <a-tag color="blue">
                #{{ nft.id }}
              </a-tag>
            </template>
            <div class="nft-info">
              <p><strong>项目ID:</strong> {{ nft.pid }}</p>
              <p><strong>当前轮次:</strong> {{ nft.current_round }}</p>
              <p><strong>当前价格:</strong> {{ nft.current_price }}</p>
              <p><strong>最后交易:</strong> {{ new Date(nft.last_trade).toLocaleString() }}</p>
            </div>
          </a-card>
        </div>
      </a-spin>
    </div>
  </div>
</template>

<style scoped>
.my-nft-container {
  background: #000;
  color: #fff;
  padding: 20px;
  border-radius: 12px;
  min-height: 100vh;
}

.my-nft-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.my-nft-title {
  font-size: 24px;
  color: #fff;
  margin: 0;
}

.my-nft-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.nfts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.nft-card {
  background: #111;
  border-radius: 12px;
  overflow: hidden;
  transition: transform 0.3s;
}

.nft-card:hover {
  transform: translateY(-5px);
}

.nft-image-container {
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0a0a0a;
  overflow: hidden;
}

.nft-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.nft-image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  color: #333;
  background: #1a1a1a;
}

.nft-title {
  font-size: 16px;
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nft-info {
  font-size: 14px;
}

.nft-info p {
  margin-bottom: 5px;
}

.no-nfts {
  text-align: center;
  padding: 40px;
  color: #999;
}
</style>
