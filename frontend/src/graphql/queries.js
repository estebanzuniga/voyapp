import { gql } from '@apollo/client'

export const ME_QUERY = gql`
  query Me {
    me {
      id
      email
      firstName
      lastName
      avatarColor
    }
  }
`

export const AVATAR_COLOR_OPTIONS_QUERY = gql`
  query AvatarColorOptions {
    avatarColorOptions
  }
`

export const MY_TRIPS_QUERY = gql`
  query MyTrips {
    myTrips {
      id
      title
      startDate
      endDate
      isOwner
      myPermission
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
      isOwner
      myPermission
      days {
        id
        date
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

export const TRIP_SHARING_QUERY = gql`
  query TripSharing($id: ID!) {
    trip(id: $id) {
      id
      title
      isOwner
      shareLinks {
        id
        token
        permission
        createdAt
        expiresAt
      }
      collaborators {
        userId
        email
        permission
      }
    }
  }
`

export const SHARE_INVITE_PREVIEW_QUERY = gql`
  query ShareInvitePreview($token: String!) {
    shareInvitePreview(token: $token) {
      valid
      tripTitle
      permission
    }
  }
`
