const CSSFlatError = require('./error')
const postcss = require('postcss')
const _ = require('lodash')
const cssnano = require('cssnano')
const getSelectorName = require('./getSelectorName')
const getSelectorType = require('./getSelectorType')

const cacheLocalRuleInfo = {}
const parserPlugin = postcss.plugin('postcss-flat',  (options) => {
    const {
        locals = {},
        prefix = 'a',
        atRulesConfig,
        htmlClass = 'css-flat',
        pseudoMap,
        declPropMap,
        declValueMap,
        sourceMap,
        inputMap,
    } = options
    const genMap = sourceMap && inputMap
    const localsMap = _.invert(locals)
    const localRuleMark = {}
    return (css) => {
        const exports = {}
        // const globalRule = []
        css.walkRules((rule) => {
            let parentParams = 'normal'
            let parentName = ''
            if (rule.parent.type === 'atrule') {
                parentName = rule.parent.name
                if (parentName === 'supports' || parentName === 'media') {
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
                    // globalRule.push(cloneRule)
                } else if (isClassSelector) {
                    const className = sel.replace(/\.| /g, '').replace(selectorHalf, '')
                    rule.walkDecls(function (decl) {
                        const prop = decl.prop.replace('--sourceMap-', '')
                        const value = decl.value
                        const newClassName = getSelectorName(decl, {
                            parentName,
                            parentParams,
                            prefix,
                            atRulesConfig,
                            selectorHalf,
                            pseudoMap,
                            declPropMap,
                            declValueMap,
                        })
                        if (!cacheLocalRuleInfo[newClassName]) {
                            let propLen = 0
                            let priority = ''
                            if (prop[0] !== '-') {
                                propLen = prop.split('-').length
                            }
                            for (let i = 1; i < propLen; i++ ) {
                                priority += '.' + htmlClass
                            }
                            cacheLocalRuleInfo[newClassName] = {
                                prop,
                                value,
                                newClassName,
                                selectorHalf, // 伪类后缀
                                priority: priority + ' ',
                                parentParams,
                            }
                        }
                        localRuleMark[parentParams] = localRuleMark[parentParams] || {}
                        localRuleMark[parentParams][newClassName] = cacheLocalRuleInfo[newClassName]

                        const localsKey = localsMap[className]
                        exports[localsKey] = (exports[localsKey] || (genMap ? className : '')) + ' ' + newClassName
                        if (genMap) {
                            decl.prop = '--sourceMap-' + prop
                            decl.value = value
                        }
                    })
                }
                if (!genMap) {
                    rule.remove()
                }
            })

        })
        css.walkAtRules(/media|supports/, rule => {
            const atRulesConfigKey = ('@' + rule.name + rule.params).replace(/ /g, '')
            for (let newClassName in localRuleMark[rule.params]) {
                const { selectorHalf = '', priority: tempP, prop, value } = cacheLocalRuleInfo[newClassName]
                const atRulePriority = (atRulesConfig[atRulesConfigKey] || {}).priority || ''
                const priority = _.trim(atRulePriority + tempP) + ' '
                rule.append(priority + '.' + newClassName + selectorHalf + '{' + prop + ':' + value + '}')
            }
        })

        for (let newClassName in localRuleMark.normal) {
            const { selectorHalf = '', priority, prop, value } = cacheLocalRuleInfo[newClassName]
            const newSelector = priority + '.' + newClassName + selectorHalf
            css.append(newSelector + '{' + prop + ':' + value + '}')
        }
        options.exports = exports
    }
})

module.exports = function processCss(inputSource, inputMap, options, callback) {
    const {
        minimize,
        atRules = [],
        htmlClass = 'css-flat',
        plugins = [],
        sourceMap,
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

    const parserOptions = _.assign({}, options.params, {
        atRulesConfig,
        locals: options.locals || {},
        inputMap,
    })

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
        map: sourceMap ? {
            prev: inputMap,
            sourcesContent: true,
            inline: false,
            annotation: false,
        } : null,
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


