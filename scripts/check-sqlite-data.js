const { Sequelize } = require('sequelize');

async function checkSQLiteData() {
  // 连接到SQLite数据库
  const sqlite = new Sequelize({
    dialect: 'sqlite',
    storage: 'travel_blog_node.db',
    logging: false
  });

  try {
    console.log('检查SQLite数据库中的图片数据...');

    // 检查travels表
    console.log('\n=== SQLite Travels表 ===');
    const travels = await sqlite.query('SELECT id, title, coverImage FROM travels', {
      type: Sequelize.QueryTypes.SELECT
    });

    travels.forEach(travel => {
      console.log(`Travel ${travel.id} (${travel.title}): ${travel.coverImage}`);
    });

    // 检查itineraries表
    console.log('\n=== SQLite Itineraries表 ===');
    const itineraries = await sqlite.query('SELECT id, title, images FROM itineraries', {
      type: Sequelize.QueryTypes.SELECT
    });

    itineraries.forEach(itinerary => {
      console.log(`Itinerary ${itinerary.id} (${itinerary.title}): ${itinerary.images}`);
      if (itinerary.images) {
        try {
          const images = JSON.parse(itinerary.images);
          if (images.length > 0) {
            images.forEach((img, index) => {
              console.log(`  图片${index + 1}: ${img}`);
            });
          }
        } catch (e) {
          console.log(`  解析错误: ${itinerary.images}`);
        }
      }
    });

  } catch (error) {
    console.error('查询SQLite数据库失败:', error);
  } finally {
    await sqlite.close();
  }
}

checkSQLiteData();
