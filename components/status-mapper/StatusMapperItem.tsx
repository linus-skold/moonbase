import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ColorPickerButton } from "@/components/color-picker/ColorPickerButton";
import { StatusMapping } from "@/lib/schema/statusMapping.schema";

interface StatusMapperItemProps {
  index: number;
  mapping: StatusMapping;
  onChange?: (mapping: StatusMapping) => void;
  onDelete?: (index: number) => void;
}


const StatusMapperItem = ({
  index,
  mapping,
  onChange,
  onDelete
}: StatusMapperItemProps) => {

  const mappingChange = (newMapping: StatusMapping) => {
    if (onChange) {
      onChange(newMapping);
    }
  };


  return (
    <div key={index} className="flex items-center gap-2">
      <Input
        type="text"
        value={mapping.status}
        onChange={(e) => {
          mappingChange({ ...mapping, status: e.target.value });
        }}
        placeholder="Status (e.g., Active)"
      />

      <ColorPickerButton
        value={mapping.color ?? "#ffffff"}
        onChange={(color) => {
          mappingChange({ ...mapping, color });
        }}
      />
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete && onDelete(index)}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>

    </div>
  );
};

export default StatusMapperItem;
