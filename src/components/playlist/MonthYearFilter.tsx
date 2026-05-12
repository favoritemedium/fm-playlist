"use client";

import { Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ALL_FILTER_VALUE,
  getMonthName,
  type PlaylistFilterValue,
} from "@/lib/constants";

interface MonthYearFilterProps {
  availableYears: number[];
  availableMonths: number[];
  selectedYear: PlaylistFilterValue;
  selectedMonth: PlaylistFilterValue;
  onYearChange: (year: PlaylistFilterValue) => void;
  onMonthChange: (month: PlaylistFilterValue) => void;
}

function parseFilterValue(value: string): PlaylistFilterValue {
  return value === ALL_FILTER_VALUE ? ALL_FILTER_VALUE : Number(value);
}

export function MonthYearFilter({
  availableYears,
  availableMonths,
  selectedYear,
  selectedMonth,
  onYearChange,
  onMonthChange,
}: MonthYearFilterProps) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 bg-white px-3 sm:px-5 py-2 sm:py-3 rounded-xl shadow-md border border-border w-full sm:w-auto">
      <Calendar className="w-5 h-5 text-secondary shrink-0" strokeWidth={2.5} />
      <Select
        value={selectedYear.toString()}
        onValueChange={(value) => onYearChange(parseFilterValue(value))}
      >
        <SelectTrigger className="flex-1 sm:w-28 sm:flex-none bg-transparent border-0 shadow-none font-semibold">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_FILTER_VALUE}>All</SelectItem>
          {availableYears.map((year) => (
            <SelectItem key={year} value={year.toString()}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={selectedMonth.toString()}
        onValueChange={(value) => onMonthChange(parseFilterValue(value))}
      >
        <SelectTrigger className="flex-1 sm:w-36 sm:flex-none bg-transparent border-0 shadow-none font-semibold">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_FILTER_VALUE}>All</SelectItem>
          {availableMonths.map((month) => (
            <SelectItem key={month} value={month.toString()}>
              {getMonthName(month)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
