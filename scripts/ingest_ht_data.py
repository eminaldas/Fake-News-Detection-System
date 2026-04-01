import asyncio
import pandas as pd
import os
import sys

# Add the root project directory to the sys paths to allow importing app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.models import Article
from ml_engine.processing.cleaner import NewsCleaner
from ml_engine.vectorizer import TurkishVectorizer

from app.db.session import AsyncSessionLocal

async def ingest_ht_dataset(csv_path: str):
    """
    Reads the Habertürk CSV, processes texts, generates embeddings, 
    and inserts records into the PostgreSQL database.
    Habertürk dataset columns: baslik, tarih
    Assumes all records are AUTHENTIC ("Doğru").
    """
    print(f"Loading Habertürk dataset from {csv_path}...")
    try:
        df = pd.read_csv(csv_path)
    except FileNotFoundError:
        print(f"Error: {csv_path} not found.")
        return

    cleaner = NewsCleaner()
    print("Loading vectorizer...")
    vectorizer = TurkishVectorizer()
    
    async with AsyncSessionLocal() as session:
        for index, row in df.iterrows():
            # For Habertürk data, 'baslik' acts like the claim ('iddia')
            raw_claim = str(row.get('baslik', ''))
            
            processed_data = cleaner.process(
                raw_iddia=raw_claim,
                detayli_analiz_raw=""
            )
            
            content = processed_data["cleaned_text"]
            raw_content = processed_data["original_text"]
            
            if content == "Bilgi mevcut değil" or not content.strip():
                continue
                
            # Habertürk Data is treated as Authentic/Doğru
            status = "Doğru"
            
            # Pack all relevant CSV columns into metadata JSONB
            metadata = {
                "link": "https://www.haberturk.com",
                "baslik": str(row.get('baslik', '')),
                "ozet": "",
                "tarih": str(row.get('tarih', '')),
                "hata_turu": "Yok (Güvenilir Kaynak)",
                "dayanak_noktalari": "Habertürk",
                "detayli_analiz": processed_data["cleaned_detayli_analiz"],
                "etiketler": "",
                "linguistic_signals": processed_data["signals"],
                "source": "Habertürk"
            }
            
            # Create embedding
            embedding = vectorizer.get_embedding(content)
            
            # Create DB Article
            title_text = str(row.get('baslik', content[:50]))
            title = title_text[:75] + "..." if len(title_text) > 75 else title_text
            
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
            if index > 0 and index % 50 == 0:
                print(f"Processed {index} rows...")
                await session.commit()
                
        # Final commit
        await session.commit()
        print(f"Successfully ingrained Habertürk dataset to the database. Total rows processed: {len(df)}")

if __name__ == "__main__":
    csv_file = "Data/veri/HT_dataset.csv" 
    if len(sys.argv) > 1:
        csv_file = sys.argv[1]
        
    asyncio.run(ingest_ht_dataset(csv_file))
