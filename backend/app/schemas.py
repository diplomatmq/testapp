from pydantic import BaseModel, Field


class PlayerProfile(BaseModel):
    id: int
    telegram_id: int
    username: str | None = None
    first_name: str | None = None
    balance: int = 0
    rating: int = 0


class InventoryEntry(BaseModel):
    id: int
    player_id: int
    item_name: str
    quantity: int = 1


class AppState(BaseModel):
    active_tab: str = "cases"
    user: PlayerProfile | None = None
    inventory: list[InventoryEntry] = Field(default_factory=list)
    featured_cases: list[str] = Field(default_factory=list)
