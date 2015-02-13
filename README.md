# WP-Agility

This plugin provides a JavaScript framework for building an interactive user interface with WordPress. It's backed by a PHP component for performing AJAX actions.

## Features

- [Agility.js](http://agilityjs.com), forked and extended - Organize the frontend into objects, with data-binding between models and views, as well as an event system.

- WordPress AJAX interface - Easy way to get and save content in the database, such as posts, fields, users. 

## Examples

#### Get a post

Start with an HTML structure.

```
<section id="single-post">
  <h4 data-bind="title"></h4>
  <div data-bind="html=content"></div>
</section>
```

Use the $$ factory function to create an object. If you pass an ID, it will use the element content as the view template.

```javascript
var singlePost = $$('#single-post');
```

Get a post and set it as the data model.

```javascript
wp.action
  .get({ type: 'post' })
  .done(function(post){
    singlePost.set( post );
  });
```

That's it. The view will be automatically rendered.

#### Get a list of users

Create a template.

```
<ul id="user-list">
  <li data-bind="name"></li>
</ul>
```

Create an object for the user list, and another one to use as prototype for a single user. Then we empty the element content of the user list.


```javascript
var userList = $$('#user-list');
var userPrototype = $$('#user-list li');

userList.$view.empty();
```

Get a list of users. When the reply is received, create a new object for each user, based on the prototype defined above, and append it to the user list.

```javascript
wp.action
  .get({ type: 'users', orderby: 'name' })
  .done(function(users){

    users.forEach(function( userModel ){

      var user = $$( userPrototype, userModel );
      userList.append( user );
    });
  });
```

