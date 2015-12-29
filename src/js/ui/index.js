/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

require('angular');

require('./about');
require('./container');
require('./config.js');
require('./call');
require('./frame');
require('./metadata');
require('./navigation');
require('./song-loading');
require('./song-selector');
require('./transport');

require('../../templates/index.tmpl.html');


var mod = angular.module('lovecall/ui/index', [
    'lovecall/ui/about',
    'lovecall/ui/container',
    'lovecall/ui/config',
    'lovecall/ui/call',
    'lovecall/ui/frame',
    'lovecall/ui/metadata',
    'lovecall/ui/navigation',
    'lovecall/ui/song-loading',
    'lovecall/ui/song-selector',
    'lovecall/ui/transport'
]);

mod.directive('lovecallApp', function() {
  return {
    restrict: 'EA',
    templateUrl: 'index.tmpl.html',
  };
});
/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
