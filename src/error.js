const formatCodeFrame = require('babel-code-frame')

function formatMessage(message, loc, source) {
    let formatted = message
    if (loc) {
        formatted = formatted + ' (' + loc.line + ':' + loc.column + ')'
    }
    if (loc && source) {
        formatted = formatted + '\n\n' + formatCodeFrame(source, loc.line, loc.column) + '\n'
    }
    return formatted
}

function CSSFlatError(error) {
    const {reason} = error
    Error.call(this)
    Error.captureStackTrace(this, CSSFlatError)
    this.name = 'Syntax Error'
    this.error = error.input.source
    const loc = err.line !== null && err.column !== null ? { line: err.line, column: err.column } : null
    this.message = formatMessage(error.reason, loc, error.input.source)
    this.hideStack = true
}

CSSFlatError.prototype = Object.create(Error.prototype)
CSSFlatError.prototype.constructor = CSSFlatError

module.exports = CSSFlatError;
