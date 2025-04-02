import winston from 'winston';
import config from '../../config.js';

// 创建日志记录器
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
    ),
    defaultMeta: { service: 'price-monitor' },
    transports: [
        // 控制台输出
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(
                    info => `${info.timestamp} ${info.level}: ${info.message}`
                )
            )
        })
    ]
});

// 如果配置中启用了文件日志，添加文件传输
if (config.monitoring.logToFile) {
    logger.add(new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error'
    }));

    logger.add(new winston.transports.File({
        filename: 'logs/combined.log'
    }));
}

export function logPriceDeviation(tokenSymbol, infraPrice, outsidePrice, deviation, isWarning) {
    // 格式化价格，处理Decimal和数字类型
    let infraPriceStr, pancakeswapPriceStr, deviationStr;

    // 处理infraPrice
    if (typeof infraPrice === 'object' && typeof infraPrice.toFixed === 'function') {
        infraPriceStr = infraPrice.toFixed(8);
    } else {
        infraPriceStr = Number(infraPrice).toFixed(8);
    }

    // 处理pancakeswapPrice
    if (typeof outsidePrice === 'object' && typeof outsidePrice.toFixed === 'function') {
        pancakeswapPriceStr = outsidePrice.toFixed(8);
    } else {
        pancakeswapPriceStr = Number(outsidePrice).toFixed(8);
    }

    // 处理deviation
    if (deviation === null) {
        deviationStr = "无法计算";
    } else if (typeof deviation === 'object' && typeof deviation.toFixed === 'function') {
        deviationStr = deviation.toFixed(2) + '%';
    } else if (deviation !== null) {
        deviationStr = Number(deviation).toFixed(2) + '%';
    }

    // 构建消息
    const message = `Token: ${tokenSymbol}, Infra: ${infraPriceStr}, PancakeSwap: ${pancakeswapPriceStr}, Deviation: ${deviationStr}`;

    if (isWarning) {
        logger.warn(`[WARNING] 价格偏差超过阈值! ${message}`);
    } else {
        logger.info(message);
    }
}

/**
 * 记录错误
 * @param {string} message - 错误消息
 * @param {string} error - 错误对象
 */
export function logError(message, error) {
    logger.error(`${message}: ${error.message}`, { stack: error.stack });
}

/**
 * 记录信息
 * @param {string} message - 信息消息
 */
export function logInfo(message) {
    logger.info(message);
}