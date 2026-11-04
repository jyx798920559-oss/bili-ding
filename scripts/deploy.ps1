# 把本目录发布到 GitHub（建仓库 + 推送），只在授权时使用一次。
# 用法：
#   $env:GH_TOKEN="ghp_xxx"; pwsh -File scripts\deploy.ps1
# 或  pwsh -File scripts\deploy.ps1 -Token "ghp_xxx"
#
# token 只在本进程内使用，不写入 .git/config，也不落盘。用完请到 GitHub 删除该 token。

param(
  [string]$Token = $env:GH_TOKEN,
  [string]$Owner = "jyx798920559-oss",
  [string]$Repo = "biliding",
  [string]$Description = "B钉：把 B 站装进钉钉 / 飞书 / 企业微信的用户脚本（三合一 IM 皮肤）"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not $Token) { throw "缺少 token：先设置 `$env:GH_TOKEN 再运行（不要写进文件）" }

Write-Host "==> 1/4 创建或复用仓库 $Owner/$Repo"
$env:GH_TOKEN = $Token
$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"
$create = @'
(async () => {
  const token = process.env.GH_TOKEN;
  const owner = process.env.REPO_OWNER;
  const repo = process.env.REPO_NAME;
  const desc = process.env.REPO_DESC || "";
  const api = "https://api.github.com";
  const h = { "User-Agent": "biliding-deploy", "Accept": "application/vnd.github+json", "Authorization": "Bearer " + token };
  const r = await fetch(api + "/user/repos", {
    method: "POST",
    headers: { ...h, "Content-Type": "application/json" },
    body: JSON.stringify({ name: repo, description: desc, private: false, has_issues: true, has_wiki: false, auto_init: false })
  });
  const j = await r.json();
  if (r.status === 201) { console.log("created " + j.full_name + " -> " + j.html_url); return; }
  if (r.status === 422) { console.log("exists (or invalid): " + JSON.stringify(j.errors || j.message)); return; }
  console.log("unexpected " + r.status + " " + JSON.stringify(j).slice(0, 300));
  process.exitCode = 1;
})();
'@
$env:REPO_OWNER = $Owner
$env:REPO_NAME = $Repo
$env:REPO_DESC = $Description
$tmp = Join-Path $env:TEMP "biliding-create-repo.js"
Set-Content -Path $tmp -Value $create -Encoding utf8
node $tmp
if ($LASTEXITCODE -ne 0) { throw "建仓库失败" }

Write-Host "==> 2/4 配置 remote（不含 token）"
$remote = "https://github.com/$Owner/$Repo.git"
$existing = git remote 2>$null
if ($existing -contains "origin") { git remote set-url origin $remote } else { git remote add origin $remote }

Write-Host "==> 3/4 推送 main"
$b64 = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("x-access-token:$Token"))
git -c "http.extraheader=AUTHORIZATION: basic $b64" push -u origin HEAD:main
if ($LASTEXITCODE -ne 0) { throw "推送失败" }

Write-Host "==> 4/4 校验"
$env:GH_TOKEN = ""
$check = @'
(async () => {
  const r = await fetch("https://api.github.com/repos/" + process.env.REPO_OWNER + "/" + process.env.REPO_NAME, {
    headers: { "User-Agent": "biliding-deploy", "Accept": "application/vnd.github+json" }
  });
  const j = await r.json();
  console.log(r.status, j.full_name, "default_branch=" + j.default_branch, "size=" + j.size + "KB");
  const t = await fetch("https://raw.githubusercontent.com/" + process.env.REPO_OWNER + "/" + process.env.REPO_NAME + "/main/biliding.user.js");
  const txt = await t.text();
  console.log("raw userscript:", t.status, txt.slice(0, 40).replace(/\n/g, " "));
})();
'@
Set-Content -Path $tmp -Value $check -Encoding utf8
node $tmp
Remove-Item $tmp -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "完成：https://github.com/$Owner/$Repo"
Write-Host "安装链接：https://github.com/$Owner/$Repo/raw/main/biliding.user.js"
Write-Host "提醒：去 GitHub 删掉刚才的 token。"
