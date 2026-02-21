import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAsanaTools } from "./asana.js";
import { registerGithubProjectsTools } from "./github-projects.js";
import { registerSlackTools } from "./slack.js";

export function registerTools(server: McpServer) {
  let loaded = 0;

  if (process.env.ASANA_TOKEN) {
    registerAsanaTools(server);
    console.error("✓ Asana tools enabled");
    loaded++;
  }

  if (process.env.SLACK_TOKEN) {
    registerSlackTools(server);
    console.error("✓ Slack tools enabled");
    loaded++;
  }

  if (process.env.GITHUB_TOKEN) {
    registerGithubProjectsTools(server);
    console.error("✓ GitHub Projects tools enabled");
    loaded++;
  }

  // if (process.env.JIRA_TOKEN) {
  //   registerJiraTools(server);
  //   console.error("✓ Jira tools enabled");
  //   loaded++;
  // }

  if (loaded === 0) {
    console.error("⚠ No tools enabled. Set environment variables to enable integrations:");
    console.error("  ASANA_TOKEN  - Enable Asana task management");
    console.error("  SLACK_TOKEN  - Enable Slack messaging");
    console.error("  GITHUB_TOKEN - Enable GitHub Projects V2 management");
  }
}
