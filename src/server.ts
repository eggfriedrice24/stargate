import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { version } = require("../package.json");

export const server = new McpServer({
  name: "stargate-mcp",
  version,
});
