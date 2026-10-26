# RoadSense Backend

    python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
    pip install -r requirements.txt
    cp .env.example .env
    uvicorn app.main:app --reload

Buka http://localhost:8000/docs

Pakai Postgres: `docker compose up -d`, lalu set DATABASE_URL di environment.
