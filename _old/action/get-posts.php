<?php 

/**
 *
 * Agility: get_post, get_posts
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

new Agility_Action_Get_Posts;

class Agility_Action_Get_Posts {

	function __construct() {

		Agility::register( array(
			array(
				'action' => 'agility_get_posts',
				'function' => array($this, 'get_posts')
			),
			array(
				'action' => 'agility_get_post',
				'function' => array($this, 'get_posts') // Same but return only one
			),
		));
	}


	function get_posts() {

		$request = Agility::request();

		if (isset($request['fields'])) {
			$fields = $request['fields'];
			unset($request['fields']);
		} else {
			$fields = array();
		}

		$query = self::prepare_query( $request );

		$posts = get_posts( $query );

		$fields = self::prepare_field_query( $fields );
		$results = self::get_fields( $posts, $fields );
		$response = self::prepare_response( $results );

		Agility::respond( $response );
	}




	public static function prepare_query( $request ) {

		$defaults = array(
			'post_type' => 'post',
			'posts_per_page' => -1
		);

		$query = is_array($request) ? array_merge($defaults, $request) : $defaults;

/*			$query['post__in'] = $id_array;
			$query['orderby'] = 'post__in'; // Preserve ID order
*/
		return $query;
	}




	public static function prepare_field_query( $fields ) {

		// Default fields
		$defaults = array(
			'title',
			'url',
			'id'
		);

		$fields = array_merge($defaults, $fields);
		return $fields;
	}


	public static function get_fields( $posts, $fields ) {

		$results = array();

		if ( ! $posts ) return $results;

		// Prepare fields array

		$i = 0;
		foreach ($posts as $post) {

			foreach ($fields as $field) {

				$value = null;
				$post_id = $post->ID;

				// Store post metadata to return

				switch ($field) {

					case 'id' : $value   = $post_id; break;
					case 'name' : $value = $post->post_name; break;
					case 'title': $value = $post->post_title; break;
					case 'url' : $value  = get_permalink($post_id); break;
					case 'date' : $value = $post->post_date; break;

					// Author info
					case 'author' : $value = $post->post_author; break;
					case 'author_username' :
						$value = get_the_author_meta('user_login', $post->post_author); break;
					case 'author_name' :
						$value = get_the_author_meta('user_nicename', $post->post_author); break;
					case 'author_email' :
						$value = get_the_author_meta('user_email', $post->post_author); break;

					case 'excerpt' : $value = $post->post_excerpt; break;
					case 'post_parent' : $value = $post->post_parent; break;
					case 'comment_count' : $value = $post->comment_count; break;

					case 'content' :
						$value = apply_filters( 'the_content', $post->post_content ); break;

					case 'post_type': $value = $post->post_type; break;

					// Featured image
					case 'image_url':
						$value = wp_get_attachment_url(get_post_thumbnail_id($post_id)); break;
					case 'thumbnail_url':
						$src = wp_get_attachment_image_src( get_post_thumbnail_id($post_id), 'thumbnail' );
						if ($src && isset($src['0']))
							$value = $src['0'];
						break;

					// Custom field
					default : $value = get_post_meta( $post_id, $field, true );
						break;
				}

				$results[$i][$field] = $value;
			}
			$i++;
		}

		return $results;
	}



	public static function prepare_response( $results ) {

		// ----- Prepare response to send back -----

		$response = array();
		if (empty($results)) {
			$response['message'] = 'Nothing found';
			$response['success'] = false;
			return $response;
		} else {
			$response['success'] = true;
		}

		// Return single or multiple posts
		if ( Agility::get_action() == 'get_post' )
			$response['data'] = !empty($results) ? $results[0] : array();
		else $response['data'] = !empty($results) ? $results : array();

		return $response;
	}
}
