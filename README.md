
本项目计划构建一个功能完整的旅游游记博客系统，使用 Node.js Express + Sequelize + EJS 构建，在 fallincloud.com 域名上运行，要与同一云服务器上的 fallinai.cn（Flask版本）共存。
## 具体网站功能要求
### 🎯 核心功能
- **📝 游记管理**: 创建和管理多篇独立游记，每个游记拥有独立的详情页，该详情页上可以添加多段行程卡片
- **🗺️ 行程卡片要求**: 1、可编辑“行程概述”、“出行方式”（支持的出行方式见下文，若出行方式为客车、火车和飞机，则需要填写班次、起止地点、出行花费、起止时间；若出行方式为自驾，则需要填写起止地点、出行花费、起止时间；若出行方式为步行游览，则需要填写游览地点、出行花费、起止时间）。2、可编辑每段行程上的“旅行笔记”，需要在同一编辑器下进行图片上传和文字编辑排版。
- **⏰ 行程卡片展示顺序**: 自动按时间排序，将添加的行程串联起来。
- **⏰ 智能提醒**: 在每段行程上展示倒计时提醒，不同出行方式有不同提醒阈值

### 🚗 支持的出行方式
- 🚂 **火车** (提前1小时提醒)
- ✈️ **飞机** (提前2小时提醒)  
- 🚗 **自驾** (提前1小时提醒)
- 🚌 **客车** (提前1小时提醒)
- 🚶‍ **步行游览** (提前1小时提醒)

### 🎨 设计特色
- 📱 **响应式设计** - 完美适配手机和电脑
- 🌈 **现代化UI** - 天蓝色到草绿色渐变主题
- ⚡ **实时更新** - 倒计时实时刷新
- 🔔 **紧急提醒** - 高亮显示紧急提醒
## 🎯 共存方案说明
### 本项目根目录名称：travel-blog-node
### 🌐 域名分配
- **fallincloud.com** → Node.js Express版本（当前项目）
- **fallinai.cn** → 原有Python Flask版本

### 🔧 端口分配
- **Node.js版本**: 运行在 `5001` 端口
- **Flask版本**: 运行在 `5000` 端口

## 🚀 快速部署到 fallincloud.com
** 本项目是在本地开发，在云端部署，且云端生产路径为/var/www/travel-blog-node，每次上传到服务器临时路径/tmp/travel-blog-node后执行./update-node.sh进行更新，请始终牢记这个原则。 
** 再次强调，除首次部署外，要求只在上传到的/tmp/travel-blog-node目录下执行update-node.sh进行项目更新（自动更新到生产目录/var/www/travel-blog-node
** 更新部署的正确流程：
  1. 上传项目到 /tmp/travel-blog-node/
  2. 在 /tmp/travel-blog-node/ 目录下 执行 ./update-node.sh
  3. 脚本会自动处理从 /tmp/ 到 /var/www/travel-blog-node/ 的更新

### ⚡ 一键部署到新域名

1. **上传代码到服务器**
   ```
   /tmp/travel-blog-node
   ```

2. **部署时执行的部署脚本**
上传完整项目文件至/tmp/travel-blog-node，然后执行以下：
   ```bash
   cd /tmp/travel-blog-node
   sudo ./deploy-node.sh
   ```
此部署脚本会实现将项目自动部署到/var/www/travel-blog-node中
3. **访问新域名**
   ```
   http://fallincloud.com
   ```

## 📋 共存配置详情

### Nginx配置
自动创建 `/etc/nginx/sites-available/fallincloud-node` 配置：
```nginx
server {
    listen 80;
    server_name fallincloud.com www.fallincloud.com;

    location / {
        proxy_pass http://localhost:5001;  # Node.js版本端口
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /static/ {
        alias /var/www/travel-blog-node/static/;
        expires 30d;
    }
}
```



## 🔧 系统管理

### 服务状态检查
应具备以下管理命令：
-   travel-node-start    # 启动服务
-   travel-node-stop     # 停止服务
-   travel-node-restart  # 重启服务
-   travel-node-status   # 查看状态
-   travel-node-backup   # 备份数据

## 🚨 重要提醒

### 部署注意事项
1. **域名已解析**: fallincloud.com 已解析到服务器IP
2. **端口冲突**: 已避免端口冲突（5000/5001）
3. **Nginx配置**: 两个域名完全独立，互不影响
4. **数据隔离**: 本项目使用独立的数据库文件，即travel_blog_node.db
5. **项目调试**:本项目在本地建设，在云端部署，请不要在本地环境尝试运行网站测试！
### SSL证书配置
可以为两个域名分别配置SSL：
```bash
# Node.js版本SSL
certbot --nginx -d fallincloud.com

# Flask版本SSL
certbot --nginx -d fallinai.cn
```

## 📊 项目对比

| 特性 | Node.js版本 | Flask版本 |
|------|-------------|-----------|
| **域名** | fallincloud.com | fallinai.cn |
| **端口** | 5001 | 5000 |
| **技术栈** | Express + Sequelize | Flask + SQLAlchemy |
| **进程管理** | PM2 | Supervisor |
| **数据库** | travel_blog_node.db | travel_blog.db |

## 问题排查原则
**原则1：** 项目没有在本地运行，不要试图在本地执行终端调试命令
**原则2：**
**总结**: 我拥有两个完全独立运行的旅游博客系统，分别服务于不同的域名，使用不同的技术栈，但共享同一个服务器资源。用户可以通过 fallincloud.com 和 fallinai.cn 分别访问 Node.js 和 Flask 版本。当前项目为fallincloud.com访问的Node.js版本
