/**
 * Shared error type thrown by provider clients (Sleeper, ESPN, ...).
 *
 * The route layer (`lib/api-response.ts`) catches this base so error handling
 * stays provider-neutral: any platform's HTTP failure carries a status the
 * route can pass through to the browser.
 */
export class ProviderApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly url: string,
  ) {
    super(message);
    this.name = "ProviderApiError";
  }
}
