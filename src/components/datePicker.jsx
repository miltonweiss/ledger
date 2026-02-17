"use client"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { format } from "date-fns"
import { Calender } from "./icons"

export function DatePicker({ value, onChange, className }) {
  const date = value ? new Date(value) : undefined

  const handleSelect = (selectedDate) => {
    if (selectedDate) {
      // Convert to YYYY-MM-DD format for database
      const year = selectedDate.getFullYear()
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
      const day = String(selectedDate.getDate()).padStart(2, '0')
      onChange(`${year}-${month}-${day}`)
    } else {
      onChange(null)
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant={"outline"} 
          data-empty={!date} 
          className={`bg-transparent hover:bg-transparent border-none justify-between text-left font-normal ${className || ''}`}
        >
         
          <Calender className="ml-2 " />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          defaultMonth={date}
        />
      </PopoverContent>
    </Popover>
  )
}
