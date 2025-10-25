import { Logger } from './logger.js';

/**
 * Image Database Loader
 * 从世界书加载图床数据库（产业和关系者）
 */
export class ImageDatabaseLoader {
    constructor() {
        this.industryImageData = null;
        this.relationsImageData = null;
    }

    async loadIndustryImages() {
        try {
            if (typeof getCharWorldbookNames === 'undefined' || typeof getWorldbook === 'undefined') {
                Logger.warn('SillyTavern世界书API不可用，产业图床功能将被禁用');
                return false;
            }

            const charBooks = getCharWorldbookNames('current');
            const primaryBookName = charBooks.primary;
            
            if (!primaryBookName) {
                Logger.warn('当前角色卡没有绑定主世界书，产业图床功能不可用');
                return false;
            }

            const entries = await getWorldbook(primaryBookName);
            const imgEntry = entries.find(entry => 
                entry.strategy?.keys?.includes('industry_image_database')
            );

            if (imgEntry) {
                this.industryImageData = JSON.parse(imgEntry.content);
                Logger.success(`成功从主世界书 [${primaryBookName}] 加载产业图床数据库`);
                return true;
            } else {
                Logger.warn(`在主世界书 [${primaryBookName}] 中未找到 'industry_image_database' 条目`);
                return false;
            }
        } catch (error) {
            Logger.error('加载产业图床数据库失败:', error);
            return false;
        }
    }

    async loadRelationsImages() {
        try {
            if (typeof getCharWorldbookNames === 'undefined' || typeof getWorldbook === 'undefined') {
                Logger.warn('SillyTavern世界书API不可用，关系者图床功能将被禁用');
                return false;
            }

            const charBooks = getCharWorldbookNames('current');
            const primaryBookName = charBooks.primary;
            
            if (!primaryBookName) {
                Logger.warn('当前角色卡没有绑定主世界书，关系者图床功能不可用');
                return false;
            }

            const entries = await getWorldbook(primaryBookName);
            const imgEntry = entries.find(entry => 
                entry.strategy?.keys?.includes('relations_image_database')
            );

            if (imgEntry) {
                this.relationsImageData = JSON.parse(imgEntry.content);
                Logger.success(`成功从主世界书 [${primaryBookName}] 加载关系者图床数据库`);
                return true;
            } else {
                Logger.warn(`在主世界书 [${primaryBookName}] 中未找到 'relations_image_database' 条目`);
                return false;
            }
        } catch (error) {
            Logger.error('加载关系者图床数据库失败:', error);
            return false;
        }
    }

    async loadAll() {
        const results = await Promise.all([
            this.loadIndustryImages(),
            this.loadRelationsImages()
        ]);
        return results.some(r => r); // 至少一个成功
    }

    getIndustryImageData() {
        return this.industryImageData;
    }

    getRelationsImageData() {
        return this.relationsImageData;
    }
}
