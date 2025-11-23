// components/inbox-card/ItemAssignment.tsx
import React from 'react';

interface ItemAssignmentProps {
  assignedTo: {
    displayName: string;
    imageUrl?: string;
  };
}

export function ItemAssignment({ assignedTo }: ItemAssignmentProps) {
  const [imageError, setImageError] = React.useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex items-center gap-1 truncate">
      {assignedTo.imageUrl && !imageError ? (
        <img
          src={assignedTo.imageUrl}
          alt={assignedTo.displayName}
          className="h-4 w-4 rounded-full"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[8px] font-semibold">
          {getInitials(assignedTo.displayName)}
        </div>
      )}
      <span className="truncate">{assignedTo.displayName}</span>
    </div>
  );
}