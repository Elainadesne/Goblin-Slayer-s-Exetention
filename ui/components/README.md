# UI 组件文档

## FullscreenOverlay - 全屏覆盖层组件

### 概述

`FullscreenOverlay` 是一个可复用的全屏容器组件，用于显示各种全屏内容（如地图、技能树、升级界面等）。

### 功能特性

- ✅ 全屏显示
- ✅ ESC 键关闭
- ✅ 关闭按钮（可选）
- ✅ 内容插槽（支持 HTML 字符串和 DOM 元素）
- ✅ 打开/关闭动画
- ✅ 手机端响应式布局
- ✅ 完整的生命周期管理

### 使用方法

#### 基本用法

```javascript
import { FullscreenOverlay } from './ui/components/FullscreenOverlay.js';

// 创建实例
const overlay = new FullscreenOverlay({
    onClose: () => {
        console.log('覆盖层已关闭');
    }
});

// 打开覆盖层（HTML 字符串）
overlay.open('<div>你的内容</div>');

// 或者传入 DOM 元素
const content = document.createElement('div');
content.innerHTML = '<h1>标题</h1>';
overlay.open(content);

// 关闭覆盖层
overlay.close();

// 销毁覆盖层
overlay.destroy();
```

#### 配置选项

```javascript
const overlay = new FullscreenOverlay({
    // 关闭时的回调函数
    onClose: () => {},
    
    // 自定义类名
    className: 'my-custom-overlay',
    
    // 是否显示关闭按钮（默认 true）
    showCloseButton: true
});
```

#### API 方法

| 方法 | 参数 | 说明 |
|------|------|------|
| `create()` | 无 | 创建 DOM 结构（通常不需要手动调用） |
| `open(content)` | `content`: HTML 字符串或 DOM 元素 | 打开覆盖层并显示内容 |
| `close()` | 无 | 关闭覆盖层 |
| `destroy()` | 无 | 销毁覆盖层，清理所有资源 |
| `getContentSlot()` | 无 | 获取内容插槽 DOM 元素 |
| `isOpened()` | 无 | 检查覆盖层是否打开 |

### 样式定制

组件使用 CSS 类名 `gs-fullscreen-overlay`，你可以通过自定义类名来覆盖样式：

```javascript
const overlay = new FullscreenOverlay({
    className: 'my-custom-overlay'
});
```

然后在 CSS 中：

```css
.gs-fullscreen-overlay.my-custom-overlay {
    background: rgba(0, 0, 0, 0.8);
}

.gs-fullscreen-overlay.my-custom-overlay .gs-fullscreen-close-btn {
    background: red;
}
```

### 手机端适配

组件已内置手机端响应式样式：

- 小屏幕（≤768px）：关闭按钮缩小到 40x40px
- 超小屏幕（≤480px）：关闭按钮缩小到 36x36px
- 关闭按钮始终保持在可见区域

### 使用示例

#### 示例 1: 显示地图

```javascript
const mapOverlay = new FullscreenOverlay({
    className: 'map-overlay',
    onClose: () => {
        // 清理地图资源
        map.destroy();
    }
});

// 创建地图内容
const mapContainer = document.createElement('div');
mapContainer.id = 'fullscreen-map';
// ... 初始化地图

mapOverlay.open(mapContainer);
```

#### 示例 2: 显示技能树

```javascript
const skillTreeOverlay = new FullscreenOverlay({
    className: 'skill-tree-overlay'
});

// 渲染技能树
const skillTreeHtml = renderSkillTree(skillData);
skillTreeOverlay.open(skillTreeHtml);
```

#### 示例 3: 无关闭按钮模式

```javascript
const introOverlay = new FullscreenOverlay({
    showCloseButton: false,
    onClose: () => {
        console.log('开场动画结束');
    }
});

// 显示开场动画
introOverlay.open('<div class="intro-animation">...</div>');

// 动画结束后自动关闭
setTimeout(() => {
    introOverlay.close();
}, 5000);
```

### 注意事项

1. **资源清理**: 使用完毕后记得调用 `destroy()` 方法清理资源
2. **ESC 键**: ESC 键会自动关闭覆盖层，如果需要禁用，可以在 `onClose` 回调中处理
3. **z-index**: 覆盖层的 z-index 为 9999，关闭按钮为 10000
4. **动画**: 打开和关闭都有淡入淡出动画，持续时间 0.3 秒

### 测试

运行测试脚本：

```javascript
// 在 SillyTavern 控制台中运行
await import('/scripts/extensions/third-party/gs_status_bar_extension/测试工具/test_fullscreen_overlay.js');
```

测试覆盖：
- ✅ 基本创建和打开
- ✅ ESC 键关闭
- ✅ 关闭按钮
- ✅ DOM 元素内容
- ✅ 自定义类名
- ✅ 无关闭按钮模式
- ✅ 销毁功能
- ✅ 手机端样式
