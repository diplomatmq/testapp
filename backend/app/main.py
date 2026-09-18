from contextlib import asynccontextmanager
import hashlib
import hmac
import json
import random
import time
from urllib.parse import parse_qsl

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.bot import start_bot
from app.config import get_settings
from app.database import get_db, init_db
from app.models import GiftAsset, InventoryItem, Player
from app.schemas import AppState, CaseInfo, CaseOpenResult, GiftDrop, InventoryEntry, PlayerProfile

settings = get_settings()


@asynccontextmanager
async def lifecycle(app: FastAPI):
    await init_db()
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


def verify_telegram_init_data(init_data: str) -> dict:
    if not settings.bot_token or not init_data:
        raise HTTPException(status_code=401, detail="Open the app from Telegram")

    values = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = values.pop("hash", None)
    if not received_hash:
        raise HTTPException(status_code=401, detail="Invalid Telegram data")

    data_check_string = "\n".join(f"{key}={values[key]}" for key in sorted(values))
    secret_key = hmac.new(b"WebAppData", settings.bot_token.encode(), hashlib.sha256).digest()
    expected_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected_hash, received_hash):
        raise HTTPException(status_code=401, detail="Invalid Telegram signature")

    auth_date = int(values.get("auth_date", "0"))
    if time.time() - auth_date > 86400:
        raise HTTPException(status_code=401, detail="Telegram session expired")

    try:
        return json.loads(values["user"])
    except (KeyError, json.JSONDecodeError) as error:
        raise HTTPException(status_code=401, detail="Telegram user is missing") from error


async def get_current_player(
    x_telegram_init_data: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> Player:
    telegram_user = verify_telegram_init_data(x_telegram_init_data or "")
    result = await db.execute(select(Player).where(Player.telegram_id == telegram_user["id"]))
    player = result.scalar_one_or_none()
    if player is None:
        player = Player(
            telegram_id=telegram_user["id"],
            username=telegram_user.get("username"),
            first_name=telegram_user.get("first_name"),
            last_name=telegram_user.get("last_name"),
            avatar_url=telegram_user.get("photo_url"),
            balance=0,
            rating=0,
        )
        db.add(player)
    else:
        player.username = telegram_user.get("username")
        player.first_name = telegram_user.get("first_name")
        player.last_name = telegram_user.get("last_name")
        player.avatar_url = telegram_user.get("photo_url")
    await db.commit()
    await db.refresh(player)
    return player


def player_profile(player: Player) -> PlayerProfile:
    return PlayerProfile(
        id=player.id,
        telegram_id=player.telegram_id,
        username=player.username,
        first_name=player.first_name,
        last_name=player.last_name,
        avatar_url=player.avatar_url,
        balance=player.balance,
        rating=player.rating,
    )


def gift_drop(gift: GiftAsset) -> GiftDrop:
    return GiftDrop(
        slug=gift.slug,
        name=gift.name,
        preview_url=gift.preview_url,
        animation_url=gift.animation_url,
    )


async def free_case(db: AsyncSession) -> CaseInfo:
    result = await db.execute(select(GiftAsset).order_by(GiftAsset.id))
    gifts = result.scalars().all()
    return CaseInfo(
        slug="freecase",
        name="Free Case",
        preview_url="/assets/freecase.webp",
        drops=[gift_drop(gift) for gift in gifts],
    )


@app.get("/api/state", response_model=AppState)
async def get_state(player: Player = Depends(get_current_player), db: AsyncSession = Depends(get_db)) -> AppState:
    result = await db.execute(select(InventoryItem).where(InventoryItem.player_id == player.id))
    inventory = [
        InventoryEntry(id=item.id, player_id=item.player_id, item_name=item.item_name, quantity=item.quantity)
        for item in result.scalars().all()
    ]
    return AppState(
        active_tab="cases",
        user=player_profile(player),
        inventory=inventory,
        featured_cases=["Сапфирный кейс", "Лунный кейс", "Хромовый кейс"],
        cases=[await free_case(db)],
    )


@app.post("/api/cases/freecase/open", response_model=CaseOpenResult)
async def open_free_case(
    player: Player = Depends(get_current_player),
    db: AsyncSession = Depends(get_db),
) -> CaseOpenResult:
    gifts_result = await db.execute(select(GiftAsset).order_by(GiftAsset.id))
    gifts = gifts_result.scalars().all()
    if not gifts:
        raise HTTPException(status_code=503, detail="Gift catalog is empty")

    outcome = random.choices(["nothing", "stars", "gift"], weights=[35, 35, 30], k=1)[0]
    if outcome == "nothing":
        return CaseOpenResult(kind="nothing", label="Ничего", user=player_profile(player))
    if outcome == "stars":
        amount = random.choice([10, 25, 50, 100])
        player.balance += amount
        await db.commit()
        await db.refresh(player)
        return CaseOpenResult(kind="stars", label=f"{amount} Telegram Stars", amount=amount, user=player_profile(player))

    gift = random.choice(gifts)
    inventory_result = await db.execute(
        select(InventoryItem).where(
            InventoryItem.player_id == player.id,
            InventoryItem.item_name == gift.name,
        )
    )
    inventory_item = inventory_result.scalar_one_or_none()
    if inventory_item is None:
        db.add(InventoryItem(player_id=player.id, item_name=gift.name, quantity=1))
    else:
        inventory_item.quantity += 1
    await db.commit()
    return CaseOpenResult(kind="gift", label=gift.name, gift=gift, user=player_profile(player))


@app.post("/api/test-deposit", response_model=PlayerProfile)
async def test_deposit(
    amount: int,
    player: Player = Depends(get_current_player),
    db: AsyncSession = Depends(get_db),
) -> PlayerProfile:
    if amount <= 0 or amount > 1_000_000:
        raise HTTPException(status_code=400, detail="Amount must be between 1 and 1000000")
    player.balance += amount
    await db.commit()
    await db.refresh(player)
    return player_profile(player)


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
        last_name=player.last_name,
        avatar_url=player.avatar_url,
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
        last_name=payload.get("last_name"),
        avatar_url=payload.get("avatar_url"),
        balance=payload.get("balance", 0),
        rating=payload.get("rating", 0),
    )
    db.add(player)
    await db.commit()
    return {"status": "created"}
