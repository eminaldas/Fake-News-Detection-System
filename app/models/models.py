import uuid

from pgvector.sqlalchemy import Vector
from sqlalchemy import Column, DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class Source(Base):
    __tablename__ = "sources"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name             = Column(String(255), nullable=False)
    url              = Column(String(512), unique=True, nullable=False)
    credibility_score = Column(String(50), nullable=True)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())

    articles = relationship("Article", back_populates="source")


class Article(Base):
    __tablename__ = "articles"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title       = Column(String(512), nullable=False)
    raw_content = Column(Text, nullable=True)
    content     = Column(Text, nullable=False)
    source_id   = Column(UUID(as_uuid=True), ForeignKey("sources.id"), nullable=True)
    embedding   = Column(Vector(768))
    metadata_info = Column(JSONB, nullable=True)
    status      = Column(String(50), nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), onupdate=func.now())

    source          = relationship("Source", back_populates="articles")
    analysis_result = relationship("AnalysisResult", back_populates="article", uselist=False)


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    article_id = Column(UUID(as_uuid=True), ForeignKey("articles.id"), nullable=False, unique=True)
    status     = Column(String(50), nullable=False)
    confidence = Column(Float, nullable=True)          # String → Float
    signals    = Column(JSONB, nullable=True)           # Text  → JSONB
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    article = relationship("Article", back_populates="analysis_result")
