import { isWrappingType, GraphQLObjectType, } from 'graphql';
import { imports } from './constants';
import { convertFactory } from '@graphql-codegen/visitor-plugin-common';
const unwrapType = (type) => isWrappingType(type) ? unwrapType(type.ofType) : type || null;
const getObjectTypes = (schema) => {
    const typeMap = schema.getTypeMap();
    const queryType = schema.getQueryType();
    const mutationType = schema.getMutationType();
    const subscriptionType = schema.getSubscriptionType();
    const objectTypes = [];
    for (const key in typeMap) {
        if (!typeMap[key] || !typeMap[key].name)
            continue;
        const type = typeMap[key];
        switch (type.name) {
            case '__Directive':
            case '__DirectiveLocation':
            case '__EnumValue':
            case '__InputValue':
            case '__Field':
            case '__Type':
            case '__TypeKind':
            case '__Schema':
                continue;
            default:
                if (!(type instanceof GraphQLObjectType))
                    continue;
        }
        if (type !== queryType && type !== mutationType && type !== subscriptionType) {
            objectTypes.push(type);
        }
    }
    return objectTypes;
};
function constructType(typeNode, schema, convertName, config, nullable = true, allowString = false) {
    var _a;
    switch (typeNode.kind) {
        case 'ListType': {
            return nullable
                ? `Maybe<Array<${constructType(typeNode.type, schema, convertName, config, false, allowString)}>>`
                : `Array<${constructType(typeNode.type, schema, convertName, config, false, allowString)}>`;
        }
        case 'NamedType': {
            const type = schema.getType(typeNode.name.value);
            if (!type.astNode || ((_a = type === null || type === void 0 ? void 0 : type.astNode) === null || _a === void 0 ? void 0 : _a.kind) === 'ScalarTypeDefinition') {
                return nullable
                    ? `Maybe<Scalars['${type.name}']${allowString ? ' | string' : ''}>`
                    : `Scalars['${type.name}']${allowString ? ' | string' : ''}`;
            }
            const tsTypeName = convertName(typeNode, { prefix: config.typesPrefix, suffix: config.typesSuffix });
            switch (type.astNode.kind) {
                case 'UnionTypeDefinition':
                case 'InputObjectTypeDefinition':
                case 'ObjectTypeDefinition': {
                    const finalType = `WithTypename<${tsTypeName}>${allowString ? ' | string' : ''}`;
                    return nullable ? `Maybe<${finalType}>` : finalType;
                }
                case 'EnumTypeDefinition': {
                    const finalType = `${tsTypeName}${allowString ? ' | string' : ''}`;
                    return nullable ? `Maybe<${finalType}>` : finalType;
                }
                case 'InterfaceTypeDefinition': {
                    const possibleTypes = schema.getPossibleTypes(type).map(possibleType => {
                        const tsPossibleTypeName = convertName(possibleType.astNode, {
                            prefix: config.typesPrefix,
                            suffix: config.typesSuffix,
                        });
                        return `WithTypename<${tsPossibleTypeName}>`;
                    });
                    const finalType = allowString ? possibleTypes.join(' | ') + ' | string' : possibleTypes.join(' | ');
                    return nullable ? `Maybe<${finalType}>` : finalType;
                }
            }
            break;
        }
        case 'NonNullType': {
            return constructType(typeNode.type, schema, convertName, config, false, allowString);
        }
    }
}
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
function getKeysConfig(schema, convertName, config) {
    const keys = getObjectTypes(schema).reduce((keys, type) => {
        keys.push(`${type.name}?: (data: WithTypename<${convertName(type.astNode, {
            prefix: config.typesPrefix,
            suffix: config.typesSuffix,
        })}>) => null | string`);
        return keys;
    }, []);
    return 'export type GraphCacheKeysConfig = {\n  ' + keys.join(',\n  ') + '\n}';
}
function getResolversConfig(schema, convertName, config) {
    const objectTypes = [schema.getQueryType(), ...getObjectTypes(schema)];
    const resolvers = objectTypes.reduce((resolvers, parentType) => {
        const fields = parentType.astNode.fields.reduce((fields, field) => {
            var _a;
            const argsName = ((_a = field.arguments) === null || _a === void 0 ? void 0 : _a.length)
                ? convertName(`${parentType.name}${capitalize(field.name.value)}Args`, {
                    prefix: config.typesPrefix,
                    suffix: config.typesSuffix,
                })
                : 'Record<string, never>';
            const type = unwrapType(field.type);
            fields.push(`${field.name.value}?: GraphCacheResolver<WithTypename<` +
                `${convertName(parentType.astNode, {
                    prefix: config.typesPrefix,
                    suffix: config.typesSuffix,
                })}>, ${argsName}, ` +
                `${constructType(type, schema, convertName, config, false, true)}>`);
            return fields;
        }, []);
        resolvers.push(`  ${parentType.name}?: {\n    ` + fields.join(',\n    ') + '\n  }');
        return resolvers;
    }, []);
    return resolvers;
}
function getRootUpdatersConfig(schema, convertName, config) {
    const [mutationUpdaters, subscriptionUpdaters] = [schema.getMutationType(), schema.getSubscriptionType()].map(rootType => {
        if (rootType) {
            const updaters = [];
            const { fields } = rootType.astNode;
            fields.forEach(fieldNode => {
                var _a;
                const argsName = ((_a = fieldNode.arguments) === null || _a === void 0 ? void 0 : _a.length)
                    ? convertName(`${rootType.name}${capitalize(fieldNode.name.value)}Args`, {
                        prefix: config.typesPrefix,
                        suffix: config.typesSuffix,
                    })
                    : 'Record<string, never>';
                const type = unwrapType(fieldNode.type);
                updaters.push(`${fieldNode.name.value}?: GraphCacheUpdateResolver<{ ${fieldNode.name.value}: ${constructType(type, schema, convertName, config)} }, ${argsName}>`);
            });
            return updaters;
        }
        else {
            return null;
        }
    });
    return {
        mutationUpdaters,
        subscriptionUpdaters,
    };
}
function getOptimisticUpdatersConfig(schema, convertName, config) {
    const mutationType = schema.getMutationType();
    if (mutationType) {
        const optimistic = [];
        const { fields } = mutationType.astNode;
        fields.forEach(fieldNode => {
            var _a;
            const argsName = ((_a = fieldNode.arguments) === null || _a === void 0 ? void 0 : _a.length)
                ? convertName(`Mutation${capitalize(fieldNode.name.value)}Args`, {
                    prefix: config.typesPrefix,
                    suffix: config.typesSuffix,
                })
                : 'Record<string, never>';
            const type = unwrapType(fieldNode.type);
            const outputType = constructType(type, schema, convertName, config);
            optimistic.push(`${fieldNode.name.value}?: GraphCacheOptimisticMutationResolver<` + `${argsName}, ` + `${outputType}>`);
        });
        return optimistic;
    }
    else {
        return null;
    }
}
export const plugin = (schema, _documents, config) => {
    const convertName = convertFactory(config);
    const keys = getKeysConfig(schema, convertName, config);
    const resolvers = getResolversConfig(schema, convertName, config);
    const { mutationUpdaters, subscriptionUpdaters } = getRootUpdatersConfig(schema, convertName, config);
    const optimisticUpdaters = getOptimisticUpdatersConfig(schema, convertName, config);
    return {
        prepend: [imports],
        content: [
            `export type WithTypename<T extends { __typename?: any }> = { [K in Exclude<keyof T, '__typename'>]?: T[K] } & { __typename: NonNullable<T['__typename']> };`,
            keys,
            'export type GraphCacheResolvers = {\n' + resolvers.join(',\n') + '\n};',
            'export type GraphCacheOptimisticUpdaters = {\n  ' +
                (optimisticUpdaters ? optimisticUpdaters.join(',\n  ') : '{}') +
                '\n};',
            'export type GraphCacheUpdaters = {\n' +
                '  Mutation?: ' +
                (mutationUpdaters ? `{\n    ${mutationUpdaters.join(',\n    ')}\n  }` : '{}') +
                ',\n' +
                '  Subscription?: ' +
                (subscriptionUpdaters ? `{\n    ${subscriptionUpdaters.join(',\n    ')}\n  }` : '{}') +
                ',\n};',
            'export type GraphCacheConfig = {\n' +
                '  schema?: IntrospectionData,\n' +
                '  updates?: GraphCacheUpdaters,\n' +
                '  keys?: GraphCacheKeysConfig,\n' +
                '  optimistic?: GraphCacheOptimisticUpdaters,\n' +
                '  resolvers?: GraphCacheResolvers,\n' +
                '  storage?: GraphCacheStorageAdapter\n' +
                '};',
        ]
            .filter(Boolean)
            .join('\n\n'),
    };
};
//# sourceMappingURL=index.js.map