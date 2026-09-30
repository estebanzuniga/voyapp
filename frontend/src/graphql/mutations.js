import { gql } from '@apollo/client'

export const SIGNUP_MUTATION = gql`
  mutation Signup($email: String!, $password: String!, $firstName: String!, $lastName: String!) {
    signup(email: $email, password: $password, firstName: $firstName, lastName: $lastName) {
      token
      user {
        id
        email
        firstName
        lastName
        avatarColor
        language
        directionsUseCurrentLocation
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
        firstName
        lastName
        avatarColor
        language
        directionsUseCurrentLocation
      }
    }
  }
`

export const REQUEST_PASSWORD_RESET_MUTATION = gql`
  mutation RequestPasswordReset($email: String!) {
    requestPasswordReset(email: $email)
  }
`

export const RESET_PASSWORD_MUTATION = gql`
  mutation ResetPassword($token: String!, $newPassword: String!) {
    resetPassword(token: $token, newPassword: $newPassword)
  }
`

export const UPDATE_NAME_MUTATION = gql`
  mutation UpdateName($firstName: String!, $lastName: String!) {
    updateName(firstName: $firstName, lastName: $lastName) {
      id
      firstName
      lastName
    }
  }
`

export const CHANGE_PASSWORD_MUTATION = gql`
  mutation ChangePassword($currentPassword: String!, $newPassword: String!) {
    changePassword(currentPassword: $currentPassword, newPassword: $newPassword)
  }
`

export const UPDATE_AVATAR_COLOR_MUTATION = gql`
  mutation UpdateAvatarColor($avatarColor: String!) {
    updateAvatarColor(avatarColor: $avatarColor) {
      id
      avatarColor
    }
  }
`

export const UPDATE_LANGUAGE_MUTATION = gql`
  mutation UpdateLanguage($language: String!) {
    updateLanguage(language: $language) {
      id
      language
    }
  }
`

export const UPDATE_DIRECTIONS_USE_CURRENT_LOCATION_MUTATION = gql`
  mutation UpdateDirectionsUseCurrentLocation($useCurrentLocation: Boolean!) {
    updateDirectionsUseCurrentLocation(useCurrentLocation: $useCurrentLocation) {
      id
      directionsUseCurrentLocation
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

export const UPDATE_TRIP_MUTATION = gql`
  mutation UpdateTrip($id: ID!, $title: String!, $startDate: Date!, $endDate: Date!) {
    updateTrip(id: $id, title: $title, startDate: $startDate, endDate: $endDate) {
      id
      title
      startDate
      endDate
    }
  }
`

export const DELETE_TRIP_MUTATION = gql`
  mutation DeleteTrip($id: ID!) {
    deleteTrip(id: $id)
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

export const CREATE_CITY_MUTATION = gql`
  mutation CreateCity($tripId: ID!, $name: String!) {
    createCity(tripId: $tripId, name: $name) {
      id
      name
    }
  }
`

export const RENAME_CITY_MUTATION = gql`
  mutation RenameCity($id: ID!, $name: String!) {
    renameCity(id: $id, name: $name) {
      id
      name
    }
  }
`

export const DELETE_CITY_MUTATION = gql`
  mutation DeleteCity($id: ID!) {
    deleteCity(id: $id)
  }
`

export const SET_DAY_CITY_MUTATION = gql`
  mutation SetDayCity($dayId: ID!, $cityId: ID) {
    setDayCity(dayId: $dayId, cityId: $cityId) {
      id
      cityId
    }
  }
`

export const CREATE_STOP_CATEGORY_MUTATION = gql`
  mutation CreateStopCategory($tripId: ID!, $name: String!, $emoji: String!) {
    createStopCategory(tripId: $tripId, name: $name, emoji: $emoji) {
      id
      name
      emoji
    }
  }
`

export const UPDATE_STOP_CATEGORY_MUTATION = gql`
  mutation UpdateStopCategory($id: ID!, $name: String!, $emoji: String!) {
    updateStopCategory(id: $id, name: $name, emoji: $emoji) {
      id
      name
      emoji
    }
  }
`

export const DELETE_STOP_CATEGORY_MUTATION = gql`
  mutation DeleteStopCategory($id: ID!) {
    deleteStopCategory(id: $id)
  }
`

export const ADD_STOP_MUTATION = gql`
  mutation AddStop(
    $dayId: ID
    $cityId: ID
    $categoryId: ID
    $name: String!
    $location: LocationInput!
    $notes: String
    $startTime: Time
    $isImportant: Boolean!
    $isOptional: Boolean!
  ) {
    addStop(
      dayId: $dayId
      cityId: $cityId
      categoryId: $categoryId
      name: $name
      location: $location
      notes: $notes
      startTime: $startTime
      isImportant: $isImportant
      isOptional: $isOptional
    ) {
      id
      categoryId
    }
  }
`

export const UPDATE_STOP_MUTATION = gql`
  mutation UpdateStop(
    $id: ID!
    $name: String!
    $location: LocationInput!
    $categoryId: ID
    $notes: String
    $startTime: Time
    $isImportant: Boolean!
    $isOptional: Boolean!
  ) {
    updateStop(
      id: $id
      name: $name
      location: $location
      categoryId: $categoryId
      notes: $notes
      startTime: $startTime
      isImportant: $isImportant
      isOptional: $isOptional
    ) {
      id
      name
      notes
      startTime
      isImportant
      isOptional
      categoryId
      location {
        lat
        lng
      }
    }
  }
`

export const DUPLICATE_STOP_MUTATION = gql`
  mutation DuplicateStop($id: ID!) {
    duplicateStop(id: $id) {
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
  mutation ReorderStops($dayId: ID, $cityId: ID, $stopIds: [ID!]!) {
    reorderStops(dayId: $dayId, cityId: $cityId, stopIds: $stopIds) {
      id
    }
  }
`

export const MOVE_STOP_MUTATION = gql`
  mutation MoveStop($stopId: ID!, $toIndex: Int!, $toDayId: ID, $toCityId: ID) {
    moveStop(stopId: $stopId, toIndex: $toIndex, toDayId: $toDayId, toCityId: $toCityId) {
      id
    }
  }
`

export const CREATE_SHARE_LINK_MUTATION = gql`
  mutation CreateShareLink($tripId: ID!, $permission: PermissionLevel!) {
    createShareLink(tripId: $tripId, permission: $permission) {
      id
      token
      permission
      createdAt
      expiresAt
    }
  }
`

export const REVOKE_SHARE_LINK_MUTATION = gql`
  mutation RevokeShareLink($tripId: ID!, $linkId: ID!) {
    revokeShareLink(tripId: $tripId, linkId: $linkId)
  }
`

export const ACCEPT_SHARE_INVITE_MUTATION = gql`
  mutation AcceptShareInvite($token: String!) {
    acceptShareInvite(token: $token) {
      id
    }
  }
`

export const UPDATE_COLLABORATOR_PERMISSION_MUTATION = gql`
  mutation UpdateCollaboratorPermission($tripId: ID!, $userId: ID!, $permission: PermissionLevel!) {
    updateCollaboratorPermission(tripId: $tripId, userId: $userId, permission: $permission) {
      userId
      permission
    }
  }
`

export const REMOVE_COLLABORATOR_MUTATION = gql`
  mutation RemoveCollaborator($tripId: ID!, $userId: ID!) {
    removeCollaborator(tripId: $tripId, userId: $userId)
  }
`
