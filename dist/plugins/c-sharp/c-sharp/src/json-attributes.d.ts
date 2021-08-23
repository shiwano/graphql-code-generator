export declare type JsonAttributesSource = 'Newtonsoft.Json' | 'System.Text.Json';
export declare class JsonAttributesSourceConfiguration {
  readonly namespace: string;
  readonly propertyAttribute: string;
  readonly requiredAttribute: string;
  constructor(namespace: string, propertyAttribute: string, requiredAttribute: string);
}
export declare function getJsonAttributeSourceConfiguration(
  attributesSource: JsonAttributesSource
): JsonAttributesSourceConfiguration;
