<?php 

include('enqueue.php');
include('io.php');
include('register.php');
// include('util/encrypt.php');
include('util/log.php');


// Public API

class Agility {

	public static $state;
	public static $actions;

	public static function register( $actions ) {
		return Agility_Register::register( $actions );
	}

	public static function input() {
		return Agility_IO::input();
	}

	public static function output( $content ) {
		return Agility_IO::output( $content );
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
