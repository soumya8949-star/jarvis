# JARVIS Android Starter (Groq)

A mobile-friendly JARVIS-style web app with a glowing reactor UI, text chat, browser speech-to-text, and spoken replies. The Node.js backend keeps the Groq API key server-side.

## Important
- The app is **not** a full Android system controller. It can chat and use browser voice features; Android settings/app launching require native Android permissions and implementation.
- Do not use the API key you previously pasted into chat. Revoke it and create a new Groq key.
- Never put the Groq key in `public/app.js`, HTML, or the frontend URL field.

## Deploy the backend (phone-friendly outline)
1. Create a GitHub repository and upload these project files. Do not upload `.env`.
2. Create a Node web service on a hosting provider that supports Node apps.
3. Set the service root directory to the project root and build command to `npm install`; start command to `npm start`.
4. In the host's Environment Variables settings, add:
   - `GROQ_API_KEY` = your **new** Groq API key
   - `GROQ_MODEL` = `llama-3.3-70b-versatile` (or a model available in your Groq account)
5. Deploy. Your host will provide a service URL such as `https://your-service.example.com`. That URL is assigned by the host; it cannot be known in advance.
6. Open `https://YOUR-SERVICE-URL/health`. Expect JSON with `"ok":true` and `"configured":true`.
7. Open the service's root URL. The starter server currently exposes the API only; see below to serve the UI from the same service.

## Serve the UI from the same Node service
To make this one service host both the UI and backend, add the following line in `server.js` after `app.use(express.json(...))`:
```js
app.use(express.static("public"));
```
Then redeploy. Open the service URL in Chrome on Android. Tap Settings and the URL will be the same service URL; save it. This same-origin setup is easiest and avoids most CORS issues.

## Test
- `GET /health` should return `{"ok":true,"configured":true}`.
- `POST /api/chat` accepts JSON: `{"message":"Hello JARVIS","lang":"en-IN"}` and returns `{"reply":"..."}`.
- If you get 503, set `GROQ_API_KEY` in the host environment.
- If Groq returns an authentication error, check that the new key is valid and has not been revoked.
- If a model error appears, change `GROQ_MODEL` to a model available in your Groq account.

## Run locally (computer required)
1. Install Node.js.
2. Copy `.env.example` to `.env` and fill in the new key.
3. Run `npm install`, then `npm start`.
4. Open `http://localhost:3000`.

## Project files
- `server.js` — secure API proxy
- `public/index.html` — UI
- `public/style.css` — interface and reactor animation
- `public/app.js` — chat, voice, settings, backend requests
