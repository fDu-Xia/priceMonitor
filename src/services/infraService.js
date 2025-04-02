import axios from 'axios';
import config from '../../config.js';
import { TokenPrice } from '../models/tokenPrice.js';
import {BNB_ADDRESS, PRICE_SOURCE} from '../utils/constants.js';
import { logError, logInfo } from '../utils/logger.js';
import * as constants from "../utils/constants.js";
import Decimal from "decimal.js";
import BN from "bn.js";

/**
 * PinkPunk基建价格服务
 */
export default class InfraService {
    constructor() {
        this.endpoint = config.pinkpunk.endpoint;
        this.chainId = config.pinkpunk.chainId;
    }

    async getTokensPricesInBNB(tokenAddresses) {
        try {
            logInfo(`从infra获取${tokenAddresses.length}个代币的价格`);

            const addresses = tokenAddresses.map(token => token.address);

            const response = await axios.post(this.endpoint, {
                chainId: this.chainId,
                tokenAddresses: addresses
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            // 检查响应状态
            if (response.data.code !== 0) {
                logError('PinkPunk API错误:', response.data.msg);
                throw new Error(`API错误: ${response.data.msg}`);
            }

            // 处理结果
            const pricesMap = new Map();
            const tokensPrices = response.data.data.tokensPrice;

            // 获取BNB的USD价格
            let bnbPriceInUSD;
            if (tokensPrices[constants.BNB_ADDRESS]) {
                bnbPriceInUSD = new Decimal(tokensPrices[constants.BNB_ADDRESS]);
            } else if (tokensPrices[constants.WBNB_ADDRESS]) {
                // 如果没有BNB但有WBNB，也可以使用WBNB的价格
                bnbPriceInUSD = new Decimal(tokensPrices[constants.WBNB_ADDRESS]);
            } else {
                logError('获取并转换代币BNB价格失败:','获取BNB价格失败，无法计算代币的BNB价格');
            }

            logInfo(`当前BNB价格: $${bnbPriceInUSD.toString()}`);

            // 遍历返回的价格数据，转换为BNB价格
            Object.entries(tokensPrices).forEach(([address, usdPrice]) => {
                // 查找代币符号信息
                const tokenConfig = config.tokens.find(t =>
                    t.address.toLowerCase() === address.toLowerCase()
                );

                if (tokenConfig) {
                    // 转换为相对BNB的价格
                    const usdPriceDecimal = new Decimal(usdPrice);

                    // 如果BNB价格为0，避免除以0错误
                    let tokenPriceInBNB;
                    if (bnbPriceInUSD.isZero()) {
                        tokenPriceInBNB = new Decimal(0);
                    } else {
                        // 计算公式: tokenPriceInBNB = tokenPriceInUSD / bnbPriceInUSD
                        const tmp = usdPriceDecimal.dividedBy(bnbPriceInUSD);
                        tokenPriceInBNB = new Decimal(tmp.times(1000000000000000000))
                    }

                    // 创建代币价格对象，现在价格是以BNB为单位
                    const tokenPrice = new TokenPrice(
                        address,
                        tokenConfig.symbol,
                        tokenPriceInBNB,
                        PRICE_SOURCE.INFRA,
                        'BNB' // 添加一个标识，表示价格单位是BNB
                    );

                    pricesMap.set(address.toLowerCase(), tokenPrice);

                    logInfo(`代币 ${tokenConfig.symbol} 的BNB价格: ${tokenPriceInBNB.toString()}`);
                }
            });

            logInfo(`成功从infra获取并转换${pricesMap.size}个代币的BNB价格`);
            return pricesMap;

        } catch (error) {
            logError('获取并转换代币BNB价格失败', error);
            throw error;
        }
    }
}