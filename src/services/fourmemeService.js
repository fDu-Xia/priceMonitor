import {logError, logInfo} from "../utils/logger.js";
import axios from "axios";
import Decimal from "decimal.js";
import {web3} from "../index.js";
import {TokenPrice} from "../models/tokenPrice.js";
import {PRICE_SOURCE, PRICE_UNIT} from "../utils/constants.js";

const tokenMangerHelperABI = [
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "token",
                "type": "address"
            }
        ],
        "name": "getTokenInfo",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "version",
                "type": "uint256"
            },
            {
                "internalType": "address",
                "name": "tokenManager",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "quote",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "lastPrice",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "tradingFeeRate",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "minTradingFee",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "launchTime",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "offers",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "maxOffers",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "funds",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "maxFunds",
                "type": "uint256"
            },
            {
                "internalType": "bool",
                "name": "liquidityAdded",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
]

const tokenManagerHelperAddress = '0xF251F83e40a78868FcfA3FA4599Dad6494E46034';

export default class FourMemeService {
    async getTokensPrices(tokenAddresses) {
        const tokenManagerHelper = new web3.eth.Contract(tokenMangerHelperABI, tokenManagerHelperAddress);
        try {
            logInfo(`从fourMeme获取${tokenAddresses.length}个代币的价格`);
            // 创建请求队列
            const pricePromises = tokenAddresses.map(async (token) => {
                const address = token.address;
                try {
                    const result = await tokenManagerHelper.methods.getTokenInfo(address).call();
                    const price = new Decimal(result[3])
                    const tokenPrice = new TokenPrice(
                        address,
                        token.symbol,
                        price,
                        PRICE_SOURCE.FOURMEME,
                        PRICE_UNIT.BNB
                    );

                    return [address.toLowerCase(), tokenPrice];
                } catch (error) {
                    logError(`从fourMeme获取代币[${address}]相对BNB价格失败`, error);
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

            logInfo(`成功从fourMeme获取${pricesMap.size}个代币相对BNB的价格`);
            return pricesMap;

        } catch (error) {
            logError('获取并转换代币BNB价格失败', error);
            throw error;
        }
    }
}