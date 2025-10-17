const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');
const config = require('../utils/config');

const sequelize = new Sequelize(
  process.env.PG_DATABASE,
  process.env.PG_USER,
  process.env.PG_PASSWORD,
  {
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    dialect: 'postgres',
    logging: msg => logger.log(msg),
    dialectOptions: {
      ssl: process.env.PG_SSL === 'true' ? { require: true } : false
    },
    pool: {
      max: 5,
      min: 0,
      acquire: process.env.PG_TIMEOUT || 5000,
      idle: 10000
    }
  }
);

module.exports = {
  sequelize,
  connect: async () => {
    try {
      await sequelize.authenticate();
      logger.log('Подключение к PostgreSQL успешно установлено');
      await sequelize.sync({ alter: true });
    } catch (error) {
      logger.error('Ошибка подключения к PostgreSQL:', error);
      process.exit(1);
    }
  }
};