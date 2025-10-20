import { Logger } from '../core/logger.js';
import { createGenieAnimator } from '../utils/genie_animator.js';

export class PanelManager {
    constructor() {
        this.panelContainer = null;
        this.panel = null;
        this.openButton = null;
        this.closeButton = null;
        this.navButtons = [];
        this.tabPanes = [];
        this.isPanelOpen = false;
        this.genieAnimator = null;
    }

    initializeDOMElements() {
        const doc = window.parent.document;
        this.panelContainer = doc.getElementById('gs-status-bar-panel-container');
        this.panel = doc.getElementById('gs-status-bar-panel');
        this.openButton = doc.getElementById('gs-open-panel-button');
        this.closeButton = doc.getElementById('gs-close-panel-button');
        this.navButtons = Array.from(doc.querySelectorAll('.top-nav .nav-button'));
        this.tabPanes = Array.from(doc.querySelectorAll('.content-area .tab-pane'));

        if (!this.panelContainer || !this.openButton || !this.closeButton) {
            Logger.error('PanelManager: One or more essential UI elements are missing from the DOM.');
            return false;
        }
        
        // 初始化Genie动画器
        this.genieAnimator = createGenieAnimator();
        if (!this.genieAnimator) {
            Logger.warn('PanelManager: Genie animator not initialized, falling back to simple animations');
        }
        
        return true;
    }

    bindListeners() {
        Logger.log('[PanelManager] Binding listeners...');
        
        if (!this.openButton || !this.closeButton) {
            Logger.error('Cannot bind listeners: open/close buttons not found.');
            return;
        }

        // 开关按钮：切换面板显示/隐藏
        this.openButton.addEventListener('click', () => this.togglePanel());
        this.closeButton.addEventListener('click', () => this.hidePanel());

        Logger.log(`[PanelManager] Found ${this.navButtons.length} nav buttons`);
        
        this.navButtons.forEach((button, index) => {
            const tabId = button.dataset.tab;
            Logger.log(`[PanelManager] Binding button [${index}]: ${tabId}`);
            
            // 点击事件
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                Logger.log(`[PanelManager] Nav button clicked: ${tabId}`);
                this.switchTab(tabId);
            });
            
            // 触摸事件（移动端）
            if ('ontouchstart' in window) {
                button.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    Logger.log(`[PanelManager] Nav button touched: ${tabId}`);
                    this.switchTab(tabId);
                });
            }
        });
        
        Logger.success('[PanelManager] All listeners bound');
    }

    async togglePanel() {
        if (this.genieAnimator && this.genieAnimator.animating) {
            Logger.log('Animation in progress, ignoring toggle');
            return;
        }
        
        if (this.isPanelOpen) {
            await this.hidePanel();
        } else {
            await this.showPanel();
        }
    }

    async showPanel() {
        if (this.genieAnimator) {
            // 使用Genie动画
            await this.genieAnimator.open();
            this.isPanelOpen = true;
            this.updateToggleButton();
            Logger.log('Panel opened with Genie effect.');
        } else {
            // 回退到简单动画
            if (this.panelContainer && this.panel) {
                this.panelContainer.style.display = 'flex';
                setTimeout(() => {
                    this.panel.classList.add('visible');
                }, 10);
                this.isPanelOpen = true;
                this.updateToggleButton();
                Logger.log('Panel opened.');
            }
        }
    }

    async hidePanel() {
        if (this.genieAnimator) {
            // 使用Genie动画
            await this.genieAnimator.close();
            this.isPanelOpen = false;
            this.updateToggleButton();
            Logger.log('Panel closed with Genie effect.');
        } else {
            // 回退到简单动画
            if (this.panelContainer && this.panel) {
                this.panel.classList.remove('visible');
                setTimeout(() => {
                    this.panelContainer.style.display = 'none';
                }, 300);
                this.isPanelOpen = false;
                this.updateToggleButton();
                Logger.log('Panel closed.');
            }
        }
    }

    updateToggleButton() {
        // 不需要更新按钮样式，保持统一的蓝色骰子图标
        // 用户可以通过点击同一个按钮来切换面板
    }

    switchTab(tabId) {
        this.navButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.tab === tabId);
        });

        this.tabPanes.forEach(pane => {
            pane.classList.toggle('active', pane.id === `${tabId}-pane`);
        });
        
        // 触发地图渲染（如果切换到地图标签）
        if (tabId === 'map' && this.onMapTabActivated) {
            this.onMapTabActivated();
        }
        
        // 触发设置界面渲染（如果切换到设置标签）
        if (tabId === 'settings' && this.onSettingsTabActivated) {
            this.onSettingsTabActivated();
        }
        
        Logger.log(`Switched to tab: ${tabId}`);
    }

    /**
     * 获取当前激活的标签 ID
     * @returns {string|null} 当前激活的标签 ID，如果没有则返回 null
     */
    getCurrentTab() {
        const activeButton = this.navButtons.find(button => button.classList.contains('active'));
        return activeButton ? activeButton.dataset.tab : null;
    }

    setMapTabCallback(callback) {
        this.onMapTabActivated = callback;
    }

    setSettingsTabCallback(callback) {
        this.onSettingsTabActivated = callback;
    }
}