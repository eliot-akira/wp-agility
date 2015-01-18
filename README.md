# WP-Agility

## Basic

The core feature is based on [Agility.js](http://agilityjs.com).

Objects are created by the factory function $$.  They encapsulate model/view/events, and can be used as a prototype to create other objects.

#### Container object

```
var app = $$();

$$.document.append(app);
```

## Model/view binding syntax

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

#### Create collection

When this object is appended to the container, it will load a list of users from the server and fade in.

```
var usersList = $$({
  model: {
    id : '',
    name : '',
    email : ''
  },
  view: '#tmpl-single-user',
  events: {
    'parent:append' : function() {
      usersList.$view.hide();
      wp.action
        .get({ type: 'users', orderby: 'id' })
        .done( function(users) {
          usersList.loadModels( singleUser, users, 'tbody' );
          usersList.$view.fadeIn('slow');
        });
    }
  }
});

app.append( usersList );
```

## Action

Get and save data from WordPress backend.

```
wp.action
  .get({
    post_type : 'post',
    posts_per_page : 5
  })
  .done( function( posts ) {
    $.each(posts, function(post){
      var singlePost = $$( singlePostClass, post );
      postList.append( singlePost, 'tbody' );
    });
  });
```
