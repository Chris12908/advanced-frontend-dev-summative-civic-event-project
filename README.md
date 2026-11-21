# CivicEvents+ Frontend

A community website where residents can find local events, listen to audio announcements, watch promo videos and get notifications. Admins publish the content and manage users.

Built with **HTML, Tailwind CSS (CDN) and jQuery**. There is no build step.

## What you need

- Node.js 18 or newer
- PostgreSQL 15 or newer
- VS Code with the **Live Server** extension

## How to run it

### 1. Set up the database

Open a terminal and create the database:

```bash
psql -U postgres -h localhost -p 5432
```
```sql
CREATE DATABASE "civic-events-db";
\q
```

Then create the tables, from the `backend` folder:

```bash
cd backend
psql -U postgres -d civic-events-db -h localhost -p 5432 -f ./migrations/001_create_tables.sql
psql -U postgres -d civic-events-db -h localhost -p 5432 -f ./migrations/002_audio_optional.sql
```

### 2. Start the backend

Create a file called `backend/.env` with these keys:

```
DB_USER=postgres
DB_PASS=your_postgres_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=civic-events-db
JWT_SECRET=any_long_random_text
```

Then run:

```bash
cd backend
npm install
npm run dev
```

You should see `CivicEvents+ backend listening on port 4000` and `Connected to PostgreSQL`.
The API is at **http://localhost:4000** (check http://localhost:4000/health).

### 3. Open the frontend

1. Open the project in VS Code.
2. Right-click `frontend/login.html` and choose **Open with Live Server**.

The website only works while both PostgreSQL and the backend are running.

### Changing the backend address

If your backend runs somewhere else, edit `frontend/js/config.js`:

```javascript
window.APP_CONFIG = {
  BASE_URL: 'http://localhost:4000',
  API_URL: 'http://localhost:4000/api'
};
```

## Test accounts

1. Open the signup page and create a normal user. The signup form never sends a role.
2. Create a second account, then make it an admin in the database:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-admin-email@example.com';
```

Password rule: at least 8 characters with upper case, lower case, a number and a special character.

## What each role can do

| | Normal user | Admin |
|---|---|---|
| Browse events, announcements and promos | Yes | Yes |
| Register for and cancel events | Yes | No |
| Leave feedback on an event | Yes | No |
| See all feedback, average rating and registrants | No | Yes |
| Create, edit, delete events, announcements and promos | No | Yes |
| Publish and unpublish announcements and promos | No | Yes |
| Enable or disable users | No | Yes |
| Delete notifications | No | Yes |
| Dashboard | Personal stats | Full stats and charts |

## How access is restricted (role guards)

Search the code for `ROLE GUARD` to find every place. There are three layers:

1. **Page guards.** Every page calls `Layout.init({ guard: ... })`, which runs `Auth.requireAuth()` or `Auth.requireAdmin()` from `js/auth.js`. Without a valid token you go to the login page. A normal user who opens an admin page is sent back to the dashboard with a message.
2. **Hidden controls.** Admin buttons (Edit, Delete, Publish, New event and so on) are only drawn when `Auth.isAdmin()` is true.
3. **The backend.** The API checks the token and role on every request, so the frontend rules are only for a better experience.

## Login and token storage

- Tokens last 1 hour. When one expires, the user is signed out with a message.
- "Keep me signed in" saves the token in `localStorage`. This survives closing the browser, but any script on the page could read it. Leaving it unticked uses `sessionStorage`, which is cleared when the tab closes and is safer on shared computers.

## Folder guide

```
frontend/
├── *.html            one file per page
├── css/custom.css    shared styles
└── js/
    ├── config.js     backend address
    ├── auth.js       token storage and role guards
    ├── api.js        API calls with the token attached
    ├── ui.js         toasts, dialogs, loading states, validation
    ├── layout.js     header, search, notification bell, footer
    └── pages/        one script per page
```

## Where the API differs from the assignment

These are limits of the provided backend, handled in the frontend:

- **Notifications:** there is no mark-as-read or create endpoint. Read status is saved in the browser, and admins can list and delete notifications.
- **Events:** the API cannot publish or unpublish them, so the event form has no publish toggle.
- **Feedback:** only admins can see all feedback and the average. Users see and edit their own review.
- **Registration:** after cancelling, the API does not allow registering again for the same event.
- **Announcements:** audio is optional (changed in the backend). The length is read from the audio file.
- **Promos:** a video can be an uploaded file or a YouTube link (changed in the backend). Uploaded videos get captions built from the caption text. YouTube videos use YouTube's own captions.
- **Lists:** pagination, search and filters for events run in the browser.
- **Service requests:** the rubric mentions them, but the backend has no such feature.

## Backend changes made

- `audio_url` can be empty (`migrations/002_audio_optional.sql`).
- `announcements.controller.js` no longer requires an audio file.
- `promos.controller.js` accepts a video link instead of a file.
- `.env` is now ignored by Git.

## Accessibility

Semantic HTML, a skip link, labelled form fields, visible focus outlines, keyboard-friendly dialogs and drawers, captions and transcripts for videos, and a responsive layout from mobile to desktop.