from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.types import Message

from app.config import get_settings

settings = get_settings()

bot = None
if settings.bot_token:
    bot = Bot(token=settings.bot_token, default=DefaultBotProperties(parse_mode=ParseMode.HTML))

dp = Dispatcher()


@dp.message()
async def echo(message: Message) -> None:
    await message.answer("Mini app is live. Use the app interface for gameplay.")


async def start_bot() -> None:
    if not bot:
        return
    await dp.start_polling(bot)
