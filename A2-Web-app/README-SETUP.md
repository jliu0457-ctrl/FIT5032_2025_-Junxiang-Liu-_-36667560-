# Setup Guide — Indigenous Health Connect (A2 Categories D/E/F)

This guide walks through every account and configuration step needed by the app.
Follow the phases in order; Phase 1 of the code won't run until **Step 1** is done.

---

## Step 1 — Firebase Project (BR D.1: Authentication + Firestore data)

1. Go to <https://console.firebase.google.com/> and sign in with a Google account.
2. **Add project** → name it e.g. `ihc-app` → disable Google Analytics (optional) → **Create project**.
3. In the left sidebar: **Build → Authentication → Get started** → **Sign-in method** tab → enable **Email/Password** → Save.
4. **Build → Firestore Database → Create database** → start in **production mode** (rules are locked down later via `firestore.rules`) → pick a region (e.g. `australia-southeast1`).
5. **Project settings** (gear icon) → **General** → scroll to **Your apps** → **Web app** (**</>** icon) → register the app (nickname `ihc-web`).
6. Copy the `firebaseConfig` object values into a new file `.env` in this project (use `.env.example` as the template):

   ```env
   VITE_FIREBASE_API_KEY=AIza...
   VITE_FIREBASE_AUTH_DOMAIN=ihc-app.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=ihc-app
   VITE_FIREBASE_STORAGE_BUCKET=ihc-app.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
   VITE_FIREBASE_APP_ID=1:1234567890:web:abc...
   ```

7. **Deploy the security rules** (`firestore.rules` in this project):

   ```bash
   npx firebase-tools deploy --only firestore:rules --project <your-project-id>
   # (or paste the rules into Firestore → Rules tab in the console)
   ```

8. **Download the service account key** (used by the AWS Lambda function in Phase 2):
   **Project settings → Service accounts → Firebase Admin SDK → Generate new private key** →
   save the JSON file somewhere safe (e.g. `lambda/service-account.json`, **never commit it**).

### Create the demo accounts

- Register `user@health.org` (password `password123`) through the app's **Register** tab.
- Register `admin@health.org` (password `password123`), then open **Firestore → users** →
  find the document for the admin (its id is the Firebase `uid`), and edit the field
  `role` from `"Client"` to `"Admin"`.
- ⚠️ Never set `role` from the client code — the security rules enforce this; it is a
  console-only operation (BR C.2 / C.4).

---

## Step 2 — Cloudflare Account (BR D.4: hosting)

1. Sign up at <https://dash.cloudflare.com/sign-up> (free plan, **no credit card**).
2. Phase 7 covers deployment (`wrangler pages deploy dist`). Nothing to configure yet.

---

## Step 3 — AWS Lambda (BR E.1: serverless functions)

> You already used Lambda in your previous assignment — reuse the same account and workflow.

1. AWS Console → **Lambda → Create function** → Author from scratch:
   - Name: `ihc-api`
   - Runtime: **Node.js 20.x**
   - Permissions: create a role with basic Lambda permissions.
2. **Configuration → Environment variables** — add:
   - `FIREBASE_SERVICE_ACCOUNT` = the **entire contents** of the service-account JSON from Step 1.8
     (as one string; use AWS Secrets Manager if you prefer).
   - `RESEND_API_KEY` = your Resend API key from Step 4.
   - `ALLOWED_ORIGIN` = `https://<your-project>.pages.dev` (your Cloudflare Pages URL once deployed; `*` for local testing).
3. **Configuration → Function URL** → Create → Auth type: **NONE** (the function verifies the
   Firebase ID token itself, BR C.4) → enable **CORS**.
4. Deployment is done from this project in Phase 2/3 (`lambda/` folder + `npm run deploy:lambda`
   script that zips and updates the function).

---

## Step 4 — Resend Account (BR D.2: Email API with attachments)

1. Sign up at <https://resend.com/> (free tier: **100 emails/day**, attachments supported).
2. **API Keys → Create API Key** → copy it into the Lambda environment variable `RESEND_API_KEY` (Step 3.2).
3. Free tier note: without a verified domain, Resend's **testing mode** only delivers to the
   email address you signed up with. Use that address as the registered user's email when
   demoing the email feature (or add your own domain for unlimited recipients).

---

## Local development

```bash
npm install
npm run dev        # frontend dev server (Vite)
```

The Firebase config comes from `.env` (Step 1.6). If the console prints
"Firebase is not configured", the `.env` file is missing or incomplete.