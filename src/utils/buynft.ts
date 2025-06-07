/**
 * 项目自动交易工具
 * 用于自动购买指定项目的NFT
 */

import { message } from 'ant-design-vue'

/**
 * 随机打乱数组
 * @param array 需要打乱的数组
 * @returns 打乱后的数组
 */
function shuffle<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]] // 交换元素
  }
  return result
}

/**
 * 获取项目初始NFT价格
 * @param wallet 钱包实例
 * @param pid 项目ID
 * @returns 初始NFT价格
 */
export async function getInitNftPriceById(wallet: any, pid: string | number, debugLog?: (message: string, data?: any) => void): Promise<string> {
  try {
    // 查询项目信息
    const projectInfo = await wallet.getTableRows(
      'dfs3protocol',
      'dfs3protocol',
      'projects',
      pid.toString(),
      pid.toString(),
      1,
      'i64',
      1,
      false,
    )

    if (projectInfo && Array.isArray(projectInfo) && projectInfo.length > 0) {
      const initPrice = projectInfo[0].init_price
      debugLog?.(`获取项目 #${pid} 初始价格成功: ${initPrice}`)
      return initPrice
    } else {
      debugLog?.(`获取项目 #${pid} 初始价格失败: 未找到项目信息`)
      throw new Error(`未找到项目 #${pid} 的信息`)
    }
  } catch (error) {
    debugLog?.(`获取项目 #${pid} 初始价格失败:`, error)
    throw error
  }
}
/**
 * 执行购买NFT操作
 * @param wallet 钱包实例
 * @param id NFT ID
 * @param currentPrice 当前价格
 * @param debugLog 调试日志函数
 * @returns 购买结果
 */
export async function executeBuyNftByid(wallet: any, id: string | number, currentPrice: string, debugLog?: (message: string, data?: any) => void): Promise<string> {
  try {
    // 获取当前用户账号
    const accountName = wallet.currentWallet?.value?.address

    if (!accountName) {
      throw new Error('未找到用户账号')
    }

    debugLog?.(`准备购买 NFT #${id}，账户: ${accountName}，价格: ${currentPrice}`)

    // 准备交易数据
    const transaction = {
      actions: [{
        account: 'eosio.token',
        name: 'transfer',
        authorization: [{
          actor: accountName,
          permission: 'active',
        }],
        data: {
          from: accountName,
          to: 'dfs3protocol',
          quantity: currentPrice,
          memo: `buy:${id}`,
        },
      }],
    }

    debugLog?.(`发送交易: ${JSON.stringify(transaction)}`)

    const result = await wallet.transact(transaction, { useFreeCpu: true })
    if (result) {
      debugLog?.(`购买NFT #${id} 成功: ${result.transaction_id}`)
      return result.transaction_id
    } else {
      debugLog?.(`购买NFT #${id} 失败: ${result}`)
      return ''
    }
  } catch (error: any) {
    debugLog?.(`购买NFT #${id} 失败: ${error.message || '未知错误'}`)
    throw error
  }
}

/**
 * 执行销毁或分裂NFT操作
 * @param wallet 钱包实例
 * @param id NFT ID
 * @param op 销毁或分裂 字符串 burn or split
 * @param debugLog 调试日志函数
 * @returns 购买结果
 */
export async function executeburnorsplieNftByid(wallet: any, id: string | number, op: string, debugLog?: (message: string, data?: any) => void): Promise<string> {
  try {
    // 获取当前用户账号
    const accountName = wallet.currentWallet?.value?.address

    if (!accountName) {
      throw new Error('未找到用户账号')
    }

     const data=wallet.dfsWallet.assetidtohex(id)
    // 准备交易数据
    const transaction = {
      actions: [{
        account: 'dfs3protocol',
        name: op,
        authorization: [{
          actor: accountName,
          permission: 'active',
        }],
        data: data,
      }],
    }

    debugLog?.(`发送交易: ${JSON.stringify(transaction)}`)

    const result = await wallet.transact(transaction, { useFreeCpu: true })
    if (result) {
      debugLog?.(`NFT #${id} ${op} 成功: ${result.transaction_id}`)
      return result.transaction_id
    } else {
      debugLog?.(`NFT #${id} ${op} 失败: ${result}`)
      return ''
    }
  } catch (error: any) {
    debugLog?.(`NFT #${id} ${op} 失败: ${error.message || '未知错误'}`)
    throw error
  }
}
/**
 * 执行自动购买操作
 * @param wallet 钱包实例
 * @param projectId 项目ID
 * @param maxCount 最大购买数量
 * @param maxPriceMultiplier 最大价格倍数（相对于初始价格）
 * @param debugLog 调试日志函数
 * @returns 购买结果
 */
export async function executeAutoBuy(wallet: any, projectId: string | number, maxCount: number = 5, maxPriceMultiplier: number = 2, debugLog?: (message: string, data?: any) => void): Promise<{ success: number, failed: number, total: number }> {
  try {
    if (!wallet) {
      throw new Error('钱包实例未初始化')
    }

    // 获取当前用户账号
    const accountName = wallet.account?.name
    if (!accountName) {
      throw new Error('未找到用户账号')
    }

    debugLog?.(`开始自动购买项目 #${projectId} 的NFT，最大数量: ${maxCount}`)

    // 获取项目数据
    let nftList = await wallet.getTableRows(
      'dfs3protocol',
      'dfs3protocol',
      'registry',
      projectId.toString(),
      projectId.toString(),
      2, // index_position: 2表示使用二级索引
      'i64',
      500, // 限制查询数量
      false,
    )

    if (!nftList || !Array.isArray(nftList) || nftList.length === 0) {
      throw new Error(`未找到项目 #${projectId} 的NFT数据`)
    }

    debugLog?.(`获取到项目 #${projectId} 的NFT数据，共 ${nftList.length} 条`)

    // 过滤掉自己拥有的NFT
    nftList = nftList.filter(item => item.owner !== accountName)
    debugLog?.(`过滤掉自己拥有的NFT后，剩余 ${nftList.length} 条`)

    // 获取项目初始价格
    const initNftPrice = await getInitNftPriceById(wallet, projectId, debugLog)
    const initPriceValue = Number.parseFloat(initNftPrice.split(' ')[0])
    const maxPrice = initPriceValue * maxPriceMultiplier

    debugLog?.(`项目 #${projectId} 初始价格: ${initNftPrice}, 最大接受价格: ${maxPrice} DFS`)

    // 随机选择NFT并按价格排序
    let targetNfts = nftList
    if (nftList.length > maxCount) {
      // 随机打乱后选择指定数量
      targetNfts = shuffle(nftList).slice(0, maxCount)
    }

    // 按价格降序排序
    targetNfts.sort((a: any, b: any) => {
      const priceA = Number.parseFloat(a.current_price.split(' ')[0])
      const priceB = Number.parseFloat(b.current_price.split(' ')[0])
      return priceB - priceA // 降序
    })

    debugLog?.(`已选择 ${targetNfts.length} 个NFT进行购买尝试`)

    // 交易结果统计
    const results = {
      success: 0,
      failed: 0,
      total: targetNfts.length,
    }

    // 遍历数据并执行购买
    for (const item of targetNfts) {
      const currentPrice = item.current_price
      const id = item.id
      const priceValue = Number.parseFloat(currentPrice.split(' ')[0])

      debugLog?.(`尝试购买 NFT #${id}，当前价格: ${currentPrice}`)

      // 检查价格是否超过最大接受价格
      if (priceValue > maxPrice) {
        debugLog?.(`NFT #${id} 价格 ${currentPrice} 超过最大接受价格 ${maxPrice} DFS，跳过`)
        results.failed++
        continue
      }

      // 准备交易数据
      const transaction = {
        actions: [{
          account: 'eosio.token',
          name: 'transfer',
          authorization: [{
            actor: accountName,
            permission: 'active',
          }],
          data: {
            from: accountName,
            to: 'dfs3protocol',
            quantity: currentPrice,
            memo: `buy:${id}`,
          },
        }],
      }

      // 尝试执行交易，支持自动重试
      const attemptTransfer = async (startTime: number) => {
        try {
          // 执行购买操作
          const result = await wallet.transact(transaction, { useFreeCpu: true })

          // 购买成功
          message.success(`成功购买 NFT #${id}，价格: ${currentPrice}`)
          debugLog?.(`成功购买 NFT #${id}，价格: ${currentPrice}，交易ID: ${result?.transaction_id}`)
          results.success++

          // 记录交易到钱包历史
          recordTransaction(
            wallet,
            result?.transaction_id || `buy-${Date.now()}`,
            'buy',
            currentPrice.split(' ')[0],
            currentPrice.split(' ')[1],
            accountName,
            'dfs3protocol',
            typeof id === 'number' ? id : Number.parseInt(id),
            debugLog,
          )
        } catch (error: any) {
          // 检查是否需要重试
          const currentTime = new Date().getTime()
          const elapsedTime = currentTime - startTime

          if (elapsedTime < 2 * 60 * 1000) { // 如果未超过2分钟
            // 购买失败，记录错误
            debugLog?.(`购买 NFT #${id} 失败，尝试重试: ${error.message || '未知错误'}`)

            // 设置定时器再次尝试购买
            setTimeout(() => attemptTransfer(startTime), 400) // 400毫秒后重试
          } else {
            // 超过重试时间，标记为失败
            message.error(`购买 NFT #${id} 失败: ${error.message || '未知错误'}`)
            debugLog?.(`购买 NFT #${id} 失败，已超过重试时间:`, error)
            results.failed++
          }
        }
      }

      // 记录开始时间并尝试执行交易
      const startTime = new Date().getTime()
      await attemptTransfer(startTime)
    }

    debugLog?.(`自动购买完成，成功: ${results.success}，失败: ${results.failed}，总计: ${results.total}`)
    return results
  } catch (error) {
    debugLog?.('自动购买失败:', error)
    throw error
  }
}

/**
 * 记录交易到钱包交易记录
 * @param wallet 钱包实例
 * @param txId 交易ID
 * @param type 交易类型
 * @param amount 金额
 * @param currency 代币符号
 * @param from 发送方
 * @param to 接收方
 * @param nftId NFT ID
 * @param debugLog 调试日志函数
 */
export function recordTransaction(wallet: any, txId: string, type: string, amount: string, currency: string, from: string, to: string, nftId?: number, debugLog?: (message: string, data?: any) => void): void {
  try {
    if (!wallet || !wallet.transactions) {
      debugLog?.('记录交易失败: 钱包实例不完整')
      return
    }

    // 构造交易记录
    const newTx = {
      id: txId,
      type: 'send',
      amount,
      currency,
      from,
      to,
      date: new Date().toISOString(),
      status: 'completed',
      memo: type === 'buy'
        ? `购买NFT #${nftId}`
        : `交易 ${type}`,
    }

    // 添加到交易历史
    wallet.transactions.value.unshift(newTx)

    // 保存到本地存储
    localStorage.setItem('bongo-cat-transactions', JSON.stringify(wallet.transactions.value))

    debugLog?.('交易已记录到钱包历史', newTx)
  } catch (error) {
    console.error('记录交易失败:', error)
    debugLog?.('记录交易失败:', error)
  }
}

/**
 * 批量购买NFT（并发执行，保留重试功能）
 * @param wallet 钱包实例
 * @param ids NFT ID数组
 * @param prices 价格数组
 * @param debugLog 调试日志函数
 * @param abortSignal 取消信号
 * @returns 购买结果
 */
export async function executeBatchBuy(wallet: any, ids: (string | number)[], prices: string[], debugLog?: (message: string, data?: any) => void, abortSignal?: AbortSignal): Promise<{ success: number, failed: number, total: number }> {
  try {
    if (!wallet) {
      throw new Error('钱包实例未初始化')
    }

    // 验证输入参数
    if (!Array.isArray(ids) || !Array.isArray(prices) || ids.length !== prices.length) {
      throw new Error('输入参数无效：ID数组和价格数组必须有相同的长度')
    }

    if (ids.length === 0) {
      throw new Error('输入参数无效：ID数组不能为空')
    }

    // 获取当前用户账号
    const accountName = wallet.currentWallet?.value?.address
    if (!accountName) {
      throw new Error('未找到用户账号')
    }

    debugLog?.(`开始并发批量购买 ${ids.length} 个NFT (带重试功能)`)

    // 交易结果统计
    const results = {
      success: 0,
      failed: 0,
      total: ids.length,
    }

    // 创建购买任务数组
    const purchaseTasks = ids.map((id, index) => {
      const currentPrice = prices[index]
      return buyNFTWithRetry(wallet, id, currentPrice, accountName, results, debugLog, abortSignal)
    })

    // 并发执行所有购买任务
    await Promise.all(purchaseTasks)

    debugLog?.(`并发批量购买完成，成功: ${results.success}，失败: ${results.failed}，总计: ${results.total}`)
    return results
  } catch (error) {
    // 检查是否是取消操作
    if ((error as Error).name === 'AbortError') {
      debugLog?.('批量购买已被用户取消')
      throw new Error('批量购买已被用户取消')
    }

    debugLog?.('批量购买失败:', error)
    throw error
  }
}

/**
 * 购买单个NFT（用于并发批量购买，带重试功能）
 * @param wallet 钱包实例
 * @param id NFT ID
 * @param currentPrice 当前价格
 * @param accountName 账户名
 * @param results 结果统计对象
 * @param debugLog 调试日志函数
 * @param abortSignal 取消信号
 * @returns 购买结果
 */
async function buyNFTWithRetry(wallet: any, id: string | number, currentPrice: string, accountName: string, results: { success: number, failed: number, total: number }, debugLog?: (message: string, data?: any) => void, abortSignal?: AbortSignal): Promise<void> {
  try {
    // 检查是否已取消
    if (abortSignal?.aborted) {
      debugLog?.(`NFT #${id} 购买已取消`)
      results.failed++
      return
    }

    // 检查价格格式是否正确
    if (!currentPrice || typeof currentPrice !== 'string' || !currentPrice.includes(' ')) {
      debugLog?.(`NFT #${id} 价格格式不正确: ${currentPrice}，跳过`)
      results.failed++
      return
    }

    debugLog?.(`尝试购买 NFT #${id}，当前价格: ${currentPrice}`)

    // 准备交易数据
    const transaction = {
      actions: [{
        account: 'eosio.token',
        name: 'transfer',
        authorization: [{
          actor: accountName,
          permission: 'active',
        }],
        data: {
          from: accountName,
          to: 'dfs3protocol',
          quantity: currentPrice,
          memo: `buy:${id}`,
        },
      }],
    }

    // 尝试执行交易，支持自动重试
    const attemptTransfer = async (startTime: number): Promise<void> => {
      // 检查是否已取消
      if (abortSignal?.aborted) {
        debugLog?.(`NFT #${id} 购买已取消`)
        throw new Error('操作已取消')
      }

      try {
        // 执行购买操作
        const result = await wallet.transact(transaction, { useFreeCpu: true })

        // 购买成功
        debugLog?.(`成功购买 NFT #${id}，价格: ${currentPrice}，交易ID: ${result?.transaction_id}`)

        // 记录交易到钱包历史
        recordTransaction(
          wallet,
          result?.transaction_id || `buy-${Date.now()}`,
          'buy',
          currentPrice.split(' ')[0],
          currentPrice.split(' ')[1],
          accountName,
          'dfs3protocol',
          typeof id === 'number' ? id : Number.parseInt(id),
          debugLog,
        )

        results.success++
      } catch (error: any) {
        // 检查是否已取消
        if (abortSignal?.aborted) {
          debugLog?.(`NFT #${id} 购买已取消`)
          throw new Error('操作已取消')
        }



        // 检查是否需要重试
        const currentTime = new Date().getTime()
        const elapsedTime = currentTime - startTime

        if (elapsedTime <2* 60* 1000) { // 如果未超过2分钟
          // 购买失败，记录错误
          debugLog?.(`购买 NFT #${id} 失败，尝试重试: ${error.message || '未知错误'}`)

          // 设置定时器再次尝试购买
          await new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
              resolve(null)
            }, 400) // 400毫秒后重试

            // 如果取消，清除定时器
            if (abortSignal) {
              abortSignal.addEventListener('abort', () => {
                clearTimeout(timeoutId)
                resolve(null)
              }, { once: true })
            }
          })

          // 再次检查是否已取消
          if (abortSignal?.aborted) {
            debugLog?.(`NFT #${id} 购买已取消`)
            throw new Error('操作已取消')
          }

          return attemptTransfer(startTime)
        } else {
          // 超过重试时间，标记为失败
          debugLog?.(`购买 NFT #${id} 失败，已超过重试时间:`, error)
          results.failed++
        }
      }
    }

    // 记录开始时间并尝试执行交易
    const startTime = new Date().getTime()
    await attemptTransfer(startTime)
  } catch (error: any) {
    // 检查是否是取消操作
    if (error.message === '操作已取消' || abortSignal?.aborted) {
      debugLog?.(`NFT #${id} 购买已取消`)
      results.failed++
      return
    }

    debugLog?.(`购买 NFT #${id} 异常: ${error.message || '未知错误'}`)
    results.failed++
  }
}
