import { TokenPrice } from '../models/tokenPrice.js';
import {
    PRICE_SOURCE, PRICE_UNIT, WBNB_ADDRESS
} from '../utils/constants.js';
import { logError, logInfo } from '../utils/logger.js';
import * as constants from "../utils/constants.js";
import Decimal from "decimal.js";
import BN from "bn.js";
import {web3} from "../index.js";
import config from "../../config.js";


export default class PancakeService {
    constructor(v2Address,v3Address) {
        this.v2Address = v2Address;
        this.v3Address = v3Address;
    }
    async getTokensPricesInV2(tokenAddresses) {
        try {
            logInfo(`从PancakeSwap获取${tokenAddresses.length}个代币相对BNB的价格`);

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
            const routerContract = new web3.eth.Contract(ROUTER_ABI, this.v2Address);

            // 创建请求队列
            const pricePromises = tokenAddresses.map(async (token) => {
                const address = token.address;
                try {
                    // 使用 getAmountsOut 获取价格
                    // 输入金额: 0.1个WBNB
                    const amountIn = new BN(10).pow(new BN(17));

                    // 设置路径: WBNB -> 目标代币
                    const path = [constants.WBNB_ADDRESS, address];

                    // 调用 getAmountsOut
                    const amounts = await routerContract.methods.getAmountsOut(amountIn.toString(), path).call();

                    // 获取输出金额 (token 数量)
                    const outputAmount = new Decimal(amounts[1]);

                    const tokenPrice = new TokenPrice(
                        address,
                        token.symbol,
                        outputAmount,
                        PRICE_SOURCE.PANCAKEV2,
                        PRICE_UNIT.TOKENPER01BNB
                    );

                    return [address.toLowerCase(), tokenPrice];
                } catch (error) {
                    logError(`从pancakeV2获取代币[${address}]相对BNB价格失败`, error);
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

            logInfo(`成功从PancakeSwapV2获取${pricesMap.size}个代币相对BNB的价格`);
            return pricesMap;

        } catch (error) {
            logError('从PancakeSwapV2获取代币相对BNB价格失败', error);
            throw error;
        }
    }

    async getTokensPricesInV3(tokenAddresses) {
        try {
            logInfo(`从PancakeSwap V3 Quoter获取${tokenAddresses.length}个代币相对BNB的价格`);

            // PancakeSwap Quoter V2 ABI (仅包含我们需要的方法)
            const QUOTER_ABI = [
                {
                    "inputs": [
                        {
                            "components": [
                                {
                                    "internalType": "address",
                                    "name": "tokenIn",
                                    "type": "address"
                                },
                                {
                                    "internalType": "address",
                                    "name": "tokenOut",
                                    "type": "address"
                                },
                                {
                                    "internalType": "uint256",
                                    "name": "amountIn",
                                    "type": "uint256"
                                },
                                {
                                    "internalType": "uint24",
                                    "name": "fee",
                                    "type": "uint24"
                                },
                                {
                                    "internalType": "uint160",
                                    "name": "sqrtPriceLimitX96",
                                    "type": "uint160"
                                }
                            ],
                            "internalType": "struct IQuoterV2.QuoteExactInputSingleParams",
                            "name": "params",
                            "type": "tuple"
                        }
                    ],
                    "name": "quoteExactInputSingle",
                    "outputs": [
                        {
                            "internalType": "uint256",
                            "name": "amountOut",
                            "type": "uint256"
                        },
                        {
                            "internalType": "uint160",
                            "name": "sqrtPriceX96After",
                            "type": "uint160"
                        },
                        {
                            "internalType": "uint32",
                            "name": "initializedTicksCrossed",
                            "type": "uint32"
                        },
                        {
                            "internalType": "uint256",
                            "name": "gasEstimate",
                            "type": "uint256"
                        }
                    ],
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
            ];

            // 初始化合约实例
            const quoterContract = new web3.eth.Contract(QUOTER_ABI, this.v3Address);


            // 创建请求队列
            const pricePromises = tokenAddresses.map(async (token) => {
                const address = token.address
                try {
                    // 输入金额: 0.1个WBNB
                    const amountIn = new BN(10).pow(new BN(17));


                    const quoteExactInputSingleParams = {
                        tokenIn: WBNB_ADDRESS,
                        tokenOut: address,
                        amountIn: amountIn.toString(),
                        fee: 10000,
                        sqrtPriceLimitX96: 0,
                    }

                    // 调用Router的getAmountOut方法获取价格
                    const quoteResult = await quoterContract.methods.quoteExactInputSingle(quoteExactInputSingleParams).call();

                    // 获取输出金额 (BNB 数量)
                    const outputAmount = new Decimal(quoteResult[0]);

                    const tokenPrice = new TokenPrice(
                        address,
                        token.symbol,
                        outputAmount,
                        PRICE_SOURCE.PANCAKEV3,
                        PRICE_UNIT.TOKENPER01BNB
                    );

                    return [address.toLowerCase(), tokenPrice];
                } catch (error) {
                    logError(`从pancakeV3获取代币[${address}]相对BNB价格失败`, error);
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

            logInfo(`成功从PancakeSwap V3 Router获取${pricesMap.size}个代币相对BNB的价格`);
            return pricesMap;

        } catch (error) {
            logError('从PancakeSwap V3 Router获取代币相对BNB价格失败', error);
            throw error;
        }
    }

}