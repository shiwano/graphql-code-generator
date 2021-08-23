import { getCachedDocumentNodeFromSchema } from '@graphql-codegen/plugin-helpers';
import { Kind, visit, print, isScalarType, isInputObjectType, isEnumType, concatAST } from 'graphql';
import { indent, indentMultiline, ClientSideBaseVisitor, buildScalarsFromConfig, DocumentMode, getBaseTypeNode } from '@graphql-codegen/visitor-plugin-common';
import autoBind from 'auto-bind';
import { extname } from 'path';
import gql from 'graphql-tag';

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
function getListTypeDepth(listType) {
    if (listType) {
        return getListTypeDepth(listType.type) + 1;
    }
    else {
        return 0;
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

const defaultSuffix = 'GQL';
const R_NAME = /name:\s*"([^"]+)"/;
function R_DEF(directive) {
    return new RegExp(`\\s+\\@${directive}\\([^)]+\\)`, 'gm');
}
class CSharpOperationsVisitor extends ClientSideBaseVisitor {
    constructor(schema, fragments, rawConfig, documents) {
        super(schema, fragments, rawConfig, {
            namespaceName: rawConfig.namespaceName || 'GraphQLCodeGen',
            namedClient: rawConfig.namedClient,
            querySuffix: rawConfig.querySuffix || defaultSuffix,
            mutationSuffix: rawConfig.mutationSuffix || defaultSuffix,
            subscriptionSuffix: rawConfig.subscriptionSuffix || defaultSuffix,
            scalars: buildScalarsFromConfig(schema, rawConfig, C_SHARP_SCALARS),
            typesafeOperation: rawConfig.typesafeOperation || false,
        }, documents);
        this._operationsToInclude = [];
        this.overruleConfigSettings();
        autoBind(this);
        this._schemaAST = getCachedDocumentNodeFromSchema(schema);
    }
    // Some settings aren't supported with C#, overruled here
    overruleConfigSettings() {
        if (this.config.documentMode === DocumentMode.graphQLTag) {
            // C# operations does not (yet) support graphQLTag mode
            this.config.documentMode = DocumentMode.documentNode;
        }
    }
    _operationHasDirective(operation, directive) {
        if (typeof operation === 'string') {
            return operation.includes(`${directive}`);
        }
        let found = false;
        visit(operation, {
            Directive(node) {
                if (node.name.value === directive) {
                    found = true;
                }
            },
        });
        return found;
    }
    _extractDirective(operation, directive) {
        const directives = print(operation).match(R_DEF(directive));
        if (directives.length > 1) {
            throw new Error(`The ${directive} directive used multiple times in '${operation.name}' operation`);
        }
        return directives[0];
    }
    _namedClient(operation) {
        let name;
        if (this._operationHasDirective(operation, 'namedClient')) {
            name = this._extractNamedClient(operation);
        }
        else if (this.config.namedClient) {
            name = this.config.namedClient;
        }
        return name ? `client = '${name}';` : '';
    }
    _extractNamedClient(operation) {
        const [, name] = this._extractDirective(operation, 'namedClient').match(R_NAME);
        return name;
    }
    _gql(node) {
        const fragments = this._transformFragments(node);
        const doc = this._prepareDocument([print(node), this._includeFragments(fragments)].join('\n'));
        return doc.replace(/"/g, '""');
    }
    _getDocumentNodeVariable(node, documentVariableName) {
        return this.config.documentMode === DocumentMode.external ? `Operations.${node.name.value}` : documentVariableName;
    }
    _gqlInputSignature(variable) {
        const typeNode = variable.type;
        const innerType = getBaseTypeNode(typeNode);
        const schemaType = this._schema.getType(innerType.name.value);
        const name = variable.variable.name.value;
        const baseType = !isScalarType(schemaType) ? innerType.name.value : this.scalars[schemaType.name] || 'object';
        const listType = getListTypeField(typeNode);
        const required = getListInnerTypeNode(typeNode).kind === Kind.NON_NULL_TYPE;
        return {
            required: listType ? listType.required : required,
            signature: !listType
                ? `${name}=(${baseType})`
                : `${name}=(${baseType}${'[]'.repeat(getListTypeDepth(listType))})`,
        };
    }
    getCSharpImports() {
        return ['Newtonsoft.Json', 'GraphQL', 'GraphQL.Client.Abstractions'].map(i => `using ${i};`).join('\n') + '\n';
    }
    _operationSuffix(operationType) {
        switch (operationType) {
            case 'query':
                return this.config.querySuffix;
            case 'mutation':
                return this.config.mutationSuffix;
            case 'subscription':
                return this.config.subscriptionSuffix;
            default:
                return defaultSuffix;
        }
    }
    resolveFieldType(typeNode, hasDefaultValue = false) {
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
    _getResponseFieldRecursive(node, parentSchema) {
        switch (node.kind) {
            case Kind.OPERATION_DEFINITION: {
                return new CSharpDeclarationBlock()
                    .access('public')
                    .asKind('class')
                    .withName('Response')
                    .withBlock('\n' +
                    node.selectionSet.selections
                        .map(opr => {
                        if (opr.kind !== Kind.FIELD) {
                            throw new Error(`Unknown kind; ${opr.kind} in OperationDefinitionNode`);
                        }
                        return this._getResponseFieldRecursive(opr, parentSchema);
                    })
                        .join('\n')).string;
            }
            case Kind.FIELD: {
                const fieldSchema = parentSchema.fields.find(f => f.name.value === node.name.value);
                if (!fieldSchema) {
                    throw new Error(`Field schema not found; ${node.name.value}`);
                }
                const responseType = this.resolveFieldType(fieldSchema.type);
                if (!node.selectionSet) {
                    const responseTypeName = wrapFieldType(responseType, responseType.listType, 'System.Collections.Generic.List');
                    return indentMultiline([
                        `[JsonProperty("${node.name.value}")]`,
                        `public ${responseTypeName} ${node.name.value} { get; set; }`,
                    ].join('\n') + '\n');
                }
                else {
                    const selectionBaseTypeName = `${responseType.baseType.type}Selection`;
                    const selectionType = Object.assign(new CSharpFieldType(responseType), {
                        baseType: { type: selectionBaseTypeName },
                    });
                    const selectionTypeName = wrapFieldType(selectionType, selectionType.listType, 'System.Collections.Generic.List');
                    const innerClassSchema = this._schemaAST.definitions.find(d => d.kind === Kind.OBJECT_TYPE_DEFINITION && d.name.value === responseType.baseType.type);
                    const innerClassDefinition = new CSharpDeclarationBlock()
                        .access('public')
                        .asKind('class')
                        .withName(selectionBaseTypeName)
                        .withBlock('\n' +
                        node.selectionSet.selections
                            .map(s => {
                            if (s.kind === Kind.INLINE_FRAGMENT) {
                                throw new Error(`Unsupported kind; ${node.name} ${s.kind}`);
                            }
                            return this._getResponseFieldRecursive(s, innerClassSchema);
                        })
                            .join('\n')).string;
                    return indentMultiline([
                        innerClassDefinition,
                        `[JsonProperty("${node.name.value}")]`,
                        `public ${selectionTypeName} ${node.name.value} { get; set; }`,
                    ].join('\n') + '\n');
                }
            }
            case Kind.FRAGMENT_SPREAD: {
                const fragmentSchema = this._fragments.find(f => f.name === node.name.value);
                if (!fragmentSchema) {
                    throw new Error(`Fragment schema not found; ${node.name.value}`);
                }
                return fragmentSchema.node.selectionSet.selections
                    .map(s => {
                    if (s.kind === Kind.INLINE_FRAGMENT) {
                        throw new Error(`Unsupported kind; ${node.name} ${s.kind}`);
                    }
                    return this._getResponseFieldRecursive(s, parentSchema);
                })
                    .join('\n');
            }
        }
    }
    _getResponseClass(node) {
        const operationSchema = this._schemaAST.definitions.find(s => s.kind === Kind.OBJECT_TYPE_DEFINITION && s.name.value.toLowerCase() === node.operation);
        return this._getResponseFieldRecursive(node, operationSchema);
    }
    _getVariablesClass(node) {
        var _a, _b;
        if (!((_a = node.variableDefinitions) === null || _a === void 0 ? void 0 : _a.length)) {
            return '';
        }
        return new CSharpDeclarationBlock()
            .access('public')
            .asKind('class')
            .withName('Variables')
            .withBlock('\n' +
            ((_b = node.variableDefinitions) === null || _b === void 0 ? void 0 : _b.map(v => {
                const inputType = this.resolveFieldType(v.type);
                const inputTypeName = wrapFieldType(inputType, inputType.listType, 'System.Collections.Generic.List');
                return indentMultiline([
                    `[JsonProperty("${v.variable.name.value}")]`,
                    `public ${inputTypeName} ${v.variable.name.value} { get; set; }`,
                ].join('\n') + '\n');
            }).join('\n'))).string;
    }
    _getOperationMethod(node) {
        var _a, _b, _c, _d;
        const operationSchema = this._schemaAST.definitions.find(s => s.kind === Kind.OBJECT_TYPE_DEFINITION && s.name.value.toLowerCase() === node.operation);
        if (!operationSchema) {
            throw new Error(`Operation schema not found; ${node.operation}`);
        }
        const variablesArgument = ((_a = node.variableDefinitions) === null || _a === void 0 ? void 0 : _a.length) ? ', Variables variables' : '';
        switch (node.operation) {
            case 'query':
            case 'mutation':
                return [
                    `public static System.Threading.Tasks.Task<GraphQLResponse<Response>> Send${operationSchema.name.value}Async(IGraphQLClient client${variablesArgument}, System.Threading.CancellationToken cancellationToken = default) {`,
                    indent(`return client.Send${operationSchema.name.value}Async<Response>(Request(${((_b = node.variableDefinitions) === null || _b === void 0 ? void 0 : _b.length) ? 'variables' : ''}), cancellationToken);`),
                    `}`,
                ].join('\n');
            case 'subscription': {
                return [
                    `public static System.IObservable<GraphQLResponse<Response>> CreateSubscriptionStream(IGraphQLClient client${variablesArgument}) {`,
                    indent(`return client.CreateSubscriptionStream<Response>(Request(${((_c = node.variableDefinitions) === null || _c === void 0 ? void 0 : _c.length) ? 'variables' : ''}));`),
                    `}`,
                    '',
                    `public static System.IObservable<GraphQLResponse<Response>> CreateSubscriptionStream(IGraphQLClient client${variablesArgument}, System.Action<System.Exception> exceptionHandler) {`,
                    indent(`return client.CreateSubscriptionStream<Response>(Request(${((_d = node.variableDefinitions) === null || _d === void 0 ? void 0 : _d.length) ? 'variables' : ''}), exceptionHandler);`),
                    `}`,
                ].join('\n');
            }
        }
    }
    OperationDefinition(node) {
        var _a;
        if (!node.name || !node.name.value) {
            return null;
        }
        this._collectedOperations.push(node);
        const documentVariableName = this.convertName(node, {
            suffix: this.config.documentVariableSuffix,
            prefix: this.config.documentVariablePrefix,
            useTypesPrefix: false,
        });
        let documentString = '';
        if (this.config.documentMode !== DocumentMode.external) {
            const gqlBlock = indentMultiline(this._gql(node), 4);
            documentString = `${this.config.noExport ? '' : 'public'} static string ${documentVariableName} = @"\n${gqlBlock}";`;
        }
        const operationType = node.operation;
        const operationTypeSuffix = this.config.dedupeOperationSuffix && node.name.value.toLowerCase().endsWith(node.operation)
            ? ''
            : !operationType
                ? ''
                : operationType;
        const operationResultType = this.convertName(node, {
            suffix: operationTypeSuffix + this._parsedConfig.operationResultSuffix,
        });
        const operationVariablesTypes = this.convertName(node, {
            suffix: operationTypeSuffix + 'Variables',
        });
        const serviceName = `${this.convertName(node)}${this._operationSuffix(operationType)}`;
        this._operationsToInclude.push({
            node,
            documentVariableName,
            operationType,
            operationResultType,
            operationVariablesTypes,
        });
        const inputSignatures = (_a = node.variableDefinitions) === null || _a === void 0 ? void 0 : _a.map(v => this._gqlInputSignature(v));
        const hasInputArgs = !!(inputSignatures === null || inputSignatures === void 0 ? void 0 : inputSignatures.length);
        const inputArgsHint = hasInputArgs
            ? `
      /// <para>Required variables:<br/> { ${inputSignatures
                .filter(sig => sig.required)
                .map(sig => sig.signature)
                .join(', ')} }</para>
      /// <para>Optional variables:<br/> { ${inputSignatures
                .filter(sig => !sig.required)
                .map(sig => sig.signature)
                .join(', ')} }</para>`
            : '';
        // Should use ObsoleteAttribute but VS treats warnings as errors which would be super annoying so use remarks comment instead
        const obsoleteMessage = '/// <remarks>This method is obsolete. Use Request instead.</remarks>';
        let typesafeOperations = '';
        if (this.config.typesafeOperation) {
            typesafeOperations = `
${this._getVariablesClass(node)}
${this._getResponseClass(node)}
${this._getOperationMethod(node)}
`;
            typesafeOperations = indentMultiline(typesafeOperations, 3);
        }
        const content = `
    public class ${serviceName} {
      /// <summary>
      /// ${serviceName}.Request ${inputArgsHint}
      /// </summary>
      public static GraphQLRequest Request(${hasInputArgs ? 'object variables = null' : ''}) {
        return new GraphQLRequest {
          Query = ${this._getDocumentNodeVariable(node, documentVariableName)},
          OperationName = "${node.name.value}"${hasInputArgs
            ? `,
          Variables = variables`
            : ''}
        };
      }

      ${obsoleteMessage}
      public static GraphQLRequest get${serviceName}() {
        return Request();
      }
      ${this._namedClient(node)}
      ${documentString}
      ${typesafeOperations}
    }
    `;
        return [content].filter(a => a).join('\n');
    }
    InputObjectTypeDefinition(node) {
        var _a;
        if (!this.config.typesafeOperation) {
            return '';
        }
        const inputClass = new CSharpDeclarationBlock()
            .access('public')
            .asKind('class')
            .withName(this.convertName(node))
            .withBlock('\n' +
            ((_a = node.fields) === null || _a === void 0 ? void 0 : _a.map(f => {
                if (f.kind !== Kind.INPUT_VALUE_DEFINITION) {
                    return null;
                }
                const inputType = this.resolveFieldType(f.type);
                const inputTypeName = wrapFieldType(inputType, inputType.listType, 'System.Collections.Generic.List');
                return indentMultiline([`[JsonProperty("${f.name.value}")]`, `public ${inputTypeName} ${f.name.value} { get; set; }`].join('\n') + '\n');
            }).filter(f => !!f).join('\n'))).string;
        return indentMultiline(inputClass, 2);
    }
    EnumTypeDefinition(node) {
        var _a;
        if (!this.config.typesafeOperation) {
            return '';
        }
        const enumDefinition = new CSharpDeclarationBlock()
            .access('public')
            .asKind('enum')
            .withName(this.convertName(node.name))
            .withBlock(indentMultiline((_a = node.values) === null || _a === void 0 ? void 0 : _a.map(v => v.name.value).join(',\n'))).string;
        return indentMultiline(enumDefinition, 2);
    }
}

const plugin = (schema, documents, config) => {
    const schemaAST = getCachedDocumentNodeFromSchema(schema);
    const allAst = concatAST(documents.map(v => v.document).concat(schemaAST));
    const allFragments = [
        ...allAst.definitions.filter(d => d.kind === Kind.FRAGMENT_DEFINITION).map(fragmentDef => ({
            node: fragmentDef,
            name: fragmentDef.name.value,
            onType: fragmentDef.typeCondition.name.value,
            isExternal: false,
        })),
        ...(config.externalFragments || []),
    ];
    const visitor = new CSharpOperationsVisitor(schema, allFragments, config, documents);
    const visitorResult = visit(allAst, { leave: visitor });
    const imports = visitor.getCSharpImports();
    const openNameSpace = `namespace ${visitor.config.namespaceName} {`;
    return {
        prepend: [],
        content: [imports, openNameSpace, ...visitorResult.definitions.filter(t => typeof t === 'string'), '}']
            .filter(a => a)
            .join('\n'),
    };
};
const addToSchema = gql `
  directive @namedClient(name: String!) on OBJECT | FIELD
`;
const validate = async (schema, documents, config, outputFile) => {
    if (extname(outputFile) !== '.cs') {
        throw new Error(`Plugin "c-sharp-operations" requires extension to be ".cs"!`);
    }
};

export { CSharpOperationsVisitor, addToSchema, plugin, validate };
