
/*---------------------------------------------
 *
 * wp.action
 * 
 * - get, save
 * - login, logout, go, reload
 *
 */

var $ = require('jquery');
var wpAjax = require('./ajax.js');

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

    // Default: get_posts
    var type = 'posts';

    // For other content types: get_user, get_taxonomy, ...
    var nonPostTypes = [ 'user', 'users', 'taxonomy', 'field', 'fields' ];

    // Create array of arguments
    var args = Array.prototype.slice.call(arguments, 0);

    if ( args.length === 0 )
      throw "wp.action.get needs an object";

    if ( typeof args[0] === 'string' ) {
      type = args[0];
      args.shift();
    }

    request = args[0] || {};
    success = args[1] || {};
    error = args[2] || {};

    if ( typeof request.type !== 'undefined' && $.inArray(request.type, nonPostTypes) > -1 ) {
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

    // For post, page, custom post type: save_post
    var type = 'post';

    // For other content types: save_user, save_taxonomy, ...
    var nonPostTypes = [ 'user', 'users', 'taxonomy', 'field', 'fields' ];

    // Create array of arguments
    var args = Array.prototype.slice.call(arguments, 0);

    if ( args.length === 0 )
      throw "wp.action.save needs an object";

    if ( typeof args[0] === 'string' ) {
      type = args[0];
      args.shift();
    }

    request = args[0] || {};
    success = args[1] || {};
    error = args[2] || {};

    if ( typeof request.type !== 'undefined' && $.inArray(request.type, nonPostTypes) > -1 ) {
      type = request.type;
      delete request.type;
    } else if ( type == 'post' && $.isArray( request ) ) {
      type = 'posts';
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
  },

  /**
   *
   * email
   * 
   */

  mail : function( mailObj ) {

    // Default: get_posts
    var type = 'mail';

    // Create array of arguments
    var args = Array.prototype.slice.call(arguments, 0);

    if ( args.length === 0 )
      throw "wp.action.mail needs an object";

    request = args[0] || {};
    success = args[1] || {};
    error = args[2] || {};

    return wpAjax( 'send_email', request, success, error );
  }


});

