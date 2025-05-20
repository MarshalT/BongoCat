import { ref, reactive, computed } from 'vue';
import { message } from 'ant-design-vue';
import { useWallet, WalletStatus, WalletType } from './useWallet';
import { error } from '@tauri-apps/plugin-log'

// 用于管理钱包UI状态的composable
export function useWalletUI() {
  const wallet = useWallet();
  
  // UI状态
  const activeTab = ref('assets');
  const debugLogs = ref<string[]>([]);
  const showDebugLogs = ref(true);
  const loadingBalances = ref(false);
  
  // 模态框状态
  const modals = reactive({
    send: false,
    receive: false,
    createWallet: false,
    importWallet: false,
    backup: false
  });
  
  // 表单状态
  const forms = reactive({
    // 发送交易表单
    send: {
      recipient: '',
      amount: '',
      currency: 'DFS',
      gasPrice: 'medium',
      memo: '',
      reset() {
        this.recipient = '';
        this.amount = '';
        this.memo = '';
        this.currency = 'DFS';
        this.gasPrice = 'medium';
      }
    },
    
    // 新钱包表单
    newWallet: {
      accountName: '',
      isCreating: false,
      reset() {
        this.accountName = '';
        this.isCreating = false;
      }
    },
    
    // 导入钱包表单
    importWallet: {
      privateKey: '',
      accountName: '',
      isImporting: false,
      reset() {
        this.privateKey = '';
        this.accountName = '';
        this.isImporting = false;
      }
    },
    
    // 备份信息
    backup: {
      privateKey: '',
      showPrivateKey: false,
      reset() {
        this.privateKey = '';
        this.showPrivateKey = false;
      }
    }
  });

  // 资产列表管理
  const assetList = ref<Array<{
    key: string;
    name: string;
    balance: string;
    value: number;
    color: string;
  }>>([
    {
      key: 'DFS',
      name: 'DFS Chain',
      balance: wallet.balances[WalletType.DFS],
      value: parseFloat(wallet.balances[WalletType.DFS]) * 0.5,
      color: 'bg-blue-500'
    }
  ]);
  
  // 计算属性
  const isWalletConnected = computed(() => {
    // 检查钱包状态是否为已连接，同时确保有currentWallet
    const connected = wallet.walletStatus.value === WalletStatus.CONNECTED && wallet.currentWallet.value !== null;
    
    // 记录计算结果到调试日志
    console.log("isWalletConnected computed: ", {
      status: wallet.walletStatus.value,
      hasWallet: wallet.currentWallet.value !== null,
      result: connected
    });
    
    return connected;
  });
  
  const walletAddress = computed(() => wallet.currentWallet.value?.address || 'bongo1234567890');
  const walletBalance = computed(() => {
    const balance = wallet.balances[WalletType.DFS];
    return parseFloat(balance || '0').toFixed(4);
  });
  
  // 添加调试日志
  const addDebugLog = (message: string, data?: any) => {
    error(message, data);
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = data ? `${timestamp} - ${message}: ${JSON.stringify(data)}` : `${timestamp} - ${message}`;
    debugLogs.value.push(logMessage);
    
    console.log(message, data);
    
    if (debugLogs.value.length > 300) {
      debugLogs.value.shift();
    }
  };
  
  // 刷新余额和资产列表
  const refreshWalletBalance = async () => {
    if (!isWalletConnected.value) {
      addDebugLog('钱包未连接，无法刷新余额');
      return;
    }
    
    try {
      addDebugLog('正在刷新余额...');
      loadingBalances.value = true;
      message.loading('正在刷新余额...', 1);
      
      const result = await wallet.refreshBalance();
      if (result) {
        assetList.value = result.assetsList;
        addDebugLog('余额更新成功', assetList.value);
      }
      
      message.success('余额已更新');
    } catch (err) {
      console.error('刷新余额失败:', err);
      addDebugLog('刷新余额失败', err);
      message.error('刷新余额失败');
    } finally {
      loadingBalances.value = false;
    }
  };
  
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
  };
  
  // 格式化地址
  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };
  
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
  };

  // 钱包操作方法
  
  // 创建钱包
  const handleCreateWallet = async () => {
    if (forms.newWallet.isCreating) {
      addDebugLog("钱包正在创建中，返回");
      return;
    }
    
    try {
      // 验证账户名
      if (forms.newWallet.accountName) {
        addDebugLog("验证账户名:", forms.newWallet.accountName);
        if (forms.newWallet.accountName.length !== 12 || !/^[a-z1-5.]+$/.test(forms.newWallet.accountName)) {
          addDebugLog("账户名验证失败");
          message.error('账户名必须是12个字符，且只能包含a-z、1-5和点号');
          return;
        }
      }
      
      forms.newWallet.isCreating = true;
      addDebugLog("准备创建钱包");
      
      const result = await wallet.createWallet(forms.newWallet.accountName || undefined);
      addDebugLog("钱包创建结果:", result);
      
      if (!result) {
        throw new Error('钱包创建失败：未返回结果');
      }
      
      if (!result.privateKey) {
        throw new Error('钱包创建失败：未返回私钥');
      }
      
      // 保存私钥以供备份
      forms.backup.privateKey = result.privateKey;
      forms.newWallet.reset();
      
      // 关闭创建模态框，显示备份模态框
      modals.createWallet = false;
      modals.backup = true;
      
      message.success('钱包创建成功！');
      await refreshWalletBalance();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      addDebugLog('创建钱包失败:', errorMessage);
      message.error(`创建钱包失败: ${errorMessage}`);
    } finally {
      forms.newWallet.isCreating = false;
    }
  };
  
  // 导入钱包
  const handleImportWallet = async () => {
    if (forms.importWallet.isImporting) {
      return;
    }
    
    if (!forms.importWallet.privateKey || !forms.importWallet.accountName) {
      message.error('请输入私钥和账户名');
      return;
    }
    
    try {
      forms.importWallet.isImporting = true;
      addDebugLog('开始导入钱包');
      
      await wallet.connectWallet(
        forms.importWallet.privateKey, 
        undefined, 
        forms.importWallet.accountName
      );
      
      modals.importWallet = false;
      forms.importWallet.reset();
      
      message.success('钱包导入成功');
      await refreshWalletBalance();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      addDebugLog('导入钱包失败:', errorMessage);
      message.error(`导入钱包失败: ${errorMessage}`);
    } finally {
      forms.importWallet.isImporting = false;
    }
  };
  
  // 断开钱包连接
  const handleDisconnectWallet = async () => {
    addDebugLog('尝试断开钱包连接');
    try {
      await wallet.disconnectWallet();
      addDebugLog('钱包断开成功');
      message.success('钱包已断开连接');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addDebugLog('断开钱包失败: ' + errorMessage);
      message.error('断开钱包失败: ' + errorMessage);
    }
  };
  
  // 发送代币
  const handleSendTokens = async () => {
    addDebugLog('开始执行发送交易', forms.send);
    
    if (!forms.send.recipient || !forms.send.amount) {
      message.error('请填写完整的交易信息');
      return;
    }
    
    try {
      message.loading('正在处理交易...');
      addDebugLog('发送交易参数:', {
        to: forms.send.recipient,
        amount: forms.send.amount,
        currency: forms.send.currency,
        memo: forms.send.memo
      });
      
      const txId = await wallet.sendTransaction(
        forms.send.recipient,
        forms.send.amount,
        forms.send.currency,
        forms.send.memo
      );
      
      modals.send = false;
      // forms.send.reset();
      
      message.success('交易发送成功！');
      addDebugLog('交易发送成功:', { txId });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      addDebugLog('交易发送失败:', errorMessage);
      message.error(`交易发送失败: ${errorMessage}`);
    }
  };
  
  // 完成备份过程
  const completeBackup = () => {
    modals.backup = false;
    forms.backup.reset();
    addDebugLog('备份过程完成');
  };
  
  // 切换私钥显示状态
  const togglePrivateKeyVisibility = () => {
    forms.backup.showPrivateKey = !forms.backup.showPrivateKey;
  };
  
  // 模拟价格变动数据
  const getPriceChange = () => {
    const fixedValue = -2.06;
    return fixedValue.toFixed(2);
  };

  return {
    // 状态
    wallet,
    activeTab,
    debugLogs,
    showDebugLogs,
    loadingBalances,
    modals,
    forms,
    assetList,
    
    // 计算属性
    isWalletConnected,
    walletAddress,
    walletBalance,
    
    // 方法
    addDebugLog,
    refreshWalletBalance,
    copyToClipboard,
    formatAddress,
    formatTransactionDate,
    handleCreateWallet,
    handleImportWallet,
    handleDisconnectWallet,
    handleSendTokens,
    completeBackup,
    togglePrivateKeyVisibility,
    getPriceChange
  };
} 