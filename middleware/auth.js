const bcrypt = require('bcryptjs');
const { User } = require('../models');

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
  if (req.session && req.session.userId) {
    try {
      const user = await User.findByPk(req.session.userId);
      if (user && user.role === 'admin') {
        return next();
      }
    } catch (error) {
      console.error('权限验证错误:', error);
    }
  }
  req.flash('error_msg', '需要管理员权限');
  res.redirect('/login');
};

// 检查用户是否为管理员（API用）
const isAdminAPI = async (req, res, next) => {
  if (req.session && req.session.userId) {
    try {
      const user = await User.findByPk(req.session.userId);
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