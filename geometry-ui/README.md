# geometry-ui

`geometry-ui` 是 Geometry Lab 的前端应用，基于 Vue 3 和 Vite 构建，负责统一呈现函数实验台、函数星图、AI 错题本、登录/注册入口，以及全局学习状态检测侧边栏。

## 页面与入口

应用使用 Hash 路由，当前页面如下：

- `/#/workbench`：二维函数实验台
- `/#/workbench-3d`：三维实验台
- `/#/starfield`：函数星图
- `/#/error-book`：AI 错题本

独立静态入口：

- `/login.html`
- `/register.html`

## 核心功能

### 函数实验台

- 多函数同屏输入
- 直角坐标 / 极坐标 / 三维切换
- 复合函数分层解析
- 单调区间与几何特征提示
- 参数动画、拖动进度与录屏
- 预设函数快速载入

### 函数星图

- 内置 9 类基础函数节点
- 5 类知识卫星切换
- 全屏浏览与缩放
- 一键跳转实验台
- 登录后支持私有星球增删改查

### AI 错题本

- 根据表达式先绘制标准图
- 上传草图后请求流式 AI 分析
- 登录后自动归档个人错题记录
- 支持历史记录展开、回放与删除

### 全局能力

- 主题模式切换
- AI 模型偏好切换
- 全局账户面板
- 全局学习状态检测侧边栏

## 目录结构

```text
geometry-ui/
├─ public/                # login/register/account-entry 等独立入口资源
├─ src/
│  ├─ components/
│  ├─ data/
│  ├─ features/
│  │  ├─ function-starfield/
│  │  └─ function-workbench/
│  ├─ router/
│  ├─ utils/
│  └─ views/
├─ .env.example
├─ package.json
└─ vite.config.js
```

## 本地开发

```powershell
cd geometry-ui
npm install
npm run dev
```

## 构建与预览

```powershell
npm run build
npm run preview
```

## 环境变量

示例文件：`.env.example`

```bash
VITE_API_BASE=/api-service
VITE_YOLO_API_BASE=/yolo-service
VITE_ACCOUNT_API_BASE=/account-service
VITE_API_SERVICE_TARGET=http://127.0.0.1:8080
VITE_YOLO_SERVICE_TARGET=http://127.0.0.1:8001
VITE_ACCOUNT_SERVICE_TARGET=http://127.0.0.1:8002
VITE_PUBLIC_BASE=/
```

## 代理配置

开发环境由 `vite.config.js` 提供代理：

- `/api-service` -> Spring Boot 主服务
- `/yolo-service` -> YOLO 学习状态服务
- `/account-service` -> 账户服务

## 依赖

运行时依赖：

- `vue`
- `vue-router`
- `axios`
- `mathjs`
- `three`

开发依赖：

- `vite`
- `@vitejs/plugin-vue`
- `@vue/compiler-sfc`

## 补充说明

- 登录与注册页使用 `public/account-entry.js` 直接访问账户服务，并与主应用共享本地会话。
- 星图中的“私有星球”依赖账户服务中的 `function_planets` 接口。
- 学习状态检测侧边栏依赖 YOLO 服务的流式分析接口。

