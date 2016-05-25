/**
 * Listener registration
 *
 * @param {String} name
 * @param {Function} func
 * @private
 */
function _registerListener(name, func) {
    if (angular.isUndefined(functions[name])) {
        functions[name] = [];
    }
    functions[name].push(func);
}
/**
 * Registered functions
 * @type {Object}
 */
let functions = {};

class communicationService {
    constructor() {
        functions = {};
    }

    register(listener, func) {
        if (angular.isString(listener)) {
            _registerListener.call(this, listener, func);
            return;
        }
        if (!angular.isObject(listener)) {
            return;
        }
        angular.forEach(listener, (value, name) => {
            if (!angular.isString(name)) {
                return;
            }
            _registerListener.call(this, name, value);
        });
    }

    /**
     * Cleanup service. Remove all listeners
     */
    cleanup() {
        functions = {};
    }

    /**
     * Execute listener
     *
     * @param {String} listener
     */
    execute(listener) {
        if (angular.isUndefined(functions[listener])) {
            return;
        }
        var args = Array.prototype.slice.call(arguments, 1);
        angular.forEach(functions[listener], fn => {
            fn.apply(this, args);
        });
    }
}

export { communicationService };
