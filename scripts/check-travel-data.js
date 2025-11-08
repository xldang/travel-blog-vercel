require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');

async function checkTravelData() {
  const prisma = new PrismaClient();

  try {
    console.log('检查travel ID为1的数据...');

    const travel = await prisma.travel.findUnique({
      where: { id: 1 },
      include: { itineraries: true }
    });

    if (!travel) {
      console.log('未找到travel ID为1');
      return;
    }

    console.log('Travel数据:');
    console.log(`- ID: ${travel.id}`);
    console.log(`- Title: ${travel.title}`);
    console.log(`- Cover Image: ${travel.coverImage}`);

    console.log('\nItineraries数据:');
    if (travel.itineraries && travel.itineraries.length > 0) {
      travel.itineraries.forEach((itinerary, index) => {
        console.log(`${index + 1}. ${itinerary.title}`);
        console.log(`   Images: ${itinerary.images}`);
        if (itinerary.images) {
          try {
            const images = JSON.parse(itinerary.images);
            images.forEach((img, imgIndex) => {
              console.log(`   Image ${imgIndex + 1}: ${img}`);
            });
          } catch (e) {
            console.log(`   图片数据解析错误: ${itinerary.images}`);
          }
        }
        console.log('');
      });
    } else {
      console.log('无itineraries数据');
    }

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTravelData();
