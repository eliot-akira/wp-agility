(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

window.$$ = require('./agility/index.js');
window.wp = window.wp || {};
window.wp.action = require('./wp/action.js');

},{"./agility/index.js":2,"./wp/action.js":18}],2:[function(require,module,exports){
/**
 * 
 * Agility.js - v0.2.2
 * 
 * Forked and extended from: Agility.js 0.1.3 by Artur B. Adib - http://agilityjs.com
 * 
 * Separated into CommonJS modules
 * 
 * Merged pull requests
 * - Support nested model properties
 * - Efficient handling of style
 * 
 * Extended features
 * - Only render changed model properties
 * - Form helpers
 * 
 */

/*jslint loopfunc: true */

(function(window, undefined){

  if (!window.jQuery) {
    throw "agility.js: jQuery not found";
  }
  
  // Local references
  var document = window.document,
      location = window.location,
      $        = jQuery,

      agility, // Main agility object builder

      util             = require('./util/util'),         // Internal utility functions
      shim             = require('./util/object-shim'),  // Object.create and getPrototypeOf
      timed            = require('./util/timed'),        // Timed functions
      defaultPrototype = require('./prototype/index'),   // Default object prototype
      idCounter        = 0; // Global object counter


  /*---------------------------------------------
   *
   * Main object constructor
   *
   */
  
  agility = function() {
    
    // Real array of arguments
    var args = Array.prototype.slice.call(arguments, 0),
    
    // Object to be returned by builder
    object = {},

    $root, // Used when template is from DOM

    prototype = defaultPrototype;


    /*---------------------------------------------
     *
     * Create object from prototype
     *
     */

    // If first arg is object, use it as prototype
    if (typeof args[0] === "object" && util.isAgility(args[0])) {

      prototype = args[0];    
      args.shift(); // remaining args now work as though object wasn't specified

    }

    // Build object from prototype as well as the individual prototype parts
    // This enables differential inheritance at the sub-object level, e.g. object.view.format
    object = Object.create(prototype);
    object.model = Object.create(prototype.model);
    object.view = Object.create(prototype.view);
    object.controller = Object.create(prototype.controller);
    object._container = Object.create(prototype._container);
    object._events = Object.create(prototype._events);


    // Instance properties, i.e. not inherited
    object._id = idCounter++;
    object._parent = null;
    object._events.data = {}; // event bindings will happen below
    object._container.children = {};
    object.view.$root = $(); // empty jQuery object


    // Clone own properties
    // i.e. properties that are inherited by direct copy instead of by prototype chain
    // This prevents children from altering parents models
    object.model._data = prototype.model._data ? $.extend(true, {}, prototype.model._data) : {};
    object._data = prototype._data ? $.extend(true, {}, prototype._data) : {};


    /*---------------------------------------------
     *
     * Extend model, view, controller based on given arguments
     *
     */

    // Just the default prototype {}
    if (args.length === 0) {
    }

    // ( view.format [,{ method:function, ... }] )
    else if ( typeof args[0] === 'string' ) {

      // Get template from '#id'
      if ( args[0][0] === '#' ) {

        $root = $(args[0]);

        // Template from script tag
        if ( $root.prop('tagName').toLowerCase() === 'script' ) {

          object.view.format = $root.html();

        // Template from existing DOM
        } else {

          // Include container itself
          object.view.format = $root.outerHTML();
          // Assign root to existing DOM element
          object.view.$root = $root;
          object._template = true;
        }

      }
      // or '<template>' string
      else object.view.format = args[0];

      // Controller from object
      if ( args.length > 1 && typeof args[1] === 'object') {
        $.extend(object.controller, args[1]);
        util.extendController(object);
      }

    } // single view arg

    // Prototype differential from single {model,view,controller} object
    else if (args.length === 1 && typeof args[0] === 'object' && (args[0].model || args[0].view) ) {

      for (var prop in args[0]) {

        if (prop === 'model') {

          $.extend(object.model._data, args[0].model);

        } else if (prop === 'view') {

          if (typeof args[0].view === 'string') {

            // Get template from '#id'
            if ( args[0].view[0] === '#' ) {

              $root = $(args[0].view);

              object.view.format = $root.html();

              // Template from script tag
              if ( $root.prop('tagName').toLowerCase() === 'script' ) {

                object.view.format = $root.html();

              // Template from existing DOM
              } else {

                // Include container itself
                object.view.format = $root.outerHTML();
                // Assign root to existing DOM element
                object.view.$root = $root;
                object._template = true;
              }

            }
            // or '<template>' string
            else object.view.format = args[0].view;

          } else {

            $.extend(object.view, args[0].view); // view:{format:{},style:{}}
          }

        }
        else if ( prop === 'controller' || prop === 'events' ) {
          $.extend(object.controller, args[0][prop]);
          util.extendController(object);
        }

        // User-defined methods
        else {
          object[prop] = args[0][prop];
        }
      }
    } // single {model, view, controller} arg

    // Prototype differential from separate {model}, {view}, {controller} arguments
    else {
      
      // Model object
      if (typeof args[0] === 'object') {
        $.extend(object.model._data, args[0]);
      }
      else if (args[0]) {
        throw "agility.js: unknown argument type (model)";
      }

      // View format from shorthand string (..., '<div>whatever</div>', ...)
      if (typeof args[1] === 'string') {

        // @extend Get template from ID
        if ( args[1][0] === '#' ) {

          // object.view.format = $(args[1]).html();

          $root = $(args[1]);

          // Template from script tag
          if ( $root.prop('tagName').toLowerCase() === 'script' ) {

            object.view.format = $root.html();

          // Template from existing DOM
          } else {

            // Include container itself
            object.view.format = $root.outerHTML();
            // Assign root to existing DOM element
            object.view.$root = $root;
            object._template = true;
          }
        }
        else
          object.view.format = args[1]; // extend view with .format
      }  
      // View from object (..., {format:'<div>whatever</div>'}, ...)
      else if (typeof args[1] === 'object') {
        $.extend(object.view, args[1]);
      }
      else if (args[1]) {
        throw "agility.js: unknown argument type (view)";
      }
      
      // View style from shorthand string (..., ..., 'p {color:red}', ...)

      if (typeof args[2] === 'string') {
        object.view.style = args[2];
        args.splice(2, 1); // so that controller code below works
      }

      // Controller from object (..., ..., {method:function(){}})
      if (typeof args[2] === 'object') {
        $.extend(object.controller, args[2]);
        util.extendController(object);
      }
      else if (args[2]) {
        throw "agility.js: unknown argument type (controller)";
      }
      
    } // separate ({model}, {view}, {controller}) args


    /*---------------------------------------------
     *
     * Launch sequence: Bindings, initializations, etc
     *
     */
    
    // Save model's initial state (so it can be .reset() later)
    object.model._initData = $.extend({}, object.model._data);

    // object.* will have their 'this' === object. This should come before call to object.* below.
    util.proxyAll(object, object);

  
    // Initialize $root, needed for DOM events binding below
    object.view.render();
  

    // Bind all controllers to their events

    var bindEvent = function(ev, handler){
      if (typeof handler === 'function') {
        object.bind(ev, handler);
      }
    };

    for (var eventStr in object.controller) {
      var events = eventStr.split(';');
      var handler = object.controller[eventStr];
      $.each(events, function(i, ev){
        ev = $.trim(ev);
        bindEvent(ev, handler);
      });
    }

    // Auto-triggers create event
    object.trigger('create');    
    
    return object;
    
  }; // agility



  /*---------------------------------------------
   *
   * Global properties
   *
   */

  
  // $$.document is a special Agility object, whose view is attached to <body>
  // This object is the main entry point for all DOM operations
  agility.document = agility({
    _document : true,
    view: {
      $: function(selector){ return selector ? $(selector, 'body') : $('body'); }
    },
    controller: {
      // Override default controller (don't render, don't stylize, etc)
      _create: function(){}
    }
  });

  // Shortcut to prototype for plugins
  agility.fn = defaultPrototype;

  // Namespace to declare reusable Agility objects
  // Use: app.append( $$.module.something ) or $$( $$.module.something, {m,v,c} )
  agility.module = {};

  // isAgility test
  agility.isAgility = function(obj) {
    if (typeof obj !== 'object') return false;
    return util.isAgility(obj);
  };


  /*---------------------------------------------
   *
   * Export it
   *
   */

  // AMD, CommonJS, then global
  if (typeof define === 'function' && define.amd) {
    // @todo Is this correct?
    define([], function(){
        return agility;
    });
  } else if (typeof exports === 'object') {
      module.exports = agility;
  } else {
      window.$$ = agility;
  }

})(window);

},{"./prototype/index":13,"./util/object-shim":15,"./util/timed":16,"./util/util":17}],3:[function(require,module,exports){

/*---------------------------------------------
 *
 * Controller
 *
 *  Default controllers, i.e. event handlers. Event handlers that start
 *  with '_' are of internal use only, and take precedence over any other
 *  handler without that prefix. See: trigger()
 *
 */

module.exports = {

  // Triggered after self creation
  _create: function(event){
    this.view.stylize();
    this.view.bindings(); // Model-View bindings
    this.view.sync(); // syncs View with Model
  },

  // Triggered upon removing self
  _destroy: function(event){

    // @pull #95 Remove generated style upon destruction of objects
    // @extend Only if using style attribute

    if (this.view.style) {
      var objClass = 'agility_' + this._id;
      $('head #'+objClass, window.document).remove();
    }

    // destroy any appended agility objects
    this._container.empty();

    // destroy self
    this.view.$().remove();
  },

  // Triggered after child obj is appended to container
  _append: function(event, obj, selector){
    this.view.$(selector).append(obj.view.$());
  },

  // Triggered after child obj is prepended to container
  _prepend: function(event, obj, selector){
    this.view.$(selector).prepend(obj.view.$());
  },

  // Triggered after child obj is inserted in the container
  _before: function(event, obj, selector){
    if (!selector) throw 'agility.js: _before needs a selector';
    this.view.$(selector).before(obj.view.$());
  },

  // Triggered after child obj is inserted in the container
  _after: function(event, obj, selector){
    if (!selector) throw 'agility.js: _after needs a selector';
    this.view.$(selector).after(obj.view.$());
  },

  // Triggered after a child obj is removed from container (or self-removed)
  _remove: function(event, id){        
  },

  // Triggered after model is changed
  '_change': function(event){
  }
  
};

},{}],4:[function(require,module,exports){
/*---------------------------------------------
 *
 * Get
 *
 */

module.exports = function get( arg ) {

  // Get whole model
  if (arg === undefined) {
    return this.model._data;
  }

  // Get attribute
  // @pull #91 Add support for nested models: parent.child
  if (typeof arg === 'string') {
    var paths = arg.split('.');
    var value = this.model._data[paths[0]];
    //check for nested objects
    if ($.isPlainObject(value)){
      for (var i = 1; i < paths.length; i++){
        if ($.isPlainObject(value) && value[paths[i]]){
          value = value[paths[i]];
        } else {
          value = value[paths.splice(i).join('.')];
        }
      }
    } else {
      //direct key access
      value = this.model._data[arg];
    }
    return value;
  }

  throw 'agility.js: unknown argument for getter';
};

},{}],5:[function(require,module,exports){
/*---------------------------------------------
 *
 * Set: set model attributes and trigger change events
 * 
 * @todo Performance considerations
 *
 */

module.exports = function set( arg, params, third ) {

  var self = this;
  var modified = []; // list of modified model attributes
  var previous = {}; // list of previous values

  // Set individual model property: model.set( prop, value )
  if ( typeof arg === 'string' && params ) {
    arg = { arg: params };
    params = third || {};
  }

  if ( typeof arg === 'object' ) {

    var _clone = {};

    if (params && params.reset) {
      _clone = this.model._data; // hold on to data for change events
      this.model._data = $.extend({}, arg); // erases previous model attributes without pointing to object
    }
    else {

      // @extend Compare and only trigger change event for modified keys
      _clone = $.extend({}, this.model._data);

      // @pull #91 Add support for nested models
      // Iterate through properties and find nested declarations

      for (var prop in arg){
        if (prop.indexOf('.') > -1){
          var path = prop.split('.');
          var current_node = this.model._data[path[0]];
          if (!current_node){
            current_node = this.model._data[path[0]] = {};
          }
          var next_node;
          for (var i = 1; i < path.length - 1; i++){
            next_node = current_node[path[i]];
            if ($.isPlainObject(next_node)){
             current_node = next_node;
            } else {
             current_node[path[i]] = {};
             current_node = current_node[path[i]];
            }
          }
          var last_property = path[path.length - 1];
         if ($.isPlainObject(arg[key]) && $.isPlainObject(current_node[last_property])){
           //if we're assigning objects, extend rather than replace
           $.extend(current_node[last_property], arg[prop]);
          } else {
           current_node[last_property] = arg[prop];
          }
          
          modified.push(prop);
          previous[prop] = _clone[prop];
          delete _clone[ prop ]; // no need to fire change twice
          delete arg[prop];
        }
      }

      $.extend(this.model._data, arg); // default is extend
    }

    // Given object

    for (var key in arg) {
      // Check if changed
      if (this.model._data[key] !== _clone[key] ) {
        modified.push(key);
        previous[key] = _clone[ key ];
      }
      delete _clone[ key ]; // no need to fire change twice
    }

    // Previous object

    for (key in _clone) {
      // Check if changed
      if (this.model._data[key] !== _clone[key] ) {
        modified.push(key);
        previous[key] = _clone[ key ];
      }
    }

  } else {

    // Not an object
    throw "agility.js: unknown argument type in model.set()";
  }

  // Tigger change events

  if (params && params.silent===true) return this; // do not fire events

  // @extend Pass array of modified model keys

  // $().trigger parses the second parameter as separate arguments,
  // so we put it in an array

  this.trigger('change', [modified, previous]);

  $.each(modified, function(index, key){
    self.trigger('change:'+key, previous[key]);
  });

  return this; // for chainable calls

};

},{}],6:[function(require,module,exports){

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

},{}],7:[function(require,module,exports){
(function (global){

/*---------------------------------------------
 *
 * Model API
 *
 * get
 * set
 * reset
 * size
 * each
 * 
 * invalid
 * isValid
 * isValidKey
 *
 */

var $ = (typeof window !== "undefined" ? window.jQuery : typeof global !== "undefined" ? global.jQuery : null),
    util = require('../util/util'),
    modelValidate = require('./model-validate'),
    model = {

      get: require('./model-get'),
      set: require('./model-set'),

      // Resetter (to initial model upon object initialization)
      reset: function(){
        this.model.set(this.model._initData, {reset:true});
        return this; // for chainable calls
      },
      
      // Number of model properties
      size: function(){
        return util.size(this.model._data);
      },
      
      // Convenience function - loops over each model property
      each: function(fn){
        // Proxy this object
        $.each(this.model._data, $.proxy(fn,this) );
        return this; // for chainable calls
      }

    };

module.exports = $.extend( model, modelValidate );

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../util/util":17,"./model-get":4,"./model-set":5,"./model-validate":6}],8:[function(require,module,exports){

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

},{}],9:[function(require,module,exports){
(function (global){

/*---------------------------------------------
 *
 * _container
 *
 * API and related auxiliary functions for storing child Agility objects.
 * Not all methods are exposed. See 'shortcuts' below for exposed methods.
 *
 */

var $ = (typeof window !== "undefined" ? window.jQuery : typeof global !== "undefined" ? global.jQuery : null),
    util = require('../util/util');

module.exports = {

  // Adds child object to container, appends/prepends/etc view, listens for child removal
  _insertObject: function(obj, selector, method){
    var self = this;

    if (!util.isAgility(obj)) {
      throw "agility.js: append argument is not an agility object";
    }

    this._container.children[obj._id] = obj; // children is *not* an array; this is for simpler lookups by global object id
    this.trigger(method, [obj, selector]);
    obj._parent = this;
    // ensures object is removed from container when destroyed:
    obj.bind('destroy', function(event, id){ 
      self._container.remove(id);
    });
    // Trigger event for child to listen to
    obj.trigger('parent:'+method);
    return this;
  },

  append: function(obj, selector) { 
      return this._container._insertObject.call(this, obj, selector, 'append'); 
  },

  prepend: function(obj, selector) { 
      return this._container._insertObject.call(this, obj, selector, 'prepend'); 
  },

  after: function(obj, selector) { 
      return this._container._insertObject.call(this, obj, selector, 'after'); 
  },

  before: function(obj, selector) { 
      return this._container._insertObject.call(this, obj, selector, 'before'); 
  },
  
  // Removes child object from container
  remove: function(id){
    delete this._container.children[id];
    this.trigger('remove', id);
    return this;
  },

  // Iterates over all child objects in container
  each: function(fn){
    $.each(this._container.children, fn);
    return this; // for chainable calls
  },

  // Removes all objects in container
  empty: function(){
    this.each(function(){
      this.destroy();
    });
    return this;
  },
  
  // Number of children
  size: function() {
    return util.size(this._container.children);
  }
  
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../util/util":17}],10:[function(require,module,exports){
(function (global){

/*---------------------------------------------
 *
 * _events API and auxiliary functions for handling events
 *
 */

var $ = (typeof window !== "undefined" ? window.jQuery : typeof global !== "undefined" ? global.jQuery : null),
    ROOT_SELECTOR = '&'; // Also in mvc/view.js

// Reverses the order of events attached to an object
function reverseEvents(obj, eventType){
  var events = $(obj).data('events');
  if (events !== undefined && events[eventType] !== undefined){
    // can't reverse what's not there
    var reversedEvents = [];
    for (var e in events[eventType]){
      if (!events[eventType].hasOwnProperty(e)) continue;
      reversedEvents.unshift(events[eventType][e]);
    }
    events[eventType] = reversedEvents;
  }
} //reverseEvents


module.exports = {

  // Parses event string like:
  //    'event'          : custom event
  //    'event selector' : DOM event using 'selector'
  // Returns { type:'event' [, selector:'selector'] }
  parseEventStr: function(eventStr){
    var eventObj = { type:eventStr }, 
        spacePos = eventStr.search(/\s/);
    // DOM event 'event selector', e.g. 'click button'
    if (spacePos > -1) {
      eventObj.type = eventStr.substr(0, spacePos);
      eventObj.selector = eventStr.substr(spacePos+1);
    } else if ( eventStr === 'click' || eventStr === 'submit' ) {
      // @extend Shortcut for 'click &' and 'submit &'
      eventObj.type = eventStr;
      eventObj.selector = ROOT_SELECTOR;
    }
    return eventObj;
  },

  // Binds eventStr to fn. eventStr is parsed as per parseEventStr()
  bind: function(eventStr, fn){

    var eventObj = this._events.parseEventStr(eventStr);

    // DOM event 'event selector', e.g. 'click button'
    if (eventObj.selector) {

      // Keep click and submit localized
      var fnx = function(event) {
        fn(event);
        return false; // Prevent default & bubbling
        // or just default? if ( ! event.isDefaultPrevented() ) event.preventDefault();
      };

      // Manually override root selector, as jQuery selectors can't select self object
      if (eventObj.selector === ROOT_SELECTOR) {


        if ( eventObj.type === 'click' || eventObj.type === 'submit' ) {
          this.view.$().on(eventObj.type, fnx);
        } else {
          this.view.$().on(eventObj.type, fn);
        }

        // @extend Replace $().bind with $().on
        // this.view.$().bind(eventObj.type, fn);
      }
      else {

        if ( eventObj.type === 'click' || eventObj.type === 'submit' ) {
          this.view.$().on(eventObj.type, eventObj.selector, fnx);
        } else {
          this.view.$().on(eventObj.type, eventObj.selector, fn);
        }

        // @extend Replace $().delegate with $().on
        // this.view.$().delegate(eventObj.selector, eventObj.type, fn);
      }
    }
    // Custom event
    else {

      // @extend Replace $().bind with $().on
      $(this._events.data).on(eventObj.type, fn);
      // $(this._events.data).bind(eventObj.type, fn);
    }
    return this; // for chainable calls
  }, // bind


  // Triggers eventStr. Syntax for eventStr is same as that for bind()
  trigger: function(eventStr, params){
    var eventObj = this._events.parseEventStr(eventStr);
    // DOM event 'event selector', e.g. 'click button'
    if (eventObj.selector) {
      // Manually override root selector, as jQuery selectors can't select self object
      if (eventObj.selector === ROOT_SELECTOR) {
        this.view.$().trigger(eventObj.type, params);
      }
      else {          
        this.view.$().find(eventObj.selector).trigger(eventObj.type, params);
      }
    }
    // Custom event
    else {
      $(this._events.data).trigger('_'+eventObj.type, params);
      // fire 'pre' hooks in reverse attachment order ( last first ) then put them back
      reverseEvents(this._events.data, 'pre:' + eventObj.type);
      $(this._events.data).trigger('pre:' + eventObj.type, params);
      reverseEvents(this._events.data, 'pre:' + eventObj.type);

      $(this._events.data).trigger(eventObj.type, params);

      // Trigger event for parent
      if (this.parent())
        this.parent().trigger((eventObj.type.match(/^child:/) ? '' : 'child:') + eventObj.type, params);
      $(this._events.data).trigger('post:' + eventObj.type, params);
    }
    return this; // for chainable calls
  } // trigger
  
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],11:[function(require,module,exports){
(function (global){

/*---------------------------------------------
 *
 * Extended shortcuts
 *
 */

var $ = (typeof window !== "undefined" ? window.jQuery : typeof global !== "undefined" ? global.jQuery : null);

module.exports = {

  get : function( arg ) {
    this.model.get( arg );
  },

  set : function( arg, params, third ) {
    this.model.set( arg, params, third  );
  },

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

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],12:[function(require,module,exports){
(function (global){

/*---------------------------------------------
 *
 * Form helpers
 *
 */

var $ = (typeof window !== "undefined" ? window.jQuery : typeof global !== "undefined" ? global.jQuery : null);

module.exports = {

  form : {

    // Clear the form
    clear : function() {

      return this.$view.find(':input')
        .not(':button, :submit, :reset, :hidden').removeAttr('checked').removeAttr('selected')
        .not(':checkbox, :radio, select').val('');
    },

    // Validate model, instead of form in the DOM directly
    // @return An array of invalid model properties
    invalid : function() {

      return this.model.invalid();
    }
  }

};


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],13:[function(require,module,exports){
(function (global){

/*---------------------------------------------
 *
 * Construct default object prototype
 *
 */

var $ = (typeof window !== "undefined" ? window.jQuery : typeof global !== "undefined" ? global.jQuery : null),

    defaultPrototype = {

      _agility: true,
      _container: require('./container'),
      _events: require('./events'),

      $node: {}, // Map of model properties -> bound elements
      key: {}, // Map of elements -> bound model properties
      required: {}, // Map of required model properties and require types

      model: require('../mvc/model'),
      view: require('../mvc/view'),
      controller: require('../mvc/controller')

    },

    shortcuts = require('./shortcuts'),
    extend = require('./extend'),
    form = require('./form');

module.exports = $.extend(defaultPrototype, shortcuts, extend, form);

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../mvc/controller":3,"../mvc/model":7,"../mvc/view":8,"./container":9,"./events":10,"./extend":11,"./form":12,"./shortcuts":14}],14:[function(require,module,exports){

/*---------------------------------------------
 *
 * Object shortcuts
 *
 */

module.exports = {

  destroy: function() {
    this.trigger('destroy', this._id); // parent must listen to 'remove' event and handle container removal!
    // can't return this as it might not exist anymore!
  },
  parent: function(){
    return this._parent;
  },
  
  //
  // _container shortcuts
  //
  append: function(){
    this._container.append.apply(this, arguments);
    return this; // for chainable calls
  },
  prepend: function(){
    this._container.prepend.apply(this, arguments);
    return this; // for chainable calls
  },
  after: function(){
    this._container.after.apply(this, arguments);
    return this; // for chainable calls
  },
  before: function(){
    this._container.before.apply(this, arguments);
    return this; // for chainable calls
  },
  remove: function(){
    this._container.remove.apply(this, arguments);
    return this; // for chainable calls
  },
  size: function(){
    return this._container.size.apply(this, arguments);
  },
  each: function(){
    return this._container.each.apply(this, arguments);
  },
  empty: function(){
    return this._container.empty.apply(this, arguments);
  },

  //
  // _events shortcuts
  //
  bind: function(){
    this._events.bind.apply(this, arguments);
    return this; // for chainable calls
  },
  on: function(){ // Alias
    this._events.bind.apply(this, arguments);
    return this; // for chainable calls
  },
  trigger: function(){
    this._events.trigger.apply(this, arguments);
    return this; // for chainable calls
  },

};

},{}],15:[function(require,module,exports){

/*---------------------------------------------
 *
 * Shim for: Object.create and Object.getPrototypeOf
 *
 */


/*jslint proto: true */

// Modified from Douglas Crockford's Object.create()
// The condition below ensures we override other manual implementations
if (!Object.create || Object.create.toString().search(/native code/i)<0) {
  Object.create = function(obj){
    var Aux = function(){};
    $.extend(Aux.prototype, obj); // simply setting Aux.prototype = obj somehow messes with constructor, so getPrototypeOf wouldn't work in IE
    return new Aux();
  };
}

// Modified from John Resig's Object.getPrototypeOf()
// The condition below ensures we override other manual implementations
if (!Object.getPrototypeOf || Object.getPrototypeOf.toString().search(/native code/i)<0) {
  if ( typeof "test".__proto__ === "object" ) {
    Object.getPrototypeOf = function(object){
      return object.__proto__;
    };
  } else {
    Object.getPrototypeOf = function(object){
      // May break if the constructor has been tampered with
      return object.constructor.prototype;
    };
  }
}

},{}],16:[function(require,module,exports){
(function (global){
/*---------------------------------------------
 *
 * Timed functions
 *
 */

var $ = (typeof window !== "undefined" ? window.jQuery : typeof global !== "undefined" ? global.jQuery : null);

var timers = {},
    defaultInterval = 10000;

$.fn.timedClass = function( className, duration ) {

  var $self = $(this);

  return $(this).timedFn(
    function(){ $self.addClass( className ); },
    function(){ $self.removeClass( className ); },
    duration || defaultInterval
  );
};

$.fn.timedText = function( txt, duration ) {

  var $self = $(this);

  return $(this).timedFn(
    function(){ $self.text( txt ); },
    function(){ $self.text(''); },
    duration || defaultInterval
  );
};

$.fn.timedFn = function( id, start, end, duration ) {

  duration = duration || defaultInterval;

  // ID skipped
  if ( typeof id === 'function' ) {

    duration = end || duration;
    end = start;
    start = id;

    new Timer(function(){
      end();
    }, duration );

    return start();

  // If timer ID is set and one is already going, add to the duration
  } else if ( typeof timers[id] !== 'undefined' && ! timers[id].finished ) {

    timers[id].add( duration );

  } else {

    timers[id] = new Timer(function(){
      end();
    }, duration );

    return start();
  }
};


function Timer(callback, time) {
    this.setTimeout(callback, time);
}

Timer.prototype.setTimeout = function(callback, time) {

    var self = this;

    this.finished = false;
    this.callback = callback;
    this.time = time;

    if(this.timer) {
        clearTimeout(this.timer);
    }
    this.timer = setTimeout(function() {
      self.finished = true;
      self.callback();
    }, time);
    this.start = Date.now();
};

Timer.prototype.add = function(time) {
   if(!this.finished) {
       // add time to time left
       time = this.time - (Date.now() - this.start) + time;
       this.setTimeout(this.callback, time);
   }
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],17:[function(require,module,exports){
(function (global){

/*---------------------------------------------
 *
 * util.*
 *
 * isAgility
 * proxyAll
 * reverseEvents
 * size
 * extendController
 *
 * $.outerHTML
 * $.isEmpty
 * 
 */

/*jslint loopfunc: true */

var util = {},
    $ = (typeof window !== "undefined" ? window.jQuery : typeof global !== "undefined" ? global.jQuery : null);

// Checks if provided obj is an agility object
util.isAgility = function(obj){
 return obj._agility === true;
};

// Scans object for functions (depth=2) and proxies their 'this' to dest.
// * To ensure it works with previously proxied objects, we save the original function as 
//   a '._preProxy' method and when available always use that as the proxy source.
// * To skip a given method, create a sub-method called '_noProxy'.
util.proxyAll = function(obj, dest){
  if (!obj || !dest) {
    throw "agility.js: util.proxyAll needs two arguments";
  }
  for (var attr1 in obj) {
    var proxied = obj[attr1];
    // Proxy root methods
    if (typeof obj[attr1] === 'function' ) {

      proxied = obj[attr1]._noProxy ? obj[attr1] : $.proxy(obj[attr1]._preProxy || obj[attr1], dest);
      proxied._preProxy = obj[attr1]._noProxy ? undefined : (obj[attr1]._preProxy || obj[attr1]); // save original
      obj[attr1] = proxied;

    }
    // Proxy sub-methods (model.*, view.*, etc) -- except for jQuery object
    else if (typeof obj[attr1] === 'object' && !(obj[attr1] instanceof jQuery) ) {
      for (var attr2 in obj[attr1]) {
        var proxied2 = obj[attr1][attr2];
        if (typeof obj[attr1][attr2] === 'function') {
          proxied2 = obj[attr1][attr2]._noProxy ? obj[attr1][attr2] : $.proxy(obj[attr1][attr2]._preProxy || obj[attr1][attr2], dest);
          proxied2._preProxy = obj[attr1][attr2]._noProxy ? undefined : (obj[attr1][attr2]._preProxy || obj[attr1][attr2]); // save original
          proxied[attr2] = proxied2;
        }
      } // for attr2
      obj[attr1] = proxied;
    } // if not func
  } // for attr1
}; // proxyAll


// Determines # of attributes of given object (prototype inclusive)
util.size = function(obj){
  var size = 0, key;
  for (key in obj) {
    size++;
  }
  return size;
};

// Find controllers to be extended (with syntax '~'), redefine those to encompass previously defined controllers
// Example:
//   var a = $$({}, '<button>A</button>', {'click &': function(){ alert('A'); }});
//   var b = $$(a, {}, '<button>B</button>', {'~click &': function(){ alert('B'); }});
// Clicking on button B will alert both 'A' and 'B'.
util.extendController = function(object) {
  for (var controllerName in object.controller) {

    // new scope as we need one new function handler per controller
    (function(){
      var matches, extend, eventName,
          previousHandler, currentHandler, newHandler;

      if (typeof object.controller[controllerName] === 'function') {
        matches = controllerName.match(/^(\~)*(.+)/); // 'click button', '~click button', '_create', etc
        extend = matches[1];
        eventName = matches[2];
      
        if (!extend) return; // nothing to do

        // Redefine controller:
        // '~click button' ---> 'click button' = previousHandler + currentHandler
        previousHandler = object.controller[eventName] ? (object.controller[eventName]._preProxy || object.controller[eventName]) : undefined;
        currentHandler = object.controller[controllerName];
        newHandler = function() {
          if (previousHandler) previousHandler.apply(this, arguments);
          if (currentHandler) currentHandler.apply(this, arguments);
        };

        object.controller[eventName] = newHandler;
        delete object.controller[controllerName]; // delete '~click button'
      } // if function
    })();
  } // for controllerName
};

module.exports = util;


/*---------------------------------------------
 *
 * jQuery utility functions
 *
 */

// Get element including wrapping tag
window.jQuery.fn.outerHTML = function(s) {
  if (s) {
    return this.before(s).remove();
  } else {
    var doc = this[0] ? this[0].ownerDocument : document;
    return jQuery('<div>', doc).append(this.eq(0).clone()).html();
  }
};

window.jQuery.isEmpty = function( data ) {

  if(typeof(data) == 'number' || typeof(data) == 'boolean') {
    return false;
  }
  if(typeof(data) == 'undefined' || data === null) {
    return true;
  }
  if(typeof(data.length) != 'undefined') {
    return data.length == 0;
  }

  var count = 0;
  for(var i in data) {
    if(data.hasOwnProperty(i)) {
      count ++;
    }
  }
  return count == 0;
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],18:[function(require,module,exports){
(function (global){

/*---------------------------------------------
 *
 * wp.action
 * 
 * - get, save
 * - login, logout, go, reload
 *
 */

var $ = (typeof window !== "undefined" ? window.jQuery : typeof global !== "undefined" ? global.jQuery : null);
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


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./ajax.js":19}],19:[function(require,module,exports){
(function (global){
/* global wp.current.nonce, wp.url.ajax */

var $ = (typeof window !== "undefined" ? window.jQuery : typeof global !== "undefined" ? global.jQuery : null);

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


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL2xpYi9zeXMvY29uZi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwianMvc3JjL2luZGV4LmpzIiwianMvc3JjL2FnaWxpdHkvaW5kZXguanMiLCJqcy9zcmMvYWdpbGl0eS9tdmMvY29udHJvbGxlci5qcyIsImpzL3NyYy9hZ2lsaXR5L212Yy9tb2RlbC1nZXQuanMiLCJqcy9zcmMvYWdpbGl0eS9tdmMvbW9kZWwtc2V0LmpzIiwianMvc3JjL2FnaWxpdHkvbXZjL21vZGVsLXZhbGlkYXRlLmpzIiwianMvc3JjL2FnaWxpdHkvbXZjL21vZGVsLmpzIiwianMvc3JjL2FnaWxpdHkvbXZjL3ZpZXcuanMiLCJqcy9zcmMvYWdpbGl0eS9wcm90b3R5cGUvY29udGFpbmVyLmpzIiwianMvc3JjL2FnaWxpdHkvcHJvdG90eXBlL2V2ZW50cy5qcyIsImpzL3NyYy9hZ2lsaXR5L3Byb3RvdHlwZS9leHRlbmQuanMiLCJqcy9zcmMvYWdpbGl0eS9wcm90b3R5cGUvZm9ybS5qcyIsImpzL3NyYy9hZ2lsaXR5L3Byb3RvdHlwZS9pbmRleC5qcyIsImpzL3NyYy9hZ2lsaXR5L3Byb3RvdHlwZS9zaG9ydGN1dHMuanMiLCJqcy9zcmMvYWdpbGl0eS91dGlsL29iamVjdC1zaGltLmpzIiwianMvc3JjL2FnaWxpdHkvdXRpbC90aW1lZC5qcyIsImpzL3NyYy9hZ2lsaXR5L3V0aWwvdXRpbC5qcyIsImpzL3NyYy93cC9hY3Rpb24uanMiLCJqcy9zcmMvd3AvYWpheC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUN2SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ2pXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM5RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDaklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM3RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUMvRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDaEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2xLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcbndpbmRvdy4kJCA9IHJlcXVpcmUoJy4vYWdpbGl0eS9pbmRleC5qcycpO1xud2luZG93LndwID0gd2luZG93LndwIHx8IHt9O1xud2luZG93LndwLmFjdGlvbiA9IHJlcXVpcmUoJy4vd3AvYWN0aW9uLmpzJyk7XG4iLCIvKipcbiAqIFxuICogQWdpbGl0eS5qcyAtIHYwLjIuMlxuICogXG4gKiBGb3JrZWQgYW5kIGV4dGVuZGVkIGZyb206IEFnaWxpdHkuanMgMC4xLjMgYnkgQXJ0dXIgQi4gQWRpYiAtIGh0dHA6Ly9hZ2lsaXR5anMuY29tXG4gKiBcbiAqIFNlcGFyYXRlZCBpbnRvIENvbW1vbkpTIG1vZHVsZXNcbiAqIFxuICogTWVyZ2VkIHB1bGwgcmVxdWVzdHNcbiAqIC0gU3VwcG9ydCBuZXN0ZWQgbW9kZWwgcHJvcGVydGllc1xuICogLSBFZmZpY2llbnQgaGFuZGxpbmcgb2Ygc3R5bGVcbiAqIFxuICogRXh0ZW5kZWQgZmVhdHVyZXNcbiAqIC0gT25seSByZW5kZXIgY2hhbmdlZCBtb2RlbCBwcm9wZXJ0aWVzXG4gKiAtIEZvcm0gaGVscGVyc1xuICogXG4gKi9cblxuLypqc2xpbnQgbG9vcGZ1bmM6IHRydWUgKi9cblxuKGZ1bmN0aW9uKHdpbmRvdywgdW5kZWZpbmVkKXtcblxuICBpZiAoIXdpbmRvdy5qUXVlcnkpIHtcbiAgICB0aHJvdyBcImFnaWxpdHkuanM6IGpRdWVyeSBub3QgZm91bmRcIjtcbiAgfVxuICBcbiAgLy8gTG9jYWwgcmVmZXJlbmNlc1xuICB2YXIgZG9jdW1lbnQgPSB3aW5kb3cuZG9jdW1lbnQsXG4gICAgICBsb2NhdGlvbiA9IHdpbmRvdy5sb2NhdGlvbixcbiAgICAgICQgICAgICAgID0galF1ZXJ5LFxuXG4gICAgICBhZ2lsaXR5LCAvLyBNYWluIGFnaWxpdHkgb2JqZWN0IGJ1aWxkZXJcblxuICAgICAgdXRpbCAgICAgICAgICAgICA9IHJlcXVpcmUoJy4vdXRpbC91dGlsJyksICAgICAgICAgLy8gSW50ZXJuYWwgdXRpbGl0eSBmdW5jdGlvbnNcbiAgICAgIHNoaW0gICAgICAgICAgICAgPSByZXF1aXJlKCcuL3V0aWwvb2JqZWN0LXNoaW0nKSwgIC8vIE9iamVjdC5jcmVhdGUgYW5kIGdldFByb3RvdHlwZU9mXG4gICAgICB0aW1lZCAgICAgICAgICAgID0gcmVxdWlyZSgnLi91dGlsL3RpbWVkJyksICAgICAgICAvLyBUaW1lZCBmdW5jdGlvbnNcbiAgICAgIGRlZmF1bHRQcm90b3R5cGUgPSByZXF1aXJlKCcuL3Byb3RvdHlwZS9pbmRleCcpLCAgIC8vIERlZmF1bHQgb2JqZWN0IHByb3RvdHlwZVxuICAgICAgaWRDb3VudGVyICAgICAgICA9IDA7IC8vIEdsb2JhbCBvYmplY3QgY291bnRlclxuXG5cbiAgLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICpcbiAgICogTWFpbiBvYmplY3QgY29uc3RydWN0b3JcbiAgICpcbiAgICovXG4gIFxuICBhZ2lsaXR5ID0gZnVuY3Rpb24oKSB7XG4gICAgXG4gICAgLy8gUmVhbCBhcnJheSBvZiBhcmd1bWVudHNcbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCksXG4gICAgXG4gICAgLy8gT2JqZWN0IHRvIGJlIHJldHVybmVkIGJ5IGJ1aWxkZXJcbiAgICBvYmplY3QgPSB7fSxcblxuICAgICRyb290LCAvLyBVc2VkIHdoZW4gdGVtcGxhdGUgaXMgZnJvbSBET01cblxuICAgIHByb3RvdHlwZSA9IGRlZmF1bHRQcm90b3R5cGU7XG5cblxuICAgIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICpcbiAgICAgKiBDcmVhdGUgb2JqZWN0IGZyb20gcHJvdG90eXBlXG4gICAgICpcbiAgICAgKi9cblxuICAgIC8vIElmIGZpcnN0IGFyZyBpcyBvYmplY3QsIHVzZSBpdCBhcyBwcm90b3R5cGVcbiAgICBpZiAodHlwZW9mIGFyZ3NbMF0gPT09IFwib2JqZWN0XCIgJiYgdXRpbC5pc0FnaWxpdHkoYXJnc1swXSkpIHtcblxuICAgICAgcHJvdG90eXBlID0gYXJnc1swXTsgICAgXG4gICAgICBhcmdzLnNoaWZ0KCk7IC8vIHJlbWFpbmluZyBhcmdzIG5vdyB3b3JrIGFzIHRob3VnaCBvYmplY3Qgd2Fzbid0IHNwZWNpZmllZFxuXG4gICAgfVxuXG4gICAgLy8gQnVpbGQgb2JqZWN0IGZyb20gcHJvdG90eXBlIGFzIHdlbGwgYXMgdGhlIGluZGl2aWR1YWwgcHJvdG90eXBlIHBhcnRzXG4gICAgLy8gVGhpcyBlbmFibGVzIGRpZmZlcmVudGlhbCBpbmhlcml0YW5jZSBhdCB0aGUgc3ViLW9iamVjdCBsZXZlbCwgZS5nLiBvYmplY3Qudmlldy5mb3JtYXRcbiAgICBvYmplY3QgPSBPYmplY3QuY3JlYXRlKHByb3RvdHlwZSk7XG4gICAgb2JqZWN0Lm1vZGVsID0gT2JqZWN0LmNyZWF0ZShwcm90b3R5cGUubW9kZWwpO1xuICAgIG9iamVjdC52aWV3ID0gT2JqZWN0LmNyZWF0ZShwcm90b3R5cGUudmlldyk7XG4gICAgb2JqZWN0LmNvbnRyb2xsZXIgPSBPYmplY3QuY3JlYXRlKHByb3RvdHlwZS5jb250cm9sbGVyKTtcbiAgICBvYmplY3QuX2NvbnRhaW5lciA9IE9iamVjdC5jcmVhdGUocHJvdG90eXBlLl9jb250YWluZXIpO1xuICAgIG9iamVjdC5fZXZlbnRzID0gT2JqZWN0LmNyZWF0ZShwcm90b3R5cGUuX2V2ZW50cyk7XG5cblxuICAgIC8vIEluc3RhbmNlIHByb3BlcnRpZXMsIGkuZS4gbm90IGluaGVyaXRlZFxuICAgIG9iamVjdC5faWQgPSBpZENvdW50ZXIrKztcbiAgICBvYmplY3QuX3BhcmVudCA9IG51bGw7XG4gICAgb2JqZWN0Ll9ldmVudHMuZGF0YSA9IHt9OyAvLyBldmVudCBiaW5kaW5ncyB3aWxsIGhhcHBlbiBiZWxvd1xuICAgIG9iamVjdC5fY29udGFpbmVyLmNoaWxkcmVuID0ge307XG4gICAgb2JqZWN0LnZpZXcuJHJvb3QgPSAkKCk7IC8vIGVtcHR5IGpRdWVyeSBvYmplY3RcblxuXG4gICAgLy8gQ2xvbmUgb3duIHByb3BlcnRpZXNcbiAgICAvLyBpLmUuIHByb3BlcnRpZXMgdGhhdCBhcmUgaW5oZXJpdGVkIGJ5IGRpcmVjdCBjb3B5IGluc3RlYWQgb2YgYnkgcHJvdG90eXBlIGNoYWluXG4gICAgLy8gVGhpcyBwcmV2ZW50cyBjaGlsZHJlbiBmcm9tIGFsdGVyaW5nIHBhcmVudHMgbW9kZWxzXG4gICAgb2JqZWN0Lm1vZGVsLl9kYXRhID0gcHJvdG90eXBlLm1vZGVsLl9kYXRhID8gJC5leHRlbmQodHJ1ZSwge30sIHByb3RvdHlwZS5tb2RlbC5fZGF0YSkgOiB7fTtcbiAgICBvYmplY3QuX2RhdGEgPSBwcm90b3R5cGUuX2RhdGEgPyAkLmV4dGVuZCh0cnVlLCB7fSwgcHJvdG90eXBlLl9kYXRhKSA6IHt9O1xuXG5cbiAgICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAqXG4gICAgICogRXh0ZW5kIG1vZGVsLCB2aWV3LCBjb250cm9sbGVyIGJhc2VkIG9uIGdpdmVuIGFyZ3VtZW50c1xuICAgICAqXG4gICAgICovXG5cbiAgICAvLyBKdXN0IHRoZSBkZWZhdWx0IHByb3RvdHlwZSB7fVxuICAgIGlmIChhcmdzLmxlbmd0aCA9PT0gMCkge1xuICAgIH1cblxuICAgIC8vICggdmlldy5mb3JtYXQgWyx7IG1ldGhvZDpmdW5jdGlvbiwgLi4uIH1dIClcbiAgICBlbHNlIGlmICggdHlwZW9mIGFyZ3NbMF0gPT09ICdzdHJpbmcnICkge1xuXG4gICAgICAvLyBHZXQgdGVtcGxhdGUgZnJvbSAnI2lkJ1xuICAgICAgaWYgKCBhcmdzWzBdWzBdID09PSAnIycgKSB7XG5cbiAgICAgICAgJHJvb3QgPSAkKGFyZ3NbMF0pO1xuXG4gICAgICAgIC8vIFRlbXBsYXRlIGZyb20gc2NyaXB0IHRhZ1xuICAgICAgICBpZiAoICRyb290LnByb3AoJ3RhZ05hbWUnKS50b0xvd2VyQ2FzZSgpID09PSAnc2NyaXB0JyApIHtcblxuICAgICAgICAgIG9iamVjdC52aWV3LmZvcm1hdCA9ICRyb290Lmh0bWwoKTtcblxuICAgICAgICAvLyBUZW1wbGF0ZSBmcm9tIGV4aXN0aW5nIERPTVxuICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgLy8gSW5jbHVkZSBjb250YWluZXIgaXRzZWxmXG4gICAgICAgICAgb2JqZWN0LnZpZXcuZm9ybWF0ID0gJHJvb3Qub3V0ZXJIVE1MKCk7XG4gICAgICAgICAgLy8gQXNzaWduIHJvb3QgdG8gZXhpc3RpbmcgRE9NIGVsZW1lbnRcbiAgICAgICAgICBvYmplY3Qudmlldy4kcm9vdCA9ICRyb290O1xuICAgICAgICAgIG9iamVjdC5fdGVtcGxhdGUgPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgIH1cbiAgICAgIC8vIG9yICc8dGVtcGxhdGU+JyBzdHJpbmdcbiAgICAgIGVsc2Ugb2JqZWN0LnZpZXcuZm9ybWF0ID0gYXJnc1swXTtcblxuICAgICAgLy8gQ29udHJvbGxlciBmcm9tIG9iamVjdFxuICAgICAgaWYgKCBhcmdzLmxlbmd0aCA+IDEgJiYgdHlwZW9mIGFyZ3NbMV0gPT09ICdvYmplY3QnKSB7XG4gICAgICAgICQuZXh0ZW5kKG9iamVjdC5jb250cm9sbGVyLCBhcmdzWzFdKTtcbiAgICAgICAgdXRpbC5leHRlbmRDb250cm9sbGVyKG9iamVjdCk7XG4gICAgICB9XG5cbiAgICB9IC8vIHNpbmdsZSB2aWV3IGFyZ1xuXG4gICAgLy8gUHJvdG90eXBlIGRpZmZlcmVudGlhbCBmcm9tIHNpbmdsZSB7bW9kZWwsdmlldyxjb250cm9sbGVyfSBvYmplY3RcbiAgICBlbHNlIGlmIChhcmdzLmxlbmd0aCA9PT0gMSAmJiB0eXBlb2YgYXJnc1swXSA9PT0gJ29iamVjdCcgJiYgKGFyZ3NbMF0ubW9kZWwgfHwgYXJnc1swXS52aWV3KSApIHtcblxuICAgICAgZm9yICh2YXIgcHJvcCBpbiBhcmdzWzBdKSB7XG5cbiAgICAgICAgaWYgKHByb3AgPT09ICdtb2RlbCcpIHtcblxuICAgICAgICAgICQuZXh0ZW5kKG9iamVjdC5tb2RlbC5fZGF0YSwgYXJnc1swXS5tb2RlbCk7XG5cbiAgICAgICAgfSBlbHNlIGlmIChwcm9wID09PSAndmlldycpIHtcblxuICAgICAgICAgIGlmICh0eXBlb2YgYXJnc1swXS52aWV3ID09PSAnc3RyaW5nJykge1xuXG4gICAgICAgICAgICAvLyBHZXQgdGVtcGxhdGUgZnJvbSAnI2lkJ1xuICAgICAgICAgICAgaWYgKCBhcmdzWzBdLnZpZXdbMF0gPT09ICcjJyApIHtcblxuICAgICAgICAgICAgICAkcm9vdCA9ICQoYXJnc1swXS52aWV3KTtcblxuICAgICAgICAgICAgICBvYmplY3Qudmlldy5mb3JtYXQgPSAkcm9vdC5odG1sKCk7XG5cbiAgICAgICAgICAgICAgLy8gVGVtcGxhdGUgZnJvbSBzY3JpcHQgdGFnXG4gICAgICAgICAgICAgIGlmICggJHJvb3QucHJvcCgndGFnTmFtZScpLnRvTG93ZXJDYXNlKCkgPT09ICdzY3JpcHQnICkge1xuXG4gICAgICAgICAgICAgICAgb2JqZWN0LnZpZXcuZm9ybWF0ID0gJHJvb3QuaHRtbCgpO1xuXG4gICAgICAgICAgICAgIC8vIFRlbXBsYXRlIGZyb20gZXhpc3RpbmcgRE9NXG4gICAgICAgICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgICAgICAvLyBJbmNsdWRlIGNvbnRhaW5lciBpdHNlbGZcbiAgICAgICAgICAgICAgICBvYmplY3Qudmlldy5mb3JtYXQgPSAkcm9vdC5vdXRlckhUTUwoKTtcbiAgICAgICAgICAgICAgICAvLyBBc3NpZ24gcm9vdCB0byBleGlzdGluZyBET00gZWxlbWVudFxuICAgICAgICAgICAgICAgIG9iamVjdC52aWV3LiRyb290ID0gJHJvb3Q7XG4gICAgICAgICAgICAgICAgb2JqZWN0Ll90ZW1wbGF0ZSA9IHRydWU7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gb3IgJzx0ZW1wbGF0ZT4nIHN0cmluZ1xuICAgICAgICAgICAgZWxzZSBvYmplY3Qudmlldy5mb3JtYXQgPSBhcmdzWzBdLnZpZXc7XG5cbiAgICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICAkLmV4dGVuZChvYmplY3QudmlldywgYXJnc1swXS52aWV3KTsgLy8gdmlldzp7Zm9ybWF0Ont9LHN0eWxlOnt9fVxuICAgICAgICAgIH1cblxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKCBwcm9wID09PSAnY29udHJvbGxlcicgfHwgcHJvcCA9PT0gJ2V2ZW50cycgKSB7XG4gICAgICAgICAgJC5leHRlbmQob2JqZWN0LmNvbnRyb2xsZXIsIGFyZ3NbMF1bcHJvcF0pO1xuICAgICAgICAgIHV0aWwuZXh0ZW5kQ29udHJvbGxlcihvYmplY3QpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXNlci1kZWZpbmVkIG1ldGhvZHNcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgb2JqZWN0W3Byb3BdID0gYXJnc1swXVtwcm9wXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gLy8gc2luZ2xlIHttb2RlbCwgdmlldywgY29udHJvbGxlcn0gYXJnXG5cbiAgICAvLyBQcm90b3R5cGUgZGlmZmVyZW50aWFsIGZyb20gc2VwYXJhdGUge21vZGVsfSwge3ZpZXd9LCB7Y29udHJvbGxlcn0gYXJndW1lbnRzXG4gICAgZWxzZSB7XG4gICAgICBcbiAgICAgIC8vIE1vZGVsIG9iamVjdFxuICAgICAgaWYgKHR5cGVvZiBhcmdzWzBdID09PSAnb2JqZWN0Jykge1xuICAgICAgICAkLmV4dGVuZChvYmplY3QubW9kZWwuX2RhdGEsIGFyZ3NbMF0pO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAoYXJnc1swXSkge1xuICAgICAgICB0aHJvdyBcImFnaWxpdHkuanM6IHVua25vd24gYXJndW1lbnQgdHlwZSAobW9kZWwpXCI7XG4gICAgICB9XG5cbiAgICAgIC8vIFZpZXcgZm9ybWF0IGZyb20gc2hvcnRoYW5kIHN0cmluZyAoLi4uLCAnPGRpdj53aGF0ZXZlcjwvZGl2PicsIC4uLilcbiAgICAgIGlmICh0eXBlb2YgYXJnc1sxXSA9PT0gJ3N0cmluZycpIHtcblxuICAgICAgICAvLyBAZXh0ZW5kIEdldCB0ZW1wbGF0ZSBmcm9tIElEXG4gICAgICAgIGlmICggYXJnc1sxXVswXSA9PT0gJyMnICkge1xuXG4gICAgICAgICAgLy8gb2JqZWN0LnZpZXcuZm9ybWF0ID0gJChhcmdzWzFdKS5odG1sKCk7XG5cbiAgICAgICAgICAkcm9vdCA9ICQoYXJnc1sxXSk7XG5cbiAgICAgICAgICAvLyBUZW1wbGF0ZSBmcm9tIHNjcmlwdCB0YWdcbiAgICAgICAgICBpZiAoICRyb290LnByb3AoJ3RhZ05hbWUnKS50b0xvd2VyQ2FzZSgpID09PSAnc2NyaXB0JyApIHtcblxuICAgICAgICAgICAgb2JqZWN0LnZpZXcuZm9ybWF0ID0gJHJvb3QuaHRtbCgpO1xuXG4gICAgICAgICAgLy8gVGVtcGxhdGUgZnJvbSBleGlzdGluZyBET01cbiAgICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICAvLyBJbmNsdWRlIGNvbnRhaW5lciBpdHNlbGZcbiAgICAgICAgICAgIG9iamVjdC52aWV3LmZvcm1hdCA9ICRyb290Lm91dGVySFRNTCgpO1xuICAgICAgICAgICAgLy8gQXNzaWduIHJvb3QgdG8gZXhpc3RpbmcgRE9NIGVsZW1lbnRcbiAgICAgICAgICAgIG9iamVjdC52aWV3LiRyb290ID0gJHJvb3Q7XG4gICAgICAgICAgICBvYmplY3QuX3RlbXBsYXRlID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZVxuICAgICAgICAgIG9iamVjdC52aWV3LmZvcm1hdCA9IGFyZ3NbMV07IC8vIGV4dGVuZCB2aWV3IHdpdGggLmZvcm1hdFxuICAgICAgfSAgXG4gICAgICAvLyBWaWV3IGZyb20gb2JqZWN0ICguLi4sIHtmb3JtYXQ6JzxkaXY+d2hhdGV2ZXI8L2Rpdj4nfSwgLi4uKVxuICAgICAgZWxzZSBpZiAodHlwZW9mIGFyZ3NbMV0gPT09ICdvYmplY3QnKSB7XG4gICAgICAgICQuZXh0ZW5kKG9iamVjdC52aWV3LCBhcmdzWzFdKTtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKGFyZ3NbMV0pIHtcbiAgICAgICAgdGhyb3cgXCJhZ2lsaXR5LmpzOiB1bmtub3duIGFyZ3VtZW50IHR5cGUgKHZpZXcpXCI7XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIFZpZXcgc3R5bGUgZnJvbSBzaG9ydGhhbmQgc3RyaW5nICguLi4sIC4uLiwgJ3Age2NvbG9yOnJlZH0nLCAuLi4pXG5cbiAgICAgIGlmICh0eXBlb2YgYXJnc1syXSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgb2JqZWN0LnZpZXcuc3R5bGUgPSBhcmdzWzJdO1xuICAgICAgICBhcmdzLnNwbGljZSgyLCAxKTsgLy8gc28gdGhhdCBjb250cm9sbGVyIGNvZGUgYmVsb3cgd29ya3NcbiAgICAgIH1cblxuICAgICAgLy8gQ29udHJvbGxlciBmcm9tIG9iamVjdCAoLi4uLCAuLi4sIHttZXRob2Q6ZnVuY3Rpb24oKXt9fSlcbiAgICAgIGlmICh0eXBlb2YgYXJnc1syXSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgJC5leHRlbmQob2JqZWN0LmNvbnRyb2xsZXIsIGFyZ3NbMl0pO1xuICAgICAgICB1dGlsLmV4dGVuZENvbnRyb2xsZXIob2JqZWN0KTtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKGFyZ3NbMl0pIHtcbiAgICAgICAgdGhyb3cgXCJhZ2lsaXR5LmpzOiB1bmtub3duIGFyZ3VtZW50IHR5cGUgKGNvbnRyb2xsZXIpXCI7XG4gICAgICB9XG4gICAgICBcbiAgICB9IC8vIHNlcGFyYXRlICh7bW9kZWx9LCB7dmlld30sIHtjb250cm9sbGVyfSkgYXJnc1xuXG5cbiAgICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAqXG4gICAgICogTGF1bmNoIHNlcXVlbmNlOiBCaW5kaW5ncywgaW5pdGlhbGl6YXRpb25zLCBldGNcbiAgICAgKlxuICAgICAqL1xuICAgIFxuICAgIC8vIFNhdmUgbW9kZWwncyBpbml0aWFsIHN0YXRlIChzbyBpdCBjYW4gYmUgLnJlc2V0KCkgbGF0ZXIpXG4gICAgb2JqZWN0Lm1vZGVsLl9pbml0RGF0YSA9ICQuZXh0ZW5kKHt9LCBvYmplY3QubW9kZWwuX2RhdGEpO1xuXG4gICAgLy8gb2JqZWN0Liogd2lsbCBoYXZlIHRoZWlyICd0aGlzJyA9PT0gb2JqZWN0LiBUaGlzIHNob3VsZCBjb21lIGJlZm9yZSBjYWxsIHRvIG9iamVjdC4qIGJlbG93LlxuICAgIHV0aWwucHJveHlBbGwob2JqZWN0LCBvYmplY3QpO1xuXG4gIFxuICAgIC8vIEluaXRpYWxpemUgJHJvb3QsIG5lZWRlZCBmb3IgRE9NIGV2ZW50cyBiaW5kaW5nIGJlbG93XG4gICAgb2JqZWN0LnZpZXcucmVuZGVyKCk7XG4gIFxuXG4gICAgLy8gQmluZCBhbGwgY29udHJvbGxlcnMgdG8gdGhlaXIgZXZlbnRzXG5cbiAgICB2YXIgYmluZEV2ZW50ID0gZnVuY3Rpb24oZXYsIGhhbmRsZXIpe1xuICAgICAgaWYgKHR5cGVvZiBoYW5kbGVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIG9iamVjdC5iaW5kKGV2LCBoYW5kbGVyKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgZm9yICh2YXIgZXZlbnRTdHIgaW4gb2JqZWN0LmNvbnRyb2xsZXIpIHtcbiAgICAgIHZhciBldmVudHMgPSBldmVudFN0ci5zcGxpdCgnOycpO1xuICAgICAgdmFyIGhhbmRsZXIgPSBvYmplY3QuY29udHJvbGxlcltldmVudFN0cl07XG4gICAgICAkLmVhY2goZXZlbnRzLCBmdW5jdGlvbihpLCBldil7XG4gICAgICAgIGV2ID0gJC50cmltKGV2KTtcbiAgICAgICAgYmluZEV2ZW50KGV2LCBoYW5kbGVyKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEF1dG8tdHJpZ2dlcnMgY3JlYXRlIGV2ZW50XG4gICAgb2JqZWN0LnRyaWdnZXIoJ2NyZWF0ZScpOyAgICBcbiAgICBcbiAgICByZXR1cm4gb2JqZWN0O1xuICAgIFxuICB9OyAvLyBhZ2lsaXR5XG5cblxuXG4gIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqXG4gICAqIEdsb2JhbCBwcm9wZXJ0aWVzXG4gICAqXG4gICAqL1xuXG4gIFxuICAvLyAkJC5kb2N1bWVudCBpcyBhIHNwZWNpYWwgQWdpbGl0eSBvYmplY3QsIHdob3NlIHZpZXcgaXMgYXR0YWNoZWQgdG8gPGJvZHk+XG4gIC8vIFRoaXMgb2JqZWN0IGlzIHRoZSBtYWluIGVudHJ5IHBvaW50IGZvciBhbGwgRE9NIG9wZXJhdGlvbnNcbiAgYWdpbGl0eS5kb2N1bWVudCA9IGFnaWxpdHkoe1xuICAgIF9kb2N1bWVudCA6IHRydWUsXG4gICAgdmlldzoge1xuICAgICAgJDogZnVuY3Rpb24oc2VsZWN0b3IpeyByZXR1cm4gc2VsZWN0b3IgPyAkKHNlbGVjdG9yLCAnYm9keScpIDogJCgnYm9keScpOyB9XG4gICAgfSxcbiAgICBjb250cm9sbGVyOiB7XG4gICAgICAvLyBPdmVycmlkZSBkZWZhdWx0IGNvbnRyb2xsZXIgKGRvbid0IHJlbmRlciwgZG9uJ3Qgc3R5bGl6ZSwgZXRjKVxuICAgICAgX2NyZWF0ZTogZnVuY3Rpb24oKXt9XG4gICAgfVxuICB9KTtcblxuICAvLyBTaG9ydGN1dCB0byBwcm90b3R5cGUgZm9yIHBsdWdpbnNcbiAgYWdpbGl0eS5mbiA9IGRlZmF1bHRQcm90b3R5cGU7XG5cbiAgLy8gTmFtZXNwYWNlIHRvIGRlY2xhcmUgcmV1c2FibGUgQWdpbGl0eSBvYmplY3RzXG4gIC8vIFVzZTogYXBwLmFwcGVuZCggJCQubW9kdWxlLnNvbWV0aGluZyApIG9yICQkKCAkJC5tb2R1bGUuc29tZXRoaW5nLCB7bSx2LGN9IClcbiAgYWdpbGl0eS5tb2R1bGUgPSB7fTtcblxuICAvLyBpc0FnaWxpdHkgdGVzdFxuICBhZ2lsaXR5LmlzQWdpbGl0eSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmICh0eXBlb2Ygb2JqICE9PSAnb2JqZWN0JykgcmV0dXJuIGZhbHNlO1xuICAgIHJldHVybiB1dGlsLmlzQWdpbGl0eShvYmopO1xuICB9O1xuXG5cbiAgLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICpcbiAgICogRXhwb3J0IGl0XG4gICAqXG4gICAqL1xuXG4gIC8vIEFNRCwgQ29tbW9uSlMsIHRoZW4gZ2xvYmFsXG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBAdG9kbyBJcyB0aGlzIGNvcnJlY3Q/XG4gICAgZGVmaW5lKFtdLCBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gYWdpbGl0eTtcbiAgICB9KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcbiAgICAgIG1vZHVsZS5leHBvcnRzID0gYWdpbGl0eTtcbiAgfSBlbHNlIHtcbiAgICAgIHdpbmRvdy4kJCA9IGFnaWxpdHk7XG4gIH1cblxufSkod2luZG93KTtcbiIsIlxuLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqXG4gKiBDb250cm9sbGVyXG4gKlxuICogIERlZmF1bHQgY29udHJvbGxlcnMsIGkuZS4gZXZlbnQgaGFuZGxlcnMuIEV2ZW50IGhhbmRsZXJzIHRoYXQgc3RhcnRcbiAqICB3aXRoICdfJyBhcmUgb2YgaW50ZXJuYWwgdXNlIG9ubHksIGFuZCB0YWtlIHByZWNlZGVuY2Ugb3ZlciBhbnkgb3RoZXJcbiAqICBoYW5kbGVyIHdpdGhvdXQgdGhhdCBwcmVmaXguIFNlZTogdHJpZ2dlcigpXG4gKlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gIC8vIFRyaWdnZXJlZCBhZnRlciBzZWxmIGNyZWF0aW9uXG4gIF9jcmVhdGU6IGZ1bmN0aW9uKGV2ZW50KXtcbiAgICB0aGlzLnZpZXcuc3R5bGl6ZSgpO1xuICAgIHRoaXMudmlldy5iaW5kaW5ncygpOyAvLyBNb2RlbC1WaWV3IGJpbmRpbmdzXG4gICAgdGhpcy52aWV3LnN5bmMoKTsgLy8gc3luY3MgVmlldyB3aXRoIE1vZGVsXG4gIH0sXG5cbiAgLy8gVHJpZ2dlcmVkIHVwb24gcmVtb3Zpbmcgc2VsZlxuICBfZGVzdHJveTogZnVuY3Rpb24oZXZlbnQpe1xuXG4gICAgLy8gQHB1bGwgIzk1IFJlbW92ZSBnZW5lcmF0ZWQgc3R5bGUgdXBvbiBkZXN0cnVjdGlvbiBvZiBvYmplY3RzXG4gICAgLy8gQGV4dGVuZCBPbmx5IGlmIHVzaW5nIHN0eWxlIGF0dHJpYnV0ZVxuXG4gICAgaWYgKHRoaXMudmlldy5zdHlsZSkge1xuICAgICAgdmFyIG9iakNsYXNzID0gJ2FnaWxpdHlfJyArIHRoaXMuX2lkO1xuICAgICAgJCgnaGVhZCAjJytvYmpDbGFzcywgd2luZG93LmRvY3VtZW50KS5yZW1vdmUoKTtcbiAgICB9XG5cbiAgICAvLyBkZXN0cm95IGFueSBhcHBlbmRlZCBhZ2lsaXR5IG9iamVjdHNcbiAgICB0aGlzLl9jb250YWluZXIuZW1wdHkoKTtcblxuICAgIC8vIGRlc3Ryb3kgc2VsZlxuICAgIHRoaXMudmlldy4kKCkucmVtb3ZlKCk7XG4gIH0sXG5cbiAgLy8gVHJpZ2dlcmVkIGFmdGVyIGNoaWxkIG9iaiBpcyBhcHBlbmRlZCB0byBjb250YWluZXJcbiAgX2FwcGVuZDogZnVuY3Rpb24oZXZlbnQsIG9iaiwgc2VsZWN0b3Ipe1xuICAgIHRoaXMudmlldy4kKHNlbGVjdG9yKS5hcHBlbmQob2JqLnZpZXcuJCgpKTtcbiAgfSxcblxuICAvLyBUcmlnZ2VyZWQgYWZ0ZXIgY2hpbGQgb2JqIGlzIHByZXBlbmRlZCB0byBjb250YWluZXJcbiAgX3ByZXBlbmQ6IGZ1bmN0aW9uKGV2ZW50LCBvYmosIHNlbGVjdG9yKXtcbiAgICB0aGlzLnZpZXcuJChzZWxlY3RvcikucHJlcGVuZChvYmoudmlldy4kKCkpO1xuICB9LFxuXG4gIC8vIFRyaWdnZXJlZCBhZnRlciBjaGlsZCBvYmogaXMgaW5zZXJ0ZWQgaW4gdGhlIGNvbnRhaW5lclxuICBfYmVmb3JlOiBmdW5jdGlvbihldmVudCwgb2JqLCBzZWxlY3Rvcil7XG4gICAgaWYgKCFzZWxlY3RvcikgdGhyb3cgJ2FnaWxpdHkuanM6IF9iZWZvcmUgbmVlZHMgYSBzZWxlY3Rvcic7XG4gICAgdGhpcy52aWV3LiQoc2VsZWN0b3IpLmJlZm9yZShvYmoudmlldy4kKCkpO1xuICB9LFxuXG4gIC8vIFRyaWdnZXJlZCBhZnRlciBjaGlsZCBvYmogaXMgaW5zZXJ0ZWQgaW4gdGhlIGNvbnRhaW5lclxuICBfYWZ0ZXI6IGZ1bmN0aW9uKGV2ZW50LCBvYmosIHNlbGVjdG9yKXtcbiAgICBpZiAoIXNlbGVjdG9yKSB0aHJvdyAnYWdpbGl0eS5qczogX2FmdGVyIG5lZWRzIGEgc2VsZWN0b3InO1xuICAgIHRoaXMudmlldy4kKHNlbGVjdG9yKS5hZnRlcihvYmoudmlldy4kKCkpO1xuICB9LFxuXG4gIC8vIFRyaWdnZXJlZCBhZnRlciBhIGNoaWxkIG9iaiBpcyByZW1vdmVkIGZyb20gY29udGFpbmVyIChvciBzZWxmLXJlbW92ZWQpXG4gIF9yZW1vdmU6IGZ1bmN0aW9uKGV2ZW50LCBpZCl7ICAgICAgICBcbiAgfSxcblxuICAvLyBUcmlnZ2VyZWQgYWZ0ZXIgbW9kZWwgaXMgY2hhbmdlZFxuICAnX2NoYW5nZSc6IGZ1bmN0aW9uKGV2ZW50KXtcbiAgfVxuICBcbn07XG4iLCIvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICpcbiAqIEdldFxuICpcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdldCggYXJnICkge1xuXG4gIC8vIEdldCB3aG9sZSBtb2RlbFxuICBpZiAoYXJnID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gdGhpcy5tb2RlbC5fZGF0YTtcbiAgfVxuXG4gIC8vIEdldCBhdHRyaWJ1dGVcbiAgLy8gQHB1bGwgIzkxIEFkZCBzdXBwb3J0IGZvciBuZXN0ZWQgbW9kZWxzOiBwYXJlbnQuY2hpbGRcbiAgaWYgKHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnKSB7XG4gICAgdmFyIHBhdGhzID0gYXJnLnNwbGl0KCcuJyk7XG4gICAgdmFyIHZhbHVlID0gdGhpcy5tb2RlbC5fZGF0YVtwYXRoc1swXV07XG4gICAgLy9jaGVjayBmb3IgbmVzdGVkIG9iamVjdHNcbiAgICBpZiAoJC5pc1BsYWluT2JqZWN0KHZhbHVlKSl7XG4gICAgICBmb3IgKHZhciBpID0gMTsgaSA8IHBhdGhzLmxlbmd0aDsgaSsrKXtcbiAgICAgICAgaWYgKCQuaXNQbGFpbk9iamVjdCh2YWx1ZSkgJiYgdmFsdWVbcGF0aHNbaV1dKXtcbiAgICAgICAgICB2YWx1ZSA9IHZhbHVlW3BhdGhzW2ldXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YWx1ZSA9IHZhbHVlW3BhdGhzLnNwbGljZShpKS5qb2luKCcuJyldO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vZGlyZWN0IGtleSBhY2Nlc3NcbiAgICAgIHZhbHVlID0gdGhpcy5tb2RlbC5fZGF0YVthcmddO1xuICAgIH1cbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICB0aHJvdyAnYWdpbGl0eS5qczogdW5rbm93biBhcmd1bWVudCBmb3IgZ2V0dGVyJztcbn07XG4iLCIvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICpcbiAqIFNldDogc2V0IG1vZGVsIGF0dHJpYnV0ZXMgYW5kIHRyaWdnZXIgY2hhbmdlIGV2ZW50c1xuICogXG4gKiBAdG9kbyBQZXJmb3JtYW5jZSBjb25zaWRlcmF0aW9uc1xuICpcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHNldCggYXJnLCBwYXJhbXMsIHRoaXJkICkge1xuXG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIG1vZGlmaWVkID0gW107IC8vIGxpc3Qgb2YgbW9kaWZpZWQgbW9kZWwgYXR0cmlidXRlc1xuICB2YXIgcHJldmlvdXMgPSB7fTsgLy8gbGlzdCBvZiBwcmV2aW91cyB2YWx1ZXNcblxuICAvLyBTZXQgaW5kaXZpZHVhbCBtb2RlbCBwcm9wZXJ0eTogbW9kZWwuc2V0KCBwcm9wLCB2YWx1ZSApXG4gIGlmICggdHlwZW9mIGFyZyA9PT0gJ3N0cmluZycgJiYgcGFyYW1zICkge1xuICAgIGFyZyA9IHsgYXJnOiBwYXJhbXMgfTtcbiAgICBwYXJhbXMgPSB0aGlyZCB8fCB7fTtcbiAgfVxuXG4gIGlmICggdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgKSB7XG5cbiAgICB2YXIgX2Nsb25lID0ge307XG5cbiAgICBpZiAocGFyYW1zICYmIHBhcmFtcy5yZXNldCkge1xuICAgICAgX2Nsb25lID0gdGhpcy5tb2RlbC5fZGF0YTsgLy8gaG9sZCBvbiB0byBkYXRhIGZvciBjaGFuZ2UgZXZlbnRzXG4gICAgICB0aGlzLm1vZGVsLl9kYXRhID0gJC5leHRlbmQoe30sIGFyZyk7IC8vIGVyYXNlcyBwcmV2aW91cyBtb2RlbCBhdHRyaWJ1dGVzIHdpdGhvdXQgcG9pbnRpbmcgdG8gb2JqZWN0XG4gICAgfVxuICAgIGVsc2Uge1xuXG4gICAgICAvLyBAZXh0ZW5kIENvbXBhcmUgYW5kIG9ubHkgdHJpZ2dlciBjaGFuZ2UgZXZlbnQgZm9yIG1vZGlmaWVkIGtleXNcbiAgICAgIF9jbG9uZSA9ICQuZXh0ZW5kKHt9LCB0aGlzLm1vZGVsLl9kYXRhKTtcblxuICAgICAgLy8gQHB1bGwgIzkxIEFkZCBzdXBwb3J0IGZvciBuZXN0ZWQgbW9kZWxzXG4gICAgICAvLyBJdGVyYXRlIHRocm91Z2ggcHJvcGVydGllcyBhbmQgZmluZCBuZXN0ZWQgZGVjbGFyYXRpb25zXG5cbiAgICAgIGZvciAodmFyIHByb3AgaW4gYXJnKXtcbiAgICAgICAgaWYgKHByb3AuaW5kZXhPZignLicpID4gLTEpe1xuICAgICAgICAgIHZhciBwYXRoID0gcHJvcC5zcGxpdCgnLicpO1xuICAgICAgICAgIHZhciBjdXJyZW50X25vZGUgPSB0aGlzLm1vZGVsLl9kYXRhW3BhdGhbMF1dO1xuICAgICAgICAgIGlmICghY3VycmVudF9ub2RlKXtcbiAgICAgICAgICAgIGN1cnJlbnRfbm9kZSA9IHRoaXMubW9kZWwuX2RhdGFbcGF0aFswXV0gPSB7fTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIG5leHRfbm9kZTtcbiAgICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IHBhdGgubGVuZ3RoIC0gMTsgaSsrKXtcbiAgICAgICAgICAgIG5leHRfbm9kZSA9IGN1cnJlbnRfbm9kZVtwYXRoW2ldXTtcbiAgICAgICAgICAgIGlmICgkLmlzUGxhaW5PYmplY3QobmV4dF9ub2RlKSl7XG4gICAgICAgICAgICAgY3VycmVudF9ub2RlID0gbmV4dF9ub2RlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICBjdXJyZW50X25vZGVbcGF0aFtpXV0gPSB7fTtcbiAgICAgICAgICAgICBjdXJyZW50X25vZGUgPSBjdXJyZW50X25vZGVbcGF0aFtpXV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBsYXN0X3Byb3BlcnR5ID0gcGF0aFtwYXRoLmxlbmd0aCAtIDFdO1xuICAgICAgICAgaWYgKCQuaXNQbGFpbk9iamVjdChhcmdba2V5XSkgJiYgJC5pc1BsYWluT2JqZWN0KGN1cnJlbnRfbm9kZVtsYXN0X3Byb3BlcnR5XSkpe1xuICAgICAgICAgICAvL2lmIHdlJ3JlIGFzc2lnbmluZyBvYmplY3RzLCBleHRlbmQgcmF0aGVyIHRoYW4gcmVwbGFjZVxuICAgICAgICAgICAkLmV4dGVuZChjdXJyZW50X25vZGVbbGFzdF9wcm9wZXJ0eV0sIGFyZ1twcm9wXSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgY3VycmVudF9ub2RlW2xhc3RfcHJvcGVydHldID0gYXJnW3Byb3BdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBcbiAgICAgICAgICBtb2RpZmllZC5wdXNoKHByb3ApO1xuICAgICAgICAgIHByZXZpb3VzW3Byb3BdID0gX2Nsb25lW3Byb3BdO1xuICAgICAgICAgIGRlbGV0ZSBfY2xvbmVbIHByb3AgXTsgLy8gbm8gbmVlZCB0byBmaXJlIGNoYW5nZSB0d2ljZVxuICAgICAgICAgIGRlbGV0ZSBhcmdbcHJvcF07XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgJC5leHRlbmQodGhpcy5tb2RlbC5fZGF0YSwgYXJnKTsgLy8gZGVmYXVsdCBpcyBleHRlbmRcbiAgICB9XG5cbiAgICAvLyBHaXZlbiBvYmplY3RcblxuICAgIGZvciAodmFyIGtleSBpbiBhcmcpIHtcbiAgICAgIC8vIENoZWNrIGlmIGNoYW5nZWRcbiAgICAgIGlmICh0aGlzLm1vZGVsLl9kYXRhW2tleV0gIT09IF9jbG9uZVtrZXldICkge1xuICAgICAgICBtb2RpZmllZC5wdXNoKGtleSk7XG4gICAgICAgIHByZXZpb3VzW2tleV0gPSBfY2xvbmVbIGtleSBdO1xuICAgICAgfVxuICAgICAgZGVsZXRlIF9jbG9uZVsga2V5IF07IC8vIG5vIG5lZWQgdG8gZmlyZSBjaGFuZ2UgdHdpY2VcbiAgICB9XG5cbiAgICAvLyBQcmV2aW91cyBvYmplY3RcblxuICAgIGZvciAoa2V5IGluIF9jbG9uZSkge1xuICAgICAgLy8gQ2hlY2sgaWYgY2hhbmdlZFxuICAgICAgaWYgKHRoaXMubW9kZWwuX2RhdGFba2V5XSAhPT0gX2Nsb25lW2tleV0gKSB7XG4gICAgICAgIG1vZGlmaWVkLnB1c2goa2V5KTtcbiAgICAgICAgcHJldmlvdXNba2V5XSA9IF9jbG9uZVsga2V5IF07XG4gICAgICB9XG4gICAgfVxuXG4gIH0gZWxzZSB7XG5cbiAgICAvLyBOb3QgYW4gb2JqZWN0XG4gICAgdGhyb3cgXCJhZ2lsaXR5LmpzOiB1bmtub3duIGFyZ3VtZW50IHR5cGUgaW4gbW9kZWwuc2V0KClcIjtcbiAgfVxuXG4gIC8vIFRpZ2dlciBjaGFuZ2UgZXZlbnRzXG5cbiAgaWYgKHBhcmFtcyAmJiBwYXJhbXMuc2lsZW50PT09dHJ1ZSkgcmV0dXJuIHRoaXM7IC8vIGRvIG5vdCBmaXJlIGV2ZW50c1xuXG4gIC8vIEBleHRlbmQgUGFzcyBhcnJheSBvZiBtb2RpZmllZCBtb2RlbCBrZXlzXG5cbiAgLy8gJCgpLnRyaWdnZXIgcGFyc2VzIHRoZSBzZWNvbmQgcGFyYW1ldGVyIGFzIHNlcGFyYXRlIGFyZ3VtZW50cyxcbiAgLy8gc28gd2UgcHV0IGl0IGluIGFuIGFycmF5XG5cbiAgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnLCBbbW9kaWZpZWQsIHByZXZpb3VzXSk7XG5cbiAgJC5lYWNoKG1vZGlmaWVkLCBmdW5jdGlvbihpbmRleCwga2V5KXtcbiAgICBzZWxmLnRyaWdnZXIoJ2NoYW5nZTonK2tleSwgcHJldmlvdXNba2V5XSk7XG4gIH0pO1xuXG4gIHJldHVybiB0aGlzOyAvLyBmb3IgY2hhaW5hYmxlIGNhbGxzXG5cbn07XG4iLCJcbi8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKlxuICogVmFsaWRhdGUgbW9kZWwgcHJvcGVydGllcyBiYXNlZCBvbiBvYmplY3QucmVxdWlyZWRcbiAqXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICpcbiAgICogbW9kZWwuaW52YWxpZCgpXG4gICAqIFxuICAgKiBAcmV0dXJuIEFuIGFycmF5IG9mIGludmFsaWQga2V5c1xuICAgKlxuICAgKi9cblxuICBpbnZhbGlkIDogZnVuY3Rpb24oKSB7XG5cbiAgICB2YXIgaW52YWxpZCA9IFtdO1xuXG4gICAgLy8gQ2hlY2sgZWFjaCByZXF1aXJlZCBrZXlcblxuICAgIGZvciAodmFyIGtleSBpbiB0aGlzLnJlcXVpcmVkKSB7XG4gICAgICBpZiAoICEgdGhpcy5tb2RlbC5pc1ZhbGlkS2V5KCBrZXkgKSApXG4gICAgICAgIGludmFsaWQucHVzaChrZXkpO1xuICAgIH1cblxuICAgIHJldHVybiBpbnZhbGlkO1xuICB9LFxuXG4gIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqXG4gICAqIGlzVmFsaWRcbiAgICpcbiAgICogaXNWYWxpZCgpIFZhbGlkYXRlIHdob2xlIG1vZGVsXG4gICAqIGlzVmFsaWQoIGtleSApIFZhbGlkYXRlIGtleVxuICAgKlxuICAgKiBAcmV0dXJuIGJvb2xlYW5cbiAgICpcbiAgICovXG4gIFxuXG4gIGlzVmFsaWQgOiBmdW5jdGlvbigga2V5ICkge1xuXG4gICAgaWYgKHR5cGVvZiBrZXkgPT09ICd1bmRlZmluZWQnKSB7XG5cbiAgICAgIC8vIENoZWNrIHRoZSB3aG9sZSBtb2RlbFxuICAgICAgcmV0dXJuICggdGhpcy5tb2RlbC5pbnZhbGlkKCkubGVuZ3RoID09PSAwKTtcblxuICAgIH0gZWxzZSByZXR1cm4gdGhpcy5tb2RlbC5pc1ZhbGlkS2V5KCBrZXkgKTtcblxuICB9LFxuXG4gIGlzVmFsaWRLZXkgOiBmdW5jdGlvbigga2V5ICkge1xuXG4gICAgaWYgKCB0eXBlb2YgdGhpcy5yZXF1aXJlZFtrZXldID09PSAndW5kZWZpbmVkJyApIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHZhciB2YWwgPSB0aGlzLm1vZGVsLmdldCgga2V5ICksXG4gICAgICAgIHJlcXVpcmVUeXBlID0gdGhpcy5yZXF1aXJlZFsga2V5IF07XG5cbiAgICBpZiAoIHJlcXVpcmVUeXBlID09PSB0cnVlICkge1xuXG4gICAgICByZXR1cm4gISAkLmlzRW1wdHkoIHZhbCApO1xuXG4gICAgfSBlbHNlIGlmICggcmVxdWlyZVR5cGUgPT09ICdlbWFpbCcgKSB7XG5cbiAgICAgIHJldHVybiAkLmlzRW1haWwoIHZhbCApO1xuXG4gICAgfSBlbHNlIHtcblxuICAgICAgLy8gT3RoZXIgdHlwZXMgb2YgcmVxdWlyZWQ6IGJvb2xlYW4sIGNoZWNrZWQsIGN1c3RvbSBjb25kaXRpb24uLj9cblxuICAgIH1cblxuICAgIHJldHVybiB0cnVlOyAvLyBQYXNzZWQgYWxsIHJlcXVpcmVtZW50c1xuICB9XG5cbn07XG5cbiQuaXNFbXB0eSA9IGZ1bmN0aW9uKCBtaXhlZF92YXIgKSB7XG5cbiAgLy8gRW1wdHk6IG51bGwsIHVuZGVmaW5lZCwgJycsIFtdLCB7fVxuICAvLyBOb3QgZW1wdHk6IDAsIHRydWUsIGZhbHNlXG4gIC8vIFdoYXQgYWJvdXQgalF1ZXJ5IG9iamVjdD9cblxuICB2YXIgdW5kZWYsIGtleSwgaSwgbGVuO1xuICB2YXIgZW1wdHlWYWx1ZXMgPSBbdW5kZWYsIG51bGwsICcnXTtcblxuICBmb3IgKGkgPSAwLCBsZW4gPSBlbXB0eVZhbHVlcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgIGlmIChtaXhlZF92YXIgPT09IGVtcHR5VmFsdWVzW2ldKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICBpZiAodHlwZW9mIG1peGVkX3ZhciA9PT0gJ29iamVjdCcpIHtcbiAgICBmb3IgKGtleSBpbiBtaXhlZF92YXIpIHtcbiAgICAgIC8vIEluaGVyaXRlZCBwcm9wZXJ0aWVzIGNvdW50P1xuICAgICAgLy8gaWYgKG1peGVkX3Zhci5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIC8vIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59O1xuXG5cbi8vIFZhbGlkYXRlIGUtbWFpbFxuJC5pc0VtYWlsID0gZnVuY3Rpb24oIGVtYWlsICkge1xuXG4gIGlmICggJC5pc0VtcHR5KCBlbWFpbCApICkgcmV0dXJuIGZhbHNlO1xuXG4gIHZhciByZWdleCA9IC9eKFthLXpBLVowLTlfListXSkrXFxAKChbYS16QS1aMC05LV0pK1xcLikrKFthLXpBLVowLTldezIsNH0pKyQvO1xuICByZXR1cm4gcmVnZXgudGVzdChlbWFpbCk7XG59O1xuIiwiXG4vKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICpcbiAqIE1vZGVsIEFQSVxuICpcbiAqIGdldFxuICogc2V0XG4gKiByZXNldFxuICogc2l6ZVxuICogZWFjaFxuICogXG4gKiBpbnZhbGlkXG4gKiBpc1ZhbGlkXG4gKiBpc1ZhbGlkS2V5XG4gKlxuICovXG5cbnZhciAkID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cualF1ZXJ5IDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5qUXVlcnkgOiBudWxsKSxcbiAgICB1dGlsID0gcmVxdWlyZSgnLi4vdXRpbC91dGlsJyksXG4gICAgbW9kZWxWYWxpZGF0ZSA9IHJlcXVpcmUoJy4vbW9kZWwtdmFsaWRhdGUnKSxcbiAgICBtb2RlbCA9IHtcblxuICAgICAgZ2V0OiByZXF1aXJlKCcuL21vZGVsLWdldCcpLFxuICAgICAgc2V0OiByZXF1aXJlKCcuL21vZGVsLXNldCcpLFxuXG4gICAgICAvLyBSZXNldHRlciAodG8gaW5pdGlhbCBtb2RlbCB1cG9uIG9iamVjdCBpbml0aWFsaXphdGlvbilcbiAgICAgIHJlc2V0OiBmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLm1vZGVsLnNldCh0aGlzLm1vZGVsLl9pbml0RGF0YSwge3Jlc2V0OnRydWV9KTtcbiAgICAgICAgcmV0dXJuIHRoaXM7IC8vIGZvciBjaGFpbmFibGUgY2FsbHNcbiAgICAgIH0sXG4gICAgICBcbiAgICAgIC8vIE51bWJlciBvZiBtb2RlbCBwcm9wZXJ0aWVzXG4gICAgICBzaXplOiBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gdXRpbC5zaXplKHRoaXMubW9kZWwuX2RhdGEpO1xuICAgICAgfSxcbiAgICAgIFxuICAgICAgLy8gQ29udmVuaWVuY2UgZnVuY3Rpb24gLSBsb29wcyBvdmVyIGVhY2ggbW9kZWwgcHJvcGVydHlcbiAgICAgIGVhY2g6IGZ1bmN0aW9uKGZuKXtcbiAgICAgICAgLy8gUHJveHkgdGhpcyBvYmplY3RcbiAgICAgICAgJC5lYWNoKHRoaXMubW9kZWwuX2RhdGEsICQucHJveHkoZm4sdGhpcykgKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7IC8vIGZvciBjaGFpbmFibGUgY2FsbHNcbiAgICAgIH1cblxuICAgIH07XG5cbm1vZHVsZS5leHBvcnRzID0gJC5leHRlbmQoIG1vZGVsLCBtb2RlbFZhbGlkYXRlICk7XG4iLCJcbi8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKlxuICogVmlldyBBUElcbiAqXG4gKiB2aWV3LiRcbiAqIHJlbmRlclxuICogYmluZGluZ3NcbiAqIHN5bmNcbiAqIHN0eWxpemVcbiAqICRib3VuZFxuICpcbiAqL1xuXG52YXIgUk9PVF9TRUxFQ1RPUiA9ICcmJzsgLy8gQWxzbyBpbiBtdmMvdmlldy5qc1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBcbiAgLy8gRGVmYXVsdHNcbiAgZm9ybWF0OiAnPGRpdi8+JyxcbiAgc3R5bGU6ICcnLFxuICBcbiAgLy8gU2hvcnRjdXQgdG8gdmlldy4kcm9vdCBvciB2aWV3LiRyb290LmZpbmQoKSwgZGVwZW5kaW5nIG9uIHNlbGVjdG9yIHByZXNlbmNlXG4gICQ6IGZ1bmN0aW9uKHNlbGVjdG9yKSB7XG4gICAgcmV0dXJuICghc2VsZWN0b3IgfHwgc2VsZWN0b3IgPT09IFJPT1RfU0VMRUNUT1IpID8gdGhpcy52aWV3LiRyb290IDogdGhpcy52aWV3LiRyb290LmZpbmQoc2VsZWN0b3IpO1xuICB9LFxuICBcblxuICAvLyBSZW5kZXIgJHJvb3RcbiAgLy8gT25seSBmdW5jdGlvbiB0byBhY2Nlc3MgJHJvb3QgZGlyZWN0bHkgb3RoZXIgdGhhbiAkKClcbiAgcmVuZGVyOiBmdW5jdGlvbigpe1xuXG4gICAgLy8gV2l0aG91dCBmb3JtYXQgdGhlcmUgaXMgbm8gdmlld1xuICAgIGlmICh0aGlzLnZpZXcuZm9ybWF0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhyb3cgXCJhZ2lsaXR5LmpzOiBlbXB0eSBmb3JtYXQgaW4gdmlldy5yZW5kZXIoKVwiO1xuICAgIH0gICAgICAgICAgICAgICAgXG5cbiAgICBpZiAoIHRoaXMudmlldy4kcm9vdCBpbnN0YW5jZW9mIGpRdWVyeSAmJiB0aGlzLl90ZW1wbGF0ZSApIHtcblxuICAgICAgLy8gVGVtcGxhdGUgZnJvbSBET00gLSBkb24ndCBvdmVyd3JpdGUgaXRcblxuICAgIH0gZWxzZSBpZiAoIHRoaXMudmlldy4kcm9vdC5zaXplKCkgPT09IDAgKSB7XG5cbiAgICAgIHRoaXMudmlldy4kcm9vdCA9ICQodGhpcy52aWV3LmZvcm1hdCk7XG5cbiAgICB9IGVsc2Uge1xuXG4gICAgICAvLyBkb24ndCBvdmVyd3JpdGUgJHJvb3QgYXMgdGhpcyB3b3VsZCByZXNldCBpdHMgcHJlc2VuY2UgaW4gdGhlIERPTVxuICAgICAgLy8gYW5kIGFsbCBldmVudHMgYWxyZWFkeSBib3VuZFxuXG4gICAgICB0aGlzLnZpZXcuJHJvb3QuaHRtbCggJCh0aGlzLnZpZXcuZm9ybWF0KS5odG1sKCkgKTtcbiAgICB9XG5cbiAgICAvLyBFbnN1cmUgd2UgaGF2ZSBhIHZhbGlkIChub24tZW1wdHkpICRyb290XG4gICAgaWYgKCAhKHRoaXMudmlldy4kcm9vdCBpbnN0YW5jZW9mIGpRdWVyeSkgJiYgdGhpcy52aWV3LiRyb290LnNpemUoKSA9PT0gMCApIHtcbiAgICAgIHRocm93ICdhZ2lsaXR5LmpzOiBjb3VsZCBub3QgZ2VuZXJhdGUgaHRtbCBmcm9tIGZvcm1hdCc7XG4gICAgfVxuXG4gICAgdGhpcy4kdmlldyA9IHRoaXMudmlldy4kcm9vdDtcbiAgICB0aGlzLiQgPSB0aGlzLnZpZXcuJDtcbiAgICByZXR1cm4gdGhpcztcbiAgfSwgLy8gcmVuZGVyXG5cblxuXG4gIC8vIFBhcnNlIGRhdGEtYmluZCBzdHJpbmcgb2YgdGhlIHR5cGUgJ1thdHRyaWJ1dGVdWz1dIHZhcmlhYmxlWywgW2F0dHJpYnV0ZV1bPV0gdmFyaWFibGUgXS4uLidcbiAgLy8gSWYgdGhlIHZhcmlhYmxlIGlzIG5vdCBhbiBhdHRyaWJ1dGUsIGl0IG11c3Qgb2NjdXIgYnkgaXRzZWxmXG4gIC8vICAgYWxsIHBhaXJzIGluIHRoZSBsaXN0IGFyZSBhc3N1bWVkIHRvIGJlIGF0dHJpYnV0ZXNcbiAgLy8gUmV0dXJucyB7IGtleTonbW9kZWwga2V5JywgYXR0cjogWyB7YXR0ciA6ICdhdHRyaWJ1dGUnLCBhdHRyVmFyIDogJ3ZhcmlhYmxlJyB9Li4uIF0gfVxuICBfcGFyc2VCaW5kU3RyOiBmdW5jdGlvbihzdHIpe1xuICAgIHZhciBvYmogPSB7a2V5Om51bGwsIGF0dHI6W119LFxuICAgICAgICBwYWlycyA9IHN0ci5zcGxpdCgnLCcpLFxuICAgICAgICAvLyByZWdleCA9IC8oW2EtekEtWjAtOV9cXC1dKykoPzpbXFxzPV0rKFthLXpBLVowLTlfXFwtXSspKT8vLFxuICAgICAgICAvLyBAcHVsbCAjOTEgQWRkIHN1cHBvcnQgZm9yIG5lc3RlZCBtb2RlbHM6IGtleS5wcm9wXG4gICAgICAgIHJlZ2V4ID0gLyhbYS16QS1aMC05X1xcLVxcLl0rKSg/OltcXHM9XSsoW2EtekEtWjAtOV9cXC1dKykpPy8sXG4gICAgICAgIGtleUFzc2lnbmVkID0gZmFsc2UsXG4gICAgICAgIG1hdGNoZWQ7XG4gICAgXG4gICAgaWYgKHBhaXJzLmxlbmd0aCA+IDApIHtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFpcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbWF0Y2hlZCA9IHBhaXJzW2ldLm1hdGNoKHJlZ2V4KTtcbiAgICAgICAgLy8gWyBcImF0dHJpYnV0ZSB2YXJpYWJsZVwiLCBcImF0dHJpYnV0ZVwiLCBcInZhcmlhYmxlXCIgXVxuICAgICAgICAvLyBvciBbIFwiYXR0cmlidXRlPXZhcmlhYmxlXCIsIFwiYXR0cmlidXRlXCIsIFwidmFyaWFibGVcIiBdXG4gICAgICAgIC8vIG9yXG4gICAgICAgIC8vIFsgXCJ2YXJpYWJsZVwiLCBcInZhcmlhYmxlXCIsIHVuZGVmaW5lZCBdXG4gICAgICAgIC8vIGluIHNvbWUgSUUgaXQgd2lsbCBiZSBbIFwidmFyaWFibGVcIiwgXCJ2YXJpYWJsZVwiLCBcIlwiIF1cbiAgICAgICAgLy8gb3JcbiAgICAgICAgLy8gbnVsbFxuICAgICAgICBpZiAobWF0Y2hlZCkge1xuICAgICAgICAgIGlmICh0eXBlb2YobWF0Y2hlZFsyXSkgPT09IFwidW5kZWZpbmVkXCIgfHwgbWF0Y2hlZFsyXSA9PT0gXCJcIikge1xuICAgICAgICAgICAgaWYgKGtleUFzc2lnbmVkKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIllvdSBtYXkgc3BlY2lmeSBvbmx5IG9uZSBrZXkgKFwiICsgXG4gICAgICAgICAgICAgICAga2V5QXNzaWduZWQgKyBcIiBoYXMgYWxyZWFkeSBiZWVuIHNwZWNpZmllZCBpbiBkYXRhLWJpbmQ9XCIgKyBcbiAgICAgICAgICAgICAgICBzdHIgKyBcIilcIik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBrZXlBc3NpZ25lZCA9IG1hdGNoZWRbMV07XG4gICAgICAgICAgICAgIG9iai5rZXkgPSBtYXRjaGVkWzFdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvYmouYXR0ci5wdXNoKHthdHRyOiBtYXRjaGVkWzFdLCBhdHRyVmFyOiBtYXRjaGVkWzJdfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IC8vIGlmIChtYXRjaGVkKVxuICAgICAgfSAvLyBmb3IgKHBhaXJzLmxlbmd0aClcbiAgICB9IC8vIGlmIChwYWlycy5sZW5ndGggPiAwKVxuICAgIFxuICAgIHJldHVybiBvYmo7XG4gIH0sXG5cblxuICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKlxuICAgKiBCaW5kaW5nc1xuICAgKlxuICAgKiAgQXBwbHkgdHdvLXdheSAoRE9NIDwtLT4gTW9kZWwpIGJpbmRpbmdzIHRvIGVsZW1lbnRzIHdpdGggJ2RhdGEtYmluZCcgYXR0cmlidXRlc1xuICAgKlxuICAgKiBAdG9kbyBTZXBhcmF0ZSB0byBpdHMgb3duIG1vZHVsZVxuICAgKlxuICAgKi9cblxuICBiaW5kaW5nczogZnVuY3Rpb24oKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyICRyb290Tm9kZSA9IHRoaXMudmlldy4kKCkuZmlsdGVyKCdbZGF0YS1iaW5kXScpO1xuICAgIHZhciAkY2hpbGROb2RlcyA9IHRoaXMudmlldy4kKCdbZGF0YS1iaW5kXScpO1xuICAgIHZhciBjcmVhdGVBdHRyaWJ1dGVQYWlyQ2xvc3VyZSA9IGZ1bmN0aW9uKGJpbmREYXRhLCBub2RlLCBpKSB7XG4gICAgICB2YXIgYXR0clBhaXIgPSBiaW5kRGF0YS5hdHRyW2ldOyAvLyBjYXB0dXJlIHRoZSBhdHRyaWJ1dGUgcGFpciBpbiBjbG9zdXJlXG4gICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIG5vZGUuYXR0cihhdHRyUGFpci5hdHRyLCBzZWxmLm1vZGVsLmdldChhdHRyUGFpci5hdHRyVmFyKSk7XG4gICAgICB9O1xuICAgIH07XG5cbiAgICAkcm9vdE5vZGUuYWRkKCRjaGlsZE5vZGVzKS5lYWNoKGZ1bmN0aW9uKCl7XG5cbiAgICAgIHZhciAkbm9kZSA9ICQodGhpcyk7XG4gICAgICB2YXIgYmluZERhdGEgPSBzZWxmLnZpZXcuX3BhcnNlQmluZFN0ciggJG5vZGUuZGF0YSgnYmluZCcpICk7XG4gICAgICB2YXIgcmVxdWlyZWQgPSAkbm9kZS5kYXRhKCdyZXF1aXJlZCcpO1xuXG4gICAgICB2YXIgYmluZEF0dHJpYnV0ZXNPbmVXYXkgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gMS13YXkgYXR0cmlidXRlIGJpbmRpbmdcbiAgICAgICAgaWYgKGJpbmREYXRhLmF0dHIpIHtcbiAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJpbmREYXRhLmF0dHIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHNlbGYuYmluZCgnX2NoYW5nZTonK2JpbmREYXRhLmF0dHJbaV0uYXR0clZhcixcbiAgICAgICAgICAgICAgY3JlYXRlQXR0cmlidXRlUGFpckNsb3N1cmUoYmluZERhdGEsICRub2RlLCBpKSk7XG4gICAgICAgICAgfSAvLyBmb3IgKGJpbmREYXRhLmF0dHIpXG4gICAgICAgIH0gLy8gaWYgKGJpbmREYXRhLmF0dHIpXG4gICAgICB9OyAvLyBiaW5kQXR0cmlidXRlc09uZVdheSgpXG4gICAgICBcbiAgICAgIC8vIDxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIj46IDItd2F5IGJpbmRpbmdcbiAgICAgIGlmICgkbm9kZS5pcygnaW5wdXQ6Y2hlY2tib3gnKSkge1xuICAgICAgICAvLyBNb2RlbCAtLT4gRE9NXG4gICAgICAgIHNlbGYuYmluZCgnX2NoYW5nZTonK2JpbmREYXRhLmtleSwgZnVuY3Rpb24oKXtcbiAgICAgICAgICAkbm9kZS5wcm9wKFwiY2hlY2tlZFwiLCBzZWxmLm1vZGVsLmdldChiaW5kRGF0YS5rZXkpKTsgLy8gdGhpcyB3b24ndCBmaXJlIGEgRE9NICdjaGFuZ2UnIGV2ZW50LCBzYXZpbmcgdXMgZnJvbSBhbiBpbmZpbml0ZSBldmVudCBsb29wIChNb2RlbCA8LS0+IERPTSlcbiAgICAgICAgfSk7ICAgICAgICAgICAgXG4gICAgICAgIC8vIERPTSAtLT4gTW9kZWxcbiAgICAgICAgJG5vZGUuY2hhbmdlKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgdmFyIG9iaiA9IHt9O1xuICAgICAgICAgIG9ialtiaW5kRGF0YS5rZXldID0gJCh0aGlzKS5wcm9wKFwiY2hlY2tlZFwiKTtcbiAgICAgICAgICBzZWxmLm1vZGVsLnNldChvYmopOyAvLyBub3Qgc2lsZW50IGFzIHVzZXIgbWlnaHQgYmUgbGlzdGVuaW5nIHRvIGNoYW5nZSBldmVudHNcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIDEtd2F5IGF0dHJpYnV0ZSBiaW5kaW5nXG4gICAgICAgIGJpbmRBdHRyaWJ1dGVzT25lV2F5KCk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIDxzZWxlY3Q+OiAyLXdheSBiaW5kaW5nXG4gICAgICBlbHNlIGlmICgkbm9kZS5pcygnc2VsZWN0JykpIHtcbiAgICAgICAgLy8gTW9kZWwgLS0+IERPTVxuICAgICAgICBzZWxmLmJpbmQoJ19jaGFuZ2U6JytiaW5kRGF0YS5rZXksIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgdmFyIG5vZGVOYW1lID0gJG5vZGUuYXR0cignbmFtZScpO1xuICAgICAgICAgIHZhciBtb2RlbFZhbHVlID0gc2VsZi5tb2RlbC5nZXQoYmluZERhdGEua2V5KTtcbiAgICAgICAgICAkbm9kZS52YWwobW9kZWxWYWx1ZSk7XG4gICAgICAgIH0pOyAgICAgICAgICAgIFxuICAgICAgICAvLyBET00gLS0+IE1vZGVsXG4gICAgICAgICRub2RlLmNoYW5nZShmdW5jdGlvbigpe1xuICAgICAgICAgIHZhciBvYmogPSB7fTtcbiAgICAgICAgICBvYmpbYmluZERhdGEua2V5XSA9ICRub2RlLnZhbCgpO1xuICAgICAgICAgIHNlbGYubW9kZWwuc2V0KG9iaik7IC8vIG5vdCBzaWxlbnQgYXMgdXNlciBtaWdodCBiZSBsaXN0ZW5pbmcgdG8gY2hhbmdlIGV2ZW50c1xuICAgICAgICB9KTtcbiAgICAgICAgLy8gMS13YXkgYXR0cmlidXRlIGJpbmRpbmdcbiAgICAgICAgYmluZEF0dHJpYnV0ZXNPbmVXYXkoKTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gPGlucHV0IHR5cGU9XCJyYWRpb1wiPjogMi13YXkgYmluZGluZ1xuICAgICAgZWxzZSBpZiAoJG5vZGUuaXMoJ2lucHV0OnJhZGlvJykpIHtcblxuICAgICAgICAvLyBNb2RlbCAtLT4gRE9NXG4gICAgICAgIHNlbGYuYmluZCgnX2NoYW5nZTonK2JpbmREYXRhLmtleSwgZnVuY3Rpb24oKXtcbiAgICAgICAgICB2YXIgbm9kZU5hbWUgPSAkbm9kZS5hdHRyKCduYW1lJyk7XG4gICAgICAgICAgdmFyIG1vZGVsVmFsdWUgPSBzZWxmLm1vZGVsLmdldChiaW5kRGF0YS5rZXkpO1xuXG4gICAgICAgICAgICAvLyAkbm9kZS5zaWJsaW5ncygnaW5wdXRbbmFtZT1cIicrbm9kZU5hbWUrJ1wiXScpLmZpbHRlcignW3ZhbHVlPVwiJyttb2RlbFZhbHVlKydcIl0nKS5wcm9wKFwiY2hlY2tlZFwiLCB0cnVlKTtcblxuICAgICAgICAgICAgLy8gQHB1bGwgIzExMCBCaW5kaW5nIGZvciByYWRpbyBidXR0b25zXG4gICAgICAgICAgICAvLyBUaGV5J3JlIG5vdCBhbHdheXMgc2libGluZ3MsIHNvIHN0YXJ0IGZyb20gJHJvb3RcbiAgICAgICAgICAgIHNlbGYudmlldy4kcm9vdC5maW5kKCdpbnB1dFtuYW1lPVwiJytub2RlTmFtZSsnXCJdJylcbiAgICAgICAgICAgICAgLmZpbHRlcignW3ZhbHVlPVwiJyttb2RlbFZhbHVlKydcIl0nKVxuICAgICAgICAgICAgICAucHJvcChcImNoZWNrZWRcIiwgdHJ1ZSk7IC8vIHRoaXMgd29uJ3QgZmlyZSBhIERPTSAnY2hhbmdlJyBldmVudCwgc2F2aW5nIHVzIGZyb20gYW4gaW5maW5pdGUgZXZlbnQgbG9vcCAoTW9kZWwgPC0tPiBET00pXG4gICAgICAgIH0pOyAgICAgICAgICAgIFxuXG4gICAgICAgIC8vIERPTSAtLT4gTW9kZWxcbiAgICAgICAgJG5vZGUuY2hhbmdlKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgaWYgKCEkbm9kZS5wcm9wKFwiY2hlY2tlZFwiKSkgcmV0dXJuOyAvLyBvbmx5IGhhbmRsZXMgY2hlY2s9dHJ1ZSBldmVudHNcbiAgICAgICAgICB2YXIgb2JqID0ge307XG4gICAgICAgICAgb2JqW2JpbmREYXRhLmtleV0gPSAkbm9kZS52YWwoKTtcbiAgICAgICAgICBzZWxmLm1vZGVsLnNldChvYmopOyAvLyBub3Qgc2lsZW50IGFzIHVzZXIgbWlnaHQgYmUgbGlzdGVuaW5nIHRvIGNoYW5nZSBldmVudHNcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIDEtd2F5IGF0dHJpYnV0ZSBiaW5kaW5nXG4gICAgICAgIGJpbmRBdHRyaWJ1dGVzT25lV2F5KCk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIDxpbnB1dCB0eXBlPVwic2VhcmNoXCI+IChtb2RlbCBpcyB1cGRhdGVkIGFmdGVyIGV2ZXJ5IGtleXByZXNzIGV2ZW50KVxuICAgICAgZWxzZSBpZiAoJG5vZGUuaXMoJ2lucHV0W3R5cGU9XCJzZWFyY2hcIl0nKSkge1xuXG4gICAgICAgIC8vIE1vZGVsIC0tPiBET01cbiAgICAgICAgc2VsZi5iaW5kKCdfY2hhbmdlOicrYmluZERhdGEua2V5LCBmdW5jdGlvbigpe1xuICAgICAgICAgICRub2RlLnZhbChzZWxmLm1vZGVsLmdldChiaW5kRGF0YS5rZXkpKTsgLy8gdGhpcyB3b24ndCBmaXJlIGEgRE9NICdjaGFuZ2UnIGV2ZW50LCBzYXZpbmcgdXMgZnJvbSBhbiBpbmZpbml0ZSBldmVudCBsb29wIChNb2RlbCA8LS0+IERPTSlcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gTW9kZWwgPC0tIERPTVxuICAgICAgICAkbm9kZS5rZXlwcmVzcyhmdW5jdGlvbigpe1xuICAgICAgICAgIC8vIFdpdGhvdXQgdGltZW91dCAkbm9kZS52YWwoKSBtaXNzZXMgdGhlIGxhc3QgZW50ZXJlZCBjaGFyYWN0ZXJcbiAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB2YXIgb2JqID0ge307XG4gICAgICAgICAgICBvYmpbYmluZERhdGEua2V5XSA9ICRub2RlLnZhbCgpO1xuICAgICAgICAgICAgc2VsZi5tb2RlbC5zZXQob2JqKTsgLy8gbm90IHNpbGVudCBhcyB1c2VyIG1pZ2h0IGJlIGxpc3RlbmluZyB0byBjaGFuZ2UgZXZlbnRzXG4gICAgICAgICAgfSwgNTApO1xuICAgICAgICB9KTtcbiAgICAgICAgLy8gMS13YXkgYXR0cmlidXRlIGJpbmRpbmdcbiAgICAgICAgYmluZEF0dHJpYnV0ZXNPbmVXYXkoKTtcbiAgICAgIH1cblxuICAgICAgLy8gPGlucHV0IHR5cGU9XCJ0ZXh0XCI+LCA8aW5wdXQ+LCBhbmQgPHRleHRhcmVhPjogMi13YXkgYmluZGluZ1xuICAgICAgZWxzZSBpZiAoJG5vZGUuaXMoJ2lucHV0OnRleHQsIGlucHV0W3R5cGUhPVwic2VhcmNoXCJdLCB0ZXh0YXJlYScpKSB7XG4gICAgICAgIC8vIE1vZGVsIC0tPiBET01cbiAgICAgICAgc2VsZi5iaW5kKCdfY2hhbmdlOicrYmluZERhdGEua2V5LCBmdW5jdGlvbigpe1xuICAgICAgICAgICRub2RlLnZhbChzZWxmLm1vZGVsLmdldChiaW5kRGF0YS5rZXkpKTsgLy8gdGhpcyB3b24ndCBmaXJlIGEgRE9NICdjaGFuZ2UnIGV2ZW50LCBzYXZpbmcgdXMgZnJvbSBhbiBpbmZpbml0ZSBldmVudCBsb29wIChNb2RlbCA8LS0+IERPTSlcbiAgICAgICAgfSk7ICAgICAgICAgICAgXG4gICAgICAgIC8vIE1vZGVsIDwtLSBET01cbiAgICAgICAgJG5vZGUuY2hhbmdlKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgdmFyIG9iaiA9IHt9O1xuICAgICAgICAgIG9ialtiaW5kRGF0YS5rZXldID0gJCh0aGlzKS52YWwoKTtcbiAgICAgICAgICBzZWxmLm1vZGVsLnNldChvYmopOyAvLyBub3Qgc2lsZW50IGFzIHVzZXIgbWlnaHQgYmUgbGlzdGVuaW5nIHRvIGNoYW5nZSBldmVudHNcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIDEtd2F5IGF0dHJpYnV0ZSBiaW5kaW5nXG4gICAgICAgIGJpbmRBdHRyaWJ1dGVzT25lV2F5KCk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIGFsbCBvdGhlciA8dGFnPnM6IDEtd2F5IGJpbmRpbmcgKE1vZGVsIC0+IERPTSlcbiAgICAgIGVsc2Uge1xuICAgICAgICBpZiAoYmluZERhdGEua2V5KSB7XG4gICAgICAgICAgc2VsZi5iaW5kKCdfY2hhbmdlOicrYmluZERhdGEua2V5LCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgdmFyIGtleSA9IHNlbGYubW9kZWwuZ2V0KGJpbmREYXRhLmtleSk7XG4gICAgICAgICAgICBpZiAoa2V5IHx8IGtleT09PTApIHtcbiAgICAgICAgICAgICAgJG5vZGUudGV4dChzZWxmLm1vZGVsLmdldChiaW5kRGF0YS5rZXkpLnRvU3RyaW5nKCkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgJG5vZGUudGV4dCgnJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgYmluZEF0dHJpYnV0ZXNPbmVXYXkoKTtcbiAgICAgIH1cblxuICAgICAgLy8gU3RvcmUgYmluZGluZyBtYXAgZm9yIGxhdGVyIHJlZmVyZW5jZVxuXG4gICAgICBzZWxmLiRub2RlWyBiaW5kRGF0YS5rZXkgXSA9ICRub2RlO1xuICAgICAgc2VsZi5rZXlbICRub2RlIF0gPSBiaW5kRGF0YS5rZXk7IC8vIFVubmVjZXNzYXJ5P1xuXG4gICAgICBpZiAoIHR5cGVvZiByZXF1aXJlZCAhPT0gJ3VuZGVmaW5lZCcgKSB7XG4gICAgICAgIHNlbGYucmVxdWlyZWRbIGJpbmREYXRhLmtleSBdID0gcmVxdWlyZWQ7XG4gICAgICB9XG5cbiAgICB9KTsgLy8gbm9kZXMuZWFjaCgpXG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sIC8vIGJpbmRpbmdzKClcbiAgXG5cbiAgLy8gVHJpZ2dlcnMgX2NoYW5nZSBhbmQgX2NoYW5nZToqIGV2ZW50cyBzbyB0aGF0IHZpZXcgaXMgdXBkYXRlZCBhcyBwZXIgdmlldy5iaW5kaW5ncygpXG4gIHN5bmM6IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIC8vIFRyaWdnZXIgY2hhbmdlIGV2ZW50cyBzbyB0aGF0IHZpZXcgaXMgdXBkYXRlZCBhY2NvcmRpbmcgdG8gbW9kZWxcbiAgICB0aGlzLm1vZGVsLmVhY2goZnVuY3Rpb24oa2V5LCB2YWwpe1xuICAgICAgc2VsZi50cmlnZ2VyKCdfY2hhbmdlOicra2V5KTtcbiAgICB9KTtcbiAgICBpZiAodGhpcy5tb2RlbC5zaXplKCkgPiAwKSB7XG4gICAgICB0aGlzLnRyaWdnZXIoJ19jaGFuZ2UnKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cblxuICAvLyBBcHBsaWVzIHN0eWxlIGR5bmFtaWNhbGx5XG4gIHN0eWxpemU6IGZ1bmN0aW9uKCl7XG4gICAgdmFyIG9iakNsYXNzLFxuICAgICAgICByZWdleCA9IG5ldyBSZWdFeHAoUk9PVF9TRUxFQ1RPUiwgJ2cnKTtcbiAgICBpZiAodGhpcy52aWV3LnN0eWxlLmxlbmd0aCA9PT0gMCB8fCB0aGlzLnZpZXcuJCgpLnNpemUoKSA9PT0gMCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyBPd24gc3R5bGVcbiAgICAvLyBPYmplY3QgZ2V0cyBvd24gY2xhc3MgbmFtZSBcIi5hZ2lsaXR5XzEyM1wiLCBhbmQgPGhlYWQ+IGdldHMgYSBjb3JyZXNwb25kaW5nIDxzdHlsZT5cbiAgICBpZiAodGhpcy52aWV3Lmhhc093blByb3BlcnR5KCdzdHlsZScpKSB7XG4gICAgICBvYmpDbGFzcyA9ICdhZ2lsaXR5XycgKyB0aGlzLl9pZDtcbiAgICAgIHZhciBzdHlsZVN0ciA9IHRoaXMudmlldy5zdHlsZS5yZXBsYWNlKHJlZ2V4LCAnLicrb2JqQ2xhc3MpO1xuICAgICAgLy8gJCgnaGVhZCcsIHdpbmRvdy5kb2N1bWVudCkuYXBwZW5kKCc8c3R5bGUgdHlwZT1cInRleHQvY3NzXCI+JytzdHlsZVN0cisnPC9zdHlsZT4nKTtcblxuICAgICAgLy8gQHB1bGwgIzk1IEFkZCBJRCBzbyBsYXRlciB3ZSBjYW4gcmVtb3ZlIGdlbmVyYXRlZCBzdHlsZVxuICAgICAgLy8gdXBvbiBkZXN0cnVjdGlvbiBvZiBvYmplY3RzXG4gICAgICAkKCdoZWFkJywgd2luZG93LmRvY3VtZW50KS5hcHBlbmQoJzxzdHlsZSBpZD1cIicrIG9iakNsYXNzICsnXCIgdHlwZT1cInRleHQvY3NzXCI+JytcbiAgICAgICAgc3R5bGVTdHIrJzwvc3R5bGU+Jyk7XG4gICAgICB0aGlzLnZpZXcuJCgpLmFkZENsYXNzKG9iakNsYXNzKTtcbiAgICB9XG4gICAgLy8gSW5oZXJpdGVkIHN0eWxlXG4gICAgLy8gT2JqZWN0IGluaGVyaXRzIENTUyBjbGFzcyBuYW1lIGZyb20gZmlyc3QgYW5jZXN0b3IgdG8gaGF2ZSBvd24gdmlldy5zdHlsZVxuICAgIGVsc2Uge1xuICAgICAgLy8gUmV0dXJucyBpZCBvZiBmaXJzdCBhbmNlc3RvciB0byBoYXZlICdvd24nIHZpZXcuc3R5bGVcbiAgICAgIHZhciBhbmNlc3RvcldpdGhTdHlsZSA9IGZ1bmN0aW9uKG9iamVjdCkge1xuICAgICAgICB3aGlsZSAob2JqZWN0ICE9PSBudWxsKSB7XG4gICAgICAgICAgb2JqZWN0ID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKG9iamVjdCk7XG4gICAgICAgICAgaWYgKG9iamVjdC52aWV3Lmhhc093blByb3BlcnR5KCdzdHlsZScpKVxuICAgICAgICAgICAgcmV0dXJuIG9iamVjdC5faWQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH07IC8vIGFuY2VzdG9yV2l0aFN0eWxlXG5cbiAgICAgIHZhciBhbmNlc3RvcklkID0gYW5jZXN0b3JXaXRoU3R5bGUodGhpcyk7XG4gICAgICBvYmpDbGFzcyA9ICdhZ2lsaXR5XycgKyBhbmNlc3RvcklkO1xuICAgICAgdGhpcy52aWV3LiQoKS5hZGRDbGFzcyhvYmpDbGFzcyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG5cbiAgLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICpcbiAgICogRXh0ZW5kZWRcbiAgICpcbiAgICovXG5cbiAgLy8gUmV0dXJuIGVsZW1lbnQocykgYm91bmQgdG8gYSBtb2RlbCBwcm9wZXJ0eVxuXG4gIC8vIEB0b2RvIFByb3ZpZGUgYSByZXZlcnNlIGZ1bmN0aW9uIGZyb20gZWxlbWVudHMgLT4gbW9kZWwgcHJvcGVydHk/XG5cbiAgJGJvdW5kOiBmdW5jdGlvbigga2V5ICkge1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgcmV0dXJuIHRoaXMudmlldy4kKCdbZGF0YS1iaW5kXScpLmZpbHRlcihmdW5jdGlvbigpe1xuXG4gICAgICB2YXIgYmluZERhdGEgPSBzZWxmLnZpZXcuX3BhcnNlQmluZFN0ciggJCh0aGlzKS5kYXRhKCdiaW5kJykgKTtcblxuICAgICAgLy8gV2hhdCBhYm91dCBtdWx0aXBsZSBvciBuZXN0ZWQgYmluZGluZ3M/XG4gICAgICByZXR1cm4gKCBiaW5kRGF0YS5rZXkgPT0ga2V5ICk7XG4gICAgfSk7XG4gIH1cblxufTtcbiIsIlxuLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqXG4gKiBfY29udGFpbmVyXG4gKlxuICogQVBJIGFuZCByZWxhdGVkIGF1eGlsaWFyeSBmdW5jdGlvbnMgZm9yIHN0b3JpbmcgY2hpbGQgQWdpbGl0eSBvYmplY3RzLlxuICogTm90IGFsbCBtZXRob2RzIGFyZSBleHBvc2VkLiBTZWUgJ3Nob3J0Y3V0cycgYmVsb3cgZm9yIGV4cG9zZWQgbWV0aG9kcy5cbiAqXG4gKi9cblxudmFyICQgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5qUXVlcnkgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLmpRdWVyeSA6IG51bGwpLFxuICAgIHV0aWwgPSByZXF1aXJlKCcuLi91dGlsL3V0aWwnKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgLy8gQWRkcyBjaGlsZCBvYmplY3QgdG8gY29udGFpbmVyLCBhcHBlbmRzL3ByZXBlbmRzL2V0YyB2aWV3LCBsaXN0ZW5zIGZvciBjaGlsZCByZW1vdmFsXG4gIF9pbnNlcnRPYmplY3Q6IGZ1bmN0aW9uKG9iaiwgc2VsZWN0b3IsIG1ldGhvZCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgaWYgKCF1dGlsLmlzQWdpbGl0eShvYmopKSB7XG4gICAgICB0aHJvdyBcImFnaWxpdHkuanM6IGFwcGVuZCBhcmd1bWVudCBpcyBub3QgYW4gYWdpbGl0eSBvYmplY3RcIjtcbiAgICB9XG5cbiAgICB0aGlzLl9jb250YWluZXIuY2hpbGRyZW5bb2JqLl9pZF0gPSBvYmo7IC8vIGNoaWxkcmVuIGlzICpub3QqIGFuIGFycmF5OyB0aGlzIGlzIGZvciBzaW1wbGVyIGxvb2t1cHMgYnkgZ2xvYmFsIG9iamVjdCBpZFxuICAgIHRoaXMudHJpZ2dlcihtZXRob2QsIFtvYmosIHNlbGVjdG9yXSk7XG4gICAgb2JqLl9wYXJlbnQgPSB0aGlzO1xuICAgIC8vIGVuc3VyZXMgb2JqZWN0IGlzIHJlbW92ZWQgZnJvbSBjb250YWluZXIgd2hlbiBkZXN0cm95ZWQ6XG4gICAgb2JqLmJpbmQoJ2Rlc3Ryb3knLCBmdW5jdGlvbihldmVudCwgaWQpeyBcbiAgICAgIHNlbGYuX2NvbnRhaW5lci5yZW1vdmUoaWQpO1xuICAgIH0pO1xuICAgIC8vIFRyaWdnZXIgZXZlbnQgZm9yIGNoaWxkIHRvIGxpc3RlbiB0b1xuICAgIG9iai50cmlnZ2VyKCdwYXJlbnQ6JyttZXRob2QpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIGFwcGVuZDogZnVuY3Rpb24ob2JqLCBzZWxlY3RvcikgeyBcbiAgICAgIHJldHVybiB0aGlzLl9jb250YWluZXIuX2luc2VydE9iamVjdC5jYWxsKHRoaXMsIG9iaiwgc2VsZWN0b3IsICdhcHBlbmQnKTsgXG4gIH0sXG5cbiAgcHJlcGVuZDogZnVuY3Rpb24ob2JqLCBzZWxlY3RvcikgeyBcbiAgICAgIHJldHVybiB0aGlzLl9jb250YWluZXIuX2luc2VydE9iamVjdC5jYWxsKHRoaXMsIG9iaiwgc2VsZWN0b3IsICdwcmVwZW5kJyk7IFxuICB9LFxuXG4gIGFmdGVyOiBmdW5jdGlvbihvYmosIHNlbGVjdG9yKSB7IFxuICAgICAgcmV0dXJuIHRoaXMuX2NvbnRhaW5lci5faW5zZXJ0T2JqZWN0LmNhbGwodGhpcywgb2JqLCBzZWxlY3RvciwgJ2FmdGVyJyk7IFxuICB9LFxuXG4gIGJlZm9yZTogZnVuY3Rpb24ob2JqLCBzZWxlY3RvcikgeyBcbiAgICAgIHJldHVybiB0aGlzLl9jb250YWluZXIuX2luc2VydE9iamVjdC5jYWxsKHRoaXMsIG9iaiwgc2VsZWN0b3IsICdiZWZvcmUnKTsgXG4gIH0sXG4gIFxuICAvLyBSZW1vdmVzIGNoaWxkIG9iamVjdCBmcm9tIGNvbnRhaW5lclxuICByZW1vdmU6IGZ1bmN0aW9uKGlkKXtcbiAgICBkZWxldGUgdGhpcy5fY29udGFpbmVyLmNoaWxkcmVuW2lkXTtcbiAgICB0aGlzLnRyaWdnZXIoJ3JlbW92ZScsIGlkKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvLyBJdGVyYXRlcyBvdmVyIGFsbCBjaGlsZCBvYmplY3RzIGluIGNvbnRhaW5lclxuICBlYWNoOiBmdW5jdGlvbihmbil7XG4gICAgJC5lYWNoKHRoaXMuX2NvbnRhaW5lci5jaGlsZHJlbiwgZm4pO1xuICAgIHJldHVybiB0aGlzOyAvLyBmb3IgY2hhaW5hYmxlIGNhbGxzXG4gIH0sXG5cbiAgLy8gUmVtb3ZlcyBhbGwgb2JqZWN0cyBpbiBjb250YWluZXJcbiAgZW1wdHk6IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICB0aGlzLmRlc3Ryb3koKTtcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgXG4gIC8vIE51bWJlciBvZiBjaGlsZHJlblxuICBzaXplOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdXRpbC5zaXplKHRoaXMuX2NvbnRhaW5lci5jaGlsZHJlbik7XG4gIH1cbiAgXG59O1xuIiwiXG4vKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICpcbiAqIF9ldmVudHMgQVBJIGFuZCBhdXhpbGlhcnkgZnVuY3Rpb25zIGZvciBoYW5kbGluZyBldmVudHNcbiAqXG4gKi9cblxudmFyICQgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5qUXVlcnkgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLmpRdWVyeSA6IG51bGwpLFxuICAgIFJPT1RfU0VMRUNUT1IgPSAnJic7IC8vIEFsc28gaW4gbXZjL3ZpZXcuanNcblxuLy8gUmV2ZXJzZXMgdGhlIG9yZGVyIG9mIGV2ZW50cyBhdHRhY2hlZCB0byBhbiBvYmplY3RcbmZ1bmN0aW9uIHJldmVyc2VFdmVudHMob2JqLCBldmVudFR5cGUpe1xuICB2YXIgZXZlbnRzID0gJChvYmopLmRhdGEoJ2V2ZW50cycpO1xuICBpZiAoZXZlbnRzICE9PSB1bmRlZmluZWQgJiYgZXZlbnRzW2V2ZW50VHlwZV0gIT09IHVuZGVmaW5lZCl7XG4gICAgLy8gY2FuJ3QgcmV2ZXJzZSB3aGF0J3Mgbm90IHRoZXJlXG4gICAgdmFyIHJldmVyc2VkRXZlbnRzID0gW107XG4gICAgZm9yICh2YXIgZSBpbiBldmVudHNbZXZlbnRUeXBlXSl7XG4gICAgICBpZiAoIWV2ZW50c1tldmVudFR5cGVdLmhhc093blByb3BlcnR5KGUpKSBjb250aW51ZTtcbiAgICAgIHJldmVyc2VkRXZlbnRzLnVuc2hpZnQoZXZlbnRzW2V2ZW50VHlwZV1bZV0pO1xuICAgIH1cbiAgICBldmVudHNbZXZlbnRUeXBlXSA9IHJldmVyc2VkRXZlbnRzO1xuICB9XG59IC8vcmV2ZXJzZUV2ZW50c1xuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gIC8vIFBhcnNlcyBldmVudCBzdHJpbmcgbGlrZTpcbiAgLy8gICAgJ2V2ZW50JyAgICAgICAgICA6IGN1c3RvbSBldmVudFxuICAvLyAgICAnZXZlbnQgc2VsZWN0b3InIDogRE9NIGV2ZW50IHVzaW5nICdzZWxlY3RvcidcbiAgLy8gUmV0dXJucyB7IHR5cGU6J2V2ZW50JyBbLCBzZWxlY3Rvcjonc2VsZWN0b3InXSB9XG4gIHBhcnNlRXZlbnRTdHI6IGZ1bmN0aW9uKGV2ZW50U3RyKXtcbiAgICB2YXIgZXZlbnRPYmogPSB7IHR5cGU6ZXZlbnRTdHIgfSwgXG4gICAgICAgIHNwYWNlUG9zID0gZXZlbnRTdHIuc2VhcmNoKC9cXHMvKTtcbiAgICAvLyBET00gZXZlbnQgJ2V2ZW50IHNlbGVjdG9yJywgZS5nLiAnY2xpY2sgYnV0dG9uJ1xuICAgIGlmIChzcGFjZVBvcyA+IC0xKSB7XG4gICAgICBldmVudE9iai50eXBlID0gZXZlbnRTdHIuc3Vic3RyKDAsIHNwYWNlUG9zKTtcbiAgICAgIGV2ZW50T2JqLnNlbGVjdG9yID0gZXZlbnRTdHIuc3Vic3RyKHNwYWNlUG9zKzEpO1xuICAgIH0gZWxzZSBpZiAoIGV2ZW50U3RyID09PSAnY2xpY2snIHx8IGV2ZW50U3RyID09PSAnc3VibWl0JyApIHtcbiAgICAgIC8vIEBleHRlbmQgU2hvcnRjdXQgZm9yICdjbGljayAmJyBhbmQgJ3N1Ym1pdCAmJ1xuICAgICAgZXZlbnRPYmoudHlwZSA9IGV2ZW50U3RyO1xuICAgICAgZXZlbnRPYmouc2VsZWN0b3IgPSBST09UX1NFTEVDVE9SO1xuICAgIH1cbiAgICByZXR1cm4gZXZlbnRPYmo7XG4gIH0sXG5cbiAgLy8gQmluZHMgZXZlbnRTdHIgdG8gZm4uIGV2ZW50U3RyIGlzIHBhcnNlZCBhcyBwZXIgcGFyc2VFdmVudFN0cigpXG4gIGJpbmQ6IGZ1bmN0aW9uKGV2ZW50U3RyLCBmbil7XG5cbiAgICB2YXIgZXZlbnRPYmogPSB0aGlzLl9ldmVudHMucGFyc2VFdmVudFN0cihldmVudFN0cik7XG5cbiAgICAvLyBET00gZXZlbnQgJ2V2ZW50IHNlbGVjdG9yJywgZS5nLiAnY2xpY2sgYnV0dG9uJ1xuICAgIGlmIChldmVudE9iai5zZWxlY3Rvcikge1xuXG4gICAgICAvLyBLZWVwIGNsaWNrIGFuZCBzdWJtaXQgbG9jYWxpemVkXG4gICAgICB2YXIgZm54ID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgZm4oZXZlbnQpO1xuICAgICAgICByZXR1cm4gZmFsc2U7IC8vIFByZXZlbnQgZGVmYXVsdCAmIGJ1YmJsaW5nXG4gICAgICAgIC8vIG9yIGp1c3QgZGVmYXVsdD8gaWYgKCAhIGV2ZW50LmlzRGVmYXVsdFByZXZlbnRlZCgpICkgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIH07XG5cbiAgICAgIC8vIE1hbnVhbGx5IG92ZXJyaWRlIHJvb3Qgc2VsZWN0b3IsIGFzIGpRdWVyeSBzZWxlY3RvcnMgY2FuJ3Qgc2VsZWN0IHNlbGYgb2JqZWN0XG4gICAgICBpZiAoZXZlbnRPYmouc2VsZWN0b3IgPT09IFJPT1RfU0VMRUNUT1IpIHtcblxuXG4gICAgICAgIGlmICggZXZlbnRPYmoudHlwZSA9PT0gJ2NsaWNrJyB8fCBldmVudE9iai50eXBlID09PSAnc3VibWl0JyApIHtcbiAgICAgICAgICB0aGlzLnZpZXcuJCgpLm9uKGV2ZW50T2JqLnR5cGUsIGZueCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy52aWV3LiQoKS5vbihldmVudE9iai50eXBlLCBmbik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBAZXh0ZW5kIFJlcGxhY2UgJCgpLmJpbmQgd2l0aCAkKCkub25cbiAgICAgICAgLy8gdGhpcy52aWV3LiQoKS5iaW5kKGV2ZW50T2JqLnR5cGUsIGZuKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuXG4gICAgICAgIGlmICggZXZlbnRPYmoudHlwZSA9PT0gJ2NsaWNrJyB8fCBldmVudE9iai50eXBlID09PSAnc3VibWl0JyApIHtcbiAgICAgICAgICB0aGlzLnZpZXcuJCgpLm9uKGV2ZW50T2JqLnR5cGUsIGV2ZW50T2JqLnNlbGVjdG9yLCBmbngpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMudmlldy4kKCkub24oZXZlbnRPYmoudHlwZSwgZXZlbnRPYmouc2VsZWN0b3IsIGZuKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEBleHRlbmQgUmVwbGFjZSAkKCkuZGVsZWdhdGUgd2l0aCAkKCkub25cbiAgICAgICAgLy8gdGhpcy52aWV3LiQoKS5kZWxlZ2F0ZShldmVudE9iai5zZWxlY3RvciwgZXZlbnRPYmoudHlwZSwgZm4pO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBDdXN0b20gZXZlbnRcbiAgICBlbHNlIHtcblxuICAgICAgLy8gQGV4dGVuZCBSZXBsYWNlICQoKS5iaW5kIHdpdGggJCgpLm9uXG4gICAgICAkKHRoaXMuX2V2ZW50cy5kYXRhKS5vbihldmVudE9iai50eXBlLCBmbik7XG4gICAgICAvLyAkKHRoaXMuX2V2ZW50cy5kYXRhKS5iaW5kKGV2ZW50T2JqLnR5cGUsIGZuKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7IC8vIGZvciBjaGFpbmFibGUgY2FsbHNcbiAgfSwgLy8gYmluZFxuXG5cbiAgLy8gVHJpZ2dlcnMgZXZlbnRTdHIuIFN5bnRheCBmb3IgZXZlbnRTdHIgaXMgc2FtZSBhcyB0aGF0IGZvciBiaW5kKClcbiAgdHJpZ2dlcjogZnVuY3Rpb24oZXZlbnRTdHIsIHBhcmFtcyl7XG4gICAgdmFyIGV2ZW50T2JqID0gdGhpcy5fZXZlbnRzLnBhcnNlRXZlbnRTdHIoZXZlbnRTdHIpO1xuICAgIC8vIERPTSBldmVudCAnZXZlbnQgc2VsZWN0b3InLCBlLmcuICdjbGljayBidXR0b24nXG4gICAgaWYgKGV2ZW50T2JqLnNlbGVjdG9yKSB7XG4gICAgICAvLyBNYW51YWxseSBvdmVycmlkZSByb290IHNlbGVjdG9yLCBhcyBqUXVlcnkgc2VsZWN0b3JzIGNhbid0IHNlbGVjdCBzZWxmIG9iamVjdFxuICAgICAgaWYgKGV2ZW50T2JqLnNlbGVjdG9yID09PSBST09UX1NFTEVDVE9SKSB7XG4gICAgICAgIHRoaXMudmlldy4kKCkudHJpZ2dlcihldmVudE9iai50eXBlLCBwYXJhbXMpO1xuICAgICAgfVxuICAgICAgZWxzZSB7ICAgICAgICAgIFxuICAgICAgICB0aGlzLnZpZXcuJCgpLmZpbmQoZXZlbnRPYmouc2VsZWN0b3IpLnRyaWdnZXIoZXZlbnRPYmoudHlwZSwgcGFyYW1zKTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gQ3VzdG9tIGV2ZW50XG4gICAgZWxzZSB7XG4gICAgICAkKHRoaXMuX2V2ZW50cy5kYXRhKS50cmlnZ2VyKCdfJytldmVudE9iai50eXBlLCBwYXJhbXMpO1xuICAgICAgLy8gZmlyZSAncHJlJyBob29rcyBpbiByZXZlcnNlIGF0dGFjaG1lbnQgb3JkZXIgKCBsYXN0IGZpcnN0ICkgdGhlbiBwdXQgdGhlbSBiYWNrXG4gICAgICByZXZlcnNlRXZlbnRzKHRoaXMuX2V2ZW50cy5kYXRhLCAncHJlOicgKyBldmVudE9iai50eXBlKTtcbiAgICAgICQodGhpcy5fZXZlbnRzLmRhdGEpLnRyaWdnZXIoJ3ByZTonICsgZXZlbnRPYmoudHlwZSwgcGFyYW1zKTtcbiAgICAgIHJldmVyc2VFdmVudHModGhpcy5fZXZlbnRzLmRhdGEsICdwcmU6JyArIGV2ZW50T2JqLnR5cGUpO1xuXG4gICAgICAkKHRoaXMuX2V2ZW50cy5kYXRhKS50cmlnZ2VyKGV2ZW50T2JqLnR5cGUsIHBhcmFtcyk7XG5cbiAgICAgIC8vIFRyaWdnZXIgZXZlbnQgZm9yIHBhcmVudFxuICAgICAgaWYgKHRoaXMucGFyZW50KCkpXG4gICAgICAgIHRoaXMucGFyZW50KCkudHJpZ2dlcigoZXZlbnRPYmoudHlwZS5tYXRjaCgvXmNoaWxkOi8pID8gJycgOiAnY2hpbGQ6JykgKyBldmVudE9iai50eXBlLCBwYXJhbXMpO1xuICAgICAgJCh0aGlzLl9ldmVudHMuZGF0YSkudHJpZ2dlcigncG9zdDonICsgZXZlbnRPYmoudHlwZSwgcGFyYW1zKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7IC8vIGZvciBjaGFpbmFibGUgY2FsbHNcbiAgfSAvLyB0cmlnZ2VyXG4gIFxufTtcbiIsIlxuLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqXG4gKiBFeHRlbmRlZCBzaG9ydGN1dHNcbiAqXG4gKi9cblxudmFyICQgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5qUXVlcnkgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLmpRdWVyeSA6IG51bGwpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICBnZXQgOiBmdW5jdGlvbiggYXJnICkge1xuICAgIHRoaXMubW9kZWwuZ2V0KCBhcmcgKTtcbiAgfSxcblxuICBzZXQgOiBmdW5jdGlvbiggYXJnLCBwYXJhbXMsIHRoaXJkICkge1xuICAgIHRoaXMubW9kZWwuc2V0KCBhcmcsIHBhcmFtcywgdGhpcmQgICk7XG4gIH0sXG5cbiAgcmVwbGFjZTogZnVuY3Rpb24oIG9iaiwgc2VsZWN0b3IgKXtcbiAgICBpZiAoIHR5cGVvZiBzZWxlY3RvciA9PT0gJ3N0cmluZycgKSB7XG4gICAgICB0aGlzLnZpZXcuJChzZWxlY3RvcikuaHRtbCgnJyk7XG4gICAgfVxuICAgIHRoaXMuZW1wdHkoKS5fY29udGFpbmVyLmFwcGVuZC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIHJldHVybiB0aGlzOyAvLyBmb3IgY2hhaW5hYmxlIGNhbGxzXG4gIH0sXG5cbiAgLy8gUmV0dXJuIG50aCBjaGlsZCBvYmplY3RcbiAgY2hpbGQ6IGZ1bmN0aW9uKG4pe1xuICAgIHZhciBpID0gMDtcbiAgICBuID0gbiB8fCAwO1xuXG4gICAgZm9yICh2YXIgaiBpbiB0aGlzLl9jb250YWluZXIuY2hpbGRyZW4pIHtcbiAgICAgIGlmICggdGhpcy5fY29udGFpbmVyLmNoaWxkcmVuLmhhc093blByb3BlcnR5KGopICkge1xuICAgICAgICBpZiAoIGkgPT0gbiApXG4gICAgICAgICAgcmV0dXJuIHRoaXMuX2NvbnRhaW5lci5jaGlsZHJlbltqXTtcbiAgICAgICAgZWxzZSBpZiAoIGkgPiBuIClcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG5cbiAgICAgICAgaSsrOyAvLyBDb250aW51ZSBzZWFyY2hpbmdcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9LFxuXG4gIC8vIFJldHVybiBhbGwgY2hpbGQgb2JqZWN0c1xuICBjaGlsZHJlbjogZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gdGhpcy5fY29udGFpbmVyLmNoaWxkcmVuOyAvLyB7IGlkOiBjaGlsZCwgLi4gfVxuICB9LFxuXG4gIC8vIFJlcGxhY2UgY2hpbGRyZW4gbW9kZWxzIC0gYXBwZW5kIGlmIHRoZXJlJ3MgbW9yZSwgZGVzdHJveSBpZiBsZXNzXG4gIGxvYWQ6IGZ1bmN0aW9uKCBwcm90bywgbW9kZWxzLCBzZWxlY3RvciApIHtcblxuICAgIHZhciBzZWxmID0gdGhpcyxcbiAgICAgICAgbWF4TW9kZWxzID0gbW9kZWxzLmxlbmd0aCxcbiAgICAgICAgbWF4Q2hpbGRyZW4gPSB0aGlzLnNpemUoKTtcblxuICAgICQuZWFjaChtb2RlbHMsIGZ1bmN0aW9uKGluZGV4LCBtb2RlbCkge1xuICAgICAgaWYgKCBzZWxmLmNoaWxkKGluZGV4KSApIHtcbiAgICAgICAgc2VsZi5jaGlsZChpbmRleCkubW9kZWwuc2V0KCBtb2RlbCApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gJCQgbm90IGRlZmluZWQgeWV0P1xuICAgICAgICBzZWxmLmFwcGVuZCggJCQoIHByb3RvLCBtb2RlbCApLCBzZWxlY3RvciApO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKG1heENoaWxkcmVuID4gbWF4TW9kZWxzKSB7XG4gICAgICBmb3IgKHZhciBpID0gbWF4TW9kZWxzOyBpIDwgbWF4Q2hpbGRyZW47IGkrKykge1xuICAgICAgICAvLyBDaGlsZCdzIGluZGV4IHN0YXlzIHRoZSBzYW1lLCBzaW5jZSBlYWNoIG9uZSBpcyBkZXN0cm95ZWRcbiAgICAgICAgc2VsZi5jaGlsZChtYXhNb2RlbHMpLmRlc3Ryb3koKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG59O1xuIiwiXG4vKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICpcbiAqIEZvcm0gaGVscGVyc1xuICpcbiAqL1xuXG52YXIgJCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LmpRdWVyeSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwualF1ZXJ5IDogbnVsbCk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gIGZvcm0gOiB7XG5cbiAgICAvLyBDbGVhciB0aGUgZm9ybVxuICAgIGNsZWFyIDogZnVuY3Rpb24oKSB7XG5cbiAgICAgIHJldHVybiB0aGlzLiR2aWV3LmZpbmQoJzppbnB1dCcpXG4gICAgICAgIC5ub3QoJzpidXR0b24sIDpzdWJtaXQsIDpyZXNldCwgOmhpZGRlbicpLnJlbW92ZUF0dHIoJ2NoZWNrZWQnKS5yZW1vdmVBdHRyKCdzZWxlY3RlZCcpXG4gICAgICAgIC5ub3QoJzpjaGVja2JveCwgOnJhZGlvLCBzZWxlY3QnKS52YWwoJycpO1xuICAgIH0sXG5cbiAgICAvLyBWYWxpZGF0ZSBtb2RlbCwgaW5zdGVhZCBvZiBmb3JtIGluIHRoZSBET00gZGlyZWN0bHlcbiAgICAvLyBAcmV0dXJuIEFuIGFycmF5IG9mIGludmFsaWQgbW9kZWwgcHJvcGVydGllc1xuICAgIGludmFsaWQgOiBmdW5jdGlvbigpIHtcblxuICAgICAgcmV0dXJuIHRoaXMubW9kZWwuaW52YWxpZCgpO1xuICAgIH1cbiAgfVxuXG59O1xuXG4iLCJcbi8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKlxuICogQ29uc3RydWN0IGRlZmF1bHQgb2JqZWN0IHByb3RvdHlwZVxuICpcbiAqL1xuXG52YXIgJCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LmpRdWVyeSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwualF1ZXJ5IDogbnVsbCksXG5cbiAgICBkZWZhdWx0UHJvdG90eXBlID0ge1xuXG4gICAgICBfYWdpbGl0eTogdHJ1ZSxcbiAgICAgIF9jb250YWluZXI6IHJlcXVpcmUoJy4vY29udGFpbmVyJyksXG4gICAgICBfZXZlbnRzOiByZXF1aXJlKCcuL2V2ZW50cycpLFxuXG4gICAgICAkbm9kZToge30sIC8vIE1hcCBvZiBtb2RlbCBwcm9wZXJ0aWVzIC0+IGJvdW5kIGVsZW1lbnRzXG4gICAgICBrZXk6IHt9LCAvLyBNYXAgb2YgZWxlbWVudHMgLT4gYm91bmQgbW9kZWwgcHJvcGVydGllc1xuICAgICAgcmVxdWlyZWQ6IHt9LCAvLyBNYXAgb2YgcmVxdWlyZWQgbW9kZWwgcHJvcGVydGllcyBhbmQgcmVxdWlyZSB0eXBlc1xuXG4gICAgICBtb2RlbDogcmVxdWlyZSgnLi4vbXZjL21vZGVsJyksXG4gICAgICB2aWV3OiByZXF1aXJlKCcuLi9tdmMvdmlldycpLFxuICAgICAgY29udHJvbGxlcjogcmVxdWlyZSgnLi4vbXZjL2NvbnRyb2xsZXInKVxuXG4gICAgfSxcblxuICAgIHNob3J0Y3V0cyA9IHJlcXVpcmUoJy4vc2hvcnRjdXRzJyksXG4gICAgZXh0ZW5kID0gcmVxdWlyZSgnLi9leHRlbmQnKSxcbiAgICBmb3JtID0gcmVxdWlyZSgnLi9mb3JtJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gJC5leHRlbmQoZGVmYXVsdFByb3RvdHlwZSwgc2hvcnRjdXRzLCBleHRlbmQsIGZvcm0pO1xuIiwiXG4vKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICpcbiAqIE9iamVjdCBzaG9ydGN1dHNcbiAqXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgZGVzdHJveTogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy50cmlnZ2VyKCdkZXN0cm95JywgdGhpcy5faWQpOyAvLyBwYXJlbnQgbXVzdCBsaXN0ZW4gdG8gJ3JlbW92ZScgZXZlbnQgYW5kIGhhbmRsZSBjb250YWluZXIgcmVtb3ZhbCFcbiAgICAvLyBjYW4ndCByZXR1cm4gdGhpcyBhcyBpdCBtaWdodCBub3QgZXhpc3QgYW55bW9yZSFcbiAgfSxcbiAgcGFyZW50OiBmdW5jdGlvbigpe1xuICAgIHJldHVybiB0aGlzLl9wYXJlbnQ7XG4gIH0sXG4gIFxuICAvL1xuICAvLyBfY29udGFpbmVyIHNob3J0Y3V0c1xuICAvL1xuICBhcHBlbmQ6IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5fY29udGFpbmVyLmFwcGVuZC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIHJldHVybiB0aGlzOyAvLyBmb3IgY2hhaW5hYmxlIGNhbGxzXG4gIH0sXG4gIHByZXBlbmQ6IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5fY29udGFpbmVyLnByZXBlbmQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICByZXR1cm4gdGhpczsgLy8gZm9yIGNoYWluYWJsZSBjYWxsc1xuICB9LFxuICBhZnRlcjogZnVuY3Rpb24oKXtcbiAgICB0aGlzLl9jb250YWluZXIuYWZ0ZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICByZXR1cm4gdGhpczsgLy8gZm9yIGNoYWluYWJsZSBjYWxsc1xuICB9LFxuICBiZWZvcmU6IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5fY29udGFpbmVyLmJlZm9yZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIHJldHVybiB0aGlzOyAvLyBmb3IgY2hhaW5hYmxlIGNhbGxzXG4gIH0sXG4gIHJlbW92ZTogZnVuY3Rpb24oKXtcbiAgICB0aGlzLl9jb250YWluZXIucmVtb3ZlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgcmV0dXJuIHRoaXM7IC8vIGZvciBjaGFpbmFibGUgY2FsbHNcbiAgfSxcbiAgc2l6ZTogZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gdGhpcy5fY29udGFpbmVyLnNpemUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfSxcbiAgZWFjaDogZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gdGhpcy5fY29udGFpbmVyLmVhY2guYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfSxcbiAgZW1wdHk6IGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIHRoaXMuX2NvbnRhaW5lci5lbXB0eS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9LFxuXG4gIC8vXG4gIC8vIF9ldmVudHMgc2hvcnRjdXRzXG4gIC8vXG4gIGJpbmQ6IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5fZXZlbnRzLmJpbmQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICByZXR1cm4gdGhpczsgLy8gZm9yIGNoYWluYWJsZSBjYWxsc1xuICB9LFxuICBvbjogZnVuY3Rpb24oKXsgLy8gQWxpYXNcbiAgICB0aGlzLl9ldmVudHMuYmluZC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIHJldHVybiB0aGlzOyAvLyBmb3IgY2hhaW5hYmxlIGNhbGxzXG4gIH0sXG4gIHRyaWdnZXI6IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5fZXZlbnRzLnRyaWdnZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICByZXR1cm4gdGhpczsgLy8gZm9yIGNoYWluYWJsZSBjYWxsc1xuICB9LFxuXG59O1xuIiwiXG4vKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICpcbiAqIFNoaW0gZm9yOiBPYmplY3QuY3JlYXRlIGFuZCBPYmplY3QuZ2V0UHJvdG90eXBlT2ZcbiAqXG4gKi9cblxuXG4vKmpzbGludCBwcm90bzogdHJ1ZSAqL1xuXG4vLyBNb2RpZmllZCBmcm9tIERvdWdsYXMgQ3JvY2tmb3JkJ3MgT2JqZWN0LmNyZWF0ZSgpXG4vLyBUaGUgY29uZGl0aW9uIGJlbG93IGVuc3VyZXMgd2Ugb3ZlcnJpZGUgb3RoZXIgbWFudWFsIGltcGxlbWVudGF0aW9uc1xuaWYgKCFPYmplY3QuY3JlYXRlIHx8IE9iamVjdC5jcmVhdGUudG9TdHJpbmcoKS5zZWFyY2goL25hdGl2ZSBjb2RlL2kpPDApIHtcbiAgT2JqZWN0LmNyZWF0ZSA9IGZ1bmN0aW9uKG9iail7XG4gICAgdmFyIEF1eCA9IGZ1bmN0aW9uKCl7fTtcbiAgICAkLmV4dGVuZChBdXgucHJvdG90eXBlLCBvYmopOyAvLyBzaW1wbHkgc2V0dGluZyBBdXgucHJvdG90eXBlID0gb2JqIHNvbWVob3cgbWVzc2VzIHdpdGggY29uc3RydWN0b3IsIHNvIGdldFByb3RvdHlwZU9mIHdvdWxkbid0IHdvcmsgaW4gSUVcbiAgICByZXR1cm4gbmV3IEF1eCgpO1xuICB9O1xufVxuXG4vLyBNb2RpZmllZCBmcm9tIEpvaG4gUmVzaWcncyBPYmplY3QuZ2V0UHJvdG90eXBlT2YoKVxuLy8gVGhlIGNvbmRpdGlvbiBiZWxvdyBlbnN1cmVzIHdlIG92ZXJyaWRlIG90aGVyIG1hbnVhbCBpbXBsZW1lbnRhdGlvbnNcbmlmICghT2JqZWN0LmdldFByb3RvdHlwZU9mIHx8IE9iamVjdC5nZXRQcm90b3R5cGVPZi50b1N0cmluZygpLnNlYXJjaCgvbmF0aXZlIGNvZGUvaSk8MCkge1xuICBpZiAoIHR5cGVvZiBcInRlc3RcIi5fX3Byb3RvX18gPT09IFwib2JqZWN0XCIgKSB7XG4gICAgT2JqZWN0LmdldFByb3RvdHlwZU9mID0gZnVuY3Rpb24ob2JqZWN0KXtcbiAgICAgIHJldHVybiBvYmplY3QuX19wcm90b19fO1xuICAgIH07XG4gIH0gZWxzZSB7XG4gICAgT2JqZWN0LmdldFByb3RvdHlwZU9mID0gZnVuY3Rpb24ob2JqZWN0KXtcbiAgICAgIC8vIE1heSBicmVhayBpZiB0aGUgY29uc3RydWN0b3IgaGFzIGJlZW4gdGFtcGVyZWQgd2l0aFxuICAgICAgcmV0dXJuIG9iamVjdC5jb25zdHJ1Y3Rvci5wcm90b3R5cGU7XG4gICAgfTtcbiAgfVxufVxuIiwiLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqXG4gKiBUaW1lZCBmdW5jdGlvbnNcbiAqXG4gKi9cblxudmFyICQgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5qUXVlcnkgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLmpRdWVyeSA6IG51bGwpO1xuXG52YXIgdGltZXJzID0ge30sXG4gICAgZGVmYXVsdEludGVydmFsID0gMTAwMDA7XG5cbiQuZm4udGltZWRDbGFzcyA9IGZ1bmN0aW9uKCBjbGFzc05hbWUsIGR1cmF0aW9uICkge1xuXG4gIHZhciAkc2VsZiA9ICQodGhpcyk7XG5cbiAgcmV0dXJuICQodGhpcykudGltZWRGbihcbiAgICBmdW5jdGlvbigpeyAkc2VsZi5hZGRDbGFzcyggY2xhc3NOYW1lICk7IH0sXG4gICAgZnVuY3Rpb24oKXsgJHNlbGYucmVtb3ZlQ2xhc3MoIGNsYXNzTmFtZSApOyB9LFxuICAgIGR1cmF0aW9uIHx8IGRlZmF1bHRJbnRlcnZhbFxuICApO1xufTtcblxuJC5mbi50aW1lZFRleHQgPSBmdW5jdGlvbiggdHh0LCBkdXJhdGlvbiApIHtcblxuICB2YXIgJHNlbGYgPSAkKHRoaXMpO1xuXG4gIHJldHVybiAkKHRoaXMpLnRpbWVkRm4oXG4gICAgZnVuY3Rpb24oKXsgJHNlbGYudGV4dCggdHh0ICk7IH0sXG4gICAgZnVuY3Rpb24oKXsgJHNlbGYudGV4dCgnJyk7IH0sXG4gICAgZHVyYXRpb24gfHwgZGVmYXVsdEludGVydmFsXG4gICk7XG59O1xuXG4kLmZuLnRpbWVkRm4gPSBmdW5jdGlvbiggaWQsIHN0YXJ0LCBlbmQsIGR1cmF0aW9uICkge1xuXG4gIGR1cmF0aW9uID0gZHVyYXRpb24gfHwgZGVmYXVsdEludGVydmFsO1xuXG4gIC8vIElEIHNraXBwZWRcbiAgaWYgKCB0eXBlb2YgaWQgPT09ICdmdW5jdGlvbicgKSB7XG5cbiAgICBkdXJhdGlvbiA9IGVuZCB8fCBkdXJhdGlvbjtcbiAgICBlbmQgPSBzdGFydDtcbiAgICBzdGFydCA9IGlkO1xuXG4gICAgbmV3IFRpbWVyKGZ1bmN0aW9uKCl7XG4gICAgICBlbmQoKTtcbiAgICB9LCBkdXJhdGlvbiApO1xuXG4gICAgcmV0dXJuIHN0YXJ0KCk7XG5cbiAgLy8gSWYgdGltZXIgSUQgaXMgc2V0IGFuZCBvbmUgaXMgYWxyZWFkeSBnb2luZywgYWRkIHRvIHRoZSBkdXJhdGlvblxuICB9IGVsc2UgaWYgKCB0eXBlb2YgdGltZXJzW2lkXSAhPT0gJ3VuZGVmaW5lZCcgJiYgISB0aW1lcnNbaWRdLmZpbmlzaGVkICkge1xuXG4gICAgdGltZXJzW2lkXS5hZGQoIGR1cmF0aW9uICk7XG5cbiAgfSBlbHNlIHtcblxuICAgIHRpbWVyc1tpZF0gPSBuZXcgVGltZXIoZnVuY3Rpb24oKXtcbiAgICAgIGVuZCgpO1xuICAgIH0sIGR1cmF0aW9uICk7XG5cbiAgICByZXR1cm4gc3RhcnQoKTtcbiAgfVxufTtcblxuXG5mdW5jdGlvbiBUaW1lcihjYWxsYmFjaywgdGltZSkge1xuICAgIHRoaXMuc2V0VGltZW91dChjYWxsYmFjaywgdGltZSk7XG59XG5cblRpbWVyLnByb3RvdHlwZS5zZXRUaW1lb3V0ID0gZnVuY3Rpb24oY2FsbGJhY2ssIHRpbWUpIHtcblxuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHRoaXMuZmluaXNoZWQgPSBmYWxzZTtcbiAgICB0aGlzLmNhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgdGhpcy50aW1lID0gdGltZTtcblxuICAgIGlmKHRoaXMudGltZXIpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMudGltZXIpO1xuICAgIH1cbiAgICB0aGlzLnRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIHNlbGYuZmluaXNoZWQgPSB0cnVlO1xuICAgICAgc2VsZi5jYWxsYmFjaygpO1xuICAgIH0sIHRpbWUpO1xuICAgIHRoaXMuc3RhcnQgPSBEYXRlLm5vdygpO1xufTtcblxuVGltZXIucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uKHRpbWUpIHtcbiAgIGlmKCF0aGlzLmZpbmlzaGVkKSB7XG4gICAgICAgLy8gYWRkIHRpbWUgdG8gdGltZSBsZWZ0XG4gICAgICAgdGltZSA9IHRoaXMudGltZSAtIChEYXRlLm5vdygpIC0gdGhpcy5zdGFydCkgKyB0aW1lO1xuICAgICAgIHRoaXMuc2V0VGltZW91dCh0aGlzLmNhbGxiYWNrLCB0aW1lKTtcbiAgIH1cbn07XG4iLCJcbi8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKlxuICogdXRpbC4qXG4gKlxuICogaXNBZ2lsaXR5XG4gKiBwcm94eUFsbFxuICogcmV2ZXJzZUV2ZW50c1xuICogc2l6ZVxuICogZXh0ZW5kQ29udHJvbGxlclxuICpcbiAqICQub3V0ZXJIVE1MXG4gKiAkLmlzRW1wdHlcbiAqIFxuICovXG5cbi8qanNsaW50IGxvb3BmdW5jOiB0cnVlICovXG5cbnZhciB1dGlsID0ge30sXG4gICAgJCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LmpRdWVyeSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwualF1ZXJ5IDogbnVsbCk7XG5cbi8vIENoZWNrcyBpZiBwcm92aWRlZCBvYmogaXMgYW4gYWdpbGl0eSBvYmplY3RcbnV0aWwuaXNBZ2lsaXR5ID0gZnVuY3Rpb24ob2JqKXtcbiByZXR1cm4gb2JqLl9hZ2lsaXR5ID09PSB0cnVlO1xufTtcblxuLy8gU2NhbnMgb2JqZWN0IGZvciBmdW5jdGlvbnMgKGRlcHRoPTIpIGFuZCBwcm94aWVzIHRoZWlyICd0aGlzJyB0byBkZXN0LlxuLy8gKiBUbyBlbnN1cmUgaXQgd29ya3Mgd2l0aCBwcmV2aW91c2x5IHByb3hpZWQgb2JqZWN0cywgd2Ugc2F2ZSB0aGUgb3JpZ2luYWwgZnVuY3Rpb24gYXMgXG4vLyAgIGEgJy5fcHJlUHJveHknIG1ldGhvZCBhbmQgd2hlbiBhdmFpbGFibGUgYWx3YXlzIHVzZSB0aGF0IGFzIHRoZSBwcm94eSBzb3VyY2UuXG4vLyAqIFRvIHNraXAgYSBnaXZlbiBtZXRob2QsIGNyZWF0ZSBhIHN1Yi1tZXRob2QgY2FsbGVkICdfbm9Qcm94eScuXG51dGlsLnByb3h5QWxsID0gZnVuY3Rpb24ob2JqLCBkZXN0KXtcbiAgaWYgKCFvYmogfHwgIWRlc3QpIHtcbiAgICB0aHJvdyBcImFnaWxpdHkuanM6IHV0aWwucHJveHlBbGwgbmVlZHMgdHdvIGFyZ3VtZW50c1wiO1xuICB9XG4gIGZvciAodmFyIGF0dHIxIGluIG9iaikge1xuICAgIHZhciBwcm94aWVkID0gb2JqW2F0dHIxXTtcbiAgICAvLyBQcm94eSByb290IG1ldGhvZHNcbiAgICBpZiAodHlwZW9mIG9ialthdHRyMV0gPT09ICdmdW5jdGlvbicgKSB7XG5cbiAgICAgIHByb3hpZWQgPSBvYmpbYXR0cjFdLl9ub1Byb3h5ID8gb2JqW2F0dHIxXSA6ICQucHJveHkob2JqW2F0dHIxXS5fcHJlUHJveHkgfHwgb2JqW2F0dHIxXSwgZGVzdCk7XG4gICAgICBwcm94aWVkLl9wcmVQcm94eSA9IG9ialthdHRyMV0uX25vUHJveHkgPyB1bmRlZmluZWQgOiAob2JqW2F0dHIxXS5fcHJlUHJveHkgfHwgb2JqW2F0dHIxXSk7IC8vIHNhdmUgb3JpZ2luYWxcbiAgICAgIG9ialthdHRyMV0gPSBwcm94aWVkO1xuXG4gICAgfVxuICAgIC8vIFByb3h5IHN1Yi1tZXRob2RzIChtb2RlbC4qLCB2aWV3LiosIGV0YykgLS0gZXhjZXB0IGZvciBqUXVlcnkgb2JqZWN0XG4gICAgZWxzZSBpZiAodHlwZW9mIG9ialthdHRyMV0gPT09ICdvYmplY3QnICYmICEob2JqW2F0dHIxXSBpbnN0YW5jZW9mIGpRdWVyeSkgKSB7XG4gICAgICBmb3IgKHZhciBhdHRyMiBpbiBvYmpbYXR0cjFdKSB7XG4gICAgICAgIHZhciBwcm94aWVkMiA9IG9ialthdHRyMV1bYXR0cjJdO1xuICAgICAgICBpZiAodHlwZW9mIG9ialthdHRyMV1bYXR0cjJdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgcHJveGllZDIgPSBvYmpbYXR0cjFdW2F0dHIyXS5fbm9Qcm94eSA/IG9ialthdHRyMV1bYXR0cjJdIDogJC5wcm94eShvYmpbYXR0cjFdW2F0dHIyXS5fcHJlUHJveHkgfHwgb2JqW2F0dHIxXVthdHRyMl0sIGRlc3QpO1xuICAgICAgICAgIHByb3hpZWQyLl9wcmVQcm94eSA9IG9ialthdHRyMV1bYXR0cjJdLl9ub1Byb3h5ID8gdW5kZWZpbmVkIDogKG9ialthdHRyMV1bYXR0cjJdLl9wcmVQcm94eSB8fCBvYmpbYXR0cjFdW2F0dHIyXSk7IC8vIHNhdmUgb3JpZ2luYWxcbiAgICAgICAgICBwcm94aWVkW2F0dHIyXSA9IHByb3hpZWQyO1xuICAgICAgICB9XG4gICAgICB9IC8vIGZvciBhdHRyMlxuICAgICAgb2JqW2F0dHIxXSA9IHByb3hpZWQ7XG4gICAgfSAvLyBpZiBub3QgZnVuY1xuICB9IC8vIGZvciBhdHRyMVxufTsgLy8gcHJveHlBbGxcblxuXG4vLyBEZXRlcm1pbmVzICMgb2YgYXR0cmlidXRlcyBvZiBnaXZlbiBvYmplY3QgKHByb3RvdHlwZSBpbmNsdXNpdmUpXG51dGlsLnNpemUgPSBmdW5jdGlvbihvYmope1xuICB2YXIgc2l6ZSA9IDAsIGtleTtcbiAgZm9yIChrZXkgaW4gb2JqKSB7XG4gICAgc2l6ZSsrO1xuICB9XG4gIHJldHVybiBzaXplO1xufTtcblxuLy8gRmluZCBjb250cm9sbGVycyB0byBiZSBleHRlbmRlZCAod2l0aCBzeW50YXggJ34nKSwgcmVkZWZpbmUgdGhvc2UgdG8gZW5jb21wYXNzIHByZXZpb3VzbHkgZGVmaW5lZCBjb250cm9sbGVyc1xuLy8gRXhhbXBsZTpcbi8vICAgdmFyIGEgPSAkJCh7fSwgJzxidXR0b24+QTwvYnV0dG9uPicsIHsnY2xpY2sgJic6IGZ1bmN0aW9uKCl7IGFsZXJ0KCdBJyk7IH19KTtcbi8vICAgdmFyIGIgPSAkJChhLCB7fSwgJzxidXR0b24+QjwvYnV0dG9uPicsIHsnfmNsaWNrICYnOiBmdW5jdGlvbigpeyBhbGVydCgnQicpOyB9fSk7XG4vLyBDbGlja2luZyBvbiBidXR0b24gQiB3aWxsIGFsZXJ0IGJvdGggJ0EnIGFuZCAnQicuXG51dGlsLmV4dGVuZENvbnRyb2xsZXIgPSBmdW5jdGlvbihvYmplY3QpIHtcbiAgZm9yICh2YXIgY29udHJvbGxlck5hbWUgaW4gb2JqZWN0LmNvbnRyb2xsZXIpIHtcblxuICAgIC8vIG5ldyBzY29wZSBhcyB3ZSBuZWVkIG9uZSBuZXcgZnVuY3Rpb24gaGFuZGxlciBwZXIgY29udHJvbGxlclxuICAgIChmdW5jdGlvbigpe1xuICAgICAgdmFyIG1hdGNoZXMsIGV4dGVuZCwgZXZlbnROYW1lLFxuICAgICAgICAgIHByZXZpb3VzSGFuZGxlciwgY3VycmVudEhhbmRsZXIsIG5ld0hhbmRsZXI7XG5cbiAgICAgIGlmICh0eXBlb2Ygb2JqZWN0LmNvbnRyb2xsZXJbY29udHJvbGxlck5hbWVdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIG1hdGNoZXMgPSBjb250cm9sbGVyTmFtZS5tYXRjaCgvXihcXH4pKiguKykvKTsgLy8gJ2NsaWNrIGJ1dHRvbicsICd+Y2xpY2sgYnV0dG9uJywgJ19jcmVhdGUnLCBldGNcbiAgICAgICAgZXh0ZW5kID0gbWF0Y2hlc1sxXTtcbiAgICAgICAgZXZlbnROYW1lID0gbWF0Y2hlc1syXTtcbiAgICAgIFxuICAgICAgICBpZiAoIWV4dGVuZCkgcmV0dXJuOyAvLyBub3RoaW5nIHRvIGRvXG5cbiAgICAgICAgLy8gUmVkZWZpbmUgY29udHJvbGxlcjpcbiAgICAgICAgLy8gJ35jbGljayBidXR0b24nIC0tLT4gJ2NsaWNrIGJ1dHRvbicgPSBwcmV2aW91c0hhbmRsZXIgKyBjdXJyZW50SGFuZGxlclxuICAgICAgICBwcmV2aW91c0hhbmRsZXIgPSBvYmplY3QuY29udHJvbGxlcltldmVudE5hbWVdID8gKG9iamVjdC5jb250cm9sbGVyW2V2ZW50TmFtZV0uX3ByZVByb3h5IHx8IG9iamVjdC5jb250cm9sbGVyW2V2ZW50TmFtZV0pIDogdW5kZWZpbmVkO1xuICAgICAgICBjdXJyZW50SGFuZGxlciA9IG9iamVjdC5jb250cm9sbGVyW2NvbnRyb2xsZXJOYW1lXTtcbiAgICAgICAgbmV3SGFuZGxlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmIChwcmV2aW91c0hhbmRsZXIpIHByZXZpb3VzSGFuZGxlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICAgIGlmIChjdXJyZW50SGFuZGxlcikgY3VycmVudEhhbmRsZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgfTtcblxuICAgICAgICBvYmplY3QuY29udHJvbGxlcltldmVudE5hbWVdID0gbmV3SGFuZGxlcjtcbiAgICAgICAgZGVsZXRlIG9iamVjdC5jb250cm9sbGVyW2NvbnRyb2xsZXJOYW1lXTsgLy8gZGVsZXRlICd+Y2xpY2sgYnV0dG9uJ1xuICAgICAgfSAvLyBpZiBmdW5jdGlvblxuICAgIH0pKCk7XG4gIH0gLy8gZm9yIGNvbnRyb2xsZXJOYW1lXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHV0aWw7XG5cblxuLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqXG4gKiBqUXVlcnkgdXRpbGl0eSBmdW5jdGlvbnNcbiAqXG4gKi9cblxuLy8gR2V0IGVsZW1lbnQgaW5jbHVkaW5nIHdyYXBwaW5nIHRhZ1xud2luZG93LmpRdWVyeS5mbi5vdXRlckhUTUwgPSBmdW5jdGlvbihzKSB7XG4gIGlmIChzKSB7XG4gICAgcmV0dXJuIHRoaXMuYmVmb3JlKHMpLnJlbW92ZSgpO1xuICB9IGVsc2Uge1xuICAgIHZhciBkb2MgPSB0aGlzWzBdID8gdGhpc1swXS5vd25lckRvY3VtZW50IDogZG9jdW1lbnQ7XG4gICAgcmV0dXJuIGpRdWVyeSgnPGRpdj4nLCBkb2MpLmFwcGVuZCh0aGlzLmVxKDApLmNsb25lKCkpLmh0bWwoKTtcbiAgfVxufTtcblxud2luZG93LmpRdWVyeS5pc0VtcHR5ID0gZnVuY3Rpb24oIGRhdGEgKSB7XG5cbiAgaWYodHlwZW9mKGRhdGEpID09ICdudW1iZXInIHx8IHR5cGVvZihkYXRhKSA9PSAnYm9vbGVhbicpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYodHlwZW9mKGRhdGEpID09ICd1bmRlZmluZWQnIHx8IGRhdGEgPT09IG51bGwpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICBpZih0eXBlb2YoZGF0YS5sZW5ndGgpICE9ICd1bmRlZmluZWQnKSB7XG4gICAgcmV0dXJuIGRhdGEubGVuZ3RoID09IDA7XG4gIH1cblxuICB2YXIgY291bnQgPSAwO1xuICBmb3IodmFyIGkgaW4gZGF0YSkge1xuICAgIGlmKGRhdGEuaGFzT3duUHJvcGVydHkoaSkpIHtcbiAgICAgIGNvdW50ICsrO1xuICAgIH1cbiAgfVxuICByZXR1cm4gY291bnQgPT0gMDtcbn07XG4iLCJcbi8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKlxuICogd3AuYWN0aW9uXG4gKiBcbiAqIC0gZ2V0LCBzYXZlXG4gKiAtIGxvZ2luLCBsb2dvdXQsIGdvLCByZWxvYWRcbiAqXG4gKi9cblxudmFyICQgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5qUXVlcnkgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLmpRdWVyeSA6IG51bGwpO1xudmFyIHdwQWpheCA9IHJlcXVpcmUoJy4vYWpheC5qcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9ICQuZXh0ZW5kKCB3aW5kb3cud3AuYWN0aW9uIHx8IHt9LCB7XG5cbiAgLyoqXG4gICAqXG4gICAqIGdldCggW3R5cGUsXSB7IHF1ZXJ5IH0gKVxuICAgKiBcbiAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgICBDb250ZW50IHR5cGU6IHBvc3RzLCB1c2Vyc1xuICAgKiBAcGFyYW0ge29iamVjdH0gcXVlcnkgIFF1ZXJ5IGFyZ3VtZW50c1xuICAgKiBcbiAgICogQHRvZG8gdGF4b25vbXksIGNvbW1lbnRzXG4gICAqXG4gICAqL1xuXG4gIGdldCA6IGZ1bmN0aW9uKCkge1xuXG4gICAgLy8gRGVmYXVsdDogZ2V0X3Bvc3RzXG4gICAgdmFyIHR5cGUgPSAncG9zdHMnO1xuXG4gICAgLy8gRm9yIG90aGVyIGNvbnRlbnQgdHlwZXM6IGdldF91c2VyLCBnZXRfdGF4b25vbXksIC4uLlxuICAgIHZhciBub25Qb3N0VHlwZXMgPSBbICd1c2VyJywgJ3VzZXJzJywgJ3RheG9ub215JywgJ2ZpZWxkJywgJ2ZpZWxkcycgXTtcblxuICAgIC8vIENyZWF0ZSBhcnJheSBvZiBhcmd1bWVudHNcbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XG5cbiAgICBpZiAoIGFyZ3MubGVuZ3RoID09PSAwIClcbiAgICAgIHRocm93IFwid3AuYWN0aW9uLmdldCBuZWVkcyBhbiBvYmplY3RcIjtcblxuICAgIGlmICggdHlwZW9mIGFyZ3NbMF0gPT09ICdzdHJpbmcnICkge1xuICAgICAgdHlwZSA9IGFyZ3NbMF07XG4gICAgICBhcmdzLnNoaWZ0KCk7XG4gICAgfVxuXG4gICAgcmVxdWVzdCA9IGFyZ3NbMF0gfHwge307XG4gICAgc3VjY2VzcyA9IGFyZ3NbMV0gfHwge307XG4gICAgZXJyb3IgPSBhcmdzWzJdIHx8IHt9O1xuXG4gICAgaWYgKCB0eXBlb2YgcmVxdWVzdC50eXBlICE9PSAndW5kZWZpbmVkJyAmJiAkLmluQXJyYXkocmVxdWVzdC50eXBlLCBub25Qb3N0VHlwZXMpID4gLTEgKSB7XG4gICAgICB0eXBlID0gcmVxdWVzdC50eXBlO1xuICAgICAgZGVsZXRlIHJlcXVlc3QudHlwZTtcbiAgICB9XG5cbiAgICByZXR1cm4gd3BBamF4KCAnZ2V0XycrdHlwZSwgcmVxdWVzdCwgc3VjY2VzcywgZXJyb3IgKTtcbiAgfSxcblxuXG4gIC8qKlxuICAgKlxuICAgKiBzYXZlKCBbdHlwZSxdIHsgZGF0YSB9IClcbiAgICogXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlICAgQ29udGVudCB0eXBlOiBwb3N0LCB1c2VyXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhICAgRGF0YVxuICAgKiBcbiAgICogQHRvZG8gdGF4b25vbXksIGNvbW1lbnRzLi5cbiAgICpcbiAgICovXG5cbiAgc2F2ZTogZnVuY3Rpb24oKSB7XG5cbiAgICAvLyBGb3IgcG9zdCwgcGFnZSwgY3VzdG9tIHBvc3QgdHlwZTogc2F2ZV9wb3N0XG4gICAgdmFyIHR5cGUgPSAncG9zdCc7XG5cbiAgICAvLyBGb3Igb3RoZXIgY29udGVudCB0eXBlczogc2F2ZV91c2VyLCBzYXZlX3RheG9ub215LCAuLi5cbiAgICB2YXIgbm9uUG9zdFR5cGVzID0gWyAndXNlcicsICd1c2VycycsICd0YXhvbm9teScsICdmaWVsZCcsICdmaWVsZHMnIF07XG5cbiAgICAvLyBDcmVhdGUgYXJyYXkgb2YgYXJndW1lbnRzXG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuXG4gICAgaWYgKCBhcmdzLmxlbmd0aCA9PT0gMCApXG4gICAgICB0aHJvdyBcIndwLmFjdGlvbi5zYXZlIG5lZWRzIGFuIG9iamVjdFwiO1xuXG4gICAgaWYgKCB0eXBlb2YgYXJnc1swXSA9PT0gJ3N0cmluZycgKSB7XG4gICAgICB0eXBlID0gYXJnc1swXTtcbiAgICAgIGFyZ3Muc2hpZnQoKTtcbiAgICB9XG5cbiAgICByZXF1ZXN0ID0gYXJnc1swXSB8fCB7fTtcbiAgICBzdWNjZXNzID0gYXJnc1sxXSB8fCB7fTtcbiAgICBlcnJvciA9IGFyZ3NbMl0gfHwge307XG5cbiAgICBpZiAoIHR5cGVvZiByZXF1ZXN0LnR5cGUgIT09ICd1bmRlZmluZWQnICYmICQuaW5BcnJheShyZXF1ZXN0LnR5cGUsIG5vblBvc3RUeXBlcykgPiAtMSApIHtcbiAgICAgIHR5cGUgPSByZXF1ZXN0LnR5cGU7XG4gICAgICBkZWxldGUgcmVxdWVzdC50eXBlO1xuICAgIH0gZWxzZSBpZiAoIHR5cGUgPT0gJ3Bvc3QnICYmICQuaXNBcnJheSggcmVxdWVzdCApICkge1xuICAgICAgdHlwZSA9ICdwb3N0cyc7XG4gICAgfVxuXG4gICAgcmV0dXJuIHdwQWpheCggJ3NhdmVfJyt0eXBlLCByZXF1ZXN0LCBzdWNjZXNzLCBlcnJvciApO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqXG4gICAqIGxvZ2luLCBsb2dvdXQsIGdvLCByZWxvYWRcbiAgICpcbiAgICogQHRvZG8gcmVnaXN0ZXJcbiAgICpcbiAgICovXG5cblxuICBsb2dpbiA6IGZ1bmN0aW9uKCByZXF1ZXN0LCBzdWNjZXNzLCBlcnJvciApIHtcblxuICAgIHJldHVybiB3cEFqYXgoICdsb2dpbicsIHJlcXVlc3QsIHN1Y2Nlc3MsIGVycm9yICk7XG4gIH0sXG5cbiAgbG9nb3V0IDogZnVuY3Rpb24oIHJlZGlyZWN0ICkge1xuXG4gICAgdmFyIGxvZ291dCA9IHdwLnVybC5sb2dvdXQ7XG5cbiAgICBpZiAoIHR5cGVvZiByZWRpcmVjdCA9PT0gJ3VuZGVmaW5lZCcgKSByZWRpcmVjdCA9IHdwLmN1cnJlbnQucmVxdWVzdDtcblxuICAgIGxvZ291dCArPSAnJnJlZGlyZWN0X3RvPScrd3AudXJsLnNpdGUrcmVkaXJlY3Q7XG4gICAgbG9jYXRpb24uaHJlZiA9IGxvZ291dDtcbiAgfSxcblxuICBnbyA6IGZ1bmN0aW9uKCByb3V0ZSApIHtcbiAgICBsb2NhdGlvbi5ocmVmID0gd3AudXJsLnNpdGUrcm91dGU7XG4gIH0sXG5cbiAgcmVsb2FkIDogZnVuY3Rpb24oKSB7XG4gICAgbG9jYXRpb24uaHJlZiA9IHdwLmN1cnJlbnQudXJsO1xuICB9LFxuXG4gIC8qKlxuICAgKlxuICAgKiBlbWFpbFxuICAgKiBcbiAgICovXG5cbiAgbWFpbCA6IGZ1bmN0aW9uKCBtYWlsT2JqICkge1xuXG4gICAgLy8gRGVmYXVsdDogZ2V0X3Bvc3RzXG4gICAgdmFyIHR5cGUgPSAnbWFpbCc7XG5cbiAgICAvLyBDcmVhdGUgYXJyYXkgb2YgYXJndW1lbnRzXG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuXG4gICAgaWYgKCBhcmdzLmxlbmd0aCA9PT0gMCApXG4gICAgICB0aHJvdyBcIndwLmFjdGlvbi5tYWlsIG5lZWRzIGFuIG9iamVjdFwiO1xuXG4gICAgcmVxdWVzdCA9IGFyZ3NbMF0gfHwge307XG4gICAgc3VjY2VzcyA9IGFyZ3NbMV0gfHwge307XG4gICAgZXJyb3IgPSBhcmdzWzJdIHx8IHt9O1xuXG4gICAgcmV0dXJuIHdwQWpheCggJ3NlbmRfZW1haWwnLCByZXF1ZXN0LCBzdWNjZXNzLCBlcnJvciApO1xuICB9XG5cblxufSk7XG5cbiIsIi8qIGdsb2JhbCB3cC5jdXJyZW50Lm5vbmNlLCB3cC51cmwuYWpheCAqL1xuXG52YXIgJCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LmpRdWVyeSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwualF1ZXJ5IDogbnVsbCk7XG5cbmZ1bmN0aW9uIHdwQWpheCggYWN0aW9uLCByZXF1ZXN0LCBzdWNjZXNzLCBlcnJvciApIHtcblxuICB2YXIgcmVxID0ge1xuICAgIHR5cGU6ICdQT1NUJyxcbiAgICB1cmw6IHdwLnVybC5hamF4LCAvLyBBSkFYIFVSTCBmcm9tIHNlcnZlci1zaWRlXG4gICAgZGF0YToge1xuICAgICAgYWN0aW9uOiAnYWdpbGl0eV8nK2FjdGlvbiwgLy8gUHJlZml4XG4gICAgICBub25jZTogd3AuY3VycmVudC5ub25jZSwgLy8gTm9uY2UgZnJvbSBzZXJ2ZXItc2lkZVxuICAgICAgZGF0YTogcmVxdWVzdCAvLyBUaGUgcmVhbCBkYXRhXG4gICAgfSxcbiAgICBiZWZvcmVTZW5kOiAnJyxcbiAgICBzdWNjZXNzOiAnJyxcbiAgICBlcnJvcjogJydcbiAgfTtcblxuICAvLyBCYXNlZCBvbiB3cC11dGlsLmpzXG4gIHJldHVybiAkLkRlZmVycmVkKCBmdW5jdGlvbiggZGVmZXJyZWQgKSB7XG5cbiAgICAvLyBUcmFuc2ZlciBzdWNjZXNzL2Vycm9yIGNhbGxiYWNrcy5cbiAgICBpZiAoIHN1Y2Nlc3MgKVxuICAgICAgZGVmZXJyZWQuZG9uZSggc3VjY2VzcyApO1xuICAgIGlmICggZXJyb3IgKVxuICAgICAgZGVmZXJyZWQuZmFpbCggZXJyb3IgKTtcblxuICAgIC8vIE9wdGlvbiB0byBmb3JjZSByZXR1cm4gZmFpbCBiZWZvcmUgQWpheCByZXF1ZXN0XG4gICAgaWYgKCBhY3Rpb24gPT09ICdmYWlsJyApXG4gICAgICBkZWZlcnJlZC5yZWplY3RXaXRoKCB0aGlzLCBhcmd1bWVudHMgKTtcblxuICAgIC8vIFVzZSB3aXRoIFBIUCdzIHdwX3NlbmRfanNvbl9zdWNjZXNzKCkgYW5kIHdwX3NlbmRfanNvbl9lcnJvcigpXG4gICAgJC5hamF4KCByZXEgKS5kb25lKCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cbiAgICAgIC8vIFRyZWF0IGEgcmVzcG9uc2Ugb2YgYDFgIGFzIHN1Y2Nlc3NmdWwgZm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5XG4gICAgICBpZiAoIHJlc3BvbnNlID09PSAnMScgfHwgcmVzcG9uc2UgPT09IDEgKVxuICAgICAgICByZXNwb25zZSA9IHsgc3VjY2VzczogdHJ1ZSB9O1xuXG4gICAgICBpZiAoIHR5cGVvZiByZXNwb25zZS5kYXRhID09PSAndW5kZWZpbmVkJyApXG4gICAgICAgIHJlc3BvbnNlLmRhdGEgPSAnZW1wdHknO1xuXG4gICAgICBpZiAoIHR5cGVvZiByZXNwb25zZSA9PT0gJ29iamVjdCcgJiYgKCB0eXBlb2YgcmVzcG9uc2Uuc3VjY2VzcyAhPT0gJ3VuZGVmaW5lZCcgKSApXG4gICAgICAgIGRlZmVycmVkWyByZXNwb25zZS5zdWNjZXNzID8gJ3Jlc29sdmVXaXRoJyA6ICdyZWplY3RXaXRoJyBdKCB0aGlzLCBbcmVzcG9uc2UuZGF0YV0gKTtcbiAgICAgIGVsc2V7XG4gICAgICAgIGRlZmVycmVkLnJlamVjdFdpdGgoIHRoaXMsIGFyZ3VtZW50cyApOyAvLyBbcmVzcG9uc2UuZGF0YV1cbiAgICAgIH1cbiAgICB9KS5mYWlsKCBmdW5jdGlvbigpIHtcbiAgICAgIGRlZmVycmVkLnJlamVjdFdpdGgoIHRoaXMsIGFyZ3VtZW50cyApO1xuICAgIH0pO1xuICB9KS5wcm9taXNlKCk7XG5cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB3cEFqYXg7XG5cblxuLyoqXG4gKiBTaGltIGZvciBcImZpeGluZ1wiIElFJ3MgbGFjayBvZiBzdXBwb3J0IChJRSA8IDkpIGZvciBhcHBseWluZyBzbGljZVxuICogb24gaG9zdCBvYmplY3RzIGxpa2UgTmFtZWROb2RlTWFwLCBOb2RlTGlzdCwgYW5kIEhUTUxDb2xsZWN0aW9uXG4gKiAodGVjaG5pY2FsbHksIHNpbmNlIGhvc3Qgb2JqZWN0cyBoYXZlIGJlZW4gaW1wbGVtZW50YXRpb24tZGVwZW5kZW50LFxuICogYXQgbGVhc3QgYmVmb3JlIEVTNiwgSUUgaGFzbid0IG5lZWRlZCB0byB3b3JrIHRoaXMgd2F5KS5cbiAqIEFsc28gd29ya3Mgb24gc3RyaW5ncywgZml4ZXMgSUUgPCA5IHRvIGFsbG93IGFuIGV4cGxpY2l0IHVuZGVmaW5lZFxuICogZm9yIHRoZSAybmQgYXJndW1lbnQgKGFzIGluIEZpcmVmb3gpLCBhbmQgcHJldmVudHMgZXJyb3JzIHdoZW5cbiAqIGNhbGxlZCBvbiBvdGhlciBET00gb2JqZWN0cy5cblxuKGZ1bmN0aW9uICgpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICB2YXIgX3NsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xuXG4gIHRyeSB7XG4gICAgLy8gQ2FuJ3QgYmUgdXNlZCB3aXRoIERPTSBlbGVtZW50cyBpbiBJRSA8IDlcbiAgICBfc2xpY2UuY2FsbChkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQpO1xuICB9IGNhdGNoIChlKSB7IC8vIEZhaWxzIGluIElFIDwgOVxuICAgIC8vIFRoaXMgd2lsbCB3b3JrIGZvciBnZW51aW5lIGFycmF5cywgYXJyYXktbGlrZSBvYmplY3RzLCBcbiAgICAvLyBOYW1lZE5vZGVNYXAgKGF0dHJpYnV0ZXMsIGVudGl0aWVzLCBub3RhdGlvbnMpLFxuICAgIC8vIE5vZGVMaXN0IChlLmcuLCBnZXRFbGVtZW50c0J5VGFnTmFtZSksIEhUTUxDb2xsZWN0aW9uIChlLmcuLCBjaGlsZE5vZGVzKSxcbiAgICAvLyBhbmQgd2lsbCBub3QgZmFpbCBvbiBvdGhlciBET00gb2JqZWN0cyAoYXMgZG8gRE9NIGVsZW1lbnRzIGluIElFIDwgOSlcbiAgICBBcnJheS5wcm90b3R5cGUuc2xpY2UgPSBmdW5jdGlvbihiZWdpbiwgZW5kKSB7XG4gICAgICAvLyBJRSA8IDkgZ2V0cyB1bmhhcHB5IHdpdGggYW4gdW5kZWZpbmVkIGVuZCBhcmd1bWVudFxuICAgICAgZW5kID0gKHR5cGVvZiBlbmQgIT09ICd1bmRlZmluZWQnKSA/IGVuZCA6IHRoaXMubGVuZ3RoO1xuXG4gICAgICAvLyBGb3IgbmF0aXZlIEFycmF5IG9iamVjdHMsIHdlIHVzZSB0aGUgbmF0aXZlIHNsaWNlIGZ1bmN0aW9uXG4gICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHRoaXMpID09PSAnW29iamVjdCBBcnJheV0nKXtcbiAgICAgICAgcmV0dXJuIF9zbGljZS5jYWxsKHRoaXMsIGJlZ2luLCBlbmQpOyBcbiAgICAgIH1cblxuICAgICAgLy8gRm9yIGFycmF5IGxpa2Ugb2JqZWN0IHdlIGhhbmRsZSBpdCBvdXJzZWx2ZXMuXG4gICAgICB2YXIgaSwgY2xvbmVkID0gW10sXG4gICAgICAgIHNpemUsIGxlbiA9IHRoaXMubGVuZ3RoO1xuXG4gICAgICAvLyBIYW5kbGUgbmVnYXRpdmUgdmFsdWUgZm9yIFwiYmVnaW5cIlxuICAgICAgdmFyIHN0YXJ0ID0gYmVnaW4gfHwgMDtcbiAgICAgIHN0YXJ0ID0gKHN0YXJ0ID49IDApID8gc3RhcnQ6IGxlbiArIHN0YXJ0O1xuXG4gICAgICAvLyBIYW5kbGUgbmVnYXRpdmUgdmFsdWUgZm9yIFwiZW5kXCJcbiAgICAgIHZhciB1cFRvID0gKGVuZCkgPyBlbmQgOiBsZW47XG4gICAgICBpZiAoZW5kIDwgMCkge1xuICAgICAgICB1cFRvID0gbGVuICsgZW5kO1xuICAgICAgfVxuXG4gICAgICAvLyBBY3R1YWwgZXhwZWN0ZWQgc2l6ZSBvZiB0aGUgc2xpY2VcbiAgICAgIHNpemUgPSB1cFRvIC0gc3RhcnQ7XG5cbiAgICAgIGlmIChzaXplID4gMCkge1xuICAgICAgICBjbG9uZWQgPSBuZXcgQXJyYXkoc2l6ZSk7XG4gICAgICAgIGlmICh0aGlzLmNoYXJBdCkge1xuICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBzaXplOyBpKyspIHtcbiAgICAgICAgICAgIGNsb25lZFtpXSA9IHRoaXMuY2hhckF0KHN0YXJ0ICsgaSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBzaXplOyBpKyspIHtcbiAgICAgICAgICAgIGNsb25lZFtpXSA9IHRoaXNbc3RhcnQgKyBpXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGNsb25lZDtcbiAgICB9O1xuICB9XG59KCkpO1xuICovXG5cbiJdfQ==
