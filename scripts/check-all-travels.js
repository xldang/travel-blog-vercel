require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');

async function checkAllTravels() {
  const prisma = new PrismaClient();

  try {
    console.log('检查所有travel记录...');

    const travels = await prisma.travel.findMany({
      include: { itineraries: true }
    });

    console.log(`总共找到 ${travels.length} 条travel记录\n`);

    travels.forEach((travel, index) => {
      console.log(`${index + 1}. Travel ID: ${travel.id}`);
      console.log(`   标题: ${travel.title}`);
      console.log(`   封面图: ${travel.coverImage}`);
      console.log(`   行程数量: ${travel.itineraries.length}`);

      if (travel.itineraries.length > 0) {
        console.log('   行程列表:');
        travel.itineraries.forEach((itinerary, iIndex) => {
          console.log(`     ${iIndex + 1}. ${itinerary.title} (ID: ${itinerary.id})`);
          console.log(`        图片: ${itinerary.images}`);
        });
      }
      console.log('');
    });

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllTravels();
