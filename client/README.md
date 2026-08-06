# Task Tracker Client

React frontend for the video editing agency task tracker. It includes board and list views, filters, task CRUD forms, reusable/one-off custom fields, and filtered CSV downloads.

## Requirements

- Node.js 20.19 or newer
- The Task Tracker Server running locally or at a reachable URL

## Setup

```bash
npm install
cp .env.example .env
npm start
```

The app opens at `http://localhost:5173` by default.

Set the API base URL in `.env` when the server is not running at `http://localhost:5000`:

```env
VITE_API_URL=http://localhost:5000/api
```

## Theme (day / night)

The UI uses a shadcn-style token system with Tailwind:

- **Day** — light
- **Night** — dark
- **Auto** — follow system preference

Preference is stored in `localStorage` under `ct-theme`.

## Production build / Render

```bash
npm run build
npm run preview
```

The generated static files are placed in `dist/`.

On Render (or any host), set **`VITE_API_URL` at build time** to your live API root, for example:

```env
VITE_API_URL=https://your-api.onrender.com/api
```

Vite bakes this value into the static bundle during `npm run build`. If it still points at `localhost`, the deployed UI cannot reach MongoDB through your API.

Also ensure the API service has your frontend origin in `CLIENT_ORIGIN` (see the server README). That removes the need for any CORS browser extension.
