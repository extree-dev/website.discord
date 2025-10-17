const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/db');

const Warn = sequelize.define('Warn', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  moderatorId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  reason: {
    type: DataTypes.TEXT,
    defaultValue: 'Не указана'
  },
  guildId: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  timestamps: true,
  updatedAt: false
});

module.exports = Warn;