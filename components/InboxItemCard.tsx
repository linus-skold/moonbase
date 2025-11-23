import { Card } from "@/components/ui/card";
import type { InboxItem } from "@/lib/schema/inbox.schema";
import { ExternalLink } from "lucide-react";
import { ItemAssignment } from "./inbox-card/ItemAssignment";
import { ItemIcon } from "./inbox-card/ItemIcon";
import { ItemStatusIndicator } from "./inbox-card/ItemStatusIndicator";
import { DateTime } from "luxon";

interface InboxItemCardProps {
  item: InboxItem;
}

export function InboxItemCard({ item }: InboxItemCardProps) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block transition-all hover:scale-[1.01]"
    >
      <Card className="p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start gap-3">
          <ItemIcon type={item.type} priority={item.priority} workItemKind={item.workItemKind} />

          <div className="flex-1 min-w-0">
            
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-sm truncate flex-1">
                {item.title}
                <ExternalLink className="inline-block ml-1 h-3 w-3 text-muted-foreground align-text-top" />
              </h3>
              <ItemStatusIndicator item={item} />
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{DateTime.fromISO(item.updatedDate).toRelative()}</span>

              {item.repository && (
                <span className="truncate">{item.repository.name}</span>
              )}

              {item.assignedTo && (
                <ItemAssignment assignedTo={item.assignedTo} />
              )}

              {item.workItemKind && (
                <span className="px-2 py-0.5 bg-secondary rounded-md">
                  {item.workItemKind}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>
    </a>
  );
}
