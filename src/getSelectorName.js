let newSel = 1
let parentNum = 1
const parentParamsSuffixs = {}
module.exports = function getSelectorName(decl, opt = {}) {
    const { ruleType, prefix = '', parentParams, parentName, atRulesConfig } = opt
    const name = [prefix]
    if (ruleType === 'atomic') {
        // eslint-disable-line no-warning-comments TODO: 暂定使用atomic规则
    } else {
        name[1] = newSel
        newSel++
    }
    if (parentParams) {
        const atRulesConfigKey = ('@' + parentName + parentParams).replace(/ /g, '')
        const atRuleSuffix = (atRulesConfig[atRulesConfigKey] || {}).suffix
        parentParamsSuffixs[parentParams] = parentParamsSuffixs[parentParams] || atRuleSuffix || parentNum++
        // name.push(parentParamsSuffixs[parentParams])
        name[1] = name[1] + '_' + parentParamsSuffixs[parentParams]
    }
    return name.join('-')
}
