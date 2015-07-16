var loadImage = require('img')
var api = require('marvel-comics-api')
var conf = require('./api.json')
var marvelStream = require('./marvel-api-stream')
var randf = require('randf')
var triangulate = require('delaunay-triangulate')
var context = require('2d-context')()
var newArray = require('new-array')
var drawTriangles = require('draw-triangles-2d')
var getBounds = require('bound-points')
var incenter = require('triangle-incenter')
var vec2 = require('gl-vec2')

var normalizeScale = require('normalize-path-scale')
var parseSVG = require('parse-svg-path')
var getContours = require('svg-path-contours')
var cdt2d = require('cdt2d')
var cleanPSLG = require('clean-pslg')

var batmanSVG = require('extract-svg-path')(__dirname + '/batman-11.svg')

function denestPolyline (nested) {
  var positions = []
  var edges = []
  
  for (var i=0; i<nested.length; i++) {
    var path = nested[i]
    var loop = []
    for (var j=0; j<path.length; j++) {
      var pos = path[j]
      var idx = positions.indexOf(pos)
      if (idx === -1) {
        positions.push(pos)
        idx = positions.length -1
      }
      loop.push(idx)
    }
    edges.push(loop)
  }
  return {
    positions: positions,
    edges: edges
  }
}

function getSVGComplex(svgPath, steiners) {
  var svg = parseSVG(svgPath)
  var contours = getContours(svg)
  var polyline = denestPolyline(contours)

  var positions = polyline.positions
  // positions = normalizeScale(positions)
  
  var bounds = getBounds(positions)
  var min = bounds[0]
  var max = bounds[1]
  
  steiners = steiners || 0
  for (var i=0; i<steiners; i++) {
    positions.push([
      randf(min[0], max[0]),
      randf(min[1], max[1])
    ])
  }

  var loops = polyline.edges
  var edges = []
  for(var i=0; i<loops.length; ++i) {
    var loop = loops[i]
    for(var j=0; j<loop.length; ++j) {
      edges.push([loop[j], loop[(j+1)%loop.length]])
    }
  }

  //This updates points/edges so that they now form a valid PSLG 
  cleanPSLG(positions, edges)

  var cells = cdt2d(positions, edges, {
    exterior: false,
    delaunay: true
  })
  
  positions = normalizeScale(positions)
  positions.forEach(function (pos) {
    var size = 800
    pos[0] *= size
    pos[1] *= size
    pos[0] += window.innerWidth/2
    pos[1] += window.innerHeight/2
    
  })
  return {
    positions: positions,
    cells: cells
  }
}

var app = require('canvas-loop')(context.canvas)
document.body.appendChild(context.canvas)

function perc(n) {
  return Math.floor(Math.random() * 100) + '%' 
}

// var points = newArray(75).map(function () {
//   var center = [window.innerWidth / 2, window.innerHeight / 2]
//   var unit = vec2.random([], Math.random()*250)
//   return vec2.add([], center, unit)
//   // return [ randf(0, window.innerWidth), randf(0, window.innerHeight) ]
// })

// var cells = triangulate(points)

var batman = getSVGComplex(batmanSVG, 25)
var points = batman.positions
var cells = batman.cells

var faces = require('array-shuffle')(cells.map(function (p, i) {
  return i
}))
var cellIdx = 0

// if (false)
marvelStream('comics', {
  publicKey: conf.publicKey,
  privateKey: conf.privateKey,
  query: {
    limit: 100,
    offset: 200,
    // name: 'Iron Man'
  },
  pages: 3
}).on('data', function (comic) {
  console.log(comic)
  
  var uri = thumbnail(comic)
  if (!uri) return
    
  // var face = faces[cellIdx % faces.length]
  var f = cells[cellIdx]
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
  figure.style.backgroundImage = 'url(' + uri + ')'
  figure.style.position = 'absolute'
  figure.style.left = bounds[0][0] + 'px'
  figure.style.top = bounds[0][1] + 'px'
  figure.style.width = (bounds[1][0] - bounds[0][0]) + 'px'
  figure.style.height = (bounds[1][1] - bounds[0][1]) + 'px'
  
  var perc = trianglePercentage(triangle, bounds)
  
  var positions = 'polygon(' + [
    perc[0].join(' '),
    perc[1].join(' '),
    perc[2].join(' ')
  ].join(', ') + ')'
// console.log(positions)
  figure.style['-webkit-clip-path'] = positions
  document.body.appendChild(figure)
  
  // console.log(body.data.results)
  // loadThumbnail(comic, function (err, img) {
  //   if (err) throw err
    
  //   context.save()    
  //   context.beginPath()
    
    
  //   context.moveTo(v0[0], v0[1])
  //   context.lineTo(v1[0], v1[1])
  //   context.lineTo(v2[0], v2[1])
  //   context.lineTo(v0[0], v0[1])
  //   context.clip()
    
  //   var bounds = getBounds([v0, v1, v2])
    
  //   context.translate(bounds[0][0], bounds[0][1]) 
    
  //   // context.fillRect(0, 0, window.innerWidth, window.innerHeight)
  //   var w = bounds[1][0] - bounds[0][0]
  //   var h = bounds[1][1] - bounds[0][1]
  //   context.drawImage(img, 0, 0, w, h)
  //   context.restore()
  // })
}).on('end', function (blah) {
  
  app.once('tick', render)
  app.start()

  function render() {
    
    // console.log(mPath[0])
    // var size = 100
    // context.translate(size*2, size*2)
    // context.beginPath()
    // mPath.forEach(function (x) {
    //   context.lineTo(x[0]*size,x[1]*-size)
    // })
    // context.stroke()
  }
})

function trianglePercentage(triangle, bounds) {
  var center = incenter(triangle)
  return triangle.map(function (point) {
    return [
      (point[0] - bounds[0][0]) / (bounds[1][0] - bounds[0][0]),
      (point[1] - bounds[0][1]) / (bounds[1][1] - bounds[0][1])
    ].map(percentage)
  })
}

function percentage(n) {
  return Math.floor(Math.max(0, Math.min(1, n * 0.95)) * 100) + '%'
}

function thumbnail(item) {
  var thumb = item && item.thumbnail
  if (!thumb || !thumb.path 
      || thumb.path.indexOf('image_not_available') >= 0) {
    return null
  }
  return thumb.path + '/detail.' + thumb.extension
}
  

function loadThumbnail(item, cb) {
  
  // var polys = [
  //   'polygon(100% 0, 0 0, 100% 100%)'
  // ]
  
  // // var positions = 'polygon(' + [
  // //   [ perc(), perc() ].join(' '),
  // //   [ perc(), perc() ].join(' '),
  // //   [ perc(), perc() ].join(' ')
  // // ].join(', ') + ')'
  // // figure.style['-webkit-clip-path'] = positions
  
  // var figure = document.createElement('figure')
  // figure.style.backgroundImage = 'url(' + uri + ')'
  
  
  // document.body.appendChild(figure)
  var uri = thumbnail(item)
  if (!uri) return cb(null)
  
  loadImage(uri, cb)
}