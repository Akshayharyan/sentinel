# Sentinel

### Calm, reliable visibility for the websites that matter

Sentinel is a full-stack website monitoring platform that checks your sites, records uptime history, and alerts you when availability changes. It combines a focused React dashboard with a FastAPI service and a background monitoring scheduler.

**Live application**

- **Frontend:** [sentinel-frontend-kappa.vercel.app](https://sentinel-frontend-kappa.vercel.app)
- **API:** [sentinel-t2ya.onrender.com](https://sentinel-t2ya.onrender.com)
- **Health check:** [sentinel-t2ya.onrender.com/health](https://sentinel-t2ya.onrender.com/health)

---

## What Sentinel does

- Secure signup and login with signed, HTTP-only session cookies
- Per-user monitor ownership
- Configurable checks from **30 seconds** to **24 hours**
- Automatic uptime and response-time history
- Current status summaries for every monitor
- Manual checks on demand
- Historical charts and uptime statistics
- Email alerts for downtime and recovery transitions
- Cross-origin production setup for a Vercel frontend and Render API

> Logging out only ends the browser session. The backend scheduler continues checking saved monitors while the API service is running.

## Product flow

```text
React dashboard
      │
      │ credentials: include
      ▼
FastAPI API ───────► PostgreSQL
      │
      └─────────────► APScheduler ─────► monitored websites
                                      │
                                      └─► email alerts
```

The dashboard refreshes visible data every 30 seconds. The backend scheduler wakes up every 10 seconds and checks each monitor when its configured interval is due.

## Technology

### Frontend

- React 19
- Vite
- Tailwind CSS
- Lucide React
- Recharts

### Backend

- FastAPI
- SQLAlchemy
- APScheduler
- HTTPX
- PostgreSQL via `psycopg`
- SMTP email alerts

## Repository layout

```text
.
├── backend/
│   ├── main.py              # FastAPI app and API routes
│   ├── auth.py              # Password hashing and signed sessions
│   ├── database.py          # SQLAlchemy engine and table setup
│   ├── models.py            # User, monitor, and check result models
│   ├── monitor.py           # Website availability checks
│   ├── scheduler.py         # Background checks and transitions
│   ├── email_service.py     # SMTP alert delivery
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   └── services/api.js   # API client
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Run locally

### Prerequisites

- Python 3.10 or newer
- Node.js 18 or newer
- A PostgreSQL database, or another SQLAlchemy-compatible database URL
- SMTP credentials if you want email alerts

### 1. Configure the backend

From the repository root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Open `backend/.env` and set the values below. Never commit `.env`.

```env
DATABASE_URL=postgresql+psycopg://user:password@host:5432/sentinel
SESSION_SECRET=generate-a-long-random-secret

SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_LOGIN=your-smtp-login
SMTP_KEY=your-smtp-key
ALERT_FROM_EMAIL=alerts@example.com
ALERT_TO_EMAIL=you@example.com
```

`SESSION_SECRET` must be a long, private value. Keep the same value across deployments so existing sessions can be validated.

Start the API:

```powershell
uvicorn main:app --reload
```

The local API is available at [http://localhost:8000](http://localhost:8000). FastAPI's interactive documentation is available at [http://localhost:8000/docs](http://localhost:8000/docs).

### 2. Configure and run the frontend

Open a second terminal from the repository root:

```powershell
cd frontend
npm install
```

For local development, the API client defaults to `http://localhost:8000`. To use another API URL, create `frontend/.env.local`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Start Vite:

```powershell
npm run dev
```

Open the URL printed by Vite, usually [http://localhost:5173](http://localhost:5173).

## API overview

All protected routes use the `sentinel_session` HTTP-only cookie.

| Method | Route | Purpose | Auth |
| --- | --- | --- | --- |
| `GET` | `/health` | Service health check | No |
| `POST` | `/auth/signup` | Create an account and session | No |
| `POST` | `/auth/login` | Sign in and create a session | No |
| `POST` | `/auth/logout` | Clear the current session | No |
| `GET` | `/auth/me` | Get the current user | Yes |
| `GET` | `/monitors` | List the user's monitors | Yes |
| `POST` | `/monitors` | Create a monitor | Yes |
| `GET` | `/monitors/status` | Get current status summaries | Yes |
| `POST` | `/monitors/{monitor_id}/check` | Run an immediate check | Yes |
| `GET` | `/monitors/{monitor_id}/history` | Read check history | Yes |
| `GET` | `/monitors/{monitor_id}/stats` | Read uptime statistics | Yes |
| `DELETE` | `/monitors/{monitor_id}` | Delete a monitor and its history | Yes |

## Monitoring behavior

The scheduler is started with the FastAPI application lifecycle:

1. It wakes up every 10 seconds.
2. It loads all saved monitors.
3. It checks only monitors whose configured interval has elapsed.
4. It stores status code, response time, availability, errors, and timestamp.
5. It sends an alert after a detected downtime transition.
6. It sends a recovery alert when the site becomes healthy again.

The scheduler is server-side and does not depend on whether a user is currently logged in. Monitoring pauses only when the backend process is stopped, sleeping, restarting, or unavailable.

## Deployment

### Backend on Render

Create a Render Web Service with:

- **Root directory:** `backend`
- **Build command:** `pip install -r requirements.txt`
- **Start command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`

Add these environment variables in Render:

- `DATABASE_URL`
- `SESSION_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_LOGIN`
- `SMTP_KEY`
- `ALERT_FROM_EMAIL`
- `ALERT_TO_EMAIL`

Do not print or commit secret values. Keep `SESSION_SECRET` stable between deploys.

### Frontend on Vercel

Set this Vercel environment variable:

```env
VITE_API_BASE_URL=https://sentinel-t2ya.onrender.com
```

Then deploy the `frontend` directory as the project root.

The backend CORS configuration must include the exact frontend origin:

```text
https://sentinel-frontend-kappa.vercel.app
```

Because the frontend and API are on different origins, the session cookie must remain configured for HTTPS cross-origin requests:

- `HttpOnly`
- `Secure`
- `SameSite=None`
- `Path=/`

## Validation

Compile the backend modules:

```powershell
python -m py_compile backend\main.py backend\auth.py
```

Build the frontend:

```powershell
cd frontend
npm run build
```

If test dependencies are installed, run the backend tests from the repository root:

```powershell
python -m pytest backend
```

## Security notes

- Keep `.env` and `.env.local` files out of version control.
- Use a strong, unique `SESSION_SECRET`.
- Do not expose session cookies to JavaScript.
- Use HTTPS in production.
- Never place SMTP keys, database passwords, or session secrets in frontend code.
- Rotate credentials if they are accidentally exposed.

## License

No license has been selected for this project yet.
