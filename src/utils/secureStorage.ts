import { error as logError, info as logInfo } from '@tauri-apps/plugin-log'

import { PasswordManager } from './PasswordManager'

/**
 * 安全存储实用工具类 - 提供加密数据存储和获取功能
 */
export class SecureStorage {
  /**
   * 安全地存储数据到localStorage
   * @param key 存储键名
   * @param data 要存储的数据对象
   * @param password 可选密码，如果不提供则要求用户输入密码
   */
  static async secureStore(key: string, data: any, password?: string): Promise<boolean> {
    try {
      // 获取密码 - 如果未提供，则可能需要用户输入
      const encryptionPassword = password

      if (!encryptionPassword) {
        // 这里可以弹出密码输入对话框，或者使用其他方式获取密码
        throw new Error('未提供密码，请提供密码以加密数据')
      }

      // 加密数据
      const encryptedData = await PasswordManager.encryptData(data, encryptionPassword)

      // 存储加密数据
      localStorage.setItem(`secure-${key}`, encryptedData)

      logInfo(`数据已安全存储: ${key}`)
      return true
    } catch (error) {
      logError(`安全存储数据失败 [${key}]: ${error}`)
      return false
    }
  }

  /**
   * 从localStorage安全获取数据
   * @param key 存储键名
   * @param password 可选密码，如果不提供则要求用户输入密码
   * @returns 解密后的数据对象，失败返回null
   */
  static async secureGet<T>(key: string, password?: string): Promise<T | null> {
    try {
      // 获取加密数据
      const encryptedData = localStorage.getItem(`secure-${key}`)
      if (!encryptedData) {
        return null
      }

      // 获取密码 - 如果未提供，则需要用户输入
      const decryptionPassword = password

      if (!decryptionPassword) {
        // 这里可以弹出密码输入对话框，或者使用其他方式获取密码
        throw new Error('未提供密码，请提供密码以解密数据')
      }

      // 解密数据
      const decryptedData = await PasswordManager.decryptData(encryptedData, decryptionPassword)

      return decryptedData as T
    } catch (error) {
      logError(`安全获取数据失败 [${key}]: ${error}`)
      return null
    }
  }

  /**
   * 安全删除存储的数据
   * @param key 存储键名
   */
  static secureDelete(key: string): boolean {
    try {
      localStorage.removeItem(`secure-${key}`)
      logInfo(`数据已安全删除: ${key}`)
      return true
    } catch (error) {
      logError(`安全删除数据失败 [${key}]: ${error}`)
      return false
    }
  }

  /**
   * 验证用户密码并执行操作
   * @param password 用户输入的密码
   * @param callback 验证成功后执行的回调函数
   * @returns 验证是否成功
   */
  static async withPassword(password: string, callback: () => Promise<void>): Promise<boolean> {
    try {
      // 验证密码
      const isValid = await PasswordManager.verifyPassword(password)

      if (!isValid) {
        return false
      }

      // 执行回调
      await callback()
      return true
    } catch (error) {
      logError(`密码验证操作失败: ${error}`)
      return false
    }
  }

  /**
   * 获取所有安全存储的键名
   * @returns 安全存储键名列表
   */
  static getSecureKeys(): string[] {
    const keys: string[] = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('secure-')) {
        keys.push(key.substring(7)) // 移除'secure-'前缀
      }
    }

    return keys
  }

  /**
   * 清理所有安全存储的数据
   * @returns 是否成功清理
   */
  static clearAllSecureData(): boolean {
    try {
      const secureKeys = this.getSecureKeys()

      for (const key of secureKeys) {
        this.secureDelete(key)
      }

      return true
    } catch (error) {
      logError(`清理安全数据失败: ${error}`)
      return false
    }
  }
}

/**
 * 安全存储 - 加密保存数据到localStorage
 *
 * @param key 存储键名
 * @param data 要存储的数据
 * @param password 用于加密的密码
 * @returns Promise<boolean> 操作是否成功
 */
export async function secureStore<T>(key: string, data: T, password: string): Promise<boolean> {
  try {
    const encrypted = await PasswordManager.encryptData(data, password)
    localStorage.setItem(key, encrypted)
    return true
  } catch (error) {
    console.error(`安全存储 ${key} 失败:`, error)
    return false
  }
}

/**
 * 安全读取 - 从localStorage解密并获取数据
 *
 * @param key 存储键名
 * @param password 用于解密的密码
 * @returns Promise<T | null> 解密的数据或null(如果失败)
 */
export async function secureGet<T>(key: string, password: string): Promise<T | null> {
  try {
    const encrypted = localStorage.getItem(key)
    if (!encrypted) return null

    return await PasswordManager.decryptData(encrypted, password) as T
  } catch (error) {
    console.error(`安全读取 ${key} 失败:`, error)
    return null
  }
}

/**
 * 安全更新 - 读取现有数据，更新后重新加密存储
 *
 * @param key 存储键名
 * @param updateFn 更新函数，接收现有数据并返回更新后的数据
 * @param password 用于加解密的密码
 * @returns Promise<boolean> 操作是否成功
 */
export async function secureUpdate<T>(key: string, updateFn: (currentData: T | null) => T, password: string): Promise<boolean> {
  try {
    // 读取现有数据
    const currentData = await secureGet<T>(key, password)

    // 应用更新函数
    const updatedData = updateFn(currentData)

    // 保存更新后的数据
    return await secureStore<T>(key, updatedData, password)
  } catch (error) {
    console.error(`安全更新 ${key} 失败:`, error)
    return false
  }
}

/**
 * 安全移除 - 从localStorage移除加密的数据
 *
 * @param key 要移除的键名
 * @returns boolean 操作是否成功
 */
export function secureRemove(key: string): boolean {
  try {
    localStorage.removeItem(key)
    return true
  } catch (error) {
    console.error(`安全移除 ${key} 失败:`, error)
    return false
  }
}

/**
 * 数据脱敏 - 隐藏敏感字段
 *
 * @param object 需要脱敏的对象
 * @param sensitiveFields 需要脱敏的字段数组
 * @returns 脱敏后的对象副本
 */
export function sanitizeObject<T extends object>(object: T, sensitiveFields: string[]): T {
  // 创建对象副本
  const result = { ...object }

  // 遍历需要脱敏的字段
  sensitiveFields.forEach((field) => {
    if ((result as any)[field]) {
      const value = String((result as any)[field])

      // 根据字符串长度决定脱敏策略
      if (value.length > 8) {
        // 长字符串: 保留前4位和后4位
        const prefix = value.slice(0, 4)
        const suffix = value.slice(-4);
        (result as any)[field] = `${prefix}***${suffix}`
      } else if (value.length > 4) {
        // 中等长度: 保留前2位和后2位
        const prefix = value.slice(0, 2)
        const suffix = value.slice(-2);
        (result as any)[field] = `${prefix}***${suffix}`
      } else {
        // 短字符串: 完全隐藏
        (result as any)[field] = '****'
      }
    }
  })

  return result
}
