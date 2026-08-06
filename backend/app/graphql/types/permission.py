from typing import TYPE_CHECKING

import strawberry

from app.models.enums import Permission

# Strawberry generates a GraphQL `enum` type straight from a Python enum -
# this keeps the wire-format enum in its own class (rather than reusing
# `Permission` from app.models directly) so the GraphQL schema and the
# database column can evolve independently, the same way you'd keep a
# Django TextChoices and its exposed API enum as separate concerns.
#
# The `if TYPE_CHECKING` split below only matters to your editor/type
# checker, not at runtime: `strawberry.enum(...)` returns the same
# `Permission` class it was given (just tagged with GraphQL metadata), but
# Strawberry's type stubs don't describe that precisely enough for Pyright
# to treat the result as a type - so anywhere this gets used as a type
# annotation (e.g. `permission: PermissionLevel`), Pyright reports
# "Variable not allowed in type expression". Telling Pyright, for type-
# checking purposes only, that `PermissionLevel` is just `Permission`
# sidesteps that without changing anything about what actually runs.
if TYPE_CHECKING:
    PermissionLevel = Permission
else:
    PermissionLevel = strawberry.enum(Permission, name="PermissionLevel")
