/**
 * 网络类型定义
 */
export enum NetworkType {
  MAINNET = 'mainnet',
  TESTNET = 'testnet',
  DEVNET = 'devnet',
}

/**
 * 链类型定义
 */
export enum ChainType {
  DFS = 'dfs',
  ETH = 'ethereum',
  BTC = 'bitcoin',
  BSC = 'binance',
}

/**
 * 网络配置接口
 */
export interface NetworkConfig {
  id: string
  name: string
  type: NetworkType
  chain: ChainType
  rpcUrl: string
  explorerUrl: string
  symbol: string
  decimals: number
  logoUrl?: string
  chainId?: string
  isActive?: boolean
}

/**
 * DFS主网配置
 */
export const DFS_MAINNET: NetworkConfig = {
  id: 'dfs-mainnet',
  name: 'DFS主网',
  type: NetworkType.MAINNET,
  chain: ChainType.DFS,
  rpcUrl: 'https://api.dfs.land/dfschain',
  explorerUrl: 'https://explorer.dfs.land',
  symbol: 'DFS',
  decimals: 4,
  chainId: '000d9cae502dd1cc895745e204f83cc892bc4c450f92a03ecd4fe057709853cc',
  isActive: true,
}

/**
 * DFS测试网配置
 */
export const DFS_TESTNET: NetworkConfig = {
  id: 'dfs-testnet',
  name: 'DFS测试网',
  type: NetworkType.TESTNET,
  chain: ChainType.DFS,
  rpcUrl: 'https://testnet.dfs.land',
  explorerUrl: 'https://testnet-explorer.dfs.land',
  symbol: 'DFS',
  decimals: 4,
  chainId: 'cf057bbfb72640471fd910bcb67639c22df9f92470936cddc1ade0e2f2e7dc4f',
  isActive: true,
}

/**
 * 以太坊主网配置
 */
export const ETH_MAINNET: NetworkConfig = {
  id: 'eth-mainnet',
  name: '以太坊主网',
  type: NetworkType.MAINNET,
  chain: ChainType.ETH,
  rpcUrl: 'https://mainnet.infura.io/v3/your-api-key',
  explorerUrl: 'https://etherscan.io',
  symbol: 'ETH',
  decimals: 18,
  chainId: '1',
  isActive: false,
}

/**
 * 币安智能链主网配置
 */
export const BSC_MAINNET: NetworkConfig = {
  id: 'bsc-mainnet',
  name: '币安智能链',
  type: NetworkType.MAINNET,
  chain: ChainType.BSC,
  rpcUrl: 'https://bsc-dataseed.binance.org',
  explorerUrl: 'https://bscscan.com',
  symbol: 'BNB',
  decimals: 18,
  chainId: '56',
  isActive: false,
}

/**
 * 网络列表
 */
export const NETWORKS: NetworkConfig[] = [
  DFS_MAINNET,
  DFS_TESTNET,
  ETH_MAINNET,
  BSC_MAINNET,
]

/**
 * 获取默认网络
 */
export function getDefaultNetwork(): NetworkConfig {
  return DFS_MAINNET
}

/**
 * 根据ID获取网络
 * @param id 网络ID
 */
export function getNetworkById(id: string): NetworkConfig | undefined {
  return NETWORKS.find(network => network.id === id)
}

/**
 * 根据链类型获取可用网络列表
 * @param chain 链类型
 */
export function getNetworksByChain(chain: ChainType): NetworkConfig[] {
  return NETWORKS.filter(network => network.chain === chain)
}

/**
 * 获取活跃网络列表
 */
export function getActiveNetworks(): NetworkConfig[] {
  return NETWORKS.filter(network => network.isActive)
}
