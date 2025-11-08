const { Sequelize } = require('sequelize');

async function checkTables() {
  const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: 'travel_blog_node.db',
    logging: false
  });

  try {
    console.log('检查SQLite数据库中的表...');
    const tables = await sequelize.query(
      'SELECT name FROM sqlite_master WHERE type="table"',
      { type: Sequelize.QueryTypes.SELECT }
    );

    console.log('SQLite数据库中的表:');
    tables.forEach(table => {
      console.log('- ' + table.name);
    });

    // 检查每个表的数据量
    for (const table of tables) {
      try {
        const count = await sequelize.query(
          `SELECT COUNT(*) as count FROM ${table.name}`,
          { type: Sequelize.QueryTypes.SELECT }
        );
        console.log(`  ${table.name}: ${count[0].count} 条记录`);
      } catch (error) {
        console.log(`  ${table.name}: 查询失败 - ${error.message}`);
      }
    }

  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    await sequelize.close();
  }
}

checkTables();
