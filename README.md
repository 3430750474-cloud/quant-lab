# Quant Lab｜量化实验室

面向量化新手的个人中文量化学习平台。M1 先交付课程体系与学习进度，数据实验室、策略实验室、回测中心、AI 研究助手按后续里程碑逐步开放。

## 运行

```powershell
python -m venv .venv
.\.venv\Scripts\pip install -r .\backend\requirements.txt
.\.venv\Scripts\python -m uvicorn quantlab.api.main:app --app-dir .\backend --host 127.0.0.1 --port 8000
```

浏览器打开 `http://127.0.0.1:8000`，FastAPI 文档位于 `http://127.0.0.1:8000/docs`。

## 测试

```powershell
.\.venv\Scripts\python -m pytest
```

学习进度默认写入 `backend/runtime/quantlab.db`，可通过环境变量 `QUANTLAB_DB_PATH` 覆盖。
