require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');

async function checkAllImages() {
  const prisma = new PrismaClient();

  try {
    console.log('检查所有图片数据...');

    // 检查所有travels的coverImage
    console.log('\n=== 所有Travel的Cover Images ===');
    const travels = await prisma.travel.findMany({
      select: { id: true, title: true, coverImage: true }
    });

    travels.forEach(travel => {
      console.log(`Travel ${travel.id} (${travel.title}): ${travel.coverImage}`);
    });

    // 检查所有itineraries的images
    console.log('\n=== 所有Itinerary的Images ===');
    const itineraries = await prisma.itinerary.findMany({
      select: { id: true, title: true, images: true }
    });

    let totalImages = 0;
    itineraries.forEach(itinerary => {
      if (itinerary.images) {
        try {
          const images = JSON.parse(itinerary.images);
          if (images.length > 0) {
            console.log(`Itinerary ${itinerary.id} (${itinerary.title}):`);
            images.forEach((img, index) => {
              console.log(`  ${index + 1}. ${img}`);
              totalImages++;
            });
          }
        } catch (e) {
          console.log(`Itinerary ${itinerary.id} 图片数据错误: ${itinerary.images}`);
        }
      }
    });

    console.log(`\n总计: ${travels.length} 个travels, ${itineraries.length} 个itineraries, ${totalImages} 张图片`);

    // 查找特定的文件名
    const targetFile = '1754149863876-462589592.jpg';
    console.log(`\n查找文件: ${targetFile}`);

    let found = false;
    travels.forEach(travel => {
      if (travel.coverImage && travel.coverImage.includes(targetFile)) {
        console.log(`✓ 找到在 Travel ${travel.id}: ${travel.coverImage}`);
        found = true;
      }
    });

    itineraries.forEach(itinerary => {
      if (itinerary.images) {
        try {
          const images = JSON.parse(itinerary.images);
          images.forEach(img => {
            if (img.includes(targetFile)) {
              console.log(`✓ 找到在 Itinerary ${itinerary.id}: ${img}`);
              found = true;
            }
          });
        } catch (e) {}
      }
    });

    if (!found) {
      console.log(`✗ 未找到文件: ${targetFile}`);
    }

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllImages();
