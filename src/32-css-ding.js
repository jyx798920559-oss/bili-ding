  // ======================= 10. 皮肤样式：钉钉 8.x =======================
  var CSS_DING = String.raw`
  .im-shell[data-skin="dingtalk"] {
    --w-rail: 132px; --w-nav2: 172px; --w-strip: 0; --w-list: 332px; --h-title: 44px;
    --r-bubble: 8px; --r-composer: 8px;
    --c-bg: #EFF2F7;
    --c-title: linear-gradient(180deg, #F8F3FE 0%, #FBF8FF 100%);
    --c-title-line: #EFE9F8;
    --c-panel: #FFFFFF; --c-panel2: #F4F5F8;
    --c-rail: #E6ECF9; --c-rail-on: #FFFFFF; --c-hover-rail: rgba(255,255,255,.55);
    --c-nav2: #EDF0F7; --c-nav2-on: #E0E5EE;
    --c-list: #F5F7FB; --c-conv-on: #E4E9F2;
    --c-chat: #F0F3F7; --c-chat-head: #FFFFFF; --c-composer: #F5F7FA;
    --c-line: #E2E6EE; --c-line-weak: #EAEEF5;
    --c-text: #1F2329; --c-text2: #4E5969; --c-text3: #86909C; --c-text4: #B4B9C2;
    --c-accent: #1A7AF8; --c-accent-weak: #E8F1FF;
    --c-hover: #EAEEF5;
    --c-tab-on: #E4E9F2; --c-tab-on-text: #1F2329;
    --c-search: #F1F2F6;
    --c-card: #FFFFFF;
    --c-bubble-me: #CBDBF7; --c-bubble-you: #FFFFFF; --c-bubble-line: #ECEFF3;
    --c-tag-line: #C6DEFF; --c-tag-text: #1A7AF8; --c-tag-bg: #EFF5FF;
    --c-send-off: #C6CBD4;
  }
  html.im-dark .im-shell[data-skin="dingtalk"] {
    --c-bg: #14161A; --c-title: #1A1D22; --c-title-line: #24272D;
    --c-panel: #1E2126; --c-panel2: #23262C;
    --c-rail: #191C21; --c-rail-on: #2A2F37; --c-hover-rail: rgba(255,255,255,.06);
    --c-nav2: #1B1E23; --c-nav2-on: #262B33;
    --c-list: #1E2126; --c-conv-on: #2A3038;
    --c-chat: #16181C; --c-chat-head: #1E2126; --c-composer: #1B1E23;
    --c-line: #2B3038; --c-line-weak: #262A31;
    --c-text: #E6E9EF; --c-text2: #B7BDC8; --c-text3: #8A919D; --c-text4: #5F6672;
    --c-accent: #4C9BFF; --c-accent-weak: #22334D;
    --c-hover: #262B33; --c-tab-on: #2A3038; --c-tab-on-text: #E6E9EF;
    --c-search: #24272D;
    --c-card: #23262C;
    --c-bubble-me: #2C4A78; --c-bubble-you: #23262C; --c-bubble-line: #2E333B;
    --c-tag-line: #33507A; --c-tag-text: #7FB4FF; --c-tag-bg: #1D2A3D;
    --c-send-off: #3A4048;
  }

  /* 顶栏：左侧问候 + 居中搜索 */
  .im-shell[data-skin="dingtalk"] .im-titlebar { backdrop-filter: saturate(150%) blur(8px); }
  .im-shell[data-skin="dingtalk"] .im-tb-search { background: #FCFAFE; border-color: #EFEAF7; }
  .im-shell[data-skin="dingtalk"] .im-tb-search:hover { background: #FFFFFF; }

  /* rail：整行胶囊选中，底部收起 */
  .im-shell[data-skin="dingtalk"] .im-rail { padding-top: 2px; }
  .im-shell[data-skin="dingtalk"] .im-org { padding: 10px 12px 8px; }
  .im-shell[data-skin="dingtalk"] .im-rail-item { height: 38px; border-radius: 8px; }
  .im-shell[data-skin="dingtalk"] .im-rail-item.on { box-shadow: 0 1px 3px rgba(17,24,39,.06); }

  /* nav2：分组标题行 + 树 */
  .im-shell[data-skin="dingtalk"] .im-nav2-head .im-icon-btn { width: 24px; height: 24px; }
  .im-shell[data-skin="dingtalk"] .im-nav2-head .im-icon-btn svg { width: 15px; height: 15px; }

  /* 列表：标题行 + 胶囊 tab */
  .im-shell[data-skin="dingtalk"] .im-list-head { height: 44px; }
  .im-shell[data-skin="dingtalk"] .im-list-body { padding: 0 6px 12px; }
  .im-shell[data-skin="dingtalk"] .im-conv { padding: 9px 8px; }

  /* 聊天头：名字 + 公司路径副标题 */
  .im-shell[data-skin="dingtalk"] .im-chat-head { height: 58px; }
  .im-shell[data-skin="dingtalk"] .im-chat-head .sub { color: #86909C; }

  /* 我自己气泡的尾巴：左上小圆角 */
  .im-shell[data-skin="dingtalk"] .im-msg .im-bubble { border-radius: 3px 8px 8px 8px; }
  .im-shell[data-skin="dingtalk"] .im-msg.me .im-bubble { border-radius: 8px 3px 8px 8px; }
  `;
