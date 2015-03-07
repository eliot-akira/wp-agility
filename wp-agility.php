<?php 
/*
Plugin Name: WP-Agility
Version: 0.3.0
Description: Frontend MVC library with data-bind, events, and WordPress AJAX interface
*/

define('WP_AGILITY_VERSION', '0.3.0');

include('base/api.php');
include('action/get-posts.php');
include('action/get-users.php');
include('action/save-posts.php');
// @todo user, taxonomy, field, option

include('action/login.php');
include('action/send-email.php');
