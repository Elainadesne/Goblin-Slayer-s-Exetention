# GS Status Bar Extension

这是一个为 [SillyTavern](https://sillytavern.app/) 设计的、功能高度集成的“哥布林杀手”世界观状态栏扩展。它作为一个独立的、可插拔的前端模块运行，通过 [TavernHelper](https://github.com/TavernAI/TavernHelper) 提供的 API 与宿主环境交互，旨在为用户提供一个沉浸式、信息丰富的角色扮演（RPG）界面。

## ✨ 核心功能

本扩展通过一个可由消息按钮唤起的面板，集中展示了与角色扮演相关的核心信息，主要分为以下几个功能页签：

- **状态 (Status)**: 展示角色的核心属性、技能、装备等。
- **任务 (Tasks)**: 管理和追踪当前的任务线。
- **世界 (World)**: 维护与“关系者”、“敌对者”等NPC的交互信息。
- **地图 (Map)**: 提供当前所在位置的可视化地图。
- **领地 (Territory)**: 展示玩家所拥有的领地与产业信息。
- **设置 (Settings)**: 提供与本扩展相关的配置选项。

此外，还包含一个独立的“职业与技能树”弹窗，用于处理角色的成长与升级。

## 📁 关键目录导览

本扩展遵循 TavernHelper 的标准前端扩展结构，核心文件均位于 `gs_status_bar_extension/` 目录下：

- **`manifest.json`**:
  - **作用**: 扩展的清单文件，用于向 TavernHelper 声明本扩展的存在、基本信息（如作者、版本）以及入口文件。
  - **关键字段**:
    - `js`: "script.js" (指向入口脚本)
    - `css`: "css/base.css" (指向主样式文件，需自行创建)
    - `html`: "panel.html" (指向UI面板的HTML结构)

- **`panel.html`**:
  - **作用**: 定义了状态栏面板的全部 HTML 结构（DOM）。
  - **核心结构**:
    - `gs-status-bar-panel-container`: 整个面板的根容器。
    - `top-nav`: 顶部导航栏，包含位置信息和六个功能页签的切换按钮。
    - `tab-pane`: 每个功能页签对应的内容容器，通过 `data-tab` 属性与按钮关联。
    - `skill-tree-modal`: 独立的技能树弹窗。
    - `gs-open-panel-button`: 唤起状态栏面板的全局按钮。

- **`script.js`**:
  - **作用**: 扩展的 JavaScript 主入口，负责初始化、加载应用逻辑并与宿主环境通信。
  - **执行流程**:
    1.  `areApisReady()`: 持续检测宿主环境的 `SillyTavern`, `TavernHelper`, `jQuery` 等核心 API 是否已加载完毕。
    2.  动态导入 `app.js` (需自行创建): API 就绪后，会动态加载并实例化核心应用逻辑模块 `app.js`。
    3.  全局挂载: 将应用实例挂载到 `window.parent.gsStatusBarApp`，方便跨 IFrame 调试。

- **`/utils/`**:
  - **作用**: 存放可复用的工具函数模块，以保持主应用逻辑的清晰。
  - **现有模块**:
    - `character_search.js`: 角色搜索功能。
    - `equipment_compare.js`: 装备比较逻辑。
    - `genie_animator.js`: 精灵动画效果。
    - `inventory_filter.js`: 库存筛选。
    - `lazy_load.js`: 懒加载实现。
    - `radar_chart.js`: 雷达图绘制。
    - `render_cache.js`: 渲染缓存管理。
    - `toast.js`: 消息提示（Toast）组件。

## 🚀 如何开发

1.  **创建核心逻辑 (`app.js`)**:
    - 在 `gs_status_bar_extension/` 目录下创建一个 `app.js` 文件。
    - 在此文件中定义一个 `StatusBarApp` 类，负责处理所有交互逻辑，包括：
      - 绑定 `panel.html` 中各按钮的点击事件。
      - 实现页签的切换显示逻辑。
      - 从宿主环境获取数据并渲染到对应的 `tab-pane` 中。
      - 管理技能树的升级与确认。

2.  **编写样式 (`css/base.css`)**:
    - 在 `gs_status_bar_extension/` 目录下创建一个 `css` 文件夹，并在其中创建 `base.css`。
    - 在此文件中编写所有与 `panel.html` 相关的样式，以美化界面。

3.  **使用工具模块**:
    - 在 `app.js` 中，可以通过 `import` 语句从 `/utils/` 目录中引入所需的功能模块，例如：
      ```javascript
      import { showToast } from './utils/toast.js';
      showToast('欢迎使用GS状态栏！');
      ```

4.  **调试**:
    - 将整个 `gs_status_bar_extension` 目录作为扩展安装到 SillyTavern 中。
    - 在浏览器开发者工具的控制台中，可以通过 `gsStatusBarApp` 访问到您在 `app.js` 中创建的应用实例，进行实时调试。

## 🛠️ 运行依赖

- **宿主环境**: SillyTavern + TavernHelper
- **三方库**: jQuery (由宿主环境提供)
- **图标库**: Font Awesome (依赖宿主环境加载)

---

本 README 专注于 `gs_status_bar_extension` 模块本身，旨在为参与本模块开发的贡献者提供清晰、独立的指引。