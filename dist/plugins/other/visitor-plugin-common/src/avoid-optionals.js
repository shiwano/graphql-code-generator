export const DEFAULT_AVOID_OPTIONALS = {
    object: false,
    inputValue: false,
    field: false,
    defaultValue: false,
};
export function normalizeAvoidOptionals(avoidOptionals) {
    if (typeof avoidOptionals === 'boolean') {
        return {
            object: avoidOptionals,
            inputValue: avoidOptionals,
            field: avoidOptionals,
            defaultValue: avoidOptionals,
        };
    }
    return {
        ...DEFAULT_AVOID_OPTIONALS,
        ...avoidOptionals,
    };
}
//# sourceMappingURL=avoid-optionals.js.map