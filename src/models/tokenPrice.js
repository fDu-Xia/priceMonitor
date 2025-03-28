
export class TokenPrice {
    constructor(address, symbol, price, source, priceUnit = 'USD', timestamp = Date.now()) {
        this.address = address.toLowerCase();
        this.symbol = symbol;
        this.price = price; // BN
        this.source = source;
        this.priceUnit = priceUnit;
        this.timestamp = timestamp;
    }

    /**
     * 获取格式化的日期时间
     * @returns {string} 格式化的日期时间
     */
    getFormattedTime() {
        return new Date(this.timestamp).toISOString();
    }

    /**
     * 返回价格对象的字符串表示
     * @returns {string} 价格对象的字符串表示
     */
    toString() {
        let priceStr;
        if (typeof this.price === 'object' && typeof this.price.toFixed === 'function') {
            priceStr = this.price.toFixed(8);
        } else {
            priceStr = Number(this.price).toFixed(8);
        }

        return `${this.symbol}: ${priceStr} ${this.priceUnit} (来源: ${this.source}, 时间: ${this.getFormattedTime()})`;
    }
}

/**
 * 价格比较结果
 */
export class PriceComparisonResult {
    /**
     * 创建价格比较结果对象
     * @param {TokenPrice} pinkpunkPrice - 基建价格
     * @param {TokenPrice} pancakeswapPrice - PancakeSwap价格
     */
    constructor(pinkpunkPrice, pancakeswapPrice) {
        this.token = {
            address: pinkpunkPrice.address,
            symbol: pinkpunkPrice.symbol
        };
        this.pinkpunkPrice = pinkpunkPrice.usdPrice;
        this.pancakeswapPrice = pancakeswapPrice.usdPrice;
        this.timestamp = Date.now();

        // 计算偏差百分比
        if (pancakeswapPrice.usdPrice === 0) {
            this.deviationPercentage = null; // 避免除以零
        } else {
            const diff = pinkpunkPrice.usdPrice - pancakeswapPrice.usdPrice;
            this.deviationPercentage = (diff / pancakeswapPrice.usdPrice) * 100;
        }
    }

    /**
     * 检查偏差是否超过阈值
     * @param {number} threshold - 阈值百分比
     * @returns {boolean} 是否超过阈值
     */
    isAboveThreshold(threshold) {
        if (this.deviationPercentage === null) return false;
        return Math.abs(this.deviationPercentage) > threshold;
    }

    /**
     * 获取格式化的比较结果
     * @returns {string} 格式化的比较结果
     */
    getFormattedResult() {
        if (this.deviationPercentage === null) {
            return `${this.token.symbol}: PinkPunk价格 = $${this.pinkpunkPrice.toFixed(8)}, PancakeSwap价格 = $${this.pancakeswapPrice.toFixed(8)}, 偏差 = 无法计算`;
        }

        return `${this.token.symbol}: PinkPunk价格 = $${this.pinkpunkPrice.toFixed(8)}, PancakeSwap价格 = $${this.pancakeswapPrice.toFixed(8)}, 偏差 = ${this.deviationPercentage.toFixed(2)}%`;
    }
}