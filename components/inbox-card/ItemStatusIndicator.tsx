export const ItemStatusIndicator = ({ color, className }: { color?: string; className?: string }) => {
  
  
  return (
    <div
      className={`h-2 w-2 rounded-full flex-shrink-0  ${className || ""}`}
      style={{
        backgroundColor: color,
      }}
    >
      <div
        className={`h-2 w-2 rounded-full flex-shrink-0 animate-ping ${className || ""}`}
        style={{
          backgroundColor: color,
        }}
      />
    </div>
  );
};
