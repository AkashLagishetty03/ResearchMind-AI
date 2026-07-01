import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router as api_router
from app.database.db import engine, Base
from app.core.config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=f"{settings.APP_NAME} API",
    description="Multi-Agent Research & Decision Intelligence Platform API",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api")

# Database table creation on startup
@app.on_event("startup")
async def on_startup():
    logger.info("Initializing SQLite database tables...")
    try:
        async with engine.begin() as conn:
            from sqlalchemy import text
            await conn.execute(text("PRAGMA journal_mode=WAL;"))
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables initialized successfully. Seeding defaults...")
        
        from app.database.db import async_session
        from app.services.agent_config_service import seed_default_config_and_prompts
        async with async_session() as db:
            await seed_default_config_and_prompts(db)
        logger.info("Agent configurations and prompt templates seeded successfully.")
    except Exception as e:
        logger.error(f"Error initializing database: {e}", exc_info=True)

@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "service": "ResearchMind AI API",
        "version": "1.0.0"
    }
