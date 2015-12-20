/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

require('angular');

require('../engine/audio');
require('../provider/choreography');
require('../provider/resize-detector');
require('./frame');
require('./dpi');


var mod = angular.module('lovecall/ui/call', [
    'lovecall/engine/audio',
    'lovecall/provider/choreography',
    'lovecall/provider/resize-detector',
    'lovecall/ui/frame',
    'lovecall/ui/dpi',
]);


mod.controller('CallController', function($scope, $window, $log, AudioEngine, Choreography, FrameManager, DPIManager, ResizeDetector) {
  $log.debug('$scope=', $scope);

  var events = {};
  var eventTimeline = [];
  var preCallDrawTime = 0;

  var pRight = 0;

  var callCanvas = new CallCanvasState(document.querySelectorAll('.call__canvas-container')[0]);

  var isPlaying = false;

  callCanvas.draw({}, [], 0);


  $scope.$on('audio:loaded', function(e) {
    callCanvas.setTempo(Choreography.getTempo());
    FrameManager.addFrameCallback(callFrameCallback);
    events = Choreography.getEvents();
    eventTimeline = Object.keys(events).sort(function(a, b) {
      return a - b;
    });

    isPlaying = false;
    pRight = 0;
    doUpdate();
  });


  $scope.$on('audio:unloaded', function(e) {
    FrameManager.removeFrameCallback(callFrameCallback);
  });


  $scope.$on('audio:resume', function(e) {
    isPlaying = true;
  });


  $scope.$on('audio:pause', function(e) {
    isPlaying = false;
  });


  $scope.$on('audio:seek', function(e, newPosition) {
    doUpdate();
  });


  var callFrameCallback = function(ts) {
    if (!isPlaying) {
      return;
    }

    doUpdate();
  }

  var doUpdate = function() {
    //update pointer
    var rightmostPos = AudioEngine.getPlaybackPosition() + callCanvas.getCanvasNodeDuration();

    if (pRight < eventTimeline.length - 1) {
      while (rightmostPos > eventTimeline[pRight]) {
        pRight++;
      }
    }

    callCanvas.draw(events, eventTimeline, pRight);
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
      'fuwa': getTaikoImage('fw'),
      '跳': getTaikoImage('jump')
    };


    this.setTempo = function(tempo) {
      pixPreSec = +((circleR * 2 + circleMargin) / (tempo.stepToTime(0, 4) - tempo.stepToTime(0, 2)));
    };


    this.draw = function(events, eventTimeline, limit) {
      if (inResizeFallout) {
        inResizeFallout = false;

        var canvasRect = elem.getBoundingClientRect();
        w = canvasRect.width|0;
        h = canvasRect.height|0;
        DPIManager.scaleCanvas(elem, ctx, w, h);
        DPIManager.scaleCanvas(bgElem, bgCtx, w, h);

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

      var index = limit;
      for (; index != -1; index--) {
        var ts = eventTimeline[index];
        var currentEventPack = events[ts];
        var remainedTime = ts - currentTime;
        var x = pixPreSec * remainedTime;
        var drawX = x + judgementLineX;
        var realX;
        var realY;

        if (!currentEventPack) {
          break;
        }

        // draw stepline
        if (currentEventPack[0].length > 0) {
          ctx.save();

          for (var i = 0; i < currentEventPack[0].length; i++) {
            var e = currentEventPack[0][i];
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 1;

            ctx.beginPath();
            ctx.moveTo(drawX, stepLineY1);
            ctx.lineTo(drawX, stepLineY2);
            ctx.stroke();
          }

          ctx.restore();
        }

        // don't render invisible events
        if (drawX < judgementLineX - circleFadeOutDistance) {
          break;
        }

        // fade out past events
        // alpha-only
        if (drawX < judgementLineX) {
          ctx.save();
          var fadeOutValue = (judgementLineX - drawX) / circleFadeOutDistance;
          fadeOutValue = 1 - fadeOutValue;

          // TODO: exponential mapping or something else?
          var alpha = fadeOutValue;
          var scale = 1 + circleExplodeRatio * (1 - fadeOutValue);
          ctx.globalAlpha = alpha;
        }

        // text
        if (currentEventPack[2].length > 0) {
          ctx.font = textH + "px sans-serif";
          ctx.textAlign = 'center';
          for (var i = 0; i < currentEventPack[2].length; i++) {
            var msg = currentEventPack[2][i].params.msg;
            ctx.fillText(msg, drawX, textBaselineY);
          }
        }

        // apply scale
        if (drawX < judgementLineX) {
          ctx.translate(judgementLineX, axisY);
          ctx.scale(scale, scale);

          realX = -circleR;
          realY = -circleR;
        } else {
          realX = drawX - circleR;
          realY = axisY - circleR;
        }

        for (var i = 0; i < currentEventPack[1].length; i++) {
          var event = currentEventPack[1][i];
          ctx.drawImage(taikoImages[event.type], realX, realY);
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
