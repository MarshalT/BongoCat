# BongoCat 技术方案文档

## 1. 项目概述

BongoCat是一个基于Tauri和Vue 3的跨平台桌面应用程序，结合了现代前端技术和原生性能优势。通过Tauri框架，应用能够在保持轻量级的同时提供接近原生的用户体验。

## 2. 技术架构

### 2.1 前端技术栈

- **核心框架**: Vue 3.5.13
- **路由管理**: Vue Router 4.5.1
- **状态管理**: Pinia 3.0.2
- **UI组件库**: Ant Design Vue 4.2.6
- **图标系统**: @ant-design/icons-vue 7.0.1
- **CSS工具**: UnoCSS、Sass
- **功能增强**: @vueuse/core 13.1.0
- **日期处理**: dayjs 1.11.13
- **动画引擎**: pixi.js 6.5.10、pixi-live2d-display 0.4.0

### 2.2 后端技术栈

- **桌面应用框架**: Tauri 2.5.0
- **后端语言**: Rust
- **插件系统**:
  - 自动启动: @tauri-apps/plugin-autostart 2.3.0
  - 系统对话框: @tauri-apps/plugin-dialog 2.2.1
  - 日志系统: @tauri-apps/plugin-log 2.3.1
  - 文件打开: @tauri-apps/plugin-opener 2.2.6
  - 系统信息: @tauri-apps/plugin-os 2.2.1
  - 进程管理: @tauri-apps/plugin-process 2.2.1
  - 自动更新: @tauri-apps/plugin-updater 2.7.1
  - macOS权限: tauri-plugin-macos-permissions-api 2.3.0

### 2.3 构建工具链

- **构建工具**: Vite 6.3.5
- **包管理器**: pnpm
- **任务运行**: npm-run-all 4.1.5
- **TypeScript**: 5.6.3
- **ESLint**: 9.26.0 (配合@antfu/eslint-config 4.13.0)
- **提交规范**: commitlint 19.8.0
- **发布工具**: release-it 18.1.2

## 3. 项目结构

```
BongoCat/
├── src/                      # 前端源代码
│   ├── assets/               # 静态资源
│   │   ├── pro-list/         # 列表组件
│   │   ├── pro-list-item/    # 列表项组件
│   │   └── update-app/       # 应用更新组件
│   ├── composables/          # 组合式API
│   ├── constants/            # 常量定义
│   ├── pages/                # 页面组件
│   │   ├── main/            # 主页面
│   │   └── preference/      # 偏好设置页面
│   ├── plugins/              # 插件配置
│   ├── router/               # 路由配置
│   ├── stores/               # 状态管理
│   ├── utils/                # 工具函数
│   ├── App.vue               # 根组件
│   └── main.ts               # 应用入口
│
├── src-tauri/                # Tauri后端代码
│   ├── src/                  # Rust源代码
│   │   ├── core/             # 核心功能模块
│   │   ├── plugins/          # 插件模块
│   │   ├── lib.rs            # 库文件
│   │   └── main.rs           # 主入口文件
│   ├── assets/               # 后端资源
│   ├── capabilities/         # 权限配置
│   ├── icons/                # 应用图标
│   ├── tauri.conf.json       # Tauri主配置文件
│   ├── tauri.macos.conf.json # macOS特定配置
│   ├── tauri.linux.conf.json # Linux特定配置
│   └── tauri.windows.conf.json # Windows特定配置
│
├── scripts/                  # 构建脚本
│   ├── buildIcon.ts          # 图标构建脚本
│   └── release.ts            # 发布脚本
│
├── dist/                     # 前端构建输出目录
├── target/                   # Rust构建输出目录
│   └── release/              # 发布版构建
│       ├── bongo-cat.exe     # Windows可执行文件
│       └── bundle/           # 打包输出
│           └── nsis/         # Windows安装程序
│
├── public/                   # 公共资源
├── index.html                # HTML模板
├── vite.config.ts            # Vite配置
├── uno.config.ts             # UnoCSS配置
├── tsconfig.json             # TypeScript配置
├── package.json              # 项目配置和依赖
└── Cargo.toml                # Rust项目配置
```

## 4. 核心功能模块

### 4.1 窗口管理

应用包含两个主要窗口:

1. **主窗口 (main)**
   - 始终置顶设计
   - 透明背景
   - 无窗口装饰
   - 不在任务栏显示

2. **偏好设置窗口 (preference)**
   - 默认隐藏
   - 固定大小
   - 覆盖式标题栏
   - 隐藏标题

### 4.2 自动更新系统

应用集成了完整的自动更新系统，通过`@tauri-apps/plugin-updater`实现:

- 使用数字签名验证更新包
- 通过GitHub Releases获取更新
- 支持增量更新

### 4.3 跨平台适配

项目通过不同的配置文件针对各平台进行优化:

- **Windows**: tauri.windows.conf.json
- **macOS**: tauri.macos.conf.json (包含macOS私有API支持)
- **Linux**: tauri.linux.conf.json

### 4.4 状态管理与持久化

使用Pinia结合`@tauri-store/pinia`插件实现状态管理并自动持久化:

- 状态变更自动保存
- 跨会话数据持久化
- 响应式状态更新

## 5. 构建与发布流程

### 5.1 开发环境

```bash
pnpm tauri dev  # 启动开发服务器和应用
```

该命令执行以下操作:
1. 执行`beforeDevCommand` (pnpm dev)
2. 启动前端开发服务器
3. 启动Tauri应用并连接到开发服务器

### 5.2 生产构建

```bash
pnpm tauri build  # 构建生产版应用
```

构建过程:
1. 执行`beforeBuildCommand` (pnpm build)
   - 通过`run-s build:*`顺序执行所有build子任务
   - 构建图标资源
   - 构建前端资源
2. 编译Rust代码 (release模式)
3. 生成平台特定安装包

### 5.3 图标生成

通过`buildIcon.ts`脚本根据平台生成所有需要的图标资源:

- 为Windows生成.ico文件
- 为macOS生成.icns文件
- 为Android生成不同密度的图标
- 为各种目标平台生成多种尺寸的PNG图标

### 5.4 发布管理

使用`release-it`工具管理版本发布:

- 自动更新版本号
- 生成变更日志
- 创建Git标签
- 推送到GitHub

## 6. 安全与性能

### 6.1 安全设计

- 应用签名系统，确保更新包的完整性和来源
- 限制化的权限模型，通过capabilities声明所需权限
- 基于Rust的后端确保内存安全

### 6.2 性能优化

- 轻量级Tauri框架，相比Electron显著减小包体积
- 懒加载路由与组件
- 前端基于Vue3的响应式系统，优化渲染性能

## 7. 部署要求

### 7.1 开发环境需求

- Node.js 16+
- Rust 1.70+
- 平台特定的构建工具:
  - Windows: Visual Studio构建工具
  - macOS: Xcode命令行工具
  - Linux: GCC, libwebkit2gtk等依赖

### 7.2 生产环境

- Windows 7+
- macOS 10.15+
- 支持主流Linux发行版

## 8. 未来工作

- 优化自动更新流程
- 增强UI/UX体验
- 扩展平台特定功能
- 优化包体积和启动性能

## 9. 技术依赖版本

| 依赖项 | 版本 | 用途 |
|--------|------|------|
| Vue | 3.5.13 | 前端核心框架 |
| Tauri | 2.5.0 | 桌面应用框架 |
| Pinia | 3.0.2 | 状态管理 |
| Ant Design Vue | 4.2.6 | UI组件库 |
| Vite | 6.3.5 | 构建工具 |
| TypeScript | 5.6.3 | 类型系统 |
| pixi.js | 6.5.10 | 2D渲染 |
| UnoCSS | 66.1.0 | 原子CSS工具 | 