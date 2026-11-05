# B钉 · BiliDing

**把 B 站装进办公 IM。** 一套用户脚本，把 bilibili 的首页推荐、分区、视频页伪装成钉钉 / 飞书 / 企业微信的聊天界面：视频变成群消息卡片，评论区变成聊天记录，UP 主发来一个视频。

三套皮肤内置，顶栏一键切换，偏好本地保存。

[![UserScript](https://img.shields.io/badge/UserScript-Tampermonkey-1A7AF8)](https://www.tampermonkey.net/)
[![version](https://img.shields.io/badge/version-2.1.0-3370FF)](#)
[![license](https://img.shields.io/badge/license-MIT-00A870)](./LICENSE)

---

## 效果

| 皮肤 | 结构 | 还原点 |
|---|---|---|
| **钉钉 8.x** | 淡色 titlebar + 132px 文字导航 + 分组栏 + 会话列表 + 聊天 | 居中搜索条、组织 chip、内部群标签、未读角标、免打扰铃铛、`已读` 回执、引用回复、富文本工具栏、`发送(S)` 分体按钮 |
| **飞书 IM** | 214px 白色导航 + 48px 图标条 + 会话列表 + 聊天 | 白色胶囊选中、左蓝条选中行、圆形头像、蓝底白字自己气泡、灰底对方卡片、描边输入卡片 |
| **企业微信 5.x** | 168px 导航 + 分组树 + 会话列表 + 聊天 | 蓝色实心选中项、列表顶部搜索条、灰底聊天区、白色消息卡片 |

不装油猴也能看：打开 [`preview/harness.html`](./preview/harness.html)（内置假数据，图片是内联 SVG，不需要联网）。

```
preview/harness.html                  # 钉钉皮肤 + 推荐流
preview/harness.html?skin=feishu      # 飞书皮肤
preview/harness.html?skin=wecom       # 企业微信皮肤
preview/harness.html?route=video      # 视频页单聊 + 评论区
```

## 安装

1. 浏览器安装 [Tampermonkey](https://www.tampermonkey.net/)（或 Violentmonkey）
2. 打开 [`install.html`](./install.html) → 点「复制脚本全文」
3. Tampermonkey 面板 →「添加新脚本」→ 全选删掉模板 → 粘贴 → `Ctrl+S`
4. 打开 [bilibili.com](https://www.bilibili.com/)

也可以直接把下面的 Raw 链接拖进装有 Tampermonkey 的浏览器窗口：

```text
https://github.com/jyx798920559-oss/bili-ding/raw/main/biliding.user.js
```

> ⚠️ **不要双击 `biliding.user.js`**。Windows 会用脚本宿主（wscript）打开 .js，弹出
> 「未结束的字符串常量 / 800A03F7」。那是 wscript 在跑浏览器脚本，属正常现象，文件本身没坏。
> 用户脚本只能由浏览器里的油猴执行。

切换皮肤：顶栏调色板图标（左栏「添加」也可以）→ 钉钉 / 飞书 / 企业微信，选择写入 `localStorage`。

## 它做了什么

| B站 | B钉 |
|---|---|
| 首页推荐 | 「推荐流」群聊，视频以消息卡片推送 |
| 分区 / 热门 | 「内部群」，消息流是分区内最新视频 |
| 视频页 `/video/BVxxx` | 与 UP 主的单聊：发来一个视频播放器 + 评论区变成聊天记录 |
| 视频播放 | 页内 iframe 指向**同源视频页** `www.bilibili.com/video/BVxxx`，走网页端同一套播放线路：登录后清晰度与官网一致（外嵌 `player.html` 只给未登录的精简清晰度，已弃用） |
| 登录 | 顶栏「登录 / 账号」按钮：未登录时亮红点，点击给出登录指引与跳转（B站登录页禁止被内嵌）；登录后回到本页自动识别登录态 |
| 临时关闭皮肤 | `Ctrl+Shift+L` 或登录浮层里的按钮：原站整页恢复（含右键、官方播放器），右下角留「恢复 B钉 皮肤」按钮切回 |
| 播放器大小 | 播放器工具条「大小」菜单（小 / 中 / 大 / 铺满聊天区）+ 右下角拖拽，默认铺满可用宽度，支持整页全屏（Esc 退出），宽度本地记忆 |
| 标签页伪装 | `<title>` 固定为「云枢科技 · 钉钉 / 飞书 / 企业微信」（跟随皮肤，可右键改自定义标题），favicon 换成内联 SVG；B站 SPA 改写标题也会被拦回 |
| 会议背景 | 顶栏 / 聊天头部「投影」按钮，一键模糊页面内容，防止背后的人认出画面 |
| 搜索 | 顶栏搜索框输入 ≥2 字回车，走 B站全站搜索 |
| 通讯录 / 工作台 | 装饰入口，按钉钉长相保留，点了不跳外链 |
| 深色模式 | 顶栏月亮按钮，偏好持久化 |

三套皮肤共用同一套数据层：切皮肤只重建外观，不会重新请求接口。

## 数据来源

全部走 B站 Web 公开接口，与页面同源、带浏览器 Cookie，**不需要任何额外授权**：

| 用途 | 接口 |
|---|---|
| 推荐流 | `/x/web-interface/wbi/index/top/feed/rcmd`（失败自动降级热门） |
| 热门 | `/x/web-interface/popular` |
| 分区最新 | `/x/web-interface/newlist?rid=<tid>` |
| 视频详情 | `/x/web-interface/view?bvid=` |
| 评论区 | `/x/v2/reply?type=1&oid=<aid>` |
| 搜索 | `/x/web-interface/search/type` |
| 登录态 | `/x/web-interface/nav` |

**纯前端皮肤，只读不写**：不发评论、不点赞、不投币、不下单，不改动 B站任何数据。

## 已知限制

1. 推荐流接口可能需要 WBI 签名，失效时自动退回「热门」，不影响可用性。
2. 输入框可以打字，但**不会真的发送**（B站写操作需要 `csrf=bili_jct` 且有风控风险）。
3. 视频页暂只支持 `BV` 号，`av` 号链接请用 BV 打开。
4. B站是 SPA，脚本用「链接拦截 + history 补丁 + URL 轮询」三重兜底跟随路由；极少数改版后需要更新选择器。
5. 窄屏（< 1120px）自动把导航栏折成图标条。
6. **高清必须自己登录**：脚本不绕过 B站鉴权。登录页 `passport.bilibili.com` 有 `X-Frame-Options`，不能被内嵌，所以登录在新标签页完成；登录态只在你自己浏览器里有效。
7. 页内播放器是同源视频页 iframe，弹幕默认关闭（避免和聊天区抢视线），也没法用脚本直接控制清晰度菜单——那是官网播放器自己的控件。
8. 若视频页登录后仍显示精简清晰度，多半是 Cookie 没同步或账号本身无该清晰度权限，先用 `Ctrl+Shift+L` 切回原站确认真实可用清晰度。

## 开发

源码按片段拆在 `src/`，`build.js` 直接拼成单文件产物，**没有任何打包依赖**：

```bash
node build.js            # src/*.js → biliding.user.js + install.html
node --check biliding.user.js
node check.js            # 静态自检：图标引用、皮肤 CSS 块、CSS 变量、反引号平衡
```

```
src/00-meta.js       UserScript 元数据（@name/@match/@version…）
src/10-core.js       工具函数 + 64 个内联 SVG 图标
src/15-skins.js      三皮肤配置（导航项、输入区、分组树）+ B站频道映射
src/12-title.js      标签页标题 / favicon 伪装（含 B站 SPA 改写兜底）
src/20-data.js       B站接口 / 路由解析 / favicon
src/30-css-core.js   公共骨架样式（全部走 CSS 变量）
src/32-css-ding.js   钉钉皮肤
src/34-css-feishu.js 飞书皮肤
src/36-css-wecom.js  企业微信皮肤
src/40-shell.js      骨架构建、事件绑定、皮肤切换、列表拖拽
src/50-render.js     会话列表 / 聊天区 / 输入区 / 视频卡片 / 搜索
src/55-player.js     播放器尺寸 / 全屏 / 同源播放源 / 会议背景 / 自定义标题
src/57-account.js    登录态查询 / 登录指引浮层 / 临时关闭皮肤（Ctrl+Shift+L）
src/90-boot.js       启动、路由跟随、history 补丁
```

## 致谢与许可

- 三合一皮肤的结构、尺寸与交互参考：[czm15053/linuxdo-idea-ui](https://github.com/czm15053/linuxdo-idea-ui)（MIT）
- B站移植思路：[Jack-Cherish/BiliShu](https://github.com/Jack-Cherish/BiliShu)
- 本项目为独立实现，未复制上游代码，同样以 [MIT](./LICENSE) 发布
- 与哔哩哔哩、钉钉、飞书、企业微信官方均无关联，仅供个人学习与本地使用
