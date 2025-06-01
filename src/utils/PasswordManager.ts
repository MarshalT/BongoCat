import { error as logError, info as logInfo } from '@tauri-apps/plugin-log'

// 密钥派生常量
const SALT_AUTH = 'bongo-cat-authsalt-8472e195'
const SALT_ENCRYPTION = 'bongo-cat-encsalt-7391f204'
const ITERATIONS = 100000
const KEY_LENGTH = 256

/**
 * 密码管理器类 - 提供基于哈希的密码验证和密钥派生
 * 不存储明文密码，同时支持对数据的加解密
 */
export class PasswordManager {
  /**
   * 设置密码 - 存储密码哈希值，不存储明文密码
   * @param password 用户密码
   */
  static async setPassword(password: string): Promise<boolean> {
    try {
      // 派生验证哈希值
      const authHash = await this.deriveAuthHash(password)

      // 存储哈希值，用于后续验证
      localStorage.setItem('bongo-cat-wallet-password-hash', authHash)

      // 移除旧版明文密码
      localStorage.removeItem('bongo-cat-wallet-password')

      logInfo('密码已安全设置，使用哈希存储')
      return true
    } catch (error) {
      logError(`设置密码失败: ${error}`)
      return false
    }
  }

  /**
   * 验证密码是否正确
   * @param password 要验证的密码
   */
  static async verifyPassword(password?: string): Promise<boolean> {
    try {
      if (!password) {
        return false
      }
      // 获取存储的密码哈希
      const storedHash = localStorage.getItem('bongo-cat-wallet-password-hash')
      if (!storedHash) {
        // 如果找不到哈希值，尝试兼容旧版明文密码
        const oldPassword = localStorage.getItem('bongo-cat-wallet-password')
        if (oldPassword) {
          const isValid = password === oldPassword

          // 如果密码正确且是旧版格式，自动升级到新格式
          if (isValid) {
            await this.setPassword(password)
            logInfo('检测到旧版密码，已自动升级到哈希存储')
          }

          return isValid
        }

        return false
      }

      // 派生验证哈希值并比较
      const authHash = await this.deriveAuthHash(password)
      return authHash === storedHash
    } catch (error) {
      logError(`验证密码失败: ${error}`)
      return false
    }
  }

  /**
   * 加密数据 - 使用密码派生的加密密钥
   * @param data 要加密的数据
   * @param password 用户密码
   */
  static async encryptData(data: any, password: string): Promise<string> {
    try {
      // 将数据转为JSON字符串
      const dataStr = JSON.stringify(data)

      // 派生加密密钥
      const encryptionKey = await this.deriveEncryptionKey(password)

      // 生成随机IV
      const iv = window.crypto.getRandomValues(new Uint8Array(12))

      // 加密数据
      const encryptedBuffer = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv,
        },
        encryptionKey,
        new TextEncoder().encode(dataStr),
      )

      // 拼接IV和密文
      const result = new Uint8Array(iv.length + encryptedBuffer.byteLength)
      result.set(iv, 0)
      result.set(new Uint8Array(encryptedBuffer), iv.length)

      // 转换为Base64
      return btoa(String.fromCharCode(...result))
    } catch (error) {
      logError(`加密数据失败: ${error}`)
      throw new Error('数据加密失败')
    }
  }

  /**
   * 解密数据 - 使用密码派生的加密密钥
   * @param encryptedData 加密的数据(Base64)
   * @param password 用户密码
   */
  static async decryptData(encryptedData: string, password: string): Promise<any> {
    try {
      // 尝试使用新方法解密
      try {
        // 转换Base64为字节数组
        const encryptedBytes = new Uint8Array(
          atob(encryptedData).split('').map(c => c.charCodeAt(0)),
        )

        // 提取IV和密文
        const iv = encryptedBytes.slice(0, 12)
        const ciphertext = encryptedBytes.slice(12)

        // 派生加密密钥
        const encryptionKey = await this.deriveEncryptionKey(password)

        // 解密数据
        const decryptedBuffer = await window.crypto.subtle.decrypt(
          {
            name: 'AES-GCM',
            iv,
          },
          encryptionKey,
          ciphertext,
        )

        // 转换为字符串并解析JSON
        const decryptedText = new TextDecoder().decode(decryptedBuffer)
        logInfo(`解密数据: ${decryptedText}`)
        logInfo(`解密数据: ${encryptedData}`)
        return JSON.parse(decryptedText)
      } catch (e) {
        // 如果新方法解密失败，尝试旧方法解密
        // 兼容旧版本的数据格式
        try {
          const decodedData = atob(encryptedData)
          if (decodedData.includes('::')) {
            const parts = decodedData.split('::')
            if (parts.length === 2 && parts[1] === password) {
              return JSON.parse(parts[0])
            }
          }
        } catch (oldFormatError) {
          // 忽略旧格式解析错误，继续尝试其他格式
        }

        // 尝试兼容另一种旧格式
        const parts = encryptedData.split(':')
        if (parts.length === 3) {
          // 旧格式 saltBase64:ivBase64:encryptedBase64
          const saltBase64 = parts[0]
          const ivBase64 = parts[1]
          const encryptedBase64 = parts[2]

          const salt = new Uint8Array([...atob(saltBase64)].map(c => c.charCodeAt(0)))
          const iv = new Uint8Array([...atob(ivBase64)].map(c => c.charCodeAt(0)))
          const encryptedArray = new Uint8Array(
            [...atob(encryptedBase64)].map(c => c.charCodeAt(0)),
          )

          // 从密码和盐值派生密钥
          const encoder = new TextEncoder()
          const passwordBuffer = encoder.encode(password)

          const importedKey = await window.crypto.subtle.importKey(
            'raw',
            passwordBuffer,
            { name: 'PBKDF2' },
            false,
            ['deriveKey'],
          )

          const derivedKey = await window.crypto.subtle.deriveKey(
            {
              name: 'PBKDF2',
              salt,
              iterations: 100000,
              hash: 'SHA-256',
            },
            importedKey,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt'],
          )

          // 解密
          const decryptedBuffer = await window.crypto.subtle.decrypt(
            {
              name: 'AES-GCM',
              iv,
            },
            derivedKey,
            encryptedArray,
          )

          const decryptedText = new TextDecoder().decode(decryptedBuffer)
          return JSON.parse(decryptedText)
        }

        // 所有尝试都失败，抛出错误
        throw new Error('无法解密数据，密码可能不正确或数据已损坏')
      }
    } catch (error) {
      logError(`解密数据失败: ${error}`)
      throw new Error('数据解密失败')
    }
  }

  /**
   * 迁移现有数据 - 将旧格式加密数据迁移到新格式
   * @param password 用户密码
   */
  static async migrateData(password: string): Promise<boolean> {
    try {
      // 验证密码
      const isValid = await this.verifyPassword(password)
      if (!isValid) {
        throw new Error('密码不正确，无法迁移数据')
      }

      // 1. 迁移加密钱包数据
      const encryptedWallet = localStorage.getItem('bongo-cat-wallet-encrypted')
      if (encryptedWallet) {
        try {
          // 解密旧数据
          const walletData = await this.decryptData(encryptedWallet, password)

          // 使用新方法重新加密
          const newEncryptedWallet = await this.encryptData(walletData, password)

          // 存储新格式数据
          localStorage.setItem('bongo-cat-wallet-encrypted', newEncryptedWallet)
          logInfo('钱包数据已迁移到新加密格式')
        } catch (e) {
          logError(`迁移钱包数据失败: ${e}`)
        }
      }

      // 迁移其他敏感配置
      const secureConfig = localStorage.getItem('bongo-cat-wallet-secure-config')
      if (secureConfig) {
        try {
          // 解密旧数据
          const configData = await this.decryptData(secureConfig, password)

          // 使用新方法重新加密
          const newEncryptedConfig = await this.encryptData(configData, password)

          // 存储新格式数据
          localStorage.setItem('bongo-cat-wallet-secure-config', newEncryptedConfig)
          logInfo('安全配置已迁移到新加密格式')
        } catch (e) {
          logError(`迁移安全配置失败: ${e}`)
        }
      }

      // 设置迁移标记
      localStorage.setItem('bongo-cat-wallet-format-version', '2')

      return true
    } catch (error) {
      logError(`数据迁移失败: ${error}`)
      return false
    }
  }

  /**
   * 从密码派生验证哈希
   * @private
   */
  private static async deriveAuthHash(password: string): Promise<string> {
    const encoder = new TextEncoder()
    const passwordBuffer = encoder.encode(password)
    const authSaltBuffer = encoder.encode(SALT_AUTH)

    // 导入密码
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits'],
    )

    // 派生验证哈希
    const authBits = await window.crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: authSaltBuffer,
        iterations: ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      KEY_LENGTH,
    )

    // 转换为Base64
    return btoa(String.fromCharCode(...new Uint8Array(authBits)))
  }

  /**
   * 从密码派生加密密钥
   * @private
   */
  private static async deriveEncryptionKey(password: string): Promise<CryptoKey> {
    const encoder = new TextEncoder()
    const passwordBuffer = encoder.encode(password)
    const encSaltBuffer = encoder.encode(SALT_ENCRYPTION)

    // 导入密码
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveKey'],
    )

    // 派生加密密钥
    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encSaltBuffer,
        iterations: ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    )
  }

  /**
   * 清除所有密码和加密数据
   * 适用于开发测试阶段，不建议在生产环境中使用
   */
  static async clearAll(): Promise<boolean> {
    try {
      // 清除密码哈希
      localStorage.removeItem('bongo-cat-wallet-password-hash')

      // 清除旧版密码
      localStorage.removeItem('bongo-cat-wallet-password')

      // 清除密码提示
      localStorage.removeItem('bongo-cat-wallet-password-hint')

      // 清除加密钱包数据
      localStorage.removeItem('bongo-cat-wallet-encrypted')

      // 清除交易历史
      localStorage.removeItem('bongo-cat-transactions')

      // 清除安全配置
      localStorage.removeItem('bongo-cat-wallet-secure-config')

      logInfo('所有密码和加密数据已清除')
      return true
    } catch (error) {
      logError(`清除密码和数据失败: ${error}`)
      return false
    }
  }
}
