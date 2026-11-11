/* ============================================================
   探索模式（pve.js）
   内容：神魂副本（狩魔 / 荒古）+ 演武场
   本文件自带：怪物数据、副本配置、探索界面 DOM 与样式、奖励发放、
   阵容锁定 / 自动挑战（均按副本独立保存）+ 自动挑战读秒显示。
   只依赖运行时的全局函数（checkStartButton / startBattle / renderHeroGrid 等，
   均定义在 game.js，跨 script 的顶层函数与 let 在运行时可见）。
   game.js 里保留的少量钩子都以 window.PVE && … 惰性判断，
   未加载本文件时所有行为与旧版完全一致。
   ============================================================ */
(function () {
  'use strict';

  var LOCK_STORE_KEY = 'rq_pve_lock_v1';
  var AUTO_STORE_KEY = 'rq_pve_auto_v1';
  var AUTO_RETURN_MS = 3000;   // 结算 3 秒后回到副本选人
  var AUTO_START_MS  = 3000;   // 回到选人 3 秒后自动开下一局

  /* ---------------- 怪物贴图 ----------------
     目录：assets/pve/character/英文名.png
     三种怪物都不属于可选角色，不写进 HERO_DATA，玩家在选人页看不到。 */
  var IMG_BASE = 'assets/pve/character/';
  var MONSTER_IMG_FILE = {
    '魔物首领': 'MonsterBoss',
    '魔物精英': 'EliteMonster',
    '荒古魔龙': 'PrimordialWyrm'
  };

  /* ---------------- 怪物数据 ----------------
     字段与 HERO_DATA 条目同形，createUnit 可直接消费。
     技能消耗统一按项目惯例给 4 点怒气（与所有角色一致）；
     普攻 +2 怒气，AI 自动战斗攒够即放技能。 */
  var MONSTERS = {
    '魔物首领': {
      atk: 2000, def: 900, hp: 40000, spd: 150,
      critRate: 0.3, critDmg: 1.5, effectHit: 0, effectResist: 0,
      color: '#8e24aa', tag: '攻击',
      normal: { name: '魔爪', type: 'single', dmgRate: 1.0, target: 'enemy' },
      skill:  { name: '魔威震荡', cost: 4, type: 'aoe', dmgRate: 1.5, target: 'enemy' },
      passive: { name: '首领意志', desc: '自身免疫控制效果与<span class="m-rule">放逐</span>。' },
      descNormal: '对敌方目标造成 <span class="dmg">100%</span> 伤害。',
      descSkill:  '对敌方全体造成 <span class="dmg">150%</span> 伤害。',
      mechanics: [
        { type:'note', name:'免疫', desc:'规则：免疫控制效果与放逐。' }
      ]
    },
    '魔物精英': {
      atk: 1000, def: 600, hp: 15000, spd: 140,
      critRate: 0.2, critDmg: 1.5, effectHit: 0, effectResist: 0,
      color: '#6a1b9a', tag: '攻击',
      normal: { name: '利爪', type: 'single', dmgRate: 1.0, target: 'enemy' },
      skill:  { name: '猛击', cost: 4, type: 'single', dmgRate: 1.5, target: 'enemy' },
      descNormal: '对敌方目标造成 <span class="dmg">100%</span> 伤害。',
      descSkill:  '对敌方目标造成 <span class="dmg">150%</span> 伤害。',
      mechanics: []
    },
    '荒古魔龙': {
      atk: 3500, def: 1200, hp: 60000, spd: 160,
      critRate: 0.3, critDmg: 1.8, effectHit: 0, effectResist: 0,
      color: '#b71c1c', tag: '攻击',
      normal: { name: '龙爪', type: 'single', dmgRate: 1.2, target: 'enemy' },
      skill:  { name: '荒古吐息', cost: 4, type: 'aoe', dmgRate: 1.8, target: 'enemy' },
      passive: { name: '荒古威压', desc: '自身免疫控制效果与<span class="m-rule">放逐</span>。' },
      descNormal: '对敌方目标造成 <span class="dmg">120%</span> 伤害。',
      descSkill:  '对敌方全体造成 <span class="dmg">180%</span> 伤害。',
      mechanics: [
        { type:'note', name:'免疫', desc:'规则：免疫控制效果与放逐。' }
      ]
    }
  };

  /* ---------------- 副本配置 ----------------
     enemies 即敌方阵容（按顺序进 enemyTeam）；reward 为胜利奖励。 */
  var DUNGEONS = {
    'shoumo': {
      key: 'shoumo', name: '狩魔', icon: '🗡️',
      enemies: ['魔物首领', '魔物精英', '魔物精英'],
      reward: { kind: 'ticket', n: 1, label: '神魂券 ×1' },
      desc: '魔物首领 ×1、魔物精英 ×2　｜　挑战成功获得 神魂券 ×1'
    },
    'huanggu': {
      key: 'huanggu', name: '荒古', icon: '🐉',
      enemies: ['荒古魔龙'],
      reward: { kind: 'stone', n: 1, label: '重铸石 ×1' },
      desc: '荒古魔龙 ×1　｜　挑战成功获得 重铸石 ×1'
    }
  };

  /* ---------------- 运行时状态 ----------------
     currentDungeon：null（非副本）/ 'shoumo' / 'huanggu'
     exploreFlow   ：本局是否从探索界面进入（决定选人页「返回」回哪） */
  var currentDungeon = null;
  var exploreFlow = false;
  var selectedKey = null;      // 探索界面当前选中的卡：'shoumo'/'huanggu'/'arena'
  var screen = null;

  /* ---------------- 阵容锁定 / 自动挑战存储 ----------------
     按副本 key 独立保存；只存角色名数组与开关，不存任何战斗结果。 */
  function readStore(key, fallback) {
    try {
      var raw = window.localStorage && window.localStorage.getItem(key);
      var obj = raw ? JSON.parse(raw) : null;
      return (obj && typeof obj === 'object') ? obj : {};
    } catch (e) { return {}; }
  }
  function writeStore(key, obj) {
    try { if (window.localStorage) window.localStorage.setItem(key, JSON.stringify(obj || {})); }
    catch (e) { /* 隐私模式 / 存储被禁时退化为内存态 */ }
  }
  var lockMap = readStore(LOCK_STORE_KEY, {});
  var autoMap = readStore(AUTO_STORE_KEY, {});
  var autoReturnTimer = null, autoStartTimer = null, countdownTimer = null, autoLoopRunning = false;
  /* 神魂副本战斗时长（墙钟时间，按真实经过毫秒算，倍速/动画暂停都不影响）。
     独立于自动挑战的计时器：自动循环里每局 startBattle 都会重开一局计时。 */
  var battleStartAt = 0, battleTimerId = null, battleFinalMs = 0;

  function heroKeys() {
    try {
      if (typeof getHeroList === 'function') return getHeroList();
      if (typeof HERO_DATA !== 'undefined') return Object.keys(HERO_DATA);
    } catch (e) {}
    return [];
  }
  function validRoster(roster) {
    if (!Array.isArray(roster) || roster.length !== 6 || roster[0] !== '主角') return false;
    var keys = heroKeys();
    if (!keys.length) return false;
    var seen = {};
    for (var i = 0; i < roster.length; i++) {
      var n = roster[i];
      if (keys.indexOf(n) < 0 || seen[n]) return false;
      seen[n] = true;
    }
    return true;
  }
  function lockIsValid(key) {
    var lk = lockMap[key];
    return !!(lk && lk.locked && validRoster(lk.roster));
  }
  function normalizeFlags(key) {
    if (!key) return;
    var lk = lockMap[key];
    if (lk && lk.locked && !validRoster(lk.roster)) {
      lockMap[key] = { locked:false, roster:[] };
      writeStore(LOCK_STORE_KEY, lockMap);
    }
    if (autoMap[key] && !lockIsValid(key)) {
      autoMap[key] = false;
      writeStore(AUTO_STORE_KEY, autoMap);
    }
  }
  function isLocked(key) {
    key = key || currentDungeon;
    if (!key) return false;
    normalizeFlags(key);
    return lockIsValid(key);
  }
  function lockedRoster(key) {
    key = key || currentDungeon;
    return isLocked(key) ? lockMap[key].roster.slice() : null;
  }
  function saveLock(key, locked, roster) {
    lockMap[key] = { locked: !!locked, roster: locked ? (roster || []).slice() : [] };
    writeStore(LOCK_STORE_KEY, lockMap);
  }
  function getAutoFlag(key) {
    key = key || currentDungeon;
    if (!key) return false;
    normalizeFlags(key);
    return !!autoMap[key];
  }
  function setAutoFlag(key, on) {
    autoMap[key] = !!on;
    writeStore(AUTO_STORE_KEY, autoMap);
  }
  function isAutoChallenge() {
    return isDungeon() && isLocked(currentDungeon) && getAutoFlag(currentDungeon);
  }
  function getCurrentRoster() {
    try { return (typeof playerSelection !== 'undefined') ? playerSelection.slice() : []; }
    catch (e) { return []; }
  }
  function applyRoster(roster) {
    try { if (typeof playerSelection !== 'undefined') playerSelection = roster.slice(); }
    catch (e) {}
    if (typeof renderHeroGrid === 'function') renderHeroGrid('player');
    if (typeof checkStartButton === 'function') checkStartButton();
  }

  function pveToast(msg, rare) {
    if (window.SHENHUN_UI && typeof window.SHENHUN_UI.toast === 'function') {
      window.SHENHUN_UI.toast(msg, rare || 'rare');
      return;
    }
    var hint = document.getElementById('pve-lock-hint');
    if (hint) hint.textContent = msg;
  }
  function clearTimeoutSafe(id) {
    if (id) { try { clearTimeout(id); } catch (e) {} }
  }
  /* ---------------- 自动挑战读秒 ----------------
     两段等待各显示一次：结算 3 秒回选人、选人 3 秒自动开战。
     每秒刷新文本（3 → 2 → 1），退出 / 取消 / 手动开局时立即隐藏。 */
  function countdownEl() {
    var el = document.getElementById('pve-countdown');
    if (!el) {
      el = document.createElement('div');
      el.id = 'pve-countdown';
      el.className = 'pve-countdown';
    }
    return el;
  }
  function hideCountdown() {
    clearTimeoutSafe(countdownTimer); countdownTimer = null;
    var el = document.getElementById('pve-countdown');
    if (el) {
      el.style.display = 'none';
      if (el.parentNode) el.parentNode.removeChild(el);
    }
  }
  function startCountdown(hostId, seconds, label) {
    hideCountdown();
    var host = document.getElementById(hostId) || document.body;
    var el = countdownEl();
    host.appendChild(el);
    el.style.display = 'block';
    var left = seconds;
    function tick() {
      if (!autoLoopRunning) { hideCountdown(); return; }
      el.textContent = '自动挑战 · ' + left + ' 秒后' + label;
      if (left <= 0) { hideCountdown(); return; }
      left--;
      countdownTimer = setTimeout(tick, 1000);
    }
    tick();
  }
  function cancelAutoTimers() {
    clearTimeoutSafe(autoReturnTimer); autoReturnTimer = null;
    clearTimeoutSafe(autoStartTimer);  autoStartTimer = null;
    clearTimeoutSafe(countdownTimer); countdownTimer = null;
  }
  function cancelAutoLoop() {
    autoLoopRunning = false;
    cancelAutoTimers();
    hideCountdown();
  }

  /* ---------------- 神魂副本：战斗时长 ----------------
     只显示 mm:ss（如 01:07），不加「时长：」等前缀。
     用 Date.now() 差值而非累加 tick 次数，切后台/浏览器节流后能立刻追上正确值。
     只在两个神魂副本显示；演武场与联机对战一律隐藏。 */
  function battleTimerEl() {
    var el = document.getElementById('pve-battle-timer');
    if (!el) {
      el = document.createElement('div');
      el.id = 'pve-battle-timer';
      el.textContent = '00:00';
      var host = document.getElementById('battle-screen') || document.body;
      host.appendChild(el);
    }
    return el;
  }
  function formatDuration(ms) {
    var total = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
    var m = Math.floor(total / 60), s = total % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }
  function renderBattleTimer(ms) {
    var el = battleTimerEl();
    el.textContent = formatDuration(ms);
    el.style.display = 'block';
  }
  function hideBattleTimer() {
    var el = document.getElementById('pve-battle-timer');
    if (el) el.style.display = 'none';
  }
  function stopBattleTimer(keepVisible) {
    clearTimeoutSafe(battleTimerId); battleTimerId = null;
    battleStartAt = 0;                       // 在途 tick 也会因这个标志直接返回
    if (!keepVisible) hideBattleTimer();
  }
  function startBattleTimer() {
    stopBattleTimer(false);
    hideResultTime();             // 新的一局开始，结算页不再显示上一局的用时
    battleStartAt = Date.now();
    battleFinalMs = 0;
    renderBattleTimer(0);                   // 开局立刻显示 00:00
    function tick() {
      if (!battleStartAt) return;
      battleFinalMs = Date.now() - battleStartAt;
      renderBattleTimer(battleFinalMs);
      battleTimerId = setTimeout(tick, 250);
    }
    battleTimerId = setTimeout(tick, 250);
  }

  /* 结算界面「本次用时 xx:xx」：节点挂在 .result-header 内、跟在副标题之后。
     非副本结算时隐藏，避免残留上一局副本的旧数值。 */
  function resultTimeEl() {
    var el = document.getElementById('pve-result-time');
    if (!el) {
      el = document.createElement('div');
      el.id = 'pve-result-time';
      var host = document.querySelector('#result-screen .result-header') ||
                 document.getElementById('result-screen') || document.body;
      host.appendChild(el);
    }
    return el;
  }
  function hideResultTime() {
    var el = document.getElementById('pve-result-time');
    if (el) el.style.display = 'none';
  }
  function showResultTime(ms) {
    var el = resultTimeEl();
    el.textContent = '本次用时 ' + formatDuration(ms);
    el.style.display = 'block';
  }

  /* ---------------- 对外的小接口 ---------------- */
  function isDungeon() { return !!currentDungeon; }
  function isExploreFlow() { return !!exploreFlow; }
  /* 返回独立拷贝：同名怪物（魔物精英 ×2）不共享技能对象，
     createUnit 里的 markSkill 打标记也不会互相污染。 */
  function getMonster(name) {
    var m = MONSTERS[name];
    if (!m) return null;
    var c = {};
    Object.keys(m).forEach(function (k) { c[k] = m[k]; });
    c.normal = Object.assign({}, m.normal);
    c.skill = Object.assign({}, m.skill);
    if (m.passive) c.passive = Object.assign({}, m.passive);
    if (Array.isArray(m.mechanics)) c.mechanics = m.mechanics.map(function (x) { return Object.assign({}, x); });
    return c;
  }
  function imgSrc(name) {
    var f = MONSTER_IMG_FILE[name];
    return f ? (IMG_BASE + f + '.png') : '';
  }
  function imgCheckList() {
    return Object.keys(MONSTER_IMG_FILE).map(function (n) {
      return { label: n + ' · 探索贴图', src: imgSrc(n) };
    });
  }
  function getEnemyRoster() {
    var d = DUNGEONS[currentDungeon];
    return d ? d.enemies.slice() : [];
  }
  function currentDungeonInfo() { return DUNGEONS[currentDungeon] || null; }

  /* ---------------- 样式（自带，避免改动 styles.css） ---------------- */
  var CSS = [
    '#pve-explore-screen { width:100%; min-height:100%; display:none; flex-direction:column;',
    '  align-items:center; justify-content:center; padding:20px; padding-bottom:40px;',
    '  background:var(--bg-veil); overflow-y:auto; -webkit-overflow-scrolling:touch; }',
    '#pve-explore-screen.show { display:flex; }',
    '#pve-explore-screen h1 { color:#ffd700; margin-bottom:8px; font-size:28px; text-align:center; }',
    '.pve-subtitle { color:#4fc3f7; font-size:16px; margin-bottom:8px; }',
    '.pve-intro { color:#888; font-size:13px; margin-bottom:20px; text-align:center;',
    '  max-width:500px; line-height:1.6; }',
    '.pve-resource { color:#ffd700; font-size:13px; margin-bottom:14px; text-align:center; }',
    '.pve-resource b { color:#fff; }',
    '.pve-back { position:absolute; top:14px; left:14px; padding:6px 14px; font-size:13px;',
    '  background:#16213e; color:#cfd8dc; border:1px solid #555; border-radius:6px;',
    '  cursor:pointer; font-family:inherit; z-index:2; }',
    '.pve-back:hover { border-color:#8e24aa; }',
    '#pve-confirm-btn { padding:12px 40px; font-size:18px;',
    '  background:linear-gradient(135deg,#ff6f00,#ff8f00); color:#fff; border:none;',
    '  border-radius:25px; cursor:pointer; font-family:inherit; }',
    '#pve-confirm-btn:disabled { opacity:.4; cursor:not-allowed; }',
    '.pve-card .pve-reward { color:#ffd700; font-size:11px; margin-top:4px; }',
    /* 阵容锁定 / 自动挑战条 */
    '#pve-lock-bar { display:none; align-items:center; justify-content:center; gap:12px;',
    '  flex-wrap:wrap; max-width:620px; margin:8px auto 12px; padding:8px 12px;',
    '  background:#101a35cc; border:1px solid #455a64; border-radius:8px;',
    '  color:#cfd8dc; font-size:13px; }',
    '#pve-lock-bar label { display:inline-flex; align-items:center; gap:5px; cursor:pointer; }',
    '#pve-lock-bar input { accent-color:#ffb300; }',
    '#pve-lock-bar input:disabled { cursor:not-allowed; opacity:.45; }',
    '#pve-lock-hint { color:#90a4ae; font-size:12px; flex-basis:100%; text-align:center; line-height:1.4; }',
    '.pve-countdown { display:block; width:fit-content; max-width:90%; margin:10px auto;',
    '  padding:7px 16px; color:#ffd700; font-size:14px; font-weight:bold;',
    '  text-align:center; letter-spacing:.5px; line-height:1.5;',
    '  background:#101a35ee; border:1px solid #ffb300; border-radius:20px; }',
    '#pve-lock-bar .pve-countdown { flex-basis:100%; margin:4px auto 2px; }',
    /* 神魂副本战斗计时：只显示 mm:ss，右上角常驻，不吃点击 */
    '#pve-battle-timer { display:none; position:absolute; top:10px; right:14px; z-index:102;',
    '  padding:4px 10px; color:#ffd700; font-size:15px; font-weight:bold;',
    '  font-variant-numeric:tabular-nums; letter-spacing:1px; line-height:1.4;',
    '  background:#101a35cc; border:1px solid #ffb30066; border-radius:8px;',
    '  pointer-events:none; user-select:none; -webkit-tap-highlight-color:transparent; }',
    /* 结算界面「本次用时」：独立一行，跟在 result-sub 之后 */
    '#pve-result-time { display:none; margin-top:6px; font-size:14px; color:#ffd700;',
    '  font-variant-numeric:tabular-nums; letter-spacing:.5px; }',
    '#selection-screen.pve-locked #player-hero-grid .hero-card { pointer-events:none; opacity:.72; }',
    '#selection-screen.pve-locked #player-hero-grid .hero-card .detail-btn { pointer-events:auto; opacity:1; }',
    '@media (max-width:820px) {',
    '  #pve-explore-screen { justify-content:center; justify-content:safe center;',
    '    padding-top:20px; padding-bottom:20px; }',
    '  #pve-explore-screen h1 { font-size:22px; }',
    '  .pve-subtitle { font-size:14px; }',
    '  .pve-intro { font-size:12px; margin-bottom:12px; }',
    '  #pve-confirm-btn { padding:10px 32px; font-size:16px; }',
    '  #pve-lock-bar { gap:8px; font-size:12px; padding:7px 9px; }',
    '  #pve-battle-timer { top:6px; right:8px; font-size:13px; padding:3px 8px; }',
    '}'
  ].join('\n');

  function injectStyle() {
    if (document.getElementById('pve-style')) return;
    var s = document.createElement('style');
    s.id = 'pve-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ---------------- 探索界面 DOM ---------------- */
  function buildScreen() {
    if (screen) return screen;
    screen = document.createElement('div');
    screen.id = 'pve-explore-screen';
    screen.innerHTML =
      '<button class="pve-back" id="pve-back-btn" type="button">← 返回主界面</button>' +
      '<h1>🧭 探索</h1>' +
      '<p class="pve-subtitle">选择挑战内容</p>' +
      '<p class="pve-intro">神魂副本挑战成功可获得养成资源；演武场可自由搭配阵容进行对战。</p>' +
      '<div class="pve-resource" id="pve-resource"></div>' +
      '<div class="mode-cards">' +
      card('shoumo', '🗡️', '神魂副本 · 狩魔', DUNGEONS.shoumo.desc, '奖励：神魂券 ×1') +
      card('huanggu', '🐉', '神魂副本 · 荒古', DUNGEONS.huanggu.desc, '奖励：重铸石 ×1') +
      card('arena', '🪵', '演武场', '你控制我方阵容，敌方由 AI 自动操控，双方各选 6 人（必选主角）。', '无额外奖励') +
      '</div>' +
      '<button id="pve-confirm-btn" type="button" disabled>确认选择</button>';
    var container = document.getElementById('game-container') || document.body;
    container.appendChild(screen);

    screen.querySelectorAll('.pve-card').forEach(function (c) {
      c.addEventListener('click', function () {
        screen.querySelectorAll('.pve-card').forEach(function (x) { x.classList.remove('selected'); });
        c.classList.add('selected');
        selectedKey = c.getAttribute('data-pve');
        document.getElementById('pve-confirm-btn').disabled = false;
      });
    });
    document.getElementById('pve-back-btn').addEventListener('click', function () {
      cancelAutoLoop();
      /* resetGame 会顺带调用 PVE.reset() 收掉探索界面并回到主界面 */
      if (typeof resetGame === 'function') resetGame();
    });
    document.getElementById('pve-confirm-btn').addEventListener('click', function () {
      if (!selectedKey) return;
      if (selectedKey === 'arena') enterArena();
      else enterDungeon(selectedKey);
    });
    return screen;
  }
  function card(key, icon, title, desc, reward) {
    return '<div class="mode-card pve-card" data-pve="' + key + '">' +
      '<div class="mc-head"><span class="mode-icon">' + icon + '</span>' +
      '<span class="mode-title">' + title + '</span></div>' +
      '<div class="mode-desc">' + desc + '</div>' +
      '<div class="pve-reward">' + reward + '</div></div>';
  }

  function refreshResource() {
    var el = document.getElementById('pve-resource');
    if (!el) return;
    var items = (window.SHENHUN && SHENHUN.getItem) ? SHENHUN.getItem() : {};
    el.innerHTML = '当前持有：神魂券 <b>' + (items.ticket || 0) + '</b>　·　重铸石 <b>' + (items.recastStone || 0) + '</b>';
  }

  /* 选人页顶部的副本提示条：独立元素，不会被 updateSelectionStatus 重写。 */
  function dungeonTip() {
    var t = document.getElementById('pve-dungeon-tip');
    if (!t) {
      t = document.createElement('div');
      t.id = 'pve-dungeon-tip';
      t.style.cssText = 'color:#ffd700;font-size:13px;text-align:center;line-height:1.6;' +
        'margin:10px auto;max-width:560px;padding:6px 10px;background:#16213e88;border-radius:6px;';
      var bar = document.getElementById('selection-topbar');
      if (bar && bar.parentNode) bar.parentNode.insertBefore(t, bar.nextSibling);
      else document.getElementById('selection-screen').appendChild(t);
    }
    return t;
  }
  function showDungeonTip(text) {
    var t = dungeonTip();
    t.textContent = text;
    t.style.display = 'block';
  }
  function hideDungeonTip() {
    var t = document.getElementById('pve-dungeon-tip');
    if (t) t.style.display = 'none';
  }

  /* ---------------- 阵容锁定 / 自动挑战控件 ---------------- */
  function lockBar() {
    var bar = document.getElementById('pve-lock-bar');
    if (bar) return bar;
    bar = document.createElement('div');
    bar.id = 'pve-lock-bar';
    bar.innerHTML =
      '<label><input id="pve-lock-toggle" type="checkbox"> 阵容锁定</label>' +
      '<label><input id="pve-auto-toggle" type="checkbox"> 自动挑战</label>' +
      '<span id="pve-lock-hint"></span>';
    var topbar = document.getElementById('selection-topbar');
    var after = document.getElementById('pve-dungeon-tip') || topbar;
    if (after && after.parentNode) after.parentNode.insertBefore(bar, after.nextSibling);
    else document.getElementById('selection-screen').appendChild(bar);
    document.getElementById('pve-lock-toggle').addEventListener('change', onLockToggle);
    document.getElementById('pve-auto-toggle').addEventListener('change', onAutoToggle);
    return bar;
  }
  function onLockToggle(e) {
    var key = currentDungeon;
    if (!key) { e.target.checked = false; return; }
    var want = !!e.target.checked;
    if (want) {
      var roster = getCurrentRoster();
      if (!validRoster(roster)) {
        e.target.checked = false;
        pveToast('请先选满 6 人（必选主角）再锁定阵容');
        refreshLockPanel(key);
        return;
      }
      saveLock(key, true, roster);
      pveToast('阵容已锁定，之后直接点「开始挑战」即可');
    } else {
      saveLock(key, false, []);
      setAutoFlag(key, false);
      cancelAutoLoop();
      pveToast('阵容锁定已解除，自动挑战已关闭');
    }
    refreshLockPanel(key);
  }
  function onAutoToggle(e) {
    var key = currentDungeon;
    if (!key) { e.target.checked = false; return; }
    var want = !!e.target.checked;
    if (!want) {
      setAutoFlag(key, false);
      cancelAutoLoop();
      pveToast('自动挑战已关闭');
    } else {
      if (!isLocked(key)) {
        e.target.checked = false;
        pveToast('开启自动挑战需要先选好阵容并锁定阵容');
        refreshLockPanel(key);
        return;
      }
      setAutoFlag(key, true);
      pveToast('自动挑战已开启：结算后将自动循环');
    }
    refreshLockPanel(key);
  }
  function refreshLockPanel(key) {
    normalizeFlags(key);
    var bar = lockBar();
    var lockEl = document.getElementById('pve-lock-toggle');
    var autoEl = document.getElementById('pve-auto-toggle');
    var hint = document.getElementById('pve-lock-hint');
    var locked = isLocked(key), auto = locked && !!autoMap[key];
    lockEl.checked = locked;
    autoEl.checked = auto;
    autoEl.disabled = !locked;
    bar.style.display = 'flex';
    var sel = document.getElementById('selection-screen');
    if (sel) sel.classList.toggle('pve-locked', locked);
    hint.textContent = locked
      ? (auto ? '阵容已锁定 · 自动挑战已开启：结算 3 秒后回到选人，再等 3 秒自动开下一局。'
             : '阵容已锁定，点击「开始挑战」即可；可勾选自动挑战。')
      : '先选满 6 人（必选主角），再开启「阵容锁定」；自动挑战需先锁定。';
  }
  function hideLockPanel() {
    var bar = document.getElementById('pve-lock-bar');
    if (bar) bar.style.display = 'none';
    var sel = document.getElementById('selection-screen');
    if (sel) sel.classList.remove('pve-locked');
  }
  function blockPlayerSelection(side) {
    if (side === 'player' && isDungeon() && isLocked(currentDungeon)) {
      pveToast('阵容已锁定，请先解锁后再调整');
      return true;
    }
    return false;
  }

  /* ---------------- 界面切换 ---------------- */
  function showExplore() {
    buildScreen();
    refreshResource();
    exploreFlow = true;
    currentDungeon = null;
    selectedKey = null;
    screen.querySelectorAll('.pve-card').forEach(function (x) { x.classList.remove('selected'); });
    document.getElementById('pve-confirm-btn').disabled = true;
    hideLockPanel();
    /* 主界面隐藏会触发背景模块的 MutationObserver → 自动切到静态背景 */
    document.getElementById('mode-select-screen').style.display = 'none';
    screen.classList.add('show');
  }
  function hideExplore() {
    if (screen) screen.classList.remove('show');
  }
  function openExplore() { cancelAutoLoop(); showExplore(); }

  function enterSelectionCommon() {
    hideExplore();
    document.getElementById('mode-select-screen').style.display = 'none';
    document.getElementById('selection-screen').style.display = 'block';
    document.getElementById('bp-mode-btn').style.display = 'none';
    if (typeof playerSelection !== 'undefined') playerSelection = ['主角'];
    if (typeof enemySelection !== 'undefined') enemySelection = ['主角'];
    if (typeof gameMode !== 'undefined') gameMode = 'pve';
  }

  function enterDungeon(key) {
    currentDungeon = key;
    exploreFlow = true;
    var d = DUNGEONS[key];
    enterSelectionCommon();
    var badge = document.getElementById('selection-mode-badge');
    badge.textContent = '🗡️ 神魂副本 · ' + d.name;
    badge.className = 'pve';
    document.querySelector('#selection-screen h1').textContent = '🗡️ 神魂副本 · ' + d.name;
    /* 副本敌方阵容固定，玩家只需选我方 6 人（必选主角） */
    document.getElementById('player-selection-section').style.display = 'block';
    document.getElementById('enemy-selection-section').style.display = 'none';
    if (typeof renderSectionTitle === 'function') {
      renderSectionTitle('player', 'default');
      renderSectionTitle('enemy', 'default');
    }
    showDungeonTip('🗡️ ' + d.name + '　｜　敌方：' + d.desc.split('　')[0] + '　｜　奖励：' + d.reward.label);
    refreshLockPanel(key);
    /* 锁定后无需手动选阵容：每次进入都自动恢复该副本的锁定阵容。 */
    var lr = lockedRoster(key);
    if (lr) applyRoster(lr);
    else {
      if (typeof checkStartButton === 'function') checkStartButton();
      if (typeof renderHeroGrid === 'function') renderHeroGrid('player');
    }
  }

  function enterArena() {
    cancelAutoLoop();
    currentDungeon = null;
    exploreFlow = true;
    enterSelectionCommon();
    var badge = document.getElementById('selection-mode-badge');
    badge.textContent = '🪵 演武场';
    badge.className = 'pve';
    document.querySelector('#selection-screen h1').textContent = '🪵 演武场';
    document.getElementById('player-selection-section').style.display = 'block';
    document.getElementById('enemy-selection-section').style.display = 'block';
    if (typeof renderSectionTitle === 'function') {
      renderSectionTitle('player', 'default');
      renderSectionTitle('enemy', 'default');
    }
    hideDungeonTip();
    hideLockPanel();
    if (typeof checkStartButton === 'function') checkStartButton();
    if (typeof renderHeroGrid === 'function') { renderHeroGrid('player'); renderHeroGrid('enemy'); }
  }

  /* 副本模式下「开始战斗」按钮：只要求我方选满 6 人 */
  function refreshStartButton(btn) {
    var n = (typeof playerSelection !== 'undefined') ? playerSelection.length : 0;
    btn.disabled = !(n === 6);
    btn.textContent = (n === 6) ? '开始挑战！' : '我方已选 ' + n + '/6 - 继续选择';
  }

  /* 选人界面「← 返回」：探索流程回到探索界面，而不是直接回主界面 */
  function onBack() {
    if (!exploreFlow) return false;
    cancelAutoLoop();
    currentDungeon = null;
    document.getElementById('selection-screen').style.display = 'none';
    showExplore();
    return true;
  }

  /* ---------------- 自动挑战：开局挂机 ---------------- */
  function onBattleStart() {
    hideCountdown();          // 手动开局 / 自动开局都一样：进场后不再显示读秒
    /* 战斗时长：仅神魂副本计时，每局从 00:00 重新开始。 */
    if (!isDungeon()) { stopBattleTimer(false); return; }
    startBattleTimer();
    var key = currentDungeon;
    if (isLocked(key)) {
      var r = getCurrentRoster();
      if (validRoster(r)) saveLock(key, true, r);     // 开打时再保存一次，锁定阵容永远最新
    }
    if (!isAutoChallenge()) return;
    autoLoopRunning = true;
    cancelAutoTimers();
    try {
      if (typeof gameState !== 'undefined') {
        gameState.auto = gameState.auto || {};
        gameState.auto.player = true;
      }
      if (typeof updateAutoBtn === 'function') updateAutoBtn();
      if (typeof log === 'function') log('自动挑战已开启：本局自动挂机。', 'log-buff');
    } catch (e) {}
  }

  /* ---------------- 结算奖励 + 自动循环 ----------------
     只在「副本 + 胜利」时发放；失败 / 平局不发。
     自动挑战开启时：结算 3 秒后回该副本选人，再等 3 秒自动开下一局。 */
  function onBattleEnd(resultClass) {
    /* 非副本（演武场 / 双人对战 / 联机）不显示，且清掉上一局副本的残留数值。 */
    if (!isDungeon()) { hideResultTime(); return; }
    /* 先补一次精确差值（tick 每 250ms 一次，直接停在最后一次会少最多 250ms），
       再停表：战斗层计时定格，结算界面另起一行显示本次用时。 */
    if (battleStartAt) battleFinalMs = Date.now() - battleStartAt;
    stopBattleTimer(true);
    showResultTime(battleFinalMs);
    var d = DUNGEONS[currentDungeon];
    var sub = document.getElementById('result-sub');
    var title = document.getElementById('result-title');
    var won = (resultClass === 'win');
    if (title) {
      if (won) { title.textContent = '🎉 挑战成功！'; title.className = 'result-title win'; }
      else if (resultClass === 'draw') { title.textContent = '🤝 平局！'; title.className = 'result-title draw'; }
      else { title.textContent = '💀 挑战失败…'; title.className = 'result-title lose'; }
    }
    if (won && window.SHENHUN) {
      if (d.reward.kind === 'ticket') SHENHUN.addTicket(d.reward.n);
      else SHENHUN.addStone(d.reward.n);
      if (window.SHENHUN_UI && typeof SHENHUN_UI.refreshHeader === 'function') SHENHUN_UI.refreshHeader();
      if (window.SHENHUN_UI && typeof SHENHUN_UI.toast === 'function') {
        SHENHUN_UI.toast('🎉 挑战成功：' + d.reward.label, 'rare');
      }
    }
    if (sub) {
      sub.textContent = '神魂副本 · ' + d.name + ' · ' +
        (won ? ('挑战成功，获得 ' + d.reward.label) : '挑战失败，未获得奖励');
    }
    if (isAutoChallenge()) {
      autoLoopRunning = true;
      clearTimeoutSafe(autoReturnTimer);
      autoReturnTimer = null;
      autoReturnTimer = setTimeout(autoReturnToDungeon, AUTO_RETURN_MS);
      /* 结算界面就地显示读秒：3 → 2 → 1，随自动返回一起收起。 */
      startCountdown('result-screen', Math.round(AUTO_RETURN_MS / 1000), '返回选人');
    } else {
      hideCountdown();
    }
  }

  function autoReturnToDungeon() {
    autoReturnTimer = null;
    if (!autoLoopRunning || !isDungeon()) return;
    var key = currentDungeon;
    if (!key || !lockedRoster(key) || !getAutoFlag(key) || typeof resetGame !== 'function') {
      autoLoopRunning = false;
      return;
    }
    /* resetGame 会调用 PVE.reset() 停掉计时器，所以状态先在局部变量里留住。 */
    resetGame();
    showExplore();            // 保证「返回」仍指回探索界面
    hideExplore();
    enterDungeon(key);        // 恢复锁定阵容 + 显示锁/自动条
    var lr = lockedRoster(key);
    if (lr) applyRoster(lr);
    autoLoopRunning = true;
    scheduleAutoStart();
  }
  function scheduleAutoStart() {
    clearTimeoutSafe(autoStartTimer); autoStartTimer = null;
    autoStartTimer = setTimeout(startAutoBattle, AUTO_START_MS);
    /* 选人页锁定条内显示读秒：3 → 2 → 1。 */
    startCountdown('pve-lock-bar', Math.round(AUTO_START_MS / 1000), '开始挑战');
  }
  function startAutoBattle() {
    autoStartTimer = null;
    hideCountdown();
    if (!autoLoopRunning || !isDungeon() || !isAutoChallenge()) return;
    var lr = lockedRoster(currentDungeon);
    if (lr) applyRoster(lr);
    var btn = document.getElementById('start-battle-btn');
    if (typeof checkStartButton === 'function') checkStartButton();
    if (!btn || btn.disabled) return;
    if (typeof startBattle === 'function') startBattle();
  }

  /* 「再来一局」：刷副本不需要重新从主界面点一遍。
     自动挑战开启时，手动点「再来一局」也接续自动循环。 */
  function replay() {
    var key = currentDungeon;
    var auto = isAutoChallenge();
    var roster = getCurrentRoster();
    if (!key || typeof resetGame !== 'function') return false;
    cancelAutoTimers();
    resetGame();
    showExplore();      // 让「返回」仍指向探索界面
    hideExplore();
    enterDungeon(key);
    var lr = lockedRoster(key) || roster;
    if (lr && lr.length) applyRoster(lr);
    if (auto) { autoLoopRunning = true; scheduleAutoStart(); }
    return true;
  }

  /* 回到主界面时清理，避免下一次普通对局误带副本状态。
     锁定 / 自动开关本身保留，下次进入同一副本仍生效。 */
  function reset() {
    cancelAutoLoop();
    stopBattleTimer(false);
    hideResultTime();
    battleFinalMs = 0;
    currentDungeon = null;
    exploreFlow = false;
    selectedKey = null;
    hideExplore();
    hideDungeonTip();
    hideLockPanel();
    var b = document.getElementById('pve-confirm-btn');
    if (b) b.disabled = true;
    if (screen) screen.querySelectorAll('.pve-card').forEach(function (x) { x.classList.remove('selected'); });
  }

  /* ---------------- 初始化 ---------------- */
  function init() {
    injectStyle();
    buildScreen();
    battleTimerEl();          // 预建隐藏节点，保证「非副本不显示」是确定的 DOM 状态
  }

  window.PVE = {
    init: init, openExplore: openExplore, reset: reset,
    isDungeon: isDungeon, isExploreFlow: isExploreFlow,
    getMonster: getMonster, imgSrc: imgSrc, imgCheckList: imgCheckList,
    getEnemyRoster: getEnemyRoster, currentDungeonInfo: currentDungeonInfo,
    refreshStartButton: refreshStartButton,
    onBack: onBack, onBattleEnd: onBattleEnd, replay: replay,
    onBattleStart: onBattleStart, blockPlayerSelection: blockPlayerSelection,
    isLocked: isLocked, isAutoChallenge: isAutoChallenge,
    getAutoFlag: getAutoFlag, lockedRoster: lockedRoster,
    formatDuration: formatDuration, battleElapsedMs: function () { return battleFinalMs || (battleStartAt ? Date.now() - battleStartAt : 0); },
    /* 暴露配置便于教程 / 调试读取，运行时只读 */
    MONSTERS: MONSTERS, DUNGEONS: DUNGEONS, IMG_BASE: IMG_BASE
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
