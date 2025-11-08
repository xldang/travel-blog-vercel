require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');

async function updateImagePaths() {
  const prisma = new PrismaClient();

  try {
    console.log('开始更新数据库中的图片路径...');

    // 1. 更新travels表中的coverImage
    console.log('\n=== 更新travels表中的coverImage ===');
    const allTravels = await prisma.travel.findMany({
      select: {
        id: true,
        title: true,
        coverImage: true
      }
    });

    console.log('所有travel记录的图片路径:');
    allTravels.forEach(travel => {
      console.log(`Travel ${travel.id} (${travel.title}): ${travel.coverImage}`);
    });

    const travels = allTravels.filter(travel => travel.coverImage && travel.coverImage.includes('/uploads/'));

    console.log(`\n找到 ${travels.length} 条需要更新的travel记录`);

    for (const travel of travels) {
      if (travel.coverImage) {
        // 提取文件名（去掉/uploads/前缀）
        const fileName = travel.coverImage.replace('/uploads/', '');
        // 生成OBS URL
        const obsUrl = `https://travel-blog.obs.cn-north-4.myhuaweicloud.com/${fileName}`;

        await prisma.travel.update({
          where: { id: travel.id },
          data: { coverImage: obsUrl }
        });

        console.log(`✓ 更新travel ${travel.id} (${travel.title}):`);
        console.log(`  ${travel.coverImage} -> ${obsUrl}`);
      }
    }

    // 2. 更新itineraries表中的images
    console.log('\n=== 更新itineraries表中的images ===');
    const allItineraries = await prisma.itinerary.findMany({
      select: {
        id: true,
        title: true,
        images: true
      }
    });

    console.log('所有itinerary记录的图片数据:');
    allItineraries.forEach(itinerary => {
      console.log(`Itinerary ${itinerary.id} (${itinerary.title}): ${itinerary.images}`);
    });

    const itineraries = allItineraries;

    let updatedCount = 0;

    for (const itinerary of itineraries) {
      if (itinerary.images) {
        try {
          const images = JSON.parse(itinerary.images);
          let hasUpdates = false;
          const updatedImages = images.map(img => {
            if (img.includes('/uploads/')) {
              const fileName = img.replace('/uploads/', '');
              const obsUrl = `https://travel-blog.obs.cn-north-4.myhuaweicloud.com/${fileName}`;
              hasUpdates = true;
              return obsUrl;
            }
            return img;
          });

          if (hasUpdates) {
            await prisma.itinerary.update({
              where: { id: itinerary.id },
              data: { images: JSON.stringify(updatedImages) }
            });

            console.log(`✓ 更新itinerary ${itinerary.id} (${itinerary.title}):`);
            images.forEach((oldImg, index) => {
              if (oldImg.includes('/uploads/')) {
                const newImg = updatedImages[index];
                console.log(`  ${oldImg} -> ${newImg}`);
              }
            });

            updatedCount++;
          }
        } catch (e) {
          console.log(`✗ Itinerary ${itinerary.id} 图片数据格式错误: ${itinerary.images}`);
        }
      }
    }

    console.log(`\n更新完成！`);
    console.log(`- 更新了 ${travels.length} 条travel记录`);
    console.log(`- 更新了 ${updatedCount} 条itinerary记录`);

  } catch (error) {
    console.error('更新失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateImagePaths();
