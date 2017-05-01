const formatCodeFrame = require('babel-code-frame')
const CSSFlatError = require('./error')
const postcss = require('postcss')
const _ = require('lodash')
const getSelectorName = require('./getSelectorName')
const getSelectorType = require('./getSelectorType')

const cacheLocalRuleInfo = {}
var parserPlugin = postcss.plugin('postcss-flat',  (options) => {
    const { locals = {}, ruleType, prefix } = options
    const localsMap = _.invert(locals)
    const localRuleMark = {normal: {}}
    return (css) => {
        const exports = {}
        const globalRule = []
        css.walkRules((rule) => {
            let parentParams = ''
            if(rule.parent.type === 'atrule'){
                if(rule.parent.name === 'supports' || rule.parent.name === 'media') {
                    parentParams = rule.parent.params
                } else {
                    return
                }
            }

            rule.selector.split(',').forEach((sel) => {
                const selectorType = getSelectorType(sel, localsMap)
                const { isGlobal, isClassSelector, selectorHalf = '' } = selectorType
                if (isGlobal) {
                    const globalSel = _.trim(sel)
                    const cloneRule = rule.clone()
                    cloneRule.selector = globalSel
                    globalRule.push(cloneRule)
                } else if (isClassSelector) {
                    const className = sel.replace(/\.| /g, '').replace(selectorHalf, '')
                    rule.walkDecls(function (decl) {
                        const prop = decl.prop
                        const value = decl.value
                        let key = prop + ':' + value + ';' + selectorHalf
                        if (!cacheLocalRuleInfo[key]) {
                            const newClassName = getSelectorName(decl, parentParams, { ruleType, prefix })
                            let propLen = 0
                            let priority = ''
                            if (prop[0] !== '-') {
                                propLen = prop.split('-').length
                            }
                            for (let i = 1; i < propLen; i++ ) {
                                if (i === 1) {
                                    priority += 'html'
                                } else {
                                    priority += '.css-flat-' + (i - 1)
                                }
                            }
                            cacheLocalRuleInfo[key] = {
                                newClassName,
                                selectorHalf, // 伪类后缀
                                priority: priority + ' ', // margin-top 权重要大于 margin 不考虑顺序
                            }
                        }
                        if (parentParams) {
                            localRuleMark[parentParams] = localRuleMark[parentParams] || {}
                            localRuleMark[parentParams][key] = cacheLocalRuleInfo[key].newClassName
                        } else {
                            localRuleMark.normal[key] = cacheLocalRuleInfo[key].newClassName
                        }

                        const localsKey = localsMap[className]
                        exports[localsKey] = (exports[localsKey] || '') + cacheLocalRuleInfo[key].newClassName + ' '
                    })
                }
            })
            rule.remove()
        })
        css.walkAtRules('media', rule => {
            console.log(rule.params)
            for (let key in localRuleMark[rule.params]) {
                const { newClassName, selectorHalf = '', priority } = cacheLocalRuleInfo[key]
                rule.append(priority + '.' + newClassName + selectorHalf + '{' + key.replace(';' + selectorHalf, '') + '}')
            }
        });

        for (let key in localRuleMark.normal) {
            const { newClassName, selectorHalf = '', priority } = cacheLocalRuleInfo[key]
            css.append(priority + '.' + newClassName + selectorHalf + '{' + key.replace(';' + selectorHalf, '') + '}')
        }
        css.append(globalRule)

        options.exports = exports
    }
})

module.exports = function processCss(inputSource, inputMap, options, callback) {
    const { prefix = 'a', minimize, plugins = [], rule = {}, atRuleSuffix = {} } = options.params || {}

    const pipeline = postcss([
        parserPlugin({ prefix, rule, atRuleSuffix }),
    ].concat(plugins))

    if(minimize) {
        const cssnano = require("cssnano")
        const minimizeOptions = _.assign({}, minimize)
        ["zindex", "normalizeUrl", "discardUnused", "mergeIdents", "reduceIdents", "autoprefixer"].forEach(function(name) {
            if(typeof minimizeOptions[name] === "undefined")
                minimizeOptions[name] = false;
        })
        pipeline.use(cssnano(minimizeOptions))
    }

    pipeline.process(inputSource, {
        from: '/css-flat-loader!' + options.from,
        to: options.to,
        map: {
            prev: inputMap,
            sourcesContent: true,
            inline: false,
            annotation: false,
        },
    }).then(function (result) {
        callback(null, {
            source: result.css,
            map: result.map && result.map.toJSON(),
            exports: parserOptions.exports,
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


