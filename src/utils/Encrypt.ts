/**
 * 加密钱包数据 - 使用PBKDF2加密标准
 * @param data 钱包数据
 * @param password 钱包密码
 * @returns 加密后的钱包数据
 */
function encryptWalletData(data: any, password: string): Promise<string> {
  try {
    // 将数据转换为字符串
    const stringData = JSON.stringify(data)

    // 生成随机盐值(16字节)
    const salt = window.crypto.getRandomValues(new Uint8Array(16))
    const saltBase64 = btoa(String.fromCharCode.apply(null, Array.from(salt)))

    // 使用PBKDF2从密码派生密钥
    return window.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey'],
    )
      .then((passwordKey) => {
        return window.crypto.subtle.deriveKey(
          {
            name: 'PBKDF2',
            salt,
            iterations: 100000,
            hash: 'SHA-256',
          },
          passwordKey,
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt'],
        )
      })
      .then((derivedKey) => {
      // 生成随机IV(12字节)
        const iv = window.crypto.getRandomValues(new Uint8Array(12))
        const ivBase64 = btoa(String.fromCharCode.apply(null, Array.from(iv)))

        // 使用AES-GCM加密数据
        return window.crypto.subtle.encrypt(
          {
            name: 'AES-GCM',
            iv,
          },
          derivedKey,
          new TextEncoder().encode(stringData),
        )
          .then((encryptedBuffer) => {
            // 将加密结果转换为Base64
            const encryptedArray = new Uint8Array(encryptedBuffer)
            const encryptedBase64 = btoa(String.fromCharCode.apply(null, Array.from(encryptedArray)))

            // 返回格式：saltBase64:ivBase64:encryptedBase64
            return `${saltBase64}:${ivBase64}:${encryptedBase64}`
          })
      })
      .catch((err) => {
        console.error('加密钱包数据失败:', err)
        throw new Error('加密钱包数据失败')
      })
  } catch (error) {
    console.error('加密钱包数据失败:', error)
    throw new Error('加密钱包数据失败')
  }
}

/**
 * 解密钱包数据 - 使用PBKDF2解密标准
 * @param encryptedData 加密的钱包数据
 * @param password 钱包密码
 * @returns 解密后的钱包数据
 */
async function decryptWalletData(encryptedData: string, password: string): Promise<any> {
  try {
    // 拆分加密数据
    const parts = encryptedData.split(':')

    // 如果是旧格式，使用兼容模式
    if (parts.length !== 3) {
      try {
        // 尝试使用旧的解密方法
        const decodedData = atob(encryptedData)
        const oldParts = decodedData.split('::')

        if (oldParts.length !== 2 || oldParts[1] !== password) {
          throw new Error('密码不正确')
        }
        return JSON.parse(oldParts[0])
      } catch (oldError) {
        console.error('旧格式解密失败:', oldError)
        throw new Error('解密钱包数据失败，可能密码错误或格式不兼容')
      }
    }

    const saltBase64 = parts[0]
    const ivBase64 = parts[1]
    const encryptedBase64 = parts[2]

    // 转换回二进制数组
    const salt = new Uint8Array([...atob(saltBase64)].map(c => c.charCodeAt(0)))
    const iv = new Uint8Array([...atob(ivBase64)].map(c => c.charCodeAt(0)))
    const encryptedArray = new Uint8Array([...atob(encryptedBase64)].map(c => c.charCodeAt(0)))

    // 从密码派生密钥
    const passwordKey = await window.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
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
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt'],
    )

    // 尝试解密
    try {
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
    } catch (error) {
      console.error('解密失败:', error)
      throw new Error('密码不正确或数据已损坏')
    }
  } catch (error) {
    console.error('解密钱包数据失败:', error)
    throw new Error('解密钱包数据失败，请检查密码是否正确')
  }
}

export { decryptWalletData, encryptWalletData }
