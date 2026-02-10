import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAsanaTools } from "./asana.js";

export function registerTools(server: McpServer) {
  let loaded = 0;

  if (process.env.ASANA_TOKEN) {
    registerAsanaTools(server);
    console.error("✓ Asana tools enabled");
    loaded++;
  }

  // Future integrations:
  // if (process.env.GITHUB_TOKEN) {
  //   registerGithubTools(server);
  //   console.error("✓ GitHub tools enabled");
  //   loaded++;
  // }

  // if (process.env.JIRA_TOKEN) {
  //   registerJiraTools(server);
  //   console.error("✓ Jira tools enabled");
  //   loaded++;
  // }

  if (loaded === 0) {
    console.error("⚠ No tools enabled. Set environment variables to enable integrations:");
    console.error("  ASANA_TOKEN  - Enable Asana task management");
    console.error("  GITHUB_TOKEN - Enable GitHub integration (coming soon)");
  }
}
