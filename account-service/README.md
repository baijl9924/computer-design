# Account Service

`account-service` 是 Geometry Lab 的账户与个人数据服务，使用 FastAPI、SQLAlchemy 和 JWT 构建，默认使用 SQLite 存储数据。

## 负责内容

- 学生账户注册与登录
- JWT 身份校验
- AI 错题本记录的创建、查询与删除
- 私有函数星球的创建、查询、修改与删除

## 技术栈

- FastAPI
- SQLAlchemy 2.x
- PyJWT
- SQLite / MySQL / PostgreSQL

## 数据模型

服务启动时会自动建表，当前包含 3 张核心表：

- `users`
- `error_records`
- `function_planets`

其中：

- `error_records` 保存错题表达式、分析 HTML、标准图、上传图、备注与时间戳
- `function_planets` 保存私有星球标题、表达式、摘要和 5 类知识卡 JSON

## 本地启动

Windows PowerShell：

```powershell
cd account-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8002 --reload
```

macOS / Linux：

```bash
cd account-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8002 --reload
```

## 环境变量

示例文件：`.env.example`

```bash
ACCOUNT_DATABASE_URL=sqlite:///./account_service.db
ACCOUNT_JWT_SECRET=change-this-secret
ACCOUNT_JWT_ALGORITHM=HS256
ACCOUNT_JWT_EXPIRE_MINUTES=10080
ACCOUNT_PASSWORD_ITERATIONS=390000
ACCOUNT_MAX_PAGE_SIZE=50
ACCOUNT_CORS_ORIGINS=http://127.0.0.1:5173,http://localhost:5173
```

数据库切换示例：

### SQLite

```bash
ACCOUNT_DATABASE_URL=sqlite:///./account_service.db
```

### MySQL / MariaDB

```bash
ACCOUNT_DATABASE_URL=mysql+pymysql://root:password@127.0.0.1:3306/geometry_lab?charset=utf8mb4
```

### PostgreSQL

```bash
ACCOUNT_DATABASE_URL=postgresql+psycopg://postgres:password@127.0.0.1:5432/geometry_lab
```

## 接口一览

### 账户相关

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### 错题本

- `GET /api/error-book/records`
- `POST /api/error-book/records`
- `GET /api/error-book/records/{record_id}`
- `DELETE /api/error-book/records/{record_id}`

### 私有函数星球

- `GET /api/function-planets`
- `POST /api/function-planets`
- `PUT /api/function-planets/{planet_id}`
- `DELETE /api/function-planets/{planet_id}`

### 健康检查

- `GET /health`

## 前端对接说明

前端默认通过 `/account-service` 代理访问本服务，核心使用场景如下：

- 登录页与注册页调用认证接口
- AI 错题本页面自动归档分析记录
- 函数星图页面读写私有星球

## 依赖安装

```bash
pip install -r requirements.txt
```

