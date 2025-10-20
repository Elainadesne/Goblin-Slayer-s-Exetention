/**
 * Settings View - 设置界面
 * 提供用户自定义选项和系统设置
 */
import { Logger } from '../../core/logger.js';

export class SettingsView {
    constructor(dataManager, elements) {
        this.dataManager = dataManager;
        this.elements = elements;
        
        // 默认设置
        this.settings = this.loadSettings();
    }

    /**
     * 加载保存的设置
     */
    loadSettings() {
        const defaultSettings = {
            theme: 'dark',
            fontSize: 14,
            animationsEnabled: true,
            panelOpacity: 0.95,
            refreshInterval: 1000,
            showNotifications: true,
            compactMode: false
        };

        try {
            const saved = localStorage.getItem('gs_extension_settings');
            return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
        } catch (error) {
            Logger.error('加载设置失败', error);
            return defaultSettings;
        }
    }

    /**
     * 保存设置
     */
    saveSettings() {
        try {
            localStorage.setItem('gs_extension_settings', JSON.stringify(this.settings));
            this.applySettings();
            Logger.success('设置已保存');
        } catch (error) {
            Logger.error('保存设置失败', error);
        }
    }

    /**
     * 应用设置到界面
     */
    applySettings() {
        const panel = this.elements.root;
        if (!panel) return;

        // 应用主题
        panel.setAttribute('data-theme', this.settings.theme);

        // 应用字体大小
        panel.style.fontSize = `${this.settings.fontSize}px`;

        // 应用透明度
        panel.style.opacity = this.settings.panelOpacity;

        // 应用动画
        if (this.settings.animationsEnabled) {
            panel.classList.remove('no-animations');
        } else {
            panel.classList.add('no-animations');
        }

        // 应用紧凑模式
        if (this.settings.compactMode) {
            panel.classList.add('compact-mode');
        } else {
            panel.classList.remove('compact-mode');
        }

        // 触发自定义事件通知其他组件
        window.dispatchEvent(new CustomEvent('gs-settings-changed', { 
            detail: this.settings 
        }));
    }

    /**
     * 渲染设置界面
     */
    render(container) {
        const html = `
            <div class="gs-settings-view">
                <div class="gs-settings-header">
                    <h2><i class="fa-solid fa-gear"></i> 设置</h2>
                    <p class="gs-settings-subtitle">自定义你的游戏体验</p>
                </div>

                <div class="gs-settings-content">
                    <!-- 外观设置 -->
                    <div class="gs-settings-section">
                        <h3 class="gs-settings-section-title">
                            <i class="fa-solid fa-palette"></i>
                            外观设置
                        </h3>

                        <div class="gs-settings-group">
                            <div class="gs-setting-item">
                                <div class="gs-setting-info">
                                    <label class="gs-setting-label">主题模式</label>
                                    <p class="gs-setting-description">选择亮色或暗色主题</p>
                                </div>
                                <div class="gs-setting-control">
                                    <div class="gs-theme-toggle">
                                        <button class="gs-theme-option ${this.settings.theme === 'light' ? 'active' : ''}" 
                                                data-theme="light">
                                            <i class="fa-solid fa-sun"></i>
                                            <span>亮色</span>
                                        </button>
                                        <button class="gs-theme-option ${this.settings.theme === 'dark' ? 'active' : ''}" 
                                                data-theme="dark">
                                            <i class="fa-solid fa-moon"></i>
                                            <span>暗色</span>
                                        </button>
                                        <button class="gs-theme-option ${this.settings.theme === 'parchment' ? 'active' : ''}" 
                                                data-theme="parchment">
                                            <i class="fa-solid fa-scroll"></i>
                                            <span>羊皮纸</span>
                                        </button>
                                        <button class="gs-theme-option ${this.settings.theme === 'light-parchment' ? 'active' : ''}" 
                                                data-theme="light-parchment">
                                            <i class="fa-solid fa-file"></i>
                                            <span>淡色羊皮纸</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div class="gs-setting-item">
                                <div class="gs-setting-info">
                                    <label class="gs-setting-label">字体大小</label>
                                    <p class="gs-setting-description">调整界面文字大小</p>
                                </div>
                                <div class="gs-setting-control">
                                    <div class="gs-slider-control">
                                        <input type="range" 
                                               id="font-size-slider" 
                                               min="6" 
                                               max="20" 
                                               step="1" 
                                               value="${this.settings.fontSize}">
                                        <span class="gs-slider-value">${this.settings.fontSize}px</span>
                                    </div>
                                </div>
                            </div>

                            <div class="gs-setting-item">
                                <div class="gs-setting-info">
                                    <label class="gs-setting-label">面板透明度</label>
                                    <p class="gs-setting-description">调整面板背景透明度</p>
                                </div>
                                <div class="gs-setting-control">
                                    <div class="gs-slider-control">
                                        <input type="range" 
                                               id="opacity-slider" 
                                               min="0.5" 
                                               max="1" 
                                               step="0.05" 
                                               value="${this.settings.panelOpacity}">
                                        <span class="gs-slider-value">${Math.round(this.settings.panelOpacity * 100)}%</span>
                                    </div>
                                </div>
                            </div>

                            <div class="gs-setting-item">
                                <div class="gs-setting-info">
                                    <label class="gs-setting-label">紧凑模式</label>
                                    <p class="gs-setting-description">减少间距，显示更多内容</p>
                                </div>
                                <div class="gs-setting-control">
                                    <label class="gs-toggle-switch">
                                        <input type="checkbox" 
                                               id="compact-mode-toggle" 
                                               ${this.settings.compactMode ? 'checked' : ''}>
                                        <span class="gs-toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 性能设置 -->
                    <div class="settings-section">
                        <h3 class="gs-settings-section-title">
                            <i class="fa-solid fa-gauge-high"></i>
                            性能设置
                        </h3>

                        <div class="gs-settings-group">
                            <div class="gs-setting-item">
                                <div class="gs-setting-info">
                                    <label class="gs-setting-label">动画效果</label>
                                    <p class="gs-setting-description">启用或禁用界面动画</p>
                                </div>
                                <div class="gs-setting-control">
                                    <label class="gs-toggle-switch">
                                        <input type="checkbox" 
                                               id="animations-toggle" 
                                               ${this.settings.animationsEnabled ? 'checked' : ''}>
                                        <span class="gs-toggle-slider"></span>
                                    </label>
                                </div>
                            </div>

                            <div class="gs-setting-item">
                                <div class="gs-setting-info">
                                    <label class="gs-setting-label">数据刷新间隔</label>
                                    <p class="gs-setting-description">自动刷新数据的时间间隔（毫秒）</p>
                                </div>
                                <div class="gs-setting-control">
                                    <div class="gs-slider-control">
                                        <input type="range" 
                                               id="refresh-interval-slider" 
                                               min="500" 
                                               max="5000" 
                                               step="500" 
                                               value="${this.settings.refreshInterval}">
                                        <span class="gs-slider-value">${this.settings.refreshInterval}ms</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 快捷键设置 -->
                    <div class="settings-section">
                        <h3 class="gs-settings-section-title">
                            <i class="fa-solid fa-keyboard"></i>
                            快捷键设置
                        </h3>

                        <div class="gs-settings-group">
                            <div class="gs-shortcut-list" id="shortcut-list">
                                <!-- 快捷键列表将在这里动态生成 -->
                            </div>
                            
                            <div class="gs-shortcut-help">
                                <p><i class="fa-solid fa-circle-info"></i> 点击快捷键按钮可以重新设置按键</p>
                                <p><i class="fa-solid fa-lightbulb"></i> 在输入框中打字时快捷键不会触发</p>
                            </div>
                        </div>
                    </div>

                    <!-- 通知设置 -->
                    <div class="settings-section">
                        <h3 class="gs-settings-section-title">
                            <i class="fa-solid fa-bell"></i>
                            通知设置
                        </h3>

                        <div class="gs-settings-group">
                            <div class="gs-setting-item">
                                <div class="gs-setting-info">
                                    <label class="gs-setting-label">显示通知</label>
                                    <p class="gs-setting-description">显示重要事件的通知提示</p>
                                </div>
                                <div class="gs-setting-control">
                                    <label class="gs-toggle-switch">
                                        <input type="checkbox" 
                                               id="notifications-toggle" 
                                               ${this.settings.showNotifications ? 'checked' : ''}>
                                        <span class="gs-toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 系统操作 -->
                    <div class="settings-section">
                        <h3 class="gs-settings-section-title">
                            <i class="fa-solid fa-wrench"></i>
                            系统操作
                        </h3>

                        <div class="gs-settings-group">
                            <div class="gs-setting-item">
                                <div class="gs-setting-info">
                                    <label class="gs-setting-label">重置UI位置</label>
                                    <p class="gs-setting-description">将面板恢复到屏幕中央</p>
                                </div>
                                <div class="gs-setting-control">
                                    <button class="gs-settings-btn" id="reset-position-btn">
                                        <i class="fa-solid fa-arrows-to-dot"></i>
                                        重置位置
                                    </button>
                                </div>
                            </div>

                            <div class="gs-setting-item">
                                <div class="gs-setting-info">
                                    <label class="gs-setting-label">清除缓存</label>
                                    <p class="gs-setting-description">清除所有缓存数据，提升性能</p>
                                </div>
                                <div class="gs-setting-control">
                                    <button class="gs-settings-btn" id="clear-cache-btn">
                                        <i class="fa-solid fa-broom"></i>
                                        清除缓存
                                    </button>
                                </div>
                            </div>

                            <div class="gs-setting-item">
                                <div class="gs-setting-info">
                                    <label class="gs-setting-label">恢复默认设置</label>
                                    <p class="gs-setting-description">将所有设置恢复为默认值</p>
                                </div>
                                <div class="gs-setting-control">
                                    <button class="gs-settings-btn settings-btn-danger" id="reset-settings-btn">
                                        <i class="fa-solid fa-rotate-left"></i>
                                        恢复默认
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 关于信息 -->
                    <div class="settings-section">
                        <h3 class="gs-settings-section-title">
                            <i class="fa-solid fa-circle-info"></i>
                            关于
                        </h3>

                        <div class="gs-settings-group">
                            <div class="gs-about-info">
                                <div class="gs-about-logo">
                                    <i class="fa-solid fa-dice-d20"></i>
                                </div>
                                <h4>GS Status Bar Extension</h4>
                                <p class="gs-version">版本 1.0.0</p>
                                <p class="gs-description">
                                    为 SillyTavern 提供强大的游戏状态管理和可视化功能
                                </p>
                                <div class="gs-about-links">
                                    <a href="#" class="gs-about-link" id="github-link">
                                        <i class="fa-brands fa-github"></i>
                                        GitHub
                                    </a>
                                    <a href="#" class="gs-about-link" id="docs-link">
                                        <i class="fa-solid fa-book"></i>
                                        文档
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
        this.attachEventListeners(container);
        this.applySettings();
    }

    /**
     * 渲染快捷键列表
     */
    renderShortcutList(container) {
        const shortcutList = container.querySelector('#shortcut-list');
        if (!shortcutList) return;

        // 获取键盘管理器实例
        const app = window.parent.gsStatusBarApp || window.gsStatusBarApp;
        if (!app || !app.keyboardManager) {
            shortcutList.innerHTML = '<p class="gs-error-message">键盘管理器未初始化</p>';
            return;
        }

        const shortcuts = app.keyboardManager.getRegisteredShortcuts();
        
        if (shortcuts.length === 0) {
            shortcutList.innerHTML = '<p class="gs-info-message">暂无已注册的快捷键</p>';
            return;
        }

        let html = '';
        shortcuts.forEach((shortcut, index) => {
            const keyDisplay = this.formatKeyDisplay(shortcut.key);
            html += `
                <div class="gs-shortcut-item">
                    <div class="gs-shortcut-info">
                        <span class="gs-shortcut-description">${shortcut.description}</span>
                    </div>
                    <div class="gs-shortcut-key">
                        <kbd class="gs-kbd">${keyDisplay}</kbd>
                        <button class="gs-shortcut-edit-btn" 
                                data-shortcut-key="${shortcut.key}" 
                                data-shortcut-index="${index}"
                                title="重新设置快捷键">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        shortcutList.innerHTML = html;

        // 绑定编辑按钮事件
        shortcutList.querySelectorAll('.gs-shortcut-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const key = e.currentTarget.dataset.shortcutKey;
                this.editShortcut(key, e.currentTarget);
            });
        });
    }

    /**
     * 格式化快捷键显示
     */
    formatKeyDisplay(key) {
        const parts = key.split('+');
        return parts.map(part => {
            // 转换为更友好的显示
            const displayMap = {
                'ctrl': 'Ctrl',
                'shift': 'Shift',
                'alt': 'Alt',
                'escape': 'ESC',
                'f2': 'F2',
                'f3': 'F3',
                'e': 'E',
                'm': 'M',
                'j': 'J',
                'k': 'K'
            };
            return displayMap[part.toLowerCase()] || part.toUpperCase();
        }).join(' + ');
    }

    /**
     * 编辑快捷键
     */
    editShortcut(key, buttonElement) {
        const app = window.parent.gsStatusBarApp || window.gsStatusBarApp;
        if (!app) return;

        // 显示提示
        const originalText = buttonElement.innerHTML;
        buttonElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        buttonElement.disabled = true;

        this.showNotification('请按下新的快捷键...', 'info');

        // 监听下一次按键
        const handleKeyPress = (e) => {
            e.preventDefault();
            e.stopPropagation();

            // 忽略单独的修饰键
            if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
                return;
            }

            const newKey = e.key;
            const hasCtrl = e.ctrlKey || e.metaKey;
            const hasShift = e.shiftKey;
            const hasAlt = e.altKey;

            // 生成新的快捷键标识
            const parts = [];
            if (hasCtrl) parts.push('ctrl');
            if (hasShift) parts.push('shift');
            if (hasAlt) parts.push('alt');
            parts.push(newKey.toLowerCase());
            const newKeyId = parts.join('+');

            // 检查是否与现有快捷键冲突
            const existingShortcuts = app.keyboardManager.getRegisteredShortcuts();
            const conflict = existingShortcuts.find(s => s.key === newKeyId && s.key !== key);

            if (conflict) {
                this.showNotification(`快捷键 ${this.formatKeyDisplay(newKeyId)} 已被使用`, 'error');
                buttonElement.innerHTML = originalText;
                buttonElement.disabled = false;
                document.removeEventListener('keydown', handleKeyPress, true);
                return;
            }

            // TODO: 实际更新快捷键（需要在 KeyboardManager 中添加更新方法）
            this.showNotification(`快捷键已更新为 ${this.formatKeyDisplay(newKeyId)}`, 'success');
            
            // 恢复按钮状态
            buttonElement.innerHTML = originalText;
            buttonElement.disabled = false;

            // 重新渲染列表
            const container = buttonElement.closest('.gs-settings-view');
            if (container) {
                this.renderShortcutList(container);
            }

            // 移除监听器
            document.removeEventListener('keydown', handleKeyPress, true);
        };

        // 添加全局监听器
        document.addEventListener('keydown', handleKeyPress, true);

        // 5秒后自动取消
        setTimeout(() => {
            document.removeEventListener('keydown', handleKeyPress, true);
            if (buttonElement.disabled) {
                buttonElement.innerHTML = originalText;
                buttonElement.disabled = false;
                this.showNotification('快捷键设置已取消', 'info');
            }
        }, 5000);
    }

    /**
     * 绑定事件监听器
     */
    attachEventListeners(container) {
        // 渲染快捷键列表
        this.renderShortcutList(container);
        // 主题切换
        container.querySelectorAll('.gs-theme-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const theme = e.currentTarget.dataset.theme;
                this.settings.theme = theme;
                this.saveSettings();
                
                // 更新按钮状态
                container.querySelectorAll('.gs-theme-option').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });

        // 字体大小滑块
        const fontSizeSlider = container.querySelector('#font-size-slider');
        const fontSizeValue = fontSizeSlider.nextElementSibling;
        fontSizeSlider.addEventListener('input', (e) => {
            const value = e.target.value;
            fontSizeValue.textContent = `${value}px`;
            this.settings.fontSize = parseInt(value);
            this.saveSettings();
        });

        // 透明度滑块
        const opacitySlider = container.querySelector('#opacity-slider');
        const opacityValue = opacitySlider.nextElementSibling;
        opacitySlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            opacityValue.textContent = `${Math.round(value * 100)}%`;
            this.settings.panelOpacity = value;
            this.saveSettings();
        });

        // 刷新间隔滑块
        const refreshSlider = container.querySelector('#refresh-interval-slider');
        const refreshValue = refreshSlider.nextElementSibling;
        refreshSlider.addEventListener('input', (e) => {
            const value = e.target.value;
            refreshValue.textContent = `${value}ms`;
            this.settings.refreshInterval = parseInt(value);
            this.saveSettings();
        });

        // 开关按钮
        const toggles = {
            'compact-mode-toggle': 'compactMode',
            'animations-toggle': 'animationsEnabled',
            'notifications-toggle': 'showNotifications'
        };

        Object.entries(toggles).forEach(([id, setting]) => {
            const toggle = container.querySelector(`#${id}`);
            if (toggle) {
                toggle.addEventListener('change', (e) => {
                    this.settings[setting] = e.target.checked;
                    this.saveSettings();
                });
            }
        });

        // 重置位置按钮
        container.querySelector('#reset-position-btn')?.addEventListener('click', () => {
            this.resetPanelPosition();
        });

        // 清除缓存按钮
        container.querySelector('#clear-cache-btn')?.addEventListener('click', () => {
            this.clearCache();
        });

        // 恢复默认设置按钮
        container.querySelector('#reset-settings-btn')?.addEventListener('click', () => {
            this.resetSettings();
        });
    }

    /**
     * 重置面板位置
     */
    resetPanelPosition() {
        const panel = this.elements.root;
        if (panel) {
            panel.style.left = '50%';
            panel.style.top = '50%';
            panel.style.transform = 'translate(-50%, -50%)';
            Logger.success('面板位置已重置');
            this.showNotification('面板位置已重置到屏幕中央');
        }
    }

    /**
     * 清除缓存
     */
    clearCache() {
        try {
            // 清除渲染缓存
            if (window.renderCache) {
                window.renderCache.clear();
            }
            
            // 清除图片缓存
            if (window.imageDatabaseLoader) {
                window.imageDatabaseLoader.clearCache();
            }

            Logger.success('缓存已清除');
            this.showNotification('缓存已清除');
        } catch (error) {
            Logger.error('清除缓存失败', error);
            this.showNotification('清除缓存失败', 'error');
        }
    }

    /**
     * 恢复默认设置
     */
    resetSettings() {
        if (confirm('确定要恢复所有默认设置吗？此操作不可撤销。')) {
            localStorage.removeItem('gs_extension_settings');
            this.settings = this.loadSettings();
            this.applySettings();
            
            // 重新渲染设置界面
            const container = this.elements.statusContentDetail || this.elements.root;
            if (container) {
                this.render(container);
            }
            
            Logger.success('设置已恢复为默认值');
            this.showNotification('设置已恢复为默认值');
        }
    }

    /**
     * 显示通知
     */
    showNotification(message, type = 'success') {
        if (!this.settings.showNotifications) return;

        const notification = document.createElement('div');
        notification.className = `gs-notification gs-notification-${type}`;
        notification.innerHTML = `
            <i class="fa-solid fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(notification);

        // 动画显示
        setTimeout(() => notification.classList.add('show'), 10);

        // 3秒后移除
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}
