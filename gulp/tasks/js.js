
var gulp = require('gulp'),
  	config = require('../config'),
    log = require('../util/log'),
    plugins = require('gulp-load-plugins')(),
    browserify = require('browserify'),
    source = require('vinyl-source-stream'),
    buffer = require('vinyl-buffer'),
    rimraf = require('rimraf'),
    mold = require('mold-source-map');


config.assets.forEach( function( asset ) {
  if ( typeof(asset.jsSource) !== "undefined") {
    setupTasks( asset.slug, asset.jsSource, asset.jsDest, asset.jsFiles );
  }
});

function setupTasks( slug, src, dest, files ) {


  gulp.task('js-clean-'+slug, function() {
    return runCleanJS( slug, src, dest );
  });

  gulp.task('js-browserify-'+slug, ['js-clean-'+slug], function() {
    return runBrowserify( slug, src, dest );
  });

  gulp.task('js-min-'+slug, ['js-browserify-'+slug], function() {
    return runMinifyJS( slug, src, dest, files );
  });


  gulp.task('js-hint-'+slug, function() {
    return runJSHint( slug, src, dest );
  });

  gulp.task('js-dev-browserify-'+slug, ['js-hint-'+slug,'js-clean-'+slug], function() {
    return runBrowserify( slug, src, dest, true );
  });

  gulp.task('js-dev-'+slug, ['js-dev-browserify-'+slug, 'js-hint-'+slug], function() {
    return runMinifyJS( slug, src, dest, files, true );
  });

};


function runJSHint( slug, src, dest ) {

  return gulp.src( [src+'**/*.js'] )
    .pipe( plugins.jshint() )
    .pipe( plugins.jshint.reporter('default'));
};

function runBrowserify( slug, src, dest, dev ) {

  dev = typeof dev !== 'undefined' ? dev : false;

  var bundle = browserify({
        // cache: {}, packageCache: {}, 
        // fullPaths: true,
        entries: src+'index.js',
        debug: dev // Sourcemap
      }).bundle();

  if ( dev ) bundle = bundle.on('error', function(err){ // Prevent error from stopping watch
    console.log(err.message);
    this.emit("end"); // Keep stream going
  });

  // if (dev) bundle = bundle.pipe(mold.transformSourcesRelativeTo(__dirname)); // 

  bundle = bundle.pipe( source( slug+'.js' ) ).pipe( buffer() ); // Browserify -> gulp stream

  // --- Write source maps if dev mode ---
  if ( dev ) {
    bundle = bundle
      .pipe(plugins.sourcemaps.init({ loadMaps: true })) // 
      .pipe(plugins.sourcemaps.write()); // 
  }

  bundle = bundle.pipe(gulp.dest( dest ));

  bundle = bundle.on('end', function(){ log('[ JS ] Browserified with sourcemaps: '+src+'index.js') });

  return bundle;
};

function runMinifyJS( slug, src, dest, files, dev ) {

  dev = (typeof dev !== 'undefined') ? dev : false;

  var bundle = gulp.src( files )
      .pipe( plugins.bytediff.start() );


  // --- Init source maps if dev mode ---
  if (dev) bundle = bundle.pipe( plugins.sourcemaps.init({ loadMaps: true }) );


  bundle = bundle.pipe( plugins.concat('combined.js') )
    .pipe( plugins.rename( slug+'.min.js' ) );

    if ( ! dev) bundle = bundle.pipe( plugins.uglify() ); // Only minify on production


  // --- Write source maps if dev mode ---
  if (dev) bundle = bundle.pipe( plugins.sourcemaps.write() );


  bundle = bundle
    .pipe( plugins.bytediff.stop() )
    .pipe( gulp.dest( dest ) )
    .on('end', function(){ log('[ JS ] Minified to '+dest+slug+'.min.js') });

  return bundle;
};

function runCleanJS( slug, src, dest ) {

  rimraf( dest+slug+'.js', function(){
    log('[ JS ] Removed previous bundle: '+dest+slug+'.js');
  });
};







/*


gulp.task('browserify', function() {

});



gulp.task('browserify-dev', function() {

  var bundler = browserify({
//    cache: {}, packageCache: {}, fullPaths: true,
    entries: config.path.js + config.file.browserifyEntry,
    debug: true // With sourcemap
  });

  var bundle = function() {
    return bundler
        .bundle()
        .pipe( source( config.file.jsMin ) )
        .pipe( buffer() )
        .pipe(plugins.sourcemaps.init({loadMaps: true}))
          .pipe(plugins.uglify()) // Minify - What about libs..?
        .pipe(plugins.sourcemaps.write('./'))
        .pipe(gulp.dest( config.path.jsDest ));
  }

  return bundle();
});


gulp.task('js-min', ['browserify'], function() {

 Just an alias

  return gulp.src( config.path.jsDest + config.file.browserified )
//  .pipe( plugins.sourcemaps.init() )
//  .pipe( plugins.concat('combined.js') )
  .pipe( plugins.uglify() )
//  .pipe( plugins.sourcemaps.write() )
  .pipe( plugins.rename( config.file.jsBundle ) )
  .pipe( gulp.dest( config.path.jsDest ) );

});


gulp.task('js-dev', ['browserify-dev'], function() {

// Don't minify

  return gulp.src( config.path.jsDest + config.file.browserified )
  .pipe( plugins.sourcemaps.init() )
//  .pipe( plugins.concat('combined.js') )
  .pipe( plugins.uglify() )
  .pipe( plugins.sourcemaps.write() )
  .pipe( plugins.rename( config.file.jsBundle ) )
  .pipe( gulp.dest( config.path.jsDest ) );

});


*/





// ----- Browserify -----

/*
var bundler = watchify(browserify( config.path.js + config.file.jsEntry, watchify.args));

// add any other browserify options or transforms here

bundler.transform('browserify-global-shim');

gulp.task('browserify', bundle);
bundler.on('update', bundle);

function bundle() {
  return bundler.bundle()
    // log errors if they happen
    .on('error', gutil.log.bind(gutil, 'Browserify Error'))
    .pipe(source('bundle.js'))
    // optional, remove if you dont want sourcemaps
      .pipe(buffer())
      .pipe(plugins.sourcemaps.init({loadMaps: true})) // loads map from browserify file
      .pipe(plugins.sourcemaps.write('./')) // writes .map file
    //
    .pipe(gulp.dest( config.path.jsDest ));
}
*/

