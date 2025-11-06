import { Logger } from '../../core/logger.js';
import { ViewUtils } from './ViewUtils.js';

export class WorldView {
    constructor(dataManager, elements) {
        this.dataManager = dataManager;
        this.elements = elements;
        this.SKILL_LEVEL_MAP = {
            1: { rank: '初级', bonus: 1 },
            2: { rank: '中级', bonus: 2 },
            3: { rank: '高级', bonus: 3 },
            4: { rank: '精通', bonus: 4 },
            5: { rank: '大师', bonus: 5 },
        };
    }

    getCharacterListForCategory(category) {
        const statData = this.dataManager.mvuData;
        if (!statData) {
            Logger.warn('getCharacterListForCategory called before mvuData is available.');
            return [];
        }

        let characterList = [];
        if (category === '关系者') {
            const relations = statData.关系列表 || {};
            characterList = ViewUtils.filterMetaKeys(relations).map(name => {
                const charData = this.dataManager.SafeGetValue(`关系列表.${name}`, {});
                return {
                    name: name,
                    is_companion: charData.is_companion || false,
                    is_present: charData.在场 || false,
                };
            });
        } else if (category === '敌对者') {
            const enemies = statData.敌人列表 || {};
            characterList = ViewUtils.filterMetaKeys(enemies).map(name => {
                    const charData = this.dataManager.SafeGetValue(`敌人列表.${name}`, {});
                    return {
                        name: name,
                        is_companion: false,
                        is_present: charData.在场 || false,
                    };
                });
        }

        // 排序：同伴 > 在场 > 其他
        characterList.sort((a, b) => {
            if (a.is_companion !== b.is_companion) return a.is_companion ? -1 : 1;
            if (a.is_present !== b.is_present) return a.is_present ? -1 : 1;
            return a.name.localeCompare(b.name);
        });

        return characterList;
    }

    renderCharacterDetail(charName, category) {
        if (!this.elements.worldContentDetail) return;

        if (!charName) {
            this.elements.worldContentDetail.innerHTML = '<p>请从左侧列表中选择一个角色以查看详情。</p>';
            return;
        }

        const isEnemy = category === '敌对者';
        const basePath = `${isEnemy ? '敌人列表' : '关系列表'}.${charName}`;
        
        console.log('[WorldView] renderCharacterDetail:', { charName, category, isEnemy, basePath });
        
        try {
            const html = this._createCharacterCardHTML(charName, basePath, isEnemy);
            this.elements.worldContentDetail.innerHTML = html;
        } catch (error) {
            console.error('[WorldView] Render error:', error);
            console.error('[WorldView] Error stack:', error.stack);
            Logger.error(`Failed to render character detail for ${charName}:`, error);
            this.elements.worldContentDetail.innerHTML = `<p class="error-message">渲染 ${charName} 的详情失败。<br>错误: ${error.message}</p>`;
        }
    }

    _createCharacterCardHTML(name, basePath, isEnemy = false) {
        // Get character data
        const charData = this.dataManager.SafeGetValue(basePath, {});
        
        // Get user name - try to find it from the character's relationship data
        let userName = this.dataManager.SafeGetValue('主角.姓名');
        
        // If we can't get user name, try to find it from the character's relationship keys
        if (!userName && !isEnemy && charData.好感度) {
            const relationKeys = ViewUtils.filterMetaKeys(charData.好感度);
            if (relationKeys.length > 0) {
                userName = relationKeys[0]; // Use the first relationship key as user name
            }
        }
        
        if (!userName) {
            userName = '主角'; // Fallback
        }

        const nameText = this.dataManager.SafeGetValue(`${basePath}.姓名`, name);
        const professionText = this.dataManager.SafeGetValue(`${basePath}.职业`, '未知');
        const raceText = this.dataManager.SafeGetValue(`${basePath}.种族`, '未知');
        const locationText = this.dataManager.SafeGetValue(`${basePath}.所处地点`, '未知');
        const relationsMediaHTML = isEnemy ? '' : this._buildRelationsMediaHTML(nameText, professionText, raceText, locationText);

        const coreStatsHTML = `
              <div class="stat-line"><div><span>❤️<b>生命</b></span><span>${this.dataManager.SafeGetValue(`${basePath}.生命值.当前值`, 0)}/${this.dataManager.SafeGetValue(`${basePath}.生命值.最大值`, 1)}</span></div>${ViewUtils.createProgressBar(this.dataManager.SafeGetValue(`${basePath}.生命值.当前值`, 0), this.dataManager.SafeGetValue(`${basePath}.生命值.最大值`, 1), '#ff6b6b')}</div>
              <div class="stat-line"><div><span>🛡️<b>护甲</b></span><span>${this.dataManager.SafeGetValue(`${basePath}.护甲值.当前值`, 0)}/${this.dataManager.SafeGetValue(`${basePath}.护甲值.最大值`, 1)}</span></div>${ViewUtils.createProgressBar(this.dataManager.SafeGetValue(`${basePath}.护甲值.当前值`, 0), this.dataManager.SafeGetValue(`${basePath}.护甲值.最大值`, 1), '#8cb4ff')}</div>
              <div class="stat-line"><div><span>🔮<b>魔力</b></span><span>${this.dataManager.SafeGetValue(`${basePath}.魔力值.当前值`, 0)}/${this.dataManager.SafeGetValue(`${basePath}.魔力值.最大值`, 1)}</span></div>${ViewUtils.createProgressBar(this.dataManager.SafeGetValue(`${basePath}.魔力值.当前值`, 0), this.dataManager.SafeGetValue(`${basePath}.魔力值.最大值`, 1), '#c792ea')}</div>
              <div class="stat-line"><div><span>🌟<b>信仰</b></span><span>${this.dataManager.SafeGetValue(`${basePath}.信仰力值.当前值`, 0)}/${this.dataManager.SafeGetValue(`${basePath}.信仰力值.最大值`, 1)}</span></div>${ViewUtils.createProgressBar(this.dataManager.SafeGetValue(`${basePath}.信仰力值.当前值`, 0), this.dataManager.SafeGetValue(`${basePath}.信仰力值.最大值`, 1), '#fffac8')}</div>
          `;
        const abilities = this.dataManager.SafeGetValue(`${basePath}.总能力`, {});
        const abilityEntries = ViewUtils.filterMetaEntries(abilities);
        const abilitiesHTML = `<div class="sub-section-content"><b>能力: </b>${abilityEntries.length === 0
                ? '无'
                : `<div class="abilities-grid">${abilityEntries
                    .map(([key, value]) => `<span><b>${key}:</b> ${value}</span>`)
                    .join('')}</div>`
            }</div>`;

        let cardBodyHTML = '';
        if (isEnemy) {
            // Simplified layout for enemies
            cardBodyHTML = `
                <div class="character-card-content">
                    <div class="card-col-left">
                        <h4 class="detail-section-header">核心状态</h4>
                        ${coreStatsHTML}
                    </div>
                    <div class="card-col-right">
                        <h4 class="detail-section-header">能力</h4>
                        ${abilitiesHTML}
                        <h4 class="detail-section-header">装备</h4>
                        ${this._formatNPCEquipment(basePath)}
                    </div>
                </div>`;
        } else {
            // Two-column layout for relations
            const personalityTags = this.dataManager.SafeGetValue(`${basePath}.性格标签`, []);
            const interestLevel = this.dataManager.SafeGetValue(`${basePath}.性趣度`, 0);
            const desireLevel = this.dataManager.SafeGetValue(`${basePath}.性欲度`, 0);
            const appellation = this.dataManager.SafeGetValue(`${basePath}.称呼`, '');

            let extraInfoHTML = '';
            if (personalityTags.length > 0 || interestLevel > 0 || desireLevel > 0) {
                const tagsHTML = personalityTags.length > 0
                    ? `<div class="personality-tags">${personalityTags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>`
                    : '';

                extraInfoHTML = `
                    <h4 class="detail-section-header">补充信息</h4>
                    ${tagsHTML}
                    <div class="desire-stats">
                        <div class="stat-line"><div><span>❤️‍🔥<b>性趣度</b></span><span>${interestLevel}/100</span></div>${ViewUtils.createProgressBar(interestLevel, 100, '#ff85a2')}</div>
                        <div class="stat-line"><div><span>🥵<b>性欲度</b></span><span>${desireLevel}/100</span></div>${ViewUtils.createProgressBar(desireLevel, 100, '#ff6b6b')}</div>
                    </div>
                `;
            }

            cardBodyHTML = `
                <div class="character-card-content">
                    <div class="card-col-left">
                        <h4 class="detail-section-header">核心状态</h4>
                        ${coreStatsHTML}
                        <h4 class="detail-section-header">人际关系</h4>
                        <div class="stat-line"><div><span>💖<b>好感度</b></span><span>${this.dataManager.SafeGetValue(`${basePath}.好感度.${userName}`, 0)}/100</span></div>${ViewUtils.createProgressBar(this.dataManager.SafeGetValue(`${basePath}.好感度.${userName}`, 0), 100, '#ff85a2')}</div>
                        <div class="stat-line"><div><span>🤝<b>信任度</b></span><span>${this.dataManager.SafeGetValue(`${basePath}.信任度.${userName}`, 0)}/100</span></div>${ViewUtils.createProgressBar(this.dataManager.SafeGetValue(`${basePath}.信任度.${userName}`, 0), 100, '#85e0ff')}</div>
                        ${extraInfoHTML}
                        <h4 class="detail-section-header">能力与技能</h4>
                        ${abilitiesHTML}
                        <hr class="thin-divider"/>
                        ${ViewUtils.formatSkills(`${basePath}.技能列表`, this.dataManager, this.SKILL_LEVEL_MAP)}
                    </div>
                    <div class="card-col-right">
                        ${relationsMediaHTML}
                        <h4 class="detail-section-header">背景</h4>
                        ${appellation ? `<p><b>称呼:</b> ${appellation}</p>` : ''}
                        <p><b>外貌:</b> ${this.dataManager.SafeGetValue(`${basePath}.外貌`, '...')}</p>
                        <p><b>背景:</b> ${this.dataManager.SafeGetValue(`${basePath}.身份背景`, '...')}</p>
                        ${this._formatEventHistory(basePath)}
                        <h4 class="detail-section-header">装备</h4>
                        ${this._formatNPCEquipment(basePath)}
                    </div>
                </div>`;
        }

        return `
            <div class="character-detail-header">
                <span class="value-main">${nameText}</span>
                <span class="summary-details">${this.dataManager.SafeGetValue(`${basePath}.职业`, '未知')} Lv.${this.dataManager.SafeGetValue(`${basePath}.职业等级`, '?')} @ ${this.dataManager.SafeGetValue(`${basePath}.所处地点`, '?')}</span>
                ${isEnemy ? `<button class="subtle-button hide-enemy-button" data-char-name="${name}">删除</button>` : ''}
                ${!isEnemy ? `<button class="subtle-button hide-relation-button" data-char-name="${name}">删除</button>` : ''}
            </div>
            <hr class="thin-divider">
            <div class="details-wrapper">
                ${cardBodyHTML}
            </div>
        `;
    }

    _buildRelationsMediaHTML(name, profession, race, location) {
        const images = this._getValidRelationsImageList(name, profession, race, location, 1);
        if (!images || images.length === 0) {
            return ''; // No image, no component
        }
        const img = images[0];
        const url = img.url;
        const caption = img.caption || '';
        const alt = caption ? `${name} — ${caption}` : name;
        const mediaContent = `<div class="industry-media-slot"><a class="thumb" href="${url}" target="_blank" rel="noopener"><img src="${url}" loading="lazy" alt="${alt}" referrerpolicy="no-referrer" onerror="this.closest('.thumb').classList.add('img-failed')"/>${caption ? `<div class="caption">${caption}</div>` : ''}</a></div>`;

        return `<details class="sub-section">
                                <summary>角色立绘 <span class="arrow-toggle">›</span></summary>
                                <div class="sub-section-content" style="padding: 10px;">
                                    ${mediaContent}
                                </div>
                            </details>`;
    }

    _getValidRelationsImageList(name, profession, race, location, maxCount = 1) {
        const db = this.dataManager.relationsImageData;
        if (!db) return [];
        const sanitize = s => this._sanitizeForNameMatch(s);
        const matchName = sanitize(name);
        const loc = sanitize(location);
        const splitTokens = s =>
            String(s || '')
            .split(/[\/\|,，、\s\-—()（）【】\[\]·]+/g)
            .map(t => t.trim())
            .filter(Boolean);

        const selectByName = scope => (scope && scope['按名称']?.[matchName]?.images) || [];
        const selectByGroups = scope => {
            if (!scope) return [];
            for (const p of splitTokens(profession)) {
                const arr = scope['按职业']?.[p]?.images || [];
                if (arr.length > 0) return arr;
            }
            for (const r of splitTokens(race)) {
                const arr = scope['按种族']?.[r]?.images || [];
                if (arr.length > 0) return arr;
            }
            return [];
        };

        let list = [];
        const locScope = db['按所处地点']?.[loc];
        if (!list.length) list = selectByName(locScope);
        if (!list.length) list = selectByGroups(locScope);
        if (!list.length) list = selectByName(db);
        if (!list.length) list = selectByGroups(db);

        list = list.filter(img => typeof img?.url === 'string' && /^https?:\/\//i.test(img.url));
        list.sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0));
        return list.slice(0, maxCount);
    }

    _sanitizeForNameMatch(name) {
        if (typeof name !== 'string') return '';
        return name.replace(/<[^>]*>/g, '').trim();
    }

    _formatEventHistory(basePath) {
        const eventHistory = this.dataManager.SafeGetValue(`${basePath}.event_history`, {});
        
        // 过滤掉元数据键
        const events = ViewUtils.filterMetaKeys(eventHistory);
        
        if (events.length === 0) {
            return ''; // 没有事件历史，不显示
        }

        // 将事件按时间排序（假设键名包含时间信息，或者按字母顺序）
        events.sort();

        const eventItems = events.map(eventKey => {
            const eventData = eventHistory[eventKey];
            let eventText = '';
            
            if (typeof eventData === 'string') {
                eventText = eventData;
            } else if (typeof eventData === 'object' && eventData !== null) {
                // 如果是对象，尝试获取描述字段
                eventText = eventData.description || eventData.desc || JSON.stringify(eventData);
            } else {
                eventText = String(eventData);
            }
            
            return `<div class="event-item">
                <div class="event-key">${eventKey}</div>
                <div class="event-desc">${eventText}</div>
            </div>`;
        }).join('');

        return `
            <details class="sub-section">
                <summary><h4 class="detail-section-header" style="display: inline;">事件历史</h4> <span class="arrow-toggle">›</span></summary>
                <div class="sub-section-content event-history-list">
                    ${eventItems}
                </div>
            </details>
        `;
    }

    _formatNPCEquipment(basePath) {
        const equipmentSlots = [
            { name: '武器', path: '装备栏.武器' },
            { name: '副手', path: '装备栏.副手' },
            { name: '头部', path: '装备栏.防具.头部' },
            { name: '身体', path: '装备栏.防具.身体' },
            { name: '内衬', path: '装备栏.防具.内衬' },
            { name: '手部', path: '装备栏.防具.手部' },
            { name: '腿部', path: '装备栏.防具.腿部' },
            { name: '饰品', path: '装备栏.饰品' }
        ];

        const parts = [];
        const PLACEHOLDERS = new Set(['', 'null', 'none', 'nil', '未装备', '无', '暂无', 'n/a', 'na', '-', '—', '_']);

        for (const slot of equipmentSlots) {
            let raw = this.dataManager.SafeGetValue(`${basePath}.${slot.path}`);
            
            // 处理数组
            if (Array.isArray(raw)) {
                raw = raw.filter(x => x !== null && x !== undefined);
                raw = raw.length > 0 ? raw[0] : null;
            }

            if (!raw) continue;

            let itemName = '';
            let itemDesc = '';
            let itemTier = '普通';
            let itemBonus = '';

            if (typeof raw === 'string') {
                const s = raw.trim();
                if (PLACEHOLDERS.has(s.toLowerCase())) continue;
                itemName = s;
            } else if (typeof raw === 'object' && raw !== null) {
                // Handle nested object structure like "武器": { "null": { "name": "..." } }
                const itemKeys = Object.keys(raw);
                const itemData = itemKeys.length > 0 ? raw[itemKeys[0]] : raw;

                if (typeof itemData === 'object' && itemData !== null) {
                    itemName = itemData.name || itemData.名称 || '';
                    itemDesc = itemData.description || itemData.描述 || '';
                    itemTier = itemData.tier || '普通';

                    if (itemData.attributes_bonus && typeof itemData.attributes_bonus === 'object') {
                        const bonusList = Object.entries(itemData.attributes_bonus)
                            .map(([attr, val]) => `${attr} +${val}`)
                            .join('，');
                        if (bonusList) {
                            itemBonus = bonusList;
                        }
                    }
                } else if (typeof raw.name === 'string') {
                     itemName = raw.name || raw.名称 || '';
                     itemDesc = raw.description || raw.描述 || '';
                     itemTier = raw.tier || '普通';
                }
            }

            if (!itemName) continue;

            let entry = `<div class="property">
                <span class="property-name">${slot.name}:</span> 
                <span class="value-main gradient-text gradient-text-tier-${itemTier}">${itemName}</span>
                <span class="tier-badge tier-${itemTier}">${itemTier}</span>`;
            
            if (itemBonus) {
                entry += `<div class="quote-text" style="font-size: 0.9em; margin-top: 4px;">${itemBonus}</div>`;
            }
            
            if (itemDesc) {
                entry += `<div class="quote-text" style="font-size: 0.9em; margin-top: 4px;">${itemDesc}</div>`;
            }
            
            entry += `</div>`;
            parts.push(entry);
        }

        if (parts.length === 0) {
            return '<p style="color: var(--secondary-text-color); font-style: italic;">无装备信息</p>';
        }

        return parts.join('<hr class="thin-divider" style="margin: 8px 0;">');
    }
}