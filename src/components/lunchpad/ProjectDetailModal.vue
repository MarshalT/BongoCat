<script setup lang="ts">
import { info } from '@tauri-apps/plugin-log'
import { message } from 'ant-design-vue'
import { computed, h, nextTick, ref, watch } from 'vue'

import { useWallet } from '@/composables/wallet/useWallet'
import { checkBatchBuyEligibility } from '@/utils/batchBuyEligibility'
import { executeBatchBuy, executeBuyNftByid } from '@/utils/buynft'
import { PasswordManager } from '@/utils/PasswordManager'

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  project: {
    type: Object,
    default: null,
  },
})

// Emits
const emit = defineEmits(['update:visible', 'refresh'])

// 创建计算属性来处理v-model双向绑定
const modalVisible = computed({
  get: () => props.visible,
  set: value => emit('update:visible', value),
})

// 获取钱包实例
const wallet = useWallet()

// 状态
const detailsLoading = ref(false)
const projectDetails = ref<any[]>([])
const selectedNfts = ref<Set<number>>(new Set())

// 批量购买状态
const batchBuyInProgress = ref(false)
const abortController = ref<AbortController | null>(null)

// 批量购买资格检查状态
const eligibilityChecking = ref<boolean>(false)
const eligibilityResult = ref<{
  eligible: boolean
  reason: string
}>({
  eligible: false,
  reason: '正在检查资格...',
})

// 密码确认相关状态
const showPasswordModal = ref(false)
const password = ref('')
const actionType = ref<'buy' | 'batchBuy' | null>(null)
const pendingBuyId = ref<number | null>(null)
const pendingBuyPrice = ref<string | null>(null)

// 定义表格列的类型
interface TableColumnRenderProps {
  text: any
  record: any
  index: number
}

// 监听项目变化，加载详情
watch(() => props.project, async (newProject) => {
  if (newProject && props.visible) {
    await fetchProjectDetails(newProject)
  }
}, { immediate: true })

// 监听可见性变化
watch(() => props.visible, async (visible) => {
  if (visible && props.project) {
    await fetchProjectDetails(props.project)

    // 检查批量购买资格
    checkEligibility()
  } else {
    // 清空选择
    selectedNfts.value.clear()

    // 如果有正在进行的批量购买，取消它
    stopBatchBuy()
  }
})

// 检查批量购买资格
async function checkEligibility() {
  eligibilityChecking.value = true
  try {
    const result = await checkBatchBuyEligibility(wallet, msg => info(msg))
    eligibilityResult.value = result
  } catch (error) {
    console.error('检查批量购买资格出错:', error)
    eligibilityResult.value = {
      eligible: false,
      reason: '检查资格时出错',
    }
  } finally {
    eligibilityChecking.value = false
  }
}

// 获取项目详情
async function fetchProjectDetails(project: any) {
  if (!wallet) {
    message.error('钱包未初始化')
    return
  }

  detailsLoading.value = true

  try {
    // 使用项目ID作为查询条件
    const pid = project.id || 244

    info(`获取项目 #${pid} 的详情数据`)
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
      console.log('项目详情数据:', result)

      if (result.length > 0) {
        console.log('第一条记录的字段:', Object.keys(result[0]))
        console.log('第一条记录的内容:', result[0])

        projectDetails.value = result
        message.success(`已获取项目 #${pid} 的详情数据，共 ${result.length} 条记录`)
      } else {
        message.warning(`未找到项目 #${pid} 的详情数据`)
        projectDetails.value = []
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

// 切换NFT选中状态
function toggleNftSelection(id: number) {
  if (selectedNfts.value.has(id)) {
    selectedNfts.value.delete(id)
  } else {
    selectedNfts.value.add(id)
  }
}

// 执行合约操作前的检查
function prepareAction(type: 'buy' | 'batchBuy', id?: number, price?: string) {
  if (!wallet) {
    message.error('钱包未初始化')
    info('购买NFT失败: 钱包未初始化')
    return false
  }

  // 检查钱包是否连接
  const currentWallet = wallet.currentWallet?.value
  if (!currentWallet || !currentWallet.address) {
    const errorMsg = '钱包未连接或未找到用户账号'
    message.error(errorMsg)
    info(`购买NFT失败: ${errorMsg}`)
    return false
  }

  // 如果是批量购买，检查资格
  if (type === 'batchBuy' && !eligibilityResult.value.eligible) {
    message.warning(eligibilityResult.value.reason)
    info(`批量购买NFT失败: ${eligibilityResult.value.reason}`)
    return false
  }

  // 设置待处理的购买信息
  actionType.value = type
  if (type === 'buy' && id !== undefined && price !== undefined) {
    pendingBuyId.value = id
    pendingBuyPrice.value = price
  }

  // 显示密码确认对话框
  showPasswordModal.value = true
  return true
}

// 购买单个NFT
async function buyNft(id: string | number, price: string) {
  try {
    // 检查价格格式是否正确
    if (!price || typeof price !== 'string' || !price.includes(' ')) {
      const errorMsg = `价格格式不正确: ${price}`
      message.error(errorMsg)
      info(`购买NFT失败: ${errorMsg}`)
      return
    }

    // 准备购买操作，显示密码确认对话框
    prepareAction('buy', Number(id), price)
  } catch (error: any) {
    console.error('购买NFT失败:', error)
    const errorMsg = `购买 NFT #${id} 失败: ${error.message || '未知错误'}`
    message.error({ content: errorMsg, key: `buy-${id}` })
    info(`购买NFT失败: ${error.message || '未知错误'}`)
  }
}

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
  if (selectedNfts.value.size === 0) {
    message.warning('请至少选择一个NFT')
    return
  }

  // 检查批量购买资格
  const eligibility = await checkBatchBuyEligibility(wallet, msg => info(msg))
  if (!eligibility.eligible) {
    message.warning(eligibility.reason)
    info(`批量购买NFT失败: ${eligibility.reason}`)
    return
  }

  // 准备批量购买操作，显示密码确认对话框
  prepareAction('batchBuy')
}

// 关闭模态框
function closeModal() {
  // 如果有正在进行的批量购买，先停止它
  if (batchBuyInProgress.value) {
    stopBatchBuy()
  }

  modalVisible.value = false
}

// 处理密码确认取消
function handlePasswordCancel() {
  // 重置状态
  showPasswordModal.value = false
  password.value = ''
  actionType.value = null
  pendingBuyId.value = null
  pendingBuyPrice.value = null
}

// 处理密码确认
async function handlePasswordConfirm() {
  if (!password.value || !actionType.value) {
    message.error('请输入密码')
    return
  }

  try {
    detailsLoading.value = true

    // 验证密码
    const isValid = await PasswordManager.verifyPassword(password.value)
    if (!isValid) {
      message.error('密码不正确')
      return
    }

    // 获取加密的钱包数据
    const encryptedWallet = localStorage.getItem('bongo-cat-wallet-encrypted')
    if (!encryptedWallet) {
      message.error('找不到钱包数据')
      return
    }

    // 在解密前立即关闭密码对话框
    showPasswordModal.value = false
    
    // 保存操作类型和购买信息，因为它们会在关闭对话框后被重置
    const currentActionType = actionType.value
    const currentPendingBuyId = pendingBuyId.value
    const currentPendingBuyPrice = pendingBuyPrice.value
    
    // 保存密码，因为我们需要用它来解密数据
    const currentPassword = password.value
    
    // 重置密码和操作类型
    password.value = ''
    actionType.value = null
    pendingBuyId.value = null
    pendingBuyPrice.value = null

    // 解密获取私钥
    const walletData = await PasswordManager.decryptData(encryptedWallet, currentPassword)
    
    const privateKey = walletData.privateKey

    // 检查钱包对象是否可用
    if (!wallet) {
      throw new Error('钱包未初始化或尚未连接')
    }

    // 根据操作类型执行相应的购买操作
    if (currentActionType === 'buy') {
      // 单个NFT购买
      if (currentPendingBuyId === null || currentPendingBuyPrice === null) {
        throw new Error('购买信息不完整')
      }

      const id = currentPendingBuyId
      const price = currentPendingBuyPrice
      const currentWallet = wallet.currentWallet?.value

      info(`开始购买NFT #${id}, 价格: ${price}, 账户: ${currentWallet?.address}`)
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
        if (props.project) {
          await fetchProjectDetails(props.project)
          emit('refresh')
        }
      } else {
        const errorMsg = `购买 NFT #${id} 失败: 未返回交易ID`
        message.error({ content: errorMsg, key: `buy-${id}` })
        info(errorMsg)
      }
    } else if (currentActionType === 'batchBuy') {
      // 批量NFT购买
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
        throw new Error('未找到选中NFT的数据')
      }

      try {
        // 创建取消控制器
        abortController.value = new AbortController()
        batchBuyInProgress.value = true

        message.loading({ content: `正在并发批量购买 ${ids.length} 个NFT (带重试功能)...`, key: 'batch-buy' })
        info(`开始并发批量购买 ${ids.length} 个NFT (带重试功能)`)
        
        // 调用批量购买函数
        const result = await executeBatchBuy(
          wallet,
          ids,
          prices,
          (msg, data) => info(msg),
          abortController.value.signal,
        ).catch((error) => {
          // 检查是否是用户取消
          if (error.message === '批量购买已被用户取消') {
            message.warning({ content: '批量购买已被用户取消', key: 'batch-buy' })
          } else {
            const errorMsg = `批量购买NFT失败: ${error.message || '未知错误'}`
            message.error({ content: errorMsg, key: 'batch-buy' })
            info(errorMsg)
          }
          
          // 确保在错误处理中也重置状态
          batchBuyInProgress.value = false
          if (abortController.value) {
            abortController.value = null
          }
          
          // 抛出错误，让外部的catch块捕获
          throw error;
        });

        message.success({
          content: `并发批量购买完成，成功: ${result.success}，失败: ${result.failed}，总计: ${result.total}`,
          key: 'batch-buy',
        })

        // 清空选择
        selectedNfts.value.clear()
        
        // 刷新项目详情
        if (props.project) {
          await fetchProjectDetails(props.project)
          emit('refresh')
        }
      } catch (error) {
        // 这里不需要额外处理，因为错误已经在上面的catch块中处理过了
        // 但我们需要确保状态被重置，这会在finally块中完成
        info(`批量购买过程中捕获到错误: ${error}`)
        
        // 在catch块中也重置状态，确保多重保障
        batchBuyInProgress.value = false
        if (abortController.value) {
          abortController.value = null
        }
      } finally {
        // 确保批量购买状态被重置
        batchBuyInProgress.value = false
        if (abortController.value) {
          abortController.value = null
        }
        info('批量购买状态已重置')
        
        // 使用 nextTick 确保界面更新
        nextTick(() => {
          batchBuyInProgress.value = false
          if (abortController.value) {
            abortController.value = null
          }
          info('批量购买操作完成后，界面状态应该已更新')
        })
      }
    }
  } catch (err: any) {
    const errMsg = err.message || JSON.stringify(err)
    info(`执行操作失败: ${errMsg}`)
    message.error(`操作失败: ${errMsg}`)
  } finally {
    detailsLoading.value = false
    
    // 确保批量购买状态被重置（再次确认，防止任何情况下没有重置）
    batchBuyInProgress.value = false
    if (abortController.value) {
      abortController.value = null
    }
    
    // 使用 nextTick 确保状态更改后界面更新
    nextTick(() => {
      // 再次确认状态已正确重置
      detailsLoading.value = false
      batchBuyInProgress.value = false
      if (abortController.value) {
        abortController.value = null
      }
      
      info('状态重置已确认，界面应该已更新')
    })
    
    // 添加延迟检查，确保状态被正确重置
    setTimeout(() => {
      if (detailsLoading.value) {
        info('检测到加载状态未正确重置，强制重置')
        detailsLoading.value = false
      }
      if (batchBuyInProgress.value) {
        info('检测到批量购买状态未正确重置，强制重置')
        batchBuyInProgress.value = false
      }
      if (abortController.value) {
        info('检测到取消控制器未正确重置，强制重置')
        abortController.value = null
      }
      
      // 再次使用 nextTick 确保界面更新
      nextTick(() => {
        info('延迟检查后，界面应该已更新')
      })
    }, 500)
  }
}
</script>

<template>
  <a-modal
    v-model:visible="modalVisible"
    class="project-detail-modal"
    :footer="null"
    :mask-closable="true"
    :title="project ? `项目详情 #${project.id || ''}` : '项目详情'"
    width="800px"
    @cancel="closeModal"
  >
    <a-spin :spinning="detailsLoading">
      <div
        v-if="projectDetails.length > 0"
        class="project-detail-content"
      >
        <div class="project-header">
          <div class="project-logo-large">
            <img
              v-if="project?.nft_img"
              alt="项目Logo"
              class="logo-image"
              :src="project.nft_img"
            >
            <div
              v-else
              class="logo-placeholder-large"
            >
              {{ project?.tokenSymbol?.[0] || 'P' }}
            </div>
          </div>
          <div class="project-info">
            <h2>{{ project?.title || `项目 #${project?.id || ''}` }}</h2>
            <p class="project-description">
              {{ project?.desc || '暂无描述' }}
            </p>
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
          :columns="[
            {
              title: '选择',
              key: 'select',
              width: '60px',
              customRender: ({ record }: TableColumnRenderProps) => {
                return h('input', {
                  type: 'checkbox',
                  checked: selectedNfts.has(record.id),
                  onChange: () => toggleNftSelection(record.id),
                });
              },
            },
            {
              title: 'ID',
              dataIndex: 'id',
              key: 'id',
              customRender: ({ text }: TableColumnRenderProps) => text || '无',
            },
            {
              title: '所有者',
              dataIndex: 'owner',
              key: 'owner',
              customRender: ({ text }: TableColumnRenderProps) => text || '无',
            },
            {
              title: '轮次',
              dataIndex: 'current_round',
              key: 'current_round',
              customRender: ({ text }: TableColumnRenderProps) => text || '无',
            },
            {
              title: '当前价格',
              dataIndex: 'current_price',
              key: 'current_price',
              customRender: ({ text }: TableColumnRenderProps) => text || '无',
            },
            {
              title: '最后交易',
              dataIndex: 'last_trade',
              key: 'last_trade',
              customRender: ({ text }: TableColumnRenderProps) => text || '无',
            },
            {
              title: '购买',
              dataIndex: 'id',
              key: 'buy',
              customRender: ({ text, record }: TableColumnRenderProps) => {
                return h('button', {
                  class: 'ant-btn ant-btn-primary',
                  onClick: () => buyNft(text, record.current_price),
                }, '购买');
              },
            },
          ]"
          :data-source="projectDetails"
          :pagination="{ pageSize: 10 }"
          :row-key="(record: any) => String(record.id || Math.random())"
        />
      </div>
      <a-empty
        v-else
        description="暂无项目详情数据"
      />

      <div class="modal-footer">
        <a-button
          type="primary"
          @click="closeModal"
        >
          关闭
        </a-button>
        <a-button
          style="margin-left: 10px;"
          @click="() => { console.log('详情数据:', projectDetails); message.info('请查看控制台输出'); }"
        >
          调试
        </a-button>

        <!-- 批量购买按钮组 -->
        <div
          class="batch-buy-buttons"
          style="display: inline-block; margin-left: 10px;"
        >
          <a-tooltip
            placement="top"
            :title="!eligibilityResult.eligible ? eligibilityResult.reason : ''"
          >
            <a-button
              :danger="batchBuyInProgress"
              :disabled="!eligibilityResult.eligible && !batchBuyInProgress"
              :loading="eligibilityChecking"
              type="primary"
              @click="batchBuyInProgress ? stopBatchBuy() : batchBuySelectedNfts()"
            >
              {{ batchBuyInProgress ? '关闭窗口停止批量购买' : '批量购买选中NFT' }}
            </a-button>
          </a-tooltip>
        </div>
      </div>

      <!-- 批量购买资格提示 -->
      <div
        v-if="!eligibilityResult.eligible && !eligibilityChecking"
        class="eligibility-warning"
      >
        <a-alert
          description="批量购买功能需要拥有猫咪并且等级达到10级"
          :message="eligibilityResult.reason"
          show-icon
          type="warning"
        />
      </div>

      <!-- 添加调试信息显示区域 -->
      <div
        v-if="projectDetails.length > 0"
        class="debug-info"
        style="margin-top: 20px; padding: 10px; background-color: rgba(0,0,0,0.5); border-radius: 8px;"
      >
        <h4>调试信息</h4>
        <div
          v-for="(item, index) in projectDetails.slice(0, 2)"
          :key="index"
          style="margin-bottom: 10px; border-bottom: 1px solid #977171; padding-bottom: 10px;"
        >
          <div><strong>记录 #{{ index + 1 }}</strong></div>
          <div
            v-for="(value, key) in item"
            :key="key"
            style="display: flex;"
          >
            <div style="width: 120px; font-weight: bold;">
              {{ key }}:
            </div>
            <div>{{ typeof value === 'object' ? JSON.stringify(value) : value }}</div>
          </div>
        </div>
        <div v-if="projectDetails.length > 2">
          ... 更多记录 ...
        </div>
      </div>
    </a-spin>
  </a-modal>

  <!-- 密码确认模态框 -->
  <a-modal
    v-model:visible="showPasswordModal"
    cancel-text="取消"
    :confirm-loading="detailsLoading"
    ok-text="确定"
    :title="actionType === 'buy' ? '购买NFT' : '批量购买NFT'"
    @cancel="handlePasswordCancel"
    @ok="handlePasswordConfirm"
  >
    <p>请输入钱包密码以确认操作</p>
    <a-input-password
      v-model:value="password"
      class="mt-4"
      placeholder="输入钱包密码"
      @keyup.enter="handlePasswordConfirm"
    />
    <div class="mt-2 text-sm text-gray-500">
      <template v-if="actionType === 'buy'">
        购买NFT将从您的钱包中扣除 <span class="text-red-500 font-bold">{{ pendingBuyPrice || '未知金额' }}</span>
      </template>
      <template v-else-if="actionType === 'batchBuy'">
        批量购买将从您的钱包中扣除多笔款项，请确认您有足够的余额
      </template>
    </div>
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

/* 批量购买资格提示样式 */
.eligibility-warning {
  margin-top: 16px;
}

:deep(.eligibility-warning .ant-alert) {
  background-color: rgba(255, 229, 143, 0.1);
  border-color: #d48806;
}

:deep(.eligibility-warning .ant-alert-message) {
  color: #faad14;
}

:deep(.eligibility-warning .ant-alert-description) {
  color: #d8bd8a;
}
</style>
