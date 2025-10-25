// 人物列表搜索功能

export class CharacterSearch {
    constructor() {
        this.searchInput = null;
        this.characterList = null;
        this.characters = [];
    }

    initialize(containerId = 'world-sub-list') {
        const doc = window.parent.document;
        this.characterList = doc.getElementById(containerId);
        
        if (!this.characterList) return;

        // 添加搜索框
        this.addSearchBox();
        
        // 获取所有人物项
        this.updateCharacterList();
    }

    addSearchBox() {
        const header = this.characterList.querySelector('.sub-list-header');
        if (!header) return;

        // 检查是否已存在搜索框
        if (header.querySelector('.character-search-box')) return;

        const searchBox = document.createElement('div');
        searchBox.className = 'character-search-box';
        searchBox.innerHTML = `
            <i class="fa-solid fa-search"></i>
            <input type="text" 
                   class="character-search-input" 
                   placeholder="搜索人物...">
        `;

        header.appendChild(searchBox);

        this.searchInput = searchBox.querySelector('.character-search-input');
        this.searchInput.addEventListener('input', () => this.applySearch());
    }

    updateCharacterList() {
        const content = this.characterList?.querySelector('.sub-list-content');
        if (!content) return;

        this.characters = Array.from(content.querySelectorAll('.sub-list-item'));
    }

    applySearch() {
        const searchTerm = this.searchInput?.value.toLowerCase() || '';
        
        let visibleCount = 0;

        this.characters.forEach(item => {
            const charName = item.dataset.char?.toLowerCase() || '';
            const text = item.textContent.toLowerCase();

            if (charName.includes(searchTerm) || text.includes(searchTerm)) {
                item.style.display = '';
                visibleCount++;
            } else {
                item.style.display = 'none';
            }
        });

        // 如果没有结果，显示提示
        this.showNoResults(visibleCount === 0);
    }

    showNoResults(show) {
        const content = this.characterList?.querySelector('.sub-list-content');
        if (!content) return;

        let noResults = content.querySelector('.no-results-message');

        if (show) {
            if (!noResults) {
                noResults = document.createElement('div');
                noResults.className = 'no-results-message';
                noResults.textContent = '未找到匹配的人物';
                content.appendChild(noResults);
            }
        } else {
            if (noResults) {
                noResults.remove();
            }
        }
    }

    reset() {
        if (this.searchInput) {
            this.searchInput.value = '';
        }
        
        this.characters.forEach(item => {
            item.style.display = '';
        });

        this.showNoResults(false);
    }
}
