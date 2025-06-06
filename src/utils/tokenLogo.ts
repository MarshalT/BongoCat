/**
 * Token Logo 工具
 * 用于获取代币的 Logo URL
 */

import { getProjectByToken } from './tokenPrice'

// 默认 DFS 代币 Logo URL
const DFS_LOGO_URL = 'https://dfs.land/assets/tokens/eosio.token-DFS.png'
// USDT 代币 Logo URL
const USDT_LOGO_URL = 'https://dfs.land/assets/tokens/usdtusdtusdt-USDT.png'

// 缓存系统
interface LogoCache {
  url: string
  timestamp: number
}

const LOGO_CACHE: Record<string, LogoCache> = {}
const CACHE_DURATION = 30 * 60 * 1000 // 30分钟缓存时间

/**
 * 从缓存获取 Logo URL，如果缓存有效则返回缓存的 URL
 * @param tokenName 代币名称
 * @returns 缓存的 Logo URL，如果缓存无效则返回 null
 */
function getLogoFromCache(tokenName: string): string | null {
  const cache = LOGO_CACHE[tokenName]
  if (!cache) return null

  const now = Date.now()
  if (now - cache.timestamp > CACHE_DURATION) {
    // 缓存过期
    return null
  }

  return cache.url
}

/**
 * 将 Logo URL 保存到缓存
 * @param tokenName 代币名称
 * @param url Logo URL
 */
function saveLogoToCache(tokenName: string, url: string): void {
  LOGO_CACHE[tokenName] = {
    url,
    timestamp: Date.now(),
  }
}

/**
 * 获取代币的 Logo URL
 * @param tokenName 代币名称，例如 DFS、RICH 等
 * @param useCache 是否使用缓存，默认 true
 * @returns Promise<string> 代币 Logo URL，获取失败返回空字符串
 */
export async function getTokenLogo(tokenName: string, useCache: boolean = true): Promise<string> {
  // 如果是 DFS，直接返回固定 URL
  if (tokenName === 'DFS') {
    return DFS_LOGO_URL
  }

  // 如果是 USDT，直接返回固定 URL
  if (tokenName === 'USDT') {
    return USDT_LOGO_URL
  }

  // 尝试从缓存获取
  if (useCache) {
    const cachedLogo = getLogoFromCache(tokenName)
    if (cachedLogo !== null) {
      console.log(`使用缓存的 ${tokenName} Logo URL: ${cachedLogo}`)
      return cachedLogo
    }
  }

  try {
    // 获取代币对应的项目信息
    const project = await getProjectByToken(tokenName)

    if (!project) {
      console.log(`未找到代币 ${tokenName} 的项目信息`)
      return ''
    }

    // 从项目信息中获取 token_url
    if (project.token_url) {
      const logoUrl = project.token_url
      console.log(`获取到 ${tokenName} 的 Logo URL: ${logoUrl}`)

      // 保存到缓存
      if (useCache) {
        saveLogoToCache(tokenName, logoUrl)
      }

      return logoUrl
    } else {
      console.log(`项目 ${tokenName} 没有提供 token_url`)
      return ''
    }
  } catch (err) {
    console.error(`获取 ${tokenName} Logo URL 失败:`, err)
    return ''
  }
}

/**
 * 获取多个代币的 Logo URL
 * @param tokenNames 代币名称数组
 * @param useCache 是否使用缓存，默认 true
 * @returns Promise<Record<string, string>> 代币名称到 Logo URL 的映射
 */
export async function getMultipleTokenLogos(
  tokenNames: string[],
  useCache: boolean = true,
): Promise<Record<string, string>> {
  const result: Record<string, string> = {}

  // 并行处理所有代币的 Logo 获取
  await Promise.all(
    tokenNames.map(async (tokenName) => {
      try {
        const logoUrl = await getTokenLogo(tokenName, useCache)
        result[tokenName] = logoUrl
      } catch (error) {
        console.error(`获取 ${tokenName} Logo URL 失败:`, error)
        result[tokenName] = ''
      }
    }),
  )

  return result
}
