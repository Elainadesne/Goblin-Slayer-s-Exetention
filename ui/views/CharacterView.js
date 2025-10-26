import { Logger } from '../../core/logger.js';
import { ViewUtils } from './ViewUtils.js';
import { RadarChart } from '../../utils/radar_chart.js';

export class CharacterView {
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
        
        // 雷达图缓存（性能优化）
        this.radarChartCache = null;
        this.lastAbilityData = null;
        this.currentNavItem = null;
    }

    render(navItem = '状态', subItem = null) {
        Logger.log(`[CharacterView] render called: navItem="${navItem}", subItem="${subItem}"`);
        
        if (!this.elements.statusContentDetail) {
            Logger.error('[CharacterView] statusContentDetail element not found!');
            return;
        }

        try {
            // 跟踪当前导航项（用于性能优化）
            this.currentNavItem = navItem;
            
            // Base path for character data (mvuData already IS stat_data)
            const basePath = '主角';
            let content = '';

            Logger.log(`[CharacterView] Rendering for navItem: ${navItem}`);

            switch (navItem) {
                case '状态':
                    Logger.log('[CharacterView] Rendering core stats...');
                    content = this.renderCoreStats(basePath);
                    break;
                case '属性':
                    Logger.log('[CharacterView] Rendering attributes...');
                    content = this.renderAttributes(basePath);
                    break;
                case '当前状态':
                    Logger.log('[CharacterView] Rendering statuses...');
                    content = this.formatStatuses(`${basePath}.当前状态`);
                    break;
                case '装备':
                    if (subItem === '背包') {
                        Logger.log('[CharacterView] Rendering inventory...');
                        content = this.renderInventoryModern(basePath);
                    } else {
                        Logger.log('[CharacterView] Rendering equipment...');
                        content = this.renderEquipmentModern(basePath);
                    }
                    break;
                default:
                    Logger.warn(`[CharacterView] Unknown navItem: ${navItem}`);
                    content = '<p>未知的导航项。</p>';
            }

            this.elements.statusContentDetail.innerHTML = content;
            Logger.success(`[CharacterView] Render completed for ${navItem}${subItem ? ` > ${subItem}` : ''}`);

        } catch (error) {
            Logger.error(`[CharacterView] Failed to render character view for '${navItem}':`, error);
            this.elements.statusContentDetail.innerHTML = `<p class="error-message">渲染 '${navItem}' 失败: ${error.message}</p>`;
        }
    }

    /**
     * 清除雷达图缓存（当数据更新时调用）
     * 用于性能优化，确保数据变化时重新渲染
     */
    clearRadarChartCache() {
        this.radarChartCache = null;
        this.lastAbilityData = null;
        Logger.log('[CharacterView] Radar chart cache cleared');
    }

    renderCoreStats(basePath) {
        // Get character data
        const name = this.dataManager.SafeGetValue(`${basePath}.姓名`, '未知角色');
        const race = this.dataManager.SafeGetValue(`${basePath}.种族`, '未知生物');
        const gender = this.dataManager.SafeGetValue(`${basePath}.性别`, '未知');

        // Debug log
        console.log('[CharacterView] 角色名字:', name);
        const expLevel = this.dataManager.SafeGetValue(`${basePath}.经验等级`, 0);
        const jobPoints = this.dataManager.SafeGetValue(`${basePath}.职业点数`, 0);

        const jobs = this.dataManager.SafeGetValue(`${basePath}.职业`, {});
        const jobEntries = ViewUtils.filterMetaEntries(jobs)
            .map(([name, data]) => ({
                name,
                level: data['当前等级'] || 1
            }))
            .sort((a, b) => b.level - a.level); // 按等级降序排序

        const primaryJob = jobEntries.length > 0 ? jobEntries[0] : null;
        const subJobs = jobEntries.length > 1 ? jobEntries.slice(1) : [];

        const jobName = primaryJob ? primaryJob.name : '无职业';
        const jobLevel = primaryJob ? primaryJob.level : 0;

        const subJobsHTML = subJobs.length > 0
            ? `<div class="hero-sub-jobs">
                 <span class="sub-jobs-label">副职业:</span>
                 ${subJobs.map(job => `<span>${job.name} Lv.${job.level}</span>`).join(' · ')}
               </div>`
            : '';

        const guild = this.dataManager.SafeGetValue(`${basePath}.公会信息.所属公会`, '无');
        const guildRank = this.dataManager.SafeGetValue(`${basePath}.公会信息.公会阶级`, '无阶级');

        // Get stats
        const currentHP = this.dataManager.SafeGetValue(`${basePath}.生命值.当前值`, 0);
        const maxHP = this.dataManager.SafeGetValue(`${basePath}.生命值.最大值`, 1);
        const currentArmor = this.dataManager.SafeGetValue(`${basePath}.护甲值.当前值`, 0);
        const maxArmor = this.dataManager.SafeGetValue(`${basePath}.护甲值.最大值`, 1);
        const currentMP = this.dataManager.SafeGetValue(`${basePath}.魔力值.当前值`, 0);
        const maxMP = this.dataManager.SafeGetValue(`${basePath}.魔力值.最大值`, 1);
        const currentFaith = this.dataManager.SafeGetValue(`${basePath}.信仰力值.当前值`, 0);
        const maxFaith = this.dataManager.SafeGetValue(`${basePath}.信仰力值.最大值`, 1);
        const currentStamina = this.dataManager.SafeGetValue(`${basePath}.体力值.当前值`, 0);
        const maxStamina = this.dataManager.SafeGetValue(`${basePath}.体力值.最大值`, 1);
        const currentXP = this.dataManager.SafeGetValue(`${basePath}.职业经验.当前值`, 0);
        const maxXP = this.dataManager.SafeGetValue(`${basePath}.职业经验.升级所需`, 1000);

        return `
            <div class="hero-status-layout">
                <!-- Hero Header Card -->
                <div class="hero-header-card">
                    <div class="hero-name-section">
                        <div class="hero-name">${name}</div>
                        <div class="hero-subtitle">${race} · ${gender}</div>
                    </div>
                    <div class="hero-job-section">
                        <div class="hero-job-name">${jobName}</div>
                        <div class="hero-job-level">Lv.${jobLevel}</div>
                    </div>
                </div>
                ${subJobsHTML}

                <!-- Stats Grid -->
                <div class="hero-stats-grid">
                    <!-- Primary Stats -->
                    <div class="stat-card stat-card-primary">
                        <div class="stat-card-icon">❤️</div>
                        <div class="stat-card-content">
                            <div class="stat-card-value">${currentHP}<span class="stat-card-max">/${maxHP}</span></div>
                            <div class="stat-card-label">生命值</div>
                            <div class="stat-card-bar">
                                <div class="stat-card-bar-fill hp" style="width: ${this.getPercentage(currentHP, maxHP)}%"></div>
                            </div>
                        </div>
                    </div>

                    <div class="stat-card stat-card-primary">
                        <div class="stat-card-icon">🛡️</div>
                        <div class="stat-card-content">
                            <div class="stat-card-value">${currentArmor}<span class="stat-card-max">/${maxArmor}</span></div>
                            <div class="stat-card-label">护甲值</div>
                            <div class="stat-card-bar">
                                <div class="stat-card-bar-fill armor" style="width: ${this.getPercentage(currentArmor, maxArmor)}%"></div>
                            </div>
                        </div>
                    </div>

                    <div class="stat-card stat-card-primary">
                        <div class="stat-card-icon">🔮</div>
                        <div class="stat-card-content">
                            <div class="stat-card-value">${currentMP}<span class="stat-card-max">/${maxMP}</span></div>
                            <div class="stat-card-label">魔力值</div>
                            <div class="stat-card-bar">
                                <div class="stat-card-bar-fill mp" style="width: ${this.getPercentage(currentMP, maxMP)}%"></div>
                            </div>
                        </div>
                    </div>

                    <div class="stat-card stat-card-primary">
                        <div class="stat-card-icon">🌟</div>
                        <div class="stat-card-content">
                            <div class="stat-card-value">${currentFaith}<span class="stat-card-max">/${maxFaith}</span></div>
                            <div class="stat-card-label">信仰力</div>
                            <div class="stat-card-bar">
                                <div class="stat-card-bar-fill faith" style="width: ${this.getPercentage(currentFaith, maxFaith)}%"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Secondary Info Cards -->
                <div class="hero-info-grid">
                    <div class="info-card">
                        <div class="info-card-label">公会</div>
                        <div class="info-card-value">${guild}</div>
                        <div class="info-card-sub">${guildRank}</div>
                    </div>
                    
                    <div class="info-card">
                        <div class="info-card-label">经验等级</div>
                        <div class="info-card-value">${expLevel}</div>
                    </div>
                    
                    <div class="info-card">
                        <div class="info-card-label">职业点数</div>
                        <div class="info-card-value">${jobPoints}</div>
                        <button id="open-skill-tree-button" class="info-card-button">管理</button>
                    </div>
                </div>

                <!-- Progress Bars -->
                <div class="hero-progress-section">
                    <div class="progress-item">
                        <div class="progress-header">
                            <span class="progress-icon">⚡</span>
                            <span class="progress-label">体力值</span>
                            <span class="progress-value">${currentStamina} / ${maxStamina}</span>
                        </div>
                        <div class="progress-bar-modern">
                            <div class="progress-bar-fill stamina" style="width: ${this.getPercentage(currentStamina, maxStamina)}%"></div>
                        </div>
                    </div>

                    <div class="progress-item">
                        <div class="progress-header">
                            <span class="progress-icon">⭐</span>
                            <span class="progress-label">职业经验</span>
                            <span class="progress-value">${currentXP} / ${maxXP}</span>
                        </div>
                        <div class="progress-bar-modern">
                            <div class="progress-bar-fill xp" style="width: ${this.getPercentage(currentXP, maxXP)}%"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderAttributes(basePath) {
        const totalAbilities = this.dataManager.SafeGetValue(`${basePath}.总能力`, {});
        const abilityKeys = ViewUtils.filterMetaKeys(totalAbilities);
        if (abilityKeys.length === 0) return '<p>无能力数据。</p>';

        // 准备雷达图数据
        const radarData = {};
        abilityKeys.forEach(key => {
            radarData[key] = this.dataManager.SafeGetValue(`${basePath}.总能力.${key}`, 0);
        });

        // 生成雷达图 HTML（带缓存和性能优化）
        let radarHTML = '';
        
        // 只在"属性"标签页激活时渲染雷达图（性能优化）
        if (this.currentNavItem === '属性') {
            try {
                // 检查数据是否变化（避免不必要的重新渲染）
                const dataString = JSON.stringify(radarData);
                const dataChanged = !this.lastAbilityData || this.lastAbilityData !== dataString;
                
                if (dataChanged) {
                    Logger.log('[CharacterView] Ability data changed, regenerating radar chart');
                    
                    // 动态计算最大值
                    const maxValue = RadarChart.calculateMaxValue(radarData);

                    // 创建雷达图实例
                    const radarChart = new RadarChart({
                        size: 350,
                        levels: 5,
                        maxValue: maxValue,
                        fillColor: 'var(--accent-blue)',
                        strokeColor: 'var(--accent-blue)',
                        fillOpacity: 0.25
                    });

                    // 生成文本摘要（用于可访问性）
                    const textSummary = abilityKeys.map(key => 
                        `${key}: ${radarData[key]}`
                    ).join('，');

                    // 生成雷达图 HTML
                    radarHTML = `
                        <div class="radar-chart-container">
                            <h3 class="radar-chart-title">能力分布</h3>
                            ${radarChart.render(radarData)}
                            <div class="radar-chart-legend">
                                <span class="legend-item">最大值: ${maxValue}</span>
                            </div>
                            <div class="radar-text-summary" role="region" aria-label="能力值文本摘要">
                                ${textSummary}
                            </div>
                        </div>
                    `;
                    
                    // 更新缓存
                    this.radarChartCache = radarHTML;
                    this.lastAbilityData = dataString;
                } else {
                    Logger.log('[CharacterView] Using cached radar chart');
                    radarHTML = this.radarChartCache;
                }
            } catch (error) {
                Logger.error('[CharacterView] Radar chart render failed:', error);
                // 降级：不显示雷达图，只显示卡片
                radarHTML = '';
            }
        }

        // 生成能力卡片 HTML（现有逻辑）
        const cardsHTML = abilityKeys.map(key => {
            const total = this.dataManager.SafeGetValue(`${basePath}.总能力.${key}`, 0);
            const baseCurrent = this.dataManager.SafeGetValue(`${basePath}.基础能力.${key}.当前值`, 0);
            const baseMax = this.dataManager.SafeGetValue(`${basePath}.基础能力.${key}.最大值`, 1);
            const trainingCurrent = this.dataManager.SafeGetValue(`${basePath}.历练值.${key}.当前值`, 0);
            const trainingMax = this.dataManager.SafeGetValue(`${basePath}.历练值.${key}.突破所需`, 100);

            // 根据数值大小决定视觉效果
            let sizeClass = 'attr-small';
            let colorClass = 'attr-low';

            if (total >= 10) {
                sizeClass = 'attr-large';
                colorClass = 'attr-high';
            } else if (total >= 5) {
                sizeClass = 'attr-medium';
                colorClass = 'attr-medium';
            }

            return `
                <div class="attribute-card-modern ${sizeClass}">
                    <div class="attribute-name-modern">${key}</div>
                    <div class="attribute-value-large ${colorClass}">${total}</div>
                    <div class="attribute-details-modern">
                        <div class="attribute-stat">
                            <span class="stat-label">基础</span>
                            <span class="stat-value">${baseCurrent}/${baseMax}</span>
                        </div>
                        <div class="attribute-stat">
                            <span class="stat-label">历练</span>
                            <span class="stat-value">${trainingCurrent}/${trainingMax}</span>
                        </div>
                        <div class="training-progress">
                            <div class="training-progress-fill" style="width: ${this.getPercentage(trainingCurrent, trainingMax)}%"></div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // 组合布局：如果雷达图生成成功，使用响应式布局；否则只显示卡片
        if (radarHTML) {
            return `
                <div class="attributes-layout-with-radar">
                    ${radarHTML}
                    <div class="attributes-cards-container">
                        <div class="attributes-grid-modern">${cardsHTML}</div>
                    </div>
                </div>
            `;
        } else {
            return `<div class="attributes-grid-modern">${cardsHTML}</div>`;
        }
    }

    getAttributeIcon(attrName) {
        const icons = {
            '力量': '💪',
            '敏捷': '🏃',
            '感知': '👁️',
            '知识': '📚',
            '魅力': '✨',
            '信仰力': '🙏',
            '体质': '❤️'
        };
        return icons[attrName] || '⭐';
    }

    renderSkillsModern(basePath) {
        const skills = this.dataManager.SafeGetValue(`${basePath}.技能列表`, {});
        const skillEntries = ViewUtils.filterMetaEntries(skills);

        if (skillEntries.length === 0) {
            return '<p class="empty-message">暂无技能</p>';
        }

        const skillCards = skillEntries.map(([name, data]) => {
            const skillPath = `${basePath}.技能列表.${name}`;
            const description = this.dataManager.SafeGetValue(`${skillPath}.description`, '暂无描述');
            const cost = this.dataManager.SafeGetValue(`${skillPath}.cost`, '无');

            // 获取技能等级
            const skillData = this.dataManager.SafeGetValue(skillPath, {});
            const numericLevel = this._getNumericSkillLevel(skillData);
            const rankText = this.SKILL_LEVEL_MAP[numericLevel]?.rank || numericLevel || '?';
            const rankClass = typeof rankText === 'string' ? rankText : String(rankText);

            // 判断资源类型
            const skillDef = this.dataManager.findSkillDefinitionByName(name);
            const skillId = skillDef ? skillDef.skill.id : null;
            let resourceType = '体力值';
            let resourceIcon = '⚡';

            if (skillId && (skillId.startsWith('spell_') || skillId.startsWith('mage_') ||
                skillId.startsWith('spirituser_') || skillId.startsWith('priest_'))) {
                resourceType = '魔力值';
                resourceIcon = '🔮';
            }

            const costText = cost !== '无' && !isNaN(parseFloat(cost)) ? `${cost} ${resourceType}` : cost;

            return `
                <div class="skill-card-modern rank-${rankClass}">
                    <div class="skill-card-header">
                        <div class="skill-card-icon">${this.getSkillIcon(name, skillId)}</div>
                        <div class="skill-card-title">
                            <div class="skill-name">${name}</div>
                            <div class="skill-rank rank-${rankClass}">Lv.${rankText}</div>
                        </div>
                    </div>
                    <div class="skill-card-body">
                        <div class="skill-description">${description}</div>
                        <div class="skill-cost">
                            <span class="cost-icon">${resourceIcon}</span>
                            <span class="cost-text">${costText}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        return `<div class="skills-grid-modern">${skillCards}</div>`;
    }

    getSkillIcon(skillName, skillId) {
        // 根据技能名称或ID返回图标
        if (skillName.includes('攻击') || skillName.includes('斩') || skillName.includes('击')) return '⚔️';
        if (skillName.includes('防御') || skillName.includes('盾') || skillName.includes('守')) return '🛡️';
        if (skillName.includes('治疗') || skillName.includes('恢复')) return '💚';
        if (skillName.includes('火') || skillName.includes('焰')) return '🔥';
        if (skillName.includes('冰') || skillName.includes('寒')) return '❄️';
        if (skillName.includes('雷') || skillName.includes('电')) return '⚡';
        if (skillName.includes('风') || skillName.includes('气')) return '💨';
        if (skillName.includes('光') || skillName.includes('圣')) return '✨';
        if (skillName.includes('暗') || skillName.includes('影')) return '🌑';
        if (skillName.includes('毒')) return '☠️';
        return '✦';
    }

    _getNumericSkillLevel(skillData) {
        if (!skillData) return 0;
        const levelValue = skillData.level ?? skillData.等级;
        if (typeof levelValue === 'number') {
            return levelValue;
        }
        if (typeof levelValue === 'string') {
            for (const [lvl, data] of Object.entries(this.SKILL_LEVEL_MAP)) {
                if (data.rank === levelValue) {
                    return Number(lvl);
                }
            }
        }
        return 0;
    }

    renderEquipmentModern(basePath) {
        const equipmentSlots = [
            { name: '武器', path: '装备栏.武器', icon: '⚔️' },
            { name: '副手', path: '装备栏.副手', icon: '🛡️' },
            { name: '头部', path: '装备栏.防具.头部', icon: '👑' },
            { name: '身体', path: '装备栏.防具.身体', icon: '👕' },
            { name: '内衬', path: '装备栏.防具.内衬', icon: '🧥' },
            { name: '手部', path: '装备栏.防具.手部', icon: '🧤' },
            { name: '腿部', path: '装备栏.防具.腿部', icon: '👖' },
            { name: '饰品', path: '装备栏.饰品', icon: '💍' }
        ];

        const itemPools = {
            ...this.dataManager.SafeGetValue(`${basePath}.武器列表`, {}),
            ...this.dataManager.SafeGetValue(`${basePath}.防具列表`, {}),
            ...this.dataManager.SafeGetValue(`${basePath}.饰品列表`, {}),
        };

        const equipmentCards = equipmentSlots.map(slot => {
            let raw = this.dataManager.SafeGetValue(`${basePath}.${slot.path}`);
            if (Array.isArray(raw)) raw = raw[0];

            let itemName = '未装备';
            let itemTier = '普通';
            let itemDesc = '';
            let itemBonus = '';
            let itemEffects = '';

            if (raw && typeof raw === 'string' && raw !== '未装备' && raw !== '无') {
                itemName = raw;
                // 尝试从物品池中获取详细信息
                const itemData = itemPools[raw];
                if (itemData) {
                    itemTier = itemData.tier || '普通';
                    itemDesc = itemData.description || '';
                    if (itemData.attributes_bonus && Object.keys(itemData.attributes_bonus).length > 0) {
                        itemBonus = Object.entries(itemData.attributes_bonus)
                            .map(([attr, val]) => `${attr} +${val}`)
                            .join(' · ');
                    }
                    if (itemData.special_effects) {
                        if (typeof itemData.special_effects === 'string') {
                            itemEffects = itemData.special_effects;
                        } else if (typeof itemData.special_effects === 'object') {
                            itemEffects = Object.entries(itemData.special_effects)
                                .map(([n, d]) => `${n}: ${d}`)
                                .join(' | ');
                        }
                    }
                }
            } else if (raw && typeof raw === 'object') {
                itemName = raw.name || raw.名称 || '未知物品';
                itemTier = raw.tier || '普通';
                itemDesc = raw.description || '';
                if (raw.attributes_bonus && Object.keys(raw.attributes_bonus).length > 0) {
                    itemBonus = Object.entries(raw.attributes_bonus)
                        .map(([attr, val]) => `${attr} +${val}`)
                        .join(' · ');
                }
            }

            const isEmpty = itemName === '未装备';

            return `
                <div class="equipment-card-modern ${isEmpty ? 'empty' : ''} tier-${itemTier}">
                    <div class="equipment-card-content">
                        <div class="equipment-slot-name">${slot.name}</div>
                        <div class="equipment-name-row">
                            <div class="equipment-item-name ${isEmpty ? 'empty-text' : ''} gradient-text gradient-text-tier-${itemTier}">${itemName}</div>
                            ${!isEmpty ? `<span class="tier-badge tier-${itemTier}">${itemTier}</span>` : ''}
                        </div>
                        ${itemBonus ? `<div class="equipment-bonus">${itemBonus}</div>` : ''}
                        ${itemDesc ? `<div class="equipment-desc">${itemDesc}</div>` : ''}
                        ${itemEffects ? `<div class="equipment-effects">${itemEffects}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="equipment-section-modern">
                <h3 class="section-title-modern">
                    <i class="fa-solid fa-shield-halved"></i>
                    装备栏
                </h3>
                <div class="equipment-grid-modern">${equipmentCards}</div>
            </div>
        `;
    }

    renderInventory(basePath) {
        const itemLists = {
            ...this.dataManager.SafeGetValue(`${basePath}.武器列表`, {}),
            ...this.dataManager.SafeGetValue(`${basePath}.防具列表`, {}),
            ...this.dataManager.SafeGetValue(`${basePath}.饰品列表`, {}),
            ...this.dataManager.SafeGetValue(`${basePath}.消耗品列表`, {}),
            ...this.dataManager.SafeGetValue(`${basePath}.材料与杂物列表`, {}),
        };
        const items = ViewUtils.filterMetaEntries(itemLists);

        if (items.length === 0) {
            return '<p>背包是空的。</p>';
        }

        const html = items
            .map(([name, item]) => {
                const tier = item.tier || '普通';
                const quantity = item.quantity || 1;
                const type = item.type || '未分类';
                const description = item.description || '...';

                return `<details class="item-entry" data-tier="${tier}">
                        <summary>
                          <span class="value-main gradient-text gradient-text-tier-${tier}">${name}</span>
                          <span class="item-quantity">x${quantity}</span>
                          <span class="arrow-toggle">›</span>
                        </summary>
                        <div class="item-content">
                          <p><b>类型:</b> ${type} | <b>阶级:</b> ${tier}</p>
                          <div class="quote-text">${description}</div>
                        </div>
                      </details>`;
            })
            .join('');

        const moneyHTML = `<div class="property"><span class="property-name">金钱:</span> <span class="value-main">G: ${this.dataManager.SafeGetValue(`${basePath}.金钱.金币`, 0)} | S: ${this.dataManager.SafeGetValue(`${basePath}.金钱.银币`, 0)} | C: ${this.dataManager.SafeGetValue(`${basePath}.金钱.铜币`, 0)}</span></div>`;
        return moneyHTML + '<hr class="thin-divider">' + `<div class="inventory-grid">${html}</div>`;
    }

    renderQuests(qList, basePath, isDone) {
        if (!qList) return '<p>无</p>';
        const allKeys = ViewUtils.filterMetaKeys(qList);
        if (allKeys.length === 0) return '<p>无</p>';
        const taskKeys = allKeys.filter(name => !this.dataManager.cache.hiddenTasks.includes(name));
        if (taskKeys.length === 0) return '<p>无已显示的条目。</p>';

        return taskKeys
            .map(name => {
                return `<details class="item-entry">
                                <summary class="value-main">
                                    ${isDone ? '✔ ' : ''}${name}
                                    <button class="subtle-button hide-task-button" data-task-name="${name}">隐藏</button>
                                    <span class="arrow-toggle">›</span>
                                </summary>
                                <div class="item-content">
                                    <p><b>目标:</b> ${this.dataManager.SafeGetValue(`${basePath}.${name}.目标`, '?')}</p>
                                    <p><b>奖励:</b> ${this.dataManager.SafeGetValue(`${basePath}.${name}.奖励`, '?')}</p>
                                </div>
                            </details>`;
            })
            .join('');
    }

    formatStatuses(basePath) {
        const statuses = this.dataManager.SafeGetValue(basePath, {});
        const allKeys = ViewUtils.filterMetaKeys(statuses);
        const statusKeys = allKeys.filter(name => !this.dataManager.cache.hiddenStatuses.includes(name));
        if (statusKeys.length === 0) return '<p>无</p>';

        return statusKeys
            .map(name => {
                const statusPath = `${basePath}.${name}`;
                const level = this.dataManager.SafeGetValue(`${statusPath}.level`, '?');
                const type = this.dataManager.SafeGetValue(`${statusPath}.type`, '未知类型');
                const desc = this.dataManager.SafeGetValue(`${statusPath}.description`, '暂无描述。');
                const bonus = this.dataManager.SafeGetValue(`${statusPath}.attributes_bonus`);
                const effects = this.dataManager.SafeGetValue(`${statusPath}.special_effects`);

                let bonusText = '';
                if (bonus && typeof bonus === 'object' && Object.keys(bonus).length > 0) {
                    const bonusList = Object.entries(bonus)
                        .map(([attr, val]) => `${attr}: ${val}`)
                        .join('，');
                    bonusText = `<div class="quote-text" style="font-size: 0.9em;"><b>效果:</b> ${bonusList}</div>`;
                }
                let effectsText = '';
                if (effects) {
                    if (typeof effects === 'string') {
                        effectsText = effects;
                    } else if (typeof effects === 'object' && Object.keys(effects).length > 0) {
                        const effectsList = Object.entries(effects)
                            .map(([name, description]) => `${name}: ${description}`)
                            .join('</br>');
                        effectsText = `<div class="quote-text" style="font-size: 0.9em; color: var(--love-color);"><b>特殊效果:<br></b>
          ${effectsList}</div>`;
                    }
                }

                return `<details class="item-entry">
                              <summary><b>${name}</b> (Lv.${level}) [${type}]<button class="subtle-button delete-status-button" data-status-name="${name}">删除</button><span class="arrow-toggle">›</span></summary>
                              <div class="item-content">
                                  <div class="quote-text">${desc}</div>
                                  ${bonusText}${effectsText}
                              </div>
                          </details>`;
            })
            .join('');
    }

    createCircleStat(type, icon, label, current, max) {
        const percentage = this.getPercentage(current, max);
        const circumference = 2 * Math.PI * 42; // 2 * pi * r
        const offset = circumference - (percentage / 100) * circumference;

        return `
            <div class="stat-circle">
                <svg width="100" height="100">
                    <circle class="stat-circle-bg" cx="50" cy="50" r="42"></circle>
                    <circle class="stat-circle-fill ${type}" cx="50" cy="50" r="42"
                        stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"></circle>
                </svg>
                <div class="stat-circle-content">
                    <div class="stat-circle-icon">${icon}</div>
                    <div class="stat-circle-value">${current}/${max}</div>
                    <div class="stat-circle-label">${label}</div>
                </div>
            </div>
        `;
    }

    getPercentage(current, max) {
        const c = Number(current) || 0;
        const m = Number(max) || 1;
        return m > 0 ? (c / m) * 100 : 0;
    }

    renderInventoryModern(basePath) {
        Logger.log(`[CharacterView] renderInventoryModern called with basePath: ${basePath}`);
        
        // 合并所有物品列表
        const weaponList = this.dataManager.SafeGetValue(`${basePath}.武器列表`, {});
        const armorList = this.dataManager.SafeGetValue(`${basePath}.防具列表`, {});
        const accessoryList = this.dataManager.SafeGetValue(`${basePath}.饰品列表`, {});
        const consumableList = this.dataManager.SafeGetValue(`${basePath}.消耗品列表`, {});
        const materialList = this.dataManager.SafeGetValue(`${basePath}.材料与杂物列表`, {});
        
        Logger.log('[CharacterView] Item lists retrieved:');
        Logger.log(`  武器列表: ${Object.keys(weaponList).length} items`);
        Logger.log(`  防具列表: ${Object.keys(armorList).length} items`);
        Logger.log(`  饰品列表: ${Object.keys(accessoryList).length} items`);
        Logger.log(`  消耗品列表: ${Object.keys(consumableList).length} items`);
        Logger.log(`  材料与杂物列表: ${Object.keys(materialList).length} items`);
        
        const itemLists = {
            ...weaponList,
            ...armorList,
            ...accessoryList,
            ...consumableList,
            ...materialList,
        };

        Logger.log(`[CharacterView] Merged item lists: ${Object.keys(itemLists).length} total items`);
        
        const items = ViewUtils.filterMetaEntries(itemLists);
        Logger.log(`[CharacterView] After filtering meta entries: ${items.length} items`);

        if (items.length === 0) {
            Logger.warn('[CharacterView] No items found in inventory');
            return '<p class="empty-message">背包是空的</p>';
        }

        // 金钱显示
        const gold = this.dataManager.SafeGetValue(`${basePath}.金钱.金币`, 0);
        const silver = this.dataManager.SafeGetValue(`${basePath}.金钱.银币`, 0);
        const copper = this.dataManager.SafeGetValue(`${basePath}.金钱.铜币`, 0);
        
        Logger.log(`[CharacterView] Money: Gold=${gold}, Silver=${silver}, Copper=${copper}`);
        
        // 获取所有唯一的类型和品质用于筛选
        const types = new Set();
        const tiers = new Set();
        items.forEach(([name, item]) => {
            if (item.type) types.add(item.type);
            if (item.tier) tiers.add(item.tier);
        });
        
        const tierOrder = ['普通', '精良', '稀有', '史诗', '传奇'];
        const sortedTiers = Array.from(tiers).sort((a, b) => {
            return tierOrder.indexOf(a) - tierOrder.indexOf(b);
        });

        // 生成物品卡片（带 data 属性用于筛选）
        const itemCards = items.map(([name, item]) => {
            const tier = item.tier || '普通';
            const quantity = item.quantity || 1;
            const type = item.type || '未分类';
            const description = item.description || '...';

            return `
                <div class="inventory-card-modern tier-${tier}" 
                     data-name="${name.toLowerCase()}" 
                     data-type="${type}" 
                     data-tier="${tier}">
                    <div class="inventory-card-header">
                        <div class="inventory-item-name">${name}</div>
                        <div class="inventory-item-quantity">x${quantity}</div>
                        <button class="subtle-button hide-item-button" data-item-name="${name}">删除</button>
                    </div>
                    <div class="inventory-card-body">
                        <div class="inventory-item-type">${type}</div>
                        ${tier !== '普通' ? `<div class="inventory-tier tier-${tier}">${tier}</div>` : ''}
                        <div class="inventory-item-desc">${description}</div>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="inventory-section-modern">
                <div class="money-display">
                    <div class="money-item">
                        <i class="fa-solid fa-coins" style="color: #FFD700;"></i>
                        <span class="money-label">金币</span>
                        <span class="money-value">${gold}</span>
                    </div>
                    <div class="money-item">
                        <i class="fa-solid fa-coins" style="color: #C0C0C0;"></i>
                        <span class="money-label">银币</span>
                        <span class="money-value">${silver}</span>
                    </div>
                    <div class="money-item">
                        <i class="fa-solid fa-coins" style="color: #CD7F32;"></i>
                        <span class="money-label">铜币</span>
                        <span class="money-value">${copper}</span>
                    </div>
                </div>
                
                <!-- 搜索和筛选栏 -->
                <div class="inventory-filters">
                    <div class="search-box">
                        <i class="fa-solid fa-search"></i>
                        <input type="text" 
                               id="inventory-search" 
                               placeholder="搜索物品..." 
                               class="search-input">
                    </div>
                    <div class="filter-buttons">
                        <select id="type-filter" class="filter-select">
                            <option value="">所有类型</option>
                            ${Array.from(types).map(t => `<option value="${t}">${t}</option>`).join('')}
                        </select>
                        <select id="tier-filter" class="filter-select">
                            <option value="">所有品质</option>
                            ${sortedTiers.map(t => `<option value="${t}">${t}</option>`).join('')}
                        </select>
                        <select id="sort-by" class="filter-select">
                            <option value="name">按名称</option>
                            <option value="type">按类型</option>
                            <option value="tier">按品质</option>
                            <option value="quantity">按数量</option>
                        </select>
                    </div>
                </div>
                
                <div class="inventory-grid-modern" id="inventory-grid">${itemCards}</div>
                
                <div class="inventory-stats">
                    <span id="item-count">${items.length}</span> 个物品
                </div>
            </div>
        `;
    }
}
