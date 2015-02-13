
/*---------------------------------------------
 *
 * Validate model properties based on object.required
 *
 */

module.exports = {

  /*---------------------------------------------
   *
   * model.invalid()
   * 
   * @return An array of invalid keys
   *
   */

  invalid : function() {

    var invalid = [];

    // Check each required key

    for (var key in this.required) {
      if ( ! this.model.isValidKey( key ) )
        invalid.push(key);
    }

    return invalid;
  },

  /*---------------------------------------------
   *
   * isValid
   *
   * isValid() Validate whole model
   * isValid( key ) Validate key
   *
   * @return boolean
   *
   */
  

  isValid : function( key ) {

    if (typeof key === 'undefined') {

      // Check the whole model
      return ( this.model.invalid().length === 0);

    } else return this.model.isValidKey( key );

  },

  isValidKey : function( key ) {

    if ( typeof this.required[key] === 'undefined' ) {
      return true;
    }

    var val = this.model.get( key ),
        requireType = this.required[ key ];

    if ( requireType === true ) {

      return ! $.isEmpty( val );

    } else if ( requireType === 'email' ) {

      return $.isEmail( val );

    } else {

      // Other types of required: boolean, checked, custom condition..?

    }

    return true; // Passed all requirements
  }

};

$.isEmpty = function( mixed_var ) {

  // Empty: null, undefined, '', [], {}
  // Not empty: 0, true, false
  // What about jQuery object?

  var undef, key, i, len;
  var emptyValues = [undef, null, ''];

  for (i = 0, len = emptyValues.length; i < len; i++) {
    if (mixed_var === emptyValues[i]) {
      return true;
    }
  }

  if (typeof mixed_var === 'object') {
    for (key in mixed_var) {
      // Inherited properties count?
      // if (mixed_var.hasOwnProperty(key)) {
        return false;
      // }
    }
    return true;
  }

  return false;
};


// Validate e-mail
$.isEmail = function( email ) {

  if ( $.isEmpty( email ) ) return false;

  var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
  return regex.test(email);
};
