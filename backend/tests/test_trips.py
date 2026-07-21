from app.schema import schema
from tests.conftest import make_context

CREATE_TRIP = """
mutation($title: String!, $start: Date!, $end: Date!) {
  createTrip(title: $title, startDate: $start, endDate: $end) { id title }
}
"""

TRIP_QUERY = """
query($id: ID!) {
  trip(id: $id) { id title }
}
"""


async def test_create_trip_requires_auth(context):
    result = await schema.execute(
        CREATE_TRIP,
        variable_values={"title": "Japan", "start": "2026-04-01", "end": "2026-04-10"},
        context_value=context,
    )

    assert result.errors is not None
    assert "Not authenticated" in result.errors[0].message


async def test_create_trip_and_fetch_via_my_trips(auth_context):
    create_result = await schema.execute(
        CREATE_TRIP,
        variable_values={"title": "Japan", "start": "2026-04-01", "end": "2026-04-10"},
        context_value=auth_context,
    )
    assert create_result.errors is None

    list_result = await schema.execute(
        "query { myTrips { title } }",
        context_value=auth_context,
    )
    assert list_result.errors is None
    assert [t["title"] for t in list_result.data["myTrips"]] == ["Japan"]


async def test_trip_query_returns_owned_trip(auth_context):
    create_result = await schema.execute(
        CREATE_TRIP,
        variable_values={"title": "Japan", "start": "2026-04-01", "end": "2026-04-10"},
        context_value=auth_context,
    )
    trip_id = create_result.data["createTrip"]["id"]

    result = await schema.execute(
        TRIP_QUERY, variable_values={"id": trip_id}, context_value=auth_context
    )

    assert result.errors is None
    assert result.data["trip"]["title"] == "Japan"


async def test_trip_query_hides_other_users_trip(session, auth_context, other_user):
    create_result = await schema.execute(
        CREATE_TRIP,
        variable_values={"title": "Japan", "start": "2026-04-01", "end": "2026-04-10"},
        context_value=auth_context,
    )
    trip_id = create_result.data["createTrip"]["id"]

    other_context = make_context(session, other_user)
    result = await schema.execute(
        TRIP_QUERY, variable_values={"id": trip_id}, context_value=other_context
    )

    assert result.errors is None
    assert result.data["trip"] is None


async def test_trip_query_nonexistent_id_returns_none(auth_context):
    result = await schema.execute(
        TRIP_QUERY, variable_values={"id": "999999"}, context_value=auth_context
    )

    assert result.errors is None
    assert result.data["trip"] is None
