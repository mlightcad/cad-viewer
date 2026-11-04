/**
 * Header Anthropic requires before it answers a request made from a browser
 * page; without it the CORS preflight is rejected.
 */
export const ANTHROPIC_BROWSER_ACCESS_HEADER = {
  'anthropic-dangerous-direct-browser-access': 'true'
} as const
