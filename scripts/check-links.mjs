import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, normalize, resolve } from "node:path";

const root = process.cwd();
const ignored = /^(?:https?:|mailto:|tel:|#)/i;
const markdownFiles = [];

function walk(directory) {
  for (const entry of readdirSync(directory)) {
    if (entry === ".git" || entry === "node_modules") continue;
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) walk(path);
    else if (entry.endsWith(".md")) markdownFiles.push(path);
  }
}

walk(root);
const failures = [];

for (const file of markdownFiles) {
  const content = readFileSync(file, "utf8");
  const links = content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g);

  for (const match of links) {
    const raw = match[1].trim().replace(/^<|>$/g, "");
    if (!raw || ignored.test(raw)) continue;

    const withoutTitle = raw.split(/\s+["']/)[0];
    const pathPart = decodeURIComponent(withoutTitle.split("#")[0]);
    if (!pathPart) continue;

    const target = normalize(resolve(dirname(file), pathPart));
    if (!target.startsWith(root) || !existsSync(target)) {
      failures.push(`${file.slice(root.length + 1)} -> ${raw}`);
    }
  }
}

if (failures.length) {
  console.error("Broken local documentation links:\n" + failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log(`Checked ${markdownFiles.length} Markdown files: all local links resolve.`);
