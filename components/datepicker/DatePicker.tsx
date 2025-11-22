"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

import { DateTime } from "luxon";

function formatDate(date: Date | undefined) {
  if (!date) {
    return ""
  }

  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function isValidDate(date: Date | undefined) {
  if (!date) {
    return false
  }
  return !isNaN(date.getTime())
}

interface DatePickerProps {
  label: string;
  required?: boolean;
  onChange?: (date: Date | undefined) => void;
  description?: string;
  value?: Date;
}

export function DatePicker(props: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [date, setDate] = React.useState<Date | undefined>(
    props.value || new Date("2026-06-01")
  )
  const [month, setMonth] = React.useState<Date | undefined>(date)
  const [value, setValue] = React.useState(formatDate(props.value || date))

  // Sync with external value prop
  React.useEffect(() => {
    if (props.value) {
      setDate(props.value)
      setValue(formatDate(props.value))
      setMonth(props.value)
    }
  }, [props.value])

  return (
    <div className="flex flex-col gap-3">
      <Label htmlFor="date" className="px-1">
        {props.label} {props.required && <span className="text-red-500">*</span>}
      </Label>
      <div className="relative flex gap-2">
        <Input
          id="date"
          value={value}
          placeholder="June 01, 2025"
          className="bg-background pr-10"
          onChange={(e) => {
            const date = new Date(e.target.value)
            setValue(e.target.value)
            if (isValidDate(date)) {
              setDate(date)
              setMonth(date)
              props.onChange?.(date)
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault()
              setOpen(true)
            }
          }}
        />
        
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id="date-picker"
              variant="ghost"
              className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
            >
              <CalendarIcon className="size-3.5" />
              <span className="sr-only">Select date</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto overflow-hidden p-0"
            align="end"
            alignOffset={-8}
            sideOffset={10}
          >
            <Calendar
              startMonth={DateTime.now().toJSDate()}
              endMonth={DateTime.now().plus({ years: 10 }).toJSDate()}
              mode="single"
              selected={date}
              captionLayout="dropdown"
              month={month}
              onMonthChange={setMonth}
              onSelect={(date) => {
                setDate(date)
                setValue(formatDate(date))
                setOpen(false)
                props.onChange?.(date)
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
       <p className="text-xs text-muted-foreground ">
              Set the expiry date of your PAT for a reminder in the app
            </p>
    </div>
  )
}
