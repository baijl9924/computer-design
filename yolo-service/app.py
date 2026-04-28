import asyncio
import base64
import html
import io
import json
import os
import re
from collections import Counter
from typing import AsyncGenerator, List

import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from PIL import Image
from pydantic import BaseModel
from ultralytics import YOLO


class LearningStateRequest(BaseModel):
    imageBase64: str
    preferAdvancedModel: bool = True


class DetectionBox(BaseModel):
    label: str
    confidence: float
    x1: float
    y1: float
    x2: float
    y2: float


class LearningStateResponse(BaseModel):
    learningState: str
    confidence: float
    evidence: str
    detectedObjects: List[str]
    detections: List[DetectionBox]
    previewImage: str
    sourcePreview: str = ""
    analysisHtml: str = ""
    usedModel: str = ""


app = FastAPI(title="YOLO Learning State Service", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = os.getenv("YOLO_WEIGHTS", "yolov8n.pt")
LOCAL_MODEL_NAME = f"local:{MODEL_PATH}"
model = YOLO(MODEL_PATH)


def decode_image(data_uri: str) -> Image.Image:
    payload = data_uri.split(",", 1)[1] if "," in data_uri else data_uri
    image_bytes = base64.b64decode(payload)
    return Image.open(io.BytesIO(image_bytes)).convert("RGB")


def image_to_data_uri(image: Image.Image, quality: int = 88) -> str:
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=quality)
    encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/jpeg;base64,{encoded}"


def plotted_array_to_data_uri(plotted: np.ndarray) -> str:
    if plotted.ndim == 3 and plotted.shape[2] == 3:
        plotted = plotted[:, :, ::-1]
    image = Image.fromarray(plotted.astype("uint8"))
    return image_to_data_uri(image)


def build_evidence(
    counts: Counter,
    unique_objects: List[str],
    avg_conf: float,
) -> str:
    pieces: List[str] = []
    if counts.get("person", 0) > 0:
        pieces.append(f"检测到 {counts['person']} 个 person")
    else:
        pieces.append("画面中未稳定检测到 person")

    study_tools: List[str] = []
    if counts.get("book", 0) > 0:
        study_tools.append("book")
    if counts.get("laptop", 0) > 0:
        study_tools.append("laptop")
    if study_tools:
        pieces.append(f"学习工具包含 {', '.join(study_tools)}")

    if counts.get("cell phone", 0) > 0:
        pieces.append("检测到 cell phone，存在分心风险")

    if unique_objects:
        pieces.append(f"目标类别：{', '.join(unique_objects)}")

    pieces.append(f"平均置信度约 {round(avg_conf * 100)}%")
    return "；".join(pieces)


def infer_learning_state(
    class_names: List[str],
    confidences: List[float],
    detections: List[DetectionBox],
    preview_image: str,
    source_preview: str,
    used_model: str = LOCAL_MODEL_NAME,
) -> LearningStateResponse:
    counts = Counter(class_names)
    avg_conf = sum(confidences) / len(confidences) if confidences else 0.0
    unique_objects = sorted(set(class_names))
    evidence = build_evidence(counts, unique_objects, avg_conf)

    def build_response(state: str, confidence: float) -> LearningStateResponse:
        return LearningStateResponse(
            learningState=state,
            confidence=confidence,
            evidence=evidence,
            detectedObjects=unique_objects,
            detections=detections,
            previewImage=preview_image,
            sourcePreview=source_preview,
            usedModel=used_model,
        )

    if counts.get("person", 0) == 0:
        return build_response("离开学习区域", max(avg_conf, 0.55))

    if counts.get("cell phone", 0) > 0:
        return build_response("可能分心", max(avg_conf, 0.72))

    if counts.get("book", 0) > 0 or counts.get("laptop", 0) > 0:
        return build_response("专注学习中", max(avg_conf, 0.8))

    return build_response("在场但专注度一般", max(avg_conf, 0.62))


def build_suggestions(state: str, objects: List[str]) -> List[str]:
    objects_set = set(objects)
    suggestions: List[str] = []

    if "分心" in state:
        suggestions.append("先移开手机等高干扰物，再重新观察坐姿和视线。")
        suggestions.append("桌面只保留当前任务需要的学习材料。")
    elif "离开" in state:
        suggestions.append("尽量让镜头稳定覆盖座位和桌面，减少空位误判。")
        suggestions.append("如果用于自习监督，建议增加连续采样而不是只看单帧。")
    elif "专注" in state:
        suggestions.append("当前状态较稳定，可以继续保持书本或电脑与人体同时入镜。")
        suggestions.append("如需长期记录，建议按时间间隔采样，降低资源占用。")
    else:
        suggestions.append("画面中有人，但学习工具信号不强，可以补充书本或电脑入镜。")
        suggestions.append("可结合连续时间片段判断，而不是只看单张图片。")

    if "book" not in objects_set and "laptop" not in objects_set:
        suggestions.append("如果想让系统更稳定判断学习状态，可让书本或电脑更完整地出现在画面中。")

    return suggestions[:3]


def format_analysis_html(response: LearningStateResponse) -> str:
    bullet_objects = response.detectedObjects or ["未检测到明显目标"]
    suggestions = build_suggestions(response.learningState, bullet_objects)

    html_parts = [
        "<section><h4>状态速览</h4>",
        (
            f"<p>当前画面更接近 <strong>{html.escape(response.learningState)}</strong>。"
            f"置信度约为 <strong>{round(response.confidence * 100)}%</strong>。</p>"
        ),
        f"<p>{html.escape(response.evidence)}</p></section>",
        "<section><h4>观察依据</h4><ul>",
    ]

    for item in bullet_objects:
        html_parts.append(f"<li>检测到目标：{html.escape(item)}</li>")
    html_parts.append("</ul></section>")

    html_parts.append("<section><h4>本地模型说明</h4>")
    html_parts.append(
        f"<p>本次结果由本地权重 <strong>{html.escape(response.usedModel)}</strong> 直接生成，"
        "未调用任何外部大模型接口。</p></section>"
    )

    html_parts.append("<section><h4>调整建议</h4><ul>")
    for item in suggestions:
        html_parts.append(f"<li>{html.escape(item)}</li>")
    html_parts.append("</ul></section>")

    return "".join(html_parts)


def chunk_html_blocks(value: str) -> List[str]:
    parts = [item for item in re.split(r"(?<=</p>)|(?<=</(?:ul|li|h4)>)|(?<=</section>)", value) if item]
    return parts or [value]


def sse(event: str, data) -> str:
    payload = data if isinstance(data, str) else json.dumps(data, ensure_ascii=False)
    return f"event: {event}\ndata: {payload}\n\n"


def detect_from_image(image: Image.Image) -> tuple[List[str], List[float], List[DetectionBox], str]:
    results = model.predict(image, conf=0.25, verbose=False)
    class_names: List[str] = []
    confidences: List[float] = []
    detections: List[DetectionBox] = []
    preview_image = image_to_data_uri(image)

    for result in results:
        names = result.names
        if result.boxes is not None and len(result.boxes) > 0:
            preview_image = plotted_array_to_data_uri(result.plot())
        for box in result.boxes:
            class_id = int(box.cls.item())
            label = names[class_id]
            confidence = float(box.conf.item())
            x1, y1, x2, y2 = [float(value) for value in box.xyxy[0].tolist()]
            class_names.append(label)
            confidences.append(confidence)
            detections.append(
                DetectionBox(
                    label=label,
                    confidence=confidence,
                    x1=x1,
                    y1=y1,
                    x2=x2,
                    y2=y2,
                )
            )

    return class_names, confidences, detections, preview_image


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "weights": MODEL_PATH,
        "mode": "local-only",
        "remoteApiEnabled": False,
    }


@app.post("/api/learning-state", response_model=LearningStateResponse)
async def detect_learning_state(request: LearningStateRequest):
    image = decode_image(request.imageBase64)
    class_names, confidences, detections, preview_image = detect_from_image(image)
    response = infer_learning_state(
        class_names,
        confidences,
        detections,
        preview_image,
        request.imageBase64,
    )
    response.analysisHtml = format_analysis_html(response)
    return response


@app.post("/api/learning-state-stream")
async def detect_learning_state_stream(request: LearningStateRequest):
    async def event_stream() -> AsyncGenerator[str, None]:
        try:
            yield sse("status", "正在读取输入画面")
            image = decode_image(request.imageBase64)
            class_names, confidences, detections, preview_image = detect_from_image(image)

            yield sse("status", "已完成本地 YOLO 检测，正在整理状态标签")
            response = infer_learning_state(
                class_names,
                confidences,
                detections,
                preview_image,
                request.imageBase64,
            )
            yield sse("result", response.model_dump())

            yield sse("status", "正在生成本地分析说明")
            response.analysisHtml = format_analysis_html(response)

            for piece in chunk_html_blocks(response.analysisHtml):
                yield sse("chunk", piece)
                await asyncio.sleep(0.02)

            yield sse("final", response.model_dump())
        except Exception as exc:
            yield sse("error", str(exc))

    return StreamingResponse(event_stream(), media_type="text/event-stream")
