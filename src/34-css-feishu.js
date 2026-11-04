  // ======================= 11. 皮肤样式：飞书 IM =======================
  var CSS_FEISHU = String.raw`
  .im-shell[data-skin="feishu"] {
    --w-rail: 214px; --w-nav2: 0; --w-strip: 50px; --w-list: 340px; --h-title: 44px;
    --r-bubble: 10px; --r-composer: 10px;
    --c-bg: #F5F6F7;
    --c-title: #FFFFFF; --c-title-line: #EFF0F1;
    --c-panel: #FFFFFF; --c-panel2: #F5F6F7;
    --c-rail: #F5F6F7; --c-rail-on: #FFFFFF; --c-hover-rail: rgba(31,35,41,.06);
    --c-nav2: #FFFFFF; --c-nav2-on: #EFF3FF;
    --c-list: #FFFFFF; --c-conv-on: #EFF3FF;
    --c-chat: #FFFFFF; --c-chat-head: #FFFFFF; --c-composer: #FFFFFF;
    --c-line: #E5E6EB; --c-line-weak: #EFF0F1;
    --c-text: #1F2329; --c-text2: #4E5969; --c-text3: #8F959E; --c-text4: #BBBFC4;
    --c-accent: #3370FF; --c-accent-weak: #EFF3FF;
    --c-hover: #F2F3F5;
    --c-tab-on: #EFF3FF; --c-tab-on-text: #3370FF;
    --c-search: #F2F3F5;
    --c-card: #FFFFFF;
    --c-bubble-me: #3370FF; --c-bubble-you: #F5F6F7; --c-bubble-line: transparent;
    --c-tag-line: #DEE0E3; --c-tag-text: #646A73; --c-tag-bg: #F5F6F7;
    --c-send-off: #DDE2EA;
  }
  html.im-dark .im-shell[data-skin="feishu"] {
    --c-bg: #101214; --c-title: #16181B; --c-title-line: #23262B;
    --c-panel: #1A1C20; --c-panel2: #202329;
    --c-rail: #16181B; --c-rail-on: #24272D; --c-hover-rail: rgba(255,255,255,.06);
    --c-nav2: #1A1C20; --c-nav2-on: #20304D;
    --c-list: #1A1C20; --c-conv-on: #22304A;
    --c-chat: #16181B; --c-chat-head: #1A1C20; --c-composer: #1A1C20;
    --c-line: #2A2E35; --c-line-weak: #24272D;
    --c-text: #E8EAED; --c-text2: #B5BAC3; --c-text3: #868D98; --c-text4: #5C636E;
    --c-accent: #5A8CFF; --c-accent-weak: #1E2C46;
    --c-hover: #24272D; --c-tab-on: #22304A; --c-tab-on-text: #8FB2FF;
    --c-search: #202329;
    --c-card: #202329;
    --c-bubble-me: #2A5BD7; --c-bubble-you: #23262C; --c-bubble-line: transparent;
    --c-tag-line: #33373E; --c-tag-text: #9AA1AC; --c-tag-bg: #24272D;
    --c-send-off: #343941;
  }

  /* 飞书：无分组栏；rail 用大图标+文字的白色胶囊 */
  .im-shell[data-skin="feishu"] .im-rail { padding: 6px 8px; }
  .im-shell[data-skin="feishu"] .im-org { padding: 8px 8px 10px; }
  .im-shell[data-skin="feishu"] .im-rail-item { height: 40px; border-radius: 10px; gap: 11px; padding: 0 11px; }
  .im-shell[data-skin="feishu"] .im-rail-item.on { box-shadow: 0 1px 4px rgba(31,35,41,.10); font-weight: 500; }
  .im-shell[data-skin="feishu"] .im-nav2 { display: none; }

  /* 飞书：strip 图标条 */
  .im-shell[data-skin="feishu"] .im-strip { background: #FFFFFF; border-right: 1px solid var(--c-line-weak); }
  html.im-dark .im-shell[data-skin="feishu"] .im-strip { background: #1A1C20; }

  /* 飞书：列表选中项左侧 3px 蓝条 */
  .im-shell[data-skin="feishu"] .im-conv { border-radius: 8px; }
  .im-shell[data-skin="feishu"] .im-conv.on { box-shadow: inset 3px 0 0 var(--c-accent); }

  /* 飞书：自己的气泡是蓝底白字，对方是灰底卡片 */
  .im-shell[data-skin="feishu"] .im-msg.me .im-bubble { color: #FFFFFF; }
  .im-shell[data-skin="feishu"] .im-msg.me .im-bubble a { color: #D6E4FF; }
  .im-shell[data-skin="feishu"] .im-msg .im-bubble { border-radius: 10px; }
  .im-shell[data-skin="feishu"] .im-msg.me .im-bubble { border-radius: 10px; }
  .im-shell[data-skin="feishu"] .im-read { display: none; }

  /* 飞书：聊天头像用圆形 */
  .im-shell[data-skin="feishu"] .im-msg .av,
  .im-shell[data-skin="feishu"] .im-chat-head .av,
  .im-shell[data-skin="feishu"] .im-conv-av,
  .im-shell[data-skin="feishu"] .im-conv-av .face,
  .im-shell[data-skin="feishu"] .im-av-grid { border-radius: 50%; }
  .im-shell[data-skin="feishu"] .im-conv-av .corner { display: none; }

  /* 飞书：输入区是描边卡片，工具栏在输入框上方 */
  .im-shell[data-skin="feishu"] .im-composer { padding: 8px 14px 12px; }
  .im-shell[data-skin="feishu"] .im-comp-box { border-radius: 10px; }
  .im-shell[data-skin="feishu"] .im-comp-input textarea { min-height: 52px; }
  .im-shell[data-skin="feishu"] .im-comp-chips { display: none; }
  `;
