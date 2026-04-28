from __future__ import annotations

import base64
import binascii
import hashlib
import hmac
import json
import os
import re
from datetime import datetime, timedelta, timezone
from typing import Generator

import jwt
from fastapi import Depends, FastAPI, HTTPException, Query, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, create_engine, func, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, sessionmaker


APP_TITLE = "Geometry Lab Account Service"
DEFAULT_DATABASE_URL = "sqlite:///./account_service.db"
DATABASE_URL = os.getenv("ACCOUNT_DATABASE_URL") or os.getenv("DATABASE_URL") or DEFAULT_DATABASE_URL
JWT_SECRET = os.getenv("ACCOUNT_JWT_SECRET", "geometry-lab-dev-secret-change-me")
JWT_ALGORITHM = os.getenv("ACCOUNT_JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("ACCOUNT_JWT_EXPIRE_MINUTES", "10080"))
PBKDF2_ITERATIONS = int(os.getenv("ACCOUNT_PASSWORD_ITERATIONS", "390000"))
MAX_PAGE_SIZE = int(os.getenv("ACCOUNT_MAX_PAGE_SIZE", "50"))
CORS_ORIGINS = [item.strip() for item in os.getenv("ACCOUNT_CORS_ORIGINS", "*").split(",") if item.strip()]
USERNAME_PATTERN = re.compile(r"^[a-zA-Z0-9_.-]{3,32}$")
FUNCTION_PLANET_TOPIC_ORDER = ("profile", "geometry", "properties", "exam", "composite")


class Base(DeclarativeBase):
    pass


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(32))
    student_no: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    error_records: Mapped[list["ErrorRecord"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="desc(ErrorRecord.created_at)",
    )
    function_planets: Mapped[list["FunctionPlanet"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="desc(FunctionPlanet.updated_at)",
    )


class ErrorRecord(Base):
    __tablename__ = "error_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    expression: Mapped[str] = mapped_column(String(255), index=True)
    summary: Mapped[str] = mapped_column(String(240))
    analysis_html: Mapped[str] = mapped_column(Text)
    standard_image: Mapped[str | None] = mapped_column(Text, nullable=True)
    user_image: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_mode: Mapped[str] = mapped_column(String(24), default="standard")
    student_note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    user: Mapped[User] = relationship(back_populates="error_records")


class FunctionPlanet(Base):
    __tablename__ = "function_planets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(80))
    expression: Mapped[str] = mapped_column(String(255), index=True)
    summary: Mapped[str] = mapped_column(String(500))
    cards_json: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    user: Mapped[User] = relationship(back_populates="function_planets")


engine_kwargs = {"pool_pre_ping": True}
if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    display_name: str
    student_no: str | None = None
    created_at: datetime
    last_login_at: datetime | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=32)
    password: str = Field(min_length=6, max_length=128)
    display_name: str = Field(min_length=1, max_length=32)
    student_no: str | None = Field(default=None, max_length=32)

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not USERNAME_PATTERN.fullmatch(normalized):
            raise ValueError("账号只能由 3-32 位字母、数字、下划线、点或中划线组成")
        return normalized

    @field_validator("display_name")
    @classmethod
    def validate_display_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("姓名不能为空")
        return normalized

    @field_validator("student_no")
    @classmethod
    def normalize_student_no(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class LoginRequest(BaseModel):
    username: str = Field(min_length=3, max_length=32)
    password: str = Field(min_length=6, max_length=128)

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        return value.strip().lower()


class ErrorRecordCreate(BaseModel):
    expression: str = Field(min_length=1, max_length=255)
    analysis_html: str = Field(min_length=1)
    standard_image: str | None = None
    user_image: str | None = None
    ai_mode: str = Field(default="standard", max_length=24)
    summary: str | None = Field(default=None, max_length=240)
    student_note: str | None = Field(default=None, max_length=255)

    @field_validator("expression")
    @classmethod
    def normalize_expression(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("函数表达式不能为空")
        return normalized

    @field_validator("analysis_html")
    @classmethod
    def normalize_analysis_html(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("分析结果不能为空")
        return normalized

    @field_validator("ai_mode")
    @classmethod
    def normalize_ai_mode(cls, value: str) -> str:
        normalized = value.strip().lower() or "standard"
        return normalized[:24]

    @field_validator("summary")
    @classmethod
    def normalize_summary(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @field_validator("student_note")
    @classmethod
    def normalize_student_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class ErrorRecordSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    expression: str
    summary: str
    ai_mode: str
    student_note: str | None = None
    created_at: datetime
    updated_at: datetime


class ErrorRecordDetail(ErrorRecordSummary):
    analysis_html: str
    standard_image: str | None = None
    user_image: str | None = None


class ErrorRecordListResponse(BaseModel):
    total: int
    items: list[ErrorRecordSummary]


class FunctionPlanetCardInput(BaseModel):
    description: str = Field(default="", max_length=600)
    items: list[str] = Field(default_factory=list, max_length=12)

    @field_validator("description")
    @classmethod
    def normalize_description(cls, value: str) -> str:
        return value.strip()

    @field_validator("items")
    @classmethod
    def normalize_items(cls, value: list[str]) -> list[str]:
        normalized = [str(item).strip() for item in value if str(item).strip()]
        if not normalized:
            raise ValueError("每类知识卡至少填写一条内容")
        return normalized[:12]


class FunctionPlanetPayload(BaseModel):
    title: str = Field(min_length=1, max_length=80)
    expression: str = Field(min_length=1, max_length=255)
    summary: str = Field(min_length=1, max_length=500)
    cards: dict[str, FunctionPlanetCardInput]

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("星球标题不能为空")
        return normalized

    @field_validator("expression")
    @classmethod
    def normalize_expression(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("函数表达式不能为空")
        return normalized

    @field_validator("summary")
    @classmethod
    def normalize_summary(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("函数简介不能为空")
        return normalized

    @field_validator("cards")
    @classmethod
    def validate_cards(cls, value: dict[str, FunctionPlanetCardInput]) -> dict[str, FunctionPlanetCardInput]:
        normalized = {}
        for topic_key in FUNCTION_PLANET_TOPIC_ORDER:
            card = value.get(topic_key)
            if card is None:
                raise ValueError(f"缺少知识卡：{topic_key}")
            normalized[topic_key] = card
        return normalized


class FunctionPlanetRecord(BaseModel):
    id: int
    title: str
    expression: str
    summary: str
    cards: dict[str, FunctionPlanetCardInput]
    created_at: datetime
    updated_at: datetime


app = FastAPI(title=APP_TITLE, version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS or ["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

bearer_scheme = HTTPBearer(auto_error=False)


@app.on_event("startup")
def create_tables() -> None:
    if DATABASE_URL.startswith("sqlite:///"):
        sqlite_path = DATABASE_URL.removeprefix("sqlite:///")
        directory = os.path.dirname(sqlite_path)
        if directory:
            os.makedirs(directory, exist_ok=True)
    Base.metadata.create_all(bind=engine)


_TAG_RE = re.compile(r"<[^>]+>")
_SPACE_RE = re.compile(r"\s+")


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def mask_database_url(url: str) -> str:
    if "@" not in url or "://" not in url:
        return url
    scheme, rest = url.split("://", 1)
    auth, suffix = rest.split("@", 1)
    if ":" not in auth:
        return f"{scheme}://***@{suffix}"
    username = auth.split(":", 1)[0]
    return f"{scheme}://{username}:***@{suffix}"


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS)
    return "$".join(
        [
            "pbkdf2_sha256",
            str(PBKDF2_ITERATIONS),
            base64.b64encode(salt).decode("utf-8"),
            base64.b64encode(derived).decode("utf-8"),
        ]
    )


def verify_password(password: str, password_hash: str) -> bool:
    try:
        _, iterations, salt_b64, expected_b64 = password_hash.split("$", 3)
        iterations_int = int(iterations)
        salt = base64.b64decode(salt_b64.encode("utf-8"))
        expected = base64.b64decode(expected_b64.encode("utf-8"))
    except (ValueError, binascii.Error):
        return False

    actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations_int)
    return hmac.compare_digest(actual, expected)


def create_access_token(user: User) -> str:
    expires_at = utcnow() + timedelta(minutes=JWT_EXPIRE_MINUTES)
    payload = {
        "sub": str(user.id),
        "username": user.username,
        "exp": expires_at,
        "iat": utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="请先登录账号")

    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = int(payload.get("sub", "0"))
    except Exception as exc:  # pragma: no cover - authentication failures are runtime cases
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="登录状态已失效，请重新登录") from exc

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="账号不存在，请重新登录")
    return user


def strip_html(raw: str | None) -> str:
    text = str(raw or "")
    text = text.replace("&nbsp;", " ")
    text = _TAG_RE.sub(" ", text)
    text = _SPACE_RE.sub(" ", text)
    return text.strip()


def build_summary(summary: str | None, analysis_html: str) -> str:
    if summary:
        return summary[:240]

    plain = strip_html(analysis_html)
    if not plain:
        return "已保存一条 AI 错题分析记录"
    return plain[:120] + ("..." if len(plain) > 120 else "")


def serialize_record_summary(record: ErrorRecord) -> ErrorRecordSummary:
    return ErrorRecordSummary.model_validate(record)


def serialize_record_detail(record: ErrorRecord) -> ErrorRecordDetail:
    return ErrorRecordDetail.model_validate(record)


def normalize_function_planet_cards(
    cards: dict[str, FunctionPlanetCardInput] | dict[str, dict] | None,
) -> dict[str, dict[str, str | list[str]]]:
    normalized: dict[str, dict[str, str | list[str]]] = {}
    source = cards or {}
    for topic_key in FUNCTION_PLANET_TOPIC_ORDER:
        raw_card = source.get(topic_key) if isinstance(source, dict) else None
        if isinstance(raw_card, FunctionPlanetCardInput):
            description = raw_card.description
            items = raw_card.items
        elif isinstance(raw_card, dict):
            description = str(raw_card.get("description") or "").strip()
            items = [str(item).strip() for item in raw_card.get("items") or [] if str(item).strip()]
        else:
            description = ""
            items = []
        normalized[topic_key] = {
            "description": description,
            "items": items,
        }
    return normalized


def serialize_function_planet(record: FunctionPlanet) -> FunctionPlanetRecord:
    try:
        cards = json.loads(record.cards_json or "{}")
    except json.JSONDecodeError:
        cards = {}
    return FunctionPlanetRecord(
        id=record.id,
        title=record.title,
        expression=record.expression,
        summary=record.summary,
        cards=normalize_function_planet_cards(cards),
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "service": APP_TITLE,
        "database": mask_database_url(DATABASE_URL),
        "default_database": DEFAULT_DATABASE_URL,
    }


@app.post("/api/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> TokenResponse:
    existing = db.execute(select(User).where(User.username == payload.username)).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="该账号已存在，请更换用户名")

    user = User(
        username=payload.username,
        display_name=payload.display_name,
        student_no=payload.student_no,
        password_hash=hash_password(payload.password),
        last_login_at=utcnow(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return TokenResponse(access_token=create_access_token(user), user=UserPublic.model_validate(user))


@app.post("/api/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.execute(select(User).where(User.username == payload.username)).scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="账号或密码错误")

    user.last_login_at = utcnow()
    db.add(user)
    db.commit()
    db.refresh(user)

    return TokenResponse(access_token=create_access_token(user), user=UserPublic.model_validate(user))


@app.get("/api/auth/me", response_model=UserPublic)
def me(current_user: User = Depends(get_current_user)) -> UserPublic:
    return UserPublic.model_validate(current_user)


@app.get("/api/error-book/records", response_model=ErrorRecordListResponse)
def list_error_records(
    limit: int = Query(default=20, ge=1, le=MAX_PAGE_SIZE),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ErrorRecordListResponse:
    total = db.scalar(select(func.count(ErrorRecord.id)).where(ErrorRecord.user_id == current_user.id)) or 0
    rows = db.execute(
        select(ErrorRecord)
        .where(ErrorRecord.user_id == current_user.id)
        .order_by(ErrorRecord.created_at.desc(), ErrorRecord.id.desc())
        .offset(offset)
        .limit(limit)
    ).scalars().all()
    return ErrorRecordListResponse(total=total, items=[serialize_record_summary(row) for row in rows])


@app.post("/api/error-book/records", response_model=ErrorRecordSummary, status_code=status.HTTP_201_CREATED)
def create_error_record(
    payload: ErrorRecordCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ErrorRecordSummary:
    record = ErrorRecord(
        user_id=current_user.id,
        expression=payload.expression,
        summary=build_summary(payload.summary, payload.analysis_html),
        analysis_html=payload.analysis_html,
        standard_image=payload.standard_image,
        user_image=payload.user_image,
        ai_mode=payload.ai_mode,
        student_note=payload.student_note,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return serialize_record_summary(record)


@app.get("/api/error-book/records/{record_id}", response_model=ErrorRecordDetail)
def get_error_record(
    record_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ErrorRecordDetail:
    record = db.execute(
        select(ErrorRecord).where(ErrorRecord.id == record_id, ErrorRecord.user_id == current_user.id)
    ).scalar_one_or_none()
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="错题记录不存在")
    return serialize_record_detail(record)


@app.delete("/api/error-book/records/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_error_record(
    record_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    record = db.execute(
        select(ErrorRecord).where(ErrorRecord.id == record_id, ErrorRecord.user_id == current_user.id)
    ).scalar_one_or_none()
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="错题记录不存在")
    db.delete(record)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.get("/api/function-planets", response_model=list[FunctionPlanetRecord])
def list_function_planets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[FunctionPlanetRecord]:
    rows = db.execute(
        select(FunctionPlanet)
        .where(FunctionPlanet.user_id == current_user.id)
        .order_by(FunctionPlanet.updated_at.desc(), FunctionPlanet.id.desc())
    ).scalars().all()
    return [serialize_function_planet(row) for row in rows]


@app.post("/api/function-planets", response_model=FunctionPlanetRecord, status_code=status.HTTP_201_CREATED)
def create_function_planet(
    payload: FunctionPlanetPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FunctionPlanetRecord:
    record = FunctionPlanet(
        user_id=current_user.id,
        title=payload.title,
        expression=payload.expression,
        summary=payload.summary,
        cards_json=json.dumps(normalize_function_planet_cards(payload.cards), ensure_ascii=False),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return serialize_function_planet(record)


@app.put("/api/function-planets/{planet_id}", response_model=FunctionPlanetRecord)
def update_function_planet(
    planet_id: int,
    payload: FunctionPlanetPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FunctionPlanetRecord:
    record = db.execute(
        select(FunctionPlanet).where(FunctionPlanet.id == planet_id, FunctionPlanet.user_id == current_user.id)
    ).scalar_one_or_none()
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="私有星球不存在")

    record.title = payload.title
    record.expression = payload.expression
    record.summary = payload.summary
    record.cards_json = json.dumps(normalize_function_planet_cards(payload.cards), ensure_ascii=False)
    db.add(record)
    db.commit()
    db.refresh(record)
    return serialize_function_planet(record)


@app.delete("/api/function-planets/{planet_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_function_planet(
    planet_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    record = db.execute(
        select(FunctionPlanet).where(FunctionPlanet.id == planet_id, FunctionPlanet.user_id == current_user.id)
    ).scalar_one_or_none()
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="私有星球不存在")
    db.delete(record)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
