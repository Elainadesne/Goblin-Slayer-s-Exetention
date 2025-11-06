import { Logger } from '../core/logger.js';
import { createGenieAnimator } from '../utils/genie_animator.js';
import { DraggablePanel } from '../utils/draggable_panel.js';

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
        this.draggablePanel = null;
    }

    initializeDOMElements() {
        const doc = window.parent.document;
        this.panelContainer = doc.getElementById('gs-status-bar-panel-container');
        this.panel = doc.getElementById('gs-status-bar-panel');
        this.openButton = doc.getElementById('gs-open-panel-button');
        this.closeButton = doc.getElementById('gs-close-panel-button');
        this.contextMenu = doc.getElementById('gs-button-context-menu');
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
        
        // 初始化可拖动面板
        if (this.panel) {
            this.draggablePanel = new DraggablePanel(this.panel, {
                minWidth: 280,
                minHeight: 400,
                defaultWidth: 900,
                defaultHeight: 700,
                narrowThreshold: 500,
                onResize: (isNarrow) => this._handleLayoutModeChange(isNarrow)
            });
            Logger.log('[PanelManager] 可拖动面板已初始化');
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
        
        // 右键菜单
        this.openButton.addEventListener('contextmenu', (e) => this.showContextMenu(e));
        
        // 点击其他地方关闭右键菜单
        window.parent.document.addEventListener('click', () => this.hideContextMenu());
        
        // 右键菜单项点击
        if (this.contextMenu) {
            this.contextMenu.addEventListener('click', (e) => {
                const item = e.target.closest('.context-menu-item');
                if (item) {
                    this.handleContextMenuAction(item.dataset.action);
                }
            });
        }

        Logger.log(`[PanelManager] Found ${this.navButtons.length} nav buttons`);
        
        this.navButtons.forEach((button, index) => {
            const tabId = button.dataset.tab;
            Logger.log(`[PanelManager] Binding button [${index}]: ${tabId}`);
            
            // 使用统一的处理函数
            const handleTabSwitch = (e) => {
                e.preventDefault();
                e.stopPropagation();
                Logger.log(`[PanelManager] Nav button activated: ${tabId} (${e.type})`);
                
                // 地图按钮特殊处理：打开全屏地图
                if (tabId === 'map') {
                    if (this.onMapButtonClick) {
                        this.onMapButtonClick();
                    }
                } else {
                    this.switchTab(tabId);
                }
            };
            
            // 移动端优先使用触摸事件
            if ('ontouchstart' in window) {
                let touchHandled = false;
                
                button.addEventListener('touchstart', (e) => {
                    touchHandled = false;
                }, { passive: true });
                
                button.addEventListener('touchend', (e) => {
                    if (!touchHandled) {
                        touchHandled = true;
                        handleTabSwitch(e);
                    }
                });
                
                // 仍然绑定 click 作为后备
                button.addEventListener('click', (e) => {
                    if (!touchHandled) {
                        handleTabSwitch(e);
                    }
                    touchHandled = false;
                });
            } else {
                // 桌面端只使用 click
                button.addEventListener('click', handleTabSwitch);
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
        // 触发数据刷新（在打开面板时）
        if (this.onPanelOpening) {
            this.onPanelOpening();
        }
        
        // 检测是否为移动端
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
            // 移动端：跳过Genie动画，直接显示
            if (this.panelContainer && this.panel) {
                this.panelContainer.style.display = 'flex';
                this.panelContainer.style.height = '100vh'; // 确保容器有足够高度
                this.panel.classList.add('visible');
                this.isPanelOpen = true;
                this.updateToggleButton();
                Logger.log('Panel opened (mobile, no animation).');
            }
        } else if (this.genieAnimator) {
            // PC端：使用Genie动画
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
        // 检测是否为移动端
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
            // 移动端：跳过Genie动画，直接隐藏
            if (this.panelContainer && this.panel) {
                this.panel.classList.remove('visible');
                setTimeout(() => {
                    this.panelContainer.style.display = 'none';
                }, 300);
                this.isPanelOpen = false;
                this.updateToggleButton();
                Logger.log('Panel closed (mobile, no animation).');
            }
        } else if (this.genieAnimator) {
            // PC端：使用Genie动画
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
        
        // 触发日志界面渲染（如果切换到日志标签）
        if (tabId === 'logs' && this.onLogsTabActivated) {
            this.onLogsTabActivated();
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

    setLogsTabCallback(callback) {
        this.onLogsTabActivated = callback;
    }

    setSettingsTabCallback(callback) {
        this.onSettingsTabActivated = callback;
    }

    /**
     * 显示右键菜单
     */
    showContextMenu(event) {
        event.preventDefault();
        event.stopPropagation();
        
        if (!this.contextMenu) return;
        
        // 显示菜单
        this.contextMenu.style.display = 'block';
        
        // 定位菜单
        const x = event.clientX;
        const y = event.clientY;
        
        // 确保菜单不会超出屏幕
        const menuRect = this.contextMenu.getBoundingClientRect();
        const viewportWidth = window.parent.innerWidth;
        const viewportHeight = window.parent.innerHeight;
        
        let left = x;
        let top = y;
        
        if (x + menuRect.width > viewportWidth) {
            left = viewportWidth - menuRect.width - 10;
        }
        
        if (y + menuRect.height > viewportHeight) {
            top = viewportHeight - menuRect.height - 10;
        }
        
        this.contextMenu.style.left = `${left}px`;
        this.contextMenu.style.top = `${top}px`;
        
        Logger.log('[PanelManager] Context menu opened');
    }

    /**
     * 隐藏右键菜单
     */
    hideContextMenu() {
        if (this.contextMenu) {
            this.contextMenu.style.display = 'none';
        }
    }

    /**
     * 处理右键菜单操作
     */
    handleContextMenuAction(action) {
        this.hideContextMenu();
        
        Logger.log(`[PanelManager] Context menu action: ${action}`);
        
        switch (action) {
            case 'reload-data':
                if (this.onReloadData) {
                    this.onReloadData();
                }
                break;
            case 'open-logs':
                this.showPanel();
                setTimeout(() => this.switchTab('logs'), 100);
                break;
            case 'toggle-console':
                if (this.onToggleConsole) {
                    this.onToggleConsole();
                }
                break;
        }
    }

    /**
     * 设置重新加载数据的回调
     */
    setReloadDataCallback(callback) {
        this.onReloadData = callback;
    }

    /**
     * 设置切换控制台输出的回调
     */
    setToggleConsoleCallback(callback) {
        this.onToggleConsole = callback;
    }

    /**
     * 设置面板打开时的回调（用于触发数据刷新）
     */
    setPanelOpeningCallback(callback) {
        this.onPanelOpening = callback;
    }

    /**
     * 设置地图按钮点击的回调
     */
    setMapButtonCallback(callback) {
        this.onMapButtonClick = callback;
    }

    /**
     * 处理布局模式变化
     */
    _handleLayoutModeChange(isNarrow) {
        Logger.log(`[PanelManager] 布局模式变化: ${isNarrow ? '窄屏' : '正常'}`);
        
        // 可以在这里触发UI重新渲染或调整
        if (this.onLayoutModeChange) {
            this.onLayoutModeChange(isNarrow);
        }
    }

    /**
     * 设置布局模式变化的回调
     */
    setLayoutModeChangeCallback(callback) {
        this.onLayoutModeChange = callback;
    }

    /**
     * 重置面板位置和大小
     */
    resetPanelPosition() {
        if (this.draggablePanel) {
            this.draggablePanel.reset();
            Logger.log('[PanelManager] 面板位置已重置');
        }
    }
}