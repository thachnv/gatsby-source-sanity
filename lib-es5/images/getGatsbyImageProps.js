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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGatsbyImageData = exports.ImageFormat = exports.EVERY_BREAKPOINT = void 0;
var gatsby_plugin_image_1 = require("gatsby-plugin-image");
var image_url_1 = __importDefault(require("@sanity/image-url"));
exports.EVERY_BREAKPOINT = [
    320,
    654,
    768,
    1024,
    1366,
    1600,
    1920,
    2048,
    2560,
    3440,
    3840,
    4096,
];
var ImageFormat;
(function (ImageFormat) {
    ImageFormat["NO_CHANGE"] = "";
    ImageFormat["WEBP"] = "webp";
    ImageFormat["JPG"] = "jpg";
    ImageFormat["PNG"] = "png";
})(ImageFormat = exports.ImageFormat || (exports.ImageFormat = {}));
var idPattern = /^image-[A-Za-z0-9]+-\d+x\d+-[a-z]+$/;
function buildImageUrl(loc, stub) {
    var projectId = loc.projectId, dataset = loc.dataset;
    var assetId = stub.assetId, extension = stub.extension, metadata = stub.metadata;
    var _a = metadata.dimensions, width = _a.width, height = _a.height;
    var base = 'https://cdn.sanity.io/images';
    return "".concat(base, "/").concat(projectId, "/").concat(dataset, "/").concat(assetId, "-").concat(width, "x").concat(height, ".").concat(extension);
}
function getBasicImageProps(node, loc) {
    if (!node) {
        return false;
    }
    var obj = node;
    var ref = node;
    var img = node;
    var id = '';
    if (typeof node === 'string') {
        id = node;
    }
    else if (obj.asset) {
        id = obj.asset._ref || obj.asset._id;
    }
    else {
        id = ref._ref || img._id;
    }
    var hasId = !id || idPattern.test(id);
    if (!hasId) {
        return false;
    }
    var _a = __read(id.split('-'), 4), assetId = _a[1], dimensions = _a[2], extension = _a[3];
    var _b = __read(dimensions.split('x').map(function (num) { return parseInt(num, 10); }), 2), width = _b[0], height = _b[1];
    var aspectRatio = width / height;
    var metadata = img.metadata || { dimensions: { width: width, height: height, aspectRatio: aspectRatio } };
    var url = img.url || buildImageUrl(loc, { url: '', assetId: assetId, extension: extension, metadata: metadata });
    return {
        url: url,
        assetId: assetId,
        extension: extension,
        metadata: metadata,
    };
}
var fitMap = new Map([
    ["clip", "inside"],
    ["crop", "cover"],
    ["fill", "contain"],
    ["fillmax", "contain"],
    ["max", "inside"],
    ["scale", "fill"],
    ["min", "inside"],
]);
var generateImageSource = function (filename, width, height, toFormat, fit, options) {
    var builder = options.builder;
    var src = builder.width(width).height(height).auto('format').url();
    return { width: width, height: height, format: 'auto', src: src };
};
// gatsby-plugin-image
function getGatsbyImageData(image, _a, loc) {
    var _b, _c;
    var fit = _a.fit, args = __rest(_a, ["fit"]);
    var imageStub = getBasicImageProps(image, loc);
    if (!imageStub || !image) {
        return null;
    }
    var _d = imageStub.metadata.dimensions, width = _d.width, height = _d.height;
    var builder = (0, image_url_1.default)(loc).image(image);
    var imageProps = (0, gatsby_plugin_image_1.generateImageData)(__assign(__assign({}, args), { pluginName: "gatsby-source-sanity", sourceMetadata: {
            format: 'auto',
            width: width,
            height: height,
        }, fit: fit ? fitMap.get(fit) : undefined, filename: imageStub.url, generateImageSource: generateImageSource, options: { builder: builder }, formats: ['auto'], breakpoints: exports.EVERY_BREAKPOINT }));
    var placeholderDataURI;
    if (args.placeholder === "dominantColor") {
        imageProps.backgroundColor = (_c = (_b = imageStub.metadata.palette) === null || _b === void 0 ? void 0 : _b.dominant) === null || _c === void 0 ? void 0 : _c.background;
    }
    if (args.placeholder === "blurred") {
        imageProps.placeholder = imageStub.metadata.lqip
            ? { fallback: imageStub.metadata.lqip }
            : undefined;
    }
    if (placeholderDataURI) {
        imageProps.placeholder = { fallback: placeholderDataURI };
    }
    return imageProps;
}
exports.getGatsbyImageData = getGatsbyImageData;
//# sourceMappingURL=getGatsbyImageProps.js.map