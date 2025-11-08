const { authenticateUser } = require('../utils/jwt');

// JWT认证中间件 - 检查用户是否已登录
const isAuthenticated = async (req, res, next) => {
  try {
    const user = await authenticateUser(req);
    if (user) {
      req.user = user;
      return next();
    }
    res.status(401).json({ success: false, error: '请先登录' });
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(401).json({ success: false, error: '认证失败' });
  }
};

// JWT认证中间件 - 重定向到登录页面（用于页面路由）
const isAuthenticatedPage = async (req, res, next) => {
  try {
    const user = await authenticateUser(req);
    if (user) {
      req.user = user;
      res.locals.user = user;
      return next();
    }
    res.redirect('/login?error=' + encodeURIComponent('请先登录'));
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.redirect('/login?error=' + encodeURIComponent('认证失败'));
  }
};

// 检查用户是否为管理员
const isAdmin = async (req, res, next) => {
  try {
    const user = await authenticateUser(req);
    if (user && user.role === 'admin') {
      req.user = user;
      res.locals.user = user;
      return next();
    }
    res.redirect('/login?error=' + encodeURIComponent('需要管理员权限'));
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.redirect('/login?error=' + encodeURIComponent('权限验证失败'));
  }
};

// 检查用户是否为管理员（API用）
const isAdminAPI = async (req, res, next) => {
  try {
    const user = await authenticateUser(req);
    if (user && user.role === 'admin') {
      req.user = user;
      return next();
    }
    res.status(403).json({ success: false, error: '需要管理员权限' });
  } catch (error) {
    console.error('Admin API middleware error:', error);
    res.status(403).json({ success: false, error: '权限验证失败' });
  }
};

// 检查用户是否已登录（API用）
const isAuthenticatedAPI = async (req, res, next) => {
  try {
    const user = await authenticateUser(req);
    if (user) {
      req.user = user;
      return next();
    }
    res.status(401).json({ success: false, error: '请先登录' });
  } catch (error) {
    console.error('Authentication API middleware error:', error);
    res.status(401).json({ success: false, error: '认证失败' });
  }
};

module.exports = {
  isAuthenticated,
  isAuthenticatedPage,
  isAdmin,
  isAdminAPI,
  isAuthenticatedAPI
};
