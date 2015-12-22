/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

var _ = require('lodash');

require('angular');

require('../engine/audio');
require('../provider/choreography');
require('../provider/resize-detector');
require('./frame');
require('./dpi');

var images = require('./images');


var mod = angular.module('lovecall/ui/call', [
    'lovecall/engine/audio',
    'lovecall/provider/choreography',
    'lovecall/provider/resize-detector',
    'lovecall/ui/frame',
    'lovecall/ui/dpi',
]);


mod.controller('CallController', function($scope, $window, $log, AudioEngine, Choreography, FrameManager, DPIManager, ResizeDetector) {
  $log = $log.getInstance('CallController');

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
    callCanvas.refreshTextCache(events);
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
    var circleSize = (2 * circleR)|0;
    var circleMargin = -40;
    var circleDistance = circleSize + circleMargin;
    var circleFadeOutDistance = 40;
    var circleExplodeRatio = 0.25;
    var circleExplodeCachedImageR = ((1 + circleExplodeRatio) * circleR)|0;
    var circleExplodeCachedImageSize = (2 * circleExplodeCachedImageR)|0;
    var circleExplodeBaseScale = +(1 / (1 + circleExplodeRatio));
    var circleExplodeScaleInc = +(1 - circleExplodeBaseScale);
    var conveyorH = 150;
    var conveyorBorderT = 4;
    var conveyorBorderB = 4;
    var judgementLineX = 75;
    var followMarkerR = 6;
    var textMarginT = 4;
    var textMarginB = 8;
    var textH = 30;
    var textBorderB = 1;
    var textExplodeRatio = 0.15;

    var w = 0;
    var h = 0;
    var stepLineY1 = 0;
    var axisY = 0;
    var followMarkerY = 0;
    var textTopY = 0;
    var textBorderBottomY = 0;
    var textExplodeCenterY = 0;
    var textExplodeDrawRefY = 0;
    var textCache = {};
    var currentTime = 0;
    var inResizeFallout = true;

    var pixPreSec = 0;

    var taicall = images.taicall;
    var taicallImages = {
      '上举': taicall.sj,
      '里打': taicall.ld,
      '里跳': taicall.lt,
      'Fu!': taicall.fu,
      'Oh~': taicall.oh,
      'Hi!': taicall.hi,
      '前挥': taicall.qh,
      '快挥': taicall.kh,
      '欢呼': taicall.hh,
      'fuwa': taicall.fuwa,
      '跳': taicall.jump,
    };

    var cachedTaicallImages = _(taicallImages)
      .mapValues(function(img) {
        var tempCanvas = document.createElement('canvas');
        var tempCtx = tempCanvas.getContext('2d');

        DPIManager.scaleCanvas(tempCanvas, tempCtx, circleSize, circleSize);
        tempCtx.drawImage(img, 0, 0, circleSize, circleSize);

        return tempCanvas;
      }).value();

    var cachedExplodingTaicallImages = _(taicallImages)
      .mapValues(function(img) {
        var tempCanvas = document.createElement('canvas');
        var tempCtx = tempCanvas.getContext('2d');

        DPIManager.scaleCanvas(
            tempCanvas,
            tempCtx,
            circleExplodeCachedImageSize,
            circleExplodeCachedImageSize
            );
        tempCtx.drawImage(
            img,
            0,
            0,
            circleExplodeCachedImageSize,
            circleExplodeCachedImageSize
            );

        return tempCanvas;
      }).value();


    this.getCanvasNodeDuration = function() {
      return w / pixPreSec;
    };


    this.setTempo = function(tempo) {
      pixPreSec = +((circleSize + circleMargin) / (tempo.stepToTime(0, 4) - tempo.stepToTime(0, 2)));
    };


    this.refreshTextCache = function(events) {
      textCache = {};

      var uniqueTexts = _(events)
        .values()
        .map(function(v) { return v[2]; })
        .flatten()
        .map(function(v) { return v.params.msg; })
        .unique()
        .value();

      ctx.save();
      // TODO: dedup this code
      ctx.font = textH + 'px sans-serif';
      var textWidths = _(uniqueTexts)
        .map(function(v) { return ctx.measureText(v).width; })
        .value();
      ctx.restore();

      // build the cache
      for (var i = 0; i < uniqueTexts.length; i++) {
        // XXX: Some text like "Jump" seems to be wider than measured, but
        // without access to advanced text metrics (feature-gated in Chrome and
        // unavailable in Firefox) we can't really do much about it.
        // Just allocate some more width for now...
        // Also make it multiple of 16 for hopefully nicer memory accesses.
        var textW = textWidths[i];
        var canvasW = (((textWidths[i] + 8) >> 4) + 1) << 4;
        var canvasH = textMarginT + textH + textMarginB;
        var canvasCenterX = canvasW >> 1;
        var text = uniqueTexts[i];

        var tempCanvas = document.createElement('canvas');
        var tempCtx = tempCanvas.getContext('2d');
        DPIManager.scaleCanvas(tempCanvas, tempCtx, canvasW, canvasH);
        tempCtx.font = textH + 'px sans-serif';
        tempCtx.textAlign = 'center';

        tempCtx.fillText(text, canvasCenterX, textMarginT + textH);

        textCache[text] = {
          src: tempCanvas,
          sX: canvasCenterX,
          sW: canvasW,
          sH: canvasH,
        };
      }
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
        axisY = (conveyorBorderT + conveyorH / 2)|0;
        followMarkerY = (stepLineY1 + conveyorH + conveyorBorderB / 2)|0;
        textTopY = (conveyorBorderT + conveyorH + conveyorBorderB)|0;
        textBorderBottomY = (textTopY + textMarginT + textH + textMarginB)|0;
        textExplodeCenterY = (textTopY + 2 * textH)|0;
        textExplodeDrawRefY = (-2 * textH)|0;

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
        var drawX = (x + judgementLineX)|0;
        var fadeOutValue = 0;

        if (!currentEventPack) {
          break;
        }

        // draw stepline
        // actually there can only ever be 1 stepline per pack so we can
        // optimize
        if (currentEventPack[0].length > 0) {
          ctx.fillStyle = '#ccc';
          ctx.fillRect(drawX, stepLineY1, 1, conveyorH);
        }

        // don't render invisible events
        if (drawX < judgementLineX - circleFadeOutDistance) {
          break;
        }

        // fade out past events
        // alpha-only
        if (drawX < judgementLineX) {
          ctx.save();
          fadeOutValue = +((judgementLineX - drawX) / circleFadeOutDistance);

          // TODO: exponential mapping or something else?
          var alpha = 1 - fadeOutValue;
          ctx.globalAlpha = alpha;
        }

        if (currentEventPack[2].length > 0) {
          // follow marker
          ctx.save();
          ctx.fillStyle = '#eee';
          ctx.strokeStyle = '#000';
          ctx.lineWidth = conveyorBorderB;
          ctx.beginPath();
          ctx.arc(
              drawX < judgementLineX ? judgementLineX : drawX,
              followMarkerY,
              followMarkerR,
              0,
              2 * Math.PI
              );
          ctx.fill();
          ctx.stroke();
          ctx.restore();

          var realTextX;
          var realTextY;
          var fadeOutValue;
          var scale;

          if (drawX < judgementLineX) {
            scale = 1 + textExplodeRatio * fadeOutValue;
          }

          // text
          for (var i = 0; i < currentEventPack[2].length; i++) {
            var cachedText = textCache[currentEventPack[2][i].params.msg];

            if (drawX < judgementLineX) {
              ctx.save();
              ctx.translate(judgementLineX, textExplodeCenterY);
              ctx.scale(scale, scale);

              realTextX = -cachedText.sX;
              realTextY = textExplodeDrawRefY;
            } else {
              realTextX = drawX - cachedText.sX;
              realTextY = textTopY;
            }

            ctx.drawImage(
                cachedText.src,
                realTextX,
                realTextY,
                cachedText.sW,
                cachedText.sH
                );

            if (drawX < judgementLineX) {
              ctx.restore();
            }
          }
        }

        // hit object
        var realX;
        var realY;
        var realSize;

        // apply scale
        if (drawX < judgementLineX) {
          var scale = +(circleExplodeBaseScale + circleExplodeScaleInc * fadeOutValue);
          ctx.translate(judgementLineX, axisY);
          ctx.scale(scale, scale);

          realX = -circleExplodeCachedImageR;
          realY = -circleExplodeCachedImageR;
          realSize = circleExplodeCachedImageSize;
        } else {
          realX = drawX - circleR;
          realY = axisY - circleR;
          realSize = circleSize;
        }

        for (var i = 0; i < currentEventPack[1].length; i++) {
          var eventType = currentEventPack[1][i].type;
          var img = (
              drawX < judgementLineX ?
              cachedExplodingTaicallImages[eventType] :
              cachedTaicallImages[eventType]
              );

          ctx.drawImage(img, realX, realY, realSize, realSize);
        }

        if (drawX < judgementLineX) {
          // NOTE: corresponding save() is done when setting globalAlpha
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

  $log.debug('$scope=', $scope);
});
/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
