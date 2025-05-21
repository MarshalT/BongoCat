'use strict'

const { Api, JsonRpc } = require('eosjs')
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig')

function fetch(...args) {
  return import('node-fetch').then(({ default: fetch }) => fetch(...args))
}
const CHAINID = '000d9cae502dd1cc895745e204f83cc892bc4c450f92a03ecd4fe057709853cc'

// 免CPU服务账户配置
const FREECPU = {
  privateKey: '5JdBkvZva99uwBanXjGGhF4T7SrLpgTBipU76CD9QN4dFRPuD4N',
  account: 'dfs.service',
  authority: 'cpu',
  contract: 'dfsfreecpu11',
  actionName: 'freecpu',
}

const my = {
  privateKey: 'PVT_K1_2v7Yxn3pDZGaUxzruwPtk2M9Pt88M6pvXx2ey7gkPzoKJVnoSE',
  account: 'taftfdfmcqvp',
  authority: 'active',
  contract: 'dfsfreecpu11',
  actionName: 'freecpu',
}

// 确保私钥格式检查
function validatePrivateKey(key) {
  if (typeof key !== 'string' || key.trim() === '') {
    throw new Error('私钥格式无效')
  }
  return key
}

function getFreeCpuApi(rpc, freeCpuPrivateKey) {
  const private_keys = [validatePrivateKey(freeCpuPrivateKey)]

  const signatureProvider = new JsSignatureProvider(private_keys)

  const eos_client = new Api({
    rpc,
    signatureProvider,
    textDecoder: new TextDecoder(),
    textEncoder: new TextEncoder(),
  })
  return eos_client
}

function getApi(rpc, PrivateKey) {
  const private_keys = [validatePrivateKey(PrivateKey)]

  const signatureProvider = new JsSignatureProvider(private_keys)
  const eos_client = new Api({
    rpc,
    signatureProvider,
    textDecoder: new TextDecoder(),
    textEncoder: new TextEncoder(),
  })
  return eos_client
}

class DfsWallet {
  constructor() {
    this.times = 30
    this.appName = ''
    this.logoUrl = ''
    this.DFSWallet = null // 这里设计为可连接的钱包对象
    this.api = null
    this.rpc = null
    this.chainId = CHAINID
    this.freeCpuApi = null
    // this.connect().then((res) => {
    //     console.log('connect - res', res);
    // });
  }

  async connect() {
    return new Promise((resolve) => {
      // 这里实现 DFSWallet 的连接逻辑（需要替换为实际的连接逻辑）
      if (this.DFSWallet != null) {
        resolve(true)
      } else {
        let times = 0
        const timer = setInterval(() => {
          // 检查 DFSWallet 是否已连接
          if (this.DFSWallet != null || ++times === this.times) {
            clearInterval(timer)
            resolve(this.DFSWallet != null)
          }
        }, 50)
      }
    })
  }

  async regIsConnect() {
    const isConnected = await this.connect()
    if (!isConnected) {
      throw new Error('dfsWallet not connected')
    }
  }

  async init(appName, private_key = null) {
    this.appName = appName
    const network = { chainId: this.chainId }
    this.rpc = new JsonRpc(' https://8.138.81.44')

    console.log('init', appName, this.rpc.endpoint, network)

    // 确保有可用的私钥
    let validPrivateKey = private_key
    if (!validPrivateKey) {
      try {
        // 尝试从配置文件读取
        validPrivateKey = config.private_key
        if (!validPrivateKey) {
          // 如果配置文件没有私钥，使用FREECPU的私钥
          validPrivateKey = my.privateKey
        }
      } catch (e) {
        console.log('无法读取配置私钥，使用FREECPU私钥')
        validPrivateKey = my.privateKey
      }
    }

    // 确保私钥格式正确
    if (typeof validPrivateKey !== 'string' || validPrivateKey.trim() === '') {
      throw new Error('无效的私钥格式')
    }

    this.api = getApi(this.rpc, validPrivateKey)
    this.freeCpuApi = getFreeCpuApi(this.rpc, FREECPU.privateKey)
    console.log('init done')
  }

  async login() {
    await this.regIsConnect()
    // 需要实现 DFSWallet 登录逻辑
    const id = await this.DFSWallet.login({
      chainId: this.chainId,
      newLogin: true,
    })
    return {
      channel: 'dfswallet',
      authority: id.accounts[0].authority,
      name: id.accounts[0].name,
      publicKey: id.accounts[0].publicKey,
    }
  }

  async logout() {
    // 需要实现 DFSWallet 登出逻辑
    // if (this.DFSWallet) {
    //     await this.DFSWallet.logout();
    // }
  }

  async transact(transaction, opts = {}) {
    // console.log('transact', transaction, opts);
    let resp
    try {
      if (opts.useFreeCpu) {
        // delete opts.useFreeCpu;
        console.log('useFreeCpu')

        return await this.transactByFreeCpu(transaction, opts)
      }
      // console.log('api', this.api);
      console.log(' no useFreeCpu')
      resp = await this.api.transact(transaction, {
        blocksBehind: 3,
        expireSeconds: 3600,
        ...opts,
      })
      return resp
    } catch (error) {
      const eMsg = this.dealError(error)
      throw eMsg
    }
  }

  async transactByFreeCpu(transaction, opts = {}) {
    const accAuth = transaction.actions[0].authorization[0]
    transaction.actions.unshift({
      account: FREECPU.contract,
      name: FREECPU.actionName,
      authorization: [
        {
          actor: FREECPU.account,
          permission: FREECPU.authority,
        },
        accAuth,
      ],
      data: {
        user: accAuth.actor,
      },
    })

    try {
      // 当前账户签名
      const _PushTransactionArgs = await this.api.transact(transaction, {
        blocksBehind: 3,
        expireSeconds: 3600,
        sign: false,
        broadcast: false,
      })
      const availableKeys = await this.api.signatureProvider.getAvailableKeys()
      // console.log('availableKeys', availableKeys);

      const serializedTx = _PushTransactionArgs.serializedTransaction

      const signArgs = {
        chainId: this.chainId,
        requiredKeys: availableKeys,
        serializedTransaction: serializedTx,
        abis: [],
      }
      const pushTransactionArgs = await this.api.signatureProvider.sign(signArgs)

      // 免CPU签名
      const freeCpuRequiredKeys = await this.freeCpuApi.signatureProvider.getAvailableKeys()
      const signArgsFreeCpu = {
        chainId: this.chainId,
        requiredKeys: freeCpuRequiredKeys,
        serializedTransaction: serializedTx,
        abis: [],
      }
      const pushTransactionArgsFreeCpu = await this.freeCpuApi.signatureProvider.sign(signArgsFreeCpu)
      pushTransactionArgs.signatures.unshift(pushTransactionArgsFreeCpu.signatures[0])

      // 将操作广播出去
      if (!config.debug) {
        const push_result = await this.api.pushSignedTransaction(pushTransactionArgs)

        console.log('push_result', push_result.transaction_id)

        return push_result
      } else {
        console.log('debug mode, skip pushSignedTransaction')
        return {
          transaction_id: 'debug_mode_skip_pushSignedTransaction',
        }
      }
    } catch (error) {
      const eMsg = this.dealError(error)
      // console.log();

      throw eMsg
    }
  }

  async sign(data = '') {
    if (!this.DFSWallet || !this.api) {
      throw new Error('Wallet not init')
    }
    const availableKeys = await this.api.signatureProvider.getAvailableKeys()
    return await this.DFSWallet.getArbitrarySignature(availableKeys[0], data)
  }

  dealError(e) {
    let back = {
      code: 999,
      message: e,
    }

    if (e.message === 'you have no permission for this operation') {
      back = {
        code: 999,
        message: e.message,
      }
      return back
    }
    if (e.code === 0) {
      back = {
        code: 0,
        message: 'Cancel',
      }
      return back
    }
    if (e.json && e.json.code === 500) {
      const dErr = e.json.error
      const dealFun = [
        [
          (code) => {
            const codes = [3080004]
            return codes.includes(Number(code))
          },
          (tErr) => {
            const detail = tErr.details
            if (detail[0].message.includes('reached node configured max-transaction-time')) {
              return {
                code: '3080004_2',
                message: 'reached node configured max-transaction-time',
              }
            }
            return {
              code: 402,
              message: 'CPU Insufficient',
            }
          },
        ],
        [
          (code) => {
            const codes = [3080002, 3080001]
            return codes.includes(Number(code))
          },
          (tErr) => {
            return {
              code: 402,
              message: `${tErr.code == 3080001 ? 'RAM' : 'CPU'} Insufficient`,
            }
          },
        ],
        [
          (code) => {
            const codes = [3080006]
            return codes.includes(Number(code))
          },
          () => {
            return {
              code: 3080006,
              message: 'timeout',
            }
          },
        ],
        [
          (code) => {
            const codes = [3050003, 3010010]
            return codes.includes(Number(code))
          },
          (tErr) => {
            const detail = tErr.details
            if (detail[0].message.includes('INSUFFICIENT_OUTPUT_AMOUNT')) {
              return {
                code: 3050003,
                message: 'INSUFFICIENT OUTPUT AMOUNT',
              }
            }
            return {
              code: tErr.code,
              message: detail[0].message,
            }
          },
        ],
      ]
      const findErr = dealFun.find(v => v[0](dErr.code))
      if (findErr) {
        back = findErr[1](dErr)
      } else {
        back = {
          code: dErr.code,
          message: dErr.details[0].message,
        }
      }
      return {
        code: back.code,
        message: back.message,
      }
    }
    return back
  }

  // 查询账号余额
  async queryBalance(account) {
    const resp = await rpc.get_table_rows({
      json: true, // Get the response as json
      code: 'eosio.token', // Contract that we target
      scope: account, // Account that owns the data
      table: 'accounts', // Table name
      limit: 10, // Maximum number of rows that we want to get
      reverse: false, // Optional: Get reversed data
      show_payer: false, // Optional: Show ram payer
    })
    return resp.rows
  }

  getbalance = async (code, account, symbol = 'DFS') => {
    try {
      const response = await this.rpc.get_currency_balance(code, account, symbol)
      console.log(response)

      return response[0]
    } catch (error) {
      console.error(`Error fetching balance for ${account}:`, error)
      return null
    }
  }

  // 创建新钱包和账户
  async createNewWallet(accountName = null, ramBytes = 1024, netAmount = '0.00000001', cpuAmount = '0.00000001') {
    try {
      console.log('开始创建新钱包...')

      // 1. 生成或验证账户名
      if (!accountName) {
        // 生成随机账户名
        accountName = this.generateAccountName()
        console.log(`已生成随机账户名: ${accountName}`)
      } else if (accountName.length !== 12 || !/^[a-z1-5.]+$/.test(accountName)) {
        throw new Error('账户名必须是12个字符,只能包含a-z,1-5和点号')
      }

      // 2. 生成新的密钥对
      const { publicKey, privateKey } = await this.generateKeyPair()
      console.log(`已生成新密钥对, 公钥: ${publicKey}`)

      // 3. 使用账号创建新账户
      // 检查是使用服务账号还是自己的账号创建
      const creatorAccount = my.account ? my : FREECPU
      // const creatorAccount = FREECPU;

      console.log(`正在使用账号 ${creatorAccount.account}@${creatorAccount.authority} 创建新账户 ${accountName}...`)

      // 构建创建账户交易
      const createAccountAction = {
        actions: [{
          account: 'eosio',
          name: 'newaccount',
          authorization: [{
            actor: creatorAccount.account,
            permission: creatorAccount.authority,
          }],
          data: {
            creator: creatorAccount.account,
            name: accountName,
            owner: {
              threshold: 1,
              keys: [{
                key: publicKey,
                weight: 1,
              }],
              accounts: [],
              waits: [],
            },
            active: {
              threshold: 1,
              keys: [{
                key: publicKey,
                weight: 1,
              }],
              accounts: [],
              waits: [],
            },
          },
        }, {
          account: 'eosio',
          name: 'buyrambytes',
          authorization: [{
            actor: creatorAccount.account,
            permission: creatorAccount.authority,
          }],
          data: {
            payer: creatorAccount.account,
            receiver: accountName,
            bytes: ramBytes,
          },
        }, {
          account: 'eosio',
          name: 'delegatebw',
          authorization: [{
            actor: creatorAccount.account,
            permission: creatorAccount.authority,
          }],
          data: {
            from: creatorAccount.account,
            receiver: accountName,
            stake_net_quantity: `${netAmount} DFS`,
            stake_cpu_quantity: `${cpuAmount} DFS`,
            transfer: true,
          },
        }],
      }

      // transact
      const opts = { useFreeCpu: true, blocksBehind: 3, expireSeconds: 3600 }
      const result = await this.transact(createAccountAction, opts)

      //   console.log('result', result);

      return {
        accountName,
        publicKey,
        privateKey,
        transactionId: result.transaction_id,
        chainId: this.chainId,
      }
    } catch (error) {
      console.error('创建钱包失败:', error)

      // 尝试提取更有用的错误信息
      if (error.json && error.json.error) {
        const errorDetails = error.json.error

        // 检查常见错误类型并提供更友好的错误消息
        if (errorDetails.name === 'name_type_exception') {
          throw new Error(`账户名 "${accountName}" 格式无效: ${errorDetails.what}`)
        }

        if (errorDetails.name === 'account_name_exists_exception') {
          throw new Error(`账户名 "${accountName}" 已存在,请尝试其他名称`)
        }

        // 权限相关错误
        if (errorDetails.name === 'missing_auth_exception'
          || errorDetails.name === 'irrelevant_auth_exception') {
          throw new Error(`权限错误: ${errorDetails.what}`)
        }

        // 重复签名错误
        if (errorDetails.name === 'tx_duplicate_sig') {
          throw new Error(`签名错误: 交易包含重复签名`)
        }
      }

      throw error
    }
  }

  // 生成密钥对
  async generateKeyPair() {
    try {
      console.log('正在生成密钥对...')

      // 使用eosjs-ecc库生成密钥对
      const eosEcc = require('eosjs-ecc')

      // 生成随机私钥
      const privateKey = await eosEcc.randomKey()
      console.log('私钥已生成')

      // 从私钥派生公钥
      const publicKey = eosEcc.privateToPublic(privateKey)
      console.log('公钥已生成')

      // 确保publicKey是EOS开头的格式
      let formattedPublicKey = publicKey
      if (!formattedPublicKey.startsWith('EOS')) {
        formattedPublicKey = `EOS${publicKey.substring(publicKey.indexOf('_') + 1)}`
      }

      console.log('密钥对生成完成')
      return { privateKey, publicKey: formattedPublicKey }
    } catch (error) {
      console.error('生成密钥对失败:', error)
      throw new Error(`生成密钥对失败: ${error.message || '未知错误'}`)
    }
  }

  // 生成随机账户名
  generateAccountName() {
    const crypto = require('node:crypto')
    const characters = 'abcdefghijklmnopqrstuvwxyz12345'
    let result = ''

    // 前五个字符随机
    for (let i = 0; i < 5; i++) {
      const randomIndex = crypto.randomInt(0, characters.length)
      result += characters[randomIndex]
    }

    // 添加7个数字和字母的随机组合
    for (let i = 0; i < 7; i++) {
      const randomIndex = crypto.randomInt(0, characters.length)
      result += characters[randomIndex]
    }

    return result
  }

  // 获取FREECPU账号信息
  getFreeCPUAccount() {
    return { ...FREECPU }
  }

  // 获取我的账号信息
  getMyAccount() {
    return { ...my }
  }
}

module.exports = DfsWallet
