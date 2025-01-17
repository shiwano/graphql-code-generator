import { indent } from '@graphql-codegen/visitor-plugin-common';
import set from 'lodash/set.js';
export class FieldsTree {
    constructor() {
        this._fields = {};
    }
    addField(path, type) {
        if (type === undefined) {
            throw new Error('Did not expect type to be undefined');
        }
        set(this._fields, path, type);
    }
    _getInnerField(root, level = 1) {
        if (typeof root === 'string') {
            return root;
        }
        const fields = Object.keys(root).map(fieldName => {
            const fieldValue = root[fieldName];
            return indent(`${fieldName}: ${this._getInnerField(fieldValue, level + 1)},`, level);
        });
        return level === 1
            ? fields.join('\n')
            : `{
${fields.join('\n')}
${indent('}', level - 1)}`;
    }
    get string() {
        return this._getInnerField(this._fields);
    }
}
//# sourceMappingURL=fields-tree.js.map