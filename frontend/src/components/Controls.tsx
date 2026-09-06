import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
export function Choice({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (v !== null) onChange(String(v));
      }}
    >
      <SelectTrigger aria-label={label} className="choice">
        <SelectValue>{options.find((x) => x[0] === value)?.[1]}</SelectValue>
      </SelectTrigger>
      <SelectContent className="choice-popup">
        {options.map(([id, name]) => (
          <SelectItem key={id} value={id}>
            {name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
export function Range({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <Slider
      aria-label={label}
      value={[value]}
      min={min}
      max={max}
      step={step}
      onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
      className="range"
    />
  );
}
