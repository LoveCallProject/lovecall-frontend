/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

require('angular');

require('../engine/audio');
require('../provider/choreography');
require('../provider/resize-detector');
require('../provider/mouseevent');
require('./frame');


var mod = angular.module('lovecall/ui/transport', [
    'lovecall/engine/audio',
    'lovecall/provider/choreography',
    'lovecall/provider/resize-detector',
    'lovecall/provider/mouseevent',
    'lovecall/ui/frame'
]);

mod.controller('TransportController', function($scope, $window, $log, AudioEngine, Choreography, FrameManager, ResizeDetector, MouseEvent) {
  $log = $log.getInstance('TransportController');

  // scope states
  $scope.isLoaded = false;
  $scope.playbackPos = 0;
  $scope.isPlaying = false;
  $scope.playButtonIcon = 'play_arrow';
  $scope.volumePercentage = 100;

  // internal states
  var isPlaying = false;
  var playbackPos = 0;
  var prevIsPlaying = true;
  var prevPlaybackPos = -1;
  var duration = 0;


  // actions
  var play = function() {
    $scope.playButtonIcon = 'pause';
    AudioEngine.resume();
  };


  var pause = function() {
    $scope.playButtonIcon = 'play_arrow';
    AudioEngine.pause();
  };


  $scope.togglePlay = function() {
    (isPlaying ? pause : play)();
  };


  $scope.$watch('volumePercentage', function(to, from) {
    AudioEngine.setVolume(to / 100);
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
    updateTransport(0.0, duration);
    transportState.updateSongForm(Choreography.getForm());
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
  });


  $scope.$on('frame:playbackPosStep', function(evt, v) {
    // don't draw immediately as frame callback will take care of that
    transportState.updateTick(v >> 2, true);
  });


  // frame callback
  var transportFrameCallback = function(ts) {
    isPlaying = AudioEngine.getIsPlaying();
    playbackPos = AudioEngine.getPlaybackPosition();

    if (prevIsPlaying != isPlaying) {
      $scope.isPlaying = isPlaying;
      $scope.$digest();
    }

    // chromium thinks i'm causing jank by delibrately limiting the refresh
    // rate... so here's the full 60fps someone wanted
    updateTransport(playbackPos, duration);

    // limit update frequency
    if (prevPlaybackPos != playbackPos && Math.abs($scope.playbackPos - playbackPos) >= 500) {
      $scope.playbackPos = playbackPos;
      $scope.$digest();
    }

    prevIsPlaying = isPlaying;
    prevPlaybackPos = playbackPos;
  };


  /* canvas */

  var prevTransportPos = 0;

  var transportCanvasStateFactory = function(containerElem) {
    // parameters
    var marginL = 16;
    var marginR = 16;
    var sliderLineWidth = 2;
    var sliderHitTestDistance = 8;
    var indicatorRadius = 8;
    var indicatorRadiusHovered = 10;
    var indicatorRadiusActive = 12;
    var indicatorActiveCircleRadius = 18;

    var tickBoxWidthRatio = 1 / 8;
    var tickBoxGapRatio = 1 / 2;
    var tickBoxMarginTB = 8;

    // ui states
    var position = 0;
    var durationMs = 0;
    var indicatorHovered = true;
    var indicatorActive = false;
    var positionBeforeIndicatorActive = 0;

    var songForm = null;

    var totalTicks = 4;  // TODO
    var currentTick = 0;

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
    var cachedSongPartGeneration = 0;
    var prevCachedSongPartGeneration = -1;

    var tickBoxAreaWidth = 0;
    var tickBoxSize = 0;
    var tickBoxGapWidth = 0;
    var tickBoxStartX = 0;
    var tickBoxStartY = 0;


    var update = function(pos, duration, skipDraw) {
      duration != null && (durationMs = duration);
      updateRawPosition(+(duration > 0 ? pos / duration : 0.0), skipDraw);
    };


    var updateRawPosition = function(pos, skipDraw) {
      position = +(duration > 0 ? pos : 0.0);
      skipDraw || draw();
    };


    var updateTick = function(tick, skipDraw) {
      currentTick = tick;
      skipDraw || draw();
    };


    var updateSongForm = function(form, skipDraw) {
      songForm = form;
      refreshSongPartCache();
      skipDraw || draw();
    };


    var refreshSongPartCache = function() {
      cachedSongPartPointsX.splice(0, cachedSongPartPointsX.length);
      if (songForm) {
        songForm.forEach(function(x) {
          cachedSongPartPointsX.push((sliderX1 + (x.ts / durationMs) * sliderLength)|0);
        });
        cachedSongPartPointsX.sort(function(a, b) {
          return a - b;
        });
      }

      cachedSongPartGeneration += 1;
    };


    var draw = function() {
      var isCompleteRedraw = inResizeFallout;
      var prevIndicatorX = indicatorX;
      var clearRectX;
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
          elem.width = w;
          elem.height = h;
          prevW = w;
          prevH = h;
          halfH = (h / 2)|0;
        }

        // cache static parameters
        // slider body
        // sliderX1 = marginL;
        sliderLength = ((w - marginL - marginR) * (1 - tickBoxWidthRatio)) |0;
        sliderX2 = (sliderX1 + sliderLength)|0;
        sliderY = halfH;

        // slider indicator
        indicatorY = halfH;

        // song parts
        refreshSongPartCache();

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
      indicatorX = (marginL + position * sliderLength)|0;
      indicatorR = (
          indicatorHovered ?
          indicatorRadiusHovered :
          indicatorRadius
          )|0;
      /*
      // actual draw
      // ctx.fillStyle = "grey";
      // ctx.fillRect(0, 0, w, h);
      if (isCompleteRedraw) {
        clearRectX = clearRectY = 0;
        clearRectW = w;
        clearRectH = h;
      } else {
        // clear the area around previous position of indicator
        clearRectX = prevIndicatorX - indicatorActiveCircleRadius;
        clearRectY = 0;
        clearRectW = indicatorActiveCircleRadius * 2;
        clearRectH = h;
      }
      */

      ctx.clearRect(0, 0, w, h);

      // slider body
      {
        ctx.save();
        ctx.lineWidth = sliderLineWidth;
        // played parts
        var sliderColors = getSliderColors(
            AudioEngine.getPlaybackPosition()
            );

        if (sliderColors) {
          var strokeLength = ( indicatorX - sliderX1 ) /
              sliderColors.length;
        } else {
          sliderColors = ['#eeeeee'];
          strokeLength = 0;
        }

        sliderColors.map(function(color, index) {
          ctx.strokeStyle = color;
          ctx.beginPath();
          ctx.moveTo(sliderX1 + index * strokeLength, sliderY);
          ctx.lineTo(sliderX1 + (index + 1) * strokeLength, sliderY);
          ctx.stroke();
        });

        // unplayed parts
        ctx.strokeStyle = '#eeeeee';
        ctx.beginPath();
        ctx.moveTo(indicatorX, sliderY);
        ctx.lineTo(sliderX2, sliderY);
        ctx.stroke();
        // song part separators
        // TODO: don't draw unaffected points over and over
        cachedSongPartPointsX.forEach(function(separatorX) {
          /*
          if (
              !isCompleteRedraw &&
              prevCachedSongPartGeneration == cachedSongPartGeneration &&
              (separatorX < clearRectX || separatorX > clearRectX + clearRectW)
              ) {
            return;
          }
          */

          ctx.strokeStyle = separatorX < indicatorX ? '#666666' : '#eeeeee';
          ctx.beginPath();
          ctx.moveTo(separatorX, sliderY - 12);
          ctx.lineTo(separatorX, sliderY + 12);
          ctx.stroke();
        });
        ctx.restore();

        prevCachedSongPartGeneration = cachedSongPartGeneration;
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

        ctx.fillStyle = "#666666";
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
    };

    var getSliderColors = function(playbackPos) {
      var colors = Choreography.getColors();

      if (colors === null) {
        return ['#eeeeee'];
      }

      for (var i = 0;i < colors.length;i++) {
        if ((playbackPos > colors[i][0]) &&
            (playbackPos <= colors[i][1])) {
          return colors[i][2];
        }
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


    var onmousemove = function(e) {
      pointerX = e.pageX - elemOffsetX;
      pointerY = e.pageY - elemOffsetY;
      // console.log(elemOffsetX, elemOffsetY, pointerX, pointerY);
      updatePointer(false);
    };


    var onmousedown = function(e) {
      pointerX = e.pageX - elemOffsetX;
      pointerY = e.pageY - elemOffsetY;

      if (!(e.buttons & 0x01)) {
        // only process left click for now
        return;
      }

      var sliderHitResult = sliderHitTest(pointerX, pointerY, false);

      if (sliderHitResult < 0) {
        return;
      }

      indicatorActive = true;
      positionBeforeIndicatorActive = position;
      updateRawPosition(sliderHitResult, false);
    };


    var onmouseup = function(e) {
      pointerX = e.pageX - elemOffsetX;
      pointerY = e.pageY - elemOffsetY;

      if (e.buttons & 0x01) {
        // left button still down, don't release yet
        return;
      }

      if (indicatorActive) {
        // send seek event
        $scope.$broadcast('transport:seek', position, duration);
        indicatorActive = false;
        draw();
      }
    };


    var onWidgetResize = function(e) {
      $log.debug('widget resized, scheduling canvas re-size on next draw');
      inResizeFallout = true;
    };


    // bind events
    MouseEvent.addMouseMoveListener(onmousemove);
    elem.addEventListener('mousedown', onmousedown);
    MouseEvent.addMouseUpListener(onmouseup);

    ResizeDetector.listenTo(containerElem, onWidgetResize);

    // add canvas to container
    containerElem.appendChild(elem);

    return {
      update: update,
      updateTick: updateTick,
      updateSongForm: updateSongForm
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
