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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rewriteGraphQLSchema = void 0;
var graphql_1 = require("gatsby/graphql");
var lodash_1 = require("lodash");
var normalize_1 = require("./normalize");
var builtins = ['ID', 'String', 'Boolean', 'Int', 'Float', 'JSON', 'DateTime', 'Date'];
var wantedNodeTypes = ['ObjectTypeDefinition', 'UnionTypeDefinition', 'InterfaceTypeDefinition'];
var rewriteGraphQLSchema = function (schemaSdl, context) {
    var ast = (0, graphql_1.parse)(schemaSdl);
    var transformedAst = transformAst(ast, context);
    var transformed = (0, graphql_1.print)(transformedAst);
    return transformed;
};
exports.rewriteGraphQLSchema = rewriteGraphQLSchema;
function transformAst(ast, context) {
    return __assign(__assign({}, ast), { definitions: ast.definitions
            .filter(isWantedAstNode)
            .map(function (node) { return transformDefinitionNode(node, context, ast); })
            .concat(getResolveReferencesConfigType()) });
}
function isWantedAstNode(astNode) {
    var node = astNode;
    return wantedNodeTypes.includes(node.kind) && node.name.value !== 'RootQuery';
}
function transformDefinitionNode(node, context, ast) {
    switch (node.kind) {
        case 'ObjectTypeDefinition':
            return transformObjectTypeDefinition(node, context, ast);
        case 'UnionTypeDefinition':
            return transformUnionTypeDefinition(node, context);
        case 'InterfaceTypeDefinition':
            return transformInterfaceTypeDefinition(node, context);
        default:
            return node;
    }
}
function transformObjectTypeDefinition(node, context, ast) {
    var scalars = ast.definitions
        .filter(function (def) { return def.kind === 'ScalarTypeDefinition'; })
        .map(function (scalar) { return scalar.name.value; })
        .concat(graphql_1.specifiedScalarTypes.map(function (scalar) { return scalar.name; }));
    var fields = node.fields || [];
    var jsonTargets = fields
        .map(getJsonAliasTarget)
        .filter(function (target) { return target !== null; });
    var blockFields = jsonTargets.map(makeBlockField);
    var interfaces = (node.interfaces || []).map(maybeRewriteType);
    var rawFields = getRawFields(fields, scalars);
    // Implement Gatsby node interface if it is a document
    if (isDocumentType(node)) {
        interfaces.push({ kind: 'NamedType', name: { kind: 'Name', value: 'Node' } });
    }
    return __assign(__assign({}, node), { name: __assign(__assign({}, node.name), { value: getTypeName(node.name.value) }), interfaces: interfaces, directives: [{ kind: 'Directive', name: { kind: 'Name', value: 'dontInfer' } }], fields: __spreadArray(__spreadArray(__spreadArray([], __read(fields
            .filter(function (field) { return !isJsonAlias(field); })
            .map(function (field) { return transformFieldNodeAst(field, node, context); })), false), __read(blockFields), false), __read(rawFields), false) });
}
function getRawFields(fields, scalars) {
    return fields
        .filter(function (field) { return isJsonAlias(field) || !isScalar(field, scalars); })
        .reduce(function (acc, field) {
        var jsonAlias = getJsonAliasTarget(field);
        var name = jsonAlias || field.name.value;
        acc.push({
            kind: field.kind,
            name: { kind: 'Name', value: '_' + (0, lodash_1.camelCase)("raw ".concat(name)) },
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'JSON' } },
            arguments: [
                {
                    kind: 'InputValueDefinition',
                    name: { kind: 'Name', value: 'resolveReferences' },
                    type: {
                        kind: 'NamedType',
                        name: { kind: 'Name', value: 'SanityResolveReferencesConfiguration' },
                    },
                },
            ],
        });
        return acc;
    }, []);
}
function isScalar(field, scalars) {
    return scalars.includes(unwrapType(field.type).name.value);
}
function transformUnionTypeDefinition(node, context) {
    return __assign(__assign({}, node), { types: (node.types || []).map(maybeRewriteType), name: __assign(__assign({}, node.name), { value: getTypeName(node.name.value) }) });
}
function transformInterfaceTypeDefinition(node, context) {
    var fields = node.fields || [];
    return __assign(__assign({}, node), { fields: fields.map(function (field) { return transformFieldNodeAst(field, node, context); }), name: __assign(__assign({}, node.name), { value: getTypeName(node.name.value) }) });
}
function unwrapType(typeNode) {
    if (['NonNullType', 'ListType'].includes(typeNode.kind)) {
        var wrappedType = typeNode;
        return unwrapType(wrappedType.type);
    }
    return typeNode;
}
function getJsonAliasTarget(field) {
    var alias = (field.directives || []).find(function (dir) { return dir.name.value === 'jsonAlias'; });
    if (!alias) {
        return null;
    }
    var forArg = (alias.arguments || []).find(function (arg) { return arg.name.value === 'for'; });
    if (!forArg) {
        return null;
    }
    return (0, graphql_1.valueFromAST)(forArg.value, graphql_1.GraphQLString, {});
}
function isJsonAlias(field) {
    return getJsonAliasTarget(field) !== null;
}
function makeBlockField(name) {
    return {
        kind: 'FieldDefinition',
        name: {
            kind: 'Name',
            value: name,
        },
        arguments: [],
        directives: [],
        type: {
            kind: 'ListType',
            type: {
                kind: 'NamedType',
                name: {
                    kind: 'Name',
                    value: 'SanityBlock',
                },
            },
        },
    };
}
function makeNullable(nodeType) {
    if (nodeType.kind === 'NamedType') {
        return maybeRewriteType(nodeType);
    }
    if (nodeType.kind === 'ListType') {
        var unwrapped = maybeRewriteType(unwrapType(nodeType));
        return {
            kind: 'ListType',
            type: makeNullable(unwrapped),
        };
    }
    return maybeRewriteType(nodeType.type);
}
function transformFieldNodeAst(node, parent, context) {
    var field = __assign(__assign({}, node), { name: maybeRewriteFieldName(node, parent, context), type: rewireIdType(makeNullable(node.type)), description: undefined, directives: [] });
    if (field.type.kind === 'NamedType' && field.type.name.value === 'Date') {
        field.directives.push({ kind: 'Directive', name: { kind: 'Name', value: 'dateformat' } });
    }
    return field;
}
function rewireIdType(nodeType) {
    if (nodeType.kind === 'NamedType' && nodeType.name.value === 'ID') {
        return __assign(__assign({}, nodeType), { name: { kind: 'Name', value: 'String' } });
    }
    return nodeType;
}
function maybeRewriteType(nodeType) {
    var type = nodeType;
    if (typeof type.name === 'undefined') {
        return nodeType;
    }
    // Gatsby has a date type, but not a datetime, so rewire it
    if (type.name.value === 'DateTime') {
        return __assign(__assign({}, type), { name: { kind: 'Name', value: 'Date' } });
    }
    if (builtins.includes(type.name.value)) {
        return type;
    }
    return __assign(__assign({}, type), { name: { kind: 'Name', value: getTypeName(type.name.value) } });
}
function maybeRewriteFieldName(field, parent, context) {
    if (!normalize_1.RESTRICTED_NODE_FIELDS.includes(field.name.value)) {
        return field.name;
    }
    if (parent.kind === 'ObjectTypeDefinition' && !isDocumentType(parent)) {
        return field.name;
    }
    var parentTypeName = parent.name.value;
    var newFieldName = (0, normalize_1.getConflictFreeFieldName)(field.name.value);
    context.reporter.warn("[sanity] Type `".concat(parentTypeName, "` has field with name `").concat(field.name.value, "`, which conflicts with Gatsby's internal properties. Renaming to `").concat(newFieldName, "`"));
    return __assign(__assign({}, field.name), { value: newFieldName });
}
function isDocumentType(node) {
    return (node.interfaces || []).some(function (iface) {
        return iface.kind === 'NamedType' &&
            (iface.name.value === 'SanityDocument' || iface.name.value === 'Document');
    });
}
function getTypeName(name) {
    return name.startsWith('Sanity') ? name : "Sanity".concat(name);
}
function getResolveReferencesConfigType() {
    return {
        kind: 'InputObjectTypeDefinition',
        name: { kind: 'Name', value: 'SanityResolveReferencesConfiguration' },
        fields: [
            {
                kind: 'InputValueDefinition',
                name: { kind: 'Name', value: 'maxDepth' },
                type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } } },
                description: { kind: 'StringValue', value: 'Max depth to resolve references to' },
            },
        ],
    };
}
//# sourceMappingURL=rewriteGraphQLSchema.js.map