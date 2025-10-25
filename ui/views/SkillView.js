/**
 * 技能视图 - 卡片展示
 * 用于查看和释放已学习的技能
 */

import { Logger } from '../../core/logger.js';

export class SkillView {
    constructor(dataManager) {
        this.dataManager = dataManager;
        
        this.SKILL_LEVEL_MAP = {
            0: { rank: '未学习', color: '#666' },
            1: { rank: 'F', color: '#8B4513' },
            2: { rank: 'E', color: '#CD853F' },
            3: { rank: 'D', color: '#DAA520' },
            4: { rank: 'C', color: '#FFD700' },
            5: { rank: 'B', color: '#87CEEB' },
            6: { rank: 'A', color: '#4169E1' },
            7: { rank: 'S', color: '#9370DB' },
            8: { rank: 'SS', color: '#FF1493' },
            9: { rank: 'SSS', color: '#FF0000' }
        };
    }

    /**
     * 渲染技能卡片
     */
    render(container) {
        Logger.log('[SkillView] Rendering skills...');
        
        if (!container) {
            Logger.error('[SkillView] Container is missing!');
            return;
        }

        const basePath = '主角';
        const skills = this.dataManager.SafeGetValue(`${basePath}.技能列表`, {});
        
        // 过滤元数据
        const skillEntries = Object.entries(skills).filter(([key]) => !key.startsWith('<'));

        if (skillEntries.length === 0) {
            container.innerHTML = '<p class="empty-message">暂无技能</p>';
            return;
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

        container.innerHTML = `<div class="skills-grid-modern">${skillCards}</div>`;
        
        Logger.success('[SkillView] Skills rendered successfully');
    }

    /**
     * 获取技能图标
     */
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

    /**
     * 获取数字等级
     * @private
     */
    _getNumericSkillLevel(skillData) {
        if (!skillData) return 0;
        const levelValue = skillData.level ?? skillData.等级 ?? skillData['当前等级'];
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
}
