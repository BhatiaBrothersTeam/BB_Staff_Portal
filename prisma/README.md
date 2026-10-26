# Staff Portal database

The activity log lives in the `Staff_Portal` database on the Azure PostgreSQL server. It has two tables:

| Table | Model | Holds |
|---|---|---|
| `api_clients` | `ApiClient` | One row per app/agent: the SHA-256 hash of its API key, and when the key was created, last used and revoked |
| `activity_logs` | `ActivityLog` | One row per logged action, indexed on (`user_id`, `created_at`), (`app_id`, `created_at`) and `action` |

The schema is `prisma/schema.prisma`. The SQL that creates both tables is in
`prisma/migrations/20261026000000_activity_log/migration.sql`.

## Before you start

1. `DATABASE_URL` must be set in `.env.local`:

   ```env
   DATABASE_URL=postgresql://USER:PASSWORD@jobcard-db.postgres.database.azure.com:5432/Staff_Portal?sslmode=require
   ```

   If the password contains `@ : / ? # %`, URL-encode those characters.
2. The `Staff_Portal` database must already exist on the server. Prisma creates tables, not the database.
3. Azure must let your machine in. In the Azure portal, open the PostgreSQL server, go to **Networking**, and add
   your current IP address under the firewall rules (and the App Service's outbound IPs for the deployed portal).
4. The database user needs permission to create tables in the `public` schema. That's true if it owns the
   database. Otherwise an admin runs `GRANT CREATE ON SCHEMA public TO devopsbb;`.

## Create the tables (recommended: Prisma)

From the portal folder:

```bash
npm install
npm run db:migrate
npm run db:status
```

- `npm install` also runs `prisma generate`.
- `npm run db:migrate` runs `prisma migrate deploy`. It applies every migration in `prisma/migrations` that hasn't
  run yet, and records it in a `_prisma_migrations` table. It never drops or resets anything.
- `npm run db:status` should report "Database schema is up to date!".

Run `npm run db:migrate` again whenever a new migration is added. It's safe to run repeatedly.

## Or: create them by hand with SQL

If you'd rather run the SQL yourself (psql, pgAdmin or Azure Data Studio), connect to the `Staff_Portal` database
and run the contents of `prisma/migrations/20261026000000_activity_log/migration.sql`. With psql:

```bash
psql "postgresql://devopsbb@jobcard-db.postgres.database.azure.com:5432/Staff_Portal?sslmode=require" -f prisma/migrations/20261026000000_activity_log/migration.sql
```

If you go this way, tell Prisma the migration is already applied, so a later `npm run db:migrate` doesn't try to
create the tables again:

```bash
npx prisma migrate resolve --applied 20261026000000_activity_log
```

### If `db:migrate` fails with P3005

P3005 ("The database schema is not empty") means the database already has tables Prisma didn't create and no
`_prisma_migrations` history yet. The Azure `Staff_Portal` database was like this: it already had a
`login_status` table. Use the SQL route above, then `migrate resolve`. That's how the Azure database was set up
on 26 Oct 2026. From then on `npm run db:migrate` works normally.

### Don't run `prisma migrate dev`, `migrate reset` or `db push` against Azure

The Prisma schema only knows the activity-log tables. Those commands treat anything else in the database (such
as `login_status`) as unwanted and can drop it or reset the database. Against Azure, only use `npm run db:migrate`
(`migrate deploy`), `npm run db:status` and `migrate resolve`.

## Check it worked

```sql
\dt                                  -- api_clients, activity_logs (and _prisma_migrations)
SELECT count(*) FROM activity_logs;  -- 0 on a fresh database
```

Then sign in to the portal as an admin, open **API keys**, and generate a key for the Lead Gen Agent.

## Who is an admin

The admin pages (`/dashboard/activity`, `/dashboard/api-keys`) are open to anyone in a Keycloak group listed in
`PORTAL_ADMIN_GROUPS` (default `Admin`) or whose login name is in `PORTAL_ADMIN_USERS`. Everyone else gets a 404.
Create the `Admin` group in the Keycloak admin console (**staff** realm, then **Groups**) and add the right people
to it. `keycloak/staff-realm.json` now includes the group for fresh local setups.
