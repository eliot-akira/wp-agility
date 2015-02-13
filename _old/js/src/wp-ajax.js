/* global wp.current.nonce, wp.url.ajax */

var $ = require('jquery');

function wpAjax( action, request, success, error ) {

  var req = {
    type: 'POST',
    url: wp.url.ajax, // AJAX URL from server-side
    data: {
      action: 'agility_'+action, // Prefix
      nonce: wp.current.nonce, // Nonce from server-side
      data: request // The real data
    },
    beforeSend: '',
    success: '',
    error: ''
  };

  // Based on wp-util.js
  return $.Deferred( function( deferred ) {

    // Transfer success/error callbacks.
    if ( success )
      deferred.done( success );
    if ( error )
      deferred.fail( error );

    // Option to force return fail before Ajax request
    if ( action === 'fail' )
      deferred.rejectWith( this, arguments );

    // Use with PHP's wp_send_json_success() and wp_send_json_error()
    $.ajax( req ).done( function( response ) {

      // Treat a response of `1` as successful for backwards compatibility
      if ( response === '1' || response === 1 )
        response = { success: true };

      if ( typeof response.data === 'undefined' )
        response.data = 'empty';

      if ( typeof response === 'object' && ( typeof response.success !== 'undefined' ) )
        deferred[ response.success ? 'resolveWith' : 'rejectWith' ]( this, [response.data] );
      else{
        deferred.rejectWith( this, arguments ); // [response.data]
      }
    }).fail( function() {
      deferred.rejectWith( this, arguments );
    });
  }).promise();

}

module.exports = wpAjax;


/**
 * Shim for "fixing" IE's lack of support (IE < 9) for applying slice
 * on host objects like NamedNodeMap, NodeList, and HTMLCollection
 * (technically, since host objects have been implementation-dependent,
 * at least before ES6, IE hasn't needed to work this way).
 * Also works on strings, fixes IE < 9 to allow an explicit undefined
 * for the 2nd argument (as in Firefox), and prevents errors when
 * called on other DOM objects.

(function () {
  'use strict';
  var _slice = Array.prototype.slice;

  try {
    // Can't be used with DOM elements in IE < 9
    _slice.call(document.documentElement);
  } catch (e) { // Fails in IE < 9
    // This will work for genuine arrays, array-like objects, 
    // NamedNodeMap (attributes, entities, notations),
    // NodeList (e.g., getElementsByTagName), HTMLCollection (e.g., childNodes),
    // and will not fail on other DOM objects (as do DOM elements in IE < 9)
    Array.prototype.slice = function(begin, end) {
      // IE < 9 gets unhappy with an undefined end argument
      end = (typeof end !== 'undefined') ? end : this.length;

      // For native Array objects, we use the native slice function
      if (Object.prototype.toString.call(this) === '[object Array]'){
        return _slice.call(this, begin, end); 
      }

      // For array like object we handle it ourselves.
      var i, cloned = [],
        size, len = this.length;

      // Handle negative value for "begin"
      var start = begin || 0;
      start = (start >= 0) ? start: len + start;

      // Handle negative value for "end"
      var upTo = (end) ? end : len;
      if (end < 0) {
        upTo = len + end;
      }

      // Actual expected size of the slice
      size = upTo - start;

      if (size > 0) {
        cloned = new Array(size);
        if (this.charAt) {
          for (i = 0; i < size; i++) {
            cloned[i] = this.charAt(start + i);
          }
        } else {
          for (i = 0; i < size; i++) {
            cloned[i] = this[start + i];
          }
        }
      }

      return cloned;
    };
  }
}());
 */

