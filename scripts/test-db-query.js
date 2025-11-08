require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');

async function testDatabaseQuery() {
  const prisma = new PrismaClient();

  try {
    console.log('测试数据库连接...');

    // 测试连接
    await prisma.$connect();
    console.log('✓ 数据库连接成功');

    // 查询travel ID为1的数据
    console.log('查询travel ID为1的数据...');
    const travel = await prisma.travel.findUnique({
      where: {
        id: 1
      },
      include: {
        itineraries: true
      }
    });

    if (!travel) {
      console.log('✗ 未找到ID为1的travel');
      return;
    }

    console.log('✓ 找到travel:', {
      id: travel.id,
      title: travel.title,
      itinerariesCount: travel.itineraries ? travel.itineraries.length : 0
    });

    console.log('行程详情:');
    if (travel.itineraries && travel.itineraries.length > 0) {
      travel.itineraries.forEach((itinerary, index) => {
        console.log(`  ${index + 1}. ${itinerary.title} (${itinerary.travelDate})`);
      });
    } else {
      console.log('  无行程数据');
    }

  } catch (error) {
    console.error('✗ 数据库查询失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabaseQuery();
