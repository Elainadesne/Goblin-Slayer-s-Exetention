import { PanelManager } from './panel_manager.js';
import { SidebarManager } from './sidebar_manager.js';
import { Logger } from '../core/logger.js';
import { CharacterView } from './views/CharacterView.js';
import { WorldView } from './views/WorldView.js';
import { TerritoryView } from './views/TerritoryView.js';
import { MapView } from './views/MapView.js';
import { TaskView } from './views/TaskView.js';
import { SkillTreeView } from './views/SkillTreeView.js';
import { SettingsView } from './views/SettingsView.js';
import { LogView } from './views/LogView.js';
import { SkillTreeLoader } from '../core/skill_tree_loader.js';
import { ImageDatabaseLoader } from '../core/image_database_loader.js';
import { InventoryFilter } from '../utils/inventory_filter.js';
import { RenderCache } from '../utils/render_cache.js';
import { globalLazyLoader } from '../utils/lazy_load.js';
import { CharacterSearch } from '../utils/character_search.js';

export class UIController {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.panelManager = new PanelManager();
        this.sidebarManager = null; // Will be initialized after DOM is ready
        this.elements = {};
        this.cache = { collapsedCards: {}, hiddenEnemies: [], hiddenStatuses: [], hiddenTasks: [] };

        // 初始化加载器
        this.skillTreeLoader = new SkillTreeLoader();
        this.imageDatabaseLoader = new ImageDatabaseLoader();
        
        // 初始化工具
        this.inventoryFilter = new InventoryFilter();
        this.renderCache = new RenderCache(30); // 缓存最多30个视图
        this.characterSearch = new CharacterSearch();

        // 初始化视图
        this.characterView = new CharacterView(this.dataManager, this.elements);
        this.worldView = new WorldView(this.dataManager, this.elements);
        this.territoryView = new TerritoryView(this.dataManager, this.elements);
        this.mapView = new MapView(this.dataManager, this.elements);
        this.taskView = new TaskView(this.dataManager, this.elements);
        this.skillTreeView = null; // 延迟初始化
        this.settingsView = new SettingsView(this.dataManager, this.elements);
        this.logView = new LogView(this.elements);

        this._boundDetailsToggleHandler = this._handleDetailsToggle.bind(this);
    }

    async loadPanelHtml() {
        const parentDoc = window.parent.document;
        const body = parentDoc.body;

        // Manually inject CSS using a robust relative path
        if (!parentDoc.getElementById('gs-statusbar-css')) {
            const cssUrl = new URL('../css/base.css', import.meta.url).href;
            const link = document.createElement('link');
            link.id = 'gs-statusbar-css';
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = cssUrl;
            parentDoc.head.appendChild(link);
            Logger.log(`Manually injected CSS: ${cssUrl}`);
        }

        if (body.querySelector('#gs-status-bar-panel-container')) {
            Logger.log('Panel HTML already exists, skipping load.');
            return;
        }
        try {
            Logger.log('Fetching panel.html...');
            const panelUrl = new URL('../panel.html', import.meta.url).href;
            const response = await fetch(panelUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch panel.html: ${response.statusText}`);
            }
            const panelHtml = await response.text();
            body.insertAdjacentHTML('beforeend', panelHtml);
            Logger.success('Panel HTML loaded and injected successfully.');
        } catch (error) {
            Logger.error('Fatal: Could not load or inject panel HTML.', error);
        }
    }

    cacheDOMElements() {
        const doc = window.parent.document;
        this.elements = {
            root: doc.getElementById('gs-status-bar-panel'),

            // Navigation elements
            navLocationText: doc.getElementById('nav-location-text'),

            // Discord Layout Panes
            statusSidebar: doc.getElementById('status-sidebar'),
            statusContentDetail: doc.getElementById('status-content-detail'),
            worldSidebarMain: doc.getElementById('world-sidebar-main'),
            worldSubList: doc.getElementById('world-sub-list'),
            worldContentDetail: doc.getElementById('world-content-detail'),

            // Simple Layout Panes
            tasksContent: doc.getElementById('tasks-content'),
            mapContent: doc.getElementById('map-content'),
            territoryContent: doc.getElementById('territory-content'),
            logsContent: doc.getElementById('logs-content'),
            settingsContent: doc.getElementById('settings-content'),

            // Modal elements
            skillTreeModal: doc.getElementById('skill-tree-modal'),
            skillTreeContent: doc.getElementById('skill-tree-content'),
            closeModalButton: doc.getElementById('close-modal-button'),
            footerCost: doc.getElementById('footer-cost'),
            footerConfirmButton: doc.getElementById('footer-confirm-button'),
        };

        // Update view elements
        this.characterView.elements = this.elements;
        this.worldView.elements = this.elements;
        this.territoryView.elements = this.elements;
        this.mapView.elements = this.elements;
        this.taskView.elements = this.elements;
        this.logView.elements = this.elements;
        this.settingsView.elements = this.elements;
        
        // 初始化技能树视图
        this.skillTreeView = new SkillTreeView(this.dataManager, this.skillTreeLoader, this.elements);

        // Initialize SidebarManager now that elements are cached
        this.sidebarManager = new SidebarManager(this.elements, {
            onStatusNavClick: (nav, sub) => this.handleStatusNavigation(nav, sub),
            onWorldCategoryClick: (category) => this.handleWorldCategoryChange(category),
            onCharacterSelect: (charName) => this.handleCharacterSelection(charName),
        });
        this.sidebarManager.initialize();
    }

    bindListeners() {
        this.panelManager.bindListeners();
        this.panelManager.setLogsTabCallback(() => this.renderLogs());
        this.panelManager.setSettingsTabCallback(() => this.renderSettings());
        this.panelManager.setReloadDataCallback(() => this.reloadAllData());
        this.panelManager.setToggleConsoleCallback(() => this.toggleConsoleOutput());
        this.sidebarManager.bindListeners();

        this.elements.root.addEventListener('toggle', this._boundDetailsToggleHandler, true);

        this.elements.root.addEventListener('click', (event) => {
            const button = event.target.closest('button');
            if (!button) return;

            if (button.id === 'open-skill-tree-button') {
                this.openSkillTreeModal();
            } else if (button.classList.contains('hide-enemy-button')) {
                event.preventDefault();
                event.stopPropagation();
                this.hideEnemy(button.dataset.charName);
            } else if (button.classList.contains('hide-status-button')) {
                event.preventDefault();
                event.stopPropagation();
                this.hideStatus(button.dataset.statusName);
            } else if (button.classList.contains('hide-task-button')) {
                event.preventDefault();
                event.stopPropagation();
                this.hideTask(button.dataset.taskName);
            }
        });

        if (this.elements.closeModalButton) {
            this.elements.closeModalButton.addEventListener('click', () => this.closeSkillTreeModal());
        }
        if (this.elements.skillTreeModal) {
            this.elements.skillTreeModal.addEventListener('click', (event) => {
                if (event.target === this.elements.skillTreeModal) this.closeSkillTreeModal();
            });
        }
        if (this.elements.skillTreeContent) {
            this.elements.skillTreeContent.addEventListener('click', (event) => {
                const button = event.target.closest('.toggle-button');
                if (button && button.dataset.type && button.dataset.name) {
                    this.skillTreeView.toggleUpgrade(button.dataset.type, button.dataset.name);
                }
            });
        }
        if (this.elements.footerConfirmButton) {
            this.elements.footerConfirmButton.addEventListener('click', () => this.skillTreeView.applyUpgrades());
        }
    }

    _handleDetailsToggle(event) {
        if (event.target.matches('.item-entry[data-char-name]')) {
            const charName = event.target.dataset.charName;
            if (charName) {
                this.cache.collapsedCards[charName] = !event.target.open;
                this.saveCache();
            }
        }
    }

    loadCache() {
        try {
            const cached = window.parent.localStorage.getItem('rpg_ui_cache_v8');
            if (cached) {
                this.cache = JSON.parse(cached);
                if (!this.cache.hiddenEnemies) this.cache.hiddenEnemies = [];
                if (!this.cache.hiddenStatuses) this.cache.hiddenStatuses = [];
                if (!this.cache.hiddenTasks) this.cache.hiddenTasks = [];
                this.dataManager.cache = this.cache; // Sync cache with dataManager
            }
        } catch (e) {
            Logger.error('Failed to load UI cache:', e);
            this.cache = { collapsedCards: {}, hiddenEnemies: [], hiddenStatuses: [], hiddenTasks: [] };
            this.dataManager.cache = this.cache;
        }
    }

    saveCache() {
        try {
            window.parent.localStorage.setItem('rpg_ui_cache_v8', JSON.stringify(this.cache));
        } catch (e) {
            Logger.error('Failed to save UI cache:', e);
        }
    }

    hideEnemy(charName) {
        if (!this.cache.hiddenEnemies.includes(charName)) {
            this.cache.hiddenEnemies.push(charName);
            this.saveCache();
            // Re-render the current world view to reflect the change
            this.handleWorldCategoryChange(this.sidebarManager.activeState.worldCategory);
            Logger.log(`Enemy hidden: ${charName}`);
        }
    }

    hideStatus(statusName) {
        if (!this.cache.hiddenStatuses.includes(statusName)) {
            this.cache.hiddenStatuses.push(statusName);
            this.saveCache();
            this.characterView.render();
            Logger.log(`Status hidden: ${statusName}`);
        }
    }

    hideTask(taskName) {
        if (!this.cache.hiddenTasks.includes(taskName)) {
            this.cache.hiddenTasks.push(taskName);
            this.saveCache();
            this.characterView.render();
            Logger.log(`Task hidden: ${taskName}`);
        }
    }

    renderAll() {
        if (!this.dataManager.mvuData) return;

        // Update location in navigation bar
        this.updateLocationDisplay();

        // These will be re-rendered based on sidebar navigation
        this.handleStatusNavigation(this.sidebarManager.activeState.status);
        this.handleWorldCategoryChange(this.sidebarManager.activeState.worldCategory);

        // These are simple and can be rendered directly
        this.territoryView.render();
        this.taskView.render();
        
        // 初始化懒加载
        setTimeout(() => {
            globalLazyLoader.observeAll('img[data-src]', window.parent.document);
        }, 100);
    }

    updateLocationDisplay() {
        if (!this.elements.navLocationText) return;
        
        const location = this.dataManager.SafeGetValue('主角.所在地', ['未知']);
        const currentLocation = Array.isArray(location) ? location[0] : location;
        this.elements.navLocationText.textContent = currentLocation;
    }

    async renderMap() {
        if (!this.dataManager.mvuData) return;
        await this.mapView.render();
    }

    // === New Navigation Handlers ===

    handleStatusNavigation(navItem, subItem = null) {
        Logger.log(`Status navigation: ${navItem}${subItem ? ` > ${subItem}` : ''}`);
        this.characterView.render(navItem, subItem);
        
        // 如果是背包页面，初始化筛选器
        if (navItem === '装备' && subItem === '背包') {
            setTimeout(() => {
                this.inventoryFilter.initialize();
            }, 100);
        }
    }

    handleWorldCategoryChange(category) {
        Logger.log(`World category changed to: ${category}`);
        const list = this.worldView.getCharacterListForCategory(category);
        this.sidebarManager.renderCharacterList(list);

        const charToSelect = list[0] || null;

        this.sidebarManager.setActive('worldCharacter', charToSelect, this.elements.worldSubList);
        this.handleCharacterSelection(charToSelect, category);
        
        // 初始化人物搜索
        setTimeout(() => {
            this.characterSearch.initialize();
        }, 100);
    }

    handleCharacterSelection(charName, category) {
        // If category is not passed, use the active one from the sidebar manager
        const activeCategory = category || this.sidebarManager.activeState.worldCategory;
        Logger.log(`World character selected: ${charName} in category: ${activeCategory}`);
        this.worldView.renderCharacterDetail(charName, activeCategory);
    }

    openSkillTreeModal() {
        if (this.skillTreeView) {
            this.skillTreeView.open();
        }
    }

    closeSkillTreeModal() {
        if (this.skillTreeView) {
            this.skillTreeView.close();
        }
    }

    renderLogs() {
        Logger.log('Rendering logs view');
        if (this.elements.logsContent && this.logView) {
            this.logView.render();
        }
    }

    renderSettings() {
        Logger.log('Rendering settings view');
        if (this.elements.settingsContent && this.settingsView) {
            this.settingsView.render(this.elements.settingsContent);
        }
    }

    /**
     * 重新加载所有数据
     */
    async reloadAllData() {
        Logger.log('[UIController] 开始重新加载所有数据...');
        
        try {
            // 显示加载提示
            if (this.elements.statusContentDetail) {
                this.elements.statusContentDetail.innerHTML = '<div class="loading-message">正在重新加载数据...</div>';
            }
            
            this.showToast('正在重新加载数据...', 'info');
            
            // 尝试通过应用实例重新初始化（包括重新等待 Mvu）
            const app = window.parent.gsStatusBarApp;
            if (app && typeof app.reinitialize === 'function') {
                Logger.log('[UIController] 使用应用的 reinitialize 方法');
                await app.reinitialize();
            } else {
                // 降级方案：只重新加载数据
                Logger.log('[UIController] 使用降级方案：只重新加载数据');
                
                // 重新加载数据
                await this.dataManager.loadAllData();
                
                // 清除雷达图缓存
                if (this.characterView && this.characterView.clearRadarChartCache) {
                    this.characterView.clearRadarChartCache();
                }
                
                // 清除渲染缓存
                if (this.renderCache) {
                    this.renderCache.clear();
                }
                
                // 重新渲染当前视图
                this.renderAll();
            }
            
            Logger.success('[UIController] 数据重新加载成功');
            
            // 显示成功提示
            this.showToast('数据已重新加载', 'success');
            
        } catch (error) {
            Logger.error('[UIController] 重新加载数据失败', error);
            this.showToast('数据加载失败: ' + error.message, 'error');
            
            // 如果是 Mvu 超时错误，提供更详细的提示
            if (error.message.includes('Mvu')) {
                this.showToast('提示：可以尝试刷新页面或检查 MVU 扩展是否正常', 'warn');
            }
        }
    }

    /**
     * 切换控制台输出
     */
    toggleConsoleOutput() {
        const currentState = Logger.consoleEnabled;
        Logger.setConsoleEnabled(!currentState);
        
        const newState = Logger.consoleEnabled ? '已启用' : '已禁用';
        Logger.log(`[UIController] 控制台输出${newState}`);
        
        this.showToast(`控制台输出${newState}`, 'info');
    }

    /**
     * 显示提示消息
     */
    showToast(message, type = 'info') {
        // 简单的提示实现
        const toast = window.parent.document.createElement('div');
        toast.className = `gs-toast gs-toast-${type}`;
        toast.textContent = message;
        
        // 根据类型设置不同的持续时间
        const duration = type === 'error' || type === 'warn' ? 5000 : 3000;
        
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: rgba(26, 35, 79, 0.95);
            border: 1px solid var(--container-border);
            border-radius: 8px;
            color: var(--primary-text-color);
            z-index: 10001;
            animation: slideInRight 0.3s ease-out;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            max-width: 400px;
            word-wrap: break-word;
        `;
        
        window.parent.document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
}