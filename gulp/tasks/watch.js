
var gulp = require('gulp'),
	config = require('../config'),
	watch    = require('gulp-watch')
  log = require('../util/log');

// ----- Watch during development -----

gulp.task('watch', function ( callback ) {


  config.assets.forEach( function( asset ) {

    if ( typeof(asset.cssWatch) !== "undefined") {
      log('[ Watching ] '+'css-dev-'+asset.slug);
      watch( asset.cssWatch, function (files, callback) {
          log('[ Changed ] '+'css-dev-'+asset.slug);
          gulp.start( ['css-dev-'+asset.slug] );
      });
    }
    if ( typeof(asset.jsWatch) !== "undefined") {
      log('[ Watching ] '+'js-dev-'+asset.slug);
      watch( asset.jsWatch, function (files, callback) {
          log('[ Changed ] '+'js-dev-'+asset.slug);
          gulp.start( ['js-dev-'+asset.slug] );
      });
    }
  });

});
