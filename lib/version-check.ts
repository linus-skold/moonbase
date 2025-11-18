"use server";

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export type VersionStatus = {
  isUpToDate: boolean;
  localHash: string;
  remoteHash: string;
  branch: string;
  error?: string;
};

export async function checkVersion(): Promise<VersionStatus> {
  try {
    // Get current branch
    const { stdout: branch } = await execAsync("git rev-parse --abbrev-ref HEAD");
    const currentBranch = branch.trim();

    // Get local commit hash
    const { stdout: localHash } = await execAsync("git rev-parse HEAD");
    const local = localHash.trim();

    // Fetch latest from remote without updating local refs
    await execAsync("git fetch origin --quiet");

    // Get remote commit hash for the current branch
    const { stdout: remoteHash } = await execAsync(
      `git rev-parse origin/${currentBranch}`
    );
    const remote = remoteHash.trim();

    return {
      isUpToDate: local === remote,
      localHash: local.substring(0, 7),
      remoteHash: remote.substring(0, 7),
      branch: currentBranch,
    };
  } catch (error) {
    console.error("Failed to check version:", error);
    return {
      isUpToDate: true, // Default to true to avoid annoying users if check fails
      localHash: "unknown",
      remoteHash: "unknown",
      branch: "unknown",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
