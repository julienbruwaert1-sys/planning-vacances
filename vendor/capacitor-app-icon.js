/* Vendorisé depuis node_modules/@capawesome/capacitor-app-icon/dist/
   plugin.js (build "unpkg") — même convention que vendor/capacitor-camera.js.
   S'enregistre sous "AppIcon". Doit être chargé APRÈS vendor/capacitor-core.js
   (fournit le vrai capacitorExports.WebPlugin). Voir applyAppIcon() dans
   app.js pour la logique de bascule Android (activity-alias). */
var capacitorAppIcon = (function (exports, core) {
    'use strict';

    /**
     * @since 0.1.0
     */
    exports.ErrorCode = void 0;
    (function (ErrorCode) {
        /**
         * The app icon could not be changed.
         *
         * @since 0.1.0
         */
        ErrorCode["ChangeFailed"] = "CHANGE_FAILED";
        /**
         * The alternate icon with the given name could not be found.
         *
         * @since 0.1.0
         */
        ErrorCode["IconNotFound"] = "ICON_NOT_FOUND";
    })(exports.ErrorCode || (exports.ErrorCode = {}));

    const AppIcon = core.registerPlugin('AppIcon', {
        web: () => Promise.resolve().then(function () { return web; }).then(m => new m.AppIconWeb()),
    });

    class AppIconWeb extends core.WebPlugin {
        async getCurrentIcon() {
            throw this.unimplemented('Not implemented on web.');
        }
        async isAvailable() {
            throw this.unimplemented('Not implemented on web.');
        }
        async resetIcon() {
            throw this.unimplemented('Not implemented on web.');
        }
        async setIcon(_options) {
            throw this.unimplemented('Not implemented on web.');
        }
    }

    var web = /*#__PURE__*/Object.freeze({
        __proto__: null,
        AppIconWeb: AppIconWeb
    });

    exports.AppIcon = AppIcon;

    return exports;

})({}, capacitorExports);
//# sourceMappingURL=plugin.js.map
