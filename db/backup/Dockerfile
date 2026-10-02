# Idle helper image for offsite backups. The script is baked in rather than
# bind-mounted, since relative bind mounts can arrive empty on some hosts.
FROM postgres:16-alpine
COPY backup.sh /backup/backup.sh
RUN chmod 755 /backup/backup.sh
CMD ["sleep", "infinity"]
