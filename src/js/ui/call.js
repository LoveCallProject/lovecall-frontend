/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

require('angular');

require('../engine/audio');
require('../provider/choreography');
require('../provider/resize-detector');
require('./frame');
var queue = require('../engine/queue');


var mod = angular.module('lovecall/ui/call', [
    'lovecall/engine/audio',
    'lovecall/provider/choreography',
    'lovecall/provider/resize-detector',
    'lovecall/ui/frame'
]);

mod.controller('CallController', function($scope, $window, $log, AudioEngine, Choreography, FrameManager, ResizeDetector) {
  $log.debug('$scope=', $scope);
  $scope.$on('audio:loaded', function(e) {
    var callEventCallback = function(nowevent, lookaheadEvent, prevEvent) {
      $log.debug('now:', nowevent[0].type, 'lookahead', lookaheadEvent, 'prev', prevEvent);
    };
    var queueEngine = queue.queueEngineFactory(
        Choreography.getEvents(), 
        callEventCallback, 
        $log,
        false
        );
    var callFrameCallback = function(ts) {
      queueEngine.update(AudioEngine.getPlaybackPosition(), true);
    };
    FrameManager.addFrameCallback(callFrameCallback);
  });

});
/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
