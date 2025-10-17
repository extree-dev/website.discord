const { createWriteStream, existsSync, mkdirSync } = require('fs');
const path = require('path');
const util = require('util');

// Создаем папку для логов, если её нет
const logDir = path.join(__dirname, '../logs');
if (!existsSync(logDir)) {
  mkdirSync(logDir, { recursive: true });
}

const logStream = createWriteStream(
  path.join(logDir, 'sentinel.log'), 
  { flags: 'a' }
);

// Функция для форматирования ошибок
function formatError(error) {
  if (!error) return 'Неизвестная ошибка';
  
  return {
    message: error.message,
    stack: error.stack,
    code: error.code,
    ...(error.response && { response: error.response.data })
  };
}

// Улучшенный логгер
const logger = {
  log: (message, context = {}) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] LOG: ${message} ${util.inspect(context, { depth: 3 })}\n`;
    
    console.log(logMessage);
    logStream.write(logMessage);
  },
  
  error: (error, context = {}) => {
    const timestamp = new Date().toISOString();
    const errorDetails = formatError(error);
    const errorMessage = `[${timestamp}] ERROR: ${util.inspect(errorDetails, { depth: 5 })} CONTEXT: ${util.inspect(context, { depth: 3 })}\n`;
    
    console.error(errorMessage);
    logStream.write(errorMessage);
  },
  
  warn: (message, context = {}) => {
    const timestamp = new Date().toISOString();
    const warnMessage = `[${timestamp}] WARN: ${message} ${util.inspect(context, { depth: 3 })}\n`;
    
    console.warn(warnMessage);
    logStream.write(warnMessage);
  }
};

// Обработка ошибок записи в лог
logStream.on('error', (err) => {
  console.error('Ошибка записи в лог-файл:', err);
});

module.exports = logger;