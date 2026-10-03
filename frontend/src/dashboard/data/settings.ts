import { apiFetch } from './client'

export async function setApiKey(key: string): Promise<void> { await apiFetch('/api-key', { method: 'POST', body: JSON.stringify({ api_key: key.trim() }) }) }
