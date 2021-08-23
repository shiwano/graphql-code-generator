function unsupportedSource(attributesSource) {
    throw new Error(`Unsupported JSON attributes source: ${attributesSource}`);
}
export class JsonAttributesSourceConfiguration {
    constructor(namespace, propertyAttribute, requiredAttribute) {
        this.namespace = namespace;
        this.propertyAttribute = propertyAttribute;
        this.requiredAttribute = requiredAttribute;
    }
}
const newtonsoftConfiguration = new JsonAttributesSourceConfiguration('Newtonsoft.Json', 'JsonProperty', 'JsonRequired');
// System.Text.Json does not have support of `JsonRequired` alternative (as for .NET 5)
const systemTextJsonConfiguration = new JsonAttributesSourceConfiguration('System.Text.Json', 'JsonPropertyName', null);
export function getJsonAttributeSourceConfiguration(attributesSource) {
    switch (attributesSource) {
        case 'Newtonsoft.Json':
            return newtonsoftConfiguration;
        case 'System.Text.Json':
            return systemTextJsonConfiguration;
    }
    unsupportedSource(attributesSource);
}
//# sourceMappingURL=json-attributes.js.map