import { Logger } from './logger.js';

/**
 * Skill Tree Data Loader
 * 从世界书加载技能树数据库
 */
export class SkillTreeLoader {
    constructor() {
        this.skillTreeData = null;
        this.SKILL_LEVEL_MAP = {
            1: { rank: '初级', bonus: 1 },
            2: { rank: '中级', bonus: 2 },
            3: { rank: '高级', bonus: 3 },
            4: { rank: '精通', bonus: 4 },
            5: { rank: '大师', bonus: 5 },
        };
    }

    async load() {
        // 只从本地 JSON 文件加载
        const localLoaded = await this.loadFromLocalFile();
        if (!localLoaded) {
            Logger.warn('技能树数据加载失败，技能树功能不可用');
        }
        return localLoaded;
    }

    /**
     * 从本地 JSON 文件加载技能树数据
     * @returns {Promise<boolean>} 是否加载成功
     */
    async loadFromLocalFile() {
        try {
            Logger.log('正在从本地文件加载技能树数据...');
            // 使用相对路径确保在任何环境下都能正确找到文件
            const url = new URL('../../data/skill_trees.json', import.meta.url);
            const response = await fetch(url);
            
            if (!response.ok) {
                Logger.warn(`本地技能树文件加载失败: HTTP ${response.status} at ${url}`);
                return false;
            }

            this.skillTreeData = await response.json();
            Logger.success('成功从本地文件加载技能树数据库');
            return true;
        } catch (error) {
            Logger.warn('从本地文件加载技能树失败:', error);
            return false;
        }
    }


    getSkillTreeData() {
        return this.skillTreeData;
    }

    findSkillDefinitionById(skillId) {
        if (!this.skillTreeData) return null;
        
        for (const jobKey in this.skillTreeData) {
            const job = this.skillTreeData[jobKey];
            const skills = this._getSkillsArray(job);
            const skill = skills.find(s => s?.id === skillId);
            if (skill) return { skill, jobKey };
        }
        return null;
    }

    findSkillDefinitionByName(skillName) {
        if (!this.skillTreeData) return null;
        
        for (const jobKey in this.skillTreeData) {
            const job = this.skillTreeData[jobKey];
            const skills = this._getSkillsArray(job);
            const skill = skills.find(s => s?.name === skillName);
            if (skill) return { skill, jobKey };
        }
        return null;
    }

    _getSkillsArray(job) {
        const src = job?.skills;
        if (!src) return [];
        if (Array.isArray(src)) return src;
        if (typeof src === 'object') return Object.values(src);
        return [];
    }

    getNumericSkillLevel(skillData) {
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
}
