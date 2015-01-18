# WP-Agility

Based on [Agility.js](http://agilityjs.com)

## Object

Objects encapsulate model/view/events.

```
var app = $$();

$$.document.append(app);

var singleUser = $$('#tmpl-single-user');

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

## Model/view binding

```
<input type="text" data-bind="username">
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
