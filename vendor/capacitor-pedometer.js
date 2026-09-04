/* Vendorisé depuis node_modules/@capgo/capacitor-pedometer/dist/plugin.js
   (build "unpkg") — même convention que vendor/capacitor-camera.js.
   S'enregistre sous "CapacitorPedometer". Doit être chargé APRÈS
   vendor/capacitor-core.js (fournit le vrai capacitorExports.WebPlugin —
   voir son commentaire pour l'historique du bug "Class extends value
   undefined" que le premier shim maison provoquait). */
var capacitorCapacitorPedometer = (function (exports, core) {
    'use strict';

    const CapacitorPedometer = core.registerPlugin('CapacitorPedometer', {
        web: () => Promise.resolve().then(function () { return web; }).then((m) => new m.CapacitorPedometerWeb()),
    });

    class CapacitorPedometerWeb extends core.WebPlugin {
        async getMeasurement(_options) {
            throw this.unimplemented('Not implemented on web.');
        }
        async isAvailable() {
            return {
                stepCounting: false,
                distance: false,
                pace: false,
                cadence: false,
                floorCounting: false,
            };
        }
        async startMeasurementUpdates() {
            throw this.unimplemented('Not implemented on web.');
        }
        async stopMeasurementUpdates() {
            throw this.unimplemented('Not implemented on web.');
        }
        async checkPermissions() {
            throw this.unimplemented('Not implemented on web.');
        }
        async requestPermissions() {
            throw this.unimplemented('Not implemented on web.');
        }
        async getPluginVersion() {
            return { version: 'web' };
        }
    }

    var web = /*#__PURE__*/Object.freeze({
        __proto__: null,
        CapacitorPedometerWeb: CapacitorPedometerWeb
    });

    exports.CapacitorPedometer = CapacitorPedometer;

    return exports;

})({}, capacitorExports);
//# sourceMappingURL=plugin.js.map
