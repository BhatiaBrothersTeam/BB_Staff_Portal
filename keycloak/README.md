# Local Keycloak for the staff portal

`staff-realm.json` defines the `staff` realm the portal signs in against:

- **Client `portal`**: confidential, authorization code + PKCE (S256). Its redirect URI is `${PORTAL_URL}/api/auth/callback`, and its post-logout redirect is `${PORTAL_URL}/login`.
- **Groups** `Sales`, `Accounts` and `Workshop`. A `groups` mapper puts them in the ID token, and the portal stores them in its session.
- **Test user** `test.sales`, in the Sales group.

The client secret and passwords are not in this file. `start-dev.sh` reads them from `.env.local` (`KEYCLOAK_CLIENT_SECRET`, `KC_TEST_USER_PASSWORD`, `KC_ADMIN_PASSWORD`).

## Run it

Needs Java 21 or later. Download and extract Keycloak 26.8.1 from <https://github.com/keycloak/keycloak/releases> next to this repo, then:

```sh
keycloak/start-dev.sh          # or: KEYCLOAK_HOME=/path/to/keycloak keycloak/start-dev.sh
npm run dev -- -p 3001         # in another terminal
```

Open http://localhost:3001, click **Sign in with Keycloak**, and sign in as `test.sales`. The admin console is at http://localhost:8080/admin (user `admin`).

The realm is only imported when it doesn't exist yet. After editing `staff-realm.json`, delete `$KEYCLOAK_HOME/data/h2` to re-import it.

## Production

Dev mode uses plain HTTP and a local H2 database. For the real deployment (Azure), see the SSO plan. In short: run `kc.sh start` with HTTPS and a real database, keep the admin console off the public internet, and store the client secret in a secrets store.
