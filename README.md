# stargate-mcp

Personal MCP server toolkit for AI agents. Integrates with Asana, GitHub, and more.

Works with any MCP-compatible client: Claude, Cursor, Windsurf, Continue, etc.

## Installation

```bash
npx stargate-mcp
```

Or install globally:

```bash
pnpm add -g stargate-mcp
```

## Configuration

Add to your MCP client config:

```json
{
  "mcpServers": {
    "stargate": {
      "command": "npx",
      "args": ["stargate-mcp"],
      "env": {
        "ASANA_TOKEN": "your-asana-personal-access-token",
        "SLACK_TOKEN": "xoxp-your-slack-user-token",
        "GITHUB_TOKEN": "ghp_your-github-personal-access-token"
      }
    }
  }
}
```

### Config file locations

| Client | Path |
|--------|------|
| Claude Code | `~/.claude/settings.json` or `.mcp.json` in project |
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Cursor | `.cursor/mcp.json` in project |

## Environment Variables

Tools are conditionally loaded based on which tokens you provide:

| Variable | Enables |
|----------|---------|
| `ASANA_TOKEN` | Asana task management tools |
| `SLACK_TOKEN` | Slack messaging tools |
| `GITHUB_TOKEN` | GitHub Projects V2 management tools |

## Available Tools

### Asana

Get your token at: https://app.asana.com/0/developer-console

| Tool | Description |
|------|-------------|
| `asana_list_workspaces` | List all accessible workspaces |
| `asana_list_projects` | List projects in a workspace |
| `asana_list_sections` | List sections (columns) in a project |
| `asana_list_tasks` | List tasks in a project or section |
| `asana_get_task` | Get task details including custom fields |
| `asana_update_task` | Update task name, notes, due date, completion |
| `asana_update_custom_fields` | Update custom fields (estimated/actual time) |
| `asana_move_task` | Move task to a different section |
| `asana_add_comment` | Add a comment to a task |

### Slack

Create a Slack App at: https://api.slack.com/apps

Install it to your workspace with a **User Token** (`xoxp-`) so messages appear as you. Required User Token scopes: `channels:read`, `channels:history`, `groups:read`, `groups:history`, `chat:write`.

| Tool | Description |
|------|-------------|
| `slack_list_channels` | List Slack channels you can access |
| `slack_send_message` | Send a message to a channel |
| `slack_read_messages` | Read recent messages from a channel |
| `slack_reply_to_thread` | Reply to a message thread |

### GitHub Projects

Create a classic Personal Access Token at: https://github.com/settings/tokens

Required scopes: `repo`, `project`, `read:org`

| Tool | Description |
|------|-------------|
| `github_list_projects` | List Projects V2 for a user or organization |
| `github_get_project_fields` | Get all fields (Status options = board columns, custom fields) |
| `github_list_project_items` | List items on a project board with optional status filter |
| `github_get_project_item` | Get full details of a single project item |
| `github_update_project_item_field` | Update any field value — move items between columns by setting Status |
| `github_add_project_item` | Add an existing issue/PR to a project, or create a draft issue |
| `github_list_issue_comments` | List comments on an issue |
| `github_add_issue_comment` | Add a comment to an issue |
| `github_list_sub_issues` | List sub-issues for a parent issue |
| `github_update_issue` | Update issue title, body, state, labels, assignees |

## Development

```bash
# Clone
git clone https://github.com/eggfriedrice24/stargate-mcp.git
cd stargate-mcp

# Install
pnpm install

# Build
pnpm build

# Run locally
ASANA_TOKEN=your-token pnpm start
```

## License

MIT
