// 图片懒加载工具

export class LazyLoader {
    constructor(options = {}) {
        this.options = {
            root: null,
            rootMargin: '50px',
            threshold: 0.01,
            ...options
        };

        this.observer = null;
        this.images = new Set();
        this.init();
    }

    init() {
        if ('IntersectionObserver' in window) {
            this.observer = new IntersectionObserver(
                this.handleIntersection.bind(this),
                this.options
            );
        }
    }

    handleIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                this.loadImage(img);
                this.observer.unobserve(img);
                this.images.delete(img);
            }
        });
    }

    loadImage(img) {
        const src = img.dataset.src;
        if (!src) return;

        // 创建新的 Image 对象来预加载
        const tempImg = new Image();
        
        tempImg.onload = () => {
            img.src = src;
            img.classList.remove('lazy-loading');
            img.classList.add('lazy-loaded');
            img.removeAttribute('data-src');
        };

        tempImg.onerror = () => {
            img.classList.remove('lazy-loading');
            img.classList.add('lazy-error');
            // 显示占位符或错误图标
            img.alt = '图片加载失败';
        };

        img.classList.add('lazy-loading');
        tempImg.src = src;
    }

    observe(element) {
        if (!this.observer) {
            // 不支持 IntersectionObserver，直接加载
            this.loadImage(element);
            return;
        }

        this.images.add(element);
        this.observer.observe(element);
    }

    observeAll(selector = 'img[data-src]', container = document) {
        const images = container.querySelectorAll(selector);
        images.forEach(img => this.observe(img));
    }

    disconnect() {
        if (this.observer) {
            this.observer.disconnect();
        }
        this.images.clear();
    }

    /**
     * 立即加载所有图片（用于打印等场景）
     */
    loadAll() {
        this.images.forEach(img => {
            this.loadImage(img);
            if (this.observer) {
                this.observer.unobserve(img);
            }
        });
        this.images.clear();
    }
}

// 全局懒加载实例
export const globalLazyLoader = new LazyLoader();
