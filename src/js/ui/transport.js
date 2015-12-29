/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

require('angular');

require('../engine/audio');
require('../provider/choreography');
require('../provider/resize-detector');
require('../provider/mouseevent');
require('./frame');
require('./dpi');


var mod = angular.module('lovecall/ui/transport', [
    'lovecall/engine/audio',
    'lovecall/provider/choreography',
    'lovecall/provider/resize-detector',
    'lovecall/provider/mouseevent',
    'lovecall/ui/frame',
    'lovecall/ui/dpi',
]);

mod.controller('TransportController', function($scope, $window, $log, AudioEngine, Choreography, FrameManager, DPIManager, ResizeDetector, MouseEvent) {
  $log = $log.getInstance('TransportController');

  // scope states
  $scope.isLoaded = false;
  $scope.isPlaying = false;
  $scope.playButtonIcon = 'play_arrow';
  $scope.volumePercentage = 100;
  $scope.volumeIcon = 'volume_up';

  // internal states
  var isPlaying = false;
  var playbackPos = 0;
  var prevIsPlaying = true;
  var duration = 0;
  var isMuted = false;


  // actions
  var play = function() {
    AudioEngine.resume();
  };


  var pause = function() {
    AudioEngine.pause();
  };


  var updatePlayIcon = function() {
    $scope.playButtonIcon = isPlaying ? 'pause' : 'play_arrow';
  };


  var getVolumeIcon = function(volumePercentage, isMuted) {
    if (isMuted) {
      return 'volume_off';
    }

    if (volumePercentage == 0) {
      return 'volume_mute';
    }

    if (volumePercentage < 50) {
      return 'volume_down';
    }

    return 'volume_up';
  };


  var updateVolumeIcon = function() {
    $scope.volumeIcon = getVolumeIcon($scope.volumePercentage, isMuted);
  };


  $scope.togglePlay = function() {
    (isPlaying ? pause : play)();
  };


  $scope.toggleMute = function() {
    isMuted = !isMuted;
    AudioEngine.setMuted(isMuted);
    updateVolumeIcon();
  };


  $scope.$watch('volumePercentage', function(to, from) {
    AudioEngine.setVolume(to / 100);
    updateVolumeIcon();
  });


  $scope.$on('audio:unloaded', function(e) {
    duration = 0;
    pause();
    playbackPos = 0;
    updateTransport(0.0, 0.0);
    transportState.updateSongForm(null);
    $scope.isLoaded = false;
  });


  $scope.$on('audio:loaded', function(e) {
    duration = AudioEngine.getDuration();

    $scope.isLoaded = true;
    pause();
    playbackPos = 0;
    refreshTick(false);
    updateTransport(0.0, duration);
    transportState.updateSongForm(Choreography.getForm());
    transportState.updateSongColors(Choreography.getColors());
    $scope.$digest();
  });


  $scope.$on('transport:seek', function(e, position, duration) {
    if (duration <= 0) {
      $log.warn('discarding bogus seek with duration == 0');
      return;
    }

    var newPlaybackPos = (position * duration)|0;
    $log.info('seek: newPlaybackPos=', newPlaybackPos);

    AudioEngine.seek(newPlaybackPos);
    refreshTick(false);
  });


  var refreshTick = function(skipDraw) {
    transportState.updateTick(
        FrameManager.getMeasure(),
        FrameManager.getStep() >> 2,
        skipDraw
        );
  };


  // frame callback
  var transportFrameCallback = function(ts) {
    isPlaying = AudioEngine.getIsPlaying();
    playbackPos = AudioEngine.getPlaybackPosition();

    if (prevIsPlaying != isPlaying) {
      transportState.setIsPlaying(isPlaying);
      $scope.isPlaying = isPlaying;
      updatePlayIcon();
      $scope.$digest();
    }

    // chromium thinks i'm causing jank by delibrately limiting the refresh
    // rate... so here's the full 60fps someone wanted
    // but for conserving energy, let's only refresh if playing; otherwise
    // refreshing at mouse events seems great.
    if (isPlaying) {
      refreshTick(true);
      updateTransport(playbackPos, duration);
    }

    prevIsPlaying = isPlaying;
  };


  /* canvas */
  var transportCanvasStateFactory = function(containerElem) {
    // parameters
    var marginL = 16;
    var marginR = 16;
    var sliderLineWidth = 2;
    var sliderHitTestDistance = 8;
    var partSeparatorHeightT = 12;
    var partSeparatorHeightB = 12;
    var colorRectAlphaNotPlayed = 0.1;
    var colorRectAlphaPlayed = 1;
    var indicatorRadius = 8;
    var indicatorRadiusHovered = 10;
    var indicatorRadiusActive = 12;
    var indicatorActiveCircleRadius = 18;

    var tickBoxWidthRatio = 1 / 8;
    var tickBoxGapRatio = 1 / 2;
    var tickBoxMarginTB = 8;

    // ui states
    var isPlaying = false;
    var position = 0;
    var durationMs = 0;
    var indicatorHovered = true;
    var indicatorActive = false;
    var positionBeforeIndicatorActive = 0;
    var firstTouchId = null;

    var songForm = null;
    var songColors = null;

    var totalTicks = 4;  // TODO
    var currentMeasure = -1;
    var currentTick = -1;

    // draw states
    var elem = document.createElement('canvas');
    var ctx = elem.getContext('2d');

    var inResizeFallout = true;
    var elemOffsetX = 0;
    var elemOffsetY = 0;
    var w = 0;
    var h = 0;
    var prevW = 0;
    var prevH = 0;
    var halfH = 0;

    var pointerX = 0;
    var pointerY = 0;
    var pointerDownX = 0;
    var pointerDownY = 0;

    var sliderX1 = marginL;
    var sliderX2 = 0;
    var sliderY = 0;
    var sliderLength = 0;
    var indicatorX = 0;
    var indicatorY = 0;
    var indicatorR = 0;

    var cachedSongPartPointsX = [];

    var cachedSongColorsSegments = [];
    var cachedSongColorsRGB = [];
    var colorRectY = 0;
    var colorRectH = 0;

    var tickBoxAreaWidth = 0;
    var tickBoxSize = 0;
    var tickBoxGapWidth = 0;
    var tickBoxStartX = 0;
    var tickBoxStartY = 0;


    var setIsPlaying = function(v) {
      isPlaying = v;
    };


    var update = function(pos, duration, skipDraw) {
      duration != null && (durationMs = duration);
      updateRawPosition(+(duration > 0 ? pos / duration : 0.0), skipDraw);
    };


    var updateRawPosition = function(pos, skipDraw) {
      position = +(duration > 0 ? pos : 0.0);
      skipDraw || draw();
    };


    var updateTick = function(measure, tick, skipDraw) {
      if (measure !== currentMeasure || tick !== currentTick) {
        skipDraw || draw();
      }

      currentMeasure = measure;
      currentTick = tick;
    };


    var updateSongForm = function(form, skipDraw) {
      songForm = form;
      refreshSongPartCache();
      skipDraw || draw(true);
    };


    var updateSongColors = function(colors, skipDraw) {
      songColors = colors;
      refreshSongColorsCache();
      skipDraw || draw(true);
    };


    var positionToSliderX = function(position) {
      if (isFinite(position)) {
        return (sliderX1 + (position / durationMs) * sliderLength)|0;
      }

      return (position < 0 ? sliderX1 : sliderX2)|0;
    };


    var refreshSongPartCache = function() {
      cachedSongPartPointsX.splice(0, cachedSongPartPointsX.length);
      if (songForm) {
        songForm.forEach(function(x) {
          cachedSongPartPointsX.push(positionToSliderX(x.ts));
        });
        cachedSongPartPointsX.sort(function(a, b) {
          return a - b;
        });
      }
    };


    var refreshSongColorsCache = function() {
      cachedSongColorsSegments.splice(0, cachedSongColorsSegments.length);
      cachedSongColorsRGB.splice(0, cachedSongColorsRGB.length);
      if (songColors && durationMs) {
        songColors.forEach(function(x) {
          cachedSongColorsSegments.push(
              [positionToSliderX(x[0]), positionToSliderX(x[1])]
              );
          cachedSongColorsRGB.push(x[2]);
        });
      }
    };


    var fillRectWithRGBA = function(ctx, x, y, w, h, rgb, a) {
      var colorStr;

      if (!rgb) {
        colorStr = 'transparent';
      } else {
        colorStr = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + a + ')';
      }
      ctx.fillStyle = colorStr;
      ctx.fillRect(x, y, w, h);
    };


    var draw = function(forceCompleteRedraw) {
      var isCompleteRedraw = inResizeFallout || forceCompleteRedraw;
      var prevIndicatorX = indicatorX;
      var clearRectX;
      var clearRectX2;
      var clearRectY;
      var clearRectW;
      var clearRectH;

      if (inResizeFallout) {
        inResizeFallout = false;

        var canvasRect = elem.getBoundingClientRect();
        elemOffsetX = canvasRect.left + $window.pageXOffset - document.documentElement.clientLeft;
        elemOffsetY = canvasRect.top + $window.pageYOffset - document.documentElement.clientTop;
        w = canvasRect.width|0;
        h = canvasRect.height|0;
        if (prevW != w || prevH != h) {
          DPIManager.scaleCanvas(elem, ctx, w, h);
          prevW = w;
          prevH = h;
          halfH = (h / 2)|0;
        }

        // cache static parameters
        // slider body
        sliderX1 = marginL;
        sliderLength = ((w - marginL - marginR) * (1 - tickBoxWidthRatio)) |0;
        sliderX2 = (sliderX1 + sliderLength)|0;
        sliderY = halfH;

        // slider indicator
        indicatorY = halfH;

        // song parts
        refreshSongPartCache();

        // colors
        refreshSongColorsCache();
        colorRectY = sliderY - partSeparatorHeightT;
        colorRectH = partSeparatorHeightT;

        // tick box
        tickBoxAreaWidth = (w - marginL - marginR - sliderLength)|0;
        tickBoxStartX = (marginL + sliderLength + marginR)|0;
        tickBoxSize = (tickBoxAreaWidth / (totalTicks + (totalTicks - 1) * tickBoxGapRatio))|0;
        tickBoxSize = tickBoxSize > h ? h : tickBoxSize;
        tickBoxGapWidth = (tickBoxSize * tickBoxGapRatio)|0;
        tickBoxStartY = ((h - tickBoxSize) / 2)|0;
      }

      // this must be called before drawing as position may be updated if
      // indicator is active
      updatePointer(true);

      // dynamic parameters
      // slider indicator
      indicatorX = (sliderX1 + position * sliderLength)|0;
      indicatorR = (
          indicatorHovered ?
          indicatorRadiusHovered :
          indicatorRadius
          )|0;

      // actual draw
      if (isCompleteRedraw) {
        clearRectX = clearRectY = 0;
        clearRectW = w;
        clearRectH = h;
      } else {
        var dirtyAreaX1;
        var dirtyAreaX2;
        if (prevIndicatorX < indicatorX) {
          dirtyAreaX1 = prevIndicatorX;
          dirtyAreaX2 = indicatorX;
        } else {
          dirtyAreaX1 = indicatorX;
          dirtyAreaX2 = prevIndicatorX;
        }

        clearRectX = (dirtyAreaX1 - indicatorActiveCircleRadius)|0;
        clearRectY = 0;
        clearRectW = (indicatorActiveCircleRadius * 2 + dirtyAreaX2 - dirtyAreaX1)|0;
        clearRectH = h;
      }

      clearRectX2 = (clearRectX + clearRectW)|0;
      ctx.clearRect(clearRectX, clearRectY, clearRectW, clearRectH);

      // colors
      {
        ctx.save();
        for (var idx = 0; idx < cachedSongColorsSegments.length; idx++) {
          var segment = cachedSongColorsSegments[idx];
          var color = cachedSongColorsRGB[idx];

          // only draw in dirty region
          if (segment[0] > clearRectX2 || segment[1] < clearRectX) {
            continue;
          }

          var segStartX = clearRectX < segment[0] ? segment[0] : clearRectX;
          var segEndX = clearRectX2 > segment[1] ? segment[1] : clearRectX2;

          // TODO: support color stripes
          var colorUsed = color[0];
          if (segment[0] < indicatorX && indicatorX < segment[1]) {
            // indicator inside
            fillRectWithRGBA(
                ctx,
                segStartX,
                colorRectY,
                indicatorX - segStartX,
                colorRectH,
                colorUsed,
                colorRectAlphaPlayed
                );
            fillRectWithRGBA(
                ctx,
                indicatorX,
                colorRectY,
                segEndX - indicatorX,
                colorRectH,
                colorUsed,
                colorRectAlphaNotPlayed
                );
          } else {
            // indicator not inside
            var opacity = (
                segment[1] <= indicatorX ?
                colorRectAlphaPlayed :
                colorRectAlphaNotPlayed
                );
            fillRectWithRGBA(
                ctx,
                segStartX,
                colorRectY,
                segEndX - segStartX,
                colorRectH,
                colorUsed,
                opacity
                );
          }
        }

        ctx.restore();
      }

      // slider body
      {
        var sliderStartX = sliderX1 < clearRectX ? clearRectX : sliderX1;
        var sliderEndX = sliderX2 > clearRectX2 ? clearRectX2 : sliderX2;

        ctx.save();
        ctx.lineWidth = sliderLineWidth;

        if (sliderStartX <= indicatorX && indicatorX <= sliderEndX) {
          // played parts
          ctx.strokeStyle = '#111';
          ctx.beginPath();
          ctx.moveTo(sliderStartX, sliderY);
          ctx.lineTo(indicatorX, sliderY);
          ctx.stroke();

          // unplayed parts
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
          ctx.beginPath();
          ctx.moveTo(indicatorX, sliderY);
          ctx.lineTo(sliderEndX, sliderY);
          ctx.stroke();
        } else {
          ctx.strokeStyle = sliderEndX < indicatorX ? '#111' : 'rgba(255, 255, 255, 0.75)';
          ctx.beginPath();
          ctx.moveTo(sliderStartX, sliderY);
          ctx.lineTo(sliderEndX, sliderY);
          ctx.stroke();
        }

        // song part separators
        for (var i = 0; i < cachedSongPartPointsX.length; i++) {
          var separatorX = cachedSongPartPointsX[i];
          var separatorX1 = (separatorX - sliderLineWidth / 2)|0;
          var separatorX2 = (separatorX1 + sliderLineWidth)|0;

          if (
              !isCompleteRedraw &&
              (separatorX2 < clearRectX || separatorX1 > clearRectX2)
              ) {
            continue;
          }

          separatorX1 = separatorX1 < clearRectX ? clearRectX : separatorX1;
          separatorX2 = separatorX2 > clearRectX2 ? clearRectX2 : separatorX2;

          ctx.fillStyle = separatorX <= indicatorX ? '#111' : 'rgba(255, 255, 255, 0.75)';
          ctx.fillRect(
              separatorX1,
              sliderY - partSeparatorHeightT,
              separatorX2 - separatorX1,
              partSeparatorHeightT + partSeparatorHeightB
              );
        }

        ctx.restore();
      }

      // slider indicator
      {
        ctx.save();

        if (indicatorActive) {
          ctx.fillStyle = "rgba(0, 0, 0, 0.125)";
          ctx.beginPath();
          ctx.arc(indicatorX, indicatorY, indicatorActiveCircleRadius, 0, 2 * Math.PI);
          ctx.fill();
        }

        ctx.fillStyle = "#111";
        ctx.beginPath();
        ctx.arc(indicatorX, indicatorY, indicatorR, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
      }

      // tick box
      {
        ctx.save();
        var i = 0;
        var curX = tickBoxStartX;
        for (; i < totalTicks; i++) {
          if (i == currentTick) {
            ctx.fillStyle = i == 0 ? '#ff9a00' : '#32cd32';
          } else {
            ctx.fillStyle = '#eeeeee';
          }

          ctx.fillRect(curX, tickBoxStartY, tickBoxSize, tickBoxSize);
          curX += tickBoxSize + tickBoxGapWidth;
        };
        ctx.restore();
      }

      // measure number
      // don't draw if box is too small
      // TODO: performance
      if (tickBoxSize >= 16) {
        ctx.save();
        ctx.fillStyle = '#000';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText("" + currentMeasure, tickBoxStartX + tickBoxSize / 2, tickBoxStartY + tickBoxSize / 2 - 6, tickBoxSize);
        ctx.restore();
      }
    };


    var circleDistanceSquared = function(x, y, cx, cy, r) {
      if (x < (cx - r) || x > (cx + r) || y < (cy - r) || y > (cy + r)) {
        return Infinity;
      }

      return Math.pow(x - cx, 2) + Math.pow(y - cy, 2);
    };


    var indicatorHitTest = function(x, y) {
      var d = circleDistanceSquared(
          x,
          y,
          indicatorX,
          indicatorY,
          indicatorActiveCircleRadius
          );
      var r = (
          indicatorActive ?
          indicatorRadiusHovered :  // because the active circle is smaller than hovered one
          indicatorHovered ?
          indicatorRadiusHovered :
          indicatorRadius
          );

      return d <= r * r;
    };


    var sliderHitTest = function(x, y, isActive) {
      if (!isActive) {
        if (
            x < sliderX1 - indicatorRadiusHovered ||
            x > sliderX2 + indicatorRadiusHovered ||
            y < sliderY - sliderHitTestDistance ||
            y > sliderY + sliderHitTestDistance
            ) {
          return -1;
        }

        if (x < sliderX1) {
          // not in reach of even slider indicator?
          if (
              circleDistanceSquared(
                x,
                y,
                sliderX1,
                sliderY,
                indicatorRadiusHovered
                ) > indicatorRadiusHovered * indicatorRadiusHovered
              ) {
            return -1;
          }

          // left side of slider indicator positioned at extreme left
          return 0.0;
        }

        if (x > sliderX2) {
          // ditto
          if (
              circleDistanceSquared(
                x,
                y,
                sliderX2,
                sliderY,
                indicatorRadiusHovered
                ) > indicatorRadiusHovered * indicatorRadiusHovered
              ) {
            return -1;
          }

          // right side of slider indicator positioned at extreme right
          return 1.0;
        }
      }

      var pos = +((x - sliderX1) / sliderLength);

      if (!isActive) {
        return +((pos < 0 || pos > 1) ? -1 : pos);
      }

      return +(pos < 0 ? 0 : pos > 1 ? 1 : pos);
    };


    var updatePointer = function(fromDraw) {
      var prev;

      if (indicatorActive) {
        var sliderHitResult = sliderHitTest(pointerX, pointerY, true);
        var newPos = sliderHitResult < 0 ? positionBeforeIndicatorActive : sliderHitResult;
        updateRawPosition(newPos, fromDraw);
        return;
      }

      // hit test
      // slider indicator
      var prev = indicatorHovered;
      indicatorHovered = indicatorHitTest(pointerX, pointerY);
      if (prev != indicatorHovered && !fromDraw) {
        draw();
      }
    };


    var onPointerMove = function(pageX, pageY) {
      pointerX = pageX - elemOffsetX;
      pointerY = pageY - elemOffsetY;
      // console.log(elemOffsetX, elemOffsetY, pointerX, pointerY);
      updatePointer(false);
    };


    var onmousemove = function(e) {
      onPointerMove(e.pageX, e.pageY);
    };


    var ontouchmove = function(e) {
      // we don't need mousemove event any more if touch is supported
      // e.preventDefault();

      var touches = e.changedTouches;
      for (var i = 0; i < touches.length; i++) {
        var touch = touches[i];

        if (touch.identifier !== firstTouchId) {
          // only process the first touch
          continue;
        }

        onPointerMove(touch.pageX, touch.pageY);
        break;
      }
    };


    var onPointerDown = function(pageX, pageY) {
      pointerX = pageX - elemOffsetX;
      pointerY = pageY - elemOffsetY;

      var sliderHitResult = sliderHitTest(pointerX, pointerY, false);

      if (sliderHitResult < 0) {
        return;
      }

      indicatorActive = true;
      positionBeforeIndicatorActive = position;
      updateRawPosition(sliderHitResult, false);
    };


    var onmousedown = function(e) {
      if (!(e.buttons & 0x01)) {
        // only process left click for now
        return;
      }

      onPointerDown(e.pageX, e.pageY);
    };


    var ontouchstart = function(e) {
      if (firstTouchId !== null) {
        // only process the first touch
        return;
      }

      // XXX: is it possible that a single touchstart event could contain
      // >1 touches?
      var touch = e.changedTouches[0];
      firstTouchId = touch.identifier;
      onPointerDown(touch.pageX, touch.pageY);
    };


    var onPointerUp = function(pageX, pageY) {
      pointerX = pageX - elemOffsetX;
      pointerY = pageY - elemOffsetY;

      if (indicatorActive) {
        // send seek event
        $scope.$broadcast('transport:seek', position, duration);
        indicatorActive = false;
        draw();
      }
    };


    var onmouseup = function(e) {
      if (e.button !== 0) {
        // left button still down, don't release yet
        return;
      }

      onPointerUp(e.pageX, e.pageY);
    };


    var ontouchend = function(e) {
      var touches = e.changedTouches;
      for (var i = 0; i < touches.length; i++) {
        // TODO: properly track all touches instead of one?
        var touch = touches[i];

        if (touch.identifier !== firstTouchId) {
          continue;
        }

        onPointerUp(touch.pageX, touch.pageY);
        firstTouchId = null;
        break;
      }
    };


    var ontouchcancel = function(e) {
      // TODO: actually cancel the touch instead of treating it the same as
      // ending
      ontouchend(e);
    };


    var onWidgetResize = function(e) {
      // $log.debug('widget/window resized, scheduling canvas re-size on next draw');
      inResizeFallout = true;

      if (!isPlaying) {
        draw();
      }
    };


    // bind events
    MouseEvent.addMouseMoveListener(onmousemove);
    elem.addEventListener('mousedown', onmousedown);
    MouseEvent.addMouseUpListener(onmouseup);

    MouseEvent.addTouchMoveListener(ontouchmove);
    elem.addEventListener('touchstart', ontouchstart);
    MouseEvent.addTouchEndListener(ontouchend);
    MouseEvent.addTouchCancelListener(ontouchcancel);

    $window.addEventListener('resize', onWidgetResize);
    ResizeDetector.listenTo(containerElem, onWidgetResize);

    // add canvas to container
    containerElem.appendChild(elem);

    return {
      setIsPlaying: setIsPlaying,
      update: update,
      updateTick: updateTick,
      updateSongForm: updateSongForm,
      updateSongColors: updateSongColors
    };
  };

  var transportState = transportCanvasStateFactory(document.querySelectorAll('.transport__canvas-container')[0]);
  var updateTransport = transportState.update;

  FrameManager.addFrameCallback(transportFrameCallback);
  updateTransport(0.0, 0.0);

  $log.debug('$scope=', $scope);
});
/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
