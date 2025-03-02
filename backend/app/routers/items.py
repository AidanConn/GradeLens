# backend/app/routers/items.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(
    prefix="/items",
    tags=["items"],
    responses={404: {"description": "Not found"}},
)

# Example Pydantic model
class Item(BaseModel):
    id: Optional[int] = None
    name: str
    description: Optional[str] = None
    price: float
    tax: Optional[float] = None

# In-memory store for demo
items = {}

@router.post("/", response_model=Item)
async def create_item(item: Item):
    item_id = len(items) + 1
    item.id = item_id
    items[item_id] = item
    return item

@router.get("/{item_id}", response_model=Item)
async def read_item(item_id: int):
    if item_id not in items:
        raise HTTPException(status_code=404, detail="Item not found")
    return items[item_id]

@router.get("/", response_model=List[Item])
async def read_items():
    return list(items.values())