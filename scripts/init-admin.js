const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function initAdmin() {
    try {
        // 检查是否已存在管理员
        const adminCount = await prisma.user.count({
            where: { role: 'admin' }
        });

        if (adminCount > 0) {
            console.log('管理员账户已存在');
            return;
        }

        // 创建默认管理员
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await prisma.user.create({
            data: {
                username: 'admin',
                email: 'admin@fallincloud.com',
                password: hashedPassword,
                role: 'admin'
            }
        });

        console.log('管理员账户创建成功！');
        console.log('用户名: admin');
        console.log('密码: admin123');
        console.log('请登录后修改密码');

    } catch (error) {
        console.error('初始化管理员失败:', error);
    } finally {
        await prisma.$disconnect();
    }
}

initAdmin();
