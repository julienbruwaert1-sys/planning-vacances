/* Vendorisé depuis node_modules/@capacitor/app/dist/plugin.js — même
   convention que vendor/capacitor-camera.js (voir son commentaire),
   requis en dépendance par @aparajita/capacitor-biometric-auth (variable
   globale "capacitorApp" attendue par vendor/capacitor-biometric-auth.js,
   à charger APRÈS ce fichier). */
var capacitorApp = (function (exports, core) {
    'use strict';

    const App = core.registerPlugin('App', {
        web: () => Promise.resolve().then(function () { return web; }).then((m) => new m.AppWeb()),
    });

    class AppWeb extends core.WebPlugin {
        constructor() {
            super();
            this.handleVisibilityChange = () => {
                const data = {
                    isActive: document.hidden !== true,
                };
                this.notifyListeners('appStateChange', data);
                if (document.hidden) {
                    this.notifyListeners('pause', null);
                }
                else {
                    this.notifyListeners('resume', null);
                }
            };
            document.addEventListener('visibilitychange', this.handleVisibilityChange, false);
        }
        exitApp() {
            throw this.unimplemented('Not implemented on web.');
        }
        async getInfo() {
            throw this.unimplemented('Not implemented on web.');
        }
        async getLaunchUrl() {
            return { url: '' };
        }
        async getState() {
            return { isActive: document.hidden !== true };
        }
        async minimizeApp() {
            throw this.unimplemented('Not implemented on web.');
        }
        async toggleBackButtonHandler() {
            throw this.unimplemented('Not implemented on web.');
        }
        async getAppLanguage() {
            return {
                value: navigator.language.split('-')[0].toLowerCase(),
            };
        }
    }

    var web = /*#__PURE__*/Object.freeze({
        __proto__: null,
        AppWeb: AppWeb
    });

    exports.App = App;

    return exports;

})({}, capacitorExports);
//# sourceMappingURL=plugin.js.map
