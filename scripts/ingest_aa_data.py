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

async def ingest_aa_dataset(csv_path: str):
    """
    Reads the Anadolu Ajansı (AA) CSV, processes texts, generates embeddings, 
    and inserts records into the PostgreSQL database.
    AA dataset columns: baslik, ozet, detayli_analiz, etiketler, tarih, link
    Assumes all records are AUTHENTIC ("Doğru").
    """
    print(f"Loading AA dataset from {csv_path}...")
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
            # For AA data, 'baslik' or 'ozet' acts like the claim ('iddia')
            # 'detayli_analiz' contains the actual news text.
            raw_claim = str(row.get('baslik', '')) + " " + str(row.get('ozet', ''))
            
            processed_data = cleaner.process(
                raw_iddia=raw_claim,
                detayli_analiz_raw=row.get('detayli_analiz')
            )
            
            content = processed_data["cleaned_text"]
            raw_content = processed_data["original_text"]
            
            if content == "Bilgi mevcut değil" or not content.strip():
                continue
                
            # AA Data is highly reliable, so everything is Authentic/Doğru
            status = "Doğru"
            
            # Pack all relevant CSV columns into metadata JSONB
            metadata = {
                "link": str(row.get('link', '')),
                "baslik": str(row.get('baslik', '')),
                "ozet": str(row.get('ozet', '')),
                "tarih": str(row.get('tarih', '')),
                "hata_turu": "Yok (Güvenilir Kaynak)",
                "dayanak_noktalari": "Anadolu Ajansı Teyidi",
                "detayli_analiz": processed_data["cleaned_detayli_analiz"],
                "etiketler": str(row.get('etiketler', '')),
                "linguistic_signals": processed_data["signals"],
                "source": "Anadolu Ajansı"
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
        print(f"Successfully ingrained AA dataset to the database. Total rows processed: {len(df)}")

if __name__ == "__main__":
    csv_file = "Data/veri/AA_dataset.csv" 
    if len(sys.argv) > 1:
        csv_file = sys.argv[1]
        
    asyncio.run(ingest_aa_dataset(csv_file))
