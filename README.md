# MCP Server built with mcp-use

This is an MCP server project bootstrapped with [`create-mcp-use-app`](https://mcp-use.com/docs/typescript/getting-started/quickstart).

## Getting Started

First, run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000/mcp/inspector](http://localhost:3000/mcp/inspector) with your browser to test your server.

You can start building by editing the entry file. Add tools, resources, and prompts — the server auto-reloads as you edit.

Open [http://localhost:3000/mcp](http://localhost:3000/mcp) in a browser to see the landing page. Edit `landing.tsx` to change it (Tailwind classes work with no extra setup), or delete it to use the built-in page.

Run `npm run typecheck` to refresh MCP view types and check the project with its local TypeScript compiler. Statically declared tools used by views must be assigned to exported constants.

## inspect-url

`inspect-url` fetches a web page on the server and shows a link preview card: image (`og:image`, falling back to `twitter:image`), title, description and domain. The model gets a short text summary; the card reads the same fields from `structuredContent`. Invalid URLs, non-2xx responses, non-HTML pages and slow sites (8s timeout) come back as a clear error instead of a crash.

To try it, run `npm run dev`, open the Inspector, pick the `inspect-url` tool, enter a URL such as `https://github.com` and run it. Try `https://httpbin.org/json` to see the error state.

## Learn More

To learn more about mcp-use and MCP:

- [mcp-use Documentation](https://mcp-use.com/docs/typescript/getting-started/quickstart) — guides, API reference, and tutorials

## Deploy on Manufact Cloud

```bash
npm run deploy
```
