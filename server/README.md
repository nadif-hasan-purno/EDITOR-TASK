# Task Tracker Server

Small Express/MongoDB API for the video editing agency task tracker.

## Requirements

- Node.js 20.19 or newer
- A local or hosted MongoDB database

## Setup

```bash
npm install
cp .env.example .env
npm start
```

Edit `.env` before starting:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/task_tracker
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
```

`CLIENT_ORIGIN` may contain comma-separated origins (required so browsers can call this API from your frontend without a CORS extension).

### Render / production

This API always allows:

- `http://localhost:5173` (local Vite)
- `https://editflows-manager-frontend.onrender.com` (production frontend)

So local and Render keep working even if `CLIENT_ORIGIN` is only set to localhost.

On the **API service** (`editflows-manager`), still set:

```env
MONGODB_URI=<your Atlas or hosted Mongo URI>
CLIENT_ORIGIN=https://editflows-manager-frontend.onrender.com
```

After changing CORS code or env vars, **redeploy / restart the API service**. The frontend alone cannot fix CORS — the browser checks response headers from the API.

On the **frontend** service, build with:

```env
VITE_API_URL=https://editflows-manager.onrender.com/api
```

## Main endpoints

- `GET /api/health`
- `GET|POST /api/tasks`
- `GET|PATCH|PUT|DELETE /api/tasks/:id`
- `GET /api/tasks/export.csv?status=Todo&client=Acme&editor=Sam`
- `GET|POST /api/custom-field-definitions`
- `GET|PATCH|PUT|DELETE /api/custom-field-definitions/:id`
- `GET|POST /api/editors` (auto-seeds default team roster when empty)
- `GET|PATCH|PUT|DELETE /api/editors/:id`

Task-list and CSV routes accept optional `status`, `client`, and `editor` query parameters.

## Development

```bash
npm run dev
```

This project deliberately contains no authentication because it is scoped as a single-user internal tool.
