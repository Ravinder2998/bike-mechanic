# Velocity Motors Workshop CMS

A Node.js, Express, and SQLite bike-service website with dynamic public content, online service booking, customer-safe job tracking, and an authenticated workshop CMS.

## Requirements

- Node.js 20 or newer
- npm

## First-time setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local environment file from `.env.example` and set a strong initial admin password:

   ```bash
   copy .env.example .env
   ```

   Set `INITIAL_ADMIN_PASSWORD` to a password with at least 12 characters before the first launch. The application does not ship with a usable default admin password.

3. Start the app:

   ```bash
   npm start
   ```

   Open `http://localhost:8080` for the public website and `http://localhost:8080/admin` for the workshop CMS.

SQLite is created automatically at `data/ridecare.sqlite`. On its first run, it seeds services, reviews, booking options, estimator configuration, and legacy sample records if `data/ridecare_db.json` is present.

## Commands

| Command | Purpose |
| --- | --- |
| `npm start` | Start the production-style server. |
| `npm run dev` | Start the server with Node's file watcher. |
| `npm run db:seed` | Initialize/check the SQLite database. |
| `npm test` | Run Node test files under the project. |

## Public features

- Services, descriptions, pricing, images, reviews, contact details, brands, time slots, and calculator choices are fetched from SQLite-backed APIs.
- Booking totals are calculated on the server; the browser cannot set a price or status.
- Job tracking requires both the job-card number and the last four phone digits used at booking.
- Contact inquiries and rider reviews persist to the database. Submitted reviews remain pending until the workshop publishes them.

## Workshop CMS

Sign in at `/admin` using the account initialized through the environment file. The CMS can:

- update booking stage, technician note, bay, and delivery estimate;
- manage inquiries and review publication;
- add, edit, and archive services, including prices, images, inclusions, and the Electrical Work card image;
- update public workshop contact and operating details.

Changes appear on a freshly loaded public website immediately.

## Backups

Stop the server, then copy `data/ridecare.sqlite` to a secure backup location. Restore by replacing that file while the server is stopped. Do not expose the `data/` directory through a static web server.

## Production notes

- Set `NODE_ENV=production`, a strong `INITIAL_ADMIN_PASSWORD` before first deployment, and `ALLOWED_ORIGIN` to the real public URL.
- Place the app behind HTTPS. Session cookies are marked secure automatically in production.
- The bootstrap password is only used when no matching admin exists. Rotate it through the CMS/API flow and remove it from deployment secrets afterward.
