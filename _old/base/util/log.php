<?php 

/*---------------------------------------------
 *
 * Log messages
 *
 */


class Agility_Log {

	public static function to_file( $content, $options = array() ) {

		$filename = isset($options['filename']) ? $options['filename'] : 'agility-log.txt';
 		$break = isset($options['break']) ? $options['break'] : 1;
 		$array = isset($options['array']) ? $options['array'] : false;
 		$header = isset($options['header']) ? $options['header'] : null;

		if (!empty($array)) {
			$content = print_r($content, true);
		}

		if (!empty($header)) {
			$br = "\r\n";
			$content =
				$br.$header.$br
				."------------------------------------------"
				.$br.$content.$br.$br;
		}

		if ($break) {
			for ($i=0; $i < $break; $i++) { 
				$content .= "\r\n";
			}
		}

		$filename = WP_CONTENT_DIR.'/'.$filename;
		file_put_contents($filename, $content, FILE_APPEND);
	}


	public static function log( $arg1, $arg2 = array() ) {


		if ( ! is_array($arg2) ) {
			$options['header'] = $arg1;
			$content = $arg2;
		} else {
			$content = $arg1;
			$options = $arg2;
		}

		return self::to_file( $content, $options );
	}



	public static function log_array( $arg1 = '', $arg2 = '', $arg3 = '' ) {

		if ( is_array($arg1) ) {
			$content = $arg1;
			if ( is_array($arg2) ) {
				$options = $arg2;
			} else {
				$options = '';
			}
		} else {
			$options['header'] = $arg1;
			$content = $arg2;
			if ( is_array($arg3) ) {
				$options = $arg3;
			}
		}

		ob_start(); print_r($content); $content = ob_get_clean();

		return self::to_file( $content, $options );
	}

}
