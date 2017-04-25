const formatCodeFrame = require('babel-code-frame')
const postcss = require('postcss')
const _ = require('lodash')
const getSelectorName = require('./getSelectorName')
const getSelectorType = require('./getSelectorType')

function formatMessage(message, loc, source) {
    var formatted = message
    if (loc) {
        formatted = formatted + ' (' + loc.line + ':' + loc.column + ')'
    }
    if (loc && source) {
        formatted = formatted + '\n\n' + formatCodeFrame(source, loc.line, loc.column) + '\n'
    }
    return formatted
}

function CSSFlatError(name, message, loc, source, error) {
    Error.call(this)
    Error.captureStackTrace(this, CSSFlatError)
    this.name = name
    this.error = error
    this.message = formatMessage(message, loc, source)
    this.hideStack = true
}

CSSFlatError.prototype = Object.create(Error.prototype)
CSSFlatError.prototype.constructor = CSSFlatError
const cacheLocalRuleInfo = {}
var parserPlugin = postcss.plugin('postcss-flat',  (options) => {
    const { locals = {}, ruleType, prefix } = options
    const localsMap = _.invert(locals)
    const localRuleMark = {normal: {}}
    return (css) => {
        const exports = {}
        const globalRule = []
        css.walkRules((rule) => {
            // rule.parent.type === 'atrule' && rule.parent.name !== 'media'
            // test.push(rule.clone())
            if(rule.parent.type === 'atrule' && rule.parent.name.indexOf('keyframes') >= 0 ) {
                return;
            }
            let mediaName = ''
            if(rule.parent.type === 'atrule' && rule.parent.name.indexOf('media') >= 0 ) {
                //rule.parent.append({ selector: 'a' });
                //return;
                mediaName = rule.parent.params
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
                    if (rule.parent.type !== 'atrule' || rule.parent.name === 'media') {
                        rule.walkDecls(function (decl) {
                            const prop = decl.prop
                            const value = decl.value
                            let key = prop + ':' + value + ';' + selectorHalf
                            if (!cacheLocalRuleInfo[key]) {
                                const newClassName = getSelectorName(decl, { ruleType, prefix })
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
                            if (mediaName) {
                                localRuleMark[mediaName] = localRuleMark[mediaName] || {}
                                localRuleMark[mediaName][key] = cacheLocalRuleInfo[key].newClassName
                            } else {
                                localRuleMark.normal[key] = cacheLocalRuleInfo[key].newClassName
                            }

                            const localsKey = localsMap[className]
                            exports[localsKey] = (exports[localsKey] || '') + cacheLocalRuleInfo[key].newClassName + ' '
                        })
                    }
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
    var query = options.query || {}
    var root = query.root

    var parserOptions = {
        root: root,
        locals: options.locals,
        prefix: query.prefix || 'a',
    }

    var pipeline = postcss([
        parserPlugin(parserOptions),
    ])

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
    }).catch(function (err) {
        console.log(err)
        if (err.name === 'CssSyntaxError') {
            var wrappedError = new CSSFlatError(
                'Syntax Error',
                err.reason,
                err.line !== null && err.column !== null ? { line: err.line, column: err.column } : null,
                err.input.source
            )
            callback(wrappedError)
        } else {
            callback(err)
        }
    })
}


