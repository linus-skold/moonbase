import { Card } from "@/components/ui/card";
import type { InboxItem } from "@/lib/schema/inbox.schema";
import { ExternalLink, MailOpen, Mail } from "lucide-react";
import { ItemAssignment } from "./inbox-card/ItemAssignment";
import { ItemIcon } from "./inbox-card/ItemIcon";
import { ItemStatusIndicator } from "./inbox-card/ItemStatusIndicator";
import { DateTime } from "luxon";
import React from "react";
import { useInboxContext } from "@/components/inbox/InboxContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";

interface InboxItemCardProps {
  item: InboxItem;
}

export function InboxItemCard({ item }: InboxItemCardProps) {
  const inboxContext = useInboxContext();
  
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Mark as read immediately when clicked
    if (item.isNew && inboxContext?.markAsRead) {
      inboxContext.markAsRead(item.id);
    }
    // The link will open in a new tab, so we don't need to prevent default
  };

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inboxContext?.markAsRead) {
      inboxContext.markAsRead(item.id);
    }
  };

  const handleMarkAsUnread = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inboxContext?.markAsUnread) {
      inboxContext.markAsUnread(item.id);
    }
  };

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="block transition-all hover:scale-[1.01]"
    >
      <Card className={`p-4 hover:shadow-md transition-shadow ${item.isNew ? 'ring-2 ring-primary/50 bg-primary/5' : ''}`}>
        <div className="flex items-start gap-3">
          <ItemIcon type={item.type} priority={item.priority} workItemKind={item.workItemKind} />

          <div className="flex-1 min-w-0">
            
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-sm truncate flex-1 flex items-center gap-2">
                {item.isNew && (
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                )}
                {item.title}
                <ExternalLink className="inline-block ml-1 h-3 w-3 text-muted-foreground align-text-top" />
              </h3>
              <ItemStatusIndicator item={item} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">More options</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {item.isNew ? (
                    <DropdownMenuItem onClick={handleMarkAsRead}>
                      <MailOpen className="mr-2 h-4 w-4" />
                      Mark as Read
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={handleMarkAsUnread}>
                      <Mail className="mr-2 h-4 w-4" />
                      Mark as Unread
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
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
