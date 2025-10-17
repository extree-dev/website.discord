const automod = require('../utils/automod');

module.exports = {
  name: 'messageCreate',
  execute(message, client) {
    if (message.author.bot) return;
    
    // Проверка на запрещенные слова
    if (automod.checkForbiddenWords(message, client)) return;
    
    // Проверка на спам
    if (automod.checkSpam(message, client)) return;
  }
};