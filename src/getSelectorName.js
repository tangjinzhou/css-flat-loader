let newSel = 1
let parentNum = 1
const parentParamsSuffixs = {}
module.exports = function getSelectorName(decl, parentParams, opt = {}) {
    let name = []
    const { ruleType, prefix = '' } = opt
    if (ruleType === 'atomic') {
        // TODO: 暂定使用atomic规则
    } else {
        name = [prefix, newSel]
        newSel++
    }
    if(parentParams) {
        parentParamsSuffixs[parentParams] = parentParamsSuffixs[parentParams] || parentNum++
        name.push(parentParamsSuffixs[parentParams])
    }
    return name.join('-')
}
