"use client";

import React from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ColorPicker,
  ColorPickerAlpha,
  ColorPickerEyeDropper,
  ColorPickerFormat,
  ColorPickerHue,
  ColorPickerOutput,
  ColorPickerSelection,
} from "@/components/ui/shadcn-io/color-picker";
import { ColorInstance, ColorLike } from "color";

interface ColorPickerButtonProps {
  value?: string;
  onChange: (color: string) => void;
}

function ColorPickerButton({ value = "#ffffff", onChange }: ColorPickerButtonProps) {
  const parsedValue = React.useMemo(() => {
    try {
      return value && value.length > 0 ? value : "#ffffff";
    } catch {
      return "#ffffff";
    }
  }, [value]);

  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const handleColorChange = React.useCallback((color: ColorLike) => {
    const rgb = color as number[];
    const r = Math.round(rgb[0]);
    const g = Math.round(rgb[1]);
    const b = Math.round(rgb[2]);
    const newColor = `rgb(${r}, ${g}, ${b})`;
    onChangeRef.current(newColor);
  }, []);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className="w-10 h-10 p-0 border-2"
          style={{ backgroundColor: parsedValue }}
        >
          <span className="sr-only">Pick a color</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <ColorPicker
          defaultValue={parsedValue}
          onChange={handleColorChange}
          className="max-w-sm rounded-md border bg-background p-4 shadow-sm"
        >
          <ColorPickerSelection className="h-48" />
          <div className="flex items-center gap-4 mt-4">
            <ColorPickerEyeDropper />
            <div className="grid w-full gap-1">
              <ColorPickerHue />
              <ColorPickerAlpha />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <ColorPickerOutput />
            <ColorPickerFormat />
          </div>
        </ColorPicker>
      </PopoverContent>
    </Popover>
  );
}

export { ColorPickerButton };