const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export async function apiGet(path) {
  const response = await fetch(`${API_BASE_URL}${path}`)
  if (!response.ok) {
    throw new Error(`La API respondió ${response.status} para ${path}`)
  }
  return response.json()
}
