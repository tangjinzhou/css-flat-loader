const _ = require('lodash')
const pseudoRegex = /:[^\s]*/
const attributeRegex = /\[[^\s]*/
module.exports = function getSelectorType(selector, localsMap) {
    let isGlobal = true
    let isClassSelector = true
    let type = 'normal'
    let selectorHalf = ''
    const tempSel = _.trim(selector).replace(/ |>|\+/g, ' ').replace(/\.|#/g, '')
    const names = tempSel.split(' ')
    names.forEach((name) => {
        if (localsMap[name.replace(/\[|:/, ' ').split(' ')[0]]) {
            isGlobal = false
        }
    })
    if (!isGlobal && (names.length !== 1 || _.trim(selector)[0] !== '.')) {
        isClassSelector = false
        throw new Error('css flat仅允许单层类选择器：' + selector)
    } else {
        const s = _.trim(selector)
        const pseudoM = s.match(pseudoRegex)
        const attributeM = s.match(attributeRegex)
        if (pseudoM) {
            type = 'pseudo'
            selectorHalf = pseudoM[0]
        } else if (attributeM) {
            type = 'attribute'
            selectorHalf = attributeM[0]
        }
    }
    return {
        isGlobal,
        isClassSelector: !isGlobal && isClassSelector,
        type,
        selectorHalf,
    }
}
