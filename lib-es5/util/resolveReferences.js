"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveReferences = void 0;
var debug_1 = __importDefault(require("../debug"));
var documentIds_1 = require("./documentIds");
var defaultResolveOptions = {
    maxDepth: 5,
    overlayDrafts: false,
};
// NOTE: This is now a public API and should be treated as such
function resolveReferences(obj, context, options, currentDepth) {
    if (options === void 0) { options = {}; }
    if (currentDepth === void 0) { currentDepth = 0; }
    var createNodeId = context.createNodeId, getNode = context.getNode;
    var resolveOptions = __assign(__assign({}, defaultResolveOptions), options);
    var overlayDrafts = resolveOptions.overlayDrafts, maxDepth = resolveOptions.maxDepth;
    if (Array.isArray(obj)) {
        return currentDepth <= maxDepth
            ? obj.map(function (item) { return resolveReferences(item, context, resolveOptions, currentDepth + 1); })
            : obj;
    }
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (typeof obj._ref === 'string') {
        var targetId = 
        // If the reference starts with a '-', it means it's a Gatsby node ID,
        // not a Sanity document ID. Thus, it does not need to be rewritten
        obj._ref.startsWith('-')
            ? obj._ref
            : (0, documentIds_1.safeId)(overlayDrafts ? (0, documentIds_1.unprefixId)(obj._ref) : obj._ref, createNodeId);
        (0, debug_1.default)('Resolve %s (Sanity ID %s)', targetId, obj._ref);
        var node = getNode(targetId);
        if (!node && obj._weak) {
            return null;
        }
        else if (!node) {
            (0, debug_1.default)("Could not resolve reference to ID \"".concat(targetId, "\""));
            return null;
        }
        return node && currentDepth <= maxDepth
            ? resolveReferences(remapRawFields(node), context, resolveOptions, currentDepth + 1)
            : obj;
    }
    var initial = {};
    return Object.keys(obj).reduce(function (acc, key) {
        var isRawDataField = key.startsWith('_rawData');
        var value = resolveReferences(obj[key], context, resolveOptions, currentDepth + 1);
        var targetKey = isRawDataField ? "_raw".concat(key.slice(8)) : key;
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
    var initial = {};
    return Object.keys(obj).reduce(function (acc, key) {
        if (key === "internal") {
            return acc;
        }
        if (key.startsWith('_rawData')) {
            var targetKey = key.slice(8);
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