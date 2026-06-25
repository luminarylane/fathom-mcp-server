# Fathom MCP Server

[![MCP](https://img.shields.io/badge/MCP-1.0-blue)](https://modelcontextprotocol.io)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

A Model Context Protocol (MCP) server that enables Claude Desktop (and other MCP clients) to access your [Fathom](https://fathom.video) meeting intelligence — list meetings, read summaries, search by title, and pull full transcripts.

## Features

### Meeting Intelligence Tools

| Tool                     | Description                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `fathom_list_meetings`   | List recent meetings with optional date filters. Returns title, date, participants, summary, and action items |
| `fathom_get_summary`     | Get the AI-generated summary for a specific meeting (markdown formatted)                                      |
| `fathom_get_transcript`  | Get the full speaker-labeled, timestamped transcript for a meeting                                            |
| `fathom_search_meetings` | Search meetings by keyword in title with optional date filtering                                              |

### Built-in Reliability

- **Token-bucket rate limiter** — respects Fathom's 60 req/min limit client-side
- **Auto-retry on 429** — exponential backoff (2s, 4s, 8s) up to 3 retries
- **Structured error responses** — actionable error messages with status codes and recovery hints
- **Prompt injection protection** — external content wrapped in randomised `EXTCONTENT` markers

## Quick Start

### Prerequisites

- Node.js 18 or higher
- A [Fathom](https://fathom.video) account with API access
- Claude Desktop (or any MCP-compatible client)

### Get Your Fathom API Key

1. Go to [Fathom Settings](https://app.fathom.video/settings/api)
2. Generate an API key

### Installation

#### Option 1: npx (Recommended — Zero Install)

```bash
# Test it works
FATHOM_API_KEY=your-key npx fathom-mcp-server
```

**Claude Desktop configuration:**

```json
{
  "mcpServers": {
    "fathom": {
      "command": "npx",
      "args": ["-y", "fathom-mcp-server"],
      "env": {
        "FATHOM_API_KEY": "your-fathom-api-key"
      }
    }
  }
}
```

#### Option 2: Install from npm

```bash
npm install -g fathom-mcp-server
```

Then configure Claude Desktop:

```json
{
  "mcpServers": {
    "fathom": {
      "command": "fathom-mcp-server",
      "env": {
        "FATHOM_API_KEY": "your-fathom-api-key"
      }
    }
  }
}
```

#### Option 3: Install from Source

```bash
git clone https://github.com/luminarylane/fathom-mcp-server.git
cd fathom-mcp-server
npm install
npm run build
```

Then configure Claude Desktop:

```json
{
  "mcpServers": {
    "fathom": {
      "command": "node",
      "args": ["/path/to/fathom-mcp-server/dist/index.js"],
      "env": {
        "FATHOM_API_KEY": "your-fathom-api-key"
      }
    }
  }
}
```

## Usage Examples

Once configured, ask Claude to:

- "What meetings did I have this week?"
- "Get the summary for my last standup"
- "Search for meetings about product roadmap"
- "Pull the transcript from my meeting with the design team"
- "List all meetings from the past month"

## Authentication

Set the `FATHOM_API_KEY` environment variable with your API key from [Fathom Settings](https://app.fathom.video/settings/api).

## Rate Limits

Fathom enforces 60 requests per 60 seconds per user. The server handles this automatically with a client-side token bucket and exponential backoff retries.

## Troubleshooting

### Missing API key

```
FATHOM_API_KEY env var is required
```

Set the `FATHOM_API_KEY` environment variable before starting the server.

### 401 Authentication failed

```
AUTH_FAILED: FATHOM_API_KEY is invalid or expired.
```

Check your API key in [Fathom Settings](https://app.fathom.video/settings/api) and regenerate if needed.

### Rate limit exceeded

```
RATE_LIMITED: Fathom rate limit (60/min). Wait 60s and retry.
```

The server handles short waits automatically. For longer windows, wait and retry.

### Reporting Issues

1. Check [existing issues](https://github.com/luminarylane/fathom-mcp-server/issues)
2. Open a new issue with the full error message, steps to reproduce, and your environment details

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

```bash
npm install
npm run dev        # Dev mode
npx tsc --noEmit   # Type check
npx prettier --write .  # Format
```

## License

MIT License — see [LICENSE](LICENSE) for details.

## Acknowledgments

- [Anthropic](https://anthropic.com) for the MCP specification
- [Fathom](https://fathom.video) for meeting intelligence
