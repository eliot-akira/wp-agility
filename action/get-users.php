<?php 

/**
 *
 * Agility: get_user, get_users
 *
 * @param All parameters for WP_Query
 * @see codex.wordpress.org/Class_Reference/WP_Query
 * 
 * @return Array
 * 
 *         post 	 	Post object - get_post
 *         posts 		Post objects - get_posts
 *         total 		Total posts found - for pagination
 *         message 		Message or null
 *         success		true/false
 *
 */

new Agility_Action_Get_Users;

class Agility_Action_Get_Users {

	function __construct() {

		Agility::register( array(
			array(
				'action' => 'agility_get_users',
				'function' => array($this, 'get_users')
			),
			array(
				'action' => 'agility_get_user',
				'function' => array($this, 'get_user')
			),
		));
	}


	function get_users() {

		$request = Agility::request();

		if ( isset($request['meta']) ) {
			$user_meta = $request['meta'];
			unset($request['meta']);
		} else {
			$user_meta = array();
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
				'login' => $user->user_login,
				'nicename' => $user->user_nicename,
				'email' => $user->user_email,
				'url' => $user->user_url,
				'registered' => $user->user_registered,
				'display_name' => $user->display_name,
				'firstname' => $user->user_firstname,
				'lastname' => $user->user_lastname,
				'description' => $user->description,
			);

			// What about user meta fields?
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
