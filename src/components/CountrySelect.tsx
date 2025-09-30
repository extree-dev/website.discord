// src/components/CountrySelect.tsx
import React from "react";
import GlassSelect from "./GlassSelect.js";

interface CountrySelectProps {
  value: string;
  onChange: (value: string) => void;
  onOpenChange?: (open: boolean) => void;
}

const countries = [
  "United States",
  "Canada",
  "Russia",
  "Germany",
  "France",
  "Spain",
  "Japan",
];

export default function CountrySelect({ value, onChange, onOpenChange }: CountrySelectProps) {
  return (
    <GlassSelect
      value={value}
      onChange={onChange}
      onOpenChange={onOpenChange}
      options={countries.map(c => ({ value: c, label: c }))}
    />
  );
}
