// 渲染缓存管理器 - 避免重复渲染

export class RenderCache {
    constructor(maxSize = 20) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.accessOrder = [];
    }

    /**
     * 生成缓存键
     */
    generateKey(view, ...params) {
        return `${view}:${params.join(':')}`;
    }

    /**
     * 获取缓存
     */
    get(key) {
        if (this.cache.has(key)) {
            // 更新访问顺序（LRU）
            this.updateAccessOrder(key);
            return this.cache.get(key);
        }
        return null;
    }

    /**
     * 设置缓存
     */
    set(key, value) {
        // 如果缓存已满，删除最久未使用的
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            const oldestKey = this.accessOrder.shift();
            this.cache.delete(oldestKey);
        }

        this.cache.set(key, {
            html: value,
            timestamp: Date.now()
        });

        this.updateAccessOrder(key);
    }

    /**
     * 更新访问顺序
     */
    updateAccessOrder(key) {
        // 移除旧的位置
        const index = this.accessOrder.indexOf(key);
        if (index > -1) {
            this.accessOrder.splice(index, 1);
        }
        // 添加到末尾（最近使用）
        this.accessOrder.push(key);
    }

    /**
     * 清除特定缓存
     */
    clear(key) {
        this.cache.delete(key);
        const index = this.accessOrder.indexOf(key);
        if (index > -1) {
            this.accessOrder.splice(index, 1);
        }
    }

    /**
     * 清除所有缓存
     */
    clearAll() {
        this.cache.clear();
        this.accessOrder = [];
    }

    /**
     * 清除过期缓存（超过指定时间）
     */
    clearExpired(maxAge = 5 * 60 * 1000) { // 默认5分钟
        const now = Date.now();
        const keysToDelete = [];

        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > maxAge) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => this.clear(key));
    }

    /**
     * 获取缓存统计
     */
    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            keys: Array.from(this.cache.keys()),
            oldestKey: this.accessOrder[0],
            newestKey: this.accessOrder[this.accessOrder.length - 1]
        };
    }
}
