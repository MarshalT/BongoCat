import { info, error as logError } from '@tauri-apps/plugin-log'
import { JsonRpc } from 'eosjs'
/**
 * Token价格查询工具
 * 提供获取DFS和其他token价格的功能
 */

// API端点配置
const API_ENDPOINTS = {
  primary: 'https://api.dfs.land',
  fallback: 'https://api2.dfs.land', // 备用API地址，请替换为实际可用的备用地址
}

// 创建JsonRpc实例
const rpc = new JsonRpc(API_ENDPOINTS.primary)
const fallbackRpc = new JsonRpc(API_ENDPOINTS.fallback)

/**
 * 通过JsonRpc请求获取数据，出错时自动尝试备用节点
 * @param method 请求方法
 * @param params 请求参数
 * @returns 请求结果
 */
async function rpcRequest(method: string, params: any): Promise<any> {
  try {
    // 尝试使用主节点
    return await (rpc as any)[method](params)
  } catch (err) {
    info(`主节点请求失败，尝试备用节点: ${err}`)
    try {
      // 尝试备用节点
      return await (fallbackRpc as any)[method](params)
    } catch (fallbackErr) {
      logError(`所有节点请求失败: ${fallbackErr}`)
      throw new Error('无法连接到API服务器')
    }
  }
}

/**
 * 获取所有代币名称
 * @returns 所有代币名称的数组
 */
export async function getAllTokens(): Promise<string[]> {
  try {
    const projects = await getAllProjects()
    if (!projects || projects.length === 0) {
      return []
    }

    // 从每个项目中提取代币名称
    const tokens = projects.map((project) => {
      const tokenParts = project.token_per_nft.split(' ')
      return tokenParts[1]
    })

    // 去重
    const uniqueTokens = [...new Set(tokens)]
    console.log(`获取到${uniqueTokens.length}个不同的代币`)
    return uniqueTokens
  } catch (err) {
    console.error('获取代币列表失败:', err)
    return []
  }
}

// 项目缓存，避免重复请求
let projectsCache: any[] | null = null
const projectsCacheTimestamp = { value: 0 }

/**
 * 通过token名称获取对应的项目mid
 * @param tokenName 代币名称，如DFS、RICH等
 * @returns 返回对应项目的mid
 */
async function getTokenMidByName(tokenName: string): Promise<number | null> {
  try {
    // 检查缓存是否有效（10分钟内）
    const now = Date.now()
    if (!projectsCache || now - projectsCacheTimestamp.value > 10 * 60 * 1000) {
      // 缓存过期或不存在，重新获取所有项目
      projectsCache = await getAllProjects()
      projectsCacheTimestamp.value = now
    }

    if (!projectsCache || projectsCache.length === 0) {
      console.log('项目列表为空')
      return null
    }

    // 查找匹配token名称的项目
    const project = projectsCache.find((project: any) => {
      // 从token_per_nft中提取token名称，例如 "100.00000000 RICH" -> "RICH"
      const tokenParts = project.token_per_nft.split(' ')
      const projectTokenName = tokenParts[1]
      return projectTokenName === tokenName
    })

    // 找到匹配的项目，返回其mid
    if (project) {
      return project.mid
    }

    // 没有找到匹配项目的情况
    console.log(`未找到名为 ${tokenName} 的token项目`)
    return null
  } catch (err) {
    info('获取token mid失败')
    logError(String(err))
    console.error('获取token mid失败:', err)
    return null
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
      code: 'linklinklink',
      table: 'prices',
      scope: 'linklinklink',
      lower_bound: `${mid}`,
      upper_bound: `${mid}`,
      limit: 1,
      key_type: 'i64',
      json: true,
    })

    // 确保返回结果中有rows数据
    if (data && data.rows && data.rows.length > 0) {
      // price1_last是token的价格
      const tokenPrice = Number.parseFloat(data.rows[0].price1_last)
      console.log(`获取到mid=${mid}的价格: ${tokenPrice}`)
      return tokenPrice
    } else {
      console.log(`未找到mid=${mid}的价格数据`)
      return null
    }
  } catch (error) {
    console.error(`获取mid=${mid}的价格失败:`, error)
    return null
  }
}

/**
 * 获取DFS价格
 * @returns DFS价格
 */
export async function getDFSPriceFromAPI(): Promise<number> {
  try {
    // 直接查询mid=1的价格，DFS的mid固定为1
    const data = await rpcRequest('get_table_rows', {
      code: 'linklinklink',
      table: 'prices',
      scope: 'linklinklink',
      lower_bound: '1',
      upper_bound: '1',
      limit: 1,
      key_type: 'i64',
      json: true,
    })

    if (data && data.rows && data.rows.length > 0) {
      const dfsPrice = Number.parseFloat(data.rows[0].price1_last)
      console.log(`获取到DFS价格: ${dfsPrice}`)
      return dfsPrice
    } else {
      console.log('未找到DFS价格数据')
      //   return null;
      return 0
    }
  } catch (err) {
    console.error('获取DFS价格失败:', err)
    // return null;
    return 0
  }
}

// 缓存系统
interface PriceCache {
  price: number
  timestamp: number
}

const TOKEN_CACHE: Record<string, PriceCache> = {}
const CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存时间

/**
 * 从缓存获取价格，如果缓存有效则返回缓存的价格
 * @param tokenName 代币名称
 * @returns 缓存的价格，如果缓存无效则返回null
 */
function getPriceFromCache(tokenName: string): number | null {
  const cache = TOKEN_CACHE[tokenName]
  if (!cache) return null

  const now = Date.now()
  if (now - cache.timestamp > CACHE_DURATION) {
    // 缓存过期
    return null
  }

  return cache.price
}

/**
 * 将价格保存到缓存
 * @param tokenName 代币名称
 * @param price 价格
 */
function savePriceToCache(tokenName: string, price: number): void {
  TOKEN_CACHE[tokenName] = {
    price,
    timestamp: Date.now(),
  }
}

/**
 * 获取指定token的价格
 * @param tokenName 代币名称，例如DFS、RICH等
 * @param useCache 是否使用缓存，默认true
 * @returns Promise<number | null> token价格，获取失败返回null
 */
export async function getTokenPrice(tokenName: string, useCache: boolean = true): Promise<number | null> {
  // 尝试从缓存获取
  if (useCache) {
    const cachedPrice = getPriceFromCache(tokenName)
    if (cachedPrice !== null) {
      console.log(`使用缓存的${tokenName}价格: ${cachedPrice}`)
      return cachedPrice
    }
  }

  try {
    // DFS是特殊情况，直接返回DFS价格
    if (tokenName === 'DFS') {
      const price = await getDFSPriceFromAPI()
      if (price !== null && useCache) {
        savePriceToCache('DFS', price)
      }
      return price
    }

    // 其他token，需要先获取token的mid，再获取价格，最后乘以DFS价格
    // 1. 获取token的mid
    const mid = await getTokenMidByName(tokenName)
    if (mid === null) {
      console.log(`未找到token: ${tokenName}的mid`)
      return null
    }

    // 2. 获取token相对于DFS的价格
    const tokenToDfsPrice = await getPriceByMid(mid)
    if (tokenToDfsPrice === null) {
      console.log(`未找到token: ${tokenName}(mid=${mid})的价格`)
      return null
    }

    // 3. 获取DFS的价格
    const dfsPrice = await getTokenPrice('DFS', useCache)
    if (dfsPrice === null) {
      console.log('无法获取DFS价格，无法计算最终价格')
      return null
    }

    // 4. 计算token的最终USDT价格
    const finalPrice = tokenToDfsPrice * dfsPrice
    console.log(`${tokenName}的最终USDT价格: ${finalPrice} (${tokenName}/DFS=${tokenToDfsPrice} * DFS/USDT=${dfsPrice})`)

    // 保存到缓存
    if (useCache) {
      savePriceToCache(tokenName, finalPrice)
    }

    return finalPrice
  } catch (err) {
    console.error(`获取${tokenName}价格失败:`, err)
    return null
  }
}

/**
 * 获取多个token的价格
 * @param tokenNames 代币名称数组
 * @param useCache 是否使用缓存，默认true
 * @returns 代币名称到价格的映射
 */
export async function getMultipleTokenPrices(tokenNames: string[], useCache: boolean = true): Promise<Record<string, number | null>> {
  const result: Record<string, number | null> = {}

  // 先检查缓存
  if (useCache) {
    let allCached = true
    tokenNames.forEach((name) => {
      const cachedPrice = getPriceFromCache(name)
      if (cachedPrice !== null) {
        result[name] = cachedPrice
      } else {
        allCached = false
      }
    })

    // 如果所有token都有有效缓存，直接返回
    if (allCached) {
      console.log('所有token价格均使用缓存')
      return result
    }
  }

  // 首先获取DFS价格，避免重复请求
  const dfsPrice = await getTokenPrice('DFS', useCache)
  if (dfsPrice === null) {
    console.log('获取DFS价格失败，无法计算其他token价格')
    // 如果DFS价格获取失败，所有尚未从缓存获取的token价格都设为null
    tokenNames.forEach((name) => {
      if (result[name] === undefined) {
        result[name] = null
      }
    })
    return result
  }

  // 已经有DFS价格，可以设置DFS价格结果
  if (tokenNames.includes('DFS') && result.DFS === undefined) {
    result.DFS = dfsPrice
  }

  // 处理其他尚未从缓存获取的token
  const remainingTokens = tokenNames.filter(name => name !== 'DFS' && result[name] === undefined)

  // 并行处理所有其他token的价格查询
  await Promise.all(remainingTokens.map(async (tokenName) => {
    try {
      // 1. 获取token的mid
      const mid = await getTokenMidByName(tokenName)
      if (mid === null) {
        console.log(`未找到token: ${tokenName}的mid`)
        result[tokenName] = null
        return
      }

      // 2. 获取token相对于DFS的价格
      const tokenToDfsPrice = await getPriceByMid(mid)
      if (tokenToDfsPrice === null) {
        console.log(`未找到token: ${tokenName}(mid=${mid})的价格`)
        result[tokenName] = null
        return
      }

      // 3. 计算token的最终USDT价格
      const finalPrice = tokenToDfsPrice * dfsPrice
      console.log(`${tokenName}的最终USDT价格: ${finalPrice} (${tokenName}/DFS=${tokenToDfsPrice} * DFS/USDT=${dfsPrice})`)

      // 保存到缓存
      if (useCache) {
        savePriceToCache(tokenName, finalPrice)
      }

      result[tokenName] = finalPrice
    } catch (err) {
      console.error(`获取${tokenName}价格失败:`, err)
      result[tokenName] = null
    }
  }))

  return result
}

/**
 * 获取所有项目列表
 * @returns 所有项目的数组
 */
export async function getAllProjects(): Promise<any[]> {
  let allProjects: any[] = []
  let hasMore = true
  let nextKey = ''

  try {
    while (hasMore) {
      // 使用JsonRpc请求获取项目列表，支持分页
      const data = await rpcRequest('get_table_rows', {
        code: 'dfs3protocol',
        table: 'projects',
        scope: 'dfs3protocol',
        limit: 100,
        key_type: 'i64',
        json: true,
        lower_bound: nextKey || undefined,
      })

      if (!data || !data.rows || data.rows.length === 0) {
        break
      }

      // 添加到结果数组
      allProjects = [...allProjects, ...data.rows]

      // 检查是否还有更多数据
      hasMore = data.more
      if (hasMore) {
        nextKey = data.next_key
      }
    }

    console.log(`获取到共${allProjects.length}个项目`)
    info(`获取到共${allProjects.length}个项目`)
    return allProjects
  } catch (err) {
    console.error('获取项目列表失败:', err)
    return []
  }
}

/**
 * 获取所有token的价格
 * @param useCache 是否使用缓存，默认true
 * @returns 包含所有token价格的对象，key为token名称，value为价格
 */
export async function getAllTokenPrices(useCache: boolean = true): Promise<Record<string, number | null>> {
  try {
    // 获取所有token名称
    const allTokens = await getAllTokens()
    if (!allTokens || allTokens.length === 0) {
      console.log('没有找到任何token')
      return {}
    }

    console.log(`开始获取${allTokens.length}个token的价格`)

    // 获取所有token的价格
    const prices = await getMultipleTokenPrices(allTokens, useCache)
    console.log(`成功获取${Object.keys(prices).length}个token的价格`)

    return prices
  } catch (err) {
    console.error('获取所有token价格失败:', err)
    return {}
  }
}

/**
 * 通过token名称获取项目详细信息
 * @param tokenName 代币名称，如DFS、RICH等
 * @returns 项目详细信息，如果找不到则返回null
 */
export async function getProjectByToken(tokenName: string): Promise<any | null> {
  try {
    // 检查缓存是否有效（10分钟内）
    const now = Date.now()
    if (!projectsCache || now - projectsCacheTimestamp.value > 10 * 60 * 1000) {
      // 缓存过期或不存在，重新获取所有项目
      projectsCache = await getAllProjects()
      projectsCacheTimestamp.value = now
    }

    if (!projectsCache || projectsCache.length === 0) {
      console.log('项目列表为空')
      return null
    }

    // 查找匹配token名称的项目
    const project = projectsCache.find((project: any) => {
      // 从token_per_nft中提取token名称，例如 "100.00000000 RICH" -> "RICH"
      const tokenParts = project.token_per_nft.split(' ')
      const projectTokenName = tokenParts[1]
      return projectTokenName === tokenName
    })

    return project || null
  } catch (err) {
    console.error(`获取${tokenName}项目信息失败:`, err)
    return null
  }
}

/**
 * 获取所有项目，并按token名称组织
 * @returns 以token名称为key的项目映射
 */
export async function getAllProjectsByToken(): Promise<Record<string, any>> {
  try {
    const projects = await getAllProjects()
    if (!projects || projects.length === 0) {
      return {}
    }

    // 创建token名称到项目的映射
    const projectMap: Record<string, any> = {}

    projects.forEach((project) => {
      const tokenParts = project.token_per_nft.split(' ')
      const tokenName = tokenParts[1]
      projectMap[tokenName] = project
    })

    console.log(`创建了${Object.keys(projectMap).length}个token到项目的映射`)
    return projectMap
  } catch (err) {
    console.error('获取项目映射失败:', err)
    return {}
  }
}
