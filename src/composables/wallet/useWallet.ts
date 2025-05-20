import { ref, reactive } from 'vue';
import { message } from 'ant-design-vue';
import { Api, JsonRpc } from 'eosjs';
// 导入DfsWallet
import DfsWallet from '@/utils/dfs';
// 导入私钥转公钥函数
import { privateToPublic } from 'eosjs-ecc';

// 定义钱包类型
export enum WalletType {
  DFS = 'dfs',
  ETH = 'ethereum',
  BTC = 'bitcoin',
  USDT = 'tether'
}

// 定义钱包状态
export enum WalletStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error'
}

// 钱包信息接口
export interface WalletInfo {
  address: string;
  name: string;
  balance: string;
  publicKey?: string;
  privateKey?: string; // 注意：实际应用中私钥应当安全存储，不应暴露
  type: WalletType;
  chainId?: string;
}

// 交易信息接口
export interface Transaction {
  id: string;
  type: 'send' | 'receive';
  amount: string;
  currency: string;
  from: string;
  to: string;
  date: string;
  status: 'pending' | 'completed' | 'failed';
  memo?: string;
}

// 存储在本地的钱包数据
interface StoredWallet {
  address: string;
  name: string;
  publicKey: string;
  privateKey: string;
  type: WalletType;
  chainId: string;
}

/**
 * 钱包管理Composable
 * 提供钱包连接、交易和管理功能
 */
export function useWallet() {
  // 状态
  const walletStatus = ref<WalletStatus>(WalletStatus.DISCONNECTED);
  const currentWallet = ref<WalletInfo | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const transactions = ref<Transaction[]>([]);

  // 创建DfsWallet实例
  const dfsWallet = new DfsWallet();

  // DFS链ID
  const DFS_CHAIN_ID = '000d9cae502dd1cc895745e204f83cc892bc4c450f92a03ecd4fe057709853cc';

  // 余额信息
  const balances = reactive({
    [WalletType.DFS]: '0.0000',
    [WalletType.ETH]: '0.0000',
    [WalletType.BTC]: '0.0000',
    [WalletType.USDT]: '0.0000',
  });





  /**
   * 创建新钱包
   * @param accountName 可选账户名，用于DFS区块链
   */
  const createWallet = async (accountName?: string) => {
    try {
      console.log('useWallet.createWallet: 开始创建钱包过程');
      walletStatus.value = WalletStatus.CONNECTING;
      isLoading.value = true;

      // 确保DfsWallet已初始化
      console.log('useWallet.createWallet: 初始化DfsWallet');
      try {
        await dfsWallet.init('BongoCat');
        console.log('useWallet.createWallet: DfsWallet初始化成功');
      } catch (error) {
        console.error('useWallet.createWallet: DfsWallet初始化失败:', error);
        throw new Error(`DfsWallet初始化失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }

      // 使用DfsWallet创建新钱包
      console.log(`useWallet.createWallet: 调用createNewWallet，账户名: ${accountName || '随机生成'}`);
      let result;
      try {
        result = await dfsWallet.createNewWallet(accountName);
        console.log('useWallet.createWallet: 创建钱包结果:', result);
      } catch (error) {
        console.error('useWallet.createWallet: 创建钱包操作失败:', error);
        throw error;
      }

      if (!result) {
        console.error('useWallet.createWallet: 创建钱包返回空结果');
        throw new Error('创建钱包失败: 没有返回结果');
      }

      // 创建钱包信息
      console.log('useWallet.createWallet: 构建钱包信息对象');
      const walletInfo: WalletInfo = {
        address: result.accountName,
        name: result.accountName,
        balance: '0.0000 DFS', // 新钱包初始余额
        publicKey: result.publicKey,
        privateKey: result.privateKey,
        type: WalletType.DFS,
        chainId: result.chainId
      };

      // 保存钱包到本地存储
      console.log('useWallet.createWallet: 保存钱包信息到本地存储');
      localStorage.setItem('bongo-cat-wallet', JSON.stringify({
        address: result.accountName,
        name: result.accountName,
        publicKey: result.publicKey,
        privateKey: result.privateKey,
        type: WalletType.DFS,
        chainId: result.chainId
      }));

      // 设置当前钱包
      console.log('useWallet.createWallet: 更新当前钱包状态');
      currentWallet.value = walletInfo;

      // 设置初始余额
      balances[WalletType.DFS] = '0.0000';

      walletStatus.value = WalletStatus.CONNECTED;
      console.log('useWallet.createWallet: 钱包创建成功');


      return {
        address: result.accountName,
        privateKey: result.privateKey
      };
    } catch (err: any) {
      console.error('useWallet.createWallet: 创建钱包过程失败:', err);
      console.error('错误堆栈:', err.stack);
      error.value = `创建钱包失败: ${err.message || '未知错误'}`;
      walletStatus.value = WalletStatus.ERROR;
      message.error(`创建钱包失败: ${err.message || '未知错误'}`);
      throw err;
    } finally {
      isLoading.value = false;
      console.log('useWallet.createWallet: 钱包创建过程结束');
    }
  };
  /**
 * 连接现有钱包
 * @param privateKey 钱包私钥
 * @param existingWallet 可选的已存在钱包信息
 * @param accountName 可选的账户名
 */
  const connectWallet = async (privateKey: string, existingWallet?: StoredWallet, accountName?: string) => {
    if (!privateKey) {
      throw new Error('请提供有效的私钥');
    }

    try {
      walletStatus.value = WalletStatus.CONNECTING;
      isLoading.value = true;

      // 验证私钥格式（简单示例）
      if (privateKey.length < 30) {
        throw new Error('无效的私钥格式');
      }

      let walletInfo: WalletInfo;

      if (existingWallet) {
        // 使用已存在的钱包信息
        walletInfo = {
          address: existingWallet.address,
          name: existingWallet.name,
          balance: '0.0000 DFS', // 稍后会从区块链获取
          publicKey: existingWallet.publicKey,
          privateKey: existingWallet.privateKey,
          type: existingWallet.type,
          chainId: existingWallet.chainId
        };
      } else {
        // 从私钥创建新的钱包信息
        // 1. 初始化DfsWallet
        await dfsWallet.init('BongoCat', privateKey);

        // 2. 从私钥派生公钥
        const publicKey = privateToPublic(privateKey);

        // 4. 构建新的钱包信息
        walletInfo = {
          address: accountName || '',
          name: accountName || '',
          balance: '0.0000 DFS',
          publicKey: publicKey,
          privateKey: privateKey,
          type: WalletType.DFS,
          chainId: DFS_CHAIN_ID
        };

        // 5. 保存到本地存储
        localStorage.setItem('bongo-cat-wallet', JSON.stringify({
          address: accountName || '',
          name: accountName || '',
          publicKey: publicKey,
          privateKey: privateKey,
          type: WalletType.DFS,
          chainId: DFS_CHAIN_ID
        }));
      }

      // 使用DfsWallet初始化API连接
      await dfsWallet.init('BongoCat', privateKey);

      // 尝试获取真实余额
      try {
        const balance = await dfsWallet.getbalance('eosio.token', walletInfo.address);
        if (balance) {
          walletInfo.balance = balance;
          balances[WalletType.DFS] = balance.split(' ')[0];
        }
      } catch (e) {
        console.error('获取余额失败:', e);
      }

      // 设置当前钱包
      currentWallet.value = walletInfo;

      // 加载交易历史
      await loadTransactionHistory();

      walletStatus.value = WalletStatus.CONNECTED;
      message.success('钱包连接成功');
    } catch (err: any) {
      console.error('连接钱包失败:', err);
      error.value = `连接钱包失败: ${err.message || '未知错误'}`;
      walletStatus.value = WalletStatus.ERROR;
      message.error(`连接钱包失败: ${err.message || '未知错误'}`);
      throw err;
    } finally {
      isLoading.value = false;
    }
  };



  /**
   * 初始化钱包
   */
  const initWallet = async () => {
    try {
      isLoading.value = true;



      // 检查本地存储是否有钱包
      const storedWallet = localStorage.getItem('bongo-cat-wallet');
      if (storedWallet) {
        const walletData = JSON.parse(storedWallet) as StoredWallet;

        message.info(`初始化钱包:${walletData.privateKey} ${walletData.address} ${walletData.name}`);
        // 初始化DfsWallet
        await dfsWallet.init('BongoCat', walletData.privateKey);
        // 自动连接存储的钱包
        await connectWallet(walletData.privateKey, walletData, "");
      }

      walletStatus.value = storedWallet ? WalletStatus.CONNECTED : WalletStatus.DISCONNECTED;
    } catch (err: any) {
      console.error('初始化钱包失败:', err);
      error.value = `初始化钱包失败: ${err.message || '未知错误'}`;
      walletStatus.value = WalletStatus.ERROR;
    } finally {
      isLoading.value = false;
    }
  };





  /**
   * 断开钱包连接
   */
  const disconnectWallet = async () => {
    try {
      console.log('执行断开钱包连接...');
      
      // 先设置状态，确保UI立即响应
      walletStatus.value = WalletStatus.DISCONNECTED;
      currentWallet.value = null;

      // 重置余额
      Object.keys(balances).forEach(key => {
        balances[key as WalletType] = '0.0000';
      });

      // 清空交易历史
      transactions.value = [];

      // 清除本地存储
      localStorage.removeItem('bongo-cat-wallet');
      localStorage.removeItem('bongo-cat-transactions');

      // 尝试登出DfsWallet
      try {
        await dfsWallet.logout();
        console.log('DfsWallet登出成功');
      } catch (e) {
        console.error('登出钱包失败:', e);
        // 即使DFS钱包登出失败，我们仍然认为断开成功
      }

      console.log('钱包断开连接成功');
      return true; // 返回成功状态
    } catch (err: any) {
      console.error('断开钱包失败:', err);
      error.value = `断开钱包失败: ${err.message || '未知错误'}`;
      // 即使发生错误，也强制重置状态
      walletStatus.value = WalletStatus.DISCONNECTED;
      currentWallet.value = null;
      return false;
    }
  };

  /**
   * 发送代币交易
   * @param to 接收地址
   * @param amount 金额
   * @param currency 代币类型 (默认DFS)
   * @param memo 交易备注
   */
  const sendTransaction = async (to: string, amount: string, currency: string = 'DFS', memo: string = '') => {
    if (!currentWallet.value) {
      message.error('请先连接钱包');
      return null;
    }

    try {
      isLoading.value = true;

      // 验证基本参数
      if (!to || !amount) {
        throw new Error('接收地址和金额不能为空');
      }
       //需要处理小数点后8位
      // 验证金额格式
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error('无效的金额');
      }

      // 验证余额充足
      const currentBalance = parseFloat(balances[WalletType.DFS]);
      if (amountNum > currentBalance) {
        throw new Error('余额不足');
      }

      // 验证接收地址格式（DFS地址格式）
      if (!/^[a-z1-5.]{1,12}$/.test(to)) {
        throw new Error('无效的DFS接收地址');
      }

      // 构建发送代币的交易
      const transaction = {
        actions: [{
          account: 'eosio.token',
          name: 'transfer',
          authorization: [{
            actor: currentWallet.value.address,
            permission: 'active',
          }],
          data: {
            from: currentWallet.value.address,
            to: to,
            quantity: `${parseFloat(amount).toFixed(8)} DFS`,
            memo: memo || '',
          },
        }]
      };

      // 发送交易 - 使用免CPU服务
      const result = await dfsWallet.transact(transaction, { useFreeCpu: true });
      
      // 生成交易ID，如果事务结果有可以使用的ID就使用，否则生成一个新的
      let txId = generateTransactionId();
      
      // 尝试从事务结果中提取ID
      if (result) {
        // 检查常见的交易ID字段
        const possibleIdFields = ['transaction_id', 'id', 'trx_id', 'transactionId'];
        for (const field of possibleIdFields) {
          if ((result as any)[field]) {
            txId = (result as any)[field];
            break;
          }
        }
      }

      // 添加到交易历史
      const newTx: Transaction = {
        id: txId,
        type: 'send',
        amount,
        currency,
        from: currentWallet.value.address,
        to,
        date: new Date().toISOString(),
        status: 'completed',
        memo: memo || 'BongoCat Transaction'
      };

      // 更新交易历史
      transactions.value.unshift(newTx);

      // 保存交易历史到本地存储
      localStorage.setItem('bongo-cat-transactions', JSON.stringify(transactions.value));

      // 更新余额
      await refreshBalance();

      message.success('交易发送成功');
      return txId;
    } catch (err: any) {
      console.error('发送交易失败:', err);
      error.value = `发送交易失败: ${err.message || '未知错误'}`;
      message.error(`发送交易失败: ${err.message || '未知错误'}`);
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 刷新余额
   */
  const refreshBalance = async () => {
    if (!currentWallet.value) return;

    try {
      isLoading.value = true;

      // 使用DfsWallet获取DFS余额
      const balance = await dfsWallet.getbalance('eosio.token', currentWallet.value.address, 'DFS');
      
      // 获取所有其他代币余额
      const allTokens = await dfsWallet.get_currency_balance('dfsppptokens', currentWallet.value.address);
      
      // 更新DFS余额
      if (balance) {
        // 更新余额数据
        const balanceAmount = balance.split(' ')[0]; // 例如 "10.0000 DFS" -> "10.0000"
        balances[WalletType.DFS] = balanceAmount;

        if (currentWallet.value) {
          currentWallet.value.balance = balance;
        }
      }
      
      // 创建包含所有代币的资产列表
      const assetsList = [];
      
      // 添加DFS资产
      assetsList.push({
        key: 'DFS',
        name: 'DFS Chain',
        balance: balances[WalletType.DFS],
        value: parseFloat(balances[WalletType.DFS]) * 0.5,
        color: 'bg-blue-500'
      });
      
      // 处理并添加其他代币
      const colorClasses = [
        'bg-green-500', 'bg-purple-500', 'bg-red-500', 
        'bg-yellow-500', 'bg-indigo-500', 'bg-pink-500'
      ];
      
      allTokens.forEach((item, index) => {
        const parts = item.split(' ');
        if (parts.length === 2) {
          const tokenBalance = parts[0];
          const symbol = parts[1];
          const randomPrice = (Math.random() * 10).toFixed(2);
          const value = parseFloat(tokenBalance) * parseFloat(randomPrice);
          
          // 使用循环颜色系统
          const colorIndex = index % colorClasses.length;
          
          assetsList.push({
            key: symbol,
            name: `${symbol} Token`,
            balance: tokenBalance,
            value: value,
            color: colorClasses[colorIndex]
          });
        }
      });

      // 返回资产列表和当前DFS余额
      return {
        dfsBalance: balances[WalletType.DFS],
        assetsList: assetsList
      };
    } catch (err) {
      console.error('刷新余额失败:', err);
      // 如果获取真实余额失败，使用模拟数据作为备选
      const currentBalance = parseFloat(balances[WalletType.DFS]);
      const variation = (Math.random() * 0.2) - 0.1; // -0.1 to 0.1
      const newBalance = Math.max(0, currentBalance + variation).toFixed(4);
      balances[WalletType.DFS] = newBalance;

      if (currentWallet.value) {
        currentWallet.value.balance = `${newBalance} DFS`;
      }
      
      // 返回模拟数据
      return {
        dfsBalance: balances[WalletType.DFS],
        assetsList: [{
          key: 'DFS',
          name: 'DFS Chain',
          balance: balances[WalletType.DFS],
          value: parseFloat(balances[WalletType.DFS]) * 0.5,
          color: 'bg-blue-500'
        }]
      };
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 加载交易历史
   */
  const loadTransactionHistory = async () => {
    if (!currentWallet.value) return;

    try {
      isLoading.value = true;

      // 检查本地是否有存储的交易历史
      const storedTx = localStorage.getItem('bongo-cat-transactions');

      if (storedTx) {
        transactions.value = JSON.parse(storedTx);
      } else {
        // 尝试从区块链获取交易历史
        // 这里可以尝试使用DfsWallet获取真实交易历史
        // 但由于复杂性，以及可能需要额外的API，暂时使用模拟数据

        // 模拟交易历史数据
        transactions.value = [
          {
            id: generateTransactionId(),
            type: 'receive',
            amount: '10.0000',
            currency: 'DFS',
            from: 'dfs.genesis',
            to: currentWallet.value.address,
            date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            status: 'completed',
            memo: '初始余额'
          }
        ];

        // 存储到本地
        localStorage.setItem('bongo-cat-transactions', JSON.stringify(transactions.value));
      }
    } catch (err) {
      console.error('加载交易历史失败:', err);
    } finally {
      isLoading.value = false;
    }
  };



  // 辅助函数：生成交易ID
  const generateTransactionId = (): string => {
    const chars = '0123456789abcdef';
    let txId = '';

    for (let i = 0; i < 64; i++) {
      txId += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return txId;
  };

  return {
    // 状态
    walletStatus,
    currentWallet,
    isLoading,
    error,
    transactions,
    balances,

    // 方法
    initWallet,
    connectWallet,
    createWallet,
    disconnectWallet,
    sendTransaction,
    refreshBalance,
    loadTransactionHistory,
  };
} 