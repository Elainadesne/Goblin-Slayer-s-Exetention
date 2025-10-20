# Goblin-Slayer-s-Exetention
# 扩展协作开发README
本目录用于存放可插拔的前端扩展（Extension），以模块化方式集成到 SillyTavern/酒馆助手运行环境。本文档统一采用相对路径链接，并按模块逐一说明。

## 当前扩展包
- 扩展包：GS状态栏扩展（gs_status_bar_extension）
- 目录（仅列出实际存在项）：
  - 清单文件：[gs_status_bar_extension/gs_status_bar_extension/manifest.json](gs_status_bar_extension/gs_status_bar_extension/manifest.json)
  - 面板模板：[gs_status_bar_extension/gs_status_bar_extension/panel.html](gs_status_bar_extension/gs_status_bar_extension/panel.html)
  - 脚本入口：[gs_status_bar_extension/gs_status_bar_extension/script.js](gs_status_bar_extension/gs_status_bar_extension/script.js)
  - 打包残留（可忽略）：[gs_status_bar_extension/__MACOSX](gs_status_bar_extension/__MACOSX)

## 模块分解

### 1) 扩展清单模块（manifest）
- 文件： [gs_status_bar_extension/gs_status_bar_extension/manifest.json](gs_status_bar_extension/gs_status_bar_extension/manifest.json)
- 作用：声明扩展的基本信息与入口资源。字段包括：display_name、author、version、description、js、css、html。
- 现状：js 指向 script.js；html 指向 panel.html；css 字段声明为 css/base.css（当前仓库未包含该文件）。

### 2) 面板模板模块（panel）
- 文件： [gs_status_bar_extension/gs_status_bar_extension/panel.html](gs_status_bar_extension/gs_status_bar_extension/panel.html)
- 顶部导航： [html.top_nav()](gs_status_bar_extension/gs_status_bar_extension/panel.html:8)，包含位置显示与页签按钮。
- 位置显示： [html.#nav-location-info()](gs_status_bar_extension/gs_status_bar_extension/panel.html:9)、[html.#nav-location-text()](gs_status_bar_extension/gs_status_bar_extension/panel.html:11)。
- 页签按钮： [html.nav-button()](gs_status_bar_extension/gs_status_bar_extension/panel.html:14) 至 [html.nav-button()](gs_status_bar_extension/gs_status_bar_extension/panel.html:37)。
- 打开/关闭入口：打开按钮 [html.#gs-open-panel-button()](gs_status_bar_extension/gs_status_bar_extension/panel.html:87)，关闭按钮 [html.modal-close-button()](gs_status_bar_extension/gs_status_bar_extension/panel.html:3)。
- 技能树弹窗：容器 [html.#skill-tree-modal()](gs_status_bar_extension/gs_status_bar_extension/panel.html:92)，内容区 [html.#skill-tree-content()](gs_status_bar_extension/gs_status_bar_extension/panel.html:98)，底部确认按钮 [html.#footer-confirm-button()](gs_status_bar_extension/gs_status_bar_extension/panel.html:101)。
- 页签容器与内容：
  - 状态页签：容器 [html.#status-pane()](gs_status_bar_extension/gs_status_bar_extension/panel.html:43)，侧栏 [html.#status-sidebar()](gs_status_bar_extension/gs_status_bar_extension/panel.html:44)，详情 [html.#status-content-detail()](gs_status_bar_extension/gs_status_bar_extension/panel.html:47)。
  - 任务页签：容器 [html.#tasks-pane()](gs_status_bar_extension/gs_status_bar_extension/panel.html:53)，内容 [html.#tasks-content()](gs_status_bar_extension/gs_status_bar_extension/panel.html:54)。
  - 世界页签：容器 [html.#world-pane()](gs_status_bar_extension/gs_status_bar_extension/panel.html:58)，主侧栏 [html.#world-sidebar-main()](gs_status_bar_extension/gs_status_bar_extension/panel.html:59)，子列表 [html.#world-sub-list()](gs_status_bar_extension/gs_status_bar_extension/panel.html:62)，详情 [html.#world-content-detail()](gs_status_bar_extension/gs_status_bar_extension/panel.html:65)。
  - 地图页签：容器 [html.#map-pane()](gs_status_bar_extension/gs_status_bar_extension/panel.html:71)，内容 [html.#map-content()](gs_status_bar_extension/gs_status_bar_extension/panel.html:72)。
  - 领地页签：容器 [html.#territory-pane()](gs_status_bar_extension/gs_status_bar_extension/panel.html:76)，内容 [html.#territory-content()](gs_status_bar_extension/gs_status_bar_extension/panel.html:77)。
  - 设置页签：容器 [html.#settings-pane()](gs_status_bar_extension/gs_status_bar_extension/panel.html:81)，内容 [html.#settings-content()](gs_status_bar_extension/gs_status_bar_extension/panel.html:82)。

### 3) 入口脚本模块（script）
- 文件： [gs_status_bar_extension/gs_status_bar_extension/script.js](gs_status_bar_extension/gs_status_bar_extension/script.js)
- API就绪检测： [js.areApisReady()](gs_status_bar_extension/gs_status_bar_extension/script.js:6) 检查 SillyTavern、TavernHelper、jQuery、eventSource 等。
- 轮询初始化： [js.setInterval()](gs_status_bar_extension/gs_status_bar_extension/script.js:17) 周期检查，准备完成后进入应用加载。
- 动态导入应用： [js.import()](gs_status_bar_extension/gs_status_bar_extension/script.js:21) 预期加载 app.js（当前仓库未包含该文件）。
- 实例化与调试： [js.StatusBarApp()](gs_status_bar_extension/gs_status_bar_extension/script.js:23) 创建应用实例，并挂到全局 [js.gsStatusBarApp](gs_status_bar_extension/gs_status_bar_extension/script.js:25)。

### 4) 功能模块（按页签拆分）
- 状态模块：负责角色属性/技能/装备等信息的导航与详情呈现（见 [html.#status-pane()](gs_status_bar_extension/gs_status_bar_extension/panel.html:43) 等容器）。
- 任务模块：负责任务列表与状态展示（见 [html.#tasks-content()](gs_status_bar_extension/gs_status_bar_extension/panel.html:54)）。
- 世界模块：按类别展示“关系者/敌对者”等角色集合，支持子列表与详情切换（见世界页签相关容器）。
- 地图模块：地图/位置信息承载（见 [html.#map-content()](gs_status_bar_extension/gs_status_bar_extension/panel.html:72)）。
- 领地模块：领地信息与产业概览（见 [html.#territory-content()](gs_status_bar_extension/gs_status_bar_extension/panel.html:77)）。
- 设置模块：偏好、开关等配置（见 [html.#settings-content()](gs_status_bar_extension/gs_status_bar_extension/panel.html:82)）。

## 运行依赖与数据对接
- 宿主依赖：SillyTavern（宿主窗口）+ 酒馆助手（TavernHelper）+ jQuery；就绪检测见 [js.areApisReady()](gs_status_bar_extension/gs_status_bar_extension/script.js:6)。
- 图标依赖：Font Awesome（fa-solid 等）。
- 可复用数据：技能树 [../状态栏/data/skill_trees.json](../状态栏/data/skill_trees.json)、头像清单 [../状态栏/data/avatar_manifest.json](../状态栏/data/avatar_manifest.json)、地图参考 [../地图/地图系统.html](../地图/地图系统.html)。

## 使用方式（本地/宿主集成）
- 将扩展包目录 [gs_status_bar_extension/gs_status_bar_extension](gs_status_bar_extension/gs_status_bar_extension) 保持原样放入宿主的扩展加载路径。
- 确保清单 [gs_status_bar_extension/gs_status_bar_extension/manifest.json](gs_status_bar_extension/gs_status_bar_extension/manifest.json) 被扩展加载器识别。
- 启动宿主后，通过打开按钮 [html.#gs-open-panel-button()](gs_status_bar_extension/gs_status_bar_extension/panel.html:87) 唤起面板；或在控制台检查全局实例 [js.gsStatusBarApp](gs_status_bar_extension/gs_status_bar_extension/script.js:25)。

## 协作开发约定
- 变更边界：优先在扩展目录内修改；跨模块改动需在 PR 说明影响范围。
- 命名约定：ID/Class/DataKey 保持语义明确与一致，避免与现有模块冲突。
- 代码风格：参考仓库 ESLint/Prettier 配置 [../../eslint.config.mjs](../../eslint.config.mjs)、[../../.prettierrc](../../.prettierrc)。
- 提交建议：提供最小复现与截图，便于评审。

## 调试与排错
- 若宿主 API 未就绪，初始化轮询 [js.setInterval()](gs_status_bar_extension/gs_status_bar_extension/script.js:17) 将持续运行直至成功。
- 若应用未加载，请确认 app.js 是否存在并可被 IFrame 访问（本README不引用该文件路径）。
- 若图标不显示，检查宿主是否加载 Font Awesome。
- 可通过控制台访问 [js.gsStatusBarApp](gs_status_bar_extension/gs_status_bar_extension/script.js:25) 进行实例级调试。

## TODO（仅列出现状与任务，不引用不存在路径）
- 实现应用主模块 app.js：负责状态管理、事件绑定、视图渲染与路由切换。
- 提供基础样式（与 manifest.css 字段一致）：通用布局、主题与动画。
- 完成各页签的数据加载与交互：状态、任务、世界、地图、领地、设置。
- 清理打包残留：删除 __MACOSX 目录并统一目录规范。
- 编写使用文档与演示素材（面向非开发成员）。

## 备注
- 本 README 仅引用实际存在的文件与行号；对于尚未纳入仓库的文件不提供路径链接，以避免 Git 上的断链。
- 如目录结构或加载方式调整，请在 PR 中同步更新此文档。
