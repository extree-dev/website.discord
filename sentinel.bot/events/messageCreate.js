// events/messageCreate.js
const { Events } = require('discord.js');
const automod = require('../utils/automod');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot) return;
    if (message.guild.id !== process.env.GUILD_ID) return;

    try {
      // 1. ПРОВЕРКА НАШЕГО АВТОМОДА
      if (automod.checkForbiddenWords(message)) {
        console.log('🔞 Our automod blocked message');
        return;
      }

      if (automod.checkSpam(message)) {
        console.log('🚫 Our automod blocked spam');
        return;
      }

      // 2. ОБНАРУЖЕНИЕ ПОТЕНЦИАЛЬНЫХ НАРУШЕНИЙ ДЛЯ АЛЕРТОВ
      if (global.alertSystem) {
        const hasViolation = await checkForViolations(message);
        if (hasViolation) {
          console.log('⚠️ Alert created for message violation');
        }
      }

      // 3. ОБНОВЛЕНИЕ КЭША
      updateMessageCache(message);

    } catch (error) {
      console.error('Error in messageCreate event:', error);
    }
  },
};

// Проверка нарушений для алертов
async function checkForViolations(message) {
  const violations = [];

  // Проверка запрещенных слов (для алертов, без блокировки)
  const forbiddenWords = ['спам', 'реклама', 'купить', 'продать', 'discord.gg'];
  if (forbiddenWords.some(word => message.content.toLowerCase().includes(word))) {
    violations.push('forbidden_words');
  }

  // Проверка ссылок
  if (message.content.includes('http') || message.content.includes('discord.gg')) {
    violations.push('suspicious_links');
  }

  // Проверка массовых упоминаний
  const mentionCount = (message.content.match(/@(everyone|here)/g) || []).length;
  if (mentionCount >= 2) {
    violations.push('mass_mentions');
  }

  if (violations.length > 0 && global.alertSystem) {
    await global.alertSystem.createAlert('potential_violation', 'low', {
      title: '⚠️ ПОТЕНЦИАЛЬНОЕ НАРУШЕНИЕ',
      description: `Обнаружено сообщение с признаками нарушения`,
      guildId: message.guild.id,
      data: {
        userId: message.author.id,
        userTag: message.author.tag,
        channel: message.channel.name,
        content: message.content.substring(0, 200),
        violations: violations,
        messageUrl: message.url,
        action: 'monitoring',
        detectedAt: new Date().toISOString()
      }
    });
    return true;
  }

  return false;
}

// Остальной код без изменений...
function updateMessageCache(message) {
  const guildId = message.guild.id;

  if (!global.alertSystem.messageCache.has(guildId)) {
    global.alertSystem.messageCache.set(guildId, []);
  }

  const cache = global.alertSystem.messageCache.get(guildId);
  cache.push({
    content: message.content,
    author: message.author.tag,
    authorId: message.author.id,
    channel: message.channel.name,
    channelId: message.channel.id,
    timestamp: Date.now()
  });

  if (cache.length > 1000) {
    global.alertSystem.messageCache.set(guildId, cache.slice(-1000));
  }
}

// Проверка дополнительных угроз
async function checkMessageThreats(message) {
  try {
    // Проверка на фишинг-ссылки
    if (containsPhishingLinks(message.content)) {
      if (global.alertSystem) {
        await global.alertSystem.createAlert('phishing_attempt', 'high', {
          title: '🎣 ОБНАРУЖЕНА ФИШИНГ-ССЫЛКА',
          description: `Пользователь ${message.author.tag} отправил подозрительную ссылку`,
          guildId: message.guild.id,
          data: {
            userId: message.author.id,
            userTag: message.author.tag,
            channel: message.channel.name,
            content: message.content.substring(0, 200),
            messageUrl: message.url,
            action: 'message_deleted',
            detectedAt: new Date().toISOString()
          }
        });
      }

      // Автоматически удаляем сообщение
      await message.delete().catch(console.error);
      return;
    }

    // Проверка на массовые упоминания
    if (containsMassMentions(message.content)) {
      if (global.alertSystem) {
        await global.alertSystem.createAlert('mass_mentions', 'medium', {
          title: '🔔 МАССОВЫЕ УПОМИНАНИЯ',
          description: `Пользователь ${message.author.tag} упомянул много пользователей`,
          guildId: message.guild.id,
          data: {
            userId: message.author.id,
            userTag: message.author.tag,
            channel: message.channel.name,
            mentionCount: (message.content.match(/@/g) || []).length,
            action: 'warning',
            detectedAt: new Date().toISOString()
          }
        });
      }
    }

  } catch (error) {
    console.error('Error checking message threats:', error);
  }
}

// Вспомогательные функции
function containsPhishingLinks(content) {
  const phishingPatterns = [
    /discord\.gift\/\w+/i,
    /steamcommunity\.com\/gift\/\w+/i,
    /free-\w+\.com/i,
    /nitro-\w+\.com/i
  ];
  return phishingPatterns.some(pattern => pattern.test(content));
}

function containsMassMentions(content) {
  const mentionCount = (content.match(/@(everyone|here|[0-9]{17,19})/g) || []).length;
  return mentionCount >= 5;
}