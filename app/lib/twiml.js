module.exports = {
  xmlResponse(contents) {
    let out = this.header()
    out += contents
    return this._xmlFormat(out)
  },
  _xmlFormat(string) {
    // TODO: maybe support more replacements
    return string.replace(/&amp;/gi, '&').replace(/&/gi, '&amp;')
  },
  _formatParams(params) {
    let out = ""
    for (let key in params) {
      out += ` ${key}="${params[key]}"`
    }
    return out
  },
  _singleItem(name, params) {
    return `<${name} ${this._formatParams(params)} />`
  },
  _wrappedItem(name, contents, params) {
    if (!contents) {
      contents = ""
    }
    if (contents.constructor === Array) {
      contents = contents.join("")
    }
    return `<${name}${this._formatParams(params)}>${contents}</${name}>`
  },
  header() {
    return `<?xml version='1.0' encoding='UTF-8'?>`
  },
  response(contents, params) {
    return this._wrappedItem('Response', contents, params)
  },
  play(contents, params) {
    return this._wrappedItem('Play', contents, params)
  },
  say(contents, params) {
    return this._wrappedItem('Say', contents, params)
  },
  record(contents, params) {
    return this._singleItem('Record', params)
  },
}