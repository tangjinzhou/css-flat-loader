var loaderUtils = require('loader-utils')
var processCss = require('./processCss')
var getImportPrefix = require('css-loader/lib/getImportPrefix')
var compileExports = require('css-loader/lib/compile-exports')
var vm = require('vm')

function getEvaluated(output, modules) {
    const m = { exports: {}}
    try {
        const fn = vm.runInThisContext('(function(module, exports, require) {' + output + '})', 'css-loader-output.js')
        fn(m, m.exports, function (module) {
            if (module.indexOf('css-base') >= 0)
                return require('css-loader/lib/css-base')
            if (module.indexOf('-!/path/css-loader!') === 0)
                module = module.substr(19)
            if (modules && modules[module])
                return modules[module]
            return '{' + module + '}'
        })
    } catch (e) {
        throw e
    }
    delete m.exports.toString
    delete m.exports.i
    return m.exports
}

module.exports = function (input, map) {
    if (this.cacheable) this.cacheable()
    var callback = this.async()
    var query = loaderUtils.getOptions(this) || {}
    var exports = getEvaluated(input)
    processCss(exports[0][1], map, {
        from: loaderUtils.getRemainingRequest(this),
        to: loaderUtils.getCurrentRequest(this),
        query: query,
        loaderContext: this,
        locals: exports.locals,
    }, function (err, result) {
        if (err) return callback(err)

        let cssAsString = JSON.stringify(result.source)
        let exportJs = JSON.stringify(result.exports)
        if (exportJs) {
            exportJs = 'exports.locals = ' + exportJs + ';'
        }

        let moduleJs
        if (query.sourceMap && result.map) {
            map = result.map
            if (map.sources) {
                map.sources = map.sources.map(function (source) {
                    return source.split('!').pop()
                }, this)
                map.sourceRoot = ''
            }
            map.file = map.file.split('!').pop()
            map = JSON.stringify(map)
            moduleJs = 'exports.push([module.id, ' + cssAsString + ', "", ' + map + ']);'
        } else {
            moduleJs = 'exports.push([module.id, ' + cssAsString + ', ""]);'
        }

        callback(null, 'exports = module.exports = require(' +
            loaderUtils.stringifyRequest(this, require.resolve('css-loader/lib/css-base')) +
            ')(' + query.sourceMap + ');\n' +
            '// imports\n' +
            '' + '\n\n' +
            '// module\n' +
            moduleJs + '\n\n' +
            '// exports\n' +
            exportJs)
    }.bind(this))
}
