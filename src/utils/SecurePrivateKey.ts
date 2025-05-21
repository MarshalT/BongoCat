export class SecurePrivateKey {
  private keyBuffer: Uint8Array | null = null
  private readonly lifetime: number // 毫秒
  private timer: NodeJS.Timeout | null = null

  constructor(lifetime: number = 60000) { // 默认60秒后清除
    this.lifetime = lifetime
  }

  // 设置私钥并开始计时销毁
  setKey(privateKey: string): void {
    // 先清除旧数据
    this.clear()

    // 将私钥转换为Uint8Array
    const encoder = new TextEncoder()
    this.keyBuffer = encoder.encode(privateKey)

    // 设置自动销毁计时器
    this.timer = setTimeout(() => this.clear(), this.lifetime)
  }

  // 获取私钥（仅在需要时调用）
  getKey(): string | null {
    if (!this.keyBuffer) return null

    const decoder = new TextDecoder()
    return decoder.decode(this.keyBuffer)
  }

  // 立即清除私钥
  clear(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }

    if (this.keyBuffer) {
      // 安全覆写内存
      crypto.getRandomValues(this.keyBuffer)
      this.keyBuffer = null
    }
  }

  // 用于明确需要使用私钥的场景
  useWithKey<T>(callback: (key: string) => T): T | null {
    const key = this.getKey()
    if (!key) return null

    try {
      return callback(key)
    } finally {
      // 重置计时器，因为私钥已被使用
      if (this.timer) {
        clearTimeout(this.timer)
        this.timer = setTimeout(() => this.clear(), this.lifetime)
      }
    }
  }
}
