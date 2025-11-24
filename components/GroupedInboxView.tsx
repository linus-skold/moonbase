import { Card } from "@/components/ui/card";
import type { GroupedInboxItems } from "@/lib/schema/inbox.schema";
import { Button } from "@/components/ui/button";
import { ProjectCardComponent } from "@/components/project-group/ProjectGroup";

interface GroupedInboxViewProps {
  groupedItems: GroupedInboxItems;
  markAsRead?: (itemId: string) => void;
}


export function GroupedInboxView({ groupedItems, markAsRead }: GroupedInboxViewProps) {
  if (Object.keys(groupedItems).length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <p className="text-lg mb-2">No items in your inbox</p>
          <p className="text-sm">Configure your instances to get started</p>
          <Button variant="link" className="p-0 ml-1 hover:cursor-pointer">
            Go to Settings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.keys(groupedItems).map((projectKey) => {
        const group = groupedItems[projectKey];
        return (
          <Card key={projectKey} className="overflow-hidden">
            <ProjectCardComponent group={group} instanceType={group.instance.instanceType} />
          </Card>
        );
      })}
    </div>
  );
}
