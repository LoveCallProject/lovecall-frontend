/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

require('angular');

require('./provider/choreography');
require('./ui/frame');

var snowhare = require('./data/snowhare');
var wr = require('./data/wr');
// var susutomo = require('./data/susutomo');
var startDash = require('./data/start-dash');
// var nbg = require('./data/nbg');
var kiseki = require('./data/kiseki');

// easter egg
var fdInnerOni = require('./data/fd-inner-oni');


var mod = angular.module('lovecall/init', [
    'lovecall/provider/choreography',
    'lovecall/ui/frame'
]);

mod.run(function($window, Choreography, FrameManager) {
  // load bundled call tables
  Choreography.loadTable(snowhare);
  Choreography.loadTable(wr);
  Choreography.loadTable(kiseki);
  // Choreography.loadTable(susutomo);
  Choreography.loadTable(startDash);
  // Choreography.loadTable(nbg);

  // easter egg
  if (Math.random() < 0.1) {
    Choreography.loadTable(fdInnerOni);
  }

  // frame loop
  FrameManager.startFrameLoop($window);
});
/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
