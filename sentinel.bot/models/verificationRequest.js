// models/verificationRequest.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    return sequelize.define('VerificationRequest', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        user_id: {
            type: DataTypes.STRING,
            allowNull: false
        },
        user_name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        user_avatar: {
            type: DataTypes.STRING
        },
        message: {
            type: DataTypes.TEXT
        },
        image_url: {
            type: DataTypes.STRING
        },
        status: {
            type: DataTypes.ENUM('pending', 'approved', 'rejected'),
            defaultValue: 'pending'
        },
        moderator_id: {
            type: DataTypes.STRING
        },
        moderator_name: {
            type: DataTypes.STRING
        },
        reason: {
            type: DataTypes.TEXT
        }
    }, {
        tableName: 'verification_requests',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
};