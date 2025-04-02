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
        // {
        //     address: '0xc748673057861a797275CD8A068AbB95A902e8de',
        //     symbol: 'BabyDoge',
        //     decimals: 9,
        //     pool: 'pancakeV2'
        // },
        // {
        //     address: '0x6894CDe390a3f51155ea41Ed24a33A4827d3063D',
        //     symbol: 'CAT',
        //     decimals: 18,
        //     pool: 'pancakeV2'
        // },
        // {
        //     address: '0x9eC02756A559700d8D9e79ECe56809f7bcC5dC27',
        //     symbol: 'WHY',
        //     decimals: 18,
        //     pool: 'pancakeV3'
        // },
        // {
        //     address: '0x6d5AD1592ed9D6D1dF9b93c793AB759573Ed6714',
        //     symbol: 'Broccoli',
        //     decimals: 18,
        //     pool: 'pancakeV3'
        // },
        // // //低流动性
        // {
        //     address: '0xCAAE2A2F939F51d97CdFa9A86e79e3F085b799f3',
        //     symbol: 'TUT',
        //     decimals: 18,
        //     pool: 'pancakeV2'
        // },
        // //低流动性低VOL
        // {
        //     address: '0xd5eaAaC47bD1993d661bc087E15dfb079a7f3C19',
        //     symbol: 'KOMA',
        //     decimals: 18,
        //     pool: 'pancakeV3'
        // },
        // //低流动性高VOL
        // {
        //     address: '0xcCe08BeFb7640357166932399311a434e54799c5',
        //     symbol: 'MUPPETS',
        //     decimals: 18,
        //     pool: 'pancakeV2'
        // },
        // {
        //     address: '0x83750D6254f83C320c015df1aEeC663977AeCA48',
        //     symbol: 'YELLOW',
        //     decimals: 18,
        //     pool: 'pancakeV3'
        // },
        // //低VOL
        // {
        //     address: '0xE9Ff81d70aa9319134748c1628b6768e8F281F19',
        //     symbol: 'PUPX',
        //     decimals: 18,
        //     pool: 'pancakeV2'
        // },
        //fourMeme
        // {
        //     address: '0x27a45d40dc26977341d87e6de1346b877da54444',
        //     symbol: 'LFG',
        //     decimals: 18,
        //     pool: 'fourMeme'
        // }
        //uniswap
        {
            address: '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82',
            symbol: 'Cake',
            decimals: 18,
            pool: 'uniswapV3'
        }
    ]
};