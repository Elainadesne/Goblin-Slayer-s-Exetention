import { Logger } from '../../core/logger.js';
import { Toast } from '../../utils/toast.js';

/**
 * Skill Tree View
 * 技能树弹窗视图
 */
export class SkillTreeView {
    constructor(dataManager, skillTreeLoader, elements) {
        this.dataManager = dataManager;
        this.skillTreeLoader = skillTreeLoader;
        this.elements = elements;
        this.pendingUpgrades = [];
    }

    open() {
        if (!this.elements.skillTreeModal) return;
        
        if (!this.skillTreeLoader.getSkillTreeData()) {
            Toast.warning('技能树数据未加载，功能不可用');
            return;
        }
        
        this.render();
        this.elements.skillTreeModal.style.display = 'flex';
    }

    close() {
        if (!this.elements.skillTreeModal) return;
        this.elements.skillTreeModal.style.display = 'none';
        this.pendingUpgrades = [];
    }

    render() {
        if (!this.elements.skillTreeContent) return;

        const basePath = '主角';
        const jobs = this.dataManager.SafeGetValue(`${basePath}.职业`, {});
        const professionPoints = this.dataManager.SafeGetValue(`${basePath}.职业点数`, 0);
        const learnedSkills = this.dataManager.SafeGetValue(`${basePath}.技能列表`, {});
        const renderedSkillNames = new Set();
        
        let html = '';
        let totalCost = 0;

        const isPending = (type, name) => 
            this.pendingUpgrades.some(u => u.type === type && u.name === name);

        // 渲染职业技能
        for (const [jobName, jobData] of Object.entries(jobs)) {
            if (jobName.startsWith('$')) continue; // 跳过元数据
            
            const jobLevel = this.dataManager.SafeGetValue(`${basePath}.职业.${jobName}.当前等级`, 1);
            const jobTree = this.skillTreeLoader.getSkillTreeData()?.[jobName];
            const jobUpgradeCost = 1;
            const canUpgradeJob = professionPoints >= jobUpgradeCost + this.pendingUpgrades.length;
            const isJobPending = isPending('job', jobName);

            html += `
                <div class="skill-tree-job-header">
                    <h3>${jobName} (Lv.${jobLevel})</h3>
                    <button class="inline-button toggle-button" 
                            data-type="job" 
                            data-name="${jobName}" 
                            ${!isJobPending && !canUpgradeJob ? 'disabled' : ''}>
                        ${isJobPending ? '✓ 取消选择' : '⬆ 提升等级'}
                    </button>
                </div>`;

            if (!jobTree) continue;

            html += `<div class="skill-tree">`;
            const skills = this.skillTreeLoader._getSkillsArray(jobTree);
            
            for (const skill of skills) {
                renderedSkillNames.add(skill.name);
                const currentSkillData = learnedSkills[skill.name] || {};
                const currentSkillLevel = this.skillTreeLoader.getNumericSkillLevel(currentSkillData);
                const nextLevelInfo = (Array.isArray(skill.levels) ? skill.levels : Object.values(skill.levels))
                    .find(l => l.level === currentSkillLevel + 1);
                const isSkillPending = isPending('skill', skill.name);

                let skillState = 'mastered';
                let buttonHtml = '<button disabled>已满级</button>';

                if (nextLevelInfo) {
                    const deps = skill.dependencies || [];
                    const dependenciesMet = (Array.isArray(deps) ? deps : Object.values(deps))
                        .every(dep => {
                            const depSkillDef = this.skillTreeLoader.findSkillDefinitionById(dep.skill_id)?.skill;
                            if (!depSkillDef) return true;
                            const depSkillData = learnedSkills[depSkillDef.name] || {};
                            const depSkillLevel = this.skillTreeLoader.getNumericSkillLevel(depSkillData);
                            return depSkillLevel >= dep.level;
                        });
                    
                    const levelMet = jobLevel >= nextLevelInfo.required_job_level;
                    const costMet = professionPoints >= 1 + this.pendingUpgrades.length;

                    if (dependenciesMet && levelMet) {
                        if (costMet || isSkillPending) {
                            skillState = 'learnable';
                            const buttonText = isSkillPending ? '取消选择' : 
                                             (currentSkillLevel === 0 ? '学习' : '升级');
                            buttonHtml = `<button class="toggle-button" data-type="skill" data-name="${skill.name}">${buttonText} (1点)</button>`;
                        } else {
                            skillState = 'locked';
                            buttonHtml = `<button disabled>点数不足</button>`;
                        }
                    } else {
                        skillState = 'locked';
                        const reason = !levelMet ? 
                            `职业等级不足(${nextLevelInfo.required_job_level})` : 
                            '前置未满足';
                        buttonHtml = `<button disabled>${reason}</button>`;
                    }
                }

                html += `
                    <div class="skill-node ${skillState} ${isSkillPending ? 'selected' : ''}">
                        <div class="skill-name">${skill.name} [${currentSkillLevel}/${skill.max_level}]</div>
                        <div class="skill-action">${buttonHtml}</div>
                    </div>`;
            }
            html += `</div>`;
        }

        // 渲染固有技能
        let inherentSkillsHtml = '';
        for (const [skillName, skillData] of Object.entries(learnedSkills)) {
            if (skillName.startsWith('$')) continue;
            if (renderedSkillNames.has(skillName)) continue;

            const currentSkillLevel = this.skillTreeLoader.getNumericSkillLevel(skillData);
            const isSkillPending = isPending('skill', skillName);

            if (currentSkillLevel >= 5) {
                inherentSkillsHtml += `
                    <div class="skill-node mastered">
                        <div class="skill-name">${skillName} [${currentSkillLevel}/5]</div>
                        <div class="skill-action"><button disabled>已满级</button></div>
                    </div>`;
            } else {
                const canUpgrade = professionPoints >= 1 + this.pendingUpgrades.length;
                const skillState = canUpgrade || isSkillPending ? 'learnable' : 'locked';
                const buttonHtml = canUpgrade || isSkillPending ?
                    `<button class="toggle-button" data-type="skill" data-name="${skillName}">${isSkillPending ? '取消选择' : '升级'} (1点)</button>` :
                    `<button disabled>点数不足</button>`;
                
                inherentSkillsHtml += `
                    <div class="skill-node ${skillState} ${isSkillPending ? 'selected' : ''}">
                        <div class="skill-name">${skillName} [${currentSkillLevel}/5]</div>
                        <div class="skill-action">${buttonHtml}</div>
                    </div>`;
            }
        }

        if (inherentSkillsHtml) {
            html += `
                <hr class="thin-divider" style="margin: 20px 0;" />
                <h3 style="font-family: 'Cinzel', serif;">固有技能</h3>
                <div class="skill-tree">${inherentSkillsHtml}</div>`;
        }

        this.elements.skillTreeContent.innerHTML = html;

        // 更新结算栏
        totalCost = this.pendingUpgrades.length;
        this.elements.footerCost.textContent = `总消耗: ${totalCost} 职业点数`;
        this.elements.footerConfirmButton.disabled = totalCost === 0 || professionPoints < totalCost;
    }

    toggleUpgrade(type, name) {
        const index = this.pendingUpgrades.findIndex(u => u.type === type && u.name === name);
        if (index > -1) {
            this.pendingUpgrades.splice(index, 1);
        } else {
            this.pendingUpgrades.push({ type, name });
        }
        this.render();
    }

    async applyUpgrades() {
        const totalCost = this.pendingUpgrades.length;
        if (totalCost === 0) return;

        try {
            const mvuData = await Mvu.getMvuData({ type: 'message', message_id: 'latest' });
            const professionPoints = Mvu.getMvuVariable(mvuData, '主角.职业点数', { default_value: 0 });

            if (professionPoints < totalCost) {
                Toast.error(`职业点数不足 (需 ${totalCost}, 有 ${professionPoints})`);
                return;
            }

            // 扣除点数
            await Mvu.setMvuVariable(mvuData, '主角.职业点数', professionPoints - totalCost);

            // 应用升级
            for (const upgrade of this.pendingUpgrades) {
                if (upgrade.type === 'job') {
                    const currentLevel = Mvu.getMvuVariable(mvuData, `主角.职业.${upgrade.name}.当前等级`, { default_value: 1 });
                    await Mvu.setMvuVariable(mvuData, `主角.职业.${upgrade.name}.当前等级`, currentLevel + 1);
                } else if (upgrade.type === 'skill') {
                    const currentLevel = this.skillTreeLoader.getNumericSkillLevel(
                        Mvu.getMvuVariable(mvuData, `主角.技能列表.${upgrade.name}`, { default_value: {} })
                    );
                    const nextLvl = currentLevel + 1;
                    const newSkillData = await this._buildSkillData(upgrade.name, nextLvl, mvuData);

                    if (newSkillData) {
                        const learnedSkills = Mvu.getMvuVariable(mvuData, '主角.技能列表', { default_value: {} });
                        learnedSkills[upgrade.name] = newSkillData;
                        await Mvu.setMvuVariable(mvuData, '主角.技能列表', learnedSkills);
                    }
                }
            }

            // 持久化
            await Mvu.replaceMvuData(mvuData, { type: 'message', message_id: 'latest' });

            Toast.success(`${totalCost} 项升级已应用！`);
            this.pendingUpgrades = [];
            
            // 刷新数据
            await this.dataManager.updateData();
            this.render();
            
        } catch (error) {
            Logger.error('应用升级失败:', error);
            Toast.error('升级失败，请查看控制台');
        }
    }

    async _buildSkillData(skillName, targetLevel, mvuData) {
        const levelData = this.skillTreeLoader.SKILL_LEVEL_MAP[targetLevel];
        if (!levelData) return null;

        const skillDefFound = this.skillTreeLoader.findSkillDefinitionByName(skillName);
        const learnedSkills = Mvu.getMvuVariable(mvuData, '主角.技能列表', { default_value: {} });
        const currentSkillData = learnedSkills[skillName] || {};

        let baseData = {};
        if (skillDefFound) {
            const skillDef = skillDefFound.skill;
            const levelInfo = (Array.isArray(skillDef.levels) ? skillDef.levels : Object.values(skillDef.levels))
                .find(l => l.level === targetLevel);
            baseData = {
                cost: levelInfo?.cost ?? skillDef.cost ?? '无',
                description: levelInfo?.description ?? skillDef.description ?? `效果提升至 ${levelData.rank} 水平。`,
                type: skillDef.type ?? '被动',
            };
        } else {
            baseData = {
                cost: currentSkillData.cost || '无',
                description: currentSkillData.description || `效果提升至 ${levelData.rank} 水平。`,
                type: currentSkillData.type || '被动',
            };
        }

        // 智能更新描述中的加值
        const regex = /(\+\d+)/;
        const originalDesc = currentSkillData.description || baseData.description;
        const match = originalDesc.match(regex);
        if (match) {
            baseData.description = originalDesc.replace(regex, `+${levelData.bonus}`);
        }

        return {
            ...baseData,
            level: targetLevel,
            等级: targetLevel,
            rank: levelData.rank,
            称号: levelData.rank,
            bonus: levelData.bonus,
            加值: levelData.bonus,
        };
    }
}
