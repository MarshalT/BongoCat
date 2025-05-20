<template>
  <div class="wallet-settings">
    <h2 class="text-lg font-bold mb-4">钱包设置</h2>
    
    <!-- 密码设置部分 -->
    <div class="section mb-6">
      <h3 class="text-md font-medium mb-3">密码设置</h3>
      <a-card class="settings-card">
        <template v-if="!hasPassword">
          <div class="form-group">
            <label>设置密码</label>
            <a-input-password 
              v-model:value="form.password" 
              placeholder="输入安全密码"
              class="form-input" 
            />
            <div class="form-help">密码将用于保护您的钱包和私钥，请妥善保管</div>
          </div>
          
          <div class="form-group">
            <label>确认密码</label>
            <a-input-password 
              v-model:value="form.confirmPassword" 
              placeholder="再次输入密码"
              class="form-input" 
            />
          </div>
          
          <div class="form-group">
            <label>密码提示（可选）</label>
            <a-input 
              v-model:value="form.passwordHint" 
              placeholder="输入密码提示信息"
              class="form-input" 
            />
            <div class="form-help">提示信息会帮助您记忆密码，但不要过于明显</div>
          </div>
          
          <div class="warning-box mb-4">
            <div class="warning-title">重要提示</div>
            <div class="warning-content">
              <strong>请牢记您的密码！</strong>密码无法找回，如果忘记将无法访问您的钱包和资产。
            </div>
          </div>
          
          <a-button 
            type="primary" 
            block 
            :disabled="!canSetPassword" 
            :loading="settingPassword"
            @click="handleSetPassword"
          >
            设置密码
          </a-button>
        </template>
        
        <template v-else>
          <div class="flex justify-between items-center">
            <div>
              <h3 class="font-medium">密码已设置</h3>
              <p class="text-sm text-gray-500 mt-1" v-if="form.passwordHint">
                密码提示: {{ form.passwordHint }}
              </p>
            </div>
            <a-button type="primary" @click="showChangePassword = true">
              修改密码
            </a-button>
          </div>
          
          <!-- 修改密码弹窗 -->
          <a-modal
            v-model:visible="showChangePassword"
            title="修改密码"
            @ok="handleChangePassword"
            :confirmLoading="settingPassword"
            okText="确认修改"
            cancelText="取消"
          >
            <div class="form-group">
              <label>当前密码</label>
              <a-input-password 
                v-model:value="changeForm.currentPassword" 
                placeholder="输入当前密码"
                class="form-input" 
              />
            </div>
            
            <div class="form-group">
              <label>新密码</label>
              <a-input-password 
                v-model:value="changeForm.newPassword" 
                placeholder="输入新密码"
                class="form-input" 
              />
            </div>
            
            <div class="form-group">
              <label>确认新密码</label>
              <a-input-password 
                v-model:value="changeForm.confirmNewPassword" 
                placeholder="再次输入新密码"
                class="form-input" 
              />
            </div>
            
            <div class="form-group">
              <label>密码提示（可选）</label>
              <a-input 
                v-model:value="changeForm.passwordHint" 
                placeholder="输入新的密码提示信息"
                class="form-input" 
              />
            </div>
          </a-modal>
        </template>
      </a-card>
    </div>
    
    <!-- 节点设置部分 -->
    <div class="section">
      <h3 class="text-md font-medium mb-3">节点设置</h3>
      <a-card class="settings-card">
        <div class="form-group">
          <label>RPC节点URL</label>
          <a-input 
            v-model:value="form.nodeUrl" 
            placeholder="输入DFS区块链节点URL"
            class="form-input" 
          />
          <div class="form-help">例如: https://dfs-mainnet.example.com</div>
        </div>
        
        <div class="flex gap-2">
          <a-button 
            type="primary"
            :disabled="!form.nodeUrl" 
            :loading="testingNode"
            @click="handleTestNode"
          >
            测试连接
          </a-button>
          
          <a-button 
            :disabled="!form.nodeUrl" 
            :loading="savingNode"
            @click="handleSaveNodeUrl"
          >
            保存设置
          </a-button>
        </div>
        
        <div v-if="nodeTestResult" class="mt-4" :class="nodeTestSuccess ? 'text-green-500' : 'text-red-500'">
          {{ nodeTestResult }}
        </div>
      </a-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { useWalletStore } from '@/stores/walletStore';
import { useWallet } from '@/composables/wallet/useWallet';

// 获取钱包存储
const walletStore = useWalletStore();
// 获取钱包功能组合
const wallet = useWallet();

const form = reactive({
  password: '',
  confirmPassword: '',
  passwordHint: '',
  nodeUrl: ''
});

const changeForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmNewPassword: '',
  passwordHint: ''
});

const hasPassword = ref(false);
const showChangePassword = ref(false);
const settingPassword = ref(false);
const testingNode = ref(false);
const savingNode = ref(false);
const nodeTestResult = ref('');
const nodeTestSuccess = ref(false);

// 计算属性：判断是否可以设置密码
const canSetPassword = computed(() => {
  return form.password.length >= 8 && form.password === form.confirmPassword;
});

// 初始化
onMounted(async () => {
  // 检查是否已设置密码
  const storedPassword = localStorage.getItem('bongo-cat-wallet-password');
  if (storedPassword) {
    hasPassword.value = true;
    form.passwordHint = localStorage.getItem('bongo-cat-wallet-password-hint') || '';
  }
  
  // 加载已保存的节点URL
  const storedNodeUrl = localStorage.getItem('bongo-cat-wallet-node-url');
  if (storedNodeUrl) {
    form.nodeUrl = storedNodeUrl;
  } else {
    // 设置默认节点URL
    form.nodeUrl = 'https://api.dfs.land';
  }
});

// 设置密码
const handleSetPassword = async () => {
  if (!canSetPassword.value) {
    message.error('请确保密码长度至少为8位，且两次输入一致');
    return;
  }
  
  try {
    settingPassword.value = true;
    
    // 在实际应用中，应该使用加密算法对密码进行哈希处理
    // 这里为了简化，直接使用localStorage存储
    localStorage.setItem('bongo-cat-wallet-password', form.password);
    if (form.passwordHint) {
      localStorage.setItem('bongo-cat-wallet-password-hint', form.passwordHint);
    }
    
    message.success('密码设置成功');
    hasPassword.value = true;
    
    // 重置表单
    form.password = '';
    form.confirmPassword = '';
  } catch (error) {
    console.error('设置密码失败:', error);
    message.error('设置密码失败，请重试');
  } finally {
    settingPassword.value = false;
  }
};

// 修改密码
const handleChangePassword = async () => {
  const storedPassword = localStorage.getItem('bongo-cat-wallet-password');
  
  if (changeForm.currentPassword !== storedPassword) {
    message.error('当前密码不正确');
    return;
  }
  
  if (changeForm.newPassword.length < 8) {
    message.error('新密码长度至少为8位');
    return;
  }
  
  if (changeForm.newPassword !== changeForm.confirmNewPassword) {
    message.error('两次输入的新密码不一致');
    return;
  }
  
  try {
    settingPassword.value = true;
    
    // 更新密码
    localStorage.setItem('bongo-cat-wallet-password', changeForm.newPassword);
    if (changeForm.passwordHint) {
      localStorage.setItem('bongo-cat-wallet-password-hint', changeForm.passwordHint);
      form.passwordHint = changeForm.passwordHint;
    } else {
      localStorage.removeItem('bongo-cat-wallet-password-hint');
      form.passwordHint = '';
    }
    
    message.success('密码修改成功');
    showChangePassword.value = false;
    
    // 重置表单
    changeForm.currentPassword = '';
    changeForm.newPassword = '';
    changeForm.confirmNewPassword = '';
    changeForm.passwordHint = '';
  } catch (error) {
    console.error('修改密码失败:', error);
    message.error('修改密码失败，请重试');
  } finally {
    settingPassword.value = false;
  }
};

// 测试节点连接
const handleTestNode = async () => {
  if (!form.nodeUrl) return;
  
  try {
    testingNode.value = true;
    nodeTestResult.value = '';
    
    // 创建临时JsonRpc实例测试连接
    const { JsonRpc } = await import('eosjs');
    const rpc = new JsonRpc(form.nodeUrl);
    
    // 测试开始时间
    const startTime = Date.now();
    
    // 尝试获取区块链信息，测试连接
    const chainInfo = await rpc.get_info();
    
    // 计算延迟时间
    const latency = Date.now() - startTime;
    
    if (chainInfo && chainInfo.chain_id) {
      nodeTestSuccess.value = true;
      nodeTestResult.value = `节点连接成功！延迟: ${latency}ms`;
    } else {
      nodeTestSuccess.value = false;
      nodeTestResult.value = '节点连接失败，无法获取区块链信息';
    }
  } catch (error) {
    console.error('测试节点连接失败:', error);
    nodeTestSuccess.value = false;
    nodeTestResult.value = '节点连接失败，请检查URL是否正确';
  } finally {
    testingNode.value = false;
  }
};

// 保存节点设置
const handleSaveNodeUrl = async () => {
  if (!form.nodeUrl) return;
  
  try {
    savingNode.value = true;
    
    // 保存之前的URL用于比较
    const previousUrl = localStorage.getItem('bongo-cat-wallet-node-url');
    
    // 保存节点URL
    localStorage.setItem('bongo-cat-wallet-node-url', form.nodeUrl);
    
    message.success('节点设置已保存');
    
    // 直接检查原始加密钱包数据
    const encryptedWallet = localStorage.getItem('bongo-cat-wallet-encrypted');
    
    // 只有在URL发生变化且加密钱包数据存在的情况下才重新初始化
    if (previousUrl !== form.nodeUrl && encryptedWallet) {
      try {
        // 重新初始化钱包连接
        await wallet.initWallet();
        message.success('钱包已重新连接到新节点');
      } catch (err) {
        console.error('重新连接钱包失败:', err);
        message.error('重新连接钱包失败，请手动重新连接');
      }
    }else{
    //   message.success('1');
    //   message.success(`${previousUrl} ${form.nodeUrl} ${wallet.walletStatus.value} ${encryptedWallet}`);
      
    }
  } catch (error) {
    console.error('保存节点设置失败:', error);
    message.error('保存节点设置失败，请重试');
  } finally {
    savingNode.value = false;
  }
};
</script>

<style scoped>
.settings-card {
  margin-bottom: 16px;
  transition: all 0.3s ease;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
}

.form-input {
  width: 100%;
}

.form-help {
  margin-top: 4px;
  color: #999;
  font-size: 12px;
}

.warning-box {
  background: #fff2e8;
  border: 1px solid #ffcca7;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 12px;
}

.warning-title {
  font-weight: bold;
  color: #fa541c;
  margin-bottom: 8px;
}

.warning-content {
  color: #333;
  font-size: 14px;
}
</style> 