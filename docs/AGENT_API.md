# Agent API

The canonical API guide is [public/agent-api.md](../public/agent-api.md), shipped
with the website at **`/agent-api.md`**. Agents visiting the website can discover
it through **`/llms.txt`**, the HTML alternate link, the footer's **Agent API**
link, and the signed-in **Settings → Agent access** dialog.

Keep request formats, response examples, permissions, and limits in that one
public document so website visitors and repository readers receive the same
instructions. No login is needed to read either documentation endpoint.

## Implementation notes

- Only `POST /api/songs` accepts personal agent tokens. Public browsing needs no token.
- Creating, listing, and revoking tokens requires an allowed-domain Clerk session.
- Token plaintext is returned once; only its hash is stored. Never add tokens to
  logs, screenshots, examples, or test fixtures committed to the repository.
- Run tests, lint, typecheck, and a production build. Verify both public documents
  over HTTP after rebuilding Docker.
- Use an isolated test database for mutating API tests. Do not create songs or
  revoke real tokens as a side effect of a review.
