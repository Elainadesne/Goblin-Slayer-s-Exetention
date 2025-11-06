/**
 * 可拖动可缩放面板管理器
 * 
 * 功能：
 * - 拖动面板
 * - 缩放面板（拖拽边缘）
 * - 保存和恢复面板位置/大小
 * - 响应式布局切换
 */

import { Logger } from '../core/logger.js';

export class DraggablePanel {
    constructor(panelElement, options = {}) {
        this.panel = panelElement;
        this.options = {
            minWidth: 280,  // 减小最小宽度，允许更窄的侧边栏
            minHeight: 400, // 减小最小高度
            maxWidth: window.innerWidth - 40,
            maxHeight: window.innerHeight - 40,
            defaultWidth: 800,
            defaultHeight: 600,
            storageKey: 'gs-panel-state',
            narrowThreshold: 500, // 降低窄屏阈值
            onResize: null,
            ...options
        };

        this.isDragging = false;
        this.isResizing = false;
        this.resizeDirection = null;
        this.startX = 0;
        this.startY = 0;
        this.startWidth = 0;
        this.startHeight = 0;
        this.startLeft = 0;
        this.startTop = 0;

        this.init();
    }

    init() {
        // 检测是否为移动端
        this.isMobile = this.checkIfMobile();
        
        if (this.isMobile) {
            Logger.log('[DraggablePanel] 移动端检测到，禁用拖拽和缩放功能');
            this.cleanupMobileStyles();
            return; // 移动端不初始化拖拽和缩放
        }

        // 加载保存的状态或使用默认值
        this.loadState();

        // 创建拖动手柄
        this.createDragHandle();

        // 创建缩放手柄
        this.createResizeHandles();

        // 绑定事件
        this.bindEvents();

        // 应用初始样式
        this.applyPanelStyles();

        Logger.log('[DraggablePanel] 初始化完成');
    }

    createDragHandle() {
        // 使用顶部导航栏作为拖动手柄
        this.dragHandle = this.panel.querySelector('.top-nav');
        if (this.dragHandle) {
            this.dragHandle.style.cursor = 'move';
            this.dragHandle.classList.add('drag-handle');
        }
    }

    createResizeHandles() {
        // 创建8个缩放手柄（四角+四边）
        const positions = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
        
        positions.forEach(pos => {
            const handle = document.createElement('div');
            handle.className = `resize-handle resize-${pos}`;
            handle.dataset.direction = pos;
            this.panel.appendChild(handle);
        });
    }

    bindEvents() {
        // 拖动事件
        if (this.dragHandle) {
            this.dragHandle.addEventListener('mousedown', (e) => this.startDrag(e));
            this.dragHandle.addEventListener('touchstart', (e) => this.startDrag(e), { passive: false });
        }

        // 缩放事件
        const resizeHandles = this.panel.querySelectorAll('.resize-handle');
        resizeHandles.forEach(handle => {
            handle.addEventListener('mousedown', (e) => this.startResize(e));
            handle.addEventListener('touchstart', (e) => this.startResize(e), { passive: false });
        });

        // 全局移动和释放事件
        document.addEventListener('mousemove', (e) => this.onMove(e));
        document.addEventListener('mouseup', (e) => this.stopDragResize(e));
        document.addEventListener('touchmove', (e) => this.onMove(e), { passive: false });
        document.addEventListener('touchend', (e) => this.stopDragResize(e));

        // 窗口大小变化时调整面板
        window.addEventListener('resize', () => {
            this.constrainToViewport();
            this.handleResponsiveChange();
        });
    }

    startDrag(e) {
        // 不要在按钮或其他交互元素上开始拖动
        if (e.target.closest('button') || e.target.closest('.nav-button')) {
            return;
        }

        e.preventDefault();
        this.isDragging = true;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        this.startX = clientX;
        this.startY = clientY;

        const rect = this.panel.getBoundingClientRect();
        this.startLeft = rect.left;
        this.startTop = rect.top;

        this.panel.classList.add('dragging');
        Logger.log('[DraggablePanel] 开始拖动');
    }

    startResize(e) {
        e.preventDefault();
        e.stopPropagation();

        this.isResizing = true;
        this.resizeDirection = e.target.dataset.direction;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        this.startX = clientX;
        this.startY = clientY;

        const rect = this.panel.getBoundingClientRect();
        this.startWidth = rect.width;
        this.startHeight = rect.height;
        this.startLeft = rect.left;
        this.startTop = rect.top;

        this.panel.classList.add('resizing');
        Logger.log(`[DraggablePanel] 开始缩放: ${this.resizeDirection}`);
    }

    onMove(e) {
        if (!this.isDragging && !this.isResizing) return;

        e.preventDefault();

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        if (this.isDragging) {
            this.drag(clientX, clientY);
        } else if (this.isResizing) {
            this.resize(clientX, clientY);
        }
    }

    drag(clientX, clientY) {
        const deltaX = clientX - this.startX;
        const deltaY = clientY - this.startY;

        let newLeft = this.startLeft + deltaX;
        let newTop = this.startTop + deltaY;

        // 限制在视口内
        const maxLeft = window.innerWidth - this.panel.offsetWidth;
        const maxTop = window.innerHeight - this.panel.offsetHeight;

        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));

        this.panel.style.left = `${newLeft}px`;
        this.panel.style.top = `${newTop}px`;
    }

    resize(clientX, clientY) {
        const deltaX = clientX - this.startX;
        const deltaY = clientY - this.startY;

        let newWidth = this.startWidth;
        let newHeight = this.startHeight;
        let newLeft = this.startLeft;
        let newTop = this.startTop;

        const dir = this.resizeDirection;

        // 水平缩放
        if (dir.includes('e')) {
            newWidth = this.startWidth + deltaX;
        } else if (dir.includes('w')) {
            newWidth = this.startWidth - deltaX;
            newLeft = this.startLeft + deltaX;
        }

        // 垂直缩放
        if (dir.includes('s')) {
            newHeight = this.startHeight + deltaY;
        } else if (dir.includes('n')) {
            newHeight = this.startHeight - deltaY;
            newTop = this.startTop + deltaY;
        }

        // 应用最小/最大限制
        newWidth = Math.max(this.options.minWidth, Math.min(newWidth, this.options.maxWidth));
        newHeight = Math.max(this.options.minHeight, Math.min(newHeight, this.options.maxHeight));

        // 如果达到最小尺寸，不要移动位置
        if (newWidth === this.options.minWidth && dir.includes('w')) {
            newLeft = this.startLeft + (this.startWidth - this.options.minWidth);
        }
        if (newHeight === this.options.minHeight && dir.includes('n')) {
            newTop = this.startTop + (this.startHeight - this.options.minHeight);
        }

        this.panel.style.width = `${newWidth}px`;
        this.panel.style.height = `${newHeight}px`;
        this.panel.style.left = `${newLeft}px`;
        this.panel.style.top = `${newTop}px`;

        // 检查是否需要切换布局模式
        this.checkLayoutMode(newWidth);
    }

    stopDragResize(e) {
        if (this.isDragging || this.isResizing) {
            this.isDragging = false;
            this.isResizing = false;
            this.resizeDirection = null;

            this.panel.classList.remove('dragging', 'resizing');

            // 保存状态
            this.saveState();

            Logger.log('[DraggablePanel] 停止拖动/缩放');
        }
    }

    checkLayoutMode(width) {
        const isNarrow = width < this.options.narrowThreshold;
        const wasNarrow = this.panel.classList.contains('narrow-mode');

        if (isNarrow !== wasNarrow) {
            if (isNarrow) {
                this.panel.classList.add('narrow-mode');
                Logger.log('[DraggablePanel] 切换到窄屏模式');
            } else {
                this.panel.classList.remove('narrow-mode');
                Logger.log('[DraggablePanel] 切换到正常模式');
            }

            // 触发回调
            if (this.options.onResize) {
                this.options.onResize(isNarrow);
            }
        }
    }

    applyPanelStyles() {
        // 移动端不应用这些样式
        if (this.isMobile) {
            return;
        }

        // 设置面板为绝对定位
        this.panel.style.position = 'fixed';
        this.panel.style.zIndex = '9999';
        
        // 移除背景虚化
        this.panel.style.backdropFilter = 'none';
        this.panel.style.background = 'var(--panel-bg, #0f172a)';
        
        // 添加边框和阴影
        this.panel.style.border = '1px solid var(--container-border, rgba(168, 192, 255, 0.3))';
        this.panel.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.5)';
        this.panel.style.borderRadius = '12px';
        this.panel.style.overflow = 'hidden';
    }

    constrainToViewport() {
        // 移动端不需要约束
        if (this.isMobile) return;

        const rect = this.panel.getBoundingClientRect();
        let { left, top, width, height } = rect;

        const maxLeft = window.innerWidth - width;
        const maxTop = window.innerHeight - height;

        let newLeft = Math.max(0, Math.min(left, maxLeft));
        let newTop = Math.max(0, Math.min(top, maxTop));

        if (newLeft !== left || newTop !== top) {
            this.panel.style.left = `${newLeft}px`;
            this.panel.style.top = `${newTop}px`;
        }
    }

    /**
     * 处理响应式变化（PC <-> 移动端切换）
     */
    handleResponsiveChange() {
        const wasMobile = this.isMobile;
        const isMobileNow = this.checkIfMobile();

        if (wasMobile !== isMobileNow) {
            Logger.log(`[DraggablePanel] 设备模式切换: ${wasMobile ? '移动端' : 'PC'} -> ${isMobileNow ? '移动端' : 'PC'}`);
            
            if (isMobileNow) {
                // 切换到移动端：清理样式
                this.cleanupMobileStyles();
            } else {
                // 切换到PC：重新初始化
                this.loadState();
                this.applyPanelStyles();
            }
            
            this.isMobile = isMobileNow;
        }
    }

    saveState() {
        const rect = this.panel.getBoundingClientRect();
        const state = {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height
        };

        try {
            localStorage.setItem(this.options.storageKey, JSON.stringify(state));
            Logger.log('[DraggablePanel] 状态已保存', state);
        } catch (e) {
            Logger.error('[DraggablePanel] 保存状态失败:', e);
        }
    }

    loadState() {
        try {
            const saved = localStorage.getItem(this.options.storageKey);
            if (saved) {
                const state = JSON.parse(saved);
                
                // 应用保存的状态
                this.panel.style.left = `${state.left}px`;
                this.panel.style.top = `${state.top}px`;
                this.panel.style.width = `${state.width}px`;
                this.panel.style.height = `${state.height}px`;

                // 检查布局模式
                this.checkLayoutMode(state.width);

                Logger.log('[DraggablePanel] 状态已恢复', state);
                return;
            }
        } catch (e) {
            Logger.error('[DraggablePanel] 加载状态失败:', e);
        }

        // 使用默认值
        this.setDefaultPosition();
    }

    setDefaultPosition() {
        const width = this.options.defaultWidth;
        const height = this.options.defaultHeight;
        const left = (window.innerWidth - width) / 2;
        const top = (window.innerHeight - height) / 2;

        this.panel.style.left = `${left}px`;
        this.panel.style.top = `${top}px`;
        this.panel.style.width = `${width}px`;
        this.panel.style.height = `${height}px`;

        this.checkLayoutMode(width);

        Logger.log('[DraggablePanel] 使用默认位置');
    }

    reset() {
        this.setDefaultPosition();
        this.saveState();
        Logger.log('[DraggablePanel] 重置为默认位置');
    }

    /**
     * 清理移动端的内联样式
     */
    cleanupMobileStyles() {
        // 移除可能被设置的内联样式
        this.panel.style.width = '';
        this.panel.style.height = '';
        this.panel.style.left = '';
        this.panel.style.top = '';
        this.panel.style.position = '';
        this.panel.style.transform = '';
        
        // 移除 narrow-mode 类
        this.panel.classList.remove('narrow-mode');
        
        Logger.log('[DraggablePanel] 已清理移动端样式');
    }

    /**
     * 检测是否为移动端
     */
    checkIfMobile() {
        // 优先检测屏幕宽度（最可靠的方法）
        const width = window.innerWidth;
        
        // 小于等于 768px 视为移动端
        if (width <= 768) {
            return true;
        }
        
        // 768-1024 之间，检查是否为触摸设备
        if (width <= 1024) {
            if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
                return true;
            }
        }
        
        return false;
    }

    destroy() {
        // 移除事件监听器
        // 注意：这里简化了，实际应该保存引用以便移除
        Logger.log('[DraggablePanel] 销毁');
    }
}
