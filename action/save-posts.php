<?php 

/**
 *
 * Agility: save_post, save_posts
 *
 * @param 
 * 
 * @return Array
 * 
 *         success		true/false
 *         data 		array
 *         message 		string
 *
 */

new Agility_Action_Save_Posts;

class Agility_Action_Save_Posts {

	function __construct() {

		Agility::register( array(
			array(
				'action' => 'save_posts',
				'function' => array($this, 'save_posts')
			),
			array(
				'action' => 'save_post', // Only one post
				'function' => array($this, 'save_posts')
			),
		));
	}


	function save_posts() {

		$request = Agility::request();

		if ( Agility::get_action() == 'agility_save_post' ) {
			$request = array($request); // Just one post
		}

		$success = true;
		$notify = false;

		$all_posts = array();
		$return_ids = array();

		// Translate to WP parameter names
		$translate = array(
			'type'     => 'post_type',
			'title'    => 'post_title',
			'content'  => 'post_content',
			'status'   => 'post_status',
			'parent'   => 'post_parent',
			'category' => 'post_category',
			'tags'     => 'tags_input',
			'taxonomy' => 'tax_input'
		);

		// Pass these to wp_insert_post; all else are considered fields
		$defaults = array(
			'ID', 'post_content', 'post_name', 'post_title',
			'post_status', 'post_type', 'post_author', 'post_parent',
			'menu_order', 'post_excerpt', 'post_password',
			'post_category', 'tags_input', 'tax_input'
		);

		// Build post array from given parameters
		foreach ( $request as $post ) {

			$fields = isset($post['fields']) ? $post['fields'] : array();

			foreach ($post as $key => $value) {

				if ( isset($translate[$key]) ) {
					$post[ $translate[$key] ] = $value;
					unset($post[$key]);
				} elseif ( $key == 'notify' ) {
					$notify = $value;
					unset($post[$key]);
				} elseif ( ! in_array($key, $defaults) ) {
					$fields[$key] = $value;
					unset($post[$key]);
				} else {
					// Pass directly to wp_insert_post
				}
			}
			
			$post['post_status'] = isset($post['post_status']) ?
				$post['post_status'] : 'publish'; // Default is publish

			// Save post
			$id = wp_insert_post( $post, true );

			if ( is_wp_error( $id ) ) {
				// Failed: reply with error message
				/*
				$response['data'] = array(
					'code' => $id->get_error_code(),
					'message' => $id->get_error_message()
				);
				$response['success'] = false;
				Agility::respond( $response );
				*/

				Agility::error_message( $id->get_error_message() );
			}

			// Save fields

			foreach ($fields as $key => $value) {
				update_post_meta( $id, $key, $value );
			}

			$post['fields'] = $fields;
			$all_posts[] = $post;
			$return_ids[] = $id;

		} // End for each post

		// Notify e-mail to admin
		if ( $notify && is_array($notify) ) {

			Agility_Action_Send_Email::send( $notify );
		}

		$response['data'] = array(
			'ids' => $return_ids, // Return saved post IDs
			'notify' => $notify,
			'posts' => $all_posts, // For debug: all posts saved
		);
		$response['success'] = true;
		Agility::respond( $response );
	}

}
