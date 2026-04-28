# Geometry Lab Final Integrated Project

Geometry Lab 是一个面向高中函数学习场景的综合实验平台。当前工程把函数试验台、函数星图、AI 错题本、账户系统和学习状态检测整合在同一个项目中，由一个 Vue 3 前端、一个 Spring Boot 主服务和两个 FastAPI 服务协同运行。在线网址: https://kephhzx.cc.cd/

## 功能概览

- 函数试验台
  - 支持二维直角坐标、二维极坐标和三维空间图像
  - 支持多函数同屏、参数动画、单调区间、几何特征和轨迹记录
  - 支持函数结构解析，侧边栏可显示每一层结构对应的小图预览
- 函数星图
  - 内置 9 类基础函数知识单元
  - 支持知识节点浏览、跳转到试验台、私有函数星球读写
- AI 错题本
  - 根据表达式生成标准图
  - 对上传草图进行 AI 分析
  - 支持错题记录归档到个人账户
- 学习状态检测
  - 调用本地 YOLO 服务分析摄像头画面或上传图片
  - 返回学习状态、检测结果和分析说明
- 账户系统
  - 支持注册、登录、JWT 会话
  - 支持错题记录和私有函数星球存储

## 项目结构

```text
geometry-lab-final-integrated-project/
|-- account-service/        FastAPI 账户与个人数据服务
|-- deploy/                 部署相关资料
|-- geometry-ui/            Vue 3 + Vite 前端
|-- src/                    Spring Boot 主服务源码
|-- yolo-service/           FastAPI + YOLO 学习状态检测服务
|-- .mvn/                   Maven Wrapper
|-- mvnw
|-- mvnw.cmd
|-- pom.xml
`-- README.md
```

以下目录通常属于运行或构建产物，不建议纳入源码分发包：

- `geometry-ui/node_modules/`
- `geometry-ui/dist/`
- `geometry-ui/service-logs/`
- `account-service/.venv/`
- `account-service/__pycache__/`
- `account-service/account_service.db`
- `yolo-service/.venv/`
- `yolo-service/__pycache__/`
- `target/`
- `service-logs/`
- 所有 `*.pyc`、日志文件和临时缓存

## 前端页面与入口

- `/#/workbench`：二维函数试验台
- `/#/workbench-3d`：三维函数试验台
- `/#/starfield`：函数星图
- `/#/error-book`：AI 错题本
- `/login.html`：登录页
- `/register.html`：注册页

## 模块说明

### 1. `geometry-ui`

前端使用 Vue 3、Vue Router、Vite、Math.js 和 Three.js。

主要职责：

- 统一承载函数试验台、函数星图、错题本和账户入口
- 通过 Vite 代理转发到三个后端服务
- 提供主题切换、AI 偏好切换、全局账户面板和学习状态侧栏

### 2. Spring Boot 主服务

主服务源码位于 `src/main/java/org/example/geometric/`。

主要职责：

- 错题图像分析
- 函数知识卡生成
- 函数问答流式输出
- 兼容保留 `/api/generate`

主要接口：

- `POST /api/generate`
- `POST /api/analyze-error`
- `POST /api/analyze-error-stream`
- `POST /api/function-knowledge`
- `POST /api/function-brain-stream`

### 3. `account-service`

账户服务使用 FastAPI + SQLAlchemy + JWT，默认可使用 SQLite。

主要职责：

- 学生注册、登录和身份校验
- 错题记录增删查
- 私有函数星球增删改查

主要接口：

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/error-book/records`
- `POST /api/error-book/records`
- `GET /api/error-book/records/{id}`
- `DELETE /api/error-book/records/{id}`
- `GET /api/function-planets`
- `POST /api/function-planets`
- `PUT /api/function-planets/{id}`
- `DELETE /api/function-planets/{id}`
- `GET /health`

### 4. `yolo-service`

学习状态检测服务使用 FastAPI + Ultralytics YOLO，本地推理，不依赖外部视觉接口。

主要接口：

- `GET /health`
- `POST /api/learning-state`
- `POST /api/learning-state-stream`

返回内容通常包括：

- 学习状态标签
- 置信度
- 检测目标与检测框
- 预览图
- `analysisHtml`

## 本地启动

建议按以下顺序启动。

### 1. 启动 Spring Boot 主服务

在项目根目录执行：

```powershell
.\mvnw.cmd spring-boot:run
```

### 2. 启动账户服务

```powershell
cd account-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8002 --reload
```

### 3. 启动 YOLO 服务

```powershell
cd yolo-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8001 --reload
```

### 4. 启动前端

```powershell
cd geometry-ui
npm install
npm run dev -- --host 0.0.0.0
```

## 默认端口

- 前端开发服务：`5173`
- Spring Boot：`8080`
- YOLO 服务：`8001`
- 账户服务：`8002`

## 前端代理与环境变量

`geometry-ui/.env.example`：

```bash
VITE_API_BASE=/api-service
VITE_YOLO_API_BASE=/yolo-service
VITE_ACCOUNT_API_BASE=/account-service
VITE_API_SERVICE_TARGET=http://127.0.0.1:8080
VITE_YOLO_SERVICE_TARGET=http://127.0.0.1:8001
VITE_ACCOUNT_SERVICE_TARGET=http://127.0.0.1:8002
VITE_PUBLIC_BASE=/
```

`geometry-ui/vite.config.js` 默认代理规则：

- `/api-service` -> `http://127.0.0.1:8080`
- `/yolo-service` -> `http://127.0.0.1:8001`
- `/account-service` -> `http://127.0.0.1:8002`

## 后端环境变量

### Spring Boot

`src/main/resources/application.properties` 当前支持通过环境变量覆盖以下配置：

- `SERVER_PORT`
- `APP_FRONTEND_ORIGIN`
- `AI_API_BASE_URL`
- `AI_API_MODEL`
- `AI_API_KEY`
- `AI_API_FALLBACK_BASE_URL`
- `AI_API_FALLBACK_MODEL`
- `AI_API_FALLBACK_KEY`
- `AI_API_ADVANCED_BASE_URL`
- `AI_API_ADVANCED_MODEL`
- `AI_API_ADVANCED_MODELS`
- `AI_API_ADVANCED_KEY`

说明：

- 正式部署时请务必通过环境变量覆盖 AI 相关配置
- 不要把真实密钥直接写入源码或提交到仓库

### Account Service

`account-service/.env.example`：

```bash
ACCOUNT_DATABASE_URL=sqlite:///./account_service.db
ACCOUNT_JWT_SECRET=change-this-secret
ACCOUNT_JWT_ALGORITHM=HS256
ACCOUNT_JWT_EXPIRE_MINUTES=10080
ACCOUNT_PASSWORD_ITERATIONS=390000
ACCOUNT_MAX_PAGE_SIZE=50
ACCOUNT_CORS_ORIGINS=http://127.0.0.1:5173,http://localhost:5173
```

### YOLO Service

```bash
YOLO_WEIGHTS=yolov8n.pt
```

如果你已经准备了本地权重文件，可把 `YOLO_WEIGHTS` 指向对应路径。

## 依赖清单

### 前端

- Vue 3
- Vue Router
- Vite
- Axios
- Math.js
- Three.js

### Spring Boot 主服务

- Spring Boot Web MVC
- Lombok

### Python 服务

账户服务：

- FastAPI
- Uvicorn
- SQLAlchemy
- PyJWT
- PyMySQL
- Psycopg

YOLO 服务：

- FastAPI
- Uvicorn
- Ultralytics
- Pillow
- python-multipart

## 说明

- `deploy/` 目录存放部署资料，不影响本地开发
- 建议在打包源码时只保留源码、配置模板、资源文件和锁文件，不包含本地安装依赖与构建产物
