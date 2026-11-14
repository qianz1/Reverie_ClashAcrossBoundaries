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

  /* ---------------- 神魂贴图 ----------------
     路径 assets/shenhun/套装拼音.png（首字母大写、逐字连写，如 ZhaoCai.png）。
     「狱门疆」按约定用 v 表示 ü，文件名为 YvMenJiang.png。
     新增套装时只需在这里加一行；没有映射的套装名会保持原来的文字卡片。
     <img> 只有真正加载成功才给卡片加 .has-art，加载失败时所有贴图样式都不生效，
     卡片自动回到原来的「套装名 + 号位 + 装备者」布局，不会出现破图或空白方块。 */
  var SOUL_ART_BASE = 'assets/shenhun/';
  var SOUL_ART_FILE = {
    '百穿': 'BaiChuan',
    '束缚': 'ShuFu',
    '无双': 'WuShuang',
    '怒源': 'NuYuan',
    '招财': 'ZhaoCai',
    '心魔': 'XinMo',
    '狱门疆': 'YvMenJiang'
  };
  function soulArtSrc(setType) {
    var f = SOUL_ART_FILE[setType];
    return f ? SOUL_ART_BASE + f + '.png' : '';
  }
  /* 供 ?imgcheck=1 自检面板逐张探测，定位缺图 / 后缀不符最方便。 */
  function soulArtCheckList() {
    return Object.keys(SOUL_ART_FILE).map(function (n) {
      return { label: n + ' · 神魂贴图', src: soulArtSrc(n) };
    });
  }

  /* ---------------- DOM 工具 ---------------- */
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }
  function h(type, payload) { return SH.formatAttr(type, payload.value != null ? payload.value : payload); }
  /* 详情弹窗里的属性数值统一带正号（+55.0% / +34.2）。
     formatAttr 本身不带符号；这里仍做一次防重复，将来若返回带符号值也不会变成 ++。 */
  function plusVal(v) {
    var s = String(v);
    return (/^[+-]/.test(s) ? '' : '+') + s;
  }

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

  /* 神魂卡片（正方形）—— 全项目唯一的神魂展示单元：
     仓库 / 抽卡结果 / 合成 / 重铸 / 装备 / 角色详情都用它，视觉完全统一。
     · 贴图加载成功 → 只留「套装名·x号位」标签（如 招财·1号位），
       贴在卡片内部下方、与贴图分区互不遮挡；
     · 贴图缺失 / 加载失败 → 回到原布局「套装名 + 号位 + 装备者名字」。
     稀有度仍由外框发光表达，已装备的号位文字仍为金色，locked 金框也不变。
     opts（可选对象，传 false 也兼容旧调用）：
       empty / slot / emptyText —— 画一个虚线「+ 装备」空槽卡片；
       onClick                 —— 覆盖默认的「打开详情」；
       extraClass              —— 追加到卡片 class。
     操作按钮不塞进卡片里（会遮贴图），由 buildSoulCell 放在卡片下方。 */
  function buildSoulCard(soul, opts) {
    opts = (opts && typeof opts === 'object') ? opts : {};

    /* 空号位：同样尺寸的方框卡片，虚线边 + 「+ 装备」。没有 data-soul-id，
       因此不会被详情弹窗的锚点 / 选中描边误认成一张真实神魂。 */
    if (opts.empty) {
      var ec = el('div', 'sh-soul-card sh-empty-slot' + (opts.extraClass ? ' ' + opts.extraClass : ''));
      var ei = el('div', 'sh-card-inner');
      ei.appendChild(el('div', 'sh-empty-plus', '+'));
      ei.appendChild(el('div', 'sh-empty-label', opts.emptyText || '装备'));
      ei.appendChild(el('div', 'sh-empty-slotno', opts.slot + '号位'));
      ec.appendChild(ei);
      ec.onclick = function () { if (typeof opts.onClick === 'function') opts.onClick(); };
      return ec;
    }

    var owner = SH.findEquipOwner ? SH.findEquipOwner(soul.id) : null;
    var card = el('div', 'sh-soul-card sh-r' + soul.rarity + (opts.extraClass ? ' ' + opts.extraClass : ''));
    /* 供详情弹窗定位锚点与选中描边使用；重绘（锁定 / 分解后）也能按 id 还原选中态。 */
    card.setAttribute('data-soul-id', soul.id);
    if (selectedSoulId != null && String(selectedSoulId) === String(soul.id)) card.classList.add('selected');
    if (owner || SH.isEquipped(soul.id)) card.classList.add('equipped');
    if (soul.locked) card.classList.add('locked');

    var inner = el('div', 'sh-card-inner');
    inner.appendChild(el('div', 'sh-set', soul.setType));
    /* 号位标签：贴图模式下显示「套装名·x号位」（例：招财·1号位）。
       前缀放在独立 span 里，旧 UI 回退时由 CSS 隐藏 —— 那样仍是
       「套装名」一行 + 「x号位」一行，不会出现重复的套装名。 */
    var slotEl = el('div', 'sh-slot');
    slotEl.appendChild(el('span', 'sh-slot-set', soul.setType + '·'));
    /* 「x号位」独立成段：贴图模式下这段永不压缩、永不省略，
       空间实在不够时只省略前面的套装名前缀。 */
    slotEl.appendChild(el('span', 'sh-slot-pos', soul.slot + '号位'));
    inner.appendChild(slotEl);
    /* 直接写装备者名字，不加「装备：」前缀 —— 正方形卡片空间有限 */
    if (owner) inner.appendChild(el('div', 'sh-card-owner', heroDisplayName(owner.role)));
    card.appendChild(inner);

    var src = soulArtSrc(soul.setType);
    if (src) {
      var img = el('img', 'sh-card-art');
      img.alt = '';
      img.decoding = 'async';
      /* 先绑事件再赋 src，避免缓存命中时错过 onload。
         只有成功解码才切换；失败什么都不做 → 旧 UI 原样保留。 */
      img.onload = function () { card.classList.add('has-art'); };
      img.onerror = function () { card.classList.remove('has-art'); };
      card.insertBefore(img, card.firstChild);
      img.src = src;
    }

    /* 默认点击整张卡片 = 打开详情（与仓库一致，详情按钮已统一取消）。
       详情用独立层，下面的界面原样保留，关闭后自然回到原处，无需任何「返回」回调。
       只有空槽卡会传自定义 onClick 去打开装备选择器。 */
    card.onclick = function () {
      if (typeof opts.onClick === 'function') opts.onClick(soul);
      else showSoulDetail(soul);
    };
    return card;
  }

  /* 方框卡片单元 = 可选小标题 + 卡片 + 卡片下方的竖排按钮条。
     ★ 详情按钮已统一取消：所有真实神魂卡片都是「点卡片 = 看详情」。
       按钮条只留各面板自己的主操作（更换 / 装备 / 选这个 / 合成 / 重铸 / 卸下），
       放在卡片外面，既保住贴图和「xx·x号位」标签的完整显示，也仍一键可达。
       空槽卡没有详情可看，走自定义 onClick 打开装备选择器。
       onDetail 现在只是「详情关闭后的轻量回调」，不再重建弹窗。 */
  function buildSoulCell(soul, opts) {
    opts = opts || {};
    var cell = el('div', 'sh-soul-cell');
    if (opts.note) cell.appendChild(el('div', 'sh-soul-cell-note', opts.note));
    var cardOpts = {};
    Object.keys(opts).forEach(function (k) { cardOpts[k] = opts[k]; });
    if (typeof opts.onClick !== 'function') {
      cardOpts.onClick = function (s) { showSoulDetail(s, opts.onDetail); };
    }
    cell.appendChild(buildSoulCard(soul, cardOpts));
    var acts = (opts.buttons || []).slice();
    if (acts.length) {
      var bar = el('div', 'sh-soul-cell-actions');
      acts.forEach(function (b) {
        var btn = el('button', b.cls || 'sh-btn primary', b.text);
        btn.onclick = function (ev) { ev.stopPropagation(); b.onClick(soul); };
        bar.appendChild(btn);
      });
      cell.appendChild(bar);
    }
    return cell;
  }

  /* ==================== 详情弹窗：独立层 + 小窗避让 + 选中卡片描边 ====================
     点任意面板里的方形卡片时，把这张卡片记成「当前选中」并加金色描边；
     详情弹窗缩成小窗，自动放到不与它重叠的位置（右 → 左 → 下 → 上择优）。
     ★ 详情用独立层 #sh-detail-overlay，叠在选择器弹窗之上：
       打开详情不再清空选择器，所以「当前筛选界面」始终留在背景里；
       关闭详情只隐藏这一层，直接回到原界面，不再靠回调重建弹窗，
       也就没有了以前「先退回主界面、再回到筛选界面」的跳变。 */
  var selectedSoulId = null;
  var detailLayer = null;
  var detailOnClose = null;
  var detailDirty = false;          // 详情里改过数据（锁定 / 分解）才需要刷新下面的选择列表
  var activeSelectRefresh = null;   // 当前选择器列表的重绘函数，由 renderSelectList 注册

  function ensureDetailLayer() {
    if (detailLayer && document.body.contains(detailLayer)) return detailLayer;
    detailLayer = document.createElement('div');
    detailLayer.id = 'sh-detail-overlay';
    document.body.appendChild(detailLayer);
    detailLayer.addEventListener('click', function (ev) {
      if (ev.target === detailLayer) closeDetail();
    });
    return detailLayer;
  }
  /* 只收起，不触发 onClose —— 供关闭外层弹窗 / 退出神魂系统时兜底。 */
  function dismissDetail() {
    if (detailLayer) {
      detailLayer.classList.remove('show');
      detailLayer.innerHTML = '';
    }
    clearSelectedCard();
  }
  /* 关闭详情：收起 → 执行轻量回调 → 仅当改过数据时刷新下面的选择器列表。
     正常「看一眼就关」不会重建任何弹窗，筛选与滚动位置原样保留。 */
  function closeDetail() {
    var dirty = detailDirty;
    dismissDetail();
    detailDirty = false;
    var fn = detailOnClose; detailOnClose = null;
    if (typeof fn === 'function') { try { fn(); } catch (e) { console.warn('[神魂UI] 详情 onClose 出错', e); } }
    if (dirty && modalLayer && modalLayer.classList.contains('show') &&
        typeof activeSelectRefresh === 'function') {
      try { activeSelectRefresh(); } catch (e) { console.warn('[神魂UI] 选择列表刷新出错', e); }
    }
  }

  function selectedCardEl() {
    if (selectedSoulId == null) return null;
    var all = document.querySelectorAll('.sh-soul-card');
    for (var i = 0; i < all.length; i++) {
      var c = all[i];
      if (c.getAttribute('data-soul-id') !== String(selectedSoulId)) continue;
      var r = c.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return c;   // 隐藏容器里的卡片不算锚点
    }
    return null;
  }
  function markSelectedCard(soul) {
    document.querySelectorAll('.sh-soul-card.selected').forEach(function (c) {
      c.classList.remove('selected');
    });
    selectedSoulId = (soul && soul.id != null) ? soul.id : null;
    var c = selectedCardEl();
    if (c) c.classList.add('selected');
    return c;
  }
  function clearSelectedCard() {
    document.querySelectorAll('.sh-soul-card.selected').forEach(function (c) {
      c.classList.remove('selected');
    });
    selectedSoulId = null;
  }

  /* 小窗定位：四个候选先 clamp 进视口（保证完整可见），再取与锚点矩形
     重叠面积最小的一个。坐标用弹窗层的 rect 换算，layer 不铺满时也正确。 */
  function placeDetailModal(modal, anchor) {
    if (!anchor) return;                            // 无锚点 → 保持 CSS 居中
    var r = anchor.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) return;
    var base = (modal.parentNode || document.body).getBoundingClientRect();
    var vw = window.innerWidth || document.documentElement.clientWidth;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var mw = modal.offsetWidth, mh = modal.offsetHeight;
    if (!mw || !mh) return;
    var gap = 12, pad = 10;
    var cx = r.left + r.width / 2 - mw / 2;
    var clampX = function (x) { return Math.max(pad, Math.min(x, vw - mw - pad)); };
    var clampY = function (y) { return Math.max(pad, Math.min(y, vh - mh - pad)); };
    var cands = [
      { x: r.right + gap, y: r.top },             // 右侧优先
      { x: r.left - mw - gap, y: r.top },         // 左侧
      { x: cx, y: r.bottom + gap },               // 下方
      { x: cx, y: r.top - mh - gap }              // 上方
    ];
    var best = null;
    cands.forEach(function (c) {
      var x = clampX(c.x), y = clampY(c.y);
      var ox = Math.max(0, Math.min(x + mw, r.right) - Math.max(x, r.left));
      var oy = Math.max(0, Math.min(y + mh, r.bottom) - Math.max(y, r.top));
      var overlap = ox * oy;
      if (!best || overlap < best.overlap - 0.5) best = { x: x, y: y, overlap: overlap };
    });
    if (!best) return;
    modal.style.left = Math.round(best.x - base.left) + 'px';
    modal.style.top = Math.round(best.y - base.top) + 'px';
    modal.style.transform = 'none';
  }
  /* 窗口尺寸变化时重新避让（卡片会跟着网格重排）。 */
  window.addEventListener('resize', function () {
    if (!detailLayer || !detailLayer.classList.contains('show')) return;
    var m = detailLayer.querySelector('.sh-modal-detail');
    if (m) placeDetailModal(m, selectedCardEl());
  });

  /* 通用弹窗（选择器 / 合成 / 重铸 / 装备）。
     弹窗层只有一份（layer.innerHTML=''），新弹窗会顶掉旧的。
     详情小窗已改用独立层 #sh-detail-overlay，不再走这里，也就不会顶掉选择器。
     opts.onClose 仍保留为「关闭该弹窗时触发一次」的通用回调。 */
  var modalOnClose = null;
  function openModal(titleText, buildBody, opts) {
    opts = opts || {};
    if (detailLayer && detailLayer.classList.contains('show')) dismissDetail();
    var layer = ensureModalLayer();
    layer.innerHTML = '';
    layer.classList.remove('sh-detail-mode');
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
    /* 兜底：关外层弹窗时若详情还开着，先静默收起，避免小窗浮在已关闭界面上 */
    if (detailLayer && detailLayer.classList.contains('show')) dismissDetail();
    if (modalLayer) {
      modalLayer.classList.remove('show');
      modalLayer.classList.remove('sh-detail-mode');
    }
    activeSelectRefresh = null;
    clearSelectedCard();
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
    }

    lock.onclick = function (ev) {
      ev.stopPropagation();
      /* setLocked 内部已就地修改 soul.locked，切勿再手动翻转，否则会被改回原值 */
      SH.setLocked(soul.id, !soul.locked);
      detailDirty = true;
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
      detailDirty = true;
      renderBag();
      closeDetail();
      toast('已分解');
    };

    box.appendChild(lock);
    box.appendChild(d);
    return box;
  }

  /* onClose：详情关闭后的「轻量回调」（可选）。
     现在详情用独立层，下面的界面原样保留，所以回调只用来刷新视图
     （如装备页反映锁定 / 分解），不再负责重建任何弹窗。
     详情按精简口径呈现：不显示编号 / 装备者，不标注「主属性·副属性」字样，
     套装效果直接写文字，也不再单独开带标题、角标、达成情况的 UI 区块。 */
  function showSoulDetail(soul, onClose) {
    /* 以当前可见的这张方形卡片为锚点：小窗避开它，同时给它加金色描边。 */
    var anchor = markSelectedCard(soul);
    detailOnClose = typeof onClose === 'function' ? onClose : null;
    detailDirty = false;

    var layer = ensureDetailLayer();
    layer.innerHTML = '';
    var modal = el('div', 'sh-modal sh-modal-detail');
    var body = el('div', 'sh-modal-body');
    modal.appendChild(body);
    layer.appendChild(modal);
    layer.classList.add('show');

    var sub = el('div', 'sh-detail-card sh-r' + soul.rarity);
    var head = el('div', 'sh-detail-head');
    head.innerHTML = '<span class="sh-detail-set">' + soul.setType + '</span>' +
      ' <span class="sh-detail-rarity" style="color:' + rarityHex(soul.rarity) + '">' + soul.rarity + '</span>';
    sub.appendChild(head);
    sub.appendChild(el('div', 'sh-detail-slot', soul.slot + '号位'));

    /* 主属性与副属性放同一组行、统一间距，不再写「主属性：」「副属性」标题。
       主属性也不再单独开 pill 标签：与副属性一样是「名称 + 数值」两列。
       主属性行挂 -main 标记：整行（名称 + 数值）走金色，副属性数值跟随行文字色，
       两者只靠颜色区分，不加标签、不改结构。 */
    var attrs = el('div', 'sh-detail-attrs');
    var mainRow = el('div', 'sh-detail-attr sh-detail-attr-main');
    mainRow.innerHTML = '<span>' + attrLabel(soul.main.key) + '</span>' +
      '<span class="sh-val">' + plusVal(h(soul.main.key, soul.main)) + '</span>';
    attrs.appendChild(mainRow);
    soul.subs.forEach(function (s) {
      var row = el('div', 'sh-detail-attr');
      row.innerHTML = '<span>' + attrLabel(s.key) + '</span>' +
        '<span class="sh-val">' + plusVal(h(s.key, s)) + '</span>';
      attrs.appendChild(row);
    });
    sub.appendChild(attrs);

    /* 套装效果：直接写 1 件 / 2 件文字，不单独开 UI 区块。 */
    var set = SET_BY_TYPE[soul.setType];
    if (set) {
      var fx = el('div', 'sh-detail-fx');
      [['1', set.one || set['1']], ['2', set.two || set['2']]].forEach(function (p) {
        if (p[1]) fx.appendChild(el('div', 'sh-detail-fx-line', p[0] + '件：' + p[1]));
      });
      sub.appendChild(fx);
    }
    sub.appendChild(buildDetailActions(soul));
    body.appendChild(sub);

    /* 先填内容再定位：内容决定弹窗高度，量到的 mh 才准。 */
    placeDetailModal(modal, anchor);
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
    /* 三个号位与仓库同款方框卡片：已装备显示贴图卡，空位显示虚线「+ 装备」卡。
       ★ 点已装备的卡片 = 看详情；「更换 / 卸下」放在卡片下方按钮条。
       点空槽卡（或它的「装备」按钮）= 打开选择器，因为空位没有详情可看。 */
    var grid = el('div', 'sh-soul-grid sh-grid-fixed sh-equip-grid');
    var slots = ['1', '2', '3'];
    slots.forEach(function (slot) {
      /* 按「号位」取神魂：不能用 cur[slot] 直接下标数组（'1' 落在 0/1/2 的数组上是取不到的） */
      var soul = SH.getSlotSoul ? SH.getSlotSoul(equipState.hero, slot)
                                : (SH.getSoul ? SH.getSoul((SH.getEquip(equipState.hero) || [])[Number(slot) - 1]) : null);
      var open = function () { openEquipPicker(equipState.hero, slot); };
      if (soul) {
        grid.appendChild(buildSoulCell(soul, {
          /* 详情是独立层，装备页一直留在背景里；关闭后刷新以反映锁定 / 分解。 */
          onDetail: function () { refreshEquipViews(); },
          buttons: [
            { text: '更换', cls: 'sh-btn primary', onClick: open },
            { text: '卸下', cls: 'sh-btn danger sh-slot-off', onClick: function () {
              SH.unequipSoul(equipState.hero, slot);
              toast('已卸下');
              refreshEquipViews();
            } }
          ]
        }));
      } else {
        grid.appendChild(buildSoulCell(null, {
          empty: true, slot: slot, emptyText: '装备',
          onClick: open,
          buttons: [{ text: '装备', cls: 'sh-btn primary', onClick: open }]
        }));
      }
    });
    pane.appendChild(grid);

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
          /* 详情是独立层，选择器一直留在背景里，关闭详情无需重建、筛选与滚动位置都不动。
             从角色详情进入时把 onChanged 一路带回去，装备成功后仍能重绘详情页。 */
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

    /* 与仓库同款方框卡片：★ 点已装备的卡片 = 看详情（不再是「更换」），
       「更换 / 卸下」放到卡片下方按钮条；空槽卡仍走装备选择器。
       详情是独立层，本页始终留在背景里，关闭后只重绘一次以反映锁定 / 分解。 */
    var grid = el('div', 'sh-soul-grid sh-grid-fixed sh-hero-soul-grid');
    ['1', '2', '3'].forEach(function (slot) {
      var soul = SH.getSlotSoul ? SH.getSlotSoul(hero, slot) : null;
      var open = function () { openEquipPicker(hero, slot, changed); };
      if (soul) {
        grid.appendChild(buildSoulCell(soul, {
          /* 关闭详情后重绘本页：锁定 / 分解等操作也要同步反映 */
          onDetail: changed,
          buttons: [
            { text: '更换', cls: 'sh-btn primary', onClick: open },
            { text: '卸下', cls: 'sh-btn danger', onClick: function () {
              SH.unequipSoul(hero, slot);
              toast('已卸下');
              refreshEquipViews(changed);
            } }
          ]
        }));
      } else {
        grid.appendChild(buildSoulCell(null, {
          empty: true, slot: slot, emptyText: '装备',
          onClick: open,
          buttons: [{ text: '装备', cls: 'sh-btn primary', onClick: open }]
        }));
      }
    });
    container.appendChild(grid);

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

  /* 合成 / 重铸 / 装备选择器的候选单元 —— 与仓库同款方框卡片。
     ★ 详情按钮已取消：点卡片 = 看详情（独立层，选择器原样留在背景里）。
       按钮条只留该面板的主操作（选这个 / 合成 / 重铸 / 装备）。
     签名保留兼容（detail / onDetail 已不再用于重建弹窗）：
     详情关闭不再触发「返回上一级」，因为根本没离开过。 */
  function buildSoulRow(soul, buttons, detail, onDetail) {
    return buildSoulCell(soul, {
      onDetail: null,
      buttons: buttons || []
    });
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
    /* 筛选变化后重绘入口：所有现有调用点都传了，仍留个空函数兜底，防止以后漏传。
       注册为「当前选择列表」的重绘函数：只有详情里真的改了数据（锁定 / 分解）
       且选择器还开着时，关闭详情才会调它一次；正常看一眼就关完全不重建。 */
    if (typeof o.refresh !== 'function') o.refresh = function () {};
    activeSelectRefresh = o.refresh;
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
    /* 与仓库同款卡片网格（列宽固定，弹窗再宽也不会把卡片拉成大块）。
       点卡片看详情时详情是独立层，本列表原样留在背景里，无需「返回」回调。 */
    var wrap = el('div', 'sh-soul-grid sh-grid-fixed sh-pick-grid');
    list.forEach(function (soul) { wrap.appendChild(buildSoulRow(soul, o.buttons(soul), true, null)); });
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
          /* 详情是独立层，本步列表原样留在背景里，关闭详情不重建、不重置筛选 */
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
       筛选变化 / 数据变更时会再走一次这里；详情已改用独立层，不会顶掉它。 */
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

    /* 已选第 1 个：与候选列表同款方框卡片，点卡片 = 看详情。
       详情是独立层，第 2 步界面原样留在背景里，无需「返回」回调。 */
    var prevWrap = el('div', 'sh-soul-grid sh-grid-fixed sh-syn-prev');
    prevWrap.appendChild(buildSoulCell(a, { note: '已选第 1 个' }));
    body.appendChild(prevWrap);

    renderSelectList({
      list: candidates,
      body: body,
      state: synState, hideTop: true,   // 与第 1 步共用同一份筛选状态
      emptyText: '没有符合条件的第 2 个神魂。需要另一个「' + a.setType + ' · ' + a.rarity + '」且未锁定、未装备的神魂。',
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
          /* 详情是独立层，重铸列表原样留在背景里，关闭详情不重建、筛选保留 */
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
    /* 双保险：即使上次没走 closeModal_，重新打开也是干净状态 */
    if (modalLayer && modalLayer.classList.contains('show')) closeModal();
    if (detailLayer && detailLayer.classList.contains('show')) dismissDetail();
    var ov = $('shenhun-overlay');
    if (ov) ov.classList.add('show');
    SH.dailyLogin();
    resetAllFilters();
    refreshHeader();
    switchTab('bag');
  }
  function closeModal_() {
    /* 退出神魂系统时，把可能还开着的选择器弹窗与详情小窗一并收起，
       避免弹窗浮在已关闭的界面上、或下次打开时残留上次的状态。 */
    if (modalLayer && modalLayer.classList.contains('show')) closeModal();
    if (detailLayer && detailLayer.classList.contains('show')) dismissDetail();
    activeSelectRefresh = null;
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
    renderHeroSoulConfig: renderHeroSoulConfig,
    /* 供 ?imgcheck=1 自检面板探测 7 张神魂贴图 */
    soulArtSrc: soulArtSrc, imgCheckList: soulArtCheckList
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
