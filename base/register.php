<?php 

/*---------------------------------------------
 *
 * Agility: Register actions
 *
 */

class Agility_Register {

	public static function register( $actions ) {

		// Single action, then put it in array
		if ( isset($actions['action']) ) {
			$actions = array($actions);
		}

		foreach ( $actions as $action ) {
			self::register_single( $action );
		}
	} // End register


	private static function register_single( $action ) {

		// Action and function necessary
		if ( !isset($action['action']) || !isset($action['function']) )
			return false;

		Agility::$actions[ $action['action'] ] = $action; // Store all actions

		$action_name = $action['action'];
		$function = $action['function'];

		// Logged-in users
		if ( isset( $action['logged'] ) && $action['logged'] )
			add_action( 'wp_ajax_' . $action_name, $function );

		// Logged-out users
		else if ( isset( $action['logged'] ) && !$action['logged'])
			add_action( 'wp_ajax_nopriv_' . $action_name, $function );

		// Both
		else {
			add_action( 'wp_ajax_nopriv_' . $action_name, $function );
			add_action( 'wp_ajax_' . $action_name, $function );
		}
	}
	
}
