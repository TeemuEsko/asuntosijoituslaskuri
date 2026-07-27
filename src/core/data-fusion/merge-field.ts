import type { FieldSource, PropertyField } from "../domain/field";

function valuesEqual<T>(left: T | null, right: T | null): boolean {
  return Object.is(left, right);
}

/**
 * Yhdistää uuden lähdehavainnon hävittämättä nykyistä tai ristiriitaista arvoa.
 * Käyttäjän arvo ja ensimmäinen hyväksytty parseriarvo pysyvät aktiivisina.
 */
export function mergeSourceObservation<T>(
  current: PropertyField<T>,
  incomingValue: T | null,
  incomingSource: FieldSource,
): PropertyField<T> {
  if (current.status === "missing" || current.value === null) {
    return {
      ...current,
      value: incomingValue,
      status: incomingValue === null ? "missing" : "parser",
      source: incomingSource,
      sourceValue: incomingValue,
    };
  }

  if (valuesEqual(current.value, incomingValue)) {
    return {
      ...current,
      sourceValue: current.sourceValue ?? incomingValue,
    };
  }

  return {
    ...current,
    sourceValue: current.sourceValue ?? current.value,
    conflicts: [
      ...(current.conflicts ?? []),
      {
        code: "source_value_conflict",
        message: "Uusi lähdearvo poikkeaa säilytetystä arvosta. Arvoa ei ylikirjoitettu automaattisesti.",
        incomingValue,
        incomingSource,
      },
    ],
  };
}
