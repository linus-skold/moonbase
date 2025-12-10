import React, { useState } from "react";

import { TypedItem } from "@/lib/schema/item.schema";
import { Ban, ChevronDown, Mail, MailOpen, MoreVertical } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { VscAzureDevops, VscGitCommit, VscGithub } from "react-icons/vsc";
import { Badge } from "@/components/ui/badge";
import { Card } from "../ui/card";
import { ItemStatusIndicator } from "../inbox-card/ItemStatusIndicator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { Project } from "@/lib/schema/project.schema";


const getInstanceIcon = (instanceType: string) => {
  switch (instanceType) {
    case "ado":
      return VscAzureDevops;
    case "gh":
      return VscGithub;
    default:
      return VscGitCommit; // Fallback icon
  }
};

const integrationColor: Record<string, string> = {
  ado: "text-blue-600",
};

type ProjectCardComponentProps = {
  group: Project;
  instanceType?: string;
  children?: React.ReactNode;
  className?: string;
  onMarkAllAsRead?: () => void;
  onMarkAllAsUnread?: () => void;
};

export const ProjectCardComponent = ({
  group,
  instanceType,
  children,
  onMarkAllAsRead,
  onMarkAllAsUnread,
}: ProjectCardComponentProps) => {
  const [expanded, setExpanded] = useState(false);

  const IntegrationIcon = getInstanceIcon(instanceType || "");

  const childCount = React.Children.count(children);
  const childItems: TypedItem[] = [];
  
  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child)) {
      const item = (child?.props as any)?.item as TypedItem | undefined;
      if (item) {
        childItems.push(item);
      }
    }
  });
  
  const hasNew = childItems.some(item => item.unread);

  return (
    <Card className={hasNew ? "border-blue-500/90" : ""}>
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <div className="w-full px-4 flex items-center gap-2 transition-colors">
            <CollapsibleTrigger className="flex items-center gap-2 flex-1 min-w-0 text-left">
              {hasNew && <ItemStatusIndicator className="bg-blue-500" />}
              <ChevronDown
                className={`h-4 w-4 flex-shrink-0 transition-transform duration-300 ${
                  expanded ? "" : "-rotate-90"
                }`}
              />
              <IntegrationIcon
                className={`w-4 h-4 flex-shrink-0 ${
                  integrationColor[instanceType || ""] || ""
                }`}
              />
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold truncate flex items-center gap-2">
                  {group.project}
                </h2>

                <p className="text-xs text-muted-foreground">
                  {group.organization}
                </p>
              </div>
            </CollapsibleTrigger>

            <Badge className="font-semibold bg-blue-500/90 text-sidebar-accent-foreground">
              {childCount}
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <MoreVertical size="icon" className="rounded-full" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                { hasNew ? (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onMarkAllAsRead) {
                      onMarkAllAsRead();
                    }
                  }}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Mark All as Read
                </DropdownMenuItem>

                ) : (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onMarkAllAsUnread) {
                      onMarkAllAsUnread();
                    }
                  }}
                >
                  <MailOpen className="mr-2 h-4 w-4" />
                  Mark All as Unread
                </DropdownMenuItem>
                )}
                <DropdownMenuItem disabled>
                  <Ban className="mr-2 h-4 w-4" />
                  Ignore Project (Coming Soon)
                </DropdownMenuItem>

              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <CollapsibleContent>
            <Separator className="my-6" />
            <div className="px-4 space-y-2">
              {children}
            </div>
          </CollapsibleContent>
        </Collapsible>
    </Card>
  );
};
