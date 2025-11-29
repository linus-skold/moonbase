import { Inbox, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";


export const NotificationPopupContainer = ({
  show,
  onClick,
  buttonText,
  actionButtonIcon,
  colorScheme = 'blue',
}: {
  buttonText: {
    action: string;
    dismiss: string;
  },
  actionButtonIcon?: LucideIcon,
  colorScheme?: 'blue' | 'green' | 'red' | 'yellow',
  show: boolean;
  onClick: (refresh: boolean) => void;
}) => {
  if (!show) {
    return null;
  }

  const ActionIcon = actionButtonIcon as LucideIcon;

  const colorClasses = {
    blue: {
      card: 'bg-blue-500/10 border-blue-500',
      icon: 'text-blue-500'
    },
    green: {
      card: 'bg-green-500/10 border-green-500',
      icon: 'text-green-500'
    },
    red: {
      card: 'bg-red-500/10 border-red-500',
      icon: 'text-red-500'
    },
    yellow: {
      card: 'bg-yellow-500/10 border-yellow-500',
      icon: 'text-yellow-500'
    }
  };

  return (
    <Card className={`p-4 mb-4 ${colorClasses[colorScheme].card}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Inbox className={`h-4 w-4 ${colorClasses[colorScheme].icon}`} />
          <span className="text-sm font-medium">New items are available</span>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => onClick(true)} size="sm" variant="default">
            {actionButtonIcon && <ActionIcon className="h-4 w-4 mr-2" />}
            {buttonText.action}
          </Button>
          <Button
            onClick={() => onClick(false)}
            size="sm"
            variant="ghost"
          >
            {buttonText.dismiss}
          </Button>
        </div>
      </div>
    </Card>
  );
};
