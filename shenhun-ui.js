/* ============================================================
   神魂系统 UI 层（重写版）
   依赖：window.SHENHUN（shenhun.js）
   结构：index.html 中的 #shenhun-overlay（5 个 .sh-pane 静态骨架）
   ============================================================ */
(function () {
  'use strict';

  var SH = window.SHENHUN;
  if (!SH) { console.error('[神魂UI] SHENHUN 未加载'); return; }

  var RARITY_ORDER = SH.RARITY_ORDER;
  var SET_BY_TYPE = SH.SET_BY_TYPE;

  /* ---------------- DOM 工具 ---------------- */
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }
  function h(type, payload) { return SH.formatAttr(type, payload.value != null ? payload.value : payload); }

  var ATTR_META = SH.ATTR_META || {};
  /* attrLabel：兼容两种入参 —— 直接传属性 key（字符串），或传 {key,value} 对象。
  之前只处理 key，导致主/副属性对象落入 || a 分支，把 defPct 这类原样吐出来。 */
  function attrLabel(a) {
    var k = (typeof a === 'object' && a !== null) ? a.key : a;
    /* 兜底再退一步：属性表缺失时也走逻辑层的 attrName，避免界面上直接吐 defPct 这种原始 key */
    return (ATTR_META[k] && ATTR_META[k].name) || (SH.attrName ? SH.attrName(k) : k) || k;
  }

  /* 稀有度配色：文本色 */
  var RARITY_HEX = {
    '神话': '#ff5252', '传说': '#ff9800', '史诗': '#ce93d8',
    '珍贵': '#42a5f5', '罕见': '#66bb6a', '普通': '#bdbdbd'
  };

  /* ==================== 通用弹窗 ==================== */
  var modalLayer = null;
  function ensureModalLayer() {
    if (modalLayer && document.body.contains(modalLayer)) return modalLayer;
    modalLayer = document.createElement('div');
    modalLayer.id = 'sh-modal-overlay';
    document.body.appendChild(modalLayer);
    modalLayer.addEventListener('click', function (ev) {
      if (ev.target === modalLayer) closeModal();
    });
    return modalLayer;
  }
  /* ==================== 顶部资源条 ==================== */
  function refreshHeader() {
    var t = $('sh-ticket'), s = $('sh-stone');
    if (t) t.textContent = (SH.getItem().ticket || 0);
    if (s) s.textContent = (SH.getItem().recastStone || 0);
  }

  /* ==================== Tab 切换 ==================== */
  var TAB_BUILDERS = {};
  function switchTab(tab) {
    document.querySelectorAll('#shenhun-tabs .sh-tab').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-tab') === tab);
    });
    document.querySelectorAll('.sh-pane').forEach(function (p) {
      p.classList.toggle('active', p.id === 'sh-pane-' + tab);
    });
    var builder = TAB_BUILDERS[tab];
    if (typeof builder === 'function') builder();
    refreshHeader();
  }

  /* ==================== 提示 ==================== */
  var toastTimer = null;
  function toast(msg, kind) {
    var t = $('sh-toast');
    if (!t) {
      t = el('div', 'sh-toast');
      t.id = 'sh-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.className = 'sh-toast show' + (kind ? ' ' + kind : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }

  /* ==================== 通用筛选（仓库 / 合成 / 重铸 / 装备共用） ====================
     四组条件：稀有度、套装、位置、主属性，外加副属性【多选·取交集】。
     每个面板各自持有一份状态（互不污染）；退出神魂系统时统一重置为默认。
     属性选项直接读逻辑层 ATTR_META，以后新增属性会自动出现在所有面板。 */
  var ATTR_KEYS = Object.keys(ATTR_META);
  if (!ATTR_KEYS.length) {
    ATTR_KEYS = ['atkPct', 'defPct', 'hpPct', 'speed', 'critRate', 'critDmg', 'effectHit', 'effectResist'];
  }
  /* 号位归一化：存档里 slot 可能是 1/2/3，也可能是 0/1/2 下标，统一换成 1/2/3。 */
  function soulPos(soul) {
    return (SH.normSlot ? SH.normSlot(soul.slot) : (Number(soul.slot) - 1)) + 1;
  }
  function makeFilterState() {
    return { rarity: '全部', set: '全部', pos: '全部', main: '全部', subs: [], only: '全部', sort: 'rarity' };
  }
  /* 原地重置、保留对象引用 —— 各处闭包持有的是同一份 state，不能整个换掉。 */
  function resetFilterState(st) {
    var d = makeFilterState();
    st.rarity = d.rarity; st.set = d.set; st.pos = d.pos; st.main = d.main;
    st.subs = d.subs; st.only = d.only; st.sort = d.sort;
    return st;
  }
  /* 位置 / 主属性 / 副属性交集过滤。稀有度与套装仍由各调用方自己处理。
     ★ 副属性取交集：每一项已选 key 都必须在该神魂的 subs 里出现（不是「任一命中」）。
     subs 固定 4 条互不重复，所以最多同时选 4 项才有结果；选 5 项以上自然为空。 */
  function filterByExtras(list, st) {
    if (st.pos !== '全部') list = list.filter(function (s) { return String(soulPos(s)) === st.pos; });
    if (st.main !== '全部') list = list.filter(function (s) { return s.main && s.main.key === st.main; });
    if (st.subs && st.subs.length) {
      list = list.filter(function (s) {
        var keys = (s.subs || []).map(function (x) { return x.key; });
        return st.subs.every(function (k) { return keys.indexOf(k) >= 0; });
      });
    }
    return list;
  }
  /* 把「位置」+「主属性」两个下拉追加到 .sh-filter。
     lockPos 非空时（装备选择器）位置固定为该号位且不可改 —— 列表本身已按号位限定。 */
  function appendPosMainSelects(filter, st, opts, onChange) {
    opts = opts || {};
    var selP = el('select');
    [['全部', '全部位置'], ['1', '1号位'], ['2', '2号位'], ['3', '3号位']].forEach(function (p) {
      var op = el('option', null, p[1]);
      op.value = p[0];
      if (p[0] === st.pos) op.selected = true;
      selP.appendChild(op);
    });
    if (opts.lockPos) {
      selP.value = opts.lockPos;
      selP.disabled = true;
      selP.title = '本选择器已限定 ' + opts.lockPos + ' 号位';
    }
    if (!selP.disabled) selP.onchange = function () { st.pos = selP.value; onChange(); };
    filter.appendChild(selP);

    var selM = el('select');
    var mainOp = el('option', null, '全部主属性');
    mainOp.value = '全部';
    if (st.main === '全部') mainOp.selected = true;
    selM.appendChild(mainOp);
    ATTR_KEYS.forEach(function (k) {
      var op = el('option', null, attrLabel(k));
      op.value = k;
      if (k === st.main) op.selected = true;
      selM.appendChild(op);
    });
    selM.onchange = function () { st.main = selM.value; onChange(); };
    filter.appendChild(selM);
  }
  /* 副属性多选条：单独一行，选中项之间取交集。返回该行 DOM，由调用方决定插在哪。 */
  function buildSubFilterRow(st, onChange) {
    var bar = el('div', 'sh-sub-filter');
    bar.appendChild(el('span', 'sh-sub-label', '副属性（多选·取交集）'));
    ATTR_KEYS.forEach(function (k) {
      var on = st.subs.indexOf(k) >= 0;
      var chip = el('button', 'sh-chip' + (on ? ' on' : ''), attrLabel(k));
      chip.type = 'button';
      chip.onclick = function () {
        var i = st.subs.indexOf(k);
        if (i >= 0) st.subs.splice(i, 1); else st.subs.push(k);
        onChange();
      };
      bar.appendChild(chip);
    });
    if (st.subs.length) {
      var clear = el('button', 'sh-chip clear', '清空 ' + st.subs.length + ' 项');
      clear.type = 'button';
      clear.onclick = function () { st.subs = []; onChange(); };
      bar.appendChild(clear);
    }
    return bar;
  }
  function hasAnyFilter(st) {
    return st.rarity !== '全部' || st.set !== '全部' || st.pos !== '全部' ||
      st.main !== '全部' || (st.subs && st.subs.length > 0) || st.only !== '全部';
  }

  /* ==================== 仓库 ==================== */
  var bagState = makeFilterState();

  function sortedBag() {
    var list = SH.getBag().slice();
    var r = bagState.rarity, s = bagState.set, o = bagState.only;
    if (r !== '全部') list = list.filter(function (soul) { return soul.rarity === r; });
    if (s !== '全部') list = list.filter(function (soul) { return soul.setType === s; });
    list = filterByExtras(list, bagState);
    if (o === 'equipped') list = list.filter(function (soul) { return SH.isEquipped(soul.id); });
    if (o === 'locked') list = list.filter(function (soul) { return soul.locked; });
    var rr = {};
    RARITY_ORDER.forEach(function (r, i) { rr[r] = i; });
    list.sort(function (a, b) {
      if (bagState.sort === 'rarity') {
        var d = rr[b.rarity] - rr[a.rarity];
        if (d !== 0) return d;
        return a.setType.localeCompare(b.setType, 'zh');
      }
      return a.setType.localeCompare(b.setType, 'zh');
    });
    return list;
  }

  function rarityHex(r) { return RARITY_HEX[r] || '#bdbdbd'; }
  /* 角色 key → 显示名（HERO_DATA 是 game.js 的顶层 const，运行时可见）。
     拿不到时退回 key，避免历史存档 / 旧数据里出现陌生角色名时报错。 */
  function heroDisplayName(key) {
    try {
      if (typeof HERO_DATA !== 'undefined' && HERO_DATA[key] && HERO_DATA[key].name) return HERO_DATA[key].name;
    } catch (e) {}
    return key;
  }

  /* 神魂卡片（正方形）：套装名 + 号位；若已装备，在号位下方直接显示装备者名字。
     稀有度仍由外框发光表达，但【已装备】优先用金色背景盖过稀有度配色。
     withActions 参数已废弃 —— 操作按钮统一移到详情弹窗右上角。 */
  function buildSoulCard(soul, withActions) {
    var owner = SH.findEquipOwner ? SH.findEquipOwner(soul.id) : null;
    var card = el('div', 'sh-soul-card sh-r' + soul.rarity);
    if (owner || SH.isEquipped(soul.id)) card.classList.add('equipped');
    if (soul.locked) card.classList.add('locked');

    var inner = el('div', 'sh-card-inner');
    inner.appendChild(el('div', 'sh-set', soul.setType));
    inner.appendChild(el('div', 'sh-slot', soul.slot + '号位'));
    /* 直接写装备者名字，不加「装备：」前缀 —— 正方形卡片空间有限 */
    if (owner) inner.appendChild(el('div', 'sh-card-owner', heroDisplayName(owner.role)));
    card.appendChild(inner);

    /* 点击整张卡片 = 打开详情（与主入口保持一致） */
    card.onclick = function () { showSoulDetail(soul); };
    return card;
  }

  function bagActions(soul) {
    var box = el('div', 'sh-actions');
    var detail = el('button', 'sh-btn', '详情');
    detail.onclick = function (ev) { ev.stopPropagation(); showSoulDetail(soul); };
    box.appendChild(detail);
    var lock = el('button', 'sh-btn', soul.locked ? '解锁' : '锁定');
    lock.onclick = function (ev) {
      ev.stopPropagation();
      SH.setLocked(soul.id, !soul.locked);
      renderBag();
      toast(soul.locked ? '已解锁' : '已锁定');
    };
    box.appendChild(lock);
    var d = el('button', 'sh-btn danger', '分解');
    d.onclick = function (ev) {
      ev.stopPropagation();
      if (SH.isEquipped(soul.id)) { toast('请先卸下再分解', 'warn'); return; }
      if (soul.locked) { toast('已锁定的神魂无法分解', 'warn'); return; }
      SH.dismantle(soul.id);
      renderBag();
      toast('已分解');
    };
    box.appendChild(d);
    return box;
  }

  /* 通用弹窗：允许在标题右侧挂自定义控件（如详情弹窗的锁定/分解按钮）。
     第三个参数 opts.actions 为 HTMLElement[]，会追加到 .sh-modal-title 末尾。
     opts.onClose：关闭时回调（只触发一次）—— 用于「从选择器里打开详情」后回到选择器。
     弹窗层只有一份（layer.innerHTML=''），二级弹窗会顶掉一级，
     所以这类"返回"必须由调用方在 onClose 里自行重建。 */
  var modalOnClose = null;
  function openModal(titleText, buildBody, opts) {
    opts = opts || {};
    var layer = ensureModalLayer();
    layer.innerHTML = '';
    modalOnClose = typeof opts.onClose === 'function' ? opts.onClose : null;
    var modal = el('div', 'sh-modal' + (opts.large ? ' sh-modal-lg' : ''));
    var head = el('div', 'sh-modal-title', titleText);
    var x = el('button', 'sh-modal-close', '×');
    x.onclick = closeModal;
    head.appendChild(x);
    if (opts.actions) {
      var actBox = el('div', 'sh-modal-actions');
      opts.actions.forEach(function (b) { actBox.appendChild(b); });
      head.appendChild(actBox);
    }
    modal.appendChild(head);
    var body = el('div', 'sh-modal-body');
    modal.appendChild(body);
    layer.appendChild(modal);
    layer.classList.add('show');
    if (typeof buildBody === 'function') buildBody(body, closeModal);
    return { modal: modal, body: body, close: closeModal };
  }
  function closeModal() {
    if (modalLayer) modalLayer.classList.remove('show');
    var fn = modalOnClose; modalOnClose = null;
    /* 先置空再执行：回调里通常会再开一个弹窗，避免被自己覆盖掉 */
    if (typeof fn === 'function') { try { fn(); } catch (e) { console.warn('[神魂UI] onClose 出错', e); } }
  }

  /* 构造「锁定 / 分解」按钮组 —— 挂在详情卡片内部，标题栏只保留 × 关闭 */
  function buildDetailActions(soul) {
    var box = el('div', 'sh-detail-actions');
    var lock = el('button', 'sh-btn sh-detail-act', soul.locked ? '解锁' : '锁定');
    if (soul.locked) lock.classList.add('on');

    /* 刷新按钮与元信息为最新状态（用于被外部变更后重绘） */
    function sync() {
      lock.textContent = soul.locked ? '解锁' : '锁定';
      lock.classList.toggle('on', soul.locked);
      var meta = document.querySelector('.sh-detail-meta');
      if (meta) meta.textContent = 'ID: ' + soul.id + (soul.locked ? '  ·  已锁定' : '');
    }

    lock.onclick = function (ev) {
      ev.stopPropagation();
      /* setLocked 内部已就地修改 soul.locked，切勿再手动翻转，否则会被改回原值 */
      SH.setLocked(soul.id, !soul.locked);
      sync();
      renderBag();
      toast(soul.locked ? '已锁定' : '已解锁');
    };

    var d = el('button', 'sh-btn danger sh-detail-act', '分解');
    d.onclick = function (ev) {
      ev.stopPropagation();
      if (SH.isEquipped(soul.id)) { toast('请先卸下再分解', 'warn'); return; }
      if (soul.locked) { toast('已锁定的神魂无法分解', 'warn'); return; }
      SH.dismantle(soul.id);
      renderBag();
      closeModal();
      toast('已分解');
    };

    box.appendChild(lock);
    box.appendChild(d);
    return box;
  }

  /* 套装效果块：1 件 / 2 件各一行，并标出当前是否已达成。
     owner 为该神魂的穿戴者（未穿戴则 null）—— 只有穿戴后才知道凑了几件。 */
  function buildSetEffectBlock(soul, owner) {
    var set = SET_BY_TYPE[soul.setType];
    if (!set) return null;
    var box = el('div', 'sh-detail-setfx');
    box.appendChild(el('div', 'sh-detail-label', '套装效果 · ' + soul.setType));
    var cnt = 0;
    if (owner && SH.getEquippedSouls) {
      /* 按「套装类型」统计该角色身上这套有几件 */
      SH.getEquippedSouls(owner.role).forEach(function (s) {
        if (s && s.setType === soul.setType) cnt++;
      });
    }
    /* 3 件同套装 = 一组 2 件套（内含一次 1 件套）+ 1 个散件 → 1 件套共生效 2 次。
       角标带上次数，避免界面看起来仍只加了一次。 */
    var oneStacks = SH.onePieceStacks ? SH.onePieceStacks(cnt) : (cnt >= 1 ? 1 : 0);
    [['1', set.one || set['1']], ['2', set.two || set['2']]].forEach(function (p) {
      if (!p[1]) return;
      var need = Number(p[0]);
      var on = cnt >= need;
      var times = need === 1 ? oneStacks : 1;   // 2 件套只激活一次
      var row = el('div', 'sh-setfx-row' + (on ? ' on' : ''));
      row.innerHTML = '<span class="sh-setfx-piece">' + need + '件</span>' +
        '<span class="sh-setfx-desc">' + p[1] + '</span>' +
        (on ? '<span class="sh-setfx-on">已生效' + (times > 1 ? ' ×' + times : '') + '</span>' : '');
      box.appendChild(row);
    });
    /* 注意：el() 第三个参数是 textContent，会原样显示标签，
       所以带 <b> 的这行必须走 innerHTML。 */
    var hint = el('div', 'sh-setfx-hint');
    hint.innerHTML = (!owner)
      ? '未装备：装到角色身上后才会计入套装件数。'
      : '当前由 <b>' + owner.role + '</b> 装备于 ' + owner.slot + '号位，本套共 ' + cnt + ' 件。';
    box.appendChild(hint);
    return box;
  }

  /* onClose：详情关闭后的回调（可选）。从装备选择器里打开详情时传入，
     用于关闭后回到候选列表；不传则直接关闭（仓库等场景）。 */
  function showSoulDetail(soul, onClose) {
    openModal(soul.setType + ' · ' + soul.slot + '号位', function (body) {
      var sub = el('div', 'sh-detail-card sh-r' + soul.rarity);
      var head = el('div', 'sh-detail-head');
      head.innerHTML = '<span class="sh-detail-set">' + soul.setType + '</span>' +
        ' <span class="sh-detail-rarity" style="color:' + rarityHex(soul.rarity) + '">' + soul.rarity + '</span>';
      sub.appendChild(head);
      sub.appendChild(el('div', 'sh-detail-slot', soul.slot + '号位'));
      var ml = el('div', 'sh-detail-main');
      ml.innerHTML = '主属性：<span class="sh-tag main">' + attrLabel(soul.main.key) + ' +' + h(soul.main.key, soul.main) + '</span>';
      sub.appendChild(ml);
      var sl = el('div', 'sh-detail-label', '副属性');
      sub.appendChild(sl);
      soul.subs.forEach(function (s) {
        var row = el('div', 'sh-detail-sub');
        row.innerHTML = '<span>' + attrLabel(s.key) + '</span><span class="sh-val">' + h(s.key, s) + '</span>';
        sub.appendChild(row);
      });
      /* 套装效果：1 件 / 2 件说明 + 当前达成情况 */
      var owner = SH.findEquipOwner ? SH.findEquipOwner(soul.id) : null;
      var fx = buildSetEffectBlock(soul, owner);
      if (fx) sub.appendChild(fx);
      sub.appendChild(el('div', 'sh-detail-meta', 'ID: ' + soul.id + (soul.locked ? '  ·  已锁定' : '')));
      /* 操作按钮挂在卡片内部（与截图一致），标题栏只保留 × 关闭 */
      sub.appendChild(buildDetailActions(soul));
      body.appendChild(sub);
    }, { onClose: onClose });
  }

  function renderBag() {
    var pane = $('sh-pane-bag');
    if (!pane) return;
    pane.innerHTML = '';

    /* 筛选条 */
    var filter = el('div', 'sh-filter');
    var selR = el('select');
    ['全部'].concat(RARITY_ORDER).forEach(function (r) {
      var op = el('option', null, r === '全部' ? '全部稀有度' : r);
      op.value = r;
      if (r === bagState.rarity) op.selected = true;
      selR.appendChild(op);
    });
    selR.onchange = function () { bagState.rarity = selR.value; renderBag(); };
    filter.appendChild(selR);

    var selS = el('select');
    var setNames = ['全部'].concat(Object.keys(SET_BY_TYPE));
    setNames.forEach(function (s) {
      var op = el('option', null, s === '全部' ? '全部套装' : s);
      op.value = s;
      if (s === bagState.set) op.selected = true;
      selS.appendChild(op);
    });
    selS.onchange = function () { bagState.set = selS.value; renderBag(); };
    filter.appendChild(selS);

    /* ★ 位置 + 主属性下拉（与合成 / 重铸 / 装备选择器共用同一套控件） */
    appendPosMainSelects(filter, bagState, {}, renderBag);

    var selO = el('select');
    [['全部', '全部'], ['equipped', '仅已装备'], ['locked', '仅已锁定']].forEach(function (p) {
      var op = el('option', null, p[1]);
      op.value = p[0];
      if (p[0] === bagState.only) op.selected = true;
      selO.appendChild(op);
    });
    selO.onchange = function () { bagState.only = selO.value; renderBag(); };
    filter.appendChild(selO);

    var sortBtn = el('button', 'sh-btn', bagState.sort === 'rarity' ? '排序：稀有度' : '排序：套装');
    sortBtn.onclick = function () {
      bagState.sort = bagState.sort === 'rarity' ? 'set' : 'rarity';
      renderBag();
    };
    filter.appendChild(sortBtn);
    pane.appendChild(filter);

    /* ★ 副属性多选条单独占一行，避免把上面 5 个下拉 + 排序按钮挤成窄条。 */
    pane.appendChild(buildSubFilterRow(bagState, renderBag));

    var list = sortedBag();
    if (list.length === 0) {
      /* 筛选条件生效时不要误报「仓库空空如也」，给可操作的提示。 */
      pane.appendChild(el('div', 'sh-empty', hasAnyFilter(bagState)
        ? '当前筛选条件下没有符合条件的神魂，可调回「全部」或清空副属性。'
        : '仓库空空如也，去抽卡获得神魂吧'));
      return;
    }
    pane.appendChild(el('div', 'sh-count', '共 ' + list.length + ' 个'));
    var grid = el('div', 'sh-soul-grid');
    list.forEach(function (soul) { grid.appendChild(buildSoulCard(soul, false)); });
    pane.appendChild(grid);
  }
  TAB_BUILDERS.bag = renderBag;

  /* ==================== 抽卡 ==================== */
  var lastResults = [];

  function buildGacha() {
    var pane = $('sh-pane-gacha');
    if (!pane) return;
    pane.innerHTML = '';

    var info = el('div', 'sh-draw-info');
    info.innerHTML = '每次抽卡消耗 <b>1 张神魂券</b>。概率：普通 43% / 罕见 30% / 珍贵 15% / 史诗 8% / 传说 3% / 神话 1%。' +
      '<br>每 10 次必出史诗及以上，每 30 次必出传说及以上。';
    pane.appendChild(info);

    var pity = SH.getPity ? SH.getPity() : { epicIn: 0, legendIn: 0 };
    var pLine = el('div', 'sh-pity');
    pLine.innerHTML = '距离必出史诗：<b>' + (10 - (pity.epicIn || 0)) + '</b> 抽 · 距离必出传说：<b>' + (30 - (pity.legendIn || 0)) + '</b> 抽';
    pane.appendChild(pLine);

    var btns = el('div', 'sh-draw-btns');
    var one = el('button', 'sh-btn primary sh-draw-btn', '抽 1 次');
    one.onclick = function () { runDraw(1); };
    btns.appendChild(one);
    var ten = el('button', 'sh-btn primary sh-draw-btn', '抽 10 次');
    ten.onclick = function () { runDraw(10); };
    btns.appendChild(ten);
    pane.appendChild(btns);

    var res = el('div', 'sh-result');
    if (lastResults.length === 0) {
      res.appendChild(el('div', 'sh-empty', '点击上方按钮开始抽卡，抽到的神魂会出现在这里并自动存入仓库。'));
    } else {
      res.appendChild(el('div', 'sh-result-title', '本次抽卡结果'));
      var grid = el('div', 'sh-soul-grid');
      lastResults.forEach(function (soul) { grid.appendChild(buildSoulCard(soul, false)); });
      res.appendChild(grid);
    }
    pane.appendChild(res);
    refreshHeader();
  }

  function runDraw(n) {
    var r = SH.drawMany(n);
    if (!r.ok) {
      if (r.reason === 'ticket') toast('神魂券不足，请等待每日发放', 'warn');
      else toast('抽卡失败：' + r.reason, 'warn');
      return;
    }
    lastResults = r.souls.slice();
    var high = r.souls.filter(function (s) { return RARITY_ORDER.indexOf(s.rarity) >= RARITY_ORDER.indexOf('传说'); });
    renderBag();
    buildGacha();
    if (high.length) toast('抽到了 ' + high.map(function (s) { return s.setType + '(' + s.rarity + ')'; }).join('、'), 'rare');
    else toast('抽到 ' + r.souls.length + ' 个神魂');
  }
  TAB_BUILDERS.gacha = buildGacha;

  /* ==================== 装备 ==================== */
  var equipState = { hero: '' };

  function getHeroList() {
    var list = [];
    if (typeof HERO_DATA !== 'undefined') {
      Object.keys(HERO_DATA).forEach(function (k) { list.push({ key: k, name: HERO_DATA[k].name || k }); });
    }
    if (list.length === 0 && typeof heroData !== 'undefined') {
      Object.keys(heroData).forEach(function (k) { list.push({ key: k, name: heroData[k].name || k }); });
    }
    return list;
  }

  function buildEquip() {
    var pane = $('sh-pane-equip');
    if (!pane) return;
    pane.innerHTML = '';

    var heroes = getHeroList();
    if (heroes.length === 0) {
      pane.appendChild(el('div', 'sh-empty', '当前没有可选角色'));
      return;
    }
    if (!equipState.hero || !HERO_DATA[equipState.hero]) equipState.hero = heroes[0].key;

    var heroBox = el('div', 'sh-equip-hero');
    var sel = el('select');
    heroes.forEach(function (hr) {
      var op = el('option', null, hr.name);
      op.value = hr.key;
      if (hr.key === equipState.hero) op.selected = true;
      sel.appendChild(op);
    });
    sel.onchange = function () { equipState.hero = sel.value; buildEquip(); };
    heroBox.appendChild(el('span', 'sh-label', '角色：'));
    heroBox.appendChild(sel);
    pane.appendChild(heroBox);

    /* countSets 收的是「神魂数组」，之前把角色名传了进去，
       于是按字符遍历得到一个 { undefined: 2 } 的假结果。 */
    var equippedSouls = SH.getEquippedSouls ? SH.getEquippedSouls(equipState.hero) : [];
    var setCount = SH.countSets ? SH.countSets(equippedSouls) : {};
    var slots = ['1', '2', '3'];
    slots.forEach(function (slot) {
      var row = el('div', 'sh-equip-row');
      row.appendChild(el('span', 'sh-equip-name', slot + '号位'));
      var box = el('div', 'sh-slot-box');
      var off = null, detail = null;
      /* 按「号位」取神魂：不能用 cur[slot] 直接下标数组（'1' 落在 0/1/2 的数组上是取不到的） */
      var soul = SH.getSlotSoul ? SH.getSlotSoul(equipState.hero, slot)
                                : (SH.getSoul ? SH.getSoul((SH.getEquip(equipState.hero) || [])[Number(slot) - 1]) : null);
      if (soul) {
        box.classList.add('filled', 'sh-r' + soul.rarity);
        box.innerHTML = '<span class="sl" style="color:' + rarityHex(soul.rarity) + '">' + soul.setType + '</span>' +
          '<span class="smain">' + attrLabel(soul.main.key) + ' +' + h(soul.main.key, soul.main) + '</span>';
        /* 装备页直接看该神魂详情。详情是上层弹窗，关闭后回到装备页并刷新，
           这样在详情里做的锁定 / 分解等操作也会同步反映。 */
        detail = el('button', 'sh-btn', '详情');
        detail.onclick = function (ev) {
          ev.stopPropagation();
          showSoulDetail(soul, function () { refreshEquipViews(); });
        };
        off = el('button', 'sh-btn sh-slot-off', '卸下');
        off.onclick = function (ev) {
          ev.stopPropagation();
          SH.unequipSoul(equipState.hero, slot);
          toast('已卸下');
          refreshEquipViews();
        };
      } else {
        box.appendChild(el('span', 'sl', '+ 装备'));
      }
      box.onclick = function () { openEquipPicker(equipState.hero, slot); };
      /* 顺序：槽位框在前，按钮组在后。
         原来是先 append 卸下按钮、再 insertBefore 把框插到它前面，
         没装神魂时 lastChild 是「1号位」标签，框会被插到标签前面去。 */
      row.appendChild(box);
      if (detail || off) {
        var btns = el('div', 'sh-equip-btns');
        if (detail) btns.appendChild(detail);
        if (off) btns.appendChild(off);
        row.appendChild(btns);
      }
      pane.appendChild(row);
    });

    /* 套装加成预览 */
    var prev = el('div', 'sh-preview');
    prev.appendChild(el('div', 'sh-preview-title', '套装加成预览'));
    var names = Object.keys(setCount);
    if (names.length === 0) {
      prev.appendChild(el('div', 'sh-empty small', '尚未触发套装效果'));
    } else {
      names.forEach(function (name) {
        var cnt = setCount[name];
        var set = SET_BY_TYPE[name];
        var line = el('div', 'sh-preview-line');
        var eff = [];
        /* 套装配置里字段名是 one / two，此前写成 set['1'] / set['2'] 取到的是 undefined，
           导致预览只剩「百穿 ×2」、效果描述一行都不显示。这里按 one / two 取，
           并保留对 '1' / '2' 写法的兼容。 */
        var one = set && (set.one || set['1']);
        var two = set && (set.two || set['2']);
        /* 1 件套生效次数：3 件同套装 = 2 次（2 件套内含 1 次 + 散件 1 次）。
           多次时在描述后标 ×N，与实战结算保持一致。 */
        var oneStacks = SH.onePieceStacks ? SH.onePieceStacks(cnt) : (cnt >= 1 ? 1 : 0);
        if (cnt >= 1 && one) eff.push('1件：' + one + (oneStacks > 1 ? ' ×' + oneStacks : ''));
        if (cnt >= 2 && two) eff.push('2件：' + two);
        /* 2 件套已达成时加个角标，方便一眼看出哪套生效了 */
        var badge = cnt >= 2 ? ' <span class="sh-2pc">2件已生效</span>' : '';
        line.innerHTML = '<b style="color:' + (cnt >= 2 ? '#ffd700' : '#ce93d8') + '">' + name + ' ×' + cnt + '</b>' +
          badge + (eff.length ? ' ' + eff.join(' / ') : '');
        prev.appendChild(line);
      });
    }
    pane.appendChild(prev);
    refreshHeader();
  }
  TAB_BUILDERS.equip = buildEquip;

  /* 装备选择器的筛选状态：模块级持有，这样「点详情后返回」「切换号位」都保留选择。
     与仓库（bagState）、合成（synState）、重铸（recastState）各自独立，互不污染。
     位置在打开选择器时锁定为当前号位，其余条件与仓库同款。 */
  var pickState = makeFilterState();

  /* 装备 / 卸下后刷新所有相关视图：装备页、仓库卡片（金色装备态）、资源条。
     角色详情页传入 onChanged 时，由它再重绘自己的神魂标签页。 */
  function refreshEquipViews(onChanged) {
    buildEquip();
    renderBag();
    refreshHeader();
    if (typeof onChanged === 'function') onChanged();
  }

  function openEquipPicker(hero, slot, onChanged) {
    var changed = typeof onChanged === 'function' ? onChanged : null;
    /* ★ 位置筛选固定为当前号位：列表本身已按 slot 限定，让用户切到别的号位只会筛出空列表。
       主属性 / 副属性（多选·取交集）仍可用；角色详情里的「装备 / 更换」也走这个入口。 */
    pickState.pos = String(slot);
    /* 用函数取列表：装备/卸下之后仓库会变，刷新时重新取快照。
       旧存档里 slot 可能是数字或字符串、也可能是 0/1/2 下标，统一用 soulPos 归一化。 */
    var getList = function () {
      return SH.getBag().filter(function (s) {
        return String(soulPos(s)) === String(slot) && !SH.isEquipped(s.id);
      });
    };
    openModal('选择 ' + slot + '号位 神魂', function (body) {
      var refresh = function () {
        body.innerHTML = '';
        /* 一个该号位神魂都没有时，不必显示筛选条（选了也没意义） */
        if (getList().length === 0) {
          body.appendChild(el('div', 'sh-empty', '没有可用的 ' + slot + '号位 神魂，去抽卡或先卸下其他角色的同位置神魂。'));
          return;
        }
        renderSelectList({
          list: getList,
          state: pickState,
          lockPos: String(slot),
          body: body,
          emptyText: '当前筛选条件下没有符合条件的神魂，可调回「全部」。',
          /* 详情是二级弹窗，关闭后重建选择器形成「返回」，筛选条件仍在。
             从角色详情进入时把 onChanged 一路带回去，装备成功后仍能重绘详情页。 */
          onDetail: function () { openEquipPicker(hero, slot, changed); },
          refresh: function () { refresh(); },
          buttons: function (soul) {
            return [{ text: '装备', cls: 'sh-btn primary', onClick: function (s) {
              var r = SH.equipSoul(hero, slot, s.id);
              if (r && !r.ok) { toast(r.reason || '装备失败', 'warn'); return; }
              toast('已装备');
              closeModal();
              refreshEquipViews(changed);
            } }];
          }
        });
      };
      refresh();
    }, { large: true });
  }

  /* ==================== 角色详情 · 神魂标签页 ====================
     由 game.js 的 showHeroDetail 调用：显示 3 个号位已装备的神魂 + 套装预览，
     并在这里直接「装备 / 更换 / 卸下」。装备/卸下后通过 onChanged 让详情页重绘，
     基础信息标签里的金色神魂加成也会跟着刷新。 */
  function renderHeroSoulConfig(hero, container, onChange) {
    if (!container) return;
    container.innerHTML = '';
    var changed = typeof onChange === 'function' ? onChange : function () {};
    var souls = SH.getEquippedSouls ? SH.getEquippedSouls(hero) : [];
    var count = souls.filter(Boolean).length;

    container.appendChild(el('div', 'hero-soul-title', heroDisplayName(hero) + ' · 神魂配置'));
    container.appendChild(el('div', 'hero-soul-tip',
      '已装备的神魂不会出现在合成 / 重铸列表中；卸下后即可使用。'));
    container.appendChild(el('div', 'hero-soul-summary', '已装备 ' + count + ' / 3 件'));

    ['1', '2', '3'].forEach(function (slot) {
      var soul = SH.getSlotSoul ? SH.getSlotSoul(hero, slot) : null;
      var row = el('div', 'hero-soul-row');
      row.appendChild(el('div', 'hero-soul-slot', slot + '号位'));

      var info = el('div', 'hero-soul-info' + (soul ? ' filled sh-r' + soul.rarity : ''));
      if (soul) {
        var subs = (soul.subs || []).map(function (s) {
          return attrLabel(s.key) + ' +' + h(s.key, s);
        }).join(' · ');
        info.innerHTML = '<div class="hero-soul-line"><b>' + soul.setType + '</b> · <span style="color:' + rarityHex(soul.rarity) + '">' + soul.rarity + '</span></div>' +
          '<div class="hero-soul-main">主属性：' + attrLabel(soul.main.key) + ' +' + h(soul.main.key, soul.main) + '</div>' +
          '<div class="hero-soul-subs">' + subs + '</div>';
      } else {
        info.innerHTML = '<div class="hero-soul-empty">未装备神魂</div>';
      }
      row.appendChild(info);

      var btns = el('div', 'hero-soul-btns');
      var equipBtn = el('button', 'sh-btn primary', soul ? '更换' : '装备');
      equipBtn.onclick = function () { openEquipPicker(hero, slot, changed); };
      btns.appendChild(equipBtn);
      if (soul) {
        var detailBtn = el('button', 'sh-btn', '详情');
        /* 关闭详情后重绘本页：锁定 / 分解等操作也要同步反映 */
        detailBtn.onclick = function () { showSoulDetail(soul, changed); };
        btns.appendChild(detailBtn);
        var offBtn = el('button', 'sh-btn danger', '卸下');
        offBtn.onclick = function () {
          SH.unequipSoul(hero, slot);
          toast('已卸下');
          refreshEquipViews(changed);
        };
        btns.appendChild(offBtn);
      }
      row.appendChild(btns);
      container.appendChild(row);
    });

    var prev = el('div', 'sh-preview');
    prev.appendChild(el('div', 'sh-preview-title', '套装加成预览'));
    var setCount = SH.countSets ? SH.countSets(souls) : {};
    var names = Object.keys(setCount);
    if (names.length === 0) {
      prev.appendChild(el('div', 'sh-empty small', '尚未装备神魂'));
    } else {
      names.forEach(function (name) {
        var cnt = setCount[name];
        var set = SET_BY_TYPE[name];
        var line = el('div', 'sh-preview-line');
        var eff = [];
        var one = set && (set.one || set['1']);
        var two = set && (set.two || set['2']);
        var oneStacks = SH.onePieceStacks ? SH.onePieceStacks(cnt) : (cnt >= 1 ? 1 : 0);
        if (cnt >= 1 && one) eff.push('1件：' + one + (oneStacks > 1 ? ' ×' + oneStacks : ''));
        if (cnt >= 2 && two) eff.push('2件：' + two);
        var badge = cnt >= 2 ? ' <span class="sh-2pc">2件已生效</span>' : '';
        line.innerHTML = '<b style="color:' + (cnt >= 2 ? '#ffd700' : '#ce93d8') + '">' + name + ' ×' + cnt + '</b>' +
          badge + (eff.length ? ' ' + eff.join(' / ') : '');
        prev.appendChild(line);
      });
    }
    container.appendChild(prev);
  }

  /* ==================== 合成 / 重铸 ==================== */
  /* 合成交互：两步选择
     第 1 步：从仓库里选第一个神魂（作为基准，锁定「套装 + 稀有度」）
     第 2 步：从【同套装 + 同稀有度 + 未锁定 + 未被选为第 1 个】的候选里选第二个
     第二步页会显式提示「目标：XX · 目标稀有度」，并高亮当前选中的第一个。 */
  var craftState = { mode: 'synthesize', first: null, second: null };
  /* 合成面板筛选状态（独立于仓库 / 重铸 / 装备，但筛选维度与仓库一致） */
  var synState = makeFilterState();

  /* 合成 / 重铸候选统一口径：未锁定且未装备。
     与逻辑层 canSynthesize / recast 的兜底判定一致，避免界面和逻辑各说各话。 */
  function craftUsable(s) {
    return !!s && !s.locked && !(SH.isEquipped && SH.isEquipped(s.id));
  }

  function buildCraft() {
    var pane = $('sh-pane-craft');
    if (!pane) return;
    pane.innerHTML = '';

    var tabs = el('div', 'sh-craft-tabs');
    var synBtn = el('button', 'sh-btn' + (craftState.mode === 'synthesize' ? ' primary' : ''), '合成');
    synBtn.onclick = function () { craftState.mode = 'synthesize'; resetCraft(); buildCraft(); };
    var recBtn = el('button', 'sh-btn' + (craftState.mode === 'recast' ? ' primary' : ''), '重铸');
    recBtn.onclick = function () { craftState.mode = 'recast'; resetCraft(); buildCraft(); };
    tabs.appendChild(synBtn);
    tabs.appendChild(recBtn);
    pane.appendChild(tabs);

    if (craftState.mode === 'synthesize') {
      var hint = el('div', 'sh-draw-info');
      hint.innerHTML = '两个<b>相同套装、相同稀有度</b>的神魂，可合成一个更高一阶（稀有度 +1）的<b>同套装</b>神魂。<br>神话已达顶点，无法再合成。<b>已锁定、已装备</b>的神魂不会出现在候选里。';
      pane.appendChild(hint);

      /* 按钮行：手动两步合成 + 一键合成（按钮上直接标出可合成次数） */
      var actions = el('div', 'sh-craft-actions');
      var go = el('button', 'sh-btn primary', '开始合成');
      go.onclick = openSynthesize;
      actions.appendChild(go);
      var plan = (typeof SH.planAutoSynthesize === 'function') ? SH.planAutoSynthesize() : null;
      var autoBtn = el('button', 'sh-btn auto-synth',
        '⚡ 一键合成' + (plan && plan.total > 0 ? '（' + plan.total + '）' : ''));
      autoBtn.id = 'sh-auto-synthesize';
      autoBtn.disabled = !(plan && plan.total > 0);
      autoBtn.onclick = openAutoSynthesize;
      actions.appendChild(autoBtn);
      pane.appendChild(actions);

      /* 口径前置说明：链式合成、锁定/已装备不参与、执行前会二次确认 */
      pane.appendChild(el('div', 'sh-auto-tip',
        '一键合成会自动配对仓库里所有未锁定、未装备、可合成的神魂；新产出的神魂也会继续向上合成，直到没有可合成组合。已锁定、已装备的神魂不受影响，执行前会先确认。'));
    } else {
      var hint2 = el('div', 'sh-draw-info');
      hint2.innerHTML = '将 1 个神魂<b>重铸</b>为另一个<b>同稀有度</b>的随机神魂（主/副属性随机）。每次消耗 <b>1 个重铸石</b>。<b>已锁定、已装备</b>的神魂无法重铸。';
      pane.appendChild(hint2);
      var go2 = el('button', 'sh-btn primary', '打开重铸面板');
      go2.onclick = openRecast;
      pane.appendChild(go2);
    }
    refreshHeader();
  }
  TAB_BUILDERS.craft = buildCraft;

  /* 重置两步选择状态（切换 tab / 合成完成后调用） */
  function resetCraft() { craftState.first = null; craftState.second = null; }

  /* ==================== 一键合成 ====================
     先展示完整预览（次数 / 各阶明细 / 不受影响件数 / 仓库净变化）再执行。
     口径与逻辑层 planAutoSynthesize 一致：链式合成，锁定 / 已装备一律跳过。 */
  function openAutoSynthesize() {
    var p = (typeof SH.planAutoSynthesize === 'function') ? SH.planAutoSynthesize() : null;
    if (!p || p.total <= 0) { toast('当前没有可自动合成的神魂', 'warn'); return; }

    var lines = [];
    lines.push('共可合成 ' + p.total + ' 次（含新产出的神魂继续向上合成，直到没有可合成组合）。');
    lines.push('明细：' + p.steps.map(function (s) {
      return s.from + '→' + s.to + ' ' + s.pairs + '次';
    }).join('、') + '。');
    lines.push('消耗 ' + p.realConsumed + ' 件现有神魂，仓库净减少 ' + p.total +
      ' 件（合成后共 ' + p.finalBagCount + ' 件）。');
    lines.push('已锁定（' + (p.lockedKept || 0) + ' 件）、已装备（' + (p.equippedKept || 0) + ' 件）的神魂不受影响。');
    lines.push('确定继续吗？');
    var msg = lines.join('\n');

    var run = function () {
      /* 确认期间仓库可能被别的入口改动，重取一次快照 */
      var fresh = (typeof SH.planAutoSynthesize === 'function') ? SH.planAutoSynthesize() : null;
      if (!fresh || fresh.total <= 0) { toast('当前没有可自动合成的神魂', 'warn'); return; }
      var r = SH.autoSynthesize();
      if (!r || !r.ok) { toast('一键合成失败', 'warn'); return; }
      toast('一键合成完成：共 ' + r.count + ' 次，仓库减少 ' + r.count + ' 件');
      resetCraft();
      buildCraft();
      renderBag();
    };

    var confirmFn = (typeof window.showConfirmDialog === 'function') ? window.showConfirmDialog
      : (typeof showConfirmDialog === 'function' ? showConfirmDialog : null);
    if (confirmFn) confirmFn(msg, run);
    else if (window.confirm && window.confirm(msg)) run();
  }

  /* 判断两个神魂是否满足合成前置条件（纯前端判定，与逻辑层 canSynthesize 保持一致） */
  function canPair(a, b) {
    if (!a || !b) return false;
    if (a.id === b.id) return false;
    if (a.setType !== b.setType || a.rarity !== b.rarity) return false;
    if (!craftUsable(a) || !craftUsable(b)) return false;
    return RARITY_ORDER.indexOf(a.rarity) < RARITY_ORDER.length - 1;
  }

  /* 目标稀有度：把 a 与 b 合成后变成什么 */
  function targetRarity(a, b) {
    var idx = RARITY_ORDER.indexOf(a.rarity);
    if (idx < 0 || idx >= RARITY_ORDER.length - 1) return null;
    return RARITY_ORDER[idx + 1];
  }

  /* 构造一个「神魂行」：左侧信息 + 操作按钮组（合成弹窗通用）。
     buttons 为 { text, cls, onClick } 数组；detail 为 true 时附加「详情」按钮。
     onDetail：详情关闭后的回调 —— 合成弹窗用它「返回上一级」，
     否则关闭详情会直接回到神魂主界面，两步流程被打断。 */
  function buildSoulRow(soul, buttons, detail, onDetail) {
    var item = el('div', 'sh-pick-item sh-r' + soul.rarity);
    var left = el('div', 'sh-pick-left');
    left.innerHTML = '<div><b>' + soul.setType + '</b> · <span style="color:' + rarityHex(soul.rarity) + '">' + soul.rarity + '</span> · ' + soul.slot + '号位</div>' +
      '<div class="sh-pick-main">' + attrLabel(soul.main.key) + ' +' + h(soul.main.key, soul.main) + '</div>';
    item.appendChild(left);
    var box = el('div', 'sh-actions');
    if (detail) {
      var dt = el('button', 'sh-btn', '详情');
      dt.onclick = function (ev) { ev.stopPropagation(); showSoulDetail(soul, onDetail); };
      box.appendChild(dt);
    }
    (buttons || []).forEach(function (b) {
      var btn = el('button', b.cls || 'sh-btn primary', b.text);
      btn.onclick = function (ev) { ev.stopPropagation(); b.onClick(soul); };
      box.appendChild(btn);
    });
    item.appendChild(box);
    return item;
  }

  /* 渲染带完整筛选条的选择面板 —— 合成 / 装备 / 重铸共用。
     o.state    ：外部持有的筛选状态对象（刷新时保留选择），缺省用合成的 synState。
                  三处各自持有独立状态，互不污染。
     o.hideTop  ：true 时隐藏「神话」档（合成专属：神话已达顶，无法继续合成）。
     o.list     ：数组，或返回数组的函数（重铸后需重新取仓库快照，故支持函数）。
     o.lockPos  ：装备选择器已按号位限定列表，位置下拉固定为该号位且不可改。
     ★ 位置 / 主属性 / 副属性（多选·取交集）与仓库用的是同一套公共控件和过滤函数。 */
  function renderSelectList(opts) {
    var o = opts || {};
    var st = o.state || synState;
    /* 筛选变化后重绘入口：所有现有调用点都传了，仍留个空函数兜底，防止以后漏传。 */
    if (typeof o.refresh !== 'function') o.refresh = function () {};
    if (o.lockPos) st.pos = String(o.lockPos);
    var src = typeof o.list === 'function' ? o.list() : (o.list || SH.getBag().slice());
    var list = src.slice();
    if (st.rarity !== '全部') list = list.filter(function (s) { return s.rarity === st.rarity; });
    if (st.set !== '全部') list = list.filter(function (s) { return s.setType === st.set; });
    list = filterByExtras(list, st);

    var filter = el('div', 'sh-filter');
    /* 合成场景下神话已到顶、无法继续合成，下拉里直接隐藏该档；
       若状态里残留「神话」（旧数据或切换过场景），一律降级为「全部」。 */
    var rarities = o.hideTop ? RARITY_ORDER.filter(function (r) { return r !== '神话'; }) : RARITY_ORDER.slice();
    if (st.rarity !== '全部' && rarities.indexOf(st.rarity) < 0) st.rarity = '全部';
    if (st.set !== '全部' && !SET_BY_TYPE[st.set]) st.set = '全部';
    if (st.main !== '全部' && ATTR_KEYS.indexOf(st.main) < 0) st.main = '全部';
    if (!o.lockPos && ['全部', '1', '2', '3'].indexOf(st.pos) < 0) st.pos = '全部';
    var selR = el('select');
    ['全部'].concat(rarities).forEach(function (r) {
      var op = el('option', null, r === '全部' ? '全部稀有度' : r);
      op.value = r;
      if (r === st.rarity) op.selected = true;
      selR.appendChild(op);
    });
    selR.onchange = function () { st.rarity = selR.value; o.refresh(); };
    filter.appendChild(selR);

    var selS = el('select');
    var setNames = ['全部'].concat(Object.keys(SET_BY_TYPE));
    setNames.forEach(function (s) {
      var op = el('option', null, s === '全部' ? '全部套装' : s);
      op.value = s;
      if (s === st.set) op.selected = true;
      selS.appendChild(op);
    });
    selS.onchange = function () { st.set = selS.value; o.refresh(); };
    filter.appendChild(selS);

    /* ★ 位置 + 主属性下拉；装备选择器传 lockPos 时位置固定不可改 */
    appendPosMainSelects(filter, st, { lockPos: o.lockPos }, o.refresh);

    if (typeof o.extraFilter === 'function') o.extraFilter(filter);
    o.body.appendChild(filter);
    /* ★ 副属性多选条（取交集），与仓库同款 */
    o.body.appendChild(buildSubFilterRow(st, o.refresh));

    o.body.appendChild(el('div', 'sh-count', '共 ' + list.length + ' 个'));
    if (list.length === 0) {
      o.body.appendChild(el('div', 'sh-empty', o.emptyText || '没有符合条件的神魂。'));
      return;
    }
    var wrap = el('div', 'sh-pick-list');
    /* onDetail 透传：让调用方决定「看完详情回到哪」 */
    list.forEach(function (soul) { wrap.appendChild(buildSoulRow(soul, o.buttons(soul), true, o.onDetail)); });
    o.body.appendChild(wrap);
  }

  function openSynthesize() {
    resetCraft();
    /* 神话已达顶、锁定 / 已装备都不参与；第 1 步候选同样排除 */
    var candidates = SH.getBag().filter(function (s) {
      return craftUsable(s) && s.rarity !== '神话';
    });
    openModal('合成神魂 · 第 1 步 / 共 2 步', function (body, close) {
      if (candidates.length === 0) {
        body.appendChild(el('div', 'sh-empty', '仓库里没有未锁定、未装备的神魂可供合成。'));
        return;
      }
      var step = el('div', 'sh-craft-step', '请选择第 1 个神魂（将锁定「套装 + 稀有度」，第 2 个必须与之相同）');
      /* 用具名函数递归重绘，避免 arguments.callee（严格模式下会抛错）。
         切换筛选、从详情返回都走这一条路径，保证筛选条与列表同步保留状态。 */
      var renderStep1 = function () {
        body.innerHTML = '';
        body.appendChild(step.cloneNode(true));
        renderSelectList({
          list: candidates,
          body: body,
          state: synState, hideTop: true,   // 合成：隐藏「神话」档
          emptyText: '当前筛选条件下没有可选择的神魂。',
          /* 看完详情回到「合成第 1 步」，而不是退回神魂主界面 */
          onDetail: function () { openSynthesize(); },
          refresh: renderStep1,
          buttons: function (soul) {
            return [{ text: '选这个', onClick: function () { craftState.first = soul; openSynthesizeStep2(close); } }];
          }
        });
      };
      renderStep1();
    }, { large: true });
  }

  function openSynthesizeStep2(closeAll) {
    var a = craftState.first;
    if (!a) { closeAll(); openSynthesize(); return; }
    var target = targetRarity(a, a);
    var candidates = SH.getBag().filter(function (s) {
      /* 神话为最高稀有度，无法继续合成；锁定 / 已装备同样排除出候选列表 */
      return s.id !== a.id && craftUsable(s) && s.setType === a.setType &&
             s.rarity === a.rarity && s.rarity !== '神话';
    });
    /* 复用同一个弹窗：只清空 body 并重建，不重建弹窗本身，避免丢失引用。
       从「详情」返回时弹窗层已被 closeModal 隐藏，这里补回 show。 */
    var layer = ensureModalLayer();
    layer.classList.add('show');
    var body = layer.querySelector('.sh-modal-body');
    var head = layer.querySelector('.sh-modal-title');
    if (head) head.textContent = '合成神魂 · 第 2 步 / 共 2 步';
    if (!body) return;
    body.innerHTML = '';

    var tip = el('div', 'sh-craft-tip');
    tip.innerHTML = '已选第 1 个：<b>' + a.setType + '</b> · <span style="color:' + rarityHex(a.rarity) + '">' + a.rarity + '</span>　→　目标：<b>' + a.setType + ' · ' + target + '</b>';
    body.appendChild(tip);

    /* 已选第一个的卡片预览：点击整张卡 = 打开详情（与主入口保持一致） */
    var prev = el('div', 'sh-detail-card sh-r' + a.rarity + ' sh-syn-pick');
    prev.style.cursor = 'pointer';
    prev.innerHTML =
      '<div class="sh-detail-head"><span class="sh-detail-set">' + a.setType + '</span> <span class="sh-detail-rarity" style="color:' + rarityHex(a.rarity) + '">' + a.rarity + '</span></div>' +
      '<div class="sh-detail-slot">' + a.slot + '号位</div>' +
      '<div>主属性：<span class="sh-tag main">' + attrLabel(a.main.key) + ' +' + h(a.main.key, a.main) + '</span></div>' +
      '<div class="sh-syn-tap">点击查看详情</div>';
    /* 看完详情回到「合成第 2 步」 */
    var backToStep2 = function () { openSynthesizeStep2(closeAll); };
    prev.onclick = function () { showSoulDetail(a, backToStep2); };
    body.appendChild(prev);

    var self = this;
    renderSelectList({
      list: candidates,
      body: body,
      state: synState, hideTop: true,   // 与第 1 步共用同一份筛选状态
      emptyText: '没有符合条件的第 2 个神魂。需要另一个「' + a.setType + ' · ' + a.rarity + '」且未锁定、未装备的神魂。',
      onDetail: backToStep2,
      refresh: function () { openSynthesizeStep2(closeAll); },
      buttons: function (soul) {
        return [{ text: '合成 → ' + target, onClick: function (s) {
          if (!canPair(a, s)) { toast('这两个神魂不能合成', 'warn'); return; }
          var r = SH.synthesize(a.id, s.id);
          if (r && r.ok) {
            toast('合成成功：' + a.setType + ' · ' + target);
            resetCraft();
            closeModal();
            buildCraft();
            renderBag();
          } else {
            toast('合成失败：' + ((r && r.reason) || '未知原因'), 'warn');
          }
        } }];
      }
    });

    var back = el('button', 'sh-btn', '← 重新选择第 1 个');
    back.onclick = function () { craftState.first = null; closeModal(); openSynthesize(); };
    body.appendChild(back);
  }

  /* 重铸的筛选状态：模块级持有，刷新列表 / 从详情返回都保留选择。 */
  var recastState = makeFilterState();

  function openRecast() {
    /* 函数取列表：重铸会改写这个神魂，成功后重新取快照才能看到新属性。
       已锁定 / 已装备的神魂不出现在候选里。 */
    var getList = function () { return SH.getBag().filter(craftUsable); };
    openModal('重铸神魂（消耗 1 重铸石）', function (body) {
      var refresh = function () {
        body.innerHTML = '';
        if ((SH.getItem().recastStone || 0) <= 0) {
          body.appendChild(el('div', 'sh-warn', '重铸石不足，每日登录会发放 2 个。'));
        }
        if (getList().length === 0) {
          body.appendChild(el('div', 'sh-empty', '没有可重铸的神魂（已锁定、已装备的除外）'));
          return;
        }
        renderSelectList({
          list: getList,
          state: recastState,
          body: body,
          emptyText: '当前筛选条件下没有可重铸的神魂，可调回「全部」。',
          /* 详情是二级弹窗，关闭后回到重铸列表（筛选条件保留） */
          onDetail: function () { openRecast(); },
          refresh: function () { refresh(); },
          buttons: function (soul) {
            return [{ text: '重铸', cls: 'sh-btn danger', onClick: function (s) {
              var r = SH.recast(s.id);
              /* 重铸成功后不关弹窗：刷新列表即可看到新属性，方便连续重铸 */
              if (r && r.ok) { toast('重铸成功'); refresh(); buildCraft(); renderBag(); }
              else toast('重铸失败：' + (r.reason || ''), 'warn');
            } }];
          }
        });
      };
      refresh();
    }, { large: true });
  }

  /* ==================== 云存档（模块在 cloud-save.js） ====================
     本地存档仍是主数据；未登录时不发任何请求，纯本地游玩不受影响。
     原先的「导入 / 导出」页已移除 —— 换设备改用云存档的上传 / 下载。
     底层 SH.exportJSON() / SH.importJSON() 保留，由 cloud-save.js 作为同步载荷使用。 */
  TAB_BUILDERS.cloud = function () {
    var pane = $('sh-pane-cloud');
    if (!pane) return;
    if (window.CLOUD_SAVE && typeof window.CLOUD_SAVE.render === 'function') window.CLOUD_SAVE.render(pane);
    else pane.innerHTML = '<div class="sh-empty">云存档模块未加载（请确认 cloud-save.js 已引入）</div>';
  };

  /* ==================== 弹窗开关 ==================== */
  /* 退出神魂系统时，把仓库 / 合成 / 重铸 / 装备四个面板的筛选统一恢复默认：
     稀有度、套装、位置、主属性、副属性多选、状态、排序，全部回到初始值。
     只清「筛选」，不动仓库数据、装备状态、合成两步已选的神魂。
     注意：内层弹窗（详情 / 选择器）走的是 closeModal()，不在这里重置。 */
  function resetAllFilters() {
    [bagState, synState, recastState, pickState].forEach(resetFilterState);
  }
  function openModal_() {
    var ov = $('shenhun-overlay');
    if (ov) ov.classList.add('show');
    SH.dailyLogin();
    /* 双保险：即使上次没走 closeModal_，重新打开也是干净状态 */
    resetAllFilters();
    refreshHeader();
    switchTab('bag');
  }
  function closeModal_() {
    var ov = $('shenhun-overlay');
    if (ov) ov.classList.remove('show');
    resetAllFilters();
    /* 面板已隐藏但 DOM 还在，立刻按默认状态重绘，避免残留上次的筛选结果 */
    renderBag();
  }

  /* 订阅：仓库变化（分解、合成、重铸、抽卡后）自动刷新当前页 */
  if (typeof SH.subscribe === 'function') {
    SH.subscribe(function () { refreshHeader(); });
  }

  /* ==================== 绑定 ==================== */
  function bind() {
    var btn = $('shenhun-btn');
    if (btn && !btn._shBound) {
      btn._shBound = true;
      btn.onclick = openModal_;
    }
    var closeBtn = $('shenhun-close');
    if (closeBtn && !closeBtn._shBound) {
      closeBtn._shBound = true;
      closeBtn.onclick = closeModal_;
    }
    document.querySelectorAll('#shenhun-tabs .sh-tab').forEach(function (tab) {
      tab.onclick = function () { switchTab(tab.getAttribute('data-tab')); };
    });
    var ov = $('shenhun-overlay');
    if (ov) ov.addEventListener('click', function (ev) { if (ev.target === ov) closeModal_(); });
  }

  function init() {
    bind();
    /* 默认构建一次仓库，避免首开空白 */
    renderBag();
    refreshHeader();
    return true;
  }

  /* 暴露给 game.js（game.js 末尾会调用） */
  window.initShenhunUI = init;
  window.openShenhun = openModal_;
  window.SHENHUN_UI = {
    open: openModal_, close: closeModal_, refreshHeader: refreshHeader,
    /* 供 cloud-save.js 复用：下载存档后立刻刷新仓库页与提示条 */
    renderBag: renderBag, toast: toast,
    switchTab: switchTab,
    /* 供 game.js 的角色详情「神魂」标签页使用 */
    renderHeroSoulConfig: renderHeroSoulConfig
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
