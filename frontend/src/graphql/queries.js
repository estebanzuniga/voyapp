import { gql } from '@apollo/client'

export const MY_TRIPS_QUERY = gql`
  query MyTrips {
    myTrips {
      id
      title
      startDate
      endDate
    }
  }
`

export const TRIP_QUERY = gql`
  query Trip($id: ID!) {
    trip(id: $id) {
      id
      title
      startDate
      endDate
      days {
        id
        date
        orderIndex
        stops {
          id
          name
          notes
          startTime
          orderIndex
          location {
            lat
            lng
          }
        }
      }
    }
  }
`
