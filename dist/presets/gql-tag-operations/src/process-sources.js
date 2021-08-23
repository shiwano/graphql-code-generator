export function processSources(sources, buildName) {
    var _a, _b;
    const sourcesWithOperations = [];
    for (const source of sources) {
        const { document } = source;
        const operations = [];
        for (const definition of (_a = document === null || document === void 0 ? void 0 : document.definitions) !== null && _a !== void 0 ? _a : []) {
            if ((definition === null || definition === void 0 ? void 0 : definition.kind) !== `OperationDefinition` && (definition === null || definition === void 0 ? void 0 : definition.kind) !== 'FragmentDefinition')
                continue;
            if (((_b = definition.name) === null || _b === void 0 ? void 0 : _b.kind) !== `Name`)
                continue;
            operations.push({
                initialName: buildName(definition),
                definition,
            });
        }
        if (operations.length === 0)
            continue;
        sourcesWithOperations.push({
            source,
            operations,
        });
    }
    return sourcesWithOperations;
}
//# sourceMappingURL=process-sources.js.map