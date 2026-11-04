/* ============================================================================
   cloud-save.js —— 神魂云存档（手动上传 / 下载）
   ----------------------------------------------------------------------------
   ★ 云端地址固定【自动复用联机中继】：联机的自建 Cloudflare Worker 同时挂了
     云存档路由（/api/shenhun/*），所以不用另建 Worker，界面也不提供地址输入。
     推导规则见 detectApi()。

   设计前提（按需求刻意从简）：
     · 本地存档永远是主数据；云端只是「换设备时不用倒 JSON 文件」的中转。
     · 不自动同步、不轮询、不心跳 —— 只有点按钮才发请求；后端挂了 / 没网 /
       没填账号，游戏和游客模式完全照常。
     · 账号密码明文存 localStorage、明文存 D1，仅用于「区分谁的数据」，
       不是安全鉴权。请勿使用真实重要密码。
     · 凭据记住后长期有效，但「已登录」只在服务器真的确认过才显示。
     · ★ 上传 / 下载必须【服务器确认登录成功后】才可点：verified 为假时
       两个按钮一律 disabled，不再有「上传时自动补登录」这条暗路。
     · 登录遇非账号密码类失败会自动重连 5 次、每次间隔 1 秒（共 6 次尝试），
       期间只显示「登录中」，用尽后提示「登录失败」。
       后端每次请求都校验密码。

   对外只暴露 window.CLOUD_SAVE，由 shenhun-ui.js 注册成「云存档」标签页。
   ========================================================================== */
(function (root) {
  'use strict';

  var CFG_KEY = 'cloud_save_cfg_v1';
  var LOCAL_SAVE_KEY = 'shenhun_save_v1';   // 与 shenhun.js 的 SAVE_KEY 一致
  var API_PATH = '/api/shenhun/';
  var TIMEOUT_MS = 10000;
  /* 登录是概率性连不上（弱网 / 域名偶发抽风），按需求自动重连：
     首次失败后再重连 5 次、每次间隔 1 秒（即共 6 次尝试）；
     登录单次超时单独缩短，避免某次卡满 10 秒把整轮重连拖到近一分钟。
     界面只显示「登录中」，不显示第几次重连。 */
  var LOGIN_RECONNECTS = 5;
  var __TEST_FAST__ = false;
  var LOGIN_RETRY_MS = (__TEST_FAST__?5:1000);
  var LOGIN_TIMEOUT_MS = 2500;
  /* 与 game.js 的 DEFAULT_RELAY 保持一致（顶层 const 不挂 window，这里内置一份）。
     若以后改了联机默认中继，记得同步这里。玩家在联机面板选「自定义」时，
     则优先读 localStorage.net_server，不依赖这个常量。 */
  var RELAY_DEFAULT = 'wss://reveriecab.cc.cd/';

  /* cfg = { user, pass, accessKey, lastPush, lastPull, cloudUpdatedAt }
     不再保存服务器地址：一律由 detectApi() 从联机配置自动推导。 */
  var cfg = loadCfg();

  /* ★ 服务器是否已确认过账号密码（只活在本次页面会话，不写进 localStorage）。
     旧版把「填了账号密码」(ready) 当成「已登录」显示在界面上，于是登录请求
     失败时照样显示绿字「● 已登录」，玩家被误导去点上传，后端却因为账号
     根本没建成而返回「账号不存在」。现在只有服务器成功返回才置 true，
     并且它是上传 / 下载按钮能否点击的唯一开关。 */
  var verified = false;
  /* 登录进行中 + 取消令牌：改账号 / 退出登录时递增 seq，让旧重连链自行停下 */
  var loginBusy = false;        // 登录 / 自动重连进行中（含页面刚打开时的自动登录）
  var loginSeq = 0;

  function lsGet(k) { try { return root.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { root.localStorage.setItem(k, v); } catch (e) {} }
  function loadCfg() {
    var d = { user: '', pass: '', accessKey: '', lastPush: 0, lastPull: 0, cloudUpdatedAt: 0 };
    try {
      var raw = lsGet(CFG_KEY);
      if (raw) {
        var o = JSON.parse(raw);
        if (o && typeof o === 'object') {
          /* 旧版本曾存过 api（手填地址），这里直接忽略，一律走自动推导 */
          d.user = String(o.user || ''); d.pass = String(o.pass || '');
          d.accessKey = String(o.accessKey || '');
          d.lastPush = Number(o.lastPush) || 0; d.lastPull = Number(o.lastPull) || 0;
          d.cloudUpdatedAt = Number(o.cloudUpdatedAt) || 0;
        }
      }
    } catch (e) {}
    return d;
  }
  function saveCfg() { lsSet(CFG_KEY, JSON.stringify(cfg)); }
  function SH() { return root.SHENHUN; }
  function toast(msg, kind) {
    if (root.SHENHUN_UI && typeof root.SHENHUN_UI.toast === 'function') root.SHENHUN_UI.toast(msg, kind);
  }
  function confirmBox(msg, onYes) {
    if (typeof root.showConfirmDialog === 'function') { root.showConfirmDialog(msg, onYes); return; }
    if (root.confirm(msg)) onYes();
  }

  /* ---------- 地址推导 ----------
     联机面板的三种模式（localStorage.net_relay_mode）：
       cf      → 用 DEFAULT_RELAY（自建 Cloudflare Worker）
       custom  → 用 localStorage.net_server
       mqtt    → 公共 MQTT broker，没有 Worker 可用 → 返回空，需切模式
     wss:// / ws:// 统一转成 https:// / http://；含 /mqtt 的不是自命中继，排除。 */
  function relayToHttp(v) {
    var s = String(v || '').trim().replace(/\/+$/, '');
    if (!s) return '';
    if (/^mqtts?:/i.test(s) || /\/mqtt(\/?$|[/?])/i.test(s)) return '';
    if (/^wss:\/\//i.test(s)) return 'https://' + s.slice(6);
    if (/^ws:\/\//i.test(s)) return 'http://' + s.slice(5);
    if (/^https?:\/\//i.test(s)) return s;
    return 'https://' + s;
  }
  function detectApi() {
    var mode = lsGet('net_relay_mode') || 'cf';
    if (mode === 'mqtt') return '';
    var raw = (mode === 'custom') ? (lsGet('net_server') || '') : RELAY_DEFAULT;
    return relayToHttp(raw);
  }
  /* 实际使用的地址：固定走自动推导，界面不提供也不接受手填 */
  function effectiveApi() { return detectApi(); }
  function hasCred() { return !!(cfg.user && cfg.pass); }
  /* ★ 能否点上传 / 下载：必须服务器已确认登录成功（verified），
     且不在登录 / 重连过程中；只填了账号密码但没登录成功一律不可点。 */
  function canSync() { return verified && !loginBusy && !!effectiveApi(); }

  /* ---------- 时间 / 状态 ---------- */
  function fmtTime(ts) {
    if (!ts) return '—';
    var d = new Date(Number(ts));
    if (isNaN(d.getTime())) return '—';
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
      ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function localSavedAt() {
    try {
      var raw = lsGet(LOCAL_SAVE_KEY);
      if (!raw) return 0;
      return Number((JSON.parse(raw) || {}).savedAt) || 0;
    } catch (e) { return 0; }
  }
  function localSummary() {
    var s = SH();
    if (!s) return '神魂模块未加载';
    var bag = (s.getBag && s.getBag()) || [];
    var it = (s.getItem && s.getItem()) || {};
    return bag.length + ' 个神魂 · 券 ' + (Number(it.ticket) || 0) +
      ' · 石 ' + (Number(it.recastStone) || 0) + ' · 最后保存 ' + fmtTime(localSavedAt());
  }

  /* ---------- 网络 ---------- */
  function apiCall(path, body, timeoutMs) {
    var base = effectiveApi();
    if (!base) return Promise.reject(new Error('暂时无法连接服务器，请稍后重试'));
    var headers = { 'Content-Type': 'application/json' };
    if (cfg.accessKey) headers['X-Access-Key'] = cfg.accessKey;
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, timeoutMs || TIMEOUT_MS) : null;
    return fetch(base + API_PATH + path, {
      method: 'POST', headers: headers, body: JSON.stringify(body || {}),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      if (timer) clearTimeout(timer);
      return res.text().then(function (txt) {
        var data = null;
        try { data = txt ? JSON.parse(txt) : null; } catch (e) { data = null; }
        if (!res.ok || !data || !data.ok) {
          throw new Error(String((data && (data.error || data.reason)) || ('HTTP ' + res.status)));
        }
        return data;
      });
    }, function (err) {
      if (timer) clearTimeout(timer);
      if (err && err.name === 'AbortError') throw new Error('请求超时，请检查网络后重试');
      throw new Error('无法连接云端：' + (err && err.message ? err.message : '网络错误'));
    });
  }
  function authBody(extra) {
    var b = { user: cfg.user, pass: cfg.pass };
    if (extra) Object.keys(extra).forEach(function (k) { b[k] = extra[k]; });
    return b;
  }
  /* 把后端简短错误翻成玩家能照着做的话 */
  function friendlyErr(e) {
    var m = String((e && e.message) || e || '未知错误');
    if (m === '账号不存在') return '账号还没建好，请点「登录 / 注册」';
    if (m === '密码不正确') return '密码不正确，请检查后重新登录';
    if (m === '访问口令不正确') return '访问口令不正确，请向房主确认';
    return m;
  }
  /* 这类是账号 / 口令本身的问题，重连多少次都一样 → 立即停止并说明原因 */
  function isCredError(msg) {
    return /^(密码不正确|访问口令不正确|账号不存在|账号需为|密码需为)/.test(msg);
  }
  /* 状态行文案：render 与重连过程共用，切标签页再回来也不会错乱 */
  function stateText() {
    if (loginBusy) return '● 登录中…';
    if (verified) return '● 已登录：' + cfg.user + '（下次打开无需重复登录）';
    if (hasCred()) return '○ 未登录 · 请点「登录 / 注册」，成功后才能上传 / 下载';
    return '○ 未登录 · 游客模式，数据只存本机';
  }
  function syncHintText() {
    if (loginBusy) return '登录中，请稍候…';
    if (verified) return '';
    return hasCred() ? '未登录时不能上传 / 下载，请先点上方「登录 / 注册」。'
                     : '请先填写账号密码并登录，成功后这里才能上传 / 下载。';
  }
  function refreshLoginUI() {
    var btn = document.getElementById('sh-cloud-login');
    if (btn) {
      btn.disabled = loginBusy || !hasCred() || !effectiveApi();
      btn.textContent = loginBusy ? '登录中…' : '登录 / 注册';
    }
    var ok = canSync();
    ['sh-cloud-push', 'sh-cloud-pull'].forEach(function (id) {
      var b = document.getElementById(id);
      if (b && !/中…$/.test(b.textContent)) {           // 不打断「上传中…/下载中…」
        b.disabled = !ok;
        b.title = ok ? '' : '请先登录成功后再使用';
      }
    });
    var st = document.querySelector('#sh-pane-cloud .sh-cloud-state');
    if (st) {
      st.className = 'sh-cloud-state' + (verified && !loginBusy ? ' ok' : '');
      st.textContent = stateText();
    }
    var hint = document.getElementById('sh-cloud-sync-hint');
    if (hint) hint.textContent = syncHintText();
  }
  /* 改账号 / 退出登录 / 重置时递增 seq，让正在跑的重连链自行停下 */
  function cancelLogin() { loginSeq++; loginBusy = false; verified = false; refreshLoginUI(); }

  /* 登录：首次失败后再自动重连 5 次，每次间隔 1 秒（共 6 次尝试）。
     只重连「非账号密码」类失败（网络错误、超时、5xx、404 等）；
     账号密码问题立即返回具体原因；用尽后 → reject('登录失败')。
     全程不向玩家显示第几次重连。 */
  function runLogin() {
    if (!cfg.user || !cfg.pass) return Promise.reject(new Error('请先填写账号和密码'));
    var seq = ++loginSeq;
    return new Promise(function (resolve, reject) {
      function attempt(n) {
        if (seq !== loginSeq) { reject(new Error('已取消')); return; }
        apiCall('login', authBody({ createIfMissing: true }), LOGIN_TIMEOUT_MS).then(function (r) {
          if (seq !== loginSeq) { reject(new Error('已取消')); return; }
          resolve(r);
        }, function (e) {
          if (seq !== loginSeq) { reject(new Error('已取消')); return; }
          var msg = String((e && e.message) || e || '');
          if (isCredError(msg)) { reject(new Error(friendlyErr(e))); return; }
          if (n > LOGIN_RECONNECTS) { reject(new Error('登录失败')); return; }
          setTimeout(function () { attempt(n + 1); }, LOGIN_RETRY_MS);
        });
      }
      attempt(1);
    });
  }

  /* ---------- 操作 ---------- */
  function doLogin(render) {
    if (!effectiveApi()) { toast('暂时无法连接服务器，请稍后重试', 'warn'); return; }
    if (!hasCred()) { toast('请填写账号和密码', 'warn'); return; }
    if (loginBusy) return;                 // 重连进行中不重复发起
    loginBusy = true;
    verified = false;
    refreshLoginUI();                      // 底部显示「● 登录中…」，上传/下载保持不可点
    runLogin().then(function (r) {
      loginBusy = false;
      verified = true;                     // ★ 服务器确认成功，上传 / 下载这才亮起
      cfg.cloudUpdatedAt = Number(r.updatedAt) || 0;   // 回传云端最后更新时间
      saveCfg();
      toast(r.created ? '新账号已创建：' + cfg.user : '登录成功：' + cfg.user);
      render();
    }, function (e) {
      loginBusy = false;
      verified = false;                    // ★ 失败一律保持不可点
      var msg = String((e && e.message) || e || '');
      if (msg !== '已取消') {
        toast(msg === '登录失败' ? '登录失败' : '登录失败：' + friendlyErr(e), 'warn');
      }
      render();
    });
  }

  /* 页面打开时若记住了账号密码，自动登录一次（同样走重连）。
     静默进行：不弹 toast，只让状态行显示「登录中」，成功后按钮自行亮起。 */
  function autoLogin(render) {
    if (!effectiveApi() || !hasCred() || loginBusy || verified) return;
    loginBusy = true;
    verified = false;
    if (render) render();
    runLogin().then(function (r) {
      loginBusy = false;
      verified = true;
      cfg.cloudUpdatedAt = Number(r.updatedAt) || cfg.cloudUpdatedAt;
      saveCfg();
      if (render) render();
    }, function () {
      loginBusy = false;
      verified = false;
      if (render) render();               // 静默失败：不打扰，按钮保持不可点
    });
  }

  function doPush(render) {
    if (!canSync()) { toast('请先登录成功后再上传', 'warn'); return; }
    var s = SH();
    if (!s) { toast('神魂模块未加载', 'warn'); return; }
    var payload;
    try {
      payload = JSON.parse(s.exportJSON());
      payload.savedAt = localSavedAt() || Date.now();
      payload.cloudNote = '由 cloud-save.js 上传';
    } catch (e) { toast('读取本地存档失败', 'warn'); return; }

    var go = function () {
      var btn = document.getElementById('sh-cloud-push');
      if (btn) { btn.disabled = true; btn.textContent = '上传中…'; }
      apiCall('push', authBody({ data: payload })).then(function (r) {
        cfg.lastPush = Date.now();
        cfg.cloudUpdatedAt = Number(r.updatedAt) || cfg.lastPush;
        saveCfg();
        toast('已上传到云端（' + ((payload.bag || []).length) + ' 个神魂）');
        render();
      }).catch(function (e) {
        toast('上传失败：' + friendlyErr(e), 'warn'); render();
      });
    };
    if (cfg.cloudUpdatedAt && localSavedAt() && cfg.cloudUpdatedAt > localSavedAt()) {
      confirmBox('云端存档（' + fmtTime(cfg.cloudUpdatedAt) + '）比本机（' + fmtTime(localSavedAt()) +
        '）更新。\n继续上传会用本机数据覆盖云端，确定吗？', go);
    } else go();
  }

  function doPull(render) {
    if (!canSync()) { toast('请先登录成功后再下载', 'warn'); return; }
    var go = function () {
      var btn = document.getElementById('sh-cloud-pull');
      if (btn) { btn.disabled = true; btn.textContent = '下载中…'; }
      apiCall('pull', authBody()).then(function (r) {
        if (!r.data) { toast('云端还没有存档，请先上传一次', 'warn'); render(); return; }
        cfg.cloudUpdatedAt = Number(r.updatedAt) || 0;
        var s = SH();
        var res = s.importJSON(JSON.stringify(r.data), 'overwrite');
        if (!res || !res.ok) { toast('导入失败：' + (res && res.reason || '格式错误'), 'warn'); render(); return; }
        cfg.lastPull = Date.now(); saveCfg();
        if (root.SHENHUN_UI) {
          if (typeof root.SHENHUN_UI.renderBag === 'function') root.SHENHUN_UI.renderBag();
          if (typeof root.SHENHUN_UI.refreshHeader === 'function') root.SHENHUN_UI.refreshHeader();
        }
        toast('下载完成：已恢复 ' + (res.imported || 0) + ' 个神魂');
        render();
      }).catch(function (e) {
        toast('下载失败：' + friendlyErr(e), 'warn'); render();
      });
    };
    confirmBox('下载会用【云端存档】覆盖本机全部神魂数据（仓库、装备、券、保底计数）。\n建议先记下本机进度，确定继续吗？', go);
  }

  function doLogout(render) {
    confirmBox('退出后本机将不再记住账号密码（云端数据保留）。确定吗？', function () {
      cancelLogin();
      cfg.user = ''; cfg.pass = ''; verified = false;
      cfg.lastPush = 0; cfg.lastPull = 0; cloudUpdatedAtReset();
      saveCfg();
      toast('已退出登录，游戏继续以本地存档运行');
      render();
    });
  }
  function cloudUpdatedAtReset() { cfg.cloudUpdatedAt = 0; }

  /* ---------- UI ---------- */
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }
  function field(labelText, value, type, placeholder, onChange) {
    var row = el('div', 'sh-cloud-field');
    row.appendChild(el('label', null, labelText));
    var inp = el('input');
    inp.type = type || 'text';
    inp.value = value || '';
    inp.placeholder = placeholder || '';
    inp.autocomplete = 'off';
    inp.oninput = function () { onChange(inp.value); };
    row.appendChild(inp);
    return row;
  }

  function render(pane) {
    if (!pane) return;
    pane.innerHTML = '';
    var autoApi = detectApi();

    /* ===== 账号设置 =====
       面向玩家：界面不出现服务器地址、接口路径、Worker 等开发者信息；
       也不提供地址输入框 —— 地址固定由 detectApi() 自动复用联机中继。 */
    var box1 = el('div', 'sh-cloud-block');
    box1.appendChild(el('div', 'sh-cloud-title', '账号设置'));
    box1.appendChild(el('div', 'sh-cloud-tip',
      '点「上传」把当前神魂进度存到服务器，换设备后点「下载」就能取回，不用再来回传文件。' +
      '只在点按钮时同步，平时断网也能照常玩；不登录就是游客模式，数据只存在这台设备上。'));

    /* 仅在自动推导失败（联机走了公共模式）时给一句玩家能懂的提示，
       仍不暴露具体地址 / 接口路径，也不提供手填入口。 */
    if (!autoApi) {
      box1.appendChild(el('div', 'sh-cloud-src bad',
        '暂时无法连接服务器，请稍后重试。'));
    }

    /* 状态行：只有服务器验证通过才显示「已登录」。
       输入账号密码时立即清掉登录态，避免改了账号还挂着上一任的绿字。 */
    var state = el('div', 'sh-cloud-state');
    function updateState() {
      state.className = 'sh-cloud-state' + (verified && !loginBusy ? ' ok' : '');
      state.textContent = stateText();
    }
    function onCredChange(k, v) {
      cancelLogin();                     // 改账号 / 密码时取消正在跑的重连链
      cfg[k] = v; verified = false;
      saveCfg(); updateState(); refreshLoginUI();
    }
    box1.appendChild(field('账号', cfg.user, 'text', '用来区分是谁的存档，随便起个名', function (v) { onCredChange('user', v); }));
    box1.appendChild(field('密码', cfg.pass, 'password', '仅作标识，请勿使用常用密码', function (v) { onCredChange('pass', v); }));
    box1.appendChild(field('访问口令（选填）', cfg.accessKey, 'text', '房主设置了才需要填', function (v) { onCredChange('accessKey', v); }));

    var btnRow = el('div', 'sh-cloud-btns');
    var loginBtn = el('button', 'sh-btn primary', loginBusy ? '登录中…' : '登录 / 注册');
    loginBtn.id = 'sh-cloud-login';
    loginBtn.disabled = true;            // 由下方 updateState 按条件放行
    loginBtn.onclick = function () { doLogin(function () { render(pane); }); };
    btnRow.appendChild(loginBtn);
    var outBtn = el('button', 'sh-btn danger', '退出登录');
    outBtn.disabled = !cfg.user;
    outBtn.onclick = function () { doLogout(function () { render(pane); }); };
    btnRow.appendChild(outBtn);
    box1.appendChild(btnRow);

    box1.appendChild(state);
    updateState();                       // 顺带同步登录按钮的可用状态
    pane.appendChild(box1);

    /* ===== 数据同步 =====
       ★ 上传 / 下载必须登录成功后才可点，未登录一律 disabled + 一句说明 */
    var box2 = el('div', 'sh-cloud-block');
    box2.appendChild(el('div', 'sh-cloud-title', '数据同步'));
    var info = el('div', 'sh-cloud-info');
    info.appendChild(el('div', null, '本机：' + localSummary()));
    info.appendChild(el('div', null, '云端：' +
      (cfg.cloudUpdatedAt ? '最后更新 ' + fmtTime(cfg.cloudUpdatedAt) : '未知（上传或下载后显示）')));
    if (cfg.lastPush || cfg.lastPull) {
      info.appendChild(el('div', 'sh-muted',
        '本机操作：' + (cfg.lastPush ? '上次上传 ' + fmtTime(cfg.lastPush) : '未上传过') +
        ' / ' + (cfg.lastPull ? '上次下载 ' + fmtTime(cfg.lastPull) : '未下载过')));
    }
    box2.appendChild(info);

    var syncRow = el('div', 'sh-cloud-btns');
    var pushBtn = el('button', 'sh-btn primary lg', '⬆ 上传到云端');
    pushBtn.id = 'sh-cloud-push';
    pushBtn.disabled = true;             // 由 refreshLoginUI 按 canSync() 放行
    pushBtn.onclick = function () { if (canSync()) doPush(function () { render(pane); }); };
    syncRow.appendChild(pushBtn);
    var pullBtn = el('button', 'sh-btn lg', '⬇ 从云端下载');
    pullBtn.id = 'sh-cloud-pull';
    pullBtn.disabled = true;
    pullBtn.onclick = function () { if (canSync()) doPull(function () { render(pane); }); };
    syncRow.appendChild(pullBtn);
    box2.appendChild(syncRow);

    var hint = el('div', 'sh-cloud-warn');
    hint.id = 'sh-cloud-sync-hint';
    box2.appendChild(hint);

    box2.appendChild(el('div', 'sh-cloud-warn',
      '下载会【覆盖】本机神魂进度（有二次确认）；若云端进度比本机新，上传也会再确认一次。' +
      '账号密码只用来区分是谁的存档，请勿使用常用密码。'));
    pane.appendChild(box2);

    refreshLoginUI();                    // 统一按当前登录态设置禁用 / 文案
    if (!verified && !loginBusy) autoLogin(function () { render(pane); });
  }

  root.CLOUD_SAVE = {
    render: render,
    config: function () { return cfg; },
    detectApi: detectApi,                // 调试用：看自动推导出的地址
    isVerified: function () { return verified; },   // 调试用：当前是否已登录成功
    reset: function () {
      cancelLogin();
      cfg = { user: '', pass: '', accessKey: '', lastPush: 0, lastPull: 0, cloudUpdatedAt: 0 };
      verified = false;
      saveCfg();
    }
  };

})(typeof window !== 'undefined' ? window : this);
