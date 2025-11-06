import { Logger } from '../../core/logger.js';

/**
 * 日志视图 - 在面板内显示日志
 */
export class LogView {
    constructor(elements) {
        this.elements = elements;
        this.filterLevel = 'ALL'; // ALL, INFO, SUCCESS, WARN, ERROR
        this.autoScroll = true;
        this.logUpdateListener = null;
    }

    render() {
        if (!this.elements.logsContent) {
            console.error('[LogView] logsContent element not found!');
            return;
        }

        const logs = Logger.getLogs();
        const filteredLogs = this.filterLevel === 'ALL' 
            ? logs 
            : logs.filter(log => log.level === this.filterLevel);

        const html = `
            <div class="logs-container">
                <div class="logs-header">
                    <h2>开发者日志</h2>
                    <div class="logs-stats">
                        <span class="stat-item">
                            <i class="fa-solid fa-circle-info"></i>
                            总计: ${logs.length}
                        </span>
                        <span class="stat-item error">
                            <i class="fa-solid fa-circle-exclamation"></i>
                            错误: ${Logger.getLogsByLevel('ERROR').length}
                        </span>
                        <span class="stat-item warn">
                            <i class="fa-solid fa-triangle-exclamation"></i>
                            警告: ${Logger.getLogsByLevel('WARN').length}
                        </span>
                    </div>
                </div>

                <div class="logs-toolbar">
                    <div class="logs-filters">
                        <button class="filter-btn ${this.filterLevel === 'ALL' ? 'active' : ''}" data-level="ALL">
                            <i class="fa-solid fa-list"></i> 全部
                        </button>
                        <button class="filter-btn ${this.filterLevel === 'INFO' ? 'active' : ''}" data-level="INFO">
                            <i class="fa-solid fa-circle-info"></i> 信息
                        </button>
                        <button class="filter-btn ${this.filterLevel === 'SUCCESS' ? 'active' : ''}" data-level="SUCCESS">
                            <i class="fa-solid fa-circle-check"></i> 成功
                        </button>
                        <button class="filter-btn ${this.filterLevel === 'WARN' ? 'active' : ''}" data-level="WARN">
                            <i class="fa-solid fa-triangle-exclamation"></i> 警告
                        </button>
                        <button class="filter-btn ${this.filterLevel === 'ERROR' ? 'active' : ''}" data-level="ERROR">
                            <i class="fa-solid fa-circle-exclamation"></i> 错误
                        </button>
                    </div>
                    <div class="logs-actions">
                        <button class="action-btn" id="copy-logs-btn">
                            <i class="fa-solid fa-copy"></i> 复制全部
                        </button>
                        <button class="action-btn" id="clear-logs-btn">
                            <i class="fa-solid fa-trash"></i> 清空
                        </button>
                        <label class="auto-scroll-toggle">
                            <input type="checkbox" id="auto-scroll-checkbox" ${this.autoScroll ? 'checked' : ''}>
                            <span>自动滚动</span>
                        </label>
                    </div>
                </div>

                <div class="logs-list" id="logs-list">
                    ${filteredLogs.length === 0 
                        ? '<div class="no-logs">暂无日志</div>' 
                        : filteredLogs.map(log => this.renderLogEntry(log)).join('')
                    }
                </div>
            </div>
        `;

        this.elements.logsContent.innerHTML = html;
        this.attachEventListeners();
        
        // 自动滚动到底部
        if (this.autoScroll) {
            this.scrollToBottom();
        }

        // 添加实时更新监听器
        this.setupRealtimeUpdates();
    }

    renderLogEntry(log) {
        const time = new Date(log.timestamp).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });

        const levelClass = log.level.toLowerCase();
        const icon = this.getLevelIcon(log.level);

        let errorDetails = '';
        if (log.error) {
            errorDetails = `
                <div class="log-error-details">
                    <div class="error-message">
                        <strong>错误信息:</strong> ${this.escapeHtml(log.error.message)}
                    </div>
                    ${log.error.stack ? `
                        <details class="error-stack">
                            <summary>查看堆栈跟踪</summary>
                            <pre>${this.escapeHtml(log.error.stack)}</pre>
                        </details>
                    ` : ''}
                </div>
            `;
        }

        return `
            <div class="log-entry log-${levelClass}">
                <div class="log-header">
                    <span class="log-time">${time}</span>
                    <span class="log-level">
                        <i class="${icon}"></i>
                        ${log.level}
                    </span>
                </div>
                <div class="log-message">${this.escapeHtml(log.message)}</div>
                ${errorDetails}
            </div>
        `;
    }

    getLevelIcon(level) {
        const icons = {
            'INFO': 'fa-solid fa-circle-info',
            'SUCCESS': 'fa-solid fa-circle-check',
            'WARN': 'fa-solid fa-triangle-exclamation',
            'ERROR': 'fa-solid fa-circle-exclamation'
        };
        return icons[level] || 'fa-solid fa-circle';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    attachEventListeners() {
        // 过滤按钮
        const filterBtns = this.elements.logsContent.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.filterLevel = btn.dataset.level;
                this.render();
            });
        });

        // 复制按钮
        const copyBtn = this.elements.logsContent.querySelector('#copy-logs-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copyLogs());
        }

        // 清空按钮
        const clearBtn = this.elements.logsContent.querySelector('#clear-logs-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearLogs());
        }

        // 自动滚动开关
        const autoScrollCheckbox = this.elements.logsContent.querySelector('#auto-scroll-checkbox');
        if (autoScrollCheckbox) {
            autoScrollCheckbox.addEventListener('change', (e) => {
                this.autoScroll = e.target.checked;
                if (this.autoScroll) {
                    this.scrollToBottom();
                }
            });
        }
    }

    setupRealtimeUpdates() {
        // 移除旧的监听器
        if (this.logUpdateListener) {
            Logger.removeListener(this.logUpdateListener);
        }

        // 添加新的监听器
        this.logUpdateListener = (logEntry) => {
            if (logEntry.type === 'clear') {
                this.render();
                return;
            }

            // 检查是否需要显示这条日志
            if (this.filterLevel !== 'ALL' && logEntry.level !== this.filterLevel) {
                return;
            }

            // 添加新日志到列表
            const logsList = this.elements.logsContent.querySelector('#logs-list');
            if (logsList) {
                const noLogs = logsList.querySelector('.no-logs');
                if (noLogs) {
                    noLogs.remove();
                }

                const logHtml = this.renderLogEntry(logEntry);
                logsList.insertAdjacentHTML('beforeend', logHtml);

                // 自动滚动
                if (this.autoScroll) {
                    this.scrollToBottom();
                }

                // 更新统计
                this.updateStats();
            }
        };

        Logger.addListener(this.logUpdateListener);
    }

    updateStats() {
        const logs = Logger.getLogs();
        const statsHtml = `
            <span class="stat-item">
                <i class="fa-solid fa-circle-info"></i>
                总计: ${logs.length}
            </span>
            <span class="stat-item error">
                <i class="fa-solid fa-circle-exclamation"></i>
                错误: ${Logger.getLogsByLevel('ERROR').length}
            </span>
            <span class="stat-item warn">
                <i class="fa-solid fa-triangle-exclamation"></i>
                警告: ${Logger.getLogsByLevel('WARN').length}
            </span>
        `;
        
        const statsContainer = this.elements.logsContent.querySelector('.logs-stats');
        if (statsContainer) {
            statsContainer.innerHTML = statsHtml;
        }
    }

    scrollToBottom() {
        const logsList = this.elements.logsContent.querySelector('#logs-list');
        if (logsList) {
            logsList.scrollTop = logsList.scrollHeight;
        }
    }

    async copyLogs() {
        const logsText = Logger.exportLogs();
        
        try {
            await navigator.clipboard.writeText(logsText);
            
            // 显示成功提示
            const copyBtn = this.elements.logsContent.querySelector('#copy-logs-btn');
            if (copyBtn) {
                const originalHtml = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> 已复制';
                copyBtn.disabled = true;
                
                setTimeout(() => {
                    copyBtn.innerHTML = originalHtml;
                    copyBtn.disabled = false;
                }, 2000);
            }
            
            Logger.success('日志已复制到剪贴板');
        } catch (error) {
            Logger.error('复制日志失败', error);
            alert('复制失败，请手动选择并复制日志内容');
        }
    }

    clearLogs() {
        if (confirm('确定要清空所有日志吗？')) {
            Logger.clearLogs();
            this.render();
            Logger.success('日志已清空');
        }
    }

    destroy() {
        // 移除监听器
        if (this.logUpdateListener) {
            Logger.removeListener(this.logUpdateListener);
            this.logUpdateListener = null;
        }
    }
}
