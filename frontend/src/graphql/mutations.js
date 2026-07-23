import { gql } from '@apollo/client'

export const SIGNUP_MUTATION = gql`
  mutation Signup($email: String!, $password: String!) {
    signup(email: $email, password: $password) {
      token
      user {
        id
        email
      }
    }
  }
`

export const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        email
      }
    }
  }
`

export const CREATE_TRIP_MUTATION = gql`
  mutation CreateTrip($title: String!, $startDate: Date!, $endDate: Date!) {
    createTrip(title: $title, startDate: $startDate, endDate: $endDate) {
      id
      title
      startDate
      endDate
    }
  }
`

export const ADD_DAY_MUTATION = gql`
  mutation AddDay($tripId: ID!, $date: Date!) {
    addDay(tripId: $tripId, date: $date) {
      id
    }
  }
`

export const DELETE_DAY_MUTATION = gql`
  mutation DeleteDay($id: ID!) {
    deleteDay(id: $id)
  }
`

export const ADD_STOP_MUTATION = gql`
  mutation AddStop($dayId: ID!, $name: String!, $location: LocationInput!) {
    addStop(dayId: $dayId, name: $name, location: $location) {
      id
    }
  }
`

export const DELETE_STOP_MUTATION = gql`
  mutation DeleteStop($id: ID!) {
    deleteStop(id: $id)
  }
`

export const REORDER_STOPS_MUTATION = gql`
  mutation ReorderStops($dayId: ID!, $stopIds: [ID!]!) {
    reorderStops(dayId: $dayId, stopIds: $stopIds) {
      id
      orderIndex
    }
  }
`
