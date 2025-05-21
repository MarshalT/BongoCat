  /**
   * 加密钱包数据
   * @param data 钱包数据
   * @param password 钱包密码
   * @returns 加密后的钱包数据
   */
  const encryptWalletData = (data: any, password: string): string => {
    try {
      // 这里仅作为简单示例，实际应使用更强的加密算法
      // 例如AES加密或其他安全的加密方式
      const stringData = JSON.stringify(data);
      return btoa(stringData + '::' + password);
    } catch (error) {
      console.error('加密钱包数据失败:', error);
      throw new Error('加密钱包数据失败');
    }
  };
  /**
   * 解密钱包数据
   * @param encryptedData 加密的钱包数据
   * @param password 钱包密码
   * @returns 解密后的钱包数据
   */
  const decryptWalletData = (encryptedData: string, password: string): any => {
    try {
      const decodedData = atob(encryptedData);
      const parts = decodedData.split('::');

      if (parts.length !== 2 || parts[1] !== password) {
        throw new Error('密码不正确');
      }

      return JSON.parse(parts[0]);
    } catch (error) {
      console.error('解密钱包数据失败:', error);
      throw new Error('解密钱包数据失败，请检查密码是否正确');
    }
  };

  export { encryptWalletData, decryptWalletData };
