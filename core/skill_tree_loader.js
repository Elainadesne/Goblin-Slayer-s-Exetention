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
        // 策略 1: 优先从本地 JSON 文件加载
        const localLoaded = await this.loadFromLocalFile();
        if (localLoaded) {
            return true;
        }

        // 策略 2: 从世界书加载（备用方案）
        Logger.log('本地技能树文件加载失败，尝试从世界书加载...');
        const worldbookLoaded = await this.loadFromWorldbook();
        if (worldbookLoaded) {
            return true;
        }

        Logger.warn('技能树数据加载失败，技能树功能不可用');
        return false;
    }

    /**
     * 从本地 JSON 文件加载技能树数据
     * @returns {Promise<boolean>} 是否加载成功
     */
    async loadFromLocalFile() {
        try {
            Logger.log('正在从本地文件加载技能树数据...');
            
            const response = await fetch('./data/skill_trees.json');
            
            if (!response.ok) {
                Logger.warn(`本地技能树文件加载失败: HTTP ${response.status}`);
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

    /**
     * 从世界书加载技能树数据（备用方案）
     * @returns {Promise<boolean>} 是否加载成功
     */
    async loadFromWorldbook() {
        try {
            // 检查SillyTavern API
            if (typeof getCharWorldbookNames === 'undefined' || typeof getWorldbook === 'undefined') {
                Logger.warn('SillyTavern世界书API不可用');
                return false;
            }

            const charBooks = getCharWorldbookNames('current');
            const primaryBookName = charBooks.primary;
            
            if (!primaryBookName) {
                Logger.warn('当前角色卡没有绑定主世界书');
                return false;
            }

            const entries = await getWorldbook(primaryBookName);
            const skillTreeEntry = entries.find(entry => 
                entry.strategy?.keys?.includes('skill_tree_database')
            );

            if (skillTreeEntry) {
                this.skillTreeData = JSON.parse(skillTreeEntry.content);
                Logger.success(`成功从主世界书 [${primaryBookName}] 加载技能树数据库`);
                return true;
            } else {
                Logger.warn(`在主世界书 [${primaryBookName}] 中未找到 'skill_tree_database' 条目`);
                return false;
            }
        } catch (error) {
            Logger.error('从世界书加载技能树失败:', error);
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
