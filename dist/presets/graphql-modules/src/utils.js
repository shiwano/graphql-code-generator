import { Kind, } from 'graphql';
import parse from 'parse-filepath';
const sep = '/';
/**
 * Searches every node to collect used types
 */
export function collectUsedTypes(doc) {
    const used = [];
    doc.definitions.forEach(findRelated);
    function markAsUsed(type) {
        pushUnique(used, type);
    }
    function findRelated(node) {
        if (node.kind === Kind.OBJECT_TYPE_DEFINITION || node.kind === Kind.OBJECT_TYPE_EXTENSION) {
            // Object
            markAsUsed(node.name.value);
            if (node.fields) {
                node.fields.forEach(findRelated);
            }
            if (node.interfaces) {
                node.interfaces.forEach(findRelated);
            }
        }
        else if (node.kind === Kind.INPUT_OBJECT_TYPE_DEFINITION || node.kind === Kind.INPUT_OBJECT_TYPE_EXTENSION) {
            // Input
            markAsUsed(node.name.value);
            if (node.fields) {
                node.fields.forEach(findRelated);
            }
        }
        else if (node.kind === Kind.INTERFACE_TYPE_DEFINITION || node.kind === Kind.INTERFACE_TYPE_EXTENSION) {
            // Interface
            markAsUsed(node.name.value);
            if (node.fields) {
                node.fields.forEach(findRelated);
            }
            if (node.interfaces) {
                node.interfaces.forEach(findRelated);
            }
        }
        else if (node.kind === Kind.UNION_TYPE_DEFINITION || node.kind === Kind.UNION_TYPE_EXTENSION) {
            // Union
            markAsUsed(node.name.value);
            if (node.types) {
                node.types.forEach(findRelated);
            }
        }
        else if (node.kind === Kind.ENUM_TYPE_DEFINITION || node.kind === Kind.ENUM_TYPE_EXTENSION) {
            // Enum
            markAsUsed(node.name.value);
        }
        else if (node.kind === Kind.SCALAR_TYPE_DEFINITION || node.kind === Kind.SCALAR_TYPE_EXTENSION) {
            // Scalar
            if (!isGraphQLPrimitive(node.name.value)) {
                markAsUsed(node.name.value);
            }
        }
        else if (node.kind === Kind.INPUT_VALUE_DEFINITION) {
            // Argument
            findRelated(resolveTypeNode(node.type));
        }
        else if (node.kind === Kind.FIELD_DEFINITION) {
            // Field
            findRelated(resolveTypeNode(node.type));
            if (node.arguments) {
                node.arguments.forEach(findRelated);
            }
        }
        else if (node.kind === Kind.NAMED_TYPE) {
            // Named type
            if (!isGraphQLPrimitive(node.name.value)) {
                markAsUsed(node.name.value);
            }
        }
    }
    return used;
}
export function resolveTypeNode(node) {
    if (node.kind === Kind.LIST_TYPE) {
        return resolveTypeNode(node.type);
    }
    if (node.kind === Kind.NON_NULL_TYPE) {
        return resolveTypeNode(node.type);
    }
    return node;
}
export function isGraphQLPrimitive(name) {
    return ['String', 'Boolean', 'ID', 'Float', 'Int'].includes(name);
}
export function unique(val, i, all) {
    return i === all.indexOf(val);
}
export function withQuotes(val) {
    return `'${val}'`;
}
export function indent(size) {
    const space = new Array(size).fill(' ').join('');
    function indentInner(val) {
        return val
            .split('\n')
            .map(line => `${space}${line}`)
            .join('\n');
    }
    return indentInner;
}
export function buildBlock({ name, lines }) {
    if (!lines.length) {
        return '';
    }
    return [`${name} {`, ...lines.map(indent(2)), '};'].join('\n');
}
const getRelativePath = function (filepath, basePath) {
    const normalizedFilepath = normalize(filepath);
    const normalizedBasePath = ensureStartsWithSeparator(normalize(ensureEndsWithSeparator(basePath)));
    const [, relativePath] = normalizedFilepath.split(normalizedBasePath);
    return relativePath;
};
export function groupSourcesByModule(sources, basePath) {
    const grouped = {};
    sources.forEach(source => {
        const relativePath = getRelativePath(source.location, basePath);
        if (relativePath) {
            // PERF: we could guess the module by matching source.location with a list of already resolved paths
            const mod = extractModuleDirectory(source.location, basePath);
            if (!grouped[mod]) {
                grouped[mod] = [];
            }
            grouped[mod].push(source);
        }
    });
    return grouped;
}
function extractModuleDirectory(filepath, basePath) {
    const relativePath = getRelativePath(filepath, basePath);
    const [moduleDirectory] = relativePath.split(sep);
    return moduleDirectory;
}
export function stripFilename(path) {
    const parsedPath = parse(path);
    return normalize(parsedPath.dir);
}
export function normalize(path) {
    return path.replace(/\\/g, '/');
}
function ensureEndsWithSeparator(path) {
    return path.endsWith(sep) ? path : path + sep;
}
function ensureStartsWithSeparator(path) {
    return path.startsWith('.') ? path.replace(/^(..\/)|(.\/)/, '/') : path.startsWith('/') ? path : '/' + path;
}
/**
 * Pushes an item to a list only if the list doesn't include the item
 */
export function pushUnique(list, item) {
    if (!list.includes(item)) {
        list.push(item);
    }
}
export function concatByKey(left, right, key) {
    return left[key].concat(right[key]);
}
export function uniqueByKey(left, right, key) {
    return left[key].filter(item => !right[key].includes(item));
}
export function createObject(keys, valueFn) {
    const obj = {};
    keys.forEach(key => {
        obj[key] = valueFn(key);
    });
    return obj;
}
//# sourceMappingURL=utils.js.map