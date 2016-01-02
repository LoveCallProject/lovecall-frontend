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


var makeImageObj = function(uri) {
  // TODO: hi-dpi
  var result = new Image(100, 100);
  result.src = uri;
  return result;
};


module.exports = {
  taicall: {
    fu: makeImageObj(fu),
    fuwa: makeImageObj(fuwa),
    hh: makeImageObj(hh),
    hi: makeImageObj(hi),
    jump: makeImageObj(jump),
    kh: makeImageObj(kh),
    ld: makeImageObj(ld),
    lt: makeImageObj(lt),
    oh: makeImageObj(oh),
    qh: makeImageObj(qh),
    sj: makeImageObj(sj),
    special: makeImageObj(special),
  },
};
