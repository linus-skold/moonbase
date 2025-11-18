import { AccordionContent } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { StatusMapping } from "@/lib/schema/statusMapping.schema";

const StatusMapperContent = ({
  children,
  addMapping,
}: {
  children: React.ReactNode;
  addMapping: (mapping: StatusMapping) => void;
}) => {
  return (
    <AccordionContent>
      <Button
        variant="outline"
        size="icon"
        className="rounded-full"
        onClick={() => {
          // Add new empty mapping, consider how to handle types in future
          addMapping({ type: "workItem", status: "", color: "" });
        }}
      >
        <PlusIcon />
      </Button>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {children}
      </div>
    </AccordionContent>
  );
};

export default StatusMapperContent;
