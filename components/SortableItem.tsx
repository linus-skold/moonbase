import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";


export default function SortableItem({ id }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="rounded-md border p-2 bg-background shadow-sm cursor-grab active:cursor-grabbing text-sm"
    >
      {id}
    </div>
  );
}
