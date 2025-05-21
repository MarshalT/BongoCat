import { info as logInfo } from '@tauri-apps/plugin-log'

import { PasswordManager } from './PasswordManager'

// 盐值常量 - 在生产环境中应该为每个用户随机生成并单独存储
const SALT_KEY = 'bongo-cat-salt-924f7ae1'
const ITERATIONS = 10000
const KEY_LENGTH = 32

/**
 * 使用PBKDF2算法对密码进行哈希处理
 * @param password 原始密码
 * @returns 哈希后的密码字符串
 * @deprecated 请使用 PasswordManager.setPassword 代替
 */
export async function hashPassword(password: string): Promise<string> {
  logInfo('hashPassword 函数已废弃，请使用 PasswordManager.setPassword')
  // 不能直接访问private方法，使用PasswordManager公开方法
  // 设置密码后马上验证，这样可以获取到哈希值
  await PasswordManager.setPassword(password)
  const hash = localStorage.getItem('bongo-cat-wallet-password-hash') || ''
  return hash
}

/**
 * 验证密码是否匹配存储的哈希值
 * @param password 要验证的密码
 * @param storedHash 存储的哈希值
 * @returns 是否匹配
 * @deprecated 请使用 PasswordManager.verifyPassword 代替
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  logInfo('verifyPassword 函数已废弃，请使用 PasswordManager.verifyPassword')
  return await PasswordManager.verifyPassword(password)
}

/**
 * 安全地存储密码哈希
 * @param password 要存储的密码
 * @deprecated 请使用 PasswordManager.setPassword 代替
 */
export async function secureStorePassword(password: string): Promise<void> {
  logInfo('secureStorePassword 函数已废弃，请使用 PasswordManager.setPassword')
  await PasswordManager.setPassword(password)
}

/**
 * 检查用户密码是否正确
 * @param password 要检查的密码
 * @returns 密码是否正确
 * @deprecated 请使用 PasswordManager.verifyPassword 代替
 */
export async function checkPassword(password: string): Promise<boolean> {
  logInfo('checkPassword 函数已废弃，请使用 PasswordManager.verifyPassword')
  return await PasswordManager.verifyPassword(password)
}
