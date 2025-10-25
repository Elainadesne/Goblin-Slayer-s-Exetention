import { Logger } from './logger.js';

/**
 * KeyboardManager - 键盘快捷键管理器
 * 负责监听全局键盘事件，并触发相应的扩展功能
 * 
 * 特性：
 * - 智能避免输入框冲突
 * - 支持单键和组合键
 * - 可配置的快捷键映射
 */
export class KeyboardManager {
    constructor() {
        this.shortcuts = new Map();
        this.isEnabled = false; // 初始状态应该是 false，等待 start() 调用
        this.boundKeydownHandler = this._handleKeydown.bind(this);
        
        Logger.log('[KeyboardManager] 初始化键盘管理器');
    }

    /**
     * 启动键盘监听
     */
    start() {
        if (this.isEnabled) {
            Logger.warn('[KeyboardManager] 键盘监听已经启动');
            return;
        }

        try {
            // 策略 1: 在父文档上监听（SillyTavern 主窗口）
            const parentDoc = window.parent.document;
            if (parentDoc && parentDoc !== document) {
                parentDoc.addEventListener('keydown', this.boundKeydownHandler, true);
                Logger.log('[KeyboardManager] 已在父窗口添加监听器');
            }
        } catch (error) {
            Logger.warn('[KeyboardManager] 无法访问父窗口:', error);
        }

        // 策略 2: 同时在当前文档监听（作为备用）
        try {
            document.addEventListener('keydown', this.boundKeydownHandler, true);
            Logger.log('[KeyboardManager] 已在当前窗口添加监听器');
        } catch (error) {
            Logger.warn('[KeyboardManager] 无法在当前窗口添加监听器:', error);
        }
        
        this.isEnabled = true;
        Logger.success('[KeyboardManager] 键盘监听已启动（双重监听模式）');
    }

    /**
     * 停止键盘监听
     */
    stop() {
        if (!this.isEnabled) {
            return;
        }

        // 移除父窗口监听器
        try {
            const parentDoc = window.parent.document;
            if (parentDoc && parentDoc !== document) {
                parentDoc.removeEventListener('keydown', this.boundKeydownHandler, true);
            }
        } catch (error) {
            // 忽略错误
        }

        // 移除当前窗口监听器
        try {
            document.removeEventListener('keydown', this.boundKeydownHandler, true);
        } catch (error) {
            // 忽略错误
        }
        
        this.isEnabled = false;
        Logger.log('[KeyboardManager] 键盘监听已停止');
    }

    /**
     * 注册快捷键
     * @param {string} key - 按键名称（如 'Escape', 'F2', 'e'）
     * @param {Function} callback - 触发时的回调函数
     * @param {Object} options - 配置选项
     * @param {boolean} options.ctrl - 是否需要 Ctrl 键
     * @param {boolean} options.shift - 是否需要 Shift 键
     * @param {boolean} options.alt - 是否需要 Alt 键
     * @param {string} options.description - 快捷键描述
     */
    register(key, callback, options = {}) {
        const shortcutKey = this._generateShortcutKey(key, options);
        
        this.shortcuts.set(shortcutKey, {
            key: key.toLowerCase(),
            callback,
            ctrl: options.ctrl || false,
            shift: options.shift || false,
            alt: options.alt || false,
            description: options.description || '未命名快捷键'
        });

        Logger.log(`[KeyboardManager] 注册快捷键: ${shortcutKey} - ${options.description || '未命名'}`);
    }

    /**
     * 注销快捷键
     * @param {string} key - 按键名称
     * @param {Object} options - 配置选项（需与注册时一致）
     */
    unregister(key, options = {}) {
        const shortcutKey = this._generateShortcutKey(key, options);
        
        if (this.shortcuts.has(shortcutKey)) {
            this.shortcuts.delete(shortcutKey);
            Logger.log(`[KeyboardManager] 注销快捷键: ${shortcutKey}`);
        }
    }

    /**
     * 获取所有已注册的快捷键
     * @returns {Array} 快捷键列表
     */
    getRegisteredShortcuts() {
        const shortcuts = [];
        this.shortcuts.forEach((config, key) => {
            shortcuts.push({
                key,
                description: config.description
            });
        });
        return shortcuts;
    }

    /**
     * 生成快捷键的唯一标识
     * @private
     */
    _generateShortcutKey(key, options) {
        const parts = [];
        if (options.ctrl) parts.push('ctrl');
        if (options.shift) parts.push('shift');
        if (options.alt) parts.push('alt');
        parts.push(key.toLowerCase());
        return parts.join('+');
    }

    /**
     * 处理键盘事件
     * @private
     */
    _handleKeydown(event) {
        // 检查是否在输入状态
        if (this._isTyping(event.target)) {
            return;
        }

        // 生成当前按键的标识
        const currentKey = this._generateShortcutKey(event.key, {
            ctrl: event.ctrlKey || event.metaKey, // macOS 使用 Command 键
            shift: event.shiftKey,
            alt: event.altKey
        });

        // 查找匹配的快捷键
        const shortcut = this.shortcuts.get(currentKey);
        
        if (shortcut) {
            Logger.log(`[KeyboardManager] 触发快捷键: ${currentKey}`);
            
            // 阻止默认行为
            event.preventDefault();
            event.stopPropagation();
            
            // 执行回调
            try {
                shortcut.callback(event);
            } catch (error) {
                Logger.error(`[KeyboardManager] 快捷键回调执行失败: ${currentKey}`, error);
            }
        }
    }

    /**
     * 检查用户是否正在输入
     * @private
     */
    _isTyping(element) {
        if (!element) return false;

        const tagName = element.tagName;
        
        // 检查是否是输入元素
        if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
            return true;
        }

        // 检查是否是可编辑元素
        if (element.isContentEditable) {
            return true;
        }

        // 检查是否在 SillyTavern 的聊天输入框中
        if (element.id === 'send_textarea' || element.id === 'prompt-input') {
            return true;
        }

        return false;
    }

    /**
     * 销毁管理器
     */
    destroy() {
        this.stop();
        this.shortcuts.clear();
        Logger.log('[KeyboardManager] 键盘管理器已销毁');
    }
}
