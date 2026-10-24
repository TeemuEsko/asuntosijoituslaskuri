"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  ANALYSIS_NUMERIC_INPUT_CONFIG,
  stepAnalysisNumericValue,
  type AnalysisNumericInputKey,
} from "@/core/analysis/numeric-input-stepping";
import { formatFinnishInputNumber, parseFinnishInputNumber } from "@/core/parser/normalization";
import { PropertyField } from "./property-field";

type Props = Omit<ComponentProps<typeof PropertyField>, "type" | "value" | "defaultValue" | "onChange" | "onBlur" | "onFocus"> & {
  value?: number;
  onValueChange?: (value: number) => void;
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
  allowUnknown?: boolean;
  numericInputKey?: AnalysisNumericInputKey;
  draftValue?: string;
  onDraftValueChange?: (value: string) => void;
  commitOnBlur?: boolean;
};

const formatValue = (value: number | undefined, maximumFractionDigits: number, minimumFractionDigits: number) =>
  value === undefined ? "" : formatFinnishInputNumber(value, maximumFractionDigits, minimumFractionDigits);

export function LocalizedNumberField({
  value,
  onValueChange,
  maximumFractionDigits = 1,
  minimumFractionDigits = 0,
  allowUnknown = false,
  numericInputKey,
  draftValue,
  onDraftValueChange,
  commitOnBlur = true,
  disabled,
  ...props
}: Props) {
  const [internalDraft, setInternalDraft] = useState(() => formatValue(value, maximumFractionDigits, minimumFractionDigits));
  const focused = useRef(false);
  const draft = draftValue ?? internalDraft;
  const stepConfig = numericInputKey ? ANALYSIS_NUMERIC_INPUT_CONFIG[numericInputKey] : undefined;

  function updateDraft(nextDraft: string) {
    setInternalDraft(nextDraft);
    onDraftValueChange?.(nextDraft);
  }

  useEffect(() => {
    if (!focused.current && draftValue === undefined) {
      setInternalDraft(formatValue(value, maximumFractionDigits, minimumFractionDigits));
    }
  }, [value, maximumFractionDigits, minimumFractionDigits, draftValue]);

  function commit() {
    focused.current = false;
    if (!commitOnBlur) return;
    const parsed = parseFinnishInputNumber(draft);
    if (parsed === null) {
      updateDraft(formatValue(value, maximumFractionDigits, minimumFractionDigits));
      return;
    }
    const minimum = stepConfig?.min ?? (typeof props.min === "number" ? props.min : Number(props.min ?? Number.NEGATIVE_INFINITY));
    const maximum = stepConfig && "max" in stepConfig && typeof stepConfig.max === "number"
      ? stepConfig.max
      : typeof props.max === "number" ? props.max : Number(props.max ?? Number.POSITIVE_INFINITY);
    const bounded = Math.min(maximum, Math.max(minimum, parsed));
    onValueChange?.(bounded);
    updateDraft(formatValue(bounded, maximumFractionDigits, minimumFractionDigits));
  }

  function stepValue(direction: 1 | -1) {
    if (disabled || !numericInputKey) return;
    const nextValue = stepAnalysisNumericValue(numericInputKey, draft, direction, value);
    updateDraft(formatValue(nextValue, maximumFractionDigits, minimumFractionDigits));
    onValueChange?.(nextValue);
  }

  const stepControls = numericInputKey && stepConfig && "showControls" in stepConfig && stepConfig.showControls
    ? <>
        <button type="button" className="grid min-h-0 flex-1 place-items-center border-b text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Kasvata kentän ${props.label} arvoa`} onMouseDown={(event) => event.preventDefault()} onClick={() => stepValue(1)} disabled={disabled}><ChevronUp className="size-3.5" /></button>
        <button type="button" className="grid min-h-0 flex-1 place-items-center text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Pienennä kentän ${props.label} arvoa`} onMouseDown={(event) => event.preventDefault()} onClick={() => stepValue(-1)} disabled={disabled}><ChevronDown className="size-3.5" /></button>
      </>
    : undefined;

  return (
    <PropertyField
      {...props}
      type="text"
      inputMode="decimal"
      value={draft}
      disabled={disabled}
      min={stepConfig?.min ?? props.min}
      max={stepConfig && "max" in stepConfig && typeof stepConfig.max === "number" ? stepConfig.max : props.max}
      step={stepConfig?.step ?? props.step}
      endAdornment={stepControls}
      placeholder={allowUnknown && value === undefined ? "Ei tiedossa" : props.placeholder}
      onFocus={() => { focused.current = true; }}
      onChange={(event) => updateDraft(event.currentTarget.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (!disabled && numericInputKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
          event.preventDefault();
          stepValue(event.key === "ArrowUp" ? 1 : -1);
        }
        if (event.key === "Enter") event.currentTarget.blur();
        props.onKeyDown?.(event);
      }}
    />
  );
}
