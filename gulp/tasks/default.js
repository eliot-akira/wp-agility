	
var gulp = require('gulp'),
    config = require('../config'),
    log = require('../util/log'),
    tasks = [],
    task = '';

config.assets.forEach( function( asset ) {

  if ( typeof(asset.cssSource) !== "undefined") {
    task = 'css-min-'+asset.slug;
    tasks.push(task);
  }

  if ( typeof(asset.jsSource) !== "undefined") {
    task = 'js-min-'+asset.slug;
    tasks.push(task);
  }
});

// Default tasks
gulp.task('default', tasks);
