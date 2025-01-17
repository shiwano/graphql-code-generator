export const getFlagConfigForVariableDefinition = (definition) => {
    const { list, required, innerType } = getInnerType(definition.type);
    const oclifType = mapVariableTypeToOclifType(innerType);
    const parser = getParserForType(innerType);
    return `${definition.variable.name.value}: flags.${oclifType}({
  multiple: ${list},
  required: ${required},${parser ? `\n  parse: ${parser}` : ''}
})`;
};
// Supply a custom parser for oclif flag configuration
const getParserForType = (type) => {
    if (type.name.value === 'Float') {
        return 'input => Number(input)';
    }
};
const mapVariableTypeToOclifType = (type) => {
    if (type.name.value === 'Boolean') {
        return 'boolean';
    }
    else if (['Float', 'Int'].includes(type.name.value)) {
        // A quirk of oclif is that "integer" allows for any `number`-typed response, and then
        //   we supply our own parsing function to make sure it's a float and not an integer
        return 'integer';
    }
    else {
        return 'string';
    }
};
// Retrieve the inner type if nested within List and/or NonNull
const getInnerType = (type) => {
    const result = {
        list: false,
        required: false,
    };
    let _type = type;
    while (_type.kind !== 'NamedType') {
        if (_type.kind === 'ListType') {
            result.list = true;
        }
        else if (_type.kind === 'NonNullType') {
            result.required = true;
        }
        _type = _type.type;
    }
    result.innerType = _type;
    return result;
};
// remove all @oclif directives from the document for transmission to the server
export const omitOclifDirectives = (node) => {
    const directives = node.directives.filter(directive => directive.name.value !== 'oclif');
    return Object.assign({}, node, { directives });
};
//# sourceMappingURL=utils.js.map