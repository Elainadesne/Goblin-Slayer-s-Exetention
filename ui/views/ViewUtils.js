export const ViewUtils = {
    /**
     * Filter out MVU metadata keys (keys starting with $)
     * @param {Object} obj - The object to filter
     * @returns {Array} - Array of non-meta keys
     */
    filterMetaKeys(obj) {
        if (!obj || typeof obj !== 'object') return [];
        return Object.keys(obj).filter(key => !key.startsWith('$'));
    },

    /**
     * Get entries without MVU metadata keys
     * @param {Object} obj - The object to get entries from
     * @returns {Array} - Array of [key, value] pairs without meta keys
     */
    filterMetaEntries(obj) {
        if (!obj || typeof obj !== 'object') return [];
        return Object.entries(obj).filter(([key]) => !key.startsWith('$'));
    },

    createProgressBar(current, max, color) {
        const c = Number(current) || 0;
        const m = Number(max) || 100;
        const percentage = m > 0 ? (c / m) * 100 : 0;
        const colorVarMap = {
            '#ff6b6b': 'var(--hp-color)',
            '#8cb4ff': 'var(--armor-color)',
            '#c792ea': 'var(--resource-color)',
            '#fffac8': 'var(--faith-color)',
            '#5fdba7': 'var(--stamina-color)',
            'var(--xp-color)': 'var(--xp-color)',
            '#ff85a2': 'var(--love-color)',
            '#85e0ff': 'var(--trust-color)',
        };
        const finalColor = colorVarMap[color] || color;
        return `<div class="progress-bar-container"><div class="progress-bar-value" style="width: ${percentage}%; background-color: ${finalColor};"></div></div>`;
    },

    formatEquipment(basePath, dataManager) {
        const equipmentMap = {
            武器: '武器',
            副手: '副手',
            头: '防具.头部',
            身: '防具.身体',
            内衬: '防具.内衬',
            手: '防具.手部',
            腿: '防具.腿部',
            饰品: '饰品',
        };

        const itemPools = {
            ...dataManager.SafeGetValue('主角.武器列表', {}),
            ...dataManager.SafeGetValue('主角.防具列表', {}),
            ...dataManager.SafeGetValue('主角.饰品列表', {}),
            ...dataManager.SafeGetValue('主角.消耗品列表', {}),
            ...dataManager.SafeGetValue('主角.材料与杂物列表', {}),
        };

        const getNameFromObject = obj => {
            if (!obj || typeof obj !== 'object') return '';
            const keys = ['name', '名称'];
            for (const k of keys) {
                const v = obj[k];
                if (typeof v === 'string' && v.trim()) return v.trim();
            }
            return '';
        };

        const allItemsByName = {};
        for (const [k, v] of Object.entries(itemPools)) {
            if (k.startsWith('$')) continue; // Skip meta properties
            if (v && typeof v === 'object') {
                const n = getNameFromObject(v);
                if (n && !allItemsByName[n]) allItemsByName[n] = v;
                if (!allItemsByName[k]) allItemsByName[k] = v;
            }
        }

        const PLACEHOLDERS = new Set(['', 'null', 'none', 'nil', '未装备', '无', '暂无', 'n/a', 'na', '-', '—', '_', '未携带', '无装备', '无物品']);

        const normalizeFirst = raw => {
            if (Array.isArray(raw)) {
                const arr = raw.filter(x => x !== null && x !== undefined);
                return arr.length ? arr[0] : null;
            }
            return raw;
        };

        let parts = [];

        for (const [slotName, slotPath] of Object.entries(equipmentMap)) {
            let raw = normalizeFirst(dataManager.SafeGetValue(`${basePath}.${slotPath}`));
            if (raw === null || raw === undefined) continue;

            let item = null;
            let name = '';

            if (typeof raw === 'object') {
                item = raw;
                name = getNameFromObject(item);
                if (!name) continue;
            } else if (typeof raw === 'string') {
                const s = raw.trim();
                if (PLACEHOLDERS.has(s.toLowerCase())) continue;
                if (allItemsByName[s] && typeof allItemsByName[s] === 'object') {
                    item = allItemsByName[s];
                    name = getNameFromObject(item) || s;
                } else {
                    continue;
                }
            } else {
                continue;
            }

            const itemTier = item && typeof item === 'object' && item.tier ? item.tier : '普通';

            let entry = `<div class="property"><span class="property-name">${slotName}:</span> <span class="value-main gradient-text gradient-text-tier-${itemTier}">${name}</span> <span class="tier-badge tier-${itemTier}">${itemTier}</span>`;

            if (item && typeof item === 'object') {
                if (
                    item.attributes_bonus &&
                    typeof item.attributes_bonus === 'object' &&
                    Object.keys(item.attributes_bonus).length > 0
                ) {
                    const bonusList = Object.entries(item.attributes_bonus)
                        .map(([attr, val]) => `${attr}: ${val}`)
                        .join('，');
                    entry += `<div class="quote-text" style="font-size: 0.9em;">${bonusList}</div>`;
                }
                if (item.description) {
                    entry += `<div class="quote-text">${item.description}</div>`;
                }
                if (item.special_effects) {
                    if (typeof item.special_effects === 'string') {
                        entry += `<div class="quote-text" style="font-size: 0.9em; color: var(--love-color);"><b>特殊效果:</b>${item.special_effects}</div>`;
                    } else if (typeof item.special_effects === 'object' && Object.keys(item.special_effects).length > 0) {
                        const effectsList = Object.entries(item.special_effects)
                            .map(([n, d]) => `${n}: ${d}`)
                            .join('<br>');
                        entry += `<div class="quote-text" style="font-size: 0.9em; color: var(--love-color);"><b>特殊效果:<br></b>
        ${effectsList}</div>`;
                    }
                }
            }

            entry += `</div>`;
            parts.push(entry);
        }

        return parts.length === 0 ? '<p>无装备</p>' : parts.join('<hr class="thin-divider" style="margin: 8px 0;">');
    },

    formatSkills(basePath, dataManager, SKILL_LEVEL_MAP) {
        const skills = dataManager.SafeGetValue(basePath, {});
        const skillEntries = this.filterMetaEntries(skills);
        if (skillEntries.length === 0) return '<p>无</p>';

        return skillEntries
            .map(([name, data]) => {
                const skillPath = `${basePath}.${name}`;
                const costValue = dataManager.SafeGetValue(`${skillPath}.cost`, '无');

                const skillDef = dataManager.findSkillDefinitionByName(name);
                const skillId = skillDef ? skillDef.skill.id : null;

                let resourceType = '';
                if (skillId != null) {
                    resourceType = '体力值';
                    if (
                        skillId.startsWith('spell_') ||
                        skillId.startsWith('mage_') ||
                        skillId.startsWith('spirituser_') ||
                        skillId.startsWith('priest_')
                    ) {
                        resourceType = '魔力值';
                    }
                }

                const costText =
                    costValue !== '无' && !isNaN(parseFloat(costValue)) ? `${costValue} ${resourceType}` : costValue;

                const skillData = dataManager.SafeGetValue(skillPath, {});
                const numericLevel = this._getNumericSkillLevel(skillData, SKILL_LEVEL_MAP);
                const rankText = SKILL_LEVEL_MAP[numericLevel]?.rank || numericLevel || '?';
                const rankClass = typeof rankText === 'string' ? rankText : String(rankText);

                return `
                        <details class="item-entry">
                            <summary>
                                <span class="value-main gradient-text gradient-text-rank-${rankClass}">${name}</span>
                                [Lv.<span class="gradient-text gradient-text-rank-${rankClass}">${rankText}</span>]
                                <span class="arrow-toggle">›</span>
                            </summary>
                            <div class="item-content">
                                <p><b>消耗:</b> ${costText}</p>
                                <div class="quote-text">${dataManager.SafeGetValue(`${skillPath}.description`, '暂无描述。')}</div>
                            </div>
                        </details>`;
            })
            .join('');
    },

    _getNumericSkillLevel(skillData, SKILL_LEVEL_MAP) {
        if (!skillData) return 0;
        const levelValue = skillData.level ?? skillData.等级;
        if (typeof levelValue === 'number') {
            return levelValue;
        }
        if (typeof levelValue === 'string') {
            for (const [lvl, data] of Object.entries(SKILL_LEVEL_MAP)) {
                if (data.rank === levelValue) {
                    return Number(lvl);
                }
            }
        }
        return 0;
    }
};