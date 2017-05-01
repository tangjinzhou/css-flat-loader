const resolve = require('path').resolve

const config = require('cosmiconfig')
const assign = require('lodash').assign

const loadPlugins = require('postcss-load-plugins/lib/plugins.js')

module.exports = function cssFlatConfig (ctx, path, options) {
    ctx = assign({ cwd: process.cwd(), env: process.env.NODE_ENV }, ctx)
    path = path ? resolve(path) : process.cwd()
    options = assign({ rcExtensions: true }, options)
    if (!ctx.env) process.env.NODE_ENV = 'development'
    let file
    return config('css-flat', options)
        .load(path)
        .then(function (result) {
            if (!result) throw Error('No css-flat Config found in: ' + path)

            file = result ? result.filepath : ''

            return result ? result.config : {}
        })
        .then(function (config) {
            if (typeof config === 'function') config = config(ctx)
            else config = assign(config, ctx)

            if (!config.plugins) config.plugins = []

            return assign({}, config, {
                plugins: loadPlugins(config),
            })
        })
}
