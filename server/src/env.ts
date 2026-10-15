export interface Env {
  DB: D1Database;
  ANTHROPIC_API_KEY?: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  ADMIN_SECRET?: string;
  HOSTED_ENABLED?: string;
  PLANS?: unknown;
  SITE_URL: string;
  UPSTREAMS?: unknown;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  MICROSOFT_CLIENT_ID?: string;
  MICROSOFT_CLIENT_SECRET?: string;
  ORCID_CLIENT_ID?: string;
  ORCID_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
}
