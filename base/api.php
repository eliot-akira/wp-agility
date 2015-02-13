<?php 

include('enqueue.php');
include('io.php');
include('register.php');
include('util/log.php');
// include('util/encrypt.php');

// Public API

new Agility;

class Agility {

	public static $state;
  public static $actions;
  public static $action_prefix;

  function __construct() {
    self::$action_prefix = 'agility_';
  }


	public static function register( $actions ) {
		return Agility_Register::register( $actions );
	}

	// @todo Simplify!

	public static function request() {
		return Agility_IO::request();
	}

	public static function success( $content = array() ) {
		return Agility_IO::success( $content );
	}

	public static function error( $content = array() ) {
		return Agility_IO::error( $content );
	}

	public static function error_message( $message = '' ) {
		return Agility_IO::error_message( $message );
	}

	public static function respond( $response = array() ) {
		return Agility_IO::respond( $response );
	}

	public static function get_action() {
		return Agility_IO::get_action();
	}



	public static function log( $arg1, $arg2 = array() ) {
		return Agility_Log::log( $arg1, $arg2 );
	}

	public static function log_array( $arg1 = '', $arg2 = '', $arg3 = '' ) {
		return Agility_Log::log_array( $arg1, $arg2, $arg3 );
	}


/*
	public static function generate_key() {
		return Agility_Encrypt::generate_key();
	}

	public static function encrypt( $text, $key ) {
		return Agility_Encrypt::encrypt( $text, $key );
	}

	public static function decrypt( $text, $key ) {
		return Agility_Encrypt::decrypt( $text, $key );
	}
*/

}
