import uuid
from sqlalchemy import Column, String, Text, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declarative_base, relationship
from pgvector.sqlalchemy import Vector

Base = declarative_base()

class Source(Base):
    __tablename__ = "sources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    url = Column(String(512), unique=True, nullable=False)
    credibility_score = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    articles = relationship("Article", back_populates="source")

class Article(Base):
    __tablename__ = "articles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(512), nullable=False)
    raw_content = Column(Text, nullable=True) # Eklendi: Orijinal iddia metni
    content = Column(Text, nullable=False)
    source_id = Column(UUID(as_uuid=True), ForeignKey("sources.id"), nullable=True)
    
    # NLP modellerinin genelde ürettiği embedding boyutu (örn: 768 veya 384)
    embedding = Column(Vector(768)) 
    
    # Haber/İddia ile ilgili ekstra bilgiler (örn: dayanak_noktalari)
    from sqlalchemy.dialects.postgresql import JSONB
    metadata_info = Column(JSONB, nullable=True)
    
    # Durum: (örn: dogru, yanlis, belirsiz) iddia veriseti için
    status = Column(String(50), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    source = relationship("Source", back_populates="articles")
    analysis_result = relationship("AnalysisResult", back_populates="article", uselist=False)

class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    article_id = Column(UUID(as_uuid=True), ForeignKey("articles.id"), nullable=False, unique=True)
    
    # Fake/True classification status or probability
    status = Column(String(50), nullable=False)
    confidence = Column(String(50), nullable=True) # or Float

    # JSONB format for linguistic flags/signals (exclamation_ratio, etc)
    signals = Column(Text, nullable=True) # Text or JSONB depending on exact pg mapping (Text for general compatibility, but JSON or JSONB preferred)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    article = relationship("Article", back_populates="analysis_result")
