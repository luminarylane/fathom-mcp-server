# MCP Directory Submissions

This folder tracks the information needed to register Fathom MCP Server with MCP directories after the first public npm release.

## Release prerequisite

Before submitting to a directory, publish a signed release of `@luminarylane/fathom-mcp-server` from a semver tag. npm Trusted Publishing must be configured for this repository's `publish.yml` workflow; the workflow uses GitHub Actions OIDC and does not use an npm automation token.

## Candidate directories

| Directory             | Status  | Notes                                                     |
| --------------------- | ------- | --------------------------------------------------------- |
| Official MCP Registry | Pending | Submit the released npm package and stdio configuration.  |
| awesome-mcp-servers   | Pending | Submit only after the package and documentation are live. |

## Installation configuration

```json
{
  "command": "npx",
  "args": ["--yes", "@luminarylane/fathom-mcp-server"],
  "env": {
    "FATHOM_API_KEY": "${FATHOM_API_KEY}"
  }
}
```
