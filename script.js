'use strict';

(function () {
    const parentWin = window.parent;
    
    // 早期日志记录（在 Logger 加载之前）
    const earlyLogs = [];
    function earlyLog(level, message, error = null) {
        const timestamp = new Date().toISOString();
        const logEntry = { timestamp, level, message, error };
        earlyLogs.push(logEntry);
        console.log(`[GS StatusBar] [${level}] ${message}`, error || '');
    }

    earlyLog('INFO', 'GS状态栏扩展开始加载');
    earlyLog('INFO', 'script.js 版本: 2.0 (支持扩展级重新加载)');
    earlyLog('INFO', `当前时间: ${new Date().toLocaleString('zh-CN')}`);

    function areApisReady() {
        const st = parentWin?.SillyTavern;
        const ready = !!(
            st &&
            parentWin.TavernHelper &&
            parentWin.jQuery &&
            st.getContext &&
            st.getContext().eventSource
        );
        
        if (!ready) {
            // 记录缺失的 API
            const missing = [];
            if (!st) missing.push('SillyTavern');
            if (!parentWin.TavernHelper) missing.push('TavernHelper');
            if (!parentWin.jQuery) missing.push('jQuery');
            if (!st?.getContext) missing.push('SillyTavern.getContext');
            if (!st?.getContext()?.eventSource) missing.push('eventSource');
            
            if (missing.length > 0) {
                earlyLog('WARN', `等待 API 就绪，缺失: ${missing.join(', ')}`);
            }
        }
        
        return ready;
    }

    let checkCount = 0;
    const maxChecks = 120; // 30秒超时 (120 * 250ms)
    
    const apiReadyInterval = setInterval(() => {
        checkCount++;
        
        if (areApisReady()) {
            clearInterval(apiReadyInterval);
            earlyLog('SUCCESS', `核心 API 已就绪 (检查次数: ${checkCount})`);
            earlyLog('INFO', '开始加载主应用程序...');
            
            import('./app.js')
                .then(({ StatusBarApp }) => {
                    earlyLog('SUCCESS', 'app.js 模块加载成功');
                    const app = new StatusBarApp();
                    
                    // 将应用实例和早期日志暴露到全局
                    parentWin.gsStatusBarApp = app;
                    parentWin.gsStatusBarEarlyLogs = earlyLogs;
                    
                    // 将早期日志导入到 Logger 系统
                    if (app.dataManager) {
                        import('./core/logger.js').then(({ Logger }) => {
                            earlyLogs.forEach(log => {
                                Logger._addLog(log.level, log.message, log.error);
                            });
                            earlyLog('INFO', `已导入 ${earlyLogs.length} 条早期日志到日志系统`);
                        });
                    }
                    
                    earlyLog('SUCCESS', '应用实例已暴露为 window.gsStatusBarApp');
                })
                .catch(error => {
                    earlyLog('ERROR', '加载或实例化 app.js 失败', error);
                    showErrorPanel('应用加载失败', error, earlyLogs);
                });
        } else if (checkCount >= maxChecks) {
            clearInterval(apiReadyInterval);
            const error = new Error(`API 初始化超时 (等待了 ${maxChecks * 250 / 1000} 秒)`);
            earlyLog('ERROR', 'API 初始化超时', error);
            showErrorPanel('API 初始化超时', error, earlyLogs);
        }
    }, 250);
    
    /**
     * 显示错误面板（即使主应用未加载）
     */
    function showErrorPanel(title, error, logs) {
        const container = parentWin.document.createElement('div');
        container.id = 'gs-error-panel';
        container.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 600px;
            max-width: 90vw;
            max-height: 80vh;
            background: linear-gradient(165deg, #1a234f, #3c2a4d);
            border: 2px solid #ff6b6b;
            border-radius: 12px;
            padding: 30px;
            z-index: 10000;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            color: #e0d6c8;
            font-family: Arial, sans-serif;
            overflow-y: auto;
        `;
        
        const logsText = logs.map(log => 
            `[${log.timestamp}] [${log.level}] ${log.message}${log.error ? '\n  错误: ' + log.error.message : ''}`
        ).join('\n');
        
        container.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <div style="font-size: 48px; color: #ff6b6b; margin-bottom: 10px;">⚠️</div>
                <h2 style="margin: 0; color: #ff6b6b;">${title}</h2>
            </div>
            
            <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <strong style="color: #ff6b6b;">错误信息:</strong>
                <pre style="margin: 10px 0 0 0; white-space: pre-wrap; word-break: break-word;">${error.message}</pre>
            </div>
            
            <details style="margin-bottom: 20px;">
                <summary style="cursor: pointer; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 6px; user-select: none;">
                    查看详细日志 (${logs.length} 条)
                </summary>
                <pre style="margin: 10px 0 0 0; padding: 15px; background: rgba(0,0,0,0.3); border-radius: 6px; max-height: 300px; overflow-y: auto; font-size: 12px; line-height: 1.5; white-space: pre-wrap; word-break: break-all;">${logsText}</pre>
            </details>
            
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button id="gs-error-reload" style="padding: 12px 24px; background: #a8c0ff; color: #1a234f; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px;">
                    🔄 重新加载
                </button>
                <button id="gs-error-copy" style="padding: 12px 24px; background: rgba(168, 192, 255, 0.2); color: #a8c0ff; border: 1px solid #a8c0ff; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px;">
                    📋 复制日志
                </button>
                <button id="gs-error-close" style="padding: 12px 24px; background: rgba(255, 107, 107, 0.2); color: #ff6b6b; border: 1px solid #ff6b6b; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px;">
                    ✕ 关闭
                </button>
            </div>
        `;
        
        parentWin.document.body.appendChild(container);
        
        // 绑定按钮事件
        parentWin.document.getElementById('gs-error-reload').addEventListener('click', () => {
            earlyLog('INFO', '========== 用户点击重新加载按钮 ==========');
            earlyLog('INFO', '这是扩展级重新加载，不会刷新浏览器');
            container.remove();
            
            // 清理现有实例
            if (parentWin.gsStatusBarApp) {
                earlyLog('INFO', '清理现有应用实例');
                delete parentWin.gsStatusBarApp;
            }
            
            // 移除现有面板
            const existingPanel = parentWin.document.getElementById('gs-status-bar-panel-container');
            if (existingPanel) {
                existingPanel.remove();
                earlyLog('INFO', '已移除现有面板');
            }
            
            // 重新开始初始化
            earlyLog('INFO', '开始重新初始化...');
            checkCount = 0;
            
            const retryInterval = setInterval(() => {
                checkCount++;
                
                if (areApisReady()) {
                    clearInterval(retryInterval);
                    earlyLog('SUCCESS', `核心 API 已就绪 (检查次数: ${checkCount})`);
                    earlyLog('INFO', '开始加载主应用程序...');
                    
                    import('./app.js')
                        .then(({ StatusBarApp }) => {
                            earlyLog('SUCCESS', 'app.js 模块加载成功');
                            const app = new StatusBarApp();
                            
                            parentWin.gsStatusBarApp = app;
                            parentWin.gsStatusBarEarlyLogs = earlyLogs;
                            
                            // 导入早期日志
                            if (app.dataManager) {
                                import('./core/logger.js').then(({ Logger }) => {
                                    earlyLogs.forEach(log => {
                                        Logger._addLog(log.level, log.message, log.error);
                                    });
                                    earlyLog('INFO', `已导入 ${earlyLogs.length} 条早期日志到日志系统`);
                                });
                            }
                            
                            earlyLog('SUCCESS', '应用实例已暴露为 window.gsStatusBarApp');
                        })
                        .catch(error => {
                            earlyLog('ERROR', '加载或实例化 app.js 失败', error);
                            showErrorPanel('应用加载失败', error, earlyLogs);
                        });
                } else if (checkCount >= maxChecks) {
                    clearInterval(retryInterval);
                    const error = new Error(`API 初始化超时 (等待了 ${maxChecks * 250 / 1000} 秒)`);
                    earlyLog('ERROR', 'API 初始化超时', error);
                    showErrorPanel('API 初始化超时', error, earlyLogs);
                }
            }, 250);
        });
        
        parentWin.document.getElementById('gs-error-copy').addEventListener('click', () => {
            navigator.clipboard.writeText(logsText).then(() => {
                alert('日志已复制到剪贴板');
            }).catch(err => {
                console.error('复制失败:', err);
                alert('复制失败，请手动选择并复制日志内容');
            });
        });
        
        parentWin.document.getElementById('gs-error-close').addEventListener('click', () => {
            container.remove();
        });
    }
})();
