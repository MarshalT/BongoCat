import { encryptWalletData, decryptWalletData } from './Encrypt';

/**
 * 安全存储 - 加密保存数据到localStorage
 * 
 * @param key 存储键名
 * @param data 要存储的数据
 * @param password 用于加密的密码
 * @returns Promise<boolean> 操作是否成功
 */
export const secureStore = async <T>(
  key: string, 
  data: T, 
  password: string
): Promise<boolean> => {
  try {
    const encrypted = await encryptWalletData(data, password);
    localStorage.setItem(key, encrypted);
    return true;
  } catch (error) {
    console.error(`安全存储 ${key} 失败:`, error);
    return false;
  }
};

/**
 * 安全读取 - 从localStorage解密并获取数据
 * 
 * @param key 存储键名
 * @param password 用于解密的密码
 * @returns Promise<T | null> 解密的数据或null(如果失败)
 */
export const secureGet = async <T>(
  key: string, 
  password: string
): Promise<T | null> => {
  try {
    const encrypted = localStorage.getItem(key);
    if (!encrypted) return null;
    
    return await decryptWalletData(encrypted, password) as T;
  } catch (error) {
    console.error(`安全读取 ${key} 失败:`, error);
    return null;
  }
};

/**
 * 安全更新 - 读取现有数据，更新后重新加密存储
 * 
 * @param key 存储键名
 * @param updateFn 更新函数，接收现有数据并返回更新后的数据
 * @param password 用于加解密的密码
 * @returns Promise<boolean> 操作是否成功
 */
export const secureUpdate = async <T>(
  key: string,
  updateFn: (currentData: T | null) => T,
  password: string
): Promise<boolean> => {
  try {
    // 读取现有数据
    const currentData = await secureGet<T>(key, password);
    
    // 应用更新函数
    const updatedData = updateFn(currentData);
    
    // 保存更新后的数据
    return await secureStore<T>(key, updatedData, password);
  } catch (error) {
    console.error(`安全更新 ${key} 失败:`, error);
    return false;
  }
};

/**
 * 安全移除 - 从localStorage移除加密的数据
 * 
 * @param key 要移除的键名
 * @returns boolean 操作是否成功
 */
export const secureRemove = (key: string): boolean => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`安全移除 ${key} 失败:`, error);
    return false;
  }
};

/**
 * 数据脱敏 - 隐藏敏感字段
 * 
 * @param object 需要脱敏的对象
 * @param sensitiveFields 需要脱敏的字段数组
 * @returns 脱敏后的对象副本
 */
export const sanitizeObject = <T extends object>(
  object: T, 
  sensitiveFields: string[]
): T => {
  // 创建对象副本
  const result = { ...object };
  
  // 遍历需要脱敏的字段
  sensitiveFields.forEach(field => {
    if ((result as any)[field]) {
      const value = String((result as any)[field]);
      
      // 根据字符串长度决定脱敏策略
      if (value.length > 8) {
        // 长字符串: 保留前4位和后4位
        const prefix = value.slice(0, 4);
        const suffix = value.slice(-4);
        (result as any)[field] = `${prefix}***${suffix}`;
      } else if (value.length > 4) {
        // 中等长度: 保留前2位和后2位
        const prefix = value.slice(0, 2);
        const suffix = value.slice(-2);
        (result as any)[field] = `${prefix}***${suffix}`;
      } else {
        // 短字符串: 完全隐藏
        (result as any)[field] = "****";
      }
    }
  });
  
  return result;
}; 