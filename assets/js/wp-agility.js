(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

window.$$ = require('./agility/index.js');
window.wp = window.wp || {};
window.wp.action = require('./wp/action.js');
window.store = require('./store/store+json2.min.js');

},{"./agility/index.js":2,"./store/store+json2.min.js":20,"./wp/action.js":21}],2:[function(require,module,exports){
/**
 * 
 * Agility.js - v0.2.5
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

      return this.$view.find(':input,textarea')
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

module.exports = $.extend(defaultPrototype, shortcuts, extend, form);

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
/* Copyright (c) 2010-2013 Marcus Westin */
this.JSON||(this.JSON={}),function(){function f(e){return e<10?"0"+e:e}function quote(e){return escapable.lastIndex=0,escapable.test(e)?'"'+e.replace(escapable,function(e){var t=meta[e];return typeof t=="string"?t:"\\u"+("0000"+e.charCodeAt(0).toString(16)).slice(-4)})+'"':'"'+e+'"'}function str(e,t){var n,r,i,s,o=gap,u,a=t[e];a&&typeof a=="object"&&typeof a.toJSON=="function"&&(a=a.toJSON(e)),typeof rep=="function"&&(a=rep.call(t,e,a));switch(typeof a){case"string":return quote(a);case"number":return isFinite(a)?String(a):"null";case"boolean":case"null":return String(a);case"object":if(!a)return"null";gap+=indent,u=[];if(Object.prototype.toString.apply(a)==="[object Array]"){s=a.length;for(n=0;n<s;n+=1)u[n]=str(n,a)||"null";return i=u.length===0?"[]":gap?"[\n"+gap+u.join(",\n"+gap)+"\n"+o+"]":"["+u.join(",")+"]",gap=o,i}if(rep&&typeof rep=="object"){s=rep.length;for(n=0;n<s;n+=1)r=rep[n],typeof r=="string"&&(i=str(r,a),i&&u.push(quote(r)+(gap?": ":":")+i))}else for(r in a)Object.hasOwnProperty.call(a,r)&&(i=str(r,a),i&&u.push(quote(r)+(gap?": ":":")+i));return i=u.length===0?"{}":gap?"{\n"+gap+u.join(",\n"+gap)+"\n"+o+"}":"{"+u.join(",")+"}",gap=o,i}}typeof Date.prototype.toJSON!="function"&&(Date.prototype.toJSON=function(e){return isFinite(this.valueOf())?this.getUTCFullYear()+"-"+f(this.getUTCMonth()+1)+"-"+f(this.getUTCDate())+"T"+f(this.getUTCHours())+":"+f(this.getUTCMinutes())+":"+f(this.getUTCSeconds())+"Z":null},String.prototype.toJSON=Number.prototype.toJSON=Boolean.prototype.toJSON=function(e){return this.valueOf()});var cx=/[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,escapable=/[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,gap,indent,meta={"\b":"\\b","	":"\\t","\n":"\\n","\f":"\\f","\r":"\\r",'"':'\\"',"\\":"\\\\"},rep;typeof JSON.stringify!="function"&&(JSON.stringify=function(e,t,n){var r;gap="",indent="";if(typeof n=="number")for(r=0;r<n;r+=1)indent+=" ";else typeof n=="string"&&(indent=n);rep=t;if(!t||typeof t=="function"||typeof t=="object"&&typeof t.length=="number")return str("",{"":e});throw new Error("JSON.stringify")}),typeof JSON.parse!="function"&&(JSON.parse=function(text,reviver){function walk(e,t){var n,r,i=e[t];if(i&&typeof i=="object")for(n in i)Object.hasOwnProperty.call(i,n)&&(r=walk(i,n),r!==undefined?i[n]=r:delete i[n]);return reviver.call(e,t,i)}var j;text=String(text),cx.lastIndex=0,cx.test(text)&&(text=text.replace(cx,function(e){return"\\u"+("0000"+e.charCodeAt(0).toString(16)).slice(-4)}));if(/^[\],:{}\s]*$/.test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,"@").replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,"]").replace(/(?:^|:|,)(?:\s*\[)+/g,"")))return j=eval("("+text+")"),typeof reviver=="function"?walk({"":j},""):j;throw new SyntaxError("JSON.parse")})}(),"use strict",function(e,t){typeof define=="function"&&define.amd?define([],t):typeof exports=="object"?module.exports=t():e.store=t()}(this,function(){function o(){try{return r in t&&t[r]}catch(e){return!1}}var e={},t=window,n=t.document,r="localStorage",i="script",s;e.disabled=!1,e.version="1.3.17",e.set=function(e,t){},e.get=function(e,t){},e.has=function(t){return e.get(t)!==undefined},e.remove=function(e){},e.clear=function(){},e.transact=function(t,n,r){r==null&&(r=n,n=null),n==null&&(n={});var i=e.get(t,n);r(i),e.set(t,i)},e.getAll=function(){},e.forEach=function(){},e.serialize=function(e){return JSON.stringify(e)},e.deserialize=function(e){if(typeof e!="string")return undefined;try{return JSON.parse(e)}catch(t){return e||undefined}};if(o())s=t[r],e.set=function(t,n){return n===undefined?e.remove(t):(s.setItem(t,e.serialize(n)),n)},e.get=function(t,n){var r=e.deserialize(s.getItem(t));return r===undefined?n:r},e.remove=function(e){s.removeItem(e)},e.clear=function(){s.clear()},e.getAll=function(){var t={};return e.forEach(function(e,n){t[e]=n}),t},e.forEach=function(t){for(var n=0;n<s.length;n++){var r=s.key(n);t(r,e.get(r))}};else if(n.documentElement.addBehavior){var u,a;try{a=new ActiveXObject("htmlfile"),a.open(),a.write("<"+i+">document.w=window</"+i+'><iframe src="/favicon.ico"></iframe>'),a.close(),u=a.w.frames[0].document,s=u.createElement("div")}catch(f){s=n.createElement("div"),u=n.body}var l=function(t){return function(){var n=Array.prototype.slice.call(arguments,0);n.unshift(s),u.appendChild(s),s.addBehavior("#default#userData"),s.load(r);var i=t.apply(e,n);return u.removeChild(s),i}},c=new RegExp("[!\"#$%&'()*+,/\\\\:;<=>?@[\\]^`{|}~]","g"),h=function(e){return e.replace(/^d/,"___$&").replace(c,"___")};e.set=l(function(t,n,i){return n=h(n),i===undefined?e.remove(n):(t.setAttribute(n,e.serialize(i)),t.save(r),i)}),e.get=l(function(t,n,r){n=h(n);var i=e.deserialize(t.getAttribute(n));return i===undefined?r:i}),e.remove=l(function(e,t){t=h(t),e.removeAttribute(t),e.save(r)}),e.clear=l(function(e){var t=e.XMLDocument.documentElement.attributes;e.load(r);while(t.length)e.removeAttribute(t[0].name);e.save(r)}),e.getAll=function(t){var n={};return e.forEach(function(e,t){n[e]=t}),n},e.forEach=l(function(t,n){var r=t.XMLDocument.documentElement.attributes;for(var i=0,s;s=r[i];++i)n(s.name,e.deserialize(t.getAttribute(s.name)))})}try{var p="__storejs__";e.set(p,p),e.get(p)!=p&&(e.disabled=!0),e.remove(p)}catch(f){e.disabled=!0}return e.enabled=!e.disabled,e})
},{}],21:[function(require,module,exports){
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
},{"./ajax.js":22}],22:[function(require,module,exports){
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
},{}]},{},[1]);
