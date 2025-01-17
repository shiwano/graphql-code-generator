import autoBind from 'auto-bind';
import { BaseResolversVisitor, getConfigValue, } from '@graphql-codegen/visitor-plugin-common';
import { TypeScriptOperationVariablesToObject } from '@graphql-codegen/typescript';
export const ENUM_RESOLVERS_SIGNATURE = 'export type EnumResolverSignature<T, AllowedValues = any> = { [key in keyof T]?: AllowedValues };';
export class TypeScriptResolversVisitor extends BaseResolversVisitor {
    constructor(pluginConfig, schema) {
        super(pluginConfig, {
            avoidOptionals: getConfigValue(pluginConfig.avoidOptionals, false),
            useIndexSignature: getConfigValue(pluginConfig.useIndexSignature, false),
            wrapFieldDefinitions: getConfigValue(pluginConfig.wrapFieldDefinitions, false),
            allowParentTypeOverride: getConfigValue(pluginConfig.allowParentTypeOverride, false),
            optionalInfoArgument: getConfigValue(pluginConfig.optionalInfoArgument, false),
        }, schema);
        autoBind(this);
        this.setVariablesTransformer(new TypeScriptOperationVariablesToObject(this.scalars, this.convertName, this.config.avoidOptionals, this.config.immutableTypes, this.config.namespacedImportName, [], this.config.enumPrefix, this.config.enumValues));
        if (this.config.useIndexSignature) {
            this._declarationBlockConfig = {
                blockTransformer(block) {
                    return `ResolversObject<${block}>`;
                },
            };
        }
    }
    transformParentGenericType(parentType) {
        if (this.config.allowParentTypeOverride) {
            return `ParentType = ${parentType}`;
        }
        return `ParentType extends ${parentType} = ${parentType}`;
    }
    formatRootResolver(schemaTypeName, resolverType, declarationKind) {
        return `${schemaTypeName}${this.config.avoidOptionals ? '' : '?'}: ${resolverType}${this.getPunctuation(declarationKind)}`;
    }
    clearOptional(str) {
        if (str.startsWith('Maybe')) {
            return str.replace(/Maybe<(.*?)>$/, '$1');
        }
        return str;
    }
    ListType(node) {
        return `Maybe<${super.ListType(node)}>`;
    }
    wrapWithListType(str) {
        return `${this.config.immutableTypes ? 'ReadonlyArray' : 'Array'}<${str}>`;
    }
    getParentTypeForSignature(node) {
        if (this._federation.isResolveReferenceField(node) && this.config.wrapFieldDefinitions) {
            return 'UnwrappedObject<ParentType>';
        }
        return 'ParentType';
    }
    NamedType(node) {
        return `Maybe<${super.NamedType(node)}>`;
    }
    NonNullType(node) {
        const baseValue = super.NonNullType(node);
        return this.clearOptional(baseValue);
    }
    getPunctuation(_declarationKind) {
        return ';';
    }
    buildEnumResolverContentBlock(node, mappedEnumType) {
        const valuesMap = `{ ${(node.values || [])
            .map(v => `${v.name}${this.config.avoidOptionals ? '' : '?'}: any`)
            .join(', ')} }`;
        this._globalDeclarations.add(ENUM_RESOLVERS_SIGNATURE);
        return `EnumResolverSignature<${valuesMap}, ${mappedEnumType}>`;
    }
    buildEnumResolversExplicitMappedValues(node, valuesMapping) {
        return `{ ${(node.values || [])
            .map(v => {
            const valueName = v.name;
            const mappedValue = valuesMapping[valueName];
            return `${valueName}: ${typeof mappedValue === 'number' ? mappedValue : `'${mappedValue}'`}`;
        })
            .join(', ')} }`;
    }
}
//# sourceMappingURL=visitor.js.map