module.exports = {

    loadConfig,
    clientId: '1394946498386722866',

    // Настройки безопасности
    security: {
        forbiddenWords: ["спам", "оскорбление", "запрещенное_слово"],
        maxWarnings: 3, // Максимальное количество предупреждений
        spamThreshold: 5, // Сообщений в секунду для детекции спама
    },
    
    // Настройки модерации
    moderation: {
        reportChannel: "118402345678901234", // ID канала для отчетов
        logChannel: "118402345678901235", // ID канала для логов
        muteRole: "118402345678901236", // ID роли для мута
        autoDeleteReports: true, // Автоудаление обработанных жалоб
    },
    
    // Настройки DM
    directMessages: {
        enabled: true,
        responseMessage: "✅ Ваше сообщение получено и передано модераторам",
        notifyUser: true // Уведомлять пользователя о принятии сообщения
    },
    
    // Системные настройки
    system: {
        prefix: "!",
        color: "#3498db", // Цвет для эмбедов
        locale: "ru-RU" // Языковая локализация
    }
};

function loadConfig() {
    try {
      const userConfig = existsSync('./config.user.js') 
        ? require('./config.user.js') 
        : {};
      
      return {
        security: { ...defaultConfig.security, ...userConfig.security }
      };
    } catch (e) {
      logger.error(`Ошибка загрузки конфига: ${e}`);
      return defaultConfig;
    }
  }