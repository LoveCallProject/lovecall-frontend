/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

require('angular');

require('./frame');
require('./steptime');
require('./tickbox');


angular.module('lovecall/ui/index', [
    'lovecall/ui/frame',
    'lovecall/ui/steptime',
    'lovecall/ui/tickbox'
]);
/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
