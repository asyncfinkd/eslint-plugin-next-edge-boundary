import path from "node:path";

export function formatChain(
  chain: string[],
  options: { cwd?: string } = {},
): string {
  const cwd = options.cwd ?? process.cwd();
  const lines = chain.map((item, index) => {
    const display = toDisplayPath(item, cwd);
    const indent = "  ".repeat(index);
    if (index === 0) {
      return `${indent}${display}`;
    }
    return `${indent}→ ${display}`;
  });
  return lines.join("\n");
}

function toDisplayPath(item: string, cwd: string): string {
  if (item.startsWith("node:") || !path.isAbsolute(item)) {
    return item;
  }
  const relative = path.relative(cwd, item);
  if (!relative || relative.startsWith("..")) {
    return item;
  }
  return relative.replaceAll("\\", "/");
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes}B`;
  }
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024;
    return `${kb >= 10 ? Math.round(kb) : kb.toFixed(1).replace(/\.0$/, "")}KB`;
  }
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1).replace(/\.0$/, "")}MB`;
}
