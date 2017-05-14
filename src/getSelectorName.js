const pseudoMapDefault = require('./pseudoMap')
const declPropMapDefault = require('./declPropMap')
const declValueMapDefault = require('./declValueMap')
let parentNum = 1
let declPropId = 1
let declValueId = 1
let pseudoId = 1
const parentParamsSuffixs = {}
module.exports = function getSelectorName(decl, opt = {}) {
    const {
        prefix = '',
        parentParams = '',
        parentName,
        atRulesConfig,
        selectorHalf,
        pseudoMap = pseudoMapDefault,
        declPropMap = declPropMapDefault,
        declValueMap = declValueMapDefault,
    } = opt
    const { value: declValue, prop: declProp } = decl
    const name = []
    const name1 = []
    let declPropName = ''
    let declValueName = ''
    let pseudoName = ''
    declPropName = declPropMap[declProp] || declPropId++
    declPropMap[declProp] = declPropName
    name1.push(declPropName)
    if (selectorHalf !== '') {
        pseudoName = pseudoMap[selectorHalf.slice(1).split('(')[0]]
        if (typeof pseudoName === 'function') {
            pseudoName = pseudoName(selectorHalf.slice(1))
        } else if (pseudoName === undefined) {
            pseudoName = pseudoMap[selectorHalf] || pseudoId++
            pseudoMap[selectorHalf] = pseudoName
        }
    }

    if (parentParams) {
        const atRulesConfigKey = ('@' + parentName + parentParams).replace(/ /g, '')
        const atRuleSuffix = (atRulesConfig[atRulesConfigKey] || {}).suffix
        parentParamsSuffixs[parentParams] = parentParamsSuffixs[parentParams] || atRuleSuffix || parentNum++
    }

    if (parentParamsSuffixs[parentParams]) {
        name1.push(pseudoName, parentParamsSuffixs[parentParams])
    } else if (pseudoName) {
        name1.push(pseudoName)
    }

    declValueName = declValueMap[declValue] || declValueId++
    declValueMap[declValue] = declValueName

    name.push(prefix, name1.join('_'), declValueName)
    return name.join('-')
}
