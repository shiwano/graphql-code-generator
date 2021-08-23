function getEnumTypeMap(schema) {
    var _a;
    const typeMap = schema.getTypeMap();
    const result = [];
    for (const key in typeMap) {
        if (((_a = typeMap[key].astNode) === null || _a === void 0 ? void 0 : _a.kind) === 'EnumTypeDefinition') {
            result.push(typeMap[key]);
        }
    }
    return result;
}
function buildArrayDefinition(e) {
    const upperName = e.name
        .replace(/[A-Z]/g, letter => `_${letter}`)
        .slice(1)
        .toUpperCase();
    const values = e
        .getValues()
        .map(v => `'${v.value}'`)
        .join(', ');
    return `export const ${upperName}: ${e.name}[] = [${values}];`;
}
function buildImportStatement(enums, importFrom) {
    const names = Object.values(enums).map(e => e.name);
    return [`import { ${names.join(', ')} } from "${importFrom}";`];
}
const plugin = async (schema, _documents, config) => {
    const importFrom = config.importFrom;
    const enums = getEnumTypeMap(schema);
    const content = enums.map(buildArrayDefinition).join('\n');
    const result = { content };
    if (importFrom) {
        result['prepend'] = buildImportStatement(enums, importFrom);
    }
    return result;
};
const index = { plugin };

export default index;
export { plugin };
