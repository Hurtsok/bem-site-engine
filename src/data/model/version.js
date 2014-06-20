var u = require('util'),
    _ = require('lodash'),
    DynamicNode = require('./dynamic').DynamicNode;

/**
 * Subclass of dynamic nodes which describe single version of library
 * @param node - {Object} base node configuration
 * @param parent - {BaseNode} parent node
 * @param version - {Object} version of library
 * @constructor
 */
var VersionNode = function(node, parent, version) {
    Object.keys(node).forEach(function(key) { this[key] = node[key]; }, this);

    this
        .init(parent)
        .setTitle(version)
        .setSource(version);
};

VersionNode.prototype = Object.create(DynamicNode.prototype);

/**
 * Sets title for node
 * @param version - {Object} library version
 * @returns {VersionNode}
 */
VersionNode.prototype.setTitle = function(version) {
    this.title = {
        en: version.ref,
        ru: version.ref
    };
    return this;
};

/**
 * Sets source for node
 * @param version - {Object} library version
 * @returns {VersionNode}
 */
VersionNode.prototype.setSource = function(version) {
    var r = version['readme'],
        s = {
            title: version.repo,
            deps: version.deps,
            url: version.url
        };

    this.source = {
        en: _.extend(s, { content: (r && r.en) ? r.en : r }),
        ru: _.extend(s, { content: (r && r.ru) ? r.ru : r })
    };
    return this;
};

/**
 * Sets class for node
 * @returns {VersionNode}
 */
VersionNode.prototype.setClass = function() {
    this.class = 'version';
    return this;
};

exports.VersionNode = VersionNode;