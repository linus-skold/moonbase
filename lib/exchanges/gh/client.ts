import { Octokit } from "@octokit/rest";
import type { GhInstance } from "./schema/instance.schema";

type OctokitRepository = Awaited<ReturnType<Octokit['rest']['repos']['listForAuthenticatedUser']>>['data'][0];
type OctokitPullRequest = Awaited<ReturnType<Octokit['rest']['pulls']['list']>>['data'][0];
type OctokitIssue = Awaited<ReturnType<Octokit['rest']['issues']['listForRepo']>>['data'][0];
type OctokitSearchIssue = Awaited<ReturnType<Octokit['rest']['search']['issuesAndPullRequests']>>['data']['items'][0];

export class GhClient {
  private octokit: Octokit;
  private username: string;

  constructor(instance: GhInstance) {
    this.octokit = new Octokit({
      auth: instance.personalAccessToken,
    });
    this.username = instance.username;
  }

  async getAuthenticatedUser(): Promise<{ login: string; id: number }> {
    const { data } = await this.octokit.rest.users.getAuthenticated();
    return { login: data.login, id: data.id };
  }

  async getRepositories() {
    const { data } = await this.octokit.rest.repos.listForAuthenticatedUser({
      sort: "updated",
      per_page: 100,
    });
    return data;
  }

  async getPullRequestsAssignedToMe(): Promise<OctokitSearchIssue[]> {
    // Search for PRs where the current user is assigned as a reviewer or assignee
    const searchQuery = `is:pr is:open review-requested:${this.username}`;
    const { data } = await this.octokit.rest.search.issuesAndPullRequests({
      q: searchQuery,
      per_page: 100,
    });
    return data.items;
  }

  async getPullRequestsCreatedByMe(): Promise<OctokitSearchIssue[]> {
    const searchQuery = `is:pr is:open author:${this.username}`;
    const { data } = await this.octokit.rest.search.issuesAndPullRequests({
      q: searchQuery,
      per_page: 100,
    });
    return data.items;
  }

  async getIssuesAssignedToMe(): Promise<OctokitSearchIssue[]> {
    // Search for issues (not PRs) assigned to the current user
    const searchQuery = `is:issue is:open assignee:${this.username}`;
    const { data } = await this.octokit.rest.search.issuesAndPullRequests({
      q: searchQuery,
      per_page: 100,
    });
    return data.items;
  }

  async getRepositoryPullRequests(
    owner: string,
    repo: string,
    state: "open" | "closed" | "all" = "open"
  ) {
    const { data } = await this.octokit.rest.pulls.list({
      owner,
      repo,
      state,
      per_page: 100,
    });
    return data;
  }

  async getRepositoryIssues(
    owner: string,
    repo: string,
    state: "open" | "closed" | "all" = "open"
  ) {
    const { data } = await this.octokit.rest.issues.listForRepo({
      owner,
      repo,
      state,
      per_page: 100,
    });
    return data;
  }

  async getRepository(owner: string, repo: string) {
    const { data } = await this.octokit.rest.repos.get({
      owner,
      repo,
    });
    return data;
  }
}
