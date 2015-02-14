## WP-Agility

This plugin provides a JavaScript framework for building an interactive user interface with WordPress. It's backed by a PHP component for performing AJAX actions.

- [Agility.js](http://agilityjs.com), forked and extended - Organize the frontend into objects, with data-binding between models and views, as well as an event system.

- WordPress AJAX interface - Easy way to get and save content in the database, such as posts, fields, users. 

### Examples

#### Get a post

Start with an HTML structure.

```
<section id="single-post">
  <h4 data-bind="title"></h4>
  <div data-bind="html=content"></div>
</section>
```

Use the factory function `$$` to create an object. If you pass an element ID, it will use its content as the view template.

```javascript
var singlePost = $$('#single-post');
```

Get a post and set it as the data model.

```javascript
wp.action
  .get({ type: 'post' })
  .done( function(post) {
    singlePost.set( post );
  });
```

That's it! The view will be automatically rendered.

#### Get a list of users

Create a template.

```
<ul id="user-list">
  <li data-bind="name"></li>
</ul>
```

Create an object for the user list, and another one to serve as the prototype for a single user.

```javascript
var userList = $$('#user-list');
var userPrototype = $$('#user-list li');
```

Then we empty the user list.

```
userList.$view.empty();
```

Get a list of users.

```javascript
wp.action
  .get({ type: 'users', orderby: 'name' })
  .done( function(users) {
    users.forEach( function( userModel ) {
      var user = $$( userPrototype, userModel );
      userList.append( user );
    });
  });
```

For each user, create a new object based on the prototype, and append it to the user list.

#### Frontend post form

The input form

```
<form id="post-form">
  <input type="text" data-bind="title" placeholder="Title"><br>
  <textarea data-bind="content" placeholder="Post content"></textarea><br>
  <button type="submit">Save</button>
</form>
<div id="status"></div>
```

The object


```javascript
var postForm = $$({
  model : {
    post_type : 'post',
    title : '',
    content : ''
  },
  required : {
    title : true,
    content : true
  },
  view : '#post-form',
  events : {
    'submit' : function() {

      // Validate fields based on this.required
      var invalid = this.form.invalid();
      if ( invalid.length ) {
        return this.invalidFields( invalid );
      }

      // Save the post
      wp.action
        .save( this.model.get() )
        .done( this.success )
        .fail( this.error );
    }
  },
  $status : $('#status'),
  invalidFields : function( invalid ) {

    if ( invalid.indexOf('title') > -1 )
      this.$status.text('Please enter a title.');
    else if ( invalid.indexOf('content') > -1  )
      this.$status.text('Please enter post content.');

  },
  success : function() {
    this.$status.text('The post was saved.');
    this.form.clear();
  },
  error : function() {
    this.$status.text('There was an error.');
  }
});
```