const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const session = require('express-session');
const flash = require('connect-flash');

// 加载环境变量
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const travelRoutes = require('./routes/travels');
const itineraryRoutes = require('./routes/itineraries');
const authRoutes = require('./routes/auth');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 5001;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(methodOverride('_method'));

app.use(session({
    secret: process.env.SESSION_SECRET || 'travel-blog-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));
app.use(flash());

// 设置默认网站标题
app.locals.websiteTitle = "DZ's Travel Story";

app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.user = req.session.userId ? {
        id: req.session.userId,
        username: req.session.username,
        role: req.session.role
    } : null;
    next();
});

app.use('/', travelRoutes);
app.use('/itineraries', itineraryRoutes);
app.use('/', authRoutes);
app.use('/', settingsRoutes);

app.get('/', (req, res) => {
    res.redirect('/travels');
});

// 测试图片URL转换路由
app.get('/test-image-url', (req, res) => {
  const { convertToObsUrl } = require('./utils/obs');

  const testUrls = [
    '1754737899640-240149778.jpg',
    '/uploads/1754737899640-240149778.jpg',
    'https://travel-blog.obs.cn-north-4.myhuaweicloud.com/1754737899640-240149778.jpg'
  ];

  const results = testUrls.map(url => ({
    input: url,
    output: convertToObsUrl(url)
  }));

  res.json({
    timestamp: new Date().toISOString(),
    environment: {
      OBS_ENDPOINT: process.env.OBS_ENDPOINT,
      OBS_BUCKET: process.env.OBS_BUCKET,
      has_obs_config: !!(process.env.OBS_ENDPOINT && process.env.OBS_BUCKET)
    },
    conversions: results
  });
});

// 健康检查路由
app.get('/health', async (req, res) => {
    console.log('DEBUG: Health check requested');
    console.log('DEBUG: Environment variables:');
    console.log('  - DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
    console.log('  - SESSION_SECRET:', process.env.SESSION_SECRET ? 'SET' : 'NOT SET');
    console.log('  - OBS_ACCESS_KEY_ID:', process.env.OBS_ACCESS_KEY_ID ? 'SET' : 'NOT SET');
    console.log('  - NODE_ENV:', process.env.NODE_ENV);

    try {
        console.log('DEBUG: Testing database connection...');
        // 测试数据库连接
        await prisma.$connect();
        console.log('DEBUG: Database connection successful');

        // 测试查询
        const userCount = await prisma.user.count();
        const travelCount = await prisma.travel.count();
        console.log(`DEBUG: Database stats - Users: ${userCount}, Travels: ${travelCount}`);

        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            database: 'connected',
            stats: {
                users: userCount,
                travels: travelCount
            },
            environment: {
                node_env: process.env.NODE_ENV,
                has_database_url: !!process.env.DATABASE_URL,
                has_session_secret: !!process.env.SESSION_SECRET
            }
        });
    } catch (error) {
        console.error('ERROR: Health check failed:', error);
        console.error('ERROR: Error details:', {
            message: error.message,
            code: error.code,
            meta: error.meta
        });

        res.status(500).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            database: 'disconnected',
            error: error.message,
            code: error.code,
            environment: {
                node_env: process.env.NODE_ENV,
                has_database_url: !!process.env.DATABASE_URL,
                has_session_secret: !!process.env.SESSION_SECRET
            }
        });
    }
});

// 添加全局错误处理中间件
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    console.error('Error stack:', err.stack);
    console.error('Request URL:', req.url);
    console.error('Request method:', req.method);

    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
        timestamp: new Date().toISOString()
    });
});

// Vercel serverless function导出
module.exports = app;

// 本地开发时启动服务器
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Access the blog at http://localhost:${PORT}`);
    });
}
