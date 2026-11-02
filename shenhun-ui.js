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

  /* ==================== 仓库 ==================== */
  var bagState = { rarity: '全部', set: '全部', sort: 'rarity', only: '全部' };

  function sortedBag() {
    var list = SH.getBag().slice();
    var r = bagState.rarity, s = bagState.set, o = bagState.only;
    if (r !== '全部') list = list.filter(function (soul) { return soul.rarity === r; });
    if (s !== '全部') list = list.filter(function (soul) { return soul.setType === s; });
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

  /* 神魂卡片（正方形）：只显示「套装名 + 号位」，稀有度由外框发光颜色表达。
     withActions 参数已废弃 —— 操作按钮统一移到详情弹窗右上角。 */
  function buildSoulCard(soul, withActions) {
    var card = el('div', 'sh-soul-card sh-r' + soul.rarity);
    if (SH.isEquipped(soul.id)) card.classList.add('equipped');
    if (soul.locked) card.classList.add('locked');

    var inner = el('div', 'sh-card-inner');
    inner.appendChild(el('div', 'sh-set', soul.setType));
    inner.appendChild(el('div', 'sh-slot', soul.slot + '号位'));
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
    [['1', set.one || set['1']], ['2', set.two || set['2']]].forEach(function (p) {
      if (!p[1]) return;
      var need = Number(p[0]);
      var on = cnt >= need;
      var row = el('div', 'sh-setfx-row' + (on ? ' on' : ''));
      row.innerHTML = '<span class="sh-setfx-piece">' + need + '件</span>' +
        '<span class="sh-setfx-desc">' + p[1] + '</span>' +
        (on ? '<span class="sh-setfx-on">已生效</span>' : '');
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

    var list = sortedBag();
    if (list.length === 0) {
      pane.appendChild(el('div', 'sh-empty', '仓库空空如也，去抽卡获得神魂吧'));
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
      /* 按「号位」取神魂：不能用 cur[slot] 直接下标数组（'1' 落在 0/1/2 的数组上是取不到的） */
      var soul = SH.getSlotSoul ? SH.getSlotSoul(equipState.hero, slot)
                                : (SH.getSoul ? SH.getSoul((SH.getEquip(equipState.hero) || [])[Number(slot) - 1]) : null);
      if (soul) {
        box.classList.add('filled', 'sh-r' + soul.rarity);
        box.innerHTML = '<span class="sl" style="color:' + rarityHex(soul.rarity) + '">' + soul.setType + '</span>' +
          '<span class="smain">' + attrLabel(soul.main.key) + ' +' + h(soul.main.key, soul.main) + '</span>';
        var off = el('button', 'sh-btn sh-slot-off', '卸下');
        off.onclick = function (ev) {
          ev.stopPropagation();
          SH.unequipSoul(equipState.hero, slot);
          toast('已卸下');
          buildEquip();
        };
      } else {
        box.appendChild(el('span', 'sl', '+ 装备'));
      }
      box.onclick = function () { openEquipPicker(equipState.hero, slot); };
      /* 顺序：槽位框在前，「卸下」在后。
         原来是先 append 卸下按钮、再 insertBefore 把框插到它前面，
         没装神魂时 lastChild 是「1号位」标签，框会被插到标签前面去。 */
      row.appendChild(box);
      if (off) row.appendChild(off);
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
        if (cnt >= 1 && one) eff.push('1件：' + one);
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

  function openEquipPicker(hero, slot) {
    var list = SH.getBag().filter(function (s) {
      return String(s.slot) === String(slot) && !SH.isEquipped(s.id);
    });
    openModal('选择 ' + slot + '号位 神魂', function (body) {
      if (list.length === 0) {
        body.appendChild(el('div', 'sh-empty', '没有可用的 ' + slot + '号位 神魂，去抽卡或先卸下其他角色的同位置神魂。'));
        return;
      }
      var wrap = el('div', 'sh-pick-list');
      list.forEach(function (soul) {
        var item = el('div', 'sh-pick-item sh-r' + soul.rarity);
        var left = el('div', 'sh-pick-left');
        left.innerHTML = '<div><b>' + soul.setType + '</b> <span style="color:' + rarityHex(soul.rarity) + '">' + soul.rarity + '</span></div>' +
          '<div class="sh-pick-main">' + attrLabel(soul.main.key) + ' +' + h(soul.main.key, soul.main) + '</div>';
        item.appendChild(left);
        /* 详情按钮：先看清套装效果与副属性再决定装不装。
           详情是二级弹窗（会顶掉本选择器），故关闭时回调重建选择器，形成"返回"。 */
        var btns = el('div', 'sh-pick-btns');
        var info = el('button', 'sh-btn', '详情');
        info.onclick = function (ev) {
          ev.stopPropagation();
          showSoulDetail(soul, function () { openEquipPicker(hero, slot); });
        };
        btns.appendChild(info);
        var pick = el('button', 'sh-btn primary', '装备');
        pick.onclick = function () {
          var r = SH.equipSoul(hero, slot, soul.id);
          if (r && !r.ok) { toast(r.reason || '装备失败', 'warn'); return; }
          toast('已装备');
          closeModal();
          buildEquip();
        };
        btns.appendChild(pick);
        item.appendChild(btns);
        wrap.appendChild(item);
      });
      body.appendChild(wrap);
    }, { large: true });
  }

  /* ==================== 合成 / 重铸 ==================== */
  /* 合成交互：两步选择
     第 1 步：从仓库里选第一个神魂（作为基准，锁定「套装 + 稀有度」）
     第 2 步：从【同套装 + 同稀有度 + 未锁定 + 未被选为第 1 个】的候选里选第二个
     第二步页会显式提示「目标：XX · 目标稀有度」，并高亮当前选中的第一个。 */
  var craftState = { mode: 'synthesize', first: null, second: null };
  /* 合成面板筛选状态（独立于仓库筛选） */
  var synState = { rarity: '全部', set: '全部' };

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
      hint.innerHTML = '两个<b>相同套装、相同稀有度</b>的神魂，可合成一个更高一阶（稀有度 +1）的<b>同套装</b>神魂。<br>神话已达顶点，无法再合成。请先选一个神魂作为基准。';
      pane.appendChild(hint);
      var go = el('button', 'sh-btn primary', '开始合成');
      go.onclick = openSynthesize;
      pane.appendChild(go);
    } else {
      var hint2 = el('div', 'sh-draw-info');
      hint2.innerHTML = '将 1 个神魂<b>重铸</b>为另一个<b>同稀有度</b>的随机神魂（主/副属性随机）。每次消耗 <b>1 个重铸石</b>。已锁定的神魂无法重铸。';
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

  /* 判断两个神魂是否满足合成前置条件（纯前端判定，与逻辑层 canSynthesize 保持一致） */
  function canPair(a, b) {
    if (!a || !b) return false;
    if (a.id === b.id) return false;
    if (a.setType !== b.setType || a.rarity !== b.rarity) return false;
    if (a.locked || b.locked) return false;
    return RARITY_ORDER.indexOf(a.rarity) < RARITY_ORDER.length - 1;
  }

  /* 目标稀有度：把 a 与 b 合成后变成什么 */
  function targetRarity(a, b) {
    var idx = RARITY_ORDER.indexOf(a.rarity);
    if (idx < 0 || idx >= RARITY_ORDER.length - 1) return null;
    return RARITY_ORDER[idx + 1];
  }

  /* 构造一个「神魂行」：左侧信息 + 操作按钮组（合成弹窗通用）。
     buttons 为 { text, cls, onClick } 数组；detail 为 true 时附加「详情」按钮。 */
  function buildSoulRow(soul, buttons, detail) {
    var item = el('div', 'sh-pick-item sh-r' + soul.rarity);
    var left = el('div', 'sh-pick-left');
    left.innerHTML = '<div><b>' + soul.setType + '</b> · <span style="color:' + rarityHex(soul.rarity) + '">' + soul.rarity + '</span> · ' + soul.slot + '号位</div>' +
      '<div class="sh-pick-main">' + attrLabel(soul.main.key) + ' +' + h(soul.main.key, soul.main) + '</div>';
    item.appendChild(left);
    var box = el('div', 'sh-actions');
    if (detail) {
      var dt = el('button', 'sh-btn', '详情');
      dt.onclick = function (ev) { ev.stopPropagation(); showSoulDetail(soul); };
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

  /* 渲染带「稀有度 + 套装」筛选条的选择面板（合成两步共用） */
  function renderSelectList(opts) {
    var o = opts || {};
    var list = o.list || SH.getBag().slice();
    if (synState.rarity !== '全部') list = list.filter(function (s) { return s.rarity === synState.rarity; });
    if (synState.set !== '全部') list = list.filter(function (s) { return s.setType === synState.set; });

    var filter = el('div', 'sh-filter');
    /* 神话已到顶、无法合成，筛选下拉中直接隐藏该档，避免用户选到无意义的组合。
       若当前选中值恰好是「神话」（如旧存档残留），也一并降级为「全部」。 */
    var SYNC_RARITIES = RARITY_ORDER.filter(function (r) { return r !== '神话'; });
    if (synState.rarity === '神话') synState.rarity = '全部';
    var selR = el('select');
    ['全部'].concat(SYNC_RARITIES).forEach(function (r) {
      var op = el('option', null, r === '全部' ? '全部稀有度' : r);
      op.value = r;
      if (r === synState.rarity) op.selected = true;
      selR.appendChild(op);
    });
    selR.onchange = function () { synState.rarity = selR.value; o.refresh(); };
    filter.appendChild(selR);

    var selS = el('select');
    var setNames = ['全部'].concat(Object.keys(SET_BY_TYPE));
    setNames.forEach(function (s) {
      var op = el('option', null, s === '全部' ? '全部套装' : s);
      op.value = s;
      if (s === synState.set) op.selected = true;
      selS.appendChild(op);
    });
    selS.onchange = function () { synState.set = selS.value; o.refresh(); };
    filter.appendChild(selS);

    if (typeof o.extraFilter === 'function') o.extraFilter(filter);
    o.body.appendChild(filter);

    o.body.appendChild(el('div', 'sh-count', '共 ' + list.length + ' 个'));
    if (list.length === 0) {
      o.body.appendChild(el('div', 'sh-empty', o.emptyText || '没有符合条件的神魂。'));
      return;
    }
    var wrap = el('div', 'sh-pick-list');
    list.forEach(function (soul) { wrap.appendChild(buildSoulRow(soul, o.buttons(soul), true)); });
    o.body.appendChild(wrap);
  }

  function openSynthesize() {
    resetCraft();
    /* 神话为最高稀有度、无法合成，第 1 步候选同样排除 */
    var candidates = SH.getBag().filter(function (s) { return !s.locked && s.rarity !== '神话'; });
    openModal('合成神魂 · 第 1 步 / 共 2 步', function (body, close) {
      if (candidates.length === 0) {
        body.appendChild(el('div', 'sh-empty', '仓库里没有未锁定的神魂可供合成。'));
        return;
      }
      var step = el('div', 'sh-craft-step', '请选择第 1 个神魂（将锁定「套装 + 稀有度」，第 2 个必须与之相同）');
      body.appendChild(step);
      renderSelectList({
        list: candidates,
        body: body,
        emptyText: '当前筛选条件下没有可选择的神魂。',
        refresh: function () {
          body.innerHTML = '';
          body.appendChild(step.cloneNode(true));
          renderSelectList({
            list: candidates,
            body: body,
            emptyText: '当前筛选条件下没有可选择的神魂。',
            refresh: arguments.callee
          });
        },
        buttons: function (soul) {
          return [{ text: '选这个', onClick: function () { craftState.first = soul; openSynthesizeStep2(close); } }];
        }
      });
    }, { large: true });
  }

  function openSynthesizeStep2(closeAll) {
    var a = craftState.first;
    if (!a) { closeAll(); openSynthesize(); return; }
    var target = targetRarity(a, a);
    var candidates = SH.getBag().filter(function (s) {
      /* 神话为最高稀有度，无法继续合成，排除出候选列表 */
      return s.id !== a.id && !s.locked && s.setType === a.setType &&
             s.rarity === a.rarity && s.rarity !== '神话';
    });
    /* 复用同一个弹窗：只清空 body 并重建，不重建弹窗本身，避免丢失引用 */
    var layer = ensureModalLayer();
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
    prev.onclick = function () { showSoulDetail(a); };
    body.appendChild(prev);

    var self = this;
    renderSelectList({
      list: candidates,
      body: body,
      emptyText: '没有符合条件的第 2 个神魂。需要另一个「' + a.setType + ' · ' + a.rarity + '」且未锁定的神魂。',
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

  function openRecast() {
    var list = SH.getBag().filter(function (s) { return !s.locked; });
    openModal('重铸神魂（消耗 1 重铸石）', function (body) {
      if (list.length === 0) { body.appendChild(el('div', 'sh-empty', '没有可重铸的神魂（已锁定的除外）')); return; }
      if ((SH.getItem().recastStone || 0) <= 0) { body.appendChild(el('div', 'sh-warn', '重铸石不足，每日登录会发放 2 个。')); }
      var wrap = el('div', 'sh-pick-list');
      list.forEach(function (soul) {
        var item = el('div', 'sh-pick-item sh-r' + soul.rarity);
        item.innerHTML = '<div><b>' + soul.setType + '</b> <span style="color:' + rarityHex(soul.rarity) + '">' + soul.rarity + '</span> · ' + soul.slot + '号位</div>' +
          '<div class="sh-pick-main">' + attrLabel(soul.main.key) + ' +' + h(soul.main.key, soul.main) + '</div>';
        var b = el('button', 'sh-btn danger', '重铸');
        b.onclick = function () {
          var r = SH.recast(soul.id);
          if (r && r.ok) { toast('重铸成功'); closeModal(); buildCraft(); renderBag(); }
          else toast('重铸失败：' + (r.reason || ''), 'warn');
        };
        item.appendChild(b);
        wrap.appendChild(item);
      });
      body.appendChild(wrap);
    }, { large: true });
  }

  /* ==================== 导入 / 导出 ==================== */
  var ioJSON = '';
  var ioMode = 'merge';

  function buildIO() {
    var pane = $('sh-pane-io');
    if (!pane) return;
    pane.innerHTML = '';

    /* 导出 */
    var outBox = el('div', 'sh-io-block');
    outBox.appendChild(el('div', 'sh-io-title', '导出数据'));
    var gen = el('button', 'sh-btn primary', '生成 JSON');
    gen.onclick = function () {
      ioJSON = SH.exportJSON();
      ta.value = ioJSON;
      toast('已生成，可复制或下载');
    };
    outBox.appendChild(gen);
    var dl = el('button', 'sh-btn', '下载文件');
    dl.onclick = function () {
      if (!ioJSON) { toast('请先生成 JSON', 'warn'); return; }
      var blob = new Blob([ioJSON], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'shenhun-data.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      toast('已开始下载');
    };
    outBox.appendChild(dl);
    var ta = el('textarea', 'sh-io-ta', '点击「生成 JSON」后将显示可复制的数据，也可直接下载为文件。');
    outBox.appendChild(ta);
    pane.appendChild(outBox);

    /* 导入 */
    var inBox = el('div', 'sh-io-block');
    inBox.appendChild(el('div', 'sh-io-title', '导入数据'));
    var modeRow = el('div', 'sh-io-mode');
    modeRow.appendChild(el('span', 'sh-label', '模式：'));
    var sel = el('select');
    [['merge', '合并（跳过 ID 冲突项，保留现有数据）'], ['overwrite', '覆盖（用导入数据替换全部神魂数据）']].forEach(function (p) {
      var op = el('option', null, p[1]);
      op.value = p[0];
      if (p[0] === ioMode) op.selected = true;
      sel.appendChild(op);
    });
    sel.onchange = function () { ioMode = sel.value; };
    modeRow.appendChild(sel);
    inBox.appendChild(modeRow);

    var fileRow = el('div', 'sh-io-file');
    var fileBtn = el('button', 'sh-btn', '选择文件');
    var fileName = el('span', 'sh-muted', '未选择任何文件');
    var fileInput = el('input');
    fileInput.type = 'file';
    fileInput.accept = '.json,application/json';
    fileInput.style.display = 'none';
    fileBtn.onclick = function () { fileInput.click(); };
    fileInput.onchange = function () {
      var f = fileInput.files && fileInput.files[0];
      if (!f) return;
      fileName.textContent = f.name;
      var reader = new FileReader();
      reader.onload = function (ev) {
        var r = SH.importJSON(String(ev.target.result || ''), { mode: ioMode });
        if (r && r.ok) toast('导入成功：新增 ' + (r.added || 0) + ' 项');
        else toast('导入失败：' + (r && r.reason || '格式错误'), 'warn');
        renderBag();
      };
      reader.readAsText(f);
    };
    fileRow.appendChild(fileBtn);
    fileRow.appendChild(fileName);
    fileRow.appendChild(fileInput);
    inBox.appendChild(fileRow);

    var imp = el('button', 'sh-btn primary', '导入（来自文本框）');
    imp.onclick = function () {
      var r = SH.importJSON(ta.value.trim(), { mode: ioMode });
      if (r && r.ok) { toast('导入成功：新增 ' + (r.added || 0) + ' 项'); renderBag(); }
      else toast('导入失败：' + (r && r.reason || '格式错误'), 'warn');
    };
    inBox.appendChild(imp);
    pane.appendChild(inBox);
  }
  TAB_BUILDERS.io = buildIO;

  /* ==================== 弹窗开关 ==================== */
  function openModal_() {
    var ov = $('shenhun-overlay');
    if (ov) ov.classList.add('show');
    SH.dailyLogin();
    refreshHeader();
    switchTab('bag');
  }
  function closeModal_() {
    var ov = $('shenhun-overlay');
    if (ov) ov.classList.remove('show');
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
  window.SHENHUN_UI = { open: openModal_, close: closeModal_, refreshHeader: refreshHeader };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
