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

  var events = [];
  var preCallDrawTime = 0;

  $scope.$on('audio:loaded', function(e) {
    var callCanvas = new callCanvasState();
    var callEventCallback = function(nowevent, lookaheadEvent, prevEvent) {
     /*
      $log.debug(
        'now:', nowevent[0].type, nowevent[0].ts, 
        'lookahead', lookaheadEvent, 'prev', prevEvent
        );
        */
        lookaheadEvent.map(function(event) {
          nowevent.push(event);
        });
        events = nowevent;
        callCanvas.draw(events, true);
    };

    var queueEngine = queue.queueEngineFactory(
        Choreography.getEvents(), 
        callEventCallback, 
        $log,
        false
        );

    var callFrameCallback = function(ts) {
      queueEngine.update(AudioEngine.getPlaybackPosition(), true);
      if (ts - preCallDrawTime >= 0) {
        callCanvas.draw(events, false);
        preCallDrawTime = ts;
      }
    };
    FrameManager.addFrameCallback(callFrameCallback);

  });


  /* canvas */
  function callCanvasState() {
    var elem = document.getElementById('call__canvas');
    var ctx = elem.getContext('2d');
    var circleRadius = 50;
    var circleMargin = -10;
    var w, h;
    var currentTime = 0;
    var preDrawTime = 0;
    var tempo = Choreography.getTempo();
    var pixPreSec = ( circleRadius * 2 + circleMargin ) / (tempo.stepToTime(0,4) - tempo.stepToTime(0, 2)) ;
    var preStates = {
        preTime: 0,
        nodeStates: []
    };
    var isDrawComplete = true;

    var getTaikoImage = function(action) {
      var img = new Image();
      img.src = '/images/' + action + '.png';

      return img;
    }

    var taikoImages = {
      '上举' : getTaikoImage('上举'),
      '里打' : getTaikoImage('里打'),
      'Fu!'  : getTaikoImage('Fu!')
    };

    this.draw = function(events, flag) {
      if (!isDrawComplete) return;
      isDrawComplete = false;
      var canvasRect = elem.getBoundingClientRect();
      w = canvasRect.width | 0;
      h = canvasRect.height | 0;
      elem.width = w;
      elem.height = h;
      var y = h / 2;
      // draw 
      ctx.clearRect(0, 0, w, h);
      currentTime = AudioEngine.getPlaybackPosition();

      //sync from events
      if (flag) { 
        //console.log('sync');
        preStates.nodeStates = [];
        events.map(function(event, index) {
          var remainedTime = event.ts - currentTime;
          var x = pixPreSec * remainedTime;
          ctx.drawImage(taikoImages[event.type], x + 50, y - 50);
          //console.log('sync draw');
          preStates.nodeStates.push({
              ts: event.ts,
              type: event.type,
              position: {
                  "x": x,
                  "y": y
              }
          });
        });
      } else {
        //console.log('move');
        preStates.nodeStates.map(function(preState, index) {
          var remainedTime = currentTime - preStates.preTime;
          var x = preState.position.x - pixPreSec * remainedTime;
          preStates.nodeStates[index].position.x = x;
          //console.log('move draw');
          ctx.drawImage(taikoImages[preState.type], x + 50, y - 50);
        });
      }
      preStates.preTime = currentTime;
      isDrawComplete = true;
    };
    
  };



});
/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
