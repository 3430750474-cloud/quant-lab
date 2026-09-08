# Quant Lab 免费上线说明

Quant Lab 使用模板中的“GitHub Pages + Cloudflare Workers”架构上线，不需要云服务器。

## 当前公开版

公网地址：`https://3430750474-cloud.github.io/quant-lab/`

当前 `deploy/public` 使用纯静态模式：课程、测验判分与学习进度都可在手机浏览器直接运行，进度保存在该浏览器的 `localStorage`。此模式不依赖 Cloudflare，国内网络可直接访问 GitHub Pages。

Cloudflare Worker（`deploy/worker`）仍保留服务端判分与 KV 跨设备进度方案；如果以后有可访问的自定义域名，可把 `deploy/public/index.html` 中的 `__STATIC_API` 关闭并填写 Worker 地址，再切回服务端模式。

## 1. 静态网页（GitHub Pages）

1. 在 GitHub 新建一个公开仓库，例如 `quant-lab`。
2. 把本项目推送到该仓库：

```powershell
git remote add origin https://github.com/<你的用户名>/quant-lab.git
git push -u origin master
```

3. 仓库 Settings → Pages → Source 选择 “GitHub Actions”。
4. push 后 `.github/workflows/pages.yml` 会自动发布 `deploy/public`。

## 2. 接口（Cloudflare Workers）

在项目根目录执行：

```powershell
pnpm dlx wrangler login
cd deploy\worker
pnpm dlx wrangler deploy
```

默认接口地址：

```text
https://quant-lab-api.3430750474.workers.dev
```

如果 Cloudflare 子域名不同，请修改 `deploy/public/index.html` 中的：

```js
window.__API_BASE = "https://quant-lab-api.你的子域名.workers.dev";
```

## 3. 跨设备保存学习进度（可选）

Worker 默认在单次运行内保存进度；要跨手机/电脑同步，请先创建 KV：

```powershell
cd deploy\worker
pnpm dlx wrangler kv namespace create QUANTLAB_KV
```

把返回的 `id` 填进 `deploy/worker/wrangler.toml`，取消 KV 绑定注释后重新 `wrangler deploy`。

## 4. 重新生成课程数据

修改 `data/courses` 后运行：

```powershell
python deploy\build_worker_data.py
```

然后重新部署 Worker 并推送 GitHub。
