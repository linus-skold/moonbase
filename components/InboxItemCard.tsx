import { Card } from "@/components/ui/card";
import { TypedItem } from "@/lib/schema/item.schema";
import { ExternalLink, MailOpen, Mail } from "lucide-react";
import { ItemAssignment } from "./inbox-card/ItemAssignment";
import { ItemIcon } from "./inbox-card/ItemIcon";
import { DateTime } from "luxon";
import React from "react";
import { useBroker } from "@/lib/broker";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface InboxItemCardProps {
  item: TypedItem;
  onMarkAsRead?: (itemId: string) => void;
  onMarkAsUnread?: (itemId: string) => void;
}

export function InboxItemCard({
  item,
  onMarkAsRead,
  onMarkAsUnread,
}: InboxItemCardProps) {
  const broker = useBroker();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Mark as read immediately when clicked
    if (item.unread) {
      if (onMarkAsRead) {
        onMarkAsRead(item.id);
      } else {
        broker.markAsRead(item.id);
      }
    }
    // The link will open in a new tab, so we don't need to prevent default
  };

  const handleMarkAsReadClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onMarkAsRead) {
      onMarkAsRead(item.id);
    } else {
      broker.markAsRead(item.id);
    }
  };

  const handleMarkAsUnreadClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onMarkAsUnread) {
      onMarkAsUnread(item.id);
    } else {
      broker.markAsUnread(item.id);
    }
  };

  return (
    <Card className="p-0 border-0">
      <div
        className={`flex gap-3 border rounded-lg hover:bg-accent/50 transition-colors hover:border-muted-blue-border ${
          item.unread ? "bg-accent/70 border-muted-blue-border" : "bg-card"
        }`}
      >
        {item.unread && (
          <div className="flex-shrink-0 w-1 bg-blue-500 rounded-l" />
        )}

        <div
          className={`flex gap-3 flex-1 min-w-0 py-3 pr-3  ${
            item.unread ? "" : "pl-4"
          }`}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <ItemIcon item={item} />
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleClick}
                className="hover:underline flex-1 min-w-0 flex items-center gap-2"
              >
                <h3 className="font-medium text-sm truncate flex-1 flex items-center gap-2">
                  {item.title}
                  <ExternalLink className="inline-block ml-1 h-3 w-3 text-muted-foreground align-text-top" />
                </h3>
              </a>

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
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {item.unread ? (
                    <DropdownMenuItem onClick={handleMarkAsReadClick}>
                      <Mail className="mr-2 h-4 w-4" />
                      Mark as Read
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={handleMarkAsUnreadClick}>
                      <MailOpen className="mr-2 h-4 w-4" />
                      Mark as Unread
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="pl-6">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>
                  {DateTime.fromMillis(item.updateTimestamp ?? 0).toRelative()}
                </span>
                {item.assignee && <ItemAssignment assignedTo={item.assignee} />}
              </div>

              {item.status && (
                <div className="mt-2">
                  <Badge className="bg-muted-green-300 font-semibold border-1 border-muted-green-border text-white">
                    {item.status}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
