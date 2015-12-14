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

    var circleR = 50;
    var circleMargin = -10;
    var circleDistance = 2 * circleR + circleMargin;
    var conveyorH = 150;
    var conveyorBorderT = 4;
    var conveyorBorderB = 4;
    var textMarginT = 4;
    var textMarginB = 8;
    var textH = 30;
    var textBorderB = 1;

    var w = 0;
    var h = 0;
    var stepLineY1 = 0;
    var stepLineY2 = 0;
    var axisY = 0;
    var textTopY = 0;
    var textBaselineY = 0;
    var textBorderBottomY = 0;
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
      pixPreSec = +((circleR * 2 + circleMargin) / (tempo.stepToTime(0, 4) - tempo.stepToTime(0, 2)));
    };


    var drawStepLine = function(basePos) {
      basePos = basePos|0;

      ctx.beginPath();
      ctx.moveTo(basePos, stepLineY1);
      ctx.lineTo(basePos, stepLineY2);
      ctx.stroke();
    }

    var drawStepLines = function(basePos) {
      var prePos = basePos;
      var afterPos = basePos;

      ctx.save();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      while (prePos >= 0) {
        prePos -= circleDistance;
        drawStepLine(prePos);
      }

      while (afterPos <= w) {
        afterPos += circleDistance;
        drawStepLine(afterPos);
      }

      ctx.restore();
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

        stepLineY1 = (conveyorBorderT)|0;
        stepLineY2 = (conveyorBorderT + conveyorH)|0;
        axisY = (conveyorBorderT + conveyorH / 2)|0;
        textTopY = (conveyorBorderT + conveyorH + conveyorBorderB)|0;
        textBaselineY = (textTopY + textMarginT + textH)|0;
        textBorderBottomY = (textBaselineY + textMarginB)|0;
      }

      // draw
      ctx.clearRect(0, 0, w, h);
      currentTime = AudioEngine.getPlaybackPosition();

      // background
      {
        ctx.save();

        // borders
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, w, conveyorBorderT);
        ctx.fillRect(0, conveyorBorderT + conveyorH, w, conveyorBorderB);
        ctx.fillRect(0, textBorderBottomY, w, textBorderB);

        // backgrounds
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, conveyorBorderB, w, conveyorH);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.fillRect(0, textTopY, w, textBorderBottomY - textTopY);

        ctx.restore();
      }

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
          ctx.drawImage(taikoImages[event.type], x - circleR, axisY - circleR);
          if (event.params) {
            ctx.font = textH + "px sans-serif";
            ctx.textAlign = 'center';
            ctx.fillText(event.params, x, textBaselineY);
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
          ctx.drawImage(taikoImages[nodeState.type], x - circleR, axisY - circleR);
          if (nodeState.params) {
            ctx.font = textH + "px sans-serif";
            ctx.textAlign = 'center';
            ctx.fillText(nodeState.params, x, textBaselineY);
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
