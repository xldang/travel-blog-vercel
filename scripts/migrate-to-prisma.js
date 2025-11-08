const { Sequelize } = require('sequelize');
const { PrismaClient } = require('@prisma/client');

async function migrateData() {
  // 连接到SQLite数据库
  const sqlite = new Sequelize({
    dialect: 'sqlite',
    storage: 'travel_blog_node.db',
    logging: false
  });

  // 连接到Prisma PostgreSQL数据库
  const prisma = new PrismaClient();

  try {
    console.log('开始数据迁移...');

    // 1. 迁移Settings表
    console.log('迁移Settings表...');
    const settings = await sqlite.query('SELECT * FROM settings', { type: Sequelize.QueryTypes.SELECT });
    for (const setting of settings) {
      await prisma.setting.upsert({
        where: { key: setting.key },
        update: { value: setting.value },
        create: { key: setting.key, value: setting.value }
      });
    }
    console.log(`迁移了 ${settings.length} 条设置数据`);

    // 2. 迁移Users表
    console.log('迁移Users表...');
    const users = await sqlite.query('SELECT * FROM users', { type: Sequelize.QueryTypes.SELECT });
    for (const user of users) {
      await prisma.user.create({
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          password: user.password,
          role: user.role,
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt)
        }
      });
    }
    console.log(`迁移了 ${users.length} 条用户数据`);

    // 3. 迁移Travels表
    console.log('迁移Travels表...');
    const travels = await sqlite.query('SELECT * FROM travels', { type: Sequelize.QueryTypes.SELECT });
    for (const travel of travels) {
      await prisma.travel.create({
        data: {
          id: travel.id,
          title: travel.title,
          description: travel.description,
          startLocation: travel.startLocation,
          endLocation: travel.endLocation,
          transportMethod: travel.transportMethod,
          totalCost: travel.totalCost ? parseFloat(travel.totalCost) : null,
          startDate: travel.startDate ? new Date(travel.startDate) : null,
          endDate: travel.endDate ? new Date(travel.endDate) : null,
          coverImage: travel.coverImage,
          createdAt: new Date(travel.createdAt),
          updatedAt: new Date(travel.updatedAt)
        }
      });
    }
    console.log(`迁移了 ${travels.length} 条游记数据`);

    // 4. 迁移Itineraries表
    console.log('迁移Itineraries表...');
    const itineraries = await sqlite.query('SELECT * FROM itineraries', { type: Sequelize.QueryTypes.SELECT });
    for (const itinerary of itineraries) {
      await prisma.itinerary.create({
        data: {
          id: itinerary.id,
          travelId: itinerary.travelId,
          title: itinerary.title,
          content: itinerary.content,
          location: itinerary.location,
          travelDate: new Date(itinerary.travelDate),
          sequence: itinerary.sequence,
          images: itinerary.images,
          cost: itinerary.cost ? parseFloat(itinerary.cost) : null,
          transportMethod: itinerary.transportMethod,
          travelMethodInfo: itinerary.travelMethodInfo,
          flightNumber: itinerary.flightNumber,
          trainNumber: itinerary.trainNumber,
          busNumber: itinerary.busNumber,
          startLocation: itinerary.startLocation,
          endLocation: itinerary.endLocation,
          startTime: itinerary.startTime,
          endTime: itinerary.endTime,
          createdAt: new Date(itinerary.createdAt),
          updatedAt: new Date(itinerary.updatedAt)
        }
      });
    }
    console.log(`迁移了 ${itineraries.length} 条行程数据`);

    console.log('数据迁移完成！');

  } catch (error) {
    console.error('数据迁移失败:', error);
    throw error;
  } finally {
    await sqlite.close();
    await prisma.$disconnect();
  }
}

// 只有当直接运行此脚本时才执行迁移
if (require.main === module) {
  migrateData()
    .then(() => {
      console.log('迁移脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('迁移脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { migrateData };
