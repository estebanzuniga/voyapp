# voyapp

A web app for building trip itineraries — add days, add stops/activities per day, and reorder everything via drag-and-drop.

This is a learning project: the goal is to get hands-on with **FastAPI**, **Strawberry (GraphQL)**, and **Apollo Client**, using GraphQL end-to-end instead of REST + React Query.

## Stack

**Backend**
- Python 3.12+
- FastAPI (ASGI server)
- Strawberry (GraphQL schema/resolvers)
- SQLAlchemy 2.0 (async ORM)
- Alembic (migrations)
- asyncpg (Postgres driver)
- PyJWT + bcrypt (auth)
- pytest + pytest-asyncio (testing)

**Frontend** *(not started yet)*
- React + Vite
- Apollo Client
- @dnd-kit/core (drag-and-drop)
- React Router
- Tailwind CSS

**Database**
- PostgreSQL

## Getting started

### Prerequisites

- Python 3.12+
- PostgreSQL running locally

### Backend setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e .
```

Create a `.env` file in `backend/` (see `app/config.py` for all options):

```
DATABASE_URL=postgresql+asyncpg://localhost/voyapp
JWT_SECRET_KEY=change-me
```

Run migrations and start the server:

```bash
alembic upgrade head
uvicorn app.main:app --reload
```

### Running tests

Tests run against a real Postgres database, not mocks. Create a `voyapp_test` database once:

```bash
createdb voyapp_test
```

Then install the dev dependencies and run the suite:

```bash
pip install -e ".[dev]"
pytest
```