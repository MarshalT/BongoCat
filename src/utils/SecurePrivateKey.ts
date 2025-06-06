/**
 * SecurePrivateKey - 安全的私钥管理类
 *
 * 该类使用TypedArray存储私钥，并提供安全的访问和清除机制
 * 设计目标：
 * 1. 减少私钥在内存中的暴露时间
 * 2. 使用后立即清除内存
 * 3. 避免私钥字符串化，减少在内存中的复制
 */

import { info, error as logError } from '@tauri-apps/plugin-log'

export class SecurePrivateKey {
  private keyBuffer: Uint8Array | null = null
  private isCleared: boolean = true

  /**
   * 设置私钥
   * @param privateKey 私钥字符串
   */
  setKey(privateKey: string): void {
    if (!privateKey) {
      logError('尝试设置空私钥')
      return
    }

    try {
      // 将字符串转换为Uint8Array
      this.keyBuffer = new TextEncoder().encode(privateKey)
      this.isCleared = false

      // 设置自动清除计时器 - 5分钟后自动清除
      setTimeout(() => this.clear(), 5 * 60 * 1000)

      info('私钥已安全存储在内存中')
    } catch (err) {
      logError(`设置私钥失败: ${err}`)
      this.clear() // 确保清除任何可能的部分数据
    }
  }

  /**
   * 获取私钥 - 使用后应立即调用clear()
   * @returns 私钥字符串或null
   */
  getKey(): string | null {
    if (!this.keyBuffer || this.isCleared) {
      return null
    }

    try {
      // 临时转换为字符串使用
      const key = new TextDecoder().decode(this.keyBuffer)
      return key
    } catch (err) {
      logError(`获取私钥失败: ${err}`)
      return null
    }
  }

  /**
   * 使用私钥执行操作，操作完成后自动清除
   * @param operation 使用私钥的操作函数
   * @returns 操作结果
   */
  async useKey<T>(operation: (key: string) => Promise<T>): Promise<T> {
    if (!this.keyBuffer || this.isCleared) {
      throw new Error('私钥不可用或已被清除')
    }

    try {
      const key = this.getKey()
      if (!key) {
        throw new Error('无法获取私钥')
      }

      // 执行操作
      const result = await operation(key)

      // 操作完成后立即清除
      this.clear()

      return result
    } catch (err) {
      // 发生错误时也要清除
      this.clear()
      throw err
    }
  }

  /**
   * 清除私钥内存
   */
  clear(): void {
    if (this.keyBuffer) {
      // 用随机数据覆盖内存
      crypto.getRandomValues(this.keyBuffer)
      // 然后用零覆盖
      this.keyBuffer.fill(0)
      this.keyBuffer = null
      this.isCleared = true

      // info('私钥已从内存中安全清除');
    }
  }

  /**
   * 检查是否有可用的私钥
   */
  hasKey(): boolean {
    return this.keyBuffer !== null && !this.isCleared
  }

  /**
   * 析构函数 - 确保对象被垃圾回收时清除私钥
   */
  destroy(): void {
    this.clear()
  }
}

export default SecurePrivateKey
