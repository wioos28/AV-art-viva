/**
 * ColorInput.tsx
 * --------------
 * Ô nhập màu: input color + text hex, gọn nhẹ.
 */


import { rgbToHex, parseHex } from '../../domain/color';

interface ColorInputProps {
  value: string | null;
  onChange: (hex: string | null) => void;
  label?: string;
}

export function ColorInput({ value, onChange, label }: ColorInputProps) {
  const hex = value ?? '#000000';
  return (
    <label className="color-input" title={label}>
      <input
        type="color"
        value={normalizeForPicker(hex)}
        onChange={(e) => onChange(e.target.value)}
      />
      <input
        type="text"
        value={hex}
        onChange={(e) => {
          const v = e.target.value;
          const rgb = parseHex(v);
          if (rgb) onChange(rgbToHex(rgb));
        }}
        spellCheck={false}
      />
    </label>
  );
}

function normalizeForPicker(hex: string): string {
  const rgb = parseHex(hex);
  return rgb ? rgbToHex(rgb) : '#000000';
}
