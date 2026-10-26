import winston from 'winston';

const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length && meta.service !== 'socialsphere-api' 
          ? ` ${JSON.stringify(meta)}` 
          : '';
        return `[${timestamp}] ${level}: ${message}${metaStr}`;
      })
    ),
  }),
];

// File transports (enabled locally, optional in containerized environments)
if (!process.env.RENDER) {
  try {
    transports.push(
      new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
      new winston.transports.File({ filename: 'logs/combined.log' })
    );
  } catch (e) {
    // ignore if logs directory is read-only
  }
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'socialsphere-api' },
  transports,
});

export default logger;
