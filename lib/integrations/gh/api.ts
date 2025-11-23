/// Create an implementation of the GitHub API using Octokit

import { Octokit } from "@octokit/rest";

export async function fetchAuthenticatedUser(
  pat: string
): Promise<{ login: string; id: number } | null> {
  try {
    const octokit = new Octokit({
      auth: pat,
    });

    const { data } = await octokit.rest.users.getAuthenticated();
    return { login: data.login, id: data.id };
  } catch (error) {
    console.error("Error fetching authenticated GitHub user:", error);
    return null;
  }
}
