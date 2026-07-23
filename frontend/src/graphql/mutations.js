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
