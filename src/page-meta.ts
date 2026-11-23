// Fetches an HTML page and extracts the fields used by the inspect-url tool.
// Uses only built-in fetch and regex parsing (no HTML parser dependency).

const FETCH_TIMEOUT_MS = 8000;
const MAX_HTML_BYTES = 1_000_000;
// Identify as a link-preview bot; some sites block requests with no user agent.
const USER_AGENT = "Mozilla/5.0 (compatible; live-web-app-inspect-url/1.0)";

export type PageMeta = {
  url: string;
  title?: string;
  description?: string;
  image?: string;
};

export type PageMetaResult =
  | { ok: true; meta: PageMeta }
  | { ok: false; error: string };

export async function fetchPageMeta(url: string): Promise<PageMetaResult> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": USER_AGENT,
      },
    });

    if (!res.ok) {
      await res.body?.cancel();
      return { ok: false, error: `${url} responded with HTTP ${res.status}` };
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) {
      await res.body?.cancel();
      return {
        ok: false,
        error: `${url} is not an HTML page (content-type: ${contentType || "unknown"})`,
      };
    }

    // res.url is the final URL after redirects.
    return { ok: true, meta: parsePageMeta(await readHtml(res), res.url) };
  } catch (err) {
    // AbortSignal.timeout rejects with a DOMException named "TimeoutError".
    if (err instanceof Error && err.name === "TimeoutError") {
      return {
        ok: false,
        error: `Timed out after ${FETCH_TIMEOUT_MS / 1000}s fetching ${url}`,
      };
    }
    // Network errors carry the reason (e.g. ENOTFOUND) on err.cause.code.
    const cause = err instanceof Error ? err.cause : undefined;
    const code = (cause as { code?: string } | undefined)?.code;
    return {
      ok: false,
      error: `Could not fetch ${url}${code ? ` (${code})` : ""}`,
    };
  }
}

// Reads at most MAX_HTML_BYTES. Meta tags live in <head>, so the rest of a
// large page is skipped instead of being buffered in memory.
async function readHtml(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";

  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < MAX_HTML_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
  }
  await reader.cancel();
  return new TextDecoder().decode(Buffer.concat(chunks));
}

function parsePageMeta(html: string, pageUrl: string): PageMeta {
  const tags = readMetaTags(html);
  const image = tags["og:image"] ?? tags["twitter:image"];

  return {
    url: pageUrl,
    title: readTitle(html) ?? tags["og:title"],
    description: tags["description"] ?? tags["og:description"],
    image: image ? resolveHttpUrl(image, pageUrl) : undefined,
  };
}

function readTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? cleanText(match[1]) || undefined : undefined;
}

// Maps each <meta> name/property (lowercased) to its content; first one wins.
function readMetaTags(html: string): Record<string, string> {
  const tags: Record<string, string> = {};
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    const key = (readAttr(tag, "property") ?? readAttr(tag, "name"))?.toLowerCase();
    const content = cleanText(readAttr(tag, "content") ?? "");
    // Skip empty values so fallbacks (e.g. og:description) still apply.
    if (key && content && !(key in tags)) {
      tags[key] = content;
    }
  }
  return tags;
}

// Reads a double-quoted, single-quoted or unquoted attribute value.
function readAttr(tag: string, name: string): string | undefined {
  const match = tag.match(
    new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i")
  );
  return match ? (match[1] ?? match[2] ?? match[3]) : undefined;
}

// Resolves relative image URLs against the page URL; drops non-http(s) URLs.
function resolveHttpUrl(value: string, base: string): string | undefined {
  try {
    const resolved = new URL(value, base);
    return /^https?:$/.test(resolved.protocol) ? resolved.href : undefined;
  } catch {
    return undefined;
  }
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function cleanText(text: string): string {
  return decodeEntities(text).replace(/\s+/g, " ").trim();
}

function decodeEntities(text: string): string {
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (code.startsWith("#")) {
      const isHex = code[1].toLowerCase() === "x";
      const point = parseInt(code.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      return point <= 0x10ffff ? String.fromCodePoint(point) : entity;
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? entity;
  });
}
