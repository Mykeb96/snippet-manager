/** Friendly labels for tag slugs (API stores lowercase). */
const TAG_LABELS: Record<string, string> = {
  // Original / backend-style
  aspnet: 'ASP.NET',
  api: 'API',
  // Frameworks & meta-frameworks
  react: 'React',
  nextjs: 'Next.js',
  vue: 'Vue',
  nuxt: 'Nuxt',
  svelte: 'Svelte',
  angular: 'Angular',
  remix: 'Remix',
  astro: 'Astro',
  solidjs: 'SolidJS',
  qwik: 'Qwik',
  // Bundlers & monorepo
  vite: 'Vite',
  webpack: 'Webpack',
  turbopack: 'Turbopack',
  turborepo: 'Turborepo',
  // UI & styling
  tailwind: 'Tailwind',
  shadcn: 'shadcn/ui',
  radix: 'Radix UI',
  // Runtimes & servers
  nodejs: 'Node.js',
  bun: 'Bun',
  deno: 'Deno',
  express: 'Express',
  nestjs: 'NestJS',
  fastify: 'Fastify',
  hono: 'Hono',
  trpc: 'tRPC',
  // APIs & data
  graphql: 'GraphQL',
  rest: 'REST',
  websocket: 'WebSocket',
  prisma: 'Prisma',
  drizzle: 'Drizzle',
  postgres: 'PostgreSQL',
  mongodb: 'MongoDB',
  redis: 'Redis',
  // Infra & deploy
  docker: 'Docker',
  kubernetes: 'Kubernetes',
  vercel: 'Vercel',
  netlify: 'Netlify',
  cloudflare: 'Cloudflare',
  // Auth
  jwt: 'JWT',
  oauth: 'OAuth',
  // Testing
  jest: 'Jest',
  vitest: 'Vitest',
  playwright: 'Playwright',
  cypress: 'Cypress',
  testing: 'Testing',
  // Web product
  seo: 'SEO',
  i18n: 'i18n',
  a11y: 'a11y',
  pwa: 'PWA',
  serverless: 'Serverless',
  edge: 'Edge',
  // Client state & docs
  zustand: 'Zustand',
  redux: 'Redux',
  tanstack: 'TanStack',
  storybook: 'Storybook',
  openapi: 'OpenAPI',
  // Integrations & ops
  stripe: 'Stripe',
  sanity: 'Sanity',
  wasm: 'WebAssembly',
  performance: 'Performance',
  observability: 'Observability',
  patterns: 'Patterns',
  security: 'Security',
}

export function formatTagDisplayName(slug: string): string {
  const known = TAG_LABELS[slug.toLowerCase()]
  if (known) return known
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
