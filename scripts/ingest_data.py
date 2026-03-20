import asyncio
import pandas as pd
import json
import os
import sys

# Add the root project directory to the sys paths to allow importing app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.models import Article
from ml_engine.processing.cleaner import NewsCleaner
from ml_engine.vectorizer import TurkishVectorizer

from app.db.session import AsyncSessionLocal
from app.core.config import settings

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:password@localhost:5432/fnds")

async def ingest_dataset(csv_path: str):
    """
    Reads the CSV, processes texts, generates embeddings, 
    and inserts records into the PostgreSQL database.
    """
    print(f"Loading dataset from {csv_path}...")
    try:
        df = pd.read_csv(csv_path)
    except FileNotFoundError:
        print(f"Error: {csv_path} not found.")
        return

    cleaner = NewsCleaner()
    print("Loading vectorizer (this may take a minute if downloading the model)...")
    vectorizer = TurkishVectorizer()
    
    # Optional: Batch processing can be implemented here, but for simplicity we iterate
    async with AsyncSessionLocal() as session:
        for index, row in df.iterrows():
            # Apply cleaning
            processed_data = cleaner.process(
                raw_iddia=row.get('iddia'),
                detayli_analiz_raw=row.get('detayli_analiz')
            )
            
            content = processed_data["cleaned_text"]
            raw_content = processed_data["original_text"]
            
            if content == "Bilgi mevcut değil" or not content:
                continue
                
            status = str(row.get('dogruluk_etiketi', 'Unknown'))
            
            # Pack all relevant CSV columns into metadata JSONB
            metadata = {
                "link": str(row.get('link', '')),
                "baslik": str(row.get('baslik', '')),
                "ozet": str(row.get('ozet', '')),
                "tarih": str(row.get('tarih', '')),
                "hata_turu": str(row.get('hata_turu', '')),
                "dayanak_noktalari": str(row.get('dayanak_noktalari', '')),
                "detayli_analiz": processed_data["cleaned_detayli_analiz"],
                "etiketler": str(row.get('etiketler', '')),
                "linguistic_signals": processed_data["signals"]
            }
            
            # Create embedding from the cleaned text (with no stemming but stripped of URLs)
            embedding = vectorizer.get_embedding(content)
            
            # Create DB Article
            # Create a title from the first 50 chars of the content
            title = content[:50] + "..." if len(content) > 50 else content
            
            article = Article(
                title=title,
                raw_content=raw_content,
                content=content,
                embedding=embedding,
                status=status,
                metadata_info=metadata
            )
            
            session.add(article)
            
            # Commit occasionally or at the end
            if index % 50 == 0:
                print(f"Processed {index} rows...")
                await session.commit()
                
        # Final commit
        await session.commit()
        print(f"Successfully ingrained dataset to the database. Total rows: {len(df)}")

if __name__ == "__main__":
    # Ensure CSV is supplied or use default
    csv_file = "Data/sonveri/teyit_dataset.csv" 
    if len(sys.argv) > 1:
        csv_file = sys.argv[1]
        
    asyncio.run(ingest_dataset(csv_file))
