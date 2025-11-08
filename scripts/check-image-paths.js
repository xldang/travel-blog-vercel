require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const { convertToObsUrl } = require('../utils/obs');

async function checkImagePaths() {
  const prisma = new PrismaClient();

  try {
    console.log('检查数据库中的图片路径...');

    // 检查travels表中的coverImage
    console.log('\n=== 检查travels表中的coverImage ===');
    const travels = await prisma.travel.findMany({
      select: {
        id: 1,
        title: true,
        coverImage: true
      }
    });

    travels.forEach(travel => {
      if (travel.coverImage) {
        const converted = convertToObsUrl(travel.coverImage);
        console.log(`Travel ${travel.id} (${travel.title}):`);
        console.log(`  原始: ${travel.coverImage}`);
        console.log(`  转换: ${converted}`);
        console.log(`  是否包含/uploads/: ${travel.coverImage.includes('/uploads/')}`);
        console.log('');
      }
    });

    // 检查itineraries表中的images
    console.log('\n=== 检查itineraries表中的images ===');
    const itineraries = await prisma.itinerary.findMany({
      select: {
        id: true,
        title: true,
        images: true
      }
    });

    itineraries.forEach(itinerary => {
      if (itinerary.images) {
        try {
          const images = JSON.parse(itinerary.images);
          if (images.length > 0) {
            console.log(`Itinerary ${itinerary.id} (${itinerary.title}):`);
            images.forEach((img, index) => {
              const converted = convertToObsUrl(img);
              console.log(`  图片${index + 1}:`);
              console.log(`    原始: ${img}`);
              console.log(`    转换: ${converted}`);
              console.log(`    是否包含/uploads/: ${img.includes('/uploads/')}`);
            });
            console.log('');
          }
        } catch (e) {
          console.log(`Itinerary ${itinerary.id} 图片数据格式错误: ${itinerary.images}`);
        }
      }
    });

  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkImagePaths();
