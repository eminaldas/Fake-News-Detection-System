import asyncio
from sqlalchemy import text
from app.db.session import AsyncSessionLocal

async def create_vector_indexes():
    """
    Creates an IVFFlat index on the embedding column of the articles table 
    to speed up vector similarity searches.
    """
    print("Creating vector indexes...")
    async with AsyncSessionLocal() as session:
        # IVFFlat index using cosine distance (vector_cosine_ops)
        # Assuming 768 dimensions and choosing lists=100 as a starting point.
        # Ensure that pgvector extension is enabled and the table has enough data 
        # for the index to be effective. (Usually wait until there is some data).
        
        index_query = """
        CREATE INDEX IF NOT EXISTS article_embedding_idx 
        ON articles 
        USING hnsw (embedding vector_cosine_ops);
        """
        
        try:
            await session.execute(text(index_query))
            await session.commit()
            print("Successfully created HNSW index on articles.embedding.")
        except Exception as e:
            print(f"Failed to create index: {e}")
            await session.rollback()

if __name__ == "__main__":
    asyncio.run(create_vector_indexes())
