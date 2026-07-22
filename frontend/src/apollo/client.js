import { ApolloClient, ApolloLink, InMemoryCache } from '@apollo/client'
import { HttpLink } from '@apollo/client/link/http'
import { setContext } from '@apollo/client/link/context'

const httpLink = new HttpLink({ uri: 'http://localhost:8000/graphql' })

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('voyapp_token')
  return {
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  }
})

export const apolloClient = new ApolloClient({
  link: ApolloLink.from([authLink, httpLink]),
  cache: new InMemoryCache(),
})
