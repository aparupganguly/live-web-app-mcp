/** inspect-url view — link preview card for a fetched web page. */
import {
  ThemeProvider,
  useHostContext,
  useOpenExternal,
  useToolContext,
  type RegisteredTools,
} from "mcp-use/react";
import { useState } from "react";

import { ExternalLinkIcon } from "./icons.js";
import "./view.css";

type PageInfo = RegisteredTools["inspect-url"]["output"];

export default function InspectUrlView() {
  const view = useToolContext<"inspect-url">();

  return (
    <ThemeProvider>
      <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white dark:border-white/10 dark:bg-black">
        {view.status === "pending" ? (
          <PreviewSkeleton />
        ) : view.status === "error" ? (
          <PreviewError message={view.error.message} />
        ) : (
          <PreviewCard page={view.toolOutput} />
        )}
      </div>
    </ThemeProvider>
  );
}

function PreviewCard({ page }: { page: PageInfo }) {
  const openExternal = useOpenExternal();
  const { hostCapabilities } = useHostContext();
  // Hide the image if it fails to load (broken URL or blocked by host CSP).
  const [imageFailed, setImageFailed] = useState(false);

  const domain = new URL(page.url).hostname.replace(/^www\./, "");
  const canOpenExternal = hostCapabilities?.openLinks !== undefined;

  return (
    <>
      {page.image && !imageFailed && (
        <img
          src={page.image}
          alt=""
          className="preview-image block w-full bg-zinc-100 dark:bg-zinc-900"
          onError={() => setImageFailed(true)}
        />
      )}
      <div className="flex flex-col gap-2 p-5">
        <h1 className="m-0 text-lg font-semibold leading-snug text-neutral-900 dark:text-neutral-100">
          {page.title ?? domain}
        </h1>
        {page.description && (
          <p className="m-0 line-clamp-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            {page.description}
          </p>
        )}
        <a
          href={page.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-fit items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
          onClick={(event) => {
            // Views run in a sandbox, so ask the host to open the link when it can.
            if (!canOpenExternal) return;
            event.preventDefault();
            void openExternal({ url: page.url });
          }}
        >
          {domain}
          <ExternalLinkIcon />
        </a>
      </div>
    </>
  );
}

function PreviewSkeleton() {
  return (
    <div aria-busy className="animate-pulse">
      <div className="preview-image w-full bg-zinc-200 dark:bg-zinc-800" />
      <div className="flex flex-col gap-3 p-5">
        <span className="h-5 w-2/3 rounded-sm bg-zinc-200 dark:bg-zinc-800" />
        <span className="h-4 w-full rounded-sm bg-zinc-200 dark:bg-zinc-800" />
        <span className="h-3 w-1/4 rounded-sm bg-zinc-200 dark:bg-zinc-800" />
      </div>
    </div>
  );
}

function PreviewError({ message }: { message: string }) {
  return (
    <div className="p-5" role="alert">
      <h1 className="m-0 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        Couldn't inspect URL
      </h1>
      <p className="mt-2 mb-0 text-sm text-red-500">{message}</p>
    </div>
  );
}
