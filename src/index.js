import cron from 'node-cron';
import dotenv from 'dotenv';
import InfraService from './services/infraService.js';
import PancakeService from './services/pancakeService.js';
import config from '../config.js';
import {logInfo, logError, logPriceDeviation} from './utils/logger.js';

// 加载环境变量
dotenv.config();

// 创建服务实例
const infraService = new InfraService();
const pancakeService = new PancakeService();

/**
 * 运行价格比较
 */
async function runBNBPriceComparison() {
    try {
        logInfo('开始运行基于BNB的价格比较...');

        // 获取所有配置的代币地址
        const tokenAddresses = config.tokens.map(token => token.address);

        // 从两个来源获取相对BNB的价格
        const [infraPricesInBNB, pancakeswapPricesInBNB] = await Promise.all([
            infraService.getTokensPricesInBNB(tokenAddresses),
            pancakeService.getTokensPricesInV2(tokenAddresses)
        ]);

        // 对比每个代币相对BNB的价格
        logInfo(`开始比较 ${tokenAddresses.length} 个代币相对BNB的价格...`);

        // 结果数组
        const comparisonResults = [];

        // 遍历每个代币
        for (const token of config.tokens) {
            const address = token.address.toLowerCase();

            // 获取两个来源的价格
            const infraPrice = infraPricesInBNB.get(address);
            const pancakeswapPrice = pancakeswapPricesInBNB.get(address);

            // 如果两个来源都有价格数据，则进行比较
            if (infraPrice && pancakeswapPrice) {
                // 两个价格都已经是BNB价格单位，可以直接比较
                const result = compareBNBPrices(infraPrice, pancakeswapPrice);
                comparisonResults.push(result);

                // 输出详细的比较结果
                logInfo(result.getFormattedResult());
            } else {
                logError(`无法比较代币 [${token.symbol}] 相对BNB的价格，缺少数据来源`, new Error('数据不完整'));
            }
        }

        logInfo(`相对BNB价格比较完成，共比较了 ${comparisonResults.length} 个代币`);

        return comparisonResults;
    } catch (error) {
        logError('价格比较过程中发生错误', error);
        throw error;
    }
}

function compareBNBPrices(infraPrice, pancakeswapPrice) {
    // 确保两个价格都是BNB单位
    if (infraPrice.priceUnit !== 'BNB' || pancakeswapPrice.priceUnit !== 'BNB') {
        throw new Error('价格单位不匹配，无法比较');
    }

    // 创建价格比较结果对象
    const result = {
        token: {
            address: infraPrice.address,
            symbol: infraPrice.symbol
        },
        infraPrice: infraPrice.price,
        pancakeswapPrice: pancakeswapPrice.price,
        timestamp: Date.now(),

        // 计算偏差百分比
        deviationPercentage: null
    };

    // 计算偏差百分比
    if (pancakeswapPrice.price.isZero()) {
        result.deviationPercentage = null; // 避免除以零
    } else {
        const diff = infraPrice.price.sub(pancakeswapPrice.price);
        result.deviationPercentage = diff.dividedBy(pancakeswapPrice.price).times(100);
    }

    // 添加格式化方法
    result.getFormattedResult = function() {
        if (this.deviationPercentage === null) {
            return `${this.token.symbol}: Infra价格 = ${this.infraPrice.toString()} BNB, PancakeSwap价格 = ${this.pancakeswapPrice.toString()} BNB, 偏差 = 无法计算`;
        }

        return `${this.token.symbol}: Infra价格 = ${this.infraPrice.toString()} BNB, PancakeSwap价格 = ${this.pancakeswapPrice.toString()} BNB, 偏差 = ${this.deviationPercentage.toString()}%`;
    };

    // 检查偏差是否超过阈值
    result.isAboveThreshold = function(threshold) {
        if (this.deviationPercentage === null) return false;
        return this.deviationPercentage.abs().greaterThan(threshold);
    };

    // 记录价格偏差
    const isWarning = result.isAboveThreshold(config.monitoring.priceDeviationThreshold);
    logPriceDeviation(
        result.token.symbol,
        result.infraPrice,
        result.pancakeswapPrice,
        result.deviationPercentage,
        isWarning,
        'BNB'
    );

    return result;
}

// 在主函数中添加BNB价格比较的调用
async function main() {
    try {
        logInfo('价格监控服务启动');

        // 运行BNB价格比较
        await runBNBPriceComparison();

        // 设置定时任务，按照配置的间隔运行
        const intervalMinutes = Math.floor(config.monitoring.interval / (60 * 1000));

        // 创建定时任务表达式 (例如：*/5 * * * * 表示每5分钟)
        const cronExpression = `*/${intervalMinutes} * * * *`;

        logInfo(`设置定时任务，间隔为 ${intervalMinutes} 分钟`);

        // 启动定时任务
        cron.schedule(cronExpression, async () => {
            try {
                // 运行BNB价格比较
                await runBNBPriceComparison();
            } catch (error) {
                logError('定时任务执行失败', error);
            }
        });

    } catch (error) {
        logError('启动服务失败', error);
        process.exit(1);
    }
}

// 启动服务
main().catch(error => {
    console.error('服务启动异常:', error);
    process.exit(1);
});