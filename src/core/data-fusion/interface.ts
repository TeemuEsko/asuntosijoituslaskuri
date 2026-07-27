import type { PropertyModel } from "../domain/property";
import type { ParserPatch } from "../parser/interface";

export interface DataFusionEngine {
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
