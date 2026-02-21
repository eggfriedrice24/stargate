import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";
const GITHUB_REST_URL = "https://api.github.com";

async function githubGraphQL(
  query: string,
  variables?: Record<string, unknown>
): Promise<unknown> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN environment variable not set");
  }

  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub GraphQL HTTP error (${response.status}): ${error}`);
  }

  const json = (await response.json()) as { data?: unknown; errors?: { message: string }[] };
  if (json.errors) {
    throw new Error(`GitHub GraphQL error: ${json.errors.map((e) => e.message).join(", ")}`);
  }

  return json.data;
}

async function githubRest(
  endpoint: string,
  method: "GET" | "POST" | "PATCH" | "DELETE" = "GET",
  body?: Record<string, unknown>
): Promise<unknown> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN environment variable not set");
  }

  const response = await fetch(`${GITHUB_REST_URL}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub REST API error (${response.status}): ${error}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export function registerGithubProjectsTools(server: McpServer) {
  // List Projects V2 for a user or org
  server.tool(
    "github_list_projects",
    "List GitHub Projects V2 for a user or organization",
    {
      owner: z.string().describe("GitHub username or organization name"),
      owner_type: z.enum(["user", "organization"]).describe("Whether the owner is a user or organization"),
      first: z.number().optional().describe("Number of projects to return (default 20)"),
    },
    async ({ owner, owner_type, first }) => {
      try {
        const count = first ?? 20;
        const query = `
          query($owner: String!, $first: Int!) {
            ${owner_type}(login: $owner) {
              projectsV2(first: $first) {
                nodes {
                  id
                  title
                  number
                  shortDescription
                  closed
                  url
                }
              }
            }
          }
        `;
        const data = (await githubGraphQL(query, { owner, first: count })) as Record<string, unknown>;
        const ownerData = data[owner_type] as Record<string, unknown>;
        const projects = (ownerData.projectsV2 as Record<string, unknown>).nodes;
        return {
          content: [{ type: "text" as const, text: JSON.stringify(projects, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error}` }],
          isError: true,
        };
      }
    }
  );

  // Get project fields (Status options = board columns, custom fields)
  server.tool(
    "github_get_project_fields",
    "Get all fields for a GitHub Project V2 (Status options are your board columns)",
    {
      project_id: z.string().describe("Project node ID (from github_list_projects)"),
    },
    async ({ project_id }) => {
      try {
        const query = `
          query($projectId: ID!) {
            node(id: $projectId) {
              ... on ProjectV2 {
                fields(first: 50) {
                  nodes {
                    ... on ProjectV2Field {
                      id
                      name
                      dataType
                    }
                    ... on ProjectV2SingleSelectField {
                      id
                      name
                      dataType
                      options {
                        id
                        name
                        description
                        color
                      }
                    }
                    ... on ProjectV2IterationField {
                      id
                      name
                      dataType
                      configuration {
                        iterations {
                          id
                          title
                          startDate
                          duration
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        `;
        const data = (await githubGraphQL(query, { projectId: project_id })) as Record<string, unknown>;
        const node = data.node as Record<string, unknown>;
        const fields = (node.fields as Record<string, unknown>).nodes;
        return {
          content: [{ type: "text" as const, text: JSON.stringify(fields, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error}` }],
          isError: true,
        };
      }
    }
  );

  // List project items (board view)
  server.tool(
    "github_list_project_items",
    "List items on a GitHub Project V2 board with optional status filter and pagination",
    {
      project_id: z.string().describe("Project node ID"),
      first: z.number().optional().describe("Number of items to return (default 50)"),
      after: z.string().optional().describe("Cursor for pagination"),
      status_filter: z.string().optional().describe("Filter by status column name (e.g. 'In Progress')"),
    },
    async ({ project_id, first, after, status_filter }) => {
      try {
        const count = first ?? 50;
        const query = `
          query($projectId: ID!, $first: Int!, $after: String) {
            node(id: $projectId) {
              ... on ProjectV2 {
                items(first: $first, after: $after) {
                  pageInfo {
                    hasNextPage
                    endCursor
                  }
                  nodes {
                    id
                    fieldValues(first: 20) {
                      nodes {
                        ... on ProjectV2ItemFieldTextValue {
                          text
                          field { ... on ProjectV2Field { name } }
                        }
                        ... on ProjectV2ItemFieldNumberValue {
                          number
                          field { ... on ProjectV2Field { name } }
                        }
                        ... on ProjectV2ItemFieldDateValue {
                          date
                          field { ... on ProjectV2Field { name } }
                        }
                        ... on ProjectV2ItemFieldSingleSelectValue {
                          name
                          field { ... on ProjectV2SingleSelectField { name } }
                        }
                        ... on ProjectV2ItemFieldIterationValue {
                          title
                          startDate
                          duration
                          field { ... on ProjectV2IterationField { name } }
                        }
                      }
                    }
                    content {
                      ... on Issue {
                        number
                        title
                        state
                        url
                      }
                      ... on PullRequest {
                        number
                        title
                        state
                        url
                      }
                      ... on DraftIssue {
                        title
                        body
                      }
                    }
                  }
                }
              }
            }
          }
        `;
        const data = (await githubGraphQL(query, { projectId: project_id, first: count, after: after ?? null })) as Record<string, unknown>;
        const node = data.node as Record<string, unknown>;
        const items = node.items as { pageInfo: unknown; nodes: Record<string, unknown>[] };

        let result = items.nodes;
        if (status_filter) {
          result = result.filter((item) => {
            const fieldValues = (item.fieldValues as { nodes: Record<string, unknown>[] }).nodes;
            return fieldValues.some(
              (fv) =>
                (fv.field as Record<string, unknown> | undefined)?.name === "Status" &&
                fv.name === status_filter
            );
          });
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ pageInfo: items.pageInfo, items: result }, null, 2),
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

  // Get full details of a single project item
  server.tool(
    "github_get_project_item",
    "Get full details of a single GitHub Project V2 item (all fields, issue body, assignees, labels)",
    {
      item_id: z.string().describe("Project item node ID (from github_list_project_items)"),
    },
    async ({ item_id }) => {
      try {
        const query = `
          query($itemId: ID!) {
            node(id: $itemId) {
              ... on ProjectV2Item {
                id
                fieldValues(first: 20) {
                  nodes {
                    ... on ProjectV2ItemFieldTextValue {
                      text
                      field { ... on ProjectV2Field { name } }
                    }
                    ... on ProjectV2ItemFieldNumberValue {
                      number
                      field { ... on ProjectV2Field { name } }
                    }
                    ... on ProjectV2ItemFieldDateValue {
                      date
                      field { ... on ProjectV2Field { name } }
                    }
                    ... on ProjectV2ItemFieldSingleSelectValue {
                      name
                      field { ... on ProjectV2SingleSelectField { name } }
                    }
                    ... on ProjectV2ItemFieldIterationValue {
                      title
                      startDate
                      duration
                      field { ... on ProjectV2IterationField { name } }
                    }
                  }
                }
                content {
                  ... on Issue {
                    number
                    title
                    body
                    state
                    url
                    assignees(first: 10) { nodes { login } }
                    labels(first: 10) { nodes { name color } }
                    milestone { title dueOn }
                  }
                  ... on PullRequest {
                    number
                    title
                    body
                    state
                    url
                    assignees(first: 10) { nodes { login } }
                    labels(first: 10) { nodes { name color } }
                    milestone { title dueOn }
                  }
                  ... on DraftIssue {
                    title
                    body
                    assignees(first: 10) { nodes { login } }
                  }
                }
              }
            }
          }
        `;
        const data = (await githubGraphQL(query, { itemId: item_id })) as Record<string, unknown>;
        return {
          content: [{ type: "text" as const, text: JSON.stringify(data.node, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error}` }],
          isError: true,
        };
      }
    }
  );

  // Update a project item field value (move between columns by setting Status)
  server.tool(
    "github_update_project_item_field",
    "Update a field value on a GitHub Project V2 item — use this to move items between columns by setting the Status field",
    {
      project_id: z.string().describe("Project node ID"),
      item_id: z.string().describe("Project item node ID"),
      field_id: z.string().describe("Field node ID (from github_get_project_fields)"),
      value: z
        .object({
          text: z.string().optional(),
          number: z.number().optional(),
          date: z.string().optional(),
          singleSelectOptionId: z.string().optional(),
          iterationId: z.string().optional(),
        })
        .describe(
          "Field value — use singleSelectOptionId for Status/Priority, text for text fields, number for number fields, date (YYYY-MM-DD) for date fields, iterationId for iteration fields"
        ),
    },
    async ({ project_id, item_id, field_id, value }) => {
      try {
        const mutation = `
          mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: ProjectV2FieldValue!) {
            updateProjectV2ItemFieldValue(input: {
              projectId: $projectId
              itemId: $itemId
              fieldId: $fieldId
              value: $value
            }) {
              projectV2Item {
                id
              }
            }
          }
        `;
        const data = await githubGraphQL(mutation, {
          projectId: project_id,
          itemId: item_id,
          fieldId: field_id,
          value,
        });
        return {
          content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error}` }],
          isError: true,
        };
      }
    }
  );

  // Add an item to a project
  server.tool(
    "github_add_project_item",
    "Add an existing issue/PR to a GitHub Project V2, or create a draft issue on it",
    {
      project_id: z.string().describe("Project node ID"),
      content_id: z.string().optional().describe("Issue or PR node ID to add (omit for draft issue)"),
      draft_title: z.string().optional().describe("Title for a new draft issue (omit content_id to use)"),
      draft_body: z.string().optional().describe("Body for the draft issue"),
    },
    async ({ project_id, content_id, draft_title, draft_body }) => {
      try {
        if (content_id) {
          const mutation = `
            mutation($projectId: ID!, $contentId: ID!) {
              addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
                item { id }
              }
            }
          `;
          const data = await githubGraphQL(mutation, { projectId: project_id, contentId: content_id });
          return {
            content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
          };
        } else if (draft_title) {
          const mutation = `
            mutation($projectId: ID!, $title: String!, $body: String) {
              addProjectV2DraftIssue(input: { projectId: $projectId, title: $title, body: $body }) {
                projectItem { id }
              }
            }
          `;
          const data = await githubGraphQL(mutation, {
            projectId: project_id,
            title: draft_title,
            body: draft_body ?? null,
          });
          return {
            content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
          };
        } else {
          throw new Error("Either content_id (for existing issue/PR) or draft_title (for draft issue) is required");
        }
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error}` }],
          isError: true,
        };
      }
    }
  );

  // List comments on an issue
  server.tool(
    "github_list_issue_comments",
    "List comments on a GitHub issue",
    {
      owner: z.string().describe("Repository owner"),
      repo: z.string().describe("Repository name"),
      issue_number: z.number().describe("Issue number"),
    },
    async ({ owner, repo, issue_number }) => {
      try {
        const comments = await githubRest(`/repos/${owner}/${repo}/issues/${issue_number}/comments`);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(comments, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error}` }],
          isError: true,
        };
      }
    }
  );

  // Add a comment to an issue
  server.tool(
    "github_add_issue_comment",
    "Add a comment to a GitHub issue",
    {
      owner: z.string().describe("Repository owner"),
      repo: z.string().describe("Repository name"),
      issue_number: z.number().describe("Issue number"),
      body: z.string().describe("Comment body (Markdown supported)"),
    },
    async ({ owner, repo, issue_number, body }) => {
      try {
        const comment = await githubRest(
          `/repos/${owner}/${repo}/issues/${issue_number}/comments`,
          "POST",
          { body }
        );
        return {
          content: [{ type: "text" as const, text: JSON.stringify(comment, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error}` }],
          isError: true,
        };
      }
    }
  );

  // List sub-issues for a parent issue
  server.tool(
    "github_list_sub_issues",
    "List sub-issues for a GitHub issue",
    {
      owner: z.string().describe("Repository owner"),
      repo: z.string().describe("Repository name"),
      issue_number: z.number().describe("Parent issue number"),
    },
    async ({ owner, repo, issue_number }) => {
      try {
        const subIssues = await githubRest(`/repos/${owner}/${repo}/issues/${issue_number}/sub_issues`);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(subIssues, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error}` }],
          isError: true,
        };
      }
    }
  );

  // Update an issue
  server.tool(
    "github_update_issue",
    "Update a GitHub issue (title, body, state, labels, assignees)",
    {
      owner: z.string().describe("Repository owner"),
      repo: z.string().describe("Repository name"),
      issue_number: z.number().describe("Issue number"),
      title: z.string().optional().describe("New issue title"),
      body: z.string().optional().describe("New issue body"),
      state: z.enum(["open", "closed"]).optional().describe("Set issue state"),
      labels: z.array(z.string()).optional().describe("Replace labels with this list"),
      assignees: z.array(z.string()).optional().describe("Replace assignees with this list of usernames"),
    },
    async ({ owner, repo, issue_number, title, body, state, labels, assignees }) => {
      try {
        const updates: Record<string, unknown> = {};
        if (title !== undefined) updates.title = title;
        if (body !== undefined) updates.body = body;
        if (state !== undefined) updates.state = state;
        if (labels !== undefined) updates.labels = labels;
        if (assignees !== undefined) updates.assignees = assignees;

        const issue = await githubRest(
          `/repos/${owner}/${repo}/issues/${issue_number}`,
          "PATCH",
          updates
        );
        return {
          content: [{ type: "text" as const, text: JSON.stringify(issue, null, 2) }],
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
