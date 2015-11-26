/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

require('angular');

require('./engine/audio');
require('./provider/choreography');
require('./provider/song');
require('./ui/frame');


var mod = angular.module('lovecall/demo', [
    'lovecall/engine/audio',
    'lovecall/provider/choreography',
    'lovecall/provider/song',
    'lovecall/ui/frame'
]);

mod.controller('DemoController', function($window, AudioEngine, Choreography, Song, FrameManager) {
  // test Ajax loading
  Song.load('snowhare.mp3', function(hash, buffer) {
    console.log(hash, buffer);

    // demo
    Choreography.load(CALL_DATA, hash);

    AudioEngine.setSourceData(buffer);
    AudioEngine.setTempo(Choreography.getTempo());
  });


  // frame loop
  FrameManager.startFrameLoop($window);
});
/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
