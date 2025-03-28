/**
 * 项目配置文件
 */
export default {
    // 基建服务配置
    pinkpunk: {
        endpoint: 'https://app-t.pinkpunk.io/newsdk/tokens-price',
        chainId: 56
    },

    // PancakeSwap GraphQL 配置
    pancakeswap: {
        endpoint: 'https://go.getblock.io/ba83819abeb1434983c7104351dadfb0',
    },

    // 监控配置
    monitoring: {
        // 监控间隔（毫秒）
        interval: 60 * 1000, // 默认1分钟
        // 价格偏差警告阈值（百分比）
        priceDeviationThreshold: 1.0,
        // 是否将结果记录到文件
        logToFile: true
    },

    // 要监控的代币列表
    tokens: [
        //高流动性
        {
            address: '0xc748673057861a797275CD8A068AbB95A902e8de',
            symbol: 'BabyDoge',
            decimals: 18,
            pool: 'pancakeV2'
        },
        //低流动性
        // {
        //     address: '0xCAAE2A2F939F51d97CdFa9A86e79e3F085b799f3',
        //     symbol: 'TUT',
        //     decimals: 18,
        //     pool: 'pancakeV2'
        // },
    ]
};