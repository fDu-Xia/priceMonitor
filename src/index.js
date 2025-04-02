import cron from 'node-cron';
import dotenv from 'dotenv';
import InfraService from './services/infraService.js';
import PancakeService from './services/pancakeService.js';
import config from '../config.js';
import {logInfo, logError, logPriceDeviation} from './utils/logger.js';
import {Web3} from "web3";
import FourMemeService from "./services/fourmemeService.js";
import {
    PANCAKE_ROUTER_ADDRESS,
    PRICE_UNIT,
    QUOTER_ROUTER_ADDRESS,
    UNISWAP_QUOTER,
    UNISWAP_ROUTER_ADDRESS
} from "./utils/constants.js";
import Decimal from "decimal.js";
import BN from "bn.js";

// 加载环境变量
dotenv.config();

// 初始化Web3提供者
const initWeb3 = () => {
    // 使用BSC节点
    const provider = new Web3.providers.HttpProvider(config.pancakeswap.endpoint);
    return new Web3(provider);
};

// 初始化Web3实例
export const web3 = initWeb3();

// 创建服务实例
const infraService = new InfraService();
const pancakeService = new PancakeService(PANCAKE_ROUTER_ADDRESS,QUOTER_ROUTER_ADDRESS);
const uniswapService = new PancakeService(UNISWAP_ROUTER_ADDRESS,UNISWAP_QUOTER)
const fourMemeService = new FourMemeService();

/**
 * 运行价格比较
 */
async function runBNBPriceComparison() {
    try {
        logInfo('开始运行基于BNB的价格比较...');

        // 获取所有配置的代币地址
        const tokenAddresses = config.tokens.map(token => token);

        const v2TokenAddresses = config.tokens
            .filter(token => token.pool === 'pancakeV2')
            .map(token => token);

        const v3TokenAddresses = config.tokens
            .filter(token => token.pool === 'pancakeV3')
            .map(token => token);

        const uniswapV3Addresses = config.tokens
            .filter(token => token.pool === 'uniswapV3')
            .map(token => token);

        const fourMemeTokenAddresses = config.tokens
            .filter(token => token.pool === 'fourMeme')
            .map(token => token);

        // 从两个来源获取相对BNB的价格
        const [
            infraPricesInBNB,
            pancakeV2Prices,
            pancakeV3Prices,
            uniswapV3Prices,
            fourMemePricesInBNB
        ] = await Promise.all([
            infraService.getTokensPricesInBNB(tokenAddresses),
            pancakeService.getTokensPricesInV2(v2TokenAddresses),
            pancakeService.getTokensPricesInV3(v3TokenAddresses),
            uniswapService.getTokensPricesInV3(uniswapV3Addresses),
            fourMemeService.getTokensPrices(fourMemeTokenAddresses),
        ]);

        // 合并V2和V3的价格结果
        const outSidePricesInBNB = new Map([
            ...pancakeV2Prices,
            ...pancakeV3Prices,
            ...uniswapV3Prices,
            ...fourMemePricesInBNB,
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
            const outsidePrice = outSidePricesInBNB.get(address);

            // 如果两个来源都有价格数据，则进行比较
            if (infraPrice && outsidePrice) {
                // 两个价格都已经是BNB价格单位，可以直接比较
                const result = compareBNBPrices(infraPrice, outsidePrice,token.decimals);
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

function compareBNBPrices(infraPrice, outsidePrice,tokenDecimals) {
    // 创建价格比较结果对象
    const result = {
        token: {
            address: infraPrice.address,
            symbol: infraPrice.symbol
        },
        infraPrice: infraPrice.price,
        pancakeswapPrice: outsidePrice.price,
        timestamp: Date.now(),

        // 计算偏差百分比
        deviationPercentage: null
    };

    if (outsidePrice.priceUnit !== PRICE_UNIT.BNB){
        result.infraPrice = new Decimal(new Decimal(10).pow(17).dividedBy(infraPrice.price).mul(new Decimal(10).pow(tokenDecimals)).toFixed(0))
    }

    // 计算偏差百分比
    if (outsidePrice.price.isZero()) {
        result.deviationPercentage = null; // 避免除以零
    } else {
        const diff = result.infraPrice.sub(outsidePrice.price);
        result.deviationPercentage = diff.dividedBy(outsidePrice.price).times(100);
    }

    // 添加格式化方法
    result.getFormattedResult = function() {
        if (this.deviationPercentage === null) {
            return `${this.token.symbol}: Infra价格 = ${this.infraPrice.toString()}, Outside价格 = ${this.pancakeswapPrice.toString()}, 偏差 = 无法计算`;
        }

        return `${this.token.symbol}: Infra价格 = ${this.infraPrice.toString()}, Outside价格 = ${this.pancakeswapPrice.toString()}, 偏差 = ${this.deviationPercentage.toString()}%`;
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