/**
 * Toast Notification System
 * 简单的浮动通知系统
 */

export class Toast {
    static show(message, duration = 3000, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        // 添加到父文档
        const parentDoc = window.parent.document;
        parentDoc.body.appendChild(toast);
        
        // 触发动画
        setTimeout(() => toast.classList.add('toast-show'), 10);
        
        // 自动移除
        setTimeout(() => {
            toast.classList.remove('toast-show');
            setTimeout(() => parentDoc.body.removeChild(toast), 300);
        }, duration);
    }
    
    static success(message, duration = 3000) {
        this.show(message, duration, 'success');
    }
    
    static error(message, duration = 3000) {
        this.show(message, duration, 'error');
    }
    
    static warning(message, duration = 3000) {
        this.show(message, duration, 'warning');
    }
    
    static info(message, duration = 3000) {
        this.show(message, duration, 'info');
    }
}
