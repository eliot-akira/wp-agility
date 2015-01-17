
// ----- Define assets -----

var config = {},
    assets = [];

config.ignoreFiles = '!{**/_*,**/_*/**}'; // Exclude everything starting with _


assets = [
  {
    slug : 'ajaxio',
    folder : './base/assets/',
    css : false,
    js : true
  },
  {
    slug : 'ajaxio-form',
    folder : './extensions/form/assets/',
    css : true,
    js : true
  }
];

config.assets = [];

assets.forEach(function( asset ){

  if ( asset.css ) {
    asset.cssSource = asset.folder+'css/src/';
    asset.cssDest = asset.folder+'css/';
    asset.cssFiles = [
        asset.cssSource+'style.css', // Compiled Sass
        asset.cssDest+'lib/**/*.css',
        asset.cssDest+'common/**/*.css',
        // asset.cssDest+asset.slug+'.css', // ??
        config.ignoreFiles
    ];
    asset.cssWatch = [
        asset.cssSource+'**/*.css',
        asset.cssDest+'lib/**/*.css',
        asset.cssDest+'common/**/*.css',
        // config.ignoreFiles - watch Sass partials
    ]
  }

  if ( asset.js ) {
    asset.jsSource = asset.folder+'js/src/';
    asset.jsDest = asset.folder+'js/';
    asset.jsFiles = [
        asset.jsDest+'lib/**/*.js',
        asset.jsDest+'common/**/*.js',
        asset.jsDest+asset.slug+'.js', // Browserified
        config.ignoreFiles
    ];
    asset.jsWatch = [
        asset.jsSource+'**/*.js',
        asset.jsDest+'lib/**/*.js',
        asset.jsDest+'common/**/*.js',
        config.ignoreFiles
    ]
  }

  config.assets.push(asset);
});

module.exports = config;
