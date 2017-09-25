const loaderUtils = require('loader-utils')
const processCss = require('./processCss')
const CSSFlatError = require('./error')
const vm = require('vm')
const path = require('path')
const loadConfig = require('./getLoaderConfig')
const urlItemRegExpG = /___CSS_FLAT_LOADER_URL___([0-9]+)___/g
const urlItemRegExp = /___CSS_FLAT_LOADER_URL___([0-9]+)___/
const urlItems = []
function getEvaluated(output, modules) {
    const m = { exports: {} }
    try {
        const fn = vm.runInThisContext('(function(module, exports, require) {' + output + '})', 'css-loader-output.js')
        fn(m, m.exports, function (module) {
            if (module.indexOf('css-base') >= 0)
                return require('css-loader/lib/css-base')
            if (module.indexOf('-!/path/css-loader!') === 0)
                module = module.substr(19)
            if (modules && modules[module])
                return modules[module]
            const loaderUrl = '___CSS_FLAT_LOADER_URL___' + urlItems.length + '___'
            urlItems.push({ url: module })
            return loaderUrl
        })
    } catch (e) {
        throw e
    }
    delete m.exports.toString
    delete m.exports.i
    return m.exports
}

module.exports = function (input) {
    if (this.cacheable) this.cacheable()
    const callback = this.async()
    const loader = this
    const file   = this.resourcePath
    const params = loaderUtils.getOptions(this) || {}
    params.plugins = params.plugins || this.options['css-flat']

    let configPath
/*
     params.plugins = []
     params.sourceMap = true */

    if (params.config) {
        if (path.isAbsolute(params.config)) {
            configPath = params.config
        } else {
            configPath = path.join(process.cwd(), params.config)
        }
    } else {
        configPath = path.dirname(file)
    }
    const exports = getEvaluated(input)
    Promise.resolve().then(function () {
        if ( typeof params.plugins !== 'undefined' ) {
            return params
        } else {
            return loadConfig({ webpack: loader }, configPath, { argv: false })
        }
    }).then(function (config) {
        let inputMap = null
        if (config.sourceMap && exports[0][3]) {
            inputMap = JSON.stringify(exports[0][3])
        }

        processCss(exports[0][1], inputMap, {
            from: loaderUtils.getRemainingRequest(loader),
            to: loaderUtils.getCurrentRequest(loader),
            params: config,
            loaderContext: loader,
            locals: exports.locals,
        }, (err, result) => {
            if (err) return callback(err)

            let cssAsString = JSON.stringify(result.source)
            cssAsString = cssAsString.replace(urlItemRegExpG, (item) => {
                const match = urlItemRegExp.exec(item)
                const idx = +match[1]
                const urlItem = urlItems[idx]
                const urlRequest = urlItem.url
                return '\" + require(' + loaderUtils.stringifyRequest(this, urlRequest) + ') + \"'
            })
            let exportJs = JSON.stringify(result.exports)
            if (exportJs) {
                exportJs = 'exports.locals = ' + exportJs + ';'
            }

            let moduleJs
            if (config.sourceMap && result.map) {
                let map = result.map
                map = JSON.stringify(map)
                moduleJs = 'exports.push([module.id, ' + cssAsString + ', "", ' + map + ']);'
            } else {
                moduleJs = 'exports.push([module.id, ' + cssAsString + ', ""]);'
            }

            return callback(null, 'exports = module.exports = require(' +
                loaderUtils.stringifyRequest(loader, require.resolve('css-loader/lib/css-base')) +
                ')(' + params.sourceMap + ');\n' +
                '// imports\n' +
                '' + '\n\n' +
                '// module\n' +
                moduleJs + '\n\n' +
                '// exports\n' +
                exportJs)
        })
    }).catch((err) => {
        console.log(err)
        if (err.name === 'CssSyntaxError') {
            callback(new CSSFlatError(err))
        } else {
            callback(err)
        }
    })

}
