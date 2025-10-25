/**
 * 全屏覆盖层组件
 * 
 * 提供一个可复用的全屏容器，用于显示各种全屏内容（地图、技能树等）
 * 
 * 功能：
 * - 全屏显示
 * - ESC 键关闭
 * - 关闭按钮
 * - 内容插槽
 * - 打开/关闭动画
 * - 手机端响应式
 */

import { Logger } from '../../core/logger.js';

export class FullscreenOverlay {
    /**
     * @param {Object} options - 配置选项
     * @param {Function} options.onClose - 关闭时的回调函数
     * @param {string} options.className - 自定义类名
     * @param {boolean} options.showCloseButton - 是否显示关闭按钮（默认 true）
     */
    constructor(options = {}) {
        this.options = {
            onClose: null,
            className: '',
            showCloseButton: true,
            ...options
        };
        
        this.container = null;
        this.contentSlot = null;
        this.closeButton = null;
        this.isOpen = false;
        
        this._boundEscHandler = this._handleEscKey.bind(this);
        this._boundCloseHandler = this.close.bind(this);
    }

    /**
     * 创建全屏覆盖层 DOM 结构
     */
    create() {
        if (this.container) {
            Logger.warn('[FullscreenOverlay] 容器已存在');
            return;
        }

        const parentDoc = window.parent.document;
        
        // 创建容器
        this.container = parentDoc.createElement('div');
        this.container.className = `gs-fullscreen-overlay ${this.options.className}`;
        
        // 创建关闭按钮
        if (this.options.showCloseButton) {
            this.closeButton = parentDoc.createElement('button');
            this.closeButton.className = 'gs-fullscreen-close-btn';
            this.closeButton.innerHTML = '✕';
            this.closeButton.setAttribute('aria-label', '关闭');
            this.closeButton.addEventListener('click', this._boundCloseHandler);
            this.container.appendChild(this.closeButton);
        }
        
        // 创建内容插槽
        this.contentSlot = parentDoc.createElement('div');
        this.contentSlot.className = 'gs-fullscreen-content';
        this.container.appendChild(this.contentSlot);
        
        // 添加到 body
        parentDoc.body.appendChild(this.container);
        
        Logger.log('[FullscreenOverlay] 全屏覆盖层已创建');
    }

    /**
     * 打开全屏覆盖层
     * @param {string|HTMLElement} content - 要显示的内容（HTML 字符串或 DOM 元素）
     */
    open(content) {
        if (!this.container) {
            this.create();
        }
        
        if (this.isOpen) {
            Logger.warn('[FullscreenOverlay] 覆盖层已经打开');
            return;
        }
        
        // 设置内容
        if (typeof content === 'string') {
            this.contentSlot.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            this.contentSlot.innerHTML = '';
            this.contentSlot.appendChild(content);
        }
        
        // 先显示容器（opacity: 0），然后触发动画
        this.isOpen = true;
        
        // 使用 requestAnimationFrame 确保动画触发
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.container.classList.add('visible');
            });
        });
        
        // 绑定 ESC 键
        window.parent.document.addEventListener('keydown', this._boundEscHandler);
        
        Logger.log('[FullscreenOverlay] 全屏覆盖层已打开');
    }

    /**
     * 关闭全屏覆盖层
     */
    close() {
        if (!this.isOpen) {
            return;
        }
        
        // 移除 visible 类，触发关闭动画
        this.container.classList.remove('visible');
        this.isOpen = false;
        
        // 移除 ESC 键监听
        window.parent.document.removeEventListener('keydown', this._boundEscHandler);
        
        // 调用关闭回调
        if (typeof this.options.onClose === 'function') {
            this.options.onClose();
        }
        
        Logger.log('[FullscreenOverlay] 全屏覆盖层已关闭');
    }

    /**
     * 销毁全屏覆盖层
     */
    destroy() {
        if (this.isOpen) {
            this.close();
        }
        
        if (this.container) {
            // 移除事件监听器
            if (this.closeButton) {
                this.closeButton.removeEventListener('click', this._boundCloseHandler);
            }
            
            // 移除 DOM 元素
            this.container.remove();
            this.container = null;
            this.contentSlot = null;
            this.closeButton = null;
        }
        
        Logger.log('[FullscreenOverlay] 全屏覆盖层已销毁');
    }

    /**
     * 处理 ESC 键按下
     * @private
     */
    _handleEscKey(event) {
        if (event.key === 'Escape' && this.isOpen) {
            this.close();
        }
    }

    /**
     * 获取内容插槽
     * @returns {HTMLElement}
     */
    getContentSlot() {
        return this.contentSlot;
    }

    /**
     * 检查是否打开
     * @returns {boolean}
     */
    isOpened() {
        return this.isOpen;
    }
}
