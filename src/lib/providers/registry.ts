/**
 * Provider registry: maps a platform name to its DraftProvider implementation.
 *
 * The API routes are generic (`/api/[provider]/...`) and resolve the concrete
 * adapter here, so adding a platform is: implement DraftProvider, register it
 * below, done — no route changes.
 */

import type { DraftProvider } from "./types";
import { sleeperProvider } from "./sleeper/adapter";
import { espnProvider } from "./espn/adapter";

const PROVIDERS: Record<string, DraftProvider> = {
  sleeper: sleeperProvider,
  espn: espnProvider,
};

/** Names of every registered provider (for UI selectors). */
export const PROVIDER_NAMES = Object.keys(PROVIDERS);

/** Resolve a provider by name, or throw a clear error for unknown names. */
export function getProvider(name: string): DraftProvider {
  const provider = PROVIDERS[name];
  if (!provider) {
    throw new Error(`Unknown provider "${name}".`);
  }
  return provider;
}
