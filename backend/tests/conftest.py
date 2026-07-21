import os

import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import app.models  # noqa: F401 - registers all models on Base.metadata
from app.auth.security import hash_password
from app.database import Base
from app.graphql.context import Context
from app.models.user import User as UserModel

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+asyncpg://localhost/voyapp_test"
)


@pytest_asyncio.fixture(scope="session")
async def db_engine():
    # Created inside the session-scoped event loop (see asyncio_default_*_loop_scope
    # in pyproject.toml) - asyncpg connections are pinned to the loop that opened
    # them, so building the engine at import time (outside any loop) would break
    # as soon as a second test tried to reuse its connection pool.
    engine = create_async_engine(TEST_DATABASE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def session(db_engine):
    session_factory = async_sessionmaker(db_engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
        for table in reversed(Base.metadata.sorted_tables):
            await session.execute(table.delete())
        await session.commit()


@pytest_asyncio.fixture
async def user(session: AsyncSession) -> UserModel:
    owner = UserModel(email="owner@example.com", password_hash=hash_password("password123"))
    session.add(owner)
    await session.commit()
    return owner


@pytest_asyncio.fixture
async def other_user(session: AsyncSession) -> UserModel:
    intruder = UserModel(email="intruder@example.com", password_hash=hash_password("password123"))
    session.add(intruder)
    await session.commit()
    return intruder


def make_context(session: AsyncSession, current_user: UserModel | None = None) -> Context:
    return Context(session=session, current_user=current_user)


@pytest_asyncio.fixture
async def context(session: AsyncSession) -> Context:
    return make_context(session)


@pytest_asyncio.fixture
async def auth_context(session: AsyncSession, user: UserModel) -> Context:
    return make_context(session, user)
