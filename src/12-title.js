  // ======================= 2.5 伪装：标签页标题 / 图标 / 右键菜单 =======================
  // 目标：浏览器的标签页标题、图标、右键菜单都不能露出「B站 / 哔哩哔哩」。
  // 做法：重定义 document.title 的 getter/setter 拦住站内 SPA 的改写，配上 MutationObserver 兜底。
  // 更狠的一招：给站点脚本塞一个假名字。标题多半是「$O.NAME_zh + "..."」拼出来的，
  // 站点自己的变量被改了，就算它绕过 setter 直接写 <title> 节点，也拼不出带品牌名的文字。
  var DEFAULT_TITLE = "云枢科技 · 钉钉";
  var rawDesc = null;
  try { rawDesc = Object.getOwnPropertyDescriptor(Document.prototype, "title"); } catch (e) { rawDesc = null; }
  // 注意：这几个正则不能带中文反引号 / 反斜杠以外的转义坑，写错会连累整段模板字符串
  var MASKS = [
    [/bilibili/gi, "云枢科技"],
    [/[哔哩]*哩哔哩/g, "云枢科技"],
    [/B站/g, "云枢科技"],
    [/视频播放器/g, "会议室"],
    [/视频播放/g, "会议记录"]
  ];

  function appTitle() {
    var t = String(lsGet(LS.title, "") || "").trim();
    if (t) return t;
    var label = (typeof SKINS !== "undefined" && SKINS[SKIN_ID] && SKINS[SKIN_ID].label) || "钉钉";
    return "云枢科技 · " + label;
  }
  function setAppTitle(t) {
    var text = String(t || "").trim();
    if (text) lsSet(LS.title, text);
    else { try { localStorage.removeItem(LS.title); } catch (e) { /* ignore */ } }
    syncTitle(true);
    if (el.root) {
      el.root.setAttribute("data-title", appTitle());
      var tb = el.root.querySelector(".im-tb-apptitle");
      if (tb) tb.textContent = appTitle();
    }
  }
  function maskTitle(s) {
    s = String(s == null ? "" : s);
    for (var i = 0; i < MASKS.length; i++) s = s.replace(MASKS[i][0], MASKS[i][1]);
    return s;
  }
  function syncTitle(force) {
    if (!rawDesc || !rawDesc.get) return;
    var want = appTitle();
    try {
      if (force || rawDesc.get.call(document) !== want) rawDesc.set.call(document, want);
    } catch (e) { /* ignore */ }
  }
  // 站点脚本里存站名的全局变量（B站是 window.$O.NAME_zh / NAME）
  function maskBrandGlobals() {
    try {
      var o = window.$O;
      if (o && typeof o === "object") {
        if (typeof o.NAME_zh === "string") o.NAME_zh = "云枢科技";
        if (typeof o.NAME === "string") o.NAME = "云枢科技";
      }
    } catch (e) { /* ignore */ }
  }
  // 站内 SPA 会直接 document.title = "xxx_哔哩哔哩_bilibili"：重定义 getter/setter 统一改写
  function installTitleGuard() {
    if (!rawDesc || !rawDesc.get || !rawDesc.set) return;
    try {
      Object.defineProperty(document, "title", {
        configurable: true,
        enumerable: true,
        get: function () { return maskTitle(rawDesc.get.call(document)); },
        set: function (v) {
          var s = String(v == null ? "" : v);
          try {
            if (rawDesc.get.call(document) === s) return;
            rawDesc.set.call(document, s);
          } catch (e) { /* ignore */ }
          syncTitle();
        }
      });
    } catch (e) { /* ignore */ }
  }
  function installTitleObserver() {
    if (typeof MutationObserver !== "function") return;
    var head = document.head || document.documentElement;
    if (!head) return;
    try {
      new MutationObserver(function () {
        syncTitle();
        maskBrandGlobals();
      }).observe(head, { childList: true, subtree: true, characterData: true });
    } catch (e) { /* ignore */ }
  }
  // 右键菜单：把「复制视频地址 / 统计信息 / 检查元素」里的品牌字样盖掉
  // 皮肤临时关闭时不拦右键，否则原站和登录页的正常操作会受影响。
  function installContextMenuGuard() {
    if (MOCK) return;
    document.addEventListener("contextmenu", function (e) {
      if (typeof SKIN_OFF !== "undefined" && SKIN_OFF) return;
      if (e.target.closest && e.target.closest("#biliding-root")) return;
      e.preventDefault();
    }, true);
  }
