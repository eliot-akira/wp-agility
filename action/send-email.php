<?php 

/**
 *
 * Agility: send_email
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

new Agility_Action_Send_Email;

class Agility_Action_Send_Email {

	function __construct() {

		Agility::register( array(
			array(
				'action' => 'send_email',
				'function' => array($this, 'send_email')
			),
			array(
				'action' => 'send_emails',
				'function' => array($this, 'send_email')
			)
		));
	}


	function send_email() {

		$request = Agility::request();

		if ( Agility::get_action() == 'agility_send_email' ) {
			$request = array($request); // Just one email
		}

		$success = self::send( $request );

		if ( $success == 'success' ) {

			$response['data'] = $request;
			$response['success'] = true;
			Agility::respond( $response );
		} else {

			$response['error'] = $success;
			$response['data'] = $request;
			$response['success'] = false;
			Agility::respond( $response );
			// Agility::error_message( $success );
		}
	}

	public static function send( $emails ) {

		$sent = 'success';

		$emails = !isset($emails['title']) ? $emails : array($emails); // Single e-mail

		foreach ( $emails as $email ) {

			if ( !isset($email['title']) ) {
				return 'Title is required';
			} elseif ( !isset($email['content']) ) {
				return 'Content is required';
			}

			$admin = get_option('admin_email');

			$to = isset($email['to']) ? $email['to'] : $admin;
			$from = isset($email['from']) ?
				$email['from'] : 'Website: '.get_option('blogname').' <'.$admin.'>';
			$title = $email['title'];
			$content = $email['content'];

			$header = array();

			if (isset($email['type']) && $email['type']=='html') {
				$header[] = 'Content-Type: text/html; charset=UTF-8';
			}

			$header[] = 'From: '.$from;

			if (isset($email['cc'])) {
				$ccs = explode(',', $email['cc']); // Comma-separated list
				$ccs = array_map('trim', $ccs); // Remove extra white space
				foreach ($ccs as $cc) {
					$header[] = 'Cc: '.$cc;
				}
			}

			if ( ! wp_mail( $to, $title, $content, $header ) )
				return 'Error';

		} // End for each email

		return $sent;
	}

}
