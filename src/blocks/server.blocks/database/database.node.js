var util = require('util'),
    path = require('path'),

    _ = require('lodash'),
    vow = require('vow'),
    vowFs = require('vow-fs'),
    levelup = require('level');

modules.define('database', ['logger'], function (provide, logger) {
    logger = logger(module);

    var DB_NAME = 'leveldb',
        DB_OPTIONS = {
            keyEncoding: 'utf-8',
            valueEncoding: {
                encode: JSON.stringify,
                decode: function (val) {
                    try {
                        return JSON.parse(val);
                    } catch (err) {
                        return val;
                    }
                },
                buffer: false,
                type: 'custom'
            },
            cacheSize: 100 * 1024 * 1024
        },

        db = null,

        /**
         * Returns data by criteria
         * @param {Function} criteria function
         * @param {Object} config object for set type of data that should be returned
         * @returns {*}
         */
        _getByCriteria = function (criteria, config) {
            logger.verbose(JSON.stringify(config));

            var def = vow.defer(),
                result = [];
            db.createReadStream(_.extend({}, DB_OPTIONS, config))
                .on('data', function (data) {
                    if (criteria(data)) {
                        result.push(data);
                    }
                })
                .on('error', function (err) {
                    def.reject(err);
                })
                .on('close', function () {
                    def.resolve(result);
                })
                .on('end', function () {
                    def.resolve(result);
                });
            return def.promise();
        };

    provide({
        /**
         * Initialize database
         */
        connect: function (dbPath) {
            var def = vow.defer();
            return vowFs
                .makeDir(path.join(process.cwd(), 'db'))
                .then(function () {
                    try {
                        db = levelup(dbPath || path.join('db', DB_NAME));
                        logger.info('Database was initialized successfully');
                        def.resolve();
                    } catch (err) {
                        var message = util.format('Can not connect to leveldb database. Error: %s', err.message);
                        logger.error(message);
                        def.reject(message);
                    }
                    return def.promise();
                });
        },

        /**
         * Disconnect from leveldb database
         * @returns {*}
         */
        disconnect: function () {
            var def = vow.defer();
            if (!db) {
                logger.warn('database was not initialized yet');
            }

            if (!db.isOpen()) {
                logger.warn('database was already closed');
            }

            db.close(function (err) {
                if (err) {
                    logger.error('Error %s occur while close the database', err);
                    def.reject();
                } else {
                    logger.info('Database was successfully closed');
                    def.resolve();
                }
            });

            return def.promise();
        },

        /**
         * Returns value by key
         * @param {String} key of record
         * @returns {Object} value of record
         */
        get: function (key, options) {
            options = options || {};
            logger.verbose(util.format('get: %s', key));

            var def = vow.defer();
            db.get(key, _.extend({}, DB_OPTIONS, options), function (err, value) {
                if (err) {
                    if (err.type === 'NotFoundError') {
                        return def.resolve();
                    }
                    def.reject();
                }
                def.resolve(value);
            });
            return def.promise();
        },

        /**
         * Put value into storage by key
         * @param {String} key of record
         * @param {Object} value of record
         * @returns {*}
         */
        put: function (key, value, options) {
            options = options || {};
            logger.verbose(util.format('put: %s %s', key, value), module);

            var def = vow.defer();
            db.put(key, value, _.extend({}, DB_OPTIONS, options), function (err) {
                err ? def.reject(err) : def.resolve();
            });
            return def.promise();
        },

        /**
         * Returns array of values by criteria function
         * @param {Function} criteria function
         * @param {Object} options - advanced options object
         * @returns {*}
         */
        getValuesByCriteria: function (criteria, options) {
            return _getByCriteria(criteria, _.extend({ keys: false, values: true }, options || {}));
        },

        /**
         * Returns array of database records by criteria function
         * @param {Function} criteria function
         * @param {Object} options - advanced options object
         * @returns {*}
         */
        getByCriteria: function (criteria, options) {
            return _getByCriteria(criteria, _.extend({ keys: true, values: true }, options || {}));
        },

        /**
         * Returns records from database by prefix of record key
         * @param {String} prefix of database keys
         * @param {Object} options - advanced options object
         * @returns {*}
         */
        getByKeyPrefix: function (prefix, options) {
            return this.getByCriteria(function (record) {
                return record.key.indexOf(prefix) > -1;
            }, options);
        },

        /**
         * Performs batch operations in database
         * @param {Array} operations - array of operations that should be performed in batch mode
         * @returns {*}
         */
        batch: function (operations) {
            if (!operations.length) {
                return vow.resolve();
            }

            var def = vow.defer();
            db.batch(operations, DB_OPTIONS, function (err) {
                if (err) {
                    def.reject(err);
                } else {
                    def.resolve();
                }
            });
            return def.promise();
        }
    });
});
