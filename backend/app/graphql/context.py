from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from strawberry.fastapi import BaseContext

from app.auth.security import decode_access_token
from app.database import get_session
from app.models.user import User as UserModel


class Context(BaseContext):
    def __init__(self, session: AsyncSession, current_user: UserModel | None):
        super().__init__()
        self.session = session
        self.current_user = current_user


async def get_context(
    request: Request, session: AsyncSession = Depends(get_session)
) -> Context:
    current_user = await _get_current_user(request, session)
    return Context(session=session, current_user=current_user)


async def _get_current_user(request: Request, session: AsyncSession) -> UserModel | None:
    auth_header = request.headers.get("authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None

    token = auth_header.removeprefix("Bearer ")
    user_id = decode_access_token(token)
    if user_id is None:
        return None

    return await session.get(UserModel, user_id)
