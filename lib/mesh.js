var normalizeScale = require('normalize-path-scale')
var parseSVG = require('parse-svg-path')
var getContours = require('svg-path-contours')
var cdt2d = require('cdt2d')
var cleanPSLG = require('clean-pslg')
var getBounds = require('bound-points')
var random = require('random-float')

module.exports = getSVGComplex
function getSVGComplex (svgPath, size, steiners) {
  var i
  var svg = parseSVG(svgPath)
  var contours = getContours(svg)
  var polyline = denestPolyline(contours)

  var positions = polyline.positions

  var bounds = getBounds(positions)
  var min = bounds[0]
  var max = bounds[1]

  steiners = steiners || 0
  for (i = 0; i < steiners; i++) {
    positions.push([
      random(min[0], max[0]),
      random(min[1], max[1])
    ])
  }

  var loops = polyline.edges
  var edges = []
  for (i = 0; i < loops.length; ++i) {
    var loop = loops[i]
    for (var j = 0; j < loop.length; ++j) {
      edges.push([loop[j], loop[(j + 1) % loop.length]])
    }
  }

  // This updates points/edges so that they now form a valid PSLG 
  cleanPSLG(positions, edges)

  var cells = cdt2d(positions, edges, {
    exterior: false,
    delaunay: true
  })

  // rescale to window size and center
  size = size || 0
  positions = normalizeScale(positions)
  positions.forEach(function (pos) {
    pos[0] *= size
    pos[1] *= size
    pos[0] += window.innerWidth / 2
    pos[1] += window.innerHeight / 2

  })
  return {
    positions: positions,
    cells: cells
  }
}

function denestPolyline (nested) {
  var positions = []
  var edges = []

  for (var i = 0; i < nested.length; i++) {
    var path = nested[i]
    var loop = []
    for (var j = 0; j < path.length; j++) {
      var pos = path[j]
      var idx = positions.indexOf(pos)
      if (idx === -1) {
        positions.push(pos)
        idx = positions.length - 1
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
