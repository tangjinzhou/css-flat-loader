const CSSFlatError = require('./error')
const postcss = require('postcss')
const _ = require('lodash')
const cssnano = require('cssnano')
const getSelectorName = require('./getSelectorName')
const getSelectorType = require('./getSelectorType')
const pseudoMapDefault = require('./pseudoMap')

const cacheLocalRuleInfo = {}
const parserPlugin = postcss.plugin('postcss-flat',  (options) => {
    const {
        locals = {},
        prefix,
        rules,
        atRulesConfig,
        htmlClass,
        pseudoMap,
    } = options
    const localsMap = _.invert(locals)
    const localRuleMark = { normal: {} }
    return (css) => {
        const exports = {}
        const globalRule = []
        css.walkRules((rule) => {
            let parentParams = ''
            let parentName = ''
            let keySuffix = '@'
            if (rule.parent.type === 'atrule') {
                parentName = rule.parent.name
                if (parentName === 'supports' || parentName === 'media') {
                    parentParams = rule.parent.params
                    keySuffix = keySuffix + parentName + parentParams
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
                        let key = prop + ':' + value + ';' + selectorHalf + keySuffix
                        if (!cacheLocalRuleInfo[key]) {
                            const newClassName = getSelectorName(decl, { parentName, parentParams, rules, prefix, atRulesConfig, selectorHalf, pseudoMap })
                            let propLen = 0
                            let priority = ''
                            if (prop[0] !== '-') {
                                propLen = prop.split('-').length
                            }
                            for (let i = 1; i < propLen; i++ ) {
                                priority += '.' + htmlClass
                            }
                            cacheLocalRuleInfo[key] = {
                                newClassName,
                                selectorHalf, // 伪类后缀
                                keySuffix,
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
        css.walkAtRules(/media|supports/, rule => {
            const atRulesConfigKey = ('@' + rule.name + rule.params).replace(/ /g, '')
            for (let key in localRuleMark[rule.params]) {
                const { newClassName, selectorHalf = '', priority: tempP, keySuffix } = cacheLocalRuleInfo[key]
                const atRulePriority = (atRulesConfig[atRulesConfigKey] || {}).priority || ''
                const priority = _.trim(atRulePriority + tempP) + ' '
                rule.append(priority + '.' + newClassName + selectorHalf + '{' + key.replace(';' + selectorHalf + keySuffix, '') + '}')
            }
        })

        for (let key in localRuleMark.normal) {
            const { newClassName, selectorHalf = '', priority, keySuffix } = cacheLocalRuleInfo[key]
            css.append(priority + '.' + newClassName + selectorHalf + '{' + key.replace(';' + selectorHalf + keySuffix, '') + '}')
        }
        css.append(globalRule)

        options.exports = exports
    }
})

module.exports = function processCss(inputSource, inputMap, options, callback) {
    const {
        prefix = 'a',
        minimize,
        plugins = [],
        rules = {},
        atRules = [],
        htmlClass = 'css-flat',
        pseudoMap = pseudoMapDefault,
    } = options.params || {}

    const atRulesConfig = {}
    atRules.forEach((atRule, i) => {
        for (let key in atRule) {
            const value = atRule[key]
            atRulesConfig[key.replace(/ /g, '')] = {
                suffix: value,
                priority: Array(i + 1).fill('.' + htmlClass).join(''),
            }
        }

    })

    const parserOptions = {
        prefix,
        rules,
        atRulesConfig,
        htmlClass,
        locals: options.locals || {},
        pseudoMap,
    }

    const pipeline = postcss([
        cssnano({
            zindex: false,
            normalizeUrl: false,
            discardUnused: false,
            mergeIdents: false,
            autoprefixer: false,
            reduceTransforms: false,
        }),
        parserPlugin(parserOptions),
    ].concat(plugins))

    if (minimize) {
        const minimizeOptions = _.assign({}, minimize)
        ;['zindex', 'normalizeUrl', 'discardUnused', 'mergeIdents', 'reduceIdents', 'autoprefixer'].forEach((name) => {
            if (typeof minimizeOptions[name] === 'undefined')
                minimizeOptions[name] = false
        })
        pipeline.use()
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
        console.log(result.css)
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


