"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveReferences = void 0;
const debug_1 = __importDefault(require("../debug"));
const documentIds_1 = require("./documentIds");
const defaultResolveOptions = {
    maxDepth: 5,
    overlayDrafts: false,
};
// NOTE: This is now a public API and should be treated as such
function resolveReferences(obj, context, options = {}, currentDepth = 0) {
    const { createNodeId, getNode } = context;
    const resolveOptions = Object.assign(Object.assign({}, defaultResolveOptions), options);
    const { overlayDrafts, maxDepth } = resolveOptions;
    if (Array.isArray(obj)) {
        return currentDepth <= maxDepth
            ? obj.map((item) => resolveReferences(item, context, resolveOptions, currentDepth + 1))
            : obj;
    }
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (typeof obj._ref === 'string') {
        const targetId = 
        // If the reference starts with a '-', it means it's a Gatsby node ID,
        // not a Sanity document ID. Thus, it does not need to be rewritten
        obj._ref.startsWith('-')
            ? obj._ref
            : (0, documentIds_1.safeId)(overlayDrafts ? (0, documentIds_1.unprefixId)(obj._ref) : obj._ref, createNodeId);
        (0, debug_1.default)('Resolve %s (Sanity ID %s)', targetId, obj._ref);
        const node = getNode(targetId);
        if (!node && obj._weak) {
            return null;
        }
        else if (!node) {
            (0, debug_1.default)(`Could not resolve reference to ID "${targetId}"`);
            return null;
        }
        return node && currentDepth <= maxDepth
            ? resolveReferences(remapRawFields(node), context, resolveOptions, currentDepth + 1)
            : obj;
    }
    const initial = {};
    return Object.keys(obj).reduce((acc, key) => {
        const isRawDataField = key.startsWith('_rawData');
        const value = resolveReferences(obj[key], context, resolveOptions, currentDepth + 1);
        const targetKey = isRawDataField ? `_raw${key.slice(8)}` : key;
        acc[targetKey] = value;
        return acc;
    }, initial);
}
exports.resolveReferences = resolveReferences;
/**
 * When resolving a Gatsby node through resolveReferences, it's always (through the GraphQL API)
 * operation on a "raw" field. The expectation is to have the return value be as close to the
 * Sanity document as possible. Thus, when we've resolved the node, we want to remap the raw
 * fields to be named as the original field name. `_rawSections` becomes `sections`. Since the
 * value is fetched from the "raw" variant, the references inside it do not have their IDs
 * rewired to their Gatsby equivalents.
 */
function remapRawFields(obj) {
    const initial = {};
    return Object.keys(obj).reduce((acc, key) => {
        if (key === "internal") {
            return acc;
        }
        if (key.startsWith('_rawData')) {
            let targetKey = key.slice(8);
            // Look for UpperCase variant first, if not found, try camelCase
            targetKey =
                typeof obj[targetKey] === 'undefined'
                    ? targetKey[0].toLowerCase() + targetKey.slice(1)
                    : targetKey;
            acc[targetKey] = obj[key];
        }
        else if (!acc[key]) {
            acc[key] = obj[key];
        }
        return acc;
    }, initial);
}
//# sourceMappingURL=resolveReferences.js.map