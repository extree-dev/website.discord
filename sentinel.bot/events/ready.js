// events/ready.js
const { Events } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`✅ Sentinel запущен как ${client.user.tag}`);

    try {
      // 1. УСТАНАВЛИВАЕМ СТАТУС БОТА
      client.user.setActivity('За порядком', { type: 'WATCHING' });

      // 2. ЗАПУСКАЕМ МОНИТОРИНГ БЕЗОПАСНОСТИ
      startSecurityMonitoring(client);

      // 3. ПРОВЕРЯЕМ НАСТРОЙКИ СЕРВЕРА
      await checkServerSecurity(client);

      // 4. ЗАПУСКАЕМ СБОР СТАТИСТИКИ
      if (global.statsCollector) {
        const guild = client.guilds.cache.get(process.env.GUILD_ID);
        if (guild) {
          global.statsCollector.saveServerStats(guild);
        }
      }

      console.log('🛡️ Система мониторинга безопасности активирована');

    } catch (error) {
      console.error('Error in ready event:', error);
    }
  },
};

// ЗАПУСК МОНИТОРИНГА БЕЗОПАСНОСТИ
function startSecurityMonitoring(client) {
  setInterval(async () => {
    try {
      const guild = client.guilds.cache.get(process.env.GUILD_ID);
      if (!guild || !global.alertSystem) return;

      console.log('🔍 Выполняю проверку безопасности...');

      // 1. ПРОВЕРКА ПРОБЛЕМ С ВЕРИФИКАЦИЕЙ
      await global.alertSystem.detectVerificationIssues(guild);

      // 2. ПРОВЕРКА НАРУШЕНИЙ БЕЗОПАСНОСТИ
      await global.alertSystem.detectSecurityViolations(guild);

      // 3. ПРОВЕРКА АНОМАЛЬНОЙ АКТИВНОСТИ
      await global.alertSystem.detectAnomalousActivity(guild);

      // 4. ПЕРИОДИЧЕСКАЯ ОЧИСТКА КЭША
      cleanupOldCache();

    } catch (error) {
      console.error('Error in security monitoring:', error);
    }
  }, 5 * 60 * 1000); // Каждые 5 минут
}

// ПРОВЕРКА НАСТРОЕК СЕРВЕРА
async function checkServerSecurity(client) {
  try {
    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    if (!guild) return;

    console.log('🔒 Проверяю настройки безопасности сервера...');

    // Проверяем основные настройки безопасности
    const securityCheck = {
      verificationLevel: guild.verificationLevel,
      explicitContentFilter: guild.explicitContentFilter,
      defaultMessageNotifications: guild.defaultMessageNotifications,
      premiumTier: guild.premiumTier,
      memberCount: guild.memberCount,
      owner: guild.ownerId
    };

    console.log('📊 Настройки безопасности:', securityCheck);

    // Создаем начальный алерт с информацией о сервере
    if (global.alertSystem) {
      await global.alertSystem.createAlert('system_startup', 'low', {
        title: '🟢 СИСТЕМА МОНИТОРИНГА АКТИВИРОВАНА',
        description: `Sentinel начал мониторинг сервера ${guild.name}`,
        guildId: guild.id,
        data: {
          serverName: guild.name,
          memberCount: guild.memberCount,
          securityLevel: guild.verificationLevel,
          monitoringStarted: new Date().toISOString(),
          features: ['raid_protection', 'automod_detection', 'suspicious_accounts', 'security_audit']
        }
      });
    }

  } catch (error) {
    console.error('Error checking server security:', error);
  }
}

// ОЧИСТКА СТАРОГО КЭША
function cleanupOldCache() {
  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000;

  if (global.alertSystem) {
    // Очищаем кэш сообщений старше 5 минут
    for (const [guildId, messages] of global.alertSystem.messageCache) {
      const filtered = messages.filter(msg => msg.timestamp > fiveMinutesAgo);
      global.alertSystem.messageCache.set(guildId, filtered);
    }

    // Очищаем кэш вступлений старше 30 минут
    for (const [guildId, joins] of global.alertSystem.joinCache) {
      const filtered = joins.filter(join => join.timestamp > (now - 30 * 60 * 1000));
      global.alertSystem.joinCache.set(guildId, filtered);
    }
  }
}