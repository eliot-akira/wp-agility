<?php 

/*---------------------------------------------
 *
 * Agility: Enqueue
 * 
 * - Load bundled JS
 * - Store site config in wp.current
 *   Current URL request, admin-ajax URL, nonce, user
 * 
 */

new Agility_Enqueue;

class Agility_Enqueue {

	private static $state;

	function __construct( $url = null ) {

		self::$state['version'] = '0.0.1';
		self::$state['js'] = 'js/agility.min.js';

		self::$state['url'] = dirname( dirname(__FILE__) ); // ../
		self::$state['url'] = str_replace( WP_CONTENT_DIR, WP_CONTENT_URL, self::$state['url'] );

		add_action( 'wp_head', array($this, 'prepare_wp_current') );
        add_action( 'wp_enqueue_scripts', array( $this, 'include_scripts' ) );
	}

	function include_scripts() {

		wp_enqueue_script( 'agility', self::$state['url'].self::$state['js'],
			array('jquery'), self::$state['version'], true );
	}


	function prepare_wp_current() {

		global $wp;

		$route = self::prepare_route_array();

		$user = self::prepare_user_array();

		$data = array(
			'route' => $route,
			'user' => $user,
			'nonce' => wp_create_nonce( 'agility' ),
		);

		$data = stripslashes(json_encode($data));

		// Pass it to client-side JS as wp.current

		?><script>window.wp=window.wp||{};wp.current=<?php echo $data(); ?>;</script><?php

	}

	/*---------------------------------------------
	 *
	 * URL route
	 *
	 */

	static function prepare_route_array() {

		// Get URL request

		// Direct method
		$request_url = untrailingslashit('http://'.$_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI']);
		// Normal method: $wp->query_string not correct on 404
		// $request_url = add_query_arg( $wp->query_string, '', home_url( $wp->request ) );

		// Request string/array
		$request_string = $wp->request;
		$request_array = array_filter(explode('/', $request_string));

		// Query string/array
		$url = parse_url( $request_url );
		$query_string = isset($url['query']) ? $url['query'] : null;
		parse_str( $query_string, $query_array ); // Create array from query string
		$query_array = array_filter($query_array); // Remove any empty keys

		return array(
				'ajax'    => admin_url('admin-ajax.php'),
				'home'    => home_url(),
				'query'   => array(
					'string'  => $query_string,
					'array'   => $query_array,
				),
				'request' => array(
					'url'     => $request_url,
					'string'  => $request_string,
					'array'   => $request_array,
					'slug'    => array_pop($request_array),
				),
				'site'    => site_url(),
				'vars'    => $wp->query_vars
		);
	}


	/*---------------------------------------------
	 *
	 * Current user data
	 *
	 */

	static function prepare_user_array() {

		// User data		
		$user = wp_get_current_user();
		$user_data = array( 'id' => 0 ); // Default: not logged in

		if ( $user ) {
			$user_data = array(
				'id' => $user->ID,
				'name' => $user->user_login,
				'display_name' => $user->display_name
			);
		}
		return $user_data;
	}

}
