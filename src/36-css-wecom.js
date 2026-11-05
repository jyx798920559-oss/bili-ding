  // ======================= 12. 皮肤样式：企业微信 5.x =======================
  var CSS_WECOM = String.raw`
  .im-shell[data-skin="wecom"] {
    --w-rail: 168px; --w-nav2: 0; --w-strip: 0; --w-list: 320px; --h-title: 0px;
    --r-bubble: 6px; --r-composer: 6px;
    --c-bg: #F5F6F7;
    --c-title: #FFFFFF; --c-title-line: transparent;
    --c-panel: #FFFFFF; --c-panel2: #F5F6F7;
    --c-rail: #FFFFFF; --c-rail-on: #2A7CF7; --c-hover-rail: #F2F4F7;
    --c-nav2: #FFFFFF; --c-nav2-on: #F2F4F7;
    --c-list: #FFFFFF; --c-conv-on: #F2F4F7;
    --c-chat: #F7F8FA; --c-chat-head: #FFFFFF; --c-composer: #FFFFFF;
    --c-line: #E6E8EB; --c-line-weak: #EFF0F2;
    --c-text: #1A1A1A; --c-text2: #4A4F57; --c-text3: #8B9099; --c-text4: #B6BAC1;
    --c-accent: #2A7CF7; --c-accent-weak: #EAF2FE;
    --c-hover: #F2F4F7;
    --c-tab-on: #EAF2FE; --c-tab-on-text: #2A7CF7;
    --c-search: #F0F1F3;
    --c-card: #FFFFFF;
    --c-bubble-me: #D3E4FD; --c-bubble-you: #FFFFFF; --c-bubble-line: #EAEBED;
    --c-tag-line: #E3E5E8; --c-tag-text: #7A7F87; --c-tag-bg: #F5F6F7;
    --c-send-off: #C4C8D0;
  }
  html.im-dark .im-shell[data-skin="wecom"] {
    --c-bg: #141518; --c-title: #1A1B1E; --c-title-line: transparent;
    --c-panel: #1E1F23; --c-panel2: #232529;
    --c-rail: #1A1B1E; --c-rail-on: #2A7CF7; --c-hover-rail: #24262A;
    --c-nav2: #1A1B1E; --c-nav2-on: #24262A;
    --c-list: #1E1F23; --c-conv-on: #26282D;
    --c-chat: #17181B; --c-chat-head: #1E1F23; --c-composer: #1E1F23;
    --c-line: #2C2E33; --c-line-weak: #26282C;
    --c-text: #E8E9EB; --c-text2: #B6BAC1; --c-text3: #888D95; --c-text4: #5E6269;
    --c-accent: #4B93FF; --c-accent-weak: #1D2C42;
    --c-hover: #26282D; --c-tab-on: #1D2C42; --c-tab-on-text: #7FB0FF;
    --c-search: #26282C;
    --c-card: #232529;
    --c-bubble-me: #26426B; --c-bubble-you: #232529; --c-bubble-line: #2E3036;
    --c-tag-line: #33363C; --c-tag-text: #979CA4; --c-tag-bg: #26282C;
    --c-send-off: #363A41;
  }

  /* 企业微信 5.x 本体没有独立标题栏，但「切换皮肤 / 登录 / 深色 / 会议背景」必须可达：
     标题栏本体照旧隐藏，这几个键被克隆成 .im-tb-wins 浮层。
     浮层贴在 rail 底部（在「收起 / 更多」下方，按钮是横排），不去挤顶部 org 行——
     rail 只有 168px，4 个键横排塞进 org 行会把组织名压没。 */
  .im-shell[data-skin="wecom"] .im-titlebar { display: none; }
  .im-shell[data-skin="wecom"] .im-body { padding-top: 0; }
  .im-shell[data-skin="wecom"] .im-rail-tail { padding-bottom: 6px; }
  .im-tb-wins { position: static; display: flex; align-items: center; justify-content: center;
    gap: 2px; margin: 4px 8px 2px; padding: 4px 0; border-radius: 8px;
    background: var(--c-rail); border: 1px solid var(--c-line-weak); }
  .im-tb-wins .im-win { width: 28px; height: 24px; }
  .im-tb-wins .im-win svg { width: 14px; height: 14px; }

  /* rail：选中项是蓝色实心，图标与文字转白 */
  .im-shell[data-skin="wecom"] .im-rail { border-right: 1px solid var(--c-line-weak); }
  .im-shell[data-skin="wecom"] .im-org { padding: 12px 12px 10px; }
  .im-shell[data-skin="wecom"] .im-org-meta { overflow: hidden; }
  .im-shell[data-skin="wecom"] .im-org-logo { background: linear-gradient(135deg,#4096FF,#1769D2); color: #fff; }
  .im-shell[data-skin="wecom"] .im-rail-item { height: 38px; border-radius: 6px; }
  .im-shell[data-skin="wecom"] .im-rail-item.on { color: #fff; }
  .im-shell[data-skin="wecom"] .im-rail-item.on svg { color: #fff; }
  .im-shell[data-skin="wecom"] .im-rail-item.on .bd-badge { background: #fff; color: var(--c-accent); }
  .im-shell[data-skin="wecom"] .im-rail-group-title { display: block; }

  /* 列表：顶部搜索条 + 会话行 */
  .im-shell[data-skin="wecom"] .im-list-head { height: 48px; padding-right: 6px; }
  .im-shell[data-skin="wecom"] .im-list-head .im-list-title { font-size: 14px; }
  .im-shell[data-skin="wecom"] .im-list-search { padding: 0 10px 6px; }
  .im-shell[data-skin="wecom"] .im-list-tabs { padding: 0 10px 6px; }
  .im-shell[data-skin="wecom"] .im-conv { padding: 10px 8px; }
  .im-shell[data-skin="wecom"] .im-conv.on { background: var(--c-conv-on); }

  /* 聊天区：白底卡片化消息 */
  .im-shell[data-skin="wecom"] .im-chat-head { height: 56px; border-right: 0; }
  .im-shell[data-skin="wecom"] .im-chat-head .name { font-size: 15px; }
  .im-shell[data-skin="wecom"] .im-chat-body { background: #F7F8FA; }
  html.im-dark .im-shell[data-skin="wecom"] .im-chat-body { background: #17181B; }
  .im-shell[data-skin="wecom"] .im-msg .im-bubble { box-shadow: 0 1px 2px rgba(17,24,39,.04); }
  .im-shell[data-skin="wecom"] .im-comp-chips { display: none; }
  .im-shell[data-skin="wecom"] .im-composer { border-top: 1px solid var(--c-line-weak); }
  `;
