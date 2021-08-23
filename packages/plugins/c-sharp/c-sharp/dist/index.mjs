import { Kind, isScalarType, isInputObjectType, isEnumType, visit } from 'graphql';
import { getCachedDocumentNodeFromSchema } from '@graphql-codegen/plugin-helpers';
import { indent, indentMultiline, BaseVisitor, buildScalarsFromConfig, getBaseTypeNode } from '@graphql-codegen/visitor-plugin-common';
import { pascalCase } from 'change-case-all';

const C_SHARP_SCALARS = {
    ID: 'string',
    String: 'string',
    Boolean: 'bool',
    Int: 'int',
    Float: 'double',
    Date: 'DateTime',
};
const csharpValueTypes = [
    'bool',
    'byte',
    'sbyte',
    'char',
    'decimal',
    'double',
    'float',
    'int',
    'uint',
    'long',
    'ulong',
    'short',
    'ushort',
    'DateTime',
];

function transformComment(comment, indentLevel = 0) {
    if (!comment) {
        return '';
    }
    if (isStringValueNode(comment)) {
        comment = comment.value;
    }
    comment = comment.trimStart().split('*/').join('*\\/');
    let lines = comment.split('\n');
    lines = ['/// <summary>', ...lines.map(line => `/// ${line}`), '/// </summary>'];
    return lines
        .map(line => indent(line, indentLevel))
        .concat('')
        .join('\n');
}
function isStringValueNode(node) {
    return node && typeof node === 'object' && node.kind === Kind.STRING;
}
function isValueType(type) {
    // Limitation: only checks the list of known built in value types
    // Eg .NET types and struct types won't be detected correctly
    return csharpValueTypes.includes(type);
}
function getListTypeField(typeNode) {
    if (typeNode.kind === Kind.LIST_TYPE) {
        return {
            required: false,
            type: getListTypeField(typeNode.type),
        };
    }
    else if (typeNode.kind === Kind.NON_NULL_TYPE && typeNode.type.kind === Kind.LIST_TYPE) {
        return Object.assign(getListTypeField(typeNode.type), {
            required: true,
        });
    }
    else if (typeNode.kind === Kind.NON_NULL_TYPE) {
        return getListTypeField(typeNode.type);
    }
    else {
        return undefined;
    }
}
function getListInnerTypeNode(typeNode) {
    if (typeNode.kind === Kind.LIST_TYPE) {
        return getListInnerTypeNode(typeNode.type);
    }
    else if (typeNode.kind === Kind.NON_NULL_TYPE && typeNode.type.kind === Kind.LIST_TYPE) {
        return getListInnerTypeNode(typeNode.type);
    }
    else {
        return typeNode;
    }
}
function wrapFieldType(fieldType, listTypeField, listType = 'IEnumerable') {
    if (listTypeField) {
        const innerType = wrapFieldType(fieldType, listTypeField.type, listType);
        return `${listType}<${innerType}>`;
    }
    else {
        return fieldType.innerTypeName;
    }
}

class CSharpDeclarationBlock {
    constructor() {
        this._name = null;
        this._extendStr = [];
        this._implementsStr = [];
        this._kind = null;
        this._access = 'public';
        this._final = false;
        this._static = false;
        this._block = null;
        this._comment = null;
        this._nestedClasses = [];
    }
    nestedClass(nstCls) {
        this._nestedClasses.push(nstCls);
        return this;
    }
    access(access) {
        this._access = access;
        return this;
    }
    asKind(kind) {
        this._kind = kind;
        return this;
    }
    final() {
        this._final = true;
        return this;
    }
    static() {
        this._static = true;
        return this;
    }
    withComment(comment) {
        if (comment) {
            this._comment = transformComment(comment, 1);
        }
        return this;
    }
    withBlock(block) {
        this._block = block;
        return this;
    }
    extends(extendStr) {
        this._extendStr = extendStr;
        return this;
    }
    implements(implementsStr) {
        this._implementsStr = implementsStr;
        return this;
    }
    withName(name) {
        this._name = typeof name === 'object' ? name.value : name;
        return this;
    }
    get string() {
        let result = '';
        if (this._kind) {
            let name = '';
            if (this._name) {
                name = this._name;
            }
            if (this._kind === 'namespace') {
                result += `${this._kind} ${name} `;
            }
            else {
                let extendStr = '';
                let implementsStr = '';
                const final = this._final ? ' final' : '';
                const isStatic = this._static ? ' static' : '';
                if (this._extendStr.length > 0) {
                    extendStr = ` : ${this._extendStr.join(', ')}`;
                }
                if (this._implementsStr.length > 0) {
                    implementsStr = ` : ${this._implementsStr.join(', ')}`;
                }
                result += `${this._access}${isStatic}${final} ${this._kind} ${name}${extendStr}${implementsStr} `;
            }
        }
        const nestedClasses = this._nestedClasses.length
            ? this._nestedClasses.map(c => indentMultiline(c.string)).join('\n\n')
            : null;
        const before = '{';
        const after = '}';
        const block = [before, nestedClasses, this._block, after].filter(f => f).join('\n');
        result += block;
        return (this._comment ? this._comment : '') + result + '\n';
    }
}

class CSharpFieldType {
    constructor(fieldType) {
        Object.assign(this, fieldType);
    }
    get innerTypeName() {
        const nullable = this.baseType.valueType && !this.baseType.required ? '?' : '';
        return `${this.baseType.type}${nullable}`;
    }
    get isOuterTypeRequired() {
        return this.listType ? this.listType.required : this.baseType.required;
    }
}

/**
 * C# keywords
 * https://docs.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/
 */
const csharpKeywords = [
    'abstract',
    'as',
    'base',
    'bool',
    'break',
    'byte',
    'case',
    'catch',
    'char',
    'checked',
    'class',
    'const',
    'continue',
    'decimal',
    'default',
    'delegate',
    'do',
    'double',
    'else',
    'enum',
    'event',
    'explicit',
    'extern',
    'false',
    'finally',
    'fixed',
    'float',
    'for',
    'foreach',
    'goto',
    'if',
    'implicit',
    'in',
    'int',
    'interface',
    'internal',
    'is',
    'lock',
    'long',
    'namespace',
    'new',
    'null',
    'object',
    'operator',
    'out',
    'override',
    'params',
    'private',
    'protected',
    'public',
    'readonly',
    'record',
    'ref',
    'return',
    'sbyte',
    'sealed',
    'short',
    'sizeof',
    'stackalloc',
    'static',
    'string',
    'struct',
    'switch',
    'this',
    'throw',
    'true',
    'try',
    'typeof',
    'uint',
    'ulong',
    'unchecked',
    'unsafe',
    'ushort',
    'using',
    'virtual',
    'void',
    'volatile',
    'while',
];

function unsupportedSource(attributesSource) {
    throw new Error(`Unsupported JSON attributes source: ${attributesSource}`);
}
class JsonAttributesSourceConfiguration {
    constructor(namespace, propertyAttribute, requiredAttribute) {
        this.namespace = namespace;
        this.propertyAttribute = propertyAttribute;
        this.requiredAttribute = requiredAttribute;
    }
}
const newtonsoftConfiguration = new JsonAttributesSourceConfiguration('Newtonsoft.Json', 'JsonProperty', 'JsonRequired');
// System.Text.Json does not have support of `JsonRequired` alternative (as for .NET 5)
const systemTextJsonConfiguration = new JsonAttributesSourceConfiguration('System.Text.Json', 'JsonPropertyName', null);
function getJsonAttributeSourceConfiguration(attributesSource) {
    switch (attributesSource) {
        case 'Newtonsoft.Json':
            return newtonsoftConfiguration;
        case 'System.Text.Json':
            return systemTextJsonConfiguration;
    }
    unsupportedSource(attributesSource);
}

class CSharpResolversVisitor extends BaseVisitor {
    constructor(rawConfig, _schema) {
        var _a;
        super(rawConfig, {
            enumValues: rawConfig.enumValues || {},
            listType: rawConfig.listType || 'List',
            namespaceName: rawConfig.namespaceName || 'GraphQLCodeGen',
            className: rawConfig.className || 'Types',
            emitRecords: rawConfig.emitRecords || false,
            emitJsonAttributes: (_a = rawConfig.emitJsonAttributes) !== null && _a !== void 0 ? _a : true,
            jsonAttributesSource: rawConfig.jsonAttributesSource || 'Newtonsoft.Json',
            scalars: buildScalarsFromConfig(_schema, rawConfig, C_SHARP_SCALARS),
        });
        this._schema = _schema;
        this.keywords = new Set(csharpKeywords);
        if (this._parsedConfig.emitJsonAttributes) {
            this.jsonAttributesConfiguration = getJsonAttributeSourceConfiguration(this._parsedConfig.jsonAttributesSource);
        }
    }
    /**
     * Checks name against list of keywords. If it is, will prefix value with @
     *
     * Note:
     * This class should first invoke the convertName from base-visitor to convert the string or node
     * value according the naming configuration, eg upper or lower case. Then resulting string checked
     * against the list or keywords.
     * However the generated C# code is not yet able to handle fields that are in a different case so
     * the invocation of convertName is omitted purposely.
     */
    convertSafeName(node) {
        const name = typeof node === 'string' ? node : node.value;
        return this.keywords.has(name) ? `@${name}` : name;
    }
    getImports() {
        const allImports = ['System', 'System.Collections.Generic', 'System.ComponentModel.DataAnnotations'];
        if (this._parsedConfig.emitJsonAttributes) {
            const jsonAttributesNamespace = this.jsonAttributesConfiguration.namespace;
            allImports.push(jsonAttributesNamespace);
        }
        return allImports.map(i => `using ${i};`).join('\n') + '\n';
    }
    wrapWithNamespace(content) {
        return new CSharpDeclarationBlock()
            .asKind('namespace')
            .withName(this.config.namespaceName)
            .withBlock(indentMultiline(content)).string;
    }
    wrapWithClass(content) {
        return new CSharpDeclarationBlock()
            .access('public')
            .asKind('class')
            .withName(this.convertSafeName(this.config.className))
            .withBlock(indentMultiline(content)).string;
    }
    getEnumValue(enumName, enumOption) {
        if (this.config.enumValues[enumName] &&
            typeof this.config.enumValues[enumName] === 'object' &&
            this.config.enumValues[enumName][enumOption]) {
            return this.config.enumValues[enumName][enumOption];
        }
        return enumOption;
    }
    EnumValueDefinition(node) {
        return (enumName) => {
            const enumHeader = this.getFieldHeader(node);
            const enumOption = this.convertSafeName(node.name);
            return enumHeader + indent(this.getEnumValue(enumName, enumOption));
        };
    }
    EnumTypeDefinition(node) {
        const enumName = this.convertName(node.name);
        const enumValues = node.values.map(enumValue => enumValue(node.name.value)).join(',\n');
        const enumBlock = [enumValues].join('\n');
        return new CSharpDeclarationBlock()
            .access('public')
            .asKind('enum')
            .withComment(node.description)
            .withName(enumName)
            .withBlock(enumBlock).string;
    }
    getFieldHeader(node, fieldType) {
        var _a;
        const attributes = [];
        const commentText = transformComment((_a = node.description) === null || _a === void 0 ? void 0 : _a.value);
        const deprecationDirective = node.directives.find(v => { var _a; return ((_a = v.name) === null || _a === void 0 ? void 0 : _a.value) === 'deprecated'; });
        if (deprecationDirective) {
            const deprecationReason = this.getDeprecationReason(deprecationDirective);
            attributes.push(`[Obsolete("${deprecationReason}")]`);
        }
        if (this._parsedConfig.emitJsonAttributes) {
            if (node.kind === Kind.FIELD_DEFINITION) {
                const jsonPropertyAttribute = this.jsonAttributesConfiguration.propertyAttribute;
                if (jsonPropertyAttribute != null) {
                    attributes.push(`[${jsonPropertyAttribute}("${node.name.value}")]`);
                }
            }
        }
        if (node.kind === Kind.INPUT_VALUE_DEFINITION && fieldType.isOuterTypeRequired) {
            // Should be always inserted for required fields to use in `GetInputObject()` when JSON attributes are not used
            // or there are no JSON attributes in selected attribute source that provides `JsonRequired` alternative
            attributes.push('[Required]');
            if (this._parsedConfig.emitJsonAttributes) {
                const jsonRequiredAttribute = this.jsonAttributesConfiguration.requiredAttribute;
                if (jsonRequiredAttribute != null) {
                    attributes.push(`[${jsonRequiredAttribute}]`);
                }
            }
        }
        if (commentText || attributes.length > 0) {
            const summary = commentText ? indentMultiline(commentText.trimRight()) + '\n' : '';
            const attributeLines = attributes.length > 0
                ? attributes
                    .map(attr => indent(attr))
                    .concat('')
                    .join('\n')
                : '';
            return summary + attributeLines;
        }
        return '';
    }
    getDeprecationReason(directive) {
        if (directive.name.value !== 'deprecated') {
            return '';
        }
        const hasArguments = directive.arguments.length > 0;
        let reason = 'Field no longer supported';
        if (hasArguments && directive.arguments[0].value.kind === Kind.STRING) {
            reason = directive.arguments[0].value.value;
        }
        return reason;
    }
    resolveInputFieldType(typeNode, hasDefaultValue = false) {
        const innerType = getBaseTypeNode(typeNode);
        const schemaType = this._schema.getType(innerType.name.value);
        const listType = getListTypeField(typeNode);
        const required = getListInnerTypeNode(typeNode).kind === Kind.NON_NULL_TYPE;
        let result = null;
        if (isScalarType(schemaType)) {
            if (this.scalars[schemaType.name]) {
                const baseType = this.scalars[schemaType.name];
                result = new CSharpFieldType({
                    baseType: {
                        type: baseType,
                        required,
                        valueType: isValueType(baseType),
                    },
                    listType,
                });
            }
            else {
                result = new CSharpFieldType({
                    baseType: {
                        type: 'object',
                        required,
                        valueType: false,
                    },
                    listType,
                });
            }
        }
        else if (isInputObjectType(schemaType)) {
            result = new CSharpFieldType({
                baseType: {
                    type: `${this.convertName(schemaType.name)}`,
                    required,
                    valueType: false,
                },
                listType,
            });
        }
        else if (isEnumType(schemaType)) {
            result = new CSharpFieldType({
                baseType: {
                    type: this.convertName(schemaType.name),
                    required,
                    valueType: true,
                },
                listType,
            });
        }
        else {
            result = new CSharpFieldType({
                baseType: {
                    type: `${schemaType.name}`,
                    required,
                    valueType: false,
                },
                listType,
            });
        }
        if (hasDefaultValue) {
            // Required field is optional when default value specified, see #4273
            (result.listType || result.baseType).required = false;
        }
        return result;
    }
    buildRecord(name, description, inputValueArray, interfaces) {
        const classSummary = transformComment(description === null || description === void 0 ? void 0 : description.value);
        const interfaceImpl = interfaces && interfaces.length > 0 ? ` : ${interfaces.map(ntn => ntn.name.value).join(', ')}` : '';
        const recordMembers = inputValueArray
            .map(arg => {
            const fieldType = this.resolveInputFieldType(arg.type);
            const fieldHeader = this.getFieldHeader(arg, fieldType);
            const fieldName = this.convertSafeName(pascalCase(this.convertName(arg.name)));
            const csharpFieldType = wrapFieldType(fieldType, fieldType.listType, this.config.listType);
            return fieldHeader + indent(`public ${csharpFieldType} ${fieldName} { get; init; } = ${fieldName};`);
        })
            .join('\n\n');
        const recordInitializer = inputValueArray
            .map(arg => {
            const fieldType = this.resolveInputFieldType(arg.type);
            const fieldName = this.convertSafeName(pascalCase(this.convertName(arg.name)));
            const csharpFieldType = wrapFieldType(fieldType, fieldType.listType, this.config.listType);
            return `${csharpFieldType} ${fieldName}`;
        })
            .join(', ');
        return `
#region ${name}
${classSummary}public record ${this.convertSafeName(name)}(${recordInitializer})${interfaceImpl} {
  #region members
${recordMembers}
  #endregion
}
#endregion`;
    }
    buildClass(name, description, inputValueArray, interfaces) {
        const classSummary = transformComment(description === null || description === void 0 ? void 0 : description.value);
        const interfaceImpl = interfaces && interfaces.length > 0 ? ` : ${interfaces.map(ntn => ntn.name.value).join(', ')}` : '';
        const classMembers = inputValueArray
            .map(arg => {
            const fieldType = this.resolveInputFieldType(arg.type);
            const fieldHeader = this.getFieldHeader(arg, fieldType);
            const fieldName = this.convertSafeName(arg.name);
            const csharpFieldType = wrapFieldType(fieldType, fieldType.listType, this.config.listType);
            return fieldHeader + indent(`public ${csharpFieldType} ${fieldName} { get; set; }`);
        })
            .join('\n\n');
        return `
#region ${name}
${classSummary}public class ${this.convertSafeName(name)}${interfaceImpl} {
  #region members
${classMembers}
  #endregion
}
#endregion`;
    }
    buildInterface(name, description, inputValueArray) {
        const classSummary = transformComment(description === null || description === void 0 ? void 0 : description.value);
        const classMembers = inputValueArray
            .map(arg => {
            const fieldType = this.resolveInputFieldType(arg.type);
            const fieldHeader = this.getFieldHeader(arg, fieldType);
            let fieldName;
            let getterSetter;
            if (this.config.emitRecords) {
                // record
                fieldName = this.convertSafeName(pascalCase(this.convertName(arg.name)));
                getterSetter = '{ get; }';
            }
            else {
                // class
                fieldName = this.convertSafeName(arg.name);
                getterSetter = '{ get; set; }';
            }
            const csharpFieldType = wrapFieldType(fieldType, fieldType.listType, this.config.listType);
            return fieldHeader + indent(`${csharpFieldType} ${fieldName} ${getterSetter}`);
        })
            .join('\n\n');
        return `
${classSummary}public interface ${this.convertSafeName(name)} {
${classMembers}
}`;
    }
    buildInputTransformer(name, description, inputValueArray) {
        const classSummary = transformComment(description === null || description === void 0 ? void 0 : description.value);
        const classMembers = inputValueArray
            .map(arg => {
            const fieldType = this.resolveInputFieldType(arg.type, !!arg.defaultValue);
            const fieldHeader = this.getFieldHeader(arg, fieldType);
            const fieldName = this.convertSafeName(arg.name);
            const csharpFieldType = wrapFieldType(fieldType, fieldType.listType, this.config.listType);
            return fieldHeader + indent(`public ${csharpFieldType} ${fieldName} { get; set; }`);
        })
            .join('\n\n');
        return `
#region ${name}
${classSummary}public class ${this.convertSafeName(name)} {
  #region members
${classMembers}
  #endregion

  #region methods
  public dynamic GetInputObject()
  {
    IDictionary<string, object> d = new System.Dynamic.ExpandoObject();

    var properties = GetType().GetProperties(System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Public);
    foreach (var propertyInfo in properties)
    {
      var value = propertyInfo.GetValue(this);
      var defaultValue = propertyInfo.PropertyType.IsValueType ? Activator.CreateInstance(propertyInfo.PropertyType) : null;
${this._parsedConfig.emitJsonAttributes && this.jsonAttributesConfiguration.requiredAttribute != null
            ? `
      var requiredProp = propertyInfo.GetCustomAttributes(typeof(${this.jsonAttributesConfiguration.requiredAttribute}Attribute), false).Length > 0;
`
            : `
      var requiredProp = propertyInfo.GetCustomAttributes(typeof(RequiredAttribute), false).Length > 0;
`}
      if (requiredProp || value != defaultValue)
      {
        d[propertyInfo.Name] = value;
      }
    }
    return d;
  }
  #endregion
}
#endregion`;
    }
    InputObjectTypeDefinition(node) {
        const name = `${this.convertName(node)}`;
        return this.buildInputTransformer(name, node.description, node.fields);
    }
    ObjectTypeDefinition(node) {
        if (this.config.emitRecords) {
            return this.buildRecord(node.name.value, node.description, node.fields, node.interfaces);
        }
        return this.buildClass(node.name.value, node.description, node.fields, node.interfaces);
    }
    InterfaceTypeDefinition(node) {
        return this.buildInterface(node.name.value, node.description, node.fields);
    }
}

const plugin = async (schema, documents, config) => {
    const visitor = new CSharpResolversVisitor(config, schema);
    const astNode = getCachedDocumentNodeFromSchema(schema);
    const visitorResult = visit(astNode, { leave: visitor });
    const imports = visitor.getImports();
    const blockContent = visitorResult.definitions.filter(d => typeof d === 'string').join('\n');
    const wrappedBlockContent = visitor.wrapWithClass(blockContent);
    const wrappedContent = visitor.wrapWithNamespace(wrappedBlockContent);
    return [imports, wrappedContent].join('\n');
};

export { plugin };
