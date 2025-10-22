/**
 * 增强的日志系统
 * - 在内存中保存日志历史
 * - 支持面板内查看
 * - 减少控制台输出
 * - 提供一键复制功能
 */
export class Logger {
    static logs = [];
    static maxLogs = 500; // 最多保存500条日志
    static consoleEnabled = false; // 默认关闭控制台输出
    static listeners = []; // 日志更新监听器

    /**
     * 添加日志条目
     */
    static _addLog(level, message, error = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            error: error ? {
                message: error.message,
                stack: error.stack,
                name: error.name
            } : null
        };

        // 添加到日志数组
        this.logs.push(logEntry);

        // 限制日志数量
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // 通知监听器
        this.listeners.forEach(listener => {
            try {
                listener(logEntry);
            } catch (e) {
                // 避免监听器错误影响日志系统
            }
        });

        // 控制台输出（可选）
        if (this.consoleEnabled) {
            const prefix = `[GS StatusBar] ${level}:`;
            switch (level) {
                case 'ERROR':
                    console.error(prefix, message, error);
                    break;
                case 'WARN':
                    console.warn(prefix, message);
                    break;
                case 'SUCCESS':
                    console.info(prefix, message);
                    break;
                default:
                    console.log(prefix, message);
            }
        }
    }

    static log(message) {
        this._addLog('INFO', message);
    }

    static success(message) {
        this._addLog('SUCCESS', message);
    }

    static warn(message) {
        this._addLog('WARN', message);
    }

    static error(message, error) {
        this._addLog('ERROR', message, error);
    }

    /**
     * 获取所有日志
     */
    static getLogs() {
        return [...this.logs];
    }

    /**
     * 获取特定级别的日志
     */
    static getLogsByLevel(level) {
        return this.logs.filter(log => log.level === level);
    }

    /**
     * 清除所有日志
     */
    static clearLogs() {
        this.logs = [];
        this.listeners.forEach(listener => {
            try {
                listener({ type: 'clear' });
            } catch (e) {
                // 忽略错误
            }
        });
    }

    /**
     * 添加日志更新监听器
     */
    static addListener(callback) {
        this.listeners.push(callback);
    }

    /**
     * 移除日志更新监听器
     */
    static removeListener(callback) {
        const index = this.listeners.indexOf(callback);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    /**
     * 导出日志为文本
     */
    static exportLogs() {
        const lines = this.logs.map(log => {
            let line = `[${log.timestamp}] [${log.level}] ${log.message}`;
            if (log.error) {
                line += `\n  错误: ${log.error.message}`;
                if (log.error.stack) {
                    line += `\n  堆栈:\n${log.error.stack}`;
                }
            }
            return line;
        });
        return lines.join('\n');
    }

    /**
     * 启用/禁用控制台输出
     */
    static setConsoleEnabled(enabled) {
        this.consoleEnabled = enabled;
    }
}