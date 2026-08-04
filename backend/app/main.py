from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from strawberry.fastapi import GraphQLRouter

from app.config import settings
from app.graphql.context import get_context
from app.schema import schema

if settings.environment == "production" and settings.jwt_secret_key == "dev-secret-change-me":
    raise RuntimeError("Please change the JWT secret key in production!")

print(f"[startup] environment={settings.environment!r} cors_origins={settings.cors_origins!r}")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

graphql_app = GraphQLRouter(
    schema,
    context_getter=get_context,
    graphql_ide=None if settings.environment == "production" else "graphiql",
)
app.include_router(graphql_app, prefix="/graphql")
