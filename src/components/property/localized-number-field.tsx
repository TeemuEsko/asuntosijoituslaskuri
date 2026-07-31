"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";
import { formatFinnishInputNumber, parseFinnishInputNumber } from "@/core/parser/normalization";
import { PropertyField } from "./property-field";

type Props = Omit<ComponentProps<typeof PropertyField>, "type" | "value" | "defaultValue" | "onChange" | "onBlur" | "onFocus"> & {
  value?: number;
  onValueChange?: (value: number) => void;
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
  allowUnknown?: boolean;
};

const formatValue = (value: number | undefined, maximumFractionDigits: number, minimumFractionDigits: number) =>
  value === undefined ? "" : formatFinnishInputNumber(value, maximumFractionDigits, minimumFractionDigits);

export function LocalizedNumberField({
  value,
  onValueChange,
  maximumFractionDigits = 1,
  minimumFractionDigits = 0,
  allowUnknown = false,
  disabled,
  ...props
}: Props) {
  const [draft, setDraft] = useState(() => formatValue(value, maximumFractionDigits, minimumFractionDigits));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setDraft(formatValue(value, maximumFractionDigits, minimumFractionDigits));
  }, [value, maximumFractionDigits, minimumFractionDigits]);

  function commit() {
    focused.current = false;
    const parsed = parseFinnishInputNumber(draft);
    if (parsed === null) {
      setDraft(formatValue(value, maximumFractionDigits, minimumFractionDigits));
      return;
    }
    const minimum = typeof props.min === "number" ? props.min : Number(props.min ?? Number.NEGATIVE_INFINITY);
    const maximum = typeof props.max === "number" ? props.max : Number(props.max ?? Number.POSITIVE_INFINITY);
    const bounded = Math.min(maximum, Math.max(minimum, parsed));
    onValueChange?.(bounded);
    setDraft(formatValue(bounded, maximumFractionDigits, minimumFractionDigits));
  }

  return (
    <PropertyField
      {...props}
      type="text"
      inputMode="decimal"
      value={draft}
      disabled={disabled}
      placeholder={allowUnknown && value === undefined ? "Ei tiedossa" : props.placeholder}
      onFocus={() => { focused.current = true; }}
      onChange={(event) => setDraft(event.currentTarget.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        props.onKeyDown?.(event);
      }}
    />
  );
}
