#!/bin/bash
# Starts the web app (in Docker) and the Python service (on the host).

set -e

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "Docker is not running. Please start Docker and try again."
    exit 1
fi

cd "$(dirname "$0")"

# Start the web app in the background, and stop it when this script exits
docker compose up &
WEBAPP_PID=$!
trap 'kill $WEBAPP_PID 2>/dev/null; docker compose stop' EXIT

# Start the Python service (FastAPI + Socket.IO) on port 5001
cd service
uv run uvicorn app.main:app --host 0.0.0.0 --port 5001 --reload
