import { useAuth } from './hooks/useAuth'
import App from './App'
import Login from './screens/Login'
import Splash from './components/Splash'

// Auth gate: mentre si ripristina la sessione mostra lo splash, poi la pagina
// di login finché non c'è una sessione, infine il diario.
export default function Root() {
  const { session, loading } = useAuth()
  if (loading) return <Splash />
  return session ? <App /> : <Login />
}
