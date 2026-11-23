import { MCPServer } from "mcp-use";
import { z } from "zod";

import { fetchPageMeta } from "./src/page-meta.js";

const server = new MCPServer({
  name: "live-web-app",
  title: "live-web-app", // Human readable name of the server
  version: "1.0.0",
  description: "an mcp-use app",
  instructions: "use show-app to open the app view", // Model-facing guidance — surfaced to the LLM by compatible clients.
  websiteUrl: "https://mcp-use.com",
  // Icons for your MCP Server, from public/ (or absolute URLs).
  icons: [
    {
      src: "icon.svg",
      mimeType: "image/svg+xml",
      sizes: ["512x512"],
    },
  ],

  // The MCP server is by default served at /mcp, to customise
  // basePath: "/mcp",

  // mcp-use has 1 line adapter for OAuth, import from mcp-use/oauth/*
  // oauth: oauthClerkProvider(), // zero-config via MCP_USE_OAUTH_CLERK_FRONTEND_API_URL, import from mcp-use/oauth/*

  // When OAuth is on, the HTML landing page (/mcp) is protected by default, set to true to keep the landing page public while /mcp stays bearer-protected.
  // publicLandingPage: true,
});

// TOOLS

// tool inputs are zod schemas. Important: set decriptions for the model to understand the input.
const showAppInputSchema = z.object({
  appName: z
    .string()
    .optional()
    .describe(
      "Optional title shown in the MCP App card instead of the default"
    ),
});

// tool outputs are zod schemas. Important: set descriptions for the model to understand the output.
const showAppOutputSchema = z.object({
  message: z.string().describe("Message to display in the MCP App"),
});

export const showApp = server.tool(
  {
    name: "show-app", // Unique tool id on the wire.
    title: "Show MCP App", // Short label in inspector and client UIs (falls back to name).
    description: "Display the MCP App starter view", // LLM-facing summary of what the tool does.
    inputSchema: showAppInputSchema, // Validated before the handler runs; .describe() text becomes LLM hints.
    outputSchema: showAppOutputSchema, // Required when binding a view — the view reads structuredContent typed by this.
    view: {
      name: "my-view", // directory under views/
      description: "MCP App starter card with interactive demo hooks",
      prefersBorder: false, // ask the host to skip a card border around the view
      csp: {
        resourceDomains: [
          "https://fonts.googleapis.com",
          "https://fonts.gstatic.com",
        ],
      },
    },
    // Behavioral hints for clients (readOnly / destructive / open-world).
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
  async ({ appName }, ctx) => {
    // Brief delay so the pending skeleton is visible during dev/inspector demos.
    await new Promise((resolve) => setTimeout(resolve, 1500));

    console.log(`The app name was: ${appName}`);
    const data = { message: `The MCP App starter for ${appName} is ready!` };

    return {
      content: [{ type: "text", text: data.message }],
      structuredContent: data,
    };
  }
);

// say-hello — plain tool (no view); used by the Say Hello button in my-view
const sayHelloInputSchema = z.object({
  name: z.string().describe("Name to greet"),
});

const sayHelloOutputSchema = z.object({
  greeting: z.string().describe("Greeting to display"),
});

export const sayHello = server.tool(
  {
    name: "say-hello",
    title: "Say hello",
    description: "Returns a greeting for the Say Hello button demo",
    inputSchema: sayHelloInputSchema,
    outputSchema: sayHelloOutputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
  async ({ name }) => {
    const data = { greeting: `Hello, ${name}! it's Aparup 👋 this came from my MCP server` };
    return {
      content: [{ type: "text", text: data.greeting }],
      structuredContent: data,
    };
  }
);

// inspect-url — fetches a page and renders a link preview card in the inspect-url view
const inspectUrlInputSchema = z.object({
  url: z
    .url({
      protocol: /^https?$/,
      error: "Enter a valid http(s) URL, e.g. https://example.com",
    })
    .describe("Absolute http(s) URL of the page to inspect"),
});

const inspectUrlOutputSchema = z.object({
  url: z.string().describe("Final URL after redirects"),
  title: z.string().optional().describe("Page title"),
  description: z.string().optional().describe("Meta description"),
  image: z
    .string()
    .optional()
    .describe("Absolute og:image (or twitter:image) URL"),
});

export const inspectUrl = server.tool(
  {
    name: "inspect-url",
    title: "Inspect URL",
    description:
      "Fetch a web page and show its title, description and preview image",
    inputSchema: inspectUrlInputSchema,
    outputSchema: inspectUrlOutputSchema,
    view: {
      name: "inspect-url", // directory under views/
      description: "Link preview card for a fetched web page",
      prefersBorder: false,
      csp: {
        // og:image can live on any host, so allow https images from anywhere.
        resourceDomains: ["https:"],
      },
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: true, // reaches arbitrary external sites
    },
  },
  async ({ url }) => {
    const result = await fetchPageMeta(url);
    if (!result.ok) {
      return {
        isError: true,
        content: [{ type: "text", text: result.error }],
      };
    }

    const data = result.meta;
    const summary = [
      `Title: ${data.title ?? "(none)"}`,
      `Description: ${data.description ?? "(none)"}`,
      `Image: ${data.image ?? "(none)"}`,
      `Final URL: ${data.url}`,
    ].join("\n");

    return {
      content: [{ type: "text", text: summary }],
      structuredContent: data,
    };
  }
);

export default server;
