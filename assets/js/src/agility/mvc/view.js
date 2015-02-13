
/*---------------------------------------------
 *
 * View API
 *
 * view.$
 * render
 * bindings
 * sync
 * stylize
 * $bound
 *
 */

var ROOT_SELECTOR = '&'; // Also in mvc/view.js

module.exports = {
    
  // Defaults
  format: '<div/>',
  style: '',
  
  // Shortcut to view.$root or view.$root.find(), depending on selector presence
  $: function(selector) {
    return (!selector || selector === ROOT_SELECTOR) ? this.view.$root : this.view.$root.find(selector);
  },
  

  // Render $root
  // Only function to access $root directly other than $()
  render: function(){

    // Without format there is no view
    if (this.view.format.length === 0) {
      throw "agility.js: empty format in view.render()";
    }                

    if ( this.view.$root instanceof jQuery && this._template ) {

      // Template from DOM - don't overwrite it

    } else if ( this.view.$root.size() === 0 ) {

      this.view.$root = $(this.view.format);

    } else {

      // don't overwrite $root as this would reset its presence in the DOM
      // and all events already bound

      this.view.$root.html( $(this.view.format).html() );
    }

    // Ensure we have a valid (non-empty) $root
    if ( !(this.view.$root instanceof jQuery) && this.view.$root.size() === 0 ) {
      throw 'agility.js: could not generate html from format';
    }

    this.$view = this.view.$root;
    this.$ = this.view.$;
    return this;
  }, // render



  // Parse data-bind string of the type '[attribute][=] variable[, [attribute][=] variable ]...'
  // If the variable is not an attribute, it must occur by itself
  //   all pairs in the list are assumed to be attributes
  // Returns { key:'model key', attr: [ {attr : 'attribute', attrVar : 'variable' }... ] }
  _parseBindStr: function(str){
    var obj = {key:null, attr:[]},
        pairs = str.split(','),
        // regex = /([a-zA-Z0-9_\-]+)(?:[\s=]+([a-zA-Z0-9_\-]+))?/,
        // @pull #91 Add support for nested models: key.prop
        regex = /([a-zA-Z0-9_\-\.]+)(?:[\s=]+([a-zA-Z0-9_\-]+))?/,
        keyAssigned = false,
        matched;
    
    if (pairs.length > 0) {
      for (var i = 0; i < pairs.length; i++) {
        matched = pairs[i].match(regex);
        // [ "attribute variable", "attribute", "variable" ]
        // or [ "attribute=variable", "attribute", "variable" ]
        // or
        // [ "variable", "variable", undefined ]
        // in some IE it will be [ "variable", "variable", "" ]
        // or
        // null
        if (matched) {
          if (typeof(matched[2]) === "undefined" || matched[2] === "") {
            if (keyAssigned) {
              throw new Error("You may specify only one key (" + 
                keyAssigned + " has already been specified in data-bind=" + 
                str + ")");
            } else {
              keyAssigned = matched[1];
              obj.key = matched[1];
            }
          } else {
            obj.attr.push({attr: matched[1], attrVar: matched[2]});
          }
        } // if (matched)
      } // for (pairs.length)
    } // if (pairs.length > 0)
    
    return obj;
  },


  /*---------------------------------------------
   *
   * Bindings
   *
   *  Apply two-way (DOM <--> Model) bindings to elements with 'data-bind' attributes
   *
   * @todo Separate to its own module
   *
   */

  bindings: function(){
    var self = this;
    var $rootNode = this.view.$().filter('[data-bind]');
    var $childNodes = this.view.$('[data-bind]');
    var createAttributePairClosure = function(bindData, node, i) {
      var attrPair = bindData.attr[i]; // capture the attribute pair in closure
      return function() {
        node.attr(attrPair.attr, self.model.get(attrPair.attrVar));
      };
    };

    $rootNode.add($childNodes).each(function(){

      var $node = $(this);
      var bindData = self.view._parseBindStr( $node.data('bind') );
      var required = $node.data('required');

      var bindAttributesOneWay = function() {
        // 1-way attribute binding
        if (bindData.attr) {
          for (var i = 0; i < bindData.attr.length; i++) {
            self.bind('_change:'+bindData.attr[i].attrVar,
              createAttributePairClosure(bindData, $node, i));
          } // for (bindData.attr)
        } // if (bindData.attr)
      }; // bindAttributesOneWay()
      
      // <input type="checkbox">: 2-way binding
      if ($node.is('input:checkbox')) {
        // Model --> DOM
        self.bind('_change:'+bindData.key, function(){
          $node.prop("checked", self.model.get(bindData.key)); // this won't fire a DOM 'change' event, saving us from an infinite event loop (Model <--> DOM)
        });            
        // DOM --> Model
        $node.change(function(){
          var obj = {};
          obj[bindData.key] = $(this).prop("checked");
          self.model.set(obj); // not silent as user might be listening to change events
        });
        // 1-way attribute binding
        bindAttributesOneWay();
      }
      
      // <select>: 2-way binding
      else if ($node.is('select')) {
        // Model --> DOM
        self.bind('_change:'+bindData.key, function(){
          var nodeName = $node.attr('name');
          var modelValue = self.model.get(bindData.key);
          $node.val(modelValue);
        });            
        // DOM --> Model
        $node.change(function(){
          var obj = {};
          obj[bindData.key] = $node.val();
          self.model.set(obj); // not silent as user might be listening to change events
        });
        // 1-way attribute binding
        bindAttributesOneWay();
      }
      
      // <input type="radio">: 2-way binding
      else if ($node.is('input:radio')) {

        // Model --> DOM
        self.bind('_change:'+bindData.key, function(){
          var nodeName = $node.attr('name');
          var modelValue = self.model.get(bindData.key);

            // $node.siblings('input[name="'+nodeName+'"]').filter('[value="'+modelValue+'"]').prop("checked", true);

            // @pull #110 Binding for radio buttons
            // They're not always siblings, so start from $root
            self.view.$root.find('input[name="'+nodeName+'"]')
              .filter('[value="'+modelValue+'"]')
              .prop("checked", true); // this won't fire a DOM 'change' event, saving us from an infinite event loop (Model <--> DOM)
        });            

        // DOM --> Model
        $node.change(function(){
          if (!$node.prop("checked")) return; // only handles check=true events
          var obj = {};
          obj[bindData.key] = $node.val();
          self.model.set(obj); // not silent as user might be listening to change events
        });
        // 1-way attribute binding
        bindAttributesOneWay();
      }
      
      // <input type="search"> (model is updated after every keypress event)
      else if ($node.is('input[type="search"]')) {

        // Model --> DOM
        self.bind('_change:'+bindData.key, function(){
          $node.val(self.model.get(bindData.key)); // this won't fire a DOM 'change' event, saving us from an infinite event loop (Model <--> DOM)
        });

        // Model <-- DOM
        $node.keypress(function(){
          // Without timeout $node.val() misses the last entered character
          setTimeout(function(){
            var obj = {};
            obj[bindData.key] = $node.val();
            self.model.set(obj); // not silent as user might be listening to change events
          }, 50);
        });
        // 1-way attribute binding
        bindAttributesOneWay();
      }

      // <input type="text">, <input>, and <textarea>: 2-way binding
      else if ($node.is('input:text, input[type!="search"], textarea')) {
        // Model --> DOM
        self.bind('_change:'+bindData.key, function(){
          $node.val(self.model.get(bindData.key)); // this won't fire a DOM 'change' event, saving us from an infinite event loop (Model <--> DOM)
        });            
        // Model <-- DOM
        $node.change(function(){
          var obj = {};
          obj[bindData.key] = $(this).val();
          self.model.set(obj); // not silent as user might be listening to change events
        });
        // 1-way attribute binding
        bindAttributesOneWay();
      }
      
      // all other <tag>s: 1-way binding (Model -> DOM)
      else {
        if (bindData.key) {
          self.bind('_change:'+bindData.key, function(){
            var key = self.model.get(bindData.key);
            if (key || key===0) {
              $node.text(self.model.get(bindData.key).toString());
            } else {
              $node.text('');
            }
          });
        }
        bindAttributesOneWay();
      }

      // Store binding map for later reference

      self.$node[ bindData.key ] = $node;
      self.key[ $node ] = bindData.key; // Unnecessary?

      if ( typeof required !== 'undefined' ) {
        self.required[ bindData.key ] = required;
      }

    }); // nodes.each()
    return this;
  }, // bindings()
  

  // Triggers _change and _change:* events so that view is updated as per view.bindings()
  sync: function(){
    var self = this;
    // Trigger change events so that view is updated according to model
    this.model.each(function(key, val){
      self.trigger('_change:'+key);
    });
    if (this.model.size() > 0) {
      this.trigger('_change');
    }
    return this;
  },


  // Applies style dynamically
  stylize: function(){
    var objClass,
        regex = new RegExp(ROOT_SELECTOR, 'g');
    if (this.view.style.length === 0 || this.view.$().size() === 0) {
      return;
    }
    // Own style
    // Object gets own class name ".agility_123", and <head> gets a corresponding <style>
    if (this.view.hasOwnProperty('style')) {
      objClass = 'agility_' + this._id;
      var styleStr = this.view.style.replace(regex, '.'+objClass);
      // $('head', window.document).append('<style type="text/css">'+styleStr+'</style>');

      // @pull #95 Add ID so later we can remove generated style
      // upon destruction of objects
      $('head', window.document).append('<style id="'+ objClass +'" type="text/css">'+
        styleStr+'</style>');
      this.view.$().addClass(objClass);
    }
    // Inherited style
    // Object inherits CSS class name from first ancestor to have own view.style
    else {
      // Returns id of first ancestor to have 'own' view.style
      var ancestorWithStyle = function(object) {
        while (object !== null) {
          object = Object.getPrototypeOf(object);
          if (object.view.hasOwnProperty('style'))
            return object._id;
        }
        return undefined;
      }; // ancestorWithStyle

      var ancestorId = ancestorWithStyle(this);
      objClass = 'agility_' + ancestorId;
      this.view.$().addClass(objClass);
    }
    return this;
  },


  /*---------------------------------------------
   *
   * Extended
   *
   */

  // Return element(s) bound to a model property

  // @todo Provide a reverse function from elements -> model property?

  $bound: function( key ) {

    var self = this;

    return this.view.$('[data-bind]').filter(function(){

      var bindData = self.view._parseBindStr( $(this).data('bind') );

      // What about multiple or nested bindings?
      return ( bindData.key == key );
    });
  }

};
