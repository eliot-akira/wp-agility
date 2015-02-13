<?php 

/**
 *
 * Agility: get_user, get_users
 *
 * @param All parameters for get_users
 * @see codex.wordpress.org/Function_Reference/get_users
 * 
 * @return Array
 * 
 *         success		true/false
 *         message 		Message or null
 *
 */

new Agility_Action_Get_Users;

class Agility_Action_Get_Users {

	function __construct() {

		Agility::register( array(
			array(
				'action' => 'get_users',
				'function' => array($this, 'get_users')
			),
			array(
				'action' => 'get_user',
				'function' => array($this, 'get_user')
			),
		));
	}


	function get_users() {

		$request = Agility::request();

		if ( isset($request['fields']) ) {
			$user_meta = $request['fields'];
			unset($request['fields']);
		} else {
			$user_meta = array();
		}

    // Alias
    if (isset($request['count'])) {
      $request['number'] = $request['count'];
      unset($request['count']);
    }

		$users = get_users( $request );

		$results = self::prepare_users_array( $users, $user_meta );

		$response = self::prepare_response( $results, $request );

		Agility::respond( $response );
	}

	function prepare_users_array( $users, $user_meta = array() ) {

		$results = array();

		if ( ! is_array($users) ) return $results;

		// User Loop
		foreach ( $users as $user ) {

			$data = array(
				'id' => $user->ID,
        'name' => $user->display_name,
				'login' => $user->user_login,
				'email' => $user->user_email,
				'url' => $user->user_url,
				'registered' => $user->user_registered,
				'firstname' => $user->user_firstname,
				'lastname' => $user->user_lastname,
				'description' => $user->description,
        // 'nicename' => $user->user_nicename,
			);

			// User meta fields
			if ( $user_meta !== array() ) {
				foreach ($user_meta as $meta) {
					$data[$meta] = get_user_meta( $user->ID, $meta );
				}
			}

			$results[] = $data;

		}

		return $results;	
	}


	public static function prepare_response( $results = array(), $request = array() ) {

		// ----- Prepare response to send back -----

		$response = array();
		if ( empty($results) || ( $results == array() ) ) {
			$response['message'] = 'Nothing found';
			$response['request'] = $request;
			$response['success'] = false;
			return $response;
		} else {
			$response['success'] = true;
		}

		// Return single or multiple posts
		if ( Agility::get_action() == 'get_user' )
			$response['data'] = !empty($results) ? $results[0] : array();
		else $response['data'] = !empty($results) ? $results : array();

		return $response;
	}
}
