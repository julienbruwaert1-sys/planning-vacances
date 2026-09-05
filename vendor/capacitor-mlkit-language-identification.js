var capacitorLanguageIdentification = (function (exports, core) {
    'use strict';

    const LanguageIdentification = core.registerPlugin('LanguageIdentification', {
        web: () => Promise.resolve().then(function () { return web; }).then(m => new m.LanguageIdentificationWeb()),
    });

    class LanguageIdentificationWeb extends core.WebPlugin {
        async identifyLanguage(_options) {
            throw this.createUnimplementedException();
        }
        async identifyPossibleLanguages(_options) {
            throw this.createUnimplementedException();
        }
        createUnimplementedException() {
            return new core.CapacitorException('This method is not implemented on web.', core.ExceptionCode.Unimplemented);
        }
    }

    var web = /*#__PURE__*/Object.freeze({
        __proto__: null,
        LanguageIdentificationWeb: LanguageIdentificationWeb
    });

    exports.LanguageIdentification = LanguageIdentification;

    return exports;

})({}, capacitorExports);
//# sourceMappingURL=plugin.js.map
