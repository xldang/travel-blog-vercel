const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { isAuthenticated } = require('../middleware/auth');

const prisma = new PrismaClient();

const router = express.Router();

// 登录页面
router.get('/login', (req, res) => {
  res.render('auth/login');
});

// 处理登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { username }
    });
    if (!user) {
      req.flash('error_msg', '用户名或密码错误');
      return res.redirect('/login');
    }

    // 验证密码
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      req.flash('error_msg', '用户名或密码错误');
      return res.redirect('/login');
    }

    // 设置session
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;

    req.flash('success_msg', '登录成功！');
    res.redirect('/travels');
  } catch (error) {
    console.error('登录错误:', error);
    req.flash('error_msg', '登录失败');
    res.redirect('/login');
  }
});

// 登出
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('登出错误:', err);
    }
    res.redirect('/travels');
  });
});

// 更改密码页面
router.get('/change-password', isAuthenticated, (req, res) => {
  res.render('auth/change-password', {
    user: {
      username: req.session.username,
      role: req.session.role
    }
  });
});

// 处理更改密码
router.post('/change-password', isAuthenticated, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.session.userId;

    // 验证输入
    if (!currentPassword || !newPassword || !confirmPassword) {
      req.flash('error_msg', '请填写所有字段');
      return res.redirect('/change-password');
    }

    if (newPassword !== confirmPassword) {
      req.flash('error_msg', '两次输入的新密码不一致');
      return res.redirect('/change-password');
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    if (!user) {
      req.flash('error_msg', '用户不存在');
      return res.redirect('/login');
    }

    // 验证当前密码
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      req.flash('error_msg', '当前密码不正确');
      return res.redirect('/change-password');
    }

    // 更新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    req.flash('success_msg', '密码更新成功！');
    res.redirect('/travels');
  } catch (error) {
    console.error('更改密码错误:', error);
    req.flash('error_msg', '更改密码失败');
    res.redirect('/change-password');
  }
});

module.exports = router;
