<?php 

/**
 *
 * Agility: login & register
 *
 * @param username
 * @param password
 * @param email 	For register
 *
 */

new Agility_Action_Login;

class Agility_Action_Login {

	function __construct() {

		Agility::register( array(
			array(
				'action' => 'login',
				'function' => array($this, 'login')
			),
			array(
				'action' => 'register',
				'params' => array(
					'username','password','key','email'
				),
				'function' => array($this, 'register')
			)
		));
	}


	function login() {

		$request = Agility::request();

		if (is_user_logged_in()) {

			Agility::error_message( "You're already logged in." );

		} elseif ( empty($request['username']) || empty($request['password']) ) {

			Agility::error_message( 'Username and password required.' );

		} else {
			$info = array();
			$info['user_login'] = $request['username'];
			$info['user_password'] = $request['password'];
//			$info['user_password'] = Agility::decrypt( $input['login_password'], $input['key'] );
			$info['remember'] = true;

			$user_signon = @wp_signon( $info, false );

			if ( is_wp_error( $user_signon ) ) {

				$error_code = $user_signon->get_error_code();
				$message = self::error_code_to_message($error_code); // Simplify error message
				// $user_signon->get_error_message()

				Agility::error_message( $message ); // 'Please try again.'
			} else {
				Agility::success();
			}
		}
	}


	/**
	 * 
	 * Convert error code to human-readble format
	 *
	 */

	public static function error_code_to_message( $slug ) {
		$message = str_replace('_', ' ', $slug);
		$message = str_replace('-', ' ', $message);
		return ucfirst($message);
	}




	function register() {

		$request = Agility::request();

		if (is_user_logged_in()) {

			Agility::error_message( "You're already logged in." );

		} else {

			$name = $request['username'];
			$password = $request['password'];
//			$password = Ajaxio::decrypt( $input['register_password'], $input['key'] );
			$email = $request['email'];

			$user_id = @wp_create_user( $name, $password, $email );

			if ( is_wp_error( $user_id ) ) {

				$error_code = $user_id->get_error_code();
				$message = self::error_code_to_message($error_code); // Simplify error message
				// $user_signon->get_error_message()
				Agility::error_message( $message ); // 'Please try again.'
			} else {

				$info['user_login'] = $name;
				$info['user_password'] = $password;
				$info['remember'] = true;
				$user_signon = @wp_signon( $info, false );

				Agility::success( array(
					'message'=> 'Register successful',
					'id' => $user_id ));
			}
		}

	}

	
}
