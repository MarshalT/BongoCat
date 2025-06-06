// 导入 DfsWallet 实例
const config = require('./config.json')
const dfsWallet = require('./dfs') // 确保路径正确
const { logToFile } = require('./logger')

// 函数：随机打乱数组
function shuffle(array) {
  // console.log("处理前的array:", array);
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]] // 交换元素
  }
  // console.log("处理后的array:", array);
  return array
}
/**
 * 执行转账操作
 * @param {Array} args - 命令行参数
 * @returns {Promise<void>}
 */
async function executeTransfer(args) {
  console.log('Starting transfer script v1.0.0', args)

  if (args.length < 2) {
    console.log('Usage: node transfer.js [project_id] [get_nft_count]')
    return
  }

  // 创建 DfsWallet 实例
  const myDfsWallet = new dfsWallet()

  // 初始化钱包
  await myDfsWallet.init('MyApp', config.account1.private_key)

  // 获取链上数据
  let data = null
  let getnftcont = 0
  const getnftconted = args[1]
  const from = config.account1.address

  console.log(`from:${from}`)

  if (args.length === 0) {
    data = await myDfsWallet.getTableRows() // 获取所有数据
  } else {
    console.log('获取项目数据')
    data = await myDfsWallet.getTableRowsS('dfs3protocol', 'registry', args[0], args[0])
    // data = await myDfsWallet.getTableRows1('dfs3protocol', "dfs3protocol",'registry',
    // { upper_bound: args[0], lower_bound: args[0], limit: 500, reverse: true, json: true, index_position: 1, key_type: "i64" });
    if (data === null) {
      console.log('获取项目数据失败', args[0])
      data = await myDfsWallet.getTableRowsS('dfs3protocol', 'registry', args[0], args[0])
      // data = await myDfsWallet.getTableRows1('dfs3protocol', 'registry',
      //  { upper_bound: args[0], lower_bound: args[0], limit: 500, reverse: true, json: true, index_position: 1, key_type: "i64" });
    } else {
      console.log('获取项目数据成功')

      data = data.filter(item => item.owner !== from) // 过滤掉自己

      // 随机选择 N 个项
      if (data.length >= getnftconted) {
        const shuffledData = shuffle(data) // 打乱数组
        data = shuffledData.slice(0, getnftconted) // 取前 n 个
        // console.log(data);
        data.sort((a, b) => {
          const priceA = Number.parseFloat(a.current_price.split(' ')[0])
          const priceB = Number.parseFloat(b.current_price.split(' ')[0])
          return priceB - priceA // 降序
        })

        console.log(data)
      } else {
        console.log(`符合条件的数据项少于: ${getnftconted} 个`)
      }
    }
  }

  const opts = {
    useFreeCpu: true,
    blocksBehind: 3,
    expireSeconds: 3600,
  }

  const pid = data[0].pid
  const initNftPrice = await myDfsWallet.getInitNftPriceById(pid)
  console.log('initNftPrice:', initNftPrice)

  console.log('pid 项目ID:', pid)

  console.log(`开始抢图 预计购买数量: ${getnftconted}`)

  // 遍历数据并执行转账
  for (const item of data) {
    const currentPrice = item.current_price
    const id = item.id
    console.info(`开始交易 id:${id} current_price:${currentPrice} initNftPrice:${initNftPrice}`)

    if (Number.parseFloat(currentPrice) > Number.parseFloat(initNftPrice) * 2) {
      console.log('current_price is too high, skip')
      continue
    }
    const transaction = {
      actions: [
        {
          account: 'eosio.token',
          name: 'transfer',
          authorization: [
            {
              actor: from,
              permission: 'active',
            },
          ],
          data: {
            from,
            to: 'dfs3protocol',
            quantity: `${currentPrice}`,
            memo: `buy:${item.id}`,
          },
        },
      ],
    }

    const attemptTransfer = async (startTime) => {
      try {
        const result = await myDfsWallet.transact(transaction, opts)
        console.log('Transfer successful for current_price:', currentPrice, 'Result:', result)
        getnftcont++
      } catch (error) {
        const currentTime = new Date().getTime()
        const elapsedTime = currentTime - startTime

        if (elapsedTime < 2 * 60 * 1000) { // 如果未超过1分钟
          console.error('Transfer failed for current_price:', currentPrice, 'Error:', error.message)
          // 设置定时器再次尝试转账
          setTimeout(() => attemptTransfer(startTime), 400) // 设置500毫秒后重试
        } else {
          console.log('超过1分钟，停止转账尝试。')
        }
      }
    }

    // 记录开始时间
    const startTime = new Date().getTime()
    // 尝试执行转账
    await attemptTransfer(startTime)
  }
}

// 导出函数供其他模块调用
module.exports = { executeTransfer }

// 如果需要在命令行运行
if (require.main === module) {
  const args = process.argv.slice(2)
  executeTransfer(args).catch(console.error) // 捕获并打印错误
}
