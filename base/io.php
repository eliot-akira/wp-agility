<?php 

/**
 * 
 * Ajaxio: input/output
 *
 */


class Agility_IO {


	public static function input() {

		$nonce = isset($_POST['nonce']) ? $_POST['nonce'] : null;

		if ( !wp_verify_nonce( $nonce, 'agility' ) )
			self::json_error( 'Invalid nonce' );
		    // die('Unauthorized'); // Unauthorized request

		// Unescape data
		$data = isset($_POST['data']) ? self::stripslashesFull($_POST['data']) : array();

		// Filter input

		$action = self::get_action_config();
		$params = isset($action['params']) ? $action['params'] : array();

		foreach ($params as $param) {
			if ( !isset( $data[$param]) ) {
				$data[$param] = '';
			}
		}

		return $data;
	}


	public static function json_success( $content ) {

		wp_send_json_success( $content );
		// echo json_encode( $content );
		// exit;
	}


	private static function json_error( $message ) {
		status_header( 412 );
		wp_send_json_error( array( 'message' => $message ) );
	}



	public static function get_action() {
		return isset($_POST['action']) ? $_POST['action'] : null;
	}

	public static function get_action_config() {

		$action_name = self::get_action();
		$action_config = isset( Agility::$actions[$action_name] ) ?
			Agility::$actions[$action_name] : array();

		return $action_config;
	}


	// Unescape data, support multidimensional array
	public static function stripslashesFull($input) {
	    if (is_array($input)) {
	        $input = array_map(array(__CLASS__,'stripslashesFull'), $input);
	    } elseif (is_object($input)) {
	        $vars = get_object_vars($input);
	        foreach ($vars as $k=>$v) {
	            $input->{$k} = self::stripslashesFull($v);
	        }
	    } else {
	        $input = stripslashes($input);
	    }
	    return $input;
	}
	
}
