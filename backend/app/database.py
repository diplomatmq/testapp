import json
from urllib.request import urlopen

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import get_settings
from app.models import Base, GiftAsset

settings = get_settings()
engine = create_async_engine(settings.database_url, echo=False, pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session


async def init_db() -> None:
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
        await connection.execute(
            text("ALTER TABLE players ADD COLUMN IF NOT EXISTS last_name VARCHAR(255)")
        )
        await connection.execute(
            text("ALTER TABLE players ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(1024)")
        )
    async with AsyncSessionLocal() as session:
        gift_data = [
            ("plushpepe", "Plush Pepe"), ("durovscap", "Durov's Cap"),
            ("diamondring", "Diamond Ring"), ("heartlocket", "Heart Locket"),
            ("scaredcat", "Scared Cat"), ("preciouspeach", "Precious Peach"),
            ("artisanbrick", "Artisan Brick"), ("astralshard", "Astral Shard"),
            ("crystalball", "Crystal Ball"), ("bondedring", "Bonded Ring"),
            ("jollychimp", "Jolly Chimp"), ("hexpot", "Hex Pot"),
        ]
        try:
            with urlopen(
                "https://raw.githubusercontent.com/ssamy2/TelegramGiftsAssests/main/Gifts_Details.json",
                timeout=10,
            ) as response:
                catalog = json.load(response)
            catalog_items = catalog.get("upgraded", []) + catalog.get("unupgraded", [])
            catalog_by_slug = {}
            for item in catalog_items:
                slug = item["short_name"].replace("_", "").lower()
                catalog_by_slug[slug] = item["full_name"]
            gift_data = list(catalog_by_slug.items())
        except (OSError, KeyError, TypeError, json.JSONDecodeError):
            pass
        existing_result = await session.execute(text("SELECT slug FROM gift_assets"))
        existing_slugs = {row[0] for row in existing_result.all()}
        for slug, name in gift_data:
            if slug in existing_slugs:
                continue
            session.add(GiftAsset(
                slug=slug,
                name=name,
                preview_url=f"/assets/gifts/webp/{slug}-1.webp",
                animation_url=f"/assets/gifts/lottie/{slug}-1.lottie.json",
                drop_weight=1,
            ))
            existing_slugs.add(slug)
        await session.commit()
