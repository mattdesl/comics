var conf = require('./api.json')
var marvelStream = require('./marvel-api-stream')

var characters = ['iron man', ]
var marvelApi = require('marvel-comics-api')

var superheroes = require('superheroes/superheroes.json')
var supervillains = require('supervillains/supervillains.json')
var allChars = superheroes.concat(supervillains)
var async = require('async')
var fs = require('fs')
var path = require('path')
var output = path.join(__dirname, 'data', 'characters.json')
var indexOfName = require('indexof-property')('name')

var cached = JSON.parse(fs.readFileSync(output, 'utf8'))
cached = cached.filter(function (obj) {
  return obj.name
})
console.log("Cached:", cached.length, allChars.length)
console.log(cached.map(function (x) {
  return x.name
}))
process.exit(1)
console.log('total:', allChars.length)
// allChars = allChars.slice(0, 10)
// allChars.slice(0, 0)

async.map(allChars, function (item, next) {
  var idx = indexOfName(cached, item)
  if (idx !== -1) {
    console.log("Exists:", item)
    return next(null, cached[idx])
  }
  
  console.log("Searching:", item)
  marvelApi('characters', {
    publicKey: conf.publicKey,
    privateKey: conf.privateKey,
    query: {
      name: item.toLowerCase()
    }
  }, function (err, body) {
    if (err || !body.data.results[0]) {
      console.error("Error:", item)
      return next(null, null)
    }
    if (body.data.results.length > 0) {
      console.log(item + ' --> ' + body.data.results[0].name)
    }
    
    body.data.results[0].searchName = item
    next(null, body.data.results[0])
  })
}, function (err, results) {
  if (err)  {
    console.error("ERR", err)
  }
  results = results.filter(Boolean)
  fs.writeFile(output, JSON.stringify(results, null, 2), function (err) {
    if (err) throw err
  })
})

// marvelStream('characters', {
//   publicKey: conf.publicKey,
//   privateKey: conf.privateKey,
//   query: {
//     limit: 100,
//     offset: 100,
//     // name: 'Iron Man'
//   },
//   pages: 1
// }).on('data', function (ev) {
//   console.log
// })