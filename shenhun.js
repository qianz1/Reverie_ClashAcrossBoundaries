/* ==================================================================
   神魂系统 · 纯逻辑层
   —— 战斗外数据。神魂在开战前（createUnit）一次性结算进角色基础属性，
      战斗核心完全感知不到神魂存在。本层不依赖任何 DOM / 渲染代码。
   ================================================================== */
(function (root) {
'use strict';

/* ==================== 一、稀有度 ==================== */
/* 排序决定「相差 1 阶」的数值换算，也决定抽卡保底的稀有度档位。 */
const RARITY_ORDER = ['普通', '罕见', '珍贵', '史诗', '传说', '神话'];

/* 神魂名称与属性的配色（与 CSS 变量 --sh-rarity-* 一一对应） */
const RARITY_COLOR = {
  '普通': '#9e9e9e', '罕见': '#43a047', '珍贵': '#1e88e5',
  '史诗': '#8e24aa', '传说': '#fb8c00', '神话': '#e53935'
};

/* ==================== 二、属性池 ==================== */
/* 主属性按属性自身口径取值：百分比类带 %，speed 为固定点数（不带 %，
   但数值与主属性表对齐：神话 55.0 / 传说 46.8 …）。
   速度大改后，1 号位新增「速度」主属性，角色基础速度压到 100~120 区间，
   提速改由神魂承担。 */
const MAIN_ATTRS = ['atkPct', 'defPct', 'hpPct', 'speed', 'critRate', 'critDmg', 'effectHit', 'effectResist'];

/* 各位置允许的主属性池（位置 = 1/2/3，数组用 0/1/2） */
const MAIN_POOL_BY_SLOT = [
  ['atkPct', 'defPct', 'hpPct', 'speed'],                          // 1号位（新增速度）
  ['atkPct', 'defPct', 'hpPct', 'effectHit', 'effectResist'],      // 2号位
  ['atkPct', 'defPct', 'hpPct', 'critRate', 'critDmg']            // 3号位
];

/* 副属性池：固定 8 条，神魂装 4 条且不重复，8 ≥ 4 必可收敛。 */
const SUB_ATTRS = ['atkPct', 'defPct', 'hpPct', 'speed', 'critRate', 'critDmg', 'effectHit', 'effectResist'];
const SUB_COUNT = 4;

/* ==================== 三、主属性数值表 ==================== */
/* 单位：百分比类为百分数（55.0 = 55.0%），speed 为固定值点数。
   ★ speed 主属性不带 %，但数值与其它主属性完全对齐（同样 55.0 / 46.8 …），
     显示由 ATTR_META.speed.pct=false 决定，不在这里单独处理。
   神话数值直接取自设定；其他稀有度 = 神话 × (6 - 阶差) / 6。 */
const MAIN_BASE = {
  atkPct:    { '神话': 55.0, '传说': 46.8, '史诗': 38.5, '珍贵': 30.3, '罕见': 22.0, '普通': 13.8 },
  defPct:    { '神话': 55.0, '传说': 46.8, '史诗': 38.5, '珍贵': 30.3, '罕见': 22.0, '普通': 13.8 },
  hpPct:     { '神话': 55.0, '传说': 46.8, '史诗': 38.5, '珍贵': 30.3, '罕见': 22.0, '普通': 13.8 },
  speed:     { '神话': 55.0, '传说': 46.8, '史诗': 38.5, '珍贵': 30.3, '罕见': 22.0, '普通': 13.8 },
  critRate:  { '神话': 55.0, '传说': 46.8, '史诗': 38.5, '珍贵': 30.3, '罕见': 22.0, '普通': 13.8 },
  critDmg:   { '神话': 85.0, '传说': 72.3, '史诗': 59.5, '珍贵': 46.8, '罕见': 34.0, '普通': 21.3 },
  effectHit: { '神话': 55.0, '传说': 46.8, '史诗': 38.5, '珍贵': 30.3, '罕见': 22.0, '普通': 13.8 },
  effectResist: { '神话': 55.0, '传说': 46.8, '史诗': 38.5, '珍贵': 30.3, '罕见': 22.0, '普通': 13.8 }
};

/* ==================== 四、副属性数值区间表 ==================== */
/* 百分比类为百分数区间（[min, max] 含端点取整）；speed 为固定值区间。
   ★ 速度大改后，speed 副属性区间与其它属性【完全对齐】（神话 [6,36]，
     其余同样按 (6-阶差)/6 缩放），只是显示不带 %。
   存量神魂按需求「自然淘汰」：不迁移、不补偿，旧数值原样保留到被换掉为止。 */
const SUB_RANGE = {
  atkPct:      { '神话': [6.0, 36.0], '传说': [5.1, 30.6], '史诗': [4.2, 25.2], '珍贵': [3.3, 19.8], '罕见': [2.4, 14.4], '普通': [1.5, 9.0] },
  defPct:      { '神话': [6.0, 36.0], '传说': [5.1, 30.6], '史诗': [4.2, 25.2], '珍贵': [3.3, 19.8], '罕见': [2.4, 14.4], '普通': [1.5, 9.0] },
  hpPct:       { '神话': [6.0, 36.0], '传说': [5.1, 30.6], '史诗': [4.2, 25.2], '珍贵': [3.3, 19.8], '罕见': [2.4, 14.4], '普通': [1.5, 9.0] },
  speed:       { '神话': [6.0, 36.0], '传说': [5.1, 30.6], '史诗': [4.2, 25.2], '珍贵': [3.3, 19.8], '罕见': [2.4, 14.4], '普通': [1.5, 9.0] },
  critRate:    { '神话': [6.0, 36.0], '传说': [5.1, 30.6], '史诗': [4.2, 25.2], '珍贵': [3.3, 19.8], '罕见': [2.4, 14.4], '普通': [1.5, 9.0] },
  critDmg:     { '神话': [12.0, 42.0], '传说': [10.2, 35.7], '史诗': [8.4, 29.4], '珍贵': [6.6, 23.1], '罕见': [4.8, 16.8], '普通': [3.0, 10.5] },
  effectHit:   { '神话': [6.0, 36.0], '传说': [5.1, 30.6], '史诗': [4.2, 25.2], '珍贵': [3.3, 19.8], '罕见': [2.4, 14.4], '普通': [1.5, 9.0] },
  effectResist: { '神话': [6.0, 36.0], '传说': [5.1, 30.6], '史诗': [4.2, 25.2], '珍贵': [3.3, 19.8], '罕见': [2.4, 14.4], '普通': [1.5, 9.0] }
};

/* ==================== 五、套装 ==================== */
/* type 为内部标识，name 为显示名。
   6 个套装的 1 件套（纯属性）全部走 aggregateStats，开战前一次性结算。
   2 件套分两类：
     · 无双 / 百穿 / 束缚 —— 运行时读取，钩子在「十三、战斗钩子」；
     · 怒源 / 招财 —— 需要怒气与回合上下文，由战斗层（game.js）调用本层判定函数执行。 */
const SETS = [
  { type: '百穿', name: '百穿', one: '攻击+15%', two: '攻击时50%概率无视目标50%防御', impl: true },
  { type: '束缚', name: '束缚', one: '攻击+15%', two: '行动阶段施放技能时，若怒气足够，额外消耗1点怒气，提升30%最终伤害至回合结束', impl: true },
  { type: '无双', name: '无双', one: '暴击率+15%', two: '自身每损失1%最大生命值，提升0.5%暴击伤害', impl: true },
  { type: '怒源', name: '怒源', one: '防御+15%', two: '先机：自身与随机1名其他友方各获得2点怒气', impl: true },
  { type: '招财', name: '招财', one: '生命+15%', two: '回合开始时50%概率获得2点怒气', impl: true },
  { type: '心魔', name: '心魔', one: '效果命中+15%', two: '造成伤害时25%基础概率使目标附加混乱（持续1回合）', impl: true },
  { type: '狱门疆', name: '狱门疆', one: '效果命中+15%', two: '首次攻击时，有70%基础概率将目标「放逐」至狱门疆内部空间，直到自身下回合结束或阵亡。多名友方角色装备时，仅生效一次。', impl: true }
];
const SET_BY_TYPE = SETS.reduce(function (o, s) { o[s.type] = s; return o; }, {});

/* ==================== 六、抽卡概率 ==================== */
/* 单抽稀有度概率表。保底走计数器：每 10 抽必出史诗及以上，每 30 抽必出传说及以上。
   保底命中后计数器归零；保底 roll 仍按档位内随机，不是指定稀有度。 */
const DRAW_TABLE = [
  { rarity: '普通', weight: 43 },
  { rarity: '罕见', weight: 30 },
  { rarity: '珍贵', weight: 15 },
  { rarity: '史诗', weight: 8 },
  { rarity: '传说', weight: 3 },
  { rarity: '神话', weight: 1 }
];
const DRAW_TOTAL_WEIGHT = DRAW_TABLE.reduce(function (s, r) { return s + r.weight; }, 0);
const PITY_EPIC = 10;   // 每 10 抽必出史诗及以上
const PITY_LEGEND = 30; // 每 30 抽必出传说及以上

/* ==================== 七、存档 ==================== */
/* 本层自带存档 key，与游戏现有 localStorage 项解耦，避免互相污染。 */
const SAVE_KEY = 'shenhun_save_v1';
const SAVE_META_KEY = 'shenhun_meta_v1';
const DEFAULT_ITEMS = { ticket: 0, recastStone: 0 };

/* 内存状态。load() 后才会有内容。 */
let bag = [];            // 神魂仓库：Soul[]
let equip = {};          // 装备映射：{ [roleName]: [soulId|null, soulId|null, soulId|null] }
let items = Object.assign({}, DEFAULT_ITEMS);
let pityCounter = 0;     // 连续抽数计数，用于双档保底

/* 监听器：存档变更时通知上层刷新 UI（可多订阅）。 */
const listeners = [];
function emitChange() { for (let i = 0; i < listeners.length; i++) listeners[i](); }

/* ==================== 工具函数 ==================== */
function clamp01(v) { return Math.max(0, Math.min(1, v)); }

/* 闭区间随机取整：[min, max] 含端点。 */
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pickByWeight(table, total) {
  let r = Math.random() * total, acc = 0;
  for (let i = 0; i < table.length; i++) {
    acc += table[i].weight;
    if (r < acc) return table[i].rarity;
  }
  return table[table.length - 1].rarity;
}
/* 属性 key → 显示名 / 是否为百分比 */
const ATTR_META = {
  atkPct:      { name: '攻击加成',   pct: true },
  defPct:      { name: '防御加成',   pct: true },
  hpPct:       { name: '生命加成',   pct: true },
  speed:       { name: '速度',       pct: false },
  critRate:    { name: '暴击率',     pct: true },
  critDmg:     { name: '暴击伤害',   pct: true },
  effectHit:   { name: '效果命中',   pct: true },
  effectResist:{ name: '效果抵抗',   pct: true }
};
function attrName(key) { return (ATTR_META[key] || {}).name || key; }
function isPctAttr(key) { return !!(ATTR_META[key] || {}).pct; }

/* 数值格式化：百分比类保留一位小数并带「%」，speed 保留一位小数。 */
function formatAttr(key, value) {
  if (isPctAttr(key)) return (Math.round(value * 10) / 10).toFixed(1) + '%';
  return (Math.round(value * 10) / 10).toFixed(1);
}

/* ==================== 八、神魂生成 ==================== */
/* 生成一个指定稀有度、指定套装、指定位置（1/2/3）的神魂。
   主属性取该稀有度满值；副属性各自在对应稀有度的区间内独立随机，保留一位小数。 */
function generateSoul(opts) {
  opts = opts || {};
  const rarity = opts.rarity || '神话';
  const setType = opts.setType || SETS[Math.floor(Math.random() * SETS.length)].type;
  const slot = opts.slot || randInt(1, 3); // 1/2/3
  const soul = buildSoul(rarity, setType, slot);
  /* addToBag: 生成后直接入库（默认 false）。抽卡流程 drawOne 走自己的入库逻辑。 */
  if (opts.addToBag) bag.push(soul);
  return soul;
}

/* 纯构造：不入库、不触发事件，供 generateSoul 与 drawOne 共用。 */
function buildSoul(rarity, setType, slot) {
  const mainPool = MAIN_POOL_BY_SLOT[slot - 1];
  const mainAttr = mainPool[Math.floor(Math.random() * mainPool.length)];
  const mainValue = MAIN_BASE[mainAttr][rarity];
  /* 副属性各自在对应稀有度的区间内独立随机，保留一位小数。
  原先取区间中值，会导致四条副属性共用同一个数值（看着很"假"）。 */
  const subs = pickDistinct(SUB_ATTRS, SUB_COUNT);
  const subList = subs.map(function (key) {
    const range = SUB_RANGE[key][rarity];
    const value = Math.round((range[0] + Math.random() * (range[1] - range[0])) * 10) / 10;
    return { key: key, value: value };
  });
  return {
    id: makeId(),
    rarity: rarity,
    setType: setType,
    slot: slot,
    main: { key: mainAttr, value: mainValue },
    subs: subList,
    locked: false
  };
}

/* 抽卡入口：返回 { soul, pityTriggered }。pityTriggered 记录本次触发了哪档保底。 */
function drawOne() {
  pityCounter++;
  let rarity = null, pityTriggered = null;

  const epicDue = pityCounter > 0 && pityCounter % PITY_EPIC === 0;
  const legendDue = pityCounter > 0 && pityCounter % PITY_LEGEND === 0;

  if (legendDue) {
    /* 30 抽保底：神话/传说二选一，神话按 1/(1+3) 保持原比例。 */
    rarity = Math.random() < 0.25 ? '神话' : '传说';
    pityTriggered = 'legend';
    pityCounter = 0;
  } else if (epicDue) {
    /* 10 抽保底：史诗及以上，按原比例重算档位内概率。 */
    const table = DRAW_TABLE.filter(function (r) { return RARITY_ORDER.indexOf(r.rarity) >= RARITY_ORDER.indexOf('史诗'); });
    const total = table.reduce(function (s, r) { return s + r.weight; }, 0);
    rarity = pickByWeight(table, total);
    pityTriggered = 'epic';
    pityCounter = 0;
  } else {
    rarity = pickByWeight(DRAW_TABLE, DRAW_TOTAL_WEIGHT);
  }

  const soul = generateSoul({ rarity: rarity });
  bag.push(soul);
  emitChange();
  return { soul: soul, pityTriggered: pityTriggered };
}

/* 抽 N 次（消耗 N 张神魂券）。返回本次抽到的全部神魂。 */
function drawMany(n) {
  n = Math.max(1, Math.floor(n || 1));
  if ((items.ticket || 0) < n) return { ok: false, reason: 'ticket' };
  items.ticket -= n;
  const list = [];
  for (let i = 0; i < n; i++) list.push(drawOne().soul);
  save();
  emitChange();
  return { ok: true, souls: list };
}

function makeId() {
  return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
/* 从 arr 中不重复地取 count 项（洗牌取前 count）。arr.length 必须 ≥ count。 */
function pickDistinct(arr, count) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a.slice(0, count);
}

/* ==================== 九、合成 / 重铸 ==================== */
/* 合成：两个相同类型、相同稀有度的神魂 → 高一阶同类型神魂。
   神话已达顶，不可合成。
   ★ 已锁定、已装备的神魂不参与：界面会屏蔽，这里也兜底拒绝，
     避免旧入口 / 残留引用把身上穿着的神魂合掉。 */
function canSynthesize(a, b) {
  /* 兼容传 ID 字符串或对象两种调用方式 */
  if (typeof a === 'string') a = getSoul(a);
  if (typeof b === 'string') b = getSoul(b);
  if (!a || !b) return false;
  if (a.id === b.id) return false;
  if (a.locked || b.locked) return false;
  if (isEquipped(a.id) || isEquipped(b.id)) return false;
  if (a.setType !== b.setType) return false;
  if (a.rarity !== b.rarity) return false;
  return RARITY_ORDER.indexOf(a.rarity) < RARITY_ORDER.length - 1;
}
/* 内部：执行一次合成并改动内存数据，但【不】落盘 / 不广播。
   单独抽出来是为了给「一键合成」批量复用 —— 批量时只在最后 save/emit 一次，
   避免合成 N 次就写 N 次 localStorage、刷新 N 次界面。 */
function _synthesizePair(a, b) {
  if (!canSynthesize(a, b)) return null;
  const idxA = bag.indexOf(a), idxB = bag.indexOf(b);
  /* 从仓库移除被合成的两个（按索引从大到小，避免位移错位） */
  const lo = Math.max(idxA, idxB), hi = Math.min(idxA, idxB);
  bag.splice(lo, 1); bag.splice(hi, 1);
  /* 若被合成的神魂正装备在某角色身上，先卸下 */
  unequipIfEquipped(a.id); unequipIfEquipped(b.id);

  const nextRarity = RARITY_ORDER[RARITY_ORDER.indexOf(a.rarity) + 1];
  const soul = generateSoul({ rarity: nextRarity, setType: a.setType });
  bag.push(soul);   // 新件追加到末尾：与 planAutoSynthesize 的模拟顺序一致
  return soul;
}
function synthesize(aId, bId) {
  const a = getSoul(aId), b = getSoul(bId);
  if (!canSynthesize(a, b)) return { ok: false, reason: 'invalid' };
  const soul = _synthesizePair(a, b);
  if (!soul) return { ok: false, reason: 'invalid' };
  save(); emitChange();
  return { ok: true, soul: soul };
}

/* ==================== 一键合成 ====================
   规则（与手动合成一致）：两个「同套装 + 同稀有度」的未锁定、未装备神魂 → 高一阶同套装；
   神话已达顶，不参与。已锁定 / 已装备的神魂一律跳过，不会被消耗或卸下。

   ★ 口径：链式合成 —— 新产出的神魂会继续向上配对，直到全场再无可合成组合。
     例：同套装 8 个普通 → 4 个罕见 → 2 个珍贵 → 1 个史诗，共 7 次合成。
     执行前由 UI 用 planAutoSynthesize() 展示完整预览并二次确认。

   遍历顺序固定为「稀有度从低到高 → 套装按 SETS 顺序」，且每组每次取袋中
   前两件；plan 与 execute 用同一套顺序，保证预览的件数 / 仓库净变化精确一致。 */
function _autoSynGroups() {
  const groups = {};
  for (let i = 0; i < bag.length; i++) {
    const s = bag[i];
    /* 锁定 / 已装备 / 神话都不参与 —— 与手动合成、重铸的候选口径一致 */
    if (s.locked || isEquipped(s.id) || s.rarity === '神话') continue;
    const key = s.setType + '|' + s.rarity;
    if (!groups[key]) groups[key] = [];
    groups[key].push({ id: s.id, virtual: false });
  }
  return groups;
}
/* 以 SETS 顺序为主，末尾补上仓库里出现的其它套装（历史存档 / 导入数据可能有），
   避免一键合成漏掉这些神魂。plan 与 execute 共用本函数，顺序始终一致。 */
function _autoSynSetOrder() {
  const order = SETS.map(function (x) { return x.type; });
  for (let i = 0; i < bag.length; i++) {
    if (order.indexOf(bag[i].setType) < 0) order.push(bag[i].setType);
  }
  return order;
}

/* 纯计算预览：不修改任何数据。 */
function planAutoSynthesize() {
  const groups = _autoSynGroups();
  const setOrder = _autoSynSetOrder();
  const steps = [];                 // { from, to, pairs } 按稀有度汇总
  let total = 0, realConsumed = 0;

  for (let ri = 0; ri < RARITY_ORDER.length - 1; ri++) {
    const from = RARITY_ORDER[ri], to = RARITY_ORDER[ri + 1];
    let tierPairs = 0;
    for (let si = 0; si < setOrder.length; si++) {
      const set = setOrder[si];
      const key = set + '|' + from;
      const arr = groups[key] || [];
      while (arr.length >= 2) {
        const a = arr.shift(), b = arr.shift();
        /* 消耗统计只算仓库里真实存在的件；虚拟件是本轮合成产出的，不算「消耗玩家已有资源」 */
        [a, b].forEach(function (c) { if (!c.virtual) realConsumed++; });
        /* 产出挂到高一阶组，后续 ri 会继续处理 → 链式 */
        const nk = set + '|' + to;
        if (!groups[nk]) groups[nk] = [];
        groups[nk].push({ id: null, virtual: true });
        tierPairs++;
      }
    }
    if (tierPairs > 0) { steps.push({ from: from, to: to, pairs: tierPairs }); total += tierPairs; }
  }
  return {
    total: total,
    steps: steps,
    consumed: total * 2,                  // 每次合成消耗 2 件（含链式产出的再消耗）
    realConsumed: realConsumed,           // 其中来自玩家现有仓库的件数
    netChange: -total,                   // 每次 2→1，仓库净减少 1 件
    finalBagCount: bag.length - total,
    lockedKept: bag.filter(function (s) { return s.locked; }).length,
    equippedKept: bag.filter(function (s) { return isEquipped(s.id); }).length
  };
}

/* 执行：按与预览完全相同的顺序合成，最后统一落盘 / 广播。 */
function autoSynthesize() {
  const setOrder = _autoSynSetOrder();
  const results = [];
  let count = 0;
  const GUARD = 10000;                  // 死循环兜底（正常仓库远达不到）
  outer:
  for (let ri = 0; ri < RARITY_ORDER.length - 1; ri++) {
    const from = RARITY_ORDER[ri];
    for (let si = 0; si < setOrder.length; si++) {
      const set = setOrder[si];
      while (true) {
        const pair = bag.filter(function (s) {
          return !s.locked && !isEquipped(s.id) && s.setType === set && s.rarity === from;
        }).slice(0, 2);
        if (pair.length < 2) break;
        const soul = _synthesizePair(pair[0], pair[1]);
        if (!soul) break outer;
        results.push(soul);
        count++;
        if (count >= GUARD) break outer;
      }
    }
  }
  if (count > 0) { save(); emitChange(); }
  return { ok: true, count: count, results: results };
}

/* 重铸：将神魂转为同稀有度的随机神魂（保留稀有度，套装/位置/属性重随机）。
   已锁定 / 已装备的神魂不参与：界面屏蔽 + 这里兜底，避免改到正在穿戴的神魂。 */
function recast(id) {
  if ((items.recastStone || 0) <= 0) return { ok: false, reason: 'stone' };
  const s = getSoul(id);
  if (!s) return { ok: false, reason: 'notfound' };
  if (s.locked) return { ok: false, reason: '已锁定的神魂无法重铸' };
  if (isEquipped(s.id)) return { ok: false, reason: '已装备的神魂无法重铸' };
  items.recastStone--;
  const next = generateSoul({ rarity: s.rarity });
  s.setType = next.setType; s.slot = next.slot; s.main = next.main; s.subs = next.subs;
  save(); emitChange();
  return { ok: true, soul: s };
}

/* ==================== 十、穿戴 / 卸下 ==================== */
/* 每个角色固定 3 个槽位（下标 0/1/2，对应 1/2/3 号位）。
   一个神魂同时只能装备在一个角色的一个槽位上（全局唯一占用）。 */
/* ==================== 槽位归一化 ====================
槽位有两种说法，混用会直接导致装备失败：
· 号位语义：界面上的 1/2/3 号位（可能是字符串 '1'，也可能是数字 1）
· 下标语义：内部数组下标 0/1/2
此前 equipSoul 拿 soul.slot - 1（数字 0/1/2）与界面传来的 '1'（字符串）做 !== 比较，
结果永远不等 —— 任何神魂都装不上。这里统一吃平成 0/1/2 下标。 */
function normSlot(slot) {
  const n = Number(slot);
  if (!isFinite(n)) return -1;
  if (n >= 1 && n <= 3) return Math.floor(n) - 1; // 1/2/3 号位 → 下标 0/1/2
  if (n === 0) return 0;                          // 已是下标 0
  return -1;                                      // 0/1/2 之外一律非法
}
function getEquip(roleName) {
  if (!equip[roleName]) equip[roleName] = [null, null, null];
  return equip[roleName];
}
/* 按「号位」读取某角色身上的神魂（界面用）：传 '1' / 1 都行。 */
function getSlotSoul(roleName, slot) {
  const idx = normSlot(slot);
  if (idx < 0) return null;
  const id = getEquip(roleName)[idx];
  return id ? getSoul(id) : null;
}
function equipSoul(roleName, slot, soulId) {
  const slotIndex = normSlot(slot);
  if (slotIndex < 0) return { ok: false, reason: 'slot' };
  const soul = getSoul(soulId);
  if (!soul) return { ok: false, reason: 'notfound' };
  if (normSlot(soul.slot) !== slotIndex) return { ok: false, reason: 'slot' };
  if (isEquipped(soulId)) return { ok: false, reason: 'equipped' };
  const arr = getEquip(roleName);
  const old = arr[slotIndex];
  arr[slotIndex] = soulId;
  save(); emitChange();
  return { ok: true, replaced: old };
}
function unequipSoul(roleName, slot) {
  const slotIndex = normSlot(slot);
  if (slotIndex < 0) return { ok: false, reason: 'slot' };
  const arr = getEquip(roleName);
  if (!arr[slotIndex]) return { ok: false };
  arr[slotIndex] = null;
  save(); emitChange();
  return { ok: true };
}
function isEquipped(soulId) {
  const keys = Object.keys(equip);
  for (let i = 0; i < keys.length; i++) {
    const arr = equip[keys[i]];
    for (let j = 0; j < arr.length; j++) if (arr[j] === soulId) return true;
  }
  return false;
}
function unequipIfEquipped(soulId) {
  const keys = Object.keys(equip);
  for (let i = 0; i < keys.length; i++) {
    const arr = equip[keys[i]];
    for (let j = 0; j < arr.length; j++) {
      if (arr[j] === soulId) { arr[j] = null; }
    }
  }
}
/* 反查「这个神魂现在穿在谁身上」：返回 { role, slot } 或 null。
   UI 详情弹窗据此显示「当前由 XX 装备于 N 号位」以及该套装的达成情况。 */
function findEquipOwner(soulId) {
  if (!soulId) return null;
  const keys = Object.keys(equip);
  for (let i = 0; i < keys.length; i++) {
    const arr = equip[keys[i]];
    for (let j = 0; j < arr.length; j++) {
      if (arr[j] === soulId) return { role: keys[i], slot: j + 1 };
    }
  }
  return null;
}
/* 返回某角色身上已装备的 3 个神魂对象（含 null 占位）。 */
function getEquippedSouls(roleName) {
  const arr = getEquip(roleName);
  return arr.map(function (id) { return getSoul(id); });
}
function getSoul(id) {
  for (let i = 0; i < bag.length; i++) if (bag[i].id === id) return bag[i];
  return null;
}

/* ==================== 十一、套装计数 ==================== */
/* 按「套装类型」计数（同一类型装备 2 件即触发 2 件套）。
   返回值：{ [setType]: count }，仅含 count > 0 的项。 */
function countSets(souls) {
  const c = {};
  for (let i = 0; i < souls.length; i++) {
    const s = souls[i];
    if (!s) continue;
    c[s.setType] = (c[s.setType] || 0) + 1;
  }
  return c;
}
/* 判断某套装是否触发了 2 件套效果。
   2 件套【只激活一次】—— 装 3 件也只是一组 2 件套，不会变成两组。 */
function hasTwoPiece(setType, souls) { return (countSets(souls)[setType] || 0) >= 2; }

/* 套装 1 件套效果的【生效次数】。
   规则：每 2 件组成一组「2 件套」，这一组自身即包含一次 1 件套效果；
         剩下不足 2 件的散件，再按「1 件套」各算一次。
   于是：
     1 件 → 0 组 + 1 散 = 1 次
     2 件 → 1 组 + 0 散 = 1 次（2 件套内含的那一次）
     3 件 → 1 组 + 1 散 = 2 次  ★ 用户要的「3 件同套装 = 两次 1 件套」
   即 Math.ceil(n / 2)。2 件套效果本身仍只激活一次（见 hasTwoPiece），
   这里只负责「1 件套纯属性加成」叠加几次。 */
function onePieceStacks(count) {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  return Math.floor(n / 2) + (n % 2);
}

/* ==================== 十二、属性聚合（战斗外，开局一次性） ==================== */
/* 把角色自身面板 + 神魂主/副属性 + 套装 1 件套效果 合并为最终基础属性。
   规则：
     · 只以角色面板为准（HERO_DATA 原始值），神魂加成之间不互相放大；
     · 百分比类按角色面板基数计算：final = base × (1 + Σpct)；
     · speed 为固定值累加：final = base + Σspeed；
     · 套装 1 件套的纯属性加成（攻击/防御/生命+15%、暴击率+15%、效果命中+15%）并入基础层；
       每 2 件组成的一组「2 件套」自身含一次 1 件套，余下散件再各算一次 → 3 件同套装共 2 次；
     · 套装 2 件套的效果（无双的暴伤随血量、心魔的混乱）不走基础层，由战斗钩子处理，
       且只激活一次，不随件数叠加。 */
function aggregateStats(roleName, baseStats) {
  const souls = getEquippedSouls(roleName);
  const setCount = countSets(souls);

  /* 百分比累加（小数形式，55.0% = 0.55） */
  let addAtkPct = 0, addDefPct = 0, addHpPct = 0, addCritRate = 0;
  let addCritDmg = 0, addEffectHit = 0, addEffectResist = 0, addSpeed = 0;

  for (let i = 0; i < souls.length; i++) {
    const s = souls[i];
    if (!s) continue;
    addPctOrFlat(s.main.key, s.main.value, {
      atkPct: function (v) { addAtkPct += v / 100; },
      defPct: function (v) { addDefPct += v / 100; },
      hpPct: function (v) { addHpPct += v / 100; },
      /* ★ 1 号位主属性「速度」：固定值累加，与副属性速度同口径，不除 100。 */
      speed: function (v) { addSpeed += v; },
      critRate: function (v) { addCritRate += v / 100; },
      critDmg: function (v) { addCritDmg += v / 100; },
      effectHit: function (v) { addEffectHit += v / 100; },
      effectResist: function (v) { addEffectResist += v / 100; }
    });
    for (let k = 0; k < s.subs.length; k++) {
      const sub = s.subs[k];
      addPctOrFlat(sub.key, sub.value, {
        atkPct: function (v) { addAtkPct += v / 100; },
        defPct: function (v) { addDefPct += v / 100; },
        hpPct: function (v) { addHpPct += v / 100; },
        speed: function (v) { addSpeed += v; },
        critRate: function (v) { addCritRate += v / 100; },
        critDmg: function (v) { addCritDmg += v / 100; },
        effectHit: function (v) { addEffectHit += v / 100; },
        effectResist: function (v) { addEffectResist += v / 100; }
      });
    }
  }

  /* 套装 1 件套：纯属性加成，按「生效次数」叠加。
     ★ 3 件同套装 = 一组 2 件套（内含一次 1 件套）+ 1 个散件 1 件套 = 共 2 次，
       例如无双 3 件给 +30% 暴击率，而不是 +15%。
     2 件套效果仍只触发一次（hasTwoPiece >= 2），不随件数叠加。 */
  const ONE_PCT = 0.15;                    // 各套 1 件套统一为 +15%
  const stacks = {};
  Object.keys(setCount).forEach(function (t) { stacks[t] = onePieceStacks(setCount[t]); });
  addAtkPct    += ((stacks['百穿'] || 0) + (stacks['束缚'] || 0)) * ONE_PCT;
  addCritRate  += (stacks['无双'] || 0) * ONE_PCT;
  addDefPct    += (stacks['怒源'] || 0) * ONE_PCT;
  addHpPct     += (stacks['招财'] || 0) * ONE_PCT;
  addEffectHit += ((stacks['心魔'] || 0) + (stacks['狱门疆'] || 0)) * ONE_PCT;

  /* 合并：百分比按角色面板基数，speed 为固定值累加。
     取整口径：
       · 整数类（攻击 / 防御 / 生命）—— 先按一位小数计算，再取整；
       · 速度 —— 特殊，保留一位小数（副属性的速度加成常是小数，
                 取整会让「细微速度差」消失，直接改变行动顺序）；
       · 百分比类（暴击率 / 暴击伤害 / 效果命中 / 效果抵抗）—— 保留两位小数。
     之所以分这几档：整数类最终要显示成整数，中途留一位小数可避免连续取整的累积误差；
     速度关乎出手顺序，必须保住小数位；百分比类本身量级小（如 0.15），留两位才不会把增益抹平。 */
  const out = {
    atk: roundInt(round1(baseStats.atk * (1 + addAtkPct))),
    def: roundInt(round1(baseStats.def * (1 + addDefPct))),
    maxHp: roundInt(round1(baseStats.hp * (1 + addHpPct))),
    spd: round1(baseStats.spd + addSpeed),
    critRate: round2(baseStats.critRate + addCritRate),
    critDmg: round2(baseStats.critDmg + addCritDmg),
    effectHit: round2(baseStats.effectHit + addEffectHit),
    effectResist: round2(baseStats.effectResist + addEffectResist)
  };
  /* 生命加成导致 maxHp 增大时，血量同比缩放，避免「上限涨了但血量没涨」。 */
  out.hp = baseStats.hp > 0 ? roundInt(round1(out.maxHp * (baseStats.hp / baseStats.maxHp))) : out.maxHp;

  /* 挂载运行时所需信息：2 件套效果需要「穿戴了哪些套装」 */
  out.shenhunSets = {};
  const setTypes = Object.keys(setCount);
  for (let i = 0; i < setTypes.length; i++) {
    const t = setTypes[i];
    if (setCount[t] > 0) out.shenhunSets[t] = {
      count: setCount[t],
      oneStacks: stacks[t],                 // 1 件套生效次数（3 件时为 2）
      twoPiece: hasTwoPiece(t, souls)      // 2 件套只激活一次
    };
  }
  return out;
}
function addPctOrFlat(key, value, map) { if (map[key]) map[key](value); }
function round1(v) { return Math.round(v * 10) / 10; }
/* 取整：供「先按一位小数计算、再取整」的第二步使用。 */
function roundInt(v) { return Math.round(Number(v) || 0); }

/* ==================== 神魂加成快照 ====================
给角色详情页展示「1100+500」用：返回每项属性【相对角色面板】的增量。
未装任何神魂时全为 0（调用方据此决定是否显示金色后缀）。
百分比类（暴击率 / 效果命中 / 效果抵抗）增量也换算成百分点，
与详情页把 0.24 显示成 24% 的口径保持一致。 */
function getSoulBonus(roleName, baseStats) {
  const agg = aggregateStats(roleName, baseStats);
  const baseHp = baseStats.hp != null ? baseStats.hp : baseStats.maxHp;
  return {
    /* 整数类属性（攻击/防御/生命）取整显示，避免出现「1100+837.1」 */
    atk: Math.round(agg.atk - baseStats.atk),
    def: Math.round(agg.def - baseStats.def),
    hp: Math.round(agg.maxHp - baseHp),
    /* ★ 角色详情页的速度【只显示整数】（如 156+7），与攻击/防御/生命同一观感。
       注意这只是显示口径 —— 战斗里真正用的是 aggregateStats 保留一位小数的 agg.spd，
       出手顺序仍按小数精确比较，不受这里取整影响。 */
    spd: Math.round(agg.spd - baseStats.spd),
    /* 百分比类取整到百分点（24%+15%） */
    critRate: Math.round((agg.critRate - baseStats.critRate) * 100),
    effectHit: Math.round((agg.effectHit - (baseStats.effectHit || 0)) * 100),
    effectResist: Math.round((agg.effectResist - (baseStats.effectResist || 0)) * 100),
    /* 暴击伤害量级小（如 +0.15），保留 2 位小数以免被抹平 */
    critDmg: round2(agg.critDmg - baseStats.critDmg),
    shenhunSets: agg.shenhunSets || {}
  };
}
function round2(v) { return Math.round(Number(v || 0) * 100) / 100; }

/* ==================== 十三、战斗钩子 ==================== */
/* 六个套装的 2 件套都在这里挂接口：
   · 无双  → calcWushuangCritDmgBonus：自身每损失 1% 最大生命值 → +0.5% 暴击伤害（动态读取）。
   · 心魔  → maybeApplyXinmo：造成伤害时 25% 基础概率附加混乱（持续 1 回合）。
   · 百穿  → rollBaichuanDefFactor：攻击时 50% 概率无视目标 50% 防御（返回防御系数）。
   · 束缚  → SHUFU_* 常量 + calcShufuFinalDmgBonus：额外消耗 1 怒气换 +30% 最终伤害至回合结束。
      怒气扣除与「是否施放技能」由战斗层判定，本层只提供常量与加成读取。
   · 怒源  → NUYUAN_RAGE：先机，自身 + 随机 1 名其他友方各 2 点怒气（战斗层执行 gainRage）。
   · 招财  → rollZhaocaiRage：回合开始时 50% 概率 +2 怒气（战斗层执行 gainRage）。 */

/* ---- 套装 2 件套判定 ----
   ★ 放逐期间 2 件套一律失效。
     带土「放逐」规则写明「目标相关的所有状态、印记失效，神魂失效」——
     这里的「神魂失效」特指【2 件套效果】；1 件套是纯属性加成，
     已在开战前并入基础面板，不属于「效果」，不受放逐影响。
   六个套装的 2 件套入口全部收敛到这里判定，保证冻结行为一致。 */
function hasSetTwoPiece(unit, type) {
  if (!unit || unit.banished) return false;
  const sets = unit && unit.shenhunSets;
  return !!(sets && sets[type] && sets[type].twoPiece);
}

/* ---- 百穿 2 件套 ---- */
const BAICHUAN_CHANCE = 0.5;        // 触发概率（直接概率，不受效果命中/抵抗影响）
const BAICHUAN_PIERCE_RATE = 0.5;   // 无视的防御比例
/* 返回防御系数：1 = 正常结算，0.5 = 本段无视目标一半防御。
   每次伤害结算（多段技能的每一段）独立判定，与暴击的逐段判定一致。 */
function rollBaichuanDefFactor(attacker) {
  if (!hasSetTwoPiece(attacker, '百穿')) return 1;
  return (Math.random() < BAICHUAN_CHANCE) ? (1 - BAICHUAN_PIERCE_RATE) : 1;
}

/* ---- 束缚 2 件套 ---- */
const SHUFU_RAGE_COST = 1;          // 额外消耗的怒气
const SHUFU_FINAL_DMG_RATE = 0.3;   // 提升的最终伤害（至回合结束）
/* 读取束缚带来的最终伤害加成。战斗层在施放技能且怒气足够时置 unit.shufuFinalDmg，
   回合结束时清 0 —— 本层只负责读，不负责生命周期。 */
function calcShufuFinalDmgBonus(unit) {
  /* 放逐期间失效：已激活的束缚加成也要冻结（放逐可能发生在施放技能之后） */
  if (!unit || unit.banished) return 0;
  return Number(unit.shufuFinalDmg) || 0;
}

/* ---- 怒源 2 件套 ---- */
const NUYUAN_RAGE = 2;              // 先机：自身与随机 1 名其他友方各获得的怒气

/* ---- 招财 2 件套 ---- */
const ZHAOCAI_CHANCE = 0.5;         // 回合开始触发概率（直接概率）
const ZHAOCAI_RAGE = 2;             // 触发时获得的怒气
function rollZhaocaiRage(unit) {
  return hasSetTwoPiece(unit, '招财') && (Math.random() < ZHAOCAI_CHANCE);
}

/* 无双：返回当前应额外增加的暴伤比例（小数）。 */
function calcWushuangCritDmgBonus(unit) {
  if (!hasSetTwoPiece(unit, '无双')) return 0;   // 含放逐冻结
  const maxHp = Number(unit.maxHp) || 1;
  const hp = Number(unit.hp) || 0;
  const lostPct = clamp01(1 - hp / maxHp);   // 已损失生命百分比（小数，0.5 = 50%）
  return lostPct * 0.5;                       // 每损失 1% 最大生命 → +0.5% 暴伤（50% 损失 = +25%）
}

/* 心魔 2 件套：基础概率 25%（走「基础概率」口径，受效果命中/抵抗影响）。
   混乱持续时间显式定为 1 回合，与套装描述「（持续1回合）」同源，
   由本层通过 onApply 的第二参数传给战斗层，避免各处写死字面量。 */
const XINMO_BASE_CHANCE = 0.25;
const XINMO_HUNLUAN_DURATION = 1;
/* 心魔：伤害结算后尝试附加混乱。attacker 须含 shenhunSets。
   onApply 为外部注入的施加函数（本层不依赖 DOM，也不假设 tryApplyControl 存在）。
   chanceFn 为外部注入的概率换算函数：接收基础概率，返回实际生效概率。
   ——「基础概率」口径是 基础 × (1 + 效果命中 − 效果抵抗)，
     效果命中/抵抗挂在战斗单位上，逻辑层读不到，故由战斗层注入。
     不传时退化为字面概率（保底不崩）。 */
function maybeApplyXinmo(attacker, target, onApply, chanceFn) {
  if (!attacker || !target || !target.alive) return false;
  if (!hasSetTwoPiece(attacker, '心魔')) return false;   // 含放逐冻结
  const chance = typeof chanceFn === 'function'
    ? clamp01(Number(chanceFn(XINMO_BASE_CHANCE)) || 0)
    : XINMO_BASE_CHANCE;
  if (Math.random() >= chance) return false;
  if (typeof onApply === 'function') onApply(target, XINMO_HUNLUAN_DURATION);
  return true;
}

/* 狱门疆 2 件套：首次攻击时 70% 基础概率放逐目标。
   本层只管「是否穿戴 2 件」+「按基础概率 roll」；
   「每名角色只尝试一次」与「多名友方仅生效一次」由战斗层的 gameState 闸门负责
   （那里才有阵营 / 战斗生命周期），onApply 由战斗层注入真正的放逐逻辑。 */
const PRISON_REALM_BASE_CHANCE = 0.70;
function maybeApplyPrisonRealm(attacker, onApply, chanceFn) {
  if (!attacker || !attacker.alive) return false;
  if (!hasSetTwoPiece(attacker, '狱门疆')) return false;   // 含放逐冻结
  const chance = typeof chanceFn === 'function'
    ? clamp01(Number(chanceFn(PRISON_REALM_BASE_CHANCE)) || 0)
    : PRISON_REALM_BASE_CHANCE;
  if (Math.random() >= chance) return false;
  if (typeof onApply === 'function') onApply();
  return true;
}

/* ==================== 十四、每日资源 ==================== */
/* 每天登录发放的额度：神魂券 20 张（= 20 抽）、重铸石 2 个。
   改这里即可调整，UI 提示与返回值都从常量取，不会各处写死。 */
const DAILY_TICKET = 20;
const DAILY_RECAST_STONE = 2;
/* 以本地日期（YYYY-MM-DD）判等，跨天后自动补发并记录已发日期。 */
function dailyLogin() {
  const today = todayStr();
  let meta = {};
  try { meta = JSON.parse(localStorage.getItem(SAVE_META_KEY) || '{}'); } catch (e) { meta = {}; }
  if (meta.lastDaily === today) return { claimed: false, date: today };
  items.ticket = (items.ticket || 0) + DAILY_TICKET;
  items.recastStone = (items.recastStone || 0) + DAILY_RECAST_STONE;
  meta.lastDaily = today;
  try { localStorage.setItem(SAVE_META_KEY, JSON.stringify(meta)); } catch (e) {}
  save(); emitChange();
  return { claimed: true, date: today, ticket: DAILY_TICKET, recastStone: DAILY_RECAST_STONE };
}
function todayStr() {
  const d = new Date();
  const m = d.getMonth() + 1, day = d.getDate();
  return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
}

/* ==================== 十五、存档 / 云同步载荷 ====================
   玩家侧「导入 / 导出」页已移除，但 exportJSON() / importJSON() 仍由
   cloud-save.js 作为云端上传 / 下载的载荷与恢复入口使用，不可删除。 */
function save() {
  const data = {
    version: 1,
    bag: bag,
    equip: equip,
    items: items,
    pityCounter: pityCounter,
    savedAt: Date.now()
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) { /* 容量溢出静默失败，纯逻辑层不抛 UI */ }
}
function load() {
  let raw = null;
  try { raw = localStorage.getItem(SAVE_KEY); } catch (e) { raw = null; }
  if (!raw) { resetState(); return false; }
  let data = null;
  try { data = JSON.parse(raw); } catch (e) { data = null; }
  if (!data || typeof data !== 'object') { resetState(); return false; }

  bag = Array.isArray(data.bag) ? data.bag.slice() : [];
  equip = data.equip && typeof data.equip === 'object' ? data.equip : {};
  items = Object.assign({}, DEFAULT_ITEMS, data.items || {});
  pityCounter = Number(data.pityCounter) || 0;
  return true;
}
function resetState() {
  bag = []; equip = {}; items = Object.assign({}, DEFAULT_ITEMS); pityCounter = 0;
}
/* 导出：返回 JSON 字符串。 */
function exportJSON() {
  return JSON.stringify({
    version: 1,
    exportedAt: Date.now(),
    bag: bag, equip: equip, items: items, pityCounter: pityCounter
  }, null, 2);
}
/* 导入：接受字符串或已解析对象。默认 merge（不覆盖，ID 冲突时跳过新项）。
   返回 { ok, imported, skipped }。 */
function importJSON(input, strategy) {
  let data = null;
  if (typeof input === 'string') { try { data = JSON.parse(input); } catch (e) { return { ok: false, reason: 'parse' }; } }
  else data = input;
  if (!data || typeof data !== 'object') return { ok: false, reason: 'format' };

  const mode = strategy === 'overwrite' ? 'overwrite' : 'merge';
  if (mode === 'overwrite') resetState();

  let imported = 0, skipped = 0;
  const existingIds = {};
  for (let i = 0; i < bag.length; i++) existingIds[bag[i].id] = true;

  const newBag = Array.isArray(data.bag) ? data.bag : [];
  for (let i = 0; i < newBag.length; i++) {
    const s = newBag[i];
    if (!s || !s.id || !s.rarity || !s.main) { skipped++; continue; }
    if (existingIds[s.id] && mode === 'merge') { skipped++; continue; }
    bag.push(s); existingIds[s.id] = true; imported++;
  }
  if (data.equip && typeof data.equip === 'object') {
    const roles = Object.keys(data.equip);
    for (let i = 0; i < roles.length; i++) {
      const r = roles[i];
      const arr = Array.isArray(data.equip[r]) ? data.equip[r].slice(0, 3) : [];
      if (mode === 'overwrite' || !equip[r]) equip[r] = [null, null, null];
      for (let j = 0; j < arr.length; j++) {
        if (arr[j] && existingIds[arr[j]]) equip[r][j] = arr[j];
      }
    }
  }
  if (data.items && typeof data.items === 'object') {
    items.ticket = (items.ticket || 0) + (Number(data.items.ticket) || 0);
    items.recastStone = (items.recastStone || 0) + (Number(data.items.recastStone) || 0);
  }
  if (mode === 'merge' && typeof data.pityCounter === 'number') {
    pityCounter = Math.max(pityCounter, Number(data.pityCounter) || 0);
  } else if (mode === 'overwrite') {
    pityCounter = Number(data.pityCounter) || 0;
  }
  save(); emitChange();
  return { ok: true, imported: imported, skipped: skipped };
}

/* ==================== 十六、订阅 / 查询 ==================== */
function subscribe(fn) { if (typeof fn === 'function') listeners.push(fn); }
function unsubscribe(fn) {
  const i = listeners.indexOf(fn);
  if (i >= 0) listeners.splice(i, 1);
}
function getBag() { return bag; }
function getItem() { return items; }

/* 后台调试用：增加抽卡券 / 重铸石。
   返回最新数量。 */
function addTicket(n) { items.ticket = (items.ticket || 0) + (Number(n) || 0); save(); emitChange(); return items.ticket; }
function addStone(n) { items.recastStone = (items.recastStone || 0) + (Number(n) || 0); save(); emitChange(); return items.recastStone; }
function getPity() { return { counter: pityCounter, epic: PITY_EPIC, legend: PITY_LEGEND }; }
function getSets() { return SETS; }
function getRarities() { return RARITY_ORDER.slice(); }
function getRarityColor(r) { return RARITY_COLOR[r] || '#fff'; }
function getSoulCount() { return bag.length; }
function getLockedSouls() { return bag.filter(function (s) { return s.locked; }); }
function setLocked(soulId, locked) {
  const s = getSoul(soulId);
  if (!s) return false;
  s.locked = !!locked;
  save(); emitChange();
  return true;
}
/* 分解：把神魂移出仓库。装备中 / 已锁定的不可分解。
   强化与精华已删除，分解不再返还任何资源。 */
function dismantle(soulId) {
  const s = getSoul(soulId);
  if (!s) return { ok: false, reason: 'notfound' };
  if (s.locked) return { ok: false, reason: 'locked' };
  if (isEquipped(soulId)) return { ok: false, reason: 'equipped' };
  const idx = bag.indexOf(s);
  if (idx < 0) return { ok: false, reason: 'notfound' };
  bag.splice(idx, 1);
  save(); emitChange();
  return { ok: true };
}

/* ==================== 对外接口 ==================== */
root.SHENHUN = {
  /* 配置查询 */
  RARITY_ORDER: RARITY_ORDER, RARITY_COLOR: RARITY_COLOR,
  SETS: SETS, SET_BY_TYPE: SET_BY_TYPE,
  MAIN_BASE: MAIN_BASE, SUB_RANGE: SUB_RANGE,
  ATTR_META: ATTR_META,
  /* 工具 */
  attrName: attrName, isPctAttr: isPctAttr, formatAttr: formatAttr,
  /* 生成 / 抽卡 */
  generateSoul: generateSoul, drawOne: drawOne, drawMany: drawMany,
  /* 合成 / 重铸 */
  canSynthesize: canSynthesize, synthesize: synthesize, recast: recast,
  planAutoSynthesize: planAutoSynthesize, autoSynthesize: autoSynthesize,
  /* 装备 */
  equipSoul: equipSoul, unequipSoul: unequipSoul,
  getEquip: getEquip, getEquippedSouls: getEquippedSouls, getSlotSoul: getSlotSoul, normSlot: normSlot,
  getSoulBonus: getSoulBonus, XINMO_BASE_CHANCE: XINMO_BASE_CHANCE, XINMO_HUNLUAN_DURATION: XINMO_HUNLUAN_DURATION, findEquipOwner: findEquipOwner,
  isEquipped: isEquipped, getSoul: getSoul,
  /* 套装 */
  countSets: countSets, hasTwoPiece: hasTwoPiece, onePieceStacks: onePieceStacks,
  /* 属性聚合 */
  aggregateStats: aggregateStats,
  /* 战斗钩子 */
  calcWushuangCritDmgBonus: calcWushuangCritDmgBonus,
  maybeApplyXinmo: maybeApplyXinmo,
  maybeApplyPrisonRealm: maybeApplyPrisonRealm, PRISON_REALM_BASE_CHANCE: PRISON_REALM_BASE_CHANCE,
  hasSetTwoPiece: hasSetTwoPiece,
  rollBaichuanDefFactor: rollBaichuanDefFactor,
  calcShufuFinalDmgBonus: calcShufuFinalDmgBonus,
  rollZhaocaiRage: rollZhaocaiRage,
  BAICHUAN_CHANCE: BAICHUAN_CHANCE, BAICHUAN_PIERCE_RATE: BAICHUAN_PIERCE_RATE,
  SHUFU_RAGE_COST: SHUFU_RAGE_COST, SHUFU_FINAL_DMG_RATE: SHUFU_FINAL_DMG_RATE,
  NUYUAN_RAGE: NUYUAN_RAGE, ZHAOCAI_CHANCE: ZHAOCAI_CHANCE, ZHAOCAI_RAGE: ZHAOCAI_RAGE,
  /* 存档 / IO */
  save: save, load: load, exportJSON: exportJSON, importJSON: importJSON,
  dailyLogin: dailyLogin, DAILY_TICKET: DAILY_TICKET, DAILY_RECAST_STONE: DAILY_RECAST_STONE,
  /* 查询 / 订阅 */
  subscribe: subscribe, unsubscribe: unsubscribe,
  getBag: getBag, getItem: getItem, getPity: getPity,
  getSoulCount: getSoulCount, setLocked: setLocked, dismantle: dismantle,
  /* 后台调试 */
  addTicket: addTicket, addStone: addStone
};

})(typeof window !== 'undefined' ? window : this);
