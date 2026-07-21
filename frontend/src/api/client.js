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

export function extraerError(error, mensajePorDefecto) {
  return error?.response?.data?.message || mensajePorDefecto
}

export default api
