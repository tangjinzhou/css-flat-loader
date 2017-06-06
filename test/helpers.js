require("should");
var cssLoader = require("css-loader/index.js");
var vm = require("vm");
var flatLoader = require('../src/loader');
var clone = require('lodash/clone')

function getEvaluated(output, modules) {
    try {
        var fn = vm.runInThisContext("(function(module, exports, require) {" + output + "})", "testcase.js");
        var m = {exports: {}, id: 1};
        fn(m, m.exports, function (module) {
            if (module.indexOf("css-base") >= 0)
                return require("css-loader/lib/css-base");
            if (module.indexOf("-!/path/css-loader!") === 0)
                module = module.substr(19);
            if (modules && modules[module])
                return modules[module];
            return "{" + module + "}";
        });
    } catch (e) {
        console.error(output); // eslint-disable-line no-console
        throw e;
    }
    delete m.exports.toString;
    delete m.exports.i;
    return m.exports;
}

function runLoader(loader, input, map, addOptions, callback) {
    var tempCallback = function (err, output) {
        callback(err, output)
        flatLoader.call({
            options: {
                context: ""
            },
            callback: function () {
            },
            async: function (res) {
                return () => {
                }
            },
            loaders: [{request: "/path/css-loader"}],
            loaderIndex: 0,
            context: "",
            resource: "test.css",
            resourcePath: "test.css",
            request: "css-loader!test.css",
            emitError: function (message) {
                throw new Error(message);
            }
        }, clone(output), map);
    }
    var opt = {
        options: {
            context: ""
        },
        callback: tempCallback,
        async: function () {
            return tempCallback;
        },
        loaders: [{request: "/path/css-loader"}],
        loaderIndex: 0,
        context: "",
        resource: "test.css",
        resourcePath: "test.css",
        request: "css-loader!test.css",
        emitError: function (message) {
            throw new Error(message);
        }
    };
    Object.keys(addOptions).forEach(function (key) {
        opt[key] = addOptions[key];
    });
    loader.call(opt, input, map);
}

exports.testSingleItem = function testSingleItem(name, input, result, query, modules) {
    it(name, function (done) {
        runLoader(cssLoader, input, undefined, {
            query: query
        }, function (err, output) {

            if (err) return done(err);
            var exports = getEvaluated(output, modules);
            /*Array.isArray(exports).should.be.eql(true);
             (exports.length).should.be.eql(1);
             (exports[0].length >= 3).should.be.eql(true);
             (exports[0][0]).should.be.eql(1);
             (exports[0][2]).should.be.eql("");
             (exports[0][1]).should.be.eql(result);*/
            done();
        });
    });
};

