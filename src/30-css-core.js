  // ======================= 9. 样式（公共骨架） =======================
  var CSS_CORE = String.raw`
  @keyframes bd-fade { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: none; } }
  @keyframes bd-spin { to { transform: rotate(360deg); } }
  html.im-theme { color-scheme: light; }
  html.im-theme body {
    margin: 0 !important; padding: 0 !important; overflow: hidden !important;
    background: #EDEFF5 !important;
    font-family: "PingFang SC", "HarmonyOS Sans SC", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
    -webkit-font-smoothing: antialiased;
  }
  /* 隐藏原站页面：用 visibility:hidden 而不是 display:none（B站脚本会读元素尺寸，display:none 会抛错）。
     浮层（皮肤菜单 / 尺寸菜单 / 标题框）必须显式放行，否则会被这条规则一起藏掉。 */
  html.im-theme body > *:not(#biliding-root):not(script):not(style):not(.im-toast-wrap):not(.im-skin-menu):not(.bd-size-menu):not(.bd-title-dlg):not(.bd-login-dlg):not(.bd-restore-btn) {
    visibility: hidden !important; pointer-events: none !important;
  }

  /* ---------- 外壳栅格 ---------- */
  .im-shell { position: fixed; inset: 0; display: flex; flex-direction: column; overflow: hidden;
    font-size: 13px; color: var(--c-text); background: var(--c-bg); }
  .im-shell *, .im-shell *::before, .im-shell *::after { box-sizing: border-box; }
  .im-shell button { font-family: inherit; }
  .im-body { flex: 1 1 auto; display: flex; min-height: 0; }

  /* 通用滚动条 */
  .im-shell ::-webkit-scrollbar { width: 8px; height: 8px; }
  .im-shell ::-webkit-scrollbar-thumb { background: rgba(17,24,39,.14); border-radius: 4px; }
  .im-shell ::-webkit-scrollbar-thumb:hover { background: rgba(17,24,39,.24); }
  .im-shell ::-webkit-scrollbar-track { background: transparent; }

  /* ---------- 顶栏 ---------- */
  .im-titlebar { flex: 0 0 auto; height: var(--h-title); display: flex; align-items: center;
    gap: 12px; padding: 0 10px 0 14px; background: var(--c-title); border-bottom: 1px solid var(--c-title-line);
    user-select: none; position: relative; z-index: 20; }
  .im-tb-left { display: flex; align-items: center; gap: 8px; min-width: 0; flex: 0 1 auto; }
  .im-me { width: 26px; height: 26px; border-radius: 50%; overflow: hidden; flex: 0 0 26px; cursor: pointer; position: relative; }
  .im-me img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .im-me .ph { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg,#FFB84D,#FF8A3D); color: #fff; font-size: 12px; font-weight: 600; }
  .im-tb-status { font-size: 12.5px; color: var(--c-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px; }
  .im-tb-status b { font-weight: 500; color: var(--c-text); }
  .im-tb-status .song { color: var(--c-text3); }
  /* 顶栏标题：直接用标签页标题，改标题时这里同步变 */
  .im-tb-apptitle { font-size: 13px; font-weight: 600; color: var(--c-text); letter-spacing: .2px;
    padding: 0 2px; cursor: default; user-select: none; }
  .im-tb-apptitle:hover { color: var(--c-accent); }
  .im-tb-center { flex: 1 1 auto; display: flex; justify-content: center; min-width: 0; }
  .im-tb-search { width: min(520px, 100%); height: 26px; display: flex; align-items: center; gap: 6px;
    padding: 0 12px; border-radius: 13px; background: var(--c-search); border: 1px solid transparent;
    color: var(--c-text3); cursor: text; transition: border-color .15s, background .15s; }
  .im-tb-search:hover { border-color: var(--c-line); }
  .im-tb-search svg { width: 14px; height: 14px; flex: 0 0 14px; }
  .im-tb-search input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent;
    font-size: 12.5px; color: var(--c-text); font-family: inherit; height: 100%; }
  .im-tb-search input::placeholder { color: var(--c-text3); }
  .im-tb-right { display: flex; align-items: center; gap: 2px; flex: 0 0 auto; }
  .im-win { width: 30px; height: 26px; border: 0; background: transparent; color: var(--c-text2);
    border-radius: 5px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; }
  .im-win svg { width: 14px; height: 14px; }
  .im-win:hover { background: var(--c-hover); color: var(--c-text); }
  .im-win.close:hover { background: #E81123; color: #fff; }
  .im-tb-sep { width: 1px; height: 16px; background: var(--c-line); margin: 0 4px; }

  /* ---------- 左一：导航 rail ---------- */
  .im-rail { flex: 0 0 var(--w-rail); width: var(--w-rail); background: var(--c-rail);
    display: flex; flex-direction: column; user-select: none; position: relative; z-index: 15; }
  .im-org { display: flex; align-items: center; gap: 8px; padding: 12px 12px 10px; cursor: pointer; }
  .im-org-logo { width: 30px; height: 30px; border-radius: 8px; flex: 0 0 30px; overflow: hidden;
    display: flex; align-items: center; justify-content: center; background: #fff; color: var(--c-accent);
    font-size: 13px; font-weight: 700; }
  .im-org-logo img { width: 100%; height: 100%; object-fit: cover; }
  .im-org-meta { min-width: 0; flex: 1; }
  .im-org-name { font-size: 12.5px; font-weight: 600; color: var(--c-text); white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis; }
  .im-org-sub { font-size: 11px; color: var(--c-text3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .im-org svg { width: 12px; height: 12px; color: var(--c-text3); flex: 0 0 12px; }
  .im-rail-nav { flex: 1 1 auto; overflow-y: auto; overflow-x: hidden; padding: 2px 0 8px; }
  .im-rail-item { width: calc(100% - 16px); margin: 1px 8px; height: 40px; border: 0; border-radius: 8px;
    background: transparent; color: var(--c-text); display: flex; align-items: center; gap: 10px;
    padding: 0 10px; font-size: 13px; cursor: pointer; position: relative; text-align: left;
    transition: background .12s ease, color .12s ease; }
  .im-rail-item svg { width: 18px; height: 18px; flex: 0 0 18px; color: var(--c-text2); }
  .im-rail-item span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .im-rail-item:hover { background: var(--c-hover-rail); }
  .im-rail-item.on { background: var(--c-rail-on); color: var(--c-accent); font-weight: 500; }
  .im-rail-item.on svg { color: var(--c-accent); }
  .im-rail-item .dot { width: 6px; height: 6px; border-radius: 50%; background: #FF4D4F; flex: 0 0 6px; }
  .im-rail-item .bd-badge { position: static; flex: 0 0 auto; }
  .im-rail-group-title { font-size: 11.5px; color: var(--c-text3); padding: 10px 18px 4px; }
  .im-rail-sec { border-top: 1px solid var(--c-line-weak); margin: 6px 8px 0; padding-top: 4px; }
  .im-rail-tail { padding: 6px 8px 8px; display: flex; flex-direction: column; gap: 1px; }
  .im-rail-tail .im-rail-item { height: 34px; font-size: 12.5px; color: var(--c-text2); }
  .im-rail-tail .im-rail-item svg { width: 16px; height: 16px; flex: 0 0 16px; }

  /* 徽标 */
  .bd-badge { min-width: 16px; height: 16px; padding: 0 5px; border-radius: 8px; background: #F5222D;
    color: #fff; font-size: 10px; font-weight: 500; line-height: 16px; text-align: center; display: inline-block;
    font-variant-numeric: tabular-nums; }

  /* ---------- 左二：分组栏（钉钉 / 企微） ---------- */
  .im-nav2 { flex: 0 0 var(--w-nav2); width: var(--w-nav2); background: var(--c-nav2);
    display: flex; flex-direction: column; min-height: 0; }
  .im-nav2-head { height: 46px; flex: 0 0 46px; display: flex; align-items: center; gap: 6px; padding: 0 10px 0 14px; }
  .im-nav2-head .t { font-size: 12.5px; color: var(--c-text2); flex: 1; }
  .im-nav2-list { flex: 1 1 auto; overflow-y: auto; padding: 2px 8px 10px; }
  .im-nav2-item { height: 34px; border-radius: 7px; display: flex; align-items: center; gap: 6px;
    padding: 0 10px; font-size: 13px; color: var(--c-text); cursor: pointer; position: relative; }
  .im-nav2-item:hover { background: var(--c-hover); }
  .im-nav2-item.on { background: var(--c-nav2-on); font-weight: 500; }
  .im-nav2-item .n { margin-left: auto; font-size: 11.5px; color: var(--c-text3); }
  .im-nav2-item .bd-badge { margin-left: auto; }
  .im-nav2-item .chev { width: 12px; height: 12px; color: var(--c-text3); margin-left: -2px; }
  .im-nav2-sub .im-nav2-item { height: 32px; font-size: 12.5px; color: var(--c-text2); padding-left: 26px; }
  .im-nav2-sub .im-nav2-item.on { color: var(--c-text); }
  .im-nav2-foot { flex: 0 0 auto; padding: 6px 8px 8px; }

  /* ---------- 飞书 strip（48px 图标条） ---------- */
  .im-strip { flex: 0 0 var(--w-strip); width: var(--w-strip); background: var(--c-panel);
    border-right: 1px solid var(--c-line-weak); display: flex; flex-direction: column;
    align-items: center; gap: 4px; padding: 10px 0; }
  .im-strip-item { width: 34px; height: 34px; border: 0; border-radius: 8px; background: transparent;
    color: var(--c-text2); display: flex; align-items: center; justify-content: center; cursor: pointer;
    position: relative; padding: 0; }
  .im-strip-item svg { width: 19px; height: 19px; }
  .im-strip-item:hover { background: var(--c-hover); }
  .im-strip-item.on { background: var(--c-accent-weak); color: var(--c-accent); }
  .im-strip-item .bd-badge { position: absolute; top: -2px; right: -4px; transform: scale(.86); }
  .im-strip-sp { flex: 1; }

  /* ---------- 会话列表 ---------- */
  .im-list { flex: 0 0 var(--w-list); width: var(--w-list); background: var(--c-list);
    display: flex; flex-direction: column; min-height: 0; position: relative;
    border-right: 1px solid var(--c-line-weak); }
  .im-list-head { flex: 0 0 auto; height: 46px; display: flex; align-items: center; gap: 6px; padding: 0 10px 0 14px; }
  .im-list-title { font-size: 15px; font-weight: 600; color: var(--c-text); flex: 1; min-width: 0;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .im-icon-btn { width: 28px; height: 28px; border: 0; border-radius: 6px; background: transparent;
    color: var(--c-text2); display: inline-flex; align-items: center; justify-content: center;
    cursor: pointer; padding: 0; flex: 0 0 auto; transition: background .12s, color .12s; }
  .im-icon-btn svg { width: 16px; height: 16px; }
  .im-icon-btn:hover { background: var(--c-hover); color: var(--c-text); }
  .im-icon-btn.on { background: var(--c-accent-weak); color: var(--c-accent); }

  .im-list-tabs { display: flex; align-items: center; gap: 4px; padding: 0 10px 8px; }
  .im-shell[data-list-header="chips"] .im-list-head { height: 40px; }
  .im-shell[data-list-header="chips"] .im-list-head .im-list-title { display: none; }
  .im-tab { height: 26px; padding: 0 12px; border-radius: 13px; border: 0; background: transparent;
    color: var(--c-text2); font-size: 12.5px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; }
  .im-tab:hover { background: var(--c-hover); }
  .im-tab.on { background: var(--c-tab-on); color: var(--c-tab-on-text); font-weight: 500; }
  .im-tab .n { font-size: 11.5px; opacity: .85; font-variant-numeric: tabular-nums; }
  .im-list-search { padding: 0 10px 8px; }
  .im-list-search .box { display: flex; align-items: center; gap: 6px; height: 30px; border-radius: 6px;
    background: var(--c-search); padding: 0 10px; color: var(--c-text3); border: 1px solid transparent; }
  .im-list-search .box:focus-within { border-color: var(--c-accent); background: var(--c-panel); }
  .im-list-search svg { width: 14px; height: 14px; flex: 0 0 14px; }
  .im-list-search input { border: 0; outline: 0; background: transparent; flex: 1; min-width: 0;
    font-size: 12.5px; color: var(--c-text); font-family: inherit; height: 100%; }

  .im-list-body { flex: 1 1 auto; overflow-y: auto; overflow-x: hidden; padding: 0 8px 12px; }
  .im-list-sec { font-size: 11.5px; color: var(--c-text3); padding: 10px 8px 4px; }
  .im-conv { display: flex; align-items: center; gap: 10px; padding: 9px 8px; border-radius: 8px;
    cursor: pointer; position: relative; transition: background .1s ease; }
  .im-conv:hover { background: var(--c-hover); }
  .im-conv.on { background: var(--c-conv-on); }
  .im-conv-av { width: 40px; height: 40px; border-radius: 8px; flex: 0 0 40px; position: relative;
    overflow: visible; display: flex; align-items: center; justify-content: center;
    color: #fff; font-size: 16px; font-weight: 600; background: var(--c-accent); }
  .im-conv-av .face { width: 100%; height: 100%; border-radius: 8px; overflow: hidden; display: block; }
  .im-conv-av img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .im-conv-av .corner { position: absolute; right: -3px; bottom: -3px; width: 16px; height: 16px;
    border-radius: 4px; background: #fff; display: flex; align-items: center; justify-content: center;
    font-size: 9px; color: var(--c-text2); border: 1px solid var(--c-line); }
  .im-conv-badge { position: absolute; top: -5px; right: -6px; min-width: 17px; height: 17px; padding: 0 5px;
    border-radius: 9px; background: #F5222D; color: #fff; font-size: 10.5px; font-weight: 500;
    line-height: 17px; text-align: center; border: 1.5px solid var(--c-list); font-variant-numeric: tabular-nums; }
  .im-conv-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
  .im-conv-row1 { display: flex; align-items: center; gap: 6px; }
  .im-conv-name { font-size: 13.5px; color: var(--c-text); flex: 1; min-width: 0;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .im-conv.on .im-conv-name { font-weight: 500; }
  .im-tag { flex: 0 0 auto; font-size: 10.5px; line-height: 15px; padding: 0 4px; border-radius: 3px;
    border: 1px solid var(--c-tag-line); color: var(--c-tag-text); background: var(--c-tag-bg); }
  .im-conv-time { flex: 0 0 auto; font-size: 11px; color: var(--c-text3); font-variant-numeric: tabular-nums; }
  .im-conv-row2 { display: flex; align-items: center; gap: 6px; }
  .im-conv-msg { flex: 1; min-width: 0; font-size: 12px; color: var(--c-text3);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .im-conv-msg em { font-style: normal; color: var(--c-text4); }
  .im-conv-mute { width: 13px; height: 13px; flex: 0 0 13px; color: var(--c-text4); }
  .im-list-empty { text-align: center; color: var(--c-text3); font-size: 12px; padding: 24px 8px; }
  .im-skel { height: 58px; border-radius: 8px; background: var(--c-hover); margin: 4px 0; opacity: .6; }

  /* ---------- 聊天区 ---------- */
  .im-chat { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; background: var(--c-chat);
    position: relative; }
  .im-chat-head { flex: 0 0 auto; height: 56px; display: flex; align-items: center; gap: 10px;
    padding: 0 14px; background: var(--c-chat-head); border-bottom: 1px solid var(--c-line-weak); z-index: 5; }
  .im-chat-head .av { width: 34px; height: 34px; border-radius: 8px; flex: 0 0 34px; overflow: hidden;
    display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 600; font-size: 14px; }
  .im-chat-head .av img { width: 100%; height: 100%; object-fit: cover; }
  .im-chat-head .meta { min-width: 0; flex: 1; }
  .im-chat-head .name { display: flex; align-items: center; gap: 6px; font-size: 14.5px; font-weight: 600;
    color: var(--c-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .im-chat-head .name .im-tag { font-weight: 400; }
  .im-chat-head .sub { font-size: 11.5px; color: var(--c-text3); margin-top: 3px; white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis; }
  .im-chat-head .acts { display: flex; align-items: center; gap: 2px; flex: 0 0 auto; }
  /* 默认不横向滚动（否则播放器稍宽就在聊天区底部压出一条横向滚动条）；
     只有 JS 判定「播放器确实比聊天列宽」时才加 .has-wide-player 打开横向滚动 */
  .im-chat-body { flex: 1 1 auto; overflow-y: auto; overflow-x: hidden; padding: 14px 22px 8px; }
  .im-chat-body.has-wide-player { overflow-x: auto; }

  .im-daysep { text-align: center; margin: 12px 0 14px; }
  .im-daysep span { font-size: 11px; color: var(--c-text3); }

  .im-msg { display: flex; gap: 10px; margin-bottom: 14px; animation: bd-fade .16s ease both; }
  .im-msg .av { width: 32px; height: 32px; border-radius: 7px; flex: 0 0 32px; overflow: hidden;
    display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 600; font-size: 13px; }
  .im-msg .av img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .im-msg-main { min-width: 0; max-width: min(640px, 74%); display: flex; flex-direction: column;
    align-items: flex-start; gap: 4px; }
  .im-msg-meta { display: flex; align-items: baseline; gap: 8px; }
  .im-msg-author { font-size: 12px; color: var(--c-text2); }
  .im-msg-time { font-size: 11px; color: var(--c-text4); }
  .im-bubble { background: var(--c-bubble-you); border: 1px solid var(--c-bubble-line);
    border-radius: var(--r-bubble); padding: 8px 11px; font-size: 13.5px; line-height: 1.6;
    color: var(--c-text); word-break: break-word; max-width: 100%; }
  .im-msg.me { flex-direction: row-reverse; }
  .im-msg.me .im-msg-main { align-items: flex-end; }
  .im-msg.me .im-bubble { background: var(--c-bubble-me); border-color: transparent; }
  .im-msg.me .im-msg-meta { flex-direction: row-reverse; }
  .im-read { font-size: 10.5px; color: var(--c-text4); margin-top: -1px; }
  .im-bubble a { color: var(--c-accent); text-decoration: none; }
  .im-bubble .bd-quote { border-left: 3px solid var(--c-line); padding: 2px 0 2px 8px; color: var(--c-text3);
    font-size: 12px; margin-bottom: 6px; }
  .im-bubble .bd-at { color: var(--c-accent); }
  .im-bubble img.emoji { width: 18px; height: 18px; vertical-align: -3px; }
  .im-reply-link { font-size: 11.5px; color: var(--c-accent); cursor: pointer; margin-top: 2px; }
  .im-reply-link:hover { text-decoration: underline; }

  /* 群消息聚合头像（钉钉多人会话头像） */
  .im-av-grid { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr;
    width: 100%; height: 100%; gap: 1px; background: var(--c-line); border-radius: 8px; overflow: hidden; }
  .im-av-grid span { display: flex; align-items: center; justify-content: center; font-size: 9px;
    color: #fff; background: var(--c-accent); }

  /* 视频卡片（群里分享的视频） */
  .bd-card { background: var(--c-card); border-radius: 10px; overflow: hidden; border: 1px solid var(--c-line);
    width: min(430px, 100%); cursor: pointer; transition: box-shadow .16s ease, transform .16s ease; }
  .bd-card:hover { box-shadow: 0 6px 20px rgba(17,24,39,.1); transform: translateY(-1px); }
  .bd-card-thumb { position: relative; width: 100%; aspect-ratio: 16 / 9; background: var(--c-panel2); overflow: hidden; }
  .bd-card-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .bd-card-thumb .dur { position: absolute; right: 6px; bottom: 6px; font-size: 10.5px; color: #fff;
    background: rgba(0,0,0,.58); border-radius: 3px; padding: 1px 4px; }
  .bd-card-thumb .play { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    opacity: 0; background: rgba(0,0,0,.16); transition: opacity .16s ease; }
  .bd-card-thumb .play svg { width: 42px; height: 42px; color: #fff; }
  .bd-card:hover .bd-card-thumb .play { opacity: 1; }
  .bd-card-body { padding: 9px 11px 10px; }
  .bd-card-title { font-size: 13px; line-height: 1.5; color: var(--c-text); font-weight: 500;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .bd-card-foot { display: flex; align-items: center; gap: 8px; margin-top: 7px; font-size: 11.5px; color: var(--c-text3); }
  .bd-card-foot .up { display: flex; align-items: center; gap: 4px; min-width: 0; }
  .bd-card-foot .up img { width: 14px; height: 14px; border-radius: 50%; }
  .bd-card-foot .up span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 130px; }
  .bd-card-foot .sp { flex: 1; }

  /* 播放器贴片（宽度可调，见 JS 里的 bindPlayerResize）：
     宽度写到 .im-shell 的 --bd-player-w 上，气泡/消息容器跟着一起放，才能「放大」而不是被 760px 裁掉 */
  .bd-player { width: min(var(--bd-player-w, 720px), 100%); aspect-ratio: 16 / 9;
    border-radius: 8px; overflow: hidden; background: #000; position: relative; }
  /* 拖过手柄后按用户给的宽高走，不再被 16:9 锁住（变量默认值与预设都由 JS 写） */
  .bd-player.sized { aspect-ratio: auto; height: var(--bd-player-h, auto); }
  .bd-player iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
  .bd-player-main { position: absolute; inset: 0; background: #000; }
  /* 浮窗：脱离聊天流，浮在整页之上，位置由 JS 写 left/top；拖顶部把手移动 */
  .bd-player.float { position: fixed !important; z-index: 10000; margin: 0 !important;
    box-shadow: 0 18px 48px rgba(0,0,0,.45); resize: none; }
  .bd-player.float .bd-player-hint { display: none; }
  .bd-player-bar { display: none; }
  .bd-player.float .bd-player-bar { position: absolute; left: 0; right: 0; top: 0; height: 28px; z-index: 7;
    display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 6px 0 10px;
    background: linear-gradient(rgba(0,0,0,.62), rgba(0,0,0,0)); color: rgba(255,255,255,.86);
    font-size: 11.5px; cursor: move; touch-action: none; user-select: none; }
  .bd-player.float .bd-player-bar .t { pointer-events: none; }
  .bd-player.float .bd-player-tools { opacity: 1; }
  /* 右下角拖拽手柄 + 角上个「放大 / 全屏」按钮 */
  .bd-player-grip { position: absolute; right: 0; bottom: 0; width: 18px; height: 18px; z-index: 4;
    cursor: nwse-resize; touch-action: none;
    background: linear-gradient(135deg, transparent 46%, rgba(255,255,255,.72) 46%, rgba(255,255,255,.72) 54%,
      transparent 54%, transparent 68%, rgba(255,255,255,.72) 68%, rgba(255,255,255,.72) 76%, transparent 76%); }
  .bd-player-hint { position: absolute; left: 8px; bottom: 8px; z-index: 3; pointer-events: none;
    font-size: 11px; color: rgba(255,255,255,.9); background: rgba(0,0,0,.5); border-radius: 4px;
    padding: 2px 6px; opacity: 0; transition: opacity .16s; }
  .bd-player:hover .bd-player-hint { opacity: 1; }
  .bd-player-tools { position: absolute; right: 24px; bottom: 8px; z-index: 5; display: flex; gap: 4px;
    opacity: 0; transition: opacity .16s; }
  .bd-player:hover .bd-player-tools, .bd-player.full .bd-player-tools { opacity: 1; }
  .bd-player-tools button { width: 26px; height: 26px; border: 0; border-radius: 5px; padding: 0;
    background: rgba(0,0,0,.55); color: #fff; cursor: pointer; display: inline-flex;
    align-items: center; justify-content: center; }
  .bd-player-tools button:hover { background: rgba(0,0,0,.78); }
  .bd-player-tools button svg { width: 14px; height: 14px; }
  /* 播放器全屏（细则在下面宽高规则之后，那边必须压住气泡宽度，所以只保留那一份） */
  /* 尺寸菜单 */
  .bd-size-menu { position: fixed; z-index: 10000; min-width: 220px; padding: 6px; border-radius: 10px;
    background: var(--c-panel); border: 1px solid var(--c-line); box-shadow: 0 10px 30px rgba(17,24,39,.16);
    animation: bd-fade .12s ease both; }
  .bd-size-control { display: grid; grid-template-columns: 1fr auto; gap: 8px; padding: 8px 10px; font-size: 12px; color: var(--c-text2); }
  .bd-size-control input { grid-column: 1 / -1; width: 100%; accent-color: var(--c-accent); cursor: ew-resize; }
  .bd-size-control output { color: var(--c-accent); font-variant-numeric: tabular-nums; }
  .bd-size-menu .it { display: flex; align-items: center; justify-content: space-between; gap: 10px;
    height: 32px; padding: 0 10px; border-radius: 7px; font-size: 13px; color: var(--c-text); cursor: pointer; }
  .bd-size-menu .it:hover { background: var(--c-hover); }
  .bd-size-menu .it.on { color: var(--c-accent); font-weight: 500; }
  .bd-size-menu .it .k { font-size: 11px; color: var(--c-text3); }
  .bd-size-menu .it.danger { color: #E81123; }
  .bd-size-menu .sep { height: 1px; background: var(--c-line); margin: 5px 4px; }
  .bd-player .poster { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    cursor: pointer; background-size: cover; background-position: center; }
  .bd-player .poster::after { content: ""; position: absolute; inset: 0; background: rgba(0,0,0,.4); }
  .bd-player .poster .btn { position: relative; z-index: 1; display: inline-flex; align-items: center; gap: 6px;
    height: 36px; padding: 0 16px; border-radius: 18px; background: rgba(255,255,255,.95); color: #17181A;
    font-size: 13px; font-weight: 500; border: 0; cursor: pointer; }
  .bd-player .poster .btn svg { width: 15px; height: 15px; }
  /* 改标题的小对话框 */
  .bd-title-dlg { position: fixed; z-index: 10002; width: 280px; padding: 12px 14px 10px; border-radius: 12px;
    background: var(--c-panel, #fff); border: 1px solid var(--c-line, #E2E6EE);
    box-shadow: 0 16px 40px rgba(17,24,39,.2); color: var(--c-text, #1F2329);
    font-family: "PingFang SC", "Microsoft YaHei", sans-serif; animation: bd-fade .12s ease both; }
  .bd-title-dlg .hd { font-size: 13px; font-weight: 600; margin-bottom: 8px; }
  .bd-title-dlg input { width: 100%; height: 30px; padding: 0 9px; border-radius: 7px; font-size: 13px;
    border: 1px solid var(--c-line, #E2E6EE); background: transparent; color: inherit; outline: none; }
  .bd-title-dlg input:focus { border-color: var(--c-accent, #1A7AF8); }
  .bd-title-dlg .hint { font-size: 11px; color: var(--c-text3, #86909C); line-height: 1.5; margin: 7px 0 10px; }
  .bd-title-dlg .ft { display: flex; justify-content: flex-end; gap: 8px; }
  .bd-title-dlg button { height: 28px; padding: 0 14px; border-radius: 6px; font-size: 12.5px; cursor: pointer;
    border: 1px solid transparent; font-family: inherit; }
  .bd-title-dlg button.ghost { background: transparent; border-color: var(--c-line, #E2E6EE); color: inherit; }
  .bd-title-dlg button.ok { background: var(--c-accent, #1A7AF8); color: #fff; }
  .bd-stats { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .bd-stat { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; color: var(--c-text3);
    background: var(--c-panel); border: 1px solid var(--c-line); border-radius: 11px; padding: 2px 8px; }
  .bd-stat svg { width: 12px; height: 12px; }

  /* ---------- 输入区 ---------- */
  .im-composer { flex: 0 0 auto; background: var(--c-composer); border-top: 1px solid var(--c-line-weak);
    padding: 8px 16px 10px; }
  .im-comp-chips { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
  .im-chip { height: 24px; padding: 0 9px; border-radius: 6px; border: 1px solid var(--c-line);
    background: var(--c-panel); color: var(--c-text2); font-size: 11.5px; cursor: pointer;
    display: inline-flex; align-items: center; gap: 4px; }
  .im-chip svg { width: 12px; height: 12px; color: var(--c-accent); }
  .im-chip:hover { border-color: var(--c-accent); color: var(--c-accent); }
  .im-chip.ghost { border-color: transparent; background: transparent; }
  .im-comp-box { border: 1px solid var(--c-line); border-radius: var(--r-composer); background: var(--c-panel);
    display: flex; flex-direction: column; transition: border-color .15s; }
  .im-comp-box:focus-within { border-color: var(--c-accent); }
  .im-comp-tools { display: flex; align-items: center; gap: 1px; padding: 5px 8px 0; flex-wrap: wrap; }
  .im-tool { width: 26px; height: 26px; border: 0; border-radius: 5px; background: transparent;
    color: var(--c-text2); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; }
  .im-tool svg { width: 15px; height: 15px; }
  .im-tool:hover { background: var(--c-hover); color: var(--c-text); }
  .im-tool .lbl { font-size: 12px; }
  .im-tool.wide { width: auto; padding: 0 6px; gap: 2px; }
  .im-tool.wide svg { width: 11px; height: 11px; }
  .im-tool-sep { width: 1px; height: 14px; background: var(--c-line); margin: 0 4px; }
  .im-comp-input { padding: 4px 10px 2px; }
  .im-comp-input textarea { width: 100%; border: 0; outline: 0; resize: none; background: transparent;
    font-family: inherit; font-size: 13px; line-height: 1.65; color: var(--c-text); min-height: 44px;
    max-height: 150px; display: block; }
  .im-comp-input textarea::placeholder { color: var(--c-text4); }
  .im-comp-foot { display: flex; align-items: center; gap: 2px; padding: 0 8px 6px; }
  .im-comp-foot .sp { flex: 1; }
  .im-send { height: 28px; min-width: 78px; padding: 0 14px; border-radius: 5px; border: 0; cursor: pointer;
    background: var(--c-accent); color: #fff; font-size: 12.5px; font-weight: 500; }
  .im-send:hover { filter: brightness(1.06); }
  .im-send:disabled { background: var(--c-send-off); color: #fff; cursor: not-allowed; filter: none; }
  .im-send-more { width: 20px; height: 28px; border: 0; border-radius: 0 5px 5px 0; cursor: pointer;
    background: var(--c-accent); color: #fff; display: inline-flex; align-items: center; justify-content: center; padding: 0; }
  .im-send-group { display: inline-flex; align-items: center; border-radius: 5px; overflow: hidden; }
  .im-send-group .im-send { border-radius: 5px 0 0 5px; min-width: 64px; }
  .im-comp-hint { font-size: 11px; color: var(--c-text4); text-align: right; padding: 0 2px 2px; }

  /* 空态 / 加载 */
  .im-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
    color: var(--c-text3); gap: 8px; font-size: 13px; }
  .im-empty .big { font-size: 15px; font-weight: 600; color: var(--c-text2); letter-spacing: .5px; }
  .im-loading { display: flex; align-items: center; gap: 8px; color: var(--c-text3); font-size: 12.5px; padding: 10px 0; }
  .im-loading .sp { width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--c-line);
    border-top-color: var(--c-accent); animation: bd-spin .8s linear infinite; }

  /* 皮肤切换浮层 */
  .im-skin-menu { position: fixed; z-index: 10000; min-width: 188px; padding: 6px; border-radius: 10px;
    background: var(--c-panel); border: 1px solid var(--c-line); box-shadow: 0 10px 30px rgba(17,24,39,.16);
    animation: bd-fade .12s ease both; }
  .im-skin-menu .it { display: flex; align-items: center; gap: 8px; height: 34px; padding: 0 10px;
    border-radius: 7px; font-size: 13px; color: var(--c-text); cursor: pointer; }
  .im-skin-menu .it:hover { background: var(--c-hover); }
  .im-skin-menu .it.on { color: var(--c-accent); font-weight: 500; }
  .im-skin-menu .it .sw { width: 14px; height: 14px; border-radius: 4px; flex: 0 0 14px; }
  .im-skin-menu .it .nm { flex: 1; }
  .im-skin-menu .it .ck { width: 14px; height: 14px; display: inline-flex; }
  .im-skin-menu .it .ck svg { width: 14px; height: 14px; }
  .im-skin-menu .hd { font-size: 11px; color: var(--c-text3); padding: 4px 10px 6px; }
  .im-skin-menu .sep { height: 1px; background: var(--c-line); margin: 5px 4px; }
  .im-skin-menu .hd2 { font-size: 11px; color: var(--c-text3); padding: 2px 10px 4px; }
  .im-skin-menu .ttl { font-size: 12px; color: var(--c-text2); padding: 0 10px 6px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .im-win.menu-open { background: var(--c-hover); color: var(--c-text); }

  /* 登录入口：未登录时亮一颗小红点，登录后隐藏 */
  .im-win .login-dot { display: block; width: 7px; height: 7px; border-radius: 50%;
    background: #F5222D; box-shadow: 0 0 0 2px var(--c-title); }
  .im-win[data-act="login"].on .login-dot { background: var(--c-text4); box-shadow: none; }

  /* 登录说明浮层 */
  .bd-login-dlg { position: fixed; z-index: 10001; width: 340px; padding: 16px 16px 12px; border-radius: 12px;
    background: var(--c-panel, #fff); border: 1px solid var(--c-line, #E2E6EE);
    box-shadow: 0 16px 44px rgba(17,24,39,.22); animation: bd-fade .14s ease both; color: var(--c-text, #1F2329); }
  .bd-login-dlg .hd { font-size: 14px; font-weight: 600; margin-bottom: 8px; }
  .bd-login-dlg .st { font-size: 13px; line-height: 1.65; color: var(--c-text2, #4A4F57); }
  .bd-login-dlg .st b { color: var(--c-accent, #1A7AF8); }
  .bd-login-dlg .tip { margin-top: 8px; font-size: 12px; line-height: 1.6; color: var(--c-text3, #86909C); }
  .bd-login-dlg .ft { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
  .bd-login-dlg button { height: 30px; padding: 0 14px; border-radius: 7px; border: 0; cursor: pointer;
    font-size: 12.5px; font-family: inherit; }
  .bd-login-dlg button.ghost { background: transparent; color: var(--c-text2, #4A4F57);
    border: 1px solid var(--c-line, #E2E6EE); }
  .bd-login-dlg button.ok { background: var(--c-accent, #1A7AF8); color: #fff; }

  /* 皮肤临时关闭时的「恢复」按钮：不依赖皮肤根节点，必须自己活着 */
  .bd-restore-btn { position: fixed; right: 16px; bottom: 16px; z-index: 2147483000;
    height: 34px; padding: 0 16px; border-radius: 8px; border: 0; cursor: pointer;
    background: #1A7AF8; color: #fff; font-size: 12.5px; font-family: inherit;
    box-shadow: 0 8px 24px rgba(26,122,248,.36); }

  /* toast */
  .im-toast-wrap { position: fixed; left: 50%; bottom: 34px; transform: translateX(-50%); z-index: 9999;
    display: flex; flex-direction: column; gap: 8px; align-items: center; pointer-events: none; }
  .im-toast { background: rgba(23,24,26,.88); color: #fff; font-size: 12.5px; padding: 8px 16px;
    border-radius: 6px; animation: bd-fade .18s ease both; max-width: 70vw; }

  /* 拖拽条 */
  .im-resizer { position: absolute; top: 0; right: -3px; bottom: 0; width: 6px; cursor: col-resize; z-index: 8; }
  .im-resizer:hover { background: linear-gradient(90deg, transparent, var(--c-accent-weak), transparent); }

  /* B站视频页 / 评论区专用排版
     注意：模板字符串里不能出现反引号，会直接把 String.raw 提前闭合。
     规则：--bd-player-w 由 JS 写到 #biliding-root 上，气泡与消息列跟着放宽，播放器才能真正放大；
     上限由 JS 按聊天区宽度算。 */
  .im-bubble.wide, .im-bubble.wide.wide { max-width: min(var(--bd-bubble-w, 9999px), 100%); }
  /* 消息列必须比气泡更宽，否则气泡会被 .im-msg-main 的 max-width 二次压住。
     注意 .im-msg .im-msg-main 是 (0,2,0) 选择器，这里相应提高特异性才压得住。 */
  .im-msg .im-msg-main.wide, .im-msg .im-msg-main.wide.wide {
    max-width: min(calc(var(--bd-player-w, 720px) + 64px), calc(100% - 44px));
  }
  .im-msg-main.wide .im-bubble.wide, .im-msg-main.wide .im-bubble.wide[data-bd-player-w] {
    width: min(calc(var(--bd-player-w, 720px) + 24px), 100%);
  }
  .im-bubble.wide .bd-player, .im-bubble.wide .bd-player.sized { width: min(var(--bd-player-w, 720px), 100%); }
  /* 这些宽度规则特异性比 .bd-player.float 高，会把浮窗压回聊天宽度：浮窗/全屏状态一律让位给 JS 写的尺寸 */
  .im-bubble.wide .bd-player.float, .im-bubble.wide .bd-player.full,
  .im-bubble.wide .bd-player.float.sized, .im-bubble.wide .bd-player.full.sized {
    width: auto; max-width: none;
  }
  /* 播放器全屏：必须比 .im-shell.page-blur .im-chat-body 的模糊更硬，所以带 !important */
  .bd-player.full {
    position: fixed !important; inset: 0 !important; width: 100vw !important; height: 100vh !important;
    max-width: none !important; aspect-ratio: auto !important; border-radius: 0 !important;
    z-index: 10001 !important; filter: none !important;
  }
  .bd-player.full .bd-player-grip, .bd-player.full .bd-player-bar { display: none; }
  .im-shell.player-full .im-chat-head { visibility: hidden; }

  /* 浮窗模式：祖先一旦带 filter / transform，就会成为 position:fixed 的包含块，
     把「浮窗」重新钉回聊天区里；浮窗期间取消这些效果，浮窗才能真正脱离聊天区在整页移动。 */
  .im-shell.player-float .im-chat-body,
  .im-shell.player-float .im-rail,
  .im-shell.player-float .im-nav2,
  .im-shell.player-float .im-strip,
  .im-shell.player-float .im-list,
  .im-shell.player-float .im-composer { filter: none !important; }
  /* 真正的元凶：消息行 .im-msg 带入场动画 bd-fade，动画结束后仍留着 transform: matrix(...)，
     transform 祖先会让 position:fixed 变成「相对该祖先」定位，于是浮窗的 left/top 和眼睛看到的位置不一致，
     拖起来就是在飘。浮窗期间把播放器所有祖先的 transform / filter / perspective / contain 一并清掉。 */
  .im-shell.player-float .im-chat-body,
  .im-shell.player-float .im-msg,
  .im-shell.player-float .im-msg-main,
  .im-shell.player-float .im-bubble {
    transform: none !important; filter: none !important;
    perspective: none !important; contain: none !important; will-change: auto !important;
  }
  /* 浮窗要在 iframe 之上收到指针事件，否则把手拖不动。
     注意这里不能写 position:fixed !important —— 会把 JS 设置的 absolute 坐标系顶掉，浮窗就又飘了 */
  .im-shell.player-float .bd-player.float { z-index: 10000 !important; }

  /* 会议背景：模糊聊天与列表，保留顶栏与播放器（全屏播放器不受影响） */
  .im-shell.page-blur .im-rail,
  .im-shell.page-blur .im-nav2,
  .im-shell.page-blur .im-strip,
  .im-shell.page-blur .im-list,
  .im-shell.page-blur .im-chat-body,
  .im-shell.page-blur .im-composer { filter: blur(7px) saturate(.8); transition: filter .2s ease; }

  /* 触屏 / 窄屏：把 rail 收成图标条 */
  @media (max-width: 1120px) {
    .im-rail { --w-rail: 64px; }
    .im-rail-item span, .im-org-meta, .im-nav2 { display: none !important; }
    .im-rail-item { justify-content: center; padding: 0; }
  }
  `;
