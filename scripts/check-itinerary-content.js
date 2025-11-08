require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');

async function checkItineraryContent() {
  const prisma = new PrismaClient();

  try {
    console.log('检查itinerary的content字段中是否有图片URL...');

    const itineraries = await prisma.itinerary.findMany({
      select: {
        id: true,
        title: true,
        content: true,
        images: true
      }
    });

    console.log(`总共找到 ${itineraries.length} 条itinerary记录\n`);

    itineraries.forEach((itinerary, index) => {
      console.log(`${index + 1}. Itinerary ${itinerary.id} (${itinerary.title}):`);
      console.log(`   Images字段: ${itinerary.images}`);

      if (itinerary.content) {
        console.log(`   Content字段长度: ${itinerary.content.length} 字符`);

        // 检查content中是否包含图片URL
        const imageUrls = [];
        const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
        let match;
        while ((match = imgRegex.exec(itinerary.content)) !== null) {
          imageUrls.push(match[1]);
        }

        if (imageUrls.length > 0) {
          console.log(`   Content中的图片URL:`);
          imageUrls.forEach((url, i) => {
            console.log(`     ${i + 1}. ${url}`);
          });
        } else {
          console.log(`   Content中没有图片URL`);
        }

        // 显示content的前200个字符作为预览
        const preview = itinerary.content.replace(/<[^>]*>/g, '').substring(0, 200);
        console.log(`   Content预览: ${preview}${itinerary.content.length > 200 ? '...' : ''}`);
      } else {
        console.log(`   Content字段: null`);
      }

      console.log('');
    });

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkItineraryContent();
