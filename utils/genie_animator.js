/**
 * Genie Animator - macOS风格的精灵动画控制器
 * 控制面板的打开和关闭动画
 */

export class GenieAnimator {
    constructor(panel, button, container) {
        this.panel = panel;
        this.button = button;
        this.container = container;
        this.isAnimating = false;
        this.animationDuration = 600; // 毫秒
    }

    /**
     * 打开面板（Genie效果）
     */
    async open() {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        
        // 先设置面板为不可见但已渲染状态，避免闪烁
        this.panel.style.opacity = '0';
        this.panel.style.visibility = 'hidden';
        this.container.style.display = 'flex';
        
        // 确保容器有足够高度（特别是移动端）
        if (window.innerWidth <= 768) {
            this.container.style.height = '100vh';
        }
        
        // 等待两帧确保内容已渲染
        await this.nextFrame();
        await this.nextFrame();
        
        // 恢复可见性
        this.panel.style.opacity = '';
        this.panel.style.visibility = '';
        
        // 添加按钮波纹效果
        this.button.classList.add('genie-ripple');
        setTimeout(() => {
            this.button.classList.remove('genie-ripple');
        }, 800);
        
        // 移除旧的动画类和标记
        this.panel.classList.remove('genie-closing', 'visible', 'genie-opened');
        
        // 添加打开动画类
        this.panel.classList.add('genie-opening');
        
        // 使用animationend事件，但只监听面板自己的动画
        const onAnimationEnd = (e) => {
            // 只处理面板自己的动画，忽略子元素的动画
            if (e.target !== this.panel) return;
            // 只处理genieOpen动画
            if (e.animationName !== 'genieOpen') return;
            
            this.panel.removeEventListener('animationend', onAnimationEnd);
            this.panel.classList.remove('genie-opening');
            // 添加标记表示已通过Genie打开，避免触发visible的动画
            this.panel.classList.add('visible', 'genie-opened');
            this.isAnimating = false;
        };
        
        this.panel.addEventListener('animationend', onAnimationEnd);
        
        // 备用超时，防止事件未触发
        setTimeout(() => {
            if (this.isAnimating) {
                this.panel.removeEventListener('animationend', onAnimationEnd);
                this.panel.classList.remove('genie-opening');
                this.panel.classList.add('visible', 'genie-opened');
                this.isAnimating = false;
            }
        }, this.animationDuration + 100);
    }

    /**
     * 关闭面板（Genie效果）
     */
    async close() {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        
        // 添加按钮脉冲效果
        this.button.classList.add('genie-pulse');
        setTimeout(() => {
            this.button.classList.remove('genie-pulse');
        }, 600);
        
        // 移除visible类和genie-opened标记
        this.panel.classList.remove('visible', 'genie-opened');
        
        // 移除旧的动画类
        this.panel.classList.remove('genie-opening');
        
        // 添加关闭动画类
        this.panel.classList.add('genie-closing');
        
        // 使用animationend事件，但只监听面板自己的动画
        const onAnimationEnd = (e) => {
            // 只处理面板自己的动画，忽略子元素的动画
            if (e.target !== this.panel) return;
            // 只处理genieClose动画
            if (e.animationName !== 'genieClose') return;
            
            this.panel.removeEventListener('animationend', onAnimationEnd);
            this.panel.classList.remove('genie-closing');
            this.container.style.display = 'none';
            this.isAnimating = false;
        };
        
        this.panel.addEventListener('animationend', onAnimationEnd);
        
        // 备用超时
        setTimeout(() => {
            if (this.isAnimating) {
                this.panel.removeEventListener('animationend', onAnimationEnd);
                this.panel.classList.remove('genie-closing');
                this.container.style.display = 'none';
                this.isAnimating = false;
            }
        }, this.animationDuration + 100);
    }

    /**
     * 切换面板状态
     */
    async toggle(isOpen) {
        if (isOpen) {
            await this.close();
        } else {
            await this.open();
        }
    }

    /**
     * 等待指定时间
     */
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 等待下一帧
     */
    nextFrame() {
        return new Promise(resolve => requestAnimationFrame(resolve));
    }

    /**
     * 检查是否正在动画
     */
    get animating() {
        return this.isAnimating;
    }

    /**
     * 设置动画持续时间
     */
    setDuration(ms) {
        this.animationDuration = ms;
    }

    /**
     * 禁用动画（直接切换）
     */
    disableAnimation() {
        this.panel.classList.add('no-animations');
    }

    /**
     * 启用动画
     */
    enableAnimation() {
        this.panel.classList.remove('no-animations');
    }

    /**
     * 立即显示（无动画）
     */
    showImmediate() {
        this.container.style.display = 'flex';
        
        // 确保容器有足够高度（特别是移动端）
        if (window.innerWidth <= 768) {
            this.container.style.height = '100vh';
        }
        
        this.panel.classList.add('visible');
        this.panel.style.opacity = '1';
        this.panel.style.transform = 'scale(1) translateY(0)';
    }

    /**
     * 立即隐藏（无动画）
     */
    hideImmediate() {
        this.panel.classList.remove('visible');
        this.container.style.display = 'none';
        this.panel.style.opacity = '0';
    }
}

/**
 * 创建Genie动画器的工厂函数
 */
export function createGenieAnimator() {
    const doc = window.parent.document;
    const panel = doc.getElementById('gs-status-bar-panel');
    const button = doc.getElementById('gs-open-panel-button');
    const container = doc.getElementById('gs-status-bar-panel-container');
    
    if (!panel || !button || !container) {
        console.error('Genie Animator: Required elements not found');
        return null;
    }
    
    return new GenieAnimator(panel, button, container);
}
