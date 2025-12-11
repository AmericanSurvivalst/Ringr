import type { VoiceProviderAdapter } from './types'
import { vapiAdapter } from './vapi'

export * from './types'
export { vapiAdapter } from './vapi'

// Registry of all voice provider adapters
const adapters: Record<string, VoiceProviderAdapter> = {
  vapi: vapiAdapter,
  // Add more adapters here as needed:
  // retell: retellAdapter,
  // bland: blandAdapter,
}

export function getVoiceProviderAdapter(provider: string): VoiceProviderAdapter | null {
  return adapters[provider] || null
}

export function getSupportedProviders(): string[] {
  return Object.keys(adapters)
}
