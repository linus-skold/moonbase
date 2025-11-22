import { Card } from '@/components/ui/card';
import type { GroupedInboxItems } from '@/lib/schema/inbox.schema';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { VscAzureDevops } from "react-icons/vsc";
import React from 'react';
import { InboxItemCard } from './InboxItemCard';
import { InstanceProvider } from '@/components/inbox/InstanceContext';

interface GroupedInboxViewProps {
  groupedItems: GroupedInboxItems;
}

export function GroupedInboxView({ groupedItems }: GroupedInboxViewProps) {
  const [expandedProjects, setExpandedProjects] = React.useState<Set<string>>(
    new Set(Object.keys(groupedItems))
  );

  const toggleProject = (projectKey: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectKey)) {
        next.delete(projectKey);
      } else {
        next.add(projectKey);
      }
      return next;
    });
  };

  const projectKeys = Object.keys(groupedItems).sort((a, b) => {
    const aItems = groupedItems[a].items.length;
    const bItems = groupedItems[b].items.length;
    return bItems - aItems;
  });

  if (projectKeys.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <p className="text-lg mb-2">No items in your inbox</p>
          <p className="text-sm">Configure your Azure DevOps instances to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {projectKeys.map((projectKey) => {
        const group = groupedItems[projectKey];
        const isExpanded = expandedProjects.has(projectKey);

        return (
          <Card key={projectKey} className="overflow-hidden">
            <button
              onClick={() => toggleProject(projectKey)}
              className="w-full px-4 flex items-center gap-2 transition-colors text-left group"
            >
              <div className="p-2 -m-2 rounded-full transition-colors group-hover:bg-accent">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 flex-shrink-0" />
                )}
              </div>
              {/* <Folder className="h-4 w-4 flex-shrink-0 text-muted-foreground" /> */}
              <VscAzureDevops className="h-4 w-4 flex-shrink-0 text-azure-blue" />
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold truncate">{group.project.name}</h2>
                <p className="text-xs text-muted-foreground">{group.instance.name}</p>
              </div>
              <span className="px-2 py-1 bg-primary text-primary-foreground rounded-md text-xs font-medium">
                {group.items.length}
              </span>
            </button>

            {isExpanded && (
              <div className="border-t">
                <div className="p-4 space-y-2">
                  <InstanceProvider instance={group.instance}>
                    {group.items.map((item) => (
                      <InboxItemCard key={item.id} item={item} />
                    ))}
                  </InstanceProvider>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
