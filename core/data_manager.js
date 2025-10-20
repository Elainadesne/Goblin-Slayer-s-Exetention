import { Logger } from './logger.js';
export class DataManager {
    constructor() {
        this.mvuData = null;
        this.skillTreeData = null;
        this.industryImageData = null;
        this.relationsImageData = null;
    }

    async loadAllData() {
        Logger.log('Loading MVU data...');
        await this.loadMvuData();
        Logger.log('Loading skill tree data...');
        await this.loadSkillTreeData();
        Logger.log('Loading industry image data...');
        await this.loadIndustryImageData();
        Logger.log('Loading relations image data...');
        await this.loadRelationsImageData();
        Logger.success('All data loaded.');
    }

    async loadMvuData() {
        // Mvu is now guaranteed to be on the parent window by app.js
        const Mvu = window.parent.Mvu;
        if (!Mvu || typeof Mvu.getMvuData !== 'function') {
            throw new Error('MVU API not found or not ready.');
        }
        
        // getMvuData might return stat_data directly, or wrapped in { stat_data: {...} }
        let rawData = await Mvu.getMvuData({ type: 'message', message_id: 'latest' });
        
        // Check data structure
        
        // Handle both cases: direct stat_data or wrapped in stat_data property
        if (rawData?.stat_data && typeof rawData.stat_data === 'object') {
            // MVU returned data with stat_data wrapper, unwrap it
            this.mvuData = rawData.stat_data;
        } else if (rawData && typeof rawData === 'object') {
            // MVU returned stat_data directly
            this.mvuData = rawData;
        } else {
            // Invalid data, use empty object
            this.mvuData = {};
        }
    }

    SafeGetValue(path, defaultValue = null) {
        if (!this.mvuData) {
            console.warn(`SafeGetValue called before mvuData is ready. Path: ${path}`);
            return defaultValue;
        }
        
        // Don't use Mvu.getMvuVariable - it's broken!
        // Use native JavaScript path traversal instead
        try {
            const keys = path.split('.');
            let value = this.mvuData;
            
            for (const key of keys) {
                if (value === null || value === undefined) {
                    return defaultValue;
                }
                value = value[key];
            }
            
            return value !== undefined ? value : defaultValue;
        } catch (error) {
            console.warn(`SafeGetValue error for path "${path}":`, error);
            return defaultValue;
        }
    }

    async loadSkillTreeData() {
        try {
            const TH = window.parent.TavernHelper;
            if (!TH) throw new Error('TavernHelper is not available.');
            const getCharWorldbookNames = TH.getCharWorldbookNames;
            const getWorldbook = TH.getWorldbook;
            const charBooks = getCharWorldbookNames('current');
            const primaryBookName = charBooks.primary;
            if (!primaryBookName) {
                console.warn('No primary worldbook bound, skill tree is unavailable.');
                this.skillTreeData = null;
                return;
            }
            const entries = await getWorldbook(primaryBookName);
            const skillTreeEntry = entries.find(entry => entry.strategy.keys.includes('skill_tree_database'));
            if (skillTreeEntry) {
                this.skillTreeData = JSON.parse(skillTreeEntry.content);
                console.log(`Skill tree data loaded from [${primaryBookName}].`);
            } else {
                this.skillTreeData = null;
            }
        } catch (e) {
            console.error('Error loading skill tree data:', e);
            this.skillTreeData = null;
        }
    }

    async loadIndustryImageData() {
        try {
            const TH = window.parent.TavernHelper;
            if (!TH) throw new Error('TavernHelper is not available.');
            const getCharWorldbookNames = TH.getCharWorldbookNames;
            const getWorldbook = TH.getWorldbook;
            const charBooks = getCharWorldbookNames('current');
            const primaryBookName = charBooks.primary;
            if (!primaryBookName) {
                this.industryImageData = null;
                return;
            }
            const entries = await getWorldbook(primaryBookName);
            const imgEntry = entries.find(entry => entry.strategy?.keys?.includes('industry_image_database'));
            if (imgEntry) {
                this.industryImageData = JSON.parse(imgEntry.content);
                console.log(`Industry image data loaded from [${primaryBookName}].`);
            } else {
                this.industryImageData = null;
            }
        } catch (e) {
            console.error('Error loading industry image data:', e);
            this.industryImageData = null;
        }
    }

    async loadRelationsImageData() {
        try {
            const TH = window.parent.TavernHelper;
            if (!TH) throw new Error('TavernHelper is not available.');
            const getCharWorldbookNames = TH.getCharWorldbookNames;
            const getWorldbook = TH.getWorldbook;
            const charBooks = getCharWorldbookNames('current');
            const primaryBookName = charBooks.primary;
            if (!primaryBookName) {
                this.relationsImageData = null;
                return;
            }
            const entries = await getWorldbook(primaryBookName);
            const imgEntry = entries.find(entry => entry.strategy?.keys?.includes('relations_image_database'));
            if (imgEntry) {
                this.relationsImageData = JSON.parse(imgEntry.content);
                console.log(`Relations image data loaded from [${primaryBookName}].`);
            } else {
                this.relationsImageData = null;
            }
        } catch (e) {
            console.error('Error loading relations image data:', e);
            this.relationsImageData = null;
        }
    }

    findSkillDefinitionByName(skillName) {
        if (!this.skillTreeData || !this.skillTreeData.jobs) return null;
        for (const job of Object.values(this.skillTreeData.jobs)) {
            if (!job || !job.tiers) continue; // Add null check for job and job.tiers
            for (const tier of Object.values(job.tiers)) {
                if (!tier || !tier.skills) continue; // Add null check for tier and tier.skills
                const skillDef = tier.skills.find(s => s && s.name === skillName);
                if (skillDef) {
                    return {
                        job: { id: job.id, name: job.name },
                        tier: { id: tier.id, name: tier.name },
                        skill: skillDef,
                    };
                }
            }
        }
        return null;
    }
}