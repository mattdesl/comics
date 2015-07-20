var conf = require('./api.json')
var marvelStream = require('marvel-comics-api-stream')
var getBounds = require('bound-points')
var shuffle = require('array-shuffle')
var css = require('dom-css')

var batmanSVG = require('extract-svg-path')(__dirname + '/batman-11.svg')
var getSVGComplex = require('./lib/mesh')

var batman = getSVGComplex(batmanSVG, 700, 25)
var points = batman.positions
var cells = batman.cells

var indices = shuffle(cells.map(function (_, i) {
  return i
}))

var cellIdx = 0
var urls = []

marvelStream('characters', {
  publicKey: conf.publicKey,
  privateKey: conf.privateKey,
  query: {
    limit: 100,
    offset: 100,
  },
  pages: 4
}).on('data', function (comic) {
  var url = thumbnail(comic)
  if (!url) return

  var f = cells[indices[cellIdx]]
  if (!f) {
    return
  }
  cellIdx++
  var v0 = points[f[0]],
    v1 = points[f[1]],
    v2 = points[f[2]]
  var triangle = [v0, v1, v2]
  var bounds = getBounds(triangle)

  var figure = document.createElement('figure')

  var perc = trianglePercentage(triangle, bounds)
  urls.push(url)

  var positions = 'polygon(' + [
      perc[0].join(' '),
      perc[1].join(' '),
      perc[2].join(' ')
  ].join(', ') + ')'

  var min = bounds[0]
  var max = bounds[1]
  css(figure, {
    backgroundImage: 'url(' + url + ')',
    position: 'absolute',
    left: min[0],
    top: min[1],
    width: max[0] - min[0],
    height: max[1] - min[1],
    '-webkit-clip-path': positions
  })

  document.body.appendChild(figure)
}).on('end', function () {
  console.log('Total: %d', urls.length)
})

function trianglePercentage (triangle, bounds) {
  var min = bounds[0]
  var max = bounds[1]
  return triangle.map(function (point) {
    return [
      (point[0] - min[0]) / (max[0] - min[0]),
      (point[1] - min[1]) / (max[1] - min[1])
    ].map(function (n) {
      return Math.floor(Math.max(0, Math.min(1, n * 0.95)) * 100) + '%'
    })
  })
}

function thumbnail (item) {
  var thumb = item && item.thumbnail
  if (!thumb || !thumb.path
    || thumb.path.indexOf('image_not_available') >= 0) {
    return null
  }
  return thumb.path + '/detail.' + thumb.extension
}
