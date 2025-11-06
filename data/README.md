# Data 文件夹

此文件夹用于存放扩展的数据文件。

## 文件说明

### skill_trees.json
**用途**: 技能树数据库

**格式**:
```json
{
  "职业名称": {
    "name": "职业名称",
    "tier": 1,
    "description": "职业描述",
    "next_tier": null,
    "skills": [
      {
        "id": "技能ID",
        "name": "技能名称",
        "description": "技能描述",
        "max_level": 3,
        "levels": [
          {
            "level": 1,
            "required_job_level": 2,
            "cost": 1,
            "description": "等级1效果描述"
          }
        ],
        "dependencies": []
      }
    ]
  }
}
```

**加载策略**:
1. 优先从本地文件加载（`data/skill_trees.json`）
2. 如果本地文件不存在或加载失败，则从世界书加载（备用方案）
3. 两者都失败时，技能树功能不可用

**优势**:
- ✅ 独立于世界书，更易维护
- ✅ 版本控制友好
- ✅ 可以快速更新技能树数据
- ✅ 不依赖角色卡绑定的世界书

## 如何更新技能树数据

1. 编辑 `skill_trees.json` 文件
2. 确保 JSON 格式正确
3. 刷新 SillyTavern 页面
4. 扩展会自动加载新数据

## 数据验证

可以使用在线 JSON 验证工具验证文件格式：
- https://jsonlint.com/
- https://jsonformatter.curiousconcept.com/

## 备注

- 文件必须是有效的 JSON 格式
- 使用 UTF-8 编码
- 建议在修改前备份原文件
