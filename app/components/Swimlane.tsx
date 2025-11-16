"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay
} from "@dnd-kit/core";

import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

import SortableItem from "./SortableItem";

export default function Swimlane() {
  const [lanes, setLanes] = useState({
    todo: ["Task 1", "Task 2", "Task 3"],
    progress: ["Task A"],
    done: ["Task ✔"],
  });

  const [activeItem, setActiveItem] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = (event) => {
    setActiveItem(event.active.id);
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    let activeLane, overLane;

    // find which lanes the items belong to
    for (const lane of Object.keys(lanes)) {
      if (lanes[lane].includes(activeId)) activeLane = lane;
      if (lanes[lane].includes(overId)) overLane = lane;
    }

    // moving between lanes
    if (activeLane && overLane && activeLane !== overLane) {
      setLanes((prev) => {
        const activeItems = [...prev[activeLane]];
        const overItems = [...prev[overLane]];

        activeItems.splice(activeItems.indexOf(activeId), 1);
        const overIndex = overItems.indexOf(overId);

        overItems.splice(overIndex + 1, 0, activeId);

        return {
          ...prev,
          [activeLane]: activeItems,
          [overLane]: overItems,
        };
      });
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) {
      setActiveItem(null);
      return;
    }

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) {
      setActiveItem(null);
      return;
    }

    // find lanes
    let lane;
    for (const l of Object.keys(lanes)) {
      if (lanes[l].includes(activeId)) lane = l;
    }

    setLanes((prev) => {
      const items = [...prev[lane]];
      const oldIndex = items.indexOf(activeId);
      const newIndex = items.indexOf(overId);

      return {
        ...prev,
        [lane]: arrayMove(items, oldIndex, newIndex),
      };
    });

    setActiveItem(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto p-4">
        {Object.entries(lanes).map(([laneKey, items]) => (
          <Card key={laneKey} className="min-w-[280px] flex-shrink-0">
            <CardHeader>
              <CardTitle className="text-lg capitalize">
                {laneKey.replace("-", " ")}
              </CardTitle>
            </CardHeader>

            <ScrollArea className="h-[400px]">
              <CardContent className="space-y-2">
                <SortableContext
                  items={items}
                  strategy={verticalListSortingStrategy}
                >
                  {items.map((id) => (
                    <SortableItem key={id} id={id} />
                  ))}
                </SortableContext>
              </CardContent>
            </ScrollArea>
          </Card>
        ))}
      </div>

      <DragOverlay>
        {activeItem ? (
          <div className="rounded-md border p-2 bg-muted shadow">
            {activeItem}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
