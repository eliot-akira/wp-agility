# WP-Agility

This plugin provides a JavaScript framework to build an interactive frontend user interface with WordPress. It's backed by a PHP component for AJAX actions.

## Features

- [Agility.js](http://agilityjs.com), forked and extended - Organize the frontend into objects, with data-binding between models and views, as well as an event system.

- WordPress AJAX interface - Easy way to get and save content in the database, such as posts, fields, users. 

## Example

Objects are created by the factory function $$.




They encapsulate the model, view, and events.





An object can contain child objects. and can also be used as a prototype to create other objects.

#### Container object

```
var app = $$();

$$.document.append(app, '#app-view');
```

#### Model/view binding syntax

View must have one root element.

```
var singleUser = $$('<li><span data-bind="name"/> - <span data-bind="email"/></li>');
```

#### From template

```
var singleUser = $$('#tmpl-single-user');
```

#### Inherit from prototype

```
var userOne = $$(singleUser, { name: 'Me', email: 'me@example.com'});
var userTwo = $$(singleUser, { name: 'You', email: 'you@example.com'});
```

#### Collection

A collection is just an object that contains child objects.

```
var usersList = $$({
  view: '<ul>',
  events: {
    'parent:append' : function() {
      wp.action
        .get({ type: 'users', orderby: 'id' })
        .done( function(users) {
          usersList.loadModels( singleUser, users );
        });
    }
  }
});

app.append( usersList );
```

When this object is appended to the main container, it will load a list of users from the server.

## Action

Get and save data from WordPress backend.

```
var postList = $$('<ul>');

var singlePostClass = $$('<li data-bind="title">');

wp.action
  .get({
    post_type : 'post',
    posts_per_page : 5
  })
  .done( function( posts ) {
    $.each(posts, function(post){
      var singlePost = $$( singlePostClass, post );
      postList.append( singlePost );
    });
  });
```
