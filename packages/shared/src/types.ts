/**
 * Application configuration.
 */
export interface AppConfig {
  bookId: string;
  debug?: boolean;
}

/**
 * Result returned from event handlers.
 */
export interface EventResult {
  result?: string | string[] | boolean;
  error?: string;
  warning?: string;
}
