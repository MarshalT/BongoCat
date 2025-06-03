/**
 * 区块链操作工具
 * 用于处理与区块链交互的各种操作
 */

import { message } from 'ant-design-vue';

/**
 * 检查猫咪是否有可获取的经验
 * @param wallet 钱包实例
 * @param owner 所有者账号名
 * @param catId 猫咪ID
 * @param lastCheckTime 上次检查时间
 * @param debugLog 调试日志函数
 * @returns 是否有可获取的经验
 */
export const checkCatHasAvailableExp = async (
  wallet: any,
  owner: string,
  catId: number,
  lastCheckTime: number,
  debugLog?: (message: string, data?: any) => void
): Promise<boolean> => {
  try {
    // 查询loglogloglog合约的logs表
    const externalContract = 'loglogloglog';
    const logs = await wallet.getTableRows(
      externalContract,
      externalContract,
      'logs',
      '',
      1, // index_position: 1表示主键索引
      'i64',
      50, // 限制查询数量
      true // 反向查询，获取最新记录
    );
    
    if (!logs || !Array.isArray(logs)) {
      return false;
    }
    // 检查是否有该用户在上次检查后的新记录
    const hasExp = logs.some(log => {
      // 检查是否是目标用户的记录
      if (log.user === owner) {;
        // 检查是否是上次检查后的新记录
        const logTime = (new Date(log.create_time).getTime() / 1000) + 8 * 3600;
        if (logTime > lastCheckTime) {
          // 检查是否有USDT交易
          const inAmount = log.in || '';
          return inAmount.includes('USDT');
        }
      }
      return false;
    });
    return hasExp;
  } catch (error) {
    console.error('检查可获取经验失败:', error);
    debugLog?.(`检查可获取经验失败: ${error}`);
    return false;
  }
};

/**
 * 执行铸造猫咪操作
 * @param wallet 钱包实例
 * @param accountName 账户名
 * @param debugLog 调试日志函数
 * @returns 交易结果
 */
export const mintCat = async (
  wallet: any,
  accountName: string,
  debugLog?: (message: string, data?: any) => void
): Promise<any> => {
  try {
    // 查询用户余额，确保有足够的DFS
    const balance = await wallet.dfsWallet.getbalance('eosio.token', accountName, 'DFS');
    
    // 解析余额字符串，例如 "10.0000 DFS"
    const balanceValue = parseFloat(balance);
    if (isNaN(balanceValue) || balanceValue < 1.0) {
      const errorMsg = `DFS余额不足，铸造猫咪需要至少1.0000 DFS (当前余额: ${balance || '0.0000 DFS'})`;
      message.warning(errorMsg);
      debugLog?.('铸造猫咪余额不足:', { balance, required: '1.0000 DFS' });
      throw new Error(errorMsg);
    }
    
    // 执行铸造操作
    const result = await wallet.transact({
      actions: [{
        account: 'eosio.token',
        name: 'transfer',
        authorization: [{
          actor: accountName,
          permission: 'active',
        }],
        data: {
          from: accountName,
          to: 'ifwzjalq2lg1',  // 合约账户
          quantity: '1.00000000 DFS',  // 固定费用
          memo: 'mint'  // 特定备注，标识为铸造操作
        }
      }]
    }, { useFreeCpu: true });
    
    message.success('铸造猫咪交易已提交');
    debugLog?.('铸造猫咪交易已提交', result);
    return result;
  } catch (error) {
    debugLog?.('铸造猫咪失败:', error);
    throw error;
  }
};

/**
 * 执行喂养猫咪操作
 * @param wallet 钱包实例
 * @param accountName 账户名
 * @param catId 猫咪ID
 * @param debugLog 调试日志函数
 * @returns 交易结果
 */
export const feedCat = async (
  wallet: any,
  accountName: string,
  catId: number,
  debugLog?: (message: string, data?: any) => void
): Promise<any> => {
  try {
    // 查询用户余额，确保有足够的DFS
    const balance = await wallet.dfsWallet.getbalance('eosio.token', accountName, 'DFS');
    
    // 解析余额字符串，例如 "10.0000 DFS"
    const balanceValue = parseFloat(balance);
    if (isNaN(balanceValue) || balanceValue < 0.01) {
      const errorMsg = `DFS余额不足，喂养猫咪需要至少0.0100 DFS (当前余额: ${balance || '0.0000 DFS'})`;
      message.warning(errorMsg);
      debugLog?.('喂养猫咪余额不足:', { balance, required: '0.0100 DFS' });
      throw new Error(errorMsg);
    }
    
    // 执行喂养操作
    const result = await wallet.transact({
      actions: [{
        account: 'eosio.token',
        name: 'transfer',
        authorization: [{
          actor: accountName,
          permission: 'active',
        }],
        data: {
          from: accountName,
          to: 'ifwzjalq2lg1',  // 合约账户
          quantity: '0.01000000 DFS',  // 固定费用
          memo: `feed:${catId}`  // 特定备注，标识为喂养操作
        }
      }]
    }, { useFreeCpu: true });
    
    message.success('喂养猫咪交易已提交');
    debugLog?.('喂养猫咪交易已提交', result);
    return result;
  } catch (error) {
    debugLog?.('喂养猫咪失败:', error);
    throw error;
  }
};

/**
 * 执行升级猫咪操作
 * @param wallet 钱包实例
 * @param accountName 账户名
 * @param catId 猫咪ID
 * @param debugLog 调试日志函数
 * @returns 交易结果
 */
export const upgradeCat = async (
  wallet: any,
  accountName: string,
  catId: number,
  debugLog?: (message: string, data?: any) => void
): Promise<any> => {
  try {
    // 执行升级操作
    const result = await wallet.transact({
      actions: [{
        account: 'ifwzjalq2lg1',
        name: 'upgrade',
        authorization: [{
          actor: accountName,
          permission: 'active',
        }],
        data: {
          cat_id: catId,
          owner: accountName
        },
      }],
    }, { useFreeCpu: true });
    
    message.success('猫咪升级成功');
    debugLog?.('猫咪升级成功', result);
    return result;
  } catch (error) {
    debugLog?.('升级猫咪失败:', error);
    throw error;
  }
};

/**
 * 执行检查猫咪活动操作
 * @param wallet 钱包实例
 * @param accountName 账户名
 * @param catId 猫咪ID
 * @param debugLog 调试日志函数
 * @returns 交易结果
 */
export const checkCatAction = async (
  wallet: any,
  accountName: string,
  catId: number,
  debugLog?: (message: string, data?: any) => void
): Promise<any> => {
  try {
    // 执行检查操作
    const result = await wallet.transact({
      actions: [{
        account: 'ifwzjalq2lg1',
        name: 'checkaction',
        authorization: [{
          actor: accountName,
          permission: 'active',
        }],
        data: {
          owner: accountName,
          cat_id: catId
        },
      }],
    }, { useFreeCpu: true });
    
    message.success('检查活动成功');
    debugLog?.('检查活动成功', result);
    return result;
  } catch (error) {
    debugLog?.('检查活动失败:', error);
    throw error;
  }
};

/**
 * 获取用户的猫咪列表
 * @param wallet 钱包实例
 * @param accountName 账户名
 * @param debugLog 调试日志函数
 * @returns 猫咪列表
 */
export const getUserCats = async (
  wallet: any,
  accountName: string,
  debugLog?: (message: string, data?: any) => void
): Promise<any[]> => {
  try {
    const result = await wallet.getTableRows(
      'ifwzjalq2lg1',      // code: 合约账户名
      'ifwzjalq2lg1',      // scope: 表的作用域
      'cats',              // table: 表名
      accountName,         // lower_bound: 按所有者索引下限
      2,                   // index_position: 2表示secondary index
      'name',              // key_type: 索引键类型
      100                  // limit: 最大结果数
    );

    debugLog?.('获取猫咪API调用结果:', result);

    if (result && Array.isArray(result)) {
      // 过滤出属于当前用户的猫
      const userCats = result.filter(cat => cat.owner === accountName);
      debugLog?.('过滤后的用户猫咪列表:', userCats);
      return userCats;
    } else {
      debugLog?.('获取猫咪数据返回格式不正确:', result);
      throw new Error('获取猫咪数据格式不正确');
    }
  } catch (error) {
    debugLog?.('获取猫咪失败:', error);
    throw error;
  }
};

/**
 * 获取猫咪的互动记录
 * @param wallet 钱包实例
 * @param catId 猫咪ID
 * @param debugLog 调试日志函数
 * @returns 互动记录列表
 */
export const getCatInteractions = async (
  wallet: any,
  catId: number,
  debugLog?: (message: string, data?: any) => void
): Promise<any[]> => {
  try {
    const result = await wallet.getTableRows(
      'ifwzjalq2lg1',      // code: 合约账户名
      'ifwzjalq2lg1',      // scope: 表的作用域
      'interactions',       // table: 表名
      catId.toString(),     // lower_bound: 按猫咪ID索引
      2,                   // index_position: 2表示secondary index (cat_id)
      'i64',               // key_type: 索引键类型
      10                  // limit: 最大结果数
    );
    if (result && Array.isArray(result)) {
      // 过滤并按时间戳降序排序
      const interactions = result
        .filter(interaction => Number(interaction.cat_id) === catId)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(-5);
      return interactions;
    } else {
      debugLog?.('获取互动记录数据返回格式不正确:', result);
      throw new Error('获取互动记录数据格式不正确');
    }
  } catch (error) {
    debugLog?.('获取互动记录失败:', error);
    throw error;
  }
}; 