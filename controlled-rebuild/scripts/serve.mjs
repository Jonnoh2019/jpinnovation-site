import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const root = normalize(join(import.meta.dirname, ".."));
const port = Number(process.env.PORT || 4173);
const mime = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

createServer((request, response) => {
  const requested = new URL(request.url || "/", `http://${request.headers.host}`).pathname;
  const relative = requested === "/" ? "index.html" : requested.replace(/^\/+/, "");
  const candidate = normalize(join(root, relative));
  const safe = candidate.startsWith(root) && existsSync(candidate) && statSync(candidate).isFile();
  const file = safe ? candidate : join(root, "index.html");
  response.writeHead(200, {
    "Content-Type": mime[extname(file)] || "application/octet-stream",
    "Cache-Control": "no-store"
  });
  createReadStream(file).pipe(response);
}).listen(port, "127.0.0.1", () => {
  console.log(`JP rebuild preview: http://127.0.0.1:${port}`);
});
