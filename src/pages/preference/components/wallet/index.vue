<script setup lang="ts">
import {
  CopyOutlined,
  EyeOutlined,
  KeyOutlined,
  LockOutlined,
  PlusOutlined,
  ScanOutlined,
  SendOutlined,
  SettingOutlined,
  WalletOutlined,
} from '@ant-design/icons-vue'
import { computed, onMounted, ref } from 'vue'

// 导入新的组件
import AssetList from '@/components/wallet/AssetList.vue'
import EcosystemExplorer from '@/components/wallet/EcosystemExplorer.vue'
import QRCodeView from '@/components/wallet/QRCodeView.vue'
import SendTokenForm from '@/components/wallet/SendTokenForm.vue'
import TransactionList from '@/components/wallet/TransactionList.vue'
import WalletModal from '@/components/wallet/WalletModal.vue'
import WalletSettings from '@/components/wallet/WalletSettings.vue'
import WalletSummary from '@/components/wallet/WalletSummary.vue'
import WalletUnlockModal from '@/components/wallet/WalletUnlockModal.vue'
import { WalletType } from '@/composables/wallet/useWallet'
import { useWalletUI } from '@/composables/wallet/useWalletUI'

// 使用钱包UI composable
const ui = useWalletUI()

// 需要转换类型，解决TypeScript错误
const isWalletConnected = computed(() => ui.isWalletConnected.value)
const isWalletLocked = computed(() => ui.isWalletLocked.value)
const walletAddress = computed(() => ui.walletAddress.value)
const walletBalance = computed(() => ui.walletBalance.value)
const assetList = computed(() => ui.assetList.value)
const loadingBalances = computed(() => ui.loadingBalances.value)
const activeTab = computed({
  get: () => ui.activeTab.value,
  set: (val) => {
    ui.activeTab.value = val
  },
})

// 发送表单引用
const sendFormRef = ref()

// 显示解锁对话框并记录调试信息
function showUnlockDialog() {
  ui.addDebugLog('点击解锁钱包按钮')
  ui.modals.unlockWallet = true
  ui.addDebugLog('解锁对话框状态:', ui.modals.unlockWallet)
}

// 发送代币处理函数
async function handleSend() {
  // 验证表单
  if (sendFormRef.value && !sendFormRef.value.validate()) {
    ui.addDebugLog('表单验证失败')
    return
  }

  // 获取表单数据并调用发送方法
  const formData = sendFormRef.value.form
  ui.forms.send = { ...formData }
  await ui.handleSendTokens()
}

// 初始化钱包
onMounted(async () => {
  ui.addDebugLog('钱包组件已挂载')

  try {
    // 初始化钱包
    await ui.wallet.initWallet()
    ui.addDebugLog('钱包初始化完成', { status: ui.wallet.walletStatus.value })

    // 如果钱包已连接，刷新余额和资产
    if (ui.isWalletConnected.value) {
      await ui.refreshWalletBalance()
    }

    // 添加模拟交易记录(如果需要)
    if (!ui.wallet.transactions.value || ui.wallet.transactions.value.length === 0) {
      ui.addDebugLog('初始化模拟交易记录')
      ui.wallet.transactions.value = [
        {
          id: `tx-${Date.now()}`,
          type: 'receive',
          amount: '10.0000',
          currency: 'DFS',
          from: 'dfs.initial',
          to: walletAddress.value,
          date: new Date().toISOString(),
          status: 'completed',
          memo: '初始化转账',
        },
        {
          id: `tx-${Date.now() - 86400000}`,
          type: 'send',
          amount: '1.2000',
          currency: 'DFS',
          from: walletAddress.value,
          to: 'dfs.sample',
          date: new Date(Date.now() - 86400000).toISOString(),
          status: 'completed',
          memo: '测试发送',
        },
      ]
    }
  } catch (error) {
    ui.addDebugLog('初始化出错', error)
  }
})
</script>

<template>
  <div class="wallet-container p-4">
    <!-- 钱包头部 -->
    <div class="mb-6 flex items-center justify-between">
      <h2 class="flex items-center text-xl font-bold">
        <WalletOutlined class="mr-2" />钱包
        <span
          v-if="isWalletConnected && isWalletLocked"
          class="ml-2 flex items-center text-sm text-red-500"
        >
          <LockOutlined class="mr-1" />已锁定
        </span>
      </h2>
      <div class="flex gap-2">
        <template v-if="isWalletConnected">
          <!-- 钱包已锁定时显示解锁按钮 -->
          <template v-if="isWalletLocked">
            <a-button
              type="primary"
              @click="ui.showUnlockDialog"
            >
              <KeyOutlined />解锁钱包
            </a-button>
          </template>
          <!-- 钱包已解锁时显示功能按钮 -->
          <template v-else>
            <a-button
              type="primary"
              @click="ui.modals.send = true"
            >
              <SendOutlined />发送
            </a-button>
            <a-button @click="ui.modals.receive = true">
              <ScanOutlined />接收
            </a-button>
            <!-- <a-button @click="ui.refreshWalletBalance" :loading="loadingBalances">
              <SyncOutlined />刷新
            </a-button> -->
            <a-button @click="ui.handleLockWallet">
              <LockOutlined />锁定
            </a-button>
            <a-button
              danger
              @click="ui.handleDisconnectWallet"
            >
              断开
            </a-button>
          </template>
        </template>
        <template v-else>
          <a-button
            type="primary"
            @click="ui.modals.createWallet = true"
          >
            <PlusOutlined />创建钱包
          </a-button>
          <a-button @click="ui.modals.importWallet = true">
            <KeyOutlined />导入钱包
          </a-button>
        </template>
      </div>
    </div>

    <!-- 钱包摘要卡片 -->
    <WalletSummary
      v-if="isWalletConnected"
      :address="walletAddress"
      :balance="walletBalance"
      :dfs-price="ui.dfsPrice.value"
      :is-locked="isWalletLocked"
      @copy="ui.copyToClipboard"
      @export-private-key="ui.exportPrivateKey"
      @refresh-price="ui.fetchDFSPrice"
    />

    <!-- 未连接钱包提示 -->
    <a-card
      v-if="!isWalletConnected"
      :bordered="false"
      class="mb-6"
    >
      <div class="flex flex-col items-center justify-center py-8">
        <WalletOutlined
          class="mb-4 text-gray-400"
          style="font-size: 48px;"
        />
        <h3 class="mb-2 text-xl font-medium">
          未连接钱包
        </h3>
        <p class="mb-4 text-gray-500">
          请创建新钱包或导入已有钱包以继续
        </p>

        <!-- 密码未设置时提醒用户 -->
        <div
          v-if="!ui.hasSetupPassword"
          class="warning-box mb-4 max-w-md w-full"
        >
          <div class="warning-title">
            请先设置钱包密码
          </div>
          <div class="warning-content">
            在创建或导入钱包前，您需要先设置钱包密码以保护您的资产安全。
          </div>
        </div>

        <!-- 节点URL未设置时提醒用户 -->
        <div
          v-if="!ui.hasSetupNodeUrl && ui.hasSetupPassword"
          class="warning-box mb-4 max-w-md w-full"
        >
          <div class="warning-title">
            请设置节点URL
          </div>
          <div class="warning-content">
            在创建或导入钱包前，您需要设置正确的区块链节点URL。
          </div>
        </div>

        <div class="flex gap-4">
          <a-button
            v-if="!ui.hasSetupPassword || !ui.hasSetupNodeUrl"
            type="primary"
            @click="activeTab = 'settings'"
          >
            <SettingOutlined />前往设置
          </a-button>
          <a-button
            :disabled="!ui.hasSetupPassword || !ui.hasSetupNodeUrl"
            type="primary"
            @click="ui.modals.createWallet = true"
          >
            <PlusOutlined />创建钱包
          </a-button>
          <a-button
            :disabled="!ui.hasSetupPassword || !ui.hasSetupNodeUrl"
            @click="ui.modals.importWallet = true"
          >
            <KeyOutlined />导入钱包
          </a-button>
        </div>
      </div>
    </a-card>

    <!-- 选项卡 -->
    <a-tabs v-model:active-key="activeTab">
      <a-tab-pane
        v-if="isWalletConnected"
        key="assets"
        tab="资产"
      >
        <div class="space-y-4">
          <!-- 调试日志显示 -->
          <!-- <div v-if="debugLogs.length > 0 && showDebugLogs" class="text-xs mb-2 p-2 bg-gray-100 rounded overflow-auto" style="max-height: 100px;">
            <div v-for="(log, index) in debugLogs.slice(-5)" :key="index" class="mb-1">{{ log }}</div>
          </div> -->

          <!-- 资产列表组件 -->
          <AssetList
            :assets="assetList"
            :loading="loadingBalances"
            @refresh="ui.refreshWalletBalance"
          />

          <!-- 钱包操作快捷按钮 -->
          <!-- <a-card class="wallet-actions bg-gray-50" :bordered="false">
            <div class="grid grid-cols-3 gap-4">
              <div
                class="flex flex-col items-center justify-center py-2 cursor-pointer hover:text-primary"
                @click="ui.modals.send = true"
              >
                <SendOutlined style="font-size: 24px;" class="mb-2" />
                <span>发送</span>
              </div>

              <div
                class="flex flex-col items-center justify-center py-2 cursor-pointer hover:text-primary"
                @click="ui.modals.receive = true"
              >
                <ScanOutlined style="font-size: 24px;" class="mb-2" />
                <span>接收</span>
              </div>

              <div
                class="flex flex-col items-center justify-center py-2 cursor-pointer hover:text-primary"
                @click="activeTab = 'activity'"
              >
                <HistoryOutlined style="font-size: 24px;" class="mb-2" />
                <span>历史</span>
              </div>
            </div>
          </a-card> -->
        </div>
      </a-tab-pane>

      <a-tab-pane
        v-if="isWalletConnected"
        key="activity"
        tab="交易记录"
      >
        <!-- 交易记录列表组件 -->
        <TransactionList :transactions="ui.wallet.transactions.value || []" />
      </a-tab-pane>
      <a-tab-pane
        v-if="isWalletConnected"
        key="discovery"
        tab="发现"
      >
        <!-- 生态系统探索组件 -->
        <EcosystemExplorer />
      </a-tab-pane>
      <a-tab-pane
        key="settings"
        tab="设置"
      >
        <!-- 钱包设置组件 -->
        <WalletSettings />
      </a-tab-pane>
    </a-tabs>

    <!-- 发送模态框 -->
    <WalletModal
      v-model:visible="ui.modals.send"
      confirm-text="发送"
      :title="`发送${ui.forms.send.currency || 'DFS'}`"
      @confirm="handleSend"
    >
      <SendTokenForm
        ref="sendFormRef"
        :assets="assetList"
        :available-balance="ui.wallet.balances[WalletType.DFS]"
      />
    </WalletModal>

    <!-- 接收模态框 -->
    <WalletModal
      v-model:visible="ui.modals.receive"
      cancel-text="关闭"
      confirm-text=""
      title="接收DFS"
    >
      <div class="text-center">
        <QRCodeView
          :value="walletAddress"
          @copy="ui.copyToClipboard"
        />
      </div>
    </WalletModal>

    <!-- 创建钱包模态框 -->
    <WalletModal
      v-model:visible="ui.modals.createWallet"
      :confirm-disabled="ui.forms.newWallet.isCreating"
      confirm-text="创建"
      title="创建新钱包"
      @confirm="ui.handleCreateWallet"
    >
      <div class="form-group">
        <label>账户名称 (可选)</label>
        <input
          v-model="ui.forms.newWallet.accountName"
          class="form-input"
          placeholder="输入账户名或留空生成随机名称"
        >
        <div class="form-help">
          账户名必须是12个字符，只能包含a-z、1-5和点号
        </div>
      </div>

      <div class="warning-box">
        <div class="warning-title">
          重要提示
        </div>
        <div class="warning-content">
          创建后，您将收到私钥，请务必安全保存。丢失私钥将无法恢复您的资产！
        </div>
      </div>
    </WalletModal>

    <!-- 导入钱包模态框 -->
    <WalletModal
      v-model:visible="ui.modals.importWallet"
      :confirm-disabled="ui.forms.importWallet.isImporting"
      confirm-text="导入"
      title="导入钱包"
      @confirm="ui.handleImportWallet"
    >
      <div class="form-group">
        <label>私钥</label>
        <input
          v-model="ui.forms.importWallet.privateKey"
          class="form-input"
          placeholder="输入您的私钥"
          type="password"
        >
      </div>

      <div class="form-group">
        <label>账户名</label>
        <input
          v-model="ui.forms.importWallet.accountName"
          class="form-input"
          placeholder="输入您的账户名"
          type="text"
        >
      </div>

      <div class="info-box">
        <div class="info-title">
          安全提示
        </div>
        <div class="info-text">
          <p>• 私钥将只在本地使用，不会上传至任何服务器</p>
          <p>• 请确保在安全的环境中导入私钥</p>
        </div>
      </div>
    </WalletModal>

    <!-- 备份私钥模态框 -->
    <WalletModal
      v-model:visible="ui.modals.backup"
      confirm-text="我已安全备份私钥"
      title="备份私钥"
      @confirm="ui.completeBackup"
    >
      <div class="warning-box">
        <div class="warning-title">
          重要提示
        </div>
        <div class="warning-content">
          <strong>任何人获得您的私钥将可以完全控制您的资产！</strong>
        </div>
      </div>

      <div class="key-container">
        <div class="key-header">
          <span class="key-title">您的私钥</span>
          <button
            class="toggle-btn"
            @click="ui.togglePrivateKeyVisibility"
          >
            <span v-if="ui.forms.backup.showPrivateKey">
              <LockOutlined /> 隐藏
            </span>
            <span v-else>
              <EyeOutlined /> 显示
            </span>
          </button>
        </div>

        <div class="key-value">
          <div
            v-if="ui.forms.backup.showPrivateKey"
            class="key-text"
          >
            {{ ui.forms.backup.privateKey }}
          </div>
          <div
            v-else
            class="key-masked"
          >
            ***** 点击"显示"查看私钥 *****
          </div>
        </div>

        <div class="key-actions">
          <button
            class="copy-btn"
            @click="ui.copyToClipboard(ui.forms.backup.privateKey)"
          >
            <CopyOutlined /> 复制
          </button>
        </div>
      </div>

      <div class="security-tips">
        <h4>安全提示：</h4>
        <ul>
          <li>将私钥保存在安全的离线位置</li>
          <li>永远不要分享私钥</li>
          <li>任何人获得您的私钥都能控制您的资产</li>
          <li>丢失私钥将导致资产永久丢失</li>
        </ul>
      </div>

      <div class="checkbox-container">
        <label class="checkbox-label">
          <input
            class="checkbox-input"
            type="checkbox"
          >
          我了解私钥的重要性，并已安全备份
        </label>
      </div>
    </WalletModal>

    <!-- 导出私钥模态框 -->
    <WalletModal
      v-model:visible="ui.modals.exportPrivateKey"
      confirm-text="我已安全备份私钥"
      title="导出私钥"
      @confirm="ui.modals.exportPrivateKey = false"
    >
      <div class="warning-box">
        <div class="warning-title">
          安全警告
        </div>
        <div class="warning-content">
          <strong>请勿向任何人分享您的私钥，拥有私钥即可完全控制您的钱包资产！</strong>
        </div>
      </div>

      <div class="key-container">
        <div class="key-header">
          <span class="key-title">账户地址</span>
        </div>
        <div class="key-value">
          <div class="key-text address-display">
            {{ walletAddress }}
          </div>
        </div>

        <div class="key-header mt-4">
          <span class="key-title">私钥</span>
          <button
            class="toggle-btn"
            @click="ui.togglePrivateKeyVisibility"
          >
            <span v-if="ui.forms.backup.showPrivateKey">
              <LockOutlined /> 隐藏
            </span>
            <span v-else>
              <EyeOutlined /> 显示
            </span>
          </button>
        </div>

        <div class="key-value">
          <div
            v-if="ui.forms.backup.showPrivateKey"
            class="key-text"
          >
            {{ ui.forms.backup.privateKey }}
          </div>
          <div
            v-else
            class="key-masked"
          >
            ***** 点击"显示"查看私钥 *****
          </div>
        </div>

        <div class="key-actions">
          <button
            class="copy-btn"
            @click="ui.copyToClipboard(ui.forms.backup.privateKey)"
          >
            <CopyOutlined /> 复制私钥
          </button>
        </div>
      </div>

      <div class="security-tips">
        <h4>重要安全提示：</h4>
        <ul>
          <li>私钥是钱包的"主密码"，可用于恢复钱包和控制资产</li>
          <li>确保在安全环境中查看私钥</li>
          <li>建议将私钥保存在离线安全的位置</li>
          <li>永远不要与他人分享您的私钥</li>
        </ul>
      </div>
    </WalletModal>

    <!-- 解锁钱包对话框 -->
    <WalletUnlockModal
      :visible="ui.modals.unlockWallet"
      @unlock="ui.handleUnlockWallet"
      @update:visible="(val) => {
        console.log('更新解锁对话框状态:', val);
        ui.modals.unlockWallet = val;
      }"
    />
  </div>
</template>

<style scoped>
.wallet-container {
  background: white;
  border-radius: 8px;
}

.wallet-actions {
  margin-top: 12px;
}

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

.warning-box {
  background: #fff2e8;
  border: 1px solid #ffcca7;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 16px;
}

.warning-title {
  font-weight: bold;
  color: #fa541c;
  margin-bottom: 8px;
}

.warning-content {
  color: #333;
  font-size: 14px;
}

.info-box {
  background: #e6f7ff;
  border: 1px solid #91d5ff;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 12px;
}

.info-title {
  font-weight: bold;
  color: #1890ff;
  margin-bottom: 8px;
}

.info-text {
  color: #333;
  font-size: 14px;
}

.info-text p {
  margin-bottom: 4px;
}

.key-container {
  background: #f9f9f9;
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 12px;
}

.key-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.key-title {
  font-weight: 500;
}

.toggle-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #1890ff;
  display: flex;
  align-items: center;
  gap: 4px;
}

.key-value {
  background: white;
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 12px;
}

.key-text {
  font-family: monospace;
  word-break: break-all;
  color: #333;
}

.key-masked {
  text-align: center;
  color: #999;
}

.key-actions {
  display: flex;
  justify-content: flex-end;
}

.copy-btn {
  padding: 6px 15px;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 4px;
}

.copy-btn:hover {
  color: #1890ff;
  border-color: #1890ff;
}

.security-tips {
  margin-bottom: 16px;
}

.security-tips h4 {
  margin-bottom: 8px;
  color: #333;
}

.security-tips ul {
  padding-left: 20px;
}

.security-tips li {
  margin-bottom: 4px;
  color: #666;
}

.checkbox-container {
  margin-top: 16px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-input {
  margin-right: 4px;
}

.address-display {
  word-break: break-all;
  font-family: monospace;
  background-color: #f9f9f9;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #eee;
}

.mt-4 {
  margin-top: 1rem;
}
</style>
