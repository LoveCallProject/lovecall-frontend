/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

require('angular');

require('../engine/audio');
require('../provider/choreography');
require('../provider/resize-detector');
require('./frame');


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

  var callCanvas = new CallCanvasState(document.querySelectorAll('.call__canvas-container')[0]);

  $scope.$on('audio:loaded', function(e) {
    callCanvas.setTempo(Choreography.getTempo());
    callCanvas.draw(events, true);
  });

  var callFrameCallback = function(ts) {
    if (ts - preCallDrawTime >= 0) {
      callCanvas.draw(events, false);
      preCallDrawTime = ts;
    }
  };


  FrameManager.addFrameCallback(callFrameCallback);


  var callEventCallback = function(nowevent, lookaheadEvent, prevEvent) {
   /*
    $log.debug(
      'now:', nowevent[0].type, nowevent[0].ts,
      'lookahead', lookaheadEvent, 'prev', prevEvent
      );
      */
      lookaheadEvent.forEach(function(event) {
        nowevent.push(event);
      });
      events = nowevent;
      callCanvas.draw(events, true);
  };


  Choreography.addQueueCallback(callEventCallback);


  /* canvas */
  function CallCanvasState(containerElem) {
    var elem = document.createElement('canvas');
    var ctx = elem.getContext('2d');

    var circleRadius = 50;
    var circleMargin = -10;
    var circleDistence = 2 * circleRadius + circleMargin;

    var w = 0;
    var h = 0;
    var axisY = 0;
    var textHeight = 30;
    var currentTime = 0;
    var preDrawTime = 0;
    var isDrawComplete = true;
    var inResizeFallout = true;

    var pixPreSec = 0;

    var preStates = {
        preTime: 0,
        nodeStates: []
    };

    var getTaikoImage = function(action) {
      var img = new Image();
      img.src = '/images/' + action + '.png';

      return img;
    }

    var taikoImages = {
      '上举': getTaikoImage('sj'),
      '里打': getTaikoImage('ld'),
      '里跳': getTaikoImage('lt'),
      'Fu!': getTaikoImage('fufu'),
      'Oh~': getTaikoImage('ppph_oh'),
      'Hi!': getTaikoImage('ppph_hi'),
      '跟唱': getTaikoImage('gc'),
      '前挥': getTaikoImage('qh'),
      '快挥': getTaikoImage('kh'),
      '欢呼': getTaikoImage('gc')  // TODO
    };


    this.setTempo = function(tempo) {
      pixPreSec = +((circleRadius * 2 + circleMargin) / (tempo.stepToTime(0, 4) - tempo.stepToTime(0, 2)));
    };


    var drawStepLine = function(basePos) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.beginPath();
      ctx.moveTo(basePos, 0);
      ctx.lineTo(basePos, h - textHeight);
      ctx.stroke();
    }

    var drawStepLines = function(basePos) {
      var prePos = basePos;
      var afterPos = basePos;

      while (prePos >= 0) {
        prePos -= circleDistence;
        drawStepLine(prePos);
      }

      while (afterPos <= w) {
        afterPos += circleDistence;
        drawStepLine(afterPos);
      }
    }

    this.draw = function(events, flag) {
      if (!isDrawComplete) return;
      isDrawComplete = false;

      if (inResizeFallout) {
        inResizeFallout = false;

        var canvasRect = elem.getBoundingClientRect();
        w = canvasRect.width|0;
        h = canvasRect.height|0;
        elem.width = w;
        elem.height = h;
        axisY = ((h - textHeight) / 2)|0;
      }

      // draw
      ctx.clearRect(0, 0, w, h);
      currentTime = AudioEngine.getPlaybackPosition();

      // sync from events
      if (flag) { 
        //console.log('sync');
        preStates.nodeStates = [];
        events.map(function(event, index) {
          var remainedTime = event.ts - currentTime;
          var x = pixPreSec * remainedTime;
          if (index === 0) {
            drawStepLines(x);
          }
          ctx.drawImage(taikoImages[event.type], x - 50, axisY - 50);
          if (event.params) {
            ctx.font = textHeight + "px sans-serif";
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(event.params, x, 150);
          }
          //console.log('sync draw');
          preStates.nodeStates.push({
              ts: event.ts,
              type: event.type,
              params: event.params,
              position: {
                  "x": x,
                  "y": axisY
              }
          });
        });
      } else {
        //console.log('move');
        preStates.nodeStates.map(function(nodeState, index) {
          var remainedTime = currentTime - preStates.preTime;
          var x = nodeState.position.x - pixPreSec * remainedTime;
          if (index === 0) {
            drawStepLines(x);
          }
          preStates.nodeStates[index].position.x = x;
          //console.log('move draw');
          ctx.drawImage(taikoImages[nodeState.type], x - 50, axisY - 50);
          if (nodeState.params) {
            ctx.font = textHeight + "px sans-serif";
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(nodeState.params, x, 150);
          }
        });
      }
      preStates.preTime = currentTime;
      isDrawComplete = true;
    };

    var onWidgetResize = function(e) {
      inResizeFallout = true;
    };

    // $window.addEventListener('resize', onWidgetResize);
    ResizeDetector.listenTo(containerElem, onWidgetResize);

    containerElem.appendChild(elem);
  };
});
/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
