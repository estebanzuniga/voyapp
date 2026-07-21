from app.schema import schema
from tests.conftest import make_context

CREATE_TRIP = """
mutation($title: String!, $start: Date!, $end: Date!) {
  createTrip(title: $title, startDate: $start, endDate: $end) { id }
}
"""

ADD_DAY = """
mutation($tripId: ID!, $date: Date!) {
  addDay(tripId: $tripId, date: $date) { id orderIndex }
}
"""

DELETE_DAY = """
mutation($id: ID!) {
  deleteDay(id: $id)
}
"""


async def create_trip(context) -> str:
    result = await schema.execute(
        CREATE_TRIP,
        variable_values={"title": "Japan", "start": "2026-04-01", "end": "2026-04-10"},
        context_value=context,
    )
    assert result.errors is None
    return result.data["createTrip"]["id"]


async def test_add_day_requires_auth(context):
    result = await schema.execute(
        ADD_DAY, variable_values={"tripId": "1", "date": "2026-04-01"}, context_value=context
    )

    assert result.errors is not None
    assert "Not authenticated" in result.errors[0].message


async def test_add_day_rejects_other_users_trip(session, auth_context, other_user):
    trip_id = await create_trip(auth_context)

    other_context = make_context(session, other_user)
    result = await schema.execute(
        ADD_DAY,
        variable_values={"tripId": trip_id, "date": "2026-04-01"},
        context_value=other_context,
    )

    assert result.errors is not None
    assert "Trip not found" in result.errors[0].message


async def test_order_index_reuses_gap_after_delete(auth_context):
    trip_id = await create_trip(auth_context)

    day_ids = []
    order_indexes = []
    for day_date in ("2026-04-01", "2026-04-02", "2026-04-03", "2026-04-04"):
        result = await schema.execute(
            ADD_DAY,
            variable_values={"tripId": trip_id, "date": day_date},
            context_value=auth_context,
        )
        assert result.errors is None
        day_ids.append(result.data["addDay"]["id"])
        order_indexes.append(result.data["addDay"]["orderIndex"])

    assert order_indexes == [0, 1, 2, 3]

    # delete the middle day (order_index 1) and add a new one: it must take
    # index 4 (MAX + 1), not 1, so it never collides with an existing index.
    delete_result = await schema.execute(
        DELETE_DAY, variable_values={"id": day_ids[1]}, context_value=auth_context
    )
    assert delete_result.errors is None
    assert delete_result.data["deleteDay"] is True

    new_day_result = await schema.execute(
        ADD_DAY,
        variable_values={"tripId": trip_id, "date": "2026-04-05"},
        context_value=auth_context,
    )
    assert new_day_result.errors is None
    assert new_day_result.data["addDay"]["orderIndex"] == 4


async def test_delete_day_rejects_other_users_day(session, auth_context, other_user):
    trip_id = await create_trip(auth_context)
    add_result = await schema.execute(
        ADD_DAY, variable_values={"tripId": trip_id, "date": "2026-04-01"}, context_value=auth_context
    )
    day_id = add_result.data["addDay"]["id"]

    other_context = make_context(session, other_user)
    result = await schema.execute(
        DELETE_DAY, variable_values={"id": day_id}, context_value=other_context
    )

    assert result.errors is not None
    assert "Day not found" in result.errors[0].message
