import { DataManager } from './core/data_manager.js';
import { EventManager } from './core/event_manager.js';
import { UIController } from './ui/ui_controller.js';
import { Logger } from './core/logger.js';
import { CharacterView } from './ui/views/CharacterView.js';
import { WorldView } from './ui/views/WorldView.js';
import { TerritoryView } from './ui/views/TerritoryView.js';
import { KeyboardManager } from './core/keyboard_manager.js';

export class StatusBarApp {
    constructor() {
        this.dataManager = new DataManager();
        this.eventManager = new EventManager();
        this.uiController = new UIController(this.dataManager);
        this.keyboardManager = new KeyboardManager();
        this.init();
    }

    async init() {
        // script.js has confirmed that core APIs are ready.
        try {
            Logger.log('[App] GS状态栏扩展开始初始化');
            Logger.log('[App] 版本: 1.0.0');
            Logger.log('[App] 环境: SillyTavern');
            
            // 1. Manually load the UI from the template.
            Logger.log('[App] 正在加载面板HTML...');
            await this.uiController.loadPanelHtml();
            Logger.success('[App] 面板HTML加载成功');

            // 2. Wait for the Mvu module to be available.
            const mvu = await this.waitForMvu();
            if (!mvu) {
                throw new Error('Mvu module is required but failed to load.');
            }

            // 3. Proceed with the rest of the initialization.
            Logger.log('[App] Initializing application logic...');
            
            this.uiController.cacheDOMElements();
            this.uiController.panelManager.initializeDOMElements();
            this.uiController.loadCache();
            this.uiController.bindListeners();
            
            // 设置地图标签回调
            this.uiController.panelManager.setMapTabCallback(() => {
                this.uiController.renderMap();
            });
            
            // 加载技能树和图床数据
            Logger.log('[App] Loading skill tree and image databases...');
            await this.uiController.skillTreeLoader.load();
            await this.uiController.imageDatabaseLoader.loadAll();
            
            await this.dataManager.loadAllData();
            
            this.uiController.renderAll();
            
            this.setupEventListeners();
            
            // 延迟设置键盘快捷键，确保 DOM 完全准备好
            setTimeout(() => {
                this.setupKeyboardShortcuts();
            }, 500);

            Logger.success('[App] GS Status Bar initialized successfully.');

        } catch (error) {
            Logger.error('[App] 初始化失败 - GS状态栏扩展无法启动', error);
            Logger.error('[App] 错误详情', error);
            
            // 尝试显示错误信息（即使面板可能没有加载）
            try {
                this.showError(error ? error.message : '发生未知错误');
            } catch (e) {
                // 如果连错误显示都失败了，至少记录到日志
                Logger.error('[App] 无法显示错误信息', e);
            }
        }
    }

    setupEventListeners() {
        Logger.log('Binding data update events...');

        this.eventManager.on('MESSAGE_RECEIVED', (data) => {
            Logger.log('Event: MESSAGE_RECEIVED, handling data update.');
            this.handleDataUpdate();
        });
        this.eventManager.on('MESSAGE_UPDATED', (data) => {
            Logger.log('Event: MESSAGE_UPDATED, handling data update.');
            this.handleDataUpdate();
        });
        this.eventManager.on('CHAT_CHANGED', () => {
            Logger.log('Event: CHAT_CHANGED, handling data update.');
            this.handleDataUpdate();
        });
        
        Logger.log('Data update events bound.');
    }

    /**
     * 智能切换标签页
     * - 如果面板关闭：打开面板并切换到指定标签
     * - 如果面板打开且在其他标签：切换到指定标签
     * - 如果面板打开且已在指定标签：关闭面板
     * 
     * @param {string} tabId - 标签 ID
     * @param {string} keyName - 按键名称（用于日志）
     */
    _smartToggleTab(tabId, keyName) {
        const pm = this.uiController.panelManager;
        const currentTab = pm.getCurrentTab();
        
        if (!pm.isPanelOpen) {
            // 面板关闭 → 打开并切换到指定标签
            Logger.log(`[App] ${keyName} 键：打开面板并切换到 ${tabId}`);
            pm.showPanel();
            setTimeout(() => pm.switchTab(tabId), 100);
        } else if (currentTab === tabId) {
            // 面板打开且已在当前标签 → 关闭面板
            Logger.log(`[App] ${keyName} 键：已在 ${tabId} 标签，关闭面板`);
            pm.hidePanel();
        } else {
            // 面板打开但在其他标签 → 切换到指定标签
            Logger.log(`[App] ${keyName} 键：从 ${currentTab} 切换到 ${tabId}`);
            pm.switchTab(tabId);
        }
    }

    setupKeyboardShortcuts() {
        Logger.log('[App] 设置键盘快捷键...');

        const pm = this.uiController.panelManager;

        // ESC 键：切换面板显示/隐藏
        this.keyboardManager.register('Escape', () => {
            Logger.log('[App] ESC 键被按下，切换面板状态');
            pm.togglePanel();
        }, {
            description: 'ESC - 切换面板显示/隐藏'
        });

        // F2 键：智能切换角色标签
        this.keyboardManager.register('F2', () => {
            this._smartToggleTab('status', 'F2');
        }, {
            description: 'F2 - 角色标签（再按关闭）'
        });

        // F3 键：智能切换世界标签
        this.keyboardManager.register('F3', () => {
            this._smartToggleTab('world', 'F3');
        }, {
            description: 'F3 - 世界标签（再按关闭）'
        });

        // E 键：智能切换装备栏
        this.keyboardManager.register('e', () => {
            this._smartToggleTab('inventory', 'E');
        }, {
            description: 'E - 装备栏（再按关闭）'
        });

        // M 键：智能切换地图
        this.keyboardManager.register('m', () => {
            this._smartToggleTab('map', 'M');
        }, {
            description: 'M - 地图（再按关闭）'
        });

        // J 键：智能切换任务日志
        this.keyboardManager.register('j', () => {
            this._smartToggleTab('tasks', 'J');
        }, {
            description: 'J - 任务日志（再按关闭）'
        });

        // K 键：智能切换技能树
        this.keyboardManager.register('k', () => {
            this._smartToggleTab('skill-tree', 'K');
        }, {
            description: 'K - 技能树（再按关闭）'
        });

        // 启动键盘监听
        this.keyboardManager.start();

        Logger.success('[App] 键盘快捷键设置完成');
        
        // 输出已注册的快捷键列表
        const shortcuts = this.keyboardManager.getRegisteredShortcuts();
        Logger.log('[App] 已注册的快捷键:');
        shortcuts.forEach(shortcut => {
            Logger.log(`  - ${shortcut.key}: ${shortcut.description}`);
        });
    }

    async handleDataUpdate() {
        try {
            await this.dataManager.loadAllData();
            this.uiController.renderAll();
        } catch (error) {
            Logger.error('Failed to update data and render UI.', error);
            this.showError(error.message);
        }
    }

    showError(message) {
        const container = window.parent.document.getElementById('gs-status-bar-panel-container');
        const rootEl = window.parent.document.getElementById('gs-status-bar-panel');
        
        if (container && rootEl) {
            rootEl.innerHTML = `
                <button id="gs-close-panel-button" class="modal-close-button">
                    <i class="fa-solid fa-xmark"></i>
                </button>
                <div class="error-display">
                    <div class="error-icon">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                    </div>
                    <h2 class="error-title">加载失败</h2>
                    <p class="error-message">${message}</p>
                    <div class="error-actions">
                        <button class="error-button" id="gs-app-error-reload">
                            <i class="fa-solid fa-rotate-right"></i>
                            重新加载扩展
                        </button>
                        <button class="error-button" onclick="location.reload()" style="background: rgba(255, 107, 107, 0.2); border-color: #ff6b6b;">
                            <i class="fa-solid fa-arrows-rotate"></i>
                            刷新页面
                        </button>
                    </div>
                </div>
            `;
            
            container.style.display = 'flex';
            rootEl.classList.add('visible');
            
            // 绑定关闭按钮
            const closeBtn = window.parent.document.getElementById('gs-close-panel-button');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    rootEl.classList.remove('visible');
                    setTimeout(() => {
                        container.style.display = 'none';
                    }, 300);
                });
            }
            
            // 绑定重新加载扩展按钮
            const reloadBtn = window.parent.document.getElementById('gs-app-error-reload');
            if (reloadBtn) {
                reloadBtn.addEventListener('click', async () => {
                    Logger.log('[App] 用户点击重新加载扩展按钮');
                    
                    // 关闭错误面板
                    rootEl.classList.remove('visible');
                    container.style.display = 'none';
                    
                    // 尝试重新初始化
                    try {
                        if (this.reinitialize) {
                            await this.reinitialize();
                            Logger.success('[App] 扩展重新加载成功');
                        } else {
                            Logger.error('[App] reinitialize 方法不可用');
                            alert('重新加载失败，请刷新页面');
                        }
                    } catch (error) {
                        Logger.error('[App] 扩展重新加载失败', error);
                        alert('重新加载失败: ' + error.message);
                    }
                });
            }
        }
    }

    getMvuInstance() {
        try {
            // Try current window
            if (window.Mvu) return window.Mvu;
            // Try parent window
            if (window.parent && window.parent.Mvu) return window.parent.Mvu;
            // Try top-level window
            if (window.top && window.top.Mvu) return window.top.Mvu;
            return null;
        } catch (error) {
            Logger.warn('[GS StatusBar] Could not access MVU:', error);
            return null;
        }
    }

    waitForMvu() {
        Logger.log('[App] 开始等待 Mvu 模块...');
        
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const pollInterval = 1000; // 1秒轮询间隔
            
            const interval = setInterval(() => {
                attempts++;
                const mvu = this.getMvuInstance();
                
                if (mvu) {
                    clearInterval(interval);
                    Logger.success(`[App] Mvu 模块已就绪 (尝试次数: ${attempts}, 耗时: ${attempts * pollInterval / 1000}秒)`);
                    
                    // 检查 Mvu 的关键方法
                    if (typeof mvu.getMvuData === 'function') {
                        Logger.success('[App] Mvu.getMvuData 方法可用');
                    } else {
                        Logger.warn('[App] Mvu.getMvuData 方法不可用');
                    }
                    
                    resolve(mvu);
                } else {
                    // 每次都记录，因为间隔已经是1秒了
                    Logger.log(`[App] 等待 Mvu 模块... (尝试 ${attempts}, 已等待 ${attempts * pollInterval / 1000}秒)`);
                }
            }, pollInterval);
        });
    }

    /**
     * 重新初始化应用（用于错误恢复）
     */
    async reinitialize() {
        Logger.log('[App] 开始重新初始化应用...');
        
        try {
            // 清除缓存
            if (this.uiController.renderCache) {
                this.uiController.renderCache.clear();
            }
            
            // 清除雷达图缓存
            if (this.uiController.characterView && this.uiController.characterView.clearRadarChartCache) {
                this.uiController.characterView.clearRadarChartCache();
            }
            
            // 重新等待 Mvu
            const mvu = await this.waitForMvu();
            if (!mvu) {
                throw new Error('Mvu 模块重新加载失败');
            }
            
            // 重新加载数据
            await this.dataManager.loadAllData();
            
            // 重新渲染
            this.uiController.renderAll();
            
            Logger.success('[App] 应用重新初始化成功');
            
            return true;
        } catch (error) {
            Logger.error('[App] 应用重新初始化失败', error);
            throw error;
        }
    }
}