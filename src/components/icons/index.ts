// 导入ant-design-vue图标组件
import {
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
  CopyOutlined
} from '@ant-design/icons-vue';

import { App } from 'vue';

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
  CopyOutlined
};

// 注册所有图标组件
export function registerIcons(app: App) {
  Object.entries(icons).forEach(([name, component]) => {
    app.component(name, component);
  });
}

export default icons; 