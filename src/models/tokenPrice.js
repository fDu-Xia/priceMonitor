
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