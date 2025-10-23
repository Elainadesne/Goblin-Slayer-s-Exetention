import { Logger } from '../core/logger.js';

export class SidebarManager {
    constructor(elements, callbacks) {
        this.elements = elements;
        this.callbacks = callbacks; // e.g., { onStatusNavClick, onWorldCategoryClick, onCharacterSelect }
        this.activeState = {
            status: '状态',
            worldCategory: '关系者',
            worldCharacter: null,
            equipmentTab: '装备栏',
        };
    }

    initialize() {
        Logger.log('[SidebarManager] Initializing...');
        this.renderStatusSidebar();
        this.renderWorldSidebar();
        Logger.success('[SidebarManager] Initialization complete');
    }

    bindListeners() {
        Logger.log('[SidebarManager] Binding event listeners...');
        
        // 使用事件委托 - 在父元素上监听，即使子元素被重新渲染也不会失效
        if (this.elements.statusSidebar) {
            // 移除可能存在的旧监听器
            this.elements.statusSidebar.removeEventListener('click', this._boundStatusNavClick);
            this.elements.statusSidebar.removeEventListener('touchend', this._boundStatusNavTouch);
            
            // 绑定新的监听器
            this._boundStatusNavClick = this._handleStatusNavClick.bind(this);
            this._boundStatusNavTouch = this._handleStatusNavClick.bind(this);
            
            this.elements.statusSidebar.addEventListener('click', this._boundStatusNavClick, true);
            
            // 为移动端添加 touch 事件支持
            if ('ontouchstart' in window) {
                this.elements.statusSidebar.addEventListener('touchend', this._boundStatusNavTouch, true);
            }
            
            Logger.success('[SidebarManager] Status sidebar listeners bound');
        } else {
            Logger.error('[SidebarManager] statusSidebar element not found!');
        }
        
        if (this.elements.worldSidebarMain) {
            this._boundWorldCategoryClick = this._handleWorldCategoryClick.bind(this);
            this.elements.worldSidebarMain.addEventListener('click', this._boundWorldCategoryClick, true);
            
            if ('ontouchstart' in window) {
                this.elements.worldSidebarMain.addEventListener('touchend', this._boundWorldCategoryClick, true);
            }
            
            Logger.success('[SidebarManager] World sidebar listeners bound');
        }
        
        if (this.elements.worldSubList) {
            this._boundCharacterSelect = this._handleCharacterSelect.bind(this);
            this.elements.worldSubList.addEventListener('click', this._boundCharacterSelect, true);
            
            if ('ontouchstart' in window) {
                this.elements.worldSubList.addEventListener('touchend', this._boundCharacterSelect, true);
            }
            
            Logger.success('[SidebarManager] World sub-list listeners bound');
        }
    }

    _handleStatusNavClick(event) {
        // 防止事件冒泡和默认行为
        event.preventDefault();
        event.stopPropagation();
        
        // 检查是否点击了子菜单项
        const submenuTarget = event.target.closest('.sidebar-submenu-item');
        if (submenuTarget) {
            const nav = submenuTarget.dataset.nav;
            const sub = submenuTarget.dataset.sub;
            Logger.log(`Clicked submenu: ${nav} > ${sub}`);
            // 更新装备标签状态
            this.activeState.status = nav;
            this.activeState.equipmentTab = sub;
            // 重新渲染侧边栏以更新激活状态
            this.renderStatusSidebar();
            // 调用回调函数渲染内容
            this.callbacks.onStatusNavClick?.(nav, sub);
            return;
        }
        
        const target = event.target.closest('.sidebar-nav-item');
        if (!target) return;
        const newSelection = target.dataset.nav;
        Logger.log(`Clicked nav item: ${newSelection}`);
        
        // 如果点击的是装备，默认显示装备栏
        if (newSelection === '装备') {
            this.activeState.status = newSelection;
            this.activeState.equipmentTab = this.activeState.equipmentTab || '装备栏';
            this.renderStatusSidebar();
            this.callbacks.onStatusNavClick?.(newSelection, this.activeState.equipmentTab);
        } else {
            this.activeState.status = newSelection;
            this.renderStatusSidebar();
            this.callbacks.onStatusNavClick?.(newSelection);
        }
    }

    _handleWorldCategoryClick(event) {
        event.preventDefault();
        event.stopPropagation();
        
        const target = event.target.closest('.sidebar-nav-item');
        if (!target) return;
        const newCategory = target.dataset.nav;
        Logger.log(`Clicked world category: ${newCategory}`);
        this.setActive('worldCategory', newCategory, this.elements.worldSidebarMain);
        this.callbacks.onWorldCategoryClick?.(newCategory);
    }

    _handleCharacterSelect(event) {
        event.preventDefault();
        event.stopPropagation();
        
        const target = event.target.closest('.sub-list-item');
        if (!target) return;
        const newCharacterName = target.dataset.char;
        Logger.log(`Clicked character: ${newCharacterName}`);
        this.setActive('worldCharacter', newCharacterName, this.elements.worldSubList);
        this.callbacks.onCharacterSelect?.(newCharacterName);
    }

    setActive(type, value, container) {
        if (this.activeState[type] === value && type !== 'worldCharacter') return;
        this.activeState[type] = value;
        
        const items = container?.querySelectorAll('.sidebar-nav-item, .sub-list-item');
        items?.forEach(item => {
            const key = item.dataset.nav || item.dataset.char;
            item.classList.toggle('active', key === value);
        });
        Logger.log(`Sidebar active state for '${type}' set to '${value}'`);
    }

    renderStatusSidebar() {
        Logger.log('[SidebarManager] Rendering status sidebar...');
        const items = [
            { name: '状态', icon: 'fa-solid fa-heart-pulse' },
            { name: '属性', icon: 'fa-solid fa-chart-simple' },
            { name: '技能', icon: 'fa-solid fa-wand-sparkles' },
            { name: '当前状态', icon: 'fa-solid fa-bolt' },
            { name: '装备', icon: 'fa-solid fa-shield-halved', hasSubmenu: true }
        ];
        
        if (!this.elements.statusSidebar) {
            Logger.error('[SidebarManager] statusSidebar element not found!');
            return;
        }
        
        this.elements.statusSidebar.innerHTML = items.map(item => {
            const isActive = item.name === this.activeState.status;
            let html = `<div class="sidebar-nav-item ${isActive ? 'active' : ''}" data-nav="${item.name}">
                <i class="${item.icon}"></i>
                <span>${item.name}</span>
            </div>`;
            
            // 添加装备子菜单 - 只在装备激活时显示
            if (item.hasSubmenu && item.name === '装备') {
                const subItems = ['装备栏', '背包'];
                const activeSubItem = this.activeState.equipmentTab || '装备栏';
                // 只有当装备是激活状态时才添加 active 类
                html += `<div class="sidebar-submenu ${isActive ? 'active' : ''}">
                    ${subItems.map(sub => 
                        `<div class="sidebar-submenu-item ${sub === activeSubItem && isActive ? 'active' : ''}" data-nav="装备" data-sub="${sub}">${sub}</div>`
                    ).join('')}
                </div>`;
            }
            
            return html;
        }).join('');
        
        Logger.success(`[SidebarManager] Status sidebar rendered with ${items.length} items`);
    }

    renderWorldSidebar() {
        const items = [
            { name: '关系者', icon: 'fa-solid fa-users' },
            { name: '敌对者', icon: 'fa-solid fa-skull-crossbones' }
        ];
        this.elements.worldSidebarMain.innerHTML = items.map(item =>
            `<div class="sidebar-nav-item ${item.name === this.activeState.worldCategory ? 'active' : ''}" data-nav="${item.name}">
                <i class="${item.icon}"></i>
                <span>${item.name}</span>
            </div>`
        ).join('');
    }

    renderCharacterList(characters) {
        if (!this.elements.worldSubList) return;

        this.elements.worldSubList.innerHTML = `
            <div class="sub-list-header">${this.activeState.worldCategory}</div>
            <div class="sub-list-content">
                ${characters.length > 0 ? characters.map(char => `
                    <div class="sub-list-item" data-char="${char.name}">
                        <span class="char-name">${char.name}</span>
                        <div class="char-status-indicators">
                            ${char.is_companion ? '<i class="fa-solid fa-star char-status-indicator companion" title="同伴"></i>' : ''}
                            ${char.is_present ? '<i class="fa-solid fa-location-dot char-status-indicator present" title="在场"></i>' : ''}
                        </div>
                    </div>
                `).join('') : '<p style="padding: 10px;">无条目</p>'}
            </div>
        `;
    }
}