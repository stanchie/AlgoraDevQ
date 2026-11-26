# Algora

A 2D browser learning game with a Vite + TypeScript + Tailwind CSS v4 frontend and a Flask + SQLite backend. The existing walkable classroom remains the frontend home experience; the other screens are typed skeletons for parallel development.

## Folder map

- `frontend/src/main.ts` — browser entry point
- `frontend/src/game/` — existing canvas game, configuration, input, and scene code
- `frontend/src/ui/` — modal, HUD, and lesson, quiz, and shop stubs
- `frontend/src/admin/` — admin page entry and title-only page stubs
- `frontend/public/assets/` — classroom and character SVG assets
- `backend/app.py` — Flask app factory and static page routes
- `backend/routes/` — API blueprints
- `backend/schema.sql`, `backend/db.py`, `backend/seed.py` — SQLite schema and setup
- `static/dist/` — frontend production build served by Flask

## Run the backend

From the repository root:

```sh
python3 -m venv backend/venv
source backend/venv/bin/activate
pip install -r backend/requirements.txt
python -m backend.seed
python -m flask --app backend.app run --debug
```

Set `SECRET_KEY` and `ADMIN_PASSWORD` in the environment for non-development use. The development admin password is `admin-dev-password`.

## Run the frontend

In another terminal from the repository root:

```sh
cd frontend
npm install
npm run dev
```

Vite proxies `/api` to `http://127.0.0.1:5000`. To build the frontend for Flask:

```sh
cd frontend
npm run build
```

The build is written to `static/dist`; Flask serves the home at `/` and admin page at `/admin`.

## Parallel ownership

- **Dev A (Hazel):** bookshelf, canteen, auth, and shared UI/API structure.
- **Dev B (Fhil):** quiz UI and quiz admin structure.
- Changes to `frontend/src/types.ts` and `backend/schema.sql` must be agreed before editing so both developers keep the contract aligned.
