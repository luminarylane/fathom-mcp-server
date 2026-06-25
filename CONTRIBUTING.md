# Contributing to Fathom MCP Server

Thank you for your interest in contributing! This guide will help you get started.

## Development Setup

### Prerequisites

- Node.js 18+
- npm 9+
- Git

### Installation

```bash
git clone https://github.com/luminarylane/fathom-mcp-server.git
cd fathom-mcp-server
npm install
```

### Environment Setup

```bash
cp .env.example .env
# Add your Fathom API key to .env
```

## Development Workflow

### 1. Create an Issue

Before starting work, create or find an issue describing the feature or bug.

### 2. Create a Branch

```bash
gh issue develop <issue-number> --checkout
# Or manually:
git checkout -b feat/<issue-number>-description
```

### 3. Make Changes

Follow the existing code style and TypeScript conventions.

### 4. Test Locally

```bash
# Type check
npx tsc --noEmit

# Format code
npx prettier --write .

# Run all checks
make check
```

### 5. Commit and Push

```bash
git add src/
git commit -m "feat(#123): description"
git push origin your-branch-name
```

### 6. Create a PR

```bash
gh pr create --title "Fix #<issue>: Description" --body "Details..."
```

## Code Style

- **Formatter**: Prettier (configured in `package.json`)
- **Type checker**: TypeScript strict mode
- **Commits**: Use conventional commits — `feat:`, `fix:`, `chore:`, `docs:`
- **No comments** unless the WHY is non-obvious

## Pull Request Process

1. Ensure `npx tsc --noEmit` passes
2. Ensure `npx prettier --check .` passes
3. Write a clear PR description — what changed and why
4. Link to the issue with `Closes #123`

## Project Structure

```
fathom-mcp-server/
├── src/
│   ├── index.ts              # MCP server + all tool definitions
│   ├── client.ts             # Fathom API client
│   ├── rate-limiter.ts       # Token-bucket rate limiter + retry logic
│   └── response.ts           # MCP response helpers
├── .github/
│   └── workflows/            # CI/CD workflows
├── package.json
├── tsconfig.json
└── Makefile                  # Dev commands
```

## Getting Help

- Check [existing issues](https://github.com/luminarylane/fathom-mcp-server/issues)
- Read the [README](README.md)
- Ask in PR comments

## Code of Conduct

- Be respectful and constructive
- Welcome newcomers
- Focus on what's best for the project
