<?php  

class Ajaxio_Encrypt {

	public static function generate_key() {
		return str_shuffle('0123456789');
	}

	public static function encrypt( $str, $key ) {
		if (empty($key)) return $str;
		return base64_encode( $str );
	}

	public static function decrypt( $str, $key ) {
		if (empty($key)) return $str;
		return base64_decode( $str );
	}

}
