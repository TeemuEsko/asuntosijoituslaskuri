import type { PropertyModel } from "../domain/property";

export type ParserInput =
  | { kind: "listing_url"; url: string }
  | { kind: "document"; documentId: string };

export type ParserPatch = Partial<PropertyModel>;

export interface PropertyParser {
  parse(input: ParserInput): Promise<ParserPatch>;
}
