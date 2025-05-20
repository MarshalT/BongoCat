import { error as logError, info } from '@tauri-apps/plugin-log'
import { JsonRpc } from 'eosjs';
/**
 * Token价格查询工具
 * 提供获取DFS和其他token价格的功能
 */

// API端点配置
const API_ENDPOINTS = {
  primary: 'https://api.dfs.land',
  fallback: 'https://api2.dfs.land' // 备用API地址，请替换为实际可用的备用地址
};

// 创建JsonRpc实例
let rpc = new JsonRpc(API_ENDPOINTS.primary);
let fallbackRpc = new JsonRpc(API_ENDPOINTS.fallback);

/**
 * 通过JsonRpc请求获取数据，出错时自动尝试备用节点
 * @param method 请求方法
 * @param params 请求参数
 * @returns 请求结果
 */
async function rpcRequest(method: string, params: any): Promise<any> {
  try {
    // 尝试使用主节点
    return await (rpc as any)[method](params);
  } catch (err) {
    info(`主节点请求失败，尝试备用节点: ${err}`);
    try {
      // 尝试备用节点
      return await (fallbackRpc as any)[method](params);
    } catch (fallbackErr) {
      logError(`所有节点请求失败: ${fallbackErr}`);
      throw new Error('无法连接到API服务器');
    }
  }
}

/**
 * 通过token名称获取对应的项目mid
 * @param tokenName 代币名称，如DFS、RICH等
 * @returns 返回对应项目的mid
 */
async function getTokenMidByName(tokenName: string): Promise<number | null> {
  try {
    // 使用JsonRpc请求获取项目列表
    const data = await rpcRequest('get_table_rows', {
      code: "dfs3protocol", 
      table: "projects", 
      scope: "dfs3protocol", 
      limit: 100,
      key_type: "i64",
      json: true
    });
    
    info(data);
    
    // 项目列表为空
    if (!data || !data.rows || data.rows.length === 0) {
      return null;
    }

    // 查找匹配token名称的项目
    const project = data.rows.find((project: any) => {
      // 从token_per_nft中提取token名称，例如 "100.00000000 RICH" -> "RICH"
      const tokenParts = project.token_per_nft.split(' ');
      const projectTokenName = tokenParts[1];
      return projectTokenName === tokenName;
    });

    // 找到匹配的项目，返回其mid
    if (project) {
      return project.mid;
    }
    
    // 没有找到匹配项目的情况
    console.log(`未找到名为 ${tokenName} 的token项目`);
    return null;
  } catch (err) {
    info("获取token mid失败");
    logError(String(err));
    console.error('获取token mid失败:', err);
    return null;
  }
}

/**
 * 根据mid获取token价格
 * @param mid 项目ID
 * @returns token价格
 */
async function getPriceByMid(mid: number): Promise<number | null> {
  try {
    // 使用JsonRpc请求获取价格数据
    const data = await rpcRequest('get_table_rows', {
      code: "linklinklink", 
      table: "prices", 
      scope: "linklinklink", 
      lower_bound: `${mid}`, 
      upper_bound: `${mid}`, 
      limit: 1, 
      key_type: "i64", 
      json: true
    });
    
    // 确保返回结果中有rows数据
    if (data && data.rows && data.rows.length > 0) {
      // price1_last是token的价格
      const tokenPrice = parseFloat(data.rows[0].price1_last);
      console.log(`获取到mid=${mid}的价格: ${tokenPrice}`);
      return tokenPrice;
    } else {
      console.log(`未找到mid=${mid}的价格数据`);
      return null;
    }
  } catch (error) {
    console.error(`获取mid=${mid}的价格失败:`, error);
    return null;
  }
}

/**
 * 获取指定token的价格
 * @param tokenName 代币名称，例如DFS、RICH等
 * @returns Promise<number | null> token价格，获取失败返回null
 */
export async function getTokenPrice(tokenName: string): Promise<number | null> {
  try {
    // DFS是特殊情况，直接返回DFS价格
    if (tokenName === 'DFS') {
      // 直接查询mid=1的价格，DFS的mid固定为1
      const data = await rpcRequest('get_table_rows', {
        code: "linklinklink", 
        table: "prices", 
        scope: "linklinklink", 
        lower_bound: "1", 
        upper_bound: "1", 
        limit: 1, 
        key_type: "i64", 
        json: true
      });
      
      if (data && data.rows && data.rows.length > 0) {
        const dfsPrice = parseFloat(data.rows[0].price1_last);
        console.log(`获取到DFS价格: ${dfsPrice}`);
        return dfsPrice;
      } else {
        console.log('未找到DFS价格数据');
        return null;
      }
    }

    // 其他token需要先查找对应的mid
    const mid = await getTokenMidByName(tokenName);
    if (!mid) {
      console.log(`未找到token ${tokenName}的mid`);
      return null;
    }

    // 通过mid获取价格
    return await getPriceByMid(mid);
  } catch (error) {
    console.error(`获取${tokenName}价格失败:`, error);
    return null;
  }
}

/**
 * 批量获取多个token的价格
 * @param tokenNames token名称数组
 * @returns 返回一个对象，key为token名称，value为对应价格
 */
export async function getMultipleTokenPrices(tokenNames: string[]): Promise<Record<string, number | null>> {
  const result: Record<string, number | null> = {};
  
  await Promise.all(
    tokenNames.map(async (tokenName) => {
      result[tokenName] = await getTokenPrice(tokenName);
    })
  );
  
  return result;
} 