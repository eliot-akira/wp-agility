<?php 

/*---------------------------------------------
 *
 * Agility: Enqueue
 * 
 * - Load bundled JS
 * - Store site config in wp.current
 *   current URL request, admin-ajax URL, nonce, user
 * 
 */

new Agility_Enqueue;

class Agility_Enqueue {

	private static $state;

	function __construct( $url = null ) {

		add_action( 'wp_head', array($this, 'prepare_wp_js') );
        add_action( 'wp_enqueue_scripts', array( $this, 'include_scripts' ) );
	}

	function include_scripts() {

		self::$state['version'] = WP_AGILITY_VERSION;
		self::$state['js'] = 'assets/js/wp-agility.min.js';

		self::$state['url'] = trailingslashit( dirname(dirname(__FILE__)) ); // One folder above
		self::$state['url'] = str_replace( WP_CONTENT_DIR, WP_CONTENT_URL, self::$state['url'] );

		wp_enqueue_script( 'agility', self::$state['url'].self::$state['js'],
			array('jquery'), self::$state['version'], true );
	}


	function prepare_wp_js() {

		$routes = self::prepare_routes_array();

		$user = self::prepare_user_array();

		$current = array(
			'user' => $user,
			'nonce' => wp_create_nonce( 'agility' ),
			'queries' => $routes['route']['queries'],
			'request' => $routes['route']['request'],
			'requests' => $routes['route']['requests'],
			'url' => $routes['route']['current'],
			'sitename' => get_option('blogname')
		);

		$current = self::prepare_json( $current );
		$url = self::prepare_json( $routes['url'] );

		// Pass it to client-side JS as wp.current

?><script>
window.wp=window.wp||{};window.$=window.jQuery;
wp.current=<?php echo $current; ?>; wp.url=<?php echo $url; ?>;
</script><?php

	}


	static function prepare_json( $data ) {
		// Why decode..?
		return html_entity_decode(stripslashes(json_encode($data)));
	}

	/*---------------------------------------------
	 *
	 * URL route
	 *
	 */

	static function prepare_routes_array() {

		global $wp;

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
		$query_array = array_filter($query_array); // Remove empty keys

		return array(
				'url' => array(
					'ajax'    => admin_url('admin-ajax.php'),
					'home'    => trailingslashit(home_url()),
					'logout'  => wp_logout_url(),
					'site'    => trailingslashit(site_url()),
				),
				'route' => array(
					'current' => $request_url,
					'query'    => $query_string,
					'queries'  => $query_array,
					'request'  => $request_string,
					'requests' => $request_array,
					'slug'     => array_pop($request_array),
					'vars'     => $wp->query_vars
				)
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

		if ( 0 == $user->ID || !is_user_logged_in() ) {
			$user_data = array( 'id' => 0, 'login' => false ); // Default: not logged in
		} else  {
			$user_data = array(
				'id' => $user->ID,
				'name' => $user->user_login,
				'display_name' => $user->display_name,
				'login' => true
			);
		}
		return $user_data;
	}

}
