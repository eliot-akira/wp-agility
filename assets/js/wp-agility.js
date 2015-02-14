(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

window.$$ = require('./agility/index.js');
window.wp = window.wp || {};
window.wp.action = require('./wp/action.js');

},{"./agility/index.js":2,"./wp/action.js":20}],2:[function(require,module,exports){
/**
 * 
 * Agility.js - v0.2.4
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
 * - Numerous improvements to be documented
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
      $util            = require('./util/jquery.util'), // jQuery utility functions
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
    object.form = Object.create(prototype.form);


    // Instance properties, i.e. not inherited
    object._id = idCounter++;
    object._parent = null;
    object._events.data = {}; // event bindings will happen below
    object._container.children = {};
    
    if ( prototype.view.$root instanceof jQuery && prototype._template ) {
      // prototype $root exists: clone its content
      object.view.$root = $( prototype.view.$root.outerHTML()  );
    } else {
      object.view.$root = $(); // empty jQuery object
    }


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

},{"./prototype/index":14,"./util/jquery.util":16,"./util/object-shim":17,"./util/timed":18,"./util/util":19}],3:[function(require,module,exports){

/*---------------------------------------------
 *
 * Controller
 *
 * Default controllers, i.e. event handlers. Event handlers that start
 * with '_' are of internal use only, and take precedence over any other
 * handler without that prefix. See: trigger()
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
      var objId = 'agility_' + this._id;
      $('head #'+objId, window.document).remove();
    }

    // destroy any appended agility objects
    this._container.empty();

    // destroy self in DOM, removing all events
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
  var attr;
  var modified = []; // list of modified model attributes
  var previous = {}; // list of previous values

  // Set individual model property: model.set( prop, value )
  if ( typeof arg === 'string' && params ) {

    attr = arg;
    arg = {};
    if ( typeof params === 'object' )
      arg[attr] = $.extend({}, params);
    else
      arg[attr] = params;

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

var $util = require('../util/jquery.util');

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


},{"../util/jquery.util":16}],7:[function(require,module,exports){
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

},{"../util/util":19,"./model-get":4,"./model-set":5,"./model-validate":6}],8:[function(require,module,exports){

/*---------------------------------------------
 *
 * View bindings
 *
 *  Apply DOM <-> Model bindings, from elements with 'data-bind' attributes
 *
 */

module.exports = function bindings() {

  var self = this; // Reference to object
  var $rootNode = this.view.$().filter('[data-bind]');
  var $childNodes = this.view.$('[data-bind]');

  var createAttributePairClosure = function(bindData, node, i) {
    var attrPair = bindData.attr[i]; // capture the attribute pair in closure
    return function() {

      if ( attrPair.attr == 'html' ) {
        // Allow inserting HTML content
        node.html(self.model.get(attrPair.attrVar));
      } else {
        // Normal element attributes
        node.attr(attrPair.attr, self.model.get(attrPair.attrVar));
      }

    };
  };

  $rootNode.add( $childNodes ).each( function() {

    var $node = $(this);
    var bindData = _parseBindStr( $node.data('bind') );
    var required = $node.data('required'); // data-required

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
            .prop("checked", true);
            // this won't fire a DOM 'change' event, saving us from
            // an infinite event loop (Model <--> DOM)
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
        // this won't fire a DOM 'change' event, saving us from
        // an infinite event loop (Model <--> DOM)
        $node.val(self.model.get(bindData.key));
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
        // this won't fire a DOM 'change' event, saving us from
        // an infinite event loop (Model <--> DOM)
        $node.val(self.model.get(bindData.key));
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
    
    // all other <tag>s: 1-way binding, only Model -> DOM

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

    self.$node[ bindData.key ] = $node; // Model property -> element
    self.key[ $node ] = bindData.key; // Element -> Model property

    if ( typeof required !== 'undefined' ) {
      self.required[ bindData.key ] = required;
    }

  }); // nodes.each()

  return this;

}; // bindings()



/*---------------------------------------------
 *
 * Parse data-bind string
 * 
 * Syntax:'[attribute][=] variable[, [attribute][=] variable ]...'
 * 
 * All pairs in the list are assumed to be attributes
 * If the variable is not an attribute, it must occur by itself
 *
 * Returns { key:'model key', attr: [ {attr : 'attribute', attrVar : 'variable' }... ] }
 *
 */

function _parseBindStr( str ) {
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
}

},{}],9:[function(require,module,exports){

/*---------------------------------------------
 *
 * View API
 *
 * view.format
 * view.style
 * view.$
 * render
 * bindings
 * sync
 * stylize
 * $bound
 *
 */

var viewBind = require('./view-bind'), // View bindings
    ROOT_SELECTOR = '&'; // Also in prototype/events.js

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

      // $root is from DOM already

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



  // Apply DOM <-> Model bindings

  bindings: viewBind,

  

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
  // Refer to map in main object

  $bound: function( key ) {

    return typeof this.$node[ key ] !== undefined ? this.$node[ key ] : false;

    /* Old way: from DOM
    var self = this;

    return this.view.$('[data-bind]').filter(function(){
      var bindData = self.view._parseBindStr( $(this).data('bind') );
      // What about multiple or nested bindings?
      return ( bindData.key == key );
    }); */
  }

};

},{"./view-bind":8}],10:[function(require,module,exports){
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

},{"../util/util":19}],11:[function(require,module,exports){
(function (global){

/*---------------------------------------------
 *
 * _events API and auxiliary functions for handling events
 *
 */

var $ = (typeof window !== "undefined" ? window.jQuery : typeof global !== "undefined" ? global.jQuery : null),
    ROOT_SELECTOR = '&'; // Also in mvc/view.js

module.exports = {

  // Binds eventStr to fn. eventStr is parsed as per parseEventStr()
  bind: function(eventStr, fn){

    var eventObj = parseEventStr(eventStr);

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

  // Alias to bind()
  on: function( eventStr, fn ) {
    return this._events.bind( eventStr, fn );
  },

  // Triggers eventStr. Syntax for eventStr is same as that for bind()
  trigger: function(eventStr, params){

    var eventObj = parseEventStr(eventStr);

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


/*---------------------------------------------
 *
 * Parse event string
 *
 * 'event'          : custom event
 * 'event selector' : DOM event using 'selector'
 *
 * Returns { type:'event' [, selector:'selector'] }
 * 
 */

function parseEventStr( eventStr ) {

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
}

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
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],12:[function(require,module,exports){
(function (global){

/*---------------------------------------------
 *
 * Extended shortcuts
 * 
 * replace, child, children, load
 *
 */

var $ = (typeof window !== "undefined" ? window.jQuery : typeof global !== "undefined" ? global.jQuery : null);

module.exports = {

  get : function( arg ) {
    return this.model.get( arg );
  },

  set : function( arg, params, third ) {
    return this.model.set( arg, params, third  );
  },

  invalid : function() {
    return this.model.invalid();
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

},{}],13:[function(require,module,exports){
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

},{}],14:[function(require,module,exports){
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

module.exports = $.extend(true, defaultPrototype, shortcuts, extend, form);

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../mvc/controller":3,"../mvc/model":7,"../mvc/view":9,"./container":10,"./events":11,"./extend":12,"./form":13,"./shortcuts":15}],15:[function(require,module,exports){

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

},{}],16:[function(require,module,exports){
(function (global){

/*---------------------------------------------
 *
 * jQuery utility functions
 *
 */

var $ = (typeof window !== "undefined" ? window.jQuery : typeof global !== "undefined" ? global.jQuery : null);

// Get element including wrapping tag

$.fn.outerHTML = function(s) {
  if (s) {
    return this.before(s).remove();
  } else {
    var doc = this[0] ? this[0].ownerDocument : document;
    return jQuery('<div>', doc).append(this.eq(0).clone()).html();
  }
};



// Generic isEmpty

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

/* Another version

window.jQuery.isEmpty = function( data ) {

  if(typeof(data) == 'number' || typeof(data) == 'boolean') {
    return false;
  }
  if(typeof(data) == 'undefined' || data === null) {
    return true;
  }
  if(typeof(data.length) != 'undefined') {
    return data.length === 0;
  }

  var count = 0;
  for(var i in data) {
    if(data.hasOwnProperty(i)) {
      count ++;
    }
  }
  return count === 0;
};
*/


// Validate e-mail

$.isEmail = function( email ) {

  if ( $.isEmpty( email ) ) return false;

  var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
  return regex.test(email);
};


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],17:[function(require,module,exports){

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

},{}],18:[function(require,module,exports){
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

},{}],19:[function(require,module,exports){
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


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],20:[function(require,module,exports){
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
    var otherTypes = [ 'post', 'user', 'users', 'taxonomy', 'field', 'fields' ];

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

    if ( typeof request.type !== 'undefined' && $.inArray(request.type, otherTypes) > -1 ) {
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

},{"./ajax.js":21}],21:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL2xpYi9zeXMvY29uZi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwianMvc3JjL2luZGV4LmpzIiwianMvc3JjL2FnaWxpdHkvaW5kZXguanMiLCJqcy9zcmMvYWdpbGl0eS9tdmMvY29udHJvbGxlci5qcyIsImpzL3NyYy9hZ2lsaXR5L212Yy9tb2RlbC1nZXQuanMiLCJqcy9zcmMvYWdpbGl0eS9tdmMvbW9kZWwtc2V0LmpzIiwianMvc3JjL2FnaWxpdHkvbXZjL21vZGVsLXZhbGlkYXRlLmpzIiwianMvc3JjL2FnaWxpdHkvbXZjL21vZGVsLmpzIiwianMvc3JjL2FnaWxpdHkvbXZjL3ZpZXctYmluZC5qcyIsImpzL3NyYy9hZ2lsaXR5L212Yy92aWV3LmpzIiwianMvc3JjL2FnaWxpdHkvcHJvdG90eXBlL2NvbnRhaW5lci5qcyIsImpzL3NyYy9hZ2lsaXR5L3Byb3RvdHlwZS9ldmVudHMuanMiLCJqcy9zcmMvYWdpbGl0eS9wcm90b3R5cGUvZXh0ZW5kLmpzIiwianMvc3JjL2FnaWxpdHkvcHJvdG90eXBlL2Zvcm0uanMiLCJqcy9zcmMvYWdpbGl0eS9wcm90b3R5cGUvaW5kZXguanMiLCJqcy9zcmMvYWdpbGl0eS9wcm90b3R5cGUvc2hvcnRjdXRzLmpzIiwianMvc3JjL2FnaWxpdHkvdXRpbC9qcXVlcnkudXRpbC5qcyIsImpzL3NyYy9hZ2lsaXR5L3V0aWwvb2JqZWN0LXNoaW0uanMiLCJqcy9zcmMvYWdpbGl0eS91dGlsL3RpbWVkLmpzIiwianMvc3JjL2FnaWxpdHkvdXRpbC91dGlsLmpzIiwianMvc3JjL3dwL2FjdGlvbi5qcyIsImpzL3NyYy93cC9hamF4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDekpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDbEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDbEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ25FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3ZGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQy9GQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDeEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2xLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcbndpbmRvdy4kJCA9IHJlcXVpcmUoJy4vYWdpbGl0eS9pbmRleC5qcycpO1xud2luZG93LndwID0gd2luZG93LndwIHx8IHt9O1xud2luZG93LndwLmFjdGlvbiA9IHJlcXVpcmUoJy4vd3AvYWN0aW9uLmpzJyk7XG4iLCIvKipcbiAqIFxuICogQWdpbGl0eS5qcyAtIHYwLjIuNFxuICogXG4gKiBGb3JrZWQgYW5kIGV4dGVuZGVkIGZyb206IEFnaWxpdHkuanMgMC4xLjMgYnkgQXJ0dXIgQi4gQWRpYiAtIGh0dHA6Ly9hZ2lsaXR5anMuY29tXG4gKiBcbiAqIFNlcGFyYXRlZCBpbnRvIENvbW1vbkpTIG1vZHVsZXNcbiAqIFxuICogTWVyZ2VkIHB1bGwgcmVxdWVzdHNcbiAqIC0gU3VwcG9ydCBuZXN0ZWQgbW9kZWwgcHJvcGVydGllc1xuICogLSBFZmZpY2llbnQgaGFuZGxpbmcgb2Ygc3R5bGVcbiAqIFxuICogRXh0ZW5kZWQgZmVhdHVyZXNcbiAqIC0gT25seSByZW5kZXIgY2hhbmdlZCBtb2RlbCBwcm9wZXJ0aWVzXG4gKiAtIEZvcm0gaGVscGVyc1xuICogLSBOdW1lcm91cyBpbXByb3ZlbWVudHMgdG8gYmUgZG9jdW1lbnRlZFxuICogXG4gKi9cblxuLypqc2xpbnQgbG9vcGZ1bmM6IHRydWUgKi9cblxuKGZ1bmN0aW9uKHdpbmRvdywgdW5kZWZpbmVkKXtcblxuICBpZiAoIXdpbmRvdy5qUXVlcnkpIHtcbiAgICB0aHJvdyBcImFnaWxpdHkuanM6IGpRdWVyeSBub3QgZm91bmRcIjtcbiAgfVxuICBcbiAgLy8gTG9jYWwgcmVmZXJlbmNlc1xuICB2YXIgZG9jdW1lbnQgPSB3aW5kb3cuZG9jdW1lbnQsXG4gICAgICBsb2NhdGlvbiA9IHdpbmRvdy5sb2NhdGlvbixcbiAgICAgICQgICAgICAgID0galF1ZXJ5LFxuXG4gICAgICBhZ2lsaXR5LCAvLyBNYWluIGFnaWxpdHkgb2JqZWN0IGJ1aWxkZXJcblxuICAgICAgdXRpbCAgICAgICAgICAgICA9IHJlcXVpcmUoJy4vdXRpbC91dGlsJyksICAgICAgICAgLy8gSW50ZXJuYWwgdXRpbGl0eSBmdW5jdGlvbnNcbiAgICAgICR1dGlsICAgICAgICAgICAgPSByZXF1aXJlKCcuL3V0aWwvanF1ZXJ5LnV0aWwnKSwgLy8galF1ZXJ5IHV0aWxpdHkgZnVuY3Rpb25zXG4gICAgICBzaGltICAgICAgICAgICAgID0gcmVxdWlyZSgnLi91dGlsL29iamVjdC1zaGltJyksICAvLyBPYmplY3QuY3JlYXRlIGFuZCBnZXRQcm90b3R5cGVPZlxuICAgICAgdGltZWQgICAgICAgICAgICA9IHJlcXVpcmUoJy4vdXRpbC90aW1lZCcpLCAgICAgICAgLy8gVGltZWQgZnVuY3Rpb25zXG4gICAgICBkZWZhdWx0UHJvdG90eXBlID0gcmVxdWlyZSgnLi9wcm90b3R5cGUvaW5kZXgnKSwgICAvLyBEZWZhdWx0IG9iamVjdCBwcm90b3R5cGVcbiAgICAgIGlkQ291bnRlciAgICAgICAgPSAwOyAvLyBHbG9iYWwgb2JqZWN0IGNvdW50ZXJcblxuXG4gIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqXG4gICAqIE1haW4gb2JqZWN0IGNvbnN0cnVjdG9yXG4gICAqXG4gICAqL1xuICBcbiAgYWdpbGl0eSA9IGZ1bmN0aW9uKCkge1xuICAgIFxuICAgIC8vIFJlYWwgYXJyYXkgb2YgYXJndW1lbnRzXG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApLFxuICAgIFxuICAgIC8vIE9iamVjdCB0byBiZSByZXR1cm5lZCBieSBidWlsZGVyXG4gICAgb2JqZWN0ID0ge30sXG5cbiAgICAkcm9vdCwgLy8gVXNlZCB3aGVuIHRlbXBsYXRlIGlzIGZyb20gRE9NXG5cbiAgICBwcm90b3R5cGUgPSBkZWZhdWx0UHJvdG90eXBlO1xuXG5cbiAgICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAqXG4gICAgICogQ3JlYXRlIG9iamVjdCBmcm9tIHByb3RvdHlwZVxuICAgICAqXG4gICAgICovXG5cbiAgICAvLyBJZiBmaXJzdCBhcmcgaXMgb2JqZWN0LCB1c2UgaXQgYXMgcHJvdG90eXBlXG4gICAgaWYgKHR5cGVvZiBhcmdzWzBdID09PSBcIm9iamVjdFwiICYmIHV0aWwuaXNBZ2lsaXR5KGFyZ3NbMF0pKSB7XG5cbiAgICAgIHByb3RvdHlwZSA9IGFyZ3NbMF07ICAgIFxuICAgICAgYXJncy5zaGlmdCgpOyAvLyByZW1haW5pbmcgYXJncyBub3cgd29yayBhcyB0aG91Z2ggb2JqZWN0IHdhc24ndCBzcGVjaWZpZWRcblxuICAgIH1cblxuICAgIC8vIEJ1aWxkIG9iamVjdCBmcm9tIHByb3RvdHlwZSBhcyB3ZWxsIGFzIHRoZSBpbmRpdmlkdWFsIHByb3RvdHlwZSBwYXJ0c1xuICAgIC8vIFRoaXMgZW5hYmxlcyBkaWZmZXJlbnRpYWwgaW5oZXJpdGFuY2UgYXQgdGhlIHN1Yi1vYmplY3QgbGV2ZWwsIGUuZy4gb2JqZWN0LnZpZXcuZm9ybWF0XG4gICAgb2JqZWN0ID0gT2JqZWN0LmNyZWF0ZShwcm90b3R5cGUpO1xuICAgIG9iamVjdC5tb2RlbCA9IE9iamVjdC5jcmVhdGUocHJvdG90eXBlLm1vZGVsKTtcbiAgICBvYmplY3QudmlldyA9IE9iamVjdC5jcmVhdGUocHJvdG90eXBlLnZpZXcpO1xuICAgIG9iamVjdC5jb250cm9sbGVyID0gT2JqZWN0LmNyZWF0ZShwcm90b3R5cGUuY29udHJvbGxlcik7XG4gICAgb2JqZWN0Ll9jb250YWluZXIgPSBPYmplY3QuY3JlYXRlKHByb3RvdHlwZS5fY29udGFpbmVyKTtcbiAgICBvYmplY3QuX2V2ZW50cyA9IE9iamVjdC5jcmVhdGUocHJvdG90eXBlLl9ldmVudHMpO1xuICAgIG9iamVjdC5mb3JtID0gT2JqZWN0LmNyZWF0ZShwcm90b3R5cGUuZm9ybSk7XG5cblxuICAgIC8vIEluc3RhbmNlIHByb3BlcnRpZXMsIGkuZS4gbm90IGluaGVyaXRlZFxuICAgIG9iamVjdC5faWQgPSBpZENvdW50ZXIrKztcbiAgICBvYmplY3QuX3BhcmVudCA9IG51bGw7XG4gICAgb2JqZWN0Ll9ldmVudHMuZGF0YSA9IHt9OyAvLyBldmVudCBiaW5kaW5ncyB3aWxsIGhhcHBlbiBiZWxvd1xuICAgIG9iamVjdC5fY29udGFpbmVyLmNoaWxkcmVuID0ge307XG4gICAgXG4gICAgaWYgKCBwcm90b3R5cGUudmlldy4kcm9vdCBpbnN0YW5jZW9mIGpRdWVyeSAmJiBwcm90b3R5cGUuX3RlbXBsYXRlICkge1xuICAgICAgLy8gcHJvdG90eXBlICRyb290IGV4aXN0czogY2xvbmUgaXRzIGNvbnRlbnRcbiAgICAgIG9iamVjdC52aWV3LiRyb290ID0gJCggcHJvdG90eXBlLnZpZXcuJHJvb3Qub3V0ZXJIVE1MKCkgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9iamVjdC52aWV3LiRyb290ID0gJCgpOyAvLyBlbXB0eSBqUXVlcnkgb2JqZWN0XG4gICAgfVxuXG5cbiAgICAvLyBDbG9uZSBvd24gcHJvcGVydGllc1xuICAgIC8vIGkuZS4gcHJvcGVydGllcyB0aGF0IGFyZSBpbmhlcml0ZWQgYnkgZGlyZWN0IGNvcHkgaW5zdGVhZCBvZiBieSBwcm90b3R5cGUgY2hhaW5cbiAgICAvLyBUaGlzIHByZXZlbnRzIGNoaWxkcmVuIGZyb20gYWx0ZXJpbmcgcGFyZW50cyBtb2RlbHNcbiAgICBvYmplY3QubW9kZWwuX2RhdGEgPSBwcm90b3R5cGUubW9kZWwuX2RhdGEgPyAkLmV4dGVuZCh0cnVlLCB7fSwgcHJvdG90eXBlLm1vZGVsLl9kYXRhKSA6IHt9O1xuICAgIG9iamVjdC5fZGF0YSA9IHByb3RvdHlwZS5fZGF0YSA/ICQuZXh0ZW5kKHRydWUsIHt9LCBwcm90b3R5cGUuX2RhdGEpIDoge307XG5cblxuICAgIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICpcbiAgICAgKiBFeHRlbmQgbW9kZWwsIHZpZXcsIGNvbnRyb2xsZXIgYmFzZWQgb24gZ2l2ZW4gYXJndW1lbnRzXG4gICAgICpcbiAgICAgKi9cblxuICAgIC8vIEp1c3QgdGhlIGRlZmF1bHQgcHJvdG90eXBlIHt9XG4gICAgaWYgKGFyZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgfVxuXG4gICAgLy8gKCB2aWV3LmZvcm1hdCBbLHsgbWV0aG9kOmZ1bmN0aW9uLCAuLi4gfV0gKVxuICAgIGVsc2UgaWYgKCB0eXBlb2YgYXJnc1swXSA9PT0gJ3N0cmluZycgKSB7XG5cbiAgICAgIC8vIEdldCB0ZW1wbGF0ZSBmcm9tICcjaWQnXG4gICAgICBpZiAoIGFyZ3NbMF1bMF0gPT09ICcjJyApIHtcblxuICAgICAgICAkcm9vdCA9ICQoYXJnc1swXSk7XG5cbiAgICAgICAgLy8gVGVtcGxhdGUgZnJvbSBzY3JpcHQgdGFnXG4gICAgICAgIGlmICggJHJvb3QucHJvcCgndGFnTmFtZScpLnRvTG93ZXJDYXNlKCkgPT09ICdzY3JpcHQnICkge1xuXG4gICAgICAgICAgb2JqZWN0LnZpZXcuZm9ybWF0ID0gJHJvb3QuaHRtbCgpO1xuXG4gICAgICAgIC8vIFRlbXBsYXRlIGZyb20gZXhpc3RpbmcgRE9NXG4gICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAvLyBJbmNsdWRlIGNvbnRhaW5lciBpdHNlbGZcbiAgICAgICAgICBvYmplY3Qudmlldy5mb3JtYXQgPSAkcm9vdC5vdXRlckhUTUwoKTtcbiAgICAgICAgICAvLyBBc3NpZ24gcm9vdCB0byBleGlzdGluZyBET00gZWxlbWVudFxuICAgICAgICAgIG9iamVjdC52aWV3LiRyb290ID0gJHJvb3Q7XG4gICAgICAgICAgXG4gICAgICAgICAgb2JqZWN0Ll90ZW1wbGF0ZSA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgfVxuICAgICAgLy8gb3IgJzx0ZW1wbGF0ZT4nIHN0cmluZ1xuICAgICAgZWxzZSBvYmplY3Qudmlldy5mb3JtYXQgPSBhcmdzWzBdO1xuXG4gICAgICAvLyBDb250cm9sbGVyIGZyb20gb2JqZWN0XG4gICAgICBpZiAoIGFyZ3MubGVuZ3RoID4gMSAmJiB0eXBlb2YgYXJnc1sxXSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgJC5leHRlbmQob2JqZWN0LmNvbnRyb2xsZXIsIGFyZ3NbMV0pO1xuICAgICAgICB1dGlsLmV4dGVuZENvbnRyb2xsZXIob2JqZWN0KTtcbiAgICAgIH1cblxuICAgIH0gLy8gc2luZ2xlIHZpZXcgYXJnXG5cbiAgICAvLyBQcm90b3R5cGUgZGlmZmVyZW50aWFsIGZyb20gc2luZ2xlIHttb2RlbCx2aWV3LGNvbnRyb2xsZXJ9IG9iamVjdFxuICAgIGVsc2UgaWYgKGFyZ3MubGVuZ3RoID09PSAxICYmIHR5cGVvZiBhcmdzWzBdID09PSAnb2JqZWN0JyAmJiAoYXJnc1swXS5tb2RlbCB8fCBhcmdzWzBdLnZpZXcpICkge1xuXG4gICAgICBmb3IgKHZhciBwcm9wIGluIGFyZ3NbMF0pIHtcblxuICAgICAgICBpZiAocHJvcCA9PT0gJ21vZGVsJykge1xuXG4gICAgICAgICAgJC5leHRlbmQob2JqZWN0Lm1vZGVsLl9kYXRhLCBhcmdzWzBdLm1vZGVsKTtcblxuICAgICAgICB9IGVsc2UgaWYgKHByb3AgPT09ICd2aWV3Jykge1xuXG4gICAgICAgICAgaWYgKHR5cGVvZiBhcmdzWzBdLnZpZXcgPT09ICdzdHJpbmcnKSB7XG5cbiAgICAgICAgICAgIC8vIEdldCB0ZW1wbGF0ZSBmcm9tICcjaWQnXG4gICAgICAgICAgICBpZiAoIGFyZ3NbMF0udmlld1swXSA9PT0gJyMnICkge1xuXG4gICAgICAgICAgICAgICRyb290ID0gJChhcmdzWzBdLnZpZXcpO1xuXG4gICAgICAgICAgICAgIG9iamVjdC52aWV3LmZvcm1hdCA9ICRyb290Lmh0bWwoKTtcblxuICAgICAgICAgICAgICAvLyBUZW1wbGF0ZSBmcm9tIHNjcmlwdCB0YWdcbiAgICAgICAgICAgICAgaWYgKCAkcm9vdC5wcm9wKCd0YWdOYW1lJykudG9Mb3dlckNhc2UoKSA9PT0gJ3NjcmlwdCcgKSB7XG5cbiAgICAgICAgICAgICAgICBvYmplY3Qudmlldy5mb3JtYXQgPSAkcm9vdC5odG1sKCk7XG5cbiAgICAgICAgICAgICAgLy8gVGVtcGxhdGUgZnJvbSBleGlzdGluZyBET01cbiAgICAgICAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgICAgIC8vIEluY2x1ZGUgY29udGFpbmVyIGl0c2VsZlxuICAgICAgICAgICAgICAgIG9iamVjdC52aWV3LmZvcm1hdCA9ICRyb290Lm91dGVySFRNTCgpO1xuICAgICAgICAgICAgICAgIC8vIEFzc2lnbiByb290IHRvIGV4aXN0aW5nIERPTSBlbGVtZW50XG4gICAgICAgICAgICAgICAgb2JqZWN0LnZpZXcuJHJvb3QgPSAkcm9vdDtcbiAgICAgICAgICAgICAgICBvYmplY3QuX3RlbXBsYXRlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBvciAnPHRlbXBsYXRlPicgc3RyaW5nXG4gICAgICAgICAgICBlbHNlIG9iamVjdC52aWV3LmZvcm1hdCA9IGFyZ3NbMF0udmlldztcblxuICAgICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgICQuZXh0ZW5kKG9iamVjdC52aWV3LCBhcmdzWzBdLnZpZXcpOyAvLyB2aWV3Ontmb3JtYXQ6e30sc3R5bGU6e319XG4gICAgICAgICAgfVxuXG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoIHByb3AgPT09ICdjb250cm9sbGVyJyB8fCBwcm9wID09PSAnZXZlbnRzJyApIHtcbiAgICAgICAgICAkLmV4dGVuZChvYmplY3QuY29udHJvbGxlciwgYXJnc1swXVtwcm9wXSk7XG4gICAgICAgICAgdXRpbC5leHRlbmRDb250cm9sbGVyKG9iamVjdCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVc2VyLWRlZmluZWQgbWV0aG9kc1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBvYmplY3RbcHJvcF0gPSBhcmdzWzBdW3Byb3BdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSAvLyBzaW5nbGUge21vZGVsLCB2aWV3LCBjb250cm9sbGVyfSBhcmdcblxuICAgIC8vIFByb3RvdHlwZSBkaWZmZXJlbnRpYWwgZnJvbSBzZXBhcmF0ZSB7bW9kZWx9LCB7dmlld30sIHtjb250cm9sbGVyfSBhcmd1bWVudHNcbiAgICBlbHNlIHtcbiAgICAgIFxuICAgICAgLy8gTW9kZWwgb2JqZWN0XG4gICAgICBpZiAodHlwZW9mIGFyZ3NbMF0gPT09ICdvYmplY3QnKSB7XG4gICAgICAgICQuZXh0ZW5kKG9iamVjdC5tb2RlbC5fZGF0YSwgYXJnc1swXSk7XG4gICAgICB9XG4gICAgICBlbHNlIGlmIChhcmdzWzBdKSB7XG4gICAgICAgIHRocm93IFwiYWdpbGl0eS5qczogdW5rbm93biBhcmd1bWVudCB0eXBlIChtb2RlbClcIjtcbiAgICAgIH1cblxuICAgICAgLy8gVmlldyBmb3JtYXQgZnJvbSBzaG9ydGhhbmQgc3RyaW5nICguLi4sICc8ZGl2PndoYXRldmVyPC9kaXY+JywgLi4uKVxuICAgICAgaWYgKHR5cGVvZiBhcmdzWzFdID09PSAnc3RyaW5nJykge1xuXG4gICAgICAgIC8vIEBleHRlbmQgR2V0IHRlbXBsYXRlIGZyb20gSURcbiAgICAgICAgaWYgKCBhcmdzWzFdWzBdID09PSAnIycgKSB7XG5cbiAgICAgICAgICAvLyBvYmplY3Qudmlldy5mb3JtYXQgPSAkKGFyZ3NbMV0pLmh0bWwoKTtcblxuICAgICAgICAgICRyb290ID0gJChhcmdzWzFdKTtcblxuICAgICAgICAgIC8vIFRlbXBsYXRlIGZyb20gc2NyaXB0IHRhZ1xuICAgICAgICAgIGlmICggJHJvb3QucHJvcCgndGFnTmFtZScpLnRvTG93ZXJDYXNlKCkgPT09ICdzY3JpcHQnICkge1xuXG4gICAgICAgICAgICBvYmplY3Qudmlldy5mb3JtYXQgPSAkcm9vdC5odG1sKCk7XG5cbiAgICAgICAgICAvLyBUZW1wbGF0ZSBmcm9tIGV4aXN0aW5nIERPTVxuICAgICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgIC8vIEluY2x1ZGUgY29udGFpbmVyIGl0c2VsZlxuICAgICAgICAgICAgb2JqZWN0LnZpZXcuZm9ybWF0ID0gJHJvb3Qub3V0ZXJIVE1MKCk7XG4gICAgICAgICAgICAvLyBBc3NpZ24gcm9vdCB0byBleGlzdGluZyBET00gZWxlbWVudFxuICAgICAgICAgICAgb2JqZWN0LnZpZXcuJHJvb3QgPSAkcm9vdDtcbiAgICAgICAgICAgIG9iamVjdC5fdGVtcGxhdGUgPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlXG4gICAgICAgICAgb2JqZWN0LnZpZXcuZm9ybWF0ID0gYXJnc1sxXTsgLy8gZXh0ZW5kIHZpZXcgd2l0aCAuZm9ybWF0XG4gICAgICB9ICBcbiAgICAgIC8vIFZpZXcgZnJvbSBvYmplY3QgKC4uLiwge2Zvcm1hdDonPGRpdj53aGF0ZXZlcjwvZGl2Pid9LCAuLi4pXG4gICAgICBlbHNlIGlmICh0eXBlb2YgYXJnc1sxXSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgJC5leHRlbmQob2JqZWN0LnZpZXcsIGFyZ3NbMV0pO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAoYXJnc1sxXSkge1xuICAgICAgICB0aHJvdyBcImFnaWxpdHkuanM6IHVua25vd24gYXJndW1lbnQgdHlwZSAodmlldylcIjtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gVmlldyBzdHlsZSBmcm9tIHNob3J0aGFuZCBzdHJpbmcgKC4uLiwgLi4uLCAncCB7Y29sb3I6cmVkfScsIC4uLilcblxuICAgICAgaWYgKHR5cGVvZiBhcmdzWzJdID09PSAnc3RyaW5nJykge1xuICAgICAgICBvYmplY3Qudmlldy5zdHlsZSA9IGFyZ3NbMl07XG4gICAgICAgIGFyZ3Muc3BsaWNlKDIsIDEpOyAvLyBzbyB0aGF0IGNvbnRyb2xsZXIgY29kZSBiZWxvdyB3b3Jrc1xuICAgICAgfVxuXG4gICAgICAvLyBDb250cm9sbGVyIGZyb20gb2JqZWN0ICguLi4sIC4uLiwge21ldGhvZDpmdW5jdGlvbigpe319KVxuICAgICAgaWYgKHR5cGVvZiBhcmdzWzJdID09PSAnb2JqZWN0Jykge1xuICAgICAgICAkLmV4dGVuZChvYmplY3QuY29udHJvbGxlciwgYXJnc1syXSk7XG4gICAgICAgIHV0aWwuZXh0ZW5kQ29udHJvbGxlcihvYmplY3QpO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAoYXJnc1syXSkge1xuICAgICAgICB0aHJvdyBcImFnaWxpdHkuanM6IHVua25vd24gYXJndW1lbnQgdHlwZSAoY29udHJvbGxlcilcIjtcbiAgICAgIH1cbiAgICAgIFxuICAgIH0gLy8gc2VwYXJhdGUgKHttb2RlbH0sIHt2aWV3fSwge2NvbnRyb2xsZXJ9KSBhcmdzXG5cblxuICAgIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICpcbiAgICAgKiBMYXVuY2ggc2VxdWVuY2U6IEJpbmRpbmdzLCBpbml0aWFsaXphdGlvbnMsIGV0Y1xuICAgICAqXG4gICAgICovXG4gICAgXG4gICAgLy8gU2F2ZSBtb2RlbCdzIGluaXRpYWwgc3RhdGUgKHNvIGl0IGNhbiBiZSAucmVzZXQoKSBsYXRlcilcbiAgICBvYmplY3QubW9kZWwuX2luaXREYXRhID0gJC5leHRlbmQoe30sIG9iamVjdC5tb2RlbC5fZGF0YSk7XG5cbiAgICAvLyBvYmplY3QuKiB3aWxsIGhhdmUgdGhlaXIgJ3RoaXMnID09PSBvYmplY3QuIFRoaXMgc2hvdWxkIGNvbWUgYmVmb3JlIGNhbGwgdG8gb2JqZWN0LiogYmVsb3cuXG4gICAgdXRpbC5wcm94eUFsbChvYmplY3QsIG9iamVjdCk7XG5cbiAgXG4gICAgLy8gSW5pdGlhbGl6ZSAkcm9vdCwgbmVlZGVkIGZvciBET00gZXZlbnRzIGJpbmRpbmcgYmVsb3dcbiAgICBvYmplY3Qudmlldy5yZW5kZXIoKTtcbiAgXG5cbiAgICAvLyBCaW5kIGFsbCBjb250cm9sbGVycyB0byB0aGVpciBldmVudHNcblxuICAgIHZhciBiaW5kRXZlbnQgPSBmdW5jdGlvbihldiwgaGFuZGxlcil7XG4gICAgICBpZiAodHlwZW9mIGhhbmRsZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgb2JqZWN0LmJpbmQoZXYsIGhhbmRsZXIpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBmb3IgKHZhciBldmVudFN0ciBpbiBvYmplY3QuY29udHJvbGxlcikge1xuICAgICAgdmFyIGV2ZW50cyA9IGV2ZW50U3RyLnNwbGl0KCc7Jyk7XG4gICAgICB2YXIgaGFuZGxlciA9IG9iamVjdC5jb250cm9sbGVyW2V2ZW50U3RyXTtcbiAgICAgICQuZWFjaChldmVudHMsIGZ1bmN0aW9uKGksIGV2KXtcbiAgICAgICAgZXYgPSAkLnRyaW0oZXYpO1xuICAgICAgICBiaW5kRXZlbnQoZXYsIGhhbmRsZXIpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gQXV0by10cmlnZ2VycyBjcmVhdGUgZXZlbnRcbiAgICBvYmplY3QudHJpZ2dlcignY3JlYXRlJyk7ICAgIFxuICAgIFxuICAgIHJldHVybiBvYmplY3Q7XG4gICAgXG4gIH07IC8vIGFnaWxpdHlcblxuXG5cbiAgLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICpcbiAgICogR2xvYmFsIHByb3BlcnRpZXNcbiAgICpcbiAgICovXG5cbiAgXG4gIC8vICQkLmRvY3VtZW50IGlzIGEgc3BlY2lhbCBBZ2lsaXR5IG9iamVjdCwgd2hvc2UgdmlldyBpcyBhdHRhY2hlZCB0byA8Ym9keT5cbiAgLy8gVGhpcyBvYmplY3QgaXMgdGhlIG1haW4gZW50cnkgcG9pbnQgZm9yIGFsbCBET00gb3BlcmF0aW9uc1xuICBhZ2lsaXR5LmRvY3VtZW50ID0gYWdpbGl0eSh7XG4gICAgX2RvY3VtZW50IDogdHJ1ZSxcbiAgICB2aWV3OiB7XG4gICAgICAkOiBmdW5jdGlvbihzZWxlY3Rvcil7IHJldHVybiBzZWxlY3RvciA/ICQoc2VsZWN0b3IsICdib2R5JykgOiAkKCdib2R5Jyk7IH1cbiAgICB9LFxuICAgIGNvbnRyb2xsZXI6IHtcbiAgICAgIC8vIE92ZXJyaWRlIGRlZmF1bHQgY29udHJvbGxlciAoZG9uJ3QgcmVuZGVyLCBkb24ndCBzdHlsaXplLCBldGMpXG4gICAgICBfY3JlYXRlOiBmdW5jdGlvbigpe31cbiAgICB9XG4gIH0pO1xuXG4gIC8vIFNob3J0Y3V0IHRvIHByb3RvdHlwZSBmb3IgcGx1Z2luc1xuICBhZ2lsaXR5LmZuID0gZGVmYXVsdFByb3RvdHlwZTtcblxuICAvLyBOYW1lc3BhY2UgdG8gZGVjbGFyZSByZXVzYWJsZSBBZ2lsaXR5IG9iamVjdHNcbiAgLy8gVXNlOiBhcHAuYXBwZW5kKCAkJC5tb2R1bGUuc29tZXRoaW5nICkgb3IgJCQoICQkLm1vZHVsZS5zb21ldGhpbmcsIHttLHYsY30gKVxuICBhZ2lsaXR5Lm1vZHVsZSA9IHt9O1xuXG4gIC8vIGlzQWdpbGl0eSB0ZXN0XG4gIGFnaWxpdHkuaXNBZ2lsaXR5ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKHR5cGVvZiBvYmogIT09ICdvYmplY3QnKSByZXR1cm4gZmFsc2U7XG4gICAgcmV0dXJuIHV0aWwuaXNBZ2lsaXR5KG9iaik7XG4gIH07XG5cblxuICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKlxuICAgKiBFeHBvcnQgaXRcbiAgICpcbiAgICovXG5cbiAgLy8gQU1ELCBDb21tb25KUywgdGhlbiBnbG9iYWxcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEB0b2RvIElzIHRoaXMgY29ycmVjdD9cbiAgICBkZWZpbmUoW10sIGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiBhZ2lsaXR5O1xuICAgIH0pO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jykge1xuICAgICAgbW9kdWxlLmV4cG9ydHMgPSBhZ2lsaXR5O1xuICB9IGVsc2Uge1xuICAgICAgd2luZG93LiQkID0gYWdpbGl0eTtcbiAgfVxuXG59KSh3aW5kb3cpO1xuIiwiXG4vKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICpcbiAqIENvbnRyb2xsZXJcbiAqXG4gKiBEZWZhdWx0IGNvbnRyb2xsZXJzLCBpLmUuIGV2ZW50IGhhbmRsZXJzLiBFdmVudCBoYW5kbGVycyB0aGF0IHN0YXJ0XG4gKiB3aXRoICdfJyBhcmUgb2YgaW50ZXJuYWwgdXNlIG9ubHksIGFuZCB0YWtlIHByZWNlZGVuY2Ugb3ZlciBhbnkgb3RoZXJcbiAqIGhhbmRsZXIgd2l0aG91dCB0aGF0IHByZWZpeC4gU2VlOiB0cmlnZ2VyKClcbiAqXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgLy8gVHJpZ2dlcmVkIGFmdGVyIHNlbGYgY3JlYXRpb25cbiAgX2NyZWF0ZTogZnVuY3Rpb24oZXZlbnQpe1xuICAgIHRoaXMudmlldy5zdHlsaXplKCk7XG4gICAgdGhpcy52aWV3LmJpbmRpbmdzKCk7IC8vIE1vZGVsLVZpZXcgYmluZGluZ3NcbiAgICB0aGlzLnZpZXcuc3luYygpOyAvLyBzeW5jcyBWaWV3IHdpdGggTW9kZWxcbiAgfSxcblxuICAvLyBUcmlnZ2VyZWQgdXBvbiByZW1vdmluZyBzZWxmXG4gIF9kZXN0cm95OiBmdW5jdGlvbihldmVudCl7XG5cbiAgICAvLyBAcHVsbCAjOTUgUmVtb3ZlIGdlbmVyYXRlZCBzdHlsZSB1cG9uIGRlc3RydWN0aW9uIG9mIG9iamVjdHNcbiAgICAvLyBAZXh0ZW5kIE9ubHkgaWYgdXNpbmcgc3R5bGUgYXR0cmlidXRlXG5cbiAgICBpZiAodGhpcy52aWV3LnN0eWxlKSB7XG4gICAgICB2YXIgb2JqSWQgPSAnYWdpbGl0eV8nICsgdGhpcy5faWQ7XG4gICAgICAkKCdoZWFkICMnK29iaklkLCB3aW5kb3cuZG9jdW1lbnQpLnJlbW92ZSgpO1xuICAgIH1cblxuICAgIC8vIGRlc3Ryb3kgYW55IGFwcGVuZGVkIGFnaWxpdHkgb2JqZWN0c1xuICAgIHRoaXMuX2NvbnRhaW5lci5lbXB0eSgpO1xuXG4gICAgLy8gZGVzdHJveSBzZWxmIGluIERPTSwgcmVtb3ZpbmcgYWxsIGV2ZW50c1xuICAgIHRoaXMudmlldy4kKCkucmVtb3ZlKCk7XG4gIH0sXG5cbiAgLy8gVHJpZ2dlcmVkIGFmdGVyIGNoaWxkIG9iaiBpcyBhcHBlbmRlZCB0byBjb250YWluZXJcbiAgX2FwcGVuZDogZnVuY3Rpb24oZXZlbnQsIG9iaiwgc2VsZWN0b3Ipe1xuICAgIHRoaXMudmlldy4kKHNlbGVjdG9yKS5hcHBlbmQob2JqLnZpZXcuJCgpKTtcbiAgfSxcblxuICAvLyBUcmlnZ2VyZWQgYWZ0ZXIgY2hpbGQgb2JqIGlzIHByZXBlbmRlZCB0byBjb250YWluZXJcbiAgX3ByZXBlbmQ6IGZ1bmN0aW9uKGV2ZW50LCBvYmosIHNlbGVjdG9yKXtcbiAgICB0aGlzLnZpZXcuJChzZWxlY3RvcikucHJlcGVuZChvYmoudmlldy4kKCkpO1xuICB9LFxuXG4gIC8vIFRyaWdnZXJlZCBhZnRlciBjaGlsZCBvYmogaXMgaW5zZXJ0ZWQgaW4gdGhlIGNvbnRhaW5lclxuICBfYmVmb3JlOiBmdW5jdGlvbihldmVudCwgb2JqLCBzZWxlY3Rvcil7XG4gICAgaWYgKCFzZWxlY3RvcikgdGhyb3cgJ2FnaWxpdHkuanM6IF9iZWZvcmUgbmVlZHMgYSBzZWxlY3Rvcic7XG4gICAgdGhpcy52aWV3LiQoc2VsZWN0b3IpLmJlZm9yZShvYmoudmlldy4kKCkpO1xuICB9LFxuXG4gIC8vIFRyaWdnZXJlZCBhZnRlciBjaGlsZCBvYmogaXMgaW5zZXJ0ZWQgaW4gdGhlIGNvbnRhaW5lclxuICBfYWZ0ZXI6IGZ1bmN0aW9uKGV2ZW50LCBvYmosIHNlbGVjdG9yKXtcbiAgICBpZiAoIXNlbGVjdG9yKSB0aHJvdyAnYWdpbGl0eS5qczogX2FmdGVyIG5lZWRzIGEgc2VsZWN0b3InO1xuICAgIHRoaXMudmlldy4kKHNlbGVjdG9yKS5hZnRlcihvYmoudmlldy4kKCkpO1xuICB9LFxuXG4gIC8vIFRyaWdnZXJlZCBhZnRlciBhIGNoaWxkIG9iaiBpcyByZW1vdmVkIGZyb20gY29udGFpbmVyIChvciBzZWxmLXJlbW92ZWQpXG4gIF9yZW1vdmU6IGZ1bmN0aW9uKGV2ZW50LCBpZCl7ICAgICAgICBcbiAgfSxcblxuICAvLyBUcmlnZ2VyZWQgYWZ0ZXIgbW9kZWwgaXMgY2hhbmdlZFxuICAnX2NoYW5nZSc6IGZ1bmN0aW9uKGV2ZW50KXtcbiAgfVxuICBcbn07XG4iLCIvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICpcbiAqIEdldFxuICpcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdldCggYXJnICkge1xuXG4gIC8vIEdldCB3aG9sZSBtb2RlbFxuICBpZiAoYXJnID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gdGhpcy5tb2RlbC5fZGF0YTtcbiAgfVxuXG4gIC8vIEdldCBhdHRyaWJ1dGVcbiAgLy8gQHB1bGwgIzkxIEFkZCBzdXBwb3J0IGZvciBuZXN0ZWQgbW9kZWxzOiBwYXJlbnQuY2hpbGRcbiAgaWYgKHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnKSB7XG4gICAgdmFyIHBhdGhzID0gYXJnLnNwbGl0KCcuJyk7XG4gICAgdmFyIHZhbHVlID0gdGhpcy5tb2RlbC5fZGF0YVtwYXRoc1swXV07XG4gICAgLy9jaGVjayBmb3IgbmVzdGVkIG9iamVjdHNcbiAgICBpZiAoJC5pc1BsYWluT2JqZWN0KHZhbHVlKSl7XG4gICAgICBmb3IgKHZhciBpID0gMTsgaSA8IHBhdGhzLmxlbmd0aDsgaSsrKXtcbiAgICAgICAgaWYgKCQuaXNQbGFpbk9iamVjdCh2YWx1ZSkgJiYgdmFsdWVbcGF0aHNbaV1dKXtcbiAgICAgICAgICB2YWx1ZSA9IHZhbHVlW3BhdGhzW2ldXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YWx1ZSA9IHZhbHVlW3BhdGhzLnNwbGljZShpKS5qb2luKCcuJyldO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vZGlyZWN0IGtleSBhY2Nlc3NcbiAgICAgIHZhbHVlID0gdGhpcy5tb2RlbC5fZGF0YVthcmddO1xuICAgIH1cbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICB0aHJvdyAnYWdpbGl0eS5qczogdW5rbm93biBhcmd1bWVudCBmb3IgZ2V0dGVyJztcbn07XG4iLCIvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICpcbiAqIFNldDogc2V0IG1vZGVsIGF0dHJpYnV0ZXMgYW5kIHRyaWdnZXIgY2hhbmdlIGV2ZW50c1xuICogXG4gKiBAdG9kbyBQZXJmb3JtYW5jZSBjb25zaWRlcmF0aW9uc1xuICpcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHNldCggYXJnLCBwYXJhbXMsIHRoaXJkICkge1xuXG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIGF0dHI7XG4gIHZhciBtb2RpZmllZCA9IFtdOyAvLyBsaXN0IG9mIG1vZGlmaWVkIG1vZGVsIGF0dHJpYnV0ZXNcbiAgdmFyIHByZXZpb3VzID0ge307IC8vIGxpc3Qgb2YgcHJldmlvdXMgdmFsdWVzXG5cbiAgLy8gU2V0IGluZGl2aWR1YWwgbW9kZWwgcHJvcGVydHk6IG1vZGVsLnNldCggcHJvcCwgdmFsdWUgKVxuICBpZiAoIHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnICYmIHBhcmFtcyApIHtcblxuICAgIGF0dHIgPSBhcmc7XG4gICAgYXJnID0ge307XG4gICAgaWYgKCB0eXBlb2YgcGFyYW1zID09PSAnb2JqZWN0JyApXG4gICAgICBhcmdbYXR0cl0gPSAkLmV4dGVuZCh7fSwgcGFyYW1zKTtcbiAgICBlbHNlXG4gICAgICBhcmdbYXR0cl0gPSBwYXJhbXM7XG5cbiAgICBwYXJhbXMgPSB0aGlyZCB8fCB7fTtcbiAgfVxuXG4gIGlmICggdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgKSB7XG5cbiAgICB2YXIgX2Nsb25lID0ge307XG5cbiAgICBpZiAocGFyYW1zICYmIHBhcmFtcy5yZXNldCkge1xuICAgICAgX2Nsb25lID0gdGhpcy5tb2RlbC5fZGF0YTsgLy8gaG9sZCBvbiB0byBkYXRhIGZvciBjaGFuZ2UgZXZlbnRzXG4gICAgICB0aGlzLm1vZGVsLl9kYXRhID0gJC5leHRlbmQoe30sIGFyZyk7IC8vIGVyYXNlcyBwcmV2aW91cyBtb2RlbCBhdHRyaWJ1dGVzIHdpdGhvdXQgcG9pbnRpbmcgdG8gb2JqZWN0XG4gICAgfVxuICAgIGVsc2Uge1xuXG4gICAgICAvLyBAZXh0ZW5kIENvbXBhcmUgYW5kIG9ubHkgdHJpZ2dlciBjaGFuZ2UgZXZlbnQgZm9yIG1vZGlmaWVkIGtleXNcbiAgICAgIF9jbG9uZSA9ICQuZXh0ZW5kKHt9LCB0aGlzLm1vZGVsLl9kYXRhKTtcblxuICAgICAgLy8gQHB1bGwgIzkxIEFkZCBzdXBwb3J0IGZvciBuZXN0ZWQgbW9kZWxzXG4gICAgICAvLyBJdGVyYXRlIHRocm91Z2ggcHJvcGVydGllcyBhbmQgZmluZCBuZXN0ZWQgZGVjbGFyYXRpb25zXG5cbiAgICAgIGZvciAodmFyIHByb3AgaW4gYXJnKXtcbiAgICAgICAgaWYgKHByb3AuaW5kZXhPZignLicpID4gLTEpe1xuICAgICAgICAgIHZhciBwYXRoID0gcHJvcC5zcGxpdCgnLicpO1xuICAgICAgICAgIHZhciBjdXJyZW50X25vZGUgPSB0aGlzLm1vZGVsLl9kYXRhW3BhdGhbMF1dO1xuICAgICAgICAgIGlmICghY3VycmVudF9ub2RlKXtcbiAgICAgICAgICAgIGN1cnJlbnRfbm9kZSA9IHRoaXMubW9kZWwuX2RhdGFbcGF0aFswXV0gPSB7fTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIG5leHRfbm9kZTtcbiAgICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IHBhdGgubGVuZ3RoIC0gMTsgaSsrKXtcbiAgICAgICAgICAgIG5leHRfbm9kZSA9IGN1cnJlbnRfbm9kZVtwYXRoW2ldXTtcbiAgICAgICAgICAgIGlmICgkLmlzUGxhaW5PYmplY3QobmV4dF9ub2RlKSl7XG4gICAgICAgICAgICAgY3VycmVudF9ub2RlID0gbmV4dF9ub2RlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICBjdXJyZW50X25vZGVbcGF0aFtpXV0gPSB7fTtcbiAgICAgICAgICAgICBjdXJyZW50X25vZGUgPSBjdXJyZW50X25vZGVbcGF0aFtpXV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBsYXN0X3Byb3BlcnR5ID0gcGF0aFtwYXRoLmxlbmd0aCAtIDFdO1xuICAgICAgICAgaWYgKCQuaXNQbGFpbk9iamVjdChhcmdba2V5XSkgJiYgJC5pc1BsYWluT2JqZWN0KGN1cnJlbnRfbm9kZVtsYXN0X3Byb3BlcnR5XSkpe1xuICAgICAgICAgICAvL2lmIHdlJ3JlIGFzc2lnbmluZyBvYmplY3RzLCBleHRlbmQgcmF0aGVyIHRoYW4gcmVwbGFjZVxuICAgICAgICAgICAkLmV4dGVuZChjdXJyZW50X25vZGVbbGFzdF9wcm9wZXJ0eV0sIGFyZ1twcm9wXSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgY3VycmVudF9ub2RlW2xhc3RfcHJvcGVydHldID0gYXJnW3Byb3BdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBcbiAgICAgICAgICBtb2RpZmllZC5wdXNoKHByb3ApO1xuICAgICAgICAgIHByZXZpb3VzW3Byb3BdID0gX2Nsb25lW3Byb3BdO1xuICAgICAgICAgIGRlbGV0ZSBfY2xvbmVbIHByb3AgXTsgLy8gbm8gbmVlZCB0byBmaXJlIGNoYW5nZSB0d2ljZVxuICAgICAgICAgIGRlbGV0ZSBhcmdbcHJvcF07XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgJC5leHRlbmQodGhpcy5tb2RlbC5fZGF0YSwgYXJnKTsgLy8gZGVmYXVsdCBpcyBleHRlbmRcbiAgICB9XG5cbiAgICAvLyBHaXZlbiBvYmplY3RcblxuICAgIGZvciAodmFyIGtleSBpbiBhcmcpIHtcbiAgICAgIC8vIENoZWNrIGlmIGNoYW5nZWRcbiAgICAgIGlmICh0aGlzLm1vZGVsLl9kYXRhW2tleV0gIT09IF9jbG9uZVtrZXldICkge1xuICAgICAgICBtb2RpZmllZC5wdXNoKGtleSk7XG4gICAgICAgIHByZXZpb3VzW2tleV0gPSBfY2xvbmVbIGtleSBdO1xuICAgICAgfVxuICAgICAgZGVsZXRlIF9jbG9uZVsga2V5IF07IC8vIG5vIG5lZWQgdG8gZmlyZSBjaGFuZ2UgdHdpY2VcbiAgICB9XG5cbiAgICAvLyBQcmV2aW91cyBvYmplY3RcblxuICAgIGZvciAoa2V5IGluIF9jbG9uZSkge1xuICAgICAgLy8gQ2hlY2sgaWYgY2hhbmdlZFxuICAgICAgaWYgKHRoaXMubW9kZWwuX2RhdGFba2V5XSAhPT0gX2Nsb25lW2tleV0gKSB7XG4gICAgICAgIG1vZGlmaWVkLnB1c2goa2V5KTtcbiAgICAgICAgcHJldmlvdXNba2V5XSA9IF9jbG9uZVsga2V5IF07XG4gICAgICB9XG4gICAgfVxuXG4gIH0gZWxzZSB7XG5cbiAgICAvLyBOb3QgYW4gb2JqZWN0XG4gICAgdGhyb3cgXCJhZ2lsaXR5LmpzOiB1bmtub3duIGFyZ3VtZW50IHR5cGUgaW4gbW9kZWwuc2V0KClcIjtcbiAgfVxuXG4gIC8vIFRpZ2dlciBjaGFuZ2UgZXZlbnRzXG5cbiAgaWYgKHBhcmFtcyAmJiBwYXJhbXMuc2lsZW50PT09dHJ1ZSkgcmV0dXJuIHRoaXM7IC8vIGRvIG5vdCBmaXJlIGV2ZW50c1xuXG4gIC8vIEBleHRlbmQgUGFzcyBhcnJheSBvZiBtb2RpZmllZCBtb2RlbCBrZXlzXG5cbiAgLy8gJCgpLnRyaWdnZXIgcGFyc2VzIHRoZSBzZWNvbmQgcGFyYW1ldGVyIGFzIHNlcGFyYXRlIGFyZ3VtZW50cyxcbiAgLy8gc28gd2UgcHV0IGl0IGluIGFuIGFycmF5XG5cbiAgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnLCBbbW9kaWZpZWQsIHByZXZpb3VzXSk7XG5cbiAgJC5lYWNoKG1vZGlmaWVkLCBmdW5jdGlvbihpbmRleCwga2V5KXtcbiAgICBzZWxmLnRyaWdnZXIoJ2NoYW5nZTonK2tleSwgcHJldmlvdXNba2V5XSk7XG4gIH0pO1xuXG4gIHJldHVybiB0aGlzOyAvLyBmb3IgY2hhaW5hYmxlIGNhbGxzXG5cbn07XG4iLCJcbi8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKlxuICogVmFsaWRhdGUgbW9kZWwgcHJvcGVydGllcyBiYXNlZCBvbiBvYmplY3QucmVxdWlyZWRcbiAqXG4gKi9cblxudmFyICR1dGlsID0gcmVxdWlyZSgnLi4vdXRpbC9qcXVlcnkudXRpbCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKlxuICAgKiBtb2RlbC5pbnZhbGlkKClcbiAgICogXG4gICAqIEByZXR1cm4gQW4gYXJyYXkgb2YgaW52YWxpZCBrZXlzXG4gICAqXG4gICAqL1xuXG4gIGludmFsaWQgOiBmdW5jdGlvbigpIHtcblxuICAgIHZhciBpbnZhbGlkID0gW107XG5cbiAgICAvLyBDaGVjayBlYWNoIHJlcXVpcmVkIGtleVxuXG4gICAgZm9yICh2YXIga2V5IGluIHRoaXMucmVxdWlyZWQpIHtcbiAgICAgIGlmICggISB0aGlzLm1vZGVsLmlzVmFsaWRLZXkoIGtleSApIClcbiAgICAgICAgaW52YWxpZC5wdXNoKGtleSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGludmFsaWQ7XG4gIH0sXG5cbiAgLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICpcbiAgICogaXNWYWxpZFxuICAgKlxuICAgKiBpc1ZhbGlkKCkgVmFsaWRhdGUgd2hvbGUgbW9kZWxcbiAgICogaXNWYWxpZCgga2V5ICkgVmFsaWRhdGUga2V5XG4gICAqXG4gICAqIEByZXR1cm4gYm9vbGVhblxuICAgKlxuICAgKi9cbiAgXG5cbiAgaXNWYWxpZCA6IGZ1bmN0aW9uKCBrZXkgKSB7XG5cbiAgICBpZiAodHlwZW9mIGtleSA9PT0gJ3VuZGVmaW5lZCcpIHtcblxuICAgICAgLy8gQ2hlY2sgdGhlIHdob2xlIG1vZGVsXG4gICAgICByZXR1cm4gKCB0aGlzLm1vZGVsLmludmFsaWQoKS5sZW5ndGggPT09IDApO1xuXG4gICAgfSBlbHNlIHJldHVybiB0aGlzLm1vZGVsLmlzVmFsaWRLZXkoIGtleSApO1xuXG4gIH0sXG5cbiAgaXNWYWxpZEtleSA6IGZ1bmN0aW9uKCBrZXkgKSB7XG5cbiAgICBpZiAoIHR5cGVvZiB0aGlzLnJlcXVpcmVkW2tleV0gPT09ICd1bmRlZmluZWQnICkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgdmFyIHZhbCA9IHRoaXMubW9kZWwuZ2V0KCBrZXkgKSxcbiAgICAgICAgcmVxdWlyZVR5cGUgPSB0aGlzLnJlcXVpcmVkWyBrZXkgXTtcblxuICAgIGlmICggcmVxdWlyZVR5cGUgPT09IHRydWUgKSB7XG5cbiAgICAgIHJldHVybiAhICQuaXNFbXB0eSggdmFsICk7XG5cbiAgICB9IGVsc2UgaWYgKCByZXF1aXJlVHlwZSA9PT0gJ2VtYWlsJyApIHtcblxuICAgICAgcmV0dXJuICQuaXNFbWFpbCggdmFsICk7XG5cbiAgICB9IGVsc2Uge1xuXG4gICAgICAvLyBPdGhlciB0eXBlcyBvZiByZXF1aXJlZDogYm9vbGVhbiwgY2hlY2tlZCwgY3VzdG9tIGNvbmRpdGlvbi4uP1xuXG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7IC8vIFBhc3NlZCBhbGwgcmVxdWlyZW1lbnRzXG4gIH1cblxufTtcblxuIiwiXG4vKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICpcbiAqIE1vZGVsIEFQSVxuICpcbiAqIGdldFxuICogc2V0XG4gKiByZXNldFxuICogc2l6ZVxuICogZWFjaFxuICogXG4gKiBpbnZhbGlkXG4gKiBpc1ZhbGlkXG4gKiBpc1ZhbGlkS2V5XG4gKlxuICovXG5cbnZhciAkID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cualF1ZXJ5IDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5qUXVlcnkgOiBudWxsKSxcbiAgICB1dGlsID0gcmVxdWlyZSgnLi4vdXRpbC91dGlsJyksXG4gICAgbW9kZWxWYWxpZGF0ZSA9IHJlcXVpcmUoJy4vbW9kZWwtdmFsaWRhdGUnKSxcbiAgICBtb2RlbCA9IHtcblxuICAgICAgZ2V0OiByZXF1aXJlKCcuL21vZGVsLWdldCcpLFxuICAgICAgc2V0OiByZXF1aXJlKCcuL21vZGVsLXNldCcpLFxuXG4gICAgICAvLyBSZXNldHRlciAodG8gaW5pdGlhbCBtb2RlbCB1cG9uIG9iamVjdCBpbml0aWFsaXphdGlvbilcbiAgICAgIHJlc2V0OiBmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLm1vZGVsLnNldCh0aGlzLm1vZGVsLl9pbml0RGF0YSwge3Jlc2V0OnRydWV9KTtcbiAgICAgICAgcmV0dXJuIHRoaXM7IC8vIGZvciBjaGFpbmFibGUgY2FsbHNcbiAgICAgIH0sXG4gICAgICBcbiAgICAgIC8vIE51bWJlciBvZiBtb2RlbCBwcm9wZXJ0aWVzXG4gICAgICBzaXplOiBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gdXRpbC5zaXplKHRoaXMubW9kZWwuX2RhdGEpO1xuICAgICAgfSxcbiAgICAgIFxuICAgICAgLy8gQ29udmVuaWVuY2UgZnVuY3Rpb24gLSBsb29wcyBvdmVyIGVhY2ggbW9kZWwgcHJvcGVydHlcbiAgICAgIGVhY2g6IGZ1bmN0aW9uKGZuKXtcbiAgICAgICAgLy8gUHJveHkgdGhpcyBvYmplY3RcbiAgICAgICAgJC5lYWNoKHRoaXMubW9kZWwuX2RhdGEsICQucHJveHkoZm4sdGhpcykgKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7IC8vIGZvciBjaGFpbmFibGUgY2FsbHNcbiAgICAgIH1cblxuICAgIH07XG5cbm1vZHVsZS5leHBvcnRzID0gJC5leHRlbmQoIG1vZGVsLCBtb2RlbFZhbGlkYXRlICk7XG4iLCJcbi8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKlxuICogVmlldyBiaW5kaW5nc1xuICpcbiAqICBBcHBseSBET00gPC0+IE1vZGVsIGJpbmRpbmdzLCBmcm9tIGVsZW1lbnRzIHdpdGggJ2RhdGEtYmluZCcgYXR0cmlidXRlc1xuICpcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGJpbmRpbmdzKCkge1xuXG4gIHZhciBzZWxmID0gdGhpczsgLy8gUmVmZXJlbmNlIHRvIG9iamVjdFxuICB2YXIgJHJvb3ROb2RlID0gdGhpcy52aWV3LiQoKS5maWx0ZXIoJ1tkYXRhLWJpbmRdJyk7XG4gIHZhciAkY2hpbGROb2RlcyA9IHRoaXMudmlldy4kKCdbZGF0YS1iaW5kXScpO1xuXG4gIHZhciBjcmVhdGVBdHRyaWJ1dGVQYWlyQ2xvc3VyZSA9IGZ1bmN0aW9uKGJpbmREYXRhLCBub2RlLCBpKSB7XG4gICAgdmFyIGF0dHJQYWlyID0gYmluZERhdGEuYXR0cltpXTsgLy8gY2FwdHVyZSB0aGUgYXR0cmlidXRlIHBhaXIgaW4gY2xvc3VyZVxuICAgIHJldHVybiBmdW5jdGlvbigpIHtcblxuICAgICAgaWYgKCBhdHRyUGFpci5hdHRyID09ICdodG1sJyApIHtcbiAgICAgICAgLy8gQWxsb3cgaW5zZXJ0aW5nIEhUTUwgY29udGVudFxuICAgICAgICBub2RlLmh0bWwoc2VsZi5tb2RlbC5nZXQoYXR0clBhaXIuYXR0clZhcikpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gTm9ybWFsIGVsZW1lbnQgYXR0cmlidXRlc1xuICAgICAgICBub2RlLmF0dHIoYXR0clBhaXIuYXR0ciwgc2VsZi5tb2RlbC5nZXQoYXR0clBhaXIuYXR0clZhcikpO1xuICAgICAgfVxuXG4gICAgfTtcbiAgfTtcblxuICAkcm9vdE5vZGUuYWRkKCAkY2hpbGROb2RlcyApLmVhY2goIGZ1bmN0aW9uKCkge1xuXG4gICAgdmFyICRub2RlID0gJCh0aGlzKTtcbiAgICB2YXIgYmluZERhdGEgPSBfcGFyc2VCaW5kU3RyKCAkbm9kZS5kYXRhKCdiaW5kJykgKTtcbiAgICB2YXIgcmVxdWlyZWQgPSAkbm9kZS5kYXRhKCdyZXF1aXJlZCcpOyAvLyBkYXRhLXJlcXVpcmVkXG5cbiAgICB2YXIgYmluZEF0dHJpYnV0ZXNPbmVXYXkgPSBmdW5jdGlvbigpIHtcbiAgICAgIC8vIDEtd2F5IGF0dHJpYnV0ZSBiaW5kaW5nXG4gICAgICBpZiAoYmluZERhdGEuYXR0cikge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJpbmREYXRhLmF0dHIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBzZWxmLmJpbmQoJ19jaGFuZ2U6JytiaW5kRGF0YS5hdHRyW2ldLmF0dHJWYXIsXG4gICAgICAgICAgICBjcmVhdGVBdHRyaWJ1dGVQYWlyQ2xvc3VyZShiaW5kRGF0YSwgJG5vZGUsIGkpKTtcbiAgICAgICAgfSAvLyBmb3IgKGJpbmREYXRhLmF0dHIpXG4gICAgICB9IC8vIGlmIChiaW5kRGF0YS5hdHRyKVxuICAgIH07IC8vIGJpbmRBdHRyaWJ1dGVzT25lV2F5KClcbiAgICBcblxuICAgIC8vIDxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIj46IDItd2F5IGJpbmRpbmdcblxuICAgIGlmICgkbm9kZS5pcygnaW5wdXQ6Y2hlY2tib3gnKSkge1xuICAgICAgLy8gTW9kZWwgLS0+IERPTVxuICAgICAgc2VsZi5iaW5kKCdfY2hhbmdlOicrYmluZERhdGEua2V5LCBmdW5jdGlvbigpe1xuICAgICAgICAkbm9kZS5wcm9wKFwiY2hlY2tlZFwiLCBzZWxmLm1vZGVsLmdldChiaW5kRGF0YS5rZXkpKTsgLy8gdGhpcyB3b24ndCBmaXJlIGEgRE9NICdjaGFuZ2UnIGV2ZW50LCBzYXZpbmcgdXMgZnJvbSBhbiBpbmZpbml0ZSBldmVudCBsb29wIChNb2RlbCA8LS0+IERPTSlcbiAgICAgIH0pOyAgICAgICAgICAgIFxuICAgICAgLy8gRE9NIC0tPiBNb2RlbFxuICAgICAgJG5vZGUuY2hhbmdlKGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBvYmogPSB7fTtcbiAgICAgICAgb2JqW2JpbmREYXRhLmtleV0gPSAkKHRoaXMpLnByb3AoXCJjaGVja2VkXCIpO1xuICAgICAgICBzZWxmLm1vZGVsLnNldChvYmopOyAvLyBub3Qgc2lsZW50IGFzIHVzZXIgbWlnaHQgYmUgbGlzdGVuaW5nIHRvIGNoYW5nZSBldmVudHNcbiAgICAgIH0pO1xuICAgICAgLy8gMS13YXkgYXR0cmlidXRlIGJpbmRpbmdcbiAgICAgIGJpbmRBdHRyaWJ1dGVzT25lV2F5KCk7XG4gICAgfVxuICAgIFxuICAgIC8vIDxzZWxlY3Q+OiAyLXdheSBiaW5kaW5nXG5cbiAgICBlbHNlIGlmICgkbm9kZS5pcygnc2VsZWN0JykpIHtcbiAgICAgIC8vIE1vZGVsIC0tPiBET01cbiAgICAgIHNlbGYuYmluZCgnX2NoYW5nZTonK2JpbmREYXRhLmtleSwgZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIG5vZGVOYW1lID0gJG5vZGUuYXR0cignbmFtZScpO1xuICAgICAgICB2YXIgbW9kZWxWYWx1ZSA9IHNlbGYubW9kZWwuZ2V0KGJpbmREYXRhLmtleSk7XG4gICAgICAgICRub2RlLnZhbChtb2RlbFZhbHVlKTtcbiAgICAgIH0pOyAgICAgICAgICAgIFxuICAgICAgLy8gRE9NIC0tPiBNb2RlbFxuICAgICAgJG5vZGUuY2hhbmdlKGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBvYmogPSB7fTtcbiAgICAgICAgb2JqW2JpbmREYXRhLmtleV0gPSAkbm9kZS52YWwoKTtcbiAgICAgICAgc2VsZi5tb2RlbC5zZXQob2JqKTsgLy8gbm90IHNpbGVudCBhcyB1c2VyIG1pZ2h0IGJlIGxpc3RlbmluZyB0byBjaGFuZ2UgZXZlbnRzXG4gICAgICB9KTtcbiAgICAgIC8vIDEtd2F5IGF0dHJpYnV0ZSBiaW5kaW5nXG4gICAgICBiaW5kQXR0cmlidXRlc09uZVdheSgpO1xuICAgIH1cbiAgICBcbiAgICAvLyA8aW5wdXQgdHlwZT1cInJhZGlvXCI+OiAyLXdheSBiaW5kaW5nXG5cbiAgICBlbHNlIGlmICgkbm9kZS5pcygnaW5wdXQ6cmFkaW8nKSkge1xuXG4gICAgICAvLyBNb2RlbCAtLT4gRE9NXG4gICAgICBzZWxmLmJpbmQoJ19jaGFuZ2U6JytiaW5kRGF0YS5rZXksIGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBub2RlTmFtZSA9ICRub2RlLmF0dHIoJ25hbWUnKTtcbiAgICAgICAgdmFyIG1vZGVsVmFsdWUgPSBzZWxmLm1vZGVsLmdldChiaW5kRGF0YS5rZXkpO1xuXG4gICAgICAgICAgLy8gJG5vZGUuc2libGluZ3MoJ2lucHV0W25hbWU9XCInK25vZGVOYW1lKydcIl0nKS5maWx0ZXIoJ1t2YWx1ZT1cIicrbW9kZWxWYWx1ZSsnXCJdJykucHJvcChcImNoZWNrZWRcIiwgdHJ1ZSk7XG5cbiAgICAgICAgICAvLyBAcHVsbCAjMTEwIEJpbmRpbmcgZm9yIHJhZGlvIGJ1dHRvbnNcbiAgICAgICAgICAvLyBUaGV5J3JlIG5vdCBhbHdheXMgc2libGluZ3MsIHNvIHN0YXJ0IGZyb20gJHJvb3RcbiAgICAgICAgICBzZWxmLnZpZXcuJHJvb3QuZmluZCgnaW5wdXRbbmFtZT1cIicrbm9kZU5hbWUrJ1wiXScpXG4gICAgICAgICAgICAuZmlsdGVyKCdbdmFsdWU9XCInK21vZGVsVmFsdWUrJ1wiXScpXG4gICAgICAgICAgICAucHJvcChcImNoZWNrZWRcIiwgdHJ1ZSk7XG4gICAgICAgICAgICAvLyB0aGlzIHdvbid0IGZpcmUgYSBET00gJ2NoYW5nZScgZXZlbnQsIHNhdmluZyB1cyBmcm9tXG4gICAgICAgICAgICAvLyBhbiBpbmZpbml0ZSBldmVudCBsb29wIChNb2RlbCA8LS0+IERPTSlcbiAgICAgIH0pOyAgICAgICAgICAgIFxuXG4gICAgICAvLyBET00gLS0+IE1vZGVsXG5cbiAgICAgICRub2RlLmNoYW5nZShmdW5jdGlvbigpe1xuICAgICAgICBpZiAoISRub2RlLnByb3AoXCJjaGVja2VkXCIpKSByZXR1cm47IC8vIG9ubHkgaGFuZGxlcyBjaGVjaz10cnVlIGV2ZW50c1xuICAgICAgICB2YXIgb2JqID0ge307XG4gICAgICAgIG9ialtiaW5kRGF0YS5rZXldID0gJG5vZGUudmFsKCk7XG4gICAgICAgIHNlbGYubW9kZWwuc2V0KG9iaik7IC8vIG5vdCBzaWxlbnQgYXMgdXNlciBtaWdodCBiZSBsaXN0ZW5pbmcgdG8gY2hhbmdlIGV2ZW50c1xuICAgICAgfSk7XG4gICAgICAvLyAxLXdheSBhdHRyaWJ1dGUgYmluZGluZ1xuICAgICAgYmluZEF0dHJpYnV0ZXNPbmVXYXkoKTtcbiAgICB9XG4gICAgXG4gICAgLy8gPGlucHV0IHR5cGU9XCJzZWFyY2hcIj4gKG1vZGVsIGlzIHVwZGF0ZWQgYWZ0ZXIgZXZlcnkga2V5cHJlc3MgZXZlbnQpXG5cbiAgICBlbHNlIGlmICgkbm9kZS5pcygnaW5wdXRbdHlwZT1cInNlYXJjaFwiXScpKSB7XG5cbiAgICAgIC8vIE1vZGVsIC0tPiBET01cbiAgICAgIHNlbGYuYmluZCgnX2NoYW5nZTonK2JpbmREYXRhLmtleSwgZnVuY3Rpb24oKXtcbiAgICAgICAgLy8gdGhpcyB3b24ndCBmaXJlIGEgRE9NICdjaGFuZ2UnIGV2ZW50LCBzYXZpbmcgdXMgZnJvbVxuICAgICAgICAvLyBhbiBpbmZpbml0ZSBldmVudCBsb29wIChNb2RlbCA8LS0+IERPTSlcbiAgICAgICAgJG5vZGUudmFsKHNlbGYubW9kZWwuZ2V0KGJpbmREYXRhLmtleSkpO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIE1vZGVsIDwtLSBET01cbiAgICAgICRub2RlLmtleXByZXNzKGZ1bmN0aW9uKCl7XG4gICAgICAgIC8vIFdpdGhvdXQgdGltZW91dCAkbm9kZS52YWwoKSBtaXNzZXMgdGhlIGxhc3QgZW50ZXJlZCBjaGFyYWN0ZXJcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgIHZhciBvYmogPSB7fTtcbiAgICAgICAgICBvYmpbYmluZERhdGEua2V5XSA9ICRub2RlLnZhbCgpO1xuICAgICAgICAgIHNlbGYubW9kZWwuc2V0KG9iaik7IC8vIG5vdCBzaWxlbnQgYXMgdXNlciBtaWdodCBiZSBsaXN0ZW5pbmcgdG8gY2hhbmdlIGV2ZW50c1xuICAgICAgICB9LCA1MCk7XG4gICAgICB9KTtcbiAgICAgIC8vIDEtd2F5IGF0dHJpYnV0ZSBiaW5kaW5nXG4gICAgICBiaW5kQXR0cmlidXRlc09uZVdheSgpO1xuICAgIH1cblxuICAgIC8vIDxpbnB1dCB0eXBlPVwidGV4dFwiPiwgPGlucHV0PiwgYW5kIDx0ZXh0YXJlYT46IDItd2F5IGJpbmRpbmdcblxuICAgIGVsc2UgaWYgKCRub2RlLmlzKCdpbnB1dDp0ZXh0LCBpbnB1dFt0eXBlIT1cInNlYXJjaFwiXSwgdGV4dGFyZWEnKSkge1xuICAgICAgLy8gTW9kZWwgLS0+IERPTVxuICAgICAgc2VsZi5iaW5kKCdfY2hhbmdlOicrYmluZERhdGEua2V5LCBmdW5jdGlvbigpe1xuICAgICAgICAvLyB0aGlzIHdvbid0IGZpcmUgYSBET00gJ2NoYW5nZScgZXZlbnQsIHNhdmluZyB1cyBmcm9tXG4gICAgICAgIC8vIGFuIGluZmluaXRlIGV2ZW50IGxvb3AgKE1vZGVsIDwtLT4gRE9NKVxuICAgICAgICAkbm9kZS52YWwoc2VsZi5tb2RlbC5nZXQoYmluZERhdGEua2V5KSk7XG4gICAgICB9KTsgICAgICAgICAgICBcbiAgICAgIC8vIE1vZGVsIDwtLSBET01cbiAgICAgICRub2RlLmNoYW5nZShmdW5jdGlvbigpe1xuICAgICAgICB2YXIgb2JqID0ge307XG4gICAgICAgIG9ialtiaW5kRGF0YS5rZXldID0gJCh0aGlzKS52YWwoKTtcbiAgICAgICAgc2VsZi5tb2RlbC5zZXQob2JqKTsgLy8gbm90IHNpbGVudCBhcyB1c2VyIG1pZ2h0IGJlIGxpc3RlbmluZyB0byBjaGFuZ2UgZXZlbnRzXG4gICAgICB9KTtcbiAgICAgIC8vIDEtd2F5IGF0dHJpYnV0ZSBiaW5kaW5nXG4gICAgICBiaW5kQXR0cmlidXRlc09uZVdheSgpO1xuICAgIH1cbiAgICBcbiAgICAvLyBhbGwgb3RoZXIgPHRhZz5zOiAxLXdheSBiaW5kaW5nLCBvbmx5IE1vZGVsIC0+IERPTVxuXG4gICAgZWxzZSB7XG4gICAgICBpZiAoYmluZERhdGEua2V5KSB7XG4gICAgICAgIHNlbGYuYmluZCgnX2NoYW5nZTonK2JpbmREYXRhLmtleSwgZnVuY3Rpb24oKXtcbiAgICAgICAgICB2YXIga2V5ID0gc2VsZi5tb2RlbC5nZXQoYmluZERhdGEua2V5KTtcbiAgICAgICAgICBpZiAoa2V5IHx8IGtleT09PTApIHtcbiAgICAgICAgICAgICRub2RlLnRleHQoc2VsZi5tb2RlbC5nZXQoYmluZERhdGEua2V5KS50b1N0cmluZygpKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJG5vZGUudGV4dCgnJyk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGJpbmRBdHRyaWJ1dGVzT25lV2F5KCk7XG4gICAgfVxuXG4gICAgLy8gU3RvcmUgYmluZGluZyBtYXAgZm9yIGxhdGVyIHJlZmVyZW5jZVxuXG4gICAgc2VsZi4kbm9kZVsgYmluZERhdGEua2V5IF0gPSAkbm9kZTsgLy8gTW9kZWwgcHJvcGVydHkgLT4gZWxlbWVudFxuICAgIHNlbGYua2V5WyAkbm9kZSBdID0gYmluZERhdGEua2V5OyAvLyBFbGVtZW50IC0+IE1vZGVsIHByb3BlcnR5XG5cbiAgICBpZiAoIHR5cGVvZiByZXF1aXJlZCAhPT0gJ3VuZGVmaW5lZCcgKSB7XG4gICAgICBzZWxmLnJlcXVpcmVkWyBiaW5kRGF0YS5rZXkgXSA9IHJlcXVpcmVkO1xuICAgIH1cblxuICB9KTsgLy8gbm9kZXMuZWFjaCgpXG5cbiAgcmV0dXJuIHRoaXM7XG5cbn07IC8vIGJpbmRpbmdzKClcblxuXG5cbi8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKlxuICogUGFyc2UgZGF0YS1iaW5kIHN0cmluZ1xuICogXG4gKiBTeW50YXg6J1thdHRyaWJ1dGVdWz1dIHZhcmlhYmxlWywgW2F0dHJpYnV0ZV1bPV0gdmFyaWFibGUgXS4uLidcbiAqIFxuICogQWxsIHBhaXJzIGluIHRoZSBsaXN0IGFyZSBhc3N1bWVkIHRvIGJlIGF0dHJpYnV0ZXNcbiAqIElmIHRoZSB2YXJpYWJsZSBpcyBub3QgYW4gYXR0cmlidXRlLCBpdCBtdXN0IG9jY3VyIGJ5IGl0c2VsZlxuICpcbiAqIFJldHVybnMgeyBrZXk6J21vZGVsIGtleScsIGF0dHI6IFsge2F0dHIgOiAnYXR0cmlidXRlJywgYXR0clZhciA6ICd2YXJpYWJsZScgfS4uLiBdIH1cbiAqXG4gKi9cblxuZnVuY3Rpb24gX3BhcnNlQmluZFN0ciggc3RyICkge1xuICB2YXIgb2JqID0ge2tleTpudWxsLCBhdHRyOltdfSxcbiAgICAgIHBhaXJzID0gc3RyLnNwbGl0KCcsJyksXG4gICAgICAvLyByZWdleCA9IC8oW2EtekEtWjAtOV9cXC1dKykoPzpbXFxzPV0rKFthLXpBLVowLTlfXFwtXSspKT8vLFxuICAgICAgLy8gQHB1bGwgIzkxIEFkZCBzdXBwb3J0IGZvciBuZXN0ZWQgbW9kZWxzOiBrZXkucHJvcFxuICAgICAgcmVnZXggPSAvKFthLXpBLVowLTlfXFwtXFwuXSspKD86W1xccz1dKyhbYS16QS1aMC05X1xcLV0rKSk/LyxcbiAgICAgIGtleUFzc2lnbmVkID0gZmFsc2UsXG4gICAgICBtYXRjaGVkO1xuICBcbiAgaWYgKHBhaXJzLmxlbmd0aCA+IDApIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhaXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBtYXRjaGVkID0gcGFpcnNbaV0ubWF0Y2gocmVnZXgpO1xuICAgICAgLy8gWyBcImF0dHJpYnV0ZSB2YXJpYWJsZVwiLCBcImF0dHJpYnV0ZVwiLCBcInZhcmlhYmxlXCIgXVxuICAgICAgLy8gb3IgWyBcImF0dHJpYnV0ZT12YXJpYWJsZVwiLCBcImF0dHJpYnV0ZVwiLCBcInZhcmlhYmxlXCIgXVxuICAgICAgLy8gb3JcbiAgICAgIC8vIFsgXCJ2YXJpYWJsZVwiLCBcInZhcmlhYmxlXCIsIHVuZGVmaW5lZCBdXG4gICAgICAvLyBpbiBzb21lIElFIGl0IHdpbGwgYmUgWyBcInZhcmlhYmxlXCIsIFwidmFyaWFibGVcIiwgXCJcIiBdXG4gICAgICAvLyBvclxuICAgICAgLy8gbnVsbFxuICAgICAgaWYgKG1hdGNoZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZihtYXRjaGVkWzJdKSA9PT0gXCJ1bmRlZmluZWRcIiB8fCBtYXRjaGVkWzJdID09PSBcIlwiKSB7XG4gICAgICAgICAgaWYgKGtleUFzc2lnbmVkKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJZb3UgbWF5IHNwZWNpZnkgb25seSBvbmUga2V5IChcIiArIFxuICAgICAgICAgICAgICBrZXlBc3NpZ25lZCArIFwiIGhhcyBhbHJlYWR5IGJlZW4gc3BlY2lmaWVkIGluIGRhdGEtYmluZD1cIiArIFxuICAgICAgICAgICAgICBzdHIgKyBcIilcIik7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGtleUFzc2lnbmVkID0gbWF0Y2hlZFsxXTtcbiAgICAgICAgICAgIG9iai5rZXkgPSBtYXRjaGVkWzFdO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvYmouYXR0ci5wdXNoKHthdHRyOiBtYXRjaGVkWzFdLCBhdHRyVmFyOiBtYXRjaGVkWzJdfSk7XG4gICAgICAgIH1cbiAgICAgIH0gLy8gaWYgKG1hdGNoZWQpXG4gICAgfSAvLyBmb3IgKHBhaXJzLmxlbmd0aClcbiAgfSAvLyBpZiAocGFpcnMubGVuZ3RoID4gMClcbiAgXG4gIHJldHVybiBvYmo7XG59XG4iLCJcbi8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKlxuICogVmlldyBBUElcbiAqXG4gKiB2aWV3LmZvcm1hdFxuICogdmlldy5zdHlsZVxuICogdmlldy4kXG4gKiByZW5kZXJcbiAqIGJpbmRpbmdzXG4gKiBzeW5jXG4gKiBzdHlsaXplXG4gKiAkYm91bmRcbiAqXG4gKi9cblxudmFyIHZpZXdCaW5kID0gcmVxdWlyZSgnLi92aWV3LWJpbmQnKSwgLy8gVmlldyBiaW5kaW5nc1xuICAgIFJPT1RfU0VMRUNUT1IgPSAnJic7IC8vIEFsc28gaW4gcHJvdG90eXBlL2V2ZW50cy5qc1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBcbiAgLy8gRGVmYXVsdHNcbiAgZm9ybWF0OiAnPGRpdi8+JyxcbiAgc3R5bGU6ICcnLFxuICBcbiAgLy8gU2hvcnRjdXQgdG8gdmlldy4kcm9vdCBvciB2aWV3LiRyb290LmZpbmQoKSwgZGVwZW5kaW5nIG9uIHNlbGVjdG9yIHByZXNlbmNlXG4gICQ6IGZ1bmN0aW9uKHNlbGVjdG9yKSB7XG4gICAgcmV0dXJuICghc2VsZWN0b3IgfHwgc2VsZWN0b3IgPT09IFJPT1RfU0VMRUNUT1IpID8gdGhpcy52aWV3LiRyb290IDogdGhpcy52aWV3LiRyb290LmZpbmQoc2VsZWN0b3IpO1xuICB9LFxuICBcblxuICAvLyBSZW5kZXIgJHJvb3RcbiAgLy8gT25seSBmdW5jdGlvbiB0byBhY2Nlc3MgJHJvb3QgZGlyZWN0bHkgb3RoZXIgdGhhbiAkKClcbiAgcmVuZGVyOiBmdW5jdGlvbigpe1xuXG4gICAgLy8gV2l0aG91dCBmb3JtYXQgdGhlcmUgaXMgbm8gdmlld1xuICAgIGlmICh0aGlzLnZpZXcuZm9ybWF0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhyb3cgXCJhZ2lsaXR5LmpzOiBlbXB0eSBmb3JtYXQgaW4gdmlldy5yZW5kZXIoKVwiO1xuICAgIH0gICAgICAgICAgICAgICAgXG5cbiAgICBpZiAoIHRoaXMudmlldy4kcm9vdCBpbnN0YW5jZW9mIGpRdWVyeSAmJiB0aGlzLl90ZW1wbGF0ZSApIHtcblxuICAgICAgLy8gJHJvb3QgaXMgZnJvbSBET00gYWxyZWFkeVxuXG4gICAgfSBlbHNlIGlmICggdGhpcy52aWV3LiRyb290LnNpemUoKSA9PT0gMCApIHtcblxuICAgICAgdGhpcy52aWV3LiRyb290ID0gJCh0aGlzLnZpZXcuZm9ybWF0KTtcblxuICAgIH0gZWxzZSB7XG5cbiAgICAgIC8vIGRvbid0IG92ZXJ3cml0ZSAkcm9vdCBhcyB0aGlzIHdvdWxkIHJlc2V0IGl0cyBwcmVzZW5jZSBpbiB0aGUgRE9NXG4gICAgICAvLyBhbmQgYWxsIGV2ZW50cyBhbHJlYWR5IGJvdW5kXG5cbiAgICAgIHRoaXMudmlldy4kcm9vdC5odG1sKCAkKHRoaXMudmlldy5mb3JtYXQpLmh0bWwoKSApO1xuICAgIH1cblxuICAgIC8vIEVuc3VyZSB3ZSBoYXZlIGEgdmFsaWQgKG5vbi1lbXB0eSkgJHJvb3RcbiAgICBpZiAoICEodGhpcy52aWV3LiRyb290IGluc3RhbmNlb2YgalF1ZXJ5KSAmJiB0aGlzLnZpZXcuJHJvb3Quc2l6ZSgpID09PSAwICkge1xuICAgICAgdGhyb3cgJ2FnaWxpdHkuanM6IGNvdWxkIG5vdCBnZW5lcmF0ZSBodG1sIGZyb20gZm9ybWF0JztcbiAgICB9XG5cbiAgICB0aGlzLiR2aWV3ID0gdGhpcy52aWV3LiRyb290O1xuICAgIHRoaXMuJCA9IHRoaXMudmlldy4kO1xuICAgIHJldHVybiB0aGlzO1xuICB9LCAvLyByZW5kZXJcblxuXG5cbiAgLy8gQXBwbHkgRE9NIDwtPiBNb2RlbCBiaW5kaW5nc1xuXG4gIGJpbmRpbmdzOiB2aWV3QmluZCxcblxuICBcblxuICAvLyBUcmlnZ2VycyBfY2hhbmdlIGFuZCBfY2hhbmdlOiogZXZlbnRzIHNvIHRoYXQgdmlldyBpcyB1cGRhdGVkIGFzIHBlciB2aWV3LmJpbmRpbmdzKClcbiAgc3luYzogZnVuY3Rpb24oKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy8gVHJpZ2dlciBjaGFuZ2UgZXZlbnRzIHNvIHRoYXQgdmlldyBpcyB1cGRhdGVkIGFjY29yZGluZyB0byBtb2RlbFxuICAgIHRoaXMubW9kZWwuZWFjaChmdW5jdGlvbihrZXksIHZhbCl7XG4gICAgICBzZWxmLnRyaWdnZXIoJ19jaGFuZ2U6JytrZXkpO1xuICAgIH0pO1xuICAgIGlmICh0aGlzLm1vZGVsLnNpemUoKSA+IDApIHtcbiAgICAgIHRoaXMudHJpZ2dlcignX2NoYW5nZScpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuXG4gIC8vIEFwcGxpZXMgc3R5bGUgZHluYW1pY2FsbHlcbiAgc3R5bGl6ZTogZnVuY3Rpb24oKXtcbiAgICB2YXIgb2JqQ2xhc3MsXG4gICAgICAgIHJlZ2V4ID0gbmV3IFJlZ0V4cChST09UX1NFTEVDVE9SLCAnZycpO1xuICAgIGlmICh0aGlzLnZpZXcuc3R5bGUubGVuZ3RoID09PSAwIHx8IHRoaXMudmlldy4kKCkuc2l6ZSgpID09PSAwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIE93biBzdHlsZVxuICAgIC8vIE9iamVjdCBnZXRzIG93biBjbGFzcyBuYW1lIFwiLmFnaWxpdHlfMTIzXCIsIGFuZCA8aGVhZD4gZ2V0cyBhIGNvcnJlc3BvbmRpbmcgPHN0eWxlPlxuICAgIGlmICh0aGlzLnZpZXcuaGFzT3duUHJvcGVydHkoJ3N0eWxlJykpIHtcbiAgICAgIG9iakNsYXNzID0gJ2FnaWxpdHlfJyArIHRoaXMuX2lkO1xuICAgICAgdmFyIHN0eWxlU3RyID0gdGhpcy52aWV3LnN0eWxlLnJlcGxhY2UocmVnZXgsICcuJytvYmpDbGFzcyk7XG4gICAgICAvLyAkKCdoZWFkJywgd2luZG93LmRvY3VtZW50KS5hcHBlbmQoJzxzdHlsZSB0eXBlPVwidGV4dC9jc3NcIj4nK3N0eWxlU3RyKyc8L3N0eWxlPicpO1xuXG4gICAgICAvLyBAcHVsbCAjOTUgQWRkIElEIHNvIGxhdGVyIHdlIGNhbiByZW1vdmUgZ2VuZXJhdGVkIHN0eWxlXG4gICAgICAvLyB1cG9uIGRlc3RydWN0aW9uIG9mIG9iamVjdHNcbiAgICAgICQoJ2hlYWQnLCB3aW5kb3cuZG9jdW1lbnQpLmFwcGVuZCgnPHN0eWxlIGlkPVwiJysgb2JqQ2xhc3MgKydcIiB0eXBlPVwidGV4dC9jc3NcIj4nK1xuICAgICAgICBzdHlsZVN0cisnPC9zdHlsZT4nKTtcbiAgICAgIHRoaXMudmlldy4kKCkuYWRkQ2xhc3Mob2JqQ2xhc3MpO1xuICAgIH1cbiAgICAvLyBJbmhlcml0ZWQgc3R5bGVcbiAgICAvLyBPYmplY3QgaW5oZXJpdHMgQ1NTIGNsYXNzIG5hbWUgZnJvbSBmaXJzdCBhbmNlc3RvciB0byBoYXZlIG93biB2aWV3LnN0eWxlXG4gICAgZWxzZSB7XG4gICAgICAvLyBSZXR1cm5zIGlkIG9mIGZpcnN0IGFuY2VzdG9yIHRvIGhhdmUgJ293bicgdmlldy5zdHlsZVxuICAgICAgdmFyIGFuY2VzdG9yV2l0aFN0eWxlID0gZnVuY3Rpb24ob2JqZWN0KSB7XG4gICAgICAgIHdoaWxlIChvYmplY3QgIT09IG51bGwpIHtcbiAgICAgICAgICBvYmplY3QgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2Yob2JqZWN0KTtcbiAgICAgICAgICBpZiAob2JqZWN0LnZpZXcuaGFzT3duUHJvcGVydHkoJ3N0eWxlJykpXG4gICAgICAgICAgICByZXR1cm4gb2JqZWN0Ll9pZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfTsgLy8gYW5jZXN0b3JXaXRoU3R5bGVcblxuICAgICAgdmFyIGFuY2VzdG9ySWQgPSBhbmNlc3RvcldpdGhTdHlsZSh0aGlzKTtcbiAgICAgIG9iakNsYXNzID0gJ2FnaWxpdHlfJyArIGFuY2VzdG9ySWQ7XG4gICAgICB0aGlzLnZpZXcuJCgpLmFkZENsYXNzKG9iakNsYXNzKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cblxuICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKlxuICAgKiBFeHRlbmRlZFxuICAgKlxuICAgKi9cblxuICAvLyBSZXR1cm4gZWxlbWVudChzKSBib3VuZCB0byBhIG1vZGVsIHByb3BlcnR5XG4gIC8vIFJlZmVyIHRvIG1hcCBpbiBtYWluIG9iamVjdFxuXG4gICRib3VuZDogZnVuY3Rpb24oIGtleSApIHtcblxuICAgIHJldHVybiB0eXBlb2YgdGhpcy4kbm9kZVsga2V5IF0gIT09IHVuZGVmaW5lZCA/IHRoaXMuJG5vZGVbIGtleSBdIDogZmFsc2U7XG5cbiAgICAvKiBPbGQgd2F5OiBmcm9tIERPTVxuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHJldHVybiB0aGlzLnZpZXcuJCgnW2RhdGEtYmluZF0nKS5maWx0ZXIoZnVuY3Rpb24oKXtcbiAgICAgIHZhciBiaW5kRGF0YSA9IHNlbGYudmlldy5fcGFyc2VCaW5kU3RyKCAkKHRoaXMpLmRhdGEoJ2JpbmQnKSApO1xuICAgICAgLy8gV2hhdCBhYm91dCBtdWx0aXBsZSBvciBuZXN0ZWQgYmluZGluZ3M/XG4gICAgICByZXR1cm4gKCBiaW5kRGF0YS5rZXkgPT0ga2V5ICk7XG4gICAgfSk7ICovXG4gIH1cblxufTtcbiIsIlxuLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqXG4gKiBfY29udGFpbmVyXG4gKlxuICogQVBJIGFuZCByZWxhdGVkIGF1eGlsaWFyeSBmdW5jdGlvbnMgZm9yIHN0b3JpbmcgY2hpbGQgQWdpbGl0eSBvYmplY3RzLlxuICogTm90IGFsbCBtZXRob2RzIGFyZSBleHBvc2VkLiBTZWUgJ3Nob3J0Y3V0cycgYmVsb3cgZm9yIGV4cG9zZWQgbWV0aG9kcy5cbiAqXG4gKi9cblxudmFyICQgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5qUXVlcnkgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLmpRdWVyeSA6IG51bGwpLFxuICAgIHV0aWwgPSByZXF1aXJlKCcuLi91dGlsL3V0aWwnKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgLy8gQWRkcyBjaGlsZCBvYmplY3QgdG8gY29udGFpbmVyLCBhcHBlbmRzL3ByZXBlbmRzL2V0YyB2aWV3LCBsaXN0ZW5zIGZvciBjaGlsZCByZW1vdmFsXG4gIF9pbnNlcnRPYmplY3Q6IGZ1bmN0aW9uKG9iaiwgc2VsZWN0b3IsIG1ldGhvZCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgaWYgKCF1dGlsLmlzQWdpbGl0eShvYmopKSB7XG4gICAgICB0aHJvdyBcImFnaWxpdHkuanM6IGFwcGVuZCBhcmd1bWVudCBpcyBub3QgYW4gYWdpbGl0eSBvYmplY3RcIjtcbiAgICB9XG5cbiAgICB0aGlzLl9jb250YWluZXIuY2hpbGRyZW5bb2JqLl9pZF0gPSBvYmo7IC8vIGNoaWxkcmVuIGlzICpub3QqIGFuIGFycmF5OyB0aGlzIGlzIGZvciBzaW1wbGVyIGxvb2t1cHMgYnkgZ2xvYmFsIG9iamVjdCBpZFxuICAgIHRoaXMudHJpZ2dlcihtZXRob2QsIFtvYmosIHNlbGVjdG9yXSk7XG4gICAgb2JqLl9wYXJlbnQgPSB0aGlzO1xuICAgIC8vIGVuc3VyZXMgb2JqZWN0IGlzIHJlbW92ZWQgZnJvbSBjb250YWluZXIgd2hlbiBkZXN0cm95ZWQ6XG4gICAgb2JqLmJpbmQoJ2Rlc3Ryb3knLCBmdW5jdGlvbihldmVudCwgaWQpeyBcbiAgICAgIHNlbGYuX2NvbnRhaW5lci5yZW1vdmUoaWQpO1xuICAgIH0pO1xuICAgIC8vIFRyaWdnZXIgZXZlbnQgZm9yIGNoaWxkIHRvIGxpc3RlbiB0b1xuICAgIG9iai50cmlnZ2VyKCdwYXJlbnQ6JyttZXRob2QpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIGFwcGVuZDogZnVuY3Rpb24ob2JqLCBzZWxlY3RvcikgeyBcbiAgICAgIHJldHVybiB0aGlzLl9jb250YWluZXIuX2luc2VydE9iamVjdC5jYWxsKHRoaXMsIG9iaiwgc2VsZWN0b3IsICdhcHBlbmQnKTsgXG4gIH0sXG5cbiAgcHJlcGVuZDogZnVuY3Rpb24ob2JqLCBzZWxlY3RvcikgeyBcbiAgICAgIHJldHVybiB0aGlzLl9jb250YWluZXIuX2luc2VydE9iamVjdC5jYWxsKHRoaXMsIG9iaiwgc2VsZWN0b3IsICdwcmVwZW5kJyk7IFxuICB9LFxuXG4gIGFmdGVyOiBmdW5jdGlvbihvYmosIHNlbGVjdG9yKSB7IFxuICAgICAgcmV0dXJuIHRoaXMuX2NvbnRhaW5lci5faW5zZXJ0T2JqZWN0LmNhbGwodGhpcywgb2JqLCBzZWxlY3RvciwgJ2FmdGVyJyk7IFxuICB9LFxuXG4gIGJlZm9yZTogZnVuY3Rpb24ob2JqLCBzZWxlY3RvcikgeyBcbiAgICAgIHJldHVybiB0aGlzLl9jb250YWluZXIuX2luc2VydE9iamVjdC5jYWxsKHRoaXMsIG9iaiwgc2VsZWN0b3IsICdiZWZvcmUnKTsgXG4gIH0sXG4gIFxuICAvLyBSZW1vdmVzIGNoaWxkIG9iamVjdCBmcm9tIGNvbnRhaW5lclxuICByZW1vdmU6IGZ1bmN0aW9uKGlkKXtcbiAgICBkZWxldGUgdGhpcy5fY29udGFpbmVyLmNoaWxkcmVuW2lkXTtcbiAgICB0aGlzLnRyaWdnZXIoJ3JlbW92ZScsIGlkKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvLyBJdGVyYXRlcyBvdmVyIGFsbCBjaGlsZCBvYmplY3RzIGluIGNvbnRhaW5lclxuICBlYWNoOiBmdW5jdGlvbihmbil7XG4gICAgJC5lYWNoKHRoaXMuX2NvbnRhaW5lci5jaGlsZHJlbiwgZm4pO1xuICAgIHJldHVybiB0aGlzOyAvLyBmb3IgY2hhaW5hYmxlIGNhbGxzXG4gIH0sXG5cbiAgLy8gUmVtb3ZlcyBhbGwgb2JqZWN0cyBpbiBjb250YWluZXJcbiAgZW1wdHk6IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICB0aGlzLmRlc3Ryb3koKTtcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgXG4gIC8vIE51bWJlciBvZiBjaGlsZHJlblxuICBzaXplOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdXRpbC5zaXplKHRoaXMuX2NvbnRhaW5lci5jaGlsZHJlbik7XG4gIH1cbiAgXG59O1xuIiwiXG4vKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICpcbiAqIF9ldmVudHMgQVBJIGFuZCBhdXhpbGlhcnkgZnVuY3Rpb25zIGZvciBoYW5kbGluZyBldmVudHNcbiAqXG4gKi9cblxudmFyICQgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5qUXVlcnkgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLmpRdWVyeSA6IG51bGwpLFxuICAgIFJPT1RfU0VMRUNUT1IgPSAnJic7IC8vIEFsc28gaW4gbXZjL3ZpZXcuanNcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgLy8gQmluZHMgZXZlbnRTdHIgdG8gZm4uIGV2ZW50U3RyIGlzIHBhcnNlZCBhcyBwZXIgcGFyc2VFdmVudFN0cigpXG4gIGJpbmQ6IGZ1bmN0aW9uKGV2ZW50U3RyLCBmbil7XG5cbiAgICB2YXIgZXZlbnRPYmogPSBwYXJzZUV2ZW50U3RyKGV2ZW50U3RyKTtcblxuICAgIC8vIERPTSBldmVudCAnZXZlbnQgc2VsZWN0b3InLCBlLmcuICdjbGljayBidXR0b24nXG4gICAgaWYgKGV2ZW50T2JqLnNlbGVjdG9yKSB7XG5cbiAgICAgIC8vIEtlZXAgY2xpY2sgYW5kIHN1Ym1pdCBsb2NhbGl6ZWRcbiAgICAgIHZhciBmbnggPSBmdW5jdGlvbihldmVudCkge1xuICAgICAgICBmbihldmVudCk7XG4gICAgICAgIHJldHVybiBmYWxzZTsgLy8gUHJldmVudCBkZWZhdWx0ICYgYnViYmxpbmdcbiAgICAgICAgLy8gb3IganVzdCBkZWZhdWx0PyBpZiAoICEgZXZlbnQuaXNEZWZhdWx0UHJldmVudGVkKCkgKSBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgfTtcblxuICAgICAgLy8gTWFudWFsbHkgb3ZlcnJpZGUgcm9vdCBzZWxlY3RvciwgYXMgalF1ZXJ5IHNlbGVjdG9ycyBjYW4ndCBzZWxlY3Qgc2VsZiBvYmplY3RcbiAgICAgIGlmIChldmVudE9iai5zZWxlY3RvciA9PT0gUk9PVF9TRUxFQ1RPUikge1xuXG4gICAgICAgIGlmICggZXZlbnRPYmoudHlwZSA9PT0gJ2NsaWNrJyB8fCBldmVudE9iai50eXBlID09PSAnc3VibWl0JyApIHtcbiAgICAgICAgICB0aGlzLnZpZXcuJCgpLm9uKGV2ZW50T2JqLnR5cGUsIGZueCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy52aWV3LiQoKS5vbihldmVudE9iai50eXBlLCBmbik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBAZXh0ZW5kIFJlcGxhY2UgJCgpLmJpbmQgd2l0aCAkKCkub25cbiAgICAgICAgLy8gdGhpcy52aWV3LiQoKS5iaW5kKGV2ZW50T2JqLnR5cGUsIGZuKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuXG4gICAgICAgIGlmICggZXZlbnRPYmoudHlwZSA9PT0gJ2NsaWNrJyB8fCBldmVudE9iai50eXBlID09PSAnc3VibWl0JyApIHtcbiAgICAgICAgICB0aGlzLnZpZXcuJCgpLm9uKGV2ZW50T2JqLnR5cGUsIGV2ZW50T2JqLnNlbGVjdG9yLCBmbngpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMudmlldy4kKCkub24oZXZlbnRPYmoudHlwZSwgZXZlbnRPYmouc2VsZWN0b3IsIGZuKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEBleHRlbmQgUmVwbGFjZSAkKCkuZGVsZWdhdGUgd2l0aCAkKCkub25cbiAgICAgICAgLy8gdGhpcy52aWV3LiQoKS5kZWxlZ2F0ZShldmVudE9iai5zZWxlY3RvciwgZXZlbnRPYmoudHlwZSwgZm4pO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBDdXN0b20gZXZlbnRcbiAgICBlbHNlIHtcblxuICAgICAgLy8gQGV4dGVuZCBSZXBsYWNlICQoKS5iaW5kIHdpdGggJCgpLm9uXG4gICAgICAkKHRoaXMuX2V2ZW50cy5kYXRhKS5vbihldmVudE9iai50eXBlLCBmbik7XG4gICAgICAvLyAkKHRoaXMuX2V2ZW50cy5kYXRhKS5iaW5kKGV2ZW50T2JqLnR5cGUsIGZuKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7IC8vIGZvciBjaGFpbmFibGUgY2FsbHNcbiAgfSwgLy8gYmluZFxuXG4gIC8vIEFsaWFzIHRvIGJpbmQoKVxuICBvbjogZnVuY3Rpb24oIGV2ZW50U3RyLCBmbiApIHtcbiAgICByZXR1cm4gdGhpcy5fZXZlbnRzLmJpbmQoIGV2ZW50U3RyLCBmbiApO1xuICB9LFxuXG4gIC8vIFRyaWdnZXJzIGV2ZW50U3RyLiBTeW50YXggZm9yIGV2ZW50U3RyIGlzIHNhbWUgYXMgdGhhdCBmb3IgYmluZCgpXG4gIHRyaWdnZXI6IGZ1bmN0aW9uKGV2ZW50U3RyLCBwYXJhbXMpe1xuXG4gICAgdmFyIGV2ZW50T2JqID0gcGFyc2VFdmVudFN0cihldmVudFN0cik7XG5cbiAgICAvLyBET00gZXZlbnQgJ2V2ZW50IHNlbGVjdG9yJywgZS5nLiAnY2xpY2sgYnV0dG9uJ1xuICAgIGlmIChldmVudE9iai5zZWxlY3Rvcikge1xuICAgICAgLy8gTWFudWFsbHkgb3ZlcnJpZGUgcm9vdCBzZWxlY3RvciwgYXMgalF1ZXJ5IHNlbGVjdG9ycyBjYW4ndCBzZWxlY3Qgc2VsZiBvYmplY3RcbiAgICAgIGlmIChldmVudE9iai5zZWxlY3RvciA9PT0gUk9PVF9TRUxFQ1RPUikge1xuICAgICAgICB0aGlzLnZpZXcuJCgpLnRyaWdnZXIoZXZlbnRPYmoudHlwZSwgcGFyYW1zKTtcbiAgICAgIH1cbiAgICAgIGVsc2UgeyAgICAgICAgICBcbiAgICAgICAgdGhpcy52aWV3LiQoKS5maW5kKGV2ZW50T2JqLnNlbGVjdG9yKS50cmlnZ2VyKGV2ZW50T2JqLnR5cGUsIHBhcmFtcyk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIEN1c3RvbSBldmVudFxuICAgIGVsc2Uge1xuICAgICAgJCh0aGlzLl9ldmVudHMuZGF0YSkudHJpZ2dlcignXycrZXZlbnRPYmoudHlwZSwgcGFyYW1zKTtcbiAgICAgIC8vIGZpcmUgJ3ByZScgaG9va3MgaW4gcmV2ZXJzZSBhdHRhY2htZW50IG9yZGVyICggbGFzdCBmaXJzdCApIHRoZW4gcHV0IHRoZW0gYmFja1xuICAgICAgcmV2ZXJzZUV2ZW50cyh0aGlzLl9ldmVudHMuZGF0YSwgJ3ByZTonICsgZXZlbnRPYmoudHlwZSk7XG4gICAgICAkKHRoaXMuX2V2ZW50cy5kYXRhKS50cmlnZ2VyKCdwcmU6JyArIGV2ZW50T2JqLnR5cGUsIHBhcmFtcyk7XG4gICAgICByZXZlcnNlRXZlbnRzKHRoaXMuX2V2ZW50cy5kYXRhLCAncHJlOicgKyBldmVudE9iai50eXBlKTtcblxuICAgICAgJCh0aGlzLl9ldmVudHMuZGF0YSkudHJpZ2dlcihldmVudE9iai50eXBlLCBwYXJhbXMpO1xuXG4gICAgICAvLyBUcmlnZ2VyIGV2ZW50IGZvciBwYXJlbnRcbiAgICAgIGlmICh0aGlzLnBhcmVudCgpKVxuICAgICAgICB0aGlzLnBhcmVudCgpLnRyaWdnZXIoKGV2ZW50T2JqLnR5cGUubWF0Y2goL15jaGlsZDovKSA/ICcnIDogJ2NoaWxkOicpICsgZXZlbnRPYmoudHlwZSwgcGFyYW1zKTtcbiAgICAgICQodGhpcy5fZXZlbnRzLmRhdGEpLnRyaWdnZXIoJ3Bvc3Q6JyArIGV2ZW50T2JqLnR5cGUsIHBhcmFtcyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzOyAvLyBmb3IgY2hhaW5hYmxlIGNhbGxzXG4gIH0gLy8gdHJpZ2dlclxuICBcbn07XG5cblxuLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqXG4gKiBQYXJzZSBldmVudCBzdHJpbmdcbiAqXG4gKiAnZXZlbnQnICAgICAgICAgIDogY3VzdG9tIGV2ZW50XG4gKiAnZXZlbnQgc2VsZWN0b3InIDogRE9NIGV2ZW50IHVzaW5nICdzZWxlY3RvcidcbiAqXG4gKiBSZXR1cm5zIHsgdHlwZTonZXZlbnQnIFssIHNlbGVjdG9yOidzZWxlY3RvciddIH1cbiAqIFxuICovXG5cbmZ1bmN0aW9uIHBhcnNlRXZlbnRTdHIoIGV2ZW50U3RyICkge1xuXG4gIHZhciBldmVudE9iaiA9IHsgdHlwZTpldmVudFN0ciB9LCBcbiAgICAgIHNwYWNlUG9zID0gZXZlbnRTdHIuc2VhcmNoKC9cXHMvKTtcblxuICAvLyBET00gZXZlbnQgJ2V2ZW50IHNlbGVjdG9yJywgZS5nLiAnY2xpY2sgYnV0dG9uJ1xuICBpZiAoc3BhY2VQb3MgPiAtMSkge1xuICAgIGV2ZW50T2JqLnR5cGUgPSBldmVudFN0ci5zdWJzdHIoMCwgc3BhY2VQb3MpO1xuICAgIGV2ZW50T2JqLnNlbGVjdG9yID0gZXZlbnRTdHIuc3Vic3RyKHNwYWNlUG9zKzEpO1xuICB9IGVsc2UgaWYgKCBldmVudFN0ciA9PT0gJ2NsaWNrJyB8fCBldmVudFN0ciA9PT0gJ3N1Ym1pdCcgKSB7XG4gICAgLy8gQGV4dGVuZCBTaG9ydGN1dCBmb3IgJ2NsaWNrICYnIGFuZCAnc3VibWl0ICYnXG4gICAgZXZlbnRPYmoudHlwZSA9IGV2ZW50U3RyO1xuICAgIGV2ZW50T2JqLnNlbGVjdG9yID0gUk9PVF9TRUxFQ1RPUjtcbiAgfVxuICByZXR1cm4gZXZlbnRPYmo7XG59XG5cbi8vIFJldmVyc2VzIHRoZSBvcmRlciBvZiBldmVudHMgYXR0YWNoZWQgdG8gYW4gb2JqZWN0XG5cbmZ1bmN0aW9uIHJldmVyc2VFdmVudHMob2JqLCBldmVudFR5cGUpe1xuXG4gIHZhciBldmVudHMgPSAkKG9iaikuZGF0YSgnZXZlbnRzJyk7XG5cbiAgaWYgKGV2ZW50cyAhPT0gdW5kZWZpbmVkICYmIGV2ZW50c1tldmVudFR5cGVdICE9PSB1bmRlZmluZWQpe1xuICAgIC8vIGNhbid0IHJldmVyc2Ugd2hhdCdzIG5vdCB0aGVyZVxuICAgIHZhciByZXZlcnNlZEV2ZW50cyA9IFtdO1xuICAgIGZvciAodmFyIGUgaW4gZXZlbnRzW2V2ZW50VHlwZV0pe1xuICAgICAgaWYgKCFldmVudHNbZXZlbnRUeXBlXS5oYXNPd25Qcm9wZXJ0eShlKSkgY29udGludWU7XG4gICAgICByZXZlcnNlZEV2ZW50cy51bnNoaWZ0KGV2ZW50c1tldmVudFR5cGVdW2VdKTtcbiAgICB9XG4gICAgZXZlbnRzW2V2ZW50VHlwZV0gPSByZXZlcnNlZEV2ZW50cztcbiAgfVxufVxuIiwiXG4vKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICpcbiAqIEV4dGVuZGVkIHNob3J0Y3V0c1xuICogXG4gKiByZXBsYWNlLCBjaGlsZCwgY2hpbGRyZW4sIGxvYWRcbiAqXG4gKi9cblxudmFyICQgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5qUXVlcnkgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLmpRdWVyeSA6IG51bGwpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICBnZXQgOiBmdW5jdGlvbiggYXJnICkge1xuICAgIHJldHVybiB0aGlzLm1vZGVsLmdldCggYXJnICk7XG4gIH0sXG5cbiAgc2V0IDogZnVuY3Rpb24oIGFyZywgcGFyYW1zLCB0aGlyZCApIHtcbiAgICByZXR1cm4gdGhpcy5tb2RlbC5zZXQoIGFyZywgcGFyYW1zLCB0aGlyZCAgKTtcbiAgfSxcblxuICBpbnZhbGlkIDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMubW9kZWwuaW52YWxpZCgpO1xuICB9LFxuXG4gIHJlcGxhY2U6IGZ1bmN0aW9uKCBvYmosIHNlbGVjdG9yICl7XG4gICAgaWYgKCB0eXBlb2Ygc2VsZWN0b3IgPT09ICdzdHJpbmcnICkge1xuICAgICAgdGhpcy52aWV3LiQoc2VsZWN0b3IpLmh0bWwoJycpO1xuICAgIH1cbiAgICB0aGlzLmVtcHR5KCkuX2NvbnRhaW5lci5hcHBlbmQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICByZXR1cm4gdGhpczsgLy8gZm9yIGNoYWluYWJsZSBjYWxsc1xuICB9LFxuXG4gIC8vIFJldHVybiBudGggY2hpbGQgb2JqZWN0XG4gIGNoaWxkOiBmdW5jdGlvbihuKXtcbiAgICB2YXIgaSA9IDA7XG4gICAgbiA9IG4gfHwgMDtcblxuICAgIGZvciAodmFyIGogaW4gdGhpcy5fY29udGFpbmVyLmNoaWxkcmVuKSB7XG4gICAgICBpZiAoIHRoaXMuX2NvbnRhaW5lci5jaGlsZHJlbi5oYXNPd25Qcm9wZXJ0eShqKSApIHtcbiAgICAgICAgaWYgKCBpID09IG4gKVxuICAgICAgICAgIHJldHVybiB0aGlzLl9jb250YWluZXIuY2hpbGRyZW5bal07XG4gICAgICAgIGVsc2UgaWYgKCBpID4gbiApXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuXG4gICAgICAgIGkrKzsgLy8gQ29udGludWUgc2VhcmNoaW5nXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSxcblxuICAvLyBSZXR1cm4gYWxsIGNoaWxkIG9iamVjdHNcbiAgY2hpbGRyZW46IGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIHRoaXMuX2NvbnRhaW5lci5jaGlsZHJlbjsgLy8geyBpZDogY2hpbGQsIC4uIH1cbiAgfSxcblxuICAvLyBSZXBsYWNlIGNoaWxkcmVuIG1vZGVscyAtIGFwcGVuZCBpZiB0aGVyZSdzIG1vcmUsIGRlc3Ryb3kgaWYgbGVzc1xuICBsb2FkOiBmdW5jdGlvbiggcHJvdG8sIG1vZGVscywgc2VsZWN0b3IgKSB7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXMsXG4gICAgICAgIG1heE1vZGVscyA9IG1vZGVscy5sZW5ndGgsXG4gICAgICAgIG1heENoaWxkcmVuID0gdGhpcy5zaXplKCk7XG5cbiAgICAkLmVhY2gobW9kZWxzLCBmdW5jdGlvbihpbmRleCwgbW9kZWwpIHtcbiAgICAgIGlmICggc2VsZi5jaGlsZChpbmRleCkgKSB7XG4gICAgICAgIHNlbGYuY2hpbGQoaW5kZXgpLm1vZGVsLnNldCggbW9kZWwgKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNlbGYuYXBwZW5kKCAkJCggcHJvdG8sIG1vZGVsICksIHNlbGVjdG9yICk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBpZiAobWF4Q2hpbGRyZW4gPiBtYXhNb2RlbHMpIHtcbiAgICAgIGZvciAodmFyIGkgPSBtYXhNb2RlbHM7IGkgPCBtYXhDaGlsZHJlbjsgaSsrKSB7XG4gICAgICAgIC8vIENoaWxkJ3MgaW5kZXggc3RheXMgdGhlIHNhbWUsIHNpbmNlIGVhY2ggb25lIGlzIGRlc3Ryb3llZFxuICAgICAgICBzZWxmLmNoaWxkKG1heE1vZGVscykuZGVzdHJveSgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbn07XG4iLCJcbi8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKlxuICogRm9ybSBoZWxwZXJzXG4gKlxuICovXG5cbnZhciAkID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cualF1ZXJ5IDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5qUXVlcnkgOiBudWxsKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgZm9ybSA6IHtcblxuICAgIC8vIENsZWFyIHRoZSBmb3JtXG4gICAgY2xlYXIgOiBmdW5jdGlvbigpIHtcblxuICAgICAgcmV0dXJuIHRoaXMuJHZpZXcuZmluZCgnOmlucHV0JylcbiAgICAgICAgLm5vdCgnOmJ1dHRvbiwgOnN1Ym1pdCwgOnJlc2V0LCA6aGlkZGVuJykucmVtb3ZlQXR0cignY2hlY2tlZCcpLnJlbW92ZUF0dHIoJ3NlbGVjdGVkJylcbiAgICAgICAgLm5vdCgnOmNoZWNrYm94LCA6cmFkaW8sIHNlbGVjdCcpLnZhbCgnJyk7XG4gICAgfSxcblxuICAgIC8vIFZhbGlkYXRlIG1vZGVsLCBpbnN0ZWFkIG9mIGZvcm0gaW4gdGhlIERPTSBkaXJlY3RseVxuICAgIC8vIEByZXR1cm4gQW4gYXJyYXkgb2YgaW52YWxpZCBtb2RlbCBwcm9wZXJ0aWVzXG4gICAgaW52YWxpZCA6IGZ1bmN0aW9uKCkge1xuXG4gICAgICByZXR1cm4gdGhpcy5tb2RlbC5pbnZhbGlkKCk7XG4gICAgfVxuICB9XG5cbn07XG5cbiIsIlxuLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqXG4gKiBDb25zdHJ1Y3QgZGVmYXVsdCBvYmplY3QgcHJvdG90eXBlXG4gKlxuICovXG5cbnZhciAkID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cualF1ZXJ5IDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5qUXVlcnkgOiBudWxsKSxcblxuICAgIGRlZmF1bHRQcm90b3R5cGUgPSB7XG5cbiAgICAgIF9hZ2lsaXR5OiB0cnVlLFxuICAgICAgX2NvbnRhaW5lcjogcmVxdWlyZSgnLi9jb250YWluZXInKSxcbiAgICAgIF9ldmVudHM6IHJlcXVpcmUoJy4vZXZlbnRzJyksXG5cbiAgICAgICRub2RlOiB7fSwgLy8gTWFwIG9mIG1vZGVsIHByb3BlcnRpZXMgLT4gYm91bmQgZWxlbWVudHNcbiAgICAgIGtleToge30sIC8vIE1hcCBvZiBlbGVtZW50cyAtPiBib3VuZCBtb2RlbCBwcm9wZXJ0aWVzXG4gICAgICByZXF1aXJlZDoge30sIC8vIE1hcCBvZiByZXF1aXJlZCBtb2RlbCBwcm9wZXJ0aWVzIGFuZCByZXF1aXJlIHR5cGVzXG5cbiAgICAgIG1vZGVsOiByZXF1aXJlKCcuLi9tdmMvbW9kZWwnKSxcbiAgICAgIHZpZXc6IHJlcXVpcmUoJy4uL212Yy92aWV3JyksXG4gICAgICBjb250cm9sbGVyOiByZXF1aXJlKCcuLi9tdmMvY29udHJvbGxlcicpXG5cbiAgICB9LFxuXG4gICAgc2hvcnRjdXRzID0gcmVxdWlyZSgnLi9zaG9ydGN1dHMnKSxcbiAgICBleHRlbmQgPSByZXF1aXJlKCcuL2V4dGVuZCcpLFxuICAgIGZvcm0gPSByZXF1aXJlKCcuL2Zvcm0nKTtcblxubW9kdWxlLmV4cG9ydHMgPSAkLmV4dGVuZCh0cnVlLCBkZWZhdWx0UHJvdG90eXBlLCBzaG9ydGN1dHMsIGV4dGVuZCwgZm9ybSk7XG4iLCJcbi8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKlxuICogT2JqZWN0IHNob3J0Y3V0c1xuICpcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICBkZXN0cm95OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnRyaWdnZXIoJ2Rlc3Ryb3knLCB0aGlzLl9pZCk7IC8vIHBhcmVudCBtdXN0IGxpc3RlbiB0byAncmVtb3ZlJyBldmVudCBhbmQgaGFuZGxlIGNvbnRhaW5lciByZW1vdmFsIVxuICAgIC8vIGNhbid0IHJldHVybiB0aGlzIGFzIGl0IG1pZ2h0IG5vdCBleGlzdCBhbnltb3JlIVxuICB9LFxuICBwYXJlbnQ6IGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIHRoaXMuX3BhcmVudDtcbiAgfSxcbiAgXG4gIC8vXG4gIC8vIF9jb250YWluZXIgc2hvcnRjdXRzXG4gIC8vXG4gIGFwcGVuZDogZnVuY3Rpb24oKXtcbiAgICB0aGlzLl9jb250YWluZXIuYXBwZW5kLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgcmV0dXJuIHRoaXM7IC8vIGZvciBjaGFpbmFibGUgY2FsbHNcbiAgfSxcbiAgcHJlcGVuZDogZnVuY3Rpb24oKXtcbiAgICB0aGlzLl9jb250YWluZXIucHJlcGVuZC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIHJldHVybiB0aGlzOyAvLyBmb3IgY2hhaW5hYmxlIGNhbGxzXG4gIH0sXG4gIGFmdGVyOiBmdW5jdGlvbigpe1xuICAgIHRoaXMuX2NvbnRhaW5lci5hZnRlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIHJldHVybiB0aGlzOyAvLyBmb3IgY2hhaW5hYmxlIGNhbGxzXG4gIH0sXG4gIGJlZm9yZTogZnVuY3Rpb24oKXtcbiAgICB0aGlzLl9jb250YWluZXIuYmVmb3JlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgcmV0dXJuIHRoaXM7IC8vIGZvciBjaGFpbmFibGUgY2FsbHNcbiAgfSxcbiAgcmVtb3ZlOiBmdW5jdGlvbigpe1xuICAgIHRoaXMuX2NvbnRhaW5lci5yZW1vdmUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICByZXR1cm4gdGhpczsgLy8gZm9yIGNoYWluYWJsZSBjYWxsc1xuICB9LFxuICBzaXplOiBmdW5jdGlvbigpe1xuICAgIHJldHVybiB0aGlzLl9jb250YWluZXIuc2l6ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9LFxuICBlYWNoOiBmdW5jdGlvbigpe1xuICAgIHJldHVybiB0aGlzLl9jb250YWluZXIuZWFjaC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9LFxuICBlbXB0eTogZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gdGhpcy5fY29udGFpbmVyLmVtcHR5LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH0sXG5cbiAgLy9cbiAgLy8gX2V2ZW50cyBzaG9ydGN1dHNcbiAgLy9cbiAgYmluZDogZnVuY3Rpb24oKXtcbiAgICB0aGlzLl9ldmVudHMuYmluZC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIHJldHVybiB0aGlzOyAvLyBmb3IgY2hhaW5hYmxlIGNhbGxzXG4gIH0sXG4gIG9uOiBmdW5jdGlvbigpeyAvLyBBbGlhc1xuICAgIHRoaXMuX2V2ZW50cy5iaW5kLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgcmV0dXJuIHRoaXM7IC8vIGZvciBjaGFpbmFibGUgY2FsbHNcbiAgfSxcbiAgdHJpZ2dlcjogZnVuY3Rpb24oKXtcbiAgICB0aGlzLl9ldmVudHMudHJpZ2dlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIHJldHVybiB0aGlzOyAvLyBmb3IgY2hhaW5hYmxlIGNhbGxzXG4gIH0sXG5cbn07XG4iLCJcbi8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKlxuICogalF1ZXJ5IHV0aWxpdHkgZnVuY3Rpb25zXG4gKlxuICovXG5cbnZhciAkID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cualF1ZXJ5IDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5qUXVlcnkgOiBudWxsKTtcblxuLy8gR2V0IGVsZW1lbnQgaW5jbHVkaW5nIHdyYXBwaW5nIHRhZ1xuXG4kLmZuLm91dGVySFRNTCA9IGZ1bmN0aW9uKHMpIHtcbiAgaWYgKHMpIHtcbiAgICByZXR1cm4gdGhpcy5iZWZvcmUocykucmVtb3ZlKCk7XG4gIH0gZWxzZSB7XG4gICAgdmFyIGRvYyA9IHRoaXNbMF0gPyB0aGlzWzBdLm93bmVyRG9jdW1lbnQgOiBkb2N1bWVudDtcbiAgICByZXR1cm4galF1ZXJ5KCc8ZGl2PicsIGRvYykuYXBwZW5kKHRoaXMuZXEoMCkuY2xvbmUoKSkuaHRtbCgpO1xuICB9XG59O1xuXG5cblxuLy8gR2VuZXJpYyBpc0VtcHR5XG5cbiQuaXNFbXB0eSA9IGZ1bmN0aW9uKCBtaXhlZF92YXIgKSB7XG5cbiAgLy8gRW1wdHk6IG51bGwsIHVuZGVmaW5lZCwgJycsIFtdLCB7fVxuICAvLyBOb3QgZW1wdHk6IDAsIHRydWUsIGZhbHNlXG4gIC8vIFdoYXQgYWJvdXQgalF1ZXJ5IG9iamVjdD9cblxuICB2YXIgdW5kZWYsIGtleSwgaSwgbGVuO1xuICB2YXIgZW1wdHlWYWx1ZXMgPSBbdW5kZWYsIG51bGwsICcnXTtcblxuICBmb3IgKGkgPSAwLCBsZW4gPSBlbXB0eVZhbHVlcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgIGlmIChtaXhlZF92YXIgPT09IGVtcHR5VmFsdWVzW2ldKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICBpZiAodHlwZW9mIG1peGVkX3ZhciA9PT0gJ29iamVjdCcpIHtcbiAgICBmb3IgKGtleSBpbiBtaXhlZF92YXIpIHtcbiAgICAgIC8vIEluaGVyaXRlZCBwcm9wZXJ0aWVzIGNvdW50P1xuICAgICAgLy8gaWYgKG1peGVkX3Zhci5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIC8vIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59O1xuXG4vKiBBbm90aGVyIHZlcnNpb25cblxud2luZG93LmpRdWVyeS5pc0VtcHR5ID0gZnVuY3Rpb24oIGRhdGEgKSB7XG5cbiAgaWYodHlwZW9mKGRhdGEpID09ICdudW1iZXInIHx8IHR5cGVvZihkYXRhKSA9PSAnYm9vbGVhbicpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYodHlwZW9mKGRhdGEpID09ICd1bmRlZmluZWQnIHx8IGRhdGEgPT09IG51bGwpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICBpZih0eXBlb2YoZGF0YS5sZW5ndGgpICE9ICd1bmRlZmluZWQnKSB7XG4gICAgcmV0dXJuIGRhdGEubGVuZ3RoID09PSAwO1xuICB9XG5cbiAgdmFyIGNvdW50ID0gMDtcbiAgZm9yKHZhciBpIGluIGRhdGEpIHtcbiAgICBpZihkYXRhLmhhc093blByb3BlcnR5KGkpKSB7XG4gICAgICBjb3VudCArKztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGNvdW50ID09PSAwO1xufTtcbiovXG5cblxuLy8gVmFsaWRhdGUgZS1tYWlsXG5cbiQuaXNFbWFpbCA9IGZ1bmN0aW9uKCBlbWFpbCApIHtcblxuICBpZiAoICQuaXNFbXB0eSggZW1haWwgKSApIHJldHVybiBmYWxzZTtcblxuICB2YXIgcmVnZXggPSAvXihbYS16QS1aMC05Xy4rLV0pK1xcQCgoW2EtekEtWjAtOS1dKStcXC4pKyhbYS16QS1aMC05XXsyLDR9KSskLztcbiAgcmV0dXJuIHJlZ2V4LnRlc3QoZW1haWwpO1xufTtcblxuIiwiXG4vKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICpcbiAqIFNoaW0gZm9yOiBPYmplY3QuY3JlYXRlIGFuZCBPYmplY3QuZ2V0UHJvdG90eXBlT2ZcbiAqXG4gKi9cblxuXG4vKmpzbGludCBwcm90bzogdHJ1ZSAqL1xuXG4vLyBNb2RpZmllZCBmcm9tIERvdWdsYXMgQ3JvY2tmb3JkJ3MgT2JqZWN0LmNyZWF0ZSgpXG4vLyBUaGUgY29uZGl0aW9uIGJlbG93IGVuc3VyZXMgd2Ugb3ZlcnJpZGUgb3RoZXIgbWFudWFsIGltcGxlbWVudGF0aW9uc1xuaWYgKCFPYmplY3QuY3JlYXRlIHx8IE9iamVjdC5jcmVhdGUudG9TdHJpbmcoKS5zZWFyY2goL25hdGl2ZSBjb2RlL2kpPDApIHtcbiAgT2JqZWN0LmNyZWF0ZSA9IGZ1bmN0aW9uKG9iail7XG4gICAgdmFyIEF1eCA9IGZ1bmN0aW9uKCl7fTtcbiAgICAkLmV4dGVuZChBdXgucHJvdG90eXBlLCBvYmopOyAvLyBzaW1wbHkgc2V0dGluZyBBdXgucHJvdG90eXBlID0gb2JqIHNvbWVob3cgbWVzc2VzIHdpdGggY29uc3RydWN0b3IsIHNvIGdldFByb3RvdHlwZU9mIHdvdWxkbid0IHdvcmsgaW4gSUVcbiAgICByZXR1cm4gbmV3IEF1eCgpO1xuICB9O1xufVxuXG4vLyBNb2RpZmllZCBmcm9tIEpvaG4gUmVzaWcncyBPYmplY3QuZ2V0UHJvdG90eXBlT2YoKVxuLy8gVGhlIGNvbmRpdGlvbiBiZWxvdyBlbnN1cmVzIHdlIG92ZXJyaWRlIG90aGVyIG1hbnVhbCBpbXBsZW1lbnRhdGlvbnNcbmlmICghT2JqZWN0LmdldFByb3RvdHlwZU9mIHx8IE9iamVjdC5nZXRQcm90b3R5cGVPZi50b1N0cmluZygpLnNlYXJjaCgvbmF0aXZlIGNvZGUvaSk8MCkge1xuICBpZiAoIHR5cGVvZiBcInRlc3RcIi5fX3Byb3RvX18gPT09IFwib2JqZWN0XCIgKSB7XG4gICAgT2JqZWN0LmdldFByb3RvdHlwZU9mID0gZnVuY3Rpb24ob2JqZWN0KXtcbiAgICAgIHJldHVybiBvYmplY3QuX19wcm90b19fO1xuICAgIH07XG4gIH0gZWxzZSB7XG4gICAgT2JqZWN0LmdldFByb3RvdHlwZU9mID0gZnVuY3Rpb24ob2JqZWN0KXtcbiAgICAgIC8vIE1heSBicmVhayBpZiB0aGUgY29uc3RydWN0b3IgaGFzIGJlZW4gdGFtcGVyZWQgd2l0aFxuICAgICAgcmV0dXJuIG9iamVjdC5jb25zdHJ1Y3Rvci5wcm90b3R5cGU7XG4gICAgfTtcbiAgfVxufVxuIiwiLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqXG4gKiBUaW1lZCBmdW5jdGlvbnNcbiAqXG4gKi9cblxudmFyICQgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5qUXVlcnkgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLmpRdWVyeSA6IG51bGwpO1xuXG52YXIgdGltZXJzID0ge30sXG4gICAgZGVmYXVsdEludGVydmFsID0gMTAwMDA7XG5cbiQuZm4udGltZWRDbGFzcyA9IGZ1bmN0aW9uKCBjbGFzc05hbWUsIGR1cmF0aW9uICkge1xuXG4gIHZhciAkc2VsZiA9ICQodGhpcyk7XG5cbiAgcmV0dXJuICQodGhpcykudGltZWRGbihcbiAgICBmdW5jdGlvbigpeyAkc2VsZi5hZGRDbGFzcyggY2xhc3NOYW1lICk7IH0sXG4gICAgZnVuY3Rpb24oKXsgJHNlbGYucmVtb3ZlQ2xhc3MoIGNsYXNzTmFtZSApOyB9LFxuICAgIGR1cmF0aW9uIHx8IGRlZmF1bHRJbnRlcnZhbFxuICApO1xufTtcblxuJC5mbi50aW1lZFRleHQgPSBmdW5jdGlvbiggdHh0LCBkdXJhdGlvbiApIHtcblxuICB2YXIgJHNlbGYgPSAkKHRoaXMpO1xuXG4gIHJldHVybiAkKHRoaXMpLnRpbWVkRm4oXG4gICAgZnVuY3Rpb24oKXsgJHNlbGYudGV4dCggdHh0ICk7IH0sXG4gICAgZnVuY3Rpb24oKXsgJHNlbGYudGV4dCgnJyk7IH0sXG4gICAgZHVyYXRpb24gfHwgZGVmYXVsdEludGVydmFsXG4gICk7XG59O1xuXG4kLmZuLnRpbWVkRm4gPSBmdW5jdGlvbiggaWQsIHN0YXJ0LCBlbmQsIGR1cmF0aW9uICkge1xuXG4gIGR1cmF0aW9uID0gZHVyYXRpb24gfHwgZGVmYXVsdEludGVydmFsO1xuXG4gIC8vIElEIHNraXBwZWRcbiAgaWYgKCB0eXBlb2YgaWQgPT09ICdmdW5jdGlvbicgKSB7XG5cbiAgICBkdXJhdGlvbiA9IGVuZCB8fCBkdXJhdGlvbjtcbiAgICBlbmQgPSBzdGFydDtcbiAgICBzdGFydCA9IGlkO1xuXG4gICAgbmV3IFRpbWVyKGZ1bmN0aW9uKCl7XG4gICAgICBlbmQoKTtcbiAgICB9LCBkdXJhdGlvbiApO1xuXG4gICAgcmV0dXJuIHN0YXJ0KCk7XG5cbiAgLy8gSWYgdGltZXIgSUQgaXMgc2V0IGFuZCBvbmUgaXMgYWxyZWFkeSBnb2luZywgYWRkIHRvIHRoZSBkdXJhdGlvblxuICB9IGVsc2UgaWYgKCB0eXBlb2YgdGltZXJzW2lkXSAhPT0gJ3VuZGVmaW5lZCcgJiYgISB0aW1lcnNbaWRdLmZpbmlzaGVkICkge1xuXG4gICAgdGltZXJzW2lkXS5hZGQoIGR1cmF0aW9uICk7XG5cbiAgfSBlbHNlIHtcblxuICAgIHRpbWVyc1tpZF0gPSBuZXcgVGltZXIoZnVuY3Rpb24oKXtcbiAgICAgIGVuZCgpO1xuICAgIH0sIGR1cmF0aW9uICk7XG5cbiAgICByZXR1cm4gc3RhcnQoKTtcbiAgfVxufTtcblxuXG5mdW5jdGlvbiBUaW1lcihjYWxsYmFjaywgdGltZSkge1xuICAgIHRoaXMuc2V0VGltZW91dChjYWxsYmFjaywgdGltZSk7XG59XG5cblRpbWVyLnByb3RvdHlwZS5zZXRUaW1lb3V0ID0gZnVuY3Rpb24oY2FsbGJhY2ssIHRpbWUpIHtcblxuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHRoaXMuZmluaXNoZWQgPSBmYWxzZTtcbiAgICB0aGlzLmNhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgdGhpcy50aW1lID0gdGltZTtcblxuICAgIGlmKHRoaXMudGltZXIpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMudGltZXIpO1xuICAgIH1cbiAgICB0aGlzLnRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIHNlbGYuZmluaXNoZWQgPSB0cnVlO1xuICAgICAgc2VsZi5jYWxsYmFjaygpO1xuICAgIH0sIHRpbWUpO1xuICAgIHRoaXMuc3RhcnQgPSBEYXRlLm5vdygpO1xufTtcblxuVGltZXIucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uKHRpbWUpIHtcbiAgIGlmKCF0aGlzLmZpbmlzaGVkKSB7XG4gICAgICAgLy8gYWRkIHRpbWUgdG8gdGltZSBsZWZ0XG4gICAgICAgdGltZSA9IHRoaXMudGltZSAtIChEYXRlLm5vdygpIC0gdGhpcy5zdGFydCkgKyB0aW1lO1xuICAgICAgIHRoaXMuc2V0VGltZW91dCh0aGlzLmNhbGxiYWNrLCB0aW1lKTtcbiAgIH1cbn07XG4iLCJcbi8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKlxuICogdXRpbC4qXG4gKlxuICogaXNBZ2lsaXR5XG4gKiBwcm94eUFsbFxuICogcmV2ZXJzZUV2ZW50c1xuICogc2l6ZVxuICogZXh0ZW5kQ29udHJvbGxlclxuICogXG4gKi9cblxuLypqc2xpbnQgbG9vcGZ1bmM6IHRydWUgKi9cblxudmFyIHV0aWwgPSB7fSxcbiAgICAkID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cualF1ZXJ5IDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5qUXVlcnkgOiBudWxsKTtcblxuLy8gQ2hlY2tzIGlmIHByb3ZpZGVkIG9iaiBpcyBhbiBhZ2lsaXR5IG9iamVjdFxudXRpbC5pc0FnaWxpdHkgPSBmdW5jdGlvbihvYmope1xuIHJldHVybiBvYmouX2FnaWxpdHkgPT09IHRydWU7XG59O1xuXG4vLyBTY2FucyBvYmplY3QgZm9yIGZ1bmN0aW9ucyAoZGVwdGg9MikgYW5kIHByb3hpZXMgdGhlaXIgJ3RoaXMnIHRvIGRlc3QuXG4vLyAqIFRvIGVuc3VyZSBpdCB3b3JrcyB3aXRoIHByZXZpb3VzbHkgcHJveGllZCBvYmplY3RzLCB3ZSBzYXZlIHRoZSBvcmlnaW5hbCBmdW5jdGlvbiBhcyBcbi8vICAgYSAnLl9wcmVQcm94eScgbWV0aG9kIGFuZCB3aGVuIGF2YWlsYWJsZSBhbHdheXMgdXNlIHRoYXQgYXMgdGhlIHByb3h5IHNvdXJjZS5cbi8vICogVG8gc2tpcCBhIGdpdmVuIG1ldGhvZCwgY3JlYXRlIGEgc3ViLW1ldGhvZCBjYWxsZWQgJ19ub1Byb3h5Jy5cbnV0aWwucHJveHlBbGwgPSBmdW5jdGlvbihvYmosIGRlc3Qpe1xuICBpZiAoIW9iaiB8fCAhZGVzdCkge1xuICAgIHRocm93IFwiYWdpbGl0eS5qczogdXRpbC5wcm94eUFsbCBuZWVkcyB0d28gYXJndW1lbnRzXCI7XG4gIH1cbiAgZm9yICh2YXIgYXR0cjEgaW4gb2JqKSB7XG4gICAgdmFyIHByb3hpZWQgPSBvYmpbYXR0cjFdO1xuICAgIC8vIFByb3h5IHJvb3QgbWV0aG9kc1xuICAgIGlmICh0eXBlb2Ygb2JqW2F0dHIxXSA9PT0gJ2Z1bmN0aW9uJyApIHtcblxuICAgICAgcHJveGllZCA9IG9ialthdHRyMV0uX25vUHJveHkgPyBvYmpbYXR0cjFdIDogJC5wcm94eShvYmpbYXR0cjFdLl9wcmVQcm94eSB8fCBvYmpbYXR0cjFdLCBkZXN0KTtcbiAgICAgIHByb3hpZWQuX3ByZVByb3h5ID0gb2JqW2F0dHIxXS5fbm9Qcm94eSA/IHVuZGVmaW5lZCA6IChvYmpbYXR0cjFdLl9wcmVQcm94eSB8fCBvYmpbYXR0cjFdKTsgLy8gc2F2ZSBvcmlnaW5hbFxuICAgICAgb2JqW2F0dHIxXSA9IHByb3hpZWQ7XG5cbiAgICB9XG4gICAgLy8gUHJveHkgc3ViLW1ldGhvZHMgKG1vZGVsLiosIHZpZXcuKiwgZXRjKSAtLSBleGNlcHQgZm9yIGpRdWVyeSBvYmplY3RcbiAgICBlbHNlIGlmICh0eXBlb2Ygb2JqW2F0dHIxXSA9PT0gJ29iamVjdCcgJiYgIShvYmpbYXR0cjFdIGluc3RhbmNlb2YgalF1ZXJ5KSApIHtcbiAgICAgIGZvciAodmFyIGF0dHIyIGluIG9ialthdHRyMV0pIHtcbiAgICAgICAgdmFyIHByb3hpZWQyID0gb2JqW2F0dHIxXVthdHRyMl07XG4gICAgICAgIGlmICh0eXBlb2Ygb2JqW2F0dHIxXVthdHRyMl0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBwcm94aWVkMiA9IG9ialthdHRyMV1bYXR0cjJdLl9ub1Byb3h5ID8gb2JqW2F0dHIxXVthdHRyMl0gOiAkLnByb3h5KG9ialthdHRyMV1bYXR0cjJdLl9wcmVQcm94eSB8fCBvYmpbYXR0cjFdW2F0dHIyXSwgZGVzdCk7XG4gICAgICAgICAgcHJveGllZDIuX3ByZVByb3h5ID0gb2JqW2F0dHIxXVthdHRyMl0uX25vUHJveHkgPyB1bmRlZmluZWQgOiAob2JqW2F0dHIxXVthdHRyMl0uX3ByZVByb3h5IHx8IG9ialthdHRyMV1bYXR0cjJdKTsgLy8gc2F2ZSBvcmlnaW5hbFxuICAgICAgICAgIHByb3hpZWRbYXR0cjJdID0gcHJveGllZDI7XG4gICAgICAgIH1cbiAgICAgIH0gLy8gZm9yIGF0dHIyXG4gICAgICBvYmpbYXR0cjFdID0gcHJveGllZDtcbiAgICB9IC8vIGlmIG5vdCBmdW5jXG4gIH0gLy8gZm9yIGF0dHIxXG59OyAvLyBwcm94eUFsbFxuXG5cbi8vIERldGVybWluZXMgIyBvZiBhdHRyaWJ1dGVzIG9mIGdpdmVuIG9iamVjdCAocHJvdG90eXBlIGluY2x1c2l2ZSlcbnV0aWwuc2l6ZSA9IGZ1bmN0aW9uKG9iail7XG4gIHZhciBzaXplID0gMCwga2V5O1xuICBmb3IgKGtleSBpbiBvYmopIHtcbiAgICBzaXplKys7XG4gIH1cbiAgcmV0dXJuIHNpemU7XG59O1xuXG4vLyBGaW5kIGNvbnRyb2xsZXJzIHRvIGJlIGV4dGVuZGVkICh3aXRoIHN5bnRheCAnficpLCByZWRlZmluZSB0aG9zZSB0byBlbmNvbXBhc3MgcHJldmlvdXNseSBkZWZpbmVkIGNvbnRyb2xsZXJzXG4vLyBFeGFtcGxlOlxuLy8gICB2YXIgYSA9ICQkKHt9LCAnPGJ1dHRvbj5BPC9idXR0b24+JywgeydjbGljayAmJzogZnVuY3Rpb24oKXsgYWxlcnQoJ0EnKTsgfX0pO1xuLy8gICB2YXIgYiA9ICQkKGEsIHt9LCAnPGJ1dHRvbj5CPC9idXR0b24+Jywgeyd+Y2xpY2sgJic6IGZ1bmN0aW9uKCl7IGFsZXJ0KCdCJyk7IH19KTtcbi8vIENsaWNraW5nIG9uIGJ1dHRvbiBCIHdpbGwgYWxlcnQgYm90aCAnQScgYW5kICdCJy5cbnV0aWwuZXh0ZW5kQ29udHJvbGxlciA9IGZ1bmN0aW9uKG9iamVjdCkge1xuICBmb3IgKHZhciBjb250cm9sbGVyTmFtZSBpbiBvYmplY3QuY29udHJvbGxlcikge1xuXG4gICAgLy8gbmV3IHNjb3BlIGFzIHdlIG5lZWQgb25lIG5ldyBmdW5jdGlvbiBoYW5kbGVyIHBlciBjb250cm9sbGVyXG4gICAgKGZ1bmN0aW9uKCl7XG4gICAgICB2YXIgbWF0Y2hlcywgZXh0ZW5kLCBldmVudE5hbWUsXG4gICAgICAgICAgcHJldmlvdXNIYW5kbGVyLCBjdXJyZW50SGFuZGxlciwgbmV3SGFuZGxlcjtcblxuICAgICAgaWYgKHR5cGVvZiBvYmplY3QuY29udHJvbGxlcltjb250cm9sbGVyTmFtZV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgbWF0Y2hlcyA9IGNvbnRyb2xsZXJOYW1lLm1hdGNoKC9eKFxcfikqKC4rKS8pOyAvLyAnY2xpY2sgYnV0dG9uJywgJ35jbGljayBidXR0b24nLCAnX2NyZWF0ZScsIGV0Y1xuICAgICAgICBleHRlbmQgPSBtYXRjaGVzWzFdO1xuICAgICAgICBldmVudE5hbWUgPSBtYXRjaGVzWzJdO1xuICAgICAgXG4gICAgICAgIGlmICghZXh0ZW5kKSByZXR1cm47IC8vIG5vdGhpbmcgdG8gZG9cblxuICAgICAgICAvLyBSZWRlZmluZSBjb250cm9sbGVyOlxuICAgICAgICAvLyAnfmNsaWNrIGJ1dHRvbicgLS0tPiAnY2xpY2sgYnV0dG9uJyA9IHByZXZpb3VzSGFuZGxlciArIGN1cnJlbnRIYW5kbGVyXG4gICAgICAgIHByZXZpb3VzSGFuZGxlciA9IG9iamVjdC5jb250cm9sbGVyW2V2ZW50TmFtZV0gPyAob2JqZWN0LmNvbnRyb2xsZXJbZXZlbnROYW1lXS5fcHJlUHJveHkgfHwgb2JqZWN0LmNvbnRyb2xsZXJbZXZlbnROYW1lXSkgOiB1bmRlZmluZWQ7XG4gICAgICAgIGN1cnJlbnRIYW5kbGVyID0gb2JqZWN0LmNvbnRyb2xsZXJbY29udHJvbGxlck5hbWVdO1xuICAgICAgICBuZXdIYW5kbGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKHByZXZpb3VzSGFuZGxlcikgcHJldmlvdXNIYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgaWYgKGN1cnJlbnRIYW5kbGVyKSBjdXJyZW50SGFuZGxlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIG9iamVjdC5jb250cm9sbGVyW2V2ZW50TmFtZV0gPSBuZXdIYW5kbGVyO1xuICAgICAgICBkZWxldGUgb2JqZWN0LmNvbnRyb2xsZXJbY29udHJvbGxlck5hbWVdOyAvLyBkZWxldGUgJ35jbGljayBidXR0b24nXG4gICAgICB9IC8vIGlmIGZ1bmN0aW9uXG4gICAgfSkoKTtcbiAgfSAvLyBmb3IgY29udHJvbGxlck5hbWVcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gdXRpbDtcblxuIiwiXG4vKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICpcbiAqIHdwLmFjdGlvblxuICogXG4gKiAtIGdldCwgc2F2ZVxuICogLSBsb2dpbiwgbG9nb3V0LCBnbywgcmVsb2FkXG4gKlxuICovXG5cbnZhciAkID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cualF1ZXJ5IDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5qUXVlcnkgOiBudWxsKTtcbnZhciB3cEFqYXggPSByZXF1aXJlKCcuL2FqYXguanMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSAkLmV4dGVuZCggd2luZG93LndwLmFjdGlvbiB8fCB7fSwge1xuXG4gIC8qKlxuICAgKlxuICAgKiBnZXQoIFt0eXBlLF0geyBxdWVyeSB9IClcbiAgICogXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlICAgQ29udGVudCB0eXBlOiBwb3N0cywgdXNlcnNcbiAgICogQHBhcmFtIHtvYmplY3R9IHF1ZXJ5ICBRdWVyeSBhcmd1bWVudHNcbiAgICogXG4gICAqIEB0b2RvIHRheG9ub215LCBjb21tZW50c1xuICAgKlxuICAgKi9cblxuICBnZXQgOiBmdW5jdGlvbigpIHtcblxuICAgIC8vIERlZmF1bHQ6IGdldF9wb3N0c1xuICAgIHZhciB0eXBlID0gJ3Bvc3RzJztcblxuICAgIC8vIEZvciBvdGhlciBjb250ZW50IHR5cGVzOiBnZXRfdXNlciwgZ2V0X3RheG9ub215LCAuLi5cbiAgICB2YXIgb3RoZXJUeXBlcyA9IFsgJ3Bvc3QnLCAndXNlcicsICd1c2VycycsICd0YXhvbm9teScsICdmaWVsZCcsICdmaWVsZHMnIF07XG5cbiAgICAvLyBDcmVhdGUgYXJyYXkgb2YgYXJndW1lbnRzXG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuXG4gICAgaWYgKCBhcmdzLmxlbmd0aCA9PT0gMCApXG4gICAgICB0aHJvdyBcIndwLmFjdGlvbi5nZXQgbmVlZHMgYW4gb2JqZWN0XCI7XG5cbiAgICBpZiAoIHR5cGVvZiBhcmdzWzBdID09PSAnc3RyaW5nJyApIHtcbiAgICAgIHR5cGUgPSBhcmdzWzBdO1xuICAgICAgYXJncy5zaGlmdCgpO1xuICAgIH1cblxuICAgIHJlcXVlc3QgPSBhcmdzWzBdIHx8IHt9O1xuICAgIHN1Y2Nlc3MgPSBhcmdzWzFdIHx8IHt9O1xuICAgIGVycm9yID0gYXJnc1syXSB8fCB7fTtcblxuICAgIGlmICggdHlwZW9mIHJlcXVlc3QudHlwZSAhPT0gJ3VuZGVmaW5lZCcgJiYgJC5pbkFycmF5KHJlcXVlc3QudHlwZSwgb3RoZXJUeXBlcykgPiAtMSApIHtcbiAgICAgIHR5cGUgPSByZXF1ZXN0LnR5cGU7XG4gICAgICBkZWxldGUgcmVxdWVzdC50eXBlO1xuICAgIH1cblxuICAgIHJldHVybiB3cEFqYXgoICdnZXRfJyt0eXBlLCByZXF1ZXN0LCBzdWNjZXNzLCBlcnJvciApO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqXG4gICAqIHNhdmUoIFt0eXBlLF0geyBkYXRhIH0gKVxuICAgKiBcbiAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgICBDb250ZW50IHR5cGU6IHBvc3QsIHVzZXJcbiAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgICBEYXRhXG4gICAqIFxuICAgKiBAdG9kbyB0YXhvbm9teSwgY29tbWVudHMuLlxuICAgKlxuICAgKi9cblxuICBzYXZlOiBmdW5jdGlvbigpIHtcblxuICAgIC8vIEZvciBwb3N0LCBwYWdlLCBjdXN0b20gcG9zdCB0eXBlOiBzYXZlX3Bvc3RcbiAgICB2YXIgdHlwZSA9ICdwb3N0JztcblxuICAgIC8vIEZvciBvdGhlciBjb250ZW50IHR5cGVzOiBzYXZlX3VzZXIsIHNhdmVfdGF4b25vbXksIC4uLlxuICAgIHZhciBub25Qb3N0VHlwZXMgPSBbICd1c2VyJywgJ3VzZXJzJywgJ3RheG9ub215JywgJ2ZpZWxkJywgJ2ZpZWxkcycgXTtcblxuICAgIC8vIENyZWF0ZSBhcnJheSBvZiBhcmd1bWVudHNcbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XG5cbiAgICBpZiAoIGFyZ3MubGVuZ3RoID09PSAwIClcbiAgICAgIHRocm93IFwid3AuYWN0aW9uLnNhdmUgbmVlZHMgYW4gb2JqZWN0XCI7XG5cbiAgICBpZiAoIHR5cGVvZiBhcmdzWzBdID09PSAnc3RyaW5nJyApIHtcbiAgICAgIHR5cGUgPSBhcmdzWzBdO1xuICAgICAgYXJncy5zaGlmdCgpO1xuICAgIH1cblxuICAgIHJlcXVlc3QgPSBhcmdzWzBdIHx8IHt9O1xuICAgIHN1Y2Nlc3MgPSBhcmdzWzFdIHx8IHt9O1xuICAgIGVycm9yID0gYXJnc1syXSB8fCB7fTtcblxuICAgIGlmICggdHlwZW9mIHJlcXVlc3QudHlwZSAhPT0gJ3VuZGVmaW5lZCcgJiYgJC5pbkFycmF5KHJlcXVlc3QudHlwZSwgbm9uUG9zdFR5cGVzKSA+IC0xICkge1xuICAgICAgdHlwZSA9IHJlcXVlc3QudHlwZTtcbiAgICAgIGRlbGV0ZSByZXF1ZXN0LnR5cGU7XG4gICAgfSBlbHNlIGlmICggdHlwZSA9PSAncG9zdCcgJiYgJC5pc0FycmF5KCByZXF1ZXN0ICkgKSB7XG4gICAgICB0eXBlID0gJ3Bvc3RzJztcbiAgICB9XG5cbiAgICByZXR1cm4gd3BBamF4KCAnc2F2ZV8nK3R5cGUsIHJlcXVlc3QsIHN1Y2Nlc3MsIGVycm9yICk7XG4gIH0sXG5cblxuICAvKipcbiAgICpcbiAgICogbG9naW4sIGxvZ291dCwgZ28sIHJlbG9hZFxuICAgKlxuICAgKiBAdG9kbyByZWdpc3RlclxuICAgKlxuICAgKi9cblxuXG4gIGxvZ2luIDogZnVuY3Rpb24oIHJlcXVlc3QsIHN1Y2Nlc3MsIGVycm9yICkge1xuXG4gICAgcmV0dXJuIHdwQWpheCggJ2xvZ2luJywgcmVxdWVzdCwgc3VjY2VzcywgZXJyb3IgKTtcbiAgfSxcblxuICBsb2dvdXQgOiBmdW5jdGlvbiggcmVkaXJlY3QgKSB7XG5cbiAgICB2YXIgbG9nb3V0ID0gd3AudXJsLmxvZ291dDtcblxuICAgIGlmICggdHlwZW9mIHJlZGlyZWN0ID09PSAndW5kZWZpbmVkJyApIHJlZGlyZWN0ID0gd3AuY3VycmVudC5yZXF1ZXN0O1xuXG4gICAgbG9nb3V0ICs9ICcmcmVkaXJlY3RfdG89Jyt3cC51cmwuc2l0ZStyZWRpcmVjdDtcbiAgICBsb2NhdGlvbi5ocmVmID0gbG9nb3V0O1xuICB9LFxuXG4gIGdvIDogZnVuY3Rpb24oIHJvdXRlICkge1xuICAgIGxvY2F0aW9uLmhyZWYgPSB3cC51cmwuc2l0ZStyb3V0ZTtcbiAgfSxcblxuICByZWxvYWQgOiBmdW5jdGlvbigpIHtcbiAgICBsb2NhdGlvbi5ocmVmID0gd3AuY3VycmVudC51cmw7XG4gIH0sXG5cbiAgLyoqXG4gICAqXG4gICAqIGVtYWlsXG4gICAqIFxuICAgKi9cblxuICBtYWlsIDogZnVuY3Rpb24oIG1haWxPYmogKSB7XG5cbiAgICAvLyBEZWZhdWx0OiBnZXRfcG9zdHNcbiAgICB2YXIgdHlwZSA9ICdtYWlsJztcblxuICAgIC8vIENyZWF0ZSBhcnJheSBvZiBhcmd1bWVudHNcbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XG5cbiAgICBpZiAoIGFyZ3MubGVuZ3RoID09PSAwIClcbiAgICAgIHRocm93IFwid3AuYWN0aW9uLm1haWwgbmVlZHMgYW4gb2JqZWN0XCI7XG5cbiAgICByZXF1ZXN0ID0gYXJnc1swXSB8fCB7fTtcbiAgICBzdWNjZXNzID0gYXJnc1sxXSB8fCB7fTtcbiAgICBlcnJvciA9IGFyZ3NbMl0gfHwge307XG5cbiAgICByZXR1cm4gd3BBamF4KCAnc2VuZF9lbWFpbCcsIHJlcXVlc3QsIHN1Y2Nlc3MsIGVycm9yICk7XG4gIH1cblxuXG59KTtcblxuIiwiLyogZ2xvYmFsIHdwLmN1cnJlbnQubm9uY2UsIHdwLnVybC5hamF4ICovXG5cbnZhciAkID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cualF1ZXJ5IDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5qUXVlcnkgOiBudWxsKTtcblxuZnVuY3Rpb24gd3BBamF4KCBhY3Rpb24sIHJlcXVlc3QsIHN1Y2Nlc3MsIGVycm9yICkge1xuXG4gIHZhciByZXEgPSB7XG4gICAgdHlwZTogJ1BPU1QnLFxuICAgIHVybDogd3AudXJsLmFqYXgsIC8vIEFKQVggVVJMIGZyb20gc2VydmVyLXNpZGVcbiAgICBkYXRhOiB7XG4gICAgICBhY3Rpb246ICdhZ2lsaXR5XycrYWN0aW9uLCAvLyBQcmVmaXhcbiAgICAgIG5vbmNlOiB3cC5jdXJyZW50Lm5vbmNlLCAvLyBOb25jZSBmcm9tIHNlcnZlci1zaWRlXG4gICAgICBkYXRhOiByZXF1ZXN0IC8vIFRoZSByZWFsIGRhdGFcbiAgICB9LFxuICAgIGJlZm9yZVNlbmQ6ICcnLFxuICAgIHN1Y2Nlc3M6ICcnLFxuICAgIGVycm9yOiAnJ1xuICB9O1xuXG4gIC8vIEJhc2VkIG9uIHdwLXV0aWwuanNcbiAgcmV0dXJuICQuRGVmZXJyZWQoIGZ1bmN0aW9uKCBkZWZlcnJlZCApIHtcblxuICAgIC8vIFRyYW5zZmVyIHN1Y2Nlc3MvZXJyb3IgY2FsbGJhY2tzLlxuICAgIGlmICggc3VjY2VzcyApXG4gICAgICBkZWZlcnJlZC5kb25lKCBzdWNjZXNzICk7XG4gICAgaWYgKCBlcnJvciApXG4gICAgICBkZWZlcnJlZC5mYWlsKCBlcnJvciApO1xuXG4gICAgLy8gT3B0aW9uIHRvIGZvcmNlIHJldHVybiBmYWlsIGJlZm9yZSBBamF4IHJlcXVlc3RcbiAgICBpZiAoIGFjdGlvbiA9PT0gJ2ZhaWwnIClcbiAgICAgIGRlZmVycmVkLnJlamVjdFdpdGgoIHRoaXMsIGFyZ3VtZW50cyApO1xuXG4gICAgLy8gVXNlIHdpdGggUEhQJ3Mgd3Bfc2VuZF9qc29uX3N1Y2Nlc3MoKSBhbmQgd3Bfc2VuZF9qc29uX2Vycm9yKClcbiAgICAkLmFqYXgoIHJlcSApLmRvbmUoIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblxuICAgICAgLy8gVHJlYXQgYSByZXNwb25zZSBvZiBgMWAgYXMgc3VjY2Vzc2Z1bCBmb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHlcbiAgICAgIGlmICggcmVzcG9uc2UgPT09ICcxJyB8fCByZXNwb25zZSA9PT0gMSApXG4gICAgICAgIHJlc3BvbnNlID0geyBzdWNjZXNzOiB0cnVlIH07XG5cbiAgICAgIGlmICggdHlwZW9mIHJlc3BvbnNlLmRhdGEgPT09ICd1bmRlZmluZWQnIClcbiAgICAgICAgcmVzcG9uc2UuZGF0YSA9ICdlbXB0eSc7XG5cbiAgICAgIGlmICggdHlwZW9mIHJlc3BvbnNlID09PSAnb2JqZWN0JyAmJiAoIHR5cGVvZiByZXNwb25zZS5zdWNjZXNzICE9PSAndW5kZWZpbmVkJyApIClcbiAgICAgICAgZGVmZXJyZWRbIHJlc3BvbnNlLnN1Y2Nlc3MgPyAncmVzb2x2ZVdpdGgnIDogJ3JlamVjdFdpdGgnIF0oIHRoaXMsIFtyZXNwb25zZS5kYXRhXSApO1xuICAgICAgZWxzZXtcbiAgICAgICAgZGVmZXJyZWQucmVqZWN0V2l0aCggdGhpcywgYXJndW1lbnRzICk7IC8vIFtyZXNwb25zZS5kYXRhXVxuICAgICAgfVxuICAgIH0pLmZhaWwoIGZ1bmN0aW9uKCkge1xuICAgICAgZGVmZXJyZWQucmVqZWN0V2l0aCggdGhpcywgYXJndW1lbnRzICk7XG4gICAgfSk7XG4gIH0pLnByb21pc2UoKTtcblxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHdwQWpheDtcblxuXG4vKipcbiAqIFNoaW0gZm9yIFwiZml4aW5nXCIgSUUncyBsYWNrIG9mIHN1cHBvcnQgKElFIDwgOSkgZm9yIGFwcGx5aW5nIHNsaWNlXG4gKiBvbiBob3N0IG9iamVjdHMgbGlrZSBOYW1lZE5vZGVNYXAsIE5vZGVMaXN0LCBhbmQgSFRNTENvbGxlY3Rpb25cbiAqICh0ZWNobmljYWxseSwgc2luY2UgaG9zdCBvYmplY3RzIGhhdmUgYmVlbiBpbXBsZW1lbnRhdGlvbi1kZXBlbmRlbnQsXG4gKiBhdCBsZWFzdCBiZWZvcmUgRVM2LCBJRSBoYXNuJ3QgbmVlZGVkIHRvIHdvcmsgdGhpcyB3YXkpLlxuICogQWxzbyB3b3JrcyBvbiBzdHJpbmdzLCBmaXhlcyBJRSA8IDkgdG8gYWxsb3cgYW4gZXhwbGljaXQgdW5kZWZpbmVkXG4gKiBmb3IgdGhlIDJuZCBhcmd1bWVudCAoYXMgaW4gRmlyZWZveCksIGFuZCBwcmV2ZW50cyBlcnJvcnMgd2hlblxuICogY2FsbGVkIG9uIG90aGVyIERPTSBvYmplY3RzLlxuXG4oZnVuY3Rpb24gKCkge1xuICAndXNlIHN0cmljdCc7XG4gIHZhciBfc2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7XG5cbiAgdHJ5IHtcbiAgICAvLyBDYW4ndCBiZSB1c2VkIHdpdGggRE9NIGVsZW1lbnRzIGluIElFIDwgOVxuICAgIF9zbGljZS5jYWxsKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCk7XG4gIH0gY2F0Y2ggKGUpIHsgLy8gRmFpbHMgaW4gSUUgPCA5XG4gICAgLy8gVGhpcyB3aWxsIHdvcmsgZm9yIGdlbnVpbmUgYXJyYXlzLCBhcnJheS1saWtlIG9iamVjdHMsIFxuICAgIC8vIE5hbWVkTm9kZU1hcCAoYXR0cmlidXRlcywgZW50aXRpZXMsIG5vdGF0aW9ucyksXG4gICAgLy8gTm9kZUxpc3QgKGUuZy4sIGdldEVsZW1lbnRzQnlUYWdOYW1lKSwgSFRNTENvbGxlY3Rpb24gKGUuZy4sIGNoaWxkTm9kZXMpLFxuICAgIC8vIGFuZCB3aWxsIG5vdCBmYWlsIG9uIG90aGVyIERPTSBvYmplY3RzIChhcyBkbyBET00gZWxlbWVudHMgaW4gSUUgPCA5KVxuICAgIEFycmF5LnByb3RvdHlwZS5zbGljZSA9IGZ1bmN0aW9uKGJlZ2luLCBlbmQpIHtcbiAgICAgIC8vIElFIDwgOSBnZXRzIHVuaGFwcHkgd2l0aCBhbiB1bmRlZmluZWQgZW5kIGFyZ3VtZW50XG4gICAgICBlbmQgPSAodHlwZW9mIGVuZCAhPT0gJ3VuZGVmaW5lZCcpID8gZW5kIDogdGhpcy5sZW5ndGg7XG5cbiAgICAgIC8vIEZvciBuYXRpdmUgQXJyYXkgb2JqZWN0cywgd2UgdXNlIHRoZSBuYXRpdmUgc2xpY2UgZnVuY3Rpb25cbiAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodGhpcykgPT09ICdbb2JqZWN0IEFycmF5XScpe1xuICAgICAgICByZXR1cm4gX3NsaWNlLmNhbGwodGhpcywgYmVnaW4sIGVuZCk7IFxuICAgICAgfVxuXG4gICAgICAvLyBGb3IgYXJyYXkgbGlrZSBvYmplY3Qgd2UgaGFuZGxlIGl0IG91cnNlbHZlcy5cbiAgICAgIHZhciBpLCBjbG9uZWQgPSBbXSxcbiAgICAgICAgc2l6ZSwgbGVuID0gdGhpcy5sZW5ndGg7XG5cbiAgICAgIC8vIEhhbmRsZSBuZWdhdGl2ZSB2YWx1ZSBmb3IgXCJiZWdpblwiXG4gICAgICB2YXIgc3RhcnQgPSBiZWdpbiB8fCAwO1xuICAgICAgc3RhcnQgPSAoc3RhcnQgPj0gMCkgPyBzdGFydDogbGVuICsgc3RhcnQ7XG5cbiAgICAgIC8vIEhhbmRsZSBuZWdhdGl2ZSB2YWx1ZSBmb3IgXCJlbmRcIlxuICAgICAgdmFyIHVwVG8gPSAoZW5kKSA/IGVuZCA6IGxlbjtcbiAgICAgIGlmIChlbmQgPCAwKSB7XG4gICAgICAgIHVwVG8gPSBsZW4gKyBlbmQ7XG4gICAgICB9XG5cbiAgICAgIC8vIEFjdHVhbCBleHBlY3RlZCBzaXplIG9mIHRoZSBzbGljZVxuICAgICAgc2l6ZSA9IHVwVG8gLSBzdGFydDtcblxuICAgICAgaWYgKHNpemUgPiAwKSB7XG4gICAgICAgIGNsb25lZCA9IG5ldyBBcnJheShzaXplKTtcbiAgICAgICAgaWYgKHRoaXMuY2hhckF0KSB7XG4gICAgICAgICAgZm9yIChpID0gMDsgaSA8IHNpemU7IGkrKykge1xuICAgICAgICAgICAgY2xvbmVkW2ldID0gdGhpcy5jaGFyQXQoc3RhcnQgKyBpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZm9yIChpID0gMDsgaSA8IHNpemU7IGkrKykge1xuICAgICAgICAgICAgY2xvbmVkW2ldID0gdGhpc1tzdGFydCArIGldO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gY2xvbmVkO1xuICAgIH07XG4gIH1cbn0oKSk7XG4gKi9cblxuIl19
