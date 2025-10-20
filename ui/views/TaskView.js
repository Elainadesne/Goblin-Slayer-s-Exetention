import { Logger } from '../../core/logger.js';
import { ViewUtils } from './ViewUtils.js';

export class TaskView {
    constructor(dataManager, elements) {
        this.dataManager = dataManager;
        this.elements = elements;
    }

    render() {
        if (!this.elements.tasksContent) return;

        try {
            const basePath = '主角';
            
            // 获取任务数据 - 任务在 任务日志 下
            const taskLog = this.dataManager.SafeGetValue(`${basePath}.任务日志`, {});
            const ongoingTasks = taskLog['进行中'] || {};
            const completedTasks = taskLog['已完成'] || {};
            
            const ongoingEntries = ViewUtils.filterMetaEntries(ongoingTasks);
            const completedEntries = ViewUtils.filterMetaEntries(completedTasks);

            let content = `
                <div class="tasks-section-modern">
                    <h2 class="section-title-modern">
                        <i class="fa-solid fa-list-check"></i>
                        任务列表
                    </h2>
            `;

            // 进行中的任务
            if (ongoingEntries.length > 0) {
                content += `
                    <h3 class="subsection-title">
                        <i class="fa-solid fa-hourglass-half"></i>
                        进行中 (${ongoingEntries.length})
                    </h3>
                    <div class="tasks-grid">
                        ${ongoingEntries.map(([name, task]) => this.renderTaskCard(name, task, false)).join('')}
                    </div>
                `;
            } else {
                content += `
                    <h3 class="subsection-title">
                        <i class="fa-solid fa-hourglass-half"></i>
                        进行中
                    </h3>
                    <p class="empty-message">暂无进行中的任务</p>
                `;
            }

            // 已完成的任务
            if (completedEntries.length > 0) {
                content += `
                    <h3 class="subsection-title">
                        <i class="fa-solid fa-check-circle"></i>
                        已完成 (${completedEntries.length})
                    </h3>
                    <div class="tasks-grid">
                        ${completedEntries.map(([name, task]) => this.renderTaskCard(name, task, true)).join('')}
                    </div>
                `;
            }

            content += `</div>`;

            this.elements.tasksContent.innerHTML = content;
            Logger.success('Task view rendered successfully');
        } catch (error) {
            Logger.error('Failed to render task view:', error);
            this.elements.tasksContent.innerHTML = `<p class="error-message">任务加载失败：${error.message}</p>`;
        }
    }

    renderTaskCard(name, task, isCompleted) {
        const target = task.目标 || '暂无目标';
        const reward = task.奖励 || '暂无奖励';
        const description = task.描述 || '';
        const progress = task.进度 || '';

        return `
            <div class="task-card-modern ${isCompleted ? 'completed' : ''}">
                <div class="task-card-header">
                    <div class="task-status-icon">
                        ${isCompleted ? '<i class="fa-solid fa-check-circle"></i>' : '<i class="fa-solid fa-circle-notch"></i>'}
                    </div>
                    <div class="task-name">${name}</div>
                </div>
                <div class="task-card-body">
                    ${description ? `<div class="task-description">${description}</div>` : ''}
                    <div class="task-detail">
                        <span class="task-label">目标：</span>
                        <span class="task-value">${target}</span>
                    </div>
                    ${progress ? `
                        <div class="task-detail">
                            <span class="task-label">进度：</span>
                            <span class="task-value">${progress}</span>
                        </div>
                    ` : ''}
                    <div class="task-detail">
                        <span class="task-label">奖励：</span>
                        <span class="task-value task-reward">${reward}</span>
                    </div>
                </div>
            </div>
        `;
    }
}
