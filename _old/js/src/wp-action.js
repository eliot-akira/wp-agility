
/*---------------------------------------------
 *
 * wp.action
 * 
 * - get, save
 * - login, logout, go, reload
 *
 */

var $ = require('jquery'),
    wpAjax = require('./wp-ajax.js');

module.exports = $.extend( window.wp.action || {}, {

  /**
   *
   * get( [type,] { query } )
   * 
   * @param {string} type   Content type: posts, users
   * @param {object} query  Query arguments
   * 
   * @todo taxonomy, comments
   *
   */

  get : function() {

    var type = 'posts'; // Default

    // Create array of arguments
    var args = Array.prototype.slice.call(arguments, 0);

    if ( args.length === 0 )
      return wpAjax( 'fail' );

    if ( typeof args[0] === 'string' ) {
      type = args[0];
      args.shift();
    }

    request = args[0] || {};
    success = args[1] || {};
    error = args[2] || {};

    if ( typeof request.type !== 'undefined' ) {
      type = request.type;
      delete request.type;
    }

    return wpAjax( 'get_'+type, request, success, error );
  },


  /**
   *
   * save( [type,] { data } )
   * 
   * @param {string} type   Content type: post, user
   * @param {object} data   Data
   * 
   * @todo taxonomy, comments..
   *
   */

  save: function() {

    var type = 'post'; // Default

    // Create array of arguments
    var args = Array.prototype.slice.call(arguments, 0);

    if ( args.length === 0 )
      return wpAjax( 'fail' );

    if ( typeof args[0] === 'string' ) {
      type = args[0];
      args.shift();
    }

    request = args[0] || {};
    success = args[1] || {};
    error = args[2] || {};

    if ( typeof request.type !== 'undefined' ) {
      type = request.type;
      delete request.type;
    }

    return wpAjax( 'save_'+type, request, success, error );
  },


  /**
   *
   * login, logout, go, reload
   *
   * @todo register
   *
   */


  login : function( request, success, error ) {

    return wpAjax( 'login', request, success, error );
  },

  logout : function( redirect ) {

    var logout = wp.url.logout;

    if ( typeof redirect === 'undefined' ) redirect = wp.current.request;

    logout += '&redirect_to='+wp.url.site+redirect;
    location.href = logout;
  },

  go : function( route ) {
    location.href = wp.url.site+route;
  },

  reload : function() {
    location.href = wp.current.url;
  }

});

