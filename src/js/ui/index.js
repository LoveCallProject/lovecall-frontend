/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

require('angular');

require('./container');
require('./call');
require('./frame');
require('./metadata');
require('./navigation');
require('./song-loading');
require('./song-selector');
require('./transport');


angular.module('lovecall/ui/index', [
    'lovecall/ui/container',
    'lovecall/ui/call',
    'lovecall/ui/frame',
    'lovecall/ui/metadata',
    'lovecall/ui/navigation',
    'lovecall/ui/song-loading',
    'lovecall/ui/song-selector',
    'lovecall/ui/transport'
]);
/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
