const fallback = 'http://localhost:4000'

export const API_BASE = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_APP_BACKEND_URL || fallback
export const SOCKET_URL = API_BASE
