const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: 'travel_blog_node.db',
    logging: false
});

module.exports = { sequelize };