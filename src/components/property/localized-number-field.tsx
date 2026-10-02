"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";
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
    const maximum = stepConfig && "max" in stepConfig
      ? stepConfig.max
      : typeof props.max === "number" ? props.max : Number(props.max ?? Number.POSITIVE_INFINITY);
    const bounded = Math.min(maximum, Math.max(minimum, parsed));
    onValueChange?.(bounded);
    updateDraft(formatValue(bounded, maximumFractionDigits, minimumFractionDigits));
  }

  return (
    <PropertyField
      {...props}
      type="text"
      inputMode="decimal"
      value={draft}
      disabled={disabled}
      min={stepConfig?.min ?? props.min}
      max={stepConfig && "max" in stepConfig ? stepConfig.max : props.max}
      step={stepConfig?.step ?? props.step}
      placeholder={allowUnknown && value === undefined ? "Ei tiedossa" : props.placeholder}
      onFocus={() => { focused.current = true; }}
      onChange={(event) => updateDraft(event.currentTarget.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (!disabled && numericInputKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
          event.preventDefault();
          const nextValue = stepAnalysisNumericValue(numericInputKey, draft, event.key === "ArrowUp" ? 1 : -1, value);
          updateDraft(formatValue(nextValue, maximumFractionDigits, minimumFractionDigits));
          onValueChange?.(nextValue);
        }
        if (event.key === "Enter") event.currentTarget.blur();
        props.onKeyDown?.(event);
      }}
    />
  );
}
