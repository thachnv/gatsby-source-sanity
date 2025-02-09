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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTypeMapFromGraphQLSchema = exports.getRemoteGraphQLSchema = exports.defaultTypeMap = void 0;
var lodash_1 = require("lodash");
var graphql_1 = require("gatsby/graphql");
var normalize_1 = require("./normalize");
var errors_1 = require("./errors");
exports.defaultTypeMap = {
    scalars: [],
    objects: {},
    unions: {},
};
function getRemoteGraphQLSchema(client, config) {
    return __awaiter(this, void 0, void 0, function () {
        var graphqlTag, dataset, api, err_1, statusCode, errorCode, message, is404, error;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    graphqlTag = config.graphqlTag;
                    dataset = client.config().dataset;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, client.request({
                            url: "/apis/graphql/".concat(dataset, "/").concat(graphqlTag, "?tag=sanity.gatsby.get-schema"),
                            headers: { Accept: 'application/graphql' },
                        })];
                case 2:
                    api = _a.sent();
                    return [2 /*return*/, api];
                case 3:
                    err_1 = _a.sent();
                    statusCode = (0, lodash_1.get)(err_1, 'response.statusCode');
                    errorCode = (0, lodash_1.get)(err_1, 'response.body.errorCode');
                    message = (0, lodash_1.get)(err_1, 'response.body.message') || (0, lodash_1.get)(err_1, 'response.statusMessage') || err_1.message;
                    is404 = statusCode === 404 || /schema not found/i.test(message);
                    error = new errors_1.ErrorWithCode(is404
                        ? "GraphQL API not deployed - see https://github.com/sanity-io/gatsby-source-sanity#graphql-api for more info\n\n"
                        : "".concat(message), errorCode || statusCode);
                    throw error;
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.getRemoteGraphQLSchema = getRemoteGraphQLSchema;
function getTypeMapFromGraphQLSchema(sdl) {
    var typeMap = { objects: {}, scalars: [], unions: {} };
    var remoteSchema = (0, graphql_1.parse)(sdl);
    var groups = __assign({ ObjectTypeDefinition: [], ScalarTypeDefinition: [], UnionTypeDefinition: [] }, (0, lodash_1.groupBy)(remoteSchema.definitions, 'kind'));
    typeMap.scalars = graphql_1.specifiedScalarTypes
        .map(function (scalar) { return scalar.name; })
        .concat(groups.ScalarTypeDefinition.map(function (typeDef) { return typeDef.name.value; }));
    var objects = {};
    typeMap.objects = groups.ObjectTypeDefinition.reduce(function (acc, typeDef) {
        if (typeDef.name.value === 'RootQuery') {
            return acc;
        }
        var name = (0, normalize_1.getTypeName)(typeDef.name.value);
        acc[name] = {
            name: name,
            kind: 'Object',
            isDocument: Boolean((typeDef.interfaces || []).find(function (iface) { return iface.name.value === 'Document'; })),
            fields: (typeDef.fields || []).reduce(function (fields, fieldDef) {
                if (isAlias(fieldDef)) {
                    var aliasFor = getAliasDirective(fieldDef) || '';
                    fields[aliasFor] = {
                        type: fieldDef.type,
                        namedType: { kind: 'NamedType', name: { kind: 'Name', value: 'JSON' } },
                        isList: false,
                        aliasFor: null,
                        isReference: false,
                    };
                    var aliasName = '_' + (0, lodash_1.camelCase)("raw ".concat(aliasFor));
                    fields[aliasName] = {
                        type: { kind: 'NamedType', name: { kind: 'Name', value: 'JSON' } },
                        namedType: { kind: 'NamedType', name: { kind: 'Name', value: 'JSON' } },
                        aliasFor: aliasFor,
                        isList: false,
                        isReference: false,
                    };
                    return fields;
                }
                var namedType = unwrapType(fieldDef.type);
                fields[fieldDef.name.value] = {
                    type: fieldDef.type,
                    namedType: namedType,
                    isList: isListType(fieldDef.type),
                    aliasFor: null,
                    isReference: Boolean(getReferenceDirective(fieldDef)),
                };
                // Add raw alias if not scalar
                if (!typeMap.scalars.includes(namedType.name.value)) {
                    var aliasName = '_' + (0, lodash_1.camelCase)("raw ".concat(fieldDef.name.value));
                    fields[aliasName] = {
                        type: { kind: 'NamedType', name: { kind: 'Name', value: 'JSON' } },
                        namedType: { kind: 'NamedType', name: { kind: 'Name', value: 'JSON' } },
                        aliasFor: fieldDef.name.value,
                        isList: false,
                        isReference: false,
                    };
                }
                return fields;
            }, {}),
        };
        return acc;
    }, objects);
    var unions = {};
    typeMap.unions = groups.UnionTypeDefinition.reduce(function (acc, typeDef) {
        var name = (0, normalize_1.getTypeName)(typeDef.name.value);
        acc[name] = {
            name: name,
            types: (typeDef.types || []).map(function (type) { return (0, normalize_1.getTypeName)(type.name.value); }),
        };
        return acc;
    }, unions);
    return typeMap;
}
exports.getTypeMapFromGraphQLSchema = getTypeMapFromGraphQLSchema;
function isAlias(field) {
    return getAliasDirective(field) !== null;
}
function unwrapType(typeNode) {
    if (['NonNullType', 'ListType'].includes(typeNode.kind)) {
        var wrappedType = typeNode;
        return unwrapType(wrappedType.type);
    }
    return typeNode;
}
function isListType(typeNode) {
    if (typeNode.kind === 'ListType') {
        return true;
    }
    if (typeNode.kind === 'NonNullType') {
        var node = typeNode;
        return isListType(node.type);
    }
    return false;
}
function getAliasDirective(field) {
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
function getReferenceDirective(field) {
    return (field.directives || []).find(function (dir) { return dir.name.value === 'reference'; });
}
//# sourceMappingURL=remoteGraphQLSchema.js.map