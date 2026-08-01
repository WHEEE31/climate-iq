# ClimateIQ

Estimates a property's climate risk — flood, severe storms, wildfire, extreme heat,
drought, and air quality — from free public datasets. No API keys, no database,
no accounts.

One Express server serves both the API and the frontend on a single port, so
there is exactly one URL in every environment: your laptop, Docker, and production.

---

## Run it locally

```bash
npm install
npm run dev
```

Open **http://localhost:5000**.

That is the whole setup. One command, one port, one URL. The Vite dev server runs
inside the Express process, so the frontend and the API share an origin — there's
no proxy to configure and no second terminal to keep open. Edits to `src/` hot-reload;
edits to `server/` restart the process automatically.

## Test that the production build actually works

```bash
npm run build
npm run smoke
```

`npm run smoke` boots the real production build and checks that the server binds a
port, serves the frontend, rejects bad input, and returns a live assessment. If that
passes, the app will run wherever you deploy it. Run it before every deploy.

To preview the production build by hand instead:

```bash
npm run preview   # build + start, then open http://localhost:5000
```

## Deploy it

Pick one. All three produce a public URL you can send to people.

### Render (easiest — free tier, no card)

1. Push this folder to a GitHub repo.
2. Render dashboard → **New** → **Blueprint** → select the repo.
3. Render reads `render.yaml` and deploys. You get `https://climate-iq-xxxx.onrender.com`.

Free instances sleep after ~15 minutes idle, so the first request after a gap takes
30–50 seconds to wake. Fine for sharing a demo; upgrade to a paid instance if you
need it always warm.

### Docker (works on Fly.io, Railway, Cloud Run, a VPS, anywhere)

```bash
docker build -t climate-iq .
docker run -p 5000:5000 climate-iq
```

Then `http://localhost:5000`. The same image is what you push to any container host.

### Any plain Node host

```
Build command:  npm install --include=dev && npm run build
Start command:  npm start
Health check:   /healthz
```

`--include=dev` matters. If the platform sets `NODE_ENV=production` (most do),
npm skips devDependencies — and vite, esbuild, and typescript live there because
they're only needed at build time. Without the flag the build fails with
`vite: not found`.

The server reads `PORT` from the environment, which is what every platform sets.

---

## What changed from the Replit version, and why it wouldn't deploy

The original was a pnpm workspace with four packages, generated API clients, and
Replit-only build plugins. Most of it was scaffolding rather than your app, and
several pieces of it could only ever work inside Replit. Specifically:

**The local link died because the dev setup depended on Replit.** The frontend ran on
one port, the API on another, and a custom `scripts/dev-server.mjs` orchestrator plus
`@replit/vite-plugin-*` packages wired them together. Outside Replit that link points
at a proxy that no longer exists. Now a single Express process serves both, so the URL
is just `localhost:5000` and there's nothing to break.

**The build was pinned to Windows and to Replit's Linux image at the same time.** The
root `package.json` had `@rollup/rollup-win32-x64-msvc`, `@tailwindcss/oxide-win32-x64-msvc`,
and `lightningcss-win32-x64-msvc` as required dependencies, while `pnpm-workspace.yaml`
excluded every non-Linux binary via `overrides`. Those two rules contradict each other,
and installs fail on macOS, on Linux CI, and in Docker. All of it is gone — npm resolves
the right native binary for whatever machine runs the install.

**There were five competing Vite configs.** `vite.config.ts`, `.new.ts`, `.replacement.ts`,
`.windows.ts`, and `.bak`, plus four scripts in `scripts/` that generated them
(`write-vite-config.mjs`, `.ps1`, `write_climate_iq_vite_config.py`, and
`write-climate-iq-vite-config.mjs`). Which one applied depended on how you started the
app. There is now one `vite.config.ts` with no environment branching.

**`lib/db` threw at import time if `DATABASE_URL` was unset** — and nothing in the app
used it. It was a required dependency of the API server, so any deploy without a
provisioned Postgres crashed on boot. Removed.

**Logging wrote to a file and used a bundler-sensitive transport.** `pino-pretty` runs in
a worker thread and needs a special esbuild plugin to survive bundling; the server also
appended to `debug-e3d7c8.log` on every request, which fails on read-only filesystems.
Replaced with a small console logger — JSON lines in production, readable text in dev.

**A real bug in `Home.tsx`:** `SearcherView` called `setHasManualAddress`, which was
defined in the parent `Home` component and never passed down. Typing in the address
field threw a `ReferenceError`. It's now passed as a prop.

**The API client was 700 lines of generated code across three packages** (`api-spec`,
`api-zod`, `api-client-react`) with an orval codegen step. That's now one 100-line
`src/lib/api.ts` and a shared `shared/types.ts` used by both sides.

Also removed: `artifacts/mockup-sandbox` (a scaffold template, not part of your app),
the 49 unused shadcn components and their ~30 Radix dependencies, the committed
`.venv/` directory, and `.replit`.

Nothing about the actual climate scoring changed — `server/climate/` is your original
logic, untouched apart from its logger import.

---

## Project layout

```
index.html            frontend entry
vite.config.ts        one build config
shared/types.ts       API contract shared by client and server
src/                  React frontend
  lib/api.ts          typed fetch client + react-query hook
  pages/Home.tsx      the app
  components/         GlobeSelector + the 7 UI primitives actually used
server/
  index.ts            Express: API + static frontend + dev Vite middleware
  routes.ts           /api/climate-risk, /api/reverse-geocode, /healthz
  climate/            scoring logic (unchanged from the original)
scripts/smoke-test.mjs
Dockerfile
render.yaml
.github/workflows/ci.yml
```

## Configuration

Everything is optional — see `.env.example`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `5000` | Port to listen on. Hosting platforms set this for you. |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, or `error`. |
| `NOMINATIM_USER_AGENT` | generic | Set a real contact address before real traffic — see below. |

## Before you share it widely

- **Set `NOMINATIM_USER_AGENT`** to something with a real contact address.
  OpenStreetMap's geocoder is free but asks apps to identify themselves, and it
  rate-limits or blocks anonymous heavy usage. This is the most likely thing to break
  under load.
- **Add caching if traffic grows.** Every assessment currently makes four to six
  upstream calls. Caching results by rounded lat/lng would cut that dramatically.
- **The disclaimer in the footer matters.** These scores come from public datasets and
  aren't a substitute for a professional risk assessment. Keep it visible.

## After your first install

`npm install` generates `package-lock.json`. Commit it. That's what makes builds
byte-identical across your machine, CI, and production — the single biggest factor in
"works on my machine" problems disappearing.

## Data sources

Open-Meteo (weather reanalysis, air quality, elevation), Nominatim / OpenStreetMap
(geocoding), CARTO basemaps (globe tiles), plus FEMA, NOAA, US Drought Monitor, and
USDA Forest Service reference data encoded in the scoring modules. All free, none
requiring a key.
