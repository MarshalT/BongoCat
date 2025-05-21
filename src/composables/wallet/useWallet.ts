import { error as logError, info as logInfo } from '@tauri-apps/plugin-log'
import { message } from 'ant-design-vue'
import { privateToPublic } from 'eosjs-ecc'
import { reactive, ref } from 'vue'

import DfsWallet from '@/utils/dfs'
import { decryptWalletData, encryptWalletData } from '@/utils/Encrypt'
import { PasswordManager } from '@/utils/PasswordManager'
import { SecurePrivateKey } from '@/utils/SecurePrivateKey'

// 导入DfsWallet
// 导入私钥转公钥函数

// 定义钱包类型
export enum WalletType {
  DFS = 'dfs',
  ETH = 'ethereum',
  BTC = 'bitcoin',
  USDT = 'tether',
}

// 定义钱包状态
export enum WalletStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}

// 定义钱包信息接口
export interface WalletInfo {
  address: string
  name: string
  balance: string
  publicKey?: string
  // 不再直接存储私钥，而是使用脱敏版本
  privateKey?: string // 敏感数据，只在内存中临时存在
  type: WalletType
  chainId?: string
}

// 交易信息接口
export interface Transaction {
  id: string
  type: 'send' | 'receive'
  amount: string
  currency: string
  from: string
  to: string
  date: string
  status: 'pending' | 'completed' | 'failed'
  memo?: string
}

// 存储在本地的钱包数据
interface StoredWallet {
  address: string
  name: string
  publicKey: string
  privateKey: string
  type: WalletType
  chainId: string
}

// 全局单例钱包实例
let _walletInstance: ReturnType<typeof createWalletInstance> | null = null

// 敏感数据处理函数
function sanitizePrivateKey(privateKey: string): string {
  if (!privateKey) return ''
  // 只保留前4位和后4位，中间用***替代
  const prefix = privateKey.slice(0, 4)
  const suffix = privateKey.slice(-4)
  return `${prefix}***${suffix}`
}

// 私钥格式验证
function validatePrivateKey(privateKey: string): boolean {
  // 基于长度的简单验证，支持多种格式的DFS/EOS私钥
  if (privateKey.length < 30) {
    return false
  }

  // 支持标准格式检查(以5开头的私钥)，但不强制要求
  const standardFormat = /^5[HJK][1-9A-Za-z]{50,51}$/.test(privateKey)

  // 支持常见的PVT_前缀格式
  const pvtFormat = /^PVT_[A-Za-z0-9]+$/.test(privateKey)

  // 支持K1_前缀格式
  const k1Format = /^K1_[A-Za-z0-9]+$/.test(privateKey)

  // 也接受没有严格格式但长度合理的私钥(至少50字符)
  const lengthCheck = privateKey.length >= 50

  return standardFormat || pvtFormat || k1Format || lengthCheck
}

// 账户名格式验证
function validateAccountName(name: string): boolean {
  // 账户名1-12字符，仅包含小写字母a-z、数字1-5和点号
  const validFormat = /^[a-z1-5.]{1,12}$/.test(name)
  return validFormat
}

// 节点URL格式验证
function validateNodeUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    return urlObj.protocol === 'https:' || urlObj.protocol === 'http:'
  } catch (e) {
    return false
  }
}

// 错误处理函数 - 敏感信息过滤
function handleError(error: any, context: string, publicMessage?: string): string {
  // 记录详细错误但过滤敏感信息
  const errorString = error.toString().replace(/5[HJK][1-9A-Za-z]{50,51}/g, '***PRIVATE_KEY***')
  console.error(`${context}: ${errorString}`, error)

  // 返回用户友好的消息
  return publicMessage || '操作失败，请稍后重试'
}

/**
 * 创建钱包实例的内部工厂函数
 */
function createWalletInstance() {
  // 状态
  const walletStatus = ref<WalletStatus>(WalletStatus.DISCONNECTED)
  const currentWallet = ref<WalletInfo | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const transactions = ref<Transaction[]>([])
  const isWalletLocked = ref(true) // 钱包是否锁定
  const walletLockTimer = ref<ReturnType<typeof setTimeout> | null>(null) // 自动锁定计时器
  const securePrivateKey = new SecurePrivateKey()
  // 创建DfsWallet实例
  const dfsWallet = new DfsWallet()

  // DFS链ID
  const DFS_CHAIN_ID = dfsWallet.chainId

  // 从本地存储加载钱包
  const loadWalletFromStorage = async (password: string): Promise<StoredWallet | null> => {
    const encryptedWallet = localStorage.getItem('bongo-cat-wallet-encrypted')
    if (!encryptedWallet) return null

    try {
      // 使用新的PasswordManager解密数据
      return await PasswordManager.decryptData(encryptedWallet, password)
    } catch (error) {
      console.error('从存储加载钱包失败:', error)
      throw error
    }
  }

  // 余额信息
  const balances = reactive({
    [WalletType.DFS]: '0.0000',
    [WalletType.ETH]: '0.0000',
    [WalletType.BTC]: '0.0000',
    [WalletType.USDT]: '0.0000',
  })

  // 初始化前确保节点URL已设置
  const initDfsWallet = async (appName: string, privateKey?: string) => {
    const nodeUrl = localStorage.getItem('bongo-cat-wallet-node-url')
    if (privateKey) {
      securePrivateKey.setKey(privateKey)
    }
    // 初始化DfsWallet
    await dfsWallet.init(appName, nodeUrl ?? 'https://api.dfs.land', privateKey)

    // 使用随机值覆盖私钥内存
    if (typeof privateKey === 'string') {
      const randomChars = Array.from({ length: privateKey.length }).fill(0).map(() => String.fromCharCode(Math.floor(Math.random() * 94) + 33)).join('')

      // 尝试覆盖原始变量内存
      privateKey = randomChars

      logInfo(`useWallet.initDfsWallet: 使用随机值覆盖私钥内存: ${randomChars}`)
      logInfo(`useWallet.initDfsWallet: 覆盖后的私钥: ${privateKey}`)
    }
  }

  /**
   * 创建新钱包
   * @param accountName 可选账户名，用于DFS区块链
   */
  const createWallet = async (accountName?: string) => {
    try {
      console.log('useWallet.createWallet: 开始创建钱包过程')
      walletStatus.value = WalletStatus.CONNECTING
      isLoading.value = true

      // 获取节点URL
      const nodeUrl = localStorage.getItem('bongo-cat-wallet-node-url')
      if (!nodeUrl) {
        throw new Error('请先设置节点URL')
      }

      // 确保DfsWallet已初始化
      console.log('useWallet.createWallet: 初始化DfsWallet')
      try {
        await initDfsWallet('BongoCat')
        console.log('useWallet.createWallet: DfsWallet初始化成功')
      } catch (error) {
        console.error('useWallet.createWallet: DfsWallet初始化失败:', error)
        throw new Error(`DfsWallet初始化失败: ${error instanceof Error ? error.message : '未知错误'}`)
      }

      // 使用DfsWallet创建新钱包
      console.log(`useWallet.createWallet: 调用createNewWallet，账户名: ${accountName || '随机生成'}`)
      let result
      try {
        result = await dfsWallet.createNewWallet(accountName)
        console.log('useWallet.createWallet: 创建钱包结果:', result)
      } catch (error) {
        console.error('useWallet.createWallet: 创建钱包操作失败:', error)
        throw error
      }

      if (!result) {
        console.error('useWallet.createWallet: 创建钱包返回空结果')
        throw new Error('创建钱包失败: 没有返回结果')
      }

      // 创建钱包信息
      console.log('useWallet.createWallet: 构建钱包信息对象')
      const walletInfo: WalletInfo = {
        address: result.accountName,
        name: result.accountName,
        balance: '0.0000 DFS', // 新钱包初始余额
        publicKey: result.publicKey,
        privateKey: result.privateKey,
        type: WalletType.DFS,
        chainId: result.chainId,
      }

      // 加密并保存钱包到本地存储
      console.log('useWallet.createWallet: 加密并保存钱包信息到本地存储')
      const walletData: StoredWallet = {
        address: result.accountName,
        name: result.accountName,
        publicKey: result.publicKey,
        privateKey: result.privateKey,
        type: WalletType.DFS,
        chainId: result.chainId,
      }

      // 获取用户密码
      // 新钱包创建时需要用户输入密码进行加密存储
      // 这里简化处理，暂时使用弹出对话框请求用户输入
      // 实际实现可能需要更复杂的UI交互
      const encryptionPassword = await getWalletPassword()

      if (!encryptionPassword) {
        throw new Error('未提供密码，无法加密存储钱包数据')
      }

      // 使用PasswordManager加密数据
      const encryptedWallet = await PasswordManager.encryptData(walletData, encryptionPassword)
      localStorage.setItem('bongo-cat-wallet-encrypted', encryptedWallet)
      console.log('useWallet.createWallet: 钱包数据加密存储成功')

      // 设置当前钱包
      console.log('useWallet.createWallet: 更新当前钱包状态')
      currentWallet.value = walletInfo

      // 缓存钱包公开信息，以便下次启动时能自动恢复
      localStorage.setItem('bongo-cat-wallet-address', walletInfo.address)
      localStorage.setItem('bongo-cat-wallet-name', walletInfo.name)
      if (walletInfo.publicKey) localStorage.setItem('bongo-cat-wallet-public-key', walletInfo.publicKey)
      localStorage.setItem('bongo-cat-wallet-type', walletInfo.type)
      if (walletInfo.chainId) localStorage.setItem('bongo-cat-wallet-chain-id', walletInfo.chainId)

      // 设置初始余额
      balances[WalletType.DFS] = '0.0000'

      walletStatus.value = WalletStatus.CONNECTED
      console.log('useWallet.createWallet: 钱包创建成功')

      // 加载交易历史
      await loadTransactionHistory()

      return {
        address: result.accountName,
        privateKey: result.privateKey,
      }
    } catch (err: any) {
      console.error('useWallet.createWallet: 创建钱包过程失败:', err)
      console.error('错误堆栈:', err.stack)
      error.value = `创建钱包失败: ${err.message || '未知错误'}`
      walletStatus.value = WalletStatus.ERROR
      message.error(`创建钱包失败: ${err.message || '未知错误'}`)
      throw err
    } finally {
      isLoading.value = false
      console.log('useWallet.createWallet: 钱包创建过程结束')
    }
  }

  // 获取钱包密码的辅助函数
  // 实际实现中，这可能是一个弹出对话框让用户输入密码
  const getWalletPassword = async (): Promise<string | null> => {
    // 检查是否已有密码哈希
    const hasPasswordHash = localStorage.getItem('bongo-cat-wallet-password-hash')
    if (!hasPasswordHash) {
      // 如果没有设置密码，应该提示用户先设置密码
      message.error('请先设置钱包密码')
      return null
    }

    try {
      // 创建一个Promise，通过prompt让用户输入密码
      const password = await new Promise<string>((resolve) => {
        // 这里应该被UI层替换为更好的密码输入对话框
        const userPassword = prompt('请输入钱包密码')
        if (userPassword) {
          resolve(userPassword)
        } else {
          resolve('')
        }
      })

      if (!password) {
        message.error('未输入密码')
        return null
      }

      // 验证密码是否正确
      const isValid = await PasswordManager.verifyPassword(password)
      if (!isValid) {
        message.error('密码不正确，请重试')
        return null
      }

      return password
    } catch (error) {
      console.error('获取钱包密码失败:', error)
      message.error('获取钱包密码失败，请重试')
      return null
    }
  }

  /**
   * 连接现有钱包
   * @param privateKey 钱包私钥
   * @param existingWallet 可选的已存在钱包信息
   * @param accountName 可选的账户名
   */
  const connectWallet = async (privateKey: string, existingWallet?: StoredWallet, accountName?: string) => {
    if (!privateKey) {
      throw new Error('请提供有效的私钥')
    }

    try {
      walletStatus.value = WalletStatus.CONNECTING
      isLoading.value = true

      console.log('开始连接钱包:', {
        hasExistingWallet: !!existingWallet,
        hasAccountName: !!accountName,
        privateKeyLength: privateKey.length,
      })

      // 加强输入验证
      const isValidPrivateKey = validatePrivateKey(privateKey)
      console.log('私钥验证结果:', isValidPrivateKey)

      if (!isValidPrivateKey) {
        console.error('私钥验证失败:', {
          length: privateKey.length,
          prefix: privateKey.substring(0, 3),
        })
        throw new Error('无效的私钥格式')
      }

      if (accountName) {
        const isValidAccountName = validateAccountName(accountName)
        console.log('账户名验证结果:', isValidAccountName)

        if (!isValidAccountName) {
          console.error('账户名验证失败:', accountName)
          throw new Error('无效的账户名格式')
        }
      }

      // 获取节点URL
      const nodeUrl = localStorage.getItem('bongo-cat-wallet-node-url')
      console.log('获取到节点URL:', nodeUrl)

      if (!nodeUrl || !validateNodeUrl(nodeUrl)) {
        console.error('节点URL无效:', nodeUrl)
        throw new Error('请先设置有效的节点URL')
      }

      let walletInfo: WalletInfo

      if (existingWallet) {
        console.log('使用已存在的钱包信息')
        // 使用已存在的钱包信息，但不直接存储私钥
        walletInfo = {
          address: existingWallet.address,
          name: existingWallet.name,
          balance: '0.0000 DFS', // 稍后会从区块链获取
          publicKey: existingWallet.publicKey,
          privateKey: sanitizePrivateKey(existingWallet.privateKey), // 使用脱敏版本
          type: existingWallet.type,
          chainId: existingWallet.chainId,
        }
      } else {
        console.log('从私钥创建新钱包信息')
        try {
          // 从私钥创建新的钱包信息
          // 1. 初始化DfsWallet
          console.log('初始化DfsWallet')
          await initDfsWallet('BongoCat', privateKey)
          console.log('DfsWallet初始化成功')

          // 2. 从私钥派生公钥
          console.log('派生公钥')
          const publicKey = privateToPublic(privateKey)
          console.log('派生公钥成功:', publicKey)

          // 4. 构建新的钱包信息，使用脱敏的私钥
          walletInfo = {
            address: accountName || '',
            name: accountName || '',
            balance: '0.0000 DFS',
            publicKey,
            privateKey: sanitizePrivateKey(privateKey), // 使用脱敏版本
            type: WalletType.DFS,
            chainId: DFS_CHAIN_ID,
          }
          console.log('创建钱包信息成功')

          // 5. 加密并保存到本地存储
          const walletData: StoredWallet = {
            address: accountName || '',
            name: accountName || '',
            publicKey,
            privateKey, // 加密存储完整私钥
            type: WalletType.DFS,
            chainId: DFS_CHAIN_ID,
          }

          // 获取加密密钥
          const encryptionPassword = await getWalletPassword()
          if (!encryptionPassword) {
            throw new Error('未提供密码，无法加密存储钱包数据')
          }

          // 使用PasswordManager加密数据
          try {
            console.log('开始加密钱包数据')
            const encryptedWallet = await PasswordManager.encryptData(walletData, encryptionPassword)
            localStorage.setItem('bongo-cat-wallet-encrypted', encryptedWallet)
            console.log('钱包数据加密存储成功')
          } catch (encryptError) {
            console.error('加密钱包数据失败:', encryptError)
            // 继续流程但记录错误
          }
        } catch (error) {
          console.error('从私钥创建钱包信息失败:', error)
          throw error
        }
      }

      try {
        console.log('使用私钥初始化API连接')
        // 使用DfsWallet初始化API连接
        await initDfsWallet('BongoCat', privateKey)
        console.log('API连接初始化成功')
      } catch (error) {
        console.error('API连接初始化失败:', error)
        throw new Error(`API连接失败: ${error instanceof Error ? error.message : '未知错误'}`)
      }

      // 尝试获取真实余额
      try {
        console.log('开始获取钱包余额')
        const balance = await dfsWallet.getbalance('eosio.token', walletInfo.address)
        if (balance) {
          walletInfo.balance = balance
          balances[WalletType.DFS] = balance.split(' ')[0]
          console.log('获取钱包余额成功:', balance)
        } else {
          console.log('获取余额返回空值')
        }
      } catch (e) {
        // 不中断流程，只记录错误
        console.error('获取余额失败:', e)
      }

      // 设置当前钱包
      currentWallet.value = walletInfo
      console.log('钱包信息已设置到当前状态')
      
      // 缓存钱包公开信息，以便下次启动时能自动恢复
      localStorage.setItem('bongo-cat-wallet-address', walletInfo.address)
      localStorage.setItem('bongo-cat-wallet-name', walletInfo.name)
      if (walletInfo.publicKey) localStorage.setItem('bongo-cat-wallet-public-key', walletInfo.publicKey)
      localStorage.setItem('bongo-cat-wallet-type', walletInfo.type)
      if (walletInfo.chainId) localStorage.setItem('bongo-cat-wallet-chain-id', walletInfo.chainId)
      
      // 加载交易历史
      await loadTransactionHistory()

      walletStatus.value = WalletStatus.CONNECTED
      console.log('钱包连接状态已更新为CONNECTED')
      message.success('钱包连接成功')
    } catch (err: any) {
      // 改进错误处理，过滤敏感信息
      console.error('连接钱包发生错误:', err)
      console.error('错误详情:', err.stack || '无详细堆栈')

      const errorMessage = handleError(err, '连接钱包失败', '连接钱包失败，请检查您的私钥和账户信息')
      error.value = errorMessage
      walletStatus.value = WalletStatus.ERROR
      message.error(errorMessage)
      throw new Error(errorMessage)
    } finally {
      isLoading.value = false

      // 清除内存中的敏感数据
      setTimeout(() => {
        privateKey = ''.padStart(privateKey.length, '*')
      }, 0)
    }
  }

  /**
   * 初始化钱包
   */
  const initWallet = async () => {
    try {
      isLoading.value = true

      // 检查密码哈希是否存在
      const passwordHash = localStorage.getItem('bongo-cat-wallet-password-hash')
      const oldPassword = localStorage.getItem('bongo-cat-wallet-password')
      
      // 如果没有密码哈希也没有旧密码，直接返回
      if (!passwordHash && !oldPassword) {
        walletStatus.value = WalletStatus.DISCONNECTED
        return
      }

      // 获取节点URL
      const nodeUrl = localStorage.getItem('bongo-cat-wallet-node-url')
      if (!nodeUrl) {
        // 未设置节点URL，直接返回
        walletStatus.value = WalletStatus.DISCONNECTED
        return
      }

      // 检查本地存储是否有加密钱包
      const encryptedWallet = localStorage.getItem('bongo-cat-wallet-encrypted')
      if (!encryptedWallet) {
        walletStatus.value = WalletStatus.DISCONNECTED
        return
      }

      try {
        let storedWallet = null
        
        // 优先尝试使用旧密码格式直接解密
        if (oldPassword) {
          try {
            storedWallet = await loadWalletFromStorage(oldPassword)
            if (storedWallet) {
              // 由于使用旧密码成功解密，现在自动升级到新密码格式
              await PasswordManager.setPassword(oldPassword)
              logInfo('已自动从旧密码格式升级到新密码哈希格式')
              
              // 初始化DfsWallet
              await initDfsWallet('BongoCat', storedWallet.privateKey)
              
              // 自动连接存储的钱包
              currentWallet.value = {
                address: storedWallet.address,
                name: storedWallet.name,
                balance: '0.0000 DFS',
                publicKey: storedWallet.publicKey,
                privateKey: sanitizePrivateKey(storedWallet.privateKey),
                type: storedWallet.type,
                chainId: storedWallet.chainId
              }
              
              walletStatus.value = WalletStatus.CONNECTED
              isWalletLocked.value = false // 自动解锁钱包
              
              // 刷新余额和交易历史
              await refreshBalance()
              await loadTransactionHistory()
              
              logInfo('钱包已初始化并自动解锁(旧密码格式)')
              return
            }
          } catch (error) {
            console.error('使用旧密码格式解密失败:', error)
          }
        }
        
        // 如果旧密码解密失败或不存在旧密码，则处理为锁定状态钱包
        // 新方法：在锁定状态下也加载钱包基本信息（不包含私钥）
        try {
          // 手动解析加密数据，提取公开信息（不需要密码）
          // 由于我们不能没有密码就解密数据，我们需要从其他地方获取基本信息
          
          // 尝试使用localStorage中可能存在的钱包地址缓存
          const cachedWalletAddress = localStorage.getItem('bongo-cat-wallet-address')
          const cachedWalletName = localStorage.getItem('bongo-cat-wallet-name')
          const cachedWalletPublicKey = localStorage.getItem('bongo-cat-wallet-public-key')
          const cachedWalletType = localStorage.getItem('bongo-cat-wallet-type') as WalletType
          const cachedWalletChainId = localStorage.getItem('bongo-cat-wallet-chain-id')
          
          if (cachedWalletAddress) {
            // 有缓存的钱包信息，可以在锁定状态下显示
            // 设置当前钱包的公开信息
            currentWallet.value = {
              address: cachedWalletAddress,
              name: cachedWalletName || cachedWalletAddress,
              balance: '0.0000 DFS', // 锁定状态下无法获取真实余额
              publicKey: cachedWalletPublicKey || undefined,
              type: cachedWalletType || WalletType.DFS,
              chainId: cachedWalletChainId || DFS_CHAIN_ID
            }
            
            // 初始化DfsWallet，但不提供私钥
            await initDfsWallet('BongoCat')
            
            walletStatus.value = WalletStatus.CONNECTED
            isWalletLocked.value = true // 钱包锁定状态
            
            logInfo('钱包已初始化，处于锁定状态，显示缓存信息')
            return
          }
          
          // 如果没有缓存信息，尝试从钱包名称解析数据
          const walletNameMatch = encryptedWallet.match(/"name":"([^"]+)"/)
          const walletAddressMatch = encryptedWallet.match(/"address":"([^"]+)"/)
          const walletPublicKeyMatch = encryptedWallet.match(/"publicKey":"([^"]+)"/)
          
          if (walletAddressMatch) {
            const address = walletAddressMatch[1]
            const name = walletNameMatch ? walletNameMatch[1] : address
            const publicKey = walletPublicKeyMatch ? walletPublicKeyMatch[1] : undefined
            
            // 缓存这些信息以便下次使用
            localStorage.setItem('bongo-cat-wallet-address', address)
            if (name) localStorage.setItem('bongo-cat-wallet-name', name)
            if (publicKey) localStorage.setItem('bongo-cat-wallet-public-key', publicKey)
            localStorage.setItem('bongo-cat-wallet-type', WalletType.DFS)
            localStorage.setItem('bongo-cat-wallet-chain-id', DFS_CHAIN_ID)
            
            // 设置当前钱包的公开信息
            currentWallet.value = {
              address,
              name,
              balance: '0.0000 DFS', // 锁定状态下无法获取真实余额
              publicKey,
              type: WalletType.DFS,
              chainId: DFS_CHAIN_ID
            }
            
            // 初始化DfsWallet，但不提供私钥
            await initDfsWallet('BongoCat')
            
            walletStatus.value = WalletStatus.CONNECTED
            isWalletLocked.value = true // 钱包锁定状态
            
            logInfo('钱包已初始化，处于锁定状态，需要手动解锁')
            return
          }
        } catch (parseError) {
          console.error('解析钱包公开信息失败:', parseError)
        }
        
        // 如果还是无法获取钱包信息，设置为连接但锁定状态
        walletStatus.value = WalletStatus.CONNECTED
        isWalletLocked.value = true
        logInfo('钱包初始化完成，处于锁定状态，需要手动解锁')
      } catch (err) {
        console.error('解锁钱包失败:', err)
        logError('解锁钱包失败，请检查密码')
        walletStatus.value = WalletStatus.DISCONNECTED
      }
    } catch (err: any) {
    
      console.error('初始化钱包失败:', err)
      error.value = `初始化钱包失败: ${err.message || '未知错误'}`
      walletStatus.value = WalletStatus.ERROR
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 解锁钱包
   * @param password 钱包密码
   */
  const unlockWallet = async (password: string): Promise<boolean> => {
    if (!password) {
      throw new Error('请输入密码')
    }

    try {
      isLoading.value = true

      // 验证密码 - 使用安全哈希验证
      const isValidPassword = await PasswordManager.verifyPassword(password)
      if (!isValidPassword) {
        // 如果密码哈希验证失败，尝试检查是否使用旧版明文密码
        const oldPassword = localStorage.getItem('bongo-cat-wallet-password')
        if (oldPassword && password === oldPassword) {
          // 旧版明文密码匹配成功，自动升级到新密码哈希格式
          await PasswordManager.setPassword(password)
          logInfo('检测到使用旧版明文密码，已自动升级到哈希存储格式')
        } else {
          throw new Error('密码不正确')
        }
      }

      // 尝试使用密码解密钱包数据
      const storedWallet = await loadWalletFromStorage(password)
      if (!storedWallet) {
        throw new Error('无法加载钱包数据')
      }

      // 初始化DfsWallet
      await initDfsWallet('BongoCat', storedWallet.privateKey)

      // 设置当前钱包信息
      currentWallet.value = {
        address: storedWallet.address,
        name: storedWallet.name,
        balance: '0.0000 DFS', // 稍后会更新
        publicKey: storedWallet.publicKey,
        privateKey: sanitizePrivateKey(storedWallet.privateKey),
        type: storedWallet.type,
        chainId: storedWallet.chainId,
      }

      // 解锁钱包
      isWalletLocked.value = false

      // 刷新余额和交易历史
      await refreshBalance()
      await loadTransactionHistory()

      logInfo('钱包已解锁')

      // 设置自动锁定计时器
      resetLockTimer()

      return true
    } catch (err: any) {
      const errorMessage = err.message || '解锁钱包失败'
      error.value = errorMessage
      logError(`解锁钱包失败: ${errorMessage}`)
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 锁定钱包
   */
  const lockWallet = () => {
    isWalletLocked.value = true

    // 清除自动锁定计时器
    if (walletLockTimer.value) {
      clearTimeout(walletLockTimer.value)
      walletLockTimer.value = null
    }

    logInfo('钱包已锁定')
    return true
  }

  /**
   * 重置自动锁定计时器
   */
  const resetLockTimer = () => {
    // 清除已有的计时器
    if (walletLockTimer.value) {
      clearTimeout(walletLockTimer.value)
    }

    // 设置新计时器，10分钟后自动锁定
    walletLockTimer.value = setTimeout(() => {
      if (!isWalletLocked.value) {
        lockWallet()
        logInfo('钱包已自动锁定')
      }
    }, 10 * 60 * 1000) // 10分钟
  }

  /**
   * 钱包操作时重置自动锁定计时器
   */
  const refreshLockTimer = () => {
    if (!isWalletLocked.value) {
      resetLockTimer()
    }
  }

  /**
   * 断开钱包连接
   */
  const disconnectWallet = async () => {
    try {
      console.log('执行断开钱包连接...')

      // 先设置状态，确保UI立即响应
      walletStatus.value = WalletStatus.DISCONNECTED
      currentWallet.value = null

      // 重置余额
      Object.keys(balances).forEach((key) => {
        balances[key as WalletType] = '0.0000'
      })

      // 清空交易历史
      transactions.value = []

      // 清除本地存储
      localStorage.removeItem('bongo-cat-wallet-encrypted')
      localStorage.removeItem('bongo-cat-transactions')
      
      // 清除缓存的公开信息
      localStorage.removeItem('bongo-cat-wallet-address')
      localStorage.removeItem('bongo-cat-wallet-name')
      localStorage.removeItem('bongo-cat-wallet-public-key')
      localStorage.removeItem('bongo-cat-wallet-type')
      localStorage.removeItem('bongo-cat-wallet-chain-id')

      // 尝试登出DfsWallet
      try {
        await dfsWallet.logout()
        console.log('DfsWallet登出成功')
      } catch (e) {
        console.error('登出钱包失败:', e)
        // 即使DFS钱包登出失败，我们仍然认为断开成功
      }

      console.log('钱包断开连接成功')
      return true // 返回成功状态
    } catch (err: any) {
      console.error('断开钱包失败:', err)
      error.value = `断开钱包失败: ${err.message || '未知错误'}`
      // 即使发生错误，也强制重置状态
      walletStatus.value = WalletStatus.DISCONNECTED
      currentWallet.value = null
      return false
    }
  }

  /**
   * 发送代币交易
   * @param to 接收地址
   * @param amount 金额
   * @param currency 代币类型 (默认DFS)
   * @param memo 交易备注
   */
  const sendTransaction = async (to: string, amount: string, currency: string = 'DFS', memo: string = '') => {
    if (!currentWallet.value) {
      message.error('请先连接钱包')
      return null
    }

    // 检查钱包是否锁定
    if (isWalletLocked.value) {
      message.error('钱包已锁定，请先解锁')
      return null
    }

    try {
      isLoading.value = true

      // 刷新自动锁定计时器
      refreshLockTimer()

      // 加强输入验证
      if (!to || !validateAccountName(to)) {
        throw new Error('无效的接收地址格式')
      }

      // 验证金额格式
      const amountNum = Number.parseFloat(amount)
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error('无效的金额')
      }

      // 验证货币格式
      if (!/^[A-Z]{1,7}$/.test(currency)) {
        throw new Error('无效的代币符号')
      }

      // 验证备注长度
      if (memo && memo.length > 256) {
        throw new Error('备注信息过长，最多256个字符')
      }

      // 验证余额充足 - 根据选择的货币类型
      if (currency === 'DFS') {
        const currentBalance = Number.parseFloat(balances[WalletType.DFS])
        if (amountNum > currentBalance) {
          throw new Error('余额不足')
        }
      } else {
        // 为其他代币类型检查余额
        const assetBalance = await dfsWallet.get_currency_balance('dfsppptokens', currentWallet.value.address)
        const token = assetBalance.find(item => item.includes(currency))
        if (!token) {
          throw new Error(`找不到${currency}代币余额`)
        }

        const tokenBalance = Number.parseFloat(token.split(' ')[0])
        if (amountNum > tokenBalance) {
          throw new Error('余额不足')
        }
      }

      // 获取交易密码
      const transactionPassword = await getTransactionPassword()
      if (!transactionPassword) {
        throw new Error('未提供交易密码，无法完成交易')
      }

      // 验证交易密码
      const isPasswordValid = await PasswordManager.verifyPassword(transactionPassword)
      if (!isPasswordValid) {
        throw new Error('交易密码不正确')
      }

      // 获取加密的钱包数据
      const encryptedWallet = localStorage.getItem('bongo-cat-wallet-encrypted')
      if (!encryptedWallet) {
        throw new Error('找不到钱包数据')
      }

      // 临时解密获取私钥
      let privateKey = ''
      try {
        const walletData = await PasswordManager.decryptData(encryptedWallet, transactionPassword)
        privateKey = walletData.privateKey
      } catch (decryptError) {
        throw new Error('解密钱包数据失败')
      }

      try {
        // 构建发送代币的交易
        let transaction

        if (currency === 'DFS') {
          // 发送DFS代币
          transaction = {
            actions: [{
              account: 'eosio.token',
              name: 'transfer',
              authorization: [{
                actor: currentWallet.value.address,
                permission: 'active',
              }],
              data: {
                from: currentWallet.value.address,
                to,
                quantity: `${Number.parseFloat(amount).toFixed(8)} DFS`,
                memo: memo || '',
              },
            }],
          }
        } else {
          // 发送其他代币
          transaction = {
            actions: [{
              account: 'dfsppptokens',
              name: 'transfer',
              authorization: [{
                actor: currentWallet.value.address,
                permission: 'active',
              }],
              data: {
                from: currentWallet.value.address,
                to,
                quantity: `${Number.parseFloat(amount).toFixed(8)} ${currency}`,
                memo: memo || '',
              },
            }],
          }
        }

        // 发送交易 - 使用免CPU服务
        const result = await dfsWallet.transact(transaction, { useFreeCpu: true })

        // 生成交易ID，如果事务结果有可以使用的ID就使用，否则生成一个新的
        let txId = generateTransactionId()

        // 尝试从事务结果中提取ID
        if (result) {
          // 检查常见的交易ID字段
          const possibleIdFields = ['transaction_id', 'id', 'trx_id', 'transactionId']
          for (const field of possibleIdFields) {
            if ((result as any)[field]) {
              txId = (result as any)[field]
              break
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
          memo: memo || 'BongoCat Transaction',
        }

        // 更新交易历史
        transactions.value.unshift(newTx)

        // 安全地存储交易历史
        try {
        // 使用PasswordManager加密存储交易历史
          const encryptedHistory = await PasswordManager.encryptData(transactions.value, transactionPassword)
          localStorage.setItem('bongo-cat-transactions-encrypted', encryptedHistory)

          // 保留旧格式兼容性
          localStorage.setItem('bongo-cat-transactions', JSON.stringify(transactions.value))
        } catch (encryptError) {
          console.error('加密交易历史失败:', encryptError)
        // 继续流程但记录错误
        }

        // 更新余额
        await refreshBalance()

        message.success('交易发送成功')
        return txId
      } finally {
      // 使用完立即清除内存中的私钥
        if (privateKey) {
          privateKey = ''.padStart(privateKey.length, '*')
        }
      }
    } catch (err: any) {
      const errorMessage = handleError(err, '发送交易失败', '发送交易失败，请检查您的参数并重试')
      error.value = errorMessage
      message.error(errorMessage)
      throw new Error(errorMessage)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 获取交易密码 - 由于界面限制，这里使用一个模拟实现
   * 实际应用中应该通过对话框让用户输入密码
   */
  const getTransactionPassword = async (): Promise<string | null> => {
    // 检查是否已有密码哈希，如果没有则需要先设置密码
    const hasPasswordHash = localStorage.getItem('bongo-cat-wallet-password-hash')
    if (!hasPasswordHash) {
      message.error('请先设置钱包密码')
      return null
    }

    try {
      // 创建一个Promise，通过prompt让用户输入密码
      const password = await new Promise<string>((resolve) => {
        // 这里应该被UI层替换为更好的密码输入对话框
        const userPassword = prompt('请输入交易密码')
        if (userPassword) {
          resolve(userPassword)
        } else {
          resolve('')
        }
      })

      if (!password) {
        message.error('未输入密码')
        return null
      }

      // 验证密码
      const isValid = await PasswordManager.verifyPassword(password)
      if (!isValid) {
        message.error('密码不正确，请重试')
        return null
      }

      return password
    } catch (error) {
      console.error('获取交易密码失败:', error)
      message.error('获取交易密码失败，请重试')
      return null
    }
  }

  /**
   * 获取历史记录密码 - 由于界面限制，这里使用一个模拟实现
   * 实际应用中应该通过对话框让用户输入密码
   */
  const getHistoryPassword = async (): Promise<string | null> => {
    // 检查是否已有密码哈希，如果没有则需要先设置密码
    const hasPasswordHash = localStorage.getItem('bongo-cat-wallet-password-hash')
    if (!hasPasswordHash) {
      return null
    }

    try {
      // 创建一个Promise，通过prompt让用户输入密码
      const password = await new Promise<string>((resolve) => {
        // 这里应该被UI层替换为更好的密码输入对话框
        const userPassword = prompt('请输入钱包密码以加载历史记录')
        if (userPassword) {
          resolve(userPassword)
        } else {
          resolve('')
        }
      })

      if (!password) {
        console.warn('未输入密码')
        return null
      }

      // 验证密码
      const isValid = await PasswordManager.verifyPassword(password)
      if (!isValid) {
        console.warn('密码不正确')
        return null
      }

      return password
    } catch (error) {
      console.error('获取历史记录密码失败:', error)
      return null
    }
  }

  /**
   * 刷新余额
   */
  const refreshBalance = async () => {
    if (!currentWallet.value) return

    // 如果钱包锁定，则不刷新余额
    if (isWalletLocked.value) {
      logInfo('钱包已锁定，无法刷新余额')
      return
    }

    try {
      isLoading.value = true

      // 刷新自动锁定计时器
      refreshLockTimer()

      // 使用DfsWallet获取DFS余额
      const balance = await dfsWallet.getbalance('eosio.token', currentWallet.value.address, 'DFS')

      // 获取所有其他代币余额
      const allTokens = await dfsWallet.get_currency_balance('dfsppptokens', currentWallet.value.address)

      // 更新DFS余额
      if (balance) {
        // 更新余额数据
        const balanceAmount = balance.split(' ')[0] // 例如 "10.0000 DFS" -> "10.0000"
        balances[WalletType.DFS] = balanceAmount

        if (currentWallet.value) {
          currentWallet.value.balance = balance
        }
      }

      // 创建包含所有代币的资产列表
      const assetsList = []

      // 添加DFS资产 - 不计算价值，让UI层处理
      assetsList.push({
        key: 'DFS',
        name: 'DFS Chain',
        balance: balances[WalletType.DFS],
        value: 0, // 价值由UI层计算
        color: 'bg-blue-500',
      })

      // 处理并添加其他代币
      const colorClasses = [
        'bg-green-500',
        'bg-purple-500',
        'bg-red-500',
        'bg-yellow-500',
        'bg-indigo-500',
        'bg-pink-500',
      ]

      allTokens.forEach((item, index) => {
        const parts = item.split(' ')
        if (parts.length === 2) {
          const tokenBalance = parts[0]
          const symbol = parts[1]
          const randomPrice = (Math.random() * 10).toFixed(2)
          const value = Number.parseFloat(tokenBalance) * Number.parseFloat(randomPrice)

          // 使用循环颜色系统
          const colorIndex = index % colorClasses.length

          assetsList.push({
            key: symbol,
            name: `${symbol} Token`,
            balance: tokenBalance,
            value,
            color: colorClasses[colorIndex],
          })
        }
      })

      // 返回资产列表和当前DFS余额
      return {
        dfsBalance: balances[WalletType.DFS],
        assetsList,
      }
    } catch (err) {
      console.error('刷新余额失败:', err)
      // 如果获取真实余额失败，使用模拟数据作为备选
      const currentBalance = Number.parseFloat(balances[WalletType.DFS])
      const variation = (Math.random() * 0.2) - 0.1 // -0.1 to 0.1
      const newBalance = Math.max(0, currentBalance + variation).toFixed(4)
      balances[WalletType.DFS] = newBalance

      if (currentWallet.value) {
        currentWallet.value.balance = `${newBalance} DFS`
      }

      // 返回模拟数据
      return {
        dfsBalance: balances[WalletType.DFS],
        assetsList: [{
          key: 'DFS',
          name: 'DFS Chain',
          balance: balances[WalletType.DFS],
          value: 0, // 价值由UI层计算
          color: 'bg-blue-500',
        }],
      }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 加载交易历史
   */
  const loadTransactionHistory = async () => {
    if (!currentWallet.value) return

    try {
      isLoading.value = true

      // 获取交易密码
      const historyPassword = await getHistoryPassword()
      if (!historyPassword) {
        // 不中断流程，尝试使用未加密的历史记录
        console.warn('未提供密码，将尝试使用未加密的历史记录')
      } else {
        // 尝试从加密存储中获取交易历史
        const encryptedTx = localStorage.getItem('bongo-cat-transactions-encrypted')

        if (encryptedTx) {
          try {
            // 使用PasswordManager解密交易历史
            const decryptedHistory = await PasswordManager.decryptData(encryptedTx, historyPassword)
            transactions.value = decryptedHistory
            return
          } catch (decryptError) {
            console.error('解密交易历史失败:', decryptError)
            // 继续尝试其他方法
          }
        }
      }

      // 检查本地是否有存储的交易历史
      const storedTx = localStorage.getItem('bongo-cat-transactions')

      if (storedTx) {
        transactions.value = JSON.parse(storedTx)
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
            memo: '初始余额',
          },
        ]

        // 如果有可用的密码，加密存储交易历史
        if (historyPassword) {
          try {
            const encryptedHistory = await PasswordManager.encryptData(transactions.value, historyPassword)
            localStorage.setItem('bongo-cat-transactions-encrypted', encryptedHistory)
          } catch (encryptError) {
            console.error('加密交易历史失败:', encryptError)
          }
        }

        // 存储到本地(未加密版本)
        localStorage.setItem('bongo-cat-transactions', JSON.stringify(transactions.value))
      }
    } catch (err) {
      // 使用通用错误消息，避免泄露信息
      console.error('加载交易历史失败:', err)
    } finally {
      isLoading.value = false
    }
  }

  // 辅助函数：生成交易ID
  const generateTransactionId = (): string => {
    const chars = '0123456789abcdef'
    let txId = ''

    for (let i = 0; i < 64; i++) {
      txId += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    return txId
  }

  return {
    // 状态
    walletStatus,
    currentWallet,
    isLoading,
    error,
    transactions,
    balances,
    isWalletLocked,

    // 方法
    initWallet,
    connectWallet,
    createWallet,
    disconnectWallet,
    sendTransaction,
    refreshBalance,
    loadTransactionHistory,

    // 加解密方法
    encryptWalletData,
    decryptWalletData,
    loadWalletFromStorage,

    // 锁定/解锁方法
    lockWallet,
    unlockWallet,
    resetLockTimer,
    refreshLockTimer,

    // 验证函数
    validatePrivateKey,
    validateAccountName,
    validateNodeUrl,
  }
}

/**
 * 钱包管理Composable
 * 提供钱包连接、交易和管理功能
 * 单例模式实现，全局共享同一个钱包实例
 */
export function useWallet() {
  // 如果实例不存在，创建新实例
  if (!_walletInstance) {
    _walletInstance = createWalletInstance()
    console.log('创建全局钱包实例')
  }

  // 返回共享的单例实例
  return _walletInstance
}
