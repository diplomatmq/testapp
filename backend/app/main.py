from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.bot import start_bot
from app.config import get_settings
from app.database import AsyncSessionLocal, get_db
from app.models import InventoryItem, Player
from app.schemas import AppState, InventoryEntry, PlayerProfile

settings = get_settings()


@asynccontextmanager
async def lifecycle(app: FastAPI):
    if settings.bot_token:
        import asyncio
        loop = asyncio.get_running_loop()
        loop.create_task(start_bot())
    yield


app = FastAPI(title=settings.app_title, version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:5173", "http://127.0.0.1:5173", "https://test.monkeysdynasty.website"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/state", response_model=AppState)
async def get_state() -> AppState:
    sample_user = PlayerProfile(
        id=1,
        telegram_id=123456789,
        username="monkey",
        first_name="Monkey",
        balance=2500,
        rating=1280,
    )
    inventory = [
        InventoryEntry(id=1, player_id=1, item_name="Сапфирный кейс", quantity=3),
        InventoryEntry(id=2, player_id=1, item_name="Золотой нож", quantity=1),
        InventoryEntry(id=3, player_id=1, item_name="Кристаллическая руна", quantity=5),
    ]
    return AppState(
        active_tab="cases",
        user=sample_user,
        inventory=inventory,
        featured_cases=["Сапфирный кейс", "Лунный кейс", "Хромовый кейс"],
    )


@app.get("/api/player/{telegram_id}", response_model=PlayerProfile)
async def get_player(telegram_id: int, db: AsyncSession = Depends(get_db)) -> PlayerProfile:
    result = await db.execute(select(Player).where(Player.telegram_id == telegram_id))
    player = result.scalar_one_or_none()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return PlayerProfile(
        id=player.id,
        telegram_id=player.telegram_id,
        username=player.username,
        first_name=player.first_name,
        balance=player.balance,
        rating=player.rating,
    )


@app.post("/api/player")
async def create_player(payload: dict, db: AsyncSession = Depends(get_db)) -> dict:
    existing = await db.execute(select(Player).where(Player.telegram_id == payload["telegram_id"]))
    if existing.scalar_one_or_none():
        return {"status": "exists"}

    player = Player(
        telegram_id=payload["telegram_id"],
        username=payload.get("username"),
        first_name=payload.get("first_name"),
        balance=payload.get("balance", 0),
        rating=payload.get("rating", 0),
    )
    db.add(player)
    await db.commit()
    return {"status": "created"}
