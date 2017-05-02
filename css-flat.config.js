const pxtorem = require('postcss-pxtorem')
const pxtoremOpts = {
    rootValue: 37.5,
    unitPrecision: 5,
    propWhiteList: [],
    selectorBlackList: [],
    replace: true,
    mediaQuery: false,
    minPixelValue: 2,
}
module.exports = { plugins: [require('postcss-flexboxfixer'), require('autoprefixer'), pxtorem(pxtoremOpts)] }
