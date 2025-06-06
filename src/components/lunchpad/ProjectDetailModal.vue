<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { message } from 'ant-design-vue';
import { useWallet } from '@/composables/wallet/useWallet';
import { info } from '@tauri-apps/plugin-log';
import { executeBuyNftByid, executeBatchBuy } from '@/utils/buynft';
import { h } from 'vue';

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  project: {
    type: Object,
    default: null
  }
});

// Emits
const emit = defineEmits(['update:visible', 'refresh']);

// 创建计算属性来处理v-model双向绑定
const modalVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
});

// 获取钱包实例
const wallet = useWallet();

// 状态
const detailsLoading = ref(false);
const projectDetails = ref<any[]>([]);
const selectedNfts = ref<Set<number>>(new Set());

// 监听项目变化，加载详情
watch(() => props.project, async (newProject) => {
  if (newProject && props.visible) {
    await fetchProjectDetails(newProject);
  }
}, { immediate: true });

// 监听可见性变化
watch(() => props.visible, async (visible) => {
  if (visible && props.project) {
    await fetchProjectDetails(props.project);
  } else {
    // 清空选择
    selectedNfts.value.clear();
  }
});

// 获取项目详情
async function fetchProjectDetails(project: any) {
  if (!wallet) {
    message.error('钱包未初始化');
    return;
  }

  detailsLoading.value = true;
  
  try {
    // 使用项目ID作为查询条件
    const pid = project.id || 244;
    
    info(`获取项目 #${pid} 的详情数据`);
    console.log('获取详情的项目:', project);
    console.log('使用的项目ID:', pid);
    
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
    );
    
    console.log('获取到的原始数据:', result);
    
    if (result && Array.isArray(result)) {
      console.log('项目详情数据:', result);
      
      if (result.length > 0) {
        console.log('第一条记录的字段:', Object.keys(result[0]));
        console.log('第一条记录的内容:', result[0]);
        
        projectDetails.value = result;
        message.success(`已获取项目 #${pid} 的详情数据，共 ${result.length} 条记录`);
      } else {
        message.warning(`未找到项目 #${pid} 的详情数据`);
        projectDetails.value = [];
      }
    } else {
      projectDetails.value = [];
      message.warning('未找到项目详情数据');
    }
  } catch (error) {
    console.error('获取项目详情失败:', error);
    message.error('获取项目详情失败');
    projectDetails.value = [];
  } finally {
    detailsLoading.value = false;
  }
}

// 切换NFT选中状态
const toggleNftSelection = (id: number) => {
  if (selectedNfts.value.has(id)) {
    selectedNfts.value.delete(id);
  } else {
    selectedNfts.value.add(id);
  }
};

// 购买单个NFT
const buyNft = async (id: string | number, price: string) => {
  try {
    if (!wallet) {
      message.error('钱包未初始化');
      info('购买NFT失败: 钱包未初始化');
      return;
    }
    
    // 检查价格格式是否正确
    if (!price || typeof price !== 'string' || !price.includes(' ')) {
      const errorMsg = `价格格式不正确: ${price}`;
      message.error(errorMsg);
      info(`购买NFT失败: ${errorMsg}`);
      return;
    }
    
    // 检查钱包是否连接
    const currentWallet = wallet.currentWallet?.value;
    if (!currentWallet || !currentWallet.address) {
      const errorMsg = '钱包未连接或未找到用户账号';
      message.error(errorMsg);
      info(`购买NFT失败: ${errorMsg}`);
      return;
    }
    
    info(`开始购买NFT #${id}, 价格: ${price}, 账户: ${currentWallet.address}`);
    message.loading({ content: `正在购买 NFT #${id}...`, key: `buy-${id}` });
    
    const txId = await executeBuyNftByid(
      wallet, 
      id, 
      price, 
      (msg, data) => info(msg)
    );
    
    if (txId) {
      message.success({ content: `成功购买 NFT #${id}`, key: `buy-${id}` });
      info(`成功购买 NFT #${id}, 交易ID: ${txId}`);
      // 刷新项目详情
      if (props.project) {
        await fetchProjectDetails(props.project);
        emit('refresh');
      }
    } else {
      const errorMsg = `购买 NFT #${id} 失败: 未返回交易ID`;
      message.error({ content: errorMsg, key: `buy-${id}` });
      info(errorMsg);
    }
  } catch (error: any) {
    console.error('购买NFT失败:', error);
    const errorMsg = `购买 NFT #${id} 失败: ${error.message || '未知错误'}`;
    message.error({ content: errorMsg, key: `buy-${id}` });
    info(`购买NFT失败: ${error.message || '未知错误'}`);
  }
};

// 批量购买选中的NFT
const batchBuySelectedNfts = async () => {
  try {
    if (selectedNfts.value.size === 0) {
      message.warning('请先选择要购买的NFT');
      return;
    }
    
    if (!wallet) {
      message.error('钱包未初始化');
      info('批量购买NFT失败: 钱包未初始化');
      return;
    }
    
    // 准备ID和价格数组
    const ids: number[] = [];
    const prices: string[] = [];
    
    // 从项目详情中获取选中的NFT信息
    projectDetails.value.forEach(nft => {
      if (selectedNfts.value.has(nft.id)) {
        ids.push(nft.id);
        prices.push(nft.current_price);
      }
    });
    
    if (ids.length === 0) {
      message.warning('未找到选中NFT的数据');
      return;
    }
    
    message.loading({ content: `正在批量购买 ${ids.length} 个NFT...`, key: 'batch-buy' });
    info(`开始批量购买 ${ids.length} 个NFT`);
    
    // 调用批量购买函数
    const result = await executeBatchBuy(
      wallet,
      ids,
      prices,
      (msg, data) => info(msg)
    );
    
    message.success({ 
      content: `批量购买完成，成功: ${result.success}，失败: ${result.failed}，总计: ${result.total}`, 
      key: 'batch-buy' 
    });
    
    // 清空选择
    selectedNfts.value.clear();
    
    // 刷新项目详情
    if (props.project) {
      await fetchProjectDetails(props.project);
      emit('refresh');
    }
  } catch (error: any) {
    console.error('批量购买NFT失败:', error);
    const errorMsg = `批量购买NFT失败: ${error.message || '未知错误'}`;
    message.error({ content: errorMsg, key: 'batch-buy' });
    info(errorMsg);
  }
};

// 关闭模态框
const closeModal = () => {
  modalVisible.value = false;
};
</script>

<template>
  <a-modal
    v-model:visible="modalVisible"
    :title="project ? `项目详情 #${project.id || ''}` : '项目详情'"
    width="800px"
    :footer="null"
    :maskClosable="true"
    class="project-detail-modal"
    @cancel="closeModal"
  >
    <a-spin :spinning="detailsLoading">
      <div v-if="projectDetails.length > 0" class="project-detail-content">
        <div class="project-header">
          <div class="project-logo-large">
            <img
              v-if="project?.nft_img"
              :src="project.nft_img"
              alt="项目Logo"
              class="logo-image"
            />
            <div v-else class="logo-placeholder-large">
              {{ project?.tokenSymbol?.[0] || 'P' }}
            </div>
          </div>
          <div class="project-info">
            <h2>{{ project?.title || `项目 #${project?.id || ''}` }}</h2>
            <p class="project-description">{{ project?.desc || '暂无描述' }}</p>
            <div class="project-meta">
              <span class="meta-item">
                <strong>创建者:</strong> {{ project?.creator || project?.owner || 'Unknown' }}
              </span>
              <span class="meta-item">
                <strong>代币:</strong> {{ project?.tokenSymbol || 'Unknown' }}
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
              title: '选择',
              key: 'select',
              width: '60px',
              customRender: ({ record }) => {
                return h('input', {
                  type: 'checkbox',
                  checked: selectedNfts.has(record.id),
                  onChange: () => toggleNftSelection(record.id)
                });
              }
            },
            {
              title: 'ID',
              dataIndex: 'id',
              key: 'id',
              customRender: ({ text }) => text || '无'
            },            
            {
              title: '所有者',
              dataIndex: 'owner',
              key: 'owner',
              customRender: ({ text }) => text || '无'
            },
            {
              title: '轮次',
              dataIndex: 'current_round',
              key: 'current_round',
              customRender: ({ text }) => text || '无'
            },
            {
              title: '当前价格',
              dataIndex: 'current_price',
              key: 'current_price',
              customRender: ({ text }) => text || '无'
            },
            {
              title: '最后交易',
              dataIndex: 'last_trade',
              key: 'last_trade',
              customRender: ({ text }) => text || '无'
            },
            {
              title: '购买',
              dataIndex: 'id',
              key: 'buy',
              customRender: ({ text, record }) => {
                return h('button', {
                  class: 'ant-btn ant-btn-primary',
                  onClick: () => buyNft(text, record.current_price)
                }, '购买');
              }
            }
          ]"
          :pagination="{ pageSize: 10 }"
          :rowKey="record => String(record.id || Math.random())"
        />
      </div>
      <a-empty v-else description="暂无项目详情数据" />
      
      <div class="modal-footer">
        <a-button type="primary" @click="closeModal">关闭</a-button>
        <a-button @click="() => { console.log('详情数据:', projectDetails); message.info('请查看控制台输出'); }" style="margin-left: 10px;">调试</a-button>
        <a-button @click="batchBuySelectedNfts" style="margin-left: 10px;">批量购买</a-button>
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
</template>

<style scoped>
/* 项目详情弹窗样式 */
:deep(.project-detail-modal) {
  width: 800px !important;
}

:deep(.project-detail-modal .ant-modal-content) {
  background-color: #1a1a1a;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  border: 1px solid #333;
}

:deep(.project-detail-modal .ant-modal-header) {
  background-color: #222;
  border-bottom: 1px solid #333;
  padding: 16px 24px;
}

:deep(.project-detail-modal .ant-modal-title) {
  color: #fff;
  font-weight: bold;
  font-size: 18px;
}

:deep(.project-detail-modal .ant-modal-close) {
  color: #999;
}

:deep(.project-detail-modal .ant-modal-close:hover) {
  color: #fff;
}

:deep(.project-detail-modal .ant-modal-body) {
  padding: 24px;
  max-height: 70vh;
  overflow-y: auto;
  background-color: #1a1a1a;
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
  border: 1px solid #444;
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
  color: #aaa;
  margin-bottom: 16px;
  font-size: 14px;
}

.project-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.meta-item {
  color: #aaa;
  font-size: 14px;
}

.meta-item strong {
  color: #1677ff;
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
  background-color: #222;
  color: #fff;
  border-bottom: 1px solid #333;
  font-weight: 600;
}

:deep(.ant-table-tbody > tr > td) {
  border-bottom: 1px solid #333;
  color: #ddd;
  background-color: #1a1a1a;
}

:deep(.ant-table-tbody > tr:hover > td) {
  background-color: #2a2a2a;
}

:deep(.ant-table-tbody > tr:nth-child(odd) > td) {
  background-color: #222;
}

:deep(.ant-empty-description) {
  color: #999;
}

:deep(.ant-divider) {
  border-color: #333;
}

:deep(.ant-pagination-item a) {
  color: #ddd;
}

:deep(.ant-pagination-item-active) {
  background-color: #1677ff;
  border-color: #1677ff;
}

:deep(.ant-btn) {
  background: #333;
  border-color: #444;
  color: #ddd;
}

:deep(.ant-btn:hover) {
  background: #444;
  border-color: #555;
  color: #fff;
}

:deep(.ant-btn-primary) {
  background: #1677ff;
  border-color: #1677ff;
}

:deep(.ant-btn-primary:hover) {
  background: #4096ff;
  border-color: #4096ff;
}

/* 调试信息区域样式 */
.debug-info {
  margin-top: 20px;
  padding: 15px;
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  border: 1px solid #333;
}

.debug-info h4 {
  color: #1677ff;
  margin-top: 0;
  margin-bottom: 10px;
}
</style> 