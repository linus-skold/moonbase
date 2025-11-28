

export const InboxRow = ({ children, className }: { children?: React.ReactNode, className?: string }) => {
  return (
    <div className={`flex gap-4 ${className || ''}`}>
      {children}
    </div>
  );
};


export const InboxHeader = ({ children }: { children?: React.ReactNode }) => {
  return (
    <div className="inbox-header flex flex-col gap-4">
      {children}
    </div>
  );
};