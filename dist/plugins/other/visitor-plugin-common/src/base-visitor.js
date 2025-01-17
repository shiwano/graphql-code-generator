import autoBind from 'auto-bind';
import { convertFactory } from './naming';
export class BaseVisitor {
    constructor(rawConfig, additionalConfig) {
        var _a;
        this._declarationBlockConfig = {};
        this._parsedConfig = {
            convert: convertFactory(rawConfig),
            typesPrefix: rawConfig.typesPrefix || '',
            typesSuffix: rawConfig.typesSuffix || '',
            externalFragments: rawConfig.externalFragments || [],
            fragmentImports: rawConfig.fragmentImports || [],
            addTypename: !rawConfig.skipTypename,
            nonOptionalTypename: !!rawConfig.nonOptionalTypename,
            useTypeImports: !!rawConfig.useTypeImports,
            dedupeFragments: !!rawConfig.dedupeFragments,
            allowEnumStringTypes: !!rawConfig.allowEnumStringTypes,
            inlineFragmentTypes: (_a = rawConfig.inlineFragmentTypes) !== null && _a !== void 0 ? _a : 'inline',
            ...(additionalConfig || {}),
        };
        this.scalars = {};
        Object.keys(this.config.scalars || {}).forEach(key => {
            this.scalars[key] = this.config.scalars[key].type;
        });
        autoBind(this);
    }
    getVisitorKindContextFromAncestors(ancestors) {
        if (!ancestors) {
            return [];
        }
        return ancestors.map(t => t.kind).filter(Boolean);
    }
    get config() {
        return this._parsedConfig;
    }
    convertName(node, options) {
        const useTypesPrefix = typeof (options && options.useTypesPrefix) === 'boolean' ? options.useTypesPrefix : true;
        const useTypesSuffix = typeof (options && options.useTypesSuffix) === 'boolean' ? options.useTypesSuffix : true;
        let convertedName = '';
        if (useTypesPrefix) {
            convertedName += this.config.typesPrefix;
        }
        convertedName += this.config.convert(node, options);
        if (useTypesSuffix) {
            convertedName += this.config.typesSuffix;
        }
        return convertedName;
    }
    getOperationSuffix(node, operationType) {
        const { omitOperationSuffix = false, dedupeOperationSuffix = false } = this.config;
        const operationName = typeof node === 'string' ? node : node.name ? node.name.value : '';
        return omitOperationSuffix
            ? ''
            : dedupeOperationSuffix && operationName.toLowerCase().endsWith(operationType.toLowerCase())
                ? ''
                : operationType;
    }
    getFragmentSuffix(node) {
        return this.getOperationSuffix(node, 'Fragment');
    }
    getFragmentName(node) {
        return this.convertName(node, {
            suffix: this.getFragmentSuffix(node),
            useTypesPrefix: false,
        });
    }
    getFragmentVariableName(node) {
        const { omitOperationSuffix = false, dedupeOperationSuffix = false, fragmentVariableSuffix = 'FragmentDoc', fragmentVariablePrefix = '', } = this.config;
        const fragmentName = typeof node === 'string' ? node : node.name.value;
        const suffix = omitOperationSuffix
            ? ''
            : dedupeOperationSuffix &&
                fragmentName.toLowerCase().endsWith('fragment') &&
                fragmentVariableSuffix.toLowerCase().startsWith('fragment')
                ? fragmentVariableSuffix.substring('fragment'.length)
                : fragmentVariableSuffix;
        return this.convertName(node, {
            prefix: fragmentVariablePrefix,
            suffix,
            useTypesPrefix: false,
        });
    }
    getPunctuation(_declarationKind) {
        return '';
    }
}
//# sourceMappingURL=base-visitor.js.map