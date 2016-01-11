/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

var _ = require('lodash');

require('angular');

require('../conf');
require('../engine/audio');
require('../provider/choreography');
require('../provider/font-selector');
require('../provider/resize-detector');
require('./frame');
require('./dpi');

var images = require('./images');


var mod = angular.module('lovecall/ui/call', [
    'lovecall/conf',
    'lovecall/engine/audio',
    'lovecall/provider/choreography',
    'lovecall/provider/font-selector',
    'lovecall/provider/resize-detector',
    'lovecall/ui/frame',
    'lovecall/ui/dpi',
]);


mod.controller('CallController', function($scope, $window, $log, LCConfig, AudioEngine, Choreography, FrameManager, DPIManager, FontSelector, ResizeDetector) {
  $log = $log.getInstance('CallController');

  var callCanvas = new CallCanvasState(document.querySelectorAll('.call__canvas-container')[0]);

  callCanvas.draw();


  $scope.$on('audio:loaded', function(e) {
    callCanvas.reset();
    FrameManager.addFrameCallback(callCanvas.frameCallback);
  });


  $scope.$on('audio:unloaded', function(e) {
    FrameManager.removeFrameCallback(callCanvas.frameCallback);
  });


  $scope.$on('audio:resume', function(e) {
    callCanvas.onResume();
  });


  $scope.$on('audio:pause', function(e) {
    callCanvas.onPause();
  });


  $scope.$on('audio:seek', function(e, newPosition) {
    callCanvas.update();
  });


  $scope.$on('config:romajiEnabledChanged', function(e, enabled) {
    callCanvas.setUseRomaji(enabled);
    callCanvas.update();
  });


  /* canvas */
  function CallCanvasState(containerElem) {
    var self = this;

    var bgElem = document.createElement('canvas');
    var elem = document.createElement('canvas');
    var bgCtx = bgElem.getContext('2d');
    var ctx = elem.getContext('2d');

    // draw parameters
    var circleR = 50;
    var circleSize = (2 * circleR)|0;
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

    // ui configs
    var useRomaji = LCConfig.isRomajiEnabled();

    // ui states
    var circleMargin = 0;
    var circleDistance = 0;
    var events = {};
    var eventTimeline = [];
    var limit = 0;
    var isPlaying = false;
    var prevAudioPosMs = 0;
    var prevFrameTimestampMs = 0;

    // draw states
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

    var taicallImages = images.taicall;
    var taicallImageMap = {
      '上举': 'sj',
      '里打': 'ld',
      '里跳': 'lt',
      'Fu!': 'fu',
      'Oh~': 'oh',
      'Hi!': 'hi',
      '前挥': 'qh',
      '快挥': 'kh',
      '欢呼': 'hh',
      'fuwa': 'fuwa',
      '跳': 'jump',
      '特殊': 'special',
      'd': 'd',
      'k': 'k',
      '拍手': 'clap'
    };

    var cachedExplodingTaicallImages = {};
    var isExplodingTaicallImagesCacheFinished = false;


    this.refreshExplodingTaicallImages = function() {
      if (Object.keys(cachedExplodingTaicallImages).length === images.taicallImagesCount) {
        $log.debug('exploding taicall images fully cached');
        isExplodingTaicallImagesCacheFinished = true;
        return;
      }

      var keys = Object.keys(taicallImages);
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (cachedExplodingTaicallImages.hasOwnProperty(key)) {
          continue;
        }

        $log.debug('caching exploding taicall images', key);
        var img = taicallImages[key];
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

        cachedExplodingTaicallImages[key] = tempCanvas;
      }
    };


    this.getCanvasNodeDuration = function() {
      return w / pixPreSec;
    };


    this.setCircleParams = function(tempo, margin) {
      circleMargin = (typeof margin !== 'undefined' ? margin : -40)|0;
      circleDistance = (circleSize + circleMargin)|0;
      pixPreSec = +((circleSize + circleMargin) / (tempo.stepToTime(0, 4) - tempo.stepToTime(0, 2)));
    };


    this.setUseRomaji = function(enabled) {
      useRomaji = enabled;
    };


    this.setFollowFont = function(ctx) {
      var lang = useRomaji ? 'en' : Choreography.getLanguage();
      ctx.font = FontSelector.canvasFontForLanguage(lang, textH);
    };


    this.refreshTextCache = function() {
      textCache = {};

      var textEvents = _(events)
        .values()
        .map(function(v) { return v[2]; })
        .flatten()
        .value();

      var messages = _(textEvents)
        .map(function(v) { return { content: v.params.msg, type: v.type };})
        .value();

      var romajis = _(textEvents)
        .map(function(v) { return { content: v.params.romaji };})
        .filter(function(v) { return typeof v !== 'undefined'; })
        .value();

      var uniqueTexts = _([messages, romajis])
        .flatten()
        .unique()
        .value();

      ctx.save();
      this.setFollowFont(ctx);
      var textWidths = _(uniqueTexts)
        .map(function(v) { return ctx.measureText(v).width; })
        .value();
      ctx.restore();

      console.log(uniqueTexts);
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
        var text = uniqueTexts[i].content;

        var tempCanvas = document.createElement('canvas');
        var tempCtx = tempCanvas.getContext('2d');
        DPIManager.scaleCanvas(tempCanvas, tempCtx, canvasW, canvasH);
        this.setFollowFont(tempCtx);
        tempCtx.textAlign = 'center';

        if (uniqueTexts[i].type == '特殊') {
          tempCtx.fillStyle = '#eee';
        }

        tempCtx.fillText(text, canvasCenterX, textMarginT + textH);

        textCache[text] = {
          src: tempCanvas,
          sX: canvasCenterX,
          sW: canvasW,
          sH: canvasH,
        };
      }
    };


    this.onResume = function() {
      isPlaying = true;
    };


    this.onPause = function() {
      isPlaying = false;
    };


    this.reset = function() {
      this.setCircleParams(Choreography.getTempo(), Choreography.getCircleMargin());

      events = Choreography.getEvents();
      eventTimeline = Object.keys(events).sort(function(a, b) {
        return a - b;
      });

      isPlaying = false;
      limit = 0;
      this.refreshTextCache();
      this.update();
    };


    this.frameCallback = function(ts) {
      self.updateTime(ts);

      if (isPlaying) {
        self.doUpdate();
      }
    };


    this.updateTime = function(ts) {
      // update playback position
      var audioPosMs = AudioEngine.getPlaybackPosition();
      if (typeof ts === 'undefined') {
        // not called from rAF
        currentTime = audioPosMs;
      } else {
        // frame timestamp available
        if (
          !isPlaying ||  // not playing
          audioPosMs !== prevAudioPosMs  // audio position just updated
          ) {
          currentTime = audioPosMs;
        } else {
          // update current position by frame timestamp
          currentTime += ts - prevFrameTimestampMs;
        }

        prevFrameTimestampMs = ts;
      }

      prevAudioPosMs = audioPosMs;
    };


    this.update = function() {
      // frame timestamp is unavailable if we're coming from outside rAF callback
      this.updateTime();
      this.doUpdate();
    };


    this.doUpdate = function() {
      // update pointer
      var rightmostPos = currentTime + this.getCanvasNodeDuration();

      if (limit < eventTimeline.length - 1) {
        while (rightmostPos > eventTimeline[limit]) {
          limit++;
        }
      }

      this.draw();
    };


    this.draw = function() {
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

      if (!isExplodingTaicallImagesCacheFinished) {
        this.refreshExplodingTaicallImages();
      }

      // draw
      ctx.clearRect(0, 0, w, h);

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
            var currentParam = currentEventPack[2][i].params;
            var textKey;

            if (useRomaji) {
              var romaji = currentParam.romaji;
              textKey = typeof romaji !== 'undefined' ? romaji : currentParam.msg;
            } else {
              textKey = currentParam.msg;
            }

            var cachedText = textCache[textKey];

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
              cachedExplodingTaicallImages[taicallImageMap[eventType]] :
              taicallImages[taicallImageMap[eventType]]
              );

          img && ctx.drawImage(img, realX, realY, realSize, realSize);
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
