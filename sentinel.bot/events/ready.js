// events/ready.js
const { Events } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`✅ Sentinel запущен как ${client.user.tag}`);

    try {
      // 🔧 ДАЕМ ВРЕМЯ НА ПОЛНУЮ ИНИЦИАЛИЗАЦИЮ
      setTimeout(async () => {
        // ЛОГИРУЕМ ЗАПУСК БОТА
        if (global.botLogger) {
          global.botLogger.logBotStart();
        }

        // 1. УСТАНАВЛИВАЕМ СТАТУС БОТА (ПОСЛЕ ПОЛНОЙ ИНИЦИАЛИЗАЦИИ)
        if (client.user) {
          client.user.setActivity('За порядком', { type: 'WATCHING' });
        }

        // 2. ЗАПУСКАЕМ МОНИТОРИНГ БЕЗОПАСНОСТИ
        startSecurityMonitoring(client);

        // 3. ПРОВЕРЯЕМ НАСТРОЙКИ СЕРВЕРА
        await checkServerSecurity(client);

        // 4. ЗАПУСКАЕМ СБОР СТАТИСТИКИ
        if (global.statsCollector) {
          const guild = client.guilds.cache.get(process.env.GUILD_ID);
          if (guild) {
            await global.statsCollector.saveServerStats(guild);
          }
        }

        // ЛОГИРУЕМ СТАТУС БОТА
        if (global.botLogger) {
          global.botLogger.logBotStatus('ready', {
            guilds: client.guilds.cache.size,
            users: client.users.cache.size,
            ping: client.ws.ping,
            uptime: client.uptime
          });
        }

        console.log('🛡️ Система мониторинга безопасности активирована');
        console.log(`📊 Загружено серверов: ${client.guilds.cache.size}`);

      }, 3000); // 🔧 3 секунды на инициализацию

    } catch (error) {
      console.error('Error in ready event:', error);
      if (global.botLogger) {
        global.botLogger.logSystemEvent('ready_error', {
          error: error.message,
          stack: error.stack
        });
      }
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

      // ЛОГИРУЕМ УСПЕШНУЮ ПРОВЕРКУ
      if (global.botLogger) {
        global.botLogger.addLog('info', 'Security monitoring check completed', {
          guild: guild.name,
          members: guild.memberCount
        });
      }

    } catch (error) {
      console.error('Error in security monitoring:', error);
      if (global.botLogger) {
        global.botLogger.logSystemEvent('security_monitoring_error', {
          error: error.message,
          guildId: process.env.GUILD_ID
        });
      }
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

    // ЛОГИРУЕМ НАСТРОЙКИ СЕРВЕРА
    if (global.botLogger) {
      global.botLogger.addLog('info', 'Server security settings checked', securityCheck);
    }

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
    if (global.botLogger) {
      global.botLogger.logSystemEvent('security_check_error', {
        error: error.message,
        guildId: process.env.GUILD_ID
      });
    }
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