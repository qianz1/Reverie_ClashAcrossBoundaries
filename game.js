
/* ===== 角色图片：头像 / 战斗图 双通道 =====
   【原路径】把图片按「英文名去空格 + .png」命名（如 ObitoUchiha.png），
   放到 HERO_IMG_BASE 指定的位置即可自动生效。这是所有角色的默认图。
     - HERO_IMG_BASE 留空   → 图片与本 html 放同一目录
     - 改成 './heroes/'     → 图片放在 heroes 子目录
     - 改成 'https://xxx/'  → 图片走 CDN / 外部图床

   【两条可配置的新通道】互不干扰，未配置的角色一律保持原路径不变：
     · HERO_AVATAR_CYCLE —— 角色头像多图轮换（选人页、角色详情）
     · HERO_BATTLE_IMG   —— 战斗界面专用图（角色卡片、行动条圆点、技能演出），
                            可带按规则触发的变体（如虎杖进入「未来」后换图）

   【回退链】新路径的图片加载失败时，自动改用【原路径图片】；
   原路径也失败才隐藏 <img>，露出底下的首字母头像。
   因此缺图、断网、文件名写错都不会影响界面，也不会出现破图。
   ================================ */
const HERO_IMG_BASE = 'assets/character/';
const HERO_IMG_EXT  = '.png';
/* ===== 网页图标（favicon）=====
   用法：把图片命名为 favicon.png，与本页面放同一目录即可自动生效。
   想改文件名或路径，改 FAVICON_FILE（支持 './xxx.png' 或完整 URL）。
   兜底：图片加载失败（缺图 / 断网 / 文件名不符）时，自动换成内置的内联 SVG 图标，
        绝不会出现空白或破图。 */
const FAVICON_FILE = 'assets/favicon/favicon.png';
const FAVICON_FALLBACK = 'data:image/svg+xml,' + encodeURIComponent(
`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="#14143a"/><stop offset="1" stop-color="#0a0a1a"/></linearGradient></defs>
<rect width="64" height="64" rx="12" fill="url(#g)"/>
<text x="32" y="44" font-size="38" text-anchor="middle" fill="#ffd700">⚔️</text>
</svg>`);
function setFavicon(href, type) {
const link = document.getElementById('favicon');
const apple = document.getElementById('apple-touch-icon');
if (!link) return;
link.href = href; link.type = type;
// iOS 加到主屏时用的是 PNG，SVG 不生效，故仅在图片可用时同步
if (apple) apple.href = (type === 'image/png') ? href : '';
}
(function initFavicon() {
/* 策略：先用一定能显示的内置 SVG 兜底，再探测 favicon.png。
   · 图片存在 → onload 触发 → 升级为图片（更好看）
   · 图片缺失 / 断网 → onload 不触发 → 保持内置 SVG（不会空白或破图）
   只依赖 onload 而非 onerror：某些环境（如部分 WebView）缺图时不会触发 onerror，
   那样反而会把兜底图标也弄丢。 */
setFavicon(FAVICON_FALLBACK, 'image/svg+xml');
const probe = new Image();
probe.onload = () => setFavicon(FAVICON_FILE, 'image/png');
probe.onerror = () => setFavicon(FAVICON_FALLBACK, 'image/svg+xml');
probe.src = FAVICON_FILE;
})();
// 中文名 → 图片文件名（英文名去空格 + 扩展名）—— 所有角色的【原路径】
const HERO_IMG_FILE = {
'主角':'Protagonist', '捷克罗姆':'Zekrom', '东丈':'JoeHigashi', '白藏主':'Hakuzosu',
'宇智波带土':'ObitoUchiha', '镰鼬':'Kamaitachi', '鬼王酒吞童子':'DemoniacShutenDoji',
'雪拉比':'Celebi', '纲手':'Tsunade', '裂空座':'Rayquaza', '维迦':'Veigar', '流光追月神':'LuminaryOitsuki',
'心友犬神':'BosombuddyInugami', '鬼金羊':'Guijinyang', '禅心云外镜':'ZenshinUngaikyo', '两面宿傩':'RyomenSukuna',
'五条悟':'GojoSatoru', '虎杖悠仁':'ItadoriYuji', '钉崎野蔷薇':'KugisakiNobara'
};
function heroImgSrc(name) {
/* 探索模式怪物：贴图在 assets/pve/character/英文名.png（由 pve.js 提供） */
if (window.PVE && typeof window.PVE.imgSrc === 'function') {
const pveSrc = window.PVE.imgSrc(name);
if (pveSrc) return pveSrc;
}
const file = HERO_IMG_FILE[name];
return file ? (HERO_IMG_BASE + file + HERO_IMG_EXT) : '';
}

/* ===== 通道 A：角色头像轮换（选人页 / 角色详情）=====
   只在此处列出的角色启用；没列的一律单张原路径、行为完全不变。
   值是有序图片路径数组，运行时按 AVATAR_CYCLE_MS 依次切换。 */
const HERO_AVATAR_CYCLE = {
'虎杖悠仁': [
'assets/avatar/ItadoriYuji_avatar.png',
'assets/avatar/ItadoriYuji_avatar2.png',
'assets/avatar/ItadoriYuji_avatar3.png'
]
};
const AVATAR_CYCLE_MS = 3000;

/* ===== 通道 B：战斗界面专用图 =====
   覆盖角色卡片背景、行动条圆点、技能演出立绘等【战斗界面内一切图片】。
   只在此处列出的角色启用；没列的一律用原路径 heroImgSrc，行为完全不变。
     base      —— 默认战斗图
     variants  —— 按顺序命中的条件变体；rule 用 hasRule(unit,'…') 判定，
                  也可给 test(unit) 自定义条件，命中即返回对应 src。
     miraiPick —— 进入「未来」时从数组里【随机选一张】并保持到战斗结束；
                  结果记在 unit.miraiBattlePick（下标 0/1），随联机快照同步，
                  房主与客机永远显示同一张，不会各掷一次。 */
const HERO_BATTLE_IMG = {
'虎杖悠仁': {
base: 'assets/character_battle/ItadoriYuji_battle1.png',
miraiPick: [
'assets/character_battle/ItadoriYuji_battle2.png',
'assets/character_battle/ItadoriYuji_battle3.png'
]
}
};
function battleImgSrc(unit) {
if (!unit) return '';
const orig = heroImgSrc(unit.name);
const cfg = HERO_BATTLE_IMG[unit.name];
if (!cfg) return orig;                       // 没有特殊说明 → 原路径
/* 「未来」随机图：只在第一次黑闪时掷一次，之后整场不再变。
   下标还没同步到（客机等快照）时先用第 1 张，快照来了自动校正。 */
if (cfg.miraiPick && cfg.miraiPick.length && hasRule(unit, '未来')) {
const p = Number(unit.miraiBattlePick);
return cfg.miraiPick[(p === 1) ? 1 : 0];
}
for (const v of (cfg.variants || [])) {
try {
if (v.rule && hasRule(unit, v.rule)) return v.src;
if (typeof v.test === 'function' && v.test(unit)) return v.src;
} catch (e) { /* 条件判定异常时继续看下一个变体，不影响战斗 */ }
}
return cfg.base || orig;
}

/* ===== 图片回退链 =====
   srcList 依次为「主图 → … → 原路径」。首个加载失败就顺延到下一个，
   全部失败才隐藏 <img>，露出底下的首字母。路径里不会出现引号或竖线。
   ★ 回退时留 data-img-fallback 标记，并对同一 URL 在控制台提示一次：
     Pages 对文件名大小写敏感，缺图 / 漏传 / 后缀写错时能立刻定位，
     不再出现「静默显示原路径图，看起来像没换图」。 */
function escAttr(s) { return String(s == null ? '' : s).replace(/"/g, '&quot;'); }
const IMG_BAD_WARNED = new Set();
function warnBadImg(url, why) {
if (!url || IMG_BAD_WARNED.has(url)) return;
IMG_BAD_WARNED.add(url);
try { console.warn('[角色图片] ' + why + '：' + url); } catch (e) {}
}
function imgWithFallback(srcList, cls, alt, extra) {
const list = (srcList || []).filter(Boolean);
if (!list.length) return '';
const fb = list.slice(1);
return `<img class="${cls}" src="${escAttr(list[0])}" alt="${escAttr(alt)}"` +
(fb.length ? ` data-fb="${escAttr(fb.join('|'))}"` : '') +
(extra ? ' ' + extra : '') +
` onerror="imgFallbackOnError(this)">`;
}
/* 全局函数：内联 onerror 调用。每次换到新路径后仍保留 onerror，
   因此可以连续回退多级；链走完才加失败类隐藏。 */
function imgFallbackOnError(img) {
warnBadImg(img.getAttribute('src') || '', '加载失败，改用回退图');
const fb = img.getAttribute('data-fb');
if (fb) {
const parts = fb.split('|');
img.setAttribute('src', parts[0]);
img.setAttribute('data-img-fallback', parts[0]);
if (parts.length > 1) img.setAttribute('data-fb', parts.slice(1).join('|'));
else img.removeAttribute('data-fb');
return;
}
img.classList.add(img.classList.contains('unit-bg') ? 'unit-bg-fail' : 'avatar-img-fail');
img.onerror = null;
}

/* 头像内部 HTML（选人页 / 角色详情）：首字母永久兜底 + <img>。
   配了轮换的角色额外带 data-cycle / data-cycle-name / data-orig，由统一定时器切换。 */
function heroAvatarInner(name, alt) {
const lead = (name || '').charAt(0);
const orig = heroImgSrc(name);
const cyc = HERO_AVATAR_CYCLE[name];
if (!cyc || !cyc.length) return lead + imgWithFallback(orig ? [orig] : [], 'avatar-img', alt || name, 'loading="lazy"');
/* 预探测完成前用完整列表；完成后收敛到真正能加载的那几张。 */
const ok = AVATAR_CYCLE_OK[name];
const list = (ok && ok.length) ? ok : cyc.slice();
const extra = `data-cycle="${escAttr(list.join('|'))}" data-cycle-name="${escAttr(name)}" data-orig="${escAttr(orig)}" loading="lazy"`;
return lead + imgWithFallback(orig ? [list[0], orig] : [list[0]], 'avatar-img avatar-cycle', alt || name, extra);
}

/* 战斗界面头像 HTML（行动条圆点 / 技能演出）：用 battleImgSrc，
   新路径失败自动回退原路径。首字母同样永久兜底。 */
function battleAvatarInner(unit, alt, overrideSrc) {
if (!unit) return '';
const lead = (unit.name || '').charAt(0);
const orig = heroImgSrc(unit.name);
/* overrideSrc：联机客机演出用房主随消息发来的图源，避免等下一份快照才换图。 */
const main = overrideSrc || battleImgSrc(unit);
const list = (main && main !== orig) ? [main, orig] : (orig ? [orig] : []);
return lead + imgWithFallback(list, 'avatar-img', alt || unit.name, '');
}
/* 角色卡片背景图 HTML。 */
function unitBgHtml(u) {
const orig = heroImgSrc(u.name);
const main = battleImgSrc(u);
const list = (main && main !== orig) ? [main, orig] : (orig ? [orig] : []);
return imgWithFallback(list, 'unit-bg', u.name, 'loading="lazy"');
}

/* ===== 头像轮换：全场一个定时器 =====
   不开 19 个 interval；每次 tick 统一把所有带 data-cycle 的 <img> 切到下一张。
   ★ 启动先预探测：只把【真正能加载】的图放进循环，坏图不再占位，
     也不会在切换中途冒出原路径图造成「只有第 1、3 张生效」的错觉。 */
const AVATAR_CYCLE_OK = {};      // name → 预探测成功的图片数组
let avatarCycleTimer = null, avatarCycleTick = 0;
function probeAvatarCycles() {
Object.keys(HERO_AVATAR_CYCLE).forEach(name => {
const list = HERO_AVATAR_CYCLE[name];
Promise.all(list.map(src => new Promise(resolve => {
const im = new Image();
im.onload = () => resolve(src);
im.onerror = () => { warnBadImg(src, '头像图找不到'); resolve(null); };
im.src = src;
}))).then(good => {
AVATAR_CYCLE_OK[name] = good.filter(Boolean);
/* 页面上已渲染的头像，立刻把轮换列表收敛到可用图。 */
document.querySelectorAll('img.avatar-img[data-cycle-name]').forEach(img => {
if (img.getAttribute('data-cycle-name') !== name) return;
const ok = AVATAR_CYCLE_OK[name];
if (ok.length) {
img.setAttribute('data-cycle', ok.join('|'));
const fb = img.getAttribute('data-orig') || '';
if (fb) img.setAttribute('data-fb', fb); else img.removeAttribute('data-fb');
img.removeAttribute('data-img-fallback');
img.setAttribute('src', ok[avatarCycleTick % ok.length]);
} else {
img.removeAttribute('data-cycle');
img.setAttribute('src', heroImgSrc(name) || '');
}
});
});
});
}
/* ===== 图片交叉淡入（头像轮换 / 战斗图状态切换共用）=====
   新 <img> 叠在旧图之上淡入，过渡结束才移除旧图，全程不露首字母 / 底色。
   · 过渡期间给 owner 打 data-img-fading，防止每帧渲染重复插入；
   · 若上一个过渡还没结束又来一次切换（或用户开了「减少动态效果」），
     直接硬切收尾，【状态正确优先于动画完整】；
   · onFinish 会再校正一次图源，避免过渡途中规则又变导致画面滞留。 */
const IMG_FADE_MS = 420;      // 与 styles.css 的 .42s 保持一致
function prefersReducedMotion() {
try { return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches; }
catch (e) { return false; }
}
function crossFadeImgNode(oldImg, newImg, owner, onFinish) {
if (!newImg) return false;
const parent = (oldImg && oldImg.parentNode) || owner;
if (!parent) return false;
const busy = !!(owner && owner.hasAttribute('data-img-fading'));
if (busy || prefersReducedMotion() || IMG_FADE_MS <= 0) {
/* 硬切：清掉残留的过渡节点，保证最终画面一定是最新图。 */
parent.querySelectorAll('img').forEach(n => { if (n !== oldImg) n.remove(); });
if (oldImg && oldImg.parentNode) parent.replaceChild(newImg, oldImg);
else parent.insertBefore(newImg, parent.firstChild);
if (owner) owner.removeAttribute('data-img-fading');
if (onFinish) onFinish();
return true;
}
newImg.classList.add('img-xfade');
if (oldImg && oldImg.parentNode) parent.insertBefore(newImg, oldImg.nextSibling);
else parent.insertBefore(newImg, parent.firstChild);
if (owner) owner.setAttribute('data-img-fading', '1');
void newImg.offsetWidth;                 // 强制重排，让 transition 真正跑起来
newImg.classList.add('img-xfade-in');
let done = false;
const finish = () => {
if (done) return; done = true;
newImg.classList.remove('img-xfade', 'img-xfade-in');
if (oldImg && oldImg.parentNode) oldImg.remove();
if (owner) owner.removeAttribute('data-img-fading');
if (onFinish) onFinish();
};
newImg.addEventListener('transitionend', finish, { once: true });
setTimeout(finish, IMG_FADE_MS + 140);   // 兜底：transitionend 不触发也能收尾
return true;
}
/* 战斗图：先走一遍「主图 → 原路径」预加载链，拿到真正能显示的 src 再淡入，
   避免过渡动画播到一半被 onerror 换 src 闪一下。 */
function fadeInBattleImg(oldImg, node, owner, onFinish) {
if (!node) return;
const chain = [node.getAttribute('src')].concat(
(node.getAttribute('data-fb') || '').split('|').filter(Boolean)).filter(Boolean);
const tryAt = i => {
if (i >= chain.length) { crossFadeImgNode(oldImg, node, owner, onFinish); return; }
const im = new Image();
im.onload = () => {
node.setAttribute('src', chain[i]);
const rest = chain.slice(i + 1);
if (rest.length) node.setAttribute('data-fb', rest.join('|')); else node.removeAttribute('data-fb');
crossFadeImgNode(oldImg, node, owner, onFinish);
};
im.onerror = () => { warnBadImg(chain[i], '战斗图找不到'); tryAt(i + 1); };
im.src = chain[i];
};
tryAt(0);
}
function switchAvatarCycle() {
avatarCycleTick++;
/* :not(.img-xfade) 排除正在淡入的临时节点，避免同一次 tick 被选中两次。 */
document.querySelectorAll('img.avatar-img[data-cycle]:not(.img-xfade)').forEach(img => {
const list = (img.getAttribute('data-cycle') || '').split('|').filter(Boolean);
if (!list.length) return;
const src = list[avatarCycleTick % list.length];
const probe = new Image();
probe.onload = () => {
if (img.isConnected === false) return;
/* clone 会原样带上 data-cycle / data-cycle-name / data-orig / onerror，
   下一轮定时器才能继续找到它，回退链也不会丢。 */
const next = img.cloneNode(true);
next.setAttribute('src', src);
next.removeAttribute('data-img-fallback');
const fb = img.getAttribute('data-orig') || '';
if (fb) next.setAttribute('data-fb', fb); else next.removeAttribute('data-fb');
crossFadeImgNode(img, next, img.parentElement);
};
/* 这一张找不到：保持当前画面不变，不冒出原路径图混淆，并提示一次。 */
probe.onerror = () => { warnBadImg(src, '头像轮换图找不到'); };
probe.src = src;
});
}
function startAvatarCycle() {
probeAvatarCycles();
if (avatarCycleTimer || !Object.keys(HERO_AVATAR_CYCLE).length) return;
avatarCycleTimer = setInterval(switchAvatarCycle, AVATAR_CYCLE_MS);
}

/* ===== 战斗图片状态刷新 =====
   ★ 关键：挂在【统一渲染入口】updateUnitDisplay / updateActionBarDots 上，
     不再只依赖「进入未来」「收到快照」两个事件点。
     无论规则从哪条路径变化、DOM 何时被重建，下一次刷新都会把图源校正过来。
   比较 data-battle-src，只有真正变了才换 <img>，不重建整块 innerHTML，
   所以血条动画、选中高亮、行动条位置都不会丢。 */
function syncUnitBattleImage(idx) {
const u = gameState.units[idx];
if (!u || isSummonUnit(u)) return;
const src = battleImgSrc(u);
const recheck = () => syncUnitBattleImage(idx);
const el = document.getElementById(`unit-${idx}`);
if (el && el.getAttribute('data-battle-src') !== src) {
el.setAttribute('data-battle-src', src);
const bg = el.querySelector('img.unit-bg:not(.img-xfade)');
const tmp = document.createElement('div'); tmp.innerHTML = unitBgHtml(u);
const node = tmp.querySelector('img');
if (node) fadeInBattleImg(bg, node, el, recheck);
else if (bg) bg.remove();
}
const dot = document.getElementById(`dot-${idx}`);
if (dot && dot.getAttribute('data-battle-src') !== src) {
dot.setAttribute('data-battle-src', src);
const oldImg = dot.querySelector('img.avatar-img:not(.img-xfade)');
const tmp2 = document.createElement('div'); tmp2.innerHTML = battleAvatarInner(u);
const node2 = tmp2.querySelector('img');
/* 圆点里还有首字母文本，只换 <img>，不重建整块 innerHTML。 */
if (node2) fadeInBattleImg(oldImg, node2, dot, recheck);
else dot.innerHTML = battleAvatarInner(u);
}
}
function refreshBattleImages() {
if (!gameState || !Array.isArray(gameState.units)) return;
for (let i = 0; i < gameState.units.length; i++) syncUnitBattleImage(i);
}

/* ===== 图片自检：网址加 ?imgcheck=1 时显示 =====
   逐条探测所有新路径与原路径，直接列出哪张 ✅ / 哪张 ❌。
   不加参数时完全不执行、不显示，对正常玩家零影响。 */
function collectConfiguredImages() {
const out = [], seen = new Set();
const add = (label, src) => { if (src && !seen.has(src)) { seen.add(src); out.push({ label, src }); } };
Object.keys(HERO_AVATAR_CYCLE).forEach(name => {
HERO_AVATAR_CYCLE[name].forEach((p, i) => add(`${name} · 头像${i + 1}`, p));
});
Object.keys(HERO_BATTLE_IMG).forEach(name => {
const cfg = HERO_BATTLE_IMG[name];
add(`${name} · 战斗图默认`, cfg.base);
(cfg.variants || []).forEach((v, i) => add(`${name} · 战斗图${v.rule || '变体' + (i + 1)}`, v.src));
(cfg.miraiPick || []).forEach((p, i) => add(`${name} · 未来随机图${i + 1}`, p));
});
[...new Set(Object.keys(HERO_AVATAR_CYCLE).concat(Object.keys(HERO_BATTLE_IMG)))]
.forEach(name => add(`${name} · 原路径兜底`, heroImgSrc(name)));
/* 探索模式怪物贴图（assets/pve/character/英文名.png） */
if (window.PVE && typeof window.PVE.imgCheckList === 'function') {
window.PVE.imgCheckList().forEach(it => add(it.label, it.src));
}
/* 神魂卡片贴图（assets/shenhun/套装拼音.png） */
if (window.SHENHUN_UI && typeof window.SHENHUN_UI.imgCheckList === 'function') {
window.SHENHUN_UI.imgCheckList().forEach(it => add(it.label, it.src));
}
return out;
}
function runImageSelfCheck() {
if (typeof location === 'undefined' || !/[?&]imgcheck=1(?:&|$)/.test(location.search || '')) return;
const items = collectConfiguredImages();
addHeishanToSelfCheck(items);
const box = document.createElement('div');
box.id = 'img-self-check';
box.style.cssText = 'position:fixed;left:8px;top:8px;z-index:99999;max-width:min(92vw,460px);max-height:80vh;overflow:auto;background:#10122aee;color:#eee;font:12px/1.7 monospace;padding:10px 12px;border:1px solid #ffd700;border-radius:8px;box-shadow:0 4px 20px #000;white-space:pre-wrap;word-break:break-all;';
document.body.appendChild(box);
const lines = []; let done = 0;
const render = () => {
box.innerHTML = `<b style="color:#ffd700">角色图片自检（${done}/${items.length}）</b>\n` +
items.map((it, i) => lines[i] || `⏳ ${it.label} → ${it.src}`).join('\n');
};
render();
items.forEach((it, i) => {
/* 视频不走 new Image()，单独探测：能 loadeddata 就算 ✅。 */
if (it.video) {
const v = document.createElement('video');
v.muted = true; v.playsInline = true; v.preload = 'auto';
const doneIt = (good) => { if (lines[i]) return; lines[i] = (good ? '✅ ' : '❌ ') + it.label + ' → ' + it.src + (good ? '' : '（视频找不到 / 格式不支持）'); done++; render(); };
v.onloadeddata = () => doneIt(true);
v.onerror = () => { warnBadImg(it.src, '自检视频未找到'); doneIt(false); };
setTimeout(() => doneIt(false), 4000);
v.src = it.src; v.load();
return;
}
const im = new Image();
im.onload = () => { if (!lines[i]) { lines[i] = `✅ ${it.label} → ${it.src}`; done++; render(); } };
im.onerror = () => { if (!lines[i]) { lines[i] = `❌ ${it.label} → ${it.src}（找不到：核对文件名 / 大小写 / 目录）`; warnBadImg(it.src, '自检未找到'); done++; render(); } };
im.src = it.src;
});
}

/* ===== 黑闪演出 =====
   节奏：【每一方】虎杖第一次触发黑闪播 3s 全屏视频（仅电脑端），
        之后一律播透明底抠图短闪；手机端从第一次起就全是抠图短闪。
   「方」按 attacker.side 分开记：我方虎杖与敌方虎杖各有自己的首播；
   联机时房主判定并广播 side，客机按【自己设备】决定视频还是抠图。
   · 纯视觉、不 await、不吃点击：伤害结算与联机队列完全不受影响；
   · 层级高于结算界面，视频能盖住结算播完再自动消失；
   · 两侧首播可能挨得很近 → 串行播放链，前一个播完才播下一个，3s 视频不会被拦腰截断；
   · 多段技能逐段独立判定黑闪 → 每方 1.2s 节流，一次行动只入队一回；
   · 视频放不出来（缺文件 / 自动播放被拦 / 格式不支持）→ 自动改用抠图短闪；
   · 系统开了「减少动态效果」→ 首播也改走静态抠图，不播视频；
   · 素材全缺时整层保持隐藏，游戏外观与原来完全一致。
   路径集中在这里，换素材只改下面两行。 */
const HEISHAN_VIDEO = 'assets/character_battle/ItadoriYuji_battle_video.mp4';  // 首播：3s 全屏视频
const HEISHAN_CUT   = 'assets/character_battle/ItadoriYuji_battle_kokusenn.png'; // 后续：透明底抠图
const HEISHAN_VIDEO_POSTER = '';   // 暂无首帧图；以后要加，把路径填这里即可
const HEISHAN_CUT_MS = 420;          // 与 styles.css 的 .42s 动画一致
const HEISHAN_VIDEO_MAX_MS = 3600;   // 3s 视频 + 余量，超时强制收尾
const HEISHAN_THROTTLE_MS = 1200;
let heishanVideoBySide = { player:false, enemy:false };
let heishanLastBySide = { player:0, enemy:0 };
let heishanTimer = null, heishanStageSeq = 0, heishanEpoch = 0;
let heishanChain = Promise.resolve();

/* 设备判定：与【背景分流】完全共用一套口径（精确指针 + 宽度≥821px）。
   优先读背景模块已经写在 body 上的 class，它随窗口/外接鼠标实时同步；
   背景模块没启动（素材或节点缺失提前 return）时再用 matchMedia 兜底。
   判定不可用时按【手机】处理 —— 宁可少一段动画，也别在移动端误播视频。 */
function isDesktopDevice() {
try {
const b = (typeof document !== 'undefined') ? document.body : null;
if (b && (b.classList.contains('bg-desktop') || b.classList.contains('bg-mobile'))) {
return b.classList.contains('bg-desktop');
}
if (typeof matchMedia === 'function') {
return matchMedia('(hover:hover) and (pointer:fine) and (min-width:821px)').matches;
}
} catch (e) { /* 落到下面的手机侧 */ }
return false;
}
function addHeishanToSelfCheck(items) {
if (!Array.isArray(items)) return;
items.push({ label: '黑闪 · 首播视频', src: HEISHAN_VIDEO, video: true });
items.push({ label: '黑闪 · 后续抠图', src: HEISHAN_CUT });
if (HEISHAN_VIDEO_POSTER) items.push({ label: '黑闪 · 视频首帧（可选）', src: HEISHAN_VIDEO_POSTER });
}
function hideHeishanFlash() {
const layer = document.getElementById('heishan-flash');
const v = document.getElementById('heishan-video');
const img = document.getElementById('heishan-cut');
if (layer) layer.classList.remove('show');
if (v) { v.classList.remove('show'); try { v.pause(); } catch (e) {} }
if (img) img.classList.remove('show');
}
function clearHeishanStage() {
/* 序号：任何一次清场都让「还飞在路上的预加载 / 超时回调」失效，
   避免上一局的抠图或视频兜底突然盖到新一局画面上。 */
heishanStageSeq++;
if (heishanTimer) { clearTimeout(heishanTimer); heishanTimer = null; }
hideHeishanFlash();
}
function resetHeishanEffect() {          // 每场战斗 / 重开时调用
clearHeishanStage();
heishanVideoBySide = { player:false, enemy:false };
heishanLastBySide = { player:0, enemy:0 };
heishanEpoch++;                 // 排队中尚未启动的旧任务直接作废
heishanChain = Promise.resolve();
}
function playHeishanCut() {
return new Promise(resolve => {
const layer = document.getElementById('heishan-flash');
const img = document.getElementById('heishan-cut');
if (!layer || !img) { resolve(); return; }
/* 先预加载：抠图找不到就整层不显示，绝不出现破图 / 白方块。 */
const seq = heishanStageSeq;
const probe = new Image();
probe.onload = () => {
if (seq !== heishanStageSeq) { resolve(); return; }
clearHeishanStage();
const seq2 = heishanStageSeq;
img.setAttribute('src', HEISHAN_CUT);
img.classList.remove('show');
void img.offsetWidth;                 // 重启动画
layer.classList.add('show');
img.classList.add('show');
heishanTimer = setTimeout(() => {
if (seq2 !== heishanStageSeq) { resolve(); return; }
hideHeishanFlash(); resolve();
}, HEISHAN_CUT_MS + 80);
};
probe.onerror = () => {
if (seq === heishanStageSeq) { warnBadImg(HEISHAN_CUT, '黑闪抠图找不到'); hideHeishanFlash(); }
resolve();
};
probe.src = HEISHAN_CUT;
});
}
function playHeishanVideo() {
const layer = document.getElementById('heishan-flash');
const v = document.getElementById('heishan-video');
return new Promise(resolve => {
if (!layer || !v || prefersReducedMotion()) { playHeishanCut().then(resolve, resolve); return; }
const seq = heishanStageSeq;
let settled = false, gotFrame = false;
const finish = () => {
if (settled) return; settled = true;
if (seq === heishanStageSeq) clearHeishanStage();
resolve();
};
const fallback = () => {
if (settled) return; settled = true;
if (seq !== heishanStageSeq) { resolve(); return; }   // 已被新局清场
warnBadImg(HEISHAN_VIDEO, '黑闪视频无法播放，改用抠图');
clearHeishanStage();
playHeishanCut().then(resolve, resolve);
};
v.onloadeddata = () => { gotFrame = true; };
v.onended = finish;
v.onerror = fallback;
try {
if (HEISHAN_VIDEO_POSTER) v.setAttribute('poster', HEISHAN_VIDEO_POSTER);
else v.removeAttribute('poster');
v.setAttribute('src', HEISHAN_VIDEO);
v.currentTime = 0;
layer.classList.add('show');
v.classList.add('show');
const p = v.play();
if (p && typeof p.catch === 'function') p.catch(fallback);
} catch (e) { fallback(); return; }
/* 兜底①：迟迟没拿到画面（缺文件 / 编码不支持 / 自动播放被拦但没 reject） */
setTimeout(() => { if (!settled && !gotFrame && seq === heishanStageSeq) fallback(); }, 1800);
/* 兜底②：总时长上限，ended 不触发也能收尾 */
heishanTimer = setTimeout(finish, HEISHAN_VIDEO_MAX_MS);
});
}
function playHeishanEffect(first, fromNet, side) {
if (fromNet && side) heishanVideoBySide[side] = true;
clearHeishanStage();
/* ★ 手机端不播视频：第一次也走和后续【完全一样】的抠图短闪。
   判定放在播放端本地，所以联机房主是电脑、客机是手机时，
   房主看视频、客机看抠图，各按自己设备来，广播内容不需要带设备信息。
   首播标记仍照常置 true —— 只是表现降级，「每一方一次」的口径不变。 */
const useVideo = first && isDesktopDevice();
return useVideo ? playHeishanVideo() : playHeishanCut();
}
/* 串行播放链：两侧首播挨得近时，前一个播完才播下一个，谁都不会被拦腰截断。 */
function queueHeishanEffect(first, fromNet, side) {
const epoch = heishanEpoch;
heishanChain = heishanChain.catch(() => {}).then(() => {
if (epoch !== heishanEpoch) return;   // 已重开新局，旧任务作废
return playHeishanEffect(first, fromNet, side);
}).catch(() => {});
return heishanChain;
}
/* 房主 / 单机：按【方】判定首播 + 节流 + 广播。客机只收消息，不调这里。 */
function triggerHeishanEffect(attacker) {
const side = (attacker && attacker.side) || 'player';
const now = Date.now();
if (now - (heishanLastBySide[side] || 0) < HEISHAN_THROTTLE_MS) return;
heishanLastBySide[side] = now;
const first = !heishanVideoBySide[side];
heishanVideoBySide[side] = true;
queueHeishanEffect(first, false, side);
if (typeof Net !== 'undefined' && Net.active && Net.role === 'host' && typeof Net.onHeishan === 'function') {
Net.onHeishan(first, side);
}
}
const HERO_DATA = {
"主角": { atk:800, def:300, hp:6840, spd:110, effectHit:0, effectResist:0, critRate:0.1, critDmg:1.5, color:'#ffd700', tag:'均衡',
normal: { name:"斩击", type:"single", dmgRate:1.0, target:"enemy" },
skill: { name:"剑爆", cost:4, type:"aoe", dmgRate:1.4, target:"enemy", selfEffect:"rageAll1" },
descNormal: "对敌方目标造成 <span class='dmg'>100%</span> 伤害。", descSkill: "对敌方全体造成 <span class='dmg'>140%</span> 伤害，恢复我方全体 <span class='buff'>1点怒气</span>。",
mechanics: [] },
"捷克罗姆": { atk:1100, def:350, hp:7560, spd:117, effectHit:0, effectResist:0, critRate:0.12, critDmg:1.6, color:'#1565c0', tag:'攻击',   // 深蓝
normal: { name:"电击", type:"single", dmgRate:0.9, trueRate:0.3, target:"enemy" },
skill: { name:"交错闪电", cost:4, type:"single_then_aoe", dmgRate:1.8, trueRate:0.9, aoeDmgRate:1.0, aoeTrueRate:0.5, target:"enemy", selfEffect:"thunderPress" },
descNormal: "对敌方目标造成 <span class='dmg'>90%</span> 伤害和 <span class='true-dmg'>30%真实伤害</span>。",
descSkill: "对敌方目标造成 <span class='dmg'>180%</span> 伤害和 <span class='true-dmg'>90%真实伤害</span>，然后对敌方全体造成 <span class='dmg'>100%</span> 伤害和 <span class='true-dmg'>50%真实伤害</span>。自身获得<span class='m-mark'>雷压</span>（持续3回合）与 <span class='buff'>最大生命值35%的护盾</span>。",
mechanics: [
{ type:'mark', name:'雷压', desc:'增益印记：提升自身30%速度、20%最终伤害、30%暴击率，不可叠加。' },
{ type:'note', name:'护盾', desc:'优先于生命值承受伤害。' }] },
"东丈": { atk:945, def:270, hp:6858, spd:115, effectHit:0, effectResist:0, critRate:0.1, critDmg:1.5, color:'#ffd700', tag:'攻击',   // 黄（与主角同色）
normal: { name:"风拳", type:"single", dmgRate:1.2, target:"enemy", selfEffect:"windWalk" },
skill: { name:"龙卷风", cost:4, type:"single", dmgRate:3.4, target:"enemy", effect:"stun", selfEffect:"galeWind" },
/* 「不屈」每局游戏限触发一次：次数记在单位上（buquUsed），startBattle 时随单位重建归零。 */
passive: { name:"不屈", desc:"受到致命伤害时，移除自身所有减益状态、印记，保留 <span class='buff'>1点</span>生命值，对伤害来源施放「龙卷风」；若伤害来源因此阵亡，则<span class='restore'>恢复</span>自身 <span class='heal'>100%</span>最大生命值的生命值。每局游戏限触发一次。" },
descNormal: "对敌方目标造成 <span class='dmg'>120%</span> 伤害，自身获得 <span class='m-mark'>1层风行</span>。",
descSkill: "对敌方目标造成 <span class='dmg'>340%</span> 伤害，并使其陷入 <span class='m-state'>眩晕</span>（持续1回合），自身获得 <span class='m-mark'>1层狂风</span> 与 <span class='m-mark'>2层风行</span>。",
mechanics: [
{ type:'mark', name:'风行', desc:'增益印记：提升自身速度25点，最多叠加5层。' },
{ type:'mark', name:'狂风', desc:'增益印记：提升自身攻击150点、防御100点，最多叠加3层。' },
{ type:'state', name:'眩晕', desc:'减益状态：控制效果，目标无法行动。不可叠加。' } ] },
"白藏主": { atk:550, def:320, hp:7680, spd:171, effectHit:0, effectResist:0, critRate:0.05, critDmg:1.5, color:'#26c6da', tag:'防御',   // 浅蓝（与鬼金羊同色）
normal: { name:"炎影", type:"single", dmgRate:1.0, target:"enemy", effect:"rageDown" },
skill: { name:"梦山狐影", cost:4, type:"buff", target:"ally", selfEffect:"foxGuard" },
descNormal: "对敌方目标造成 <span class='dmg'>100%</span> 伤害，有 <span class='buff'>50%概率</span> 使目标减 <span class='buff'>1点怒气</span>。",
descSkill: "使攻击最高的友方单位和血量最低的友方单位获得 <span class='m-mark'>狐守</span>（我方至多同时存在2个单位拥有狐守），持续2回合。然后自身获得 <span class='m-mark'>狐佑</span>，持续2回合。",
mechanics: [
{ type:'mark', name:'狐守', desc:'增益印记：提升20%最终免伤率；拥有印记的友方所受伤害由白藏主代为承受。随施放者阵亡清空。不可叠加。' },
{ type:'mark', name:'狐佑', desc:'增益印记：提升自身25%最终免伤率，不可叠加。' }
] },
"宇智波带土": { atk:1000, def:250, hp:6840, spd:115, effectHit:0, effectResist:0, critRate:0.12, critDmg:1.6, color:'#d32f2f', tag:'攻击',
normal: { name:"突袭", type:"single", dmgRate:0.63, hitCount:2, target:"enemy", effect:"kamuiMark" },
skill: { name:"神威·虚化", cost:4, type:"banish", target:"enemy", selfEffect:"intangibility" },
descNormal: "对敌方目标造成两段 <span class='dmg'>63%</span> 伤害，并使目标附加 <span class='m-mark'>1层神威</span>。",
descSkill: "将敌方目标放逐至神威空间（<span class='m-rule'>放逐</span>），同时自身进入 <span class='m-rule'>虚化</span>，均持续至施放者带土下回合结束。放逐结束后，施放者带土立即对该目标分别造成 <span class='dmg'>50%</span>伤害、<span class='dmg'>70%</span>伤害、<span class='true-dmg'>90%真实伤害</span>，敌方全体附加 <span class='m-mark'>1层神威</span>，然后对敌方全体造成 <span class='true-dmg'>36%真实伤害</span>。敌方放逐存在时，无法施放此技能。",
mechanics: [
{ type:'mark', name:'神威', desc:'减益印记：受到攻击时，每层额外附加施加者12%真实伤害（该伤害不可转移），同时施加者+12%行动条，最多叠加3层。随施放者阵亡清空。' },
{ type:'rule', name:'放逐', desc:'规则：视为离开战局。期间无法行动，无法选中，无法被治疗、恢复，行动条锁定；目标相关的所有状态、印记失效，神魂失效（2件套效果），免疫伤害，取消效果buff的变化。随施放者阵亡清空。' },
{ type:'rule', name:'虚化', desc:'规则：免疫伤害与减益效果。进入时移除自身所有减益状态与减益印记，持续期间免疫减益状态与减益印记。' } ] },
"镰鼬": { atk:700, def:285, hp:6780, spd:117, effectHit:0, effectResist:0, critRate:0.08, critDmg:1.5, color:'#aed581', tag:'辅助',
normal: { name:"胖揍", type:"single", dmgRate:1.0, target:"enemy", effect:"stunChance" },
skill: { name:"兄弟之绊", cost:4, type:"buff", target:"ally", selfEffect:"bond" },
passive: { name:"人多势众", turnEnd:'renDuoShiZhong',
desc:"回合结束后，有 <span class='buff'>30%</span> 概率使自身<span class='buff'>+100%行动条</span>。" },
descNormal: "对敌方目标造成 <span class='dmg'>100%</span> 伤害，<span class='buff'>30%基础概率</span> 附加<span class='m-state'>眩晕</span>（持续1回合）。",
descSkill: "全体行动条+<span class='buff'>30%</span>，同时全体获得 <span class='m-state'>牵绊</span>（持续2回合）。",
mechanics: [
{ type:'state', name:'牵绊', desc:'增益状态：+25%攻击、+10%防御、+10%暴击率，持续2回合。不可叠加。' },
{ type:'state', name:'眩晕', desc:'减益状态：控制效果，目标无法行动。不可叠加。' } ] },
"鬼王酒吞童子": { atk:800, def:300, hp:6960, spd:109, effectHit:0, effectResist:0, critRate:0.08, critDmg:1.5, color:'#ffd700', tag:'均衡',
normal: { name:"焚天", type:"single", dmgRate:1.2, target:"enemy" },
skill: { name:"天火怒焱", cost:4, type:"aoe", dmgRate:0, target:"enemy", effect:"dispelAndPush", selfEffect:"guiWangZiTai", requireNoMark:"鬼王姿态" },
opening: 'jiutunMarks',
passive: { name:"红莲",
desc:"自身免疫控制，自身治疗减免 <span class='debuff'>30%</span>。先机：使友方全体获得 <span class='m-mark'>大妖之力</span>。" },
descNormal: "对敌方目标造成 <span class='dmg'>120%</span> 伤害。（强化<span class='k'>烈焰焚天</span>：对敌方目标造成 <span class='dmg'>200%</span> 伤害，<span class='dmg'>溅射40%</span> 给其余敌方）",
descSkill: "驱散敌方全体随机1个增益状态，击退敌方全体行动条 <span class='buff'>40%</span>，然后自身获得 <span class='m-mark'>鬼王姿态</span>（持续2回合）。仅在无<span class='m-mark'>鬼王姿态</span>时可施放此技能。",
mechanics: [
{ type:'mark', name:'大妖之力', desc:'增益印记：每损失1%最大生命值，提升1%最终伤害率与0.5%最终免伤率。随施放者阵亡清空。不可叠加。' },
{ type:'mark', name:'鬼王姿态', desc:'增益印记：强化自身普攻。不可叠加。' },
{ type:'note', name:'先机', desc:'战斗开始时，触发一次相应效果。' } ] },
"雪拉比": { atk:500, def:310, hp:7200, spd:115, effectHit:0, effectResist:0, critRate:0.08, critDmg:1.5, color:'#69f0ae', tag:'辅助',
normal: { name:"治愈", type:"single", healRate:1.8, target:"ally", healEffect:"targetRageUp1" },
skill: { name:"预知未来", cost:4, type:"damageLog", target:"ally", cooldown: 2 },
descNormal: "<span class='heal'>治疗</span>单个友方 <span class='heal'>180%</span> 生命，并使目标获得 <span class='buff'>1点怒气</span>。",
descSkill: "施放后记录所有友方受到的总伤害值至雪拉比下回合开始，雪拉比下回合开始时，将记录值的 <span class='heal'>80%</span> 平均分配<span class='restore'>恢复</span>至所有存活友方，并使所有存活友方<span class='restore'>恢复</span>雪拉比最大生命值 <span class='heal'>9%</span> 的生命值。若记录期间友方阵亡，则雪拉比的恢复结算后额外复活记录期间阵亡友方至 <span class='buff'>1点</span>生命。技能冷却：2回合。",
mechanics: [] },
"纲手": { atk:700, def:360, hp:8160, spd:108, effectHit:0, effectResist:0, critRate:0.2, critDmg:1.6, color:'#f48fb1', tag:'辅助',
normal: { name:"怪力", type:"single", dmgRate:1.5, target:"enemy", effect:"guaiLi" },
skill: { name:"百豪之术", cost:4, type:"buff", target:"ally", selfEffect:"hundredHeal" },
descNormal: "对敌方单个目标造成 <span class='dmg'>150%</span> 伤害，<span class='buff'>30%基础概率</span>使目标附加 <span class='m-state'>眩晕</span>（持续1回合），并使当前生命值最低的友方<span class='buff'>+15%</span>行动条。",
descSkill: "<span class='heal'>治疗所有友方200%生命</span>，使所有友方获得 <span class='m-state'>百豪</span>（持续3回合），全体友方<span class='buff'>+20%行动条</span>。",
mechanics: [
{ type:'state', name:'百豪', desc:'增益状态：提升10%攻击、20%治疗加成，持续3回合。不可叠加。' },
{ type:'state', name:'眩晕', desc:'减益状态：控制效果，目标无法行动。不可叠加。' } ] },
"裂空座": { atk:1050, def:270, hp:7440, spd:113, effectHit:0, effectResist:0, critRate:0.12, critDmg:1.6, color:'#00c853', tag:'攻击',
normal: { name:"龙爪", type:"single", dmgRate:1.2, target:"enemy", selfEffect:"dragonDance" },
skill: { name:"画龙点睛", cost:4, type:"aoe", dmgRate:2.6, target:"enemy", selfEffect:"defDownPerm" },
descNormal: "对敌方目标造成 <span class='dmg'>120%</span> 伤害，获得 <span class='m-mark'>1层龙之舞</span>。",
descSkill: "对敌方全体造成 <span class='dmg'>260%</span> 伤害。自身防御永久降低 <span class='dmg'>80</span>。",
mechanics: [{ type:'mark', name:'龙之舞', desc:'增益印记：提升15%最终伤害率、10点速度，最多叠加3层。' }] },
"流光追月神": { atk:550, def:296, hp:7320, spd:111, effectHit:0, effectResist:0, critRate:0.05, critDmg:1.5, color:'#9575cd', tag:'辅助',
normal: { name:"流明", type:"single", dmgRate:1.0, target:"enemy", effect:"rageDown" },
skill: { name:"飞彩凝辉", cost:4, type:"buff", target:"ally", selfEffect:"flowingLight" },
opening: 'liuguangRage',
passive: { name:"绮罗舞", turnStart:'qiluoDanceStart', turnEnd:'qiluoDance',
desc:"自身回合开始时，使所有携带 <span class='m-mark'>流光</span> 的友方获得 <span class='m-mark'>1层照君</span>，驱散其随机 <span class='buff'>1个减益状态</span>，并移除流光。自身回合结束时恢复全体友方 <span class='buff'>1点怒气</span>，怒气≥4的友方获得 <span class='m-mark'>1层照君</span>。先机：速度最高的3名友方获得 <span class='buff'>2点怒气</span>。" },
descNormal: "对敌方目标造成 <span class='dmg'>100%</span> 伤害，<span class='buff'>50%概率</span> 使其减 <span class='buff'>1点怒气</span>。",
descSkill: "全体友方获得 <span class='m-mark'>流光</span>。",
mechanics: [
{ type:'mark', name:'流光', desc:'增益印记：携带者怒气减少时（不包括技能消耗的怒气），恢复1点怒气，然后移除此印记。随施放者阵亡清空。不可叠加。' },
{ type:'mark', name:'照君', desc:'增益印记：提升8%攻击、5点速度，最多叠加5层。' },
{ type:'note', name:'先机', desc:'战斗开始时，触发一次相应效果。' } ] },
"维迦": { atk:1000, def:250, hp:6480, spd:112, effectHit:0, effectResist:0, critRate:0.3, critDmg:1.8, color:'#6a1b9a', tag:'攻击',
normal: { name:"黑暗祭祀", type:"single", dmgRate:1.0, target:"enemy", selfEffect:"darkEssence" },
/* 技能1「扭曲空间」cost 2：击杀只给 1 层超凡邪力（无全套收益）。
   技能2「能量爆裂」cost 4：击杀给全套（超凡邪力 + 4怒气 + 行动条60% + 恢复30%）。
   两者用 vayneFullKill 标记区分，killUnit 里读该标记决定给多少。 */
skill:  { name:"扭曲空间", cost:2, type:"single", dmgRate:1.4, target:"enemy", effect:"stun", selfEffect:"darkEssence", vayneFullKill:false },
skill2: { name:"能量爆裂", cost:4, type:"single", dmgRate:3.0, target:"enemy", selfEffect:"darkEssence", vayneFullKill:true },
descNormal: "对敌方目标造成 <span class='dmg'>100%</span> 伤害，若造成击杀（非召唤物）则获得 <span class='m-mark'>1层超凡邪力</span>。",
descSkill: "对敌方目标造成 <span class='dmg'>140%</span> 伤害，并附加<span class='m-state'>眩晕</span>（持续1回合），若造成击杀（非召唤物）则获得 <span class='m-mark'>1层超凡邪力</span>。",
descSkill2: "对敌方目标造成 <span class='dmg'>300%</span> 伤害，若造成击杀（非召唤物）则获得 <span class='m-mark'>1层超凡邪力</span>，且回合结束后自身 <span class='buff'>+60%行动条</span>，获得 <span class='buff'>4点怒气</span>，<span class='restore'>恢复</span>自身最大生命值 <span class='heal'>30%</span> 的生命值。",
mechanics: [{ type:'mark', name:'超凡邪力', desc:'增益印记：永久提升攻击20%、暴击率10%、暴击伤害20%、最终伤害率10%，最多叠加5层。' },
{ type:'state', name:'眩晕', desc:'减益状态：控制效果，目标无法行动。不可叠加。' }] },
"心友犬神": { atk:900, def:270, hp:6720, spd:110, effectHit:0, effectResist:0, critRate:0.1, critDmg:1.5, color:'#26c6da', tag:'均衡',   // 浅蓝（与鬼金羊同色）
normal: { name:"天心斩", type:"single", dmgRate:1.2, target:"enemy", effect:"queZhiYin" },
skill: { name:"浪客归刃", cost:4, type:"buff", target:"ally", selfEffect:"langKeGuiRen" },
opening: 'langKeOpening',
/* 额外技能：不可主动施放，仅由「守势」触发；有技能演出 */
extraSkills: {
yiShiGuiXin: { name:"一誓归心", type:"aoe", dmgRate:0.8, target:"enemy" }
},
descExtra: "对敌方全体造成 <span class='dmg'>80%</span> 伤害（每个单位回合限1次，自身回合开始前限4次），不触发对方 <span class='m-mark'>守势</span> 效果。",
descNormal: "对敌方目标造成 <span class='dmg'>120%</span> 伤害，并对目标附加 <span class='m-mark'>1层雀之印</span>。",
descSkill: "使自身、主角以及生命比例最低的友方单位（不包括自身和主角）获得心友犬神攻击 <span class='buff'>80%</span> 的护盾。自身获得 <span class='m-mark'>守势</span>（持续2回合）。先机：施放「浪客归刃」。",
mechanics: [
{ type:'mark', name:'雀之印', desc:'减益印记：上限2层。达到上限时，受到施加者造成的三段50%伤害，移除所有层数。随施放者阵亡清空。' },
{ type:'mark', name:'守势', desc:'增益印记：获得270点防御。拥有护盾的友方单位受到攻击时，施放「一誓归心」。不可叠加。' },
{ type:'note', name:'先机', desc:'战斗开始时，触发一次相应效果。' },
{ type:'note', name:'护盾', desc:'优先于生命值承受伤害。' } ] },
"鬼金羊": { atk:510, def:340, hp:7380, spd:118, effectHit:0, effectResist:0, critRate:0.08, critDmg:1.5, color:'#26c6da', tag:'辅助',
normal: { name:"奇袭", type:"single", dmgRate:1.0, target:"enemy" },
/* 技能1「宿影暗渡」：同时具备【被动效果】与【主动施放】两部分。
   被动部分写在 passive.desc；主动部分写在 castDesc，详情页分开渲染。
   消耗 0 点怒气 —— 因此不能用 cost 判断是否为普攻，统一走 __kind。 */
skill: { name:"宿影暗渡", cost:0, type:"buff", target:"enemy", selfEffect:"suYingAnDu" },
skill2: { name:"鬼宿奇惊·长星", cost:4, type:"single", dmgRate:0, target:"enemy", effect:"changXingSuo" },
opening: 'suyingOpening',
/* 额外技能：不可主动施放，由「长星锁」到期触发；有技能演出 */
extraSkills: {
miYe: { name:"鬼宿奇惊·谜夜", type:"skip", target:"enemy" }
},
/* boundSkill：标明这条【被动】是主动技能「宿影暗渡」的一部分。
   因此它随技能走 —— 只受【无法行动】约束，不受【被动失效】影响。 */
passive: { name:"宿影暗渡", boundSkill:'宿影暗渡',
desc:"敌方每减少 <span class='buff'>2点怒气</span>（包括技能消耗），自身获得 <span class='m-mark'>1层宿影阵</span>。自身免疫 <span class='m-mark'>长星锁</span>。先机：获得 <span class='m-mark'>3层宿影阵</span>与 <span class='buff'>2点怒气</span>。" },
descNormal: "对敌方目标造成 <span class='dmg'>100%</span> 伤害。",
descSkill: "消耗 <span class='buff'>0点怒气</span>，减少敌方随机有怒气的 <span class='buff'>2个单位1点怒气</span>，我方随机 <span class='buff'>2个单位恢复1点怒气</span>。",
castDesc: "消耗 <span class='buff'>0点怒气</span>，减少敌方随机有怒气的 <span class='buff'>2个单位1点怒气</span>，我方随机 <span class='buff'>2个单位恢复1点怒气</span>。",
descSkill2: "对敌方目标附加 <span class='m-mark'>长星锁</span>，并使下个友方单位获得 <span class='buff'>2点怒气</span>。",
descExtra: "跳过目标回合。",
mechanics: [
{ type:'mark', name:'宿影阵', desc:'增益印记：上限5层。达到上限时，施放「宿影暗渡」，移除所有层数。' },
{ type:'mark', name:'长星锁', desc:'减益印记：携带者行动条达到100%时，鬼金羊对其施放「鬼宿奇惊·谜夜」，然后移除此印记。随施放者阵亡清空。不可叠加。' },
{ type:'note', name:'先机', desc:'战斗开始时，触发一次相应效果。' } ] },
"禅心云外镜": { atk:500, def:302, hp:7536, spd:113, effectHit:0, effectResist:0, critRate:0.05, critDmg:1.5, color:'#8d6e63', tag:'防御',   // 棕（心友犬神改前用色）
normal: { name:"水无垠", type:"single", dmgRate:1.0, target:"enemy", selfEffect:"shuiWuYin" },
/* 技能1「心净明」：与鬼金羊「宿影暗渡」同一模式 ——
   被动部分（行动阶段重新分配友方生命）写在 passive.desc 且用 boundSkill 绑定，
   主动部分写在 castDesc，详情页自动拼成「被动…【施放】…」。 */
/* pickTarget:true —— 「buff」型默认作用于自身/全体、不选目标；
   心净明只作用于【单个友方】，故显式声明需要玩家/AI 指定目标。 */
/* 【施放】部分带 1 回合冷却（被动部分不受冷却影响 —— 那是行动阶段的自动结算） */
skill:  { name:"心净明", cost:4, type:"buff", target:"ally", selfEffect:"xinJingMingCast", pickTarget: true, cooldown: 1 },
skill2: { name:"万法皆空", cost:4, type:"buff", target:"ally", selfEffect:"wanFaJieKong", cooldown: 3 },   // cooldown 字面量 = WANFA_DURATION
passive: { name:"心净明", boundSkill:'心净明',
desc:"行动阶段时，重新分配友方总生命，使得友方生命百分比相同。" },
castDesc: "消耗 <span class='buff'>4点怒气</span>，移除友方目标的所有减益状态和印记，使其<span class='buff'>+30%行动条</span>。若未能移除，则改为使其<span class='buff'>+100%行动条</span>。技能冷却时间：一回合。",
descNormal: "对敌方目标造成 <span class='dmg'>100%</span> 伤害，并移除自身所有减益状态和印记。",
descSkill: "行动阶段时，重新分配友方总生命，使得友方生命百分比相同。",
descSkill2: "扣除全体友方 <span class='dmg'>50%当前生命值</span>，使全体友方获得各自 <span class='buff'>50%最大生命值</span> 的护盾。使全体友方获得 <span class='m-mark'>万法</span>，持续三回合。三个回合后，<span class='m-note'>翻转</span>全体友方的生命值，并清除全体友方的护盾。技能冷却时间：三回合。",
mechanics: [
{ type:'mark', name:'万法', desc:'增益印记：提升10%速度，不可叠加。' },
{ type:'note', name:'翻转', desc:'当前生命值与已损失生命值互换。' },
{ type:'note', name:'护盾', desc:'优先于生命值承受伤害。' } ] },
"两面宿傩": { atk:1020, def:310, hp:7450, spd:118, effectHit:0, effectResist:0, critRate:0.12, critDmg:1.6, color:'#d50000', tag:'攻击',
normal: { name:"解·捌", type:"single", dmgRate:1.0, target:"enemy", sukunaForm:"jie" },
skill: { name:"灶", cost:2, type:"single", dmgRate:1.34, trueRate:0.67, fixedMaxHpRate: 0.1, target:"enemy" },
skill2: { name:"伏魔神龛", cost:4, type:"aoe", trueRate:1.0, fixedMaxHpRate: 0.1, target:"enemy", selfEffect:"fuMo", canExecute:true },   // 0.1 = SUKUNA_FIXED_MAXHP_RATE
passive: { name:"斩击反转", onDamaged:'sukunaRestore',
desc:"两面宿傩的普攻在<span class='k'>「解」</span>与<span class='k'>「捌」</span>之间切换，施放普攻后切换一次，初始为<span class='k'>解</span>。受到伤害后，<span class='restore'>恢复</span>自身 <span class='heal'>6%</span>最大生命值的生命值。" },
descNormal: "<span class='k'>解</span>：对敌方目标造成两段 <span class='dmg'>63%</span> 的伤害（强化：额外造成 <span class='true-dmg'>63%真实伤害</span>）。<br><span class='k'>捌</span>：对敌方目标造成攻击 <span class='true-dmg'>120%的真实伤害</span>与 <span class='fixed-dmg'>10%目标最大生命值的固定伤害</span>（强化：若造成伤害过程中或结束后目标生命值低于 <span class='dmg'>10%</span>，则直接<span class='m-note'>斩杀</span>目标）。",
descSkill: "对敌方目标造成 <span class='dmg'>134%</span>伤害、<span class='true-dmg'>67%真实伤害</span>与 <span class='fixed-dmg'>10%目标最大生命值的固定伤害</span>。",
descSkill2: "分别对敌方全体造成 <span class='true-dmg'>100%真实伤害</span>与 <span class='fixed-dmg'>10%目标最大生命值的固定伤害</span>，若造成伤害过程中或结束后目标生命值低于 <span class='dmg'>10%</span>，则直接<span class='m-note'>斩杀</span>目标。使自身获得 <span class='m-mark'>伏魔</span>（持续2回合）。",
mechanics: [
{ type:'mark', name:'伏魔', desc:'增益印记：强化两面宿傩的普攻，不可叠加。' },
{ type:'note', name:'斩杀', desc:'达成斩杀条件时，目标立即死亡。' },
{ type:'note', name:'固定伤害', desc:'造成固定数值的伤害，不受任何影响，无视护盾。' } ] },
"五条悟": { atk:1010, def:300, hp:6900, spd:119, effectHit:0, effectResist:0, critRate:0.1, critDmg:1.5, color:'#40c4ff', tag:'攻击',
normal: { name:"苍", type:"single", dmgRate:1.2, target:"enemy" },
skill: { name:"无量空处", cost:4, type:"aoe", trueRate:0.8, fixedMaxHpRate:0.08, target:"enemy", effect:"hunLuan" },
/* 技能2「茈」：纯直接伤害的群体技。
   type:'aoe' 会自动走 isNoTargetSkill → 无需选目标；dmgRate 由 calculateDamage 结算，
   与裂空座「画龙点睛」同口径（普通伤害，吃防御/暴击/最终伤害率，不是真实伤害）。 */
skill2: { name:"茈", cost:5, type:"aoe", dmgRate:2.0, target:"enemy" },
passive: { name:"六眼·无下限",
desc:"友方单位施放技能时，对随机敌方目标附加 <span class='m-mark'>视</span>。受到攻击时，自身获得 <span class='buff'>8%最大生命值</span>的护盾（每个单位回合限一次）。" },
descNormal: "对敌方目标造成 <span class='dmg'>120%</span> 伤害。",
descSkill: "对敌方全体造成 <span class='true-dmg'>80%真实伤害</span>与 <span class='fixed-dmg'>8%目标最大生命值的固定伤害</span>，每个目标有 <span class='buff'>40%基础概率</span>被附加 <span class='m-state'>混乱</span>（持续1回合）。",
descSkill2: "对敌方全体造成 <span class='dmg'>200%</span> 伤害。",
mechanics: [
{ type:'mark', name:'视', desc:'减益印记：任意单位行动后，五条悟会对携带者造成 <span class="dmg">40%</span> 伤害（不可转移），对携带者造成 <span class="dmg">3次</span>伤害后移除。场上最多 <span class="dmg">3个</span>敌方单位携带此印记。随施放者阵亡清空。不可叠加。' },
{ type:'state', name:'混乱', desc:'减益状态：控制效果，携带者行动阶段时，改为对场上随机目标普攻。不可叠加。' },
{ type:'note', name:'护盾', desc:'优先于生命值承受伤害。' } ] },
/* 虎杖悠仁：noCrit = 被动「自身无法暴击」，critRate 只用于黑闪的溢出判定。
   segments = 同一技能内各段倍率不同（与 hitCount「同一段重复 N 次」不同）。 */
"虎杖悠仁": { atk:900, def:350, hp:7800, spd:117, effectHit:0, effectResist:0, critRate:0, critDmg:0, color:'#ff80ab', tag:'攻击',   // 粉
noCrit: true,
normal: { name:"径庭拳", type:"single", target:"enemy", segments:[{ dmgRate:0.5 }, { dmgRate:0.7 }] },
skill: { name:"穿血", cost:2, type:"single", dmgRate:1.6, target:"enemy" },
skill2: { name:"斩击·领域", cost:4, type:"single", target:"enemy", segments:[{ dmgRate:0.8 }, { dmgRate:0.8 }, { dmgRate:0.8 }], effect:"itadoriHunLuan" },
passive: { name:"黑闪·登神",
desc:"自身无法暴击，暴击率超过 <span class='k'>100%</span> 时，<span class='m-note'>黑闪</span>概率随溢出值等量提升。第一次触发<span class='m-note'>黑闪</span>后，自身进入 <span class='m-rule'>未来</span>。" },
descNormal: "对敌方目标分别造成 <span class='dmg'>50%</span>、<span class='dmg'>70%</span> 伤害。",
descSkill: "对敌方目标造成 <span class='dmg'>160%</span> 伤害。（强化：改为对敌方全体造成 <span class='dmg'>160%</span> 伤害）",
descSkill2: "对敌方目标造成三段 <span class='dmg'>80%</span> 伤害，并使目标附加 <span class='m-state'>混乱</span>（持续1回合）。（强化：额外对敌方全体造成三段 <span class='dmg'>80%</span> 伤害）",
mechanics: [
{ type:'rule', name:'未来', desc:'规则：强化虎杖悠仁的所有技能，攻击提升50%，速度提升20%，暴击率提升30%，进入时恢复100%最大生命值，每次行动后恢复10%最大生命值。' },
{ type:'state', name:'混乱', desc:'减益状态：控制效果，携带者行动阶段时，改为对场上随机目标普攻。不可叠加。' },
{ type:'note', name:'黑闪', desc:'攻击时，5%概率将本次伤害值调整为伤害结果的2.5次方。' } ] },
/* 钉崎野蔷薇：
   · 被动「共鸣」走 PASSIVE_ON_DAMAGED 注册表（onDamaged:'gongming'），
     伤害量由统一入口透传，不另开钩子。
   · 技能 type:'summon' —— 需要选单个敌方目标，因此不加入 NO_TARGET_SKILL_TYPES。
     自动战斗时该技能锁定当前绝对血量最高的敌方角色（见 AUTO_SKILL_HIGH_HP），普攻仍取最低血。
   · 「传导伤害」与「稻草人」两条机制见下方 mechanics，教程伤害类型页另有完整定义。 */
"钉崎野蔷薇": { atk:800, def:280, hp:6700, spd:118, effectHit:0, effectResist:0, critRate:0.1, critDmg:1.5, color:'#ff9800', tag:'均衡',   // 橙
normal: { name:"锤击", type:"single", dmgRate:1.2, target:"enemy" },
skill: { name:"刍灵咒法·共鸣", cost:4, type:"summon", target:"enemy" },
passive: { name:"共鸣", onDamaged:"gongming",
desc:"自身受到伤害时，使上一次被自身攻击的目标受到本次伤害的等量<span class='m-note'>传导伤害</span>。" },
descNormal: "对敌方目标造成 <span class='dmg'>120%</span> 伤害。",
descSkill: "召唤一个与目标连接的<span class='m-note'>稻草人</span>至敌方场上，稻草人继承目标 <span class='buff'>100%</span> 最大生命值与 <span class='buff'>50%</span> 防御。稻草人受到的伤害会等量<span class='m-note'>传导</span>给目标。",
mechanics: [
{ type:'note', name:'传导伤害', desc:'不参与伤害公式计算，直接造成伤害，无视护盾。' },
{ type:'note', name:'稻草人', desc:'召唤物：双方场上只能存在一个（再次施放会覆盖原有），速度为0、无法行动。受到的伤害等量传导给连接目标。' } ] }
};
let gameMode = 'pve'; // 'pve' 人机对战 | 'pvp' 双人对战
// 注：已移除 actingUnit / battleLog / selectedTarget 三个从未被读取的僵尸字段
let gameState = { phase:'modeSelect', units:[], playerTeam:[], enemyTeam:[], actionBarMax:0, paused:false, auto:{ player:false, enemy:false }, animating:false, waitingForTarget:false, targetType:null, pendingSkill:null, currentActor:null, lastTimestamp:0, rafId:null, snowballSnapshot:null, vayneKillThisTurn:false, damageLogTotal:0, damageLogSide:null, shouShiFiring:false, shouShiTurnCount:0, wuXianXiaTurnCount:0, pendingCasts:[], needFlushAfterActionable:false, damageLogFallen:[], actionHookBusy:false, summonIdx:{ player:null, enemy:null } };
let playerSelection = ['主角']; let enemySelection = ['主角'];
/* ============================================================================
   联机对战（公共 MQTT over WebSocket 中继 · 房主权威广播）
   ---------------------------------------------------------------------------
   为什么是「房主权威」而不是严格锁步：
     战斗里有 12 处 Math.random（暴击、混乱、视的随机目标、同速抢先手…），
     要让两台机器各自演算出完全一致的结果，必须把它们全部换成可复现 PRNG，
     并且两边的调用次数【逐次】对齐 —— 任何一处多调/少调一次就会静默分叉，
     且极难排查。因此这里改为：
       · 房主（host）跑全部逻辑与随机，是唯一事实来源；
       · 客机（guest）不跑逻辑，只接收「演出事件 + 状态快照」并本地重放；
       · 客机的操作以指令形式回传房主，由房主执行。
   代价是客机操作多一个网络往返（中继通常 <150ms，可接受）。

   为什么用【中继】而不是点对点（WebRTC / PeerJS）：
     手机网络（4G/5G）与多数家宽都处在 CGNAT 之下，属于对称型 NAT。
     WebRTC 直连在无 TURN 服务器时打洞成功率很低 —— 表现为「房主正常、
     客机一直连接中」，且不会报错，只能干等。中继把数据交给公网服务器转发，
     两端各自出一条 WSS 连接即可，穿透问题彻底消失。
     实测取舍：多一跳延迟（通常 +30~80ms），换来的是「任何网络都能连上」。

   为什么用公共 MQTT broker：
     · 走 WSS 443 端口，纯静态托管页面可直接连，不需要后端；
     · 免注册、免 API Key —— 房主生成房间码，对手输入即连；
     · 支持 retain 消息，正好用来做「房间是否存在」的在线探测。
     下方列了 3 个公共 broker，逐个尝试，任一可用即可。
   ============================================================================ */
/* mqtt.js（浏览器 UMD 版，挂载 window.mqtt）多 CDN 候选 */
const RELAY_SDK_CANDIDATES = [
'https://cdn.jsdelivr.net/npm/mqtt@5.10.1/dist/mqtt.min.js',
'https://unpkg.com/mqtt@5.10.1/dist/mqtt.min.js',
'https://cdn.jsdelivr.net/npm/mqtt@4.3.8/dist/mqtt.min.js',
];
/* 公共 broker：只保留 EMQX 的【国内接入点】（腾讯云上海）。
   之前列表里的境外节点（美国俄勒冈 / 德国法兰克福 / 法国）国内往返常 400~1000ms，
   实测换成国内节点后稳定在 400ms 左右，故全部移除。
   ★ 必须走 wss（TLS）：页面是 HTTPS 时，明文 ws 会被浏览器按「混合内容」拦截。 */
const RELAY_BROKERS = [
'wss://broker-cn.emqx.io:8084/mqtt',   // EMQX 国内接入点（腾讯云上海）
];
/* 默认中继服务器：自建 Cloudflare Worker，比公共 broker 稳（不丢包）。
   面板里预填，玩家可随时改成别的地址或清空改走公共。 */
const DEFAULT_RELAY = 'wss://reveriecab.cc.cd/';
const RELAY_TOPIC_PREFIX = 'ygob-battle-v1/';  // 主题前缀，避免与公共 broker 上其它流量混在一起
const NET_TICK_MS = 300;         // 状态快照广播间隔
const NET_JUMP_CHECK_MS = 50;    // 行动条跳变检测间隔（清零/拉条必须立刻同步，不能等下一个节拍）
/* ---------- 客机行动条：纯跟随权威快照，不做任何本地预测 ----------
   此前客机自己按速度公式推进，但速度依赖 states/marks，而这些来自快照、天然滞后，
   算出的速度与房主实时值不一致 → 偏差随时间累积，越到后面差得越多，
   甚至冲过上限跑到行动条外面。现在完全不预测：权威值是唯一目的地，误差不可能累积。 */
const BAR_TRAVEL_MS = 280;       // 从当前位置平滑走到权威值所需时间(ms)：略小于快照间隔，走完即停
const BAR_JUMP_DELTA = 28;       // 与权威值相差超过这个值 → 判定为回合清零/拉条推条，直接突变到位
const BAR_EPS = 0.05;            // 浮点噪声阈值
/* bye 也必须是关键消息：丢了对手就只能等 keepalive 超时才看到「对方已退出」 */
const NET_CRITICAL_MSG = { init:1, over:1, panel:1, cutin:1, roster:1, hello:1, act:1, pick:1, restart:1, restartAck:1, bye:1, souls:1, soulsReq:1 };
const NET_WS_RETRY = 5;          // 自建中继失败后的额外重试次数（连首次共 6 次）
const NET_WS_RETRY_GAP = 600;    // 两次尝试之间的间隔：给网络一点恢复时间，立刻重试往往还是同一条失败路径
const NET_GUEST_HINT_AFTER = 6;  // 加入房间重试到第几次开始附带"逃生提示"（房主可能已改走公共服务器）
const NET_WS_HS_MS = 3500;       // 单次握手预算（重试机制存在，单次不必死等太久）
const NET_OVER_WAIT_MS = 2500;   // 结算前最多等多久让演出播完（上限兜底，避免演出卡住就进不去结算）
const NET_WS_JOIN_MS = 4500;     // 单次房间配对预算
const NET_SILENCE_MS = 5000;     // 客机多久没收到房主消息就主动请求重新同步
const BAR_KEEP_FT = 4;           // 追赶模式下保留的浮动文字条数（伤害数字，全丢会显得"动画没了"）
const NET_GUEST_SIDE = 'enemy';  // 客机固定操控敌方（玩家2）
const RELAY_OPEN_TTL = 90000;    // 房主「在线」标记的有效期：超过这个时间没刷新就视为房间已不存在
const RELAY_HELLO_BEACON = 15000; // 房主在线标记的心跳间隔
const NET_CATCHUP_QUEUE = 12;    // 客机队列积压超过这个条数就启动追赶（丢弃可覆盖的中间消息）

const Net = {
active:false, role:null, room:'', myId:'', broker:'',
peerGone:false,        // 对手是否已退出（收到 bye 置位；之后重开不再需要双方确认）
peerGoneNotified:false,// 本次连接是否已弹过「对手已退出」提示（防止重复打扰）
hudNote:'',            // 需要让玩家看到的重要提示（联机面板关闭后只能靠挂件传达）
/* 对端的神魂加成快照：{ 角色名: { 各属性增量, shenhunSets } }。
   联机下双方各用自己的神魂 —— 对端仓库在本机不可见，只能靠它发来的增量还原。 */
peerSouls:null,
/* 快照去重：上一次【实际发出去】的快照 JSON 串。tick 只与这一份比对，
   保证判断与 wire 完全一致，避免摘要与发出内容有偏差。 */
_lastSnapJson:null,
catchUpCount:0,        // 追赶次数（联机面板上可看到，用于判断网络是否吃紧）
rtt:null,              // 最近一次测得的往返延迟(ms)
/* 最近一次发给客机的操作面板（原样保存，供 tick 周期性重发做自愈） */
_lastPanel:null, _panelAge:0,
/* 客机侧：当前面板所属的行动者下标（-1 = 无）。
   点按钮时一并回传，房主据此识别「画面还停在上一个角色」的过期点击。 */
panelIdx:-1,
/* 客机：本次目标选择是否已提交。
   提交后房主通常已进入结算，但它周期性重发的 select 面板可能还在路上 ——
   收到就会把可选目标再高亮一次（边框闪一下），故提交后一律忽略 select。 */
pickedPending:false,
ws:null,               // 自建 WS 中继的 socket（与 client 二选一）
transport:null,        // 'ws' | 'mqtt'，决定 send/disconnect 走哪条路
client:null, myTopic:'', peerTopic:'',
entered:false,         // 是否已进过选人界面（对手断线重连时不再重复进入）
guestRoster:null,      // 房主收到客机阵容后存放，开局时写入 enemySelection
hostBattleStarted:false,
lastTick:0,
guestQueue:[], guestDraining:false,
waitingPick:false,     // 客机是否处于「选目标」态
statusCb:null,
_openTimer:null,

setStatus(t) {
this._lastStatus = t;                 // 记住原文，延迟读数变化时用它重渲染
/* 普通状态更新视为"上一句提示已过期"，清掉挂件上的醒目备注 */
if (this.hudNote && !/对手已退出/.test(String(t || ''))) this.hudNote = '';
const el = document.getElementById('net-status'); if (el) el.textContent = t + this.latencyTag();
this.renderHud();                     // 常驻挂件同步更新（面板关着也能看到）
if (this.statusCb) this.statusCb(t);
},
/* 右上角常驻挂件：显示「身份 · 传输方式 · 延迟」。
   联机面板一旦关闭，#net-status 就不可见了，这里是唯一能持续观察延迟的地方。 */
/* 挂件：连接刚建立的几秒内显示「WS中继 45ms」，之后自动收敛为纯「45ms」。
   平时保持极简，但在玩家最需要确认"到底走的是哪条路"的时刻给出一次明确答复 */
_hudShowMode() {
if (this._transportAt && Date.now() - this._transportAt < 6000) {
return this.transport === 'ws' ? 'WS中继 ' : (this.transport === 'mqtt' ? '公共 ' : '');
}
return '';
},
renderHud() {
const hud = document.getElementById('net-hud');
if (!hud) return;
if (!this.active) { hud.classList.remove('show'); return; }
/* 有重要提示时优先显示它 —— 联机面板关闭后，挂件是唯一能传达"对手已退出"的地方 */
if (this.hudNote) {
hud.classList.add('show');
hud.classList.remove('good', 'mid', 'bad'); hud.classList.add('bad');
hud.textContent = this.hudNote;
return;
}
if (this.rtt == null) { hud.classList.remove('show'); return; }
hud.classList.add('show');
hud.classList.remove('good', 'mid', 'bad');
hud.classList.add(this.rtt < 120 ? 'good' : (this.rtt < 400 ? 'mid' : 'bad'));
hud.textContent = this._hudShowMode() + `${this.rtt}ms`;
},
/* 「🟢 延迟 85ms」这类后缀；未测得则不显示 */
latencyTag() {
const parts = [];
if (this.transport) parts.push(this.transport === 'ws' ? 'WS中继' : 'MQTT');
if (this.rtt != null) {
const q = this.rtt < 120 ? '🟢' : (this.rtt < 400 ? '🟡' : '🔴');
parts.push(`${q} 延迟 ${this.rtt}ms` + (this.rtt >= 400 ? '（偏高）' : ''));
}
return parts.length ? '　' + parts.join(' · ') : '';
},
/* 延迟自测：本端发 ping → 对手回 pong → 计算往返。
   两侧都测 —— 房主也要看自己的读数，否则没法判断"到底是谁的网络差"。
   两边各按自己的节奏发，用 ts 区分归属，避免互相干扰。
   MQTT 下行由房主发起；WS 中继两端都主动发（该模式下客机也可能收不到房主的 ping）。 */
startLatencyProbe() {
if (this._rttTimer) return;
const beat = () => {
if (!this.active) return;
this._rttSent = Date.now();
this.send({ t:'ping', ts:this._rttSent });
};
beat();
this._rttTimer = setInterval(beat, 3000);
},
stopLatencyProbe() { if (this._rttTimer) { clearInterval(this._rttTimer); this._rttTimer = null; } },

/* ---------- SDK 加载 ---------- */
async loadSDK() {
if (window.mqtt && window.mqtt.connect) return true;
for (const url of RELAY_SDK_CANDIDATES) {
try {
await new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = url; sc.onload = res; sc.onerror = () => rej(new Error('load fail')); document.head.appendChild(sc); });
if (window.mqtt && window.mqtt.connect) return true;
} catch (e) { /* 换下一个源 */ }
}
return false;
},

/* ---------- 连接：role = 'host' | 'guest' ----------
   双方各自连上同一个 broker，房主往「自己的主题」发、订阅「客机主题」，反之亦然。
   房间是否存在，靠房主发在自己主题上的一条【保留消息】(retain) 来判断：
   客机一订阅就能立刻收到 —— 比"盲等对方先说话"可靠得多。 */
/* 传输方式判定：
   · 自定义地址里含 /mqtt（或 mqtts）→ MQTT broker（公共 broker 都是这种）
   · 其它 wss://…            → 自建 WebSocket 中继（Cloudflare Worker + DO）
   留空则走公共 MQTT。两种实现共用同一套上层消息协议，可随时切换对比。 */
isWsRelayUrl(u) {
const v = String(u || '').trim();
if (!/^wss?:\/\//i.test(v)) return false;
return !/\/mqtt(\/?$|[/?])/i.test(v) && !/^mqtts?:/i.test(v);
},

/* ---------- 自建 WebSocket 中继（Cloudflare Worker + Durable Object） ----------
   服务器负责按房间码配对两端并原样转发，不解析游戏内容。
   与 MQTT 路径的差异只在"怎么把字节送出去"，上层消息格式完全一致。
   优势：socket 关闭时服务端能立刻感知 → 对手退出通知更及时可靠。 */
async connectWs(cfg, hsMs, joinMs, attempt) {
hsMs = hsMs || NET_WS_HS_MS; joinMs = joinMs || NET_WS_JOIN_MS;
/* 上一次尝试可能留下半开 socket / 挂起的 joined 等待 —— 重试前务必清干净，
   否则第二次会读到第一次的残留状态。 */
try { if (this.ws) { this.ws.onopen = this.ws.onclose = this.ws.onerror = this.ws.onmessage = null; this.ws.close(); } } catch (e) {}
this.ws = null;
if (this._joinWait) { try { this._joinWait.finish(false); } catch (e) {} this._joinWait = null; }
const base = this.customBroker.replace(/\/+$/, '');
const url = `${base}/?room=${encodeURIComponent(this.room)}&role=${this.role}`;
const myToken = this._connToken;          // 本次连接令牌（中途取消后旧结果一律作废）
const t0 = Date.now();
const el = () => ((Date.now() - t0) / 1000).toFixed(1);
const atTag = (attempt && attempt > 1) ? `第 ${attempt} 次 · ` : '';
this.setStatus(`⏳ 正在连接中继服务器…${atTag}`);
/* 移动端握手常明显慢于桌面（DNS / IPv6 回退 / 证书链校验），
   没有进度反馈时玩家只会以为「点了没反应」。每秒把已耗时刷到状态栏。 */
const prog = setInterval(() => {
if (this._aborted || this._connToken !== myToken) { clearInterval(prog); return; }
this.setStatus(`⏳ 正在连接中继服务器…${atTag}（已用 ${el()}s）`);
}, 1000);
const ws = await new Promise((resolve, reject) => {
let sock = null, done = false, to = null;
const fin = (fn, arg) => {
if (done) return; done = true;
if (to) clearTimeout(to);
clearInterval(prog);
if (fn === reject && sock) { try { sock.close(); } catch (e) {} }   // 失败时别留半开连接
fn(arg);
};
try { sock = new WebSocket(url); } catch (e) { fin(reject, e); return; }
to = setTimeout(() => fin(reject, new Error(`连接超时（${el()}s）`)), hsMs);
sock.onopen = () => fin(resolve, sock);
/* ★ 移动端关键修复：多数手机 WebView 握手失败时【只触发 close，不触发 error】（code 1006）。
   少了这一行就只能干等到 12s 超时才报错 —— 表现正是「点了没反应 / 卡住」。 */
sock.onclose = (ev) => fin(reject, new Error('连接被关闭（code ' + ((ev && ev.code) || 1006) + '）'));
sock.onerror = () => fin(reject, new Error('连接失败（检查地址、证书与网络）'));
});
clearInterval(prog);
/* 连接途中玩家点了「返回」→ 本次结果作废，不写回全局、不覆盖新一局 */
if (this._aborted || this._connToken !== myToken) { try { ws.close(); } catch (e) {} return false; }
this.ws = ws;
this.active = true;
ws.onmessage = (ev) => {
let o = null; try { o = JSON.parse(String(ev.data)); } catch (e) { return; }
if (!o || !o.t) return;
if (o.t === 'joined') { this.onWsJoined(o); return; }
if (o.t === 'peer') { this.onWsPeer(); return; }
this.handle(o);
};
ws.onclose = () => {
/* 服务端已挂，不会再有 bye 过来；这里只负责标记本端失效 */
if (this.active) { this.active = false; this.setStatus('❌ 与中继服务器的连接已断开'); }
};
/* 等服务端回 joined 再继续：它告知本端身份与对手是否已在 */
const ok = await this.waitWsJoined(joinMs, myToken);
if (this._aborted || this._connToken !== myToken) { try { ws.close(); } catch (e) {} this.ws = null; this.active = false; return false; }
if (!ok) { try { ws.close(); } catch (e) {} this.ws = null; this.active = false; this.setStatus('❌ 房间配对失败，请重试'); return false; }
this.transport = 'ws';
this._transportAt = Date.now();
setTimeout(() => this.renderHud(), 6200);   // 6 秒后收敛为纯数字
this.startLatencyProbe();   // 两侧都测：房主也要看到自己的读数
if (this.role === 'host') this.setStatus(`✅ 房间已创建（${this.room}），等待对手加入…`);
else this.setStatus(`✅ 已加入房间 ${this.room}，等待房主开始…`);
return true;
},
/* 等服务端 joined。带令牌：中途取消后旧等待自动作废，
   既不会把新一局的 joined 判给旧连接，也不会用旧的超时打断新连接
   （旧写法只存一个 _joinResolve，第二次连接会被第一次的定时器误判失败）。 */
waitWsJoined(ms, token) {
return new Promise((resolve) => {
const t0 = Date.now();
let tick = null, to = null;
const w = { token, done:false };
const cleanup = () => { if (tick) { clearInterval(tick); tick = null; } if (to) { clearTimeout(to); to = null; } };
/* ★ 用 w.done 而不是「this._joinWait !== w」做幂等判据：
   abort() 会先把 _joinWait 置空再回调 finish，后一种写法会直接 return、
   永远不 resolve —— 整条 await 链就此卡死，按钮依旧恢复不了。 */
w.finish = (v) => {
if (w.done) return;
w.done = true;
if (this._joinWait === w) this._joinWait = null;
cleanup();
resolve(v);
};
/* 上一条被取消的连接若还有等待挂着，先作废掉，避免它永久挂起 */
if (this._joinWait && !this._joinWait.done) this._joinWait.finish(false);
this._joinWait = w;
tick = setInterval(() => {
if (this._aborted) { w.finish(false); return; }
this.setStatus(`⏳ 服务器已连通，等待房间配对…（已用 ${((Date.now() - t0) / 1000).toFixed(1)}s）`);
}, 1000);
to = setTimeout(() => w.finish(false), ms);
});
},
/* 服务端确认身份：客机要等对手到齐才发 hello（与 MQTT 路径的行为保持一致） */
onWsJoined(o) {
if (o.role && o.role !== this.role) this.role = o.role;   // 以服务端登记的身份为准
if (this.role === 'guest') {
if (o.peer) { this.send({ t:'hello' }); this.startLatencyProbe(); this.startSilenceWatch(); }
else this.setStatus(`⏳ 已加入房间 ${this.room}，等待房主…`);
}
if (this._joinWait) this._joinWait.finish(true);
},
/* 两端到齐 */
onWsPeer() {
if (this.role === 'guest') { this.send({ t:'hello' }); this.startLatencyProbe(); this.startSilenceWatch(); }
},

async connect(cfg) {
this.room = String((cfg.room || '').trim()).toUpperCase();
if (!this.room) { this.setStatus('❌ 请先填写或生成房间码'); return false; }
this.role = cfg.role;
/* 本次连接的取消令牌：每次发起连接自增，abort() 也自增 ——
   于是任何「上一局残留的异步回调」都能靠令牌比对被识别并丢弃。 */
this._aborted = false;
this._connToken = (this._connToken || 0) + 1;
this.customBroker = String((cfg.broker || '').trim());
this.transport = null;
/* ★ 开新一局联机时必须把上一局的残留清干净。
   尤其是 peerGone —— 它一旦置位就一直为 true，
   于是之后每次进选人界面都会再弹一次"对手已退出"、状态栏也一直挂着警告。
   同理清掉延迟读数与面板记录，避免沿用上一局的陈旧状态。 */
this.peerGone = false; this.peerGoneNotified = false;
this._transportAt = 0;
this.rtt = null; this._rttSent = 0;
this._lastPanel = null; this._panelAge = 0; this.panelIdx = -1; this.pickedPending = false;
this.guestQueue = []; this.guestDraining = false; this.waitingPick = false;
this.catchUpCount = 0;
this._msgSeq = 0; this._seenSeq = null; this._cutinChain = null; this._overQueued = false;
this._barSnap = null; this._barSnapT = 0; this._barRun = true; this._guestBarReady = false;
this._barTarget = []; this._barRate = [];
this._lastBars = null; this._lastBarsT = 0; this._lastOver = null;
this._fallbackUsed = false;
if (this.isWsRelayUrl(this.customBroker)) {
/* ★ 回退只对【创建房间】生效。
   加入房间绝不能改走公共服务器：房主很可能已经用 Cloudflare 建好了房间，
   客机一旦退到 MQTT 公网，两台设备连的根本不是同一台服务器 ——
   房间码一字不差也永远碰不上面。所以客机只能死磕同一地址，反复重试。 */
if (this.role !== 'host') return this.connectWsRetryForever(cfg);
/* 房主：单网络单设备不通时自动改走公共服务器。
   默认开启，可在面板里关掉（只想强测自建时）。 */
if (sessionStorage.getItem('net_fallback') !== '0') return this.connectWsWithFallback(cfg);
return this.connectWs(cfg);
}
return this.connectMqtt(cfg);
},
/* 自建中继优先，但不通就立刻改走公共服务器。
   ★ 为什么是"短预算 + 串行回退"而不是并行竞速：
     两条路共用 this.transport / this.ws / this.client / this._joinWait 等同一份状态，
     并行时落败方会在自己结束的那一刻把胜者的状态覆盖掉，send() 走错分支直接失联。
     串行回退没有共享状态冲突，代价只是多等这 4 秒。 */
/* 自建中继优先，失败重试 NET_WS_RETRY 次，全失败才改走公共服务器。
   ★ 为什么重试有效：校园网/移动网络下的握手失败常是【偶发】的
     （DNS 缓存未就绪、IPv6 回退尚未触发、链路瞬时拥塞），
     第二次往往就走通了。此前一次失败就切换，白白放弃能连上的路。
   ★ 为什么是串行重试而不是并行竞速：
     多条连接共用 this.transport / this.ws / this._joinWait 等同一份状态，
     并行时落败方会在自己结束的那一刻覆盖胜者的状态，send() 走错分支直接失联。 */
async connectWsWithFallback(cfg) {
/* 兜底：只有房主才走这条路（客机已在上面被分派走重试） */
if (this.role !== 'host') return this.connectWsRetryForever(cfg);
this.setStatus('⏳ 正在连接自建中继…');
let ok = false, err = null;
const total = NET_WS_RETRY + 1;
for (let i = 0; i < total; i++) {
if (this._aborted) return false;
try { ok = await this.connectWs(cfg, NET_WS_HS_MS, NET_WS_JOIN_MS, i + 1); }
catch (e) { ok = false; err = e; }
if (this._aborted) return false;
if (ok) return true;
/* 还没到最后一次 → 稍等再试，并把次数明确显示出来，避免玩家以为卡住 */
if (i < total - 1) {
this.setStatus(`⚠️ 第 ${i + 1} 次未成功，${NET_WS_RETRY_GAP / 1000} 秒后重试…`);
await new Promise((r) => setTimeout(r, NET_WS_RETRY_GAP));
}
}
if (this._aborted) return false;
this.setStatus(`⚠️ 已尝试 ${total} 次仍未连上，正在改用公共服务器…`);
this._fallbackUsed = true;
const ok2 = await this.connectMqtt(cfg);
if (ok2) {
const tip = err && err.message ? '（' + err.message + '）' : '';
this.setStatus('⚠️ 已改用公共服务器' + tip + '：游戏可正常进行，延迟可能略高');
this._transportAt = Date.now();
this.renderHud();
}
return ok2;
},
/* 加入房间：失败就一直重试，直到成功，或玩家点「返回」中止。
   ★ 为什么不设上限、也不改走公共服务器：
     房主那边大概率已经用 Cloudflare 建好房间在等了，客机换到 MQTT 公网
     就等于去了另一个地方，房间码对得上也永远进不去。
     这里的失败基本都是偶发的（校园网/移动网络握手抖动），多试几次通常就通。
   ★ 不会失控：每次尝试都有握手预算上限，且全程可被 abort() 立刻打断。 */
async connectWsRetryForever(cfg) {
this.setStatus('⏳ 正在连接自建中继…');
let n = 0;
for (;;) {
if (this._aborted) return false;
n++;
let ok = false;
try { ok = await this.connectWs(cfg, NET_WS_HS_MS, NET_WS_JOIN_MS, n); }
catch (e) { ok = false; }
if (this._aborted) return false;
if (ok) return true;
/* 一直重试，但把次数明确显示出来 —— 否则玩家只会以为卡住了 */
const hint = (n >= NET_GUEST_HINT_AFTER) ? '（若房主已改用公共服务器，请改选「MQTT公网」）' : '';
this.setStatus(`⚠️ 第 ${n} 次未成功，${NET_WS_RETRY_GAP / 1000} 秒后重试…${hint}`);
await new Promise((r) => setTimeout(r, NET_WS_RETRY_GAP));
if (this._aborted) return false;
}
},
async connectMqtt(cfg) {
this.setStatus('⏳ 正在加载通讯组件…');
const okSdk = await this.loadSDK();
if (!okSdk) { this.setStatus('❌ 通讯组件加载失败（检查网络或改用其它 CDN）'); return false; }
this.role = cfg.role;
this.customBroker = String((cfg.broker || '').trim());
this.myTopic = RELAY_TOPIC_PREFIX + this.room + '/' + (this.role === 'host' ? 'host' : 'guest');
this.peerTopic = RELAY_TOPIC_PREFIX + this.room + '/' + (this.role === 'host' ? 'guest' : 'host');
this.myId = this.role + '-' + Math.random().toString(36).slice(2, 10);

/* 并发竞速：同时向所有候选发起连接，谁先握手成功就用谁，其余立刻关掉。
   比"按顺序尝试"更好 —— 顺序尝试时排第一的节点哪怕很慢也会用它，
   而竞速天然选出当前网络下最快的那个；公共 broker 负载波动大，这点尤其有用。
   用户手动填的服务器排在最前（他有明确目标时优先满足，且仍参与竞速以免白等）。 */
this.transport = 'mqtt';
this._transportAt = Date.now();
setTimeout(() => this.renderHud(), 6200);
this.setStatus(`⏳ 正在连接服务器…`);
/* 自建地址若是 WS 中继（不含 /mqtt），不能拿来当 MQTT broker 连 ——
   回退到公共服务器时尤其要排除，否则白白多等一轮失败。 */
const brokerList = (this.customBroker && !this.isWsRelayUrl(this.customBroker)) ? [this.customBroker].concat(RELAY_BROKERS) : RELAY_BROKERS;
try {
const r = await this.dialFastest(brokerList);
if (this._aborted) { try { r.client.end(true); } catch (e) {} return false; }
this.client = r.client; this.broker = r.url;
} catch (e) { this.setStatus('❌ 所有公共服务器都连不上，请检查网络后重试'); return false; }

try {
await this.subscribe(this.peerTopic);
if (this._aborted) { try { this.client.end(true); } catch (e) {} this.client = null; return false; }
} catch (e) { if (this._aborted) return false; this.setStatus('❌ 订阅房间失败：' + (e && e.message ? e.message : e)); return false; }

this.client.on('message', (topic, payload) => {
if (topic !== this.peerTopic) return;
let obj = null;
try { obj = JSON.parse(String(payload)); } catch (e) { return; }
if (!obj || !obj.t) return;
this.handle(obj);
});

/* ★ active 必须在这里就置位，不能放到函数末尾 ——
   下面客机要立刻 send('hello') 给房主报「我已到」，
   而 send() 有 active 前置检查；晚置位会让这条 hello 被静默吞掉，
   结果是客机显示"已加入"、房主却永远停在"等待对手加入"。 */
this.active = true;
this.renderHud();

if (this.role === 'host') {
/* 房主：发出在线标记（retain，客机一订阅就能看到），并周期性刷新 */
this.publishOpen(true);
this._openTimer = setInterval(() => this.publishOpen(false), RELAY_HELLO_BEACON);
this.startLatencyProbe();
this.setStatus(`✅ 房间已创建（${this.room}），等待对手加入…`);
} else {
/* 客机：等房主的在线标记。连上了 broker 但没人建房才叫「房间不存在」，
   因此这里只等【房主的保留消息】，不做盲目重试。 */
this.setStatus(`⏳ 正在寻找房间 ${this.room}…`);
const found = await this.waitForHost(25000);
if (this._aborted) { try { this.client.end(true); } catch (e) {} this.client = null; this.active = false; return false; }
if (!found) { try { this.client.end(true); } catch (e) {} this.client = null; this.active = false; this.setStatus(`❌ 未找到房间 ${this.room}，请确认房主已创建且房间码一致`); return false; }
this.send({ t:'hello' });
this.startLatencyProbe();
this.startSilenceWatch();
this.setStatus(`✅ 已加入房间 ${this.room}，等待房主开始…`);
}
return true;
},

/* 并发向多个 broker 发起连接，取最先握手成功的那个（竞速） */
dialFastest(urls) {
return new Promise((resolve, reject) => {
if (!urls || !urls.length) { reject(new Error('no broker')); return; }
const clients = [];
let settled = false, failed = 0;
const finish = (fn) => { if (settled) return; settled = true; fn(); };
const timer = setTimeout(() => {
finish(() => { clients.forEach(c => { try { c.end(true); } catch (e) {} }); reject(new Error('timeout')); });
}, 12000);
urls.forEach((url) => {
let c = null;
try {
c = window.mqtt.connect(url, { clientId:this.myId + '-' + Math.random().toString(36).slice(2, 6),
keepalive:30, connectTimeout:8000, clean:true, reconnectPeriod:0,
will: { topic: this.myTopic, payload: JSON.stringify({ t:'bye' }), qos:0, retain:false } });
} catch (e) {
if (++failed >= urls.length) finish(() => { clearTimeout(timer); reject(new Error('all failed')); });
return;
}
clients.push(c);
c.on('connect', () => {
if (settled) { try { c.end(true); } catch (e) {} return; }   // 已有胜者 → 关掉自己
finish(() => {
clearTimeout(timer);
clients.forEach(o => { if (o !== c) { try { o.off('connect'); o.off('error'); o.end(true); } catch (e) {} } });
resolve({ client:c, url });
});
});
c.on('error', () => {
if (settled) return;
try { c.end(true); } catch (e) {}
if (++failed >= urls.length) finish(() => { clearTimeout(timer); reject(new Error('all failed')); });
});
});
});
},

dialBroker(url) {
return new Promise((resolve, reject) => {
let c = null;
try {
/* will（遗嘱）：本端【非正常断开】（直接关页面 / 断网 / 进程被杀）时，
   broker 会自动代发这条 bye 给对手 —— 这是 MQTT 的标准机制，
   也是唯一能可靠感知"对方消失"的办法（对方没机会自己发消息）。 */
c = window.mqtt.connect(url, { clientId:this.myId, keepalive:30, connectTimeout:8000, clean:true, reconnectPeriod:0,
will: { topic: this.myTopic, payload: JSON.stringify({ t:'bye' }), qos:0, retain:false } });
} catch (e) { reject(e); return; }
let done = false;
c.on('connect', () => { if (done) return; done = true; resolve(c); });
c.on('error', (e) => { if (done) return; done = true; try { c.end(true); } catch (x) {} reject(e || new Error('broker error')); });
setTimeout(() => { if (!done) { done = true; try { c.end(true); } catch (x) {} reject(new Error('timeout')); } }, 9000);
});
},

subscribe(topic) {
return new Promise((resolve, reject) => {
/* ★ 订阅升到 QoS1。MQTT 投递等级 = min(发布qos, 订阅qos)，
   订阅停在 0 的话，就算发布用 qos1 也会被降级。
   升到 1 之后，只有显式指定 qos1 的关键消息才走"至少一次"投递，
   高频快照仍是 qos0（可覆盖，丢了无所谓），不会额外增加流量。 */
this.client.subscribe(topic, { qos:1 }, (err) => { err ? reject(err) : resolve(); });
setTimeout(() => reject(new Error('subscribe timeout')), 8000);
});
},

/* 房主：发布「我在这里」的保留消息。first=true 表示刚建房。 */
publishOpen(first) {
if (!this.active && !first) return;
this.publishRaw(this.myTopic, JSON.stringify({ t:'open', ts:Date.now() }), true);
},

publishRaw(topic, payload, retain, qos) {
if (!this.client) return;
try { this.client.publish(topic, payload, { qos:qos || 0, retain:!!retain }); } catch (e) {}
},

/* 客机：等待房主的在线标记（保留消息会在订阅后立刻送达） */
waitForHost(ms) {
return new Promise((resolve) => {
let done = false;
const finish = (v) => { if (done) return; done = true; try { clearInterval(this._probeTimer); } catch (e) {} this._probeTimer = null; clearTimeout(to); this.client.off('message', onMsg); resolve(v); };
const onMsg = (topic, payload) => {
if (topic !== this.peerTopic) return;
let o = null; try { o = JSON.parse(String(payload)); } catch (e) { return; }
if (!o || o.t !== 'open') return;
/* 保留消息可能来自很久以前的一次对局（房主已关页面但没清标记），
   用时间戳判断新鲜度，避免连进一个"僵尸房间"。 */
if (Date.now() - (Number(o.ts) || 0) > RELAY_OPEN_TTL) return;
finish(true);
};
this.client.on('message', onMsg);
this._probeTimer = setInterval(() => { this.publishRaw(this.myTopic, JSON.stringify({ t:'probe' }), false); }, 2000);
const to = setTimeout(() => finish(false), ms);
});
},

/* ---------- 客机看门狗 ----------
   公网 broker 会丢 QoS0 消息，最致命的是「结算」那条丢了 ——
   客机永远停在战斗界面，游戏结束不了，且不会报错。
   这里主动兜底：超过 NET_SILENCE_MS 没收到房主任何消息，
   就发一条 resync 请求，房主据此补发它当前最该发的那份状态。 */
startSilenceWatch() {
if (this._silenceTimer) return;
this._lastRecv = performance.now();
this._silenceTimer = setInterval(() => {
if (!this.active || this.role !== 'guest') return;
/* 已收到结算（可能正在等演出播完）→ 不再请求同步，避免房主反复补发 over */
if (this._overQueued) return;
if (gameState.phase !== 'fighting' && gameState.phase !== 'gameOver') return;
if (performance.now() - (this._lastRecv || 0) < NET_SILENCE_MS) return;
this._lastRecv = performance.now();     // 发出请求后重置，避免每 2 秒狂发
this.send({ t:'resync', needInit: !gameState.units || !gameState.units.length });
this.setStatus('⚠️ 长时间未收到房主数据，已请求重新同步…');
}, 2000);
},
stopSilenceWatch() { if (this._silenceTimer) { clearInterval(this._silenceTimer); this._silenceTimer = null; } },
/* 房主：补发当前最该发的那份状态 */
onResync(o) {
if (typeof gameState === 'undefined') return;
if (gameState.phase === 'gameOver' && this._lastOver) { this.send(this._lastOver); return; }
if (gameState.phase !== 'fighting') return;
/* 客机连单位都没有（init 丢了）→ 必须重发 init 重建战场 */
if (o && o.needInit) { this.sendInit(); }
/* 强制下一份快照发出：清掉去重基准，否则内容没变就静默不发 */
this._lastSnapJson = null;
const snap = this.snapshot();
this.send(snap);
this._lastBars = snap.bars.slice();
this._lastBarsT = performance.now();
this.syncGuestPanel();
},

/* 断开：退出 / 重开时调用。房主额外清掉在线标记，免得留下僵尸房间。 */
/* 对手退出：给出明确提示，并解除「重开需双方确认」的限制 ——
   否则对局会卡死：一方已经不在，另一方却永远等不到确认。 */
onPeerGone() {
this.peerGone = true;
/* ★ 只有在【战斗中】才弹窗打断。
   在选人界面 / 主界面弹这个框毫无意义 —— 那里本来就没有"正在进行的对局"可重开，
   玩家刚进来就被一个"重新开始"的提示堵住，只会觉得莫名其妙。
   非战斗场景下改用挂件提示（面板已关闭，状态栏看不到，挂件是唯一可见的位置）。 */
const inBattle = (typeof gameState !== 'undefined' && gameState.phase === 'fighting');
this.hudNote = '⚠️ 对手已退出';
this.setStatus('⚠️ 对手已退出联机');
if (!inBattle) { this.renderHud(); netRefreshStartButton(); return; }
/* bye 可能重复到达（手动一次 + 遗嘱一次），且重开后还可能再来 —— 只弹一次 */
if (this.peerGoneNotified) return;
this.peerGoneNotified = true;
showNoticeDialog('对手已退出联机。你可以直接「重新开始」，无需等待对方确认。');
},

/* 中止连接：玩家在连接过程中点「返回 / 取消」时调用。
   ★ 此前只 closeNetPanel() 关面板，后台连接仍在跑：
     · 按钮 disabled 要等它自己结束才恢复 → 面板关掉再打开，按钮依旧是灰的，
       表现就是「点创建房间 / 加入房间完全没反应」；
     · 旧连接若晚到成功，还会把新一局的房间与状态覆盖掉。
   这里做真正的中止 + 清场。 */
abort() {
try { this.stopSilenceWatch(); } catch (e) {}
this._aborted = true;
this._connToken = (this._connToken || 0) + 1;
const jw = this._joinWait; this._joinWait = null;
if (jw) { try { jw.finish(false); } catch (e) {} }
try { this.stopLatencyProbe(); } catch (e) {}
try { if (this._openTimer) { clearInterval(this._openTimer); this._openTimer = null; } } catch (e) {}
try { if (this._probeTimer) { clearInterval(this._probeTimer); this._probeTimer = null; } } catch (e) {}
try { if (this.ws) this.ws.close(); } catch (e) {}
try { if (this.client) this.client.end(true); } catch (e) {}
this.ws = null; this.client = null;
this.active = false; this.role = null; this.entered = false; this.transport = null;
this.hudNote = ''; this.rtt = null; this._dialing = false;
this.renderHud();
},

disconnect() {
try { this.stopLatencyProbe(); } catch (e) {}
try { this.stopSilenceWatch(); } catch (e) {}
try { if (this._openTimer) { clearInterval(this._openTimer); this._openTimer = null; } } catch (e) {}
if (this.transport === 'ws') {
/* WS 中继：服务端能直接看到 socket 关闭并代发 bye，这里不用自己发 */
try { if (this.ws) this.ws.close(); } catch (e) {}
this.ws = null;
this.active = false; this.role = null; this.entered = false; this.transport = null;
this.renderHud();
return;
}
if (this.client) {
/* 主动退出时自己发一次 bye：让对手立刻收到提示，不用等 keepalive 超时才触发遗嘱。
   （正常 end() 不会触发 will，所以必须手动发。） */
try { if (this.active) this.publishRaw(this.myTopic, JSON.stringify({ t:'bye' }), false); } catch (e) {}
try { if (this.role === 'host') this.publishRaw(this.myTopic, '', true); } catch (e) {}
try { this.client.end(true); } catch (e) {}
}
this.active = false; this.role = null; this.client = null; this.entered = false; this.transport = null;
this.renderHud();
},

/* 关键消息：丢一条就会卡住流程或丢失演出，必须走 QoS1（至少一次）。
   · init / over —— 开局与结算，丢了游戏永远结束不了
   · panel       —— 客机的操作面板全靠它，丢一条就停在旧角色的技能上
   · cutin / roster / hello —— 技能演出、阵容确认、到齐通知
   · act / pick  —— 客机的操作指令，丢了等于点了没反应
   · restart*    —— 重开需双方确认，丢了就一直等
   ★ 高频的 st（快照）/ log / ft / anim / ping 保持 QoS0：
     可被后续消息覆盖，丢了无后果，走 QoS1 只会白白增加 broker 往返。 */
isCriticalMsg(t) { return NET_CRITICAL_MSG[t] === 1; },
send(obj) {
if (!this.active || !obj) return;
/* 面板消息统一登记 —— 供 tick 周期性重发做自愈（见 syncGuestPanel）。
   记在这里，任何新增的发送点都不会漏掉。 */
if (obj.t === 'panel') { this._lastPanel = obj; this._panelAge = 0; }
/* ★ 关键消息带自增序号：QoS1 重传时 seq 相同 → 对端据此去重，不会重复播技能演出。
   注意「原样重发面板」也必须拿新 seq，否则会被去重拦掉、自愈失效。 */
if (this.isCriticalMsg(obj.t)) obj.seq = ++this._msgSeq;
if (this.transport === 'ws') {
if (!this.ws || this.ws.readyState !== 1) return;
try { this.ws.send(JSON.stringify(obj)); } catch (e) {}
return;
}
if (!this.client) return;
this.publishRaw(this.myTopic, JSON.stringify(obj), false, this.isCriticalMsg(obj.t) ? 1 : 0);
},

/* ---------- 消息分发 ---------- */
handle(o) {
const H = this.role === 'host';
/* QoS1 重传去重：同一条消息可能到达两次（PUBACK 丢失时 broker 会重发）。
   只针对带 seq 的关键消息；快照类没有 seq，不受影响。 */
if (o.seq != null) {
if (!this._seenSeq) this._seenSeq = new Set();
if (this._seenSeq.has(o.seq)) return;
this._seenSeq.add(o.seq);
/* 窗口上限：只保留最近一批，避免长局把内存撑大 */
if (this._seenSeq.size > 256) this._seenSeq.clear();
}
/* 收到对手的实质性消息说明他还在线 —— 重连后自动解除「已退出」状态。
   ★ ping / pong 只是心跳，不能当作"对手回来了"的证据：
     对手断开的瞬间可能已发出若干心跳，用它们复位会让退出提示立刻消失，
     甚至误判对手仍在（实际已掉线）。 */
this._lastRecv = performance.now();
if (o.t !== 'bye' && o.t !== 'ping' && o.t !== 'pong') {
if (this.peerGone) { this.peerGone = false; this.peerGoneNotified = false; this.hudNote = ''; netRefreshStartButton(); }
}
/* 对手退出：对方主动退出，或其页面/网络异常断开触发遗嘱 */
if (o.t === 'bye') { this.onPeerGone(); return; }
/* 延迟自测：收到 ping 立刻回 pong（带原时间戳）；收到 pong 计算往返。
   ★ 用 ts 匹配：两边同时在测，收到的 pong 可能是自己 ping 的回音、也可能是对手
      ping 过来被回传的那条。不校验 ts 会把别人的往返记成自己的，读数完全失真。 */
if (o.t === 'ping') { this.send({ t:'pong', ts:o.ts }); return; }
if (o.t === 'pong' && o.ts && this._rttSent && Number(o.ts) === this._rttSent) {
this.rtt = Date.now() - this._rttSent; this._rttSent = 0;
/* 用记住的原文重渲染，把新的延迟读数刷到状态栏上 */
if (this._lastStatus) this.setStatus(this._lastStatus);
else this.renderHud();
return;
}
/* 重新开始：任一方都可发起，需双方确认；对手已退出时发起方单独执行 */
if (o.t === 'restart') { netOnRestartRequest(o.from === 'rematch'); return; }
if (o.t === 'restartAck') { netResetToSelection(); return; }
/* 客机打招呼 → 房主据此确认对手已到（保留消息只能证明房间存在，不能证明人在） */
if (H && o.t === 'hello') {
this.setStatus(`✅ 对手已加入（房间 ${this.room}）`);
/* 用显式标志判断「是否已进过选人」，而不是看面板是否开着 ——
   后者依赖 UI 时序，一旦路径有变就会漏掉进选人。
   首次连上 → 进选人；之后再收到 hello（对手断线重连）→ 只补发战局状态。 */
if (!this.entered) { this.entered = true; closeNetPanel(); enterOnlineSelection('host'); }
else if (gameState.phase === 'fighting') this.sendInit();
/* 只刷新按钮，不擅自 enable —— 房主自己还没选满时仍应保持禁用 */
netRefreshStartButton();
return;
}
if (H && o.t === 'resync') { this.onResync(o); return; }
/* ---- 联机神魂：双方各用自己的存档 ----
   收到对端的加成快照就存下来，开局 createUnit 时据此还原对方的神魂。
   soulsReq 是对端的索取（它可能在本机发快照之前就已建好单位），收到即回一份。 */
if (o.t === 'souls') { this.peerSouls = o.map || null; return; }
if (o.t === 'soulsReq') { netSendSouls(); return; }
if (H && o.t === 'roster') {
this.guestRoster = o.names || [];
this.setStatus('✅ 对手已提交阵容');
netRefreshStartButton();
return;
}
if (H && o.t === 'act') { this.hostDoAction(o.kind, o.idx); return; }
if (H && o.t === 'pick') { this.hostDoPick(o.idx); return; }
/* 客机的自动偏好：写进房主这边（战斗逻辑只跑在房主端，客机本地改无效） */
if (H && o.t === 'auto') {
gameState.auto[NET_GUEST_SIDE] = !!o.on;
/* 立刻生效：若此刻正轮到客机方，按开/关接管或交还操作 */
const actor = gameState.currentActor;
if (actor && actor.side === NET_GUEST_SIDE) {
if (o.on) { hideControlPanel(); executeAutoAction(actor); }
else showControlPanel(actor);
}
return;
}
/* ---- 联机 BP ---- */
if (o.t === 'bpReq') { bpOnRequest(o.mode); return; }
if (o.t === 'bpAck') { bpOnAck(o.mode); return; }
if (o.t === 'bpEnter') { bpOnEnter(o.mode); return; }
if (!H && o.t === 'bpView') { bpApplyView(o.view); return; }
if (H && o.t === 'bpSel') {
/* 客机的选择：房主做最终校验 —— 只接受轮到客机、且该英雄确实可选的选择 */
const step = bpCurrentStep();
if (step && step.side === 'p2' && bpIsPickable(o.name, step)) { bpState.pending = o.name; renderBp(); }
else { bpState.pending = null; renderBp(); }
bpBroadcastView();
return;
}
if (H && o.t === 'bpConfirm') { bpConfirmPending(); bpBroadcastView(); return; }
if (H && o.t === 'bpCancel') { bpCancelPending(); bpBroadcastView(); return; }
if (!H && o.t === 'bpDone') {
enemySelection = ['主角', ...(o.p2 || [])];
playerSelection = ['主角', ...(o.p1 || [])];
gameMode = 'pvp';
/* BP 阵容刚确定 → 立刻补发自己的神魂：房主马上就要开局建单位了。 */
netSendSouls();
bpState.active = false;
document.getElementById('bp-screen').style.display = 'none';
document.getElementById('selection-screen').style.display = 'block';
this.setStatus('✅ BP 完成，等待房主开始…');
const gb = document.getElementById('start-battle-btn');
if (gb) { gb.disabled = true; gb.textContent = '等待房主开始…'; }
return;
}
/* ★ 结算直接在这里处理，【完全不进队列】。
   客机是串行 await 消费队列的，对局结束时往往还有一条技能演出（cutin）正在播、
   后面也压着若干条 —— 排队的话要等它们播完才弹结算，表现就是"比房主慢一两秒"。
   结算是终局事件，高于一切演出：立刻清掉积压、马上渲染。 */
if (!H) {
/* 结算【排进队列】而不是插队立刻结算。
   ★ 旧行为是清空队列 + 立刻切结算界面 —— 房主一结算，
     客机还在播的最后一击动画（cutin / 浮动数字 / 日志）就被整批丢掉，
     表现正是"动画还差一点没播完，直接就结束了"。
   ★ _overQueued 防重复：结算等待期间房主可能因看门狗补发 over
     （带新 seq，去重拦不住），不拦会让结算界面渲染两次。 */
if (o.t === 'over') {
if (!this._overQueued) { this._overQueued = true; this.guestQueue.push(o); this.drainGuest(); }
return;
}
this.guestQueue.push(o);
this.drainGuest();
}
},

/* ---------- 房主：执行客机指令 ---------- */
hostDoAction(kind, idx) {
const actor = gameState.currentActor;
/* ★ 过期面板保护：客机回传的 idx 与当前行动者不符，说明它画面还停在
   上一个角色（面板刷新消息迟到或丢失），此时绝不能执行 ——
   否则就是"按着上一个角色的技能名，放出当前角色的技能"。
   拒绝执行并重发一次正确面板，客机画面随即自愈。 */
if (idx != null && Number(idx) >= 0 && actor && Number(idx) !== idxOf(actor)) {
this.send({ t:'panel', mode:'none' });
this.sendPanelFor(actor);
return;
}
/* 指令到达时行动者可能已经换人（行动条推进 / 上一行动刚结束）。
   原来这里直接 return，客机就永远停在「已发送」的置灰状态、按钮点不动，
   表现为"卡住了"。改成把当前真实面板回传，让客机按钮恢复正确状态。 */
if (!actor || actor.side !== NET_GUEST_SIDE) { this.send({ t:'panel', mode:'none' }); return; }
/* ★ 'cancel' 必须单独处理。
   原写法用三元判断取技能：kind 不是 'normal' 也不是 'skill2' 就落到 else →
   取 actor.activeSkill，于是「取消」被当成【技能1】执行：
   要么直接把技能放了，要么又进入选目标态 —— 客机面板一直停在「取消」，
   点取消还是取消，玩家2 彻底卡住无法行动。 */
if (kind === 'cancel') {
gameState.waitingForTarget = false; gameState.pendingSkill = null; gameState.targetType = null;
clearHighlights();
showControlPanel(actor);   // 房主端会重新广播 mode:'skill'，客机回到普攻/技能/技能2
return;
}
const rawSkill = kind === 'normal' ? actor.normalSkill : (kind === 'skill2' ? actor.activeSkill2 : actor.activeSkill);
if (!rawSkill) { showControlPanel(actor); return; }
/* 先解析「未来」强化形态：强化后的穿血已是全体伤害，不必让客机进入选目标态。 */
const skill = getEffectiveSkillShape(actor, rawSkill);
gameState.waitingForTarget = false;
if (isNoTargetSkill(skill)) { executeAction(actor, skill); return; }
/* 需要选目标：房主本地进入等待态，并让客机高亮可选目标。
   log 一句提示，否则客机端只剩一个「取消」按钮，玩家不知道该做什么。 */
gameState.waitingForTarget = true; gameState.targetType = skill.target; gameState.pendingSkill = skill;
log('请选择目标（可点「取消」重新选择行动）。', 'log-normal');
this.send({ t:'panel', mode:'select', ttype: skill.target || 'enemy', btns:[] });
},
hostDoPick(idx) {
const actor = gameState.currentActor;
if (!actor || !gameState.waitingForTarget) return;
const target = gameState.units[idx];
if (!target || !isValidTarget(target, gameState.targetType, actor)) {
/* ★ 目标失效（在等待期间阵亡 / 被放逐 / 被虚化）时绝不能静默 return：
   房主会一直停在"等待目标"，而客机那边既没有可点的目标、
   「取消」又是灰的 —— 整局永久卡死。必须给出反馈并让客机能继续操作。 */
const hasValid = gameState.units.some(u => isValidTarget(u, gameState.targetType, actor));
if (!hasValid) {
/* 一个合法目标都没有了（例如敌方最后一人已阵亡）→ 放弃本次选择，
   退回技能选择态，让客机至少还能改选普攻或取消。 */
gameState.waitingForTarget = false; gameState.pendingSkill = null; gameState.targetType = null;
clearHighlights();
log('已无可选目标，取消本次选择。', 'log-normal');
showControlPanel(actor);
return;
}
log('目标已失效，请重新选择。', 'log-normal');
/* 还有别的合法目标 → 重发一次选目标面板，客机据此刷新可点目标。
   ★ retry 标记不可省：客机提交过目标后会把 pickedPending 置位，
     用来忽略房主周期性重发的陈旧 select 面板（否则边框会闪）。
     但这条【驳回重选】的面板也会被它一并忽略 ——
     于是"目标失效"后客机再也点不了目标，整局卡死。带上 retry 让它放行。 */
this.send({ t:'panel', mode:'select', idx: idxOf(actor), ttype: gameState.targetType || 'enemy', btns:[], retry:1 });
return;
}
gameState.waitingForTarget = false;
clearHighlights();
/* 立刻通知客机清掉目标高亮 —— 不等结算流程自然推进到 hideControlPanel，
   否则这段时间里客机的高亮会一直挂着。 */
this.send({ t:'panel', mode:'none' });
executeAction(actor, gameState.pendingSkill, target);
},

/* 客机：把房主视角的「我方/敌方」翻成自己的视角。
   房主广播的文本里【我方】= 房主自己 = 客机的对手，所以要互换。
   用  做中间占位，避免两步替换互相覆盖。 */
flipLog(text) {
if (this.role !== 'guest') return text;
return String(text)
.replace(/【我方】/g, '\u0001')
.replace(/【敌方】/g, '【我方】')
.replace(/\u0001/g, '【敌方】');
},

/* ---------- 客机：串行消费事件队列 ----------
   ★ 延迟的第一大来源是【队列积压雪崩】：
   房主端在演出期间（cutin / 各种 sleep）仍在按 200ms 持续发快照，
   而客机是串行 await 消费的 —— 一旦某条演出慢一点，后面的消息就全堆在队列里，
   客机播的是几秒前的旧画面，越拖越落后，看起来就是"严重延迟"。
   对策：积压超过阈值时进入【追赶模式】，丢弃可被覆盖的中间消息：
     · st（快照）：后来的会完整覆盖前面的 → 只保留最新一条
     · anim / ft：瞬时视觉，过期即无意义 → 直接丢
     · cutin：不 await 播放，避免阻塞（保留最后一条补播一次，不至于完全看不到）
     · log / panel / init / over：影响正确性或需用户操作，一律保留 */
async drainGuest() {
if (this.guestDraining) return;
this.guestDraining = true;
try {
while (this.guestQueue.length > 0) {
/* 追赶判定放在每轮循环开始时：消费过程中可能又涌入新消息 */
if (this.guestQueue.length > NET_CATCHUP_QUEUE) this.catchUp();
const o = this.guestQueue.shift();
if (!o) break;
try {
if (o.t === 'log') log(this.flipLog(o.text), o.cls);
else if (o.t === 'logs') (o.items || []).forEach(it => log(this.flipLog(it.text), it.cls));
else if (o.t === 'ft') { const u = gameState.units[o.idx]; if (u) showFloatingText(u, o.text, o.cls); }
else if (o.t === 'anim') { const el = document.getElementById(`unit-${o.idx}`); if (el) el.classList.toggle(o.cls, !!o.on); }
/* 演出不再 await：它动辄 1~2 秒，期间房主仍在持续发快照，
   队列会暴涨到触发追赶、把后面的动画全丢掉（"动画丢失"的主因）。
   改成挂到一条串行链上后台播，队列继续消费，演出之间仍不重叠。 */
else if (o.t === 'cutin') { const u = gameState.units[o.idx]; if (u) { const nm = !!o.nm; const bi = o.bi || ''; this._cutinChain = Promise.resolve(this._cutinChain).catch(() => {}).then(() => playSkillCutin(u, o.name, nm, false, bi)).catch(() => {}); } }
else if (o.t === 'heishan') queueHeishanEffect(!!o.first, true, o.side);
else if (o.t === 'st') this.applySnapshot(o);
else if (o.t === 'panel') this.applyPanel(o);
else if (o.t === 'init') this.applyInit(o);
else if (o.t === 'summon') this.applySummon(o.sm);
/* 结算：先让正在播的演出播完，再切结算界面 */
else if (o.t === 'over') {
try { await this.waitCutinDone(NET_OVER_WAIT_MS); } catch (e) {}
this.applyOver(o);
this.guestQueue.length = 0;    // 已结算，队列里剩下的消息不再有意义
return;
}
} catch (e) { /* 单条播放失败不阻断后续 */ }
}
} finally {
this.guestDraining = false;
/* 消费过程中可能又有新消息入队（此时 guestDraining 已被占用而没人消费） */
if (this.guestQueue.length > 0) this.drainGuest();
}
},
/* 等正在播的技能演出播完（带上限）。
   演出挂在 _cutinChain 上后台播放，结算时需要等它收尾，
   否则最后一击的特写会被结算界面直接盖掉。
   ★ 上限必须有：演出万一卡住，不能连结算界面都进不去。 */
waitCutinDone(ms) {
const chain = this._cutinChain;
if (!chain) return Promise.resolve();
return Promise.race([
Promise.resolve(chain).catch(() => {}),
new Promise((r) => setTimeout(r, ms || NET_OVER_WAIT_MS)),
]);
},
/* 追赶：把队列里"可被后来者覆盖"的消息丢掉，只留最新的 */
catchUp() {
const keep = [];
const ftKeep = [];
let lastSt = null, lastCutin = null, lastOver = null;
const lastHeishanBySide = {};   // 双方首播各留一条，不互相覆盖
for (const o of this.guestQueue) {
if (o.t === 'over') { lastOver = o; continue; }      // 结算：永远排最后
if (o.t === 'st') { lastSt = o; continue; }          // 快照：只留最后一条
if (o.t === 'anim') continue;                        // 纯视觉开关：过期即无意义
/* 浮动文字（伤害/治疗数字）此前被整类丢掉 —— 玩家看到的就是"动画没了"。
   保留最近几条：它们是结算感的关键反馈，全丢会让打击感彻底消失。 */
if (o.t === 'ft') { ftKeep.push(o); if (ftKeep.length > BAR_KEEP_FT) ftKeep.shift(); continue; }
if (o.t === 'cutin') { lastCutin = o; continue; }    // 演出：只留最后一条补播
if (o.t === 'heishan') { lastHeishanBySide[o.side || 'player'] = o; continue; } // 每方各留最后一条
keep.push(o);
}
/* 顺序：普通消息 → 浮动数字 → 补播演出 → 最新快照 → 结算。
   ★ 结算必须垫底：它是终止信号，排在它前面的动画都要先播完，
     否则追赶时结算会跑到演出前面，最后一击照样看不到。 */
this.guestQueue = keep.concat(ftKeep);
Object.keys(lastHeishanBySide).forEach(k => this.guestQueue.push(lastHeishanBySide[k])); // 双方黑闪排在截图之前
if (lastCutin) this.guestQueue.push(lastCutin);
if (lastSt) this.guestQueue.push(lastSt);            // 快照放最后，保证状态是最新的
if (lastOver) this.guestQueue.push(lastOver);
this.catchUpCount++;
},
/* ---------- 客机：行动条本地插值 ----------
   客机的行动条此前完全靠房主的 300ms 快照硬赋值 —— 等于 3fps 动画，
   圆点一跳一跳地走，这是"客机动画僵硬"的直接原因。
   房主端是 rAF 每帧推进的，客机却没跑任何循环（它不能跑 gameLoop：
   那里面有 readyUnits 判定与 processUnitTurn，逻辑只能由房主执行）。
   这里补一个【只推进显示】的循环：
     · 按本地速度自由推进（与房主同一套速度公式，天然接近）
     · 同时向"外推后的权威值"指数收敛，抵消累积漂移
     · 偏差超过阈值直接对齐（真跳变不拖泥带水）
     · 房主演出/等待操作期间冻结 —— 由快照的 run 字段告知 */
interpBars(dt) {
const tgt = this._barTarget || [];
const rate = this._barRate || [];
for (let i = 0; i < gameState.units.length; i++) {
const u = gameState.units[i];
if (!u || !isTargetable(u) || isActionLocked(u)) continue;
const t = tgt[i];
if (t == null) continue;
const r = rate[i] || 0;
if (r === 0) continue;                       // 已到位：停住等下一份快照
let v = Number(u.actionValue) || 0;
const step = r * dt;
/* 越过目的地就直接吸附到位并停下：不会冲过头，也就不会倒退 */
if ((r > 0 && v + step >= t) || (r < 0 && v + step <= t)) {
v = t; rate[i] = 0;
} else {
v += step;
}
u.actionValue = clamp(v, 0, ACTION_OVERFLOW_CAP);
}
updateActionBarDots();
},
/* 结算面板：房主把标题/样式/副标题一并广播，客机据此完整渲染。
   表格数据用客机本地已同步的 gameState（快照持续同步，数值是最新的）。 */
applyOver(o) {
/* 先把房主发来的战绩写进本地单位，再渲染表格 ——
   顺序反了的话表格读到的仍是全 0。 */
if (Array.isArray(o.stats) && typeof gameState !== 'undefined') {
o.stats.forEach((v, i) => {
const u = gameState.units[i]; if (!u) return;
u.statsDamageDealt = Number(v[0]) || 0;
u.statsDamageTaken = Number(v[1]) || 0;
u.statsHealDone    = Number(v[2]) || 0;
u.statsRestoreDone = Number(v[3]) || 0;
u.statsShieldDone  = Number(v[4]) || 0;
});
}
if (typeof renderResultTable === 'function') renderResultTable();
const t = document.getElementById('result-title');
if (t) { t.textContent = o.text || '对局结束'; t.className = 'result-title ' + (o.cls || ''); }
const sub = document.getElementById('result-sub');
if (sub) sub.textContent = o.sub || '联机对战 · 战斗数据统计';
if (typeof gameState !== 'undefined') { gameState.phase = 'gameOver'; gameState.paused = true; }
document.getElementById('battle-screen').style.display = 'none';
document.getElementById('result-screen').classList.add('show');
const rs = document.getElementById('result-screen'); if (rs) rs.scrollTop = 0;
bindRematchButton();
},

applyInit(o) {
resetHeishanEffect();      // 客机新对局：首播计数与房主保持同步
gameState.units = []; gameState.playerTeam = []; gameState.enemyTeam = [];
gameState.summonIdx = { player:null, enemy:null };   // 新对局不继承上一局的稻草人（每方各一个槽）
(o.roster || []).forEach((name, i) => { const u = createUnit(name, 'player', i); gameState.units.push(u); gameState.playerTeam.push(gameState.units.length - 1); });
(o.guest || []).forEach((name, i) => { const u = createUnit(name, 'enemy', i); gameState.units.push(u); gameState.enemyTeam.push(gameState.units.length - 1); });
gameState.actionBarMax = o.barMax || 1;
gameState.phase = 'fighting';
document.getElementById('selection-screen').style.display = 'none';
document.getElementById('battle-screen').style.display = 'flex';
document.getElementById('battle-log').innerHTML = '';
renderUnits(); renderActionBarDots();
/* 开局前清掉上一局可能残留的演出 class（如动画播到一半就重开了） */
gameState.units.forEach((u, i) => clearUnitAnims(i));
applyNetViewFlip();
this.bindGuestButtons();
/* ★ 启动本地行动条插值循环（只推进显示，不跑任何战斗逻辑）。
   此前客机没有任何 rAF 循环，行动条只能靠快照硬跳。 */
this._guestBarReady = false;
this._overQueued = false;                            // 新一局：允许再次接收结算
this._barTarget = []; this._barRate = [];
this._barSnap = null; this._barRun = true;
gameState.paused = false; gameState.animating = false;
gameState.lastTimestamp = performance.now();
if (gameState.rafId) cancelAnimationFrame(gameState.rafId);
gameState.rafId = requestAnimationFrame(guestBarLoop);
},
applySnapshot(o) {
/* 先还原召唤物：us.forEach 要按 idx 写 hp/alive，对象必须已存在。 */
if (Object.prototype.hasOwnProperty.call(o, 'sm')) this.applySummon(o.sm);
const us = o.us || [];
/* 权威行动条到来：把它登记为「目的地」，由 interpBars 平滑走过去。
   ★ 不做任何本地预测：客机自己算速度会用到 states/marks，而这些来自快照、天然滞后，
     算出的速度与房主实时值不一致，偏差随时间累积 —— 越到后面差得越多，
     甚至冲过上限跑到行动条外面。现在权威值是唯一目的地，误差不可能累积。 */
if (Array.isArray(o.bars)) {
this._barRun = (o.run !== false);
if (!this._barTarget) this._barTarget = [];
if (!this._barRate) this._barRate = [];
const ready = !!this._guestBarReady;
for (let i = 0; i < gameState.units.length; i++) {
const u = gameState.units[i]; if (!u) continue;
const s = o.bars[i];
if (s == null) { this._barTarget[i] = null; this._barRate[i] = 0; continue; }
/* 权威值已由房主 clamp 过，这里再 clamp 一次，杜绝跑到行动条外面 */
const tgt = clamp(s, 0, ACTION_OVERFLOW_CAP);
const cur = Number(u.actionValue) || 0;
const d = tgt - cur;
/* 首次同步 / 推条拉条 / 回合清零 → 直接到位（这些本来就该是突变） */
if (!ready || Math.abs(d) > BAR_JUMP_DELTA) {
u.actionValue = tgt;
this._barTarget[i] = tgt;
this._barRate[i] = 0;
} else if (Math.abs(d) < BAR_EPS) {
this._barTarget[i] = tgt;
this._barRate[i] = 0;
} else {
/* 正常推进：登记目的地与"每毫秒走多少"，保证单向平滑、不倒退 */
this._barTarget[i] = tgt;
this._barRate[i] = d / BAR_TRAVEL_MS;
}
}
this._guestBarReady = true;
}
us.forEach((d, i) => {
const u = gameState.units[i]; if (!u) return;
u.hp = d.hp; u.shield = d.sh; u.rage = d.rg; u.alive = d.al; u.banished = d.bn; u.intangible = d.it;
u.states = (d.st || []).map(x => ({ type:x[0], duration:x[1] }));
u.marks = (d.mk || []).map(x => ({ type:x[0], duration:x[1], stacks:x[2] || 1 }));
u.rules = (d.ru || []).map(x => ({ type:x[0], duration:x[1], effect:x[2] || null }));
/* 房主随机选定的「未来」战斗图下标；快照里没有（旧版房主）就保持未定。 */
if (typeof d.hb === 'number') u.miraiBattlePick = (d.hb >= 0) ? d.hb : null;
});
renderActionBarDots();
/* 客机的 rules 刚还原完：若房主那边虎杖进入了「未来」，这里同步换战斗图。 */
refreshBattleImages();
/* 同步「正在行动」高亮：房主那边的 .acting 是本地 class，不会随快照自动过来 */
const actIdx = (o.acting == null) ? -1 : Number(o.acting);
gameState.units.forEach((u, i) => {
const el = document.getElementById(`unit-${i}`);
if (el) el.classList.toggle('acting', i === actIdx);
});
gameState.units.forEach((u, i) => { if (u) refreshUnitView(i); });
},
applyPanel(o) {
const set = (id, show) => { const b = document.getElementById(id); if (b) { b.style.display = show ? 'inline-block' : 'none'; if (show) b.style.opacity = ''; } };
this.waitingPick = (o.mode === 'select');
/* 记下面板属于哪个行动者：点按钮时一并回传，供房主校验是否过期 */
this.panelIdx = (o.idx == null) ? -1 : Number(o.idx);
/* 房主的权威面板回来了 → 清掉本地那层「已发送」置灰。
   guestLocalAck 只是即时反馈，真正的可用状态以房主的面板为准（含 disabled）。
   ★ 必须连 disabled 一起复位：guestLocalAck 把四个按钮全置灰防连点，
     而 select 态不走下面的 btns 数组，"取消"就一直是 disabled ——
     玩家2 进入选目标后无法取消，一旦选不到合法目标整局就卡死。
     skill 态随后由 btns 数组按房主的裁决重新置灰，所以先复位不会放行本不该点的按钮。 */
['btn-normal','btn-skill','btn-skill2','btn-cancel'].forEach(id => {
const b = document.getElementById(id); if (b) { b.style.opacity = ''; b.disabled = false; }
});
/* 已提交目标后收到 select → 房主周期性重发的陈旧面板，必须忽略，
   否则会把刚清掉的目标高亮又点亮一次（表现为边框闪烁）。
   ★ retry 例外：房主判定目标失效后明确要求重选，必须放行，
     否则客机永远停在"已提交"状态，再也选不了目标。 */
if (o.mode === 'select' && this.pickedPending && !o.retry) return;
if (o.mode === 'select' && o.retry) this.pickedPending = false;
/* 回到技能选择态 = 上一轮选目标结束，清掉残留高亮 */
if (o.mode === 'skill') { this.pickedPending = false; clearHighlights(); }
if (o.mode !== 'none') this.setStatus('✅ 对局进行中（你是玩家2 · 我方）');
/* 客机的「自动」按钮不随面板模式隐藏 —— 托管是持续性偏好，
   不是某一步的操作项；轮到对方时也应能提前开关。 */
if (o.mode === 'none') { this.pickedPending = false; set('btn-normal', false); set('btn-skill', false); set('btn-skill2', false); set('btn-cancel', false); set('btn-auto', true); clearHighlights(); return; }
if (o.mode === 'select') {
set('btn-normal', false); set('btn-skill', false); set('btn-skill2', false); set('btn-cancel', true); set('btn-auto', true);
const type = o.ttype || 'enemy';
gameState.targetType = type;
/* isValidTarget 需要一个 actor 来比对阵营，客机端没有真实行动者 ——
   用「阵营 = 客机方」的虚拟行动者即可（客机固定操控 NET_GUEST_SIDE）。 */
const fakeActor = { side: NET_GUEST_SIDE };
gameState.units.forEach((u, idx) => { const el = document.getElementById(`unit-${idx}`); if (!el) return; if (isValidTarget(u, type, fakeActor)) el.style.boxShadow = '0 0 10px 3px #ffd700'; });
return;
}
set('btn-normal', true); set('btn-skill', true); set('btn-skill2', true); set('btn-cancel', false);
(o.btns || []).forEach(b => { const el = document.getElementById(b.id); if (!el) return; el.style.display = b.show ? 'inline-block' : 'none'; el.disabled = !!b.dis; el.textContent = b.text; });
},
/* 客机点按钮后立刻给出本地反馈：置灰防连点 + 提示"已发送"。
   指令要绕一圈到房主、房主算完再广播回来，这段空窗期客机画面毫无变化，
   很容易被当成"点了没反应 / 卡了"。先本地响应，房主的权威 panel 回来时再校正。
   ★ 同时把面板所属行动者的 idx 一并回传，房主据此识别过期面板。 */
guestLocalAck() {
['btn-normal','btn-skill','btn-skill2','btn-cancel'].forEach(id => {
const b = document.getElementById(id);
if (!b) return;
b.disabled = true;                 // 置灰防连点（重复指令会让房主重复结算一次行动）
b.style.opacity = '0.45';
});
this.setStatus('⏳ 已发送操作，等待房主结算…');
},
bindGuestButtons() {
document.getElementById('btn-normal').onclick = () => { this.guestLocalAck(); this.send({ t:'act', kind:'normal', idx:this.panelIdx }); };
document.getElementById('btn-skill').onclick  = () => { this.guestLocalAck(); this.send({ t:'act', kind:'skill',  idx:this.panelIdx }); };
document.getElementById('btn-skill2').onclick = () => { this.guestLocalAck(); this.send({ t:'act', kind:'skill2', idx:this.panelIdx }); };
document.getElementById('btn-cancel').onclick = () => { this.waitingPick = false; clearHighlights(); this.send({ t:'act', kind:'cancel' }); };
/* 自动：客机【也要有】—— 玩家2 同样需要能托管自己那一方。
   （此前这里写的是"联机下不提供托管"并把按钮藏了，于是房主一点自动，
     AI 把两边都接管，客机却被锁在手动且没有按钮，只能干看着。） */
document.getElementById('btn-auto').style.display = 'inline-block';
document.getElementById('btn-auto').onclick = toggleAuto;
updateAutoBtn();
/* 倍速与重新开始：客机同样需要 —— 前者是本地观感设置，
   后者要求「双方都能发起」，所以不能只在房主侧显示。 */
document.getElementById('speed-btn').style.display = 'block';
setupRestartButton();
},

/* ---------- 房主侧插桩：广播演出与状态 ---------- */
/* 日志批量发送：一次行动会连打好几条日志，逐条发容易被服务商的发送频率限制卡住。
   这里按 120ms 窗口攒批，客机端再按序回放，观感与逐条完全一致。 */
onLog(text, cls) {
if (!this.active || this.role !== 'host') return;
this._logBuf = this._logBuf || [];
this._logBuf.push({ text:String(text).replace(/<[^>]*>/g, ''), cls:cls || '' });
if (this._logTimer) return;
this._logTimer = setTimeout(() => {
const items = this._logBuf || []; this._logBuf = []; this._logTimer = null;
if (items.length) this.send({ t:'logs', items });
}, 120);
},
onFloat(idx, text, cls) { if (this.active && this.role === 'host') this.send({ t:'ft', idx, text:String(text), cls:cls || '' }); },
onCutin(idx, name, isNormal) { if (this.active && this.role === 'host') { const u = gameState.units[idx]; this.send({ t:'cutin', idx, name, nm:!!isNormal, bi: u ? battleImgSrc(u) : '' }); } },
onAnim(idx, cls, on) { if (this.active && this.role === 'host') this.send({ t:'anim', idx:Number(idx), cls:String(cls), on:!!on }); },
onHeishan(first, side) { if (this.active && this.role === 'host') this.send({ t:'heishan', first:!!first, side:String(side || 'player') }); },
snapshot() {
return {
t:'st',
/* 正在行动的单位索引（没有则 -1）：客机端据此还原蓝色行动高亮。
   直接读 DOM 上带 .acting 的元素，而不是记 gameState.currentActor ——
   后者在"行动结束但回合未结束"的间隙里仍残留，会让客机一直亮着；
   读 DOM 则自动跟随所有 add/remove 路径，不用在 4 处调用点各插一遍。 */
acting: (() => { const el = document.querySelector('.unit.acting'); if (!el) return -1; return parseInt(String(el.id).replace('unit-',''), 10) || -1; })(),
/* 行动条保留一位小数：取整会让客机的插值在 60fps 下出现可见台阶 */
bars: gameState.units.map(u => Math.round((Number(u.actionValue) || 0) * 10) / 10),
/* 房主此刻是否在推进行动条（演出/等待操作时会冻结）。
   客机必须知道这个：否则会在房主演出期间继续本地外推，
   把行动条推到终点并停在那儿，看起来像"卡住了"。 */
run: !gameState.paused && !gameState.animating,
us: gameState.units.map(u => ({
hp: Math.round(u.hp), sh: Math.round(Number(u.shield) || 0), rg: u.rage,
al: !!u.alive, bn: !!u.banished, it: !!u.intangible,
st: (u.states || []).map(s => [s.type, s.duration]),
mk: (u.marks || []).map(m => [m.type, m.duration, m.stacks || 1]),
/* 规则标签（放逐 / 虚化 / 未来）也要同步：客机原本只有空数组，
   导致房主「放逐」了目标、客机却看不到橙色标签，不知道对方为何不动。
   effect 只用于显示与日志，到期结算仍由房主权威执行。 */
ru: (u.rules || []).map(r => [r.type, r.duration, r.effect || null]),
/* 「未来」随机战斗图下标（0/1，-1 表示还没进未来）：
   房主掷一次，客机照用，避免两边各随机出不同的图。 */
hb: (u.miraiBattlePick == null ? -1 : Number(u.miraiBattlePick)),
})),
/* 召唤物随每份快照兜底同步：即使 t:'summon' 单发丢包，下一份 st 也能把客机拉回一致。 */
sm: this.serializeSummon(),
};
},
tick(now) {
if (!this.active || this.role !== 'host') return;
if (gameState.phase !== 'fighting') return;
const elapsed = now - this.lastTick;
if (elapsed < NET_JUMP_CHECK_MS) return;
/* 行动条跳变（回合结束清零、推条/拉条、先机加速）必须立刻同步 ——
   等下一个节拍才发，客机回合切换就是一顿一顿的。
   ★ 跳变检测只读 actionValue、不做序列化，所以能按 50ms 高频跑；
     下面的 snapshot()+JSON.stringify 只在真要发时才做，避免每 50ms 全量序列化。 */
const jump = this.detectBarJump(now);
if (!jump && elapsed < NET_TICK_MS) return;
this.lastTick = now;
/* 快照去重：只有内容相对上一次真的变了才发。
   双方都 idle 的回合消息量降到 0，队列不再被无害快照挤占，
   真正重要的事件消息（技能/动画/面板）更不容易被挤掉；
   动画被吞的根因正是积压超 12 条触发了丢旧保新。
   比对的是发出去的 JSON 而非快照对象：血量、行动条、怒气、
   状态/印记任一字段变化都会让字符串不同，绝不漏发。
   完全相同则静默 return，客机只是少收一份冗余全量同步。 */
const snap = this.snapshot();
const snapJson = JSON.stringify(snap);
/* 内容没变：重置节流基准。不重置的话，双方 idle 时会每 50ms
   白白做一次全量序列化，手机上这是实打实的开销。 */
if (!jump && this._lastSnapJson === snapJson) return;
this._lastSnapJson = snapJson;
this.send(snap);
this.syncGuestPanel();
},
/* 行动条跳变检测：把每个单位的实际变化量与「按速度自然推进应有的量」对比，
   偏差超容差即判定为跳变。自然推进不受影响，清零/拉条会被立刻捕获。 */
detectBarJump(now) {
if (!this._lastBars) {
this._lastBars = gameState.units.map(u => Number(u.actionValue) || 0);
this._lastBarsT = now;
return false;
}
const el = Math.max(0.001, (now - (this._lastBarsT || now)) / 1000);
const max = gameState.actionBarMax || 1;
for (let i = 0; i < gameState.units.length; i++) {
const prev = this._lastBars[i];
if (prev == null) continue;
const u = gameState.units[i];
if (!u || !isTargetable(u) || isActionLocked(u)) continue;
const perSec = (getEffectiveSpd(u) / max) * 100 * ACTION_BAR_SPEED;
const natural = perSec * el;
const d = (Number(u.actionValue) || 0) - prev;
/* 容差取「自然量的 60%」与一个绝对下限的较大值 ——
   低速单位在短间隔内自然增量极小，没有绝对下限会把它误判成跳变。 */
const tol = Math.max(2.5, Math.abs(natural) * 0.6);
if (Math.abs(d - natural) > tol) { this._lastBars = null; return true; }
}
/* 本次检查值存为下次基准：跳变检测按 50ms 跑，
   基准必须同步刷新，否则 natural 会随时间累积、容差越放越宽、检测越来越迟钝。 */
this._lastBars = gameState.units.map(u => Number(u.actionValue) || 0);
this._lastBarsT = now;
return false;
},
/* 主动生成「当前行动者」的面板（校验失败 / 跳过回合等场景调用） */
sendPanelFor(unit) {
if (!unit) { this.send({ t:'panel', mode:'none' }); return; }
if (gameState.waitingForTarget) { this.send({ t:'panel', mode:'select', idx: idxOf(unit), ttype: gameState.targetType || 'enemy', btns:[] }); return; }
showControlPanel(unit);
},
/* 面板自愈：每 tick 核对一次。
   客机操作栏完全依赖房主广播的 panel 消息，丢一条就永远停在旧画面
   （症状：上一个角色的技能名还在，点下去却放出当前角色的技能）。
   ① 期望状态与已发面板不一致 → 立刻重新生成；
   ② 一致但已过约 1 秒 → 原样重发一次，兜住偶发丢包。 */
syncGuestPanel() {
const a = gameState.currentActor;
const waiting = !!(a && a.side === NET_GUEST_SIDE && !gameState.animating && !isAutoUnit(a));
/* ★ 看门狗：本端正停在"等玩家2 出手"。这是唯一可能无限期卡住的状态
   （房主不点就不会往下走），所以在这里做两件兜底：
     ① 对局其实已经结束（有一方全灭）—— 任何非常规路径造成的漏判都在这里收尾；
     ② 已进入选目标态，却一个合法目标都没有（例如敌方最后一人刚阵亡）——
        放弃本次选择退回技能选择态，否则玩家2 永远等不到可点的目标。 */
if (waiting) {
if (typeof checkBattleEnd === 'function' && checkBattleEnd()) return;
if (gameState.waitingForTarget && !gameState.units.some(u => isValidTarget(u, gameState.targetType, a))) {
gameState.waitingForTarget = false; gameState.pendingSkill = null; gameState.targetType = null;
clearHighlights();
log('已无可选目标，取消本次选择。', 'log-normal');
showControlPanel(a);
return;
}
}
const wantMode = waiting ? (gameState.waitingForTarget ? 'select' : 'skill') : 'none';
const wantIdx = waiting ? idxOf(a) : -1;
const lp = this._lastPanel;
const mismatch = !lp || lp.mode !== wantMode || (Number(lp.idx == null ? -1 : lp.idx) !== wantIdx);
if (mismatch) { this.sendPanelFor(waiting ? a : null); return; }
/* 周期性重发只针对「技能选择态」：
   select 态重发会把客机刚清掉的目标高亮又点亮，造成边框闪烁。 */
if (lp.mode !== 'select' && ++this._panelAge >= 5) { this._panelAge = 0; this.send(lp); }
},
sendInit() {
if (!this.active || this.role !== 'host') return;
this.send({ t:'init', roster:playerSelection.slice(), guest:enemySelection.slice(), barMax:gameState.actionBarMax });
},
/* ===== 召唤物同步（房主权威）=====
   召唤 / 覆盖 / 退场时立刻单发一条 summon；同一份描述也挂进 st 快照做兜底，
   丢包或重连后下一份快照就能自愈。客机只还原显示对象，不跑战斗逻辑。
   linked / owner 传 units 下标（对象引用不能过网络），客机按 idx 反查。 */
/* 每方各一只，因此快照是【数组】（0~2 项）。字段 sm 的名称保持不变，
   丢包或重连后下一份快照就能自愈；客机只还原显示对象，不跑战斗逻辑。
   linked / owner 传 units 下标（对象引用不能过网络），客机按 idx 反查。 */
serializeSummon() {
return aliveSummonIdxs().map(si => {
const u = gameState.units[si];
return { i:si, s:u.side, h:Math.round(u.hp), mh:Math.round(u.maxHp), d:Math.round(u.def),
l:idxOf(u.linkedTarget), o:idxOf(u.owner), a:true };
});
},
sendSummonSnapshot() {
if (!this.active || this.role !== 'host') return;
this.send({ t:'summon', sm:this.serializeSummon() });
},
applySummon(sm) {
/* 兼容旧版房主的单对象形态，统一按全量数组处理。 */
const list = (Array.isArray(sm) ? sm : (sm && sm.a ? [sm] : [])).filter(x => x && x.a);
const prev = (gameState.summonIdx && typeof gameState.summonIdx === 'object')
? (gameState.summonIdx.player + '|' + gameState.summonIdx.enemy) : '';
/* 先把客机现存召唤物占位全部标为死亡，收到快照的会重新置活。
   占位对象【保留不删】—— 房主复用槽位、idx 全程稳定，客机必须同步保持长度与下标。 */
gameState.units.forEach(u => { if (isSummonUnit(u)) { u.alive = false; u.hp = 0; } });
const next = { player:null, enemy:null };
let needRender = false;
list.forEach(one => {
const idx = Number(one.i); if (!isFinite(idx) || idx < 0) return;
while (gameState.units.length <= idx) {
const ph = makeSummonUnit('enemy', null, null, 1, 0); ph.alive = false; ph.hp = 0;
gameState.units.push(ph);
}
const linked = gameState.units[Number(one.l)] || null;
const owner = gameState.units[Number(one.o)] || null;
const side = one.s === 'player' ? 'player' : 'enemy';
const maxHp = Math.max(1, Number(one.mh) || 1);
const def = Math.max(0, Number(one.d) || 0);
const key = [idx, side, maxHp, def, Number(one.l)].join('|');
let u = gameState.units[idx];
const changed = !isSummonUnit(u) || u._smKey !== key;
if (!isSummonUnit(u)) u = makeSummonUnit(side, linked, owner, maxHp, def);
u.side = side; u.maxHp = maxHp; u.def = def;
u.hp = Math.max(0, Number(one.h) || 0); u.alive = u.hp > 0;
u.linkedTarget = linked; u.owner = owner; u._smKey = key;
gameState.units[idx] = u;
if (u.alive) next[side] = idx;
if (changed || !u.alive) needRender = true;
});
const cur = next.player + '|' + next.enemy;
if (cur !== prev) needRender = true;
gameState.summonIdx = next;
/* 身份（连接目标 / 阵营 / 上限）或存活数量变了才重建 DOM，否则只刷血条 ——
   避免每份快照都重建卡片、把玩家正在选目标的高亮框冲掉。 */
if (needRender) renderSummon();
else list.forEach(one => { const i = Number(one.i); if (isFinite(i) && i >= 0) updateUnitDisplay(i); });
},
_clearSummon() {
gameState.units.forEach(u => { if (isSummonUnit(u)) { u.alive = false; u.hp = 0; } });
gameState.summonIdx = { player:null, enemy:null };
const area = document.getElementById('summon-area'); if (area) area.innerHTML = '';
},
/* 结算广播：
   ① 先补一份最新快照 —— 最后一击的血量/死亡状态可能还没被客机收到，
      不补的话客机表格里的数值会停在上一帧；
   ② 标题的样式 class 与副标题一并带上，客机才能渲染出一模一样的面板。 */
sendOver(text, cls) {
if (!this.active || this.role !== 'host') return;
/* 结算前补发的最新快照也要登记：结算会改变血量/死亡状态，
   这一份必然与上一次不同，登记后下次 tick 的首次比对才正确。 */
const snap = this.snapshot();
this._lastSnapJson = JSON.stringify(snap);
this.send(snap);
/* ★ 战绩数据必须单独带上。
   快照只同步血量/怒气/状态这类"战局状态"，从不同步 statsDamageDealt 等统计字段
   （每 200ms 全量同步 12×4 个统计数字纯属浪费）。但客机端这些字段永远是 0，
   结算表格直接从 gameState 读它们 —— 于是玩家2 看到的全是 0。
   结算是一次性事件，这里补发一次即可。 */
/* 存一份：结算这条在公网上丢了就会「游戏结束不了」，
   客机的看门狗会来要，这里能原样补发。 */
this._lastOver = { t:'over', text, cls, sub:'联机对战 · 战斗数据统计',
stats: gameState.units.map(u => [
Math.round(Number(u.statsDamageDealt) || 0),
Math.round(Number(u.statsDamageTaken) || 0),
Math.round(Number(u.statsHealDone) || 0),
Math.round(Number(u.statsRestoreDone) || 0),
Math.round(Number(u.statsShieldDone) || 0),
]) };
this.send(this._lastOver);
},
};
/* 联机下「当前行动者归客机操控」：房主据此把操作面板转交给客机 */
function netActorBelongsToGuest(unit) { return Net.active && Net.role === 'host' && unit && unit.side === NET_GUEST_SIDE; }
function netIsGuestControlled() { return Net.active && Net.role === 'guest'; }

/* ===== 自定义确认弹窗 =====
   showConfirmDialog(text, onConfirm)：点击「确定」才执行 onConfirm。
   背景 / 「取消」均不执行。用页面内弹窗而非原生 confirm()。 */
let confirmDialogCallback = null;
function showConfirmDialog(text, onConfirm) {
const ov = document.getElementById('confirm-overlay');
if (!ov) { if (onConfirm) onConfirm(); return; }   // 兜底：无弹窗时直接执行
document.getElementById('confirm-text').textContent = text;
confirmDialogCallback = onConfirm || null;
ov.classList.remove('notice');
ov.classList.add('show');
}
/* 纯通知：只有一个「确定」按钮，用于「对手已退出」这类单向告知 */
function showNoticeDialog(text) {
const ov = document.getElementById('confirm-overlay');
if (!ov) return;
document.getElementById('confirm-text').textContent = text;
confirmDialogCallback = null;
ov.classList.add('show', 'notice');
}
function closeConfirmDialog(run) {
const ov = document.getElementById('confirm-overlay');
if (ov) { ov.classList.remove('show'); ov.classList.remove('notice'); }
const cb = confirmDialogCallback; confirmDialogCallback = null;
if (run && cb) cb();
}
document.getElementById('confirm-yes').onclick = () => closeConfirmDialog(true);
document.getElementById('confirm-no').onclick = () => closeConfirmDialog(false);
document.getElementById('confirm-overlay').onclick = (e) => { if (e.target && e.target.id === 'confirm-overlay') closeConfirmDialog(false); };

/* ==================== 联机「重新开始」====================
   设计要点：
     · 双方都显示按钮、都能发起 —— 不是房主专属；
     · 需要【双方确认】：一方发起、另一方同意后才真正重开，
       避免一方误触把正在进行的对局打断；
     · 对手已退出（收到 bye）时，发起方单独执行即可 ——
       否则对局卡死：没人能给出确认。
   重开后保持连接，双方各自回到联机选人界面，可直接再来一局。 */
function netRequestRestart() {
const online = (typeof Net !== 'undefined' && Net.active);
const needFoe = online && !Net.peerGone;   // 对手还在 → 要等他同意；已退出 → 自己说了算
/* ★ 单机 / 双人对战也必须先确认再执行 —— 不能因为走了联机分支就把确认跳过去 */
showConfirmDialog('确定要结束当前对局并重新开始吗？' + (needFoe ? '（需对手同意）' : ''), () => {
if (!needFoe) { netResetToSelection(); return; }
Net.send({ t:'restart' });
Net.setStatus('⏳ 已申请重新开始，等待对手同意…');
});
}
/* 收到对手的重开申请。fromRematch 用来区分「战斗中重开」与「结算页再来一局」，
   两者场景不同，问法也应不同 —— 否则玩家在结算页看到"重新开始本局"会困惑。 */
function netOnRestartRequest(fromRematch) {
showConfirmDialog(fromRematch ? '对手想再来一局，是否同意？' : '对手申请重新开始本局对战，是否同意？', () => {
Net.send({ t:'restartAck' });
netResetToSelection();
});
}
/* 结算页「再来一局」：与战斗中的「重新开始」复用同一套 restart / restartAck 消息，
   只是文案不同 —— 这里对局已经结束，不需要"确定要结束当前对局"的警告语气。
   对手已退出时无需对方同意（没人能给确认，否则永远卡住）。 */
function netRequestRematch() {
const needFoe = (typeof Net !== 'undefined' && Net.active && !Net.peerGone);
showConfirmDialog('再来一局？' + (needFoe ? '（需对手同意）' : ''), () => {
if (!needFoe) { netResetToSelection(); return; }
Net.send({ t:'restart', from:'rematch' });
Net.setStatus('⏳ 已申请再来一局，等待对手同意…');
});
}
/* 结算页「退出」：断开连接 + 回主界面（模式选择），并让对方看到「对方已退出」。
   ★ 与「再来一局」的区别：那个保持连接、双方一起回选人；这个是彻底断开。
   ★ 必须先发 bye 再 disconnect：disconnect 里 WS 分支只关 socket，
     MQTT 分支虽然自己会发一次 bye，但这里显式发能确保走 QoS1 不被丢弃
     （对手收不到就会一直等到 keepalive 超时才提示）。 */
function netQuitToModeSelect() {
const online = (typeof Net !== 'undefined' && Net.active);
if (!online) {
document.getElementById('result-screen').classList.remove('show');
resetGame();
return;
}
showConfirmDialog('退出联机？将断开连接并回到主界面', () => {
try { Net.send({ t:'bye' }); } catch (e) {}
Net.disconnect();
/* disconnect 不负责关界面，这里统一清场并回主界面 */
document.getElementById('result-screen').classList.remove('show');
document.getElementById('battle-screen').style.display = 'none';
resetGame();
});
}
/* 真正执行重开：结束对局 → 回到联机选人（连接保持） */
function netResetToSelection() {
stopSkillCutin();
closeConfirmDialog(false);
/* 结算页必须显式关掉 —— 客机端尤其如此：它自己不会走 resetGame 的关页逻辑，
   不关的话会一直盖在选人界面上。 */
document.getElementById('result-screen').classList.remove('show');
gameState.phase = 'ended';   // 先判负结束，避免残留的异步回合继续结算
if (gameState.rafId) { cancelAnimationFrame(gameState.rafId); gameState.rafId = null; }
if (typeof Net !== 'undefined' && Net.active) {
Net.guestRoster = null; Net.waitingPick = false; Net.guestQueue = []; Net.hostBattleStarted = false;
/* 重开 = 新的一局，上一局的「对手已退出」不该带过来。
   这里连接是保持的（不走 connect），所以必须显式复位 ——
   否则回到选人界面仍沿用旧标记：状态栏一直挂警告、下一次 bye 还会照弹。 */
Net.peerGone = false; Net.peerGoneNotified = false; Net.hudNote = '';
Net.send({ t:'panel', mode:'none' });
}
resetGame();                                   // 统一清场（会回到模式选择）
if (typeof Net !== 'undefined' && Net.active) {
enterOnlineSelection(Net.role);                // 保持连接，直接回到联机选人
Net.setStatus('✅ 已重新开始，请重新选人');
netRefreshStartButton();
}
}
/* 战斗界面右下角「重新开始」：双方都要能看到、都能点。
   抽成函数供房主（startBattle）与客机（bindGuestButtons）各调一次 ——
   之前只在 startBattle 里绑定，客机端既没绑定也没显示。 */
function setupRestartButton() {
const rb = document.getElementById('restart-btn');
if (!rb) return;
rb.style.display = 'block';
rb.onclick = netRequestRestart;   // onclick 赋值：重复调用不会叠加监听器
}

/* ===== 倍速 =====
   只缩放「等待时长」（sleep 与演出 setTimeout），不改动任何游戏逻辑，
   因此战斗结果与倍速无关。×1 ⇄ ×2 循环切换。 */
function speedBtnDisplay(show) {
const sb = document.getElementById('speed-btn'), rb = document.getElementById('restart-btn');
if (sb) sb.style.display = show ? 'block' : 'none';
if (rb) rb.style.display = show ? 'block' : 'none';
}
function applySpeedBtn() {
const btn = document.getElementById('speed-btn');
if (!btn) return;
btn.textContent = '×' + SPEED_MULTIPLIER;
btn.classList.toggle('fast', SPEED_MULTIPLIER > 1);
}
function toggleSpeed() {
SPEED_MULTIPLIER = SPEED_MULTIPLIER === 1 ? 2 : 1;
applySpeedBtn();
}
/* 更新日志（CURRENT_VERSION / CURRENT_THEME / CHANGELOG 及渲染函数）
   已拆到同目录的 log.js；该脚本须在 game.js 之前加载。
   此处仅保留依赖方：renderVersionTheme() 调用、按钮绑定、三击调试面板包装。 */

/* ==================== 后台调试面板 ====================
   进入方式：在更新日志面板中连点「当前版本」文字 3 次（2 秒内）。
   无点击反馈，普通用户无法察觉。 */
(function initDevPanel() {
  var clickCount = 0;
  var timer = null;

  function openDev() {
    refreshDev();
    var ov = document.getElementById('dev-overlay');
    if (ov) ov.classList.add('show');
  }
  function closeDev() {
    var ov = document.getElementById('dev-overlay');
    if (ov) ov.classList.remove('show');
  }
  function refreshDev() {
    var ticketEl = document.getElementById('dev-val-ticket');
    var stoneEl = document.getElementById('dev-val-stone');
    var infoEl = document.getElementById('dev-save-info');
    if (ticketEl && typeof SHENHUN !== 'undefined') {
      var items = SHENHUN.getItem();
      ticketEl.textContent = '券: ' + (items.ticket || 0);
      stoneEl.textContent = '石: ' + (items.recastStone || 0);
    }
    if (infoEl) {
      var count = 0;
      for (var k in localStorage) { if (localStorage.hasOwnProperty(k)) count++; }
      infoEl.textContent = '存档项：' + count;
    }
  }

  function bindDevOnce() {
    var addTicketBtn = document.getElementById('dev-add-ticket');
    var addStoneBtn = document.getElementById('dev-add-stone');
    var clearBtn = document.getElementById('dev-clear-cache');
    var closeBtn = document.getElementById('dev-close');
    var ov = document.getElementById('dev-overlay');

    if (addTicketBtn && !addTicketBtn._devBound) {
      addTicketBtn._devBound = true;
      addTicketBtn.onclick = function () {
        if (typeof SHENHUN !== 'undefined') {
          var n = SHENHUN.addTicket(100);
          var el = document.getElementById('dev-val-ticket');
          if (el) el.textContent = '券: ' + n;
          if (typeof refreshHeader === 'function') refreshHeader();
        }
      };
    }
    if (addStoneBtn && !addStoneBtn._devBound) {
      addStoneBtn._devBound = true;
      addStoneBtn.onclick = function () {
        if (typeof SHENHUN !== 'undefined') {
          var n = SHENHUN.addStone(100);
          var el = document.getElementById('dev-val-stone');
          if (el) el.textContent = '石: ' + n;
          if (typeof refreshHeader === 'function') refreshHeader();
        }
      };
    }
    if (clearBtn && !clearBtn._devBound) {
      clearBtn._devBound = true;
      clearBtn.onclick = function () {
        try { localStorage.clear(); } catch (e) {}
        location.reload();
      };
    }
    if (closeBtn && !closeBtn._devBound) {
      closeBtn._devBound = true;
      closeBtn.onclick = closeDev;
    }
    if (ov && !ov._devBound) {
      ov._devBound = true;
      ov.addEventListener('click', function (ev) { if (ev.target === ov) closeDev(); });
    }
  }

  function initTripleClick() {
    /* 监听更新日志 body 渲染完成后的「当前版本」元素 */
    var body = document.getElementById('changelog-body');
    if (!body) return;

    /* 使用事件委托：因为 changelog-body 内容是动态渲染的，
       「当前版本」那个 div 的文本节点无法直接绑定事件，
       改为监听整个 body 区域的点击事件并判断目标。 */
    if (body._devDelegated) return;
    body._devDelegated = true;

    body.addEventListener('click', function (ev) {
      var target = ev.target;
      /* 只响应「当前版本」标签的点击 */
      if (!target || target.className !== 'cl-cur') return;

      clickCount++;
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () { clickCount = 0; }, 2000);

      if (clickCount >= 3) {
        clickCount = 0;
        clearTimeout(timer);
        bindDevOnce();
        openDev();
      }
    });
  }

  /* 更新日志打开时绑定三击监听 */
  var origOpen = openChangelog;
  openChangelog = function () {
    origOpen();
    /* 延迟一帧等渲染完成 */
    setTimeout(initTripleClick, 0);
  };
})();
/* 按钮初始化：必须等到脚本末尾再执行 —— SPEED_MULTIPLIER 以 let 声明在下方，
   过早访问会触发 TDZ（暂时性死区）报错。函数声明会提升，位置无关。 */
function initBattleUiButtons() {
speedBtnDisplay(false);   // 倍速 / 重开：进入战斗才显示
applySpeedBtn();          // 初始化按钮文字
/* 选人界面返回上一级：PVP 第二玩家阶段 → 回到玩家1阶段；否则 → 回到模式选择 */
document.getElementById('back-btn').onclick = () => {
/* 联机：返回即退出联机 —— 必须销毁 Peer，否则房间码会被这个页面一直占着，
   之后无论自己还是别人都再也建不了/连不进同码的房间。 */
if (typeof Net !== 'undefined' && Net.active) {
showConfirmDialog('返回将断开联机连接，确定吗？', () => { Net.disconnect(); resetGame(); });
return;
}
/* 探索流程（副本 / 演武场）：返回探索界面，不直接回主界面 */
if (window.PVE && typeof window.PVE.onBack === 'function' && window.PVE.onBack()) return;
const playerSection = document.getElementById('player-selection-section');
const inPvpStage2 = gameMode === 'pvp' && playerSection && playerSection.style.display === 'none';
if (inPvpStage2) {
playerSection.style.display = 'block';
document.getElementById('enemy-selection-section').style.display = 'none';
enemySelection = ['主角'];
renderHeroGrid('enemy');
const badge = document.getElementById('selection-mode-badge');
badge.textContent = '👥 双人对战模式'; badge.className = 'pvp';
document.querySelector('#selection-screen h1').textContent = '👤 玩家1 选择阵容（必选主角，共6人）';
renderSectionTitle('enemy', 'default');
checkStartButton();
return;
}
resetGame();
};
/* BP 模式：入口 / 返回 / 搜索 / 开始（onclick 赋值，避免重复叠加监听）
   联机下入口走「申请制」：点开模式选择 → 选模式 → 发给对方征询同意。 */
document.getElementById('bp-mode-btn').onclick = () => {
if (typeof Net !== 'undefined' && Net.active) openBpTypeMenu();
else openBpTypeMenu();
};
/* 联机：选完模式后不是直接进 BP，而是发申请等对方同意 */
document.getElementById('bp-type-draft').onclick = () => bpRequestOrEnter('draft');
document.getElementById('bp-type-mirror').onclick = () => bpRequestOrEnter('mirror');
document.getElementById('bp-type-cancel').onclick = closeBpTypeMenu;
document.getElementById('bp-type-overlay').addEventListener('click', (e) => { if (e.target === document.getElementById('bp-type-overlay')) closeBpTypeMenu(); });
document.getElementById('bp-back-btn').onclick = closeBpScreen;
document.getElementById('bp-start-btn').onclick = startBpBattle;
document.getElementById('bp-confirm-btn').onclick = () => bpConfirmOrCancel(true);
document.getElementById('bp-confirm-cancel').onclick = () => bpConfirmOrCancel(false);
document.getElementById('bp-search').addEventListener('input', renderBp);
document.getElementById('speed-btn').onclick = toggleSpeed;
document.getElementById('btn-cancel').onclick = cancelTargetSelection;
document.getElementById('restart-btn').onclick = () => {
/* 用页面内确认弹窗而非原生 confirm() —— 移动 WebView 常屏蔽 confirm，
   会让「重新开始」静默失效。确认后：结束对局 → 回到模式选择。 */
showConfirmDialog('确定要结束当前对局并重新开始吗？', () => {
/* 联机：清掉上一局的局内状态，方便直接再来一局（连接保持） */
if (typeof Net !== 'undefined' && Net.active) {
Net.guestRoster = null; Net.waitingPick = false; Net.guestQueue = []; Net.hostBattleStarted = false;
Net.send({ t:'panel', mode:'none' });
}
/* 只有点「确定」才执行。界面切换全部交给 resetGame() ——
   此前这里有几行 display 赋值漏在回调之外，导致一点按钮就立刻隐藏战斗界面（还没确认）。 */
stopSkillCutin();
gameState.phase = 'ended';   // 先判负结束，避免残留的异步回合继续结算
if (gameState.rafId) { cancelAnimationFrame(gameState.rafId); gameState.rafId = null; }
resetGame();
});
};
}
function initSelection() {
renderHeroGrid('player'); renderHeroGrid('enemy'); setupSearch(); setupTutorialButton();
document.getElementById('start-battle-btn').addEventListener('click', startBattle);
initDetailOverlay(); initModeSelect(); initNetPanel();
}
function initModeSelect() {
const modeScreen = document.getElementById('mode-select-screen');
const confirmBtn = document.getElementById('mode-confirm-btn');
const cards = modeScreen.querySelectorAll('.mode-card');
cards.forEach(card => {
card.addEventListener('click', () => {
cards.forEach(c => c.classList.remove('selected'));
card.classList.add('selected');
gameMode = card.dataset.mode;
confirmBtn.disabled = false;
});
});
confirmBtn.addEventListener('click', () => {
if (!gameMode) return;
/* 联机对战：先连上服务器，再进选人界面 */
if (gameMode === 'online') { openNetPanel(); return; }
/* 探索模式：打开 pve.js 的探索界面（神魂副本 / 演武场），不直接进选人 */
if (gameMode === 'explore') {
if (window.PVE && window.PVE.openExplore) window.PVE.openExplore();
return;
}
modeScreen.style.display = 'none';
document.getElementById('selection-screen').style.display = 'block';
// 更新模式徽章
const badge = document.getElementById('selection-mode-badge');
if (gameMode === 'pvp') {
badge.textContent = '👥 双人对战模式';
badge.className = 'pvp';
} else {
badge.textContent = '🪵 演武场';
badge.className = 'pve';
}
// 双人对战模式下隐藏敌方选人区（双方各自选人）
/* 「BP模式」入口仅双人对战下有意义（人机没有第二玩家） */
document.getElementById('bp-mode-btn').style.display = (gameMode === 'pvp') ? 'block' : 'none';
if (gameMode === 'pvp') {
document.getElementById('enemy-selection-section').style.display = 'none';
enemySelection = ['主角']; // 双人模式下敌方阵容由第二玩家选择，先初始化含主角
} else {
document.getElementById('enemy-selection-section').style.display = 'block';
enemySelection = ['主角'];
}
checkStartButton();
renderHeroGrid('player');
renderHeroGrid('enemy');
});
}
/* ==================== 联机面板控制 ====================
   房间码只有 6 位、一次一用，不存 localStorage —— 每次开局都是新码，
   也省去"上次残留的旧码连到了别人的房间"这种困惑。 */
function openNetPanel() {
const ov = document.getElementById('net-overlay');
document.getElementById('net-room').value = '';
document.getElementById('net-roomcode').classList.remove('show');
/* 恢复上次选的中继方式（默认 Cloudflare），并把三个按钮的高亮同步好 */
const savedCustom = localStorage.getItem('net_server');
if (savedCustom !== null) document.getElementById('net-server').value = savedCustom;
setRelayMode(localStorage.getItem('net_relay_mode') || 'cf');
document.getElementById('net-status').textContent = '房主点「创建房间」，对手输入房间码后点「加入房间」';
/* ★ 复位按钮：上一次若在连接途中被「返回」打断，btn.disabled 会一直是 true，
   面板关掉再打开也不会自动恢复 —— 表现就是「点了没反应」。
   这里对整个面板做一次解锁，把输入框 / 中继按钮 / 勾选框一并兜住。 */
setNetPanelBusy(false);
['net-create', 'net-join'].forEach((id) => { const b = document.getElementById(id); if (b) b.disabled = false; });
/* 回退开关：关掉后自建中继不通就是不通，不再自动改走公共（用于强测自建） */
const fb = document.getElementById('net-fallback');
if (fb) { fb.checked = sessionStorage.getItem('net_fallback') !== '0'; fb.onchange = () => sessionStorage.setItem('net_fallback', fb.checked ? '1' : '0'); }
ov.classList.add('show');
}
function closeNetPanel() { document.getElementById('net-overlay').classList.remove('show'); }
/* 生成 6 位房间码：去掉 0/O/1/I 这类容易念错记混的字符 */
/* 8 位房间码：数据走公共 broker，主题名本质上是公开的，
   码越长越不容易被陌生人误入（相当于 32^8 ≈ 1e12 种组合）。 */
function genRoomCode() {
const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
let out = '';
for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
return out;
}
/* 房主创建成功 → 把房间码大字展示出来，方便念给对手或复制到聊天窗口 */
function showRoomCode(code) {
const box = document.getElementById('net-roomcode');
const val = document.getElementById('net-roomcode-val');
if (!box || !val) return;
val.textContent = code;
box.classList.add('show');
}
async function netConnect(role) {
/* 防重入：连接期间再点不再发起第二条连接（旧行为会让两条连接互相覆盖状态） */
if (Net._dialing) { Net.setStatus('⏳ 正在连接中…如需中止请点「返回」'); return; }
let room = document.getElementById('net-room').value.trim().toUpperCase();
if (role === 'host' && !room) { room = genRoomCode(); document.getElementById('net-room').value = room; }
if (!room) { Net.setStatus('❌ 请输入房主给你的房间码'); return; }
const btn = document.getElementById(role === 'host' ? 'net-create' : 'net-join');
if (btn) btn.disabled = true;
/* 连接期间把面板上除「返回」外的控件全部锁住。
   ★ 为什么：连接中要改房间码、改服务器、切中继方式都毫无意义 ——
     改了也不会生效（本次连接用的是发起那一刻读到的值），
     反而让人以为"我改了服务器所以它变快了"，排查时被误导。
     只留「返回」可点，中止后统一解锁。 */
setNetPanelBusy(true);
/* 中继地址由上面的三选一决定，自定义时才读输入框 */
const mode = getRelayMode();
const server = (mode === 'custom') ? document.getElementById('net-server').value.trim()
: (mode === 'mqtt' ? '' : DEFAULT_RELAY);
if (mode === 'custom') {
localStorage.setItem('net_server', server);
if (!server) { if (btn) btn.disabled = false; setNetPanelBusy(false); Net.setStatus('❌ 请填写自定义中继地址，或改用 Cloudflare / MQTT公网'); return; }
}
Net._dialing = true;
/* ★ try/finally 是关键：Net.connect 失败时是【抛异常】而不是返回 false
   （连接超时 / 握手失败都会 reject）。旧代码没有兜底，
   异常一抛出，下面这行 btn.disabled = false 永远执行不到 ——
   按钮就此永久变灰，之后再点创建 / 加入都是「点了没反应」。 */
let ok = false;
try {
ok = await Net.connect({ room, role, broker: server });
} catch (e) {
ok = false;
Net.setStatus('❌ 连接异常：' + ((e && e.message) ? e.message : e));
} finally {
Net._dialing = false;
if (btn) btn.disabled = false;
setNetPanelBusy(false);
}
if (!ok) return;
if (role === 'host') showRoomCode(Net.room);   // 留在面板上展示房间码，等对手加入
else { closeNetPanel(); enterOnlineSelection(role); }
}
/* 面板忙/闲切换：连接期间锁住除「返回」外的所有控件。
   返回按钮 id 写死在 NET_PANEL_KEEP 里，其余一律置灰。 */
const NET_PANEL_LOCK = ['net-room', 'net-server', 'relay-cf', 'relay-mqtt', 'relay-custom', 'net-fallback', 'net-create', 'net-join', 'net-roomcode-copy'];
function setNetPanelBusy(busy) {
NET_PANEL_LOCK.forEach((id) => {
const el = document.getElementById(id);
if (!el) return;
el.disabled = !!busy;
/* 按钮加一层透明度做视觉反馈：disabled 的按钮点了没反应，
   不加提示会让人以为是 bug（"点了没响应"）。 */
if (el.tagName === 'BUTTON') el.style.opacity = busy ? '0.45' : '';
});
}
/* 连接成功 → 进选人界面：房主留玩家1阶段，客机直接切到玩家2选人 */
function enterOnlineSelection(role) {
gameMode = 'pvp';                       // 复用双人对战的选人/战斗流程
document.getElementById('mode-select-screen').style.display = 'none';
document.getElementById('selection-screen').style.display = 'block';
const badge = document.getElementById('selection-mode-badge');
badge.textContent = role === 'host' ? '🌐 联机（房主 · 我方）' : '🌐 联机（客机 · 玩家2）';
badge.className = 'pvp';
/* 联机下 BP 改为「申请制」：任一方申请、另一方同意后双方进入 BP 界面 */
const bpBtn = document.getElementById('bp-mode-btn');
bpBtn.style.display = 'block';
bpBtn.textContent = '申请BP';
playerSelection = ['主角']; enemySelection = ['主角'];
if (role === 'host') {
document.getElementById('enemy-selection-section').style.display = 'none';
renderHeroGrid('player');
checkStartButton();
} else {
switchToPlayer2Selection();
}
/* 进选人就把自己的神魂加成快照发给对端：覆盖全部角色，
   之后无论普通选人还是 BP 换人，对端手里的数据都是齐的。 */
netSendSouls();
}
/* ---------- 中继服务器：三选一 ----------
   cf     → 自建 Cloudflare Worker（不丢包，默认）
   mqtt   → 公共 MQTT broker（留空地址即走这条）
   custom → 自己填地址（选它才展开输入框） */
function getRelayMode() {
const v = localStorage.getItem('net_relay_mode');
return (v === 'mqtt' || v === 'custom') ? v : 'cf';   // 默认/异常值一律回落到 cf
}
function setRelayMode(mode) {
mode = (mode === 'mqtt' || mode === 'custom') ? mode : 'cf';
localStorage.setItem('net_relay_mode', mode);
const map = { cf:'relay-cf', mqtt:'relay-mqtt', custom:'relay-custom' };
Object.keys(map).forEach((k) => {
const b = document.getElementById(map[k]);
if (b) b.classList.toggle('active', k === mode);
});
const inp = document.getElementById('net-server');
if (inp) inp.classList.toggle('show', mode === 'custom');
}
function initNetPanel() {
/* 三个中继按钮：点「自定义」才展开地址输入框 */
document.getElementById('relay-cf').onclick = () => setRelayMode('cf');
document.getElementById('relay-mqtt').onclick = () => setRelayMode('mqtt');
document.getElementById('relay-custom').onclick = () => setRelayMode('custom');
document.getElementById('net-create').onclick = () => netConnect('host');
document.getElementById('net-join').onclick = () => netConnect('guest');
/* 取消：若已经建好房间（在等对手），要把 Peer 销毁掉，
   否则房间码会一直被这个页面占着，对手之后就再也连不进来了。 */
document.getElementById('net-cancel').onclick = () => {
/* 无论是否已连上、无论房主还是客机，都真正中止后台连接并复位按钮。
   旧逻辑只在「已连上且是房主」时才断开 —— 客机等待中的 25s 探测、
   以及任何还在握手的连接都会继续在后台跑。 */
Net.abort();
/* 中止后统一解锁：连接期间被锁住的控件全部恢复（含输入框与中继按钮） */
setNetPanelBusy(false);
['net-create', 'net-join'].forEach((id) => { const b = document.getElementById(id); if (b) b.disabled = false; });
document.getElementById('net-roomcode').classList.remove('show');
closeNetPanel();
};
document.getElementById('net-overlay').addEventListener('click', (e) => { if (e.target.id === 'net-overlay') closeNetPanel(); });
/* 复制房间码：优先用剪贴板 API，失败（http 环境 / 权限）时退回选中文本提示手抄 */
document.getElementById('net-roomcode-copy').onclick = async () => {
const code = document.getElementById('net-roomcode-val').textContent || '';
const btn = document.getElementById('net-roomcode-copy');
const done = (t) => { btn.textContent = t; setTimeout(() => { btn.textContent = '复制'; }, 1500); };
try { await navigator.clipboard.writeText(code); done('已复制 ✓'); }
catch (e) { done('请手动抄'); }
};
}
function getHeroList() { return Object.keys(HERO_DATA); }
/* ==================== BP 模式 ====================
   两种模式，进入时选择：

   ①【征召 BP】轮流禁用与选择，英雄【独占】—— 一方已选的英雄另一方不可再选。
      流程（10 步）：
        P1禁1 → P2禁1 → P1选1 → P2选2 → P1选2 → P1禁1 → P2禁1 → P2选2 → P1选2 → P2选1
   ②【同轮 BP】每方先各禁 1 人；之后 5 轮选人，每轮双方各选 1 人，
      【本轮双方都选完后才统一亮出】；英雄【不独占】，双方可以选用相同英雄。
      公平性说明：因为是同轮的，双方各自操作时都看不到对方本轮选了什么，
      所以「先让一方选、再让另一方选」不会泄露信息。

   两种模式都是双方各选 5 人 + 必选主角 = 6 人（主角自动锁定，不参与 BP）。 */
const BP_PICK_TARGET = 5;                     // 每方需选人数（+主角 = 6）
/* 征召 BP 步骤表 */
const BP_STEPS_DRAFT = [
{ side:'p1', action:'ban',  count:1 },
{ side:'p2', action:'ban',  count:1 },
{ side:'p1', action:'pick', count:1 },
{ side:'p2', action:'pick', count:2 },
{ side:'p1', action:'pick', count:2 },
{ side:'p1', action:'ban',  count:1 },
{ side:'p2', action:'ban',  count:1 },
{ side:'p2', action:'pick', count:2 },
{ side:'p1', action:'pick', count:2 },
{ side:'p2', action:'pick', count:1 },
];
/* 同轮 BP 步骤表：禁用轮（round 0）+ 5 轮选人
   ★ 禁用同样是【同轮】的：双方各禁 1 人，都禁完后才统一亮出。
     否则 P2 在自己禁用时就能看到 P1 禁了谁 —— 与选人一样存在信息泄露。
   每轮（含禁用轮）两步走完即 flush，round 用于判断是否跨轮。 */
const BP_MIRROR_BAN_ROUND = 0;
const BP_STEPS_MIRROR = [
{ side:'p1', action:'ban',  count:1, round: BP_MIRROR_BAN_ROUND },
{ side:'p2', action:'ban',  count:1, round: BP_MIRROR_BAN_ROUND },
...Array.from({ length: BP_PICK_TARGET }, (_, i) => ([
{ side:'p1', action:'pick', count:1, round: i + 1 },
{ side:'p2', action:'pick', count:1, round: i + 1 },
])).flat(),
];
const BP_MODE_META = {
draft:  { name:'征召 BP', steps: BP_STEPS_DRAFT  },
mirror: { name:'同轮 BP', steps: BP_STEPS_MIRROR },
};
/* bans：公开禁用池（双方合并，用于「已禁用的英雄不可再选」与展示）
   bansBy：分方记录 —— 双方允许禁用【同一个】英雄，因此不能只看合并池判断"是否已禁过"。 */
/*   hidden / hiddenBan：同轮模式下本轮尚未亮出的暗选 / 暗禁 —— 对方看不到。 */
/* netLocal：本端在联机 BP 中的身份 —— null=单机 / 'host'=房主(操控p1) / 'guest'=客机(操控p2)
   房主是唯一权威：跑全部 BP 逻辑并把「客机可见视图」广播过去；
   客机不跑逻辑，只渲染收到的视图，操作以指令回传房主执行。 */
let bpState = { active:false, mode:'draft', step:0, progress:0, p1:[], p2:[], bans:[], bansBy:{ p1:[], p2:[] },
hidden:{ p1:null, p2:null }, hiddenBan:{ p1:null, p2:null }, reveal:null, pending:null, netLocal:null };
let bpPendingReq = null;        // 已发出、等待对方答复的 BP 申请
function resetBp(mode) {
bpState = { active:false, mode: mode || 'draft', step:0, progress:0, p1:[], p2:[], bans:[], bansBy:{ p1:[], p2:[] },
hidden:{ p1:null, p2:null }, hiddenBan:{ p1:null, p2:null }, reveal:null, pending:null, netLocal: bpState.netLocal || null };
}
/* 本端在 BP 中操控哪一方：房主 = p1，客机 = p2 */
function bpMySide() { return bpState.netLocal === 'guest' ? 'p2' : 'p1'; }
/* 联机 BP 中，本端此刻是否可以操作（只有轮到自己那一方时才行） */
function bpCanOperate() {
const step = bpCurrentStep();
if (!step) return false;
if (!bpState.netLocal) return true;                 // 单机：永远可操作
return step.side === bpMySide();
}
/* 当前模式的步骤表 / 当前步（全部走完则返回 null） */
function bpSteps() { return (BP_MODE_META[bpState.mode] || BP_MODE_META.draft).steps; }
function bpCurrentStep() { const L = bpSteps(); return bpState.step < L.length ? L[bpState.step] : null; }
function bpSideName(side) { return side === 'p1' ? '玩家1' : '玩家2'; }
/* 同轮 BP：本轮是否已有人暗选（用于槽位显示「已锁定」） */
function bpIsMirror() { return bpState.mode === 'mirror'; }
/* 打开模式选择弹层 */
function openBpTypeMenu() {
document.getElementById('bp-type-overlay').classList.add('show');
}
function closeBpTypeMenu() {
document.getElementById('bp-type-overlay').classList.remove('show');
}
function openBpScreen(mode) {
resetBp(mode || 'draft'); bpState.active = true;
/* 联机身份：进入时按 Net.role 固定下来（房主=p1，客机=p2） */
if (typeof Net !== 'undefined' && Net.active) bpState.netLocal = Net.role;
else bpState.netLocal = null;
document.getElementById('bp-type-overlay').classList.remove('show');
document.getElementById('selection-screen').style.display = 'none';
document.getElementById('bp-screen').style.display = 'block';
document.getElementById('bp-search').value = '';
/* 联机：返回按钮会破坏双方的同步状态，直接隐藏；
   「开始游戏」只有房主能点（客机点了也没用，阵容由房主统一下发）。 */
const isGuest = bpState.netLocal === 'guest';
document.getElementById('bp-back-btn').style.display = bpState.netLocal ? 'none' : 'block';
renderBp();
if (isGuest) { const sb = document.getElementById('bp-start-btn'); sb.disabled = true; sb.textContent = '等待房主开始…'; }
}
function closeBpScreen() {
bpState.active = false;
document.getElementById('bp-type-overlay').classList.remove('show');
document.getElementById('bp-screen').style.display = 'none';
document.getElementById('selection-screen').style.display = 'block';
}
/* 某英雄当前归属：'ban' | 'p1' | 'p2' | null
   同轮模式下双方可能同时持有同一英雄 —— 判定时改用 bpOwnedBy()，这里只用于标记显示。 */
function bpHeroState(name) {
if (bpState.bans.includes(name)) return 'ban';
if (bpState.p1.includes(name)) return 'p1';
if (bpState.p2.includes(name)) return 'p2';
return null;
}
/* 该英雄当前这一步是否【可选】
     · 禁用的永远不可选
     · 征召 BP（独占）：任一方已选 → 不可选
     · 同轮 BP（不独占）：只有【当前操作方自己】已选的不可重复选，对方已选的照样可选 */
function bpIsPickable(name, step) {
if (!step) return false;
/* 禁用阶段：双方可以禁【同一个】英雄 —— 只排除当前操作方自己已禁过的。
   （禁用反映的是"自己不想看到谁"，两人都禁同一个完全合理。） */
if (step.action === 'ban') {
if (bpState.bans.includes(name) && !bpIsMirror()) return false;   // 征召：已进公开禁用池
/* 同轮：禁用池里【已亮出】的不能再禁；对方本轮暗禁的允许重复禁（禁同一个完全合理），
   只看自己方：已禁过的 + 本轮已暗禁的 排除。 */
if (bpState.bansBy[step.side].includes(name)) return false;
if (bpIsMirror() && bpState.hiddenBan[step.side] === name) return false;
if (bpIsMirror()) return !bpState.bans.includes(name);
return true;
}
/* 选人阶段：已进禁用池的英雄任何人都不能选 */
if (bpState.bans.includes(name)) return false;
const own = step.side === 'p1' ? bpState.p1 : bpState.p2;
if (own.includes(name)) return false;
if (bpState.hidden[step.side] === name) return false;
if (bpIsMirror()) return true;                  // 同轮：只看自己方
return !bpState.p1.includes(name) && !bpState.p2.includes(name);   // 征召：独占
}
/* 同轮 BP：一轮走完 → 把双方本轮的暗选同时亮出 */
function bpFlushRound(round) {
const h = bpState.hidden;
/* 禁用轮：把双方本轮的暗禁同时亮出（允许双方禁了同一个英雄） */
const hb = bpState.hiddenBan;
if (hb.p1 || hb.p2) {
if (hb.p1) { if (!bpState.bans.includes(hb.p1)) bpState.bans.push(hb.p1); bpState.bansBy.p1.push(hb.p1); }
if (hb.p2) { if (!bpState.bans.includes(hb.p2)) bpState.bans.push(hb.p2); bpState.bansBy.p2.push(hb.p2); }
bpState.reveal = { round: round, ban:{ p1: hb.p1, p2: hb.p2 } };
bpState.hiddenBan = { p1:null, p2:null };
return;
}
if (h.p1) bpState.p1.push(h.p1);
if (h.p2) bpState.p2.push(h.p2);
bpState.reveal = { round: round || 0, p1: h.p1, p2: h.p2 };
bpState.hidden = { p1:null, p2:null };
}
function renderBp() {
const step = bpCurrentStep();
/* 模式标签 */
const tag = document.getElementById('bp-mode-tag');
const meta = BP_MODE_META[bpState.mode] || BP_MODE_META.draft;
const meTag = bpState.netLocal ? ` · 你是${bpSideName(bpMySide())}` : '';
tag.textContent = `${meta.name}${bpIsMirror() ? '（本轮选完统一亮出，英雄不独占）' : '（英雄独占）'}${meTag}`;
/* 顶部双方头像槽：主角固定占位 + 5 个待选位
   同轮 BP：本轮已暗选的位置显示「已锁定」（不露名字，避免对方看到） */
const renderSlots = (sideKey, list) => {
const box = document.getElementById(`bp-${sideKey}-slots`);
box.innerHTML = '';
const add = (text, cls, tip) => {
const d = document.createElement('div');
d.className = `bp-slot ${cls}`; d.textContent = text; if (tip) d.title = tip;
box.appendChild(d);
};
add('主角', 'filled protagonist', '主角（自动锁定）');
for (let i = 0; i < BP_PICK_TARGET; i++) {
if (list[i]) { add(list[i], 'filled', list[i]); continue; }
/* 暗选占位：只在这一方本轮已操作时显示，且不明示是谁。
   ★ 联机：只显示【自己方】的 —— 房主端若把客机的暗选也渲染出来，
     就等于房主能提前看到对手本轮选了谁，同轮机制形同虚设。 */
const showLocked = bpState.netLocal ? (sideKey === bpMySide()) : true;
if (bpIsMirror() && showLocked && bpState.hidden[sideKey] && i === list.length) {
add('🔒', 'locked', `${bpSideName(sideKey)}本轮已锁定（本轮结束后亮出）`); continue;
}
add('', '', '待选');
}
};
renderSlots('p1', bpState.p1);
renderSlots('p2', bpState.p2);
/* 阶段提示 */
const st = document.getElementById('bp-stage-text');
const sub = document.getElementById('bp-stage-sub');
if (step) {
const isBan = step.action === 'ban';
st.className = isBan ? 'ban' : step.side;
st.textContent = `${bpSideName(step.side)} ${isBan ? '禁用' : '选择'} ${step.count} 人`;
const remain = step.count - bpState.progress;
let subText = `本阶段还需 ${remain} 个（第 ${bpState.step + 1}/${bpSteps().length} 步）`;
/* 同轮 BP 的选人阶段：提示本轮结束才亮出 */
if (bpIsMirror()) subText += isBan ? ' · 双方都禁完后统一亮出' : ` · 第 ${step.round} 轮，本轮双方选完后统一亮出`;
if (bpState.netLocal && !bpCanOperate()) subText += ' · 等待对手操作…';
sub.textContent = subText;
} else {
st.className = 'done'; st.textContent = 'BP 完成';
sub.textContent = '双方阵容已确定，可开始游戏';
}
/* 流程进度条 */
const flow = document.getElementById('bp-flow');
flow.innerHTML = '';
bpSteps().forEach((sp, i) => {
const d = document.createElement('span');
const cls = i < bpState.step ? 'done' : (i === bpState.step ? 'active' : '');
d.className = `bp-flow-step ${cls}`;
d.textContent = `${bpSideName(sp.side)}${sp.action === 'ban' ? '禁' : '选'}${sp.count}`;
flow.appendChild(d);
});
/* 上一轮亮出结果（同轮 BP） */
const rev = document.getElementById('bp-reveal');
if (bpIsMirror() && bpState.reveal) {
const rv = bpState.reveal;
if (rv.ban) rev.innerHTML = `禁用亮出：<b class="p1">🟢 ${rv.ban.p1 || '—'}</b> ／ <b class="p2">🔵 ${rv.ban.p2 || '—'}</b>`;
else rev.innerHTML = `第 ${rv.round} 轮亮出：<b class="p1">🟢 ${rv.p1 || '—'}</b> ／ <b class="p2">🔵 ${rv.p2 || '—'}</b>`;
} else rev.innerHTML = '';
/* 禁用池 */
const banBox = document.getElementById('bp-ban-slots');
banBox.innerHTML = '';
/* 按方分别渲染并标注归属：同一个英雄可能被双方同时禁用，合并去重会丢信息。 */
['p1','p2'].forEach(sd => {
bpState.bansBy[sd].forEach(n => {
const d = document.createElement('div');
d.className = `bp-ban-slot ${sd}`; d.textContent = n; d.title = `${bpSideName(sd)} 禁用`;
banBox.appendChild(d);
});
});
if (bpState.bans.length === 0) {
const locked = bpState.hiddenBan[bpMySide()] ? 1 : 0;
banBox.innerHTML = locked > 0
? `<span style="font-size:12px;color:#ffd700">本轮已锁定 ${locked} 个（双方禁完后统一亮出）</span>`
: '<span style="font-size:12px;color:#616161">暂无</span>';
}
/* 英雄网格 */
const grid = document.getElementById('bp-hero-grid');
const search = document.getElementById('bp-search').value.toLowerCase();
grid.innerHTML = '';
getHeroList().forEach(name => {
if (name === '主角') return;             // 主角自动锁定，不参与 BP
if (search && !name.toLowerCase().includes(search)) return;
const data = HERO_DATA[name];
const stt = bpHeroState(name);
/* 联机：只有轮到【自己这一方】时卡片才可点；对方回合点了也没用（房主会拒绝） */
const pickable = !!step && !!bpCanOperate() && bpIsPickable(name, step);
const card = document.createElement('div');
let cls = 'hero-card';
if (stt === 'ban') cls += ' bp-banned';
else if (bpState.p1.includes(name) || bpState.p2.includes(name)) {
cls += ' bp-picked';
/* 同轮 BP：对方已选的仍可选 —— 解除 bp-picked 的禁用（同队不可重复选由 bpIsPickable 管） */
if (pickable) cls += ' pickable-again';
}
/* 待确认高亮：同样只给「当前操作方」看。
   联机下房主端在客机回合也持有 pending（客机的待确认由房主统一记录），
   若照常高亮，房主就能提前看到玩家2 选了谁 —— 同轮 BP 的暗选更是直接泄密。 */
if (bpState.pending === name && bpCanOperate()) cls += ' bp-pending';
card.className = cls;
/* 角标：同轮模式下双方可能同时选中同一英雄，两个角标都要显示 */
let mark = '';
/* 自己本轮暗禁的英雄：给自己一个橙色「已禁」角标（未亮出，对方看不到） */
if (bpIsMirror() && step && step.action === 'ban' && bpState.hiddenBan[bpMySide()] === name) {
mark += '<span class="bp-own-ban">已禁</span>';
}
const isP1 = bpState.p1.includes(name), isP2 = bpState.p2.includes(name);
if (isP1) mark += '<span class="bp-pick-mark p1">P1</span>';
if (isP2) mark += `<span class="bp-pick-mark p2${isP1 ? ' dual' : ''}">P2</span>`;
card.innerHTML = `<div class="hero-avatar" style="background:linear-gradient(135deg,${data.color}66,${data.color}33);border-color:${data.color}88;">${heroAvatarInner(name)}</div><div class="hero-name">${name}</div><div class="hero-tags"><span class="tag tag-${data.tag==='攻击'?'atk':data.tag==='防御'?'def':data.tag==='辅助'?'sup':'spd'}">${data.tag}</span></div><button class="detail-btn" type="button">查看详情</button>${mark}`;
card.querySelector('.detail-btn').addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); showHeroDetail(name); });
card.querySelector('.detail-btn').addEventListener('touchstart', (e) => { e.stopPropagation(); }, { passive: true });
/* 点卡片只是「选中待确认」，不立即生效 —— 需再点确认按钮 */
if (pickable) card.addEventListener('click', () => bpSelectPending(name));
grid.appendChild(card);
});
/* 确认条：仅在「有待确认英雄」且「轮到本端操作」时显示。
   ★ 联机修复：房主是唯一权威，客机点卡片后由房主把选择记进 bpState.pending
     再广播回去。这个 pending 属于【玩家2】，房主端若照常渲染确认条，
     玩家1 就能看到并点到玩家2 的「确认 / 取消」—— 等于替对手做决定。
     bpCanOperate() 判定 step.side 是否等于本端所控方：
       房主 p1 回合 → true（自己的确认条，正常显示）
       客机 p2 回合 → false（房主隐藏；客机那边收到广播后为 true，正常显示）
     单机（netLocal 为空）恒为 true，行为不变。 */
const bar = document.getElementById('bp-confirm-bar');
const cbtn = document.getElementById('bp-confirm-btn');
const ccbtn = document.getElementById('bp-confirm-cancel');
const ctext = document.getElementById('bp-confirm-text');
const canConfirm = !!bpState.pending && !!step && bpCanOperate();
if (canConfirm) {
bar.classList.add('show');
bar.classList.toggle('banning', step.action === 'ban');
ctext.textContent = `${step.action === 'ban' ? '禁用' : '选择'}「${bpState.pending}」？`;
cbtn.disabled = false;
if (ccbtn) ccbtn.disabled = false;
cbtn.textContent = step.action === 'ban' ? '确认禁用' : '确认选择';
} else {
bar.classList.remove('show');
bar.classList.remove('banning');
cbtn.disabled = true;
/* 取消按钮也一并禁用：整条虽已 display:none，仍防住程序化触发 / 样式异常 */
if (ccbtn) ccbtn.disabled = true;
}
/* 开始按钮：联机下只有房主能点（客机点了也没用 —— 阵容由房主统一下发） */
const btn = document.getElementById('bp-start-btn');
const isGuest = bpState.netLocal === 'guest';
btn.disabled = isGuest || !!step;
btn.textContent = step ? 'BP 进行中…' : (isGuest ? '等待房主开始…' : '点击开始游戏');
}
/* 第一步：点卡片 → 进入待确认（高亮 + 显示确认条）
   联机客机：不本地落定，先把选择发给房主校验，等房主广播回来的视图再渲染 ——
   本地抢先落定会出现「客机看到的高亮与房主实际状态不一致」。 */
function bpSelectPending(name) {
const step = bpCurrentStep();
if (!step || !bpCanOperate() || !bpIsPickable(name, step)) return;
if (bpState.netLocal === 'guest') { Net.send({ t:'bpSel', name }); return; }
bpState.pending = name;
renderBp();
if (bpState.netLocal === 'host') bpBroadcastView();
}
/* 第二步：确认 / 取消 —— 客机同样回传房主执行。
   ★ 防御性兜底：联机下不是自己回合时一律不响应。
     renderBp 已把确认条隐藏 + 按钮 disabled，这里再堵一层，
     防止程序化调用 / 残留事件让房主代按了玩家2 的确认或取消。
   注意：房主收到网络指令 bpConfirm / bpCancel 时走的是 bpConfirmPending() 直调
     （见消息分发处），不经过本函数 —— 客机的合法确认不受影响。 */
function bpConfirmOrCancel(confirmed) {
if (bpState.netLocal && !bpCanOperate()) return;
if (bpState.netLocal === 'guest') { Net.send({ t: confirmed ? 'bpConfirm' : 'bpCancel' }); return; }
if (confirmed) bpConfirmPending(); else bpCancelPending();
}
/* 房主：把「客机可见视图」广播过去。
   同轮模式的暗选 / 暗禁必须过滤 —— 否则客机能看到房主本轮选了谁，同步机制就白做了。 */
function bpBroadcastView() {
if (typeof Net === 'undefined' || !Net.active || Net.role !== 'host') return;
const step = bpCurrentStep();
Net.send({ t:'bpView', view:{
mode: bpState.mode, step: bpState.step, progress: bpState.progress,
p1: bpState.p1.slice(), p2: bpState.p2.slice(),
bans: bpState.bans.slice(), bansBy:{ p1:bpState.bansBy.p1.slice(), p2:bpState.bansBy.p2.slice() },
/* 只给客机看他【自己】的暗选 / 暗禁；房主的置空 */
hidden: { p1:null, p2: bpState.hidden.p2 },
hiddenBan: { p1:null, p2: bpState.hiddenBan.p2 },
reveal: bpState.reveal,
/* pending 只在轮到客机时下发（房主自己的待确认不该出现在客机屏上） */
pending: (step && step.side === 'p2') ? bpState.pending : null,
} });
}
/* 联机：申请进入 BP（或单机直接进）。
   任一方都可发起；对方用页面内确认弹窗答复，同意后双方一起进入 BP 界面。 */
function bpRequestOrEnter(mode) {
const online = (typeof Net !== 'undefined' && Net.active);
if (!online) { openBpScreen(mode); return; }
bpPendingReq = mode;
closeBpTypeMenu();
Net.send({ t:'bpReq', mode });
Net.setStatus('⏳ 已发出 BP 申请，等待对手同意…');
}
/* 收到对方的 BP 申请 → 弹确认 */
function bpOnRequest(mode) {
const meta = (BP_MODE_META[mode] || BP_MODE_META.draft);
const tip = mode === 'mirror' ? '（每轮双方各选1人，本轮选完统一亮出，英雄不独占）' : '（轮流禁用与选择，英雄独占）';
showConfirmDialog(`对手申请进行【${meta.name}】${tip}，是否同意？`, () => {
Net.send({ t:'bpAck', mode });
/* 同意方自己也立刻进入 —— 房主侧在收到 ack 时进，这里由发起方统一广播更省事 */
openBpScreen(mode);
if (Net.role === 'host') { Net.send({ t:'bpEnter', mode }); bpBroadcastView(); }
});
}
/* 收到同意 → 发起方进入，并让对方也进入（房主广播 bpEnter） */
function bpOnAck(mode) {
bpPendingReq = null;
openBpScreen(mode);
if (Net.role === 'host') { Net.send({ t:'bpEnter', mode }); bpBroadcastView(); }
else Net.setStatus('✅ 对手已同意，进入 BP');
}
function bpOnEnter(mode) {
bpPendingReq = null;
/* 同意方在答复时就已经进过 BP 界面了（见 bpOnRequest），
   这里再开一次会把刚建立的状态重置掉 —— 已在界面中就跳过。 */
if (bpState.active && bpState.mode === mode) return;
openBpScreen(mode);
}
/* 客机：用房主下发的视图覆盖本地状态并重绘 */
function bpApplyView(v) {
if (!v) return;
Object.assign(bpState, {
mode:v.mode, step:v.step, progress:v.progress,
p1:v.p1 || [], p2:v.p2 || [], bans:v.bans || [],
bansBy:{ p1:(v.bansBy && v.bansBy.p1) || [], p2:(v.bansBy && v.bansBy.p2) || [] },
hidden:{ p1:null, p2:(v.hidden && v.hidden.p2) || null },
hiddenBan:{ p1:null, p2:(v.hiddenBan && v.hiddenBan.p2) || null },
reveal:v.reveal || null, pending:v.pending || null,
});
renderBp();
}
/* 第二步：点「确认」→ 真正写入；点「取消」→ 清空待确认 */
function bpConfirmPending() {
const step = bpCurrentStep();
const name = bpState.pending;
if (!step || !name || !bpIsPickable(name, step)) { bpState.pending = null; renderBp(); return; }
if (step.action === 'ban') {
if (bpIsMirror()) bpState.hiddenBan[step.side] = name;   // 同轮：暗禁，双方都禁完才亮出
else { bpState.bans.push(name); bpState.bansBy[step.side].push(name); }
} else if (bpIsMirror()) {
bpState.hidden[step.side] = name;              // 同轮：先暗选，本轮结束才亮出
} else if (step.side === 'p1') bpState.p1.push(name);
else bpState.p2.push(name);
bpState.pending = null;
bpState.progress++;
/* 一轮是否结束：下一步已跨轮（或已无下一步）→ 统一亮出本轮双方所选 */
if (bpState.progress >= step.count) {
const nextIdx = bpState.step + 1;
if (bpIsMirror() && step.round !== undefined && (nextIdx >= bpSteps().length || bpSteps()[nextIdx].round !== step.round)) {
bpFlushRound(step.round);
}
bpState.step = nextIdx; bpState.progress = 0;
}
renderBp();
bpBroadcastView();
}
function bpCancelPending() { bpState.pending = null; renderBp(); bpBroadcastView(); }
function bpHeroClick(name) {
const step = bpCurrentStep();
if (!step || !bpIsPickable(name, step)) return;
if (step.action === 'ban') { if (bpIsMirror()) bpState.hiddenBan[step.side] = name; else { bpState.bans.push(name); bpState.bansBy[step.side].push(name); } }
else if (bpIsMirror()) bpState.hidden[step.side] = name;
else if (step.side === 'p1') bpState.p1.push(name);
else bpState.p2.push(name);
bpState.progress++;
if (bpState.progress >= step.count) { bpState.step++; bpState.progress = 0; }
renderBp();
}
/* BP 完成 → 写入双方阵容并开局（双人对战） */
function startBpBattle() {
if (bpCurrentStep()) return;            // 未走完流程不允许开始
/* 兜底：万一还有未亮出的暗选（理论上轮结束已 flush），开局前补上 */
if (bpIsMirror() && (bpState.hidden.p1 || bpState.hidden.p2 || bpState.hiddenBan.p1 || bpState.hiddenBan.p2)) bpFlushRound(BP_PICK_TARGET);
if (bpState.p1.length !== BP_PICK_TARGET || bpState.p2.length !== BP_PICK_TARGET) return;
playerSelection = ['主角', ...bpState.p1];
enemySelection  = ['主角', ...bpState.p2];
gameMode = 'pvp';
/* 联机：把 BP 结果下发给客机（客机操控 p2 = enemySelection），
   客机收到后只更新阵容，等房主的 startBattle → sendInit 进入战斗。 */
if (typeof Net !== 'undefined' && Net.active && Net.role === 'host') {
Net.send({ t:'bpDone', p1: bpState.p1.slice(), p2: bpState.p2.slice() });
}
bpState.active = false;
document.getElementById('bp-screen').style.display = 'none';
startBattle();
}
function initDetailOverlay() {
const overlay = document.getElementById('hero-detail-overlay');
document.getElementById('hero-detail-close').addEventListener('click', (e) => { e.stopPropagation(); overlay.classList.remove('show'); });
overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('show'); });
}
/* ---- 教程入口：进入选人界面时绑定一次（onclick 赋值，避免重复叠加监听）---- */
function setupTutorialButton() {
document.getElementById('tutorial-btn').onclick = () => openTutorial();
document.getElementById('tutorial-close').onclick = () => closeTutorial();
document.getElementById('tut-prev').onclick = () => { if (tutorialStep > 0) { tutorialStep--; renderTutorial(); } };
document.getElementById('tut-next').onclick = () => gotoNextTutorialStep();
const tOverlay = document.getElementById('tutorial-overlay');
tOverlay.addEventListener('click', (e) => { if (e.target === tOverlay) closeTutorial(); });
}
/* 技能区块渲染：技能1 / 技能2 / 额外技能共用。
   castDesc = 【施放】部分，用于「同一个技能既有被动效果又有主动施放效果」的情况
   （如鬼金羊「宿影暗渡」：被动攒宿影阵 + 施放减怒气）。 */
const SKILL_TYPE_LABEL = { aoe:'群体攻击', single:'单体攻击', buff:'增益', single_then_aoe:'单体+群体',
banish:'控制', damageLog:'记录恢复', skip:'跳过回合', summon:'召唤' };
function skillBlockHtml(skill, desc, castDesc, label) {
if (!skill) return '';
const cost = Number(skill.cost) || 0;
/* 额外技能标题与其他技能同为蓝色（继承 .detail-section h3 的 #4fc3f7），不再单独用紫色 */
const head = label ? `<h3>${label} · ${skill.name}（消耗 ${cost} 怒气）</h3>` : `<h3>额外技能 · ${skill.name}</h3>`;
const typeLine = `<div class="skill-type">类型：${SKILL_TYPE_LABEL[skill.type] || skill.type}</div>`;
const castLine = castDesc ? `<div class="skill-desc" style="margin-top:6px"><span style="color:#ffd700">【施放】</span>${castDesc}</div>` : '';
return `<div class="detail-section">${head}<div class="skill-block">${typeLine}<div class="skill-desc">${desc || ''}</div>${castLine}</div></div>`;
}
/* 数字格式化：整数不带小数位；一位小数够就只留一位，否则两位。
   1.8 → "1.8"，0.15 → "0.15"，1100 → "1100"。 */
function fmtStatNum(v) {
const r = Math.round(Number(v || 0) * 100) / 100;
if (r % 1 === 0) return String(r);
return (Math.round(r * 100) % 10 === 0) ? r.toFixed(1) : r.toFixed(2);
}
/* 属性 + 神魂加成：加成部分以金色「+xxx」后缀显示，未装神魂时只显示基础值。
   pct=true 表示该项是百分比类（暴击率 / 效果命中 / 效果抵抗），
   此时 base 为小数（0.24）、add 为百分点（15），统一按整数百分点显示。 */
function statWithSoulBonus(base, add, pct) {
const b = pct ? Math.round(Number(base || 0) * 100) : Number(base || 0);
const out = fmtStatNum(b) + (pct ? '%' : '');
const a = Number(add || 0);
if (!a) return out;                       // 无加成 → 不显示后缀
const sign = a > 0 ? '+' : '';            // 负数自带减号
return out + `<span class="stat-soul">${sign}${fmtStatNum(a)}${pct ? '%' : ''}</span>`;
}
/* 读取角色当前神魂加成快照。神魂系统未加载时返回全 0，不影响详情页展示。 */
function getHeroSoulBonus(name) {
const d = HERO_DATA[name]; if (!d) return null;
if (typeof SHENHUN === 'undefined' || !SHENHUN.getSoulBonus) return null;
return SHENHUN.getSoulBonus(name, {
atk: d.atk, def: d.def, hp: d.hp, spd: d.spd,
critRate: d.critRate || 0, critDmg: d.critDmg || 0,
effectHit: d.effectHit || 0, effectResist: d.effectResist || 0, maxHp: d.hp
});
}
/* 角色详情：基础信息 / 神魂 两个标签。
   ★ 每次从选人卡片点开都默认停在「基础信息」；在神魂页里装备 / 卸下后
     只重绘详情（保留当前标签），基础信息里的金色加成也会跟着刷新。 */
let heroDetailState = { name: null, tab: 'base' };
function showHeroDetail(name, keepTab) {
  if (!keepTab || heroDetailState.name !== name) heroDetailState = { name: name, tab: 'base' };
  renderHeroDetail();
}
function renderHeroDetail() {
const name = heroDetailState.name;
if (!name || !HERO_DATA[name]) return;
const d = HERO_DATA[name]; const overlay = document.getElementById('hero-detail-overlay');
const tagClass = d.tag==='攻击'?'tag-atk':d.tag==='防御'?'tag-def':d.tag==='辅助'?'tag-sup':'tag-spd';
/* 神魂加成：装了的项在数值后追加金色 +xxx；一项没装则全为 0，视觉上与原来一致。 */
const shb = getHeroSoulBonus(name) || {};
let mechanicsHtml = '';
if (d.mechanics && d.mechanics.length > 0) {
mechanicsHtml = `<div class="detail-section"><h3>相关机制</h3>` +
d.mechanics.map(m => { const cls = m.type==='state'?'m-state':m.type==='mark'?'m-mark':m.type==='note'?'m-note':'m-rule'; return `<div class="mechanic-item"><span class="m-name ${cls}">${m.name}</span>：${m.desc}</div>`; }).join('') + `</div>`;
}
// note：不属于「状态(蓝)/印记(紫)/规则(橙)」三类的独立说明，单独成块展示
let noteHtml = '';
if (d.note) {
noteHtml = `<div class="detail-section"><h3>机制说明</h3>` +
`<div class="mechanic-item"><span class="m-name m-note">独立机制</span>：${d.note}</div></div>`;
}
const baseHtml = `
<div class="detail-header">
<div class="detail-avatar" style="background:linear-gradient(135deg,${d.color}99,${d.color}44);border-color:${d.color}88;">${heroAvatarInner(name)}</div>
<div><div class="detail-name">${name}</div><span class="detail-tag ${tagClass}">${d.tag}</span></div>
</div>
<div class="detail-section"><h3>基础属性${Object.keys(shb.shenhunSets || {}).length ? '<span class="detail-soul-tip">（金色为神魂加成）</span>' : ''}</h3>
<div class="detail-stats">
<div><div class="stat-label">攻击</div><div class="stat-val">${statWithSoulBonus(d.atk, shb.atk, false)}</div></div>
<div><div class="stat-label">防御</div><div class="stat-val">${statWithSoulBonus(d.def, shb.def, false)}</div></div>
<div><div class="stat-label">生命</div><div class="stat-val">${statWithSoulBonus(d.hp, shb.hp, false)}</div></div>
<div><div class="stat-label">速度</div><div class="stat-val">${statWithSoulBonus(d.spd, shb.spd, false)}</div></div>
<div><div class="stat-label">暴击率</div><div class="stat-val">${statWithSoulBonus(d.critRate, shb.critRate, true)}</div></div>
<div><div class="stat-label">暴击伤害</div><div class="stat-val">${statWithSoulBonus(d.critDmg, shb.critDmg, false)}</div></div>
<div><div class="stat-label">效果命中</div><div class="stat-val">${statWithSoulBonus(d.effectHit || 0, shb.effectHit, true)}</div></div>
<div><div class="stat-label">效果抵抗</div><div class="stat-val">${statWithSoulBonus(d.effectResist || 0, shb.effectResist, true)}</div></div>
</div></div>
<div class="detail-section"><h3>普攻 · ${d.normal.name}</h3>
<div class="skill-block"><div class="skill-type">类型：单体${d.normal.type==='single'&&d.normal.healRate?'治疗':'攻击'}</div><div class="skill-desc">${d.descNormal}</div></div></div>
${/* 被动与技能1同名时（如鬼金羊「宿影暗渡」），被动不再单列一节，
     而是并入技能1描述，主动部分以【施放】标注 —— 避免同一机制看两遍 */ ''}
${d.passive && !(d.skill && d.passive.name === d.skill.name) ? `<div class="detail-section"><h3>被动 · ${d.passive.name}</h3>
<div class="skill-block"><div class="skill-type">类型：被动${d.opening?'（含先机）':''}</div><div class="skill-desc">${d.passive.desc}</div></div></div>` : ''}
${skillBlockHtml(d.skill,
(d.skill && d.passive && d.passive.name === d.skill.name) ? (d.passive.desc + (d.castDesc ? `<div style="margin-top:6px"><span style="color:#ffd700">【施放】</span>${d.castDesc}</div>` : '')) : d.descSkill,
null, '技能')}
${d.skill2 ? skillBlockHtml(d.skill2, d.descSkill2, d.skill2.castDesc, '技能2') : ''}
${d.extraSkills ? Object.values(d.extraSkills).map((sk, i) => skillBlockHtml(sk, Object.values(d.extraSkills).length === 1 ? (d.descExtra || '') : '', null, '')).join('') : ''}
${mechanicsHtml}
${noteHtml}`;
const content = document.getElementById('hero-detail-content');
const tab = heroDetailState.tab === 'soul' ? 'soul' : 'base';
content.innerHTML = `
<div class="hero-detail-tabs">
<button type="button" class="hero-detail-tab ${tab === 'base' ? 'active' : ''}" data-tab="base">基础信息</button>
<button type="button" class="hero-detail-tab ${tab === 'soul' ? 'active' : ''}" data-tab="soul">神魂</button>
</div>
<div class="hero-detail-pane ${tab === 'base' ? 'active' : ''}" id="hero-detail-pane-base">${baseHtml}</div>
<div class="hero-detail-pane ${tab === 'soul' ? 'active' : ''}" id="hero-detail-pane-soul"></div>`;
content.querySelectorAll('.hero-detail-tab').forEach(btn => {
  btn.onclick = () => {
    heroDetailState.tab = btn.getAttribute('data-tab') === 'soul' ? 'soul' : 'base';
    renderHeroDetail();
  };
});
if (tab === 'soul') {
  const soulPane = content.querySelector('#hero-detail-pane-soul');
  if (window.SHENHUN_UI && typeof window.SHENHUN_UI.renderHeroSoulConfig === 'function') {
    /* 装备 / 卸下 / 详情操作后重绘本页，基础信息标签的金色加成同步刷新 */
    window.SHENHUN_UI.renderHeroSoulConfig(name, soulPane, function () { renderHeroDetail(); });
  } else {
    soulPane.innerHTML = '<div class="detail-section">神魂模块未加载</div>';
  }
}
overlay.classList.add('show');
}
function renderHeroGrid(side) {
const grid = document.getElementById(side + '-hero-grid');
const search = document.getElementById(side + '-search').value.toLowerCase();
const selection = side === 'player' ? playerSelection : enemySelection;
grid.innerHTML = '';
getHeroList().forEach(name => {
if (search && !name.toLowerCase().includes(search)) return;
const data = HERO_DATA[name]; const isSelected = selection.includes(name); const isProtagonist = name === '主角';
const isDisabled = !isProtagonist && ((side === 'player' && playerSelection.length >= 6 && !isSelected) || (side === 'enemy' && enemySelection.length >= 6 && !isSelected));
const card = document.createElement('div');
card.className = `hero-card ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`;
// 选人卡片只显示「定位」标签：「被动」标签已整体取消（被动本身仍生效，详情卡内可见）
card.innerHTML = `<div class="hero-avatar" style="background:linear-gradient(135deg,${data.color}66,${data.color}33);border-color:${data.color}88;">${heroAvatarInner(name)}</div><div class="hero-name">${isProtagonist?'★ ':''}${name}</div><div class="hero-tags"><span class="tag tag-${data.tag==='攻击'?'atk':data.tag==='防御'?'def':data.tag==='辅助'?'sup':'spd'}">${data.tag}</span></div><button class="detail-btn" type="button">查看详情</button>`;
const detailBtn = card.querySelector('.detail-btn');
detailBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); showHeroDetail(name); });
detailBtn.addEventListener('touchstart', (e) => { e.stopPropagation(); }, { passive: true });
if (!isDisabled) card.addEventListener('click', () => toggleSelection(side, name));
grid.appendChild(card);
});
updateSelectionStatus(side);
}
function toggleSelection(side, name) {
/* 神魂副本阵容锁定：开启后无需手动选人，也不允许误点改动已锁定阵容。 */
if (window.PVE && typeof window.PVE.blockPlayerSelection === 'function' && window.PVE.blockPlayerSelection(side)) return;
const selection = side === 'player' ? playerSelection : enemySelection;
if (name === '主角') return;
const idx = selection.indexOf(name);
if (idx >= 0) selection.splice(idx, 1); else if (selection.length < 6) selection.push(name);
/* try/finally：即便渲染环节出任何意外，开始按钮也必须刷新。
   否则一旦渲染中断，就会出现「已选满却永远无法开始」的死角。 */
try { renderHeroGrid(side); } finally { checkStartButton(); }
}
/* 选人区标题统一渲染。
   ⚠️ 必须用 innerHTML：标题里内嵌 <span id="xx-count"> 计数元素，
   若误用 textContent，整段会被当成纯文本，计数元素从 DOM 中消失，
   之后 updateSelectionStatus 取不到元素就会抛错，进而中断 renderHeroGrid，
   表现为「标题计数不动、能选满6人却开始不了」。 */
function sectionTitleVariant(side) {
if (side === 'enemy' && gameMode === 'pvp') {
const ps = document.getElementById('player-selection-section');
if (ps && ps.style.display === 'none') return 'player2';   // PVP 第二玩家阶段
}
return 'default';
}
function renderSectionTitle(side, variant) {
const section = document.getElementById(side + '-selection-section');
const h2 = section && section.querySelector('h2');
if (!h2) return;
const v = variant || sectionTitleVariant(side);
const label = v === 'player2' ? '🔵 玩家2阵容' : (side === 'player' ? '🟢 我方阵容' : '🔴 敌方阵容');
h2.innerHTML = `${label} (<span id="${side}-count">1</span>/6 - 主角已锁定)`;
}
function updateSelectionStatus(side) {
const selection = side === 'player' ? playerSelection : enemySelection;
/* 兜底：计数元素缺失时（任何历史/未来的标题重写路径都可能踩这个坑）自动重建标题，
   而不是直接抛错中断渲染。 */
if (!document.getElementById(side + '-count') || !document.getElementById(side + '-status')) renderSectionTitle(side);
const cnt = document.getElementById(side + '-count');
const stt = document.getElementById(side + '-status');
if (cnt) cnt.textContent = selection.length;
if (stt) stt.textContent = selection.join(', ');
}
function setupSearch() { document.getElementById('player-search').addEventListener('input', () => renderHeroGrid('player')); document.getElementById('enemy-search').addEventListener('input', () => renderHeroGrid('enemy')); }
/* 联机（房主侧）开始按钮的统一刷新。
   ★ 关键点：对手连上 / 对手提交阵容，都【不等于】可以开局 ——
     房主自己还没选满 6 人时按钮必须保持禁用。此前在这两处直接 enable，
     于是房主刚进选人界面（1/6）就看到亮起的「开始战斗（对手已就绪）」，
     点下去会因为 enemySelection 不足而静默失败。 */
function netRefreshStartButton() {
const btn = document.getElementById('start-battle-btn');
if (!btn) return;
const mineDone = playerSelection.length === 6;
const foeDone = !!(Net.guestRoster && Net.guestRoster.length === 6);
/* 对手已退出 → 别让房主一直干等"等待对手选人"，直接说清楚该怎么办 */
if (Net.peerGone) { btn.disabled = true; btn.textContent = '⚠️ 对手已退出 — 请重新开始或退出联机'; return; }
btn.disabled = !(mineDone && foeDone);
if (!mineDone) btn.textContent = `我方已选 ${playerSelection.length}/6 - 继续选择`;
else if (!foeDone) btn.textContent = '我方已就绪 — 等待对手选人…';
else btn.textContent = '开始战斗！';
}
function checkStartButton() {
/* 联机：房主侧走专属刷新（要同时看自己与对手的进度），客机侧沿用原逻辑 */
if (typeof Net !== 'undefined' && Net.active && Net.role === 'host') { netRefreshStartButton(); return; }
const btn = document.getElementById('start-battle-btn');
/* 神魂副本：敌方阵容固定，只判断我方是否选满 6 人（必选主角） */
if (window.PVE && typeof window.PVE.isDungeon === 'function' && window.PVE.isDungeon()) {
window.PVE.refreshStartButton(btn); return;
}
if (gameMode === 'pvp') {
const isPlayer1Done = playerSelection.length === 6;
const isPlayer2Done = enemySelection.length === 6;
// 判断当前处于哪个选人阶段：通过玩家1选人区是否可见来区分
const playerSectionVisible = document.getElementById('player-selection-section').style.display !== 'none';
if (playerSectionVisible) {
// 玩家1选人阶段
btn.disabled = !isPlayer1Done;
btn.textContent = isPlayer1Done ? '玩家1已就绪 → 玩家2选人' : `玩家1 已选 ${playerSelection.length}/6 - 继续选择`;
} else {
// 玩家2选人阶段
btn.disabled = !isPlayer2Done;
btn.textContent = isPlayer2Done ? '开始战斗！' : `玩家2 已选 ${enemySelection.length}/6 - 继续选择`;
}
} else {
// 人机对战：双方都需要选满
btn.disabled = !(playerSelection.length === 6 && enemySelection.length === 6);
btn.textContent = (playerSelection.length === 6 && enemySelection.length === 6) ? '开始战斗！' : '请选满双方阵容';
}
}
function switchToPlayer2Selection() {
// 隐藏我方选人区，显示敌方选人区供第二玩家选人
const playerSection = document.getElementById('player-selection-section');
playerSection.style.display = 'none';
document.getElementById('enemy-selection-section').style.display = 'block';
// 更新模式徽章提示
const badge = document.getElementById('selection-mode-badge');
badge.textContent = '👥 玩家2 选人阶段';
badge.className = 'pvp';
// 玩家2也必须选6人，且必选主角
enemySelection = ['主角'];
renderHeroGrid('enemy');
checkStartButton();
// 更新标题
const h1 = document.querySelector('#selection-screen h1');
h1.textContent = '👤 玩家2 选择阵容（必选主角，共6人）';
// 更新敌方选人区标题为玩家2专属样式
renderSectionTitle('enemy', 'player2');
}
async function startBattle() {
stopSkillCutin();          // 开局前清掉可能残留的演出遮罩
resetHeishanEffect();      // 每场战斗重新计算「第一次黑闪」（首播视频）
closeConfirmDialog(false); // 清掉可能残留的确认弹窗
/* ---- 联机：客机提交阵容并等待；房主确认双方就绪后才真正开局 ---- */
if (typeof Net !== 'undefined' && Net.active) {
if (Net.role === 'guest') {
if (enemySelection.length < 6) { Net.setStatus('⚠️ 请先选满 6 人（必选主角）'); return; }
netSendSouls();          // 兜底：开战前再补发一次自己的神魂
Net.send({ t:'roster', names: enemySelection.slice() });
Net.setStatus('✅ 阵容已提交，等待房主开始…');
const gb = document.getElementById('start-battle-btn');
if (gb) { gb.disabled = true; gb.textContent = '等待房主开始…'; }
return;
}
if (Net.guestRoster && Net.guestRoster.length === 6) enemySelection = Net.guestRoster.slice();
if (enemySelection.length < 6) { Net.setStatus('⏳ 等待对手选人…'); return; }
/* 房主：把自己的神魂发给对端（客机要据此还原房主阵容），
   并索取客机的 —— 正常情况下客机进选人时已发过，这里立刻返回；
   万一没收到（如中途改过装备、消息丢失），最多等一会儿再开局。 */
netSendSouls();
await netAwaitPeerSouls(1200);
}
if (gameMode === 'pvp' && enemySelection.length < 6) {
// 双人对战：第一玩家选完后，轮到第二玩家选人
// 判断条件：玩家1已选满但玩家2还没选满（enemySelection刚好6人时才算完成）
const playerSectionVisible = document.getElementById('player-selection-section').style.display !== 'none';
if (playerSectionVisible) {
// 当前是玩家1阶段，点击按钮说明玩家1已就绪，切换到玩家2选人
switchToPlayer2Selection();
return;
}
// 当前是玩家2阶段但人数不足，不进入战斗
return;
}
document.getElementById('selection-screen').style.display = 'none';
document.getElementById('hero-detail-overlay').classList.remove('show');
const bs = document.getElementById('battle-screen'); bs.style.display = 'flex'; gameState.phase = 'fighting';
gameState.units = []; gameState.playerTeam = []; gameState.enemyTeam = [];
gameState.summonIdx = { player:null, enemy:null };   // 新对局不继承上一局的稻草人（每方各一个槽）
/* 神魂副本：敌方用副本固定阵容（怪物不在 HERO_DATA、玩家不可选），不读选人界面的敌方区 */
const foeRoster = (window.PVE && typeof window.PVE.isDungeon === 'function' && window.PVE.isDungeon())
? window.PVE.getEnemyRoster() : enemySelection;
playerSelection.forEach((name, i) => { const u = createUnit(name, 'player', i); gameState.units.push(u); gameState.playerTeam.push(gameState.units.length - 1); });
foeRoster.forEach((name, i) => { const u = createUnit(name, 'enemy', i); gameState.units.push(u); gameState.enemyTeam.push(gameState.units.length - 1); });
/* 行动条总长度 = 开局（先机之前）速度最高者的速度值 × ACTION_BAR_LENGTH_FACTOR。
   必须在先机之前算：先机可能改变速度，若在其后计算就不是「开局速度」了。 */
gameState.actionBarMax = Math.max(1, Math.max(...gameState.units.map(getEffectiveSpd)) * ACTION_BAR_LENGTH_FACTOR);
renderUnits(); renderActionBarDots();
document.getElementById('battle-log').innerHTML = '';
if (gameMode === 'pvp') { log('⚔️ 双人对战开始！玩家1 vs 玩家2', 'log-skill'); }
else { log('⚔️ 战斗开始！', 'log-skill'); }
/* 神魂副本：登场提示放在日志清空之后，否则会被 renderUnits 后的 innerHTML='' 抹掉 */
if (window.PVE && typeof window.PVE.isDungeon === 'function' && window.PVE.isDungeon()) {
const di = window.PVE.currentDungeonInfo && window.PVE.currentDungeonInfo();
if (di) log('🗡️ 神魂副本 · ' + di.name + '：' + foeRoster.length + ' 名敌方魔物登场！', 'log-skill');
}
/* 神魂副本自动挑战：在战斗循环启动前把 player 侧切为自动，并写入开局日志。 */
if (window.PVE && typeof window.PVE.onBattleStart === 'function') window.PVE.onBattleStart();
/* 联机：把双方阵容与行动条上限同步给客机（客机据此建本地只读单位并渲染） */
if (typeof Net !== 'undefined' && Net.active && Net.role === 'host') { Net.sendInit(); Net.setStatus('✅ 对局进行中（你是房主 · 我方）'); }
/* 开局站位：必须在「先机」之前结算。
   站位只由初始速度面板决定，不受先机影响 —— 否则先机一旦涉及速度修正，
   开局站位就随先机漂移，变得不可预测。 */
initActionBarPositions();
// 先机：按 HERO_DATA[name].passive.opening 统一结算（鬼吞 / 流光追月神等）
applyOpeningEffects();
await flushPendingCasts();   // 先机中「施放技能」的（如浪客归刃）在此演出
renderActionBarDots();
gameState.lastTimestamp = performance.now(); gameState.rafId = requestAnimationFrame(gameLoop);
// 用 onclick 赋值而非 addEventListener：startBattle 每次开局都会执行，
// 用 addEventListener 会重复叠加监听器，导致点一次按钮触发多次行动。
document.getElementById('btn-normal').onclick = () => onActionBtn('normal');
document.getElementById('btn-skill').onclick = () => onActionBtn('skill');
document.getElementById('btn-skill2').onclick = () => onActionBtn('skill2');
document.getElementById('btn-auto').onclick = toggleAuto;
updateAutoBtn();   // 每局重开后按当前 auto 状态刷新（自动挑战开启时为 ON）
// 用 onclick 赋值：与 btn-normal / btn-skill 一致，避免每次开局重复叠加监听器
document.getElementById('speed-btn').onclick = toggleSpeed;
document.getElementById('btn-cancel').onclick = cancelTargetSelection;
// 进入战斗才显示这两个按钮（联机下双方都显示 —— 见 setupRestartButton）
document.getElementById('speed-btn').style.display = 'block';
setupRestartButton();
}
/* ==================================================================
   统一工具层（“度量衡”）
   所有跨模块的通用计算都必须走这里，禁止在业务代码里直接改属性。
   约定：怒气 → gainRage/loseRage/spendRage
        速度 → getEffectiveSpd
        行动条 → advanceActionValue/pushActionValue/setActionValue
        治疗 → performHeal/performHealSkill；恢复 → performRestore/performRestoreAll
        目标 → getAliveAllies/getAliveEnemies/findLowestHpTarget
        印记 → hasMark/getMark/addMark/addState
        刷新 → refreshUnit(对象) / refreshUnitView(索引)
        参数顺序 → 一律 (施法者, 技能/伤害包, 目标)，如 calculateDamage(attacker, skill, target)
   ================================================================== */
const RAGE_CAP = 10;         // 怒气上限
const DEFAULT_SKILL_COST = 4;// 主动技默认消耗（新建技能未写 cost 时用它；实际扣费一律读 skill.cost）
function skillCost(skill) { return skill && skill.cost !== undefined ? Number(skill.cost) : DEFAULT_SKILL_COST; }
const RAGE_PER_NORMAL = 2;   // 普攻回复
const ACTION_MAX = 100;      // 行动条上限（百分比）—— 到达即视为「可行动」
const ACTION_OVERFLOW_CAP = 200; // 行动条硬上限：允许超过 100 以记录「溢出值」，但不能无限累积
/* 单帧最大推进时长（毫秒）：行动条按「真实经过时间」推进，若某帧卡顿
   （开局渲染 + 图片加载、切后台回来、手机掉帧），dt 会突然变得很大，
   导致全体行动条一帧内直接冲到 100% —— 于是最快者（镰鼬）先手开技能时，
   队友已全部满条，+30% 拉条完全无效（只有第一轮这样，之后每人行动后都会归零，故后续正常）。
   钳制后：卡顿最多损失一点点进度，不会再出现开局全员满条。 */
const MAX_FRAME_DT = 100;    // 单帧最多按 100ms 推进（约 6 帧 @60fps）
/* 行动条总长度 = 全场最高（有效）速度 × ACTION_BAR_LENGTH_FACTOR
   1 倍：最快的角色开局即站在 100%（终点），会立刻先手。 */
const ACTION_BAR_LENGTH_FACTOR = 1;
/* 推进节奏系数：百分比/秒 = 有效速度 ÷ 行动条总长度 × 100 × ACTION_BAR_SPEED
   总长度由 2 倍改成 1 倍会让推进速度翻倍，这里同步减半（1.5 → 0.75）以保持原有节奏：
   全场最快者跑完一圈仍是约 1.33 秒，只是速度差在行动条上的体现被放大了一倍。
   想让整体节奏变快/变慢，只改这一个数。 */
const ACTION_BAR_SPEED = 0.75;
const VAYNE_KILL_BONUS = 60; // 维迦击杀后保留的行动条比例
const VAYNE_KILL_RAGE = 4;   // 维迦击杀获得的怒气
const VAYNE_KILL_HEAL_RATE = 0.3;  // 维迦击杀后恢复自身最大生命值的比例
const FORESEE_SHARE_RATE = 0.8;   // 雪拉比「预知未来」：记录伤害的均摊比例
const FORESEE_MAXHP_RATE = 0.09;  // 雪拉比「预知未来」：额外恢复量 = 自身最大生命值 × 9%
const KAMUI_TRUE_RATE = 0.12;     // 神威：每层追加的施加者真实伤害率
const KAMUI_ACTION_BONUS = 12;    // 神威：触发时施加者获得的行动条（与层数无关）
const FLOWING_LIGHT_DURATION = 999; // 流光不再自然到期：由「绮罗舞」回合开始结算 或 怒气减少时移除
const BANISH_AOE_TRUE_RATE = 0.36;// 神威·虚化：放逐结束后对敌方全体的真实伤害率

/* ===== 治疗 与 恢复：两套独立机制 =====
   【治疗】走公式④，受「治疗加成、治疗减免、暴击倍率」影响 —— 施法者的攻击力参与计算。
     公式④：攻击 × 技能治疗率 × 目标治疗加成 × (1-目标治疗减免) [× 暴击伤害率]
     适用：雪拉比普攻「治愈」、纲手技能「百豪之术」
     入口：performHeal(healer, skill, target) / performHealSkill(...)
     标记：statsHealDone
   【恢复】独立的固定数值机制 —— 不走公式，不受治疗加成/减免/暴击影响，与攻击力无关。
     适用：雪拉比技能「预知未来」的伤害均摊、雪拉比最大生命值百分比恢复
     入口：performRestore(target, amount, source)
     标记：statsRestoreDone
   判断口诀：数值写死/由别的量换算出来的 → 恢复；写成"XX%生命"按攻击算的 → 治疗
   ====================================== */

/* ===== 伤害类型定义（五种，彼此独立）=====
   ① 直接伤害（默认，未特殊说明的伤害均属此类）
      走完整公式：攻击 × 伤害率 × (1-免伤率) × 最终伤害率 × (1-最终免伤率) [× 暴击伤害率]
      由 calculateDamage() 产生，result.isTrue=false、isSplash=false
   ② 溅射伤害
      由「主目标实际受到的直接伤害 × 溅射系数」派生，对每个溅射目标数值相同。
      不再走伤害公式：不计算免伤率、最终免伤率，也不做独立暴击判定。
      例：主目标实际受 1000 直接伤害、溅射 40% → 其余每个敌人各受 400。
      由 performSingleAttack() 产生，result.isSplash=true
   ③ 真实伤害
      攻击 × 伤害率 × 最终伤害率 [× 暴击伤害率]，无视防御与最终免伤。
      由 calculateDamage() 产生，result.isTrue=true
   ④ 固定伤害
      由条件算出的确定数值，不走公式、无视护盾、无法被转移。见 applyFixedDamage()。
   ⑤ 传导伤害
      由「另一次伤害的实际数值」等量派生，不参与伤害公式计算、直接造成伤害、无视护盾。
      见 applyConductionDamage()。钉崎野蔷薇「共鸣」与「稻草人」使用。
   ======================================== */
const DMG_TYPE = { DIRECT:'direct', SPLASH:'splash', TRUE:'true', FIXED:'fixed', CONDUCTION:'conduction' };
function getDmgType(result) {
if (!result) return DMG_TYPE.DIRECT;
if (result.isConduction) return DMG_TYPE.CONDUCTION;
if (result.isFixed) return DMG_TYPE.FIXED;
if (result.isTrue) return DMG_TYPE.TRUE;
if (result.isSplash) return DMG_TYPE.SPLASH;
return DMG_TYPE.DIRECT;
}

function clamp(v, min, max) { const n = Number(v); if (!isFinite(n)) return min; return Math.min(max, Math.max(min, n)); }
// 比率类数值统一夹到 [0,1]，防止叠加超 100% 后把伤害/治疗算成负数（反而变成回血）
function clamp01(v) { return clamp(v, 0, 1); }

/* ---- 索引与刷新 ---- */
function idxOf(unit) { return unit ? gameState.units.indexOf(unit) : -1; }
function refreshUnit(unit) { const i = idxOf(unit); if (i >= 0) refreshUnitView(i); }

/* ---- 目标筛选：唯一入口，统一排除 已死亡 + 被放逐 ---- */
function isTargetable(unit) { return !!unit && unit.alive && !unit.banished; }
function getAliveAllies(unit, includeSelf = true) {
if (!unit) return [];
/* 召唤物不参与「友方支援」类目标（治疗、增益、代伤、先机给怒气）：
   它只在敌方场上作为一个【可被攻击】的对象存在。攻击侧仍由 getAliveEnemies 收录。 */
return gameState.units.filter(u => isTargetable(u) && !isSummonUnit(u) && u.side === unit.side && (includeSelf || u !== unit));
}
function getAliveEnemies(unit) {
if (!unit) return [];
return gameState.units.filter(u => isTargetable(u) && u.side !== unit.side);
}
function getTargets(actor, targetType) { return targetType === 'ally' ? getAliveAllies(actor) : getAliveEnemies(actor); }
function isValidTarget(target, targetType, actor) {
if (!isTargetable(target) || !actor) return false;
return targetType === 'enemy' ? target.side !== actor.side : target.side === actor.side;
}
/* 「血量最低 / 攻击最高」一律按当前绝对血量 / 绝对攻击判定，不用 hp/maxHp 比例 ——
   否则全员满血时所有人比值都是 1.0，排序恒等于第一个单位，血最厚的人也会被当成"血量最低"。
   并列时的稳定次序：绝对血量 → 最大生命值 → 站位，保证结果可复现。 */
function findLowestHpAmong(list) {
if (!list || list.length === 0) return null;
return list.slice().sort((a, b) => (a.hp - b.hp) || (a.maxHp - b.maxHp) || (a.pos - b.pos))[0];
}
/* 当前绝对血量最高：并列时按最大生命 → 站位，保证结果可复现。 */
function findHighestHpAmong(list) {
if (!list || list.length === 0) return null;
return list.slice().sort((a, b) => (b.hp - a.hp) || (b.maxHp - a.maxHp) || (a.pos - b.pos))[0];
}
function findHighestAtkAmong(list) {
if (!list || list.length === 0) return null;
return list.slice().sort((a, b) => (b.atk - a.atk) || (a.pos - b.pos))[0];
}
function findLowestHpTarget(targetType, actor) {
return findLowestHpAmong(getTargets(actor, targetType));
}
/* 自动战斗中「技能锁定敌方当前绝对血量最高的角色」的例外表。
   仅表中【角色 + 指定技能】生效；普攻与其余角色一律仍取最低血。
   召唤物不算「角色」，不参与比较（稻草人本身也不能作为连接目标）。
   手动选目标不受影响。以后加同类角色只改这张表。 */
const AUTO_SKILL_HIGH_HP = {
'捷克罗姆': ['交错闪电'],
'钉崎野蔷薇': ['刍灵咒法·共鸣'],
};
function autoTargetFor(unit, targetType, skill) {
const names = unit && AUTO_SKILL_HIGH_HP[unit.name];
if (names && skill && names.includes(skill.name) && targetType === 'enemy') {
const roles = getAliveEnemies(unit).filter(u => !isSummonUnit(u));
return findHighestHpAmong(roles) || findLowestHpTarget('enemy', unit);
}
return findLowestHpTarget(targetType, unit);
}

/* ---- 怒气 ---- */
function gainRage(unit, amount) {
if (!unit || amount <= 0) return 0;
const before = Number(unit.rage) || 0;
unit.rage = Math.min(before + amount, RAGE_CAP);
return unit.rage - before;
}
function loseRage(unit, amount) {
if (!unit || amount <= 0) return 0;
const before = Number(unit.rage) || 0;
unit.rage = Math.max(0, before - amount);
const lost = before - unit.rage;
if (lost > 0) { onRageLost(unit); onEnemyRageLost(unit, lost); }   // 被减怒气：流光 + 鬼金羊均触发
return lost;
}
/* 鬼金羊被动「宿影暗渡」的统一钩子：
   敌方每累计减少 2 点怒气（含技能消耗），自身获得 1 层宿影阵。
   累计值记在鬼金羊自己的 suyingCounter 上，满 2 进 1 层、余数保留。 */
function onEnemyRageLost(unit, amount) {
if (!unit || !amount) return;
(gameState.units || []).forEach(g => {
/* 「宿影暗渡」的【被动效果】部分（攒宿影阵）：不需要角色本体施放，
   因此不受【无法行动】约束（被眩晕仍会攒层）；
   但【放逐】规定「取消效果buff的变化」，故被放逐期间宿影阵层数不变。
   它的【主动施放】部分走 executeAction / triggerSkill，才受 cannotAct 约束。 */
if (g.name !== '鬼金羊' || !isPassiveEffective(g)) return;
if (g.side === unit.side) return;          // 只统计「敌方」减少的怒气
g.suyingCounter = (Number(g.suyingCounter) || 0) + amount;
while (g.suyingCounter >= SUYINGZHEN_RAGE_PER_STACK) {
g.suyingCounter -= SUYINGZHEN_RAGE_PER_STACK;
addSuyingZhen(g);
}
});
}
/* 获得 1 层宿影阵；达到上限则移除全部层数并结算效果 */
function addSuyingZhen(g) {
/* 层数若被驱散 / 移除等方式清掉，等待中的那次施放也就不复存在 —— 同步解除闸门，
   避免标记残留导致之后永远无法再次自动施放。 */
if (g.suyingPendingFire && !getMark(g, '宿影阵')) g.suyingPendingFire = false;
const m = addMark(g, '宿影阵', { stacks:1, maxStacks:SUYINGZHEN_MAX_STACKS, duration:999, effect:'suYingZhen', ignoreBanish:true });   // 技能内被动效果：不受无法行动约束
if (!m) return;
log(`${getSideLabel(g)}${g.name} 获得1层宿影阵！（当前${m.stacks}层）`, 'log-buff');
refreshUnit(g);
if ((m.stacks || 1) >= SUYINGZHEN_MAX_STACKS) {
/* ★ 同一轮满层只结算一次：层数要等施放成功后才移除（onSuccess），
   这期间层数恒为上限，任何一次新的攒层都会重新走到这里。
   少了这道闸门，等待施放 / 施放期间的每次回喂都会再排一次队 → 连放。 */
if (g.suyingPendingFire) return;
g.suyingPendingFire = true;
/* ★ 顺序：先【施放】「宿影暗渡」，成功后再移除所有层数。
   若此刻鬼金羊无法行动（放逐 / 眩晕），施放排入队列等待，
   层数保持 5 不变；一旦无法行动消失，最近的下一个安全点立刻补放并清层。 */
log(`宿影阵达到上限！${getSideLabel(g)}${g.name} 施放「宿影暗渡」！`, 'log-skill');
/* 排队施放（见 queueSkillCast）：此处位于 loseRage 的同步调用链里，无法 await。
   只靠上面的 suyingPendingFire 挡住连放：本技能自己造成的减怒会回喂被动（正常涨层），
   不能靠屏蔽回喂来修，否则就抹掉了「鬼金羊的技能也会给自己涨层」这条机制。 */
queueSkillCast(g, g.activeSkill, null, {
dedupeKey: `宿影暗渡:${idxOf(g)}`,
onSuccess: () => { g.suyingPendingFire = false; removeMark(g, '宿影阵'); refreshUnit(g); log(`${getSideLabel(g)}${g.name} 的宿影阵层数已移除！`, 'log-buff'); }
});
}
}
// 从数组中随机取 n 个（不重复）
function pickRandom(list, n) {
if (!list || list.length === 0 || n <= 0) return [];
return list.slice().sort(() => Math.random() - 0.5).slice(0, Math.min(n, list.length));
}
/* 怒气被减少时的钩子（技能消耗不算）。
   流光：携带者怒气减少时，恢复 1 点怒气，然后移除此印记。 */
function onRageLost(unit) {
if (!unit || !unit.alive) return;
if (hasMark(unit, '流光')) {
const gained = gainRage(unit, 1);
removeMark(unit, '流光');
log(`${getSideLabel(unit)}${unit.name} 的流光生效！恢复${gained}点怒气并移除流光。`, 'log-buff');
refreshUnit(unit);
}
}
// 返回是否扣费成功（怒气不足则不扣）
function spendRage(unit, amount) {
if (!unit || (Number(unit.rage) || 0) < amount) return false;
unit.rage -= amount;
onEnemyRageLost(unit, amount);   // 技能消耗同样计入鬼金羊被动；但不触发流光（流光只看「被减」）
return true;
}

/* ---- 行动条 ---- */
/* 锁定优先级最高：被放逐单位的行动条锁定在「放逐前的位置」，
   期间任何推进 / 击退 / 设值一律忽略（锁定 > 加减行动条），解除后从该位置继续。 */
function isActionLocked(unit) { return !!unit && !!unit.banished; }
/* 设值：一律夹在 [0, ACTION_MAX]。
   开局站位、放逐解锁、回合结束落点都走这里 —— 这些是「定位」而非「推进」，不应产生溢出。 */
function setActionValue(unit, pct) {
if (!unit || isActionLocked(unit)) return;
unit.actionValue = clamp(pct, 0, ACTION_MAX);
}
/* 推进 / 击退：允许超过 ACTION_MAX，超出的部分即「溢出值」，用于同帧抢先手排序。
   上限收到 ACTION_OVERFLOW_CAP，防止推条/拉条反复叠加导致无限累积。 */
function advanceActionValue(unit, pct) {
if (!unit || isActionLocked(unit)) return;
unit.actionValue = clamp((Number(unit.actionValue) || 0) + pct, 0, ACTION_OVERFLOW_CAP);
}
function pushActionValue(unit, pct) { return advanceActionValue(unit, -pct); }
/* 行动条溢出值：超出 100% 的部分。用于「同时到达终点」时的出手顺序 —— 溢出越高越先手。
   例：A 被拉条到 120%（溢出 20），B 自然推进到 100%（溢出 0）→ A 先手。 */
function getActionOverflow(unit) { return Math.max(0, (Number(unit && unit.actionValue) || 0) - ACTION_MAX); }
// 进度条/圆点的显示位置：超过 100% 一律贴在终点，避免圆点跑到轨道外
function getActionDisplayPct(unit) { return Math.min(Number(unit && unit.actionValue) || 0, ACTION_MAX); }
/* 行动条「加成」统一入口。
   问题：当前行动者此时正停在 100%，直接 advance 会被 ACTION_MAX 截断而完全失效；
   随后 endTurn 又把行动条清零 —— 等于这份加成凭空消失（带土、维迦都踩过这个坑）。
   解法：若受益者正是当前行动者，加成先记入 pendingActionBonus，
   在 endTurn 清零行动条之后再落地（而不是加在 100% 上）。 */
function grantActionValueBonus(unit, pct, reason = '') {
if (!unit || !(pct > 0)) return 0;
const tag = reason ? `（${reason}）` : '';
if (gameState.currentActor === unit) {
const before = Number(unit.pendingActionBonus) || 0;
unit.pendingActionBonus = Math.min(before + pct, ACTION_MAX);
const real = unit.pendingActionBonus - before;
if (real > 0) log(`${getSideLabel(unit)}${unit.name} 行动条+${real}%${tag}，将在回合结束后生效！`, 'log-buff');
return real;
}
const before = Number(unit.actionValue) || 0;
advanceActionValue(unit, pct);
const real = (Number(unit.actionValue) || 0) - before;
if (real > 0) { log(`${getSideLabel(unit)}${unit.name} 行动条+${real}%${tag}！`, 'log-buff'); updateActionBarDots(); }
return real;
}
// 放逐：把行动条锁定在当前位置（记录快照，之后任何改动都无效）
function lockActionValue(unit) { if (unit) unit.banishedActionValue = Number(unit.actionValue) || 0; }
// 解除放逐：从锁定位置继续，并额外补偿 bonus
function unlockActionValue(unit, bonus = 0) {
if (!unit) return;
unit.banished = false;
setActionValue(unit, (Number(unit.banishedActionValue) || 0) + bonus);
}

/* ---- 印记 / 状态 / 规则 ---- */
function hasMark(unit, type) { return !!(unit && (unit.marks || []).some(m => m.type === type)); }
/* 状态的增删查：与 marks 侧对齐（此前只有 hasMark/getMark/removeMark，状态侧缺同类入口，
   导致代码里到处写 unit.states.some(s => s.type === 'xx') 这种散装判断。 */
function hasState(unit, type) { return !!(unit && (unit.states || []).some(s => s.type === type)); }
function getState(unit, type) { return unit ? (unit.states || []).find(s => s.type === type) || null : null; }
function removeState(unit, type) { if (unit) unit.states = (unit.states || []).filter(s => s.type !== type); }
function getMark(unit, type) { return unit ? (unit.marks || []).find(m => m.type === type) : null; }
// 已存在则叠层（受 maxStacks 限制），否则新增
// 不可叠加的印记：已存在时只刷新持续时间，不叠层（没有"层数"语义）
/* 不可叠加的印记：重复获得只【刷新时长】，不叠层。
   ★ 登记依据只有一个 —— 角色描述里写了「不可叠加」。
   描述写了却没登记，就会出现"重复获得不但不刷新、反而叠起层数"的怪象（狐佑踩过这个坑）。
   已登记：雷压 / 狐守 / 狐佑 / 大妖之力 / 鬼王姿态 / 流光 / 守势 / 长星锁 / 万法 / 伏魔
   （风行、狂风、神威、宿影阵、照君、超凡邪力、雀之印、龙之舞 均为可叠层，勿登记） */
const NO_STACK_MARKS = new Set(['雷压', '狐守', '狐佑', '大妖之力', '鬼王姿态', '流光', '守势', '长星锁', '万法', '伏魔', '视']);
/* 不可叠加的【状态】：状态本身没有层数语义（addState 不叠层，只刷新时长），
   这里登记是为了与印记侧口径一致，且在显示层做兜底 —— 万一某处给状态塞了 stacks 也不会显示 ×N。
   登记依据同印记侧：描述里写了「不可叠加」。目前全体状态本就都不叠层，
   已登记：苍 / 混乱 / 眩晕 / 牵绊 / 百豪。 */
const NO_STACK_STATES = new Set(['混乱', '眩晕', '牵绊', '百豪']);
function addMark(unit, type, opts = {}) {
/* ignoreBanish：仅用于【技能内被动效果】的自动结算（如鬼金羊攒宿影阵）。
   这类效果不需要角色本体施放，因此不受【无法行动】约束 —— 即便被放逐也照常结算。
   外部施加的 buff 不传此参数，仍遵守「被放逐者不再接受新印记」。 */
const { ignoreBanish = false } = opts;
if (!unit || !unit.alive) return null;
if (unit.banished && !ignoreBanish) return null;   // 阵亡 / 被放逐：不再接受新印记
const { stacks = 1, maxStacks = 999, duration = 999, effect = null, extra = null } = opts;
const exist = getMark(unit, type);
if (exist) {
if (NO_STACK_MARKS.has(type)) { if (duration !== undefined) exist.duration = Math.max(exist.duration || 0, duration); exist.setTurnSeq = unit.turnSeq; return exist; }
exist.stacks = Math.min((exist.stacks || 1) + stacks, maxStacks);
if (duration !== undefined) exist.duration = Math.max(exist.duration || 0, duration);
exist.setTurnSeq = unit.turnSeq;
return exist;
}
const mark = { type, stacks, duration, effect };
mark.setTurnSeq = unit.turnSeq;
if (extra) Object.assign(mark, extra);
unit.marks.push(mark);
return mark;
}
function addState(unit, type, opts = {}) {
if (!unit || !unit.alive || unit.banished) return null;   // 阵亡 / 被放逐：不再接受新状态
const { duration = 2, effect = null } = opts;
const exist = (unit.states || []).find(s => s.type === type);
/* 状态一律不可叠加：已存在时只刷新持续时间，不累积层数。
   （NO_STACK_STATES 里登记的是「明确注明不可叠加」的那些，语义上与此一致） */
if (exist) {
exist.duration = Math.max(exist.duration || 0, duration);
exist.setTurnSeq = unit.turnSeq;
if (NO_STACK_STATES.has(type)) delete exist.stacks;   // 兜底：清掉可能混入的层数
return exist;
}
const st = { type, duration, effect };
st.setTurnSeq = unit.turnSeq;
unit.states.push(st); return st;
}
function removeMark(unit, type) { if (unit) unit.marks = (unit.marks || []).filter(m => m.type !== type); }
/* 移除指定印记，返回是否真的移除过（用于需要判断是否刷新的场合） */
function removeMarkIfHas(unit, type) {
if (!unit) return false;
const before = (unit.marks || []).length;
unit.marks = (unit.marks || []).filter(m => m.type !== type);
return unit.marks.length < before;
}
function removeRule(unit, type) { if (unit) unit.rules = (unit.rules || []).filter(r => r.type !== type); }
/* 规则统一入口：与 addMark / addState 对齐，走同一套 duration 倒计时机制。
   规则「不区分增益/减益」，但同样可以有持续时间 —— 到期由 RULE_EXPIRE 按 effect 分派。
   此前放逐与虚化是靠 banishTurns 一个独立字段手动递减，与 states / marks 的
   tickDuration 机制割裂；现统一为 duration，不再硬编码。 */
function addRule(unit, type, opts = {}) {
if (!unit || !unit.alive) return null;
const { duration = 999, effect = null, extra = null } = opts;
const exist = (unit.rules || []).find(r => r.type === type);
if (exist) { exist.duration = Math.max(exist.duration || 0, duration); exist.setTurnSeq = unit.turnSeq; return exist; }
const ru = { type, duration, effect, extra };
ru.setTurnSeq = unit.turnSeq;
unit.rules = unit.rules || [];
unit.rules.push(ru);
return ru;
}
function getRule(unit, type) { return unit ? (unit.rules || []).find(r => r.type === type) || null : null; }
function hasRule(unit, type) { return !!getRule(unit, type); }
/* ===== buff / 效果 三分类 与 增益/减益 归属 =====
   状态(states)：可驱散、可移除，区分增益/减益
   印记(marks) ：不可驱散、可移除，区分增益/减益
   驱散/移除本身是中性操作，清除哪一种由技能描述指定的类型决定（见 CLEAR_POLARITY）
   规则(rules) ：特定条件或方法清除，不区分增益/减益
   新增任何状态/印记都必须在这里登记极性，否则驱散、移除、虚化免疫会漏判。
   ================================================ */
const STATE_POLARITY = { '眩晕':'debuff', '牵绊':'buff', '百豪':'buff',
'混乱':'debuff' };
const MARK_POLARITY  = {
'神威':'debuff',                                  // 减益印记（唯一）
'风行':'buff', '狂风':'buff', '龙之舞':'buff', '雷压':'buff',
'超凡邪力':'buff', '狐守':'buff', '狐佑':'buff', '流光':'buff', '照君':'buff',
'大妖之力':'buff', '鬼王姿态':'buff',
'守势':'buff', '宿影阵':'buff',          // 心友犬神 / 鬼金羊 的增益印记
'雀之印':'debuff', '长星锁':'debuff',   // 心友犬神 / 鬼金羊 的减益印记
'伏魔':'buff', '万法':'buff',              // 两面宿傩「伏魔」/ 禅心云外镜「万法」增益印记
'视':'debuff'                                // 五条悟「视」减益印记（无层数语义，重复附加只刷新时长）
};
function getPolarity(type) { return STATE_POLARITY[type] || MARK_POLARITY[type] || null; }
function isDebuff(type) { return getPolarity(type) === 'debuff'; }
function isBuff(type)   { return getPolarity(type) === 'buff'; }
// 单位是否持有任一减益效果（状态或印记）—— 用于「随机一名携带减益的友方」这类选人
function hasDebuffEffect(unit) {
if (!unit) return false;
return (unit.states || []).some(x => isDebuff(x.type)) || (unit.marks || []).some(x => isDebuff(x.type));
}
/* ==================== 驱散 / 移除：统一入口 ====================
   【重要】驱散与移除本身是**中性操作**，不自带增益/减益倾向。
   清除哪一种（增益 or 减益）完全由**技能描述中指定的类型**决定，由调用方传入 polarity。
   例：流光到期驱散「减益」状态；鬼吞天火怒焱驱散敌方「增益」状态。
   polarity: 'buff' | 'debuff' | 'any'（'any' = 不区分，两者都清）
   两者的区别只在**作用范围**：驱散仅作用于「状态」，移除对「状态 + 印记」都生效。规则不受二者影响。 */
const CLEAR_POLARITY = { BUFF:'buff', DEBUFF:'debuff', ANY:'any' };
function matchPolarity(item, polarity) {
if (polarity === CLEAR_POLARITY.ANY) return true;
return polarity === CLEAR_POLARITY.BUFF ? isBuff(item.type) : isDebuff(item.type);
}
function polarityLabel(polarity) {
return polarity === CLEAR_POLARITY.BUFF ? '增益' : (polarity === CLEAR_POLARITY.DEBUFF ? '减益' : '');
}

/* 移除：对「状态 + 印记」都生效（规则不走这里）。极性由参数指定。 */
function removeEffects(unit, polarity = CLEAR_POLARITY.DEBUFF) {
if (!unit) return { states:[], marks:[] };
const rs = (unit.states || []).filter(x => matchPolarity(x, polarity));
const rm = (unit.marks  || []).filter(x => matchPolarity(x, polarity));
unit.states = (unit.states || []).filter(x => !matchPolarity(x, polarity));
unit.marks  = (unit.marks  || []).filter(x => !matchPolarity(x, polarity));
/* 移除可能解除了「眩晕」等无法行动状态 → 标记补放排队中的施放 */
if (rs.length + rm.length > 0) requestFlushAfterActionable();
return { states: rs.map(x => x.type), marks: rm.map(x => x.type) };
}
/* 驱散：仅作用于「状态」（印记不可驱散）。极性由参数指定。 */
function dispelStates(unit, count = 1, polarity = CLEAR_POLARITY.BUFF) {
if (!unit) return [];
const removed = [];
for (let i = 0; i < count; i++) {
const hits = (unit.states || []).filter(x => matchPolarity(x, polarity));
if (hits.length === 0) break;
const pick = hits[Math.floor(Math.random() * hits.length)];
const idx = unit.states.indexOf(pick);
if (idx >= 0) unit.states.splice(idx, 1);
removed.push(pick.type);
}
/* 驱散可能解除了「眩晕」等无法行动状态 → 标记补放排队中的施放 */
if (removed.length > 0) requestFlushAfterActionable();
return removed;
}


/* ---- 统计 ---- */
function addStat(unit, key, amount) {
if (!unit || !amount) return;
unit[key] = (Number(unit[key]) || 0) + amount;
}

/* ---- 速度：唯一取值入口，先加算后乘算 ---- */
/* 两面宿傩普攻形态：在「解」与「捌」之间切换（**施放普攻后**切换一次，初始为解）。
   普攻对象本身是静态配置，这里按当前形态 + 是否强化 动态生成实际招式。 */
function getEffectiveNormalSkill(unit) {
const base = unit && unit.normalSkill;
if (!base) return base;
/* 五条悟普攻「苍」：固定 120% 伤害，不再有「苍 / 赫」形态切换（重做后已移除「赫」与「苍」状态）。 */
/* 鬼王酒吞童子普攻「焚天 / 烈焰焚天」：由「鬼王姿态」决定是否强化。
   未持有姿态 = 焚天（120%）；持有 = 烈焰焚天（200% + 溅射 40%）。 */
if (unit.name === '鬼王酒吞童子') {
const boosted = hasMark(unit, '鬼王姿态');
return { ...base, name: boosted ? '烈焰焚天' : '焚天',
dmgRate: boosted ? GUIWANG_BLAZE_RATE : GUIWANG_NORMAL_RATE,
splashRate: boosted ? GUIWANG_BLAZE_SPLASH : 0,
guiWangForm: boosted ? 'blaze' : 'normal' };
}
if (unit.name !== '两面宿傩') return base;
const boosted = hasMark(unit, '伏魔');
if (unit.sukunaForm === 'ba') {
return { ...base, name: boosted ? '捌（强化）' : '捌', dmgRate: 0, hitCount: 1,
trueRate: SUKUNA_BA_TRUE_RATE, fixedMaxHpRate: SUKUNA_FIXED_MAXHP_RATE,
sukunaForm: 'ba', canExecute: boosted };
}
return { ...base, name: boosted ? '解（强化）' : '解', dmgRate: SUKUNA_JIE_RATE, hitCount: 2,
trueRate: 0, extraTrueRate: boosted ? SUKUNA_JIE_EXTRA_TRUE : 0, sukunaForm: 'jie' };
}

/* 两面宿傩普攻执行：解 = 两段 63%（强化额外 63% 真实）；捌 = 120% 真实 + 10% 最大生命固定伤害（强化可斩杀） */
async function performSukunaNormal(attacker, skill, target) {
unitAnimOn(idxOf(attacker), 'attack-anim'); await sleep(300);
if (!target || !target.alive) { unitAnimOff(idxOf(attacker), 'attack-anim'); return; }
if (skill.sukunaForm === 'ba') {
/* canExecute 随每段伤害一起传入 —— 「过程中」判定由 applyDamage / applyFixedDamage 负责。 */
const exFlag = !!skill.canExecute;
for (const r of calculateDamage(attacker, { trueRate: SUKUNA_BA_TRUE_RATE }, target)) {
await applyDamage(attacker, exFlag ? { ...r, canExecute:true } : r, target);
if (!target.alive) break;
}
// 固定伤害：目标最大生命值 10%，不受任何影响、无视护盾
if (target.alive && skill.fixedMaxHpRate) {
const fixed = Math.floor((Number(target.maxHp) || 0) * skill.fixedMaxHpRate);
if (fixed > 0) await applyFixedDamage(attacker, target, fixed, '捌·固定伤害', exFlag);
}
// 强化：造成伤害后目标生命低于 10% 最大生命 → 立即斩杀
if (target.alive && skill.canExecute) {
const ratio = (Number(target.hp) || 0) / (Number(target.maxHp) || 1);
if (ratio < SUKUNA_EXECUTE_BELOW) await executeKillTarget(attacker, target, '斩杀');
}
} else {
let hits = 0;
for (let i = 0; i < 2; i++) {
if (!target.alive) break;
for (const r of calculateDamage(attacker, { dmgRate: SUKUNA_JIE_RATE }, target)) await applyDamage(attacker, r, target);
hits++;
}
if (hits > 1) log(`${getSideLabel(attacker)}${attacker.name} 的解命中 ${hits} 段！`, 'log-damage');
// 强化：两段之外额外造成 63% 真实伤害
if (target.alive && skill.extraTrueRate) {
for (const r of calculateDamage(attacker, { trueRate: skill.extraTrueRate }, target)) await applyDamage(attacker, r, target);
}
}
unitAnimOff(idxOf(attacker), 'attack-anim');
await sleep(200);
}

/* 禅心云外镜被动「心净明」：行动阶段重新分配友方总生命，使友方生命百分比相同。
   总生命池 ÷ 总最大生命 = 统一百分比，每人按各自最大生命取该百分比。 */
async function applyXinJingMing(unit) {
const allies = getAliveAllies(unit);
if (allies.length <= 1) return;
const totalHp = allies.reduce((sum, u) => sum + (Number(u.hp) || 0), 0);
const totalMaxHp = allies.reduce((sum, u) => sum + (Number(u.maxHp) || 0), 0);
if (totalMaxHp <= 0) return;
const ratio = totalHp / totalMaxHp;
const detail = allies.map(u => {
// 保底 1 点：被动只做「重新分配」，不该把队友分死
u.hp = Math.max(1, Math.min(Number(u.maxHp) || 1, Math.round((Number(u.maxHp) || 0) * ratio)));
refreshUnit(u);
return `${u.name} ${u.hp}`;
});
log(`🪞 ${getSideLabel(unit)}${unit.name} 的「心净明」生效！友方生命重新分配至 ${Math.round(ratio * 100)}%（${detail.join('、')}）`, 'log-heal');
await sleep(200);
}

/* 「万法皆空」两段后的翻转：当前生命值与已损失生命值互换，并清除全体友方护盾。 */
async function applyWanfaFlip(unit) {
const allies = gameState.units.filter(u => u.alive && !isSummonUnit(u) && u.side === unit.side);
if (allies.length === 0) return;
const detail = allies.map(u => {
const maxHp = Number(u.maxHp) || 0;
const before = Number(u.hp) || 0;
// 翻转 = 已损失生命值；保底 1 点，避免满血时翻转把自己翻死
u.hp = Math.max(1, Math.min(maxHp, maxHp - before));
u.shield = 0;   // 同时清除护盾
refreshUnit(u);
return `${u.name} ${before}→${u.hp}`;
});
log(`🪞 「万法皆空」结算！全体生命翻转并清除护盾（${detail.join('、')}）`, 'log-heal');
await sleep(200);
}

function getEffectiveSpd(unit) {
if (!unit) return 0;
let spd = Number(unit.spd) || 0;
const windWalk = getMark(unit, '风行');
if (windWalk) spd += WINDWALK_SPD_PER_STACK * (windWalk.stacks || 1);   // 风行：+25 速度/层（最多5层）
const dragonDance = getMark(unit, '龙之舞');
if (dragonDance) spd += 10 * (dragonDance.stacks || 1);    // 龙之舞：+10 速度/层（最多3层）
const zhaojun = getMark(unit, '照君');
if (zhaojun) spd += 5 * (zhaojun.stacks || 1);             // 照君：+5 速度/层（最多5层）
if (hasMark(unit, '雷压')) spd = Math.floor(spd * 1.3);    // 雷压：+30% 速度，不可叠加
if (hasMark(unit, '万法')) spd = Math.floor(spd * (1 + WANFA_SPD_RATE));  // 万法：+10% 速度，不可叠加
if (hasRule(unit, '未来')) spd = Math.floor(spd * (1 + MIRAI_SPD_RATE));  // 未来：+20% 速度
return spd;
}

/* 技能标记：区分「普攻 / 主动技 / 额外技能」。
   此前靠 cost === 0 判断是否为普攻，一旦出现「消耗 0 怒气的主动技」就会误判
   （会被当成普攻：动态普攻替换、回怒气而非扣怒气、不播演出）。
   现在一律以 __kind 为准，与 cost 彻底解耦 —— 怒气消耗不再固定为 4。 */
function markSkill(skill, kind, extraKey) {
if (!skill) return null;
skill.__kind = kind;
if (extraKey) skill.__extraKey = extraKey;
return skill;
}
function createUnit(name, side, pos) {
/* 探索模式怪物不在 HERO_DATA 里（玩家不可选），数据由 pve.js 提供。
   怪物不参与神魂养成，下面会跳过神魂结算。 */
const isPveMonster = !HERO_DATA[name] && !!(window.PVE && window.PVE.getMonster && window.PVE.getMonster(name));
const d = HERO_DATA[name] || (window.PVE && window.PVE.getMonster ? window.PVE.getMonster(name) : null);
// 额外技能：不可主动施放，仅由特定条件触发，但**有技能演出**
if (d.extraSkills) Object.keys(d.extraSkills).forEach(k => markSkill(d.extraSkills[k], 'extra', k));
markSkill(d.normal, 'normal');
markSkill(d.skill, 'active');
if (d.skill2) markSkill(d.skill2, 'active');
// 注：已移除 windWalkStacks / galeWindStacks / dragonDanceStacks / thunderPressActive /
//     protectTargets / snapshotHp / darkStacks 等从未被读取的僵尸字段，叠层一律以 marks 为准
const u = { name, side, pos, atk:d.atk, def:d.def, maxHp:d.hp, hp:d.hp, spd:d.spd, critRate:d.critRate, critDmg:d.critDmg, effectHit:d.effectHit||0, effectResist:d.effectResist||0, finalDmgRate:1.0, finalDmgReduction:0, healBonus:1.0, healReduction:0, rage:2, actionValue:0, alive:true, states:[], marks:[], rules:[], color:d.color, normalSkill:d.normal, activeSkill:d.skill, activeSkill2:d.skill2 || null,
extraSkills:d.extraSkills || null, passiveSkill:d.passive || null, noCrit:!!d.noCrit, prisonRealmAttempted:false, shield:0, banishedBy:null, pendingSnapshot:false, intangible:false, banished:false, banishedActionValue:0, pendingActionBonus:0, sukunaForm:'jie', skillCooldown:0, skillCooldowns:{}, wanfaTurnsLeft:0,
statsDamageDealt:0, statsDamageTaken:0, statsHealDone:0, statsRestoreDone:0, statsShieldDone:0,
/* 束缚 2 件套：施放技能时额外消耗怒气换来的本回合最终伤害加成（回合结束清零） */
shufuFinalDmg:0,
/* 招财 2 件套：记录上次判定的回合号，防止同一回合重复触发 */
zhaocaiCheckedTurn:0,
buquUsed:false };
/* ============ 神魂：战斗外数据，开战前一次性结算进基础属性 ============
   只以角色面板（HERO_DATA 原始值）为准，神魂加成之间不互相放大。
   战斗核心完全感知不到神魂存在 —— 它只看到一个已算好最终面板的单位。
   ★ 联机例外：对端（客机/房主）的阵容要套用【它自己】的神魂存档，
     本机仓库里没有它的神魂，只能按它发来的「加成增量」还原。 */
u.shenhunSets = {};
const peerSide = (typeof Net !== 'undefined' && Net.active) ? netPeerSide() : null;
if (isPveMonster) {
/* 探索怪物：面板即最终值，不吃神魂、不吃对端神魂快照。 */
} else if (peerSide && side === peerSide && Net.peerSouls) {
const b = Net.peerSouls[name];
if (b) {
u.atk += Number(b.atk) || 0;
u.def += Number(b.def) || 0;
const addHp = Number(b.hp) || 0;
u.maxHp += addHp; u.hp = u.maxHp;      // 开局满血：上限涨多少，当前血就跟着涨
u.spd += Number(b.spd) || 0;
u.critRate += (Number(b.critRate) || 0) / 100;   // 传输用百分点，还原成小数
u.critDmg += Number(b.critDmg) || 0;
u.effectHit += (Number(b.effectHit) || 0) / 100;
u.effectResist += (Number(b.effectResist) || 0) / 100;
u.shenhunSets = b.shenhunSets || {};
}
} else if (typeof SHENHUN !== 'undefined' && SHENHUN.aggregateStats) {
const baseStats = { atk:d.atk, def:d.def, hp:d.hp, spd:d.spd, critRate:d.critRate, critDmg:d.critDmg, effectHit:d.effectHit||0, effectResist:d.effectResist||0, maxHp:d.hp };
const agg = SHENHUN.aggregateStats(name, baseStats);
u.atk = agg.atk; u.def = agg.def; u.maxHp = agg.maxHp; u.hp = agg.hp;
u.spd = agg.spd; u.critRate = agg.critRate; u.critDmg = agg.critDmg;
u.effectHit = agg.effectHit; u.effectResist = agg.effectResist;
u.shenhunSets = agg.shenhunSets || {};
}
return u;
}
/* 联机下「对端操控的那一方」：房主操控 player，客机操控 enemy。
   联机未开启时返回 null（单机一律用本机存档）。 */
function netPeerSide() {
if (typeof Net === 'undefined' || !Net.active) return null;
return Net.role === 'guest' ? 'player' : 'enemy';
}
/* 等待对端的神魂快照到位。绝大多数情况下进选人时就已收到，这里立刻返回；
   超时则按「对端没装神魂」处理，不阻塞开局。 */
function netAwaitPeerSouls(ms) {
return new Promise(function (resolve) {
if (typeof Net === 'undefined' || !Net.active) return resolve(false);
if (Net.peerSouls) return resolve(true);
Net.send({ t:'soulsReq' });
const t0 = Date.now();
const timer = setInterval(function () {
if (Net.peerSouls || !Net.active || Date.now() - t0 >= ms) {
clearInterval(timer);
resolve(!!Net.peerSouls);
}
}, 100);
});
}
/* 采集本机的神魂加成快照并广播给对端。
   发的是「相对角色面板的增量 + 套装达成情况」而非存档本身 ——
   对端仓库里没有本机神魂的 ID，发 ID 无意义；增量则可直接套用。
   覆盖全部角色：对端随时可能换人（含 BP），一次发全就不用担心时序。 */
function netSendSouls() {
if (typeof Net === 'undefined' || !Net.active) return;
if (typeof SHENHUN === 'undefined' || !SHENHUN.getSoulBonus) return;
const map = {};
Object.keys(HERO_DATA).forEach(function (name) {
const d = HERO_DATA[name];
if (!d) return;
map[name] = SHENHUN.getSoulBonus(name, {
atk: d.atk, def: d.def, hp: d.hp, spd: d.spd,
critRate: d.critRate || 0, critDmg: d.critDmg || 0,
effectHit: d.effectHit || 0, effectResist: d.effectResist || 0, maxHp: d.hp
});
});
Net.send({ t:'souls', map: map });
}
/* 联机下客机（玩家2）的视角翻转：自己的阵容在下方、自己的边框为绿色。
   双人对战（同一设备轮流操作）不翻转 —— 那样反而不方便两人共看一屏。 */
function applyNetViewFlip() {
const screen = document.getElementById('battle-screen');
if (!screen) return;
const flip = !!(typeof Net !== 'undefined' && Net.active && Net.role === 'guest');
screen.classList.toggle('flipped', flip);
}
/* ==================== 召唤物 ====================
   规则（钉崎野蔷薇「刍灵咒法·共鸣」）：
     · 双方场上只能存在一个召唤物；再次施放覆盖原有召唤物
     · 若没有特殊说明，召唤物速度为 0、无法行动
     · 稻草人继承连接目标 100% 最大生命值、50% 防御
     · 稻草人受到的伤害等量传导给连接目标（传导走 conductSummonDamage）
   实现取舍：召唤物作为 gameState.units 末尾的一个特殊单位（isSummon:true），
   这样 idxOf / refreshUnit / showFloatingText / 目标高亮 / onUnitClick 等所有基于 idx 的
   机制天然复用；但它【不加入 playerTeam / enemyTeam】，所以：
     · 不占正常角色 UI（单独渲染到 #summon-area 的小卡片）
     · 不进胜负判定、不进结算统计表
     · 行动条圆点、行动顺序、先机结算里一律跳过
   配置化：SUMMON_STRAW_DOLL 的 spd / canAct 留作将来「有特殊说明」的召唤物扩展点。 */
const SUMMON_STRAW_DOLL = {
name:'稻草人', hpRate:1.0, defRate:0.5, spd:0, canAct:false, color:'#c9a227'
};
function isSummonUnit(u) { return !!u && u.isSummon === true; }
/* ===== 召唤物槽位：每方场上各最多一个 =====
   钉崎是【往对方场上】召唤，稻草人的 side 等于连接目标的 side。
   所以按「稻草人所在阵营」分两个独立槽：我方钉崎占 enemy 槽，敌方钉崎占 player 槽，
   两边各一只、互不覆盖；同一方再召唤才覆盖自己那一只。
   summonIdx 从单个下标改成 { player: idx|null, enemy: idx|null }。
   所有读写一律走下面这组 helper，不直接碰字段。 */
function summonSlot(side) { return side === 'player' ? 'player' : 'enemy'; }
function getSummonIdx(side) {
const s = gameState.summonIdx;
if (!s || typeof s !== 'object') return null;   // 兼容旧单值形态
const v = s[summonSlot(side)];
return (v == null ? null : v);
}
function setSummonIdx(side, idx) {
if (!gameState.summonIdx || typeof gameState.summonIdx !== 'object') gameState.summonIdx = { player:null, enemy:null };
gameState.summonIdx[summonSlot(side)] = (idx == null ? null : idx);
}
/* 当前存活的全部召唤物下标（渲染 / 联机快照共用，顺序固定 player→enemy）。 */
function aliveSummonIdxs() {
const s = gameState.summonIdx;
if (!s || typeof s !== 'object') return [];
return ['player','enemy'].map(k => s[k])
.filter(i => i != null && isSummonUnit(gameState.units[i]) && gameState.units[i].alive);
}
function makeSummonUnit(side, linkedTarget, owner, maxHp, def) {
return {
name:SUMMON_STRAW_DOLL.name, side, pos:0,
atk:0, def, maxHp, hp:maxHp, spd:SUMMON_STRAW_DOLL.spd,
critRate:0, critDmg:0, effectHit:0, effectResist:0,
finalDmgRate:1.0, finalDmgReduction:0, healBonus:1.0, healReduction:0,
rage:0, actionValue:0, alive:true, states:[], marks:[], rules:[],
color:SUMMON_STRAW_DOLL.color, shield:0, banished:false, intangible:false,
banishedBy:null, banishedActionValue:0, pendingActionBonus:0,
statsDamageDealt:0, statsDamageTaken:0, statsHealDone:0, statsRestoreDone:0, statsShieldDone:0,
normalSkill:null, activeSkill:null, activeSkill2:null, passiveSkill:null,
noCrit:true, isSummon:true, linkedTarget, owner, lastAttackedTarget:null,
skillCooldowns:{}, shufuFinalDmg:0, zhaocaiCheckedTurn:0
};
}
/* 召唤 / 覆盖。返回 true 表示确实生成了稻草人。
   ★ 只覆盖【同一侧】的旧稻草人：两边都有钉崎时各占各的槽，不会互相顶掉。 */
function spawnSummon(caster, target) {
if (!caster || !target || !target.alive || isSummonUnit(target)) return false;
const side = target.side;                    // 稻草人落在连接目标所在阵营
const slot = summonSlot(side);
const maxHp = Math.max(1, Math.floor((Number(target.maxHp) || 0) * SUMMON_STRAW_DOLL.hpRate));
const def = Math.max(0, Math.floor((Number(target.def) || 0) * SUMMON_STRAW_DOLL.defRate));
let idx = getSummonIdx(side);
const replacing = idx != null && isSummonUnit(gameState.units[idx]) && gameState.units[idx].alive;
if (idx == null) {
/* 复用【同侧】已消散召唤物留下的槽位：idx 全程稳定，units 长度不随反复召唤增长，
   客机也无需反复追加占位，房主与客机的下标始终一致。 */
const reused = gameState.units.findIndex(u => isSummonUnit(u) && summonSlot(u.side) === slot);
idx = reused >= 0 ? reused : gameState.units.length;
if (reused < 0) gameState.units.push(null);
setSummonIdx(side, idx);
}
gameState.units[idx] = makeSummonUnit(side, target, caster, maxHp, def);
const sideText = side === 'enemy' ? '敌方' : '我方';
if (replacing) log(`🎎 ${getSideLabel(caster)}${caster.name} 重新召唤稻草人，覆盖${sideText}场上原有的连接，现与 ${getSideLabel(target)}${target.name} 连接！`, 'log-skill');
else log(`🎎 ${getSideLabel(caster)}${caster.name} 召唤稻草人至${sideText}场上，与 ${getSideLabel(target)}${target.name} 连接（生命 ${maxHp}、防御 ${def}、速度 0 · 无法行动）！`, 'log-skill');
renderSummon();
if (typeof Net !== 'undefined' && Net.active && Net.role === 'host') Net.sendSummonSnapshot();
return true;
}
/* 退场：血量归零 或 被覆盖前的旧召唤物。不走角色阵亡流程（无免死被动 / 击杀收益 / 复活）。 */
function despawnSummon(u) {
if (!isSummonUnit(u)) return;
/* 幂等：同一只稻草人可能被多条致死路径同时点到，清理照做，但日志/广播只发一次。 */
const wasAlive = u.alive;
u.alive = false; u.hp = 0;
const idx = idxOf(u);
/* 只清掉它自己那一侧的槽，另一侧的稻草人不受影响。 */
if (idx >= 0 && getSummonIdx(u.side) === idx) setSummonIdx(u.side, null);
/* 重绘而非清空容器：两边各有一只时，消散一只不能把另一只一起擦掉。 */
renderSummon();
if (!wasAlive) return;
log(`🎎 ${u.side === 'enemy' ? '敌方' : '我方'}场上的稻草人消散了！`, 'log-buff');
if (typeof Net !== 'undefined' && Net.active && Net.role === 'host') Net.sendSummonSnapshot();
}
/* 独立小 UI：挂在 #summon-area（绝对定位，靠近中央行动条），不占 enemy-area / player-area。
   DOM id 仍用 unit-${idx}，让选中高亮、飘字、命中动画、血条刷新全部自动生效。
   两边各一只时上下相对：enemy 侧由 CSS 定位到行动条上方、player 侧到下方；
   卡片上标出所在阵营，避免混淆。 */
function renderSummon() {
const area = document.getElementById('summon-area'); if (!area) return;
area.innerHTML = '';
aliveSummonIdxs().forEach(idx => {
const u = gameState.units[idx];
if (!isSummonUnit(u) || !u.alive) return;
const linkedName = (u.linkedTarget && u.linkedTarget.name) ? u.linkedTarget.name : '—';
const sideText = u.side === 'enemy' ? '敌方' : '我方';
const el = document.createElement('div');
el.className = `unit summon ${u.side}`; el.id = `unit-${idx}`;
el.title = `${sideText}场上的稻草人 · 速度0 · 无法行动`;
el.style.background = `linear-gradient(135deg, ${u.color}55, ${u.color}22)`;
el.innerHTML = `<div class="unit-content">
<div class="unit-name">🎎 ${u.name}</div>
<div class="summon-link">⇄ ${linkedName}</div>
<div class="unit-hp-bar-wrap"><div class="unit-hp-fill" style="width:100%"></div></div>
<div class="unit-hp-text">${u.hp}/${u.maxHp}</div>
<div class="unit-shield-text" style="display:none;"></div>
<div class="summon-note">${sideText} · 速度0</div>
</div>`;
el.addEventListener('click', () => onUnitClick(idx));
area.appendChild(el);
updateUnitDisplay(idx);
});
}
function renderUnits() {
const enemyArea = document.getElementById('enemy-area'); const playerArea = document.getElementById('player-area');
enemyArea.innerHTML = ''; playerArea.innerHTML = '';
gameState.enemyTeam.forEach(idx => enemyArea.appendChild(createUnitElement(idx)));
gameState.playerTeam.forEach(idx => playerArea.appendChild(createUnitElement(idx)));
// 元素插入 DOM 后再统一刷新一次：否则 createUnitElement 内的首次刷新
// 会因为 getElementById 还取不到节点而跳过，阵亡单位的 buff 容器就漏掉了隐藏
gameState.units.forEach((u, idx) => updateBuffDisplay(idx));
renderSummon();
refreshBattleImages();   // DOM 刚重建完，统一校正一次图源
applyNetViewFlip();
}
function createUnitElement(idx) {
const u = gameState.units[idx]; const wrapper = document.createElement('div'); wrapper.className = 'unit-wrapper';
const el = document.createElement('div'); el.className = `unit ${u.side} ${!u.alive ? 'dead' : ''}`; el.id = `unit-${idx}`;
el.style.background = `linear-gradient(135deg, ${u.color}44, ${u.color}22)`;
el.setAttribute('data-battle-src', battleImgSrc(u));
const bgImg = unitBgHtml(u);
el.innerHTML = `${bgImg}<div class="unit-scrim"></div><div class="unit-content">
<div class="unit-name">${u.name}</div>
<div style="display:flex;flex-direction:column;align-items:center;">
<div class="unit-hp-bar-wrap"><div class="unit-hp-fill" style="width:100%"></div></div>
<div class="unit-hp-text">${u.hp}/${u.maxHp}</div>
<div class="unit-shield-text" style="display:none;"></div>
<div class="unit-rage-bar"><div class="unit-rage-fill" style="width:${Math.min(u.rage/10*100,100)}%"></div></div>
<div class="unit-rage-text">怒:${u.rage}</div>
</div></div>`;
el.addEventListener('click', () => onUnitClick(idx)); wrapper.appendChild(el);
const buffContainer = document.createElement('div'); buffContainer.className = 'buff-container'; buffContainer.id = `buffs-${idx}`; wrapper.appendChild(buffContainer);
updateBuffDisplay(idx); return wrapper;
}
function refreshUnitView(idx) { updateUnitDisplay(idx); updateBuffDisplay(idx); }
function updateUnitDisplay(idx) {
/* 统一渲染入口：任何一次面板刷新都校正战斗图，规则变化不再依赖特定触发点。 */
syncUnitBattleImage(idx);
const u = gameState.units[idx]; const el = document.getElementById(`unit-${idx}`); if (!el) return;
if (!u.alive) {
el.classList.add('dead');
// 阵亡：头上 buff 容器一并隐藏（与 updateBuffDisplay 双保险）
const deadBuffs = document.getElementById(`buffs-${idx}`);
if (deadBuffs) { deadBuffs.innerHTML = ''; deadBuffs.style.display = 'none'; }
// 死亡时血条/护盾一律归零，否则会停在死亡前的数值
const deadFill = el.querySelector('.unit-hp-fill'); if (deadFill) deadFill.style.width = '0%';
const deadText = el.querySelector('.unit-hp-text'); if (deadText) deadText.textContent = `0/${u.maxHp}`;
const deadShield = el.querySelector('.unit-shield-text'); if (deadShield) { deadShield.style.display = 'none'; }
return;
}
/* ★ 复活 / 任何从阵亡回到存活的路径，都必须清掉 dead 样式并恢复被阵亡态改过的元素。
   此前只在 !alive 分支 add('dead') 却从未 remove —— 雪拉比「预知未来」复活后
   头像仍是灰的（filter: grayscale），buff 容器与护盾文本也仍被隐藏。 */
el.classList.remove('dead');
const liveBuffs = document.getElementById(`buffs-${idx}`);
if (liveBuffs && liveBuffs.style.display === 'none') liveBuffs.style.display = '';
const hpPercent = Math.max(0, Math.min(100, (u.hp / u.maxHp) * 100));
const hpFill = el.querySelector('.unit-hp-fill');
if (hpFill) hpFill.style.width = hpPercent + '%';
const hpText = el.querySelector('.unit-hp-text');
if (hpText) hpText.textContent = `${u.hp}/${u.maxHp}`;
const shieldText = el.querySelector('.unit-shield-text');
const shieldVal = Number(u.shield) || 0;
if (shieldText) {
if (shieldVal > 0) { shieldText.textContent = `护盾：${shieldVal}`; shieldText.style.display = 'block'; }
else { shieldText.style.display = 'none'; }
}
const rageFill = el.querySelector('.unit-rage-fill');
if (rageFill) rageFill.style.width = Math.min((u.rage/10*100),100) + '%';
const rageText = el.querySelector('.unit-rage-text');
if (rageText) rageText.textContent = `怒:${u.rage}`;
}
/* 神魂 2 件套标签：金色描边，与「状态蓝 / 印记紫 / 规则橙」区分开。
   2 件套是整场战斗都在生效的常驻效果，所以（未被放逐时）在栏中恒常显示，
   鼠标悬停（title）给出该套 2 件的具体效果说明。
   未达成 2 件的套装不显示 —— 1 件套是纯属性加成，已并入面板数值，不属于「效果」。
   ★ 放逐期间不显示：规则上「神魂失效」（指 2 件套），显示出来会与实装不符。 */
function buildShenhunTags(u) {
const out = [];
if (!u || u.banished) return out;          // 放逐：2 件套失效，标签一并隐藏
const sets = u && u.shenhunSets;
if (!sets) return out;
Object.keys(sets).forEach(name => {
const s = sets[name];
if (!s || !s.twoPiece) return;
const set = (typeof SHENHUN !== 'undefined' && SHENHUN.SET_BY_TYPE) ? SHENHUN.SET_BY_TYPE[name] : null;
const desc = set ? (set.two || set['2'] || '') : '';
const t = document.createElement('span');
t.className = 'buff-tag buff-shenhun';
t.textContent = name;                       // 只显示套装名；「2件」的含义由金框 + 悬停说明承载
if (desc) t.title = '神魂套装 · ' + name + '（2件）：' + desc;
out.push(t);
});
return out;
}
function updateBuffDisplay(idx) {
const u = gameState.units[idx]; const container = document.getElementById(`buffs-${idx}`); if (!container) return;
container.innerHTML = '';
/* 阵亡：所有状态/印记/规则一律不再显示（数据已在 killUnit 中清空，这里是显示层兜底）。
   另见 CSS：`.unit.dead ~ .buff-container { display:none !important }` 作为最后一道保险。 */
if (!u.alive) {
// 数据层兜底：若还有残留（走了未预料到的置死路径），这里一并清掉
if (((u.states||[]).length || (u.marks||[]).length || (u.rules||[]).length || (Number(u.shield)||0))) clearAllEffects(u);
container.innerHTML = ''; container.style.display = 'none'; return;
}
container.style.display = '';
/* 神魂 2 件套标签：放逐期间由 buildShenhunTags 自行隐藏（神魂失效）。 */
buildShenhunTags(u).forEach(t => container.appendChild(t));
/* 被放逐：规则上「目标相关所有状态与印记失效」，因此状态与印记不显示；
   但**「放逐」这条规则本身必须显示** —— 否则玩家看不出该单位为何不动、不可选中。
   这里单独渲染放逐标签后直接返回。 */
if (u.banished) {
// 规则不因放逐失效，逐条渲染（实际只有「放逐」自己）
(u.rules || []).forEach(r => {
const bt = document.createElement('span');
bt.className = 'buff-tag buff-rule';
bt.textContent = r.type;
container.appendChild(bt);
});
return;
}
u.states.forEach(s => {
const t = document.createElement('span');
t.className = 'buff-tag buff-state';
/* 层数显示规则与印记侧一致：只有「可叠加且已叠到 2 层以上」才显示 ×N。
   不可叠加的状态（NO_STACK_STATES）一律不显示，避免出现「苍×1」「混乱×1」。 */
const stacks = Number(s.stacks) || 0;
const showStacks = stacks > 1 && !NO_STACK_STATES.has(s.type);
t.textContent = s.type + (showStacks ? `×${stacks}` : '');
container.appendChild(t);
});
u.marks.forEach(m => {
const t = document.createElement('span');
t.className = 'buff-tag buff-mark';
/* 层数显示规则：只有「可叠加且已叠到 2 层以上」才显示 ×N。
   不可叠加的印记（NO_STACK_MARKS）与未叠层的一律不显示，避免出现「守势×1」「长星锁×1」这种无意义后缀。 */
const stacks = Number(m.stacks) || 0;
const showStacks = stacks > 1 && !NO_STACK_MARKS.has(m.type);
t.textContent = m.type + (showStacks ? `×${stacks}` : '');
container.appendChild(t);
});
u.rules.forEach(r => { const t=document.createElement('span'); t.className='buff-tag buff-rule'; t.textContent=r.type; container.appendChild(t); });
}
function renderActionBarDots() {
const track = document.getElementById('action-bar-track'); track.querySelectorAll('.action-dot').forEach(d => d.remove());
gameState.units.forEach((u, idx) => {
if (!u.alive || isSummonUnit(u)) return;   // 死亡单位 / 召唤物都不占行动条空间
const dot = document.createElement('div'); dot.className = `action-dot ${u.side}-dot`; dot.id = `dot-${idx}`; dot.style.left = getActionDisplayPct(u) + '%'; dot.setAttribute('data-battle-src', battleImgSrc(u)); dot.innerHTML = battleAvatarInner(u); dot.title = `${u.name} (${getActionDisplayPct(u).toFixed(1)}%)${getActionOverflow(u) > 0 ? ` 溢出${getActionOverflow(u).toFixed(1)}%` : ''}`; track.appendChild(dot);
});
refreshBattleImages();   // 圆点重建后统一校正一次图源
}
/* 行动条圆点统一入口：只保留存活单位的圆点。
   角色死亡后应立即从行动条上移除，否则残留在轨道上会误导玩家判断出手顺序。
   被放逐者仍保留（他们还会回到战局）。 */
/* 开局站位：初始位置 = 自身有效速度 ÷ 行动条总长度 × 100（%）。
   即最快的角色开局就站在 100%（终点）→ 第一帧即可先手；
   速度越慢开局越靠后，起跑线直接由速度决定。

   注意：这里**不重算** actionBarMax —— 总长度已在 startBattle 中「先机之前」算好，
   口径固定为「开局（先机前）速度最高者的速度值」。若在此重算会把先机的变化算进去，
   与设定不一致。setActionValue 内部已 clamp 到 [0, ACTION_MAX]，
   万一先机带来速度加成导致比值超过 100%，也会自动收在终点。 */
/* 开局站位 = 自身有效速度 ÷ 行动条总长度 × 100。
   总长度为 1 倍最高速度 → 最快者开局即站 100%（终点），立刻先手；
   其余人按速度比例排布，速度差在行动条上被完整放大。 */
function initActionBarPositions() {
gameState.units.forEach(u => { if (isSummonUnit(u)) return; setActionValue(u, (getEffectiveSpd(u) / gameState.actionBarMax) * 100); });
}
function updateActionBarDots() {
gameState.units.forEach((u, idx) => {
syncUnitBattleImage(idx);   // 每帧顺带校正：规则一变，下一次刷新必然换图
const dot = document.getElementById(`dot-${idx}`);
if (!u.alive || isSummonUnit(u)) { dot?.remove(); return; }   // 死亡 / 召唤物：移除圆点
if (!dot) { renderActionBarDots(); return; }
dot.style.left = getActionDisplayPct(u) + '%';
dot.title = `${u.name} (${getActionDisplayPct(u).toFixed(1)}%)${getActionOverflow(u) > 0 ? ` 溢出${getActionOverflow(u).toFixed(1)}%` : ''}`;
});
}
// 移除单个单位的行动条圆点
function removeActionBarDot(unit) {
if (!unit) return;
document.getElementById(`dot-${idxOf(unit)}`)?.remove();
}
/* 客机专用主循环：只让行动条平滑推进，绝不触碰战斗逻辑。
   回合判定 / 伤害结算全部由房主执行，客机跑这些会导致两边分叉。 */
function guestBarLoop(timestamp) {
if (gameState.phase !== 'fighting') return;
if (typeof Net === 'undefined' || Net.role !== 'guest' || !Net.active) return;
const rawDt = timestamp - gameState.lastTimestamp; gameState.lastTimestamp = timestamp;
const dt = Math.min(Math.max(rawDt, 0), MAX_FRAME_DT);
try { Net.interpBars(dt); } catch (e) { /* 插值失败不影响后续收包 */ }
gameState.rafId = requestAnimationFrame(guestBarLoop);
}
function gameLoop(timestamp) {
if (gameState.phase !== 'fighting') return;
// dt 必须钳制：卡顿 / 切后台回来时 timestamp 会跳变，不钳会让行动条一帧冲满
const rawDt = timestamp - gameState.lastTimestamp; gameState.lastTimestamp = timestamp;
const dt = Math.min(Math.max(rawDt, 0), MAX_FRAME_DT);
if (!gameState.paused && !gameState.animating) updateActionValues(dt);
if (typeof Net !== 'undefined') Net.tick(timestamp);
/* 驱散 / 移除解除了「无法行动」→ 下一帧立刻补放排队的施放（如满层的宿影阵）。
   放在这里是因为 dispelStates / removeEffects 是同步函数，无法就地 await。 */
if (gameState.needFlushAfterActionable && !gameState.paused && !gameState.animating) {
gameState.needFlushAfterActionable = false;
gameState.paused = true;
flushAfterActionable().then(() => { gameState.paused = false; });
gameState.rafId = requestAnimationFrame(gameLoop);
return;
}
if (!gameState.paused && !gameState.animating) {
const readyUnits = gameState.units.filter(u => isTargetable(u) && !isSummonUnit(u) && u.actionValue >= ACTION_MAX);
if (readyUnits.length > 0) {
sortReadyUnits(readyUnits);
gameState.paused = true; processUnitTurn(readyUnits[0]);
}
}
gameState.rafId = requestAnimationFrame(gameLoop);
}
/* 同帧抢先手排序（唯一入口）：对「已到达终点」的候选原地排序，返回排在最前的行动者。
   顺序：① 行动条溢出值降序 → ② 有效速度降序 → ③ 随机
   溢出值：行动条上限仍是 100%（显示与判定），但被拉条超出的部分会单独记录，
           溢出越高越先手 —— 例：A 拉到 120%（溢出20）优先于 B 自然走到 100%（溢出0）。 */
function sortReadyUnits(readyUnits) {
return readyUnits.sort((a, b) => {
const oa = getActionOverflow(a), ob = getActionOverflow(b);
if (oa !== ob) return ob - oa;                                  // ① 溢出值降序
const sa = getEffectiveSpd(a), sb = getEffectiveSpd(b);
if (sa !== sb) return sb - sa;                                  // ② 速度降序
return Math.random() - 0.5;                                     // ③ 随机
});
}
function updateActionValues(dt) {
const dtSec = dt / 1000;
gameState.units.forEach(u => {
if (!isTargetable(u) || isSummonUnit(u)) return;   // 召唤物速度 0，不推进行动条
const perSec = (getEffectiveSpd(u) / gameState.actionBarMax) * 100 * ACTION_BAR_SPEED;
advanceActionValue(u, perSec * dtSec);
});
updateActionBarDots();
}
// 回合收尾唯一入口：结算回合末 → 行动条归零 → 判定胜负 → 复位状态
/* ③ 回合结束 + ④ 行动条更新（回合收尾唯一入口） */
async function endTurn(unit) {
// ── ③ 回合结束 ──────────────────────────────────────────
await processTurnEnd(unit);
/* 束缚 2 件套的 +30% 最终伤害到「回合结束」为止：
   放在回合结束结算【之后】清零，这样回合末触发的效果仍吃得到这 30%。 */
if (unit.shufuFinalDmg) { unit.shufuFinalDmg = 0; refreshUnit(unit); }
// ── ④ 行动条更新 ────────────────────────────────────────
// 行动条清零 → 再落地本回合登记的所有待生效加成（维迦击杀、带土放逐结束等都走这条）
const pending = Number(unit.pendingActionBonus) || 0;
unit.pendingActionBonus = 0;
setActionValue(unit, pending);   // 之后由 gameLoop 从这里继续推进，进入下一回合循环
gameState.currentCastSkill = null; gameState.currentCaster = null;   // 清空本次施放记录
updateActionBarDots();
if (checkBattleEnd()) { gameState.animating = false; return true; }
gameState.paused = false; gameState.animating = false; gameState.currentActor = null; gameState.vayneKillThisTurn = false;
return false;
}
/* 一个回合的标准流程（唯一入口）：
   ┌ ① 回合开始 → ② 行动阶段 → ③ 回合结束 → ④ 行动条更新 ┐
   └─ 之后由 gameLoop 继续推进，进入下一回合循环 ─────────┘
   眩晕只跳过 ② 行动阶段，① ③ ④ 照常执行（否则回合末效果、状态倒计时会被吞掉）。 */
async function processUnitTurn(unit) {
/* 对局已结束（如点了「重新开始」）时直接中止，
   否则残留的异步回合会在新对局里继续结算，造成串场。 */
if (gameState.phase !== 'fighting') return;
/* 施放队列安全点①：回合开始。消费上一回合末排队的施放（如被动触发的宿影暗渡）。 */
await flushPendingCasts();
/* 「跳过回合」统一处理：谜夜（额外技能）给目标打上 pendingSkip，
   这里消费它并跳过【完整回合】（含回合开始与回合结束），与眩晕只跳过行动阶段不同。 */
if (unit.pendingSkip) {
unit.pendingSkip = false;
log(`${getSideLabel(unit)}${unit.name} 的回合被跳过！`, 'log-buff');
refreshUnit(unit);
setActionValue(unit, 0); updateActionBarDots();
gameState.currentCastSkill = null; gameState.currentCaster = null;
/* 联机：被跳过的若是客机方单位，必须显式清掉它的操作栏 ——
   否则客机画面仍停留在上一个角色的技能名上，点下去放的是别人的技能。 */
if (typeof Net !== 'undefined' && Net.active && Net.role === 'host' && unit.side === NET_GUEST_SIDE) Net.send({ t:'panel', mode:'none' });
if (checkBattleEnd()) { gameState.animating = false; return; }
gameState.paused = false; gameState.animating = false; gameState.currentActor = null; gameState.vayneKillThisTurn = false;
return;
}
/* 回合号：进入该单位的一次回合就 +1。
   效果施加时记下这个号（setTurnSeq），用于判断「本回合不计入持续时间」。
   放在 pendingSkip 之前 —— 被跳过的回合同样算一号，后续效果计时才不会错位。 */
unit.turnSeq = (Number(unit.turnSeq) || 0) + 1;
/* 「守势」每单位回合限 1 次：每个单位的回合开始时重置计数。
   （多段攻击、群体攻击会在同一回合内造成多次受击，这里保证只反击一次） */
gameState.shouShiTurnCount = 0;
/* 「无下限」护盾每单位回合限 1 次：与守势同口径，在每个单位的回合开始时重置。
   （多段攻击、群体攻击会在同一回合内造成多次受击，这里保证只给一次盾） */
gameState.wuXianXiaTurnCount = 0;
/* 心友犬神「守势」本轮计数：进入犬神自己的回合即清零。
   放在此处（长星锁早退之前）是为了保证无论如何都会执行——
   即便犬神本回合被长星锁跳过，也应视为新一轮开始。 */
if (unit.name === '心友犬神') unit.shouShiRoundCount = 0;
/* 「长星锁」优先于一切回合内容：携带者行动条达到 100% 时跳过【完整回合】，
   即回合开始与回合结束一并跳过（与眩晕只跳过行动阶段不同），等同于把行动条清空重来。 */
if (hasMark(unit, '长星锁')) {
/* 长星锁到期 → 由施加者（鬼金羊）对其施放「鬼宿奇惊·谜夜」（额外技能，有演出）。
   谜夜会给目标打上 pendingSkip，下面的统一处理再据此跳过完整回合。 */
const anyCaster = gameState.units.find(u => u.alive && u.name === '鬼金羊' && u.side !== unit.side);
const lockCaster = anyCaster && !cannotAct(anyCaster) ? anyCaster : null;
let casted = false;
if (lockCaster) { casted = await castExtraSkill(lockCaster, 'miYe', unit); }
else if (anyCaster) logCannotAct(anyCaster, '鬼宿奇惊·谜夜');
/* 只在谜夜【成功施放后】才移除长星锁：
   若鬼金羊被放逐 / 眩晕而没能施放，印记保留 —— 携带者下次行动条满时再次尝试。 */
if (casted) { removeMark(unit, '长星锁'); refreshUnit(unit); }
else {
/* 谜夜未施放 → 视为携带者本轮拥有【完整回合】，照常走 ①回合开始 → ②行动阶段。
   ★ 这里不再复制一份行动逻辑后 return（旧写法会漏掉回合开始的全部结算：
     技能冷却递减、「预知未来」、被动回合开始（流光追月神「绮罗舞」）、
     神魂招财 2 件套等）。改为直接落到下方正常流程，保证两处口径完全一致。 */
log(`${getSideLabel(unit)}${unit.name} 的「长星锁」未能触发（施法者无法行动），印记保留，本回合正常行动！`, 'log-buff');
refreshUnit(unit);
}
if (casted) {
if (!unit.pendingSkip) {
log(`${getSideLabel(unit)}${unit.name} 受到长星锁影响，跳过本回合！`, 'log-buff');
unit.pendingSkip = true;
}
refreshUnit(unit);
setActionValue(unit, 0); updateActionBarDots();
gameState.currentCastSkill = null; gameState.currentCaster = null;
/* 同上：客机方单位被跳过时也要清掉操作栏 */
if (typeof Net !== 'undefined' && Net.active && Net.role === 'host' && unit.side === NET_GUEST_SIDE) Net.send({ t:'panel', mode:'none' });
if (checkBattleEnd()) { gameState.animating = false; return; }
gameState.paused = false; gameState.animating = false; gameState.currentActor = null; gameState.vayneKillThisTurn = false;
return;
}
/* 未施放成功：不 return，继续往下走 ① 回合开始（与正常回合完全同路） */
}
// ── ① 回合开始 ──────────────────────────────────────────
/* 技能冷却（禅心云外镜「万法皆空」）：自身回合开始递减，归零后方可再次施放。
   放在长星锁早退之后 —— 被长星锁跳过的是「完整回合」，冷却也不该推进。 */
if (Number(unit.skillCooldown) > 0) unit.skillCooldown--;   // 兼容旧字段
/* 技能冷却【按技能名】分槽递减：
   禅心云外镜的「心净明」与「万法皆空」各有独立冷却，
   若共用一个字段，施放其中一个会把另一个也锁住。 */
const cds = unit.skillCooldowns || (unit.skillCooldowns = {});
Object.keys(cds).forEach(k => { if (cds[k] > 0) cds[k]--; });
/* 「万法皆空」翻转倒计时：施放后第 2 个回合开始时结算（= 两个回合后）。 */
if (Number(unit.wanfaTurnsLeft) > 0) {
unit.wanfaTurnsLeft--;
if (unit.wanfaTurnsLeft === 0) await applyWanfaFlip(unit);
}
// 雪拉比「预知未来」：下回合开始时结算两段「恢复」
//   ① 记录伤害的 80% 平均分配给所有存活友方
//   ② 所有存活友方额外恢复「雪拉比最大生命值 × 9%」
// 两段都是固定数值，走【恢复】而非【治疗】：不吃治疗加成/减免/暴击
if (unit.pendingSnapshot) {
const recorded = Number(gameState.damageLogTotal) || 0;
const aliveAllies = getAliveAllies(unit);
if (aliveAllies.length > 0) {
const shareRestore = recorded > 0 ? Math.floor(recorded * FORESEE_SHARE_RATE / aliveAllies.length) : 0;
const maxHpRestore = Math.floor(unit.maxHp * FORESEE_MAXHP_RATE);
log(`${getSideLabel(unit)}预知未来生效！友方共受到 ${recorded} 伤害，每人恢复 ${shareRestore}（均摊）+ ${maxHpRestore}（最大生命${Math.round(FORESEE_MAXHP_RATE*100)}%）`, 'log-heal');
if (shareRestore > 0) await performRestoreAll(aliveAllies, shareRestore, unit);
if (maxHpRestore > 0) await performRestoreAll(aliveAllies, maxHpRestore, unit);
}
unit.pendingSnapshot = false; gameState.damageLogTotal = 0; gameState.damageLogSide = null;
/* 记录期间阵亡的友方：恢复结算后复活至 1 点生命，行动条设在阵亡时的位置。
   复活放在恢复之后，避免刚站起来就被下一次结算覆盖。 */
await reviveRecordedFallen(unit);
}
setActionValue(unit, ACTION_MAX); updateActionBarDots();   // 站到终点，表示其正在行动
/* 无论手动 / 自动都登记当前行动者。
   之前只有手动模式（showControlPanel）才设，导致自动模式下施放者自己的行动条加成
   会被当成「立即生效」加在 100% 上被截断，随后 endTurn 又清零 —— 镰鼬自己的 +30% 凭空消失。 */
gameState.currentActor = unit;
const idx = idxOf(unit); document.getElementById(`unit-${idx}`)?.classList.add('acting');
/* 被动：自身回合开始时结算（如流光追月神「绮罗舞」的流光转化）。
   放在上述各「回合开始」结算之后、行动阶段之前。 */
await applyPassiveTurnStart(unit);
/* 神魂套装的回合开始效果（招财 2 件套）。
   与角色被动分开：神魂不吃「被动失效」，且要在行动阶段前给到怒气，
   否则本回合的技能按钮会按旧怒气判断可用性。 */
await applyShenhunTurnStart(unit);
// ── ② 行动阶段 ──────────────────────────────────────────
/* 无法行动：跳过【行动阶段】（不能施放技能，也不能普攻）。
   统一走 cannotAct —— 覆盖放逐与眩晕两种来源。
   回合开始已结算、回合结束与行动条更新照常走 endTurn()。 */
if (cannotAct(unit)) {
log(`${getSideLabel(unit)}${unit.name} ${unit.banished ? '被放逐中' : '眩晕中'}，无法行动！`, 'log-buff');
await sleep(500); document.getElementById(`unit-${idx}`)?.classList.remove('acting');
await endTurn(unit);   // ③ 回合结束 + ④ 行动条更新
return;
}
log(`📌 ${getSideLabel(unit)}${unit.name} 的行动回合！`, 'log-normal');
/* 「混乱」：携带者【行动阶段】时，改为对场上随机目标普攻（不分敌我）。
   只在行动阶段生效 —— 回合外行动（如心友犬神守势触发的「一誓归心」）不受影响，
   那些走 triggerSkill / castExtraSkill，不经过这里的分支。
   放在无法行动判定之后、正常行动之前 —— 无法行动者已跳过行动阶段，
   不会因混乱而额外出手（混乱触发的普攻同样受 cannotAct 约束）。 */
if (hasState(unit, '混乱')) {
const acted = await performChaosAction(unit);
document.getElementById(`unit-${idxOf(unit)}`)?.classList.remove('acting');
if (acted) { await endTurn(unit); return; }
}
/* 禅心云外镜被动「心净明」：行动阶段重新分配友方总生命，使友方生命百分比相同。
   放在眩晕判定之后（眩晕跳过的是行动阶段，被动自然不触发），且在施放技能之前结算，
   这样本回合的技能（如万法皆空的扣血/护盾）是基于重新分配后的血量。 */
if (unit.name === '禅心云外镜') await applyXinJingMing(unit);
// 需要玩家操作的场合：我方（PVE/PVP）或 PVP 下的第二玩家；且该阵营【未开启】自动
const needPlayerInput = !isAutoUnit(unit) && (unit.side === 'player' || (unit.side === 'enemy' && gameMode === 'pvp'));
/* 施放队列安全点②：行动之前。保证排队中的施放先演出完，再执行本回合行动。 */
await flushPendingCasts();
if (needPlayerInput) { showControlPanel(unit); gameState.currentActor = unit; }
else { if (unit.side === 'enemy') await sleep(1000); await executeAutoAction(unit); }
}
/* 操作栏两种形态：
   ① 技能选择态：普攻 / 技能1 / 技能2 / 自动（取消隐藏）
   ② 目标选择态：只留「自动」与「取消」（防止误触技能后被迫放出去） */
function showControlPanel(unit, selecting = false) {
const set = (id, show) => { const b = document.getElementById(id); if (b) b.style.display = show ? 'inline-block' : 'none'; };
/* 联机：轮到客机方行动时，房主本地不显示面板，改为把按钮状态广播给客机 */
if (typeof Net !== 'undefined' && Net.active && Net.role === 'host' && unit && unit.side === NET_GUEST_SIDE && !selecting) {
hideControlPanel();
const mk = (id, skill, label) => {
if (!skill) return { id, show:false, text:'', dis:true };
const cost = Number(skill.cost) || 0;
const reason = getSkillBlockReason(unit, skill);
const dis = (Number(unit.rage) || 0) < cost || !!reason;
return { id, show:true, text: reason ? `${label}（不可用）` : `${label}(${unit.rage}/${cost})`, dis };
};
Net.send({ t:'panel', mode:'skill', ttype:'enemy', idx: idxOf(unit), name: unit.name,
btns:[ { id:'btn-normal', show:true, text:'普攻', dis:false },
mk('btn-skill', unit.activeSkill, unit.activeSkill ? unit.activeSkill.name : '技能'),
mk('btn-skill2', unit.activeSkill2, unit.activeSkill2 ? unit.activeSkill2.name : '技能2') ] });
return;
}
if (selecting) {
set('btn-normal', false); set('btn-skill', false); set('btn-skill2', false);
set('btn-auto', true); set('btn-cancel', true);
/* 联机下房主本地进入选目标态时也要同步客机 ——
   否则客机停留在此前的面板上，按钮与实际可做的操作不一致。 */
if (typeof Net !== 'undefined' && Net.active && Net.role === 'host') {
Net.send({ t:'panel', mode:'select', ttype: gameState.targetType || 'enemy', btns:[] });
}
return;
}
set('btn-normal', true); set('btn-auto', true); set('btn-cancel', false);
// 技能按钮统一渲染：怒气门槛读各自 skill.cost（不再固定 4）
const setupSkillBtn = (btnId, skill, label) => {
const btn = document.getElementById(btnId);
if (!btn) return;
if (!skill) { btn.style.display = 'none'; return; }
btn.style.display = 'inline-block';
const cost = Number(skill.cost) || 0;
const reason = getSkillBlockReason(unit, skill);
if (reason) log(`${getSideLabel(unit)}${reason}`, 'log-buff');
btn.disabled = (Number(unit.rage) || 0) < cost || !!reason;
btn.textContent = reason ? `${label}（不可用）` : `${label}(${unit.rage}/${cost})`;
};
const blockReason = unit.activeSkill ? getSkillBlockReason(unit, unit.activeSkill) : null;
setupSkillBtn('btn-skill', unit.activeSkill, unit.activeSkill ? unit.activeSkill.name : '技能');
setupSkillBtn('btn-skill2', unit.activeSkill2, unit.activeSkill2 ? unit.activeSkill2.name : '技能2');
document.getElementById('btn-normal').disabled = false;
if (typeof Net !== 'undefined' && Net.active && Net.role === 'host') Net.send({ t:'panel', mode:'none' });
// 注：已取消双人对战的「玩家1 / 玩家2 的回合」弹出提示 ——
// 技能演出（Cut-in）已能清楚表明当前是谁在行动，额外弹窗反而挡视野。
}
function hideControlPanel() {
document.getElementById('btn-normal').style.display = 'none';
document.getElementById('btn-skill').style.display = 'none';
document.getElementById('btn-skill2').style.display = 'none';
document.getElementById('btn-cancel').style.display = 'none';
gameState.waitingForTarget = false; clearHighlights();
if (typeof Net !== 'undefined' && Net.active && Net.role === 'host') Net.send({ t:'panel', mode:'none' });
}
/* ==================== 自动战斗（分阵营） ====================
   autoMode 原先是【全局单开关】：房主一点自动，AI 会把敌我两边都接管，
   于是客机（玩家2）也被托管了 —— 而客机那边连按钮都没有，只能干看着。
   现在改成每个阵营各有一个开关：
     · 房主只切自己那一方（player）
     · 客机只切自己那一方（enemy）
     · 双人对战（同一设备）两边都由本机操作，因此一键同时切
   注意：战斗逻辑只跑在房主端，客机改的本地开关不会生效 ——
   必须把偏好发给房主（见下方 Net.send({t:'auto'}) 与 handle 中的分支）。 */
function isAutoSide(side) { return !!(gameState.auto && gameState.auto[side]); }
function isAutoUnit(u) { return !!u && isAutoSide(u.side); }
/* 本端「自动」按钮所控制的阵营 */
function localAutoSides() {
if (typeof Net !== 'undefined' && Net.active) {
return Net.role === 'guest' ? [NET_GUEST_SIDE] : ['player'];
}
return (gameMode === 'pvp') ? ['player', 'enemy'] : ['player'];   // 双人共屏：两边都是本机操作
}
/* 刷新按钮外观：显示本端所控阵营的自动状态（多阵营时全部开启才显示 ON） */
function updateAutoBtn() {
const btn = document.getElementById('btn-auto'); if (!btn) return;
const sides = localAutoSides();
const on = sides.every(sd => isAutoSide(sd));
btn.textContent = `自动: ${on ? 'ON' : 'OFF'}`;
btn.classList.toggle('auto-on', on);
}
function toggleAuto() {
const sides = localAutoSides();
const on = !sides.every(sd => isAutoSide(sd));      // 有任一方未开 → 本次统一开启
sides.forEach(sd => { gameState.auto[sd] = on; });
updateAutoBtn();
/* 联机客机：逻辑全在房主端跑，本地改状态无效 —— 必须把偏好发过去，
   由房主写入它那边的 gameState.auto 并决定是否立刻接管当前回合。 */
if (typeof Net !== 'undefined' && Net.active && Net.role === 'guest') {
Net.send({ t:'auto', on });
return;
}
/* 房主 / 单机：若当前行动者正好属于刚开启自动的阵营，立刻接管 */
const actor = gameState.currentActor;
if (!actor || !sides.includes(actor.side)) return;
if (on) { hideControlPanel(); executeAutoAction(actor); }
else { showControlPanel(actor); }
}
// 无需选目标的技能类型：群体 / 增益 / 快照 / 记录恢复
const NO_TARGET_SKILL_TYPES = new Set(['aoe', 'buff', 'snapshot', 'damageLog']);
/* 「虽属无目标类型、但需要指定单个友方」的技能：在技能配置上标 pickTarget:true 即可。
   这样不必为每个特例改判定分支 —— 心净明是首个用例（万法皆空等同类型技能不受影响）。 */
function needsTargetSelection(skill) { return !!skill && skill.pickTarget === true; }
/* 「未来」强化的技能形态解析（单一真相）。
   强化原本只在 runSkillBranch 里改写，但「是否要选目标」发生在更早的面板 / AI / 联机层，
   导致强化后的「穿血」明明已是全体伤害，仍会弹出选目标。
   这里把解析提前到所有技能入口共用；runSkillBranch 再调一次做执行阶段兜底（幂等）。
   · 穿血：单体 → 敌方全体（type 改 aoe，因此跳过选目标）
   · 斩击·领域：主目标仍需选，只追加全体三段（type 不变）
   其余角色 / 技能的形态原样返回。 */
function getEffectiveSkillShape(unit, skill) {
if (!unit || !skill || unit.name !== '虎杖悠仁' || !hasRule(unit, '未来')) return skill;
if (skill.name === '穿血') return { ...skill, type:'aoe' };
if (skill.name === '斩击·领域' && !skill.itadoriDomainEnhanced) return { ...skill, itadoriDomainEnhanced:true };
return skill;
}
/* 统一的「是否跳过选目标」判定 */
function isNoTargetSkill(skill) { return NO_TARGET_SKILL_TYPES.has(skill.type) && !needsTargetSelection(skill); }
async function onActionBtn(type) {
const unit = gameState.currentActor; if (!unit) return;
// 可用技能列表：普攻 + 技能1 + 技能2（若有）
const rawSkill = type === 'normal' ? unit.normalSkill : (type === 'skill2' ? unit.activeSkill2 : unit.activeSkill);
if (!rawSkill) return;
if (type !== 'normal' && (Number(unit.rage) || 0) < (Number(rawSkill.cost) || 0)) return;
/* 先解析「未来」强化形态：强化后的穿血是全体伤害，跳过选目标直接施放。 */
const skill = getEffectiveSkillShape(unit, rawSkill);
hideControlPanel();
if (isNoTargetSkill(skill)) { await executeAction(unit, skill); return; }
gameState.waitingForTarget = true; gameState.targetType = skill.target; gameState.pendingSkill = skill;
highlightValidTargets(skill.target, unit); log(`请选择${skill.target==='enemy'?sideLabelPlain(gameState.units.find(u=>u.side!==unit.side)):'友方'}目标`, 'log-normal');
// 目标选择态：只留自动与取消
showControlPanel(unit, true);
}
/* 「取消」：放弃本次目标选择，回到技能选择态。
   怒气未扣除（扣费发生在 executeAction 内），因此没有任何副作用。 */
function cancelTargetSelection() {
if (!gameState.waitingForTarget) return;
gameState.waitingForTarget = false; gameState.pendingSkill = null; gameState.targetType = null;
clearHighlights();
log('已取消，请重新选择行动。', 'log-normal');
showControlPanel(gameState.currentActor, false);
}
function highlightValidTargets(targetType, actor) {
gameState.units.forEach((u, idx) => {
const el = document.getElementById(`unit-${idx}`); if (!el) return;
if (isValidTarget(u, targetType, actor)) el.style.boxShadow = '0 0 10px 3px #ffd700';
});
}
function clearHighlights() { gameState.units.forEach((u, idx) => { const el = document.getElementById(`unit-${idx}`); if (el) el.style.boxShadow = ''; }); }
async function onUnitClick(idx) {
const target = gameState.units[idx];
/* 联机客机：处于选目标态时，点击单位只回传目标序号，由房主执行 */
if (typeof Net !== 'undefined' && Net.active && Net.role === 'guest' && Net.waitingPick) {
if (!isValidTarget(target, gameState.targetType, { side: NET_GUEST_SIDE })) { log('❌ 无效目标！', 'log-normal'); return; }
Net.waitingPick = false; clearHighlights();
Net.pickedPending = true;      // 已提交，后续迟到的 select 面板一律忽略
Net.send({ t:'pick', idx });
return;
}
if (gameState.waitingForTarget) {
const actor = gameState.currentActor;
if (!isValidTarget(target, gameState.targetType, actor)) { log('❌ 无效目标！', 'log-normal'); return; }
gameState.waitingForTarget = false; clearHighlights();
/* 联机：房主选完目标也要同步给客机清高亮（与 hostDoPick 同口径） */
if (typeof Net !== 'undefined' && Net.active && Net.role === 'host') Net.send({ t:'panel', mode:'none' });
const el = document.getElementById(`unit-${idx}`); el.classList.add('selected-target'); await sleep(200); el.classList.remove('selected-target');
await executeAction(actor, gameState.pendingSkill, target); return;
}
}
// 需要指定单个目标的技能类型
const TARGETED_SKILL_TYPES = new Set(['single', 'single_then_aoe', 'banish', 'summon']);
async function executeAutoAction(unit) {
/* 多技能选择：在所有「怒气够且当前可用」的技能里取 cost 最高的那个（视为更强）。
   只有一个技能时行为与旧版完全一致；0 怒气技能（如鬼金羊「宿影暗渡」）永远可放。 */
const candidates = [unit.activeSkill, unit.activeSkill2].filter(Boolean)
.filter(sk => (Number(unit.rage) || 0) >= (Number(sk.cost) || 0) && canCastSkill(unit, sk))
.sort((a, b) => (Number(b.cost) || 0) - (Number(a.cost) || 0));
const rawSkill = candidates[0] || unit.normalSkill;
if (!rawSkill) return;
/* 同玩家手动入口：强化后的穿血是全体伤害，不再挑单个最低血目标。 */
const skill = getEffectiveSkillShape(unit, rawSkill);
if (isNoTargetSkill(skill)) { await executeAction(unit, skill); return; }
// 目标取向：技能自带 target 字段优先，否则按是否治疗判断
const targetType = skill.target || (skill.healRate ? 'ally' : 'enemy');
/* 例外表中的技能取最高血角色，普攻及其余角色仍取最低血；skill 一并传入判定。 */
await executeAction(unit, skill, autoTargetFor(unit, targetType, skill));
}
// 施放前置校验：不满足条件直接不消耗怒气
/* 施放前置校验：返回不可用原因（null = 可用）。此处只判定、不打日志，
   日志由调用方（玩家面板 / AI 执行）各打一次，避免重复刷屏。 */
function getSkillBlockReason(unit, skill) {
if (!unit || !skill) return null;
// 神威·虚化：敌方已有单位处于放逐中时无法施放
if (skill.type === 'banish' && gameState.units.some(u => u.alive && u.banished && u.side !== unit.side)) return '敌方放逐存在，无法施放此技能！';
/* 技能冷却：按【技能名】独立计（心净明 1 回合 / 万法皆空 3 回合互不干扰）。
   自身回合开始时递减，归零前不可施放。 */
if (skill.cooldown) {
const cd = Number((unit.skillCooldowns || {})[skill.name]) || 0;
if (cd > 0) return `技能冷却中，还需 ${cd} 回合！`;
}
// 「仅在无某印记时可施放」（鬼王酒吞童子「天火怒焱」要求无「鬼王姿态」）
if (skill.requireNoMark && hasMark(unit, skill.requireNoMark)) return `已处于「${skill.requireNoMark}」，无法施放此技能！`;
return null;
}
function canCastSkill(unit, skill) { return getSkillBlockReason(unit, skill) === null; }
/* 技能效果分支：只负责「做什么」，不涉及怒气、演出、结束回合。
   抽出来是为了让【额外技能】也能复用 —— 它们在别人的回合里触发，不能 endTurn。 */
async function runSkillBranch(unit, skill, forcedTarget = null) {
/* 虎杖悠仁「未来」：强化所有技能 ——
   · 穿血：由单体改为敌方全体（同为 160%）；
   · 斩击·领域：单体三段之外，额外对敌方全体造成三段 80%（追加段不重复附加混乱）。
   普攻「径庭拳」未给出强化形态，保持原样。
   形态由 getEffectiveSkillShape 统一解析；入口层已解析过，这里再调一次做执行阶段兜底（幂等）。 */
skill = getEffectiveSkillShape(unit, skill);
// 单体类技能的目标取向：有 healRate/healFlat 即视为治疗，指向友方
const isHeal = !!(skill.healRate || skill.healFlat);
if (skill.type === 'single') {
const target = forcedTarget || findLowestHpTarget(isHeal ? 'ally' : (skill.target || 'enemy'), unit);
if (target) {
if (isHeal) await performHealSkill(unit, skill, target);
else if (skill.sukunaForm) await performSukunaNormal(unit, skill, target);
else await performSingleAttack(unit, skill, target);
}
} else if (skill.type === 'single_then_aoe') {
const target = forcedTarget || findLowestHpTarget('enemy', unit);
// 群体段为派生技能：只继承群体伤害率，effect/selfEffect 不继承（避免单体段和群体段重复触发）
if (target) { await performSingleAttack(unit, skill, target); await performAoeAttack(unit, { ...skill, type:'aoe', dmgRate:skill.aoeDmgRate, trueRate:skill.aoeTrueRate, effect:undefined, selfEffect:undefined }); }
} else if (skill.type === 'aoe') { await performAoeAttack(unit, skill); }
else if (skill.type === 'snapshot') { await performSnapshot(unit, skill); }
else if (skill.type === 'damageLog') { await performDamageLog(unit, skill); }
else if (skill.type === 'banish') { const target = forcedTarget || findLowestHpTarget('enemy', unit); if (target) await performBanish(unit, skill, target); }
else if (skill.type === 'summon') {
/* 稻草人本身不能作为连接目标（否则变成「稻草人连稻草人」）。
   AI 自动施放时从【普通敌方单位】里挑当前生命最低者。 */
const pool = getAliveEnemies(unit).filter(u => !isSummonUnit(u));
const target = (forcedTarget && !isSummonUnit(forcedTarget)) ? forcedTarget : findLowestHpAmong(pool);
if (target && target.alive) await spawnSummon(unit, target);
else log(`${getSideLabel(unit)}${unit.name} 没有可连接的敌方目标，「${skill.name}」未生效。`, 'log-buff');
}
else if (skill.type === 'skip') {
/* 「鬼宿奇惊·谜夜」：跳过目标回合（完整回合，含回合开始与回合结束）。
   标记 pendingSkip，由 processUnitTurn 开头统一处理 ——
   这样无论目标是当前行动者还是别人，都能正确跳过它下一次的完整回合。 */
const target = forcedTarget;
if (target && target.alive) {
target.pendingSkip = true;
log(`${getSideLabel(target)}${target.name} 的回合将被跳过！`, 'log-skill');
refreshUnit(target);
}
}
// buff 型技能无需单独分支：其效果全部由 selfEffect 承载，走下面这行统一结算
/* 目标透传：心净明这类「指向友方目标」的 buff 技能需要知道选中的是谁。
   buff 型默认无目标（作用于自身 / 全体），故默认为 null；
   若技能声明了 target:'ally'，则取「当前生命比例最低的友方」作为默认目标
   （AI 自动施放时），玩家手动施放则由选目标流程传入 forcedTarget。 */
if (skill.selfEffect) {
let buffTarget = forcedTarget || null;
if (!buffTarget && skill.target === 'ally') buffTarget = findLowestHpTarget('ally', unit);
/* 显式要求选目标的技能：没拿到目标就跳过结算 —— 静默作用于默认目标会让玩家困惑
   （以为点了技能却打到了别人身上）。 */
if (needsTargetSelection(skill) && !buffTarget) { log(`${getSideLabel(unit)}${unit.name} 的「${skill.name}」没有有效目标，未生效。`, 'log-buff'); return; }
await applySelfEffect(unit, skill.selfEffect, buffTarget);
}
/* 「斩击·领域」强化追加段：对敌方全体再造成三段 80% 伤害。
   不继承 effect（混乱只给主目标）、不继承 selfEffect，避免重复结算。 */
if (skill.itadoriDomainEnhanced && unit.alive) {
await performAoeAttack(unit, { name:'斩击·领域·强化', type:'aoe', target:'enemy', segments: skill.segments });
}
}
/* 触发一次技能：播演出 + 执行效果，**不结束回合、不处理怒气**。
   供【额外技能】与【印记 / 被动触发的施放】使用（如守势→一誓归心、宿影阵→宿影暗渡）。
   会保存 / 恢复 currentCastSkill，避免打乱外层正在结算的击杀收益判定。 */
/* ===== 无法行动：统一判定 =====
   【完整定义】
     · 不能施放任何技能（含额外技能）
     · 不能普攻
     · 跳过【行动阶段】（回合开始与回合结束照常结算）

   达成条件（来源）：① 被【放逐】（视为离开战局）② 【眩晕】（控制效果）

   ⭐ 关键边界：只有「需要角色本体去施放技能 / 普攻」的动作才受约束。
     · ✅ 受影响：主动施放、额外技能、普攻、印记触发的施放（宿影阵→宿影暗渡、守势→一誓归心）
     · ❌ 不受影响：被动效果的自动结算（攒层、免疫等）—— 那不需要本体出手
   新增施放点请统一走这里。 */
function cannotAct(unit) {
if (!unit || !unit.alive) return true;
if (unit.banished) return true;              // 放逐：视为离开战局
if (hasState(unit, '眩晕')) return true;      // 眩晕：控制效果
return false;
}
/* 无法行动时的统一提示（避免各处重复写日志） */
function logCannotAct(unit, skillName) {
if (!unit) return;
const reason = unit.banished ? '被放逐中' : (hasState(unit, '眩晕') ? '眩晕中' : '无法行动');
log(`${getSideLabel(unit)}${unit.name} ${reason}，无法施放「${skillName || '技能'}」！`, 'log-buff');
}
async function triggerSkill(unit, skill, target = null) {
if (!unit || !skill) return;
/* 回合外施放的总闸门：被放逐 / 眩晕者一律不能施放技能。
   例如被放逐的鬼金羊不会再对长星锁目标施放「鬼宿奇惊·谜夜」。 */
if (cannotAct(unit)) { logCannotAct(unit, skill.name); return; }
const savedSkill = gameState.currentCastSkill, savedCaster = gameState.currentCaster;
const savedAnimating = gameState.animating;
gameState.animating = true;
gameState.currentCastSkill = skill; gameState.currentCaster = unit;
await playSkillCutin(unit, skill.name, false, true);   // 触发式施放：与主动施放同为完整时长
log(`${getSideLabel(unit)}${unit.name} 施放了 ${skill.name}！`, 'log-skill');
await runSkillBranch(unit, skill, target);
/* 回合外施放同样算「行动」：① 可能附加「视」；② 触发「视」的伤害结算。 */
await afterAnyUnitAction(unit, skill);
/* 「未来」：回合外施放也算一次行动，同样恢复 10% 最大生命值。 */
if (unit.name === '虎杖悠仁' && hasRule(unit, '未来')) await miraiActionRestore(unit);
gameState.currentCastSkill = savedSkill; gameState.currentCaster = savedCaster;
gameState.animating = savedAnimating;
}
/* ===== 待施放队列 =====
   有些施放发生在**同步**调用链里（如 loseRage → 宿影阵满层），无法就地 await。
   统一推入队列，由最近的 flushPendingCasts 安全点**串行**演出，
   既保证「施放的是技能就有演出」，又不会多条演出互相打断。 */
/* queueSkillCast(unit, skill, target, opts)
   opts.onSuccess  → 施放成功后的回调（如「宿影阵」要在施放后才移除层数）
   opts.dedupeKey  → 去重键：已存在相同键时不再重复入队
     （满层印记在无法行动期间会反复触发，必须去重，否则解除后连放多次） */
function queueSkillCast(unit, skill, target = null, opts = {}) {
if (!unit || !skill) return;
gameState.pendingCasts = gameState.pendingCasts || [];
if (opts.dedupeKey && gameState.pendingCasts.some(c => c.dedupeKey === opts.dedupeKey)) return;
gameState.pendingCasts.push({ unit, skill, target, onSuccess: opts.onSuccess || null, dedupeKey: opts.dedupeKey || null });
}
/* ===== 无法行动解除后的补放入口 =====
   「无法行动」消失的时机通常是：持续时间结束（tick 到期）、驱散、移除。
   这些地方统一调用本函数，让排队中的施放【立刻】结算 ——
   否则满层印记（如宿影阵）的层数要等到下个回合才会被清掉。 */
async function flushAfterActionable() {
const q = gameState.pendingCasts || [];
if (q.length === 0) return false;
if (!q.some(c => c.unit && c.unit.alive && !cannotAct(c.unit))) return false;
await flushPendingCasts();
return true;
}
/* 同步标记版：驱散 / 移除这类【同步】操作无法就地 await，只打标记，
   由 gameLoop 下一帧检测到后立刻补放（不必等到下个回合的安全点）。 */
function requestFlushAfterActionable() {
if (!gameState.pendingCasts || gameState.pendingCasts.length === 0) return;
gameState.needFlushAfterActionable = true;
}
/* 消费队列。
   ★ 无法行动时**留队等待**而不是丢弃 —— 这样一旦无法行动消失（眩晕结束 / 放逐解除），
     最近的下一个安全点就会立刻补上这次施放。
     （满层印记「施放后才移除层数」，若中途丢弃会导致层数永远清不掉） */
async function flushPendingCasts() {
if (!gameState.pendingCasts || gameState.pendingCasts.length === 0) return;
const queue = gameState.pendingCasts;
gameState.pendingCasts = [];
const deferred = [];
for (const item of queue) {
const { unit, skill, target, onSuccess } = item;
if (!unit || !unit.alive) continue;
if (cannotAct(unit)) { deferred.push(item); continue; }   // 无法行动 → 留队，下个安全点再试
await triggerSkill(unit, skill, target);
if (onSuccess) await onSuccess();
}
gameState.pendingCasts = deferred.concat(gameState.pendingCasts);
}
// 按 key 施放额外技能（额外技能挂在 HERO_DATA[name].extraSkills 上）
async function castExtraSkill(unit, extraKey, target = null) {
const d = HERO_DATA[unit.name];
const skill = d && d.extraSkills ? d.extraSkills[extraKey] : null;
if (!skill) return false;
if (cannotAct(unit)) { logCannotAct(unit, skill.name); return false; }
await triggerSkill(unit, skill, target);
return true;
}
async function executeAction(unit, skill, forcedTarget = null) {
/* 无法行动的总闸门【防御性】：不能施放任何技能（含额外技能），也不能普攻。
   正常流程在 processUnitTurn 的行动阶段就已被挡下；这里再兜一层，
   保证将来任何新增的调用路径都不会绕过（如混乱、反击、AI 直调等）。 */
if (cannotAct(unit)) { logCannotAct(unit, skill && skill.name); gameState.animating = false; return; }
const blockReason = getSkillBlockReason(unit, skill);
if (blockReason) { log(`${getSideLabel(unit)}${blockReason}`, 'log-buff'); gameState.animating = false; return; }
gameState.animating = true;
// 以 __kind 判定种类，不再看 cost —— 「消耗 0 怒气的主动技」不会被误当成普攻
const isNormal = skill.__kind === 'normal';
const isExtra  = skill.__kind === 'extra';
/* 普攻动态化：两面宿傩的普攻按当前形态（解/捌）与强化状态生成，
   形态在「施放普攻之后」切换，因此必须在「执行时」而非「配置时」决定用哪一招。
   动态生成的对象要继承 __kind，否则后续判定会失效。 */
if (isNormal) { const dyn = getEffectiveNormalSkill(unit); if (dyn) { dyn.__kind = 'normal'; skill = dyn; } }
gameState.currentCastSkill = skill; gameState.currentCaster = unit;
const idx = idxOf(unit); const el = document.getElementById(`unit-${idx}`); unitAnimOn(idx, 'attack-anim');
// 怒气收支统一走 gainRage / spendRage：普攻回复；主动技按各自 cost 扣除（不再固定 4）；额外技能不收支
const cost = Number(skill.cost) || 0;
if (isNormal) gainRage(unit, RAGE_PER_NORMAL);
else if (!isExtra && cost > 0) spendRage(unit, cost);
/* 束缚 2 件套：行动阶段施放【主动技能】时，若剩余怒气足够，额外消耗 1 点
   → 本回合最终伤害 +30%（至回合结束，endTurn 时清零）。
   限定主动技（__kind === 'active'）：普攻不算「施放技能」；额外技能多为他人回合内触发
   （如守势反击的「一誓归心」），不属于「行动阶段施放」，同样不触发。
   判定放在技能结算【之前】：本回合这次技能本身就能吃到 30% 加成。 */
if (!isNormal && !isExtra) await tryApplyShufu(unit);
// 技能演出：技能（含 0 怒气技能）必播；普攻由 SKILL_CUTIN_FOR_NORMAL 控制（默认关）
await playSkillCutin(unit, skill.name, isNormal);
log(`${getSideLabel(unit)}${unit.name} 使用了 ${skill.name}！`, isNormal ? 'log-normal' : 'log-skill');
await runSkillBranch(unit, skill, forcedTarget);
/* 「未来」：每次行动后恢复 10% 最大生命值。 */
if (unit.name === '虎杖悠仁' && hasRule(unit, '未来')) await miraiActionRestore(unit);
/* 技能冷却统一入口：任何带 cooldown 的技能施放后都会进入冷却，
   不必各自在 selfEffect 里重复设置（万法皆空里的那处保留也无害，两者一致）。 */
if (skill.cooldown) {
unit.skillCooldowns = unit.skillCooldowns || {};
unit.skillCooldowns[skill.name] = Number(skill.cooldown) || 0;
}
/* 两面宿傩被动：普攻在「解」与「捌」之间切换，**施放普攻之后**切换一次（初始为「解」）。
   放在普攻结算后、endTurn 之前 —— 第一回合打出「解」，本回合结束后才变成「捌」，
   下回合打出「捌」，再切回「解」。施放主动技（伏魔神龛）不切换。 */
if (unit.name === '两面宿傩' && isNormal) {
unit.sukunaForm = unit.sukunaForm === 'jie' ? 'ba' : 'jie';
log(`🔄 ${getSideLabel(unit)}${unit.name} 切换普攻形态 → ${unit.sukunaForm === 'jie' ? '解' : '捌'}`, 'log-buff');
}
unitAnimOff(idx, 'attack-anim'); el?.classList.remove('acting');
/* 行动后统一钩子：① 施放技能 → 五条悟附加「视」；② 结算「视」的 40% 伤害。
   放在 endTurn 之前 —— 此时仍处在该单位的行动期间。 */
await afterAnyUnitAction(unit, skill);
if (!isExtra) await endTurn(unit);   // 额外技能在他人回合触发，不能结束回合
}
/* 束缚 2 件套：施放主动技能时额外消耗 1 点怒气，换来本回合最终伤害 +30%。
   「若怒气足够」= 付完技能 cost 之后还剩至少 1 点 —— 与「额外消耗」的语义一致：
   怒气刚好够放技能时不触发（否则会变成「放不出技能」），有余量才自动加码。 */
async function tryApplyShufu(unit) {
if (typeof SHENHUN === 'undefined' || !SHENHUN.hasSetTwoPiece) return;
if (!SHENHUN.hasSetTwoPiece(unit, '束缚')) return;
const extra = Number(SHENHUN.SHUFU_RAGE_COST) || 1;
if ((Number(unit.rage) || 0) < extra) return;
if (!spendRage(unit, extra)) return;
unit.shufuFinalDmg = Number(SHENHUN.SHUFU_FINAL_DMG_RATE) || 0.3;
const pct = Math.round(unit.shufuFinalDmg * 100);
log(`⛓️ ${getSideLabel(unit)}${unit.name} 的束缚触发！额外消耗 ${extra} 点怒气，本回合最终伤害 +${pct}%`, 'log-buff');
refreshUnit(unit);
await sleep(200);
}
// 参数顺序遵循全局约定：(施法者, 伤害包, 目标)
async function applyDamageWithShield(attacker, result, target) {
if (!target.alive) return { damageToHp: 0, absorbed: 0 };
let damageToHp = result.damage;
let absorbed = 0;
const shieldVal = Number(target.shield) || 0;
if (shieldVal > 0) {
absorbed = Math.min(shieldVal, damageToHp);
target.shield = Math.max(0, shieldVal - absorbed);
damageToHp -= absorbed;
showFloatingText(target, `盾-${absorbed}`, 'floating-shield');
if (target.shield <= 0) {
target.shield = 0;
log(`${getSideLabel(target)}${target.name} 的护盾被击破！`, 'log-buff');
}
refreshUnit(target);
}
return { damageToHp, absorbed };
}
async function performSingleAttack(attacker, skill, target) {
unitAnimOn(idxOf(attacker), 'attack-anim'); await sleep(300);
/* 多段命中两种写法：
   · hitCount  —— 同一段重复 N 次（带土普攻两段 63%）；
   · segments  —— 每段倍率不同（虎杖「径庭拳」50%/70%、「斩击·领域」三段 80%）。
   两者都逐段独立走一遍伤害公式（每段独立判定暴击 / 黑闪 / 百穿）。 */
const segs = (Array.isArray(skill.segments) && skill.segments.length) ? skill.segments : null;
const hitCount = segs ? segs.length : Math.max(1, Math.floor(Number(skill.hitCount) || 1));
// actualDirect = 主目标「实际受到」的直接伤害（扣盾后、免疫/代伤后为 0）
let actualDirect = 0;
for (let i = 0; i < hitCount; i++) {
if (!target.alive) break;
const seg = calculateDamage(attacker, segs ? segs[i] : skill, target);
for (const r of seg) {
const hpBefore = target.hp;
await applyDamage(attacker, r, target);
if (!r.isTrue && !r.isSplash) actualDirect += Math.max(0, hpBefore - target.hp);
}
}
if (hitCount > 1) log(`${getSideLabel(attacker)}${attacker.name} 的${skill.name} 命中 ${hitCount} 段！`, 'log-damage');
/* 单体技能的固定伤害：目标最大生命值 × 比例（如两面宿傩「灶」的 10%）。
   此前只有 AOE 与宿傩普攻处理了 fixedMaxHpRate，单体技能会静默漏掉这一段。 */
if (skill.fixedMaxHpRate && target.alive) {
const fixed = Math.floor((Number(target.maxHp) || 0) * skill.fixedMaxHpRate);
if (fixed > 0) await applyFixedDamage(attacker, target, fixed, `${skill.name}·固定伤害`);
}
// 附加效果只在整次技能结束后结算一次（带土普攻两段只加 1 层神威，与段数无关）
if (skill.effect) await applySkillEffect(attacker, target, skill.effect);
// 溅射伤害：由「主目标实际受到的直接伤害」按系数派生，不再重复走伤害公式。
// 因此溅射不吃目标的免伤率、最终免伤率，也不做独立暴击判定 —— 其余敌人一律承受同样的数值。
// 例：主目标实际受到 1000 直接伤害、溅射 40% → 其余每个敌人各受 400。
// 注意：主目标若免疫（虚化）、被护盾全吸收、或被白藏主代伤，实际受到为 0 → 溅射同样为 0。
const splashRate = Number(skill.splashRate) || 0;
if (splashRate > 0 && actualDirect > 0) {
const splashDamage = Math.max(0, Math.floor(actualDirect * splashRate));
const splashTargets = getAliveEnemies(attacker).filter(u => u !== target);
if (splashTargets.length > 0) log(`溅射命中 ${splashTargets.length} 个目标，各受 ${splashDamage} 点溅射伤害！`, 'log-damage');
for (const st of splashTargets) await applyDamage(attacker, { damage:splashDamage, isCrit:false, isTrue:false, isSplash:true }, st);
}
await sleep(200);
}
// 群体型效果：效果本身就作用于「敌方全体」，整次AOE只能结算一次。
// 若放在逐个目标的循环里，会被执行 N 次（N=敌人数），例如推条 40% × 6 = 240% 直接把行动条清空。
const AOE_ONCE_EFFECTS = new Set(['dispelAndPush']);
async function performAoeAttack(attacker, skill) {
const targets = getAliveEnemies(attacker);
unitAnimOn(idxOf(attacker), 'attack-anim'); await sleep(300);
const perTargetEffect = (skill.effect && !AOE_ONCE_EFFECTS.has(skill.effect)) ? skill.effect : null;
const onceEffect = (skill.effect && AOE_ONCE_EFFECTS.has(skill.effect)) ? skill.effect : null;
const aoeExFlag = !!skill.canExecute;
/* segments：同一技能内各段倍率不同（虎杖「斩击·领域」强化的追加全体三段 80%）。
   逐段独立结算，与 performSingleAttack 口径一致。 */
const aoeSegs = (Array.isArray(skill.segments) && skill.segments.length) ? skill.segments : [skill];
for (const target of targets) {
for (const seg of aoeSegs) {
if (!target.alive) break;
for (const r of calculateDamage(attacker, seg, target)) {
await applyDamage(attacker, aoeExFlag ? { ...r, canExecute:true } : r, target);
if (!target.alive) break;
}
}
// 固定伤害：目标最大生命值 × 比例（伏魔神龛）。不受任何影响、无视护盾
if (skill.fixedMaxHpRate && target.alive) {
const fixed = Math.floor((Number(target.maxHp) || 0) * skill.fixedMaxHpRate);
if (fixed > 0) await applyFixedDamage(attacker, target, fixed, `${skill.name}·固定伤害`, aoeExFlag);
}
/* 技能自带的斩杀（如「伏魔神龛」）：造成伤害后目标生命低于阈值则即死，逐个目标独立判定。
   与普攻「捌」的区别：普攻的 canExecute 只在【伏魔强化】下才置上，技能则是常驻。
   斩杀属即死效果、不经过伤害结算，因此无视护盾与虚化。 */
if (skill.canExecute && target.alive) {
const ratio = (Number(target.hp) || 0) / (Number(target.maxHp) || 1);
if (ratio < SUKUNA_EXECUTE_BELOW) await executeKillTarget(attacker, target, `${skill.name}·斩杀`);
}
if (perTargetEffect) await applySkillEffect(attacker, target, perTargetEffect);
}
// 群体型效果独立于伤害循环，整次技能只触发一次，并明确传入本次命中的目标集合
if (onceEffect) await applySkillEffect(attacker, targets[0] || null, onceEffect, targets);
await sleep(200);
}
/* ---- 战斗属性统一入口 ----
   任何需要「攻击 / 暴击率 / 暴击伤害 / 最终伤害率」的地方都必须走这里，
   保证印记与状态的加成一视同仁（神威、真实伤害等派生伤害同样要吃到 buff）。
   结算顺序固定：① 固定值加成 → ② 百分比加成（超凡邪力）→ ③ 状态加成（牵绊→百豪）→ ④ 最终伤害率
   注：速度加成不在此，走 getEffectiveSpd()。 */
function getEffectiveCombatStats(unit) {
if (!unit) return { atk:0, critRate:0, critDmg:1.5, finalDmgRate:1 };
let atk = Number(unit.atk) || 0;
let critRate = Number(unit.critRate) || 0;
let critDmg = Number(unit.critDmg) || 1.5;
let finalDmgRate = Number(unit.finalDmgRate) || 1.0;
const marks = unit.marks || [];
const stacksOf = t => { const m = marks.find(x => x.type === t); return m ? (m.stacks || 1) : 0; };
const has = t => marks.some(m => m.type === t);
// ① 固定值
if (has('狂风')) atk += 150 * stacksOf('狂风');
// ② 百分比（顺序固定，保证结果可复现）
if (has('超凡邪力')) {
const s = stacksOf('超凡邪力');
atk += Math.floor(atk * 0.2 * s);
critRate += 0.1 * s; critDmg += 0.2 * s; finalDmgRate += 0.1 * s;
}
const zhaojun = getMark(unit, '照君');
if (zhaojun) atk += Math.floor(atk * 0.08 * (zhaojun.stacks || 1));  // 照君：+8% 攻击/层（最多5层）
// ③ 状态（百豪为增益状态，与牵绊同级）
if ((unit.states || []).some(s => s.type === '牵绊')) atk += Math.floor(atk * 0.25);
if ((unit.states || []).some(s => s.type === '百豪')) atk += Math.floor(atk * 0.1);
// ④ 最终伤害率（纯加法，顺序无关）
if (has('龙之舞')) finalDmgRate += 0.15 * stacksOf('龙之舞');
if (has('雷压')) { finalDmgRate += 0.2; critRate += 0.3; }
if (has('大妖之力')) finalDmgRate += clamp01(1 - ((Number(unit.hp) || 0) / (Number(unit.maxHp) || 1)));
/* 无双 2 件套：自身每损失 1% 最大生命值，提升 0.5% 暴击伤害。
   走「有效属性」层而非基础层 —— 暴伤随血量实时变化，基础层只在开局算一次。 */
if (typeof SHENHUN !== 'undefined' && SHENHUN.calcWushuangCritDmgBonus) {
critDmg += SHENHUN.calcWushuangCritDmgBonus(unit);
}
/* 束缚 2 件套：行动阶段施放技能时额外消耗 1 点怒气 → 本回合最终伤害 +30%。
   同样走「有效属性」层：有效期只有一回合，战斗层在回合结束时把标记清 0。 */
if (typeof SHENHUN !== 'undefined' && SHENHUN.calcShufuFinalDmgBonus) {
finalDmgRate += SHENHUN.calcShufuFinalDmgBonus(unit);
}
/* 虎杖悠仁「未来」（规则）：攻击 +50%、暴击率 +30%。
   放在其它加成之后，让百分比放大已叠好的攻击；暴击率只喂黑闪溢出（虎杖自身无法暴击）。 */
if (hasRule(unit, '未来')) {
atk = Math.floor(atk * (1 + MIRAI_ATK_RATE));
critRate += MIRAI_CRIT_RATE;
}
return { atk, critRate, critDmg, finalDmgRate };
}
// 守方防御 / 最终免伤的统一入口
function getEffectiveDefStats(unit) {
if (!unit) return { def:0, finalReduction:0 };
let def = Number(unit.def) || 0;
let finalReduction = Number(unit.finalDmgReduction) || 0;
const marks = unit.marks || [];
const stacksOf = t => { const m = marks.find(x => x.type === t); return m ? (m.stacks || 1) : 0; };
const has = t => marks.some(m => m.type === t);
if (has('狂风')) def += 100 * stacksOf('狂风');
if (has('守势')) def += SHOUSHI_DEF_BONUS;   // 心友犬神「守势」：固定 +270 防御
if (has('狐守')) finalReduction += 0.2;
if (has('狐佑')) finalReduction += 0.25;
if (has('大妖之力')) {
/* 注意：这里的【最终免伤率】不翻倍。
   鬼王酒吞童子被动「红莲」只让「大妖之力」的【最终伤害率】部分翻倍，
   免伤部分对所有人（含他自己）都按原值结算。 */
finalReduction += clamp01(1 - ((Number(unit.hp) || 0) / (Number(unit.maxHp) || 1))) * 0.5;
}
if ((unit.states || []).some(s => s.type === '牵绊')) def += Math.floor(def * 0.1);
return { def, finalReduction };
}
/* ===== 虎杖悠仁「黑闪·登神」/「未来」 =====
   黑闪把「本次伤害值」改写为伤害结果的 HEISHAN_EXPONENT 次方（JJK 原作设定：2.5 乗）。
   抽成单独常量是想改成「×2.5 倍」时只需换这一个函数，不必翻遍伤害公式。 */
const HEISHAN_BASE_CHANCE = 0.05;
const HEISHAN_EXPONENT = 2.5;
const MIRAI_ATK_RATE = 0.5;               // 未来：攻击 +50%
const MIRAI_SPD_RATE = 0.2;               // 未来：速度 +20%
const MIRAI_CRIT_RATE = 0.3;              // 未来：暴击率 +30%（虎杖无法暴击，只用于黑闪溢出）
const MIRAI_ACTION_RESTORE_RATE = 0.1;    // 未来：每次行动后恢复 10% 最大生命
const ITADORI_HUNLUAN_DURATION = 1;       // 斩击·领域：混乱持续 1 回合
function heishanDamage(base) { return Math.floor(Math.pow(Math.max(0, base), HEISHAN_EXPONENT)); }

/* 本函数只负责「直接伤害」与「真实伤害」两种类型；溅射伤害不在此计算，
   而是由 performSingleAttack 依据主目标实际受到的直接伤害按系数派生。 */
function calculateDamage(attacker, skill, target) {
// 攻防属性统一取「有效值」，速度加成不参与伤害计算（走 getEffectiveSpd）
const { atk, critRate, critDmg, finalDmgRate } = getEffectiveCombatStats(attacker);
const { def: rawDef, finalReduction } = getEffectiveDefStats(target);
/* 百穿 2 件套：攻击时 50% 直接概率无视目标 50% 防御。
   只影响【直接伤害】的免伤率 —— 真实伤害本就无视防御，无需参与。
   逐段独立判定（与暴击同口径）：多段技能每一段各自 roll 一次。 */
let def = rawDef;
if (typeof SHENHUN !== 'undefined' && SHENHUN.rollBaichuanDefFactor) {
const factor = SHENHUN.rollBaichuanDefFactor(attacker);
if (factor < 1) {
def = def * factor;
log(`🛡️ ${getSideLabel(attacker)}${attacker.name} 的百穿触发！无视 ${getSideLabel(target)}${target.name} ${Math.round((1 - factor) * 100)}% 防御`, 'log-buff');
}
}
const results = [];
// 公式③：免伤率 = 防御 ÷ (防御 + 目标攻击)；防御与攻击均已套用印记/状态修正
const dodgeRate = (def + atk) > 0 ? def / (def + atk) : 0;
const actualDodge = clamp01(dodgeRate);
/* 暴击率不做上限钳制：面板 + 神魂 + 雷压 / 超凡邪力等叠加后允许超过 100%，
   留待后续「暴击抵抗」等减益在有效属性层抵消（溢出部分应能被抵抗吃回去）。 */
const isCrit = !attacker.noCrit && Math.random() < critRate;
const critMultiplier = isCrit ? critDmg : 1.0;
// 公式①/②【直接伤害】：攻击 × 技能伤害率 × (1-免伤率) × 最终伤害率 × (1-最终免伤率) [× 暴击伤害率]
const reduction = clamp01(finalReduction);
if (skill.dmgRate && skill.dmgRate > 0) { let dmg = atk * skill.dmgRate * (1-actualDodge) * finalDmgRate * (1-reduction) * critMultiplier; results.push({ damage:Math.max(0, Math.floor(dmg)), isCrit, isTrue:false, isSplash:false }); }
// 公式⑤【真实伤害】：攻击 × 技能伤害率 × 最终伤害率 [× 暴击伤害率]，无视防御与最终免伤
if (skill.trueRate && skill.trueRate > 0) { let trueDmg = atk * skill.trueRate * finalDmgRate * critMultiplier; results.push({ damage:Math.max(0, Math.floor(trueDmg)), isCrit, isTrue:true, isSplash:false }); }
/* 虎杖悠仁「黑闪」：攻击时按概率把【本次伤害值】改写为伤害结果的 2.5 次方。
   逐段独立判定（与暴击同口径）：多段技能的每一段各自 roll 一次。
   概率 = 5% + 暴击率超过 100% 的溢出值（等量提升）；自身无法暴击由上面的 noCrit 保证。
   这里只打标记，进入「未来」的副作用放到 applyDamage 里结算，保持本函数为纯计算。 */
if (attacker.name === '虎杖悠仁' && isPassiveActive(attacker)) {
const overflow = Math.max(0, (Number(critRate) || 0) - 1);
const heishanChance = HEISHAN_BASE_CHANCE + overflow;
results.forEach(r => {
if (Math.random() < heishanChance) { r.damage = heishanDamage(r.damage); r.isHeishan = true; }
});
}
return results;
}
/* ===== 虎杖悠仁「未来」的进入 / 行动后恢复 =====
   规则类效果（duration 999，不驱散、不叠加），走 addRule 与 updateBuffDisplay 的橙色规则标签。 */
async function enterMirai(unit) {
if (!unit || !unit.alive || hasRule(unit, '未来')) return false;
/* 第一次黑闪：从 battle2 / battle3 里随机定一张，之后整场不再重掷。
   房主在这里掷，下标随快照同步给客机，双方画面一致。 */
const pick = (HERO_BATTLE_IMG[unit.name] || {}).miraiPick;
if (pick && pick.length && unit.miraiBattlePick == null) {
unit.miraiBattlePick = Math.random() < 0.5 ? 0 : 1;
}
addRule(unit, '未来', { duration:999, effect:'mirai' });
log(`⚡ ${getSideLabel(unit)}${unit.name} 首次触发「黑闪」，登神进入「未来」！攻击+50%　速度+20%　暴击率+30%`, 'log-buff');
/* 进入时恢复 100% 最大生命值：走「恢复」口径（固定数值，不受加成 / 减免 / 暴击影响）。 */
await performRestore(unit, Number(unit.maxHp) || 0, unit);
refreshUnit(unit);
refreshBattleImages();   // 「未来」会换战斗图：卡片背景 / 圆点立刻跟上
return true;
}
/* 「未来」：每次行动后恢复 10% 最大生命值。回合外施放（triggerSkill）也算一次行动。 */
async function miraiActionRestore(unit) {
if (!unit || !unit.alive || !hasRule(unit, '未来')) return;
const amount = Math.floor((Number(unit.maxHp) || 0) * MIRAI_ACTION_RESTORE_RATE);
if (amount > 0) await performRestore(unit, amount, unit);
}
// 死亡判定唯一入口：置死、播日志、刷新，并结算击杀者收益（维迦的超凡邪力等）
async function killUnit(unit, killer) {
if (!unit || !unit.alive) return false;
/* 雪拉比「预知未来」记录期：记下阵亡者与其「阵亡时的行动条位置」，供复活时还原。 */
if (gameState.damageLogSide && unit.side === gameState.damageLogSide) {
gameState.damageLogFallen = gameState.damageLogFallen || [];
gameState.damageLogFallen.push({ idx: idxOf(unit), actionValue: Number(unit.actionValue) || 0 });
}
unit.alive = false; unit.hp = 0;
// 阵亡即清空全部 buff / 效果（状态 / 印记 / 规则 / 护盾 / 虚化 / 放逐）
clearAllEffects(unit);
/* ── 随施放者阵亡清空 ──
   以下印记挂在他人身上，自身的 clearAllEffects 清不到，必须在这里单独处理。
   统一用 applierSide 判断归属：双方各有同名角色时，一方阵亡只清自己附加的。 */
{
/* 大妖之力：鬼吞用阵营判断（先机全体赋予，未记 applierSide） */
if (unit.name === '鬼王酒吞童子') {
const cleared = gameState.units.filter(u => u.side === unit.side && removeMarkIfHas(u, '大妖之力'));
cleared.forEach(u => refreshUnit(u));
if (cleared.length > 0) log(`💀 ${getSideLabel(unit)}鬼王酒吞童子 阵亡，全体的「大妖之力」随之消散！`, 'log-buff');
}
/* 其余印记统一用 applierSide 判断（视、狐守、流光、雀之印、长星锁、神威） */
const sideMarks = ['视', '狐守', '流光', '雀之印', '长星锁', '神威'];
const clearedMarks = gameState.units.filter(u => {
const found = sideMarks.filter(m => {
const mk = getMark(u, m);
if (!mk) return false;
return !mk.applierSide || mk.applierSide === unit.side;
});
if (found.length === 0) return false;
found.forEach(m => removeMark(u, m));
return true;
});
clearedMarks.forEach(u => refreshUnit(u));
}
log(`💀 ${getSideLabel(unit)}${unit.name} 被击败了！`, 'log-death');
refreshUnit(unit);
removeActionBarDot(unit);   // 死亡即从行动条移除，不再残留
/* 若阵亡者正是某次放逐的施放者（带土 / 狱门疆装备者），其维持的放逐立即失效。
   放逐的倒计时由施放者的回合驱动，施放者一死就再也无人推进，
   被放逐者会被永久卡在内部空间 —— 因此这里直接解除。
   用 filter 覆盖「同一施放者同时维持多个放逐」的情况。 */
const banishedVictims = gameState.units.filter(u => u.banished && u.banishedBy === unit);
banishedVictims.forEach(v => {
const rule = getRule(v, '放逐');
const place = (rule && rule.effect === 'prisonRealm') ? '狱门疆内部空间' : '神威空间';
v.banishedBy = null; removeRule(v, '放逐');
unlockActionValue(v, 0);
log(`${getSideLabel(unit)}${unit.name} 阵亡，${getSideLabel(v)}${v.name} 从${place}返回！`, 'log-skill');
refreshUnit(v); updateActionBarDots();
});
if (!killer || killer.side === unit.side) return true;
/* 维迦击杀收益（每回合只触发一次）：
     - 普攻「黑暗祭祀」击杀：只给 1 层超凡邪力
     - 主动技「能量爆裂」击杀：超凡邪力 + 4 点怒气 + 行动条 +60 + 恢复最大生命 30%
   判定用本次记录的施放技能，不能只看击杀者名字，否则普攻也会领到主动技的收益。 */
if (killer.name === '维迦' && !gameState.vayneKillThisTurn) {
const castSkill = gameState.currentCastSkill;
/* 按「技能名」比对而非对象引用：技能对象若被克隆（存档读档、JSON 序列化等），
   引用比较会失效导致主动技收益被误判成普攻收益。技能名在角色内唯一，用它做判据更稳。 */
/* 施放者 + 「主动技」双重确认。用 __kind 而非逐个比对技能名：
   英雄可能有多个技能，逐个比对会漏；__kind 是唯一权威来源。 */
const byActiveSkill = gameState.currentCaster === killer && !!castSkill && castSkill.__kind === 'active';
/* 全套收益只给「能量爆裂」（skill2）：两技能都用 vayneFullKill 标记区分，
   新增技能时只需在配置里标 true/false，不必改这里的判定。 */
const fullKill = byActiveSkill && castSkill.vayneFullKill === true;
const dm = addMark(killer, '超凡邪力', { stacks:1, maxStacks:5, duration:999, effect:'darkEssence' });
const dmStacks = dm ? dm.stacks : 0;
if (fullKill) {
const rageGained = gainRage(killer, VAYNE_KILL_RAGE);
// 行动条走统一入口：此时仍在自己回合内，加成会登记到 pendingActionBonus，回合结束后才落地
grantActionValueBonus(killer, VAYNE_KILL_BONUS, '击杀');
// 恢复自身最大生命值 30%：固定数值 → 走【恢复】（不受治疗加成/减免/暴击影响）
const healAmount = Math.floor(killer.maxHp * VAYNE_KILL_HEAL_RATE);
const healed = await performRestore(killer, healAmount, null);
log(`${getSideLabel(killer)}${killer.name} 获得1层超凡邪力！(当前${dmStacks}层)，行动条+${VAYNE_KILL_BONUS}%（回合结束后生效），怒气+${rageGained}，恢复 ${healed} HP（最大生命${Math.round(VAYNE_KILL_HEAL_RATE*100)}%）！`, 'log-buff');
} else {
log(`${getSideLabel(killer)}${killer.name} 获得1层超凡邪力！(当前${dmStacks}层)`, 'log-buff');
}
gameState.vayneKillThisTurn = true;
refreshUnit(killer);
}
return true;
}
// 记账唯一入口：伤害/吸收统一累加到攻守双方统计，并喂给雪拉比的伤害记录
function recordDamage(attacker, target, amount) {
if (!attacker || !target || !(amount > 0)) return;
addStat(attacker, 'statsDamageDealt', amount);
addStat(target, 'statsDamageTaken', amount);
if (gameState.damageLogSide && target.side === gameState.damageLogSide) gameState.damageLogTotal = (Number(gameState.damageLogTotal) || 0) + amount;
}
/* 心友犬神「守势」反击：独立成函数，因为【固定伤害】同样要触发它
   （固定伤害也是「受到攻击」，符合守势的反击条件）。
   触发限制（两条同时生效）：
     · 每个单位的回合内最多 1 次（gameState.shouShiTurnCount，processUnitTurn 开头重置）
     · 心友犬神自身回合开始前最多 4 次（dog.shouShiRoundCount，犬神回合开始重置）
   shouShiFiring 守卫阻断递归（反击本身也走 applyDamage）。 */
async function tryShoushiCounter(attacker, finalTarget, hadShieldWhenHit) {
if (!attacker || !finalTarget) return;
const shouShiDog = hadShieldWhenHit ? getAliveAllies(finalTarget).find(u => u.name === '心友犬神' && hasMark(u, '守势')) : null;
if (!shouShiDog || gameState.shouShiFiring || attacker.side === shouShiDog.side) return;
const turnUsed = Number(gameState.shouShiTurnCount) || 0;
const roundUsed = Number(shouShiDog.shouShiRoundCount) || 0;
if (turnUsed >= SHOUSHI_MAX_PER_TURN || roundUsed >= SHOUSHI_MAX_PER_ROUND) return;
gameState.shouShiTurnCount = turnUsed + 1;
shouShiDog.shouShiRoundCount = roundUsed + 1;
/* shouShiFiring 守卫同时保证两件事：
   ① 阻断递归（一誓归心是 AOE 伤害，会再次命中带盾目标）；
   ② 「一誓归心不触发对方守势」—— 对方犬神的 tryShoushiCounter 会被这个守卫挡下。 */
gameState.shouShiFiring = true;
try {
log(`${getSideLabel(shouShiDog)}心友犬神的守势！施放「一誓归心」！（本回合第${gameState.shouShiTurnCount}次，本轮第${shouShiDog.shouShiRoundCount}/${SHOUSHI_MAX_PER_ROUND}次）`, 'log-skill');
await castExtraSkill(shouShiDog, 'yiShiGuiXin');
} finally { gameState.shouShiFiring = false; }
}

/* 【固定伤害】—— 独立伤害类型（顺序统一见 DAMAGE_TYPES）。严谨定义：
      固定伤害是一种伤害类型，无视护盾，无法被转移，伤害量为条件固定值。
   逐条对应实现：
   · 伤害量为条件固定值：由调用方按条件算出（如「目标最大生命 × 10%」），
     不走伤害公式、不判暴击、不吃攻击/免伤率/最终伤害率/最终免伤率
   · 无视护盾：直接扣减生命值，不经过 applyDamageWithShield
   · 无法被转移：直接作用于目标本人，**不走 applyDamage，因此白藏主「狐守」代伤不生效**
   · 仍会触发心友犬神「守势」反击（符合"拥有护盾的友方单位受到攻击时"的条件）
   · 虚化（免疫伤害）依然生效 —— 虚化是规则级免疫，不属于伤害计算 */
async function applyFixedDamage(attacker, target, amount, label = '固定伤害', canExecute = false) {
if (!target || !target.alive) return 0;
const dmg = Math.max(0, Math.floor(Number(amount) || 0));
if (dmg <= 0) return 0;
/* 放逐：免疫伤害（含固定伤害） */
/* 放逐：无法选中 → 不算被攻击目标，守势不触发。 */
if (target.banished) { showFloatingText(target, '免疫', 'floating-miss'); log(`${getSideLabel(target)}${target.name} 被放逐中，免疫${label}！`, 'log-buff'); return 0; }
/* 虚化：仍算受到攻击 —— 先用受击前的护盾快照判守势，再免疫伤害。 */
if (target.intangible) {
await tryShoushiCounter(attacker, target, (Number(target.shield) || 0) > 0);
showFloatingText(target, '免疫', 'floating-miss'); log(`${getSideLabel(target)}${target.name} 处于虚化，免疫${label}！`, 'log-buff'); return 0;
}
const hadShieldWhenHit = (Number(target.shield) || 0) > 0;
const before = target.hp;
target.hp = Math.max(0, target.hp - dmg);
const dealt = before - target.hp;
showFloatingText(target, `${label} -${dealt}`, 'floating-fixed');
if (dealt > 0) recordDamage(attacker, target, dealt);
log(`${getSideLabel(target)}${target.name} 受到 ${dealt} 点${label}！（无视护盾、无法被转移）`, 'log-damage');
refreshUnit(target);
await tryShoushiCounter(attacker, target, hadShieldWhenHit);
/* 【斩杀】固定伤害同样可能把血量打到阈值以下 —— 「过程中」判定，先于死亡判定。 */
if (canExecute && target.alive) {
const exRatio = (Number(target.hp) || 0) / (Number(target.maxHp) || 1);
if (exRatio < SUKUNA_EXECUTE_BELOW) { await executeKillTarget(attacker, target, '斩杀'); return dealt; }
}
/* 稻草人：致死那一跳也要等量传导给连接目标。
   放在退场之前，与 applyDamage 的「先传导、后死亡判定」口径一致，
   日志顺序也更自然（不会出现「先消散、后传导」）。 */
if (dealt > 0) await conductSummonDamage(attacker, target, dealt);
/* 受击后被动（如两面宿傩「斩击反转」）：固定伤害属于【伤害】，
   且无视护盾必然造成实际生命损失，因此照样触发（门槛 hpLoss > 0 天然满足）。 */
if (target.alive && dealt > 0) await applyPassiveOnDamaged(target, attacker, dealt);
/* ★ 不再就地 killUnit —— 固定伤害属于【伤害】，致死必须走统一死亡流程，
   否则会绕过东丈「不屈」这类「受到致命伤害时」的免死被动。
   统一分流同时保证：稻草人若被固定伤害打碎，走退场而不是角色阵亡流程。 */
await handleLethalDamage(target, attacker);
return dealt;
}

/* 【传导伤害】—— 独立伤害类型（顺序统一见 DAMAGE_TYPES）。定义（钉崎野蔷薇「共鸣」/「稻草人」）：
      不参与伤害公式计算，直接造成伤害，无视护盾。
   逐条对应实现：
   · 伤害量 = 另一次伤害的【实际数值】（调用方算好传入），不再乘任何倍率/免伤率/暴击
   · 无视护盾：直接扣减生命值，不经过 applyDamageWithShield
   · 直接作用于目标本人：不走 applyDamage，因此白藏主「狐守」代伤不生效
   · 虚化 / 放逐依旧是规则级免疫（与固定伤害同口径）
   ★ 刻意【不经过 applyDamage】：稻草人的「受伤→等量传导」挂在 applyDamage 里，
     若传导伤害再走一次 applyDamage，打到稻草人就会二次传导、形成链。
     作为「直接造成伤害」的独立类型，它只结算生命损失、统计与受击后被动。 */
async function applyConductionDamage(attacker, target, amount, label = '传导伤害') {
if (!target || !target.alive) return 0;
const dmg = Math.max(0, Math.floor(Number(amount) || 0));
if (dmg <= 0) return 0;
if (target.banished) { showFloatingText(target, '免疫', 'floating-miss'); log(`${getSideLabel(target)}${target.name} 被放逐中，免疫${label}！`, 'log-buff'); return 0; }
if (target.intangible) { showFloatingText(target, '免疫', 'floating-miss'); log(`${getSideLabel(target)}${target.name} 处于虚化，免疫${label}！`, 'log-buff'); return 0; }
const before = target.hp;
target.hp = Math.max(0, target.hp - dmg);
const dealt = before - target.hp;
showFloatingText(target, `${label} -${dealt}`, 'floating-conduction');
if (dealt > 0) recordDamage(attacker, target, dealt);
/* 日志里写明【来源】：共鸣的来源是钉崎本人，稻草人传导的来源是对稻草人造成伤害的角色。
   既让玩家看得见归属，也和内部 attacker（记账 / 击杀者）完全一致。 */
log(`${getSideLabel(target)}${target.name} 受到来自 ${attacker ? attacker.name : '未知'} 的 ${dealt} 点${label}！（不参与伤害公式、无视护盾、无法被转移）`, 'log-damage');
refreshUnit(target);
/* 同上：稻草人死于传导伤害时，致死那一跳仍要传给连接目标，且必须先于退场结算。 */
if (dealt > 0) await conductSummonDamage(attacker, target, dealt);
if (target.alive && dealt > 0) await applyPassiveOnDamaged(target, attacker, dealt);
await handleLethalDamage(target, attacker);
return dealt;
}

/* 稻草人「共鸣」：稻草人受到的伤害，等量传导给连接目标。
   三种扣血路径（applyDamage / applyFixedDamage / applyConductionDamage）都调这里，
   保证「稻草人受到的伤害」不因伤害类型而漏掉传导。
   ★ 传导伤害的【来源】是「对稻草人造成伤害的那个角色」（attacker），不是稻草人自己：
     · 记账、受击后被动、致死时的击杀者一律按该角色算
     · 因此维迦等角色通过稻草人传导致死连接目标，照常触发击杀收益
     · 但【直接打死稻草人】仍走 despawnSummon 退场，不触发任何击杀收益
     · 钉崎「共鸣」的传导是另一条路径，来源恒为钉崎本人
   ★ 传导伤害本身不会再进 applyDamage，且连接目标必为正常角色（全场只有一个召唤物），
     因此链最多两跳，不会无限递归。 */
async function conductSummonDamage(attacker, summon, dealt, label = '稻草人·传导') {
if (!summon || !summon.isSummon || !(dealt > 0)) return;
const linked = summon.linkedTarget;
if (!linked || !linked.alive || linked === summon || linked.isSummon) return;
log(`🎎 ${getSideLabel(summon)}稻草人 受到的 ${dealt} 点伤害传导给 ${getSideLabel(linked)}${linked.name}！`, 'log-skill');
await applyConductionDamage(attacker, linked, dealt, label);
}

/* ===== 血量归零的统一分流（唯一入口）=====
   召唤物不是角色：不走免死被动、击杀收益、阵亡日志，直接退场（despawnSummon）。
   角色才走 resolveLethal（东丈「不屈」等免死）或 killUnit（斩杀即死，刻意绕开免死）。
   四条致死路径 —— applyDamage 的统一死亡判定、applyFixedDamage、applyConductionDamage、
   executeKillTarget —— 全部经此，避免某一种伤害类型漏掉召唤物分流。 */
async function handleLethalDamage(target, attacker, opts = {}) {
if (!target || target.hp > 0 || !target.alive) return;
if (isSummonUnit(target)) { await despawnSummon(target); return; }
if (opts.execute) await killUnit(target, attacker);   // 斩杀：即死效果，绕开免死被动
else await resolveLethal(target, attacker);
}

/* 【斩杀】—— 不是伤害，而是即死效果。
   因此它不吃任何伤害相关规则：无视护盾、**无视虚化**（虚化只免疫伤害，斩杀不算伤害）、
   也无法被转移。达成条件即令目标立即死亡。 */
async function executeKillTarget(attacker, target, reason = '斩杀', belowRate = SUKUNA_EXECUTE_BELOW) {
if (!target || !target.alive) return false;
// 虚化不阻断斩杀：虚化免疫的是「伤害」，斩杀属于即死效果
const left = Math.max(0, Number(target.hp) || 0);
log(`⚔️ ${getSideLabel(target)}${target.name} 生命值低于${Math.round(belowRate*100)}%，被${getSideLabel(attacker)}${attacker.name} ${reason}！`, 'log-death');
target.hp = 0;
target.shield = 0;
refreshUnit(target);
if (left > 0) recordDamage(attacker, target, left);
/* 斩杀属即死、刻意绕开免死被动（opts.execute）；但若目标是召唤物，
   统一分流仍会把它转成普通退场，不产生角色阵亡日志与击杀收益。 */
await handleLethalDamage(target, attacker, { execute:true });
return true;
}

async function applyDamage(attacker, result, target) {
if (!target || !target.alive) return;
/* 「上一次被自身攻击的目标」：钉崎野蔷薇「共鸣」的数据来源。
   只记主伤害、排除溅射派生（溅射是同一击的余波，不该覆盖真正的攻击目标）；
   群体技能没有单一目标时，按结算顺序取最后一个，作为合理的退化。
   传导伤害走 applyConductionDamage、不经过这里，因此不会把传导误记成一次攻击。 */
if (attacker && !result.isSplash && target !== attacker) attacker.lastAttackedTarget = target;
/* 虎杖悠仁「黑闪」：伤害值已在 calculateDamage 里改写为 2.5 次方。
   首次触发即进入「未来」（进入时恢复 100% 最大生命值）；后续触发只改写伤害。 */
if (result.isHeishan && attacker && attacker.name === '虎杖悠仁') {
log(`⚡ 黑闪！${getSideLabel(attacker)}${attacker.name} 的本次伤害值调整为 ${result.damage}！`, 'log-damage');
triggerHeishanEffect(attacker);   // 按【方】首播视频 / 后续抠图，纯视觉不阻塞结算
if (!hasRule(attacker, '未来')) await enterMirai(attacker);
}
/* ===== 实际生命损失累计器 =====
   只统计【真正扣掉的生命值】，被护盾吸收的部分不计入 ——
   这是「受到伤害」与「受到攻击」的分界：宿傩「斩击反转」要求真的掉血才触发，
   而心友犬神「守势」只要求被打（打在盾上也算）。 */
let hpLossAcc = 0;
/* 派生伤害（神威）的致死来源：神威不可转移、直接作用于被标记者本人，
   其击杀者是【神威施加者】而非主攻击者 —— 免死被动的反击目标要用对。 */
let kamuiKiller = null;
const loseHp = (u, dmg) => {
const before = Number(u.hp) || 0;
u.hp = Math.max(0, before - dmg);
hpLossAcc += before - u.hp;
return before - u.hp;
};
/* 【放逐】vs【虚化】—— 都是规则级免疫伤害，但「受到攻击」的定性完全不同：
   · 放逐：还带有「无法选中」，常规情况下根本不会成为攻击目标 → 不算受到攻击，守势不触发。
     （走 AOE 等路径波及到时，也只是被免疫掉，不产生任何「被攻击」的事实。）
   · 虚化：只是免疫伤害，单位依然在场、依然会被选中 → 算受到攻击，守势照常反击。
   因此两者的守势处理必须分开写，不能共用同一个 return。 */
if (target.banished) { showFloatingText(target, '免疫', 'floating-miss'); log(`${getSideLabel(target)}${target.name} 被放逐中，免疫伤害！`, 'log-buff'); return; }
if (target.intangible) {
/* 虚化算「受到攻击」：先用受击前的护盾快照判守势，再免疫伤害。 */
await tryShoushiCounter(attacker, target, (Number(target.shield) || 0) > 0);
showFloatingText(target, '免疫', 'floating-miss'); return;
}
/* 白藏主「狐守」：为友方代伤 —— 但只代【护盾没吸收掉】的那部分。
   规则：伤害先打在友方自己的护盾上；护盾被打穿后，溢出的伤害才由白藏主承担；
        若伤害未破盾（被完全吸收），白藏主一点都不承担。
   因此代伤判定不能提前改 finalTarget —— 这里只先认下「代伤者是谁」，
   真正的转移放在护盾结算之后。 */
let finalTarget = target;
let foxGuardBearer = null;
/* noTransfer：本次伤害【不可转移】，白藏主「狐守」代伤不生效。
   目前只有五条悟「视」的伤害带此标记（描述明确写了「不可转移」）。 */
if (!result.noTransfer && hasMark(target, '狐守') && attacker.side !== target.side) {
const baizang = getAliveAllies(target).find(u => u.name === '白藏主');
if (baizang && target !== baizang) foxGuardBearer = baizang;
}
/* 五条悟被动「无下限」：受到攻击时，自身获得 8% 最大生命值的护盾。
   放在扣血之前、且在「是否持有护盾」快照之前 —— 这样盾先到位再判定，
   也让守势这类「受击时是否带盾」的判定拿到的是无下限生效后的状态。 */
if (finalTarget.name === '五条悟' && isPassiveActive(finalTarget) && attacker && attacker.side !== finalTarget.side) {
/* 每个单位回合限 1 次：gameState.wuXianXiaTurnCount，processUnitTurn 开头重置。
   否则多段攻击 / 群体攻击会在同一回合内反复叠盾。 */
const used = Number(gameState.wuXianXiaTurnCount) || 0;
if (used < WUXIANXIA_MAX_PER_TURN) {
gameState.wuXianXiaTurnCount = used + 1;
const shieldGain = Math.floor((Number(finalTarget.maxHp) || 0) * GOJO_SHIELD_RATE);
if (shieldGain > 0) {
finalTarget.shield = (Number(finalTarget.shield) || 0) + shieldGain;
/* 计入结算面板的「护盾」统计：被动获得的护盾同样要算，
   此前漏了这行导致五条悟的盾在结算面板里显示为 0。 */
addStat(finalTarget, 'statsShieldDone', shieldGain);
log(`${getSideLabel(finalTarget)}五条悟 的「六眼·无下限」生效，获得 ${shieldGain} 点护盾！${WUXIANXIA_MAX_PER_TURN > 1 ? `（本回合第${gameState.wuXianXiaTurnCount}/${WUXIANXIA_MAX_PER_TURN}次）` : ''}`, 'log-buff');
showFloatingText(finalTarget, '护盾 +' + shieldGain, 'floating-heal');
refreshUnit(finalTarget);
}
}
}
/* ==================== 两个时机：受到【攻击】 vs 受到【伤害】 ====================
   · 受到攻击 = 成为被攻击目标。这是【事实判定】，早于护盾扣减、代伤转移、扣血等一切伤害计算。
   · 受到伤害 = 真正产生了生命 / 护盾损失。发生在伤害结算之后。
   心友犬神「守势」属前者（"拥有护盾的友方单位受到攻击时"），因此：
     ① 判定对象是【原目标】而不是代伤后的白藏主；
     ② 护盾快照取【受击前】状态 —— 若扣完盾再判，正好把盾打破的那一下就会漏掉反击；
     ③ 反击在伤害结算之前触发。 */
const attackedTarget = target;
const hadShieldWhenHit = (Number(attackedTarget.shield) || 0) > 0;
/* 守势反击：【受到攻击】即触发，先于护盾吸收 / 白藏主代伤 / 扣血。 */
await tryShoushiCounter(attacker, attackedTarget, hadShieldWhenHit);
/* ① 友方护盾先吃伤害：这一层是「自己扛」，白藏主不介入。 */
let remainDamage = result.damage;
if (foxGuardBearer) {
const shieldVal = Number(target.shield) || 0;
if (shieldVal > 0) {
const absorbedByAlly = Math.min(shieldVal, remainDamage);
target.shield = Math.max(0, shieldVal - absorbedByAlly);
remainDamage -= absorbedByAlly;
showFloatingText(target, `盾-${absorbedByAlly}`, 'floating-shield');
if (target.shield <= 0) { target.shield = 0; log(`${getSideLabel(target)}${target.name} 的护盾被击破！`, 'log-buff'); }
refreshUnit(target);
if (absorbedByAlly > 0) recordDamage(attacker, target, absorbedByAlly);
}
/* ② 只有溢出护盾的那部分才转移给白藏主；未破盾则不代伤。 */
if (remainDamage > 0) {
log(`${getSideLabel(foxGuardBearer)}${foxGuardBearer.name} 代为承受了 ${remainDamage} 点伤害！`, 'log-buff');
finalTarget = foxGuardBearer;
} else {
log(`${getSideLabel(target)}${target.name} 的伤害被护盾完全吸收，${foxGuardBearer.name} 无需代伤！`, 'log-buff');
}
}
const oldHp = finalTarget.hp;
/* 后续统一按 remainDamage 结算：被护盾吃掉的部分已扣掉，
   未破盾时为 0（此时只是走一遍受击后的常规流程，不产生扣血）。 */
const bearResult = (remainDamage === result.damage) ? result : Object.assign({}, result, { damage: remainDamage });
const { damageToHp, absorbed } = await applyDamageWithShield(attacker, bearResult, finalTarget);
loseHp(finalTarget, damageToHp);
const actualDamage = oldHp - finalTarget.hp;
/* 稻草人：本次【实际掉血】等量传导给连接目标。
   放在统一死亡判定之前 —— 稻草人这一下被打碎，传导依然要结算。 */
if (actualDamage > 0) await conductSummonDamage(attacker, finalTarget, actualDamage);
if (actualDamage + absorbed > 0) recordDamage(attacker, finalTarget, actualDamage + absorbed);
if (damageToHp > 0) showFloatingText(finalTarget, (result.isCrit?'暴击 ':'') + (result.isSplash?'溅射 ':'') + '-' + damageToHp, result.isTrue?'floating-true':(result.isSplash?'floating-splash':(result.isCrit?'floating-crit':'floating-damage')));
unitAnimOn(idxOf(finalTarget), 'hit'); await sleep(200); unitAnimOff(idxOf(finalTarget), 'hit'); refreshUnit(finalTarget);
/* 【斩杀】「造成伤害过程中」判定：本次伤害自带斩杀，且承伤者血量已跌破阈值 → 立即即死。
   ★ 位置必须在死亡判定【之前】：东丈「不屈」这类免死被动是在随后的 resolveLethal 里生效的，
     先斩杀就绕开了它 —— 这正是「斩杀东丈不触发被动」的关键。
   斩杀属即死效果、不经伤害结算，因此无视护盾、无视虚化、不可转移。 */
if (result.canExecute && finalTarget.alive) {
const exRatio = (Number(finalTarget.hp) || 0) / (Number(finalTarget.maxHp) || 1);
if (exRatio < SUKUNA_EXECUTE_BELOW) { await executeKillTarget(attacker, finalTarget, '斩杀'); return; }
}
/* 主伤害是否已致死：用于判定「致命一击」来自谁 ——
   若主伤害就已致死，免死反击指向主攻击者；若主伤害未致死、神威追加才致死，则指向神威施加者。 */
const lethalByMain = finalTarget.hp <= 0;
// 神威：受击时【每层】追加施加者 12% 真实伤害（公式⑤），同时施加者 +15% 行动条（与层数无关）
// 伤害取施加者的「有效属性」，因此大妖之力 / 牵绊 / 狂风 / 超凡邪力等加成都会被吃到。
// 该伤害【不可转移】：直接作用于被标记者本人，不经过狐守代伤。
if (target.alive && hasMark(target, '神威')) {
const km = getMark(target, '神威');
const applier = gameState.units.find(u => u.alive && u.name === '宇智波带土' && u.side === km.applierSide);
if (applier) {
const applierStats = getEffectiveCombatStats(applier);
const extraDmg = Math.floor(applierStats.atk * KAMUI_TRUE_RATE * (km.stacks || 1) * applierStats.finalDmgRate);
const { damageToHp: extraToHp, absorbed: extraAbsorbed } = await applyDamageWithShield(attacker, { damage: extraDmg }, target);
loseHp(target, extraToHp);
showFloatingText(target, '神威 -' + extraToHp, 'floating-true');
log(`${getSideLabel(applier)}${applier.name} 的神威（${km.stacks}层）造成额外真实伤害！`, 'log-buff');
if (extraToHp + extraAbsorbed > 0) recordDamage(applier, target, extraToHp + extraAbsorbed);
refreshUnit(target);
// 施加者行动条推进：固定 +12%（KAMUI_ACTION_BONUS），与神威层数无关
grantActionValueBonus(applier, KAMUI_ACTION_BONUS, '神威');
/* ★ 不再就地 killUnit —— 派生伤害的死亡判定必须走末尾的统一流程。
   就地击杀会绕过东丈「不屈」这类免死被动：
   此前东丈身上挂着神威时，神威分支先把他杀掉，后面的不屈判定
   因 isPassiveActive 要求 alive（已被置 false）而全部落空 → 直接阵亡。 */
if (target.hp <= 0) kamuiKiller = applier;
}
}
/* 东丈「不屈」：受到致命伤害时保留 1 点生命，并对伤害来源施放「龙卷风」。
   走 applyDamage 才会触发 —— 【斩杀】是即死效果、不经过这里，因此无法触发，符合设计。 */
// 「苍」追加伤害：五条悟命中携带「苍」的目标时触发（普攻与技能均可）

/* ★ 受击后被动统一入口的位置：死亡判定【之后】（见下方 killUnit 之后）。
   触发门槛：hpLossAcc > 0 —— 只有【真正掉血】才算「受到伤害」。
   伤害被护盾完全吸收时只算「受到攻击」，不算「受到伤害」，
   因此不触发宿傩「斩击反转」（描述为"受到伤害后"）。
   注意与心友犬神「守势」区分：后者是"受到攻击时"，打在盾上也触发。 */
/* ===== 统一死亡判定 =====
   主伤害命中 finalTarget（若被白藏主代伤则不是原目标），
   派生伤害（神威 / 苍，不可转移）命中 target —— 两者可能是不同单位，都要过一遍。
   同一单位只结算一次，但「致命一击」归属要取对：
   主伤害已致死 → 记主攻击者；主伤害未致死而神威追加才致死 → 改写为神威施加者。 */
const victims = [];
const upsertVictim = (u, killer, override) => {
if (!u || u.hp > 0) return;
const ex = victims.find(v => v.unit === u);
if (ex) { if (override && killer) ex.killer = killer; return; }
victims.push({ unit: u, killer: killer || attacker });
};
upsertVictim(finalTarget, attacker, false);
upsertVictim(target, kamuiKiller, !lethalByMain);
for (const v of victims) await handleLethalDamage(v.unit, v.killer);
/* 心魔 2 件套：攻击方穿戴「心魔」2 件时，造成伤害后 25% 基础概率给目标附加混乱（持续 1 回合）。
   走战斗内钩子而非基础层：概率触发是运行时效果。
   时机：死亡判定【之后】、目标仍存活且有实际掉血时 —— 击杀不产生控制收益。
   概率走「基础概率」口径：实际 = 25% × (1 + 攻击方效果命中 − 目标效果抵抗)，
   与教程、五条悟「无量空处」的结算方式一致（心魔 1 件套给的 +15% 效果命中因此才有用）。
   持续时间由逻辑层 SHENHUN.XINMO_HUNLUAN_DURATION 通过 onApply 第二参数传入，
   不复用五条悟的 GOJO_HUNLUAN_DURATION —— 两者数值虽同为 1，但归属不同，避免以后互相牵连。 */
if (attacker && attacker.alive && finalTarget.alive && hpLossAcc > 0 && typeof SHENHUN !== 'undefined' && SHENHUN.maybeApplyXinmo) {
SHENHUN.maybeApplyXinmo(attacker, finalTarget, function (tgt, dur) {
const xinmoDur = (typeof SHENHUN !== 'undefined' && SHENHUN.XINMO_HUNLUAN_DURATION) || 1;
tryApplyControl(tgt, '混乱', dur || xinmoDur, 'xinmo');
}, function (baseChance) {
return calculateControlChance(attacker, finalTarget, baseChance);
});
}
/* 狱门疆 2 件套：装备者首次攻击时 70% 基础概率放逐本次攻击的目标。
   同在「造成伤害后、死亡判定之后」结算；目标已阵亡则无可放逐。
   目标虚化 / 已被放逐时 applyDamage 提前 return，那次攻击不消耗尝试次数。 */
if (attacker && attacker.alive && typeof SHENHUN !== 'undefined' && SHENHUN.maybeApplyPrisonRealm) {
const sealTarget = (target && target.alive && !target.banished) ? target : (finalTarget.alive ? finalTarget : null);
if (sealTarget) tryPrisonRealmSeal(attacker, sealTarget);
}
/* 受击后被动统一入口（放逐期间失效）。
   放在死亡判定【之后】：已阵亡的单位不再结算恢复，超量伤害能正常击杀。 */
if (finalTarget.alive && hpLossAcc > 0) await applyPassiveOnDamaged(finalTarget, attacker, hpLossAcc);
if (target !== finalTarget && target.alive) refreshUnit(target);
}
/* 东丈「不屈」：免死 + 反击。独立成函数，供统一死亡流程调用。
   走 applyDamage 才会触发 —— 【斩杀】是即死效果、不经过这里，因此无法触发，符合设计。
   触发时先移除自身所有减益状态与减益印记 —— 因此即便东丈正被【眩晕】，
   随后的「龙卷风」反击依然能正常打出（眩晕在这里已被清掉）。 */
async function resolveBuqu(unit, attacker) {
if (!unit || unit.hp > 0) return false;
if (unit.name !== '东丈' || !isPassiveActive(unit)) return false;
if (unit.buquUsed) {
log(`💪 ${getSideLabel(unit)}东丈 的「不屈」本局已触发过，无法再次免死！`, 'log-buff');
return false;
}
if (!attacker || attacker.side === unit.side) return false;
unit.buquUsed = true;
const removed = removeEffects(unit, CLEAR_POLARITY.DEBUFF);
const removedNames = [...removed.states, ...removed.marks];
if (removedNames.length > 0) log(`💪 ${getSideLabel(unit)}东丈 的「不屈」移除了减益：${removedNames.join('、')}！`, 'log-buff');
unit.hp = 1;
log(`💪 ${getSideLabel(unit)}东丈 的「不屈」触发！保留1点生命值，对 ${getSideLabel(attacker)}${attacker.name} 施放「龙卷风」！`, 'log-skill');
showFloatingText(unit, '不屈', 'floating-heal');
refreshUnit(unit);
const tornado = HERO_DATA['东丈'] ? HERO_DATA['东丈'].skill : null;
if (tornado && attacker.alive) await triggerSkill(unit, tornado, attacker);
if (!attacker.alive) {
const healed = await performRestore(unit, unit.maxHp, null);
log(`💪 ${getSideLabel(unit)}东丈 击倒了伤害来源，恢复 ${healed} HP（100%最大生命值）！`, 'log-heal');
refreshUnit(unit);
}
return true;
}
/* 统一死亡判定：先给免死被动机会（当前仅东丈「不屈」），仍未免死才真正阵亡。
   所有致死路径（主伤害 / 神威派生伤害）都必须走这里 ——
   任何一处就地 killUnit 都会让免死被动失效。 */
async function resolveLethal(unit, attacker) {
if (!unit || unit.hp > 0 || !unit.alive) return;
if (await resolveBuqu(unit, attacker)) return;
await killUnit(unit, attacker);
}
const STUN_CHANCE = 0.3;     // 镰鼬「胖揍」眩晕概率
const GALE_STACKS = 1;              // 东丈「龙卷风」获得的狂风层数（描述：1层）
const GALE_WINDWALK_STACKS = 2;     // 东丈「龙卷风」获得的风行层数（描述：2层）
const XINJINGMING_PUSH = 30;         // 禅心云外镜「心净明」：移除到减益时的行动条加成
const XINJINGMING_PUSH_EMPTY = 100;  // 未移除到任何减益时改为 +100%
const RENDUO_CHANCE = 0.3;   // 镰鼬「人多势众」：回合结束使自身 +100% 行动条的概率
const RAGE_DOWN_CHANCE = 0.5;// 白藏主「炎影」减怒气概率
const PUSH_AMOUNT = 40;      // 鬼王酒吞童子「天火怒焱」行动条击退百分比
const GUIWANG_NORMAL_RATE = 1.2;     // 鬼王酒吞童子「焚天」伤害倍率
const GUIWANG_BLAZE_RATE = 2.0;      // 强化「烈焰焚天」伤害倍率
const GUIWANG_BLAZE_SPLASH = 0.4;    // 强化「烈焰焚天」溅射比例
const GUIWANG_ZITAI_DURATION = 2;    // 「鬼王姿态」持续回合
const GUIWANG_HEAL_REDUCTION = 0.3;  // 鬼王酒吞童子被动：自身治疗减免 30%
const WINDWALK_SPD_PER_STACK = 25;  // 东丈「风行」每层提升的速度点数（最多5层）
const TSUNADE_STUN_CHANCE = 0.3;    // 纲手「怪力」的眩晕概率
const TSUNADE_ALLY_PUSH = 15;       // 纲手「怪力」给最低血友方的行动条加成
const GOJO_SHIELD_RATE = 0.08;      // 六眼·无下限：受到攻击时获得的护盾 = 最大生命 × 该比例
/* 「视」不再靠持续时间到期 —— 退出方式只有两种：
     ① 对携带者累计造成 3 次伤害（GOJO_SHI_MAX_HITS）
     ② 施放者五条悟阵亡（全体清空）
   因此 duration 用 999，只等上述两个出口（与「流光」同一思路）。 */
const GOJO_SHI_DURATION = 999;
const GOJO_SHI_DMG_RATE = 0.4;      // 「视」：任意单位行动后，五条悟对携带者造成的伤害倍率
const GOJO_SHI_MAX_HITS = 3;        // 「视」：对携带者累计造成该次数伤害后，印记移除
const GOJO_SHI_MAX_CARRIERS = 3;    // 「视」：场上同时携带该印记的敌方单位上限
const WUXIANXIA_MAX_PER_TURN = 1;   // 无下限：每个单位回合内最多生效 1 次
const SUKUNA_RESTORE_RATE = 0.06;   // 「斩击反转」：受到伤害后恢复的生命值 = 最大生命 × 该比例
const GOJO_HUNLUAN_CHANCE = 0.4;    // 「无量空处」附加混乱的概率
const GOJO_HUNLUAN_DURATION = 1;    // 「混乱」持续回合

/* 控制效果命中率计算：
   实际生效概率 = 基础概率 × (1 + 攻击方效果命中 - 目标方效果抵抗)
   结果钳制在 0% ~ 100% 之间。
   effectHit / effectResist 为小数形式（如 0.1 = 10%）。 */
function calculateControlChance(attacker, target, baseChance) {
const hit = (attacker && attacker.effectHit) || 0;
const resist = (target && target.effectResist) || 0;
const chance = baseChance * (1 + hit - resist);
return Math.max(0, Math.min(1, chance));
}
const QUEZHIYIN_MAX_STACKS = 2;     // 心友犬神「雀之印」层数上限，达上限后移除并触发三段伤害
const QUEZHIYIN_SEG_RATE = 0.5;     // 「雀之印」达上限时每段伤害的技能倍率（共三段）
const SHOUSHI_DEF_BONUS = 270;      // 心友犬神「守势」提供的固定防御加成
const SHOUSHI_COUNTER_RATE = 0.8;    // 「守势」反击：对敌方全体造成的伤害倍率
const SHOUSHI_SHIELD_RATE = 0.8;     // 「浪客归刃」护盾量 = 心友犬神攻击 × 该比例
const SHOUSHI_MAX_PER_TURN = 1;      // 「守势」反击：每个单位的回合内最多触发次数
const SHOUSHI_MAX_PER_ROUND = 4;     // 「守势」反击：自施放「浪客归刃」起，到犬神下个回合开始之前最多触发次数（施放时 + 犬神回合开始 均清零）
const SUYINGZHEN_MAX_STACKS = 5;    // 鬼金羊「宿影阵」层数上限
const SUYINGZHEN_RAGE_PER_STACK = 2;// 「宿影阵」每累计敌方减少 2 点怒气，获得 1 层
const SUYINGZHEN_TRIGGER_UNITS = 2; // 「宿影阵」达上限时，敌我各随机 2 个单位增减怒气（敌方须持有怒气）
const WANFA_HP_COST_RATE = 0.5;      // 禅心云外镜「万法皆空」：扣除全体友方当前生命的比例
const WANFA_SHIELD_RATE = 0.5;       // 「万法皆空」：全体友方获得的护盾 = 各自最大生命 × 该比例
const THUNDERPRESS_SHIELD_RATE = 0.35; // 「交错闪电」：自身获得的护盾 = 最大生命 × 该比例
const WANFA_SPD_RATE = 0.1;          // 「万法皆空」：全体友方提升的速度比例
const WANFA_DURATION = 3;            // 「万法皆空」：万法持续回合 / 翻转延迟回合 / 技能冷却回合（三处同为 3）
const FUMO_DURATION = 2;             // 「伏魔」印记持续回合（与 WANFA_DURATION 无关，勿混用）
const SUKUNA_JIE_RATE = 0.63;        // 两面宿傩「解」每段伤害倍率（两段）
const SUKUNA_JIE_EXTRA_TRUE = 0.63;  // 强化「解」：两段之外追加的真实伤害倍率
const SUKUNA_BA_TRUE_RATE = 1.2;     // 「捌」：攻击 120% 的真实伤害
const SUKUNA_FIXED_MAXHP_RATE = 0.1; // 两面宿傩：目标最大生命值 10% 的固定伤害（捌 / 伏魔神龛）
const SUKUNA_EXECUTE_BELOW = 0.1;    // 斩杀阈值：造成伤害【过程中或结束后】目标生命低于该比例则斩杀（强化「捌」与「伏魔神龛」共用）
/* ==================== 控制效果：全集 ====================
   目前只有两个：【眩晕】【混乱】。
   归属判据是「剥夺 / 扭曲目标的行动自主权」——
     · 眩晕：直接跳过行动阶段，无法行动；
     · 混乱：仍能行动，但行动不再受自己控制（随机普攻、不分敌我）。
   反例（都不算控制，勿混入）：
     · 苍：只是减速 + 易伤，不干预行动；
     · 放逐：规则类效果（视为离开战局），不是控制；
     · 长星锁 / 谜夜：跳过回合类，按既有设计不属于控制。
   新增控制类状态请同时登记进 CONTROL_STATES。 */
const CONTROL_STATES = new Set(['眩晕', '混乱']);
/* 免疫控制的判定：只读角色名，不依赖任何载体印记。
   参考鬼金羊免疫长星锁的写法 —— 那种「被动自带、无需载体」的口径更干净：
   以前靠「鬼王之力」印记当载体，等于凭空多出一个会在查看详情里显示的印记，
   既占版面又容易与「免疫控制」这个被动本身混淆（载体被驱散就等于被动失效，也不合理）。
   新增免疫控制的角色，在这里加名字即可。 */
function isImmuneControl(unit) {
if (!unit) return false;
/* 免疫控制属【被动效果】部分：不需要角色本体施放，
   因此不受【无法行动】约束，只要存活即免疫（与鬼金羊免疫长星锁同一口径）。 */
return unit.name === '鬼王酒吞童子' || unit.name === '魔物首领' || unit.name === '荒古魔龙';
}
/* 放逐是规则类效果，不属于 CONTROL_STATES，需单独免疫。
   探索模式两只首领级怪物（魔物首领 / 荒古魔龙）带此被动；魔物精英不带。 */
function isImmuneBanish(unit) {
return !!unit && (unit.name === '魔物首领' || unit.name === '荒古魔龙');
}
/* 施加控制效果的唯一入口：免疫控制与虚化都在这里拦。
   ★ 所有控制都必须走这里 —— 此前「混乱」绕开本入口直接 addState，
     导致鬼王酒吞童子能免疫眩晕却会被混乱，属于漏判。 */
function tryApplyControl(target, type, duration, effect) {
if (!CONTROL_STATES.has(type)) {   // 防御性：非控制类状态不许走这条控制链路
console.warn(`[控制] 「${type}」未登记在 CONTROL_STATES 中，已按普通状态处理`);
addState(target, type, { duration, effect }); refreshUnit(target); return true;
}
if (isImmuneControl(target)) { log(`${getSideLabel(target)}${target.name} 免疫控制，免疫${type}！`, 'log-buff'); return false; }
if (target.intangible) { log(`${getSideLabel(target)}${target.name} 处于虚化，免疫${type}！`, 'log-buff'); return false; }
addState(target, type, { duration, effect });
log(`${getSideLabel(target)}${target.name} 进入${type}！`, 'log-buff'); refreshUnit(target);
return true;
}
/* ==================== 五条悟「六眼·无下限」 ==================== */
/* ① 友方单位【施放技能】→ 对随机敌方目标附加「视」。
   「施放技能」的判据是 skill.__kind !== 'normal' —— 因此包含：
     · 主动技能（行动阶段）
     · 额外技能（如「一誓归心」）
     · 回合外触发的施放（如「宿影暗渡」「一誓归心」）
   普攻（__kind === 'normal'）不算施放技能。 */
async function gojoGrantShi(caster) {
if (!caster) return;
const gojos = gameState.units.filter(u => u.alive && u.name === '五条悟' && isPassiveActive(u) && u.side === caster.side);
for (const gojo of gojos) {
const enemies = getAliveEnemies(gojo).filter(isTargetable);
if (enemies.length === 0) continue;
/* 场上最多 3 个敌方单位携带「视」：已达上限则本次不附加新目标。
   注意上限按【敌方携带者数量】算，与施放者无关。 */
const aliveCarriers = gameState.units.filter(u => u.alive && hasMark(u, '视') && u.side !== gojo.side).length;
if (aliveCarriers >= GOJO_SHI_MAX_CARRIERS) {
/* 已达上限：只给【已有携带者】续时长（若对方全部已有），否则直接跳过 */
const hasFresh = enemies.some(u => !hasMark(u, '视'));
if (hasFresh) { log(`👁️ 「视」已达场上上限 ${GOJO_SHI_MAX_CARRIERS} 个，暂不附加新目标。`, 'log-buff'); continue; }
}
/* ★ 优先挑【尚未携带「视」】的敌方单位。
   「视」不可叠加（重复附加只刷新时长），若随机选中已有「视」的目标，
   这次附加等于只续了 1 回合、没有新增压制面 —— 明显亏。
   因此先在没有「视」的人里随机；只有当敌方【全部】都已携带「视」时，
   才退回全体随机（此时续时长的边际收益反而合理）。 */
const fresh = enemies.filter(u => !hasMark(u, '视'));
const pool = fresh.length > 0 ? fresh : enemies;
const t = pool[Math.floor(Math.random() * pool.length)];
const m = addMark(t, '视', { stacks:1, maxStacks:1, duration: GOJO_SHI_DURATION, effect:'shi',
extra: { applierSide: gojo.side, applierName: gojo.name } });
if (!m) continue;
/* 命中计数：只在【首次】附加时初始化；续时长（已有印记）不清零，累计到 3 次才移除。 */
if (m.shiHits === undefined) m.shiHits = 0;
log(`👁️ ${getSideLabel(gojo)}五条悟「六眼」锁定 ${getSideLabel(t)}${t.name}，附加「视」！（剩余 ${GOJO_SHI_MAX_HITS - m.shiHits} 次）`, 'log-buff');
refreshUnit(t);
}
}
/* ②【任意单位行动后】→ 五条悟对携带「视」的目标造成 40% 伤害。
   「行动」包含：行动阶段的普攻 / 技能，以及回合外施放的技能。 */
async function procShiAfterAction() {
const carriers = gameState.units.filter(u => u.alive && hasMark(u, '视'));
if (carriers.length === 0) return;
for (const c of carriers) {
const mk = getMark(c, '视');
if (!mk) continue;
const gojos = gameState.units.filter(u => u.alive && u.name === '五条悟' && isPassiveActive(u) && u.side === mk.applierSide);
for (const gojo of gojos) {
if (!c.alive) break;
log(`👁️ ${getSideLabel(gojo)}五条悟 的「视」发动，对 ${getSideLabel(c)}${c.name} 造成攻击 ${Math.round(GOJO_SHI_DMG_RATE*100)}% 伤害！（第 ${mk.shiHits + 1}/${GOJO_SHI_MAX_HITS} 次）`, 'log-skill');
/* noTransfer:true —— 「视」的伤害不可转移，白藏主「狐守」代伤对它无效。 */
for (const r of calculateDamage(gojo, { dmgRate: GOJO_SHI_DMG_RATE }, c)) await applyDamage(gojo, { ...r, noTransfer:true }, c);
refreshUnit(c);
/* 命中计数 +1；累计到上限则移除印记。 */
mk.shiHits = (Number(mk.shiHits) || 0) + 1;
if (mk.shiHits >= GOJO_SHI_MAX_HITS) {
removeMark(c, '视');
log(`👁️ ${getSideLabel(c)}${c.name} 身上的「视」已造成 ${GOJO_SHI_MAX_HITS} 次伤害，印记移除。`, 'log-buff');
refreshUnit(c);
}
}
}
}
/* 行动后统一钩子：① 施放技能附加「视」 → ② 结算「视」的伤害。
   挂在 executeAction（行动阶段）与 triggerSkill（回合外施放）两处末尾。 */
async function afterAnyUnitAction(actor, skill) {
if (!actor || !actor.alive) return;
/* 防重入：外层结算期间内层不再触发（与 shouShiFiring 同一思路）。
   ★ 但【犬神守势链】内不设闸 —— 守势触发的「一誓归心」是一次真实的回合外行动，
     理应正常附加「视」并结算「视」的伤害。守势自身已有三重限制
     （shouShiFiring 阻断递归 + 每单位回合 1 次 + 每轮 4 次），
     天然不会无限递归，因此这里不必再拦它。 */
const inShouShiChain = !!gameState.shouShiFiring;
if (gameState.actionHookBusy && !inShouShiChain) return;
/* 保存 / 恢复而不是直接置 false —— 守势链内的嵌套调用不能提前清掉外层的闸。 */
const saved = gameState.actionHookBusy;
gameState.actionHookBusy = true;
try {
if (skill && skill.__kind && skill.__kind !== 'normal') await gojoGrantShi(actor);
await procShiAfterAction();
} finally { gameState.actionHookBusy = saved; }
}
/* 「混乱」：减益状态（控制效果），携带者行动阶段时改为对场上随机目标普攻。
   · 伤害型普攻：目标可以是除「放逐」与自身外的所有角色（含队友）
   · 治疗型普攻：目标可以是除「放逐」外的所有角色（含敌方与自身） */
async function applyHunLuan(attacker, targets) {
const list = (targets || []).filter(u => u && u.alive && !u.banished);
for (const t of list) {
const _chance = calculateControlChance(attacker, t, GOJO_HUNLUAN_CHANCE);
if (Math.random() >= _chance) continue;
/* 混乱属于【控制效果】，走统一入口 —— 免疫控制与虚化的免疫都在那里判定。
   （此前这里直接 addState，绕过了免疫控制，鬼王酒吞童子会被混乱） */
tryApplyControl(t, '混乱', GOJO_HUNLUAN_DURATION, 'hunLuan');
}
}
/* 混乱下的行动：随机挑一个目标普攻（不分敌我）。返回 true 表示本回合行动已消费。 */
async function performChaosAction(unit) {
const skill = getEffectiveNormalSkill(unit) || unit.normalSkill;
const isHeal = !!(skill.healRate || skill.healFlat);
/* 伤害型：排除放逐与自身；治疗型：只排除放逐（可指向敌方与自己） */
const pool = gameState.units.filter(u => u.alive && !u.banished && (isHeal ? true : u !== unit));
if (pool.length === 0) return false;
const target = pool[Math.floor(Math.random() * pool.length)];
log(`🌀 ${getSideLabel(unit)}${unit.name} 处于混乱，随机对 ${getSideLabel(target)}${target.name} 发动普攻！`, 'log-skill');
if (isHeal) await performHealSkill(unit, skill, target);
else await performSingleAttack(unit, skill, target);
return true;
}
/* 雪拉比「预知未来」的复活：记录期间阵亡的友方，在恢复结算后复活至 1 点生命，
   行动条设在阵亡时的位置（记录于 killUnit，见 gameState.damageLogFallen）。 */
async function reviveRecordedFallen(unit) {
const fallen = gameState.damageLogFallen || [];
if (fallen.length === 0) return;
gameState.damageLogFallen = [];
for (const rec of fallen) {
const u = gameState.units[rec.idx];
if (!u || u.alive || u.side !== unit.side) continue;
u.alive = true; u.hp = 1; u.shield = 0;
setActionValue(u, Number(rec.actionValue) || 0);
log(`✨ ${getSideLabel(u)}${u.name} 被预知未来复活至1点生命！行动条恢复至 ${getActionDisplayPct(u).toFixed(1)}%`, 'log-heal');
showFloatingText(u, '复活', 'floating-heal');
refreshUnit(u);
renderActionBarDots();
}
}
/* 纲手普攻「怪力」的附加效果：30% 概率眩晕 + 当前生命值最低的友方 +10% 行动条。
   单独成函数而非塞进 switch，是因为它同时做两件事（控制 + 推条）。 */
async function applyGuaiLi(attacker, target) {
const _tsChance = calculateControlChance(attacker, target, TSUNADE_STUN_CHANCE);
if (Math.random() < _tsChance && target.alive) tryApplyControl(target, '眩晕', 1, 'stun');
const allies = getAliveAllies(attacker);
if (allies.length === 0) return;
const lowest = findLowestHpAmong(allies);
if (!lowest) return;
grantActionValueBonus(lowest, TSUNADE_ALLY_PUSH, '怪力');
log(`${getSideLabel(attacker)}${attacker.name} 的怪力：${getSideLabel(lowest)}${lowest.name} 行动条+${TSUNADE_ALLY_PUSH}%！`, 'log-buff');
refreshUnit(lowest);
}
async function applySkillEffect(attacker, target, effect, aoeTargets) {
if (!effect) return;
// 单体效果：目标若已在伤害结算中阵亡则不再施加（阵亡者不该获得任何新 buff）
if (target && !target.alive && !aoeTargets) return;
switch (effect) {
case 'stun': tryApplyControl(target, '眩晕', 1, 'stun'); break;
case 'stunChance': { const _sc = calculateControlChance(attacker, target, STUN_CHANCE); if (Math.random() < _sc) tryApplyControl(target, '眩晕', 1, 'stun'); } break;
case 'guaiLi': await applyGuaiLi(attacker, target); break;      // 纲手普攻「怪力」
case 'hunLuan': await applyHunLuan(attacker, aoeTargets || [target]); break;  // 五条悟「无量空处」
/* 虎杖悠仁「斩击·领域」：描述为「并使目标附加混乱」，是必中而非概率，
   故不走 applyHunLuan（那是五条悟的 40% 基础概率口径）。 */
case 'itadoriHunLuan': if (target && target.alive) tryApplyControl(target, '混乱', ITADORI_HUNLUAN_DURATION, 'hunLuan'); break;
case 'rageDown': {
const lost = Math.random() < RAGE_DOWN_CHANCE ? loseRage(target, 1) : 0;
if (lost > 0) { log(`${getSideLabel(target)}${target.name} 失去${lost}点怒气！`, 'log-buff'); refreshUnit(target); }
break;
}
// rageUp1 / targetRageUp1 语义一致：都是给「目标」+1 怒气（历史上 rageUp1 曾误引用未定义变量）
/* 心友犬神「雀之印」：减益印记，上限 2 层。
   达到上限时移除所有层数，并对携带者造成施加者的三段 50% 伤害。 */
case 'queZhiYin': {
if (target.intangible) { log(`${getSideLabel(target)}${target.name} 处于虚化，免疫雀之印！`, 'log-buff'); break; }
const qy = addMark(target, '雀之印', { stacks:1, maxStacks:QUEZHIYIN_MAX_STACKS, duration:999, effect:'queZhiYin', extra:{ applierName:attacker.name, applierSide:attacker.side } });
if (!qy) break;
log(`${getSideLabel(target)}${target.name} 附加了1层雀之印！（当前${qy.stacks}层）`, 'log-buff');
refreshUnit(target);
if ((qy.stacks || 1) >= QUEZHIYIN_MAX_STACKS) {
/* 与宿影阵同一口径：先【结算效果】，成功后再移除所有层数。
   三段伤害不是「施放技能」，因此不受无法行动约束，可就地结算。 */
log(`雀之印达到上限！${getSideLabel(target)}${target.name} 受到 ${getSideLabel(attacker)}${attacker.name} 的三段 ${Math.round(QUEZHIYIN_SEG_RATE*100)}% 伤害！`, 'log-skill');
for (let i = 0; i < 3; i++) {
if (!target.alive) break;
for (const r of calculateDamage(attacker, { dmgRate: QUEZHIYIN_SEG_RATE }, target)) await applyDamage(attacker, r, target);
}
removeMark(target, '雀之印');
refreshUnit(target);
}
break;
}
/* 鬼金羊「长星锁」：减益印记，不可叠加。
   携带者行动条达到 100% 时移除此印记并跳过完整回合（见 processUnitTurn）。 */
case 'changXingSuo': {
if (target.intangible) { log(`${getSideLabel(target)}${target.name} 处于虚化，免疫长星锁！`, 'log-buff'); break; }
/* 免疫长星锁属「宿影暗渡」的【被动效果】部分：不需要角色本体施放，
   因此不受【无法行动】约束，只要存活即免疫（与攒宿影阵同一口径）。 */
if (target.name === '鬼金羊') { log(`${getSideLabel(target)}${target.name} 免疫长星锁！`, 'log-buff'); break; }
const cx = addMark(target, '长星锁', { stacks:1, maxStacks:1, duration:999, effect:'changXingSuo', extra:{ applierSide:attacker.side, applierName:attacker.name } });
if (!cx) break;
log(`${getSideLabel(target)}${target.name} 被附加长星锁！下次行动条满时跳过回合。`, 'log-buff');
refreshUnit(target);
// 下个友方单位获得 2 点怒气：按行动条从高到低，取施法者之后的下一个存活友方
const allies = getAliveAllies(attacker).filter(u => u !== attacker);
if (allies.length > 0) {
const next = allies.slice().sort((a, b) => (Number(b.actionValue) || 0) - (Number(a.actionValue) || 0))[0];
const g = gainRage(next, 2);
if (g > 0) { log(`${getSideLabel(next)}${next.name} 获得${g}点怒气！`, 'log-buff'); refreshUnit(next); }
}
break;
}
case 'rageUp1':
case 'targetRageUp1': {
if (!target) break;
const gained = gainRage(target, 1);
if (gained > 0) { log(`${getSideLabel(target)}${target.name} 获得${gained}点怒气！`, 'log-buff'); refreshUnit(target); }
break;
}
// 群体型：驱散敌方全体随机1个增益 + 击退行动条 PUSH_AMOUNT%，整次技能只结算一次
case 'dispelAndPush': {
const enemies = ((aoeTargets && aoeTargets.length) ? aoeTargets : getAliveEnemies(attacker)).filter(isTargetable);
enemies.forEach(e => {
// 技能描述指定「驱散增益」→ polarity 传 buff；只作用于状态（印记不可驱散）
const removed = dispelStates(e, 1, CLEAR_POLARITY.BUFF);
removed.forEach(t => log(`${getSideLabel(e)}${e.name} 的增益状态「${t}」被驱散！`, 'log-buff'));
if (removed.length > 0) refreshUnit(e);
pushActionValue(e, PUSH_AMOUNT);
});
log(`敌方全体行动条被击退 ${PUSH_AMOUNT}%！`, 'log-buff');
updateActionBarDots(); break;
}
case 'kamuiMark': {
if (target.intangible) { log(`${getSideLabel(target)}${target.name} 处于虚化，免疫神威印记！`, 'log-buff'); break; }
const km = addMark(target, '神威', { stacks:1, maxStacks:3, duration:999, effect:'kamuiMark', extra:{ applierSide:attacker.side } });
if (!km) break;   // 目标已阵亡/被放逐：不再附加
log(`${getSideLabel(target)}${target.name} 附加了1层神威！（当前${km.stacks}层）`, 'log-buff'); refreshUnit(target);
break;
}
}
}
const BOND_ACTION_BONUS = 30;   // 牵绊推进的行动条
const BAIHAO_ACTION_BONUS = 20; // 百豪之术：全体友方推进的行动条
const DEF_DOWN_AMOUNT = 80;     // 画龙点睛自身永久降防
async function applySelfEffect(unit, effect, target = null) {
switch (effect) {
case 'windWalk': {
const ww = addMark(unit, '风行', { stacks:1, maxStacks:5, duration:999, effect:'windWalk' });
log(`${getSideLabel(unit)}${unit.name} 获得1层风行！（当前${ww ? ww.stacks : 0}层）`, 'log-buff'); break;
}
case 'galeWind': {
/* 「龙卷风」：1 层狂风 + 2 层风行（与技能描述一致）。
   层数改为读常量，避免再次写错 —— 此前狂风误写为 2 层、风行误写为 1 层，两处都与描述不符。 */
const gw = addMark(unit, '狂风', { stacks:GALE_STACKS, maxStacks:3, duration:999, effect:'galeWind' });
const ww = addMark(unit, '风行', { stacks:GALE_WINDWALK_STACKS, maxStacks:5, duration:999, effect:'windWalk' });
log(`${getSideLabel(unit)}${unit.name} 获得狂风（${gw ? gw.stacks : 0}层）+风行（${ww ? ww.stacks : 0}层）！`, 'log-buff'); break;
}
/* 心友犬神「浪客归刃」：
     ① 自身、主角、以及生命比例最低的友方（不含自身与主角）各获得「犬神攻击 100%」的护盾
     ② 自身获得「守势」（+270 防御），持续 2 回合 */
case 'langKeGuiRen': {
const shieldVal = Math.floor(getEffectiveCombatStats(unit).atk * SHOUSHI_SHIELD_RATE);
const targets = [unit];
const protagonist = getAliveAllies(unit).find(u => u.name === '主角' && u !== unit);
if (protagonist) targets.push(protagonist);
const others = getAliveAllies(unit).filter(u => u !== unit && u.name !== '主角');
if (others.length > 0) {
// 「生命比例最低」按 当前生命 ÷ 最大生命 判定；并列时取绝对血量更低者，保证结果可复现
const lowest = others.slice().sort((a, b) =>
((Number(a.hp)||0)/(Number(a.maxHp)||1) - (Number(b.hp)||0)/(Number(b.maxHp)||1)) || ((Number(a.hp)||0)-(Number(b.hp)||0)) || (a.pos-b.pos))[0];
targets.push(lowest);
}
targets.forEach(t => {
t.shield = (Number(t.shield) || 0) + shieldVal;
addStat(unit, 'statsShieldDone', shieldVal);
log(`${getSideLabel(t)}${t.name} 获得 ${shieldVal} 点护盾！`, 'log-buff');
refreshUnit(t);
});
addMark(unit, '守势', { stacks:1, maxStacks:1, duration:2, effect:'shouShi' });
/* 「自身回合开始前限 4 次」的窗口自【施放本技能】起算：
   施放瞬间把本轮计数清零，此后到犬神下个回合开始之前，最多再反击 4 次。 */
unit.shouShiRoundCount = 0;
log(`${getSideLabel(unit)}${unit.name} 获得守势（+${SHOUSHI_DEF_BONUS} 防御，持续2回合，本轮反击计数已重置）！`, 'log-buff');
refreshUnit(unit);
break;
}
case 'dragonDance': {
const dd = addMark(unit, '龙之舞', { stacks:1, maxStacks:3, duration:999, effect:'dragonDance' });
log(`${getSideLabel(unit)}${unit.name} 获得1层龙之舞！（当前${dd ? dd.stacks : 0}层）`, 'log-buff'); break;
}
/* 禅心云外镜普攻「水无垠」：移除自身携带的所有减益状态与减益印记。
   走统一入口 removeEffects(unit, 'debuff')：只清减益，增益保留。 */
case 'shuiWuYin': {
/* 「水无垠」：只移除【自身】的所有减益状态与减益印记（不再波及友方）。 */
const removed = removeEffects(unit, CLEAR_POLARITY.DEBUFF);   // 返回 { states:[...], marks:[...] }
const names = [...removed.states, ...removed.marks];
log(names.length > 0
? `${getSideLabel(unit)}${unit.name} 的「水无垠」移除了减益：${names.join('、')}！`
: `${getSideLabel(unit)}${unit.name} 身上没有可移除的减益效果。`, 'log-buff');
refreshUnit(unit);
break;
}
/* 禅心云外镜技能「万法皆空」：
   ① 扣除全体友方 50% 当前生命 ② 全体友方获得各自 50% 最大生命的护盾
   ③ 全体友方 +10% 速度，持续 2 回合 ④ 2 回合后翻转生命并清盾 ⑤ 进入 2 回合冷却 */
/* 禅心云外镜技能1「心净明」【施放】：移除友方目标的所有减益状态与减益印记，
   然后 +30% 行动条；若一个都没移除（目标身上本无减益），则改为 +100% 行动条。
   注意：行动条加成走统一入口 —— 若目标正是当前行动者，会登记到回合结束后落地。 */
case 'xinJingMingCast': {
const tgt = target || unit;
if (!tgt.alive) break;
const rm = removeEffects(tgt, CLEAR_POLARITY.DEBUFF);
const removed = [...rm.states, ...rm.marks];
const bonus = removed.length > 0 ? XINJINGMING_PUSH : XINJINGMING_PUSH_EMPTY;
grantActionValueBonus(tgt, bonus, '心净明');
log(removed.length > 0
? `🪞 ${getSideLabel(unit)}${unit.name} 施放「心净明」！移除 ${getSideLabel(tgt)}${tgt.name} 的减益：${removed.join('、')}，行动条+${bonus}%！`
: `🪞 ${getSideLabel(unit)}${unit.name} 施放「心净明」！${getSideLabel(tgt)}${tgt.name} 身上没有可移除的减益，改为使其行动条+${bonus}%！`, 'log-skill');
refreshUnit(tgt);
updateActionBarDots();
break;
}
case 'wanFaJieKong': {
const allies = getAliveAllies(unit);
if (allies.length > 0) {
const detail = allies.map(u => {
const maxHp = Number(u.maxHp) || 0;
const before = Number(u.hp) || 0;
/* ① 扣除 50% 当前生命（保底 1 点：技能不该把队友扣死）
   ★ 这是【代价 / 自伤】，不是伤害 —— 直接改生命值，不走 applyDamage /
     applyFixedDamage，因此不触发任何「受到伤害」类被动（如两面宿傩「斩击反转」）。
     同理也不触发「受到攻击」类效果（如心友犬神「守势」）。 */
const after = Math.max(1, Math.min(maxHp, Math.floor(before * (1 - WANFA_HP_COST_RATE))));
u.hp = after;
// ② 护盾 = 各自最大生命 × 50%
const sv = Math.floor(maxHp * WANFA_SHIELD_RATE);
u.shield = (Number(u.shield) || 0) + sv;
addStat(unit, 'statsShieldDone', sv);
// ③ 速度印记（不可叠加，重复施放刷新时长）
addMark(u, '万法', { duration: WANFA_DURATION, effect: 'wanFa' });
refreshUnit(u);
return `${u.name} ${before}→${after}（盾${sv}）`;
});
log(`🪞 ${getSideLabel(unit)}${unit.name} 施放「万法皆空」！${detail.join('、')}，全体+${Math.round(WANFA_SPD_RATE*100)}%速度（${WANFA_DURATION}回合）`, 'log-skill');
}
// ④ 翻转倒计时：自身回合开始递减，归零时翻转（= 两个回合后）
unit.wanfaTurnsLeft = WANFA_DURATION;
// ⑤ 冷却
unit.skillCooldowns = unit.skillCooldowns || {}; unit.skillCooldowns['万法皆空'] = WANFA_DURATION;   // 与上方统一入口一致（按技能名分槽）
log(`「万法皆空」将在 ${WANFA_DURATION} 个回合后翻转生命；技能进入冷却 ${WANFA_DURATION} 回合。`, 'log-buff');
refreshUnit(unit);
await sleep(300);
break;
}
/* 两面宿傩技能「伏魔神龛」：强化自身普攻，持续 2 回合（不可叠加，重复施放刷新时长） */
case 'fuMo': {
addMark(unit, '伏魔', { duration: FUMO_DURATION, effect: 'fuMo' });
log(`${getSideLabel(unit)}${unit.name} 进入伏魔状态！普攻获得强化（持续 ${FUMO_DURATION} 回合）`, 'log-buff');
refreshUnit(unit);
break;
}
case 'thunderPress': {
addMark(unit, '雷压', { duration:3, effect:'thunderPress' });
const sv = Math.floor(unit.maxHp * THUNDERPRESS_SHIELD_RATE);
unit.shield = (Number(unit.shield) || 0) + sv;
addStat(unit, 'statsShieldDone', sv);
log(`${getSideLabel(unit)}${unit.name} 获得雷压和${sv}点护盾！`, 'log-buff');
break;
}
case 'defDownPerm': {
unit.def = Math.max(0, unit.def - DEF_DOWN_AMOUNT);
log(`${getSideLabel(unit)}${unit.name} 防御永久降低${DEF_DOWN_AMOUNT}点！`, 'log-buff'); break;
}
case 'foxGuard': {
/* 先清空【我方】已有的狐守，再重新授予 —— 我方至多同时存在 2 个单位拥有狐守。
   清空而非跳过，带来两个好处：
     ① 重新选人：上次挂在 A、B 身上，这次按当前局势可能该给 A、C；
     ② 时长刷新：重新 addMark 会刷新 duration 与 setTurnSeq，
        不会出现"已有者不刷新、本回合就开始递减"的老问题。
   用 removeMark 直接移除，不走自然到期回调（狐守没有到期效果）。 */
/* ★ 只清空【施放者自己这一方】的狐守 —— 不能清场。
   狐守是「我方白藏主保我方队友」的印记；若遍历 gameState.units 全场清空，
   敌方白藏主一施放技能就会把【我方】队友身上的狐守也抹掉，
   等于敌人能驱散我方的增益，显然不对。 */
getAliveAllies(unit, true).forEach(u => { if (removeMarkIfHas(u, '狐守')) refreshUnit(u); });
// 狐守的授予对象排除白藏主自身（自己已另有「狐佑」）
const allies = getAliveAllies(unit, false);
if (allies.length > 0) {
const highestAtk = findHighestAtkAmong(allies);
const lowestHp = findLowestHpAmong(allies);   // 当前绝对血量最低
[highestAtk, lowestHp].forEach((t, i) => {
if (!t || (i === 1 && t === highestAtk)) return;
addMark(t, '狐守', { duration:2, effect:'foxGuard', extra:{ applierSide:unit.side, applierName:unit.name } });
log(`${getSideLabel(t)}${t.name} 获得狐守！`, 'log-buff'); refreshUnit(t);
});
}
/* ★ 已有狐佑时也必须重新 addMark —— 不能用 if(!hasMark) 包住。
   包住会带来两个后果：① 时长不刷新；② setTurnSeq 不更新，
   于是「本回合不计入持续时间」对这次施放失效，回合结束立刻递减 →
   表现就是"刚放完技能，狐佑反而更快没了"。
   addMark 内部对已存在的印记是刷新时长（取 max），不会叠加。 */
addMark(unit, '狐佑', { duration:2, effect:'foxBless' });
log(`${getSideLabel(unit)}${unit.name} 获得狐佑（持续时间已刷新）！`, 'log-buff');
break;
}
case 'guiWangZiTai': {
/* 鬼王酒吞童子「天火怒焱」：自身获得「鬼王姿态」（持续2回合），用于强化普攻。
   无条件 addMark —— 已存在时由内部刷新时长与 setTurnSeq（本回合不计入）。 */
addMark(unit, '鬼王姿态', { duration: GUIWANG_ZITAI_DURATION, effect: 'guiWangZiTai' });
log(`${getSideLabel(unit)}${unit.name} 获得鬼王姿态！普攻被强化（持续${GUIWANG_ZITAI_DURATION}回合）`, 'log-buff');
refreshUnit(unit);
break;
}
case 'bond': {
/* 行动条加成一律走 grantActionValueBonus()，不能直接用 advanceActionValue()：
   施放者（镰鼬）此刻正停在 100%，直接加会被 ACTION_MAX 截断，随后 endTurn 又清零，
   等于自己这份 +30% 凭空消失 —— 正是带土、维迦踩过的同一个坑。
   走统一入口后：队友立即生效，镰鼬自己的那份登记到回合结束后落地。 */
getAliveAllies(unit).forEach(u => {
grantActionValueBonus(u, BOND_ACTION_BONUS, '牵绊');
/* 无条件 addState：已存在时由 addState 内部刷新时长与 setTurnSeq。
   此前用 if(!has) 包住 → 已携带者既不刷新时长，也享受不到「本回合不计入」，
   于是刚放完技能、回合结束就递减，牵绊提前消失（与狐佑同一个坑）。 */
addState(u, '牵绊', { duration:2, effect:'bond' });
refreshUnit(u);
});
updateActionBarDots(); log(`${getSideLabel(unit)}全体获得牵绊，行动条+${BOND_ACTION_BONUS}%！`, 'log-buff'); break;
}
case 'hundredHeal': {
/* 行动条加成一律走 grantActionValueBonus()：纲手此刻正停在 100%，
   直接 advance 会被 ACTION_MAX 截断、随后 endTurn 清零，自己那份 +20% 会凭空消失
   （与「牵绊」同坑）。统一入口会把施放者这份登记到回合结束后落地。 */
for (const t of getAliveAllies(unit)) {
await performHeal(unit, { name:'百豪之术', healRate:2.0 }, t);
/* 无条件 addState：已存在时由 addState 内部刷新时长（取 max）并更新 setTurnSeq，
   即重复施放「百豪之术」会把百豪续回完整 3 回合，且本次回合结束不递减。 */
addState(t, '百豪', { duration:3, effect:'hundredHeal' });
grantActionValueBonus(t, BAIHAO_ACTION_BONUS, '百豪之术');
refreshUnit(t);
}
updateActionBarDots();
log(`${getSideLabel(unit)}${unit.name}「百豪之术」使全体友方行动条+${BAIHAO_ACTION_BONUS}%！`, 'log-buff');
break;
}
case 'rageAll1': {
getAliveAllies(unit).forEach(u => { gainRage(u, 1); refreshUnit(u); });
log(`${getSideLabel(unit)}我方全体+1怒气！`, 'log-buff'); break;
}
/* 鬼金羊「宿影暗渡」的【施放】效果：敌方随机 2 个有怒气的单位 -1 怒气，我方随机 2 个 +1 怒气。
   同一个技能名既承载被动（攒宿影阵）又承载施放效果，两侧互不干扰。 */
case 'suYingAnDu': {
/* 注意：本技能自己造成的敌方 -2 怒气同样会回喂被动（鬼金羊的技能也会给自己涨层），
   这是正常机制，不屏蔽。连放由 addSuyingZhen 的 suyingPendingFire 闸门挡住。 */
const foes = getAliveEnemies(unit).filter(u => (Number(u.rage) || 0) > 0);
pickRandom(foes, SUYINGZHEN_TRIGGER_UNITS).forEach(u => {
const l = loseRage(u, 1);
if (l > 0) { log(`${getSideLabel(u)}${u.name} 失去${l}点怒气！`, 'log-buff'); refreshUnit(u); }
});
const allies = getAliveAllies(unit);
pickRandom(allies, SUYINGZHEN_TRIGGER_UNITS).forEach(u => {
const g2 = gainRage(u, 1);
if (g2 > 0) { log(`${getSideLabel(u)}${u.name} 恢复${g2}点怒气！`, 'log-buff'); refreshUnit(u); }
});
break;
}
case 'intangibility': {
// ① 移除自身所有「减益状态」与「减益印记」（移除对状态、印记都生效）
const cleared = removeEffects(unit, CLEAR_POLARITY.DEBUFF);
cleared.states.forEach(t => log(`${getSideLabel(unit)}${unit.name} 的减益状态「${t}」被移除！`, 'log-buff'));
cleared.marks.forEach(t => log(`${getSideLabel(unit)}${unit.name} 的减益印记「${t}」被移除！`, 'log-buff'));
// ② 进入虚化：持续期间免疫伤害（applyDamage）与减益状态/印记（tryApplyControl / kamuiMark）
unit.intangible = true;
/* 虚化为标准规则 + duration 倒计时（不再靠 banishTurns 手动递减）。
   BANISH_DURATION = 1：本回合结束不计入，施放者下回合结束时递减到期 —— 即描述所说的
   「持续至施放者带土下回合结束」。与放逐同源同长，两者总是同时结束。 */
addRule(unit, '虚化', { duration: BANISH_DURATION, effect: 'intangibility' });
log(`${getSideLabel(unit)}${unit.name} 进入虚化！免疫伤害与减益效果。`, 'log-buff'); break;
}
case 'flowingLight': {
/* 流光不再靠持续时间到期 —— 它的两种退出方式是：
     ① 携带者怒气减少（技能消耗不算）→ 恢复 1 点怒气并移除（见 onRageLost）；
     ② 流光追月神自身回合开始 → 「绮罗舞」转化为照君 + 驱散（见 PASSIVE_TURN_START.qiluoDanceStart）。
   因此 duration 用 999，只等上述两个出口。 */
getAliveAllies(unit).forEach(u => {
const dur = FLOWING_LIGHT_DURATION;
/* ★ 流光【不可刷新】：已携带的单位保持原有倒计时，本次施放不延长。
   这与狐佑 / 牵绊 / 百豪相反 —— 那几个是重复施放即刷新时长。
   「不刷新」= 什么都不做：既不改 duration，也不动 setTurnSeq。
   setTurnSeq 保持首次授予时的值是正确的：本次并未重新授予，
   所以它照常在持有者回合结束时递减（不享受「本回合不计入」）。 */
if (getMark(u, '流光')) {
log(`${getSideLabel(u)}${u.name} 已携带流光（不可叠加）！`, 'log-buff');
} else {
addMark(u, '流光', { stacks:1, maxStacks:1, duration:dur, effect:'flowingLight', extra:{ applierSide:unit.side, applierName:unit.name } });   // 不可叠加、不可刷新
log(`${getSideLabel(u)}${u.name} 获得流光！（持续${dur}回合）`, 'log-buff');
}
refreshUnit(u);
});
break;
}
case 'darkEssence': { break; } // 超凡邪力在 killUnit() 中按击杀统一结算，此处无需处理
}
refreshUnit(unit);
}
/* ----------【治疗】走公式④，受治疗加成 / 治疗减免 / 暴击倍率影响 ---------- */
// 公式④：治疗量 = 攻击 × 技能治疗率 × 目标治疗加成 × (1-目标治疗减免)，可暴击（暴击额外 × 暴击伤害率）
// 治疗加成/减免取「被治疗目标」，暴击属性取「施法者」
async function performHeal(healer, skill, target) {
if (!isRecoverable(target)) return 0;   // 0 血视为已阵亡，治疗不生效（见 isRecoverable）
if (target.banished) { log(`${getSideLabel(target)}${target.name} 被放逐中，无法接受治疗！`, 'log-buff'); return 0; }
let healBonus = Number(target.healBonus) || 1.0;
if ((target.states || []).some(s => s.type === '百豪')) healBonus += 0.2;   // 百豪（增益状态）：+20% 治疗加成
/* 鬼王酒吞童子被动：自身治疗减免 30%（与其它治疗减免加法叠加） */
let healRed = clamp01(Number(target.healReduction) || 0);
if (target.name === '鬼王酒吞童子' && isPassiveActive(target)) healRed = clamp01(healRed + GUIWANG_HEAL_REDUCTION);
const reduction = clamp01(1 - healRed);
const isCrit = !healer.noCrit && Math.random() < (Number(healer.critRate) || 0);
const critMultiplier = isCrit ? (Number(healer.critDmg) || 1.5) : 1.0;
let healVal = Math.floor(healer.atk * (Number(skill.healRate) || 0) * healBonus * reduction * critMultiplier);
if (healVal < 0) healVal = 0;
const before = target.hp;
target.hp = Math.min(target.maxHp, target.hp + healVal);
const realHeal = target.hp - before;
showFloatingText(target, (isCrit ? '暴击治疗 +' : '+') + realHeal, isCrit ? 'floating-crit' : 'floating-heal');
log(`${getSideLabel(healer)}${healer.name} 的${skill.name || '治疗'} 治疗了 ${getSideLabel(target)}${target.name}，恢复了 ${realHeal} HP！${isCrit ? '（暴击治疗）' : ''}`, 'log-heal');
addStat(healer, 'statsHealDone', realHeal);
await playHealAnim(target);
return realHeal;
}
// 单体治疗技能入口：先治疗，再结算附加在治疗目标上的效果（如雪拉比「治愈」的1点怒气）
async function performHealSkill(healer, skill, target) {
if (!isRecoverable(target)) return;
if (target.banished) { log(`${getSideLabel(target)}${target.name} 被放逐中，无法成为治疗目标！`, 'log-buff'); return; }
await performHeal(healer, skill, target);
if (skill.healEffect) { await sleep(120); await applySkillEffect(healer, target, skill.healEffect); }
}
/* ===== 可被治疗 / 恢复的判定 =====
   ★ 关键：必须 hp > 0。
   伤害结算里 hp 被钳到 0 后，alive 仍是 true（真正的阵亡由紧随其后的 killUnit 处理）。
   这段「0 血但尚未阵亡」的窗口里若允许回血，就会把本该致死的目标救回来。
   故统一加 hp > 0 门槛：0 血即为已阵亡，任何治疗 / 恢复都不生效。
   （雪拉比「预知未来」的复活是先置 alive=true 且 hp=1，之后照常可被恢复） */
function isRecoverable(target) {
return !!(target && target.alive && (Number(target.hp) || 0) > 0);
}
/* ----------【恢复】独立机制：固定数值，不走公式、不受加成/减免/暴击影响 ---------- */
async function performRestore(target, amount, source) {
if (!isRecoverable(target)) return 0;
if (target.banished) { log(`${getSideLabel(target)}${target.name} 被放逐中，无法接受恢复！`, 'log-buff'); return 0; }
const val = Math.max(0, Math.floor(Number(amount) || 0));
if (val <= 0) return 0;
const before = target.hp;
target.hp = Math.min(target.maxHp, target.hp + val);
const real = target.hp - before;
showFloatingText(target, '恢复 +' + real, 'floating-restore');
if (source) {
log(`${getSideLabel(source)}${source.name} 使 ${getSideLabel(target)}${target.name} 恢复了 ${real} HP！`, 'log-heal');
addStat(source, 'statsRestoreDone', real);
} else {
addStat(target, 'statsRestoreDone', real);
}
await playHealAnim(target);
return real;
}
// 群体恢复：对一组目标统一恢复固定数值
async function performRestoreAll(targets, amount, source) {
const list = (targets || []).filter(isTargetable);
if (list.length === 0) return 0;
const val = Math.max(0, Math.floor(Number(amount) || 0));
if (val <= 0) return 0;
let total = 0;
for (const t of list) total += await performRestore(t, val, source);
if (source) log(`${getSideLabel(source)}${source.name} 的预知未来：全体各恢复 ${val} HP！`, 'log-heal');
return total;
}
async function playHealAnim(target) {
const el = document.getElementById(`unit-${idxOf(target)}`);
unitAnimOn(idxOf(target), 'heal-anim'); await sleep(300); unitAnimOff(idxOf(target), 'heal-anim'); refreshUnit(target);
}
async function performSnapshot(caster, skill) {
gameState.snowballSnapshot = {};
getAliveAllies(caster).forEach(u => { gameState.snowballSnapshot[idxOf(u)] = u.hp; });
caster.pendingSnapshot = true;
log(`${getSideLabel(caster)}${caster.name} 记录了友方生命值，下回合开始时恢复低于记录值的友方！`, 'log-buff');
}
async function performDamageLog(caster, skill) {
gameState.damageLogTotal = 0; gameState.damageLogSide = caster.side; gameState.damageLogFallen = [];
caster.pendingSnapshot = true;
log(`${getSideLabel(caster)}${caster.name} 开始记录友方受到的伤害，下回合开始时将记录总伤害的80%分配给所有存活友方！`, 'log-buff');
}
const BANISH_DURATION = 1;       // 放逐 / 虚化的持续回合（本回合不计入，施放者下回合结束时解除）
async function performBanish(caster, skill, target) {
/* ★ 放逐是【规则】类效果（视为离开战局），不是控制效果 ——
   「无法行动」只是它的附属结果，判定免疫要看效果类别而非后果。
   因此免疫控制不能拦下放逐；免疫的是 tryApplyControl 那条路上的状态（眩晕等）。 */
if (isImmuneBanish(target)) {
if (typeof showFloatingText === 'function') showFloatingText(target, '免疫放逐', 'floating-miss');
log(`${getSideLabel(target)}${target.name} 免疫放逐！`, 'log-buff');
return;
}
// 先快照当前位置，再置 banished —— 之后行动条即被锁定在该位置，任何推进/击退都无效
lockActionValue(target);
target.banished = true; target.banishedBy = caster;
/* 放逐同样是标准规则 + duration；只是它的倒计时由**施放者**的回合驱动
   （被放逐者不行动、不会走 processTurnEnd），见 processTurnEnd 中的代 tick。 */
const banishRule = addRule(target, '放逐', { duration: BANISH_DURATION, effect: 'banish', extra: { casterIdx: idxOf(caster) } });
/* 放逐的倒计时由【施放者】的回合驱动（被放逐者不走自己的回合），
   因此「本回合不计入」要按施放者的回合号记 —— 与 processTurnEnd 里的代 tick 参照号一致。 */
if (banishRule) banishRule.setTurnSeq = caster.turnSeq;
log(`${getSideLabel(caster)}${caster.name} 将 ${getSideLabel(target)}${target.name} 放逐至神威空间！行动条锁定在 ${target.actionValue}%`, 'log-skill');
updateActionBarDots(); refreshUnit(target);
await sleep(500);
}
/* ===== 狱门疆 2 件套：首次攻击放逐 =====
   与带土「神威·虚化」共用同一套【放逐】规则（离开战局、行动条锁定、神魂 2 件失效…），
   但用独立 effect 键 'prisonRealm' —— 带土放逐到期会追打三段 + 全体神威，狱门疆没有后续攻击。
   持续到「自身下回合结束」：duration = BANISH_DURATION，倒计时由施放者回合代 tick（processTurnEnd）。
   「或阵亡」：killUnit 按 banishedBy 统一解除。 */
function applyPrisonRealmBanish(caster, target) {
if (!caster || !target || !target.alive || target.banished) return;
if (isImmuneBanish(target)) {
if (typeof showFloatingText === 'function') showFloatingText(target, '免疫放逐', 'floating-miss');
log(`🟣 ${getSideLabel(target)}${target.name} 免疫放逐，狱门疆内部空间无法困住它！`, 'log-buff');
refreshUnit(target);
return;
}
lockActionValue(target);
target.banished = true; target.banishedBy = caster;
const ru = addRule(target, '放逐', { duration: BANISH_DURATION, effect: 'prisonRealm', extra: { casterIdx: idxOf(caster) } });
if (ru) ru.setTurnSeq = caster.turnSeq;
log(`🟣 ${getSideLabel(caster)}${caster.name} 的「狱门疆」发动！将 ${getSideLabel(target)}${target.name} 放逐至狱门疆内部空间！行动条锁定在 ${target.actionValue}%`, 'log-skill');
refreshUnit(target); updateActionBarDots();
}
/* 每名装备者只尝试一次；同一阵营全体只生效一次（「多名友方角色装备时，仅生效一次」）。
   尝试即占用名额，70% 未命中也不让下一名友方再试。
   穿戴判定与概率 roll 交给逻辑层 SHENHUN.maybeApplyPrisonRealm。 */
function tryPrisonRealmSeal(attacker, target) {
if (!attacker || !attacker.alive || !target || !target.alive) return;
/* 目标取本次攻击的实际对象（套装描述即「目标」），概率换算用该目标自己的效果抵抗。 */
if (attacker.prisonRealmAttempted) return;
const side = attacker.side;
gameState.prisonRealmUsed = gameState.prisonRealmUsed || {};
attacker.prisonRealmAttempted = true;
if (gameState.prisonRealmUsed[side]) return;
gameState.prisonRealmUsed[side] = true;
if (typeof SHENHUN === 'undefined' || !SHENHUN.maybeApplyPrisonRealm) return;
SHENHUN.maybeApplyPrisonRealm(attacker, function () { applyPrisonRealmBanish(attacker, target); },
function (base) { return calculateControlChance(attacker, target, base); });
}
/* ===== 规则到期：统一注册表（与 OPENING_EFFECTS / PASSIVE_TURN_END 同构）=====
   tickDuration 是同步的，而放逐结算里含 await，因此到期项先收集、再由 processTurnEnd 逐个 await。 */
const RULE_EXPIRE = {
// 虚化到期：解除免疫（放逐的结算走它自己的 'banish' 回调，两者 duration 相同、同时到期）
'intangibility': async (unit) => {
unit.intangible = false;
removeRule(unit, '虚化');
log(`${getSideLabel(unit)}${unit.name} 的虚化结束！`, 'log-buff');
refreshUnit(unit);
},
// 放逐到期：解除放逐 → 施放者立即对该目标发动三段攻击 → 全体神威 → 全体真实伤害
'banish': async (victim, item) => {
/* tickDuration 已把到期项移出列表，施放者只能从 item.extra 取（此刻 getRule 已查不到） */
const casterIdx = (item && item.extra) ? item.extra.casterIdx : undefined;
const caster = (casterIdx !== undefined) ? gameState.units[casterIdx] : (victim ? victim.banishedBy : null);
victim.banishedBy = null;
unlockActionValue(victim, 0);   // 解除锁定并从「放逐前的位置」继续（unlock 内含 banished = false）
refreshUnit(victim);
if (!caster || !caster.alive) {
log(`${getSideLabel(victim)}${victim.name} 从神威空间返回！`, 'log-skill');
updateActionBarDots(); return;
}
log(`放逐结束！${getSideLabel(caster)}${caster.name} 对 ${getSideLabel(victim)}${victim.name} 发动三段攻击！`, 'log-skill');
const segments = [{ dmgRate:0.5 }, { dmgRate:0.7 }, { trueRate:0.9 }];
for (const seg of segments) for (const r of calculateDamage(caster, seg, victim)) await applyDamage(caster, r, victim);
// 敌方全体附加 1 层神威
const foes = getAliveEnemies(caster).filter(isTargetable);
foes.forEach(f => {
const km = addMark(f, '神威', { stacks:1, maxStacks:3, duration:999, effect:'kamuiMark', extra:{ applierSide:caster.side } });
if (!km) return;
log(`${getSideLabel(f)}${f.name} 附加了1层神威！（当前${km.stacks}层）`, 'log-buff');
refreshUnit(f);
});
// 对敌方全体造成 36% 真实伤害
if (foes.length > 0) {
log(`${getSideLabel(caster)}${caster.name} 对敌方全体造成 ${Math.round(BANISH_AOE_TRUE_RATE*100)}% 真实伤害！`, 'log-skill');
await performAoeAttack(caster, { name:'神威·虚化', type:'aoe', trueRate:BANISH_AOE_TRUE_RATE, target:'enemy' });
}
// 注：已移除「施放者行动条+40%」—— 神威触发的行动条加成已足够，不再额外推进
updateActionBarDots(); refreshUnit(caster);
},
/* 狱门疆 2 件套的放逐到期：干净解除，不追打（带土那三段 + 全体神威是神威空间专属）。 */
'prisonRealm': async (victim) => {
victim.banishedBy = null;
unlockActionValue(victim, 0);   // 内含 banished = false，并从放逐前位置继续
log(`🟣 ${getSideLabel(victim)}${victim.name} 从狱门疆内部空间返回！`, 'log-skill');
refreshUnit(victim); updateActionBarDots();
}
};
// 状态/印记倒计时：duration 为 999 视为永久，不清空
/* ===== 被动技能 与 先机 =====
   被动（passive）：写在 HERO_DATA[name].passive = { name, desc, opening?, turnEnd? }
     - opening  : 游戏开始时触发一次的键（先机）
     - turnEnd  : 自身回合结束时触发的键
   先机（opening）与被动共用一套注册表，行为：开局每个单位依次结算自己的先机。
   ============================== */
const OPENING_EFFECTS = {
// 鬼王酒吞童子：友方全体大妖之力（免疫控制是被动「红莲」的一部分，不需要载体印记）
'jiutunMarks': (unit) => {
getAliveAllies(unit).forEach(ally => { addMark(ally, '大妖之力', { duration:999, effect:'daemonPower' }); refreshUnit(ally); });
log(`${getSideLabel(unit)}鬼吞先机！全体获得大妖之力！`, 'log-buff');
refreshUnit(unit);
},
// 心友犬神：先机施放「浪客归刃」（护盾 + 守势）—— 施放的是技能，因此要有技能演出
'langKeOpening': (unit) => {
log(`${getSideLabel(unit)}${unit.name} 先机！施放「浪客归刃」！`, 'log-buff');
// 先机结算处在同步链上，排队到开局后的安全点演出（见 flushPendingCasts）
queueSkillCast(unit, HERO_DATA[unit.name].skill);
},
// 鬼金羊：先机获得 3 层宿影阵 与 2 点怒气
'suyingOpening': (unit) => {
const m = addMark(unit, '宿影阵', { stacks:3, maxStacks:SUYINGZHEN_MAX_STACKS, duration:999, effect:'suYingZhen' });
const g = gainRage(unit, 2);
log(`${getSideLabel(unit)}${unit.name} 先机！获得 3 层宿影阵（当前${m ? m.stacks : 0}层）与 ${g} 点怒气！`, 'log-buff');
refreshUnit(unit);
},
// 流光追月神：速度最高的 3 名友方获得 2 点怒气
'liuguangRage': (unit) => {
const top3 = getAliveAllies(unit).slice().sort((a, b) => getEffectiveSpd(b) - getEffectiveSpd(a)).slice(0, 3);
top3.forEach(u => { const g = gainRage(u, 2); if (g > 0) refreshUnit(u); });
log(`${getSideLabel(unit)}流光先机！速度最高的3名友方（${top3.map(u => u.name).join('、')}）各获得2点怒气！`, 'log-buff');
}
};
const PASSIVE_TURN_END = {
/* 镰鼬「人多势众」：回合结束后 30% 概率使自身 +100% 行动条。
   实现：给自己 +100% 行动条（走 pendingActionBonus，回合结束后落地），
   于是本回合结束后立刻再次满条、连续行动 —— 即「新的回合」。
   比递归调用更安全：不会栈溢出，也不打断其它单位的行动条推进。 */
'renDuoShiZhong': async (unit) => {
if (Math.random() >= RENDUO_CHANCE) return;
grantActionValueBonus(unit, 100, '人多势众');
log(`🎲 ${getSideLabel(unit)}镰鼬 的「人多势众」触发！自身行动条+100%！`, 'log-skill');
},
// 绮罗舞：恢复全体友方 1 点怒气 → 怒气≥4 的友方获得 1 层照君
'qiluoDance': async (unit) => {
const allies = getAliveAllies(unit);
allies.forEach(u => { const g = gainRage(u, 1); if (g > 0) refreshUnit(u); });
log(`${getSideLabel(unit)}${unit.name} 的绮罗舞：全体友方恢复1点怒气！`, 'log-buff');
const blessed = allies.filter(u => (Number(u.rage) || 0) >= 4);
blessed.forEach(u => {
const zm = addMark(u, '照君', { stacks:1, maxStacks:5, duration:999, effect:'zhaojun' });
if (!zm) return;
log(`${getSideLabel(u)}${u.name} 怒气≥4，获得1层照君！（当前${zm.stacks}层）`, 'log-buff');
refreshUnit(u);
});
}
};
/* 自身回合开始：结算被动（与 applyPassiveTurnEnd 对称）。
   由 processUnitTurn 的「① 回合开始」段调用 —— 位置在 pendingSkip / 长星锁早退之后，
   被跳过的是「完整回合」（含回合开始与回合结束），这类被动自然也不触发；
   而眩晕只跳过行动阶段，回合开始照常结算，被动仍会触发。 */
async function applyPassiveTurnStart(unit) {
if (!isPassiveActive(unit)) return;
const key = (HERO_DATA[unit.name] || {}).passive?.turnStart;
if (key && PASSIVE_TURN_START[key]) await PASSIVE_TURN_START[key](unit);
}
/* 神魂套装的「回合开始」效果：招财 2 件套 —— 50% 概率获得 2 点怒气。
   与角色被动分开：神魂不属于被动，不受【被动失效】影响（那是角色被动的约束）。
   每次进入该单位的回合计一次，用 turnSeq 防重复（长星锁等分支可能重入）。 */
async function applyShenhunTurnStart(unit) {
if (typeof SHENHUN === 'undefined' || !SHENHUN.rollZhaocaiRage) return;
const seq = Number(unit.turnSeq) || 0;
if (unit.zhaocaiCheckedTurn === seq) return;   // 本回合已判定过
unit.zhaocaiCheckedTurn = seq;
if (!SHENHUN.rollZhaocaiRage(unit)) return;
const amount = Number(SHENHUN.ZHAOCAI_RAGE) || 2;
const got = gainRage(unit, amount);
if (got <= 0) return;   // 已满怒气：不触发提示，避免刷屏
log(`💰 ${getSideLabel(unit)}${unit.name} 的招财触发！获得 ${got} 点怒气（当前 ${unit.rage}）`, 'log-buff');
refreshUnit(unit);
await sleep(200);
}
const PASSIVE_TURN_START = {
/* 绮罗舞（回合开始）：所有携带流光的友方 → 获得 1 层照君 + 驱散随机 1 个减益状态 + 移除流光。
   这是流光转化为照君的主出口（另一出口是「携带者怒气减少」）。 */
'qiluoDanceStart': async (unit) => {
const carriers = getAliveAllies(unit).filter(u => hasMark(u, '流光'));
if (carriers.length === 0) return;
log(`💃 ${getSideLabel(unit)}${unit.name} 的绮罗舞：流光转化！`, 'log-buff');
carriers.forEach(u => {
const zm = addMark(u, '照君', { stacks:1, maxStacks:5, duration:999, effect:'zhaojun' });
if (zm) log(`${getSideLabel(u)}${u.name} 获得1层照君！（当前${zm.stacks}层）`, 'log-buff');
// 「负面状态」= 减益状态 → polarity 传 debuff
const removed = dispelStates(u, 1, CLEAR_POLARITY.DEBUFF);
removed.forEach(t => log(`${getSideLabel(u)}${u.name} 的减益状态「${t}」被驱散！`, 'log-buff'));
removeMark(u, '流光');
refreshUnit(u);
});
}
};
// 开局先机：遍历全体单位，按注册键结算
function applyOpeningEffects() {
gameState.units.forEach(u => {
if (isSummonUnit(u)) return;   // 召唤物无先机 / 无被动
const key = (HERO_DATA[u.name] || {}).opening;   // 先机：独立字段，与被动无关
if (key && OPENING_EFFECTS[key]) OPENING_EFFECTS[key](u);
});
/* 角色先机全部结算完，再结算神魂先机。
   顺序固定：这样怒源给的 2 点怒气不会被前面角色先机（如流光的先机给怒气）顶掉上限。 */
applyShenhunOpenings();
}
/* 神魂套装的先机效果：怒源 2 件套 —— 自身与随机 1 名其他友方各获得 2 点怒气。
   放在角色先机之后：先跑完角色侧的开局动作，神魂侧再加怒气，结果更可预期。 */
function applyShenhunOpenings() {
if (typeof SHENHUN === 'undefined' || !SHENHUN.hasSetTwoPiece) return;
const amount = Number(SHENHUN.NUYUAN_RAGE) || 2;
gameState.units.forEach(u => {
if (!u.alive || isSummonUnit(u) || !SHENHUN.hasSetTwoPiece(u, '怒源')) return;
const got = gainRage(u, amount);
if (got > 0) log(`🔮 ${getSideLabel(u)}${u.name} 的怒源触发！获得 ${got} 点怒气（当前 ${u.rage}）`, 'log-buff');
const others = getAliveAllies(u, false);
if (others.length > 0) {
const ally = others[Math.floor(Math.random() * others.length)];
const got2 = gainRage(ally, amount);
if (got2 > 0) log(`🔮 怒源：${getSideLabel(ally)}${ally.name} 也获得 ${got2} 点怒气（当前 ${ally.rage}）`, 'log-buff');
}
refreshUnit(u);
});
gameState.units.forEach(u => { if (!isSummonUnit(u)) refreshUnit(u); });
}
/* ===== 被动：受到伤害后 =====
   注册表与 OPENING_EFFECTS / PASSIVE_TURN_END 同构，由 passive.onDamaged 指定键。
   统一入口保证两件事：① 放逐期间被动失效；② 以后新增「受击后被动」不用再改 applyDamage。 */
const PASSIVE_ON_DAMAGED = {
/* 两面宿傩「斩击反转」：受到伤害后恢复自身 5% 最大生命值。
   走【恢复】而非【治疗】：固定数值，不吃治疗加成/减免/暴击。

   本入口位于死亡判定【之后】：能走到这里说明单位仍存活（hp > 0）。
   超量伤害会先触发 killUnit，宿傩照常阵亡，不存在「被打死又被恢复救回」。
   恢复统一走 performRestore：飘字样式与统计口径与其它恢复来源完全一致。 */
'sukunaRestore': async (unit) => {
const amount = Math.floor((Number(unit.maxHp) || 0) * SUKUNA_RESTORE_RATE);
if (amount <= 0) return;
const healed = await performRestore(unit, amount, null);
if (healed <= 0) return;
/* 不再自己 addStat：performRestore 内部已计入 statsRestoreDone，
   这里再加一次会导致结算面板上的「治疗+恢复」翻倍（此前正是重复统计）。 */
log(`🔁 ${getSideLabel(unit)}两面宿傩 的「斩击反转」！受到伤害后恢复 ${healed} 点生命值（5%最大生命值）！`, 'log-heal');
/* 不再自己出飘字：performRestore 内部已统一显示「恢复 +X」，
   这里再出一次就会与它重复（界面上出现「恢复+195」和「+195」两条）。 */
refreshUnit(unit);
},
/* 钉崎野蔷薇「共鸣」：自身受到伤害时，使【上一次被自身攻击的目标】受到本次伤害的
   等量传导伤害。伤害量由统一入口透传（只算真正掉的生命值，护盾吸收部分不计），
   与「受到伤害」的既有口径完全一致。
   ★ 来源是钉崎自己（unit），不是打她的那个人 —— 这笔传导伤害算她造成的，
     记账 / 受击后被动 / 致死击杀者一律按钉崎算。
   ★ 传导伤害走 applyConductionDamage（不经 applyDamage），不会反向再触发本被动，天然无链。 */
'gongming': async (unit, attacker, hpLoss) => {
const dmg = Math.max(0, Math.floor(Number(hpLoss) || 0));
if (dmg <= 0) return;
const t = unit.lastAttackedTarget;
if (!t || !t.alive || t === unit) return;
log(`⚡ ${getSideLabel(unit)}钉崎野蔷薇 的「共鸣」！将受到的 ${dmg} 点伤害等量传导给 ${getSideLabel(t)}${t.name}！`, 'log-skill');
await applyConductionDamage(unit, t, dmg, '共鸣·传导');
}
};
/* hpLoss：本次真正造成的生命损失。只有钉崎「共鸣」用到，其余被动忽略即可。 */
async function applyPassiveOnDamaged(unit, attacker, hpLoss) {
if (!isPassiveActive(unit)) return;                  // 放逐：目标被动失效
const key = (HERO_DATA[unit.name] || {}).passive && HERO_DATA[unit.name].passive.onDamaged;
if (key && PASSIVE_ON_DAMAGED[key]) await PASSIVE_ON_DAMAGED[key](unit, attacker, hpLoss);
}
/* ===== 被动的两种归属 =====
   ① 独立被动：仅写在 HERO_DATA[name].passive，受【被动失效】约束（isPassiveActive）。
   ② 技能内被动：被动效果是某个【主动技能】的一部分，用 passive.boundSkill 指明归属。
      它随技能走 —— 只受【无法行动】约束（cannotAct），**不受【被动失效】影响**。

   理由：技能既然能放出来，它自带的被动效果就该生效；若无法行动，技能本身就放不出来。
   这样即便将来出现「被动失效但不影响行动」的新机制，鬼金羊「宿影暗渡」的
   被动攒层与主动施放都照常工作 —— 这正是两个闸门分工的意义。

   新增「技能内被动」时：在 passive 上写明 boundSkill 即可，无需再改判定代码。

   【无法行动】的完整定义（务必对齐）：
     · 不能施放任何技能（含额外技能），也不能普攻；跳过行动阶段。
     · 只影响「需要角色本体去施放」的部分 —— 即【主动施放】与【普攻】。
     · 不影响【被动效果】的自动结算（攒层、免疫等），因为那不需要角色本体出手。 */
function getPassiveBoundSkill(unit) {
const p = unit && (HERO_DATA[unit.name] || {}).passive;
return (p && p.boundSkill) || null;
}
/* 被动效果是否结算：按归属分流。
   ★ 技能内被动的【被动效果】部分不需要角色本体去施放，因此不受【无法行动】约束 ——
     被【眩晕】照样结算（眩晕只挡"本体出手"，不挡自动结算）。
     但【放逐】额外规定「取消效果buff的变化」，故被放逐时 buff 冻结、不结算。
     真正被无法行动挡下的是它的【主动施放】部分（走 cannotAct）。 */
function isPassiveEffective(unit) {
if (!unit || !unit.alive) return false;
if (getPassiveBoundSkill(unit)) return !unit.banished;   // 技能内被动：眩晕照常，放逐冻结（buff 变化被取消）
return isPassiveActive(unit);                  // 独立被动：过被动失效闸门
}
/* ===== 被动生效判定 =====
   规则补充：【放逐】期间，目标被动失效。
   当前尚无被动与放逐冲突（被放逐者不行动、不可选中，多数被动自然不会触发），
   但为后续扩展预留统一闸门 —— 以后新增被动一律先过 isPassiveActive()。

   ⚠️ 与 cannotAct 的分工（务必分清）：
     · isPassiveActive → 管【被动效果】是否结算（攒层、受击恢复、回合结束效果…）
     · cannotAct       → 管【能否施放技能】（行动阶段 + 回合外的一切施放）
   两者互不替代。一个技能可以同时承载被动与施放（如鬼金羊「宿影暗渡」）：
     · 被动效果（攒宿影阵、免疫长星锁）→ 存活即生效，两个闸门都管不着；
     · 主动施放（减怒气）→ 只受 cannotAct 约束。
   判定请统一走 isPassiveEffective()。 */
function isPassiveActive(unit) {
if (!unit || !unit.alive) return false;
if (unit.banished) return false;      // 放逐：目标被动失效
return true;
}
// 自身回合结束：结算被动
async function applyPassiveTurnEnd(unit) {
if (!isPassiveActive(unit)) return;
const key = (HERO_DATA[unit.name] || {}).passive?.turnEnd;
if (key && PASSIVE_TURN_END[key]) await PASSIVE_TURN_END[key](unit);
}
/* ==================== 持续时间的统一口径：本回合不计入 ====================
   角色在自己回合内施放技能、给自己挂上有持续时间的 buff 时，
   【本次回合结束不递减】，从下一个回合结束才开始计入 —— 即「描述写几回合，就真的持续几回合」。

   实现方式：每个效果记下它是在持有者哪一号回合（unit.turnSeq）被施加 / 续期的；
   倒计时时若发现「是本回合刚挂上的」，就跳过这一次递减。
   回合号在 processUnitTurn 开头递增，因此下回合再 tick 时必然不相等，正常递减。

   这样一处生效、全局一致，不再需要各处手动 +1 抵消（此前流光、百豪、万法等各写各的，
   导致描述与实现长期对不上）。

   为什么用「持有者自己的回合号」而不是全局回合：
     每个人有自己的回合。给【队友】挂的效果，队友的回合是另一个时间点 ——
     它下次自己回合结束时就该递减（与旧行为一致），不该被施放者的回合号豁免。
     同理，回合外（如受击被动）给自己挂的效果，也不享受豁免。 */
/* 倒计时：duration 为 999 视为永久，不清空。
   注意顺序：先把存活项写回 unit[field]，再统一触发过期回调 ——
   否则回调里新增的印记（如流光到期给的照君）会被随后的赋值覆盖掉。 */
function tickDuration(unit, field, label, onExpire, seqRef) {
const list = unit[field] || [];
/* seqRef = 本次倒计时的「计时参照回合号」，默认取持有者自己的回合号。
   ★ 代 tick 场景必须显式传：被放逐者不走回合、自己的 turnSeq 永远不变，
     若仍按它自己比较，放逐会被永久豁免、再也不递减。放逐的倒计时由【施放者】的回合驱动，
     所以参照号要取施放者的。 */
const ref = (seqRef !== undefined) ? seqRef : unit.turnSeq;
const kept = [], expired = [];
list.forEach(item => {
if (item.duration === 999 || !item.duration) { kept.push(item); return; }
/* 本回合内刚施加 / 续期的效果：本次不递减（见上方口径说明）。 */
if (item.setTurnSeq !== undefined && item.setTurnSeq === ref) { kept.push(item); return; }
item.duration--;
if (item.duration <= 0) { log(`${getSideLabel(unit)}${unit.name} 的${label}「${item.type}」消失了`, 'log-buff'); expired.push(item); }
else kept.push(item);
});
unit[field] = kept;
if (onExpire) expired.forEach(it => onExpire(it, unit));
}
/* 印记自然到期回调。
   原「流光到期 → 驱散减益 + 给照君」已整体移到被动「绮罗舞」的【自身回合开始】结算
   （PASSIVE_TURN_START.qiluoDanceStart），且流光改为不自然到期。因此这里不再处理任何印记。 */
function onMarkExpire(item, unit) {
if (!item || !unit) return;
}
/* 清空一个单位的全部 buff / 效果 —— 阵亡时的唯一清理入口。
   清什么：状态(states) / 印记(marks) / 规则(rules) 三类全清，
           外加护盾、虚化、放逐、待结算行动条等运行时标志。
   不清什么：怒气与 statsXXX 统计（结算面板还要用）。 */
function clearAllEffects(unit) {
if (!unit) return;
unit.states = []; unit.marks = []; unit.rules = [];
unit.shield = 0; unit.intangible = false; unit.banished = false;
unit.pendingActionBonus = 0;
}
async function processTurnEnd(unit) {
/* 规则统一走同一套 tickDuration：duration 到期 → 收集 → 逐个 await 结算。
   放逐与虚化不再用 banishTurns 手动递减，
   持续回合数就是它们的 duration（BANISH_DURATION = 1，本回合不计入 = 施放者的下回合结束）。 */
const expiredRules = [];
const collectRule = (it, u) => expiredRules.push({ unit: u, item: it });
tickDuration(unit, 'states', '状态');
tickDuration(unit, 'marks', '印记', onMarkExpire);
/* 安全点③：状态 / 印记 tick 之后。眩晕等控制到期就在这里解除 ——
   立刻补放排队中的施放（如满层的宿影阵）。 */
await flushAfterActionable();
/* 放逐由**施放者**维持：被放逐者不行动（不会走 processTurnEnd），
   因此它的倒计时在施放者回合结束时代为推进 —— 放在 tick 自身规则之前。 */
/* 用 filter 而非 find：同一施放者可能同时维持多个放逐（带土神威 + 狱门疆），
   只 tick 第一个会让后面那个永远卡在内部空间。 */
const banishedVictims = gameState.units.filter(u => u.banished && u.banishedBy === unit);
banishedVictims.forEach(v => tickDuration(v, 'rules', '规则', collectRule, unit.turnSeq));   // 代 tick：参照施放者的回合号
tickDuration(unit, 'rules', '规则', collectRule);
for (const { unit: owner, item } of expiredRules) {
const fn = item && item.effect ? RULE_EXPIRE[item.effect] : null;
if (fn) await fn(owner, item);
}
/* 安全点④：规则到期之后（放逐解除等）→ 立刻补放排队的施放。 */
await flushAfterActionable();
await applyPassiveTurnEnd(unit);   // 被动：自身回合结束时结算
refreshUnit(unit);
}
// 获取单位所属阵营的显示标签
/* 演出 / UI 用的阵营名（无方括号）：双人对战显示「玩家1 / 玩家2」，人机显示「我方 / 敌方」 */
function sideLabelPlain(unit) {
if (!unit) return '';
if (gameMode === 'pvp') return unit.side === 'player' ? '玩家1' : '玩家2';
return unit.side === 'player' ? '我方' : '敌方';
}
function getSideLabel(unit) {
if (!unit) return '';
/* 联机：双方都按【自己的视角】说「我方 / 敌方」。
   房主操控 player 阵营 → player 是我方；客机操控 enemy 阵营 → enemy 是我方。
   日志文本是房主生成的（带房主视角的标签），客机端接收时会再翻转一次（见 Net.flipLog）。 */
if (typeof Net !== 'undefined' && Net.active) {
if (Net.role === 'guest') return unit.side === NET_GUEST_SIDE ? '【我方】' : '【敌方】';
if (Net.role === 'host')  return unit.side === 'player'        ? '【我方】' : '【敌方】';
}
if (gameMode === 'pvp') {
return unit.side === 'player' ? '【玩家1】' : '【玩家2】';
} else {
return unit.side === 'player' ? '【我方】' : '【敌方】';
}
}
// 战斗日志用 textContent 渲染，任何 HTML 标签都会原样显示成源码，因此统一剥离后再输出
/* ==================== 单位动画（联机同步） ====================
   「角色卡动一下」这类演出（attack / hit / heal / acting）原先全是直接改本地 DOM 的 class，
   不随状态快照同步 —— 于是客机端只看到血条数字在跳，完全没有任何动画，观感很僵硬。
   统一收口到 unitAnim()：房主端改 class 的同时广播 on/off 给客机。
   用 on/off 两条消息而不是「播 N 毫秒」单条，能忠实镜像房主的时序 ——
   房主 add 与 remove 之间的真实 sleep 就是两条消息的间隔，倍速也能自动跟上。 */
function unitAnim(idx, cls, on) {
const el = document.getElementById(`unit-${idx}`);
if (!el) return;
/* 状态没变化就不重复广播：一次行动里 attack-anim 会被 add 好几次
   （executeSkill 加一次、performSingleAttack 又加一次），
   重复 add 对 CSS 无意义，只会白白多发消息。 */
if (el.classList.contains(cls) === !!on) return;
el.classList.toggle(cls, !!on);
if (typeof Net !== 'undefined') Net.onAnim(idx, cls, !!on);
}
function unitAnimOn(idx, cls)  { unitAnim(idx, cls, true); }
function unitAnimOff(idx, cls) { unitAnim(idx, cls, false); }
/* 清掉某单位上所有演出 class（重开 / 重新初始化时用，避免残留） */
function clearUnitAnims(idx) {
const el = document.getElementById(`unit-${idx}`); if (!el) return;
['attack-anim', 'hit', 'heal-anim', 'acting'].forEach(c => el.classList.remove(c));
}

function log(text, className = 'log-normal') { const logEl = document.getElementById('battle-log'); if (!logEl) return; const entry = document.createElement('div'); entry.className = `log-entry ${className}`; const plain = String(text).replace(/<[^>]*>/g, ''); entry.textContent = `[${new Date().toLocaleTimeString()}] ${plain}`; logEl.appendChild(entry); logEl.scrollTop = logEl.scrollHeight; if (typeof Net !== 'undefined') Net.onLog(text, className); }
function showFloatingText(target, text, className) { const container = document.getElementById('floating-container'); const el = document.getElementById(`unit-${idxOf(target)}`); if (!el) return; const rect = el.getBoundingClientRect(); const floating = document.createElement('div'); floating.className = `floating-text ${className}`; floating.textContent = text; floating.style.left = (rect.left + rect.width/2) + 'px'; floating.style.top = (rect.top - 20) + 'px'; container.appendChild(floating); setTimeout(() => floating.remove(), 1000); if (typeof Net !== 'undefined') Net.onFloat(idxOf(target), text, className); }
/* 倍速：所有等待时长除以 SPEED_MULTIPLIER（1 = 正常，2 = 两倍速）。
   只缩放「等待」，不改动任何游戏逻辑，因此结果与倍速无关。 */
let SPEED_MULTIPLIER = 1;
function sleep(ms) { return new Promise(r => setTimeout(r, Math.max(0, Math.round(ms / (SPEED_MULTIPLIER || 1))))); }
/* ===== 技能演出（Cut-in）=====
   施放技能前播放：角色贴图滑入 + 技能名大字 → 停留 → 淡出。
   开关：SKILL_CUTIN_ENABLED（总开关）、SKILL_CUTIN_FOR_NORMAL（普攻是否也播，默认关）
   时长：SKILL_CUTIN_IN / HOLD / OUT（毫秒），想调节奏改这三个常量即可。
   跳过：点击演出层任意处立即结束；结束后 resolve，战斗继续。 */
const SKILL_CUTIN_ENABLED    = true;   // 总开关：false 则完全不播
const SKILL_CUTIN_FOR_NORMAL = false;  // 普攻是否也播（默认关：普攻太频繁，会拖慢节奏）
const SKILL_CUTIN_IN   = 300;          // 滑入
const SKILL_CUTIN_HOLD = 560;          // 停留
const SKILL_CUTIN_OUT  = 280;          // 淡出
/* 触发式施放（被动 / 印记 / 额外技能）与主动施放统一用完整时长 —— 让玩家同样看清楚。 */
const SKILL_CUTIN_QUICK_HOLD = SKILL_CUTIN_HOLD;
let skillCutinTimer = null;            // 当前演出的结束句柄（供点击跳过）
function playSkillCutin(unit, skillName, isNormal = false, quick = false, imgOverride = '') {
if (!SKILL_CUTIN_ENABLED) return Promise.resolve();
if (isNormal && !SKILL_CUTIN_FOR_NORMAL) return Promise.resolve();
const el = document.getElementById('skill-cutin');
if (!el || !unit) return Promise.resolve();
const d = HERO_DATA[unit.name] || {};
const color = d.color || (unit.side === 'enemy' ? '#ef5350' : '#4fc3f7');
el.style.setProperty('--sc-color', color);
el.classList.toggle('enemy', unit.side === 'enemy');
el.classList.toggle('normal', !!isNormal);
el.querySelector('.sc-hero').innerHTML = battleAvatarInner(unit, '', imgOverride);
el.querySelector('.sc-kind').textContent = isNormal ? 'NORMAL ATTACK' : 'SKILL';
el.querySelector('.sc-skill').textContent = skillName || '';
el.querySelector('.sc-heroname').textContent = unit.name;
el.querySelector('.sc-side').textContent = sideLabelPlain(unit) + (d.tag ? ' · ' + d.tag : '');
if (typeof Net !== 'undefined') Net.onCutin(idxOf(unit), skillName, isNormal);
// 先移除动画类并强制重排，保证连续施放时动画能重新启动
el.classList.remove('play', 'out');
void el.offsetWidth;
el.classList.add('show', 'play');
return new Promise(resolve => {
let done = false;
const finish = () => {
if (done) return; done = true;
clearTimeout(skillCutinTimer); skillCutinTimer = null;
el._cutinFinish = null;
// 连同方向类一起清掉，避免残留（此时 display 已为 none，不会影响淡出动画）
el.classList.remove('play', 'out', 'show', 'enemy', 'normal');
resolve();
};
const hold = quick ? SKILL_CUTIN_QUICK_HOLD : SKILL_CUTIN_HOLD;
// 演出时长同样受倍速影响（setTimeout 不走 sleep，需手动缩放）
const sp = SPEED_MULTIPLIER || 1;
skillCutinTimer = setTimeout(() => {
el.classList.add('out');
skillCutinTimer = setTimeout(finish, Math.round(SKILL_CUTIN_OUT / sp));
}, Math.round((SKILL_CUTIN_IN + hold) / sp));
el._cutinFinish = finish;
});
}
/* 点击演出层任意处跳过 */
document.getElementById('skill-cutin')?.addEventListener('click', () => {
const el = document.getElementById('skill-cutin');
if (el && el._cutinFinish) el._cutinFinish();
});
/* 强制结束演出：开局 / 重开 / 战斗结束时调用，避免残留遮罩挡住界面 */
function stopSkillCutin() {
const el = document.getElementById('skill-cutin');
if (el && el._cutinFinish) { el._cutinFinish(); return true; }
if (el) { el.classList.remove('play', 'out', 'show'); }
return false;
}
function checkBattleEnd() {
const playerAlive = gameState.playerTeam.some(i => isTargetable(gameState.units[i]));
const enemyAlive = gameState.enemyTeam.some(i => isTargetable(gameState.units[i]));
if (!playerAlive || !enemyAlive) {
gameState.phase = 'gameOver'; gameState.paused = true;
if (gameState.rafId) cancelAnimationFrame(gameState.rafId);
let resultText = '', resultClass = '';
if (!playerAlive && !enemyAlive) { resultText = '🤝 平局！'; resultClass = 'draw'; }
else if (!enemyAlive) { resultText = gameMode === 'pvp' ? '🎉 玩家1 胜利！' : '🎉 战斗胜利！'; resultClass = 'win'; }
else { resultText = gameMode === 'pvp' ? '🎉 玩家2 胜利！' : '💀 战斗失败...'; resultClass = 'lose'; }
showResultScreen(resultText, resultClass);
return true;
}
return false;
}
/* 「再来一局」按钮绑定：抽成函数，房主与客机各调一次。
   ★ 客机端必须也绑 —— 它的结算页是收到 over 后自己渲染的，
     从不执行 showResultScreen()，原先只有房主绑了，客机点了毫无反应。 */
function bindRematchButton() {
const btn = document.getElementById('btn-rematch');
if (!btn || btn._bound) return;
btn._bound = true;
/* 退出按钮：只在联机模式下出现。
   单机结算没有"连接"可断，显示它只会让人误以为要退出游戏。 */
const qb = document.getElementById('btn-quit-net');
if (qb) {
const online = (typeof Net !== 'undefined' && Net.active);
qb.classList.toggle('show', !!online);
if (!qb._bound) {
qb._bound = true;
qb.addEventListener('click', () => netQuitToModeSelect());
}
}
btn.addEventListener('click', () => {
/* 联机：不能各点各的 —— 一方直接 resetGame() 会把自己踢回主界面并断掉联机，
   另一方却还停在结算页。改为【申请制】：一方发起 → 另一方同意 →
   双方一起回到联机选人界面（连接保持）。 */
const online = (typeof Net !== 'undefined' && Net.active);
if (!online) {
/* 神魂副本：直接回到同一副本选人（保留阵容），省去重新点一遍探索 */
if (window.PVE && typeof window.PVE.replay === 'function' && window.PVE.replay()) return;
document.getElementById('result-screen').classList.remove('show');
resetGame();
return;
}
netRequestRematch();
});
}
function showResultScreen(resultText, resultClass) {
renderResultTable();
if (typeof Net !== 'undefined') Net.sendOver(String(resultText).replace(/<[^>]*>/g, ''), resultClass);
const titleEl = document.getElementById('result-title');
titleEl.textContent = resultText;
titleEl.className = 'result-title ' + resultClass;
document.getElementById('result-sub').textContent = gameMode === 'pvp' ? '双人对战 · 战斗数据统计' : '战斗数据统计';
document.getElementById('battle-screen').style.display = 'none';
document.getElementById('overlay').classList.remove('show');
const rs = document.getElementById('result-screen');
rs.classList.add('show');
rs.scrollTop = 0;
bindRematchButton();
/* 神魂副本：胜利发券 / 发石，结算副标题写明奖励结果 */
if (window.PVE && typeof window.PVE.onBattleEnd === 'function') window.PVE.onBattleEnd(resultClass);
}
function fmt(n) { return (Number(n) || 0).toLocaleString('zh-CN'); }
function renderResultTable() {
const body = document.getElementById('result-body');
body.innerHTML = '';
const sideLabels = gameMode === 'pvp'
? { player:'🔵 玩家1', enemy:'🔴 玩家2' }
: { player:'🟢 我方', enemy:'🔴 敌方' };
const sides = [
{ key:'player', title:sideLabels.player, cls:'player-side', team:gameState.playerTeam },
{ key:'enemy',  title:sideLabels.enemy,  cls:'enemy-side',  team:gameState.enemyTeam }
];
let html = '';
sides.forEach(side => {
const team = side.team;
const sorted = team.slice().sort((a, b) => {
return (gameState.units[b].statsDamageDealt || 0) - (gameState.units[a].statsDamageDealt || 0);
});
let totalDealt = 0, totalTaken = 0, totalHeal = 0, totalShield = 0;
const rows = sorted.map(idx => {
const u = gameState.units[idx];
const dealt = Number(u.statsDamageDealt) || 0;
const taken = Number(u.statsDamageTaken) || 0;
const heal  = (Number(u.statsHealDone) || 0) + (Number(u.statsRestoreDone) || 0); // 治疗 + 恢复
const shield= Number(u.statsShieldDone) || 0;
totalDealt += dealt; totalTaken += taken; totalHeal += heal; totalShield += shield;
return `<tr>
<td class="col-name"><span class="role-dot" style="background:${u.color}"></span>${u.name}</td>
<td class="num num-dmg">${fmt(dealt)}</td>
<td class="num num-taken">${fmt(taken)}</td>
<td class="num num-heal">${fmt(heal)}</td>
<td class="num num-shield">${fmt(shield)}</td>
</tr>`;
}).join('');
html += `<div class="result-side-block">
<div class="result-side-title ${side.cls}">${side.title} · 阵容统计</div>
<table class="result-table">
<thead><tr>
<th style="text-align:left">角色</th>
<th>造成伤害</th>
<th>承受伤害</th>
<th>治疗/恢复</th>
<th>护盾量</th>
</tr></thead>
<tbody>${rows}</tbody>
</table>
<div class="result-team-total">合计：伤害 <span>${fmt(totalDealt)}</span> ｜ 承伤 <span>${fmt(totalTaken)}</span> ｜ 治疗 <span>${fmt(totalHeal)}</span> ｜ 护盾 <span>${fmt(totalShield)}</span></div>
</div>`;
});
body.innerHTML = html;
}
/* ==================== 教程与规则说明 ====================
   入口：选人界面右上角「教程」按钮。
   结构：标签页 = 3 步入门教程（必读）+ 4 个专项详解（按需查阅）。
   专项页中的计算一律调用游戏真实函数（calculateDamage / performHeal 等），
   以保证所述规则与实战完全一致。
   ================================================================ */

/* ---------- 入门教程：仅三步，只讲"看得懂就能玩"的内容 ---------- */
const TUTORIAL_STEPS = [
{
title: '一、胜负条件',
body: `<p>对战双方各上场 <span class="k">6 名角色</span>，于同一战场内交战。</p>
<ul>
<li>将敌方全部角色击败，即判定为<span class="g">胜利</span>；</li>
<li>我方全部角色被击败，即判定为<span class="r">失败</span>。</li>
</ul>
<p>战斗以<span class="k">回合</span>推进：每当一名角色的行动条达到满值，即获得一次行动机会，行动结束后其行动条归零，重新开始累积。</p>
<div class="tip">因此，"谁能更频繁地获得行动机会"是决定胜负的核心因素。</div>`
},
{
title: '二、角色信息',
body: `<p>战场上每一名角色均以一张卡片表示，自上而下依次为：</p>
<ul>
<li><span class="k">角色名</span>：位于卡片顶部；</li>
<li><span class="r">生命条</span>：显示当前生命值与最大生命值，归零即阵亡；</li>
<li><span class="b">怒气条</span>：积攒至指定数值后方可施放技能，上限为 <span class="k">10 点</span>；</li>
<li><span class="cy">护盾值</span>：仅在持有护盾时显示，优先于生命值承受伤害。</li>
</ul>
<p>角色头顶所显示的小标签为其当前持有的<span class="k">效果buff</span>，具体含义可在"效果buff"页查阅。</p>
<div class="warn">角色阵亡后，卡片转为<span class="k">灰色</span>，同时从行动条上移除，且不再参与任何结算。</div>`
},
{
title: '三、行动条',
body: `<p>屏幕中央的横条为<span class="k">行动条</span>，每名角色以一个头像圆点表示。</p>
<ul>
<li>圆点自左向右移动，<span class="k">速度越高的角色移动越快</span>；</li>
<li>圆点抵达最右端（满值）时，该角色获得行动机会；</li>
<li>行动结束后，其圆点回到最左端，重新开始移动。</li>
</ul>
<p>轮到我方角色行动时，屏幕下方会出现操作按钮：</p>
<ul>
<li><span class="g">普攻</span>：不消耗怒气，施放后自身获得 <span class="g">2 点怒气</span>；</li>
<li><span class="r">技能</span>：消耗 <span class="k">4 点怒气</span>，效果显著强于普攻。</li>
</ul>
<div class="tip">怒气不足时，技能按钮呈灰色且不可点击。点击<span class="k">"自动"</span>按钮可交由系统代为操作。</div>
<p>行动条的进阶规则已整理于专项说明之中，可在顶部"行动条"页按需查阅。</p>`
}
];

/* ---------- 专项详解：按需查阅，非必读 ---------- */
/* ★ 教程里会随版本增长的数量文案，一律不从字面写死：
     · 套装套数 → 读 shenhun.js 的 SETS 长度；
     · 伤害类型总数 → 读下面 DAMAGE_TYPES 长度。
   以前「共 6 套 / 共 7 套」「五种伤害」都要手工跟着改，漏一次就是玩家可见的错。
   两个都在【渲染时】求值（html 写成函数），不依赖脚本加载顺序；
   模块未加载 / 出异常时退回当前实际数量，教程照常显示。 */
const DAMAGE_TYPES = ['直接伤害', '溅射伤害', '真实伤害', '固定伤害', '传导伤害'];
function cnNum(n) {
const d = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
if (n >= 0 && n <= 10) return d[n];
if (n > 10 && n < 20) return '十' + d[n - 10];
return String(n);                 // 20 以上用阿拉伯数字，不会写错
}
function tutorialSetCount() {
try {
/* SETS 是 shenhun.js 对外导出的数组本体，加新套装时长度自己会变。 */
if (typeof SHENHUN !== 'undefined' && SHENHUN.SETS && SHENHUN.SETS.length) return SHENHUN.SETS.length;
} catch (e) { /* 落到下面的兜底 */ }
return 7;                         // 神魂模块未加载时的当前实际套数
}
const TUTORIAL_TABS = [
{
key: 'damage', label: '伤害',
html: () => `<h3>伤害类型与计算</h3>
<p>游戏中存在${cnNum(DAMAGE_TYPES.length)}种彼此独立的伤害类型，其计算方式各不相同。以下公式均为游戏内实际采用的计算方式。</p>

<h4>一、直接伤害</h4>
<p>未作特殊说明的伤害均为直接伤害，其计算受目标防御影响。</p>
<div class="formula"><span class="fname">未暴击</span>
<code>实际伤害 = 攻击 × 技能伤害率 × (1 − 目标免伤率) × 最终伤害率 × (1 − 目标最终免伤率)</code></div>
<div class="formula"><span class="fname">暴击</span>
<code>实际伤害 = 攻击 × 技能伤害率 × 暴击伤害率 × (1 − 目标免伤率) × 最终伤害率 × (1 − 目标最终免伤率)</code></div>
<div class="formula"><span class="fname">目标免伤率</span>
<code>免伤率 = 目标防御 ÷ (目标防御 + 施法者攻击)</code>
<span class="note">免伤率与最终免伤率均被限制在 0% ~ 100% 之间，不会出现负伤害。</span></div>

<h4>二、溅射伤害</h4>
<p>溅射伤害是直接伤害的一种衍生形式，按主目标所承受的直接伤害计算，<span class="k">不再单独计算免伤率与最终免伤率</span>。</p>
<div class="formula"><span class="fname">溅射伤害</span>
<code>溅射伤害 = 主目标实际承受的直接伤害 × 溅射系数</code>
<span class="note">若主目标因免疫、护盾完全吸收或伤害转移而未实际承受伤害，则溅射伤害为 0。</span></div>

<h4>三、真实伤害</h4>
<p>真实伤害无视目标防御与最终免伤，可暴击。</p>
<div class="formula"><span class="fname">真实伤害</span>
<code>真实伤害 = 攻击 × 技能伤害率 × 最终伤害率</code>
<span class="note">暴击时额外乘以暴击伤害率；不受免伤率与最终免伤率影响。</span></div>

<h4>四、固定伤害</h4>
<p>固定伤害是一个<span class="k">确定数值</span>（通常按目标最大生命值的百分比计算），与攻击力无关。</p>
<div class="formula"><span class="fname">固定伤害</span>
<code>固定伤害 = 指定数值（如：目标最大生命值 × 10%）</code>
<span class="note"><b>定义</b>：固定伤害是一种伤害类型，<b>无视护盾</b>，<b>无法被转移</b>，伤害量为条件固定值。<br>
具体表现为：不判暴击，不吃攻击、免伤率、最终伤害率与最终免伤率；无视护盾，直接扣减生命值；<br>
无法被转移（白藏主「狐守」代伤不生效）；仍会触发心友犬神「守势」的反击；虚化（免疫伤害）依然生效。</span></div>

<h4>五、传导伤害</h4>
<p>传导伤害由<span class="k">另一次伤害的实际数值</span>按传导系数派生，与攻击力、倍率、防御均无关。</p>
<div class="formula"><span class="fname">传导伤害</span>
<code>传导伤害 = 伤害数值 × 传导系数</code>
<span class="note"><b>定义</b>：传导伤害是一种伤害类型，<b>不参与伤害公式计算</b>，<b>直接造成伤害</b>，<b>无视护盾</b>。<br>
<b>注</b>：此前描述的「等量」默认传导系数为 <b>100%</b>（当前钉崎野蔷薇的「共鸣」与「稻草人」均为 100%）。<br>
具体表现为：不判暴击，不吃免伤率、最终伤害率与最终免伤率；无视护盾，直接扣减生命值；无法被转移。<br>
虚化与放逐（规则级免疫伤害）依然生效。<br>
目前由钉崎野蔷薇的「共鸣」与「稻草人」产生：稻草人受到的伤害会等量传导给连接目标。</span></div>

<div class="demo-box">
<h4>伤害计算演示</h4>
<div class="demo-row">
<label>攻击 <input id="in-atk" type="number" value="1000"></label>
<label>防御 <input id="in-def" type="number" value="400"></label>
<label>倍率 <input id="in-rate" type="number" value="1" step="0.1"></label>
</div>
<div class="demo-row">
<button class="demo-btn" id="b-direct" type="button">直接伤害</button>
<button class="demo-btn" id="b-crit" type="button">直接（暴击）</button>
<button class="demo-btn" id="b-true" type="button">真实伤害</button>
</div>
<div class="demo-out" id="dmg-out">选择一种伤害类型查看计算过程。</div>
</div>`
},
{
key: 'hitResist', label: '命中/抵抗',
html: `<h3>效果命中与效果抵抗</h3>
<p>技能描述中的概率分为两类：<span class="k">基础概率</span>与<span class="k">直接概率</span>。只有<span class="g">基础概率</span>会受效果命中与效果抵抗影响，<span class="r">直接概率</span>是固定值，不受这两个属性影响。</p>

<h4>基础概率</h4>
<p>标注为「XX%基础概率」的控制效果（如眩晕、混乱），其<span class="k">实际生效概率</span>由攻击方的<span class="g">效果命中</span>与目标方的<span class="r">效果抵抗</span>共同决定：</p>
<div class="formula"><span class="fname">实际生效概率</span>
<code>实际概率 = 基础概率 × (1 + 攻击方效果命中 − 目标方效果抵抗)</code>
<span class="note">结果被钳制在 <span class="k">0% ~ 100%</span> 之间，不会出现负数或超 100% 的情况。</span></div>
<ul>
<li><span class="g">效果命中</span>：攻击方角色的属性，数值越高，控制效果越容易命中。</li>
<li><span class="r">效果抵抗</span>：目标方角色的属性，数值越高，越不容易被控制。</li>
</ul>

<h4>直接概率</h4>
<p>技能描述中直接给出、未标注「基础概率」的百分比（例如「50%概率造成伤害」），属于<span class="r">直接概率</span>，按字面数值固定生效，<span class="r">不受效果命中与效果抵抗影响</span>。</p>

<h4>举例</h4>
<p>攻击方效果命中 10%、基础概率 40%，目标效果抵抗 20%：</p>
<div class="formula"><span class="fname">计算过程</span>
<code>实际概率 = 40% × (1 + 10% − 20%) = 40% × 0.9 = 36%</code></div>
<p>同一技能，目标效果抵抗提升到 50%：</p>
<div class="formula"><span class="fname">计算过程</span>
<code>实际概率 = 40% × (1 + 10% − 50%) = 40% × 0.6 = 24%</code></div>

<div class="tip">目前所有角色的效果命中与效果抵抗均为 <span class="k">0%</span>，因此基础概率类控制效果的实际概率就等于技能描述中的基础概率。装备系统（神魂）上线后将提供这些属性的加成。</div>`
},
{
key: 'heal', label: '治疗／恢复',
html: `<h3>治疗与恢复</h3>
<p>游戏中回复生命的机制分为<span class="g">治疗</span>与<span class="cy">恢复</span>两套，二者相互独立，不可混同。</p>

<h4>一、治疗</h4>
<p>治疗量以<span class="k">施法者的攻击力</span>为基数计算，受目标的治疗加成与治疗减免影响，且<span class="k">可以暴击</span>。</p>
<div class="formula"><span class="fname">治疗量</span>
<code>治疗量 = 攻击 × 技能治疗率 × 目标治疗加成 × (1 − 目标治疗减免)</code>
<span class="note">若判定暴击，则额外乘以施法者的暴击伤害率。</span></div>
<p>现有治疗来源：雪拉比普攻「治愈」、纲手技能「百豪之术」。</p>

<h4>二、恢复</h4>
<p>恢复量为一<span class="k">固定数值</span>，<span class="k">不受</span>治疗加成、治疗减免与暴击的任何影响。</p>
<div class="formula"><span class="fname">恢复量</span>
<code>恢复量 = 指定数值（如最大生命值的固定百分比）</code></div>
<p>现有恢复来源：雪拉比技能「预知未来」（伤害均摊值与最大生命值 9%）、维迦击杀后的最大生命值 30%。</p>

<div class="tip">简言之：<span class="g">治疗</span>按攻击力计算且受各类加成影响；<span class="cy">恢复</span>为定值，不受任何影响。</div>`
},
{
key: 'buff', label: '效果buff',
html: `<h3>状态、印记与规则</h3>
<p>角色所持有的效果分为三类，在界面上以不同颜色的标签区分。三类效果的<span class="k">清除规则</span>存在本质差异。</p>
<div class="buff-cards">
<div class="buff-card bc-state" data-k="state"><div class="bn">状态（蓝）</div><div class="bd">可驱散、可移除</div></div>
<div class="buff-card bc-mark" data-k="mark"><div class="bn">印记（紫）</div><div class="bd">不可驱散、可移除</div></div>
<div class="buff-card bc-rule" data-k="rule"><div class="bn">规则（橙）</div><div class="bd">仅由特定条件清除</div></div>
<div class="buff-card bc-clear" data-k="clear"><div class="bn">驱散 / 移除</div><div class="bd">中性操作，类型由技能指定</div></div>
</div>
<div class="demo-out" id="buff-out">点击上方任一类别，查看其详细规则与实例。</div>

<h4>补充说明</h4>
<ul>
<li><span class="b">状态</span>与<span class="p">印记</span>均区分<span class="g">增益</span>与<span class="r">减益</span>；<span class="o">规则</span>不作此区分。</li>
<li>角色<span class="k">阵亡时清空全部状态、印记与规则</span>，且阵亡后不再接受任何新效果。</li>
</ul>`
},
{
key: 'action', label: '行动条',
html: `<h3>行动条规则详解</h3>

<h4>一、行动条总长度</h4>
<div class="formula"><span class="fname">总长度</span>
<code>行动条总长度 = 开局最高有效速度 × 1</code>
<span class="note">该数值于开局时、先机结算之前确定，此后不再重新计算。先机带来的速度变化不会影响总长度。</span></div>

<h4>二、开局站位</h4>
<div class="formula"><span class="fname">开局位置</span>
<code>开局位置 = 自身有效速度 ÷ 行动条总长度 × 100%</code>
<span class="note">即速度最高的角色开局即处于满值，可立即行动；其余角色按速度比例依次排布。该站位同样于先机之前结算。</span></div>

<h4>三、推进速度</h4>
<div class="formula"><span class="fname">每秒推进</span>
<code>每秒推进 = 有效速度 ÷ 行动条总长度 × 100% × 0.75</code></div>

<h4>四、溢出值</h4>
<p>行动条的显示与判定上限均为 <span class="k">100%</span>。当角色因受击退、被拉条等效果导致数值超出 100% 时，超出的部分将作为<span class="k">溢出值</span>单独记录，仅用于排序，不会使其圆点移出轨道。</p>
<div class="formula"><span class="fname">溢出值</span>
<code>溢出值 = 当前行动条数值 − 100%</code></div>

<h4>五、同时满值的行动顺序</h4>
<p>若多名角色在同一时刻达到满值，按以下优先级依次比较：</p>
<ul>
<li>① <span class="k">溢出值</span>降序——溢出值越高，行动顺序越靠前；</li>
<li>② <span class="k">有效速度</span>降序；</li>
<li>③ 随机决定。</li>
</ul>

<h4>六、锁定</h4>
<p>处于「放逐」的角色，其行动条被<span class="k">锁定在放逐前的位置</span>（而非归零）。锁定期间，任何推进、击退与设定数值的效果均不生效。</p>
<div class="warn">锁定的优先级高于一切行动条改变效果。若放逐的施放者阵亡，该放逐立即解除，被放逐者自锁定位置继续。</div>`
},
{
key: 'shenhun', label: '神魂',
html: () => `<h3>神魂系统</h3>
<p>神魂是<span class="k">战斗外</span>的养成系统：在开战前一次性结算进角色基础属性，<span class="k">战斗过程中不再变化</span>。</p>

<h4>一、神魂的构成</h4>
<p>每个神魂有三项要素：</p>
<ul>
<li><span class="k">套装</span>：决定套装效果（共 ${tutorialSetCount()} 套）。</li>
<li><span class="k">号位</span>：1 / 2 / 3 号位，每个角色每个号位只能装 1 个，共 3 个槽位。</li>
<li><span class="k">稀有度</span>：普通 / 罕见 / 珍贵 / 史诗 / 传说 / 神话，决定数值高低。</li>
</ul>

<h4>二、主属性与副属性</h4>
<p><span class="k">主属性</span>按号位限定池子随机；百分比类带 %，<span class="g">速度</span>按固定点数（不带 %，数值与其它主属性对齐）：</p>
<ul>
<li><span class="b">1 号位</span>：攻击加成 / 防御加成 / 生命加成 / 速度</li>
<li><span class="b">2 号位</span>：上述前三种 + 效果命中 / 效果抵抗</li>
<li><span class="b">3 号位</span>：上述前三种 + 暴击率 / 暴击伤害</li>
</ul>
<p><span class="k">副属性</span>固定 4 条、互不重复，从 8 条属性中随机抽取，各自在对应稀有度的区间内独立取值。<span class="g">速度</span>既可作 1 号位主属性，也可作副属性；两者都按固定点数累加。</p>
<div class="formula"><span class="fname">属性结算</span>
<code>百分比类：最终值 = 面板基数 × (1 + 各加成之和)</code>
<code>速度：最终值 = 面板基数 + 各加成之和</code>
<span class="note">加成之间互不放大 —— 全部以角色面板为基数分别计算后相加。</span></div>

<h4>三、获取与养成</h4>
<ul>
<li><span class="g">抽卡</span>：每次消耗 1 张神魂券。每 10 抽必出史诗及以上，每 30 抽必出传说及以上；命中保底后计数归零。</li>
<li><span class="g">每日登录</span>：发放神魂券 20 张（= 20 抽）、重铸石 2 个。</li>
<li><span class="g">合成</span>：两个「同套装 + 同稀有度」的神魂合成为高一阶同套装神魂。神话已达顶，不可再合成。</li>
<li><span class="g">重铸</span>：消耗 1 个重铸石，保留稀有度，重随套装 / 号位 / 主副属性。</li>
<li><span class="g">分解</span>：已锁定或已装备的神魂无法分解，需先解锁 / 卸下。</li>
</ul>

<h4>四、套装效果一览</h4>
<p>每个套装都有 <span class="k">1 件套</span>（纯属性加成，开战前结算）与 <span class="k">2 件套</span>（战斗内生效）两档。每凑齐 2 件组成一组 2 件套（<span class="k">2 件套只激活一次</span>），而这一组自身就包含一次 1 件套效果；剩下不足 2 件的散件，再各算一次 1 件套。</p>
<div class="formula"><span class="fname">1 件套生效次数</span>
<code>1 件 → 1 次　·　2 件 → 1 次　·　3 件 → 2 次</code>
<span class="note">例如 3 件无双 = 暴击率 +30%（两次 1 件套）＋ 一组 2 件套的暴伤效果。</span></div>
<div class="buff-cards">
<div class="buff-card bc-shenhun" data-s="无双"><div class="bn">无双</div><div class="bd">1件 暴击率+15%　·　2件 每损失1%生命 +0.5%暴伤</div></div>
<div class="buff-card bc-shenhun" data-s="心魔"><div class="bn">心魔</div><div class="bd">1件 效果命中+15%　·　2件 造成伤害时25%基础概率附加混乱（持续1回合）</div></div>
<div class="buff-card bc-shenhun" data-s="百穿"><div class="bn">百穿</div><div class="bd">1件 攻击+15%　·　2件 攻击时50%概率无视50%防御</div></div>
<div class="buff-card bc-shenhun" data-s="束缚"><div class="bn">束缚</div><div class="bd">1件 攻击+15%　·　2件 额外耗1怒气，本回合最终伤害+30%</div></div>
<div class="buff-card bc-shenhun" data-s="怒源"><div class="bn">怒源</div><div class="bd">1件 防御+15%　·　2件 先机：自身与随机1友方各+2怒气</div></div>
<div class="buff-card bc-shenhun" data-s="招财"><div class="bn">招财</div><div class="bd">1件 生命+15%　·　2件 回合开始50%概率+2怒气</div></div>
<div class="buff-card bc-shenhun" data-s="狱门疆"><div class="bn">狱门疆</div><div class="bd">1件 效果命中+15%　·　2件 首次攻击70%基础概率放逐目标（至自身下回合结束或阵亡，多名友方仅生效一次）</div></div>
</div>
<div class="demo-out" id="shenhun-out">点击上方任一套装，查看其效果详解与判定细节。</div>

<div class="tip">角色<span class="k">详情界面</span>的属性会以「基础值<span style="color:#ffd700;font-weight:bold">+神魂加成</span>」的形式显示，金色部分即神魂带来的增量。</div>

<div class="warn">联机对战（含两种 BP 模式）时，双方各自使用<span class="k">自己设备上</span>为该角色装备的神魂；伤害结算仍以房主为准。</div>`
}
];

let tutorialTab = 'guide';   // guide = 三步入门；其余为专项页 key
let tutorialStep = 0;

function openTutorial() {
tutorialTab = 'guide'; tutorialStep = 0;
document.getElementById('tutorial-overlay').classList.add('show');
renderTutorial();
}
function closeTutorial() { document.getElementById('tutorial-overlay').classList.remove('show'); }
function setTutorialTab(key) { tutorialTab = key; renderTutorial(); }

function renderTutorial() {
// 标签栏
const tabsHost = document.getElementById('tutorial-tabs'); tabsHost.innerHTML = '';
[{ key:'guide', label:'入门教程' }].concat(TUTORIAL_TABS).forEach(t => {
const el = document.createElement('div');
el.className = 'tut-tab' + (tutorialTab === t.key ? ' active' : '');
el.textContent = t.label;
el.onclick = () => setTutorialTab(t.key);
tabsHost.appendChild(el);
});
const body = document.getElementById('tutorial-body');
const footer = document.getElementById('tutorial-footer');

if (tutorialTab === 'guide') {
const step = TUTORIAL_STEPS[tutorialStep];
body.innerHTML = `<div class="tut-steps">${TUTORIAL_STEPS.map((_, i) =>
`<div class="tut-dot ${i === tutorialStep ? 'current' : (i < tutorialStep ? 'done' : '')}" data-i="${i}"></div>`).join('')}</div>
<h3>${step.title}</h3>${step.body}`;
body.querySelectorAll('.tut-dot').forEach(d => { d.onclick = () => { tutorialStep = Number(d.dataset.i); renderTutorial(); }; });
document.getElementById('tut-progress').textContent = `${tutorialStep + 1} / ${TUTORIAL_STEPS.length}`;
document.getElementById('tut-prev').disabled = tutorialStep === 0;
document.getElementById('tut-prev').style.visibility = 'visible';
document.getElementById('tut-next').textContent = tutorialStep === TUTORIAL_STEPS.length - 1 ? '完成' : '下一步';
footer.style.display = '';
} else {
const tab = TUTORIAL_TABS.find(t => t.key === tutorialTab);
/* 数量随版本增长的页面写成函数，每次打开都重新求值；其余页面仍是静态字符串。 */
body.innerHTML = typeof tab.html === 'function' ? tab.html() : tab.html;
footer.style.display = 'none';
mountTutorialDemo(tutorialTab, body);
}
body.scrollTop = 0;
}

function gotoNextTutorialStep() {
if (tutorialTab !== 'guide') return;
if (tutorialStep < TUTORIAL_STEPS.length - 1) { tutorialStep++; renderTutorial(); }
else closeTutorial();
}

/* ---- 专项页中的可交互演示 ---- */
function mountTutorialDemo(key, host) {
if (key === 'damage') {
document.getElementById('b-direct').onclick = () => calcDemo('direct');
document.getElementById('b-crit').onclick = () => calcDemo('crit');
document.getElementById('b-true').onclick = () => calcDemo('true');
}
else if (key === 'shenhun') {
/* 套装详解：1件/2件文案直接读 shenhun.js 的 SETS 配置，
   避免教程与实装脱节；逻辑层未加载时退化为内置静态说明。 */
const detail = {
'无双': '· 2 件套走「有效属性」层：暴伤随当前血量实时变化，不是开局算一次\n· 半血时约 +25% 暴伤，残血收益最高',
'心魔': '· 走「基础概率」口径：实际 = 25% × (1 + 效果命中 − 目标效果抵抗)\n· 因此 1 件套（3 件套则为 2 次）给的 +15% 效果命中会直接提高 2 件套的触发率\n· 混乱持续 1 回合，与套装描述一致\n· 击杀、未造成掉血时不触发；走统一控制入口，免疫控制与虚化可挡',
'百穿': '· 只影响【直接伤害】的免伤率，真实伤害本就无视防御，不受影响\n· 逐段独立判定：多段技能每一段各自 roll 一次\n· 50% 为「直接概率」，不受效果命中 / 效果抵抗影响',
'束缚': '· 「怒气足够」= 付完技能 cost 后还剩 ≥1 点\n· 判定在技能结算之前，因此本次技能本身立刻吃到 30%\n· 仅主动技能触发：普攻不算「施放技能」，额外技能多为他人回合触发，同样不算\n· 加成至回合结束清除',
'怒源': '· 在角色先机全部结算之后才执行，不会被角色先机给的怒气顶掉上限\n· 只给存活友方，不给敌方；怒气已满时自动截断',
'招财': '· 每个回合只判定一次（回合内分支重入不会重复触发）\n· 50% 为「直接概率」，不受效果命中 / 效果抵抗影响\n· 怒气已满时不触发提示，避免刷屏',
'狱门疆': '· 只在该角色【首次攻击】时判定一次；70% 为「基础概率」：实际 = 70% × (1 + 效果命中 − 目标效果抵抗)\n· 1 件套（3 件套则为 2 次）给的 +15% 效果命中会直接提高触发率\n· 同一阵营多名友方装备时全队仅生效一次；判定未命中也不让下一人重试\n· 放逐持续到施放者下回合结束，或施放者阵亡（立即解除）\n· 与带土「神威·虚化」共用同一套放逐规则，但到期不会追打三段\n· 放逐期间目标神魂 2 件套失效、行动条锁定、无法被选中或治疗'
};
host.querySelectorAll('.buff-card[data-s]').forEach(c => {
c.onclick = () => {
host.querySelectorAll('.buff-card').forEach(x => x.classList.remove('on'));
c.classList.add('on');
const out = document.getElementById('shenhun-out');
if (!out) return;
const k = c.dataset.s;
const set = (typeof SHENHUN !== 'undefined' && SHENHUN.SET_BY_TYPE) ? SHENHUN.SET_BY_TYPE[k] : null;
const lines = [];
if (set && (set.one || set['1'])) lines.push(`1件：${set.one || set['1']}`);
if (set && (set.two || set['2'])) lines.push(`2件：${set.two || set['2']}`);
const extra = detail[k] || '';
out.innerHTML = '<b style="color:#ce93d8">' + k + '</b>' +
(lines.length ? '\n' + lines.join('\n') : '') +
(extra ? '\n\n判定细节\n' + extra : '');
out.style.whiteSpace = 'pre-wrap';
};
});
}
else if (key === 'buff') {
const info = {
state: '【状态】蓝色\n· 可驱散：驱散效果可清除状态\n· 可移除：移除效果可清除状态\n· 区分增益与减益\n· 实例：眩晕（减益）、牵绊（增益）、百豪（增益）',
mark: '【印记】紫色\n· 不可驱散：驱散效果无法清除印记\n· 可移除：移除效果可清除印记\n· 区分增益与减益\n· 实例：风行、狂风、雷压、神威、流光、照君、狐守、狐佑、大妖之力、鬼王姿态',
clear: '【驱散 与 移除】\n两者都是中性操作，本身不自带增益/减益倾向；清除哪一种完全由技能描述中指定的类型决定。\n\n· 驱散：只作用于「状态」，印记不可被驱散\n· 移除：对「状态 + 印记」都生效\n· 规则：不受驱散与移除影响，仅由特定条件清除\n\n实例：\n· 流光到期 → 驱散携带者的减益状态\n· 鬼王酒吞童子「天火怒焱」→ 驱散敌方的增益状态\n· 宇智波带土「虚化」→ 移除自身的减益状态与减益印记\n· 禅心云外镜「水无垠」→ 移除自身的减益状态与减益印记',
rule: '【规则】橙色\n· 仅由特定条件清除，不受驱散与移除影响\n· 不区分增益与减益\n· 实例：放逐（放逐结束时解除）、虚化（持续时间结束时解除）'
};
host.querySelectorAll('.buff-card').forEach(c => {
c.onclick = () => {
host.querySelectorAll('.buff-card').forEach(x => x.classList.remove('on'));
c.classList.add('on');
document.getElementById('buff-out').textContent = info[c.dataset.k];
};
});
}
}

/* 伤害演示：直接调用游戏真实的 calculateDamage，确保与实战一致 */
function calcDemo(mode) {
const atk = Number(document.getElementById('in-atk').value) || 0;
const def = Number(document.getElementById('in-def').value) || 0;
const rate = Number(document.getElementById('in-rate').value) || 0;
const src = { name:'攻方', side:'player', atk, def:300, maxHp:99999, hp:99999, spd:200,
critRate: mode === 'crit' ? 1 : 0, critDmg:1.5, finalDmgRate:1, finalDmgReduction:0,
healBonus:1, healReduction:0, alive:true, banished:false, states:[], marks:[], rules:[], shield:0 };
const tgt = { name:'守方', side:'enemy', atk:800, def, maxHp:99999, hp:99999, spd:200,
critRate:0, critDmg:1.5, finalDmgRate:1, finalDmgReduction:0,
healBonus:1, healReduction:0, alive:true, banished:false, states:[], marks:[], rules:[], shield:0 };
const prev = gameState.units; gameState.units = [src, tgt];   // 临时挂载，用完立即还原
const skill = mode === 'true' ? { trueRate: rate } : { dmgRate: rate };
const r = calculateDamage(src, skill, tgt)[0];
gameState.units = prev;
let text;
if (mode === 'true') {
text = `真实伤害 = 攻击 ${atk} × 倍率 ${rate} × 最终伤害率 1\n` +
`　　　　= <span class="win">${r.damage}</span>\n` +
`（无视防御与最终免伤）`;
} else {
const dr = def / (def + atk);
const critPart = mode === 'crit' ? ` × 暴击伤害率 1.5` : '';
text = `免伤率 = 防御 ${def} ÷ (${def} + 攻击 ${atk}) = ${(dr * 100).toFixed(1)}%\n` +
`${mode === 'crit' ? '暴击' : '未暴击'}伤害 = ${atk} × ${rate} × (1 − ${(dr * 100).toFixed(1)}%)${critPart}\n` +
`　　　　= <span class="win">${r.damage}</span>`;
}
document.getElementById('dmg-out').innerHTML = text;
}
function resetGame() {
/* 回主界面时清掉探索流程状态，避免下一局误判成副本 */
if (window.PVE && typeof window.PVE.reset === 'function') window.PVE.reset();
stopSkillCutin();
closeConfirmDialog(false);
speedBtnDisplay(false);
if (gameState.rafId) cancelAnimationFrame(gameState.rafId); resetBp(); document.getElementById('bp-screen').style.display = 'none'; gameState = { phase:'modeSelect', units:[], playerTeam:[], enemyTeam:[], actionBarMax:0, paused:false, auto:{ player:false, enemy:false }, animating:false, waitingForTarget:false, targetType:null, pendingSkill:null, currentActor:null, lastTimestamp:0, rafId:null, snowballSnapshot:null, vayneKillThisTurn:false, damageLogTotal:0, damageLogSide:null, currentCastSkill:null, currentCaster:null, shouShiFiring:false, shouShiTurnCount:0, wuXianXiaTurnCount:0, pendingCasts:[], needFlushAfterActionable:false, damageLogFallen:[], actionHookBusy:false, summonIdx:{ player:null, enemy:null } }; playerSelection = ['主角']; enemySelection = ['主角']; document.getElementById('battle-screen').style.display = 'none'; document.getElementById('result-screen').classList.remove('show'); document.getElementById('selection-screen').style.display = 'none'; document.getElementById('mode-select-screen').style.display = 'flex'; document.getElementById('battle-log').innerHTML = ''; document.getElementById('floating-container').innerHTML = '';
const summonAreaReset = document.getElementById('summon-area'); if (summonAreaReset) summonAreaReset.innerHTML = '';
// 重置选人界面状态
document.getElementById('player-selection-section').style.display = 'block';
document.querySelector('#selection-screen h1').textContent = '⚔️ 狂想：跨界之战';
document.getElementById('enemy-selection-section').style.display = 'block';
renderSectionTitle('player', 'default');   // 我方标题一并重建，双保险
renderSectionTitle('enemy', 'default');
document.getElementById('selection-mode-badge').textContent = '';
document.getElementById('selection-mode-badge').className = '';
// 重置模式选择
document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
document.getElementById('mode-confirm-btn').disabled = true;
gameMode = 'pve';
checkStartButton(); }
initSelection();
initBattleUiButtons();
renderVersionTheme();
startAvatarCycle();   // 角色头像多图轮换（仅配置了 HERO_AVATAR_CYCLE 的角色）
runImageSelfCheck();  // 仅在网址带 ?imgcheck=1 时显示图片自检面板
/* ==================== 神魂系统初始化 ====================
   必须在 HERO_DATA / gameState 之后、UI 渲染之前完成 load。
   神魂是战斗外数据，开战前一次性结算进角色基础属性。 */
if (typeof SHENHUN !== 'undefined') {
SHENHUN.load();
SHENHUN.dailyLogin();          // 每天首次登录发放神魂券 20 / 重铸石 2
if (typeof initShenhunUI === 'function') initShenhunUI();   // 绑定仓库 / 装备 / 抽卡界面
}
document.getElementById('changelog-btn').onclick = openChangelog;
document.getElementById('changelog-close').onclick = closeChangelog;
document.getElementById('changelog-overlay').addEventListener('click', (e) => { if (e.target === document.getElementById('changelog-overlay')) closeChangelog(); });

/* ==================== 动态背景 ====================
   · 主界面（body.bg-mode-select）
       电脑：循环播放 Background2_video.mp4；播放失败 / 卡住 → Background2A.png
       手机：BackgroundA.png 与 BackgroundB.png 交叉淡入轮播
   · 其余所有界面（body.bg-static：角色选择、战斗、BP、结算）
       电脑：Background2A.png
       手机：BackgroundA.png
       均为单张静态图，不做动画、不轮播。

   设备口径：用「精确指针 + min-width:821px」而不是屏幕方向。
   手机横屏仍是粗指针，不会去碰视频自动播放；触屏笔记本接了鼠标则走视频。
   两种状态互斥，主界面优先；只要不在主界面，一律显示按设备分流的静态图，
   因此结算弹层覆盖在战斗界面之上时也无需特判，背景始终一致。
   屏幕分散在十几处切换，这里用 MutationObserver 盯各界面节点的显隐，
   无需改动任何一处现有切屏代码，也不会因为以后新增界面而漏掉。 */
(function initDynamicBackground() {
const body = document.body;
const video = document.getElementById('bg-video');
const modeScreen = document.getElementById('mode-select-screen');
const selectionScreen = document.getElementById('selection-screen');
const battleScreen = document.getElementById('battle-screen');
const resultScreen = document.getElementById('result-screen');
if (!video || !modeScreen) return;   // 素材/节点缺失时静默跳过，不影响游戏

const mqDesktop = window.matchMedia('(hover:hover) and (pointer:fine) and (min-width:821px)');
const mqReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
let videoFailed = false, stallTimer = null;

function fallbackToStatic() {
if (videoFailed) return;
videoFailed = true;
body.classList.add('bg-video-failed');   // CSS 隐藏 video，露出 body 的 Background2A.png
try { video.pause(); } catch (e) {}
}
function isVisible(el) { return !!el && window.getComputedStyle(el).display !== 'none'; }
function isModeSelect() { return isVisible(modeScreen); }
function armStallGuard() {
if (stallTimer) clearTimeout(stallTimer);
/* 4 秒还没真正播起来（play() 悬而未决 / 解码卡住）就退回静态图，不留黑屏。 */
stallTimer = setTimeout(() => {
if (!videoFailed && body.classList.contains('bg-mode-select') &&
body.classList.contains('bg-desktop') && video.readyState < 2) fallbackToStatic();
}, 4000);
}
function syncBg() {
const desktop = mqDesktop.matches;
body.classList.toggle('bg-desktop', desktop);
body.classList.toggle('bg-mobile', !desktop);
const onMode = isModeSelect();
/* 只要不在主界面就是静态图（角色选择 / 战斗 / BP / 结算一视同仁），
   不再逐个判界面 —— 结算弹层覆盖在战斗之上时也保持同一张图。 */
body.classList.toggle('bg-mode-select', onMode);
body.classList.toggle('bg-static', !onMode);
if (!onMode || !desktop) {            // 离开主界面 / 手机端：一律不播视频
try { video.pause(); } catch (e) {}
if (stallTimer) { clearTimeout(stallTimer); stallTimer = null; }
return;
}
if (videoFailed || mqReduced.matches) { fallbackToStatic(); return; }
/* muted + playsinline 是 iOS 自动播放的硬性要求；play() 被策略拒绝即回退。 */
video.muted = true;
try {
const p = video.play();
if (p && typeof p.catch === 'function') p.catch(fallbackToStatic);
} catch (e) { fallbackToStatic(); }
armStallGuard();
}
video.addEventListener('error', fallbackToStatic);
/* video 已经在播了就不必再靠兜底计时器；避免正常播放后被误判 */
video.addEventListener('playing', () => { if (stallTimer) { clearTimeout(stallTimer); stallTimer = null; } });

/* 判定只需主界面节点的 display；连同其他界面一起盯，是给将来新增界面留余量
   （result 的显隐走 class(show)，不是 style）。 */
const observer = new MutationObserver(syncBg);
[modeScreen, selectionScreen, battleScreen, resultScreen].forEach(el => {
if (el) observer.observe(el, { attributes: true, attributeFilter: ['style', 'class'] });
});
window.addEventListener('resize', syncBg);
mqDesktop.addEventListener && mqDesktop.addEventListener('change', syncBg);
mqReduced.addEventListener && mqReduced.addEventListener('change', syncBg);
syncBg();
})();
