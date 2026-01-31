#!/bin/bash
set -e

# Run migrations if safe
# python manage.py migrate --noinput

# Start Gunicorn
exec gunicorn --bind 0.0.0.0:$PORT --workers 1 --threads 8 --timeout 0 config.wsgi:application
