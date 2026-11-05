// ==UserScript==
// @name         B钉 · B站 IM 皮肤（钉钉 / 飞书 / 企业微信）
// @namespace    biliding.local
// @version      2.1.0
// @author       BiliDing
// @description  把 B 站装进办公 IM：首页推荐流变成消息会话、分区变成群聊、视频页变成单聊、评论区变成聊天记录。内置钉钉 / 飞书 / 企业微信三套皮肤，一键切换。纯前端皮肤，不写 B站任何数据。
// @match        https://www.bilibili.com/*
// @match        https://search.bilibili.com/*
// @run-at       document-start
// @grant        none
// @noframes
// @license      MIT
// ==/UserScript==

/*!
 * B钉（BiliDing）v2
 * 三合一 IM 外观：钉钉 PC 8.x / 飞书 IM / 企业微信 5.x。
 * 思路参考 czm15053/linuxdo-idea-ui 的 IM 三合一皮肤与 Jack-Cherish/BiliShu 的 B站移植，
 * 本项目为独立实现，只读取 B站公开接口与已渲染 DOM。
 *
 * 注意：这是「用户脚本」，只能在浏览器里由 Tampermonkey / Violentmonkey 执行。
 * 双击 .js 会用 Windows 脚本宿主（wscript）打开并报语法错误，这是正常现象，不代表脚本坏了。
 */

