const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 检查用户是否已登录
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  req.flash('error_msg', '请先登录');
  res.redirect('/login');
};

// 检查用户是否为管理员
const isAdmin = async (req, res, next) => {
  console.log('DEBUG: isAdmin middleware - Session check');
  console.log('  - req.session exists:', !!req.session);
  console.log('  - req.session.userId:', req.session?.userId);
  console.log('  - req.session.role:', req.session?.role);

  if (req.session && req.session.userId) {
    try {
      console.log('DEBUG: Querying user from database...');
      const user = await prisma.user.findUnique({
        where: { id: req.session.userId }
      });
      console.log('DEBUG: User found:', user ? { id: user.id, username: user.username, role: user.role } : null);

      if (user && user.role === 'admin') {
        console.log('DEBUG: User is admin, proceeding...');
        return next();
      } else {
        console.log('DEBUG: User is not admin or user not found');
      }
    } catch (error) {
      console.error('权限验证错误:', error);
    }
  } else {
    console.log('DEBUG: No valid session found');
  }

  console.log('DEBUG: Redirecting to login');
  req.flash('error_msg', '需要管理员权限');
  res.redirect('/login');
};

// 检查用户是否为管理员（API用）
const isAdminAPI = async (req, res, next) => {
  if (req.session && req.session.userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.session.userId }
      });
      if (user && user.role === 'admin') {
        return next();
      }
    } catch (error) {
      console.error('权限验证错误:', error);
    }
  }
  res.status(403).json({ success: false, error: '需要管理员权限' });
};

// 检查用户是否已登录（API用）
const isAuthenticatedAPI = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  res.status(401).json({ success: false, error: '请先登录' });
};

module.exports = {
  isAuthenticated,
  isAdmin,
  isAdminAPI,
  isAuthenticatedAPI
};
