# PostgreSQL setup for coding problems

This folder contains SQL scripts to create the database and seed a `problems` table.

## Files

- `01_create_database.sql`: creates the database `online_code_execution`.
- `02_create_problems_table_and_seed.sql`: creates the `problems` table and inserts 5 sample rows.

## Run (Windows/PowerShell)

Run from any location where `psql` is available:

```powershell
psql -U postgres -f "d:\Online Code Execution Platform\backend\db\01_create_database.sql"
psql -U postgres -d online_code_execution -f "d:\Online Code Execution Platform\backend\db\02_create_problems_table_and_seed.sql"
```

If your PostgreSQL host/port is not default, add `-h <host> -p <port>`.
