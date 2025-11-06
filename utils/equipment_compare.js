// 装备对比功能

export class EquipmentCompare {
    constructor() {
        this.selectedItems = [];
        this.maxSelection = 2;
        this.modal = null;
    }

    initialize() {
        this.createModal();
        this.bindEvents();
    }

    createModal() {
        const doc = window.parent.document;
        
        // 检查是否已存在
        if (doc.getElementById('equipment-compare-modal')) return;

        const modal = doc.createElement('div');
        modal.id = 'equipment-compare-modal';
        modal.className = 'modal-overlay';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="modal-content equipment-compare-content">
                <button class="modal-close-button" id="close-compare-modal">
                    <i class="fa-solid fa-xmark"></i>
                </button>
                <h2>装备对比</h2>
                <div class="compare-container">
                    <div class="compare-item" id="compare-item-1">
                        <div class="compare-placeholder">选择第一件装备</div>
                    </div>
                    <div class="compare-divider">
                        <i class="fa-solid fa-arrows-left-right"></i>
                    </div>
                    <div class="compare-item" id="compare-item-2">
                        <div class="compare-placeholder">选择第二件装备</div>
                    </div>
                </div>
                <div class="compare-actions">
                    <button class="compare-button" id="clear-selection">清除选择</button>
                    <button class="compare-button primary" id="close-compare">关闭</button>
                </div>
            </div>
        `;

        doc.body.appendChild(modal);
        this.modal = modal;

        // 绑定关闭事件
        doc.getElementById('close-compare-modal').addEventListener('click', () => this.close());
        doc.getElementById('close-compare').addEventListener('click', () => this.close());
        doc.getElementById('clear-selection').addEventListener('click', () => this.clearSelection());
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.close();
        });
    }

    bindEvents() {
        // 使用事件委托监听装备卡片点击
        const doc = window.parent.document;
        const root = doc.getElementById('gs-status-bar-panel');
        
        if (!root) return;

        root.addEventListener('click', (e) => {
            const card = e.target.closest('.equipment-card-modern');
            if (card && e.ctrlKey) { // Ctrl+点击选择装备
                e.preventDefault();
                e.stopPropagation();
                this.selectItem(card);
            }
        });
    }

    selectItem(card) {
        const itemName = card.querySelector('.equipment-item-name')?.textContent;
        if (!itemName || itemName === '未装备') return;

        // 提取装备信息
        const itemData = {
            name: itemName,
            slot: card.querySelector('.equipment-slot-name')?.textContent || '',
            tier: card.querySelector('.tier-badge')?.textContent.trim() || '普通',
            bonus: card.querySelector('.equipment-bonus')?.textContent || '',
            desc: card.querySelector('.equipment-desc')?.textContent || '',
            effects: card.querySelector('.equipment-effects')?.textContent || '',
            element: card
        };

        // 添加到选择列表
        if (this.selectedItems.length < this.maxSelection) {
            this.selectedItems.push(itemData);
            card.classList.add('selected-for-compare');
        } else {
            // 替换第一个
            this.selectedItems[0].element.classList.remove('selected-for-compare');
            this.selectedItems.shift();
            this.selectedItems.push(itemData);
            card.classList.add('selected-for-compare');
        }

        // 如果选择了两件，显示对比
        if (this.selectedItems.length === 2) {
            this.showComparison();
        }
    }

    showComparison() {
        if (!this.modal || this.selectedItems.length !== 2) return;

        const [item1, item2] = this.selectedItems;

        // 渲染第一件装备
        const container1 = this.modal.querySelector('#compare-item-1');
        container1.innerHTML = this.renderItemCard(item1);

        // 渲染第二件装备
        const container2 = this.modal.querySelector('#compare-item-2');
        container2.innerHTML = this.renderItemCard(item2);

        // 显示模态框
        this.modal.style.display = 'flex';
    }

    renderItemCard(item) {
        return `
            <div class="compare-card tier-${item.tier}">
                <div class="compare-card-header">
                    <h3 class="gradient-text gradient-text-tier-${item.tier}">${item.name}</h3>
                    <span class="tier-badge tier-${item.tier}">${item.tier}</span>
                </div>
                <div class="compare-card-body">
                    <div class="compare-field">
                        <span class="field-label">部位：</span>
                        <span class="field-value">${item.slot}</span>
                    </div>
                    ${item.bonus ? `
                        <div class="compare-field highlight">
                            <span class="field-label">属性加成：</span>
                            <span class="field-value">${item.bonus}</span>
                        </div>
                    ` : ''}
                    ${item.desc ? `
                        <div class="compare-field">
                            <span class="field-label">描述：</span>
                            <span class="field-value">${item.desc}</span>
                        </div>
                    ` : ''}
                    ${item.effects ? `
                        <div class="compare-field special">
                            <span class="field-label">特殊效果：</span>
                            <span class="field-value">${item.effects}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    clearSelection() {
        this.selectedItems.forEach(item => {
            item.element.classList.remove('selected-for-compare');
        });
        this.selectedItems = [];
        this.close();
    }

    close() {
        if (this.modal) {
            this.modal.style.display = 'none';
        }
    }
}

// 全局实例
export const globalEquipmentCompare = new EquipmentCompare();
