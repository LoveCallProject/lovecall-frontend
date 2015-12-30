/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

require('angular');

require('./conf');

var mod = angular.module('lovecall/update', [
  'ngMaterial',
  'lovecall/conf',
]);

mod.run(function($http, $mdDialog, LCConfig) {
  $http({
    method: 'GET',
    url: 'http://lovecall.moe/static/version.json'
  }).then(function successCallback(res) {
    var versionInfo = res.data;
    console.log(versionInfo);
    if (versionInfo.version > LCConfig.VERSION) {
      var confirm = $mdDialog.confirm()
          .title('LoveCall有新版本v' + versionInfo.version + '，是否更新')
          .textContent('更新内容：' + versionInfo.content)
          .ariaLabel('Lucky day')
          .ok('立即更新')
          .openFrom({
            top: document.body.height / 2,
            width: 30,
            height: 80
          })
          .closeTo({
            top: document.body.height / 2
          })
          .cancel('下次再说')

      $mdDialog.show(confirm).then(function() {
        window.cordova.plugins.FileOpener.openFile(
            REMOTE_APK_PREFIX + 'lovecall' + versionInfo.version + '.apk',
            function() {
              // success
            }
        );

        console.log("let's update");
      }, function() {});
    }

  }, function errorCallback(res) {

  });
});
/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
