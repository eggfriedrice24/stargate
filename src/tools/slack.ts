import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const SLACK_BASE_URL = "https://slack.com/api";

async function slackRequest(
  method: string,
  body?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const token = process.env.SLACK_TOKEN;
  if (!token) {
    throw new Error("SLACK_TOKEN environment variable not set");
  }

  const response = await fetch(`${SLACK_BASE_URL}/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`Slack HTTP error (${response.status}): ${response.statusText}`);
  }

  const json = (await response.json()) as Record<string, unknown>;
  if (!json.ok) {
    throw new Error(`Slack API error: ${json.error}`);
  }

  return json;
}

export function registerSlackTools(server: McpServer) {
  server.tool(
    "slack_list_channels",
    "List Slack channels you can access",
    {
      limit: z.number().optional().describe("Max channels to return (default 100)"),
      types: z
        .string()
        .optional()
        .describe("Comma-separated channel types: public_channel, private_channel, mpim, im"),
    },
    async ({ limit, types }) => {
      try {
        const params: Record<string, unknown> = {};
        if (limit !== undefined) params.limit = limit;
        if (types !== undefined) params.types = types;

        const json = await slackRequest("conversations.list", params);
        const channels = (json.channels as Record<string, unknown>[]).map((ch) => ({
          id: ch.id,
          name: ch.name,
          is_private: ch.is_private,
          topic: (ch.topic as Record<string, unknown>)?.value,
          purpose: (ch.purpose as Record<string, unknown>)?.value,
          num_members: ch.num_members,
        }));
        return {
          content: [{ type: "text" as const, text: JSON.stringify(channels, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "slack_send_message",
    "Send a message to a Slack channel",
    {
      channel: z.string().describe("Channel ID to send the message to"),
      text: z.string().describe("Message text"),
    },
    async ({ channel, text }) => {
      try {
        const json = await slackRequest("chat.postMessage", { channel, text });
        const msg = json.message as Record<string, unknown>;
        return {
          content: [
            {
              type: "text" as const,
              text: `Message sent (ts: ${msg.ts})`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "slack_read_messages",
    "Read recent messages from a Slack channel",
    {
      channel: z.string().describe("Channel ID to read messages from"),
      limit: z.number().optional().describe("Max messages to return (default 10)"),
      oldest: z
        .string()
        .optional()
        .describe("Only messages after this Unix timestamp"),
    },
    async ({ channel, limit, oldest }) => {
      try {
        const params: Record<string, unknown> = { channel };
        if (limit !== undefined) params.limit = limit;
        if (oldest !== undefined) params.oldest = oldest;

        const json = await slackRequest("conversations.history", params);
        const messages = (json.messages as Record<string, unknown>[]).map((msg) => ({
          user: msg.user,
          text: msg.text,
          ts: msg.ts,
          thread_ts: msg.thread_ts,
          reply_count: msg.reply_count,
        }));
        return {
          content: [{ type: "text" as const, text: JSON.stringify(messages, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "slack_reply_to_thread",
    "Reply to a message thread in Slack",
    {
      channel: z.string().describe("Channel ID where the thread is"),
      thread_ts: z.string().describe("Timestamp of the parent message to reply to"),
      text: z.string().describe("Reply text"),
    },
    async ({ channel, thread_ts, text }) => {
      try {
        const json = await slackRequest("chat.postMessage", {
          channel,
          thread_ts,
          text,
        });
        const msg = json.message as Record<string, unknown>;
        return {
          content: [
            {
              type: "text" as const,
              text: `Reply sent (ts: ${msg.ts})`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error}` }],
          isError: true,
        };
      }
    }
  );
}
