#!/bin/bash
# Starts only the web app (in Docker). Features that need the Python service
# (autosave, gestures) will not be available.

set -e

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "Docker is not running. Please start Docker and try again."
    exit 1
fi

cd "$(dirname "$0")"
docker compose up
