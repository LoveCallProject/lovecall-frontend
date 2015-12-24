/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */

'use strict';

require('angular');


var BUILTIN_FONT_FAMILIES = {
  en: '"Source Sans Pro", "DejaVu Sans", "Bitstream Vera", sans-serif',
  cmn: '"Source Han Sans CN", "Source Han Sans SC", "思源黑体 CN", "思源黑体", "Noto Sans CJK SC", "微软雅黑", "Microsoft YaHei", sans-serif',
  ja: '"Source Han Sans JP", "源ノ角ゴシック", "Noto Sans CJK JP", "ヒラギノ角ゴ Pro W3", "Hiragino Kaku Gothic Pro",Osaka, "メイリオ", Meiryo, "ＭＳ Ｐゴシック", "MS PGothic", sans-serif',
};


var mod = angular.module('lovecall/provider/font-selector', [
]);

mod.factory('FontSelector', function() {
  this.fontFamilyForLanguage = function(language) {
    var result = BUILTIN_FONT_FAMILIES[language];
    return typeof(result) !== 'undefined' ? result : 'sans-serif';
  };


  this.canvasFontForLanguage = function(language, size) {
    return size + 'px ' + this.fontFamilyForLanguage(language);
  };


  return this;
});
/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
