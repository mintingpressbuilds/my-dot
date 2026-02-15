# deploy guide — my dot.

## prerequisites

- Node.js 18+
- PostgreSQL database (Neon recommended — uses `@neondatabase/serverless`)
- Upstash Redis instance
- Resend account (for magic link emails)
- Domain with DNS access (for email sending)

---

## environment variables

Create a `.env` file (or set in your hosting provider):

```env
# required
DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require
REDIS_URL=https://your-instance.upstash.io
RESEND_API_KEY=re_xxxxxxxxxxxx
JWT_SECRET=your-random-64-char-secret
NEXT_PUBLIC_URL=https://mydot.space

# auto-set by most hosts
NODE_ENV=production
```

| variable | what it does | fallback if missing |
|---|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection | app won't start |
| `REDIS_URL` | Upstash Redis for rate limiting + caching | rate limits disabled, no galaxy cache |
| `RESEND_API_KEY` | email service for magic links | auth emails won't send |
| `JWT_SECRET` | signs auth tokens | falls back to `'dev-secret'` (insecure) |
| `NEXT_PUBLIC_URL` | base URL for links and redirects | magic links break |
| `NODE_ENV` | controls cookie security flags | cookies won't be secure |

---

## deploy steps

### 1. provision services

**database (Neon)**
- Create a project at [neon.tech](https://neon.tech)
- Copy the connection string to `DATABASE_URL`

**redis (Upstash)**
- Create a database at [upstash.com](https://upstash.com)
- Copy the REST URL to `REDIS_URL`

**email (Resend)**
- Sign up at [resend.com](https://resend.com)
- Add and verify your domain (`mydot.space`)
- Set SPF/DKIM/DMARC DNS records as Resend instructs
- Magic links send from `my dot. <noreply@mydot.space>`
- Copy API key to `RESEND_API_KEY`

### 2. install and build

```bash
npm install
npm run build
```

### 3. push database schema

```bash
npm run db:push
```

this creates 5 tables: `users`, `dots`, `connections`, `sparks`, `magic_links`

### 4. start

```bash
npm start
```

default port is 3000. set `PORT` env var to change.

---

## deploy to vercel (recommended)

```bash
# install vercel CLI
npm i -g vercel

# deploy
vercel --prod
```

or connect the GitHub repo in the Vercel dashboard. set all environment variables in Project Settings > Environment Variables.

vercel auto-detects Next.js and handles build + start.

**important:** run `npm run db:push` locally (or in a CI step) before first deploy to create the schema.

---

## deploy to other platforms

### railway / render / fly.io

all support Next.js. set environment variables in their dashboards and ensure:
- build command: `npm run build`
- start command: `npm start`
- run `npm run db:push` as a one-time release command

### docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

requires `output: 'standalone'` in `next.config.ts`.

---

## database commands

```bash
npm run db:generate   # generate migration files from schema changes
npm run db:push       # apply schema directly to database (dev/first deploy)
npm run db:studio     # open drizzle studio UI to inspect data
```

---

## post-deploy checklist

- [ ] galaxy loads at root URL with dots visible
- [ ] "make yours" button opens card builder
- [ ] magic link email arrives and logs you in
- [ ] card preview renders correctly
- [ ] share sheet opens with copy/download/native share
- [ ] dot pages load at `/dot/[slug]`
- [ ] sparks work (anonymous, once per 24h)
- [ ] friend connections create constellation lines
- [ ] exported HTML card is self-contained
- [ ] 60fps on mobile, no console errors

---

## gotchas

1. **`JWT_SECRET` must be set in production** — the dev fallback `'dev-secret'` is insecure
2. **galaxy cache is 5 minutes** — new dots won't appear instantly. clear Redis or wait
3. **Three.js is pinned to r128** — don't auto-upgrade without testing the galaxy
4. **email domain must match** — Resend needs verified domain matching `noreply@mydot.space`
5. **cookies need HTTPS** — `secure: true` is set when `NODE_ENV=production`, so deploy behind HTTPS
6. **no migration files yet** — first deploy must run `db:push` to create tables
