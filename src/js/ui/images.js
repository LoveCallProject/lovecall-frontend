var fu = require('../../images/fu.svg');
var fuwa = require('../../images/fuwa.svg');
var hh = require('../../images/hh.svg');
var hi = require('../../images/hi.svg');
var jump = require('../../images/jump.svg');
var kh = require('../../images/kh.svg');
var ld = require('../../images/ld.svg');
var lt = require('../../images/lt.svg');
var oh = require('../../images/oh.svg');
var qh = require('../../images/qh.svg');
var sj = require('../../images/sj.svg');
var special = require('../../images/special.svg');
var d = require('../../images/d.svg');
var k = require('../../images/k.svg');

var taicallImages = {};


var makeImageObj = function(key, uri) {
  var result = new Image(100, 100);
  result.src = uri;
  result.onload = function() {
    console.log('builtin image onload:', uri);
    taicallImages[key] = result;
  };
  return result;
};


var objects = [
  makeImageObj('fu', fu),
  makeImageObj('fuwa', fuwa),
  makeImageObj('hh', hh),
  makeImageObj('hi', hi),
  makeImageObj('jump', jump),
  makeImageObj('kh', kh),
  makeImageObj('ld', ld),
  makeImageObj('lt', lt),
  makeImageObj('oh', oh),
  makeImageObj('qh', qh),
  makeImageObj('sj', sj),
  makeImageObj('special', special),
  makeImageObj('d', d),
  makeImageObj('k', k),
];

var taicallImagesCount = objects.length;

module.exports = {
  taicall: taicallImages,
  taicallImagesCount: taicallImagesCount,
};
