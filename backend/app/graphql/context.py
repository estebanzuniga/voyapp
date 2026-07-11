from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from strawberry.fastapi import BaseContext

from app.database import get_session


class Context(BaseContext):
    def __init__(self, session: AsyncSession):
        super().__init__()
        self.session = session


async def get_context(session: AsyncSession = Depends(get_session)) -> Context:
    return Context(session=session)
