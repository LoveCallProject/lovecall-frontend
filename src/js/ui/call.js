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

  var events = [];//TODO
  var preCallDrawTime = 0;

  var pRight = 0;

  var callCanvas = new CallCanvasState(document.querySelectorAll('.call__canvas-container')[0]);

  callCanvas.draw([]);

  $scope.$on('audio:loaded', function(e) {
    callCanvas.setTempo(Choreography.getTempo());
    pRight = 0;
    FrameManager.addFrameCallback(callFrameCallback);
  });

  $scope.$on('call:loader', function(e) {
    events = Choreography.getEvents();
    $log.debug('events', events);
  });

  var callFrameCallback = function(ts) {
    //update pointer
    if (pRight < events.length - 1) {
      while (AudioEngine.getPlaybackPosition() + callCanvas.getCanvasNodeDuration() > events[pRight].ts) {
        pRight++;
      }
    }

    callCanvas.draw(events.slice(0, pRight));
  };


  /* canvas */
  function CallCanvasState(containerElem) {
    var elem = document.createElement('canvas');
    var ctx = elem.getContext('2d');

    var circleR = 50;
    var circleMargin = -40;
    var circleDistance = 2 * circleR + circleMargin;
    var conveyorH = 150;
    var conveyorBorderT = 4;
    var conveyorBorderB = 4;
    var judgementLineX = 75;
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
    var inResizeFallout = true;

    var pixPreSec = 0;

    var getTaikoImage = function(action) {
      var img = new Image();
      img.src = '/images/' + action + '.png';

      return img;
    }

    this.getCanvasNodeDuration = function() {
      return w / pixPreSec;
    };

    var taikoImages = {
      '上举': getTaikoImage('sj'),
      '里打': getTaikoImage('ld'),
      '里跳': getTaikoImage('lt'),
      'Fu!': getTaikoImage('fufu'),
      'Oh~': getTaikoImage('ppph_oh'),
      'Hi!': getTaikoImage('ppph_hi'),
      '前挥': getTaikoImage('qh'),
      '快挥': getTaikoImage('kh'),
      '欢呼': getTaikoImage('hh'),
      'fuwa': getTaikoImage('fw')
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

    this.draw = function(drawEvents) {

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
        ctx.save();

        // borders
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, w, conveyorBorderT);
        ctx.fillRect(0, conveyorBorderT + conveyorH, w, conveyorBorderB);
        ctx.fillRect(0, textBorderBottomY, w, textBorderB);

      // backgrounds
      {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, conveyorBorderB, w, conveyorH);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.fillRect(0, textTopY, w, textBorderBottomY - textTopY);

        // judgement line
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(judgementLineX, conveyorBorderT);
        ctx.lineTo(judgementLineX, conveyorBorderT + conveyorH);
        ctx.stroke();

        ctx.restore();
      }

      var index = drawEvents.length - 1;
      var isDrawStepLines = false;
      for (index;index != -1;index--) {
        var event = drawEvents[index];
        var remainedTime = event.ts - currentTime;
        var x = pixPreSec * remainedTime;
        var drawX = x + judgementLineX;
        if (!isDrawStepLines) {
          drawStepLines(drawX);
          isDrawStepLines = true;
        }
        if (drawX + circleR < 0) {
          break;
        }
        //console.log('draw', index, event);
        if (event.type !== '跟唱') {
          ctx.drawImage(taikoImages[event.type], drawX - circleR, axisY - circleR);
        }
        if (event.params && event.params.msg) {
          ctx.font = textH + "px sans-serif";
          ctx.textAlign = 'center';
          ctx.fillText(event.params.msg, drawX, textBaselineY);
        }
      }
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
