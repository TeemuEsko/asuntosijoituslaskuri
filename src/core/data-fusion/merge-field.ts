import type { FieldSource, FieldStatus, PropertyField } from "../domain/field";

function valuesEqual<T>(left: T | null, right: T | null): boolean {
  return Object.is(left, right);
}

const sourcePriority: Record<FieldSource["kind"], number> = {
  user: 4,
  document: 3,
  listing: 2,
  calculation: 1,
};

function statusForSource(source: FieldSource): FieldStatus {
  if (source.kind === "user") return "user";
  if (source.kind === "document") return "document";
  if (source.kind === "listing") return "listing";
  return "derived";
}

function inferredSource<T>(field: PropertyField<T>): FieldSource | undefined {
  if (field.source) return field.source;
  if (field.status === "user") return { kind: "user" };
  if (field.status === "document") return { kind: "document" };
  if (field.status === "listing" || field.status === "parser") return { kind: "listing" };
  if (["automatic", "statistics", "default", "inferred", "derived"].includes(field.status)) {
    return { kind: "calculation" };
  }
  return undefined;
}

function conflictAlreadyRecorded<T>(
  current: PropertyField<T>,
  value: T | null,
  source: FieldSource | undefined,
): boolean {
  return Boolean(
    current.conflicts?.some(
      (conflict) =>
        conflict.code === "source_value_conflict" &&
        valuesEqual(conflict.incomingValue, value) &&
        conflict.incomingSource?.kind === source?.kind &&
        conflict.incomingSource?.documentId === source?.documentId,
    ),
  );
}

function appendConflict<T>(
  current: PropertyField<T>,
  value: T | null,
  source: FieldSource | undefined,
): NonNullable<PropertyField<T>["conflicts"]> {
  if (conflictAlreadyRecorded(current, value, source)) return current.conflicts ?? [];
  return [
    ...(current.conflicts ?? []),
    {
      code: "source_value_conflict",
      message:
        "Lähdearvot poikkeavat toisistaan. Korkeamman prioriteetin arvo säilytettiin aktiivisena.",
      incomingValue: value,
      incomingSource: source,
    },
  ];
}

/**
 * Yhdistää uuden lähdehavainnon lähdeprioriteetilla
 * käyttäjä > asiakirja > ilmoitus > laskettu tieto.
 * Ristiriitainen arvo säilytetään aina konfliktihistoriassa.
 */
export function mergeSourceObservation<T>(
  current: PropertyField<T>,
  incomingValue: T | null,
  incomingSource: FieldSource,
): PropertyField<T> {
  if (incomingValue === null) return current;

  if (current.status === "missing" || current.value === null) {
    return {
      ...current,
      value: incomingValue,
      status: statusForSource(incomingSource),
      source: incomingSource,
      sourceValue: incomingValue,
    };
  }

  if (current.status === "unknown") {
    return {
      ...current,
      value: incomingValue,
      status: statusForSource(incomingSource),
      source: incomingSource,
      sourceValue: incomingValue,
      conflicts: valuesEqual(current.value, incomingValue)
        ? current.conflicts
        : appendConflict(current, current.value, inferredSource(current)),
    };
  }

  const currentSource = inferredSource(current);
  const incomingWins =
    sourcePriority[incomingSource.kind] >
    (currentSource ? sourcePriority[currentSource.kind] : 0);

  if (valuesEqual(current.value, incomingValue)) {
    if (incomingWins) {
      return {
        ...current,
        status: statusForSource(incomingSource),
        source: incomingSource,
        sourceValue: incomingValue,
      };
    }
    return {
      ...current,
      status: currentSource ? statusForSource(currentSource) : current.status,
      sourceValue: current.sourceValue ?? incomingValue,
    };
  }

  if (incomingWins) {
    return {
      ...current,
      value: incomingValue,
      status: statusForSource(incomingSource),
      source: incomingSource,
      sourceValue: incomingValue,
      conflicts: appendConflict(current, current.value, currentSource),
    };
  }

  return {
    ...current,
    status: currentSource ? statusForSource(currentSource) : current.status,
    sourceValue:
      currentSource?.kind === "user"
        ? (current.sourceValue ?? incomingValue)
        : (current.sourceValue ?? current.value),
    conflicts: appendConflict(current, incomingValue, incomingSource),
  };
}
