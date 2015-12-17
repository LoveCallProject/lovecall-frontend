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

  var isPlaying = false;

  callCanvas.draw([]);


  $scope.$on('audio:loaded', function(e) {
    callCanvas.setTempo(Choreography.getTempo());
    FrameManager.addFrameCallback(callFrameCallback);

    isPlaying = false;
    pRight = 0;
    doUpdate();
  });

  $scope.$on('audio:resume', function(e) {
    isPlaying = true;
  });


  $scope.$on('audio:pause', function(e) {
    isPlaying = false;
  });


  $scope.$on('call:loader', function(e) {
    events = Choreography.getEvents();
    $log.debug('events', events);
  });


  var callFrameCallback = function(ts) {
    if (!isPlaying) {
      return;
    }

    doUpdate();
  }

  var doUpdate = function() {
    //update pointer
    if (pRight < events.length - 1) {
      var rightmostPos = (AudioEngine.getPlaybackPosition() + callCanvas.getCanvasNodeDuration())|0;
      while (rightmostPos > events[pRight].ts) {
        pRight++;
      }
    }

    callCanvas.draw(events.slice(0, pRight));
  };


  /* canvas */
  function CallCanvasState(containerElem) {
    var bgElem = document.createElement('canvas');
    var elem = document.createElement('canvas');
    var bgCtx = bgElem.getContext('2d');
    var ctx = elem.getContext('2d');

    var circleR = 50;
    var circleMargin = -40;
    var circleDistance = 2 * circleR + circleMargin;
    var circleFadeOutDistance = 40;
    var circleExplodeRatio = 0.25;
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
        bgElem.width = w;
        bgElem.height = h;

        stepLineY1 = (conveyorBorderT)|0;
        stepLineY2 = (conveyorBorderT + conveyorH)|0;
        axisY = (conveyorBorderT + conveyorH / 2)|0;
        textTopY = (conveyorBorderT + conveyorH + conveyorBorderB)|0;
        textBaselineY = (textTopY + textMarginT + textH)|0;
        textBorderBottomY = (textBaselineY + textMarginB)|0;

        // draw background once
        {
          bgCtx.clearRect(0, 0, w, h);
          bgCtx.save();

          // borders
          bgCtx.fillStyle = '#111';
          bgCtx.fillRect(0, 0, w, conveyorBorderT);
          bgCtx.fillRect(0, conveyorBorderT + conveyorH, w, conveyorBorderB);
          bgCtx.fillRect(0, textBorderBottomY, w, textBorderB);

          // backgrounds
          bgCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
          bgCtx.fillRect(0, conveyorBorderB, w, conveyorH);

          bgCtx.fillStyle = 'rgba(0, 0, 0, 0.25)';
          bgCtx.fillRect(0, textTopY, w, textBorderBottomY - textTopY);

          // judgement line
          bgCtx.strokeStyle = '#aaa';
          bgCtx.lineWidth = 4;
          bgCtx.beginPath();
          bgCtx.moveTo(judgementLineX, conveyorBorderT);
          bgCtx.lineTo(judgementLineX, conveyorBorderT + conveyorH);
          bgCtx.stroke();

          bgCtx.restore();
        }
      }

      // draw
      ctx.clearRect(0, 0, w, h);
      currentTime = AudioEngine.getPlaybackPosition();

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

        if (drawX < judgementLineX - circleFadeOutDistance) {
          break;
        }

        var realX;
        var realY;

        // fade out past events
        if (drawX < judgementLineX) {
          ctx.save();
          var fadeOutValue = (judgementLineX - drawX) / circleFadeOutDistance;
          fadeOutValue = fadeOutValue < 0 ? 1 : 1 - fadeOutValue;

          // TODO: exponential mapping or something else?
          var alpha = fadeOutValue;
          var scale = 1 + circleExplodeRatio * (1 - fadeOutValue);
          ctx.globalAlpha = alpha;

          ctx.save();
          ctx.translate(judgementLineX, axisY);
          ctx.scale(scale, scale);

          realX = -circleR;
          realY = -circleR;
        } else {
          realX = drawX - circleR;
          realY = axisY - circleR;
        }

        if (event.type !== '跟唱') {
          ctx.drawImage(taikoImages[event.type], realX, realY);
        }

        if (drawX < judgementLineX) {
          // restore everything except alpha for text rendering
          ctx.restore();
        }

        // text
        if (event.params && event.params.msg) {
          ctx.font = textH + "px sans-serif";
          ctx.textAlign = 'center';
          ctx.fillText(event.params.msg, drawX, textBaselineY);
        }

        if (drawX < judgementLineX) {
          ctx.restore();
        }
      }
    };

    var onWidgetResize = function(e) {
      inResizeFallout = true;
    };

    // $window.addEventListener('resize', onWidgetResize);
    ResizeDetector.listenTo(containerElem, onWidgetResize);

    containerElem.appendChild(bgElem);
    containerElem.appendChild(elem);
  };
});
/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
