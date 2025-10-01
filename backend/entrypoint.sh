#!/bin/sh

# Wait for postgres
# This is a simple loop, in a real production environment, you might want a more robust solution
echo "Waiting for postgres..."
while ! nc -z db 5432; do
  sleep 0.1
done
echo "PostgreSQL started"

# Run database migrations
echo "Running database migrations..."
python manage.py migrate --noinput

# Start server
echo "Starting server..."
python manage.py runserver 0.0.0.0:8000
