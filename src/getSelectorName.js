let newSel = 1
module.exports = function getSelectorName(decl, opt = {}) {
    let name = ''
    const { ruleType, prefix = '' } = opt
    if (ruleType === 'atomic') {
        // TODO: 暂定使用atomic规则
    } else {
        name = prefix + newSel
        newSel++
    }
    return name
}
