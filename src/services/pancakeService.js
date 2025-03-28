import config from '../../config.js';
import { TokenPrice } from '../models/tokenPrice.js';
import {
    PRICE_SOURCE
} from '../utils/constants.js';
import { logError, logInfo } from '../utils/logger.js';
import * as constants from "../utils/constants.js";
import Decimal from "decimal.js";
import Web3 from 'web3';
import BN from "bn.js";





// 初始化Web3提供者
const initWeb3 = () => {
    // 使用BSC节点
    const provider = new Web3.providers.HttpProvider(config.pancakeswap.endpoint);
    return new Web3(provider);
};

// 初始化Web3实例
const web3 = initWeb3();

/**
 * PancakeSwap价格服务
 */
export default class PancakeService {
    constructor() {
        this.endpoint = config.pancakeswap.endpoint;
    }

    async getTokensPricesInV2(tokenAddresses) {
        try {
            logInfo(`从PancakeSwap获取${tokenAddresses.length}个代币相对BNB的价格`);

            // PancakeSwap Router v2 合约地址
            const PANCAKE_ROUTER_ADDRESS = '0x10ED43C718714eb63d5aA57B78B54704E256024E';

            // PancakeSwap Router v2 ABI (仅包含我们需要的方法)
            const ROUTER_ABI = [
                {
                    "inputs": [
                        {"internalType": "uint256", "name": "amountIn", "type": "uint256"},
                        {"internalType": "address[]", "name": "path", "type": "address[]"}
                    ],
                    "name": "getAmountsOut",
                    "outputs": [{"internalType": "uint256[]", "name": "amounts", "type": "uint256[]"}],
                    "stateMutability": "view",
                    "type": "function"
                }
            ];

            // 初始化合约实例
            const routerContract = new web3.eth.Contract(ROUTER_ABI, PANCAKE_ROUTER_ADDRESS);

            // 获取代币信息的ABI
            const ERC20_ABI = [
                {
                    "inputs": [],
                    "name": "symbol",
                    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [],
                    "name": "decimals",
                    "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
                    "stateMutability": "view",
                    "type": "function"
                }
            ];

            // 创建请求队列
            const pricePromises = tokenAddresses.map(async (address) => {
                try {
                    // 处理BNB的特殊情况
                    if (address.toLowerCase() === constants.BNB_ADDRESS.toLowerCase() ||
                        address.toLowerCase() === constants.WBNB_ADDRESS.toLowerCase()) {
                        // BNB相对于自身的价格始终为1
                        const tokenPrice = new TokenPrice(
                            address,
                            address.toLowerCase() === constants.BNB_ADDRESS.toLowerCase() ? 'BNB' : 'WBNB',
                            new Decimal(1),
                            PRICE_SOURCE.PANCAKEV2,
                            'BNB'
                        );
                        return [address.toLowerCase(), tokenPrice];
                    }

                    // 获取代币信息
                    const tokenContract = new web3.eth.Contract(ERC20_ABI, address);

                    // 并行获取代币符号和小数位
                    const [symbol, decimals] = await Promise.all([
                        tokenContract.methods.symbol().call().catch(() => 'UNKNOWN'),
                        tokenContract.methods.decimals().call().catch(() => '18')
                    ]);

                    // 使用 getAmountsOut 获取价格
                    // 输入金额: 1个代币 (考虑代币小数位)
                    const amountIn = new BN(10).pow(new BN(decimals));

                    // 设置路径: 目标代币 -> WBNB
                    const path = [address, constants.WBNB_ADDRESS];

                    // 调用 getAmountsOut
                    const amounts = await routerContract.methods.getAmountsOut(amountIn.toString(), path).call();

                    // 获取输出金额 (BNB 数量)
                    const outputAmount = new Decimal(amounts[1]);

                    const tokenPrice = new TokenPrice(
                        address,
                        symbol,
                        outputAmount,
                        PRICE_SOURCE.PANCAKEV2,
                        'BNB'
                    );

                    return [address.toLowerCase(), tokenPrice];
                } catch (error) {
                    logError(`获取代币[${address}]相对BNB价格失败`, error);
                    return [address.toLowerCase(), null];
                }
            });

            // 等待所有请求完成
            const results = await Promise.all(pricePromises);

            // 将结果转换为Map
            const pricesMap = new Map();
            results.forEach(([address, price]) => {
                if (price) {
                    pricesMap.set(address, price);
                }
            });

            logInfo(`成功从PancakeSwap获取${pricesMap.size}个代币相对BNB的价格`);
            return pricesMap;

        } catch (error) {
            logError('从PancakeSwap获取代币相对BNB价格失败', error);
            throw error;
        }
    }

    getProgramAddress(pool) {
        switch (pool) {
            case 'pancakeV2':
                return '0x10ED43C718714eb63d5aA57B78B54704E256024E';
            case 'pancakeV3':
                return '0x1b81D678ffb9C0263b24A97847620C99d213eB14';
        }
    }
}