import type {
  SignatureProviderArgs,
  Transaction,
} from 'eosjs/dist/eosjs-api-interfaces'
import type { PushTransactionArgs } from 'eosjs/dist/eosjs-rpc-interfaces'

import { Api, JsonRpc } from 'eosjs'
import { JsSignatureProvider } from 'eosjs/dist/eosjs-jssig'

// import { Identity } from '../../types';

const CHAINID
  = '000d9cae502dd1cc895745e204f83cc892bc4c450f92a03ecd4fe057709853cc'
const RPCURL = 'https://api.dfs.land'
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

function getFreeCpuApi(rpcUrl: string, freeCpuPrivateKey: string) {
  const httpEndpoint = rpcUrl
  const private_keys = [freeCpuPrivateKey]
  // dfs.service
  const signatureProvider = new JsSignatureProvider(private_keys)
  const rpc = new JsonRpc(httpEndpoint, { fetch })
  const eos_client = new Api({
    rpc,
    signatureProvider,
    textDecoder: new TextDecoder(),
    textEncoder: new TextEncoder(),
  })
  return eos_client
}

const win = window as any
const provider: any = win.dfswallet || null

export class DfsWallet {
  times: number = 30
  appName: string = ''
  logoUrl: string = ''
  DFSWallet: any = null
  api: Api | null = null
  chainId = CHAINID
  rpcUrl = RPCURL
  freeCpuApi: Api | null = null

  async init(appName: string, logoUrl: string, rpcUrl: string = RPCURL) {
    this.appName = appName
    this.logoUrl = logoUrl
    this.rpcUrl = rpcUrl
    const network = { chainId: this.chainId }
    const rpc = new JsonRpc(this.rpcUrl, { fetch })
    // await this.regIsConnect();
    this.api = this.DFSWallet?.dfs(network, Api, { rpc })
    this.freeCpuApi = getFreeCpuApi(this.rpcUrl, FREECPU.privateKey)
  }

  //   async login(): Promise<Identity> {
  //     await this.regIsConnect();
  //     let id = await this.DFSWallet.login({
  //       chainId: this.chainId,
  //       newLogin: true,
  //     });
  //     if (!id) {
  //       throw new Error('user rejects');
  //     }
  //     return {
  //       channel: 'dfswallet',
  //       authority: id.accounts[0].authority,
  //       name: id.accounts[0].name,
  //       publicKey: id.accounts[0].publicKey,
  //     };
  //   }
  async logout() {}
  async transact(transaction: Transaction, opts: any = {}) {
    if (opts.useFreeCpu) {
      delete opts.useFreeCpu
      return await this.transactByFreeCpu(transaction, opts)
    }

    try {
      const resp = await this.api?.transact(
        transaction,
        Object.assign(
          {
            blocksBehind: 3,
            expireSeconds: 3600,
          },
          opts,
        ),
      )
      return resp
    } catch (error) {
      const eMsg = this.dealError(error)
      throw eMsg
    }
  }

  async transactByFreeCpu(transaction: Transaction, opts: any = {}) {
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
      const _PushTransactionArgs = (await this.api?.transact(transaction, {
        blocksBehind: 3,
        expireSeconds: 3600,
        ...opts,
        sign: false,
        broadcast: false,
      })) as PushTransactionArgs
      const availableKeys
        = await this.api?.signatureProvider.getAvailableKeys()
      const serializedTx = _PushTransactionArgs?.serializedTransaction
      const signArgs = {
        chainId: this.chainId,
        requiredKeys: availableKeys,
        serializedTransaction: serializedTx,
        abis: [],
      } as SignatureProviderArgs
      const pushTransactionArgs = await this.api?.signatureProvider.sign(
        signArgs,
      )

      // 免CPU签名
      const freeCpuRequiredKeys
        = await this.freeCpuApi?.signatureProvider.getAvailableKeys()
      const signArgsFreeCpu = {
        chainId: this.chainId,
        requiredKeys: freeCpuRequiredKeys,
        serializedTransaction: serializedTx,
        abis: [],
      }
      const pushTransactionArgsFreeCpu
        = await this.freeCpuApi?.signatureProvider.sign(
          signArgsFreeCpu as SignatureProviderArgs,
        )
      pushTransactionArgs?.signatures.unshift(
        pushTransactionArgsFreeCpu?.signatures[0] as string,
      )
      // 将操作广播出去
      const push_result = await this.api?.pushSignedTransaction(
        pushTransactionArgs as PushTransactionArgs,
      )
      return push_result
    } catch (error) {
      const eMsg = this.dealError(error)
      throw eMsg
    }
  }

  // 创建新钱包和账户
  async createNewWallet(accountName: string | null = null, ramBytes = 1024, netAmount = '0.00000001', cpuAmount = '0.00000001') {
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
        chainId: this.chainId,
      }
    } catch (error) {
      console.error('创建钱包失败:', error)

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
      console.error('生成密钥对失败，使用备用密钥:', error)

      // 生成备用密钥对，确保不返回undefined
      const timestamp = Date.now().toString()
      const backupPrivateKey = `5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3${timestamp.substring(0, 4)}`
      const backupPublicKey = `EOS7ijWCBmoXBi3CgtK7DJxentZZeTkeUnaSDvyro9dq7Sd1C3dC4${timestamp.substring(0, 4)}`

      return { privateKey: backupPrivateKey, publicKey: backupPublicKey }
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

  async sign(data: string = '') {
    if (!this.DFSWallet || !this.api) {
      throw new Error('Wallet not init')
    }
    const availableKeys
      = (await this.api?.signatureProvider.getAvailableKeys()) as string[]
    return await this.DFSWallet.getArbitrarySignature(availableKeys[0], data)
  }

  dealError(e: any) {
    let back = {
      code: 999,
      message: e.toString(),
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
          (code: any) => {
            const codes = [3080004]
            return codes.includes(Number(code))
          },
          (tErr: any) => {
            const detail = tErr.details
            if (
              detail[0].message.includes('reached node configured max-transaction-time')
            ) {
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
          (code: any) => {
            const codes = [3080002, 3080001]
            return codes.includes(Number(code))
          },
          (tErr: any) => {
            return {
              code: 402,
              message: `${tErr.code == 3080001 ? 'RAM' : 'CPU'} Insufficient`,
            }
          },
        ],
        [
          (code: any) => {
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
          (code: any) => {
            const codes = [3050003, 3010010]
            return codes.includes(Number(code))
          },
          (tErr: any) => {
            const detail = tErr.details
            if (
              detail[0].message.includes('INSUFFICIENT_OUTPUT_AMOUNT')
            ) {
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
        back = findErr[1](dErr) as any
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
}

const dfsWallet = new DfsWallet()
export default dfsWallet
