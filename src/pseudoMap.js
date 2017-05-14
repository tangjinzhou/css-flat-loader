function getPseudoShort(preShort, pseudo) {
    return preShort + '_' + pseudo.split('(')[1].split(')')[0]
}
const pseudoMap = {
    'link': 'l',
    'visited': 'v',
    'active': 'a',
    'hover': 'h',
    'focus': 'f',
    'first-letter': 'fle',
    'first-line': 'fli',
    'first-child': 'fc',
    'before': 'be',
    'after': 'af',
    'first-of-type': 'fot',
    'last-of-type': 'lot',
    'only-of-type': 'oot',
    'only-child': 'oc',
    'nth-child': (pseudo) => {
        return getPseudoShort('nc', pseudo)
    },
    'nth-last-child': (pseudo) => {
        return getPseudoShort('nlc', pseudo)
    },
    'nth-of-type': (pseudo) => {
        return getPseudoShort('not', pseudo)
    },
    'nth-last-of-type': (pseudo) => {
        return getPseudoShort('nlot', pseudo)
    },
    'last-child': 'lc',
    'root': 'r',
    'empty': 'e',
    'target': 't',
    'enabled': 'en',
    'disabled': 'd',
    'checked': 'c',
}
module.exports = pseudoMap
