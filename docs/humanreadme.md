## Human Readme

## Scripts

### From Root

1. node scripts/new-game.mjs word-scramble "Word Scramble" "🔤"
2.

# How to run local migration

In server directory (or use the package.json scripts in server)

```bash
docker exec -i arcade-pg psql -U postgres -d arcade_ladder < src/db/migrations/007_rename-arrow-escape.sql
```

# How to reset local DB from scratch

```bash
docker exec -i arcade-pg psql -U postgres -d arcade_ladder < src/db/migrations/001_init.sql
```
