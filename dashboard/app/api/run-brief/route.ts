import { NextResponse } from "next/server";

// Fires the market-brief GitHub Actions workflow via a repository_dispatch
// event. workflow_dispatch would need an Actions-scoped token; repository_
// dispatch only needs Contents — which the dashboard's token already has.
// The workflow's `repository_dispatch: types: [run-brief]` trigger picks it up.

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export async function POST() {
  try {
    const owner = env("GITHUB_OWNER");
    const repo = env("GITHUB_REPO");
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/dispatches`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env("GITHUB_TOKEN")}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ event_type: "run-brief" }),
    });
    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json({ error: `GitHub API ${res.status}: ${body}` }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to trigger brief" }, { status: 500 });
  }
}
