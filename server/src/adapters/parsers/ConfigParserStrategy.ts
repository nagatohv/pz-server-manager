/**
 * Abstract class representing the Strategy pattern interface for configuration parsing.
 */
export default abstract class ConfigParserStrategy {
  /**
   * Parse raw text content into a structured JavaScript object.
   */
  abstract parse(content: string): unknown;

  /**
   * Serialize a structured JavaScript object back into raw config text content.
   */
  abstract serialize(data: unknown, originalContent?: string): string;
}
