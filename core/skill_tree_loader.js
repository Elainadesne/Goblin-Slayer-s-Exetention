import { Logger } from './logger.js';

/**
 * Skill Tree Data Loader
 * 从世界书加载技能树数据库
 */
export class SkillTreeLoader {
    constructor() {
        this.skillTreeData = null;
        this.SKILL_LEVEL_MAP = {
            1: { rank: '初级', bonus: 1 },
            2: { rank: '中级', bonus: 2 },
            3: { rank: '高级', bonus: 3 },
            4: { rank: '精通', bonus: 4 },
            5: { rank: '大师', bonus: 5 },
        };
    }

    /**
     * 从世界书加载技能树数据
     * @param {object} worldbookApi - TavernHelper.worldbook API 对象
     * @returns {Promise<boolean>} 是否加载成功
     */
    async loadFromWorldbook(worldbookApi) {
        try {
            Logger.log('正在从世界书加载技能树数据...');
            if (!worldbookApi) {
                throw new Error('Worldbook API 未提供');
            }

            const charBooks = worldbookApi.getCharWorldbookNames('current');
            const primaryBookName = charBooks.primary;

            if (!primaryBookName) {
                Logger.warn('当前角色卡没有绑定主世界书，技能树功能不可用。');
                this.skillTreeData = null;
                return false;
            }

            const entries = await worldbookApi.getWorldbook(primaryBookName);
            const skillTreeEntry = entries.find(entry =>
                entry.strategy && entry.strategy.keys && entry.strategy.keys.includes('skill_tree_database')
            );

            if (skillTreeEntry) {
                this.skillTreeData = JSON.parse(skillTreeEntry.content);
                Logger.success(`成功从主世界书 [${primaryBookName}] 加载技能树数据库。`);
                return true;
            } else {
                Logger.warn(`在主世界书 [${primaryBookName}] 中未找到包含 'skill_tree_database' 关键字的条目。`);
                this.skillTreeData = null;
                return false;
            }
        } catch (error) {
            Logger.error('从世界书加载技能树数据库时发生错误:', error);
            this.skillTreeData = null;
            return false;
        }
    }

    /**
     * 加载技能树数据（从JSON文件加载）
     * @returns {Promise<boolean>} 是否加载成功
     */
    async load() {
        try {
            Logger.log('正在加载技能树数据...');

            // 从JSON文件加载技能树数据
            const response = await fetch('/scripts/extensions/gs_status_bar_extension/data/skill_trees.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            this.skillTreeData = await response.json();

            Logger.success('技能树数据加载成功（从JSON文件）');
            return true;
        } catch (error) {
            Logger.error('从JSON文件加载技能树数据失败，使用硬编码数据作为后备:', error);

            // 如果加载失败，使用硬编码数据作为后备
            this.skillTreeData = this.getDefaultSkillTreeData();
            Logger.success('技能树数据加载成功（硬编码后备数据）');
            return true;
        }
    }

    /**
     * 获取默认的技能树数据
     * @returns {Object} 技能树数据对象
     */
    getDefaultSkillTreeData() {
        return {
            "通用": {
                "name": "通用",
                "branch": "center",
                "description": "所有角色均可学习的基础技能或通过特殊事件获得的固有能力。",
                "skills": [
                    {
                        "id": "common_base",
                        "name": "原点",
                        "description": "一切职业的起点。",
                        "max_level": 1,
                        "icon": "common/center_orb.png",
                        "position": { "x": 50, "y": 50 },
                        "levels": [
                            {
                                "level": 1,
                                "required_job_level": 1,
                                "cost": 0,
                                "description": "一切职业的起点。"
                            }
                        ],
                        "dependencies": []
                    }
                ]
            },
            "神官": {
                "name": "神官",
                "branch": "north",
                "tier": 1,
                "description": "以虔诚的信仰作为力量之源，沟通神明以施行奇迹的侍奉者，是队伍在绝望中的光明。",
                "skills": [
                    {
                        "id": "priest_miracle",
                        "name": "奇迹",
                        "icon": "神官/priest_miracle.png",
                        "position": { "x": 50, "y": 38 },
                        "description": "呼唤神明的力量，降下神恩或神罚。",
                        "max_level": 3,
                        "levels": [
                            { "level": 1, "required_job_level": 2, "cost": 1, "description": "能够向神明祈求并使用1-2阶的奇迹。" },
                            { "level": 2, "required_job_level": 4, "cost": 2, "description": "可使用至多4阶的奇迹，且所有治疗类奇迹的效果提升20%。" },
                            { "level": 3, "required_job_level": 7, "cost": 2, "description": "可使用至多6阶的奇迹，并且每日一次，可在深度祈祷后获得一次来自神明的、与当前困境相关的直接启示（通常为一句话的暗喻）。" }
                        ],
                        "dependencies": [{ "skill_id": "common_base" }]
                    },
                    {
                        "id": "priest_faith_allegiance",
                        "name": "信仰专精",
                        "icon": "神官/priest_faith_allegiance.png",
                        "position": { "x": 50, "y": 26 },
                        "description": "选择要求：\"请选择一位侍奉的神明（例如：至高神、地神、战女神等）\"",
                        "max_level": 3,
                        "levels": [
                            { "level": 1, "required_job_level": 2, "cost": 1, "description": "施展所选神明的奇迹时，敌人抵抗该奇迹的判定难度+1。" },
                            { "level": 2, "required_job_level": 4, "cost": 2, "description": "施展所选神明的奇迹时，可选择瞬发，无需咏唱时间。此能力每日可使用次数等同于你的信仰力修正值。" },
                            { "level": 3, "required_job_level": 7, "cost": 2, "description": "无需圣徽即可引导神力，你的存在本身即为圣域。施展所选神明的奇迹时，周身会散发小范围的圣光，对不死生物和魔神爪牙造成持续性的微弱神圣伤害。" }
                        ],
                        "dependencies": [{ "skill_id": "priest_miracle" }]
                    }
                ]
            },
            "斥候": {
                "name": "斥候",
                "branch": "south",
                "tier": 1,
                "description": "阴影中的潜行者与精巧的工匠，擅长侦察、解除陷阱和从敌人意想不到的位置发动致命一击。",
                "skills": [
                    {
                        "id": "scout_stealth",
                        "name": "潜行",
                        "icon": "斥候/scout_stealth.png",
                        "position": { "x": 50, "y": 62 },
                        "description": "在阴影或遮蔽物后隐藏身形。",
                        "max_level": 3,
                        "levels": [
                            { "level": 1, "required_job_level": 2, "cost": 1, "description": "在昏暗光照、阴影或利用遮蔽物时，潜行检定获得+2加值。" },
                            { "level": 2, "required_job_level": 4, "cost": 2, "description": "在任何环境下，潜行检定都获得+2加值，且移动时发出的声音显著减弱。" },
                            { "level": 3, "required_job_level": 7, "cost": 2, "description": "潜行检定加值提升至+4，并且在未被发现的潜行状态下发动的第一次攻击必定被视为卓越成功（大成功）。" }
                        ],
                        "dependencies": [{ "skill_id": "common_base" }]
                    },
                    {
                        "id": "scout_handiwork",
                        "name": "手工",
                        "icon": "斥候/scout_handiwork.png",
                        "position": { "x": 50, "y": 74 },
                        "description": "精通于处理精巧的机械结构。",
                        "max_level": 3,
                        "levels": [
                            { "level": 1, "required_job_level": 2, "cost": 1, "description": "进行开锁或解除常规机械陷阱的检定时获得+2加值。" },
                            { "level": 2, "required_job_level": 4, "cost": 2, "description": "能够处理更复杂的机械机关，并且可以通过观察和使用工具尝试复制简单的物理钥匙。" },
                            { "level": 3, "required_job_level": 7, "cost": 2, "description": "能够尝试解除附有魔法效果的陷阱或锁具，但这需要通过一次额外的【感知】或【知识】检定来对抗魔法的复杂性。" }
                        ],
                        "dependencies": [{ "skill_id": "scout_stealth" }]
                    }
                ]
            },
            "游侠": {
                "name": "游侠",
                "branch": "east",
                "tier": 1,
                "description": "荒野的生存者与致命的远程射手，精通弓箭与追踪技巧，是大自然最危险的猎人。",
                "skills": [
                    {
                        "id": "ranger_archery_techniques",
                        "name": "箭术技巧",
                        "icon": "游侠/ranger_archery_techniques.png",
                        "position": { "x": 62, "y": 50 },
                        "description": "对弓箭的理解与日俱增，让你能使出更高级的射击技巧。",
                        "max_level": 3,
                        "levels": [
                            { "level": 1, "required_job_level": 2, "cost": 1, "description": "你的箭术已初窥门径，解锁了【速射】的基础架势。" },
                            { "level": 2, "required_job_level": 4, "cost": 2, "description": "你学会了在射击时计算抛物线，解锁了【曲射】的技巧。" },
                            { "level": 3, "required_job_level": 7, "cost": 2, "description": "可在同一回合内使用无惩罚的【速射】，或者同时使用【速射】与【曲射】（速射的两次攻击均可绕过掩体）。" }
                        ],
                        "dependencies": [{ "skill_id": "common_base" }]
                    },
                    {
                        "id": "ranger_survival",
                        "name": "生存术",
                        "icon": "游侠/ranger_survival.png",
                        "position": { "x": 74, "y": 50 },
                        "description": "掌握在严酷的自然环境中生存下去的知识。",
                        "max_level": 3,
                        "levels": [
                            { "level": 1, "required_job_level": 2, "cost": 1, "description": "在野外环境下进行追踪、寻找食物和水源的判定时获得+2加值。" },
                            { "level": 2, "required_job_level": 4, "cost": 2, "description": "能够快速搭建安全的庇护所（提供充分休息加值），并能制作简易的狩猎或警报陷阱。" },
                            { "level": 3, "required_job_level": 7, "cost": 2, "description": "能够通过观察云层、风向等解读复杂的气候变化，并能通过姿态和声音与野兽进行有限的、基础的沟通（如表达\"无敌意\"）。" }
                        ],
                        "dependencies": [{ "skill_id": "ranger_archery_techniques" }]
                    }
                ]
            },
            "战士": {
                "name": "战士",
                "branch": "west",
                "tier": 1,
                "description": "精通多种武器与重型护甲的战场专家，攻守兼备，是队伍中最可靠的屏障。",
                "skills": [
                    {
                        "id": "warrior_weapon_specialization",
                        "name": "武器专精",
                        "icon": "战士/warrior_weapon_specialization.png",
                        "position": { "x": 38, "y": 50 },
                        "description": "选择一项专精的武器类型（例如：剑、斧、锤、长矛等）",
                        "max_level": 3,
                        "levels": [
                            { "level": 1, "required_job_level": 2, "cost": 1, "description": "使用已选定的专精武器类型时，可将一半的职业等级（向下取整）作为加值附加到命中判定上。" },
                            { "level": 2, "required_job_level": 4, "cost": 2, "description": "使用专精武器时，可将完整的职业等级作为加值附加到命中判定上。" },
                            { "level": 3, "required_job_level": 7, "cost": 2, "description": "使用专精武器时，可将完整的职业等级作为加值附加到命中与伤害威力判定上。" }
                        ],
                        "dependencies": [{ "skill_id": "common_base" }]
                    },
                    {
                        "id": "warrior_armor_adaptation",
                        "name": "铠甲适应",
                        "icon": "战士/warrior_armor_adaptation.png",
                        "position": { "x": 26, "y": 50 },
                        "description": "选择一项适应的铠甲类型（例如：皮甲、锁甲、板甲等）",
                        "max_level": 3,
                        "levels": [
                            { "level": 1, "required_job_level": 2, "cost": 1, "description": "穿着已选定的适应铠甲类型时，该护甲带来的闪避检定惩罚减半。" },
                            { "level": 2, "required_job_level": 4, "cost": 2, "description": "穿着适应铠甲时，完全免疫其带来的闪避检定惩罚。" },
                            { "level": 3, "required_job_level": 7, "cost": 2, "description": "穿着适应铠甲时，额外获得1点装甲值（减伤）。" }
                        ],
                        "dependencies": [{ "skill_id": "warrior_weapon_specialization" }]
                    }
                ]
            },
            "魔术师": {
                "name": "魔术师",
                "branch": "northwest",
                "tier": 1,
                "description": "通过严谨的学术研究和精准的咒文咏唱来驾驭魔法力量的学者，擅长识别并利用敌人的弱点。",
                "skills": [
                    {
                        "id": "mage_true_magic",
                        "name": "真言咒文",
                        "icon": "魔术师/mage_true_magic.png",
                        "position": { "x": 42, "y": 42 },
                        "description": "提升对魔法知识的理解，解锁更高环阶的法术。",
                        "max_level": 3,
                        "levels": [
                            { "level": 1, "required_job_level": 2, "cost": 1, "description": "能够理解并使用1-2环的真言咒文。" },
                            { "level": 2, "required_job_level": 4, "cost": 2, "description": "可使用至多4环的真言咒文，并能对已知咒文进行简单改良。" },
                            { "level": 3, "required_job_level": 7, "cost": 2, "description": "可使用至多6环的真言咒文，并能够尝试创造全新的低环法术。" }
                        ],
                        "dependencies": [{ "skill_id": "common_base" }]
                    },
                    {
                        "id": "mage_monster_lore",
                        "name": "怪物知识",
                        "icon": "魔术师/mage_monster_lore.png",
                        "position": { "x": 34, "y": 34 },
                        "description": "运用渊博的学识看破魔物的本质。",
                        "max_level": 3,
                        "levels": [
                            { "level": 1, "required_job_level": 2, "cost": 1, "description": "知识判定成功后，能得知目标怪物的基本属性和一个代表性技能。" },
                            { "level": 2, "required_job_level": 4, "cost": 2, "description": "知识判定成功后，能得知目标怪物的全部主动技能和一个关键弱点。" },
                            { "level": 3, "required_job_level": 7, "cost": 2, "description": "知识判定成功后，能得知其所有弱点、可预判的行为模式，并能提供精准的战术建议。" }
                        ],
                        "dependencies": [{ "skill_id": "mage_true_magic" }]
                    }
                ]
            },
            "剑客": {
                "name": "剑客",
                "branch": "northeast",
                "tier": 1,
                "description": "以剑为道的求道者。他们不依赖重甲，而是凭借精湛技艺、迅捷身法与独特的\"架势\"在生死一线间起舞。",
                "skills": [
                    {
                        "id": "swordsman_sword_forms",
                        "name": "剑式基础",
                        "icon": "剑客/swordsman_sword_forms.png",
                        "position": { "x": 58, "y": 42 },
                        "description": "对挥剑、步法、呼吸等基础功的千锤百炼。",
                        "max_level": 5,
                        "levels": [
                            { "level": 1, "required_job_level": 1, "cost": 1, "description": "命中检定+1" },
                            { "level": 2, "required_job_level": 3, "cost": 1, "description": "命中检定+2" },
                            { "level": 3, "required_job_level": 5, "cost": 2, "description": "命中检定+3" },
                            { "level": 4, "required_job_level": 7, "cost": 2, "description": "命中检定+4" },
                            { "level": 5, "required_job_level": 10, "cost": 3, "description": "命中检定+5" }
                        ],
                        "dependencies": [{ "skill_id": "common_base" }]
                    },
                    {
                        "id": "swordsman_flowing_stance",
                        "name": "流水架势",
                        "icon": "剑客/swordsman_flowing_stance.png",
                        "position": { "x": 66, "y": 34 },
                        "description": "将架势的运用融入呼吸与心跳，专注于防守反击的时机。",
                        "max_level": 5,
                        "levels": [
                            { "level": 1, "required_job_level": 1, "cost": 1, "description": "最大架势点+1 (总计1点)。" },
                            { "level": 2, "required_job_level": 3, "cost": 1, "description": "成功进行\"架势格挡\"后，下一次进行闪避检定时获得+1加值。" },
                            { "level": 3, "required_job_level": 5, "cost": 2, "description": "最大架势点再+1。" },
                            { "level": 4, "required_job_level": 7, "cost": 2, "description": "每日一次，可在架势点归零时，立即恢复1点架势点，避免一次\"破势\"。" },
                            { "level": 5, "required_job_level": 10, "cost": 3, "description": "在你的回合开始时，若你的架势点为0，则自动恢复1点。" }
                        ],
                        "dependencies": [{ "skill_id": "swordsman_sword_forms" }]
                    }
                ]
            },
            "武道家": {
                "name": "武道家",
                "branch": "southwest",
                "tier": 1,
                "description": "将肉体锤炼至极限的格斗大师，依靠速度、力量和技巧在战场上穿梭，以迅猛的拳脚击溃敌人。",
                "skills": [
                    {
                        "id": "monk_acrobatics",
                        "name": "体术",
                        "icon": "武道家/monk_acrobatics.png",
                        "position": { "x": 42, "y": 58 },
                        "description": "锤炼肉体，使其做出超越常人的动作。",
                        "max_level": 3,
                        "levels": [
                            { "level": 1, "required_job_level": 2, "cost": 1, "description": "所有基于力量或敏捷的运动系判定（如攀爬、跳跃、平衡）获得+1加值。" },
                            { "level": 2, "required_job_level": 4, "cost": 2, "description": "运动系判定加值提升至+2，且跳跃距离增加50%。" },
                            { "level": 3, "required_job_level": 7, "cost": 2, "description": "运动系判定加值提升至+3，并且可以在墙壁或水面等垂直或非固体表面进行短距离奔跑。" }
                        ],
                        "dependencies": [{ "skill_id": "common_base" }]
                    },
                    {
                        "id": "monk_insight",
                        "name": "看破",
                        "icon": "武道家/monk_insight.png",
                        "position": { "x": 34, "y": 66 },
                        "description": "在攻击的间隙中寻找破绽。",
                        "max_level": 3,
                        "levels": [
                            { "level": 1, "required_job_level": 2, "cost": 1, "description": "在只被单个敌人攻击时，闪避判定获得+1加值。" },
                            { "level": 2, "required_job_level": 4, "cost": 2, "description": "对所有来自正面的攻击，闪避判定都获得+1加值，且闪避检定的大成功（双六）范围扩大（11或12）。" },
                            { "level": 3, "required_job_level": 7, "cost": 2, "description": "闪避判定加值提升至+2，并且能够自动察觉并定位处于隐形状态的敌人。" }
                        ],
                        "dependencies": [{ "skill_id": "monk_acrobatics" }]
                    }
                ]
            },
            "精灵使": {
                "name": "精灵使",
                "branch": "southeast",
                "tier": 1,
                "description": "大自然的沟通者，借用无处不在的精灵之力来施法的媒介，是荒野的宠儿。",
                "skills": [
                    {
                        "id": "spirituser_spirit_arts",
                        "name": "精灵术",
                        "icon": "精灵使/spirituser_spirit_arts.png",
                        "position": { "x": 58, "y": 58 },
                        "description": "与自然界的精灵沟通，并借用它们的力量。",
                        "max_level": 3,
                        "levels": [
                            { "level": 1, "required_job_level": 2, "cost": 1, "description": "可与环境中的低阶精灵（如土、风、水、火）沟通，并借用它们的力量施展基础法术。" },
                            { "level": 2, "required_job_level": 4, "cost": 2, "description": "能够与中阶精灵（如植物、雷电）沟通，并能指派精灵进行更复杂的协助，例如派遣风之精灵进行短途侦察。" },
                            { "level": 3, "required_job_level": 7, "cost": 2, "description": "能够尝试与稀有的高阶精灵（如光、暗、生命）沟通。此外，你能够与一只特定的中低阶精灵建立长期契约，使其成为你的\"精灵伙伴\"，获得其持续性的被动加成或主动帮助。" }
                        ],
                        "dependencies": [{ "skill_id": "common_base" }]
                    },
                    {
                        "id": "spirituser_child_of_spirits",
                        "name": "精灵宠儿",
                        "icon": "精灵使/spirituser_child_of_spirits.png",
                        "position": { "x": 66, "y": 66 },
                        "description": "你深受精灵的喜爱，大自然视你为家人。",
                        "max_level": 3,
                        "levels": [
                            { "level": 1, "required_job_level": 2, "cost": 1, "description": "施展精灵术时，有小概率无需消耗咒文使用次数。" },
                            { "level": 2, "required_job_level": 4, "cost": 2, "description": "在自然环境中，对你友善的精灵会主动为你提供周围环境的简要情报（如\"附近有水源\"、\"有大型生物正在靠近\"）。" },
                            { "level": 3, "required_job_level": 7, "cost": 2, "description": "你可以在任何自然环境中，通过短暂的冥想与精灵共鸣，每日一次，恢复少量体力和1D6魔力次数。" }
                        ],
                        "dependencies": [{ "skill_id": "spirituser_spirit_arts" }]
                    }
                ]
            }
        };
    }

    /**
     * 创建或更新技能树世界书条目
     * @param {string} worldbookName - 世界书名称
     * @param {object} skillTreeData - 技能树数据
     * @returns {Promise<boolean>} 是否成功
     */
    async createOrUpdateSkillTreeEntry(worldbookName, skillTreeData) {
        try {
            Logger.log(`正在创建/更新世界书 "${worldbookName}" 中的技能树条目...`);

            // 检查 TavernHelper 是否可用
            if (!window.TavernHelper || !window.TavernHelper.worldbook) {
                Logger.error('TavernHelper 或 worldbook API 不可用');
                return false;
            }

            // 检查世界书是否存在，不存在则创建
            const worldbookNames = window.TavernHelper.worldbook.getWorldbookNames();
            if (!worldbookNames.includes(worldbookName)) {
                const created = await window.TavernHelper.worldbook.createWorldbook(worldbookName);
                if (!created) {
                    Logger.error(`创建世界书 "${worldbookName}" 失败`);
                    return false;
                }
                Logger.success(`创建了新的世界书 "${worldbookName}"`);
            }

            // 创建技能树条目
            const skillTreeEntry = {
                name: '技能树数据库',
                enabled: true,
                content: JSON.stringify(skillTreeData, null, 2),
                strategy: {
                    type: 'constant',
                    keys: ['skill_tree_database'],
                    keys_secondary: { logic: 'and_any', keys: [] },
                    scan_depth: 'same_as_global'
                },
                position: {
                    type: 'after_character_definition',
                    role: 'system',
                    depth: 0,
                    order: 0
                },
                probability: 100,
                recursion: {
                    prevent_incoming: false,
                    prevent_outgoing: false,
                    delay_until: null
                },
                effect: {
                    sticky: null,
                    cooldown: null,
                    delay: null
                }
            };

            // 检查是否已存在技能树条目
            const existingEntries = await window.TavernHelper.worldbook.getWorldbook(worldbookName);
            const existingSkillTreeEntry = existingEntries.find(entry =>
                entry.strategy && entry.strategy.keys && entry.strategy.keys.includes('skill_tree_database')
            );

            if (existingSkillTreeEntry) {
                // 更新现有条目
                const updatedEntries = existingEntries.map(entry =>
                    entry.uid === existingSkillTreeEntry.uid ? { ...entry, content: skillTreeEntry.content } : entry
                );
                await window.TavernHelper.worldbook.replaceWorldbook(worldbookName, updatedEntries);
                Logger.success(`更新了世界书 "${worldbookName}" 中的技能树条目`);
            } else {
                // 创建新条目
                await window.TavernHelper.worldbook.createWorldbookEntries(worldbookName, [skillTreeEntry]);
                Logger.success(`在世界书 "${worldbookName}" 中创建了新的技能树条目`);
            }

            return true;
        } catch (error) {
            Logger.error('创建/更新技能树世界书条目失败:', error);
            return false;
        }
    }

    /**
     * 直接设置技能树数据
     * @param {object} data - 技能树数据对象
     */
    setData(data) {
        this.skillTreeData = data;
        Logger.log('技能树数据已通过 setData 方法直接设置。');
    }


    getSkillTreeData() {
        return this.skillTreeData;
    }

    findSkillDefinitionById(skillId) {
        if (!this.skillTreeData) return null;

        for (const jobKey in this.skillTreeData) {
            const job = this.skillTreeData[jobKey];
            const skills = this._getSkillsArray(job);
            const skill = skills.find(s => s?.id === skillId);
            if (skill) return { skill, jobKey };
        }
        return null;
    }

    findSkillDefinitionByName(skillName) {
        if (!this.skillTreeData) return null;

        for (const jobKey in this.skillTreeData) {
            const job = this.skillTreeData[jobKey];
            const skills = this._getSkillsArray(job);
            const skill = skills.find(s => s?.name === skillName);
            if (skill) return { skill, jobKey };
        }
        return null;
    }

    _getSkillsArray(job) {
        const src = job?.skills;
        if (!src) return [];
        if (Array.isArray(src)) return src;
        if (typeof src === 'object') return Object.values(src);
        return [];
    }

    getNumericSkillLevel(skillData) {
        if (!skillData) return 0;

        const levelValue = skillData.level ?? skillData.等级;

        if (typeof levelValue === 'number') {
            return levelValue;
        }

        if (typeof levelValue === 'string') {
            for (const [lvl, data] of Object.entries(this.SKILL_LEVEL_MAP)) {
                if (data.rank === levelValue) {
                    return Number(lvl);
                }
            }
        }

        return 0;
    }
}
