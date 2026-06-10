# RecApp

RecApp is a three-part monorepo for rehabilitation and counseling workflows:

- `server` — Express + Sequelize API backend
- `admin` — Vite + React admin / counselor dashboard
- `mobileapp` — Expo Router mobile app for clients and staff

## Prerequisites

- Node.js 20+ and npm
- PostgreSQL
- Redis
- An SMTP account or local mail catcher for OTP and invite emails

## Install Dependencies

Each app is its own Node project, so install dependencies in each folder:

```bash
cd server
npm install

cd ../admin
npm install

cd ../mobileapp
npm install
```

## Environment Variables

Create or update `server/.env` with the backend settings below.

```env
PORT=5001
NODE_ENV=development

DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=recapp
DB_USER=postgres
DB_PASSWORD=your_password

REDIS_HOST=127.0.0.1
REDIS_PORT=6379

EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your_email_user
EMAIL_PASSWORD=your_email_password
EMAIL_FROM=no-reply@recapp.com

JWT_SECRET=your_jwt_secret
```

Notes:

- `JWT_SECRET` has a fallback in code, but you should set a real value.
- The backend expects PostgreSQL and Redis to be running before startup.

## Run the Backend

Start the API server first:

```bash
cd server
npm run dev
```

The backend runs on `http://localhost:5001`.

## Run the Admin Dashboard

In a second terminal:

```bash
cd admin
npm run dev
```

Open the Vite URL shown in the terminal, usually `http://localhost:5173`.

## Run the Mobile App

In another terminal:

```bash
cd mobileapp
npx expo start
```

You can also use:

- `npm run android` — open on an Android device/emulator
- `npm run ios` — open on an iPhone simulator or connected iOS setup
- `npm run web` — run the Expo app in the browser

### Expo Go note

This project uses Expo SDK 56. If Expo Go says the project is incompatible, make sure your Expo Go app matches SDK 56, or use a development build / web / Android instead.

## Suggested Startup Order

1. PostgreSQL
2. Redis
3. `server`
4. `admin` and/or `mobileapp`

## Helpful Notes

- OTP codes are logged in the backend console during development.
- The admin dashboard uses Tailwind v4 utilities from `admin/src/index.css`.
- The mobile app uses Expo Router with file-based routing under `mobileapp/src/app`.

