# SkyPort Airport Website
## Run locally (VS Code terminal)
    npm run install:all
    npm run dev        # site: http://localhost:5173   API: http://localhost:4000
Admin login: admin@skyport.local / admin123 (set ADMIN_EMAIL, ADMIN_PASSWORD, JWT_SECRET env vars before going public).
## Go live
    npm run build && npm start     # one server on PORT (default 4000) serves site + API
Deploy that same folder to Render, Railway, Fly.io or a VPS; set the env vars above.
