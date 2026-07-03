import { useAuth } from './hooks/useAuth'
import App from './App'
import Login from './screens/Login'

// Auth gate: mostra la pagina di login finché non c'è una sessione,
// poi lascia il posto al diario.
export default function Root() {
  const { session } = useAuth()
  return session ? <App /> : <Login />
}
