#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { server } from "./server.js";
import { registerTools } from "./tools/index.js";

async function main() {
  console.error("Starting stargate-mcp server...");

  registerTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("stargate-mcp server ready");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
