const bcrypt = require('bcryptjs');
const { User, sequelize } = require('../models');

async function initAdmin() {
    try {
        // 同步数据库
        await sequelize.sync();
        
        // 检查是否已存在管理员
        const adminCount = await User.count({ where: { role: 'admin' } });
        
        if (adminCount > 0) {
            console.log('管理员账户已存在');
            return;
        }

        // 创建默认管理员
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await User.create({
            username: 'admin',
            email: 'admin@fallincloud.com',
            password: hashedPassword,
            role: 'admin'
        });

        console.log('管理员账户创建成功！');
        console.log('用户名: admin');
        console.log('密码: admin123');
        console.log('请登录后修改密码');
        
    } catch (error) {
        console.error('初始化管理员失败:', error);
    } finally {
        await sequelize.close();
    }
}

initAdmin();