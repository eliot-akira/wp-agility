# WP-Agility

The core feature is based on [Agility.js](http://agilityjs.com). It provides a simple way to organize frontend code into objects, with data-binding between models and views, as well as a basic event system. The WordPress AJAX interface is based on an earlier incarnation called Ajaxio.

## Main

Objects are created by the factory function $$.  They encapsulate model/view/events, and can be used as a prototype to create other objects.

#### Container object

```
var app = $$();

$$.document.append(app);
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
