  // ======================= 3. 皮肤配置 =======================
  // 三套皮肤：钉钉 8.x / 飞书 IM / 企业微信 5.x。
  // 结构差异用 layout 标记，配色走 CSS 里的 [data-skin=...] 变量块。
  var SKINS = {
    dingtalk: {
      id: "dingtalk",
      label: "钉钉",
      org: "云枢科技",
      titlebar: true,
      rail: true,
      nav2: true,
      strip: false,
      listHeader: "chips",
      listNav: ["消息", "置顶", "单聊", "群聊", "我创建的", "小分组"],
      railItems: [
        { k: "msg", icon: "msg", label: "消息", badge: true, on: true },
        { k: "notify", icon: "bell", label: "通知" },
        { k: "dm", icon: "mail", label: "私信" },
        { k: "mark", icon: "bookmark", label: "书签" },
        { k: "chat", icon: "chat", label: "聊天" },
        { k: "doc", icon: "doc", label: "文档", dot: true },
        { k: "aitable", icon: "table", label: "AI表格" },
        { k: "aimic", icon: "mic", label: "AI听记" },
        { k: "work", icon: "grid", label: "工作台" },
        { k: "book", icon: "book", label: "通讯录" },
        { k: "meet", icon: "video", label: "会议" },
        { k: "cal", icon: "cal", label: "日历" },
        { k: "todo", icon: "todo", label: "待办", badge: true },
        { k: "add", icon: "plus", label: "添加" }
      ],
      composer: {
        toolbar: ["bold", "italic", "underline", "strike", "olist", "list", "link", "image", "code"],
        tools: ["smile", "thumb", "at", "font", "scissors", "folder", "plus"],
        placeholder: "请输入消息",
        hint: "Enter/Alt+S 发送，Ctrl+Enter换行",
        chips: ["看待办", "看忙碌"]
      }
    },
    feishu: {
      id: "feishu",
      label: "飞书",
      org: "云枢科技",
      titlebar: true,
      rail: true,
      nav2: false,
      strip: true,
      listHeader: "chips",
      listNav: ["消息", "未读"],
      railItems: [
        { k: "msg", icon: "msg", label: "消息", badge: true, on: true },
        { k: "cal", icon: "cal", label: "日历" },
        { k: "work", icon: "grid", label: "工作台" },
        { k: "cloud", icon: "cloud", label: "云文档" },
        { k: "wiki", icon: "wiki", label: "知识库" },
        { k: "task", icon: "task", label: "任务" },
        { k: "book", icon: "book", label: "联系人" },
        { k: "project", icon: "project", label: "项目" },
        { k: "more", icon: "more", label: "更多" }
      ],
      composer: {
        toolbar: ["bold", "italic", "underline", "strike", "code", "olist", "list", "quote", "link", "image", "smile", "at"],
        tools: [],
        placeholder: "发送消息…",
        hint: "输入内容后按 Enter 发送",
        chips: []
      }
    },
    wecom: {
      id: "wecom",
      label: "企业微信",
      org: "云枢科技",
      titlebar: true,
      rail: true,
      nav2: false,
      strip: false,
      listHeader: "plain",
      listNav: ["未读", "@我", "单聊", "群聊", "内部聊天", "外部聊天", "标记"],
      railItems: [
        { k: "msg", icon: "msg", label: "消息", badge: true, on: true },
        { k: "notify", icon: "bell", label: "通知" },
        { k: "dm", icon: "mail", label: "私信" },
        { k: "mark", icon: "bookmark", label: "书签" },
        { k: "chat", icon: "chat", label: "聊天" },
        { k: "smartdoc", icon: "doc", label: "智能文档", dot: true },
        { k: "summary", icon: "spark", label: "智能总结" },
        { k: "work", icon: "grid", label: "工作台" },
        { k: "book", icon: "book", label: "通讯录" },
        { k: "disk", icon: "disk", label: "微盘" },
        { k: "apps", icon: "apps", label: "高级功能" }
      ],
      composer: {
        toolbar: ["bold", "italic", "underline", "strike", "code", "olist", "list", "quote", "link", "image", "smile", "at"],
        tools: [],
        placeholder: "输入消息",
        hint: "Enter 发送，Ctrl+Enter 换行",
        chips: []
      }
    }
  };
  var SKIN_ORDER = ["dingtalk", "feishu", "wecom"];

  function currentSkinId() {
    var v = lsGet(LS.skin, "dingtalk");
    return SKINS[v] ? v : "dingtalk";
  }
  var SKIN_ID = currentSkinId();
  function skin() { return SKINS[SKIN_ID]; }

  // 站点脚本一开始跑就会把标题改回「…_哔哩哔哩_bilibili」，所以这里立刻装上拦截
  // （MOCK 预览页不改标题）
  installTitleGuard();
  syncTitle(true);

  // ======================= 4. 频道定义（B站分区 → 群聊） =======================
  var CHANNELS = [
    { rid: 0, key: "rcmd", label: "推荐", group: "推荐流", avatar: "推", color: "#1A87FF", kind: "home" },
    { rid: 0, key: "hot", label: "热门", group: "热门榜单", avatar: "热", color: "#FF6B35", api: "popular" },
    { rid: 1, key: "douga", label: "动画", group: "动画交流群", avatar: "动", color: "#FF6699" },
    { rid: 36, key: "knowledge", label: "知识", group: "知识充电站", avatar: "知", color: "#4D8DFF" },
    { rid: 188, key: "tech", label: "科技", group: "科技数码群", avatar: "科", color: "#12B5CB" },
    { rid: 3, key: "music", label: "音乐", group: "音乐广场", avatar: "音", color: "#9B5DE5" },
    { rid: 4, key: "game", label: "游戏", group: "游戏开黑群", avatar: "游", color: "#00C56C" },
    { rid: 5, key: "ent", label: "娱乐", group: "娱乐圈茶馆", avatar: "娱", color: "#FF9A3D" },
    { rid: 211, key: "food", label: "美食", group: "美食探店群", avatar: "食", color: "#E8A33D" },
    { rid: 160, key: "life", label: "生活", group: "生活百宝箱", avatar: "生", color: "#31C48D" },
    { rid: 181, key: "film", label: "影视", group: "影视追剧群", avatar: "影", color: "#5B6EF5" },
    { rid: 138, key: "dance", label: "舞蹈", group: "舞蹈练习室", avatar: "舞", color: "#F45B9A" },
    { rid: 119, key: "kichiku", label: "鬼畜", group: "鬼畜素材库", avatar: "鬼", color: "#7C5CFF" },
    { rid: 155, key: "fashion", label: "时尚", group: "穿搭分享群", avatar: "时", color: "#FF5C8A" },
    { rid: 202, key: "car", label: "汽车", group: "车友会", avatar: "车", color: "#3E7BFA" },
    { rid: 234, key: "sports", label: "运动", group: "体育馆", avatar: "体", color: "#2FA84F" },
    { rid: 13, key: "anime", label: "番剧", group: "番剧追更群", avatar: "番", color: "#FF7A45", api: "newlist" },
    { rid: 177, key: "documentary", label: "纪录片", group: "纪录片放映厅", avatar: "纪", color: "#4A5568", api: "newlist" }
  ];
  function channelByKey(key) {
    for (var i = 0; i < CHANNELS.length; i++) if (CHANNELS[i].key === key) return CHANNELS[i];
    return null;
  }
  function channelById(rid) {
    for (var i = 0; i < CHANNELS.length; i++) if (CHANNELS[i].rid === Number(rid)) return CHANNELS[i];
    return null;
  }

  // 分组栏（钉钉/企微左二栏）里挂的「我创建的」分组树：把 B站分区按主题分桶
  // 分组名全部虚构，不含任何真实客户 / 项目 / 同事信息。
  var NAV2_GROUPS = [
    { name: "前装一期", keys: ["car", "tech", "sports"] },
    { name: "小分组", keys: ["documentary", "film"] },
    { name: "客户甲", keys: ["knowledge", "music"] },
    { name: "工程机", keys: ["game", "douga"] },
    { name: "客户乙", keys: ["ent", "life"] },
    { name: "售后支持", keys: ["food", "fashion"] },
    { name: "临时组", keys: ["dance", "kichiku"] }
  ];

  // 首屏兜底会话（真实站也保留：让工作区看起来有人）
  // 人名 / 项目名 / 公司名全部虚构，仅用于撑起 IM 外观。
  var DECOY_CONVS = [
    { id: "sys:1", name: "【IPMT】QC-8 项目组", tag: "内部群", preview: "林望舒: 这版排期表你过一下，下周一前给结论…", time: "09:32", avatar: "Q", color: "#1A87FF", unread: 12, mute: true, members: 8 },
    { id: "sys:2", name: "鹰眼 2.0 算法计划（研发）", tag: "内部群", preview: "周砚: 撤回了一条消息", time: "09:12", avatar: "Y", color: "#4D8DFF", unread: 3, mute: true, members: 24 },
    { id: "sys:3", name: "陈亦然", preview: "只有一台", time: "昨天", avatar: "亦", color: "#8A93A0", members: 0 },
    { id: "sys:4", name: "张与安", tag: "部门标签", preview: "因为这个题，所以我接了一个扩展坞", time: "昨天", avatar: "与", color: "#FF6B35", read: true, members: 0 },
    { id: "sys:5", name: "海外车队加装项目组", tag: "内部群", preview: "祁远: 叠加之前核对过，后天我会再次复核…", time: "昨天", avatar: "海", color: "#00C56C", unread: 17, mute: true, members: 12 },
    { id: "sys:6", name: "罗一川,许星野,唐声远", tag: "外部群", preview: "罗一川: OK 等会给测试送过去", time: "周一", avatar: "罗", color: "#12B5CB", members: 36 }
  ];

  // ======================= 5. 状态 =======================
  var state = {
    activeRail: "msg",
    activeConv: "conv:rcmd",
    activeNav2: "消息",
    convCache: {},
    unread: {},
    listFilter: "all",
    listQuery: "",
    dark: lsGet(LS.dark, "0") === "1",
    blur: lsGet(LS.blur, "0") === "1",
    playerDef: null,
    playerW: 0,
    me: null,
    messages: {}
  };
