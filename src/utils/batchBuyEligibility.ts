/**
 * 批量购买资格检查工具
 * 用于检查用户是否满足批量购买NFT的条件
 */

import { getUserCats } from './chainOperations'

/**
 * 检查用户是否满足批量购买条件（拥有猫咪且等级达到10级）
 * @param wallet 钱包实例
 * @param debugLog 调试日志函数（可选）
 * @returns 包含是否满足条件和原因的对象
 */
export async function checkBatchBuyEligibility(wallet: any, debugLog?: (message: string, data?: any) => void): Promise<{ eligible: boolean, reason: string, highestLevel: number }> {
  try {
    // 检查钱包是否连接
    if (!wallet || !wallet.currentWallet?.value?.address) {
      return {
        eligible: false,
        reason: '钱包未连接，请先连接钱包',
        highestLevel: 0,
      }
    }

    const accountName = wallet.currentWallet.value.address
    debugLog?.(`检查用户 ${accountName} 的批量购买资格`)

    // 获取用户的猫咪列表
    const cats = await getUserCats(wallet, accountName, debugLog)

    // 检查是否有猫咪
    if (!cats || cats.length === 0) {
      return {
        eligible: false,
        reason: '您还没有猫咪，请先获取一只猫咪',
        highestLevel: 0,
      }
    }

    // 找出最高等级的猫咪
    let highestLevelCat = cats[0]
    for (const cat of cats) {
      if (cat.level > highestLevelCat.level) {
        highestLevelCat = cat
      }
    }

    const highestLevel = highestLevelCat.level
    debugLog?.(`用户 ${accountName} 的最高猫咪等级: ${highestLevel}`)

    // 检查是否达到10级
    if (highestLevel < 5) {
      return {
        eligible: false,
        reason: `批量购买需要猫咪等级达到10级，您的最高等级为${highestLevel}级`,
        highestLevel,
      }
    }

    // 满足条件
    return {
      eligible: true,
      reason: '您已满足批量购买条件',
      highestLevel,
    }
  } catch (error: any) {
    debugLog?.('检查批量购买资格失败:', error)
    return {
      eligible: false,
      reason: `检查资格失败: ${error.message || '未知错误'}`,
      highestLevel: 0,
    }
  }
}
