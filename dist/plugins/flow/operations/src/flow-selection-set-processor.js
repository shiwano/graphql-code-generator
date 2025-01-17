import { BaseSelectionSetProcessor, indent, } from '@graphql-codegen/visitor-plugin-common';
export class FlowWithPickSelectionSetProcessor extends BaseSelectionSetProcessor {
    transformAliasesPrimitiveFields(schemaType, fields) {
        if (fields.length === 0) {
            return [];
        }
        const useFlowExactObject = this.config.useFlowExactObjects;
        const formatNamedField = this.config.formatNamedField;
        const fieldObj = schemaType.getFields();
        const parentName = (this.config.namespacedImportName ? `${this.config.namespacedImportName}.` : '') +
            this.config.convertName(schemaType.name, {
                useTypesPrefix: true,
            });
        return [
            `{${useFlowExactObject ? '|' : ''} ${fields
                .map(aliasedField => `${formatNamedField(aliasedField.alias, fieldObj[aliasedField.fieldName].type)}: $ElementType<${parentName}, '${aliasedField.fieldName}'>`)
                .join(', ')} ${useFlowExactObject ? '|' : ''}}`,
        ];
    }
    buildFieldsIntoObject(allObjectsMerged) {
        return `...{ ${allObjectsMerged.join(', ')} }`;
    }
    buildSelectionSetFromStrings(pieces) {
        if (pieces.length === 0) {
            return null;
        }
        else if (pieces.length === 1) {
            return pieces[0];
        }
        else {
            return `({\n  ${pieces.map(t => indent(`...${t}`)).join(`,\n`)}\n})`;
        }
    }
    transformLinkFields(fields) {
        if (fields.length === 0) {
            return [];
        }
        const useFlowExactObject = this.config.useFlowExactObjects;
        return [
            `{${useFlowExactObject ? '|' : ''} ${fields
                .map(field => `${field.alias || field.name}: ${field.selectionSet}`)
                .join(', ')} ${useFlowExactObject ? '|' : ''}}`,
        ];
    }
    transformPrimitiveFields(schemaType, fields) {
        if (fields.length === 0) {
            return [];
        }
        const useFlowExactObject = this.config.useFlowExactObjects;
        const formatNamedField = this.config.formatNamedField;
        const parentName = (this.config.namespacedImportName ? `${this.config.namespacedImportName}.` : '') +
            this.config.convertName(schemaType.name, {
                useTypesPrefix: true,
            });
        const fieldObj = schemaType.getFields();
        let hasConditionals = false;
        const conditilnalsList = [];
        let resString = `$Pick<${parentName}, {${useFlowExactObject ? '|' : ''} ${fields
            .map(field => {
            if (field.isConditional) {
                hasConditionals = true;
                conditilnalsList.push(field.fieldName);
            }
            return `${formatNamedField(field.fieldName, fieldObj[field.fieldName].type)}: *`;
        })
            .join(', ')} ${useFlowExactObject ? '|' : ''}}>`;
        if (hasConditionals) {
            resString = `$MakeOptional<${resString}, ${conditilnalsList.map(field => `{ ${field}: * }`).join(' | ')}>`;
        }
        return [resString];
    }
    transformTypenameField(type, name) {
        return [`{ ${name}: ${type} }`];
    }
}
//# sourceMappingURL=flow-selection-set-processor.js.map