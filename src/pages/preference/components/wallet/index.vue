<script setup lang="ts">
import { ref, reactive, onMounted, computed, nextTick, watch } from 'vue'
import { 
  WalletOutlined, 
  SendOutlined, 
  ScanOutlined, 
  HistoryOutlined, 
  PlusOutlined, 
  SwapOutlined,
  KeyOutlined,
  CopyOutlined,
  LockOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  EyeOutlined,
  DeleteOutlined,
  EditOutlined,
  DownloadOutlined
} from '@ant-design/icons-vue'
import { message, Modal } from 'ant-design-vue'
import { useWallet, WalletStatus, WalletType, Transaction } from '@/composables/wallet/useWallet'
import { useTransaction, TransactionStatus } from '@/composables/wallet/useTransaction'
import QRCode from 'qrcode.vue'


// 使用钱包API
const wallet = useWallet()
const transaction = useTransaction()
const allBalances = ref<string[]>([])
const loadingBalances = ref(false)
const showDebugLogs = ref(true) // 控制是否显示调试日志

// 界面状态
const activeTab = ref('assets')
const showSendModal = ref(false)
const showReceiveModal = ref(false)
const selectedCurrency = ref('DFS')
const showCreateWalletModal = ref(false)
const showImportWalletModal = ref(false)
const showBackupModal = ref(false)

// 资产列表
const assetList = ref<any[]>([])

// 确保transactions是正确的Transaction数组类型
const walletTransactions = computed(() => {
  return wallet.transactions.value || []
})

// 新钱包表单
const newWalletForm = reactive({
  accountName: '',
  isCreating: false
})

// 导入钱包表单
const importWalletForm = reactive({
  privateKey: '',
  accountName: '',
  isImporting: false
})

// 发送交易表单
const formState = reactive({
  recipient: '',
  amount: '',
  currency: 'DFS',
  gasPrice: 'medium',
  memo: ''
})

// 备份钱包信息
const backupInfo = reactive({
  privateKey: '',
  showPrivateKey: false
})

// 计算属性
const isWalletConnected = computed(() => {
  console.log("[DEBUG] 钱包状态:", wallet.walletStatus.value);
  console.log("[DEBUG] 当前钱包:", wallet.currentWallet.value);
  
  // 检查真实的钱包状态
  const connected = wallet.walletStatus.value === WalletStatus.CONNECTED && wallet.currentWallet.value !== null;
  addDebugLog("钱包连接状态计算: " + connected);
  
  return connected;
  // 不再强制返回true，使用实际状态
  // return true;
})
const walletAddress = computed(() => wallet.currentWallet.value?.address || 'bongo1234567890')
const walletAccountName = computed(() => wallet.currentWallet.value?.address || 'bongo1234567890')
const walletBalance = computed(() => {
  const balance = wallet.balances[WalletType.DFS]
  return parseFloat(balance || '0').toFixed(4)
})
const dfsInfo = computed(() => {
  return {
    key: 'DFS',
    name: 'DFS Chain',
    balance: wallet.balances[WalletType.DFS],
    value: parseFloat(wallet.balances[WalletType.DFS]) * 0.5
  }
})

// 调试日志
const debugLogs = ref<string[]>([]);

// 添加调试日志功能
const addDebugLog = (message: string, data?: any) => {
  const timestamp = new Date().toLocaleTimeString();
  const logMessage = data ? `${timestamp} - ${message}: ${JSON.stringify(data)}` : `${timestamp} - ${message}`;
  debugLogs.value.push(logMessage);
  
  // 同时尝试正常的控制台输出
  console.log(message, data);
  
  // 限制日志数量
  if (debugLogs.value.length > 300) {
    debugLogs.value.shift();
  }
};

// 初始化
onMounted(async () => {
  addDebugLog('组件已挂载');
  try {

    addDebugLog('初始化钱包');
    await wallet.initWallet();
    addDebugLog('钱包初始化完成', { status: wallet.walletStatus.value });
    
    // 添加钱包状态变化监听
    watch(wallet.walletStatus, (newStatus) => {
      addDebugLog(`钱包状态变化: ${newStatus}`);
    });
    
    // 如果没有交易历史，添加一些模拟的交易记录
    if (!wallet.transactions.value || wallet.transactions.value.length === 0) {
      addDebugLog('初始化模拟交易记录');
      wallet.transactions.value = [
        {
          id: 'tx-' + Date.now(),
          type: 'receive',
          amount: '10.0000',
          currency: 'DFS',
          from: 'dfs.initial',
          to: walletAddress.value,
          date: new Date().toISOString(),
          status: 'completed',
          memo: '初始化转账'
        },
        {
          id: 'tx-' + (Date.now() - 86400000),
          type: 'send',
          amount: '1.2000',
          currency: 'DFS',
          from: walletAddress.value,
          to: 'dfs.sample',
          date: new Date(Date.now() - 86400000).toISOString(),
          status: 'completed',
          memo: '测试发送'
        }
      ];
      addDebugLog('交易记录已添加', { count: wallet.transactions.value.length });
    }
    
    // 获取所有币种余额
    if (isWalletConnected.value) {
      fetchAllBalances();
    } else {
      addDebugLog('钱包未连接，跳过获取余额');
    }
    
  } catch (error) {
    addDebugLog('初始化出错', error);
  }
})

// 复制到剪贴板
const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  message.success('已复制到剪贴板');
  
  // 添加按钮动画效果
  const copyBtn = document.querySelector('.qr-copy-btn');
  if (copyBtn) {
    copyBtn.classList.add('qr-copy-active');
    setTimeout(() => {
      copyBtn.classList.remove('qr-copy-active');
    }, 500);
  }
}

// 格式化地址
const formatAddress = (address: string) => {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// 获取价格变动
const getPriceChange = () => {
  // 模拟价格变动 -2.5% 到 5% 之间
  // 使用固定值以避免每次重新渲染时变化
  const fixedValue = -2.06; // 固定为负值，便于测试显示
  return fixedValue.toFixed(2);
}

// 发送交易
const handleSend = async () => {
  addDebugLog('开始执行发送交易', formState);
  
  console.log("[DEBUG] 开始执行发送交易");
  console.log("[DEBUG] 表单状态:", formState);
  
  if (!formState.recipient || !formState.amount) {
    message.error('请填写完整的交易信息');
    return;
  }
  
  try {
    message.loading('正在处理交易...');
    console.log("[DEBUG] 发送交易参数:", {
      to: formState.recipient,
      amount: formState.amount,
      currency: formState.currency,
      memo: formState.memo
    });
    
    // 模拟交易成功
    // 真实环境下应该调用transaction.sendTokens
    setTimeout(() => {
      message.success('交易发送成功！');
      showSendModal.value = false;
      formState.recipient = '';
      formState.amount = '';
      formState.memo = '';
      
      // 添加模拟交易记录
      const mockTx: Transaction = {
        id: 'tx-' + Date.now(),
        type: 'send',
        amount: formState.amount,
        currency: 'DFS',
        from: walletAddress.value,
        to: formState.recipient,
        date: new Date().toISOString(),
        status: 'completed',
        memo: formState.memo
      };
      
      // 添加到交易历史
      if (Array.isArray(wallet.transactions.value)) {
        wallet.transactions.value.unshift(mockTx);
      }
    }, 1500);
    
  } catch (err) {
    console.error('交易发送失败:', err);
    message.error(`交易发送失败: ${err instanceof Error ? err.message : '未知错误'}`);
  }
}

// 验证交易表单
const validateSendForm = () => {
  if (!formState.recipient) {
    message.error('请输入接收地址')
    return false
  }
  
  if (!transaction.validateAddress(formState.recipient)) {
    message.error('接收地址格式无效')
    return false
  }
  
  if (!formState.amount || parseFloat(formState.amount) <= 0) {
    message.error('请输入有效的金额')
    return false
  }
  
  if (parseFloat(formState.amount) > parseFloat(wallet.balances[WalletType.DFS])) {
    message.error('余额不足')
    return false
  }
  
  return true
}

// 新增函数: 打开创建钱包对话框
const handleStartCreateWallet = async () => {
  addDebugLog("正在准备创建钱包");
  handleCreateWallet();
};

// 创建新钱包
const handleCreateWallet = async () => {
  addDebugLog("开始执行handleCreateWallet", {
    isCreating: newWalletForm.isCreating,
    accountName: newWalletForm.accountName
  });
  
  console.log("[DEBUG] 开始执行handleCreateWallet");
  console.log("[DEBUG] 当前状态:", {
    isCreating: newWalletForm.isCreating,
    accountName: newWalletForm.accountName,
    showModal: showCreateWalletModal.value
  });
  
  if (newWalletForm.isCreating) {
    console.log("[DEBUG] 钱包正在创建中，返回");
    return;
  }
 

  try {
    console.log("[DEBUG] 开始创建钱包流程");
    
    // 验证账户名
    if (newWalletForm.accountName) {
      console.log("[DEBUG] 验证账户名:", newWalletForm.accountName);
      if (newWalletForm.accountName.length !== 12 || !/^[a-z1-5.]+$/.test(newWalletForm.accountName)) {
        console.log("[DEBUG] 账户名验证失败");
        message.error('账户名必须是12个字符，且只能包含a-z、1-5和点号');
        return;
      }
    }
    
    newWalletForm.isCreating = true;
    console.log("[DEBUG] 设置isCreating为true");
    
    // message.loading('正在创建钱包，请稍候...', 3);
    console.log("[DEBUG] 准备调用wallet.createWallet");
    
    // 检查wallet对象
    if (!wallet || typeof wallet.createWallet !== 'function') {
      throw new Error('wallet对象未正确初始化');
    }
    
    const result = await wallet.createWallet(newWalletForm.accountName || undefined);
    console.log("[DEBUG] 钱包创建结果:", result);
    
    if (!result) {
      throw new Error('钱包创建失败：未返回结果');
    }
    
    if (!result.privateKey) {
      throw new Error('钱包创建失败：未返回私钥');
    }
    
    console.log("[DEBUG] 钱包创建成功，准备显示备份信息");
    backupInfo.privateKey = result.privateKey;
    newWalletForm.accountName = '';
    
    showCreateWalletModal.value = false;
    showBackupModal.value = true;
    
    console.log("[DEBUG] 已切换到备份弹窗");
    message.success('钱包创建成功！');
    
  } catch (err) {
    console.error("[DEBUG] 创建钱包失败:", err);
    message.error(`创建钱包失败: ${err instanceof Error ? err.message : '未知错误'}`);
  } finally {
    console.log("[DEBUG] 重置创建状态");
    newWalletForm.isCreating = false;
  }
}

// 导入钱包
const handleImportWallet = async () => {
  if (importWalletForm.isImporting || !importWalletForm.privateKey || !importWalletForm.accountName) return
  
  try {
    importWalletForm.isImporting = true
    await wallet.connectWallet(importWalletForm.privateKey,undefined,importWalletForm.accountName)
    showImportWalletModal.value = false
    importWalletForm.privateKey = ''
    importWalletForm.accountName = ''
    message.success('钱包导入成功')
  } catch (err) {
    console.error('导入钱包失败:', err)
  } finally {
    importWalletForm.isImporting = false
  }
}

// 断开钱包连接
const handleDisconnectWallet = async () => {
  addDebugLog('尝试断开钱包连接');
  try {
    await wallet.disconnectWallet();
    addDebugLog('钱包断开成功');
    message.success('钱包已断开连接');
    
    // 确保UI正确反映断开状态
    nextTick(() => {
      // 强制重新计算连接状态
      if (isWalletConnected.value) {
        addDebugLog('钱包状态未正确更新，强制断开');
        // 强制修改状态
        wallet.walletStatus.value = WalletStatus.DISCONNECTED;
      }
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    addDebugLog('断开钱包失败: ' + errorMsg);
    message.error('断开钱包失败: ' + errorMsg);
  }
}

// 切换私钥显示状态
const togglePrivateKeyVisibility = () => {
  backupInfo.showPrivateKey = !backupInfo.showPrivateKey
}

// 完成备份
const completeBackup = () => {
  showBackupModal.value = false
  // message.success('钱包创建完成，请安全保管您的私钥！')
}

// 格式化交易时间
const formatTransactionDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (err) {
    console.error('日期格式化错误:', err);
    return dateString;
  }
}

// 刷新余额
const refreshWalletBalance = async () => {
  try {
    message.loading('正在刷新余额...', 1)
    await wallet.refreshBalance()
    message.success('余额已更新')
  } catch (err) {
    console.error('刷新余额失败:', err)
    message.error('刷新余额失败')
  }
}
// 显示发送模态框
const showSendModalHandler = () => {
  addDebugLog("尝试显示发送模态框");
  try {
    showSendModal.value = true;
    addDebugLog("发送模态框状态已设为: " + showSendModal.value);
  } catch (err) {
    addDebugLog("显示模态框错误: " + (err instanceof Error ? err.message : String(err)));
  }
};

// 显示接收模态框
const showReceiveModalHandler = () => {
  addDebugLog("尝试显示接收模态框");
  try {
    showReceiveModal.value = true;
    addDebugLog("接收模态框状态已设为: " + showReceiveModal.value);
  } catch (err) {
    addDebugLog("显示模态框错误: " + (err instanceof Error ? err.message : String(err)));
  }
};

// 添加获取资产列表的方法
const fetchAllBalances = async () => {
  addDebugLog('开始获取资产列表');
  loadingBalances.value = true;
  
  try {
    if (!wallet.currentWallet.value) {
      addDebugLog('钱包未连接，无法获取资产');
      return;
    }
    
    // 获取DFS余额
    await wallet.refreshBalance();
    
    // 获取其他代币余额
    let result: string[] = [];
    try {
     
      const address = wallet.currentWallet.value.address;
      addDebugLog('获取代币余额', { address });
      
      // 从DFS合约获取所有代币余额
      result = await dfsWallet.get_currency_balance('dfsppptokens', address);
      addDebugLog('代币余额获取成功', result);
    } catch (err) {
      addDebugLog('获取代币余额失败', err);
    }
    
    // 清空当前资产列表
    assetList.value = []
    
 
    
    // 添加DFS资产
    assetList.value.push({
      key: 'DFS',
      name: 'DFS Chain',
      balance: wallet.balances[WalletType.DFS],
      value: parseFloat(wallet.balances[WalletType.DFS]) * 0.5,
      color: 'bg-blue-500'
    })
    
    // 处理并添加其他代币
    const colorClasses = [
      'bg-green-500', 'bg-purple-500', 'bg-red-500', 
      'bg-yellow-500', 'bg-indigo-500', 'bg-pink-500'
    ]
    
    result.forEach((item, index) => {
      const parts = item.split(' ')
      if (parts.length === 2) {
        const balance = parts[0]
        const symbol = parts[1]
        const randomPrice = (Math.random() * 10).toFixed(2)
        const value = parseFloat(balance) * parseFloat(randomPrice)
        
        // 使用循环颜色系统
        const colorIndex = index % colorClasses.length
        
        assetList.value.push({
          key: symbol,
          name: `${symbol} Token`,
          balance: balance,
          value: value,
          color: colorClasses[colorIndex]
        })
      }
    })
    
    addDebugLog('资产列表更新完成', assetList.value);
  } catch (err) {
    addDebugLog('获取资产列表失败', err);
  } finally {
    loadingBalances.value = false;
  }
}

</script>

<template>
  <div class="wallet-container p-4">


    <!-- 钱包头部 -->
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-bold flex items-center">
        <WalletOutlined class="mr-2" />钱包
      </h2>
      <div class="flex gap-2">
        <template v-if="isWalletConnected">
          <a-button type="primary" @click="showSendModalHandler">
            <SendOutlined />发送
          </a-button>
          <a-button @click="showReceiveModalHandler">
            <ScanOutlined />接收
          </a-button>
          <a-button @click="refreshWalletBalance">
            <SyncOutlined />刷新
          </a-button>
          <a-button danger @click="handleDisconnectWallet">
            断开
          </a-button>
        </template>
        <template v-else>
          <a-button type="primary" @click="handleStartCreateWallet">
            <PlusOutlined />创建钱包
          </a-button>
          <a-button @click="showImportWalletModal = true">
            <KeyOutlined />导入钱包
          </a-button>
        </template>
      </div>
    </div>

    <!-- 钱包摘要卡片 -->
    <a-card class="wallet-summary mb-6" :bordered="false" v-if="isWalletConnected">
      <div class="flex justify-between">
        <div>
          <p class="text-gray-500 mb-1">账户资产(USDT)</p>
          <h1 class="text-2xl font-bold">{{ walletBalance }} USDT</h1>
          <p class="text-sm" :class="getPriceChange().startsWith('-') ? 'text-red-500' : 'text-green-500'">
            {{ getPriceChange() }}% 24小时变动
          </p>
        </div>
        <div class="flex items-center">
          <div class="bg-gray-100 rounded-full p-2 flex items-center">
            <span class="text-sm mr-1">{{ walletAddress }}</span>
            <a-button type="text" size="small" @click="copyToClipboard(walletAddress)">
              <CopyOutlined />
            </a-button>
          </div>
        </div>
      </div>
    </a-card>

    <!-- 未连接钱包提示 -->
    <a-card class="mb-6" v-if="!isWalletConnected" :bordered="false">
      <div class="flex flex-col items-center justify-center py-8">
        <WalletOutlined style="font-size: 48px;" class="text-gray-400 mb-4" />
        <h3 class="text-xl font-medium mb-2">未连接钱包</h3>
        <p class="text-gray-500 mb-4">请创建新钱包或导入已有钱包以继续</p>
        <div class="flex gap-4">
          <a-button type="primary" @click="handleStartCreateWallet">
            <PlusOutlined />创建钱包
          </a-button>
          <a-button @click="showImportWalletModal = true">
            <KeyOutlined />导入钱包
          </a-button>
        </div>
      </div>
    </a-card>

    <!-- 选项卡 -->
    <a-tabs v-model:activeKey="activeTab" v-if="isWalletConnected">
      <a-tab-pane key="assets" tab="资产">
        <div class="space-y-4">
          <div class="flex justify-between items-center mb-3">
            <div class="font-bold">全部资产</div>
            <a-button size="small" @click="fetchAllBalances" :loading="loadingBalances">
              <template #icon><SyncOutlined /></template>
              刷新资产
            </a-button>
          </div>
          <div v-if="debugLogs.length > 0 && showDebugLogs" class="text-xs mb-2 p-2 bg-gray-100 rounded overflow-auto" style="max-height: 100px;">
            <div v-for="(log, index) in debugLogs.slice(-5)" :key="index" class="mb-1">{{ log }}</div>
          </div>
          
          <template v-if="assetList.length > 0">
            <a-card 
              v-for="asset in assetList" 
              :key="asset.key" 
              class="currency-card mb-2" 
              :bordered="false"
            >
              <div class="flex justify-between items-center">
                <div class="flex items-center">
                  <div 
                    class="w-10 h-10 rounded-full flex items-center justify-center text-white mr-3"
                    :class="asset.color"
                  >
                    {{ asset.key.charAt(0) }}
                  </div>
                  <div>
                    <h3 class="font-medium">{{ asset.name }}</h3>
                    <p class="text-gray-500">{{ asset.balance }} {{ asset.key }}</p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="font-bold">${{ asset.value.toFixed(2) }}</p>
                </div>
              </div>
            </a-card>
          </template>
          
          <a-empty v-else description="暂无资产" class="my-8">
            <template #extra>
              <a-button type="primary" @click="fetchAllBalances" :loading="loadingBalances">
                <template #icon><SyncOutlined /></template>
                刷新
              </a-button>
            </template>
          </a-empty>
          
          <a-card class="wallet-actions bg-gray-50" :bordered="false">
            <div class="grid grid-cols-3 gap-4">
              <div 
                class="flex flex-col items-center justify-center py-2 cursor-pointer hover:text-primary"     
                @click="showSendModalHandler"
              >
                <SendOutlined style="font-size: 24px;" class="mb-2" />
                <span>发送</span>
              </div>
              
              <div 
                class="flex flex-col items-center justify-center py-2 cursor-pointer hover:text-primary"
                @click="showReceiveModalHandler"
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
          </a-card>
        </div>
      </a-tab-pane>
      
      <a-tab-pane key="activity" tab="交易记录">
        <a-list :bordered="false" class="transaction-list">
          <a-list-item v-for="tx in walletTransactions" :key="tx.id">
            <div class="w-full">
              <div class="flex justify-between items-center">
                <div class="flex items-center">
                  <div class="w-10 h-10 rounded-full flex items-center justify-center mr-3"
                       :class="tx.type === 'receive' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'">
                    <SwapOutlined v-if="tx.type === 'send'" />
                    <PlusOutlined v-else />
                  </div>
                  <div>
                    <h3 class="font-medium">{{ tx.type === 'receive' ? '收到' : '发送' }} {{ tx.currency }}</h3>
                    <p class="text-gray-500 text-sm">{{ formatTransactionDate(tx.date) }}</p>
                    <p v-if="tx.memo" class="text-gray-500 text-xs">备注: {{ tx.memo }}</p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="font-bold" :class="tx.type === 'receive' ? 'text-green-600' : 'text-orange-600'">
                    {{ tx.type === 'receive' ? '+' : '-' }}{{ tx.amount }} {{ tx.currency }}
                  </p>
                  <p class="text-gray-500 text-sm">
                    {{ tx.type === 'receive' ? '来自:' : '发送至:' }} 
                    {{ tx.type === 'receive' ? formatAddress(tx.from) : formatAddress(tx.to) }}
                  </p>
                  <p class="text-xs">
                    <a href="#" @click.prevent class="text-blue-500">查看交易</a>
                  </p>
                </div>
              </div>
            </div>
          </a-list-item>
          <a-empty v-if="walletTransactions.length === 0" description="暂无交易记录" />
        </a-list>
      </a-tab-pane>
    </a-tabs>

     
    <!-- 自定义发送模态框 -->
    <div v-if="showSendModal" class="custom-modal">
      <div class="modal-backdrop" @click="showSendModal = false"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>发送DFS</h3>
          <button class="close-btn" @click="showSendModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>接收地址</label>
            <input v-model="formState.recipient" placeholder="输入DFS接收地址" class="form-input" />
            <div class="form-help">DFS地址格式: dfs.accountname (12个字符，仅支持a-z、1-5和点号)</div>
          </div>
          
          <div class="form-group">
            <label>数量</label>
            <input v-model="formState.amount" placeholder="0.0000" class="form-input" />
            <div class="form-help-row">
              <span>可用: {{ wallet.balances[WalletType.DFS] }} DFS</span>
              <a class="link" @click="formState.amount = wallet.balances[WalletType.DFS]">最大</a>
            </div>
          </div>
          
          <div class="form-group">
            <label>备注 (可选)</label>
            <input v-model="formState.memo" placeholder="交易备注信息" class="form-input" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="showSendModal = false">取消</button>
          <button class="submit-btn" @click="handleSend">发送</button>
        </div>
      </div>
    </div>

    <!-- 自定义接收模态框 -->
    <div v-if="showReceiveModal" class="custom-modal">
      <div class="modal-backdrop" @click="showReceiveModal = false"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>接收DFS</h3>
          <button class="close-btn" @click="showReceiveModal = false">&times;</button>
        </div>
        <div class="modal-body text-center">
          <div class="qr-code">
            <div class="qr-header">扫描二维码接收DFS</div>
            <div class="qr-box">
              <QRCode 
                :value="walletAddress" 
                :size="200" 
                level="M" 
                render-as="svg"
                :margin="0"
                class="qr-svg"
              />
            </div>
            <div class="qr-address-container">
              <div class="qr-address-preview">{{ walletAddress }}</div>
              <button class="qr-copy-btn" @click="copyToClipboard(walletAddress)">
                <CopyOutlined />
              </button>
            </div>
          </div>
          
          <div class="qr-instructions">
            <p>扫描上方二维码向此钱包发送DFS</p>
            <p>或复制地址手动添加收款人</p>
          </div>
         
        </div>
      </div>
    </div>

    <!-- 创建钱包模态框 -->
    <div v-if="showCreateWalletModal" class="custom-modal">
      <div class="modal-backdrop" @click="showCreateWalletModal = false"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>创建新钱包</h3>
          <button class="close-btn" @click="showCreateWalletModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>账户名称 (可选)</label>
            <input v-model="newWalletForm.accountName" placeholder="输入账户名或留空生成随机名称" class="form-input" />
            <div class="form-help">账户名必须是12个字符，只能包含a-z、1-5和点号</div>
          </div>
          
          <div class="warning-box">
            <div class="warning-title">重要提示</div>
            <div class="warning-content">
              创建后，您将收到私钥，请务必安全保存。丢失私钥将无法恢复您的资产！
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="showCreateWalletModal = false">取消</button>
          <button 
            class="submit-btn" 
            @click="handleCreateWallet"
            :disabled="newWalletForm.isCreating"
          >
            {{ newWalletForm.isCreating ? '创建中...' : '创建' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 导入钱包模态框 -->
    <div v-if="showImportWalletModal" class="custom-modal">
      <div class="modal-backdrop" @click="showImportWalletModal = false"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>导入钱包</h3>
          <button class="close-btn" @click="showImportWalletModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>私钥</label>
            <input 
              v-model="importWalletForm.privateKey" 
              type="password" 
              placeholder="输入您的私钥" 
              class="form-input" 
            />
          </div>

          <div class="form-group">
            <label>账户名</label>
            <input 
              v-model="importWalletForm.accountName" 
              type="text" 
              placeholder="输入您的账户名" 
              class="form-input" 
            />
          </div>
          
          <div class="info-box">
            <div class="info-title">安全提示</div>
            <div class="info-text">
              <p>• 私钥将只在本地使用，不会上传至任何服务器</p>
              <p>• 请确保在安全的环境中导入私钥</p>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="showImportWalletModal = false">取消</button>
          <button 
            class="submit-btn" 
            @click="handleImportWallet"
            :disabled="importWalletForm.isImporting"
          >
            {{ importWalletForm.isImporting ? '导入中...' : '导入' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 备份私钥模态框 -->
    <div v-if="showBackupModal" class="custom-modal">
      <div class="modal-backdrop"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>备份私钥</h3>
        </div>
        <div class="modal-body">
          <div class="warning-box">
            <div class="warning-title">重要提示</div>
            <div class="warning-content">
              <strong>任何人获得您的私钥将可以完全控制您的资产！</strong>
            </div>
          </div>
          
          <div class="key-container">
            <div class="key-header">
              <span class="key-title">您的私钥</span>
              <button class="toggle-btn" @click="togglePrivateKeyVisibility">
                <span v-if="backupInfo.showPrivateKey">
                  <LockOutlined /> 隐藏
                </span>
                <span v-else>
                  <EyeOutlined /> 显示
                </span>
              </button>
            </div>
            
            <div class="key-value">
              <div v-if="backupInfo.showPrivateKey" class="key-text">
                {{ backupInfo.privateKey }}
              </div>
              <div v-else class="key-masked">
                ***** 点击"显示"查看私钥 *****
              </div>
            </div>
            
            <div class="key-actions">
              <button class="copy-btn" @click="copyToClipboard(backupInfo.privateKey)">
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
              <input type="checkbox" class="checkbox-input" />
              我了解私钥的重要性，并已安全备份
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="submit-btn" @click="completeBackup">我已安全备份私钥</button>
        </div>
      </div>
    </div>

  
  </div>
</template>

<style scoped>
.wallet-container {
  max-width: 100%;
  margin: 0 auto;
}

.wallet-summary {
  background: linear-gradient(to right, #f5f7fa, #eef2f7);
}

.currency-card {
  transition: all 0.3s ease;
}

.currency-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.wallet-actions {
  transition: all 0.3s ease;
}

.transaction-list {
  max-height: 400px;
  overflow-y: auto;
}

/* 自定义模态框样式 */
.custom-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100000;
}

.modal-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
}

.modal-content {
  position: relative;
  width: 90%;
  max-width: 500px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  z-index: 100001;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #999;
}

.modal-body {
  padding: 20px;
  max-height: 70vh;
  overflow-y: auto;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  padding: 12px 20px;
  border-top: 1px solid #f0f0f0;
  gap: 8px;
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

.form-help-row {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  color: #999;
  font-size: 12px;
}

.link {
  color: #1890ff;
  cursor: pointer;
}

.cancel-btn {
  padding: 6px 15px;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  cursor: pointer;
}

.submit-btn {
  padding: 6px 15px;
  background: #1890ff;
  border: 1px solid #1890ff;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.submit-btn:hover:not(:disabled) {
  background: #40a9ff;
  border-color: #40a9ff;
}

.submit-btn:disabled {
  background: #bae7ff;
  border-color: #bae7ff;
  color: #fff;
  cursor: not-allowed;
  opacity: 0.7;
}

.qr-header {
  font-weight: 500;
  color: #333;
  margin-bottom: 12px;
  text-align: center;
}

.qr-code {
  display: inline-block;
  background: white;
  padding: 16px;
  margin-bottom: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.qr-box {
  width: 200px;
  height: 200px;
  margin: 0 auto;
  background-color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  padding: 4px;
}

.qr-svg {
  width: 100%;
  height: 100%;
}

.qr-address-container {
  display: flex;
  align-items: center;
  margin-top: 8px;
  background-color: #f9f9f9;
  padding: 6px 8px;
  border-radius: 4px;
  gap: 8px;
}

.qr-address-preview {
  flex: 1;
  font-size: 12px;
  color: #666;
  word-break: break-all;
  overflow: hidden;
  text-overflow: ellipsis;
}

.qr-copy-btn {
  padding: 4px 8px;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qr-copy-btn:hover {
  background: #f0f0f0;
  color: #1890ff;
}

.qr-copy-btn:active,
.qr-copy-active {
  background: #e6f7ff;
  color: #1890ff;
  border-color: #91d5ff;
  transform: scale(0.95);
}

.qr-instructions {
  margin-top: 12px;
  font-size: 14px;
  color: #666;
  text-align: center;
}

.qr-instructions p {
  margin: 4px 0;
  line-height: 1.4;
}

.info-box {
  padding: 16px;
  background-color: #f0f7ff;
  border-radius: 6px;
  margin-bottom: 16px;
  text-align: left;
  border-left: 4px solid #1890ff;
}

.info-title {
  color: #1890ff;
  font-weight: 500;
  margin-bottom: 8px;
}

.info-text {
  color: #666;
  font-size: 14px;
}

.info-text p {
  margin-bottom: 6px;
  line-height: 1.5;
}

.info-text p:last-child {
  margin-bottom: 0;
}

.done-btn {
  padding: 8px 20px;
  background: #1890ff;
  border: 1px solid #1890ff;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  width: 100%;
}

.text-center {
  text-align: center;
}

.debug-info {
  background-color: #ffff99;
  padding: 8px;
  border-radius: 4px;
  margin-bottom: 16px;
  text-align: center;
  font-weight: bold;
  border: 1px dashed #f5a623;
}

.qr-download-btn {
  margin-top: 12px;
  padding: 6px 12px;
  background: #f0f0f0;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  transition: all 0.3s;
}

.qr-download-btn:hover {
  background: #e6e6e6;
  border-color: #c9c9c9;
}

.qr-download-btn > span {
  margin-right: 6px;
}

.warning-box {
  padding: 16px;
  background-color: #fff7e6;
  border-radius: 6px;
  margin-bottom: 16px;
  text-align: left;
  border-left: 4px solid #faad14;
}

.warning-title {
  color: #fa8c16;
  font-weight: 500;
  margin-bottom: 8px;
}

.warning-content {
  color: #666;
  font-size: 14px;
  line-height: 1.5;
}

.key-container {
  background-color: #f9f9f9;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 16px;
}

.key-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.key-title {
  font-weight: 500;
  color: #333;
}

.toggle-btn {
  padding: 4px 8px;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 4px;
}

.toggle-btn:hover {
  color: #1890ff;
  border-color: #1890ff;
}

.key-value {
  background-color: #fff;
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

.security-tips {
  margin-bottom: 16px;
}

.security-tips h4 {
  font-weight: 500;
  margin-bottom: 8px;
  color: #333;
}

.security-tips ul {
  padding-left: 20px;
  list-style-type: disc;
}

.security-tips li {
  margin-bottom: 6px;
  color: #666;
  font-size: 14px;
  line-height: 1.5;
}

.checkbox-container {
  margin-bottom: 8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
  color: #333;
}

.checkbox-input {
  margin-right: 8px;
}
</style>

<style lang="scss" scoped>
:deep(.ant-modal-root .ant-modal-wrap) {
  z-index: 9999 !important;
}

:deep(.ant-modal-mask) {
  z-index: 9998 !important;
}

.create-wallet-modal {
  z-index: 10000 !important;
}
</style>
