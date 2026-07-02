// Writes back to the git repo via GitHub's Contents API, so every edit made
// from the dashboard becomes a real commit — Vercel then auto-redeploys on
// push, which is how phone-made edits propagate back out to every device.

const API = "https://api.github.com";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

async function ghFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env("GITHUB_TOKEN")}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API ${res.status}: ${body}`);
  }
  return res.json();
}

export async function getFile(filePath: string): Promise<{ content: any; sha: string }> {
  const owner = env("GITHUB_OWNER");
  const repo = env("GITHUB_REPO");
  const branch = process.env.GITHUB_BRANCH || "master";
  const data = await ghFetch(`/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`);
  const content = Buffer.from(data.content, "base64").toString("utf-8");
  return { content: JSON.parse(content), sha: data.sha };
}

export async function putFile(filePath: string, json: unknown, sha: string, message: string): Promise<void> {
  const owner = env("GITHUB_OWNER");
  const repo = env("GITHUB_REPO");
  const branch = process.env.GITHUB_BRANCH || "master";
  const content = Buffer.from(JSON.stringify(json, null, 2) + "\n").toString("base64");
  await ghFetch(`/repos/${owner}/${repo}/contents/${filePath}`, {
    method: "PUT",
    body: JSON.stringify({ message, content, sha, branch }),
  });
}
