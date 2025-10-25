/**
 * 全屏升级界面 - 圆形技能树
 * 
 * 所有职业在一个圆形技能树中，不同方向代表不同职业
 * 参考 dnd-skill-tree 的设计
 */

import { Logger } from '../../core/logger.js';
import { FullscreenOverlay } from '../components/FullscreenOverlay.js';

export class FullscreenUpgradeView {
    constructor(dataManager, skillTreeLoader) {
        this.dataManager = dataManager;
        this.skillTreeLoader = skillTreeLoader;

        this.overlay = new FullscreenOverlay({
            className: 'fullscreen-upgrade-view',
            onClose: () => this._onClose()
        });

        this.selectedSkill = null;
        this.canvas = null;
    }

    /**
     * 打开全屏升级界面
     */
    open() {
        Logger.log('[FullscreenUpgradeView] 打开全屏升级界面');

        const content = this._createContent();
        this.overlay.open(content);

        // 延迟渲染技能树，确保DOM已加载
        setTimeout(() => {
            this._renderCircularSkillTree();
            this._initializeDragging();
        }, 100);
    }

    /**
     * 初始化拖拽和缩放功能（支持鼠标和触摸）
     * @private
     */
    _initializeDragging() {
        const wrapper = document.getElementById('skill-tree-canvas-wrapper');
        const canvas = document.getElementById('skill-tree-canvas-circular');

        if (!wrapper || !canvas) return;

        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let currentX = 0;
        let currentY = 0;
        let currentScale = 1;

        // 触摸缩放相关
        let initialDistance = 0;
        let initialScale = 1;

        // 获取当前transform值
        const getTransform = () => {
            const style = window.getComputedStyle(canvas);
            const matrix = new DOMMatrix(style.transform);
            return { x: matrix.m41, y: matrix.m42, scale: matrix.a };
        };

        // 更新transform
        const updateTransform = (x, y, scale) => {
            canvas.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
        };

        // 计算两点之间的距离
        const getDistance = (touch1, touch2) => {
            const dx = touch2.clientX - touch1.clientX;
            const dy = touch2.clientY - touch1.clientY;
            return Math.sqrt(dx * dx + dy * dy);
        };

        // 获取触摸中心点
        const getTouchCenter = (touch1, touch2) => {
            return {
                x: (touch1.clientX + touch2.clientX) / 2,
                y: (touch1.clientY + touch2.clientY) / 2
            };
        };

        // ========== 鼠标事件 ==========
        wrapper.addEventListener('mousedown', (e) => {
            // 不拖拽技能节点
            if (e.target.closest('.skill-node-circular') || e.target.closest('.skill-node-center')) {
                return;
            }

            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;

            const transform = getTransform();
            currentX = transform.x;
            currentY = transform.y;
            currentScale = transform.scale;

            wrapper.style.cursor = 'grabbing';
        });

        wrapper.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            const newX = currentX + deltaX;
            const newY = currentY + deltaY;

            updateTransform(newX, newY, currentScale);
        });

        wrapper.addEventListener('mouseup', () => {
            isDragging = false;
            wrapper.style.cursor = 'grab';
        });

        wrapper.addEventListener('mouseleave', () => {
            isDragging = false;
            wrapper.style.cursor = 'grab';
        });

        // 缩放（鼠标滚轮）
        wrapper.addEventListener('wheel', (e) => {
            e.preventDefault();

            const transform = getTransform();
            currentX = transform.x;
            currentY = transform.y;
            currentScale = transform.scale;

            // 缩放因子
            const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
            let newScale = currentScale * scaleFactor;

            // 限制缩放范围
            newScale = Math.max(0.3, Math.min(2, newScale));

            // 计算鼠标位置相对于画布的坐标
            const rect = wrapper.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // 以鼠标位置为中心缩放
            const newX = mouseX - (mouseX - currentX) * (newScale / currentScale);
            const newY = mouseY - (mouseY - currentY) * (newScale / currentScale);

            updateTransform(newX, newY, newScale);
            currentScale = newScale;
        }, { passive: false });

        // ========== 触摸事件 ==========
        wrapper.addEventListener('touchstart', (e) => {
            // 不拖拽技能节点
            if (e.target.closest('.skill-node-circular') || e.target.closest('.skill-node-center')) {
                return;
            }

            const touches = e.touches;

            if (touches.length === 1) {
                // 单指拖拽
                isDragging = true;
                startX = touches[0].clientX;
                startY = touches[0].clientY;

                const transform = getTransform();
                currentX = transform.x;
                currentY = transform.y;
                currentScale = transform.scale;
            } else if (touches.length === 2) {
                // 双指缩放
                isDragging = false;
                initialDistance = getDistance(touches[0], touches[1]);

                const transform = getTransform();
                initialScale = transform.scale;
                currentX = transform.x;
                currentY = transform.y;
            }
        }, { passive: true });

        wrapper.addEventListener('touchmove', (e) => {
            e.preventDefault();

            const touches = e.touches;

            if (touches.length === 1 && isDragging) {
                // 单指拖拽
                const deltaX = touches[0].clientX - startX;
                const deltaY = touches[0].clientY - startY;

                const newX = currentX + deltaX;
                const newY = currentY + deltaY;

                updateTransform(newX, newY, currentScale);
            } else if (touches.length === 2) {
                // 双指缩放
                const currentDistance = getDistance(touches[0], touches[1]);
                const scaleChange = currentDistance / initialDistance;
                let newScale = initialScale * scaleChange;

                // 限制缩放范围
                newScale = Math.max(0.3, Math.min(2, newScale));

                // 获取缩放中心点
                const center = getTouchCenter(touches[0], touches[1]);
                const rect = wrapper.getBoundingClientRect();
                const centerX = center.x - rect.left;
                const centerY = center.y - rect.top;

                // 以触摸中心为缩放中心
                const newX = centerX - (centerX - currentX) * (newScale / currentScale);
                const newY = centerY - (centerY - currentY) * (newScale / currentScale);

                updateTransform(newX, newY, newScale);
            }
        }, { passive: false });

        wrapper.addEventListener('touchend', (e) => {
            if (e.touches.length === 0) {
                isDragging = false;
                initialDistance = 0;

                // 更新当前状态
                const transform = getTransform();
                currentX = transform.x;
                currentY = transform.y;
                currentScale = transform.scale;
            } else if (e.touches.length === 1) {
                // 从双指变为单指，重新初始化拖拽
                isDragging = true;
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;

                const transform = getTransform();
                currentX = transform.x;
                currentY = transform.y;
                currentScale = transform.scale;
            }
        }, { passive: true });

        Logger.log('[FullscreenUpgradeView] 拖拽和缩放功能已初始化（支持触摸）');
    }

    /**
     * 关闭全屏升级界面
     */
    close() {
        this.overlay.close();
    }

    /**
     * 创建界面内容
     * @private
     */
    _createContent() {
        const container = document.createElement('div');
        container.className = 'upgrade-view-container';

        // 创建技能树画布（可拖动）
        const canvasWrapper = document.createElement('div');
        canvasWrapper.className = 'skill-tree-canvas-wrapper';
        canvasWrapper.id = 'skill-tree-canvas-wrapper';

        const canvas = document.createElement('div');
        canvas.className = 'skill-tree-canvas-circular';
        canvas.id = 'skill-tree-canvas-circular';

        canvasWrapper.appendChild(canvas);

        // 创建底部信息栏
        const footer = this._createFooter();

        // 创建技能详情提示框
        const tooltip = document.createElement('div');
        tooltip.className = 'skill-tooltip';
        tooltip.id = 'skill-tooltip';
        tooltip.style.display = 'none';

        container.appendChild(canvasWrapper);
        container.appendChild(footer);
        container.appendChild(tooltip);

        return container;
    }

    /**
     * 创建底部信息栏
     * @private
     */
    _createFooter() {
        const footer = document.createElement('div');
        footer.className = 'upgrade-view-footer';

        const pointsInfo = document.createElement('div');
        pointsInfo.className = 'points-info';
        pointsInfo.id = 'points-info';

        const availablePoints = this.dataManager.SafeGetValue('主角.职业点数', 0);
        pointsInfo.innerHTML = `
            <span class="points-label">可用点数:</span>
            <span class="points-value">${availablePoints}</span>
        `;

        footer.appendChild(pointsInfo);

        return footer;
    }

    /**
     * 渲染圆形技能树
     * @private
     */
    _renderCircularSkillTree() {
        this.canvas = document.getElementById('skill-tree-canvas-circular');
        if (!this.canvas) {
            Logger.error('[FullscreenUpgradeView] Canvas not found!');
            return;
        }

        const skillTreeData = this.skillTreeLoader.getSkillTreeData();
        if (!skillTreeData) {
            this.canvas.innerHTML = '<p class="empty-message">技能树数据未加载</p>';
            return;
        }

        // 获取角色职业和已学习技能
        const playerJobs = this.dataManager.SafeGetValue('主角.职业', {});
        const learnedSkills = this.dataManager.SafeGetValue('主角.技能列表', {});

        // 显示所有技能树中的职业（不管是否学习）
        const allJobs = Object.keys(skillTreeData).filter(jobName => jobName !== '通用');

        if (allJobs.length === 0) {
            this.canvas.innerHTML = '<p class="empty-message">技能树数据为空</p>';
            return;
        }

        // 清空画布（移除所有子元素）
        while (this.canvas.firstChild) {
            this.canvas.removeChild(this.canvas.firstChild);
        }

        // 渲染自定义技能面板（左侧）
        this._renderCustomSkillsPanel(skillTreeData, learnedSkills);

        // 计算画布中心（画布的绝对中心点，作为坐标系原点）
        const centerX = this.canvas.offsetWidth / 2;
        const centerY = this.canvas.offsetHeight / 2;

        Logger.log(`[FullscreenUpgradeView] 画布尺寸: ${this.canvas.offsetWidth}x${this.canvas.offsetHeight}`);
        Logger.log(`[FullscreenUpgradeView] 画布中心: (${centerX}, ${centerY})`);

        // 创建中心节点
        const centerNode = this._createCenterNode(centerX, centerY);
        this.canvas.appendChild(centerNode);

        // 为每个职业分配一个方向（角度）
        const angleStep = (2 * Math.PI) / allJobs.length;

        allJobs.forEach((jobName, jobIndex) => {
            const job = skillTreeData[jobName];
            if (!job || !job.skills) return;

            // 计算该职业的基础角度
            const baseAngle = jobIndex * angleStep - Math.PI / 2; // 从顶部开始

            // 渲染该职业的技能（使用JSON中定义的position坐标）
            job.skills.forEach(skill => {
                if (skill.position) {
                    // 使用坐标系统
                    const gridSize = 100;
                    const x = centerX + (skill.position.x * gridSize);
                    const y = centerY + (skill.position.y * gridSize);

                    const node = this._createSkillNodeAtPosition(
                        skill,
                        learnedSkills,
                        jobName,
                        x,
                        y
                    );
                    this.canvas.appendChild(node);
                }
            });

            // 创建职业标签（可能没有职业数据，显示为未学习）
            const jobData = playerJobs[jobName] || { '当前等级': 0, '最大等级': 10 };
            const jobLabel = this._createJobLabel(jobName, jobData, baseAngle, centerX, centerY);
            this.canvas.appendChild(jobLabel);
        });

        // 初始化画布位置，将(0,0)点居中显示
        this._centerCanvas();

        Logger.success('[FullscreenUpgradeView] 圆形技能树渲染完成');
    }

    /**
     * 按required_job_level分组技能
     * @private
     */
    _groupSkillsByRequiredLevel(skills) {
        const grouped = {};

        skills.forEach(skill => {
            // 获取第一级的required_job_level
            const requiredLevel = skill.levels && skill.levels[0] ? skill.levels[0].required_job_level : 1;

            if (!grouped[requiredLevel]) {
                grouped[requiredLevel] = [];
            }
            grouped[requiredLevel].push(skill);
        });

        return grouped;
    }

    /**
     * 在圆环上渲染技能
     * @private
     */
    _renderSkillsInRings(skillsByLevel, learnedSkills, jobName, baseAngle, centerX, centerY) {
        // 按等级排序
        const levels = Object.keys(skillsByLevel).map(Number).sort((a, b) => a - b);

        levels.forEach((level, ringIndex) => {
            const skills = skillsByLevel[level];
            const baseRadius = 200 + (ringIndex * 120); // 每个圆环间隔120px

            skills.forEach((skill, skillIndex) => {
                // 在圆环上均匀分布
                const angleSpread = 0.6; // 扇形角度范围
                const angleOffset = (skillIndex / skills.length - 0.5) * angleSpread;
                const angle = baseAngle + angleOffset;

                const x = centerX + Math.cos(angle) * baseRadius;
                const y = centerY + Math.sin(angle) * baseRadius;

                const node = this._createSkillNodeAtPosition(
                    skill,
                    learnedSkills,
                    jobName,
                    x,
                    y
                );
                this.canvas.appendChild(node);
            });
        });
    }

    /**
     * 创建中心节点（D20骰子）
     * @private
     */
    _createCenterNode(centerX, centerY) {
        const node = document.createElement('div');
        node.className = 'skill-node-center';
        node.style.left = `${centerX}px`;
        node.style.top = `${centerY}px`;

        // 使用 SVG 图标而不是 emoji
        const iconUrl = new URL('../../assets/icons/d20.svg', import.meta.url).href;
        const icon = document.createElement('div');
        icon.className = 'center-icon';
        icon.style.backgroundImage = `url('${iconUrl}')`;
        icon.style.backgroundSize = 'contain';
        icon.style.backgroundRepeat = 'no-repeat';
        icon.style.backgroundPosition = 'center';

        node.appendChild(icon);

        return node;
    }

    /**
     * 在指定位置创建技能节点
     * @private
     */
    _createSkillNodeAtPosition(skill, learnedSkills, jobName, x, y) {
        const node = document.createElement('div');
        node.className = 'skill-node-circular';
        node.dataset.skillId = skill.id;
        node.dataset.jobName = jobName;

        node.style.left = `${x}px`;
        node.style.top = `${y}px`;

        // 技能图标
        const icon = document.createElement('div');
        icon.className = 'skill-node-icon';

        // 尝试加载技能图片
        const iconPath = `/scripts/extensions/gs_status_bar_extension/assets/skillls_img/${jobName}/${skill.name}.png`;
        const img = document.createElement('img');
        img.src = iconPath;
        img.alt = skill.name;
        img.className = 'skill-icon-img';

        // 图片加载失败时显示首字
        img.onerror = () => {
            icon.textContent = skill.name.charAt(0);
            img.remove();
        };

        icon.appendChild(img);

        // 检查技能状态
        const learnedSkill = learnedSkills[skill.name];
        const currentLevel = learnedSkill ? (learnedSkill['当前等级'] || 0) : 0;
        const maxLevel = skill.max_level || 1;

        if (currentLevel > 0) {
            node.classList.add('learned');

            // 等级徽章
            const levelBadge = document.createElement('div');
            levelBadge.className = 'skill-level-badge';
            levelBadge.textContent = currentLevel;
            node.appendChild(levelBadge);
        } else {
            node.classList.add('locked');
        }

        if (currentLevel >= maxLevel) {
            node.classList.add('maxed');
        }

        node.appendChild(icon);

        // 悬停显示技能详情
        node.addEventListener('mouseenter', (e) => this._showSkillTooltip(skill, learnedSkill, e));
        node.addEventListener('mouseleave', () => this._hideSkillTooltip());

        // 点击升级技能
        node.addEventListener('click', () => this._upgradeSkill(skill, jobName));

        return node;
    }

    /**
     * 创建技能节点（旧方法，保留兼容性）
     * @private
     */
    _createSkillNode(skill, learnedSkills, jobName, baseAngle, skillIndex, totalSkills, centerX, centerY) {
        const node = document.createElement('div');
        node.className = 'skill-node-circular';
        node.dataset.skillId = skill.id;
        node.dataset.jobName = jobName;

        // 计算位置
        let x, y;

        if (skill.position) {
            // 使用坐标系统（如果有定义）
            // position.x 和 position.y 是相对于中心点的网格坐标
            const gridSize = 100; // 每个网格单位 = 100px
            x = centerX + (skill.position.x * gridSize);
            y = centerY + (skill.position.y * gridSize);

            Logger.log(`[FullscreenUpgradeView] ${jobName} - ${skill.name}: 坐标(${skill.position.x}, ${skill.position.y}) -> 像素(${x}, ${y})`);
        } else {
            // 回退到圆形布局
            const baseRadius = 200;
            const radiusIncrement = 120;
            const radius = baseRadius + (skillIndex * radiusIncrement);

            const angleSpread = 0.4;
            const angleOffset = (skillIndex / totalSkills - 0.5) * angleSpread;
            const angle = baseAngle + angleOffset;

            x = centerX + Math.cos(angle) * radius;
            y = centerY + Math.sin(angle) * radius;

            Logger.log(`[FullscreenUpgradeView] ${jobName} - ${skill.name}: 圆形布局 -> 像素(${x}, ${y})`);
        }

        node.style.left = `${x}px`;
        node.style.top = `${y}px`;

        // 技能图标
        const icon = document.createElement('div');
        icon.className = 'skill-node-icon';

        // 尝试加载技能图片
        const iconPath = `/scripts/extensions/gs_status_bar_extension/assets/skillls_img/${jobName}/${skill.name}.png`;
        const img = document.createElement('img');
        img.src = iconPath;
        img.alt = skill.name;
        img.className = 'skill-icon-img';

        // 图片加载失败时显示首字
        img.onerror = () => {
            icon.textContent = skill.name.charAt(0);
            img.remove();
        };

        icon.appendChild(img);

        // 检查技能状态
        const learnedSkill = learnedSkills[skill.name];
        const currentLevel = learnedSkill ? (learnedSkill['当前等级'] || 0) : 0;
        const maxLevel = skill.max_level || 1;

        if (currentLevel > 0) {
            node.classList.add('learned');

            // 等级徽章
            const levelBadge = document.createElement('div');
            levelBadge.className = 'skill-level-badge';
            levelBadge.textContent = currentLevel;
            node.appendChild(levelBadge);
        } else {
            node.classList.add('locked');
        }

        if (currentLevel >= maxLevel) {
            node.classList.add('maxed');
        }

        node.appendChild(icon);

        // 悬停显示技能详情
        node.addEventListener('mouseenter', (e) => this._showSkillTooltip(skill, learnedSkill, e));
        node.addEventListener('mouseleave', () => this._hideSkillTooltip());

        // 点击升级技能
        node.addEventListener('click', () => this._upgradeSkill(skill, jobName));

        return node;
    }

    /**
     * 创建职业标签
     * @private
     */
    _createJobLabel(jobName, jobData, angle, centerX, centerY) {
        const label = document.createElement('div');
        label.className = 'job-label';

        // 标签位置在职业方向的外围
        const labelRadius = 150;
        const x = centerX + Math.cos(angle) * labelRadius;
        const y = centerY + Math.sin(angle) * labelRadius;

        label.style.left = `${x}px`;
        label.style.top = `${y}px`;

        const jobLevel = jobData['当前等级'] || 0;
        label.innerHTML = `
            <div class="job-label-name">${jobName}</div>
            <div class="job-label-level">Lv.${jobLevel}</div>
        `;

        return label;
    }

    /**
     * 显示技能提示
     * @private
     */
    _showSkillTooltip(skill, learnedSkill, event) {
        const tooltip = document.getElementById('skill-tooltip');
        if (!tooltip) return;

        const currentLevel = learnedSkill ? (learnedSkill['当前等级'] || 0) : 0;
        const maxLevel = skill.max_level || 1;

        // 获取当前等级的描述
        let levelDesc = skill.description || '暂无描述';
        if (skill.levels && skill.levels[currentLevel]) {
            levelDesc = skill.levels[currentLevel].description || levelDesc;
        }

        // 获取下一等级的需求
        let nextLevelReq = '';
        if (currentLevel < maxLevel && skill.levels && skill.levels[currentLevel + 1]) {
            const nextLevel = skill.levels[currentLevel + 1];
            nextLevelReq = `
                <div class="tooltip-next-level">
                    <div class="tooltip-section-title">下一等级</div>
                    <div>需要职业等级: ${nextLevel.required_job_level || '?'}</div>
                    <div>消耗点数: ${nextLevel.cost || '?'}</div>
                    <div class="tooltip-desc">${nextLevel.description || ''}</div>
                </div>
            `;
        }

        tooltip.innerHTML = `
            <div class="tooltip-header">
                <div class="tooltip-name">${skill.name}</div>
                <div class="tooltip-level">Lv.${currentLevel}/${maxLevel}</div>
            </div>
            <div class="tooltip-body">
                <div class="tooltip-desc">${levelDesc}</div>
                ${nextLevelReq}
            </div>
        `;

        // 定位提示框
        const node = event.currentTarget;
        const rect = node.getBoundingClientRect();
        tooltip.style.left = `${rect.right + 10}px`;
        tooltip.style.top = `${rect.top}px`;
        tooltip.style.display = 'block';
    }

    /**
     * 隐藏技能提示
     * @private
     */
    _hideSkillTooltip() {
        const tooltip = document.getElementById('skill-tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }

    /**
     * 升级技能
     * @private
     */
    async _upgradeSkill(skill, jobName) {
        Logger.log(`[FullscreenUpgradeView] 升级技能: ${skill.name} (${jobName})`);

        try {
            // 获取当前数据
            const [professionPoints, jobs, learnedSkills] = await Promise.all([
                Mvu.getMvuVariable('主角.职业点数', { default_value: 0 }),
                Mvu.getMvuVariable('主角.职业', { default_value: {} }),
                Mvu.getMvuVariable('主角.技能列表', { default_value: {} })
            ]);

            const currentSkillData = learnedSkills[skill.name] || {};
            const currentLevel = this.skillTreeLoader.getNumericSkillLevel(currentSkillData);

            const levelsArray = Array.isArray(skill.levels)
                ? skill.levels
                : Object.values(skill.levels || {});
            const nextLevelInfo = levelsArray.find(l => l.level === currentLevel + 1);

            if (!nextLevelInfo) {
                this._showToast(`技能 "${skill.name}" 已达最高等级`, 'warning');
                return;
            }

            const cost = Number(nextLevelInfo.cost || 1);

            // 检查职业点数
            if (professionPoints < cost) {
                this._showToast(`职业点数不足 (需 ${cost}, 有 ${professionPoints})`, 'error');
                return;
            }

            // 检查职业等级要求
            const currentJobLevel = Number(jobs[jobName]?.['当前等级'] || 0);
            const requiredJobLevel = Number(nextLevelInfo.required_job_level || 0);

            if (currentJobLevel < requiredJobLevel) {
                this._showToast(`职业等级不足 (需 Lv.${requiredJobLevel}, 当前 Lv.${currentJobLevel})`, 'error');
                return;
            }

            // 检查前置技能
            const deps = Array.isArray(skill.dependencies)
                ? skill.dependencies
                : Object.values(skill.dependencies || {});

            for (const dep of deps) {
                const depFound = this.skillTreeLoader.findSkillDefinitionById(dep.skill_id);
                if (!depFound) continue;

                const depSkillDef = depFound.skill;
                const learnedDepSkill = learnedSkills[depSkillDef.name];
                const depSkillLevel = this.skillTreeLoader.getNumericSkillLevel(learnedDepSkill || {});
                const needLevel = Number(dep.level || 1);

                if (depSkillLevel < needLevel) {
                    this._showToast(`前置技能 "${depSkillDef.name}" 等级不足 (需 Lv.${needLevel})`, 'error');
                    return;
                }
            }

            // 扣除职业点数
            if (typeof Mvu.addMvuVariable === 'function') {
                await Mvu.addMvuVariable('主角.职业点数', -cost);
            } else {
                await Mvu.setMvuVariable('主角.职业点数', professionPoints - cost);
            }

            // 更新技能数据
            const nextLvl = nextLevelInfo.level;
            const newSkillData = {
                type: skill.type || '被动',
                level: nextLvl,
                等级: nextLvl,
                description: nextLevelInfo.description || skill.description || '',
                cost: nextLevelInfo.cost || skill.cost || '无'
            };

            learnedSkills[skill.name] = newSkillData;
            await Mvu.setMvuVariable('主角.技能列表', learnedSkills);

            Logger.success(`[FullscreenUpgradeView] 技能 ${skill.name} 升级至 Lv.${nextLvl}`);
            this._showToast(`技能 "${skill.name}" 升级成功 → Lv.${nextLvl}`, 'success');

            // 刷新数据和界面
            await this.dataManager.updateData();
            this._renderCircularSkillTree();
            this._updateFooter();

        } catch (error) {
            Logger.error('[FullscreenUpgradeView] 升级失败:', error);
            this._showToast('升级失败，请查看控制台', 'error');
        }
    }

    /**
     * 显示提示消息
     * @param {string} message 消息内容
     * @param {string} type 消息类型
     */
    _showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `fullscreen-toast fullscreen-toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            padding: 12px 20px;
            background: rgba(26, 35, 79, 0.95);
            border: 1px solid var(--container-border);
            border-radius: 8px;
            color: var(--primary-text-color);
            z-index: 10002;
            animation: slideInRight 0.3s ease-out;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            max-width: 400px;
            backdrop-filter: blur(10px);
        `;

        if (type === 'error') {
            toast.style.borderColor = '#ff4444';
            toast.style.background = 'rgba(255, 68, 68, 0.2)';
            toast.style.color = '#ff4444';
        } else if (type === 'success') {
            toast.style.borderColor = '#5fdba7';
            toast.style.background = 'rgba(95, 219, 167, 0.2)';
            toast.style.color = '#5fdba7';
        } else if (type === 'warning') {
            toast.style.borderColor = '#ffcc80';
            toast.style.background = 'rgba(255, 204, 128, 0.2)';
            toast.style.color = '#ffcc80';
        }

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * 将画布居中，使(0,0)点显示在屏幕中央
     * @private
     */
    _centerCanvas() {
        const wrapper = document.getElementById('skill-tree-canvas-wrapper');
        const canvas = document.getElementById('skill-tree-canvas-circular');

        if (!wrapper || !canvas) return;

        // 计算需要的偏移量
        // 画布中心点应该对齐到包装器的中心
        const wrapperCenterX = wrapper.offsetWidth / 2;
        const wrapperCenterY = wrapper.offsetHeight / 2;

        const canvasCenterX = canvas.offsetWidth / 2;
        const canvasCenterY = canvas.offsetHeight / 2;

        // 计算偏移量：让画布中心对齐到包装器中心
        const offsetX = wrapperCenterX - canvasCenterX;
        const offsetY = wrapperCenterY - canvasCenterY;

        // 设置初始transform
        const initialScale = 0.8; // 初始缩放，让用户能看到更多内容
        canvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${initialScale})`;

        Logger.log(`[FullscreenUpgradeView] 画布已居中: offset=(${offsetX}, ${offsetY}), scale=${initialScale}`);
    }

    /**
     * 切换网格显示（调试用）
     */
    toggleGrid() {
        if (!this.canvas) {
            Logger.warn('[FullscreenUpgradeView] Canvas not found');
            return;
        }

        let grid = this.canvas.querySelector('.debug-grid');

        if (grid) {
            // 移除网格
            grid.remove();
            Logger.log('[FullscreenUpgradeView] 网格已隐藏');
        } else {
            // 创建网格
            grid = document.createElement('div');
            grid.className = 'debug-grid';

            const centerX = this.canvas.offsetWidth / 2;
            const centerY = this.canvas.offsetHeight / 2;
            const gridSize = 100;
            const gridRange = 12; // -6 到 6

            // 绘制网格线
            for (let i = -gridRange / 2; i <= gridRange / 2; i++) {
                // 垂直线
                const vLine = document.createElement('div');
                vLine.className = 'grid-line grid-line-v';
                vLine.style.left = `${centerX + i * gridSize}px`;
                vLine.style.top = `${centerY - (gridRange / 2) * gridSize}px`;
                vLine.style.height = `${gridRange * gridSize}px`;
                grid.appendChild(vLine);

                // 水平线
                const hLine = document.createElement('div');
                hLine.className = 'grid-line grid-line-h';
                hLine.style.top = `${centerY + i * gridSize}px`;
                hLine.style.left = `${centerX - (gridRange / 2) * gridSize}px`;
                hLine.style.width = `${gridRange * gridSize}px`;
                grid.appendChild(hLine);

                // 坐标标签
                if (i !== 0) {
                    const xLabel = document.createElement('div');
                    xLabel.className = 'grid-label';
                    xLabel.textContent = i;
                    xLabel.style.left = `${centerX + i * gridSize}px`;
                    xLabel.style.top = `${centerY + 10}px`;
                    grid.appendChild(xLabel);

                    const yLabel = document.createElement('div');
                    yLabel.className = 'grid-label';
                    yLabel.textContent = i;
                    yLabel.style.left = `${centerX + 10}px`;
                    yLabel.style.top = `${centerY + i * gridSize}px`;
                    grid.appendChild(yLabel);
                }
            }

            // 中心点标记
            const centerMark = document.createElement('div');
            centerMark.className = 'grid-center';
            centerMark.textContent = '(0,0)';
            centerMark.style.left = `${centerX}px`;
            centerMark.style.top = `${centerY}px`;
            grid.appendChild(centerMark);

            this.canvas.appendChild(grid);
            Logger.log('[FullscreenUpgradeView] 网格已显示');
        }
    }

    /**
     * 渲染自定义技能面板
     * @private
     */
    _renderCustomSkillsPanel(skillTreeData, learnedSkills) {
        // 收集非职业技能
        const nonProfessionSkills = [];
        for (const skillName in learnedSkills) {
            const skillData = learnedSkills[skillName];
            // 检查这个技能是否在职业技能树中
            let isProfessionSkill = false;
            for (const jobName in skillTreeData) {
                const job = skillTreeData[jobName];
                if (job.skills) {
                    const foundSkill = job.skills.find(s => s.name === skillName);
                    if (foundSkill) {
                        isProfessionSkill = true;
                        break;
                    }
                }
            }

            if (!isProfessionSkill) {
                nonProfessionSkills.push({
                    name: skillName,
                    data: skillData
                });
            }
        }

        // 移除旧的自定义技能面板（如果存在）
        const oldPanel = this.canvas.querySelector('.custom-skills-panel');
        if (oldPanel) {
            oldPanel.remove();
        }

        // 创建自定义技能面板
        const panel = document.createElement('div');
        panel.className = 'custom-skills-panel';
        panel.id = 'custom-skills-panel'; // 添加ID便于查找

        const header = document.createElement('div');
        header.className = 'custom-skills-header';
        header.innerHTML = `<h3>自定义技能/职业</h3>`;
        panel.appendChild(header);

        const cardsContainer = document.createElement('div');
        cardsContainer.className = 'custom-skills-cards';

        if (nonProfessionSkills.length === 0) {
            cardsContainer.innerHTML = `
                <div class="custom-skills-empty">
                    <div class="custom-skills-empty-icon">✦</div>
                    <div>暂无自定义技能</div>
                    <div style="font-size: 0.85em; margin-top: 5px; opacity: 0.7;">
                        通过特殊事件获得的技能将显示在这里
                    </div>
                </div>
            `;
        } else {
            nonProfessionSkills.forEach(({ name, data }) => {
                const card = this._createCustomSkillCard(name, data);
                cardsContainer.appendChild(card);
            });
        }

        panel.appendChild(cardsContainer);
        this.canvas.appendChild(panel);
        
        Logger.log(`[FullscreenUpgradeView] 自定义技能面板已渲染，共 ${nonProfessionSkills.length} 个技能`);
    }

    /**
     * 创建自定义技能卡片
     * @private
     */
    _createCustomSkillCard(name, data) {
        const card = document.createElement('div');
        card.className = 'custom-skill-card';

        const currentLevel = this.skillTreeLoader.getNumericSkillLevel(data);
        const maxLevel = 5;
        const description = data.description || '通过特殊事件获得的技能';
        const cost = data.cost || '无';
        const skillType = data.type || '被动';
        const icon = this._getSkillIcon(name);
        const canUpgrade = currentLevel < maxLevel;

        // 添加等级数据属性用于CSS样式
        card.dataset.level = currentLevel;

        if (canUpgrade) {
            card.classList.add('custom-skill-upgradeable');
        }
        if (currentLevel >= maxLevel) {
            card.classList.add('custom-skill-maxed');
        }

        card.innerHTML = `
            <div class="custom-skill-card-header">
                <div class="custom-skill-icon">${icon}</div>
                <div class="custom-skill-info">
                    <div class="custom-skill-name">${name}</div>
                    <div class="custom-skill-level">Lv.${currentLevel}/${maxLevel}</div>
                </div>
            </div>
            <div class="custom-skill-card-body">
                <div class="custom-skill-description">${description}</div>
                <div class="custom-skill-meta">
                    <span class="custom-skill-type">${skillType}</span>
                    <span class="custom-skill-cost">${cost}</span>
                </div>
                ${canUpgrade ? `
                    <div class="custom-skill-upgrade-button">
                        <button class="skill-upgrade-btn">升级</button>
                    </div>
                ` : `
                    <div class="custom-skill-maxed-label">已满级</div>
                `}
            </div>
        `;

        // 添加升级按钮点击事件
        if (canUpgrade) {
            const upgradeBtn = card.querySelector('.skill-upgrade-btn');
            upgradeBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                this._upgradeCustomSkill(name, data);
            });
        }

        return card;
    }

    /**
     * 升级自定义技能
     * @private
     */
    async _upgradeCustomSkill(name, data) {
        Logger.log(`[FullscreenUpgradeView] 升级自定义技能: ${name}`);

        try {
            const [professionPoints, learnedSkills] = await Promise.all([
                Mvu.getMvuVariable('主角.职业点数', { default_value: 0 }),
                Mvu.getMvuVariable('主角.技能列表', { default_value: {} })
            ]);

            const currentSkillData = learnedSkills[name] || {};
            const currentLevel = this.skillTreeLoader.getNumericSkillLevel(currentSkillData);
            const maxLevel = 5;

            if (currentLevel >= maxLevel) {
                this._showToast(`技能 "${name}" 已达最高等级`, 'warning');
                return;
            }

            const cost = 1; // 自定义技能固定消耗1点

            if (professionPoints < cost) {
                this._showToast(`职业点数不足 (需 ${cost}, 有 ${professionPoints})`, 'error');
                return;
            }

            // 扣除职业点数
            if (typeof Mvu.addMvuVariable === 'function') {
                await Mvu.addMvuVariable('主角.职业点数', -cost);
            } else {
                await Mvu.setMvuVariable('主角.职业点数', professionPoints - cost);
            }

            // 更新技能数据
            const nextLvl = currentLevel + 1;
            const newSkillData = {
                ...currentSkillData,
                level: nextLvl,
                等级: nextLvl,
                description: currentSkillData.description || '通过特殊事件获得的技能',
                type: currentSkillData.type || '被动',
                cost: currentSkillData.cost || '无'
            };

            learnedSkills[name] = newSkillData;
            await Mvu.setMvuVariable('主角.技能列表', learnedSkills);

            Logger.success(`[FullscreenUpgradeView] 自定义技能 ${name} 升级至 Lv.${nextLvl}`);
            this._showToast(`技能 "${name}" 升级成功 → Lv.${nextLvl}`, 'success');

            // 刷新数据和界面
            await this.dataManager.updateData();
            this._renderCircularSkillTree();
            this._updateFooter();

        } catch (error) {
            Logger.error('[FullscreenUpgradeView] 升级失败:', error);
            this._showToast('升级失败，请查看控制台', 'error');
        }
    }

    /**
     * 更新底部信息栏
     * @private
     */
    _updateFooter() {
        const pointsInfo = document.getElementById('points-info');
        if (pointsInfo) {
            const availablePoints = this.dataManager.SafeGetValue('主角.职业点数', 0);
            pointsInfo.innerHTML = `
                <span class="points-label">可用点数:</span>
                <span class="points-value">${availablePoints}</span>
            `;
        }
    }

    /**
     * 获取技能图标
     * @private
     */
    _getSkillIcon(skillName) {
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
     * 关闭回调
     * @private
     */
    _onClose() {
        Logger.log('[FullscreenUpgradeView] 关闭全屏升级界面');
        this.selectedSkill = null;
        this.canvas = null;
    }
}
