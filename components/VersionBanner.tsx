import { checkVersion } from "@/lib/version-check";
import { AlertCircle } from "lucide-react";
import SystemNotificationBanner from "./banner/banner";

export async function VersionBanner() {
  const versionStatus = await checkVersion();

  if (
    versionStatus.error ||
    versionStatus.isUpToDate ||
    versionStatus.isAhead
  ) {
    // Don't show banner if there's an error, if up to date, or if local is ahead
    return null;
  }

  return (
    <SystemNotificationBanner variant="important">
      <div className="flex items-center justify-center gap-2">
        <p>
          New version available on GitHub ({versionStatus.remoteHash}) • Your
          version: {versionStatus.localHash} •{" "}
          <a
            href={`https://github.com/linus-skold/moonbase/tree/${versionStatus.branch}`}
            className="underline font-semibold hover:text-amber-50"
            target="_blank"
            rel="noopener noreferrer"
          >
            Update now
          </a>
        </p>
      </div>
    </SystemNotificationBanner>
  );
}
