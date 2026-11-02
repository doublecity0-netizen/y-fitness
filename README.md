# Y · 角色养成

静态手机网页，14 套人物穿搭连续轮换，支持手动选择与恢复自动。训练采用日期专属安排优先、未来每周基础计划兜底。

## 本地运行

在本目录运行 `python3 -m http.server 8000`，浏览器打开 http://localhost:8000 。

## 测试

安装 Node.js 后运行 `node tests/regression.cjs --release`。

## 数据

记录仅在当前浏览器当前来源的 localStorage 保存，不跨设备/域名同步。不要清除已有浏览器数据。本仓库不包含真实打卡记录、原始照片、账号凭据。

## 文件

index.html 为入口；wardrobe-catalog.js 为新衣橱目录；assets 为14张生成角色图；tests 为回归检查。

## 发布

保持原仓库私有。源码同步不自动开启 GitHub Pages，不修改已上线站点。具体安全上传指令见 CODEX_UPLOAD.md。
