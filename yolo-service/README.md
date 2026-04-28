# YOLO Learning State Service

`yolo-service` 是 Geometry Lab 的本地学习状态检测服务，使用 FastAPI 和 Ultralytics YOLO 对摄像头画面或上传图片进行目标检测，并据此推断学习状态。

## 负责内容

- 本地 YOLO 推理
- 识别 `person`、`book`、`laptop`、`cell phone` 等目标
- 推断学习状态并返回说明文本
- 提供普通 JSON 接口与 SSE 流式接口

## 输出内容

服务返回的数据包含：

- `learningState`
- `confidence`
- `evidence`
- `detectedObjects`
- `detections`
- `previewImage`
- `sourcePreview`
- `analysisHtml`
- `usedModel`

当前状态标签主要包括：

- `专注学习中`
- `可能分心`
- `离开学习区域`
- `在场但专注度一般`

## 本地启动

Windows PowerShell：

```powershell
cd yolo-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8001 --reload
```

macOS / Linux：

```bash
cd yolo-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8001 --reload
```

## 环境变量

```bash
YOLO_WEIGHTS=yolov8n.pt
```

说明：

- 默认读取当前目录下的 `yolov8n.pt`
- 如果你已有自己的本地权重，可将 `YOLO_WEIGHTS` 改为对应路径

## 接口一览

- `GET /health`
- `POST /api/learning-state`
- `POST /api/learning-state-stream`

## 前端对接说明

前端的全局学习状态侧边栏通过 `/yolo-service` 代理访问本服务。

实现特征：

- 支持摄像头实时截图分析
- 支持本地图片上传分析
- 优先走 SSE 流式接口，失败时自动回退普通接口

## 兼容说明

- 请求体中保留了 `preferAdvancedModel` 字段，目的是与前端统一请求结构。
- 当前服务实际使用的是本地 YOLO 推理，不会因为该字段切换到外部视觉模型。

## 额外文件说明

- `AI-Sign.py` 为独立实验脚本，不参与主项目运行流程。
- `yolov8n.pt` 为本地权重文件，属于运行资源，不是前端/后端源码逻辑本身。

