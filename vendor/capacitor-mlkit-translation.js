var capacitorTranslation = (function (exports, core) {
    'use strict';

    /**
     * The language to translate to or from.
     *
     * @since 0.0.1
     */
    exports.Language = void 0;
    (function (Language) {
        /**
         * @since 0.0.1
         */
        Language["Afrikaans"] = "af";
        /**
         * @since 0.0.1
         */
        Language["Arabic"] = "ar";
        /**
         * @since 0.0.1
         */
        Language["Belarusian"] = "be";
        /**
         * @since 0.0.1
         */
        Language["Bulgarian"] = "bg";
        /**
         * @since 0.0.1
         */
        Language["Bengali"] = "bn";
        /**
         * @since 0.0.1
         */
        Language["Catalan"] = "ca";
        /**
         * @since 0.0.1
         */
        Language["Czech"] = "cs";
        /**
         * @since 0.0.1
         */
        Language["Welsh"] = "cy";
        /**
         * @since 0.0.1
         */
        Language["Danish"] = "da";
        /**
         * @since 0.0.1
         */
        Language["German"] = "de";
        /**
         * @since 0.0.1
         */
        Language["Greek"] = "el";
        /**
         * @since 0.0.1
         */
        Language["English"] = "en";
        /**
         * @since 0.0.1
         */
        Language["Esperanto"] = "eo";
        /**
         * @since 0.0.1
         */
        Language["Spanish"] = "es";
        /**
         * @since 0.0.1
         */
        Language["Estonian"] = "et";
        /**
         * @since 0.0.1
         */
        Language["Persian"] = "fa";
        /**
         * @since 0.0.1
         */
        Language["Finnish"] = "fi";
        /**
         * @since 0.0.1
         */
        Language["French"] = "fr";
        /**
         * @since 0.0.1
         */
        Language["Irish"] = "ga";
        /**
         * @since 0.0.1
         */
        Language["Galician"] = "gl";
        /**
         * @since 0.0.1
         */
        Language["Gujarati"] = "gu";
        /**
         * @since 0.0.1
         */
        Language["Hebrew"] = "he";
        /**
         * @since 0.0.1
         */
        Language["Hindi"] = "hi";
        /**
         * @since 0.0.1
         */
        Language["Croatian"] = "hr";
        /**
         * @since 0.0.1
         */
        Language["Haitian"] = "ht";
        /**
         * @since 0.0.1
         */
        Language["Hungarian"] = "hu";
        /**
         * @since 0.0.1
         */
        Language["Indonesian"] = "id";
        /**
         * @since 0.0.1
         */
        Language["Icelandic"] = "is";
        /**
         * @since 0.0.1
         */
        Language["Italian"] = "it";
        /**
         * @since 0.0.1
         */
        Language["Japanese"] = "ja";
        /**
         * @since 0.0.1
         */
        Language["Georgian"] = "ka";
        /**
         * @since 0.0.1
         */
        Language["Kannada"] = "kn";
        /**
         * @since 0.0.1
         */
        Language["Korean"] = "ko";
        /**
         * @since 0.0.1
         */
        Language["Lithuanian"] = "lt";
        /**
         * @since 0.0.1
         */
        Language["Latvian"] = "lv";
        /**
         * @since 0.0.1
         */
        Language["Macedonian"] = "mk";
        /**
         * @since 0.0.1
         */
        Language["Marathi"] = "mr";
        /**
         * @since 0.0.1
         */
        Language["Malay"] = "ms";
        /**
         * @since 0.0.1
         */
        Language["Maltese"] = "mt";
        /**
         * @since 0.0.1
         */
        Language["Dutch"] = "nl";
        /**
         * @since 0.0.1
         */
        Language["Norwegian"] = "no";
        /**
         * @since 0.0.1
         */
        Language["Polish"] = "pl";
        /**
         * @since 0.0.1
         */
        Language["Portuguese"] = "pt";
        /**
         * @since 0.0.1
         */
        Language["Romanian"] = "ro";
        /**
         * @since 0.0.1
         */
        Language["Russian"] = "ru";
        /**
         * @since 0.0.1
         */
        Language["Slovak"] = "sk";
        /**
         * @since 0.0.1
         */
        Language["Slovenian"] = "sl";
        /**
         * @since 0.0.1
         */
        Language["Albanian"] = "sq";
        /**
         * @since 0.0.1
         */
        Language["Swedish"] = "sv";
        /**
         * @since 0.0.1
         */
        Language["Swahili"] = "sw";
        /**
         * @since 0.0.1
         */
        Language["Tamil"] = "ta";
        /**
         * @since 0.0.1
         */
        Language["Telugu"] = "te";
        /**
         * @since 0.0.1
         */
        Language["Thai"] = "th";
        /**
         * @since 0.0.1
         */
        Language["Tagalog"] = "tl";
        /**
         * @since 0.0.1
         */
        Language["Turkish"] = "tr";
        /**
         * @since 0.0.1
         */
        Language["Ukrainian"] = "uk";
        /**
         * @since 0.0.1
         */
        Language["Urdu"] = "ur";
        /**
         * @since 0.0.1
         */
        Language["Vietnamese"] = "vi";
        /**
         * @since 0.0.1
         */
        Language["Chinese"] = "zh";
    })(exports.Language || (exports.Language = {}));

    const Translation = core.registerPlugin('Translation', {
        web: () => Promise.resolve().then(function () { return web; }).then(m => new m.TranslationWeb()),
    });

    class TranslationWeb extends core.WebPlugin {
        async deleteDownloadedModel(_options) {
            throw this.unimplemented('Not implemented on web.');
        }
        async downloadModel(_options) {
            throw this.unimplemented('Not implemented on web.');
        }
        async getDownloadedModels() {
            throw this.unimplemented('Not implemented on web.');
        }
        async translate(_options) {
            throw this.unimplemented('Not implemented on web.');
        }
    }

    var web = /*#__PURE__*/Object.freeze({
        __proto__: null,
        TranslationWeb: TranslationWeb
    });

    exports.Translation = Translation;

    return exports;

})({}, capacitorExports);
//# sourceMappingURL=plugin.js.map
