#!/bin/bash

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Start the app with docker-compose in the background
docker-compose up &

# Start 'uv run flask-app.py' inside the 'service' directory
cd service
uv run flask-app.py