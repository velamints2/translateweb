# 部署手册（Docker 方案）

## 1. 准备服务器
- 推荐 Ubuntu 22.04/20.04，2C/4G 起步，磁盘 ≥ 40GB。
- 使用 SSH Key 登录，禁止密码登录；开启 UFW 仅放行 22/80/443（或自定义端口）。
- 若需对象存储（COS/S3），提前创建 Bucket，并准备访问密钥。

## 2. 安装基础环境
```bash
sudo apt update && sudo apt upgrade -y
# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
# 重新登录以生效 docker 组权限
# 安装 docker compose 插件
sudo apt install -y docker-compose-plugin
```

## 3. 拉取代码并配置 .env
```bash
cd /opt
sudo git clone <your-repo-url> translate && sudo chown -R $USER:$USER translate
cd translate
cp .env.example .env # 如果没有示例请手动创建
```
必填环境变量：
- `PORT=3001`
- `NODE_ENV=production`
- `USE_LOCAL_AGENT=true|false`
- `TEXTIN_APP_ID` / `TEXTIN_SECRET_CODE` / `TEXTIN_ENDPOINT`
- Feishu / OpenAI / DeepSeek / Claude 等所需密钥

## 4. 构建与运行
```bash
# 首次构建
docker compose -f docker-compose.prod.yml build
# 后台运行
docker compose -f docker-compose.prod.yml up -d
# 查看日志
docker compose -f docker-compose.prod.yml logs -f translate-app
```

## 5. 配置 HTTPS（nginx + certbot）
1. 确保 DNS 解析指向服务器。
2. 在宿主机申请证书：
```bash
sudo apt install -y certbot
sudo certbot certonly --standalone -d your.domain.com
sudo mkdir -p /opt/translate/letsencrypt
sudo cp -R /etc/letsencrypt/live /opt/translate/letsencrypt/
```
3. 将证书路径映射到 nginx 容器（已在 `docker-compose.prod.yml` 中挂载 `./letsencrypt`）。
4. 修改 `deploy/nginx-default.conf` 的 `server_name` 和证书路径，然后重启：
```bash
docker compose -f docker-compose.prod.yml restart nginx
```
> 若想让 certbot 直接写入 `./letsencrypt`，可在 host 上通过 `certbot --config-dir /opt/translate/letsencrypt ...` 指定路径。

## 6. 对象存储与持久化
- 默认情况下 `./uploads` 会挂载到容器 `/app/uploads`。
- 若使用对象存储：在上传逻辑中改为写入 COS/S3（或后台同步）并将凭据放在 `.env` 中。
- 备份：定期打包 `uploads/` 与数据库（如果后续添加）。

## 7. 监控、安全与备份
- 使用 `docker stats` 或 `cadvisor + prometheus` 做基础监控。
- 结合 `pm2 logrotate` / `logrotate` 管理日志（如需）。
- 考虑为 API 增加访问控制（云防火墙 / IP 白名单 / 自定义鉴权）。
- 定期更新镜像：`git pull && docker compose build --pull && docker compose up -d`。

## 8. 验证上线
- `curl http://localhost:3001/health`
- 上传图片测试 OCR（TextIn）：`curl -F "file=@xxx.jpg" https://your.domain.com/api/upload-file`
- 执行一次完整翻译流程，检查 Feishu 术语与 DeepSeek 结果。
- 关注 `docker compose logs -f` 输出，确认无报错。

## 9. 镜像推送（可选）
可使用 `deploy/build-and-push.sh` 生成版本化镜像并推送到私有仓库，在服务器上只需 `docker pull` + `docker compose up -d`。

## 10. 自动化 / CI
- 在 CI 中运行 `npm run build` 以确保前端产物可用。
- 生成 `.env.production` 或使用密钥管理（Vault/Secret Manager）按环境注入。
- 利用 GitHub Actions / GitLab CI 构建并推送镜像，实现一键部署。
