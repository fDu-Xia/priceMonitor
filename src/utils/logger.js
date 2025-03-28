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

/**
 * 记录价格偏差
 * @param {string} tokenSymbol - 代币符号
 * @param {number} pinkpunkPrice - 基建价格
 * @param {number} pancakeswapPrice - PancakeSwap价格
 * @param {number} deviation - 偏差百分比
 * @param {boolean} isWarning - 是否达到警告阈值
 */
export function logPriceDeviation(tokenSymbol, infraPrice, pancakeswapPrice, deviation, isWarning, priceUnit = 'USD') {
    // 格式化价格，处理Decimal和数字类型
    let infraPriceStr, pancakeswapPriceStr, deviationStr;

    // 处理infraPrice
    if (typeof infraPrice === 'object' && typeof infraPrice.toFixed === 'function') {
        infraPriceStr = infraPrice.toFixed(8);
    } else {
        infraPriceStr = Number(infraPrice).toFixed(8);
    }

    // 处理pancakeswapPrice
    if (typeof pancakeswapPrice === 'object' && typeof pancakeswapPrice.toFixed === 'function') {
        pancakeswapPriceStr = pancakeswapPrice.toFixed(8);
    } else {
        pancakeswapPriceStr = Number(pancakeswapPrice).toFixed(8);
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
    const unitSymbol = priceUnit === 'USD' ? '$' : '';
    const message = `Token: ${tokenSymbol}, Infra: ${unitSymbol}${infraPriceStr} ${priceUnit}, PancakeSwap: ${unitSymbol}${pancakeswapPriceStr} ${priceUnit}, Deviation: ${deviationStr}`;

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

export default {
    logPriceDeviation,
    logError,
    logInfo
};