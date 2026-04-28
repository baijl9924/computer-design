# HTTPS 部署说明

## 1. 域名解析
把域名 `kephhzx.cc.cd` 的 A 记录指向服务器 `45.207.195.82`。

## 2. 前端构建
```bash
cd geometry_ui_day_night_v5/geometry-ui
npm install
npm run build
```

## 3. 放置静态文件
```bash
sudo mkdir -p /var/www/kephhzx.cc.cd/geometry-ui
sudo rsync -av --delete dist/ /var/www/kephhzx.cc.cd/geometry-ui/dist/
```

## 4. 启动后端
### Spring Boot
```bash
cd /path/to/Geometric
SERVER_PORT=8080 APP_FRONTEND_ORIGIN=https://kephhzx.cc.cd ./mvnw spring-boot:run
```

### YOLO Service
```bash
cd /path/to/Geometric/yolo-service
source .venv/bin/activate
uvicorn app:app --host 127.0.0.1 --port 8001
```

### Account Service
```bash
cd /path/to/Geometric/account-service
source .venv/bin/activate
ACCOUNT_CORS_ORIGINS=https://kephhzx.cc.cd uvicorn app:app --host 127.0.0.1 --port 8002
```

## 5. 配置 Nginx
把 `deploy/nginx/kephhzx.cc.cd.conf` 复制到 `/etc/nginx/sites-available/`，然后：
```bash
sudo ln -sf /etc/nginx/sites-available/kephhzx.cc.cd.conf /etc/nginx/sites-enabled/kephhzx.cc.cd.conf
sudo nginx -t
sudo systemctl reload nginx
```

## 6. 申请 HTTPS 证书
```bash
sudo certbot --nginx -d kephhzx.cc.cd
```

## 7. 最终访问地址
```text
https://kephhzx.cc.cd/
```

## 8. 如果后续要放到子路径
例如最终路径是 `https://kephhzx.cc.cd/math/`：
1. 构建前设置 `VITE_PUBLIC_BASE=/math/`
2. 重新执行 `npm run build`
3. Nginx 把 `location /` 改成 `location /math/`
4. 同时保留 `/api-service/`、`/yolo-service/` 和 `/account-service/` 代理块
