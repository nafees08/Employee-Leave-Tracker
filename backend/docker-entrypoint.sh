#!/bin/sh
set -e
# Named volumes mount /app/data as root; ensure the app user can read/write SQLite.
chown -R appuser:appgroup /app/data
exec su-exec appuser "$@"
