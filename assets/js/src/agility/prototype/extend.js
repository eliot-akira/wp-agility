
/*---------------------------------------------
 *
 * Extended shortcuts
 *
 */

var $ = require('jquery');

module.exports = {

  replace: function( obj, selector ){
    if ( typeof selector === 'string' ) {
      this.view.$(selector).html('');
    }
    this.empty()._container.append.apply(this, arguments);
    return this; // for chainable calls
  },

  // Return nth child object
  child: function(n){
    var i = 0;
    n = n || 0;

    for (var j in this._container.children) {
      if ( this._container.children.hasOwnProperty(j) ) {
        if ( i == n )
          return this._container.children[j];
        else if ( i > n )
          return false;

        i++; // Continue searching
      }
    }
    return false;
  },

  // Return all child objects
  children: function(){
    return this._container.children; // { id: child, .. }
  },

  // Replace children models - append if there's more, destroy if less
  load: function( proto, models, selector ) {

    var self = this,
        maxModels = models.length,
        maxChildren = this.size();

    $.each(models, function(index, model) {
      if ( self.child(index) ) {
        self.child(index).model.set( model );
      } else {
        // $$ not defined yet?
        self.append( $$( proto, model ), selector );
      }
    });

    if (maxChildren > maxModels) {
      for (var i = maxModels; i < maxChildren; i++) {
        // Child's index stays the same, since each one is destroyed
        self.child(maxModels).destroy();
      }
    }

    return this;
  }

};
