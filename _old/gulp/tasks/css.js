
var gulp = require('gulp'),
    config = require('../config'),
    plugins = require('gulp-load-plugins')(),
    rimraf = require('rimraf'),
    log = require('../util/log');


config.assets.forEach( function( asset ) {

  if ( typeof(asset.cssSource) !== "undefined") {
    setupTasks( asset.slug, asset.cssSource, asset.cssDest, asset.cssFiles );
  }
});


function setupTasks( slug, src, dest, files ) {

  gulp.task('css-clean-'+slug, function() {
    return runCleanCSS( slug, src, dest );
  });

  gulp.task('css-concat-'+slug, ['css-clean-'+slug], function() {
    return runConcatCSS( slug, src, dest, files );
  });

  gulp.task('css-min-'+slug, ['css-concat-'+slug], function() {
    return runMinifyCSS( slug, src, dest );
  });


  gulp.task('css-dev-concat-'+slug, ['css-clean-'+slug], function() {
    return runConcatCSS( slug, src, dest, files, true );
  });

  gulp.task('css-dev-'+slug, ['css-clean-'+slug, 'css-dev-concat-'+slug], function() {
    return runMinifyCSS( slug, src, dest, true );
  });

};

function runConcatCSS( slug, src, dest, files, dev ) {

  dev = (typeof dev !== 'undefined') ? dev : false;

  var bundle = gulp.src( files );

  // --- Init source maps if dev mode ---
  if (dev) bundle = bundle.pipe( plugins.sourcemaps.init({loadMaps: true}) );

  bundle = bundle.pipe( plugins.concat( slug+'.css' ) );

  // --- Write source maps if dev mode ---
  if (dev) bundle = bundle.pipe( plugins.sourcemaps.write() );

  bundle = bundle.pipe( gulp.dest( dest ) )
      .on('end', function(){ log('[ CSS ] Combined to '+dest+slug+'.css'); });

  return bundle;
};

function runMinifyCSS( slug, src, dest, dev ) {

  dev = (typeof dev !== 'undefined') ? dev : false;


  var opt = {
    keepSpecialComments : false, // Keep first
//      processImport : true, // include @import?
    relativeTo : dest
  };

  var bundle = gulp.src( dest+slug+'.css' );

  // --- Init source maps if dev mode ---
  if (dev) bundle = bundle.pipe( plugins.sourcemaps.init({loadMaps: true}) );

  bundle = bundle.pipe( plugins.bytediff.start() );

  bundle = bundle.pipe( plugins.minifyCss( opt ))
    .pipe( plugins.rename( slug+'.min.css' ) );

  // --- Write source maps if dev mode ---
  if (dev) bundle = bundle.pipe( plugins.sourcemaps.write() );

  bundle = bundle.pipe( plugins.bytediff.stop() )
    .pipe( gulp.dest( dest ) )
    .on('end', function(){ log('[ CSS ] Minified to '+dest+slug+'.min.css'); });

  return bundle;
};


function runCleanCSS( slug, src, dest ) {

  rimraf( dest+slug+'.css', function(){
    log('[ CSS ] Removed previous bundle: '+dest+slug+'.css');
  });
};

function runSass( slug, files, dest, dev ) {

  dev = typeof dev !== 'undefined' ? dev : false;

  // Compile Sass here

}
