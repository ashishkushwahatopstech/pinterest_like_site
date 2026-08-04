# PinGrid - Visual Discovery & Image Collection Platform

A lightweight, high-performance, serverless visual discovery and image collection platform. Users sign in using Firebase Auth, connect their own Google Drive as free storage (via `drive.file` scope), create public/private boards, upload images with real-time progress bars, and view a public masonry gallery. Admins can moderate content, suspend users, and toggle signups. There is also a buried experimental option to duplicate uploads to Supabase Storage.

## Technology Stack
- **Frontend**: Vite + Vanilla JS (no heavy framework dependencies for minimal bundle size)
- **Database & RLS**: Supabase (Postgres) configured to trust Firebase JWTs as third-party auth provider
- **Storage**: Primary storage is Google Drive (Direct client-side uploads using GIS popup auth code flow). Secondary storage is Supabase Storage.
- **Serverless Glue**: Cloudflare Worker for securing Google OAuth credentials (encrypting and storing refresh tokens in Supabase, and refreshing access tokens).

---

## 1. Prerequisites & Service Setup

### A. Firebase Authentication Setup
1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. Under **Authentication** -> **Sign-in method**, enable the **Google** provider.
3. In Project settings, note down your Web App config: `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, and `appId`.

### B. Supabase Setup & JWT Integration
1. Go to the [Supabase Console](https://supabase.com/) and create a new project.
2. Run the SQL script from `schema.sql` inside the **SQL Editor** in the Supabase Dashboard. This sets up tables, RLS policies, triggers, and functions.
3. Configure Supabase to trust Firebase JWTs:
   - Go to **Project Settings** -> **API**.
   - Under **JWT Settings**, look for **Custom JWT Providers** (or Third-Party Auth).
   - Add a new provider with Firebase's JWKS URL: `https://securetoken.google.com/YOUR_FIREBASE_PROJECT_ID` as issuer and Google's public certificates endpoint `https://www.googleapis.com/service_accounts/v1/jwk/securetoken-system@system.gserviceaccount.com` as the JWKS URL.
   - This allows Supabase to verify the Firebase ID Token in the client's `Authorization` header, making `auth.jwt() ->> 'sub'` equal to the Firebase UID.

### C. Google Cloud Console Setup (Drive API)
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the **Google Drive API** in your project.
3. Go to the **OAuth Consent Screen** (configured as External, Publishing status: Testing or Production):
   - Add the scope: `.../auth/drive.file` (access to files created or opened by this app).
   - Add your test Google accounts under "Test users".
4. Go to **Credentials** -> **Create Credentials** -> **OAuth Client ID** (Application type: **Web application**):
   - Under **Authorized JavaScript origins**, add your local dev URL (`http://localhost:5173`) and your Cloudflare Pages production URL.
   - Under **Authorized redirect URIs**, add `https://developers.google.com/oauthplayground` (useful for testing) or your client origin.
   - Note the **Client ID** and **Client Secret**.

---

## 2. Deploying the Cloudflare Worker

The worker securely exchanges Google OAuth auth codes and stores/refreshes the `refresh_token` encrypted server-side using AES-256-GCM.

### Steps to Deploy:
1. Navigate to the `worker/` directory:
   ```bash
   cd worker
   ```
2. Initialize wrangler if not done (Wrangler is Cloudflare's CLI):
   ```bash
   npm install -g wrangler
   ```
3. Create a `wrangler.toml` configuration:
   ```toml
   name = "pingrid-auth-worker"
   main = "index.js"
   compatibility_date = "2024-01-01"

   [vars]
   FIREBASE_PROJECT_ID = "YOUR_FIREBASE_PROJECT_ID"
   GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID"
   SUPABASE_URL = "https://YOUR_SUPABASE_PROJECT_ID.supabase.co"
   ```
4. Deploy the worker to Cloudflare:
   ```bash
   wrangler deploy
   ```
5. Set worker secrets inside the Cloudflare Workers dashboard or via Wrangler:
   ```bash
   wrangler secret put GOOGLE_CLIENT_SECRET
   wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   wrangler secret put ENCRYPTION_KEY
   ```
   *Note: `ENCRYPTION_KEY` must be a cryptographically secure 32-byte key represented as a 64-character hex string (e.g. you can generate one using `openssl rand -hex 32`).*

---

## 3. Local Frontend Setup

1. Copy `.env.example` to `.env` at the root of the project:
   ```bash
   cp .env.example .env
   ```
2. Populate the client variables with your Firebase, Supabase, Google Client ID, and deployed Worker URL.
3. Install dependencies and start the Vite development server:
   ```bash
   npm install
   npm run dev
   ```

---

## 4. Deploying Frontend to Cloudflare Pages

Vite compiles the static bundle to the `dist/` directory, which can be deployed to Cloudflare Pages.

### Steps to Deploy from GitHub:
1. Push your project codebase to a GitHub repository (ensure `.env` is gitignored!).
2. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/) and navigate to **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**.
3. Select your GitHub repository.
4. Configure Build settings:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. Under **Environment variables (advanced)**, add all the variables from your local `.env` file (VITE_ prefixed):
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_GOOGLE_CLIENT_ID`
   - `VITE_WORKER_URL`
6. Click **Save and Deploy**. Cloudflare will compile and host your static site.

---

## 5. Attaching a Custom Domain

To connect a custom domain after deployment:
1. Go to **Workers & Pages** -> **Pages** -> select your `pingrid` project.
2. Click the **Custom domains** tab at the top.
3. Click **Set up a custom domain**.
4. Enter your domain (e.g., `gallery.yourdomain.com`).
5. Cloudflare will automatically handle updating DNS records (if your domain is on Cloudflare) or prompt you to create a CNAME record pointing to your Pages subdomain (e.g. `pingrid.pages.dev`).
6. Cloudflare will provision an SSL certificate and redirect your domain to your gallery!
