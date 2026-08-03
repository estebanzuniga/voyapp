import strawberry
from strawberry.extensions import DisableIntrospection

from app.config import settings
from app.graphql.mutations import Mutation
from app.graphql.queries import Query

extensions = [DisableIntrospection()] if settings.environment == "production" else []

schema = strawberry.Schema(query=Query, mutation=Mutation, extensions=extensions)
