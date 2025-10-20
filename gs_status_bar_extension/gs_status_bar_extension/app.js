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
            Logger.log('[App] Starting initialization...');
            
            // 1. Manually load the UI from the template.
            await this.uiController.loadPanelHtml();

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
            Logger.error('[App] Failed to initialize GS Status Bar.', error);
            this.showError(error ? error.message : 'An unknown error occurred.');
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
                        <button class="error-button" onclick="location.reload()">
                            <i class="fa-solid fa-rotate-right"></i>
                            重新加载
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
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 40; // 10 seconds
            const interval = setInterval(() => {
                const mvu = this.getMvuInstance();
                if (mvu) {
                    clearInterval(interval);
                    Logger.success("[App] Mvu is initialized.");
                    resolve(mvu);
                } else {
                    attempts++;
                    Logger.log(`[App] Waiting for Mvu... (Attempt ${attempts})`);
                    if (attempts >= maxAttempts) {
                        clearInterval(interval);
                        reject(new Error('Mvu module failed to load within the timeout period.'));
                    }
                }
            }, 250);
        });
    }
}