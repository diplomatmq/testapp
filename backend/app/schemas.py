from pydantic import BaseModel, Field


class PlayerProfile(BaseModel):
    id: int
    telegram_id: int
    username: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    avatar_url: str | None = None
    balance: int = 0
    rating: int = 0


class InventoryEntry(BaseModel):
    id: int
    player_id: int
    item_name: str
    quantity: int = 1


class GiftDrop(BaseModel):
    slug: str
    name: str
    preview_url: str
    animation_url: str


class CaseInfo(BaseModel):
    slug: str
    name: str
    preview_url: str
    price: int = 0
    drops: list[GiftDrop] = Field(default_factory=list)


class CaseOpenResult(BaseModel):
    kind: str
    label: str
    amount: int = 0
    gift: GiftDrop | None = None
    user: PlayerProfile


class AppState(BaseModel):
    active_tab: str = "cases"
    user: PlayerProfile | None = None
    inventory: list[InventoryEntry] = Field(default_factory=list)
    featured_cases: list[str] = Field(default_factory=list)
    cases: list[CaseInfo] = Field(default_factory=list)
