#!/usr/bin/env node

/**
 * 本地环境测试脚本
 * 验证数据库连接、OBS配置等是否正确
 */

const { PrismaClient } = require('@prisma/client');
const { getObsImageUrl } = require('../utils/obs');

async function testDatabase() {
  console.log('🔍 测试数据库连接...');

  const prisma = new PrismaClient();

  try {
    // 测试连接
    await prisma.$connect();
    console.log('✅ 数据库连接成功');

    // 测试查询
    const userCount = await prisma.user.count();
    const travelCount = await prisma.travel.count();
    const itineraryCount = await prisma.itinerary.count();

    console.log(`📊 数据库状态:`);
    console.log(`   - 用户数: ${userCount}`);
    console.log(`   - 游记数: ${travelCount}`);
    console.log(`   - 行程数: ${itineraryCount}`);

    return true;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function testOBS() {
  console.log('🔍 测试OBS配置...');

  try {
    // 测试OBS URL生成
    const testUrl = getObsImageUrl('test-image.jpg');
    console.log('✅ OBS URL生成正常:', testUrl);

    // 检查环境变量
    const requiredEnvVars = [
      'OBS_ENDPOINT',
      'OBS_BUCKET',
      'OBS_ACCESS_KEY_ID',
      'OBS_SECRET_ACCESS_KEY'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      console.warn('⚠️  缺少OBS环境变量:', missingVars.join(', '));
      console.warn('   OBS功能可能无法正常工作');
      return false;
    }

    console.log('✅ OBS环境变量配置完整');
    return true;
  } catch (error) {
    console.error('❌ OBS配置测试失败:', error.message);
    return false;
  }
}

async function testEnvironment() {
  console.log('🔍 测试环境配置...');

  const issues = [];

  // 检查必需的环境变量
  const requiredVars = ['vercel_DATABASE_URL'];
  const optionalVars = ['SESSION_SECRET', 'NODE_ENV', 'PORT'];

  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      issues.push(`缺少必需环境变量: ${varName}`);
    }
  });

  optionalVars.forEach(varName => {
    if (!process.env[varName]) {
      console.warn(`⚠️  建议设置环境变量: ${varName}`);
    }
  });

  if (issues.length > 0) {
    issues.forEach(issue => console.error('❌', issue));
    return false;
  }

  console.log('✅ 环境变量配置正常');
  return true;
}

async function main() {
  console.log('🚀 开始本地环境测试...\n');

  const results = await Promise.all([
    testEnvironment(),
    testDatabase(),
    testOBS()
  ]);

  const allPassed = results.every(result => result);

  console.log('\n' + '='.repeat(50));

  if (allPassed) {
    console.log('🎉 所有测试通过！可以启动应用了。');
    console.log('\n启动命令:');
    console.log('  npm run dev    # 开发模式');
    console.log('  npm start      # 生产模式');
  } else {
    console.log('⚠️  部分测试失败，请检查配置后重试。');
    console.log('\n常见解决方案:');
    console.log('  1. 检查 .env 文件是否存在且配置正确');
    console.log('  2. 确保数据库服务正在运行');
    console.log('  3. 验证 OBS 密钥是否有效');
    console.log('  4. 参考 LOCAL_DEBUG_README.md 获取详细说明');
  }

  console.log('='.repeat(50));
}

// 只有当直接运行此脚本时才执行测试
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testDatabase, testOBS, testEnvironment };
