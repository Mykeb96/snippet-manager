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
  'nest.js': 'Nest.js',
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

/** Lowercase segments after a dot (file extensions, common tech suffixes) — avoids "Nest.Js" for "nest.js". */
const LOWERCASE_AFTER_DOT = new Set([
  'js',
  'mjs',
  'cjs',
  'ts',
  'tsx',
  'jsx',
  'css',
  'scss',
  'sass',
  'less',
  'html',
  'md',
  'json',
  'yml',
  'yaml',
  'sh',
  'sql',
  'wasm',
  'map',
  'lock',
  'net',
  'io',
  'ai',
  'ui',
  'ux',
  'api',
  'sdk',
  'cs',
  'fs',
  'vb',
  'gql',
  'graphql',
  'd',
  'config',
])

function formatUnknownSlug(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .split(' ')
    .map((word) =>
      word
        .split('.')
        .map((segment, index) => {
          if (segment.length === 0) return segment
          if (index > 0 && LOWERCASE_AFTER_DOT.has(segment)) return segment
          return segment[0].toUpperCase() + segment.slice(1)
        })
        .join('.'),
    )
    .join(' ')
}

export function formatTagDisplayName(slug: string): string {
  const known = TAG_LABELS[slug.toLowerCase()]
  if (known) return known
  return formatUnknownSlug(slug)
}
