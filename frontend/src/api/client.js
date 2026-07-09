import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
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
