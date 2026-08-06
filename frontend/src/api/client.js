import axios from 'axios'

// En local, Vite redirige /api al backend (ver vite.config.js). En
// producción no hay ese proxy, así que hace falta la URL completa del
// backend desplegado, cargada en build time vía VITE_API_URL.
export const API_BASE = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: `${API_BASE}/api`,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Si el token venció o es inválido, el backend responde 401 en cualquier
// pedido. Sin esto, cada página lo trataba como "sin datos" (mostraba
// listas vacías en vez de avisar que hay que volver a loguearse). Acá se
// limpia la sesión guardada y se manda a /login con un aviso, para
// cualquier pedido de cualquier página.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('token')
      localStorage.removeItem('usuario')
      window.location.href = '/login?sesion=expirada'
    }
    return Promise.reject(error)
  }
)

export function extraerError(error, mensajePorDefecto) {
  return error?.response?.data?.message || mensajePorDefecto
}

export default api
