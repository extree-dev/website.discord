const config = require('./config');

const spamCache = new Map();

/**
 * Проверяет сообщение на наличие запрещенных слов
 * @param {Message} message Объект сообщения Discord
 * @returns {boolean} true если найдено нарушение
 */

module.exports = {
    checkForbiddenWords(message) {
        const content = message.content.toLowerCase();
        const hasForbiddenWord = config.security.forbiddenWords.some(word => content.includes(word));

        if (hasForbiddenWord) {
            message.delete();
            message.author.send(`-# Ваше сообщение было удалено: "${message.content}"\n-# Причина: Запрещенное слово`);
            return true;
        }
        return false;
    },

    checkSpam(message) {
        const { spamThreshold } = config.security;
        const userId = message.author.id;

        // Инициализация данных пользователя
        if (!spamCache.has(userId)) {
            spamCache.set(userId, {
                count: 1,
                lastTimestamp: Date.now()
            });
            return false;
        }

        const userData = spamCache.get(userId);
        const now = Date.now();
        const timeDiff = (now - userData.lastTimestamp) / 1000; // в секундах

        if (timeDiff < 2) { // 2 секунды - временное окно
            userData.count++;

            if (userData.count >= spamThreshold) {
                message.channel.send(`${message.author}, прекратите спам!`)
                    .then(msg => setTimeout(() => msg.delete(), 5000))
                    .catch(logger.error);
                return true;
            }
        } else {
            userData.count = 1;
        }

        userData.lastTimestamp = now;
        return false;
    }
};