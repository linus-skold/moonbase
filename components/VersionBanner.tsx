import { checkVersion } from "@/lib/version-check";
import { AlertCircle, CheckCircle } from "lucide-react";

export async function VersionBanner() {
  const versionStatus = await checkVersion();

  if (versionStatus.error || versionStatus.isUpToDate) {
    // Don't show banner if there's an error or if up to date
    return null;
  }

  return (
    <div className="w-full bg-amber-900/20 border-b border-amber-900/50 text-amber-100 text-center text-sm py-2">
      <div className="flex items-center justify-center gap-2">
        <AlertCircle className="h-4 w-4" />
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
    </div>
  );
}
