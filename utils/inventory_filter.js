// 背包搜索和筛选功能

export class InventoryFilter {
    constructor() {
        this.searchInput = null;
        this.typeFilter = null;
        this.tierFilter = null;
        this.sortBy = null;
        this.grid = null;
        this.itemCount = null;
        this.items = [];
    }

    initialize() {
        // 获取 DOM 元素
        const doc = window.parent.document;
        this.searchInput = doc.getElementById('inventory-search');
        this.typeFilter = doc.getElementById('type-filter');
        this.tierFilter = doc.getElementById('tier-filter');
        this.sortBy = doc.getElementById('sort-by');
        this.grid = doc.getElementById('inventory-grid');
        this.itemCount = doc.getElementById('item-count');

        if (!this.grid) return;

        // 获取所有物品卡片
        this.items = Array.from(this.grid.querySelectorAll('.inventory-card-modern'));

        // 绑定事件
        this.bindEvents();
    }

    bindEvents() {
        if (this.searchInput) {
            this.searchInput.addEventListener('input', () => this.applyFilters());
        }

        if (this.typeFilter) {
            this.typeFilter.addEventListener('change', () => this.applyFilters());
        }

        if (this.tierFilter) {
            this.tierFilter.addEventListener('change', () => this.applyFilters());
        }

        if (this.sortBy) {
            this.sortBy.addEventListener('change', () => this.applySorting());
        }
    }

    applyFilters() {
        const searchTerm = this.searchInput?.value.toLowerCase() || '';
        const typeValue = this.typeFilter?.value || '';
        const tierValue = this.tierFilter?.value || '';

        let visibleCount = 0;

        this.items.forEach(item => {
            const name = item.dataset.name || '';
            const type = item.dataset.type || '';
            const tier = item.dataset.tier || '';

            const matchesSearch = name.includes(searchTerm);
            const matchesType = !typeValue || type === typeValue;
            const matchesTier = !tierValue || tier === tierValue;

            if (matchesSearch && matchesType && matchesTier) {
                item.classList.remove('hidden');
                visibleCount++;
            } else {
                item.classList.add('hidden');
            }
        });

        // 更新计数
        if (this.itemCount) {
            this.itemCount.textContent = visibleCount;
        }
    }

    applySorting() {
        const sortValue = this.sortBy?.value || 'name';
        
        // 获取所有可见的物品
        const visibleItems = this.items.filter(item => !item.classList.contains('hidden'));
        
        // 排序
        visibleItems.sort((a, b) => {
            switch (sortValue) {
                case 'name':
                    return (a.dataset.name || '').localeCompare(b.dataset.name || '', 'zh-CN');
                
                case 'type':
                    const typeCompare = (a.dataset.type || '').localeCompare(b.dataset.type || '', 'zh-CN');
                    if (typeCompare !== 0) return typeCompare;
                    return (a.dataset.name || '').localeCompare(b.dataset.name || '', 'zh-CN');
                
                case 'tier':
                    const tierOrder = ['普通', '精良', '稀有', '史诗', '传奇'];
                    const aTier = tierOrder.indexOf(a.dataset.tier || '普通');
                    const bTier = tierOrder.indexOf(b.dataset.tier || '普通');
                    if (bTier !== aTier) return bTier - aTier; // 降序
                    return (a.dataset.name || '').localeCompare(b.dataset.name || '', 'zh-CN');
                
                case 'quantity':
                    const aQty = parseInt(a.querySelector('.inventory-item-quantity')?.textContent.replace(/\D/g, '') || '0');
                    const bQty = parseInt(b.querySelector('.inventory-item-quantity')?.textContent.replace(/\D/g, '') || '0');
                    if (bQty !== aQty) return bQty - aQty; // 降序
                    return (a.dataset.name || '').localeCompare(b.dataset.name || '', 'zh-CN');
                
                default:
                    return 0;
            }
        });

        // 重新排列 DOM
        visibleItems.forEach(item => {
            this.grid.appendChild(item);
        });

        // 将隐藏的物品移到最后
        const hiddenItems = this.items.filter(item => item.classList.contains('hidden'));
        hiddenItems.forEach(item => {
            this.grid.appendChild(item);
        });
    }

    reset() {
        if (this.searchInput) this.searchInput.value = '';
        if (this.typeFilter) this.typeFilter.value = '';
        if (this.tierFilter) this.tierFilter.value = '';
        if (this.sortBy) this.sortBy.value = 'name';
        
        this.items.forEach(item => item.classList.remove('hidden'));
        
        if (this.itemCount) {
            this.itemCount.textContent = this.items.length;
        }
    }
}
