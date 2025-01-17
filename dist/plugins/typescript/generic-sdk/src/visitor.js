import { ClientSideBaseVisitor, DocumentMode, indentMultiline, } from '@graphql-codegen/visitor-plugin-common';
import autoBind from 'auto-bind';
import { Kind } from 'graphql';
export class GenericSdkVisitor extends ClientSideBaseVisitor {
    constructor(schema, fragments, rawConfig) {
        super(schema, fragments, rawConfig, {
            usingObservableFrom: rawConfig.usingObservableFrom,
        });
        this._operationsToInclude = [];
        autoBind(this);
        if (this.config.usingObservableFrom) {
            this._additionalImports.push(this.config.usingObservableFrom);
        }
        if (this.config.documentMode !== DocumentMode.string) {
            const importType = this.config.useTypeImports ? 'import type' : 'import';
            this._additionalImports.push(`${importType} { DocumentNode } from 'graphql';`);
        }
    }
    buildOperation(node, documentVariableName, operationType, operationResultType, operationVariablesTypes) {
        this._operationsToInclude.push({
            node,
            documentVariableName,
            operationType,
            operationResultType,
            operationVariablesTypes,
        });
        return null;
    }
    get sdkContent() {
        const usingObservable = !!this.config.usingObservableFrom;
        const allPossibleActions = this._operationsToInclude
            .map(o => {
            const optionalVariables = !o.node.variableDefinitions ||
                o.node.variableDefinitions.length === 0 ||
                o.node.variableDefinitions.every(v => v.type.kind !== Kind.NON_NULL_TYPE || v.defaultValue);
            const returnType = usingObservable && o.operationType === 'Subscription' ? 'Observable' : 'Promise';
            return `${o.node.name.value}(variables${optionalVariables ? '?' : ''}: ${o.operationVariablesTypes}, options?: C): ${returnType}<${o.operationResultType}> {
  return requester<${o.operationResultType}, ${o.operationVariablesTypes}>(${o.documentVariableName}, variables, options);
}`;
        })
            .map(s => indentMultiline(s, 2));
        return `export type Requester<C= {}> = <R, V>(doc: ${this.config.documentMode === DocumentMode.string ? 'string' : 'DocumentNode'}, vars?: V, options?: C) => ${usingObservable ? 'Promise<R> & Observable<R>' : 'Promise<R>'}
export function getSdk<C>(requester: Requester<C>) {
  return {
${allPossibleActions.join(',\n')}
  };
}
export type Sdk = ReturnType<typeof getSdk>;`;
    }
}
//# sourceMappingURL=visitor.js.map