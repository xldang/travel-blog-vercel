# 本地调试指南

## 📋 环境要求

- Node.js 16+
- PostgreSQL 12+ (或使用Vercel Postgres)
- Git

## 🚀 本地调试步骤

### 1. 环境配置

#### 复制环境变量文件
```bash
cp .env.example .env
```

#### 编辑 `.env` 文件，配置以下变量：

```env
# 数据库配置 - 选择其中一种方式：

# 方式1: 使用本地 PostgreSQL
DATABASE_URL="postgresql://username:password@localhost:5432/travel_blog"

# 方式2: 使用 Vercel Postgres (推荐)
# 在Vercel中会自动设置 DATABASE_URL 环境变量

# 华为云OBS配置 (已配置好)
OBS_ENDPOINT="obs.cn-north-4.myhuaweicloud.com"
OBS_BUCKET="travel-blog"
OBS_ACCESS_KEY_ID="你的华为云AK"
OBS_SECRET_ACCESS_KEY="你的华为云SK"

# 其他配置
NODE_ENV="development"
PORT=5001
SESSION_SECRET="travel-blog-secret-key"
```

### 2. 安装依赖

```bash
npm install
```

### 3. 数据库设置

#### 生成 Prisma 客户端
```bash
npx prisma generate
```

#### 推送到数据库 (创建表结构)
```bash
npm run db:push
```

#### 数据迁移 (从SQLite导入数据)
```bash
npm run db:migrate
```

### 4. 启动应用

```bash
# 开发模式 (带热重载)
npm run dev

# 或生产模式
npm start
```

### 5. 访问应用

打开浏览器访问: `http://localhost:5001`

## 🔧 数据库管理

### 查看数据库
```bash
npm run db:studio
```

### 重置数据库
```bash
npx prisma migrate reset
```

## 🐛 常见问题

### 数据库连接问题
- 确保 PostgreSQL 服务正在运行
- 检查 `DATABASE_URL` 格式是否正确
- 对于 Vercel Postgres，确保连接字符串包含 SSL 参数

### OBS 上传问题
- 确认华为云 OBS 密钥正确
- 检查存储桶权限设置
- 确保网络可以访问华为云服务

### 图片显示问题
- 确认 OBS 中的图片路径正确
- 检查图片 URL 转换逻辑
- 验证 OBS 存储桶的公共读权限

## 📁 项目结构

```
├── prisma/           # 数据库模式和迁移
├── routes/           # Express 路由
├── utils/            # 工具函数 (OBS 操作)
├── scripts/          # 迁移脚本
├── public/           # 静态资源
├── views/            # EJS 模板
└── uploads/          # 本地临时文件 (开发时使用)
```

## 🎯 调试技巧

1. **查看日志**: 应用启动时会显示详细的数据库和 OBS 连接信息
2. **数据库检查**: 使用 `npm run db:studio` 查看数据
3. **网络调试**: 检查浏览器开发者工具的网络面板
4. **OBS 测试**: 可以直接在 OBS 控制台验证文件上传

## ⚠️ 注意事项

- **生产环境**: 不要在生产环境使用本地 PostgreSQL
- **OBS 配置**: 确保生产环境的 OBS 配置与本地一致
- **数据安全**: 不要在代码中硬编码敏感信息
- **图片路径**: 所有图片现在都存储在 OBS 中，本地 uploads/ 仅用于临时文件

## 🔄 从开发到生产

1. 本地测试通过后，提交代码到 GitHub
2. Vercel 会自动部署
3. 在 Vercel 控制台配置环境变量
4. 运行生产环境的数据库迁移

---

如果遇到问题，请检查控制台错误信息或查看日志文件。
