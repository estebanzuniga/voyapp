import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ApolloProvider } from '@apollo/client/react'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import { apolloClient } from './apollo/client.js'
import { AuthProvider } from './hooks/useAuth.jsx'
import { TranslationProvider } from './hooks/useTranslation.jsx'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ApolloProvider client={apolloClient}>
      <BrowserRouter>
        <AuthProvider>
          <TranslationProvider>
            <App />
          </TranslationProvider>
        </AuthProvider>
      </BrowserRouter>
    </ApolloProvider>
  </StrictMode>,
)
