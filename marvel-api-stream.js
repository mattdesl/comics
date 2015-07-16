var marvelApi = require('marvel-comics-api')
var through = require('through2').obj
var assign = require('object-assign')

module.exports = marvelApiStream
function marvelApiStream (api, opt) {
  opt = assign({}, opt)
  var pages = typeof opt.pages === 'number' ? opt.pages : 1
  var stream = through()
  
  if (pages === 0) {
    stream.push(null)
    return stream
  }
  
  var query = opt.query || {}
  var numPages = 0
  next()
  return stream
  
  function next() {
    marvelApi(api, opt, function (err, body) {
      if (err) {
        return stream.emit('error', err)
      }
      if (!(/^2/.test(body.code))) {
        return stream.emit('error', new Error(
          'Error Code: ' + body.code + ', status: ' + body.status
        ))
      }
      
      var data = body.data
      if (data.results && data.results.length) {
        data.results.forEach(function (item) {
          stream.emit('data', item)          
        })
      }
      
      // find next page of data
      var offset = data.offset
      var count = data.count
      numPages++
      
      if (numPages < pages && offset + count < data.total) {
        query.offset = offset + count
        next()
      } else {
        // no more data
        stream.push(null)
      }
    })
  } 
}