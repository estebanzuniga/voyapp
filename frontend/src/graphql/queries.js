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
