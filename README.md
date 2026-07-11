# ZomPP MCP Server

Official Model Context Protocol (MCP) Server for the [ZomPP Platform](https://zompp.pl). This server allows AI agents (like Claude) to directly interact with ZomPP's legal reporting database, diagnose AI orchestration status, and initiate report generations.

## Architecture & Integration

This is a standalone TypeScript Node.js MCP server built with the official `@modelcontextprotocol/sdk`. It is designed to be hosted publicly on a VPS (e.g. Hetzner) or run locally by developers.

## Available MCP Tools

- **`list_reports`**: Fetch a paginated list of ZomPP reports. Supports filtering by status (e.g. `paid`, `draft`).
- **`get_report`**: Retrieve the full JSON schema of a specific report using its UUID.
- **`diagnose_orchestration`**: A diagnostic tool that analyzes the generated legal sections (the Chyłka-Pattern engine output) to detect AI fallback failures or stuck generation loops.

## Running Locally for Claude Desktop

To test this server locally with Claude Desktop, you don't need Docker. Just run it via `ts-node`:

1. Clone this repository.
2. Run `npm install`.
3. Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "zompp-mcp": {
      "command": "npx",
      "args": ["ts-node", "/absolute/path/to/zompp-mcp-server/src/index.ts"],
      "env": {
        "SUPABASE_URL": "https://jbgfptzpnhedukqfudkr.supabase.co",
        "SUPABASE_ANON_KEY": "YOUR_ANON_KEY",
        "SUPABASE_SERVICE_ROLE": "YOUR_SERVICE_ROLE_KEY"
      }
    }
  }
}
```

## Hosting on Hetzner VPS (Docker Compose)

For production usage (e.g. hooking this MCP to an external agent network):

1. Clone repo onto your Hetzner VPS.
2. Create a `.env` file with your keys.
3. Run:
```bash
docker-compose up -d --build
```
