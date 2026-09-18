from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.types import Message
from sqlalchemy import select

from app.config import get_settings
from app.database import AsyncSessionLocal
from app.models import Player

settings = get_settings()

bot = None
if settings.bot_token:
    bot = Bot(token=settings.bot_token, default=DefaultBotProperties(parse_mode=ParseMode.HTML))

dp = Dispatcher()


@dp.message()
async def echo(message: Message) -> None:
    if message.from_user:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(Player).where(Player.telegram_id == message.from_user.id)
            )
            player = result.scalar_one_or_none()
            if player is None:
                session.add(
                    Player(
                        telegram_id=message.from_user.id,
                        username=message.from_user.username,
                        first_name=message.from_user.first_name,
                        last_name=message.from_user.last_name,
                        balance=0,
                        rating=0,
                    )
                )
            else:
                player.username = message.from_user.username
                player.first_name = message.from_user.first_name
                player.last_name = message.from_user.last_name
            await session.commit()
    await message.answer("Mini app is live. Use the app interface for gameplay.")


async def start_bot() -> None:
    if not bot:
        return
    await dp.start_polling(bot)
