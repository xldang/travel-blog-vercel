const { Sequelize } = require('sequelize');

async function checkSQLiteContent() {
  // 连接到SQLite数据库
  const sqlite = new Sequelize({
    dialect: 'sqlite',
    storage: 'travel_blog_node.db',
    logging: false
  });

  try {
    console.log('检查SQLite数据库中itinerary的content字段...');

    const itineraries = await sqlite.query('SELECT id, title, content, images FROM itineraries', {
      type: Sequelize.QueryTypes.SELECT
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

        // 显示content的前300个字符作为预览
        const preview = itinerary.content.replace(/<[^>]*>/g, '').substring(0, 300);
        console.log(`   Content文本预览: ${preview}${itinerary.content.length > 300 ? '...' : ''}`);
      } else {
        console.log(`   Content字段: null`);
      }

      console.log('');
    });

  } catch (error) {
    console.error('查询SQLite数据库失败:', error);
  } finally {
    await sqlite.close();
  }
}

checkSQLiteContent();
