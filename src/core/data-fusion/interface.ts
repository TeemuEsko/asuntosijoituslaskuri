import type { PropertyModel } from "../domain/property";
import type { ParserPatch } from "../parser/interface";

export interface DataFusionEngine {
  /** Ristiriitainen lähdehavainto säilytetään evidenssinä eikä ylikirjoita aktiivista arvoa. */
  mergeParserPatch(
    current: PropertyModel,
    patch: ParserPatch,
  ): PropertyModel;

  applyUserUpdate(
    current: PropertyModel,
    fieldPath: string,
    value: unknown,
  ): PropertyModel;
}
