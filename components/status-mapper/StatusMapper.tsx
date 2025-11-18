import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface StatusMapperProps {
  children?: React.ReactNode;
}

const StatusMapper = ({ children }: StatusMapperProps) => {
  return (
    <Accordion type="single" collapsible className="col-span-2 mt-4">
      <AccordionItem value={`status-mappings-TEMP+`}>
        <AccordionTrigger>Status Mappings (optional)</AccordionTrigger>
        {children}
      </AccordionItem>
    </Accordion>
  );
};

export default StatusMapper;
