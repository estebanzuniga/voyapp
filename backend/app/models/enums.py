import enum


class Permission(str, enum.Enum):
    """Access level granted by a share link or held by a collaborator.

    Subclassing `str` alongside `enum.Enum` (Python's "string enum" pattern)
    means each member also behaves like its own string value - e.g.
    `Permission.EDITOR == "EDITOR"` is True. That keeps it comfortable to
    store as plain text in Postgres and to compare against values coming
    back from the GraphQL layer, without needing custom (de)serialization.
    """

    VIEWER = "VIEWER"
    EDITOR = "EDITOR"
