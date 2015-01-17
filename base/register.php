<?php 

class Ajaxio_Base_Register {

	public static function register( $actions ) {

		if ( isset($actions['action']) ) {
			// Single action
			self::register_single( $actions );
		}
		else {
			// Multiple actions
			foreach ( $actions as $action ) {
				self::register_single( $action );
			}
		}
	} // End register


	private static function register_single( $action ) {

		if ( !isset($action['action']) && !isset($action['function']) ) {
			// Action and function necessary
			return false;
		}


		Ajaxio::$actions[ $action['action'] ] = $action; // Store all actions


		if ( isset( $action['logged'] ) && $action['logged'] ) {

			// Actions for users who are logged in
			add_action( 'wp_ajax_' . $action['action'], $action['function'] );

		} else if ( isset( $action['logged'] ) && !$action['logged']) {

			// Actions for users who are not logged in
			add_action( 'wp_ajax_nopriv_' . $action['action'], $action['function'] );

		} else {

			// Actions for users who are logged in and not logged in
			add_action( 'wp_ajax_nopriv_' . $action['action'], $action['function'] );
			add_action( 'wp_ajax_' . $action['action'], $action['function'] );
		}
	}
	
}
