<template>
  <div class="ecosystem-explorer">
    <h2 class="text-lg font-bold mb-4">DFS生态系统</h2>
    
    <!-- DeFi应用 -->
    <div class="section mb-6">
      <h3 class="text-md font-medium mb-3">DeFi应用</h3>
      <div class="grid grid-cols-2 gap-3">
        <a-card hoverable class="dapp-card">
          <div class="flex items-center">
            <div class="dapp-icon bg-blue-500 mr-3">
              <swap-outlined />
            </div>
            <div>
              <div class="font-medium">BongoDEX</div>
              <div class="text-xs text-gray-500">去中心化交易所</div>
            </div>
          </div>
          <div class="mt-2 text-xs">
            <div class="flex justify-between">
              <span>24小时交易量</span>
              <span class="font-medium">$1,245,678</span>
            </div>
            <div class="flex justify-between mt-1">
              <span>TVL</span>
              <span class="font-medium">$15,456,234</span>
            </div>
          </div>
        </a-card>
        
        <a-card hoverable class="dapp-card">
          <div class="flex items-center">
            <div class="dapp-icon bg-green-500 mr-3">
              <dollar-outlined />
            </div>
            <div>
              <div class="font-medium">BongoLend</div>
              <div class="text-xs text-gray-500">借贷平台</div>
            </div>
          </div>
          <div class="mt-2 text-xs">
            <div class="flex justify-between">
              <span>存款APY</span>
              <span class="font-medium">5.82%</span>
            </div>
            <div class="flex justify-between mt-1">
              <span>TVL</span>
              <span class="font-medium">$8,234,567</span>
            </div>
          </div>
        </a-card>
        
        <a-card hoverable class="dapp-card">
          <div class="flex items-center">
            <div class="dapp-icon bg-purple-500 mr-3">
              <bank-outlined />
            </div>
            <div>
              <div class="font-medium">BongoStaking</div>
              <div class="text-xs text-gray-500">质押平台</div>
            </div>
          </div>
          <div class="mt-2 text-xs">
            <div class="flex justify-between">
              <span>质押APR</span>
              <span class="font-medium">12.5%</span>
            </div>
            <div class="flex justify-between mt-1">
              <span>质押总量</span>
              <span class="font-medium">2,456,789 DFS</span>
            </div>
          </div>
        </a-card>
        
        <a-card hoverable class="dapp-card">
          <div class="flex items-center">
            <div class="dapp-icon bg-red-500 mr-3">
              <fund-outlined />
            </div>
            <div>
              <div class="font-medium">BongoSwap</div>
              <div class="text-xs text-gray-500">代币交换</div>
            </div>
          </div>
          <div class="mt-2 text-xs">
            <div class="flex justify-between">
              <span>交易手续费</span>
              <span class="font-medium">0.3%</span>
            </div>
            <div class="flex justify-between mt-1">
              <span>支持代币数</span>
              <span class="font-medium">128</span>
            </div>
          </div>
        </a-card>
      </div>
    </div>
    
    <!-- NFT市场 -->
    <div class="section mb-6">
      <h3 class="text-md font-medium mb-3">热门NFT</h3>
      <div class="grid grid-cols-2 gap-3">
        <a-card hoverable class="nft-card">
          <div class="nft-image bg-gradient-to-r from-blue-400 to-purple-500 mb-2"></div>
          <div class="flex justify-between items-center">
            <div>
              <div class="font-medium">Bongo Cat #1024</div>
              <div class="text-xs text-gray-500">Bongo Cat集合</div>
            </div>
            <div class="text-right">
              <div class="font-medium">12.5 DFS</div>
              <div class="text-xs text-gray-500">≈ $125</div>
            </div>
          </div>
        </a-card>
        
        <a-card hoverable class="nft-card">
          <div class="nft-image bg-gradient-to-r from-yellow-400 to-red-500 mb-2"></div>
          <div class="flex justify-between items-center">
            <div>
              <div class="font-medium">Pixel Land #42</div>
              <div class="text-xs text-gray-500">虚拟土地</div>
            </div>
            <div class="text-right">
              <div class="font-medium">25.8 DFS</div>
              <div class="text-xs text-gray-500">≈ $258</div>
            </div>
          </div>
        </a-card>
      </div>
    </div>
    
    <!-- 游戏 -->
    <div class="section">
      <h3 class="text-md font-medium mb-3">区块链游戏</h3>
      <div class="grid grid-cols-2 gap-3">
        <a-card hoverable class="game-card">
          <div class="flex items-center">
            <div class="game-icon bg-indigo-500 mr-3">
              <trophy-outlined />
            </div>
            <div>
              <div class="font-medium">Bongo Quest</div>
              <div class="text-xs text-gray-500">角色扮演游戏</div>
            </div>
          </div>
          <div class="mt-2 text-xs">
            <div class="flex justify-between">
              <span>活跃玩家</span>
              <span class="font-medium">12,456</span>
            </div>
            <div class="flex justify-between mt-1">
              <span>游戏内NFT</span>
              <span class="font-medium">54,321</span>
            </div>
          </div>
        </a-card>
        
        <a-card hoverable class="game-card">
          <div class="flex items-center">
            <div class="game-icon bg-cyan-500 mr-3">
              <rocket-outlined />
            </div>
            <div>
              <div class="font-medium">Space Cats</div>
              <div class="text-xs text-gray-500">太空探索游戏</div>
            </div>
          </div>
          <div class="mt-2 text-xs">
            <div class="flex justify-between">
              <span>活跃玩家</span>
              <span class="font-medium">8,765</span>
            </div>
            <div class="flex justify-between mt-1">
              <span>游戏内经济总值</span>
              <span class="font-medium">$3.2M</span>
            </div>
          </div>
        </a-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { 
  SwapOutlined, 
  DollarOutlined, 
  BankOutlined, 
  FundOutlined,
  TrophyOutlined,
  RocketOutlined 
} from '@ant-design/icons-vue';
</script>

<style scoped>
.dapp-card, .nft-card, .game-card {
  transition: all 0.3s ease;
}

.dapp-card:hover, .nft-card:hover, .game-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.dapp-icon, .game-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.nft-image {
  height: 100px;
  border-radius: 8px;
  margin-top: -12px;
  margin-left: -12px;
  margin-right: -12px;
}
</style> 