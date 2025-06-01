<script setup lang="ts">
import { 
  LoadingOutlined, 
  ExperimentOutlined, 
  UpCircleOutlined, 
  SearchOutlined,
  LockOutlined,
  UnlockOutlined,
  ReloadOutlined,
  PlusOutlined
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, onMounted, ref } from 'vue'

// 导入钱包组件和工具
import { useWallet } from '@/composables/wallet/useWallet'
import { useWalletUI } from '@/composables/wallet/useWalletUI'
import { PasswordManager } from '@/utils/PasswordManager'
// 新增导入解锁组件
import WalletUnlockModal from '@/components/wallet/WalletUnlockModal.vue'

// 猫咪数据结构接口
interface CatInfo {
  id: number
  owner: string
  genes: number
  birth_time: number
  stamina: number
  level: number
  experience: number
  last_external_check: number
  last_processed_log_id: number
}

interface InteractionInfo {
  id: number
  cat_id: number
  owner: string
  action_type: string
  attribute_change: number
  timestamp: string
}

// 使用钱包hooks
const wallet = useWallet()
const walletUI = useWalletUI()

// 状态变量
const loading = ref(false)
const catsList = ref<CatInfo[]>([])
const interactions = ref<InteractionInfo[]>([])
const selectedCatId = ref<number | null>(null)
const showPasswordModal = ref(false)
const password = ref('')
const actionType = ref<'upgrade' | 'checkaction' | 'mint' | null>(null)
const errorMessage = ref('')
const refreshingCat = ref<number | null>(null)
const interactionsLoading = ref(false)
const catsLoading = ref(false)
// 新增模态框显示控制
const showUnlockModal = ref(false)

// 计算属性
const isWalletConnected = computed(() => walletUI.isWalletConnected.value)
const isWalletLocked = computed(() => walletUI.isWalletLocked.value)
const accountName = computed(() => walletUI.walletAddress.value || '')

// 生成基于基因的猫咪颜色
const getCatColor = (genes: number) => {
  const colors = [
    'bg-orange-500', 'bg-blue-400', 'bg-yellow-500', 
    'bg-purple-400', 'bg-green-500', 'bg-red-400', 'bg-indigo-500'
  ]
  return colors[genes % colors.length]
}

// 格式化时间戳
const formatTime = (timestamp: number) => {
  if (!timestamp) return '未知'
  const date = new Date(timestamp * 1000)
  return date.toLocaleString()
}

// 计算距离上次检查的时间（小时）
const getHoursSinceLastCheck = (timestamp: number) => {
  if (!timestamp) return '从未检查'
  const now = Math.floor(Date.now() / 1000)
  const hours = Math.floor((now - timestamp) / 3600)
  return `${hours}小时前`
}

// 计算经验进度百分比
const getExpProgressPercent = (exp: number, level: number) => {
  // 下一级所需经验 = 当前等级 * 1000
  const nextLevelExp = level * 1000
  return Math.min(Math.floor((exp / nextLevelExp) * 100), 100)
}

// 获取用户的猫咪列表
const fetchUserCats = async () => {
  if (!wallet) {
    console.error('钱包未连接或初始化失败');
    message.error('钱包未连接，请先连接钱包');
    return;
  }

  loading.value = true;
  catsLoading.value = true;

  try {
    const result = await wallet.getTableRows(
      'ifwzjalq2lg1',      // code: 合约账户名
      'ifwzjalq2lg1',      // scope: 表的作用域
      'cats',              // table: 表名
      accountName.value,   // lower_bound: 按所有者索引下限
      2,                   // index_position: 2表示secondary index
      'name',              // key_type: 索引键类型
      100                  // limit: 最大结果数
    );

    console.log('获取猫咪API调用结果:', result);

    if (result && Array.isArray(result)) {
      // 过滤出属于当前用户的猫
      catsList.value = result.filter(cat => cat.owner === accountName.value);
      console.log('过滤后的用户猫咪列表:', catsList.value);
      
      if (catsList.value.length > 0 && !selectedCatId.value) {
        // 默认选择第一只猫
        selectedCatId.value = catsList.value[0].id;
        // 获取该猫的互动记录
        await fetchCatInteractions(selectedCatId.value);
      } else if (catsList.value.length === 0) {
        message.info('您还没有猫咪，请先获取一只猫咪');
      }
    } else {
      console.error('获取猫咪数据返回格式不正确:', result);
      message.error('获取猫咪数据格式不正确');
    }
  } catch (error: any) {
    console.error('获取猫咪失败:', error);
    console.error('错误详情:', {
      isWalletConnected: !!wallet,
      accountName: accountName.value,
      errorMessage: error?.message || '未知错误',
      errorStack: error?.stack
    });
    message.error(`获取猫咪失败: ${error?.message || '请检查网络连接'}`);
  } finally {
    loading.value = false;
    catsLoading.value = false;
  }
};

// 获取猫咪的互动记录
const fetchCatInteractions = async (catId: number) => {
  if (!wallet) {
    console.error('钱包未连接或初始化失败');
    message.error('钱包未连接，请先连接钱包');
    return;
  }

  interactionsLoading.value = true;
  
  try {
    const result = await wallet.getTableRows(
      'ifwzjalq2lg1',      // code: 合约账户名
      'ifwzjalq2lg1',      // scope: 表的作用域
      'interactions',       // table: 表名
      catId.toString(),     // lower_bound: 按猫咪ID索引
      2,                   // index_position: 2表示secondary index (cat_id)
      'i64',               // key_type: 索引键类型
      100                  // limit: 最大结果数
    );

    if (result && Array.isArray(result)) {
      // 过滤并按时间戳降序排序
      interactions.value = result
        .filter(interaction => Number(interaction.cat_id) === catId)
        .sort((a, b) => b.timestamp - a.timestamp);
      
      console.log('过滤后的互动记录:', interactions.value);
    } else {
      console.error('获取互动记录数据返回格式不正确:', result);
      message.error('获取互动记录数据格式不正确');
    }
  } catch (error: any) {
    console.error('获取互动记录失败:', error);
    console.error('错误详情:', {
      isWalletConnected: !!wallet,
      accountName: accountName.value,
      errorMessage: error?.message || '未知错误',
      errorStack: error?.stack
    });
    message.error(`获取互动记录失败: ${error?.message || '请检查网络连接'}`);
  } finally {
    interactionsLoading.value = false;
  }
};

// 选择猫咪
const selectCat = (catId: number) => {
  selectedCatId.value = catId
  fetchCatInteractions(catId)
}

// 执行合约操作前的检查
const prepareAction = (type: 'upgrade' | 'checkaction' | 'mint') => {
  if (!isWalletConnected.value) {
    message.error('请先连接钱包')
    return false
  }
  
  if (isWalletLocked.value) {
    message.warning('钱包已锁定，请先解锁')
    walletUI.showUnlockDialog()
    return false
  }
  
  // 对于mint操作不需要选择猫咪
  if (type !== 'mint' && !selectedCatId.value) {
    message.error('请先选择一只猫咪')
    return false
  }
  
  actionType.value = type
  showPasswordModal.value = true
  return true
}

// 准备铸造猫咪
const mintCat = async () => {
  if (!prepareAction('mint')) return
  
  try {
    // 查询用户余额，确保有足够的DFS
    if (wallet) {
      const balance = await wallet.getbalance('eosio.token', accountName.value, 'DFS')
      
      // 解析余额字符串，例如 "10.0000 DFS"
      const balanceValue = parseFloat(balance)
      if (isNaN(balanceValue) || balanceValue < 1.0) {
        message.warning(`您的DFS余额不足，铸造猫咪需要至少1.0000 DFS (当前余额: ${balance || '0.0000 DFS'})`)
        return
      }
      
      // 显示当前余额和费用
      message.info(`铸造猫咪需要支付1.0000 DFS (当前余额: ${balance})`)
    }
  } catch (error) {
    console.error('查询余额失败:', error)
    // 即使查询余额失败，仍然可以尝试铸造
    message.warning('查询余额失败，请确保有足够的DFS (至少1.0000 DFS)')
  }
}

// 升级猫咪
const upgradeCat = async () => {
  if (!prepareAction('upgrade')) return
}

// 执行检查操作
const checkCatAction = async () => {
  if (!prepareAction('checkaction')) return
}

// 处理密码输入确认
const handlePasswordConfirm = async () => {
  if (!password.value || !actionType.value) {
    message.error('请输入密码')
    return
  }
  
  // 对于非mint操作，需要选择猫咪
  if (actionType.value !== 'mint' && !selectedCatId.value) {
    message.error('请选择猫咪')
    return
  }
  
  try {
    loading.value = true
    
    // 验证密码
    const isValid = await PasswordManager.verifyPassword(password.value)
    if (!isValid) {
      message.error('密码不正确')
      return
    }
    
    // 获取加密的钱包数据
    const encryptedWallet = localStorage.getItem('bongo-cat-wallet-encrypted')
    if (!encryptedWallet) {
      message.error('找不到钱包数据')
      return
    }
    
    // 解密获取私钥
    const walletData = await PasswordManager.decryptData(encryptedWallet, password.value)
    const privateKey = walletData.privateKey
    
    // 检查钱包对象是否可用
    if (!wallet) {
      throw new Error('钱包未初始化或尚未连接')
    }
    
    let result
    walletUI.addDebugLog(`准备执行${actionType.value}操作`)
    
    // 根据不同操作类型准备交易数据
    if (actionType.value === 'mint') {
      // 铸造猫咪 - 使用转账交易
      result = await wallet.transact({
        actions: [{
          account: 'eosio.token',
          name: 'transfer',
          authorization: [{
            actor: accountName.value,
            permission: 'active',
          }],
          data: {
            from: accountName.value,
            to: 'ifwzjalq2lg1',  // 合约账户
            quantity: '1.00000000 DFS',  // 固定费用
            memo: 'mint'  // 特定备注，标识为铸造操作
          }
        }]
      }, { useFreeCpu: true })
      
      message.success('铸造猫咪交易已提交')
      walletUI.addDebugLog('铸造猫咪交易已提交', result)
    } else {
      // 升级或检查操作 - 直接调用合约方法
      const actionData = actionType.value === 'upgrade' 
        ? {
            cat_id: selectedCatId.value,
            owner: accountName.value
          }
        : {
            owner: accountName.value,
            cat_id: selectedCatId.value
          }
      
      result = await wallet.transact({
        actions: [{
          account: 'ifwzjalq2lg1',
          name: actionType.value,
          authorization: [{
            actor: accountName.value,
            permission: 'active',
          }],
          data: actionData,
        }],
      }, { useFreeCpu: true })
      
      message.success(`操作成功：${actionType.value === 'upgrade' ? '猫咪升级' : '检查活动'}`)
    }
    
    walletUI.addDebugLog(`${actionType.value}交易结果`, result)
    
    // 关闭密码对话框
    showPasswordModal.value = false
    password.value = ''
    
    // 刷新猫咪数据
    await fetchUserCats()
    if (selectedCatId.value) {
      await fetchCatInteractions(selectedCatId.value)
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : '未知错误'
    walletUI.addDebugLog(`执行${actionType.value}操作失败`, err)
    message.error(`操作失败: ${errMsg}`)
  } finally {
    loading.value = false
  }
}

// 刷新数据
const refreshData = async () => {
  await fetchUserCats()
  if (selectedCatId.value) {
    await fetchCatInteractions(selectedCatId.value)
  }
}

// 组件挂载时获取数据
onMounted(async () => {
  try {
    // 检查钱包是否连接且解锁
    if (isWalletConnected.value && !isWalletLocked.value) {
      // 检查钱包对象是否正确初始化
      if (!wallet) {
        errorMessage.value = '钱包实例未正确初始化，请刷新页面或重新连接钱包'
        walletUI.addDebugLog('钱包组件挂载时发现 dfsWallet 未初始化')
        return
      }
      
      // 获取猫咪数据
      await fetchUserCats()
    } else if (isWalletConnected.value && isWalletLocked.value) {
      // 钱包已连接但锁定
      errorMessage.value = '钱包已锁定，请先解锁钱包'
      walletUI.addDebugLog('钱包组件挂载时发现钱包已锁定')
    } else {
      // 钱包未连接
      errorMessage.value = '请先连接钱包'
      walletUI.addDebugLog('钱包组件挂载时发现钱包未连接')
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : '未知错误'
    errorMessage.value = `初始化猫咪数据失败: ${errMsg}`
    walletUI.addDebugLog('钱包组件挂载时出错', err)
  }
})

// 解锁钱包的处理
const unlockWallet = () => {
  // 显示解锁钱包对话框
  showUnlockModal.value = true
}

// 处理解锁钱包
const handleUnlockWallet = async (password: string) => {
  try {
    if (!password) {
      message.error('请输入密码')
      return false
    }
    
    walletUI.addDebugLog('猫星球: 开始解锁钱包')
    const result = await wallet.unlockWallet(password)
    
    if (result) {
      showUnlockModal.value = false
      message.success('钱包解锁成功')
      
      // 解锁成功后刷新数据
      await fetchUserCats()
      if (selectedCatId.value) {
        await fetchCatInteractions(selectedCatId.value)
      }
      
      walletUI.addDebugLog('猫星球: 钱包解锁成功')
      return true
    } else {
      message.error('钱包解锁失败，请检查密码是否正确')
      walletUI.addDebugLog('猫星球: 钱包解锁失败')
      return false
    }
  } catch (err: any) {
    const errorMessage = err.message || '解锁钱包失败'
    message.error(`解锁失败: ${errorMessage}`)
    walletUI.addDebugLog(`猫星球: 解锁钱包失败: ${errorMessage}`)
    return false
  }
}
</script>

<template>
  <div class="cat-planet p-4">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-xl font-bold">喵星球</h2>
      <div class="flex gap-2">
        <a-button @click="refreshData" :loading="loading">
          <ReloadOutlined /> 刷新数据
        </a-button>
        <a-button v-if="isWalletLocked" @click="unlockWallet" type="primary">
          <UnlockOutlined /> 解锁钱包
        </a-button>
        <a-button v-else @click="walletUI.handleLockWallet">
          <LockOutlined /> 锁定钱包
        </a-button>
      </div>
    </div>
    
    <!-- 钱包连接状态 -->
    <a-alert
      v-if="!isWalletConnected"
      type="warning"
      class="mb-4"
      message="请先连接钱包"
      description="在钱包页面连接或创建钱包以管理您的猫咪。"
      show-icon
    />
    
    <a-alert
      v-else-if="isWalletLocked"
      type="warning"
      class="mb-4"
      message="钱包已锁定"
      description="请解锁钱包以管理您的猫咪。"
      show-icon
    />
    
    <a-alert
      v-if="errorMessage"
      type="error"
      class="mb-4"
      :message="errorMessage"
      show-icon
      closable
      @close="errorMessage = ''"
    />
    
    <!-- 内容区 -->
    <a-row :gutter="16">
      <!-- 左侧猫咪列表 -->
      <a-col :span="10">
        <a-card title="我的猫咪" :loading="loading">
          <template #extra>
            <a-button type="primary" @click="mintCat" :disabled="!isWalletConnected || isWalletLocked">
              <PlusOutlined /> 铸造猫咪
            </a-button>
          </template>
          
          <div v-if="!isWalletConnected || isWalletLocked" class="text-center p-4">
            <p>请先连接并解锁钱包</p>
          </div>
          
          <a-empty v-else-if="catsList.length === 0" description="暂无猫咪" />
          
          <div v-else class="cat-list space-y-2">
            <a-card
              v-for="cat in catsList"
              :key="cat.id"
              size="small"
              :class="[
                'cursor-pointer transition-all hover:shadow-md',
                selectedCatId === cat.id ? 'border-primary-5 border-2' : ''
              ]"
              @click="selectCat(cat.id)"
            >
              <div class="flex justify-between items-center">
                <div class="flex items-center gap-2">
                  <div 
                    :class="['size-8 rounded-full flex items-center justify-center text-white', getCatColor(cat.genes)]"
                  >
                    #{{ cat.id }}
                  </div>
                  <div class="flex flex-col">
                    <span class="font-medium">Lv.{{ cat.level }}</span>
                    <span class="text-xs text-gray-500">经验: {{ cat.experience }}</span>
                  </div>
                </div>
                <div class="text-right">
                  <div>体力: {{ cat.stamina }}/100</div>
                  <div class="text-xs text-gray-500">
                    {{ getHoursSinceLastCheck(cat.last_external_check) }}
                  </div>
                </div>
              </div>
            </a-card>
          </div>
        </a-card>
      </a-col>
      
      <!-- 右侧猫咪详情 -->
      <a-col :span="14">
        <a-card title="猫咪详情" :loading="loading">
          <div v-if="!isWalletConnected || isWalletLocked" class="text-center p-4">
            <p>请先连接并解锁钱包</p>
          </div>
          
          <div v-else-if="!selectedCatId" class="text-center p-4">
            <p>请选择一只猫咪查看详情</p>
          </div>
          
          <div v-else>
            <!-- 猫咪信息 -->
            <div class="cat-info mb-4">
              <div v-if="selectedCatId && catsList.length > 0">
                <div class="flex justify-between items-center mb-4">
                  <div class="flex items-center gap-2">
                    <div 
                      :class="[
                        'size-16 rounded-full flex items-center justify-center text-xl font-bold text-white',
                        getCatColor(catsList.find(c => c.id === selectedCatId)?.genes || 0)
                      ]"
                    >
                      #{{ selectedCatId }}
                    </div>
                    <div>
                      <h3 class="text-lg font-medium">猫咪 #{{ selectedCatId }}</h3>
                      <p class="text-sm text-gray-500">
                        出生于 {{ formatTime(catsList.find(c => c.id === selectedCatId)?.birth_time || 0) }}
                      </p>
                    </div>
                  </div>
                  
                  <div class="action-buttons space-x-2">
                    <a-button type="primary" @click="upgradeCat">
                      <UpCircleOutlined /> 升级
                    </a-button>
                    <a-button @click="checkCatAction">
                      <ExperimentOutlined /> 检查
                    </a-button>
                  </div>
                </div>
                
                <!-- 属性信息 -->
                <div class="attributes bg-gray-50 p-3 rounded mb-3">
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <div class="text-sm text-gray-500">等级</div>
                      <div class="text-xl font-medium">
                        {{ catsList.find(c => c.id === selectedCatId)?.level || 0 }}
                      </div>
                    </div>
                    <div>
                      <div class="text-sm text-gray-500">体力</div>
                      <a-progress
                        :percent="catsList.find(c => c.id === selectedCatId)?.stamina || 0"
                        :stroke-color="catsList.find(c => c.id === selectedCatId)?.stamina >= 50 ? '#52c41a' : '#faad14'"
                      />
                    </div>
                    <div>
                      <div class="text-sm text-gray-500">基因</div>
                      <div class="text-base">
                        {{ catsList.find(c => c.id === selectedCatId)?.genes || 0 }}
                      </div>
                    </div>
                    <div>
                      <div class="text-sm text-gray-500">经验</div>
                      <a-progress 
                        :percent="getExpProgressPercent(
                          catsList.find(c => c.id === selectedCatId)?.experience || 0,
                          catsList.find(c => c.id === selectedCatId)?.level || 1
                        )" 
                        :format="() => `${catsList.find(c => c.id === selectedCatId)?.experience || 0}`"
                        stroke-color="#1890ff"
                      />
                    </div>
                  </div>
                </div>
                
                <!-- 互动记录 -->
                <div>
                  <div class="flex justify-between items-center mb-2">
                    <h4 class="font-medium">互动记录</h4>
                    <a-button 
                      type="primary" 
                      size="small" 
                      @click="fetchCatInteractions(selectedCatId)"
                      :loading="interactionsLoading"
                    >
                      <ReloadOutlined /> 刷新
                    </a-button>
                  </div>
                  
                  <a-empty v-if="interactions.length === 0" description="暂无互动记录" />
                  
                  <a-timeline v-else>
                    <a-timeline-item 
                      v-for="interaction in interactions" 
                      :key="interaction.id"
                      :color="
                        interaction.action_type === 'upgrade' ? 'green' : 
                        interaction.action_type === 'checkaction' ? 'blue' : 'gray'
                      "
                    >
                      <p>
                        <span class="font-medium">
                          {{ interaction.action_type === 'upgrade' ? '升级' : '检查活动' }}
                        </span>
                        <span v-if="interaction.attribute_change" class="text-green-500 ml-1">
                          +{{ interaction.attribute_change }}
                        </span>
                      </p>
                      <p class="text-xs text-gray-500">
                        {{ new Date(interaction.timestamp).toLocaleString() }}
                      </p>
                    </a-timeline-item>
                  </a-timeline>
                </div>
              </div>
            </div>
          </div>
        </a-card>
      </a-col>
    </a-row>
    
    <!-- 密码输入对话框 -->
    <a-modal
      v-model:visible="showPasswordModal"
      :title="actionType === 'upgrade' ? '升级猫咪' : actionType === 'mint' ? '铸造猫咪' : '检查活动'"
      :confirm-loading="loading"
      @ok="handlePasswordConfirm"
    >
      <p>请输入钱包密码以确认操作</p>
      <a-input-password
        v-model:value="password"
        placeholder="输入钱包密码"
        class="mt-4"
        @keyup.enter="handlePasswordConfirm"
      />
      <div class="mt-2 text-gray-500 text-sm">
        <template v-if="actionType === 'upgrade'">
          升级将提升猫咪等级，消耗经验值
        </template>
        <template v-else-if="actionType === 'mint'">
          铸造猫咪将从您的钱包中扣除 <span class="font-bold text-red-500">1.0000 DFS</span>
        </template>
        <template v-else>
          检查活动可能会发现新的经验或属性增长
        </template>
      </div>
    </a-modal>

    <!-- 解锁钱包对话框 -->
    <WalletUnlockModal
      v-model:visible="showUnlockModal"
      @unlock="handleUnlockWallet"
    />
  </div>
</template>

<style scoped>
.cat-list {
  max-height: 450px;
  overflow-y: auto;
  padding-right: 5px;
}
</style>
