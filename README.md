# Quant Lab｜量化实验室

面向量化新手的个人中文量化学习平台。M1 先交付课程体系与学习进度，数据实验室、策略实验室、回测中心、AI 研究助手按后续里程碑逐步开放。

公网地址（GitHub Pages）：`https://3430750474-cloud.github.io/quant-lab/`

## 运行

```powershell
python -m venv .venv
.\.venv\Scripts\pip install -r .\backend\requirements.txt
.\.venv\Scripts\python -m uvicorn quantlab.api.main:app --app-dir .\backend --host 127.0.0.1 --port 8000
```

浏览器打开 `http://127.0.0.1:8000`，FastAPI 文档位于 `http://127.0.0.1:8000/docs`。

## 手机访问

1. 双击根目录 `启动网站.bat`，脚本会自动让服务监听 `0.0.0.0:8000` 并打开电脑的局域网地址。
2. 手机与电脑连接同一个 Wi-Fi，在手机浏览器输入脚本显示的地址，例如 `http://192.168.x.x:8000/`。
3. 如果手机打不开，检查 Windows 防火墙是否放行 TCP 8000（专用网络）。

## 测试

```powershell
.\.venv\Scripts\python -m pytest
```

学习进度默认写入 `backend/runtime/quantlab.db`，可通过环境变量 `QUANTLAB_DB_PATH` 覆盖。
