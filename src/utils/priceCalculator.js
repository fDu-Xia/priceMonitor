import { PriceComparisonResult } from '../models/tokenPrice.js';
import config from '../../config.js';
import { logPriceDeviation } from './logger.js';

/**
 * 价格计算工具
 */
export default class PriceCalculator {
    /**
     * 比较代币价格并计算偏差
     * @param {TokenPrice} pinkpunkPrice - 基建价格
     * @param {TokenPrice} pancakeswapPrice - PancakeSwap价格
     * @returns {PriceComparisonResult} 价格比较结果
     */
    static compareTokenPrices(pinkpunkPrice, pancakeswapPrice) {
        const result = new PriceComparisonResult(pinkpunkPrice, pancakeswapPrice);

        // 检查偏差是否超过阈值
        const isWarning = result.isAboveThreshold(config.monitoring.priceDeviationThreshold);

        // 记录价格偏差
        logPriceDeviation(
            result.token.symbol,
            result.pinkpunkPrice,
            result.pancakeswapPrice,
            result.deviationPercentage,
            isWarning
        );

        return result;
    }

    /**
     * 将大数字字符串转换为数字
     * @param {string} valueStr - 大数字字符串
     * @param {number} decimals - 小数位数
     * @returns {number} 转换后的数字
     */
    static parseTokenAmount(valueStr, decimals = 18) {
        if (!valueStr) return 0;

        try {
            // 将字符串转换为BigInt
            const valueBigInt = BigInt(valueStr.replace('.', '').padEnd(valueStr.length, '0'));

            // 计算除数 (10^decimals)
            const divisor = BigInt(10) ** BigInt(decimals);

            // 转换为JavaScript数字
            return Number(valueBigInt) / Number(divisor);
        } catch (error) {
            console.error(`解析代币数量出错: ${error.message}`);
            return 0;
        }
    }

    /**
     * 格式化价格数字以便显示
     * @param {number} price - 价格
     * @param {number} decimals - 显示小数位数
     * @returns {string} 格式化后的价格
     */
    static formatPrice(price, decimals = 8) {
        return price.toFixed(decimals);
    }
}