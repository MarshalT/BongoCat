// 导入ant-design-vue图标组件
import type { App } from 'vue'

import {
  AppstoreOutlined,
  BankOutlined,
  CopyOutlined,
  DollarOutlined,
  EyeOutlined,
  FundOutlined,
  HistoryOutlined,
  KeyOutlined,
  LockOutlined,
  PlusOutlined,
  ReloadOutlined,
  RocketOutlined,
  ScanOutlined,
  SendOutlined,
  SwapOutlined,
  SyncOutlined,
  TrophyOutlined,
  WalletOutlined,
} from '@ant-design/icons-vue'

// 创建图标组件映射
const icons = {
  SyncOutlined,
  ReloadOutlined,
  WalletOutlined,
  SendOutlined,
  ScanOutlined,
  HistoryOutlined,
  PlusOutlined,
  KeyOutlined,
  LockOutlined,
  EyeOutlined,
  CopyOutlined,
  SwapOutlined,
  DollarOutlined,
  BankOutlined,
  FundOutlined,
  TrophyOutlined,
  RocketOutlined,
  AppstoreOutlined,
}

// 注册所有图标组件
export function registerIcons(app: App) {
  Object.entries(icons).forEach(([name, component]) => {
    app.component(name, component)
  })
}

export default icons
