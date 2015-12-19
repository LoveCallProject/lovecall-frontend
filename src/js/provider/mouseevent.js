/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

require('angular');


var mod = angular.module('lovecall/provider/mouseevent', [
]);

mod.factory('MouseEvent', function($window) {
  var mouseEventCallbackHandlerFactory = function(eventName) {
    var listeners = {};
    var id = 0;

    var callback = function(e) {
      for (var k in listeners) {
        listeners[k](e);
      }
    };


    var add = function(callback) {
      var usedId = id;
      listeners[usedId] = callback;
      id += 1;
      return usedId;
    };


    var remove = function(index) {
      delete listeners[index];
    }


    $window.addEventListener(eventName, callback);

    return {
      add: add,
      remove: remove
    };
  };


  var mouseMoveHandler = mouseEventCallbackHandlerFactory('mousemove');
  var mouseDownHandler = mouseEventCallbackHandlerFactory('mousedown');
  var mouseUpHandler = mouseEventCallbackHandlerFactory('mouseup');

  var touchMoveHandler = mouseEventCallbackHandlerFactory('touchmove');
  var touchEndHandler = mouseEventCallbackHandlerFactory('touchend');
  var touchCancelHandler = mouseEventCallbackHandlerFactory('touchcancel');


  return {
    addMouseMoveListener: mouseMoveHandler.add,
    removeMouseMoveListener: mouseMoveHandler.remove,
    addMouseDownListener: mouseDownHandler.add,
    removeMouseDownListener: mouseDownHandler.remove,
    addMouseUpListener: mouseUpHandler.add,
    removeMouseUpListener: mouseUpHandler.remove,
    addTouchMoveListener: touchMoveHandler.add,
    removeTouchMoveListener: touchMoveHandler.remove,
    addTouchEndListener: touchEndHandler.add,
    removeTouchEndListener: touchEndHandler.remove,
    addTouchCancelListener: touchCancelHandler.add,
    removeTouchCancelListener: touchCancelHandler.remove,
  };
});
/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
