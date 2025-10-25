# 技能树布局指南

## 坐标系统

技能树使用网格坐标系统，便于精确定位每个技能节点。

### 网格规格
- **网格大小**: 12x12 (可扩展)
- **中心点**: (0, 0) - 中心节点位置
- **单位**: 每个网格单位 = 100px
- **坐标范围**: x: -6 到 6, y: -6 到 6

### 坐标示例

```
        y
        ↑
   -6  -4  -2   0   2   4   6
-6  ·   ·   ·   ·   ·   ·   ·
-4  ·   ·   ·   ·   ·   ·   ·
-2  ·   ·   ·   ·   ·   ·   ·
 0  ·   ·   ·   🎯  ·   ·   · → x
 2  ·   ·   ·   ·   ·   ·   ·
 4  ·   ·   ·   ·   ·   ·   ·
 6  ·   ·   ·   ·   ·   ·   ·
```

### 职业方向建议

基于圆形布局，建议职业分布：

- **神官**: 上方 (0, -3)
- **战士**: 右上 (3, -2)
- **魔术师**: 右方 (3, 0)
- **游侠**: 右下 (3, 2)
- **斥候**: 下方 (0, 3)
- **剑客**: 左下 (-3, 2)
- **武道家**: 左方 (-3, 0)
- **精灵使**: 左上 (-3, -2)

## JSON 格式

在 skill_trees.json 中为每个技能添加 `position` 字段：

```json
{
  "战士": {
    "name": "战士",
    "skills": [
      {
        "id": "warrior_weapon_specialization",
        "name": "武器专精",
        "position": { "x": 3, "y": -2 },
        "max_level": 3,
        "levels": [...],
        "dependencies": []
      },
      {
        "id": "warrior_armor_adaptation",
        "name": "铠甲适应",
        "position": { "x": 4, "y": -1 },
        "max_level": 3,
        "levels": [...],
        "dependencies": ["warrior_weapon_specialization"]
      }
    ]
  }
}
```

## 技能依赖连线

技能之间的依赖关系会自动绘制连线：

```json
"dependencies": ["warrior_weapon_specialization"]
```

这会从 "武器专精" 到当前技能绘制一条连线。

## 调试模式

在开发者控制台中运行以下命令可以显示网格：

```javascript
window.parent.gsStatusBarApp.uiController.fullscreenUpgradeView.toggleGrid();
```

## 快速定位工具

使用测试脚本快速查看当前技能位置：

```javascript
// 在控制台运行
await import('/scripts/extensions/gs_status_bar_extension/测试工具/show_skill_positions.js');
```
