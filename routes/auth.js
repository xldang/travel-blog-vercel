const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { generateToken } = require('../utils/jwt');
const { isAuthenticatedPage } = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

// 密码强度验证函数
const validatePassword = (password) => {
  if (password.length < 8) {
    return '密码长度至少8位';
  }
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return '密码必须包含大小写字母和数字';
  }
  return null;
};

// 邮箱格式验证
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// 登录页面
router.get('/login', (req, res) => {
  // 如果已经登录，重定向到首页
  if (req.headers.authorization) {
    return res.redirect('/travels');
  }
  res.render('auth/login', {
    success: req.query.success,
    error: req.query.error
  });
});

// API登录
router.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: '用户名和密码不能为空'
      });
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        email: true,
        password: true,
        role: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: '用户名或密码错误'
      });
    }

    // 验证密码
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: '用户名或密码错误'
      });
    }

    // 生成JWT token
    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role
    });

    // 返回用户信息和token（不包含密码）
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: '登录成功',
      data: {
        user: userWithoutPassword,
        token
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      success: false,
      error: '登录失败'
    });
  }
});

// 传统登录（重定向）
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.redirect('/login?error=' + encodeURIComponent('用户名和密码不能为空'));
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      return res.redirect('/login?error=' + encodeURIComponent('用户名或密码错误'));
    }

    // 验证密码
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.redirect('/login?error=' + encodeURIComponent('用户名或密码错误'));
    }

    // 生成JWT token并设置到cookie
    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role
    });

    // 设置token到cookie，有效期7天
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
      sameSite: 'lax'
    });

    res.redirect('/travels?success=' + encodeURIComponent('登录成功！'));
  } catch (error) {
    console.error('登录错误:', error);
    res.redirect('/login?error=' + encodeURIComponent('登录失败'));
  }
});

// 注册页面
router.get('/register', (req, res) => {
  res.render('auth/register', {
    success: req.query.success,
    error: req.query.error
  });
});

// API注册
router.post('/api/register', async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    // 验证输入
    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: '请填写所有字段'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: '两次输入的密码不一致'
      });
    }

    // 验证邮箱格式
    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        error: '邮箱格式不正确'
      });
    }

    // 验证密码强度
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({
        success: false,
        error: passwordError
      });
    }

    // 检查用户名是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: '用户名已存在'
      });
    }

    // 检查邮箱是否已存在
    const existingEmail = await prisma.user.findUnique({
      where: { email }
    });

    if (existingEmail) {
      return res.status(400).json({
        success: false,
        error: '邮箱已被注册'
      });
    }

    // 哈希密码
    const hashedPassword = await bcrypt.hash(password, 12);

    // 创建用户
    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: 'viewer' // 默认角色
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    // 生成JWT token
    const token = generateToken({
      userId: newUser.id,
      username: newUser.username,
      role: newUser.role
    });

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        user: newUser,
        token
      }
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({
      success: false,
      error: '注册失败'
    });
  }
});

// 传统注册（重定向）
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    // 验证输入
    if (!username || !email || !password || !confirmPassword) {
      return res.redirect('/register?error=' + encodeURIComponent('请填写所有字段'));
    }

    if (password !== confirmPassword) {
      return res.redirect('/register?error=' + encodeURIComponent('两次输入的密码不一致'));
    }

    // 验证邮箱格式
    if (!validateEmail(email)) {
      return res.redirect('/register?error=' + encodeURIComponent('邮箱格式不正确'));
    }

    // 验证密码强度
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.redirect('/register?error=' + encodeURIComponent(passwordError));
    }

    // 检查用户名是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUser) {
      return res.redirect('/register?error=' + encodeURIComponent('用户名已存在'));
    }

    // 检查邮箱是否已存在
    const existingEmail = await prisma.user.findUnique({
      where: { email }
    });

    if (existingEmail) {
      return res.redirect('/register?error=' + encodeURIComponent('邮箱已被注册'));
    }

    // 哈希密码
    const hashedPassword = await bcrypt.hash(password, 12);

    // 创建用户
    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: 'viewer'
      }
    });

    // 生成JWT token并设置到cookie
    const token = generateToken({
      userId: newUser.id,
      username: newUser.username,
      role: newUser.role
    });

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax'
    });

    res.redirect('/travels?success=' + encodeURIComponent('注册成功！'));
  } catch (error) {
    console.error('注册错误:', error);
    res.redirect('/register?error=' + encodeURIComponent('注册失败'));
  }
});

// 登出
router.get('/logout', (req, res) => {
  // 清除认证cookie
  res.clearCookie('auth_token');
  res.redirect('/travels?success=' + encodeURIComponent('已成功登出'));
});

// API登出
router.post('/api/logout', (req, res) => {
  res.json({
    success: true,
    message: '登出成功'
  });
});

// 更改密码页面
router.get('/change-password', isAuthenticatedPage, (req, res) => {
  res.render('auth/change-password', {
    user: req.user,
    success: req.query.success,
    error: req.query.error
  });
});

// API更改密码
router.post('/api/change-password', isAuthenticatedPage, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.user.id;

    // 验证输入
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: '请填写所有字段'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: '两次输入的新密码不一致'
      });
    }

    // 验证密码强度
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return res.status(400).json({
        success: false,
        error: passwordError
      });
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }

    // 验证当前密码
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: '当前密码不正确'
      });
    }

    // 更新密码
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    res.json({
      success: true,
      message: '密码更新成功'
    });
  } catch (error) {
    console.error('更改密码错误:', error);
    res.status(500).json({
      success: false,
      error: '更改密码失败'
    });
  }
});

// 传统更改密码（重定向）
router.post('/change-password', isAuthenticatedPage, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.user.id;

    // 验证输入
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.redirect('/change-password?error=' + encodeURIComponent('请填写所有字段'));
    }

    if (newPassword !== confirmPassword) {
      return res.redirect('/change-password?error=' + encodeURIComponent('两次输入的新密码不一致'));
    }

    // 验证密码强度
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return res.redirect('/change-password?error=' + encodeURIComponent(passwordError));
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.redirect('/login?error=' + encodeURIComponent('用户不存在'));
    }

    // 验证当前密码
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.redirect('/change-password?error=' + encodeURIComponent('当前密码不正确'));
    }

    // 更新密码
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    res.redirect('/travels?success=' + encodeURIComponent('密码更新成功！'));
  } catch (error) {
    console.error('更改密码错误:', error);
    res.redirect('/change-password?error=' + encodeURIComponent('更改密码失败'));
  }
});

// 获取当前用户信息API
router.get('/api/me', isAuthenticatedPage, async (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user
    }
  });
});

module.exports = router;
