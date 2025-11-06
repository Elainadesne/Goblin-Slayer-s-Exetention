import { Logger } from './logger.js';
export class DataManager {
  constructor() {
    this.mvuData = null;
    this.skillTreeData = null;
    this.industryImageData = null;
    this.relationsImageData = null;

    // 性能优化：缓存机制
    this.cachedData = null;
    this.isLoading = false;
    this.loadPromise = null;
  }

  async loadAllData() {
    // 防止重复加载
    if (this.isLoading && this.loadPromise) {
      Logger.log('[DataManager] 数据正在加载中，复用现有加载Promise');
      return this.loadPromise;
    }

    this.isLoading = true;

    this.loadPromise = (async () => {
      try {
        Logger.log('[DataManager] 开始并行加载所有数据...');
        const startTime = performance.now();

        // 并行加载所有数据源
        await Promise.all([
          this.loadMvuData(),
          this.loadSkillTreeDataFixed(),
          this.loadImageDataOptimized()
        ]);

        // 更新缓存
        this.cachedData = { ...this.mvuData };

        const endTime = performance.now();
        const duration = (endTime - startTime).toFixed(2);
        Logger.success(`[DataManager] 所有数据加载完成，耗时: ${duration}ms`);

        return true;
      } catch (error) {
        Logger.error('[DataManager] 数据加载失败:', error);
        throw error;
      } finally {
        this.isLoading = false;
        this.loadPromise = null;
      }
    })();

    return this.loadPromise;
  }

  /**
   * 获取缓存数据（立即返回，不等待加载）
   */
  getCachedData() {
    return this.cachedData || this.mvuData;
  }

  async loadMvuData() {
    Logger.log('[DataManager] 开始加载 MVU 数据...');

    // Mvu is now guaranteed to be on the parent window by app.js
    const Mvu = window.parent.Mvu;
    if (!Mvu || typeof Mvu.getMvuData !== 'function') {
      const error = new Error('MVU API 未找到或未就绪');
      Logger.error('[DataManager] MVU API 检查失败', error);
      throw error;
    }

    Logger.log('[DataManager] MVU API 已找到，正在获取数据...');

    try {
      // getMvuData might return stat_data directly, or wrapped in { stat_data: {...} }
      const rawData = await Mvu.getMvuData({ type: 'message', message_id: 'latest' });

      Logger.log('[DataManager] MVU 原始数据已获取');

      // Handle both cases: direct stat_data or wrapped in stat_data property
      if (rawData?.stat_data && typeof rawData.stat_data === 'object') {
        // MVU returned data with stat_data wrapper, unwrap it
        this.mvuData = rawData.stat_data;
        Logger.success('[DataManager] MVU 数据加载成功（包装格式）');
      } else if (rawData && typeof rawData === 'object') {
        // MVU returned stat_data directly
        this.mvuData = rawData;
        Logger.success('[DataManager] MVU 数据加载成功（直接格式）');
      } else {
        // Invalid data, use empty object
        this.mvuData = {};
        Logger.warn('[DataManager] MVU 返回了无效数据，使用空对象');
      }

      // 记录数据概要
      const keys = Object.keys(this.mvuData);
      Logger.log(
        `[DataManager] MVU 数据包含 ${keys.length} 个顶级键: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}`,
      );
    } catch (error) {
      Logger.error('[DataManager] 加载 MVU 数据时发生错误', error);
      throw error;
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

  /**
   * 修复：使用 SkillTreeLoader.load() 而不是从世界书加载
   * 技能树数据现在使用 data/skill_trees.json 中的硬编码数据
   */
  async loadSkillTreeDataFixed() {
    try {
      Logger.log('[DataManager] 加载技能树数据...');

      // 如果有 skillTreeLoader 实例，使用它
      if (window.parent.gsStatusBarApp?.uiController?.skillTreeLoader) {
        const loader = window.parent.gsStatusBarApp.uiController.skillTreeLoader;
        await loader.load();
        this.skillTreeData = loader.getSkillTreeData();
        Logger.success('[DataManager] 技能树数据加载成功');
      } else {
        // 降级方案：直接使用硬编码数据
        Logger.warn('[DataManager] SkillTreeLoader 不可用，使用降级方案');
        this.skillTreeData = null;
      }
    } catch (error) {
      Logger.error('[DataManager] 技能树数据加载失败:', error);
      this.skillTreeData = null;
    }
  }

  /**
   * 优化：一次性加载所有图床数据，减少 worldbook 调用次数
   */
  async loadImageDataOptimized() {
    try {
      Logger.log('[DataManager] 加载图床数据...');

      const TH = window.parent.TavernHelper;
      if (!TH) {
        Logger.warn('[DataManager] TavernHelper 不可用');
        this.industryImageData = null;
        this.relationsImageData = null;
        return;
      }

      const charBooks = TH.getCharWorldbookNames('current');
      const primaryBookName = charBooks.primary;

      if (!primaryBookName) {
        Logger.warn('[DataManager] 没有绑定主世界书');
        this.industryImageData = null;
        this.relationsImageData = null;
        return;
      }

      // 只获取一次 worldbook（优化：从2次减少到1次）
      const entries = await TH.getWorldbook(primaryBookName);

      // 一次性查找所有图床数据
      const industryEntry = entries.find(entry =>
        entry.strategy?.keys?.includes('industry_image_database')
      );
      const relationsEntry = entries.find(entry =>
        entry.strategy?.keys?.includes('relations_image_database')
      );

      this.industryImageData = industryEntry ? JSON.parse(industryEntry.content) : null;
      this.relationsImageData = relationsEntry ? JSON.parse(relationsEntry.content) : null;

      Logger.success('[DataManager] 图床数据加载成功');
    } catch (error) {
      Logger.error('[DataManager] 图床数据加载失败:', error);
      this.industryImageData = null;
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
