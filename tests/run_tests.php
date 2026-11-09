<?php
/**
 * Automated Standalone Test Suite for HA-BPMN-Manager WordPress Plugin.
 *
 * Covers:
 * 1. Version consistency across all project descriptor files
 * 2. PHP syntax linting of all plugin code
 * 3. Default settings completeness and data types
 * 4. Settings sanitization, validation, type casting, and legacy compatibility
 * 5. Tutorial / Quest module toggle (activation / deactivation behavior)
 * 6. Asset registration and bpmnSettings localized array structure
 * 7. Modeler Metabox HTML rendering (conditional toolbar button output)
 * 8. Achievements API integration conditional filtering
 * 9. Shortcode parsing, defaults, and renderer logic
 * 10. Localization files integrity (.l10n.php and .mo/.po files)
 *
 * @package HA_BPMN_Manager
 */

declare(strict_types=1);

namespace {

	// Minimal WordPress environment stubs for standalone test execution
	if ( ! defined( 'ABSPATH' ) ) {
		define( 'ABSPATH', dirname( __DIR__ ) . '/plugin/' );
	}
	if ( ! defined( 'WP_PLUGIN_DIR' ) ) {
		define( 'WP_PLUGIN_DIR', dirname( __DIR__ ) );
	}
	if ( ! defined( 'WPMU_PLUGIN_DIR' ) ) {
		define( 'WPMU_PLUGIN_DIR', dirname( __DIR__ ) . '/mu-plugins' );
	}
	if ( ! defined( 'WP_CONTENT_DIR' ) ) {
		define( 'WP_CONTENT_DIR', dirname( __DIR__ ) );
	}
	if ( ! defined( 'WP_DEBUG' ) ) {
		define( 'WP_DEBUG', false );
	}
	if ( ! defined( 'HOUR_IN_SECONDS' ) ) {
		define( 'HOUR_IN_SECONDS', 3600 );
	}

	$GLOBALS['wp_test_options']  = [];
	$GLOBALS['wp_test_actions']  = [];
	$GLOBALS['wp_test_filters']  = [];
	$GLOBALS['wp_test_locale']   = 'de_DE';
	$GLOBALS['wp_test_user_caps'] = [ 'manage_options' => true, 'activate_plugins' => true, 'edit_posts' => true, 'update_plugins' => true ];

	if ( ! function_exists( 'get_option' ) ) {
		function get_option( $name, $default = false ) {
			return $GLOBALS['wp_test_options'][ $name ] ?? $default;
		}
	}

	if ( ! function_exists( 'update_option' ) ) {
		function update_option( $name, $value, $autoload = null ): bool {
			$GLOBALS['wp_test_options'][ $name ] = $value;
			return true;
		}
	}

	if ( ! function_exists( 'delete_option' ) ) {
		function delete_option( $name ): bool {
			unset( $GLOBALS['wp_test_options'][ $name ] );
			return true;
		}
	}

	if ( ! function_exists( 'wp_parse_args' ) ) {
		function wp_parse_args( $args, $defaults = [] ): array {
			if ( is_object( $args ) ) {
				$r = get_object_vars( $args );
			} elseif ( is_array( $args ) ) {
				$r = &$args;
			} else {
				wp_parse_str( $args, $r );
			}
			if ( is_array( $defaults ) ) {
				return array_merge( $defaults, $r );
			}
			return $r;
		}
	}

	if ( ! function_exists( 'wp_parse_url' ) ) {
		function wp_parse_url( $url, $component = -1 ) {
			return parse_url( (string) $url, $component );
		}
	}

	if ( ! function_exists( 'get_theme_root' ) ) {
		function get_theme_root(): string {
			return dirname( __DIR__ ) . '/themes';
		}
	}

	if ( ! function_exists( 'is_admin' ) ) {
		function is_admin(): bool {
			return true;
		}
	}

	if ( ! function_exists( 'is_multisite' ) ) {
		function is_multisite(): bool {
			return false;
		}
	}

	if ( ! function_exists( 'wp_next_scheduled' ) ) {
		function wp_next_scheduled( $hook, $args = [] ) {
			return false;
		}
	}

	if ( ! function_exists( 'wp_schedule_event' ) ) {
		function wp_schedule_event( $timestamp, $recurrence, $hook, $args = [] ): bool {
			return true;
		}
	}

	if ( ! function_exists( 'wp_unschedule_event' ) ) {
		function wp_unschedule_event( $timestamp, $hook, $args = [] ): bool {
			return true;
		}
	}

	if ( ! function_exists( 'wp_clear_scheduled_hook' ) ) {
		function wp_clear_scheduled_hook( $hook, $args = [] ): int {
			return 1;
		}
	}

	if ( ! function_exists( 'add_action' ) ) {
		function add_action( $tag, $callback, $priority = 10, $accepted_args = 1 ): bool {
			$GLOBALS['wp_test_actions'][ $tag ][] = [
				'callback'      => $callback,
				'priority'      => $priority,
				'accepted_args' => $accepted_args,
			];
			return true;
		}
	}

	if ( ! function_exists( 'add_filter' ) ) {
		function add_filter( $tag, $callback, $priority = 10, $accepted_args = 1 ): bool {
			$GLOBALS['wp_test_filters'][ $tag ][] = [
				'callback'      => $callback,
				'priority'      => $priority,
				'accepted_args' => $accepted_args,
			];
			return true;
		}
	}

	if ( ! function_exists( 'has_filter' ) ) {
		function has_filter( $tag, $function_to_check = false ) {
			if ( empty( $GLOBALS['wp_test_filters'][ $tag ] ) ) {
				return false;
			}
			if ( false === $function_to_check ) {
				return true;
			}
			foreach ( $GLOBALS['wp_test_filters'][ $tag ] as $entry ) {
				if ( $entry['callback'] === $function_to_check ) {
					return true;
				}
			}
			return false;
		}
	}

	if ( ! function_exists( 'remove_filter' ) ) {
		function remove_filter( $tag, $function_to_remove, $priority = 10 ): bool {
			if ( empty( $GLOBALS['wp_test_filters'][ $tag ] ) ) {
				return false;
			}
			foreach ( $GLOBALS['wp_test_filters'][ $tag ] as $k => $entry ) {
				if ( $entry['callback'] === $function_to_remove ) {
					unset( $GLOBALS['wp_test_filters'][ $tag ][ $k ] );
					return true;
				}
			}
			return false;
		}
	}

	if ( ! function_exists( 'wp_remote_get' ) ) {
		function wp_remote_get( $url, $args = [] ) {
			$GLOBALS['wp_test_remote_requests'][] = [ 'url' => $url, 'args' => $args ];
			return [
				'response' => [ 'code' => 200, 'message' => 'OK' ],
				'body'     => '{"mock":true}',
			];
		}
	}

	if ( ! function_exists( 'apply_filters' ) ) {
		function apply_filters( $tag, $value, ...$args ) {
			if ( ! empty( $GLOBALS['wp_test_filters'][ $tag ] ) ) {
				foreach ( $GLOBALS['wp_test_filters'][ $tag ] as $filter ) {
					$cb = $filter['callback'];
					if ( is_callable( $cb ) ) {
						$value = call_user_func_array( $cb, array_merge( [ $value ], $args ) );
					}
				}
			}
			return $value;
		}
	}

	if ( ! function_exists( 'did_action' ) ) {
		function did_action( $tag ): int {
			return isset( $GLOBALS['wp_test_actions_done'][ $tag ] ) ? (int) $GLOBALS['wp_test_actions_done'][ $tag ] : 0;
		}
	}

	if ( ! function_exists( 'doing_action' ) ) {
		function doing_action( $tag = null ): bool {
			return false;
		}
	}

	if ( ! function_exists( 'do_action' ) ) {
		function do_action( $tag, ...$args ) {
			$GLOBALS['wp_test_actions_done'][ $tag ] = ( $GLOBALS['wp_test_actions_done'][ $tag ] ?? 0 ) + 1;
			if ( ! empty( $GLOBALS['wp_test_actions'][ $tag ] ) ) {
				foreach ( $GLOBALS['wp_test_actions'][ $tag ] as $action ) {
					$cb = $action['callback'];
					if ( is_callable( $cb ) ) {
						call_user_func_array( $cb, $args );
					}
				}
			}
		}
	}

	if ( ! function_exists( 'sanitize_text_field' ) ) {
		function sanitize_text_field( $str ): string {
			$filtered = strip_tags( (string) $str );
			return trim( $filtered );
		}
	}

	if ( ! function_exists( 'esc_url_raw' ) ) {
		function esc_url_raw( $url ): string {
			$url = trim( (string) $url );
			if ( '' === $url ) {
				return '';
			}
			return filter_var( $url, FILTER_SANITIZE_URL ) ?: '';
		}
	}

	if ( ! function_exists( 'esc_url' ) ) {
		function esc_url( $url ): string {
			return htmlspecialchars( esc_url_raw( $url ), ENT_QUOTES, 'UTF-8' );
		}
	}

	if ( ! function_exists( 'esc_attr' ) ) {
		function esc_attr( $text ): string {
			return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
		}
	}

	if ( ! function_exists( 'esc_html' ) ) {
		function esc_html( $text ): string {
			return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
		}
	}

	if ( ! function_exists( 'esc_textarea' ) ) {
		function esc_textarea( $text ): string {
			return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
		}
	}

	if ( ! function_exists( 'esc_html__' ) ) {
		function esc_html__( $text, $domain = 'default' ): string {
			return esc_html( (string) $text );
		}
	}

	if ( ! function_exists( 'esc_html_e' ) ) {
		function esc_html_e( $text, $domain = 'default' ): void {
			echo esc_html( (string) $text );
		}
	}

	if ( ! function_exists( 'esc_attr__' ) ) {
		function esc_attr__( $text, $domain = 'default' ): string {
			return esc_attr( (string) $text );
		}
	}

	if ( ! function_exists( 'esc_attr_e' ) ) {
		function esc_attr_e( $text, $domain = 'default' ): void {
			echo esc_attr( (string) $text );
		}
	}

	if ( ! function_exists( '__' ) ) {
		function __( $text, $domain = 'default' ): string {
			return (string) $text;
		}
	}

	if ( ! function_exists( '_e' ) ) {
		function _e( $text, $domain = 'default' ): void {
			echo (string) $text;
		}
	}

	if ( ! function_exists( 'checked' ) ) {
		function checked( $checked, $current = true, $echo = true ): string {
			$result = ( (string) $checked === (string) $current ) ? " checked='checked'" : '';
			if ( $echo ) {
				echo $result;
			}
			return $result;
		}
	}

	if ( ! function_exists( 'selected' ) ) {
		function selected( $selected, $current = true, $echo = true ): string {
			$result = ( (string) $selected === (string) $current ) ? " selected='selected'" : '';
			if ( $echo ) {
				echo $result;
			}
			return $result;
		}
	}

	if ( ! function_exists( 'wp_create_nonce' ) ) {
		function wp_create_nonce( $action = -1 ): string {
			return 'test_nonce_' . md5( (string) $action );
		}
	}

	if ( ! function_exists( 'wp_nonce_field' ) ) {
		function wp_nonce_field( $action = -1, $name = '_wpnonce', $referer = true, $echo = true ): string {
			$field = '<input type="hidden" name="' . esc_attr( $name ) . '" value="' . wp_create_nonce( $action ) . '" />';
			if ( $echo ) {
				echo $field;
			}
			return $field;
		}
	}

	if ( ! function_exists( 'rest_url' ) ) {
		function rest_url( $path = '' ): string {
			return 'https://example.com/wp-json/' . ltrim( $path, '/' );
		}
	}

	if ( ! function_exists( 'admin_url' ) ) {
		function admin_url( $path = '' ): string {
			return 'https://example.com/wp-admin/' . ltrim( $path, '/' );
		}
	}

	if ( ! function_exists( 'self_admin_url' ) ) {
		function self_admin_url( $path = '' ): string {
			return admin_url( $path );
		}
	}

	if ( ! function_exists( 'add_query_arg' ) ) {
		function add_query_arg( $key, $value = false, $url = '' ): string {
			if ( is_array( $key ) ) {
				$query = http_build_query( $key );
				$base = $value ?: '';
			} else {
				$query = urlencode( (string) $key ) . '=' . urlencode( (string) $value );
				$base = $url;
			}
			$sep = ( false !== strpos( $base, '?' ) ) ? '&' : '?';
			return $base . $sep . $query;
		}
	}

	if ( ! function_exists( 'wp_nonce_url' ) ) {
		function wp_nonce_url( $actionurl, $action = -1, $name = '_wpnonce' ): string {
			return add_query_arg( [ $name => 'testnonce' ], $actionurl );
		}
	}

	if ( ! function_exists( 'home_url' ) ) {
		function home_url( $path = '' ): string {
			return 'https://example.com/' . ltrim( $path, '/' );
		}
	}

	if ( ! function_exists( 'get_user_locale' ) ) {
		function get_user_locale( $user_id = 0 ): string {
			return $GLOBALS['wp_test_locale'] ?? 'de_DE';
		}
	}

	if ( ! function_exists( 'current_user_can' ) ) {
		function current_user_can( $capability, ...$args ): bool {
			return $GLOBALS['wp_test_user_caps'][ $capability ] ?? false;
		}
	}

	if ( ! function_exists( 'plugin_dir_path' ) ) {
		function plugin_dir_path( $file ): string {
			return trailingslashit( dirname( $file ) );
		}
	}

	if ( ! function_exists( 'plugin_dir_url' ) ) {
		function plugin_dir_url( $file ): string {
			return 'https://example.com/wp-content/plugins/ha-bpmn-manager/';
		}
	}

	if ( ! function_exists( 'plugin_basename' ) ) {
		function plugin_basename( $file ): string {
			return basename( dirname( $file ) ) . '/' . basename( $file );
		}
	}

	if ( ! function_exists( 'trailingslashit' ) ) {
		function trailingslashit( $string ): string {
			return rtrim( $string, '/\\' ) . '/';
		}
	}

	if ( ! function_exists( 'shortcode_atts' ) ) {
		function shortcode_atts( $pairs, $atts, $shortcode = '' ): array {
			$atts = (array) $atts;
			$out  = [];
			foreach ( $pairs as $name => $default ) {
				if ( array_key_exists( $name, $atts ) ) {
					$out[ $name ] = $atts[ $name ];
				} else {
					$out[ $name ] = $default;
				}
			}
			return $out;
		}
	}

	if ( ! function_exists( 'add_shortcode' ) ) {
		function add_shortcode( $tag, $callback ): void {
			$GLOBALS['wp_test_shortcodes'][ $tag ] = $callback;
		}
	}

	if ( ! function_exists( 'get_the_ID' ) ) {
		function get_the_ID(): int {
			return 101;
		}
	}

	if ( ! function_exists( 'get_the_title' ) ) {
		function get_the_title( $post = 0 ): string {
			return 'Test BPMN Diagram';
		}
	}

	if ( ! function_exists( 'wp_enqueue_style' ) ) {
		function wp_enqueue_style( $handle, $src = '', $deps = [], $ver = false, $media = 'all' ) {}
	}

	if ( ! function_exists( 'wp_enqueue_script' ) ) {
		function wp_enqueue_script( $handle, $src = '', $deps = [], $ver = false, $in_footer = false ) {}
	}

	if ( ! function_exists( 'wp_register_script' ) ) {
		function wp_register_script( $handle, $src, $deps = [], $ver = false, $in_footer = false ) {}
	}

	if ( ! function_exists( 'wp_register_style' ) ) {
		function wp_register_style( $handle, $src, $deps = [], $ver = false, $media = 'all' ) {}
	}

	if ( ! function_exists( 'wp_localize_script' ) ) {
		function wp_localize_script( $handle, $object_name, $l10n ) {
			$GLOBALS['wp_test_localized'][ $handle ][ $object_name ] = $l10n;
		}
	}

	if ( ! function_exists( 'register_post_type' ) ) {
		function register_post_type( $post_type, $args = [] ) {}
	}

	if ( ! function_exists( 'register_taxonomy' ) ) {
		function register_taxonomy( $taxonomy, $object_type, $args = [] ) {}
	}

	if ( ! function_exists( 'register_setting' ) ) {
		function register_setting( $option_group, $option_name, $args = [] ) {}
	}

	if ( ! function_exists( 'add_action_links' ) ) {
		function add_action_links() {}
	}

	if ( ! function_exists( 'get_current_user_id' ) ) {
		function get_current_user_id(): int {
			return 1;
		}
	}

	if ( ! function_exists( 'get_post_meta' ) ) {
		function get_post_meta( $post_id, $key = '', $single = false ) {
			if ( 'bpmn_xml' === $key ) {
				return '<bpmn:definitions id="Def_1"></bpmn:definitions>';
			}
			return $single ? '' : [];
		}
	}

	if ( ! function_exists( 'get_post_status' ) ) {
		function get_post_status( $post_id ): string {
			return 'publish';
		}
	}

	if ( ! function_exists( 'wp_strip_all_tags' ) ) {
		function wp_strip_all_tags( $string, $remove_breaks = false ): string {
			return strip_tags( (string) $string );
		}
	}

	if ( ! function_exists( 'is_singular' ) ) {
		function is_singular( $post_types = '' ): bool {
			return false;
		}
	}

	if ( ! function_exists( 'get_post' ) ) {
		function get_post( $post = null ) {
			return (object) [
				'ID'           => 101,
				'post_title'   => 'Test Diagram',
				'post_content' => '<bpmn:definitions></bpmn:definitions>',
			];
		}
	}

	if ( ! function_exists( 'post_password_required' ) ) {
		function post_password_required( $post = null ): bool {
			return false;
		}
	}

	if ( ! function_exists( 'register_activation_hook' ) ) {
		function register_activation_hook( $file, $callback ) {}
	}

	if ( ! function_exists( 'register_deactivation_hook' ) ) {
		function register_deactivation_hook( $file, $callback ) {}
	}
}

namespace HA_BPMN\Tests {

	class TestSuite {
		private int $passed = 0;
		private int $failed = 0;
		private array $failures = [];
		private string $rootDir;
		private string $pluginDir;

		public function __construct() {
			$this->rootDir   = dirname( __DIR__ );
			$this->pluginDir = $this->rootDir . '/plugin';
		}

		public function assert( bool $condition, string $message ): void {
			if ( $condition ) {
				$this->passed++;
				echo "  \033[32m✔\033[0m {$message}\n";
			} else {
				$this->failed++;
				$this->failures[] = $message;
				echo "  \033[31m✘\033[0m {$message}\n";
			}
		}

		public function assertSame( $expected, $actual, string $message ): void {
			$condition = ( $expected === $actual );
			if ( ! $condition ) {
				$msg = "{$message} [Expected: " . var_export( $expected, true ) . ", Got: " . var_export( $actual, true ) . "]";
			} else {
				$msg = $message;
			}
			$this->assert( $condition, $msg );
		}

		public function run(): int {
			echo "\n\033[36m===================================================\033[0m\n";
			echo "\033[36m HA-BPMN-Manager: Automated Plugin Test Suite\033[0m\n";
			echo "\033[36m===================================================\033[0m\n\n";

			$this->testVersionConsistency();
			$this->testPhpSyntax();
			$this->loadPluginCore();
			$this->testSettingsDefaults();
			$this->testSettingsSanitization();
			$this->testTutorialModuleToggle();
			$this->testAssetsSettingsProvider();
			$this->testAchievementsIntegration();
			$this->testMetaboxToolbarOutput();
			$this->testRendererShortcode();
			$this->testLocalizationIntegrity();
			$this->testUpdaterAndContentsRewriting();

			echo "\n\033[36m---------------------------------------------------\033[0m\n";
			if ( $this->failed === 0 ) {
				echo "\033[32m✔ All {$this->passed} tests passed successfully!\033[0m\n";
				return 0;
			} else {
				echo "\033[31m✘ {$this->failed} test(s) failed out of " . ( $this->passed + $this->failed ) . " total tests.\033[0m\n";
				foreach ( $this->failures as $i => $fail ) {
					echo "  " . ( $i + 1 ) . ") {$fail}\n";
				}
				return 1;
			}
		}

		private function testVersionConsistency(): void {
			echo "\033[33m[1/10] Version Consistency Across Project Files\033[0m\n";

			// Main PHP file
			$mainPhp = file_get_contents( $this->pluginDir . '/ha-bpmn-manager.php' );
			preg_match( '/\*\s*Version:\s*([0-9\.]+)/i', $mainPhp, $m1 );
			$phpHeaderVer = $m1[1] ?? '';

			preg_match( "/define\(\s*'HA_BPMN_VERSION',\s*'([^']+)'\s*\);/", $mainPhp, $m2 );
			$constantVer = $m2[1] ?? '';

			// Readme
			$readme = file_get_contents( $this->pluginDir . '/readme.txt' );
			preg_match( '/Stable tag:\s*([0-9\.]+)/i', $readme, $m3 );
			$readmeVer = $m3[1] ?? '';

			// package.json
			$packageJson = json_decode( file_get_contents( $this->rootDir . '/app/package.json' ), true );
			$npmVer = $packageJson['version'] ?? '';

			// bin/package.ps1
			$packagePs1 = file_get_contents( $this->rootDir . '/bin/package.ps1' );
			preg_match( '/\[string\]\$Version\s*=\s*"([^"]+)"/', $packagePs1, $m4 );
			$ps1Ver = $m4[1] ?? '';

			$this->assert( ! empty( $phpHeaderVer ), "Found Version in plugin header: {$phpHeaderVer}" );
			$this->assertSame( $phpHeaderVer, $constantVer, "HA_BPMN_VERSION constant matches header version ({$constantVer})" );
			$this->assertSame( $phpHeaderVer, $readmeVer, "readme.txt Stable tag matches ({$readmeVer})" );
			$this->assertSame( $phpHeaderVer, $npmVer, "app/package.json version matches ({$npmVer})" );
			$this->assertSame( $phpHeaderVer, $ps1Ver, "bin/package.ps1 default version matches ({$ps1Ver})" );

			// Root ha-bpmn-manager.php (for GitHub Contents API compatibility)
			if ( file_exists( $this->rootDir . '/ha-bpmn-manager.php' ) ) {
				$rootPhp = file_get_contents( $this->rootDir . '/ha-bpmn-manager.php' );
				preg_match( '/\*\s*Version:\s*([0-9\.]+)/i', $rootPhp, $mRoot );
				$this->assertSame( $phpHeaderVer, $mRoot[1] ?? '', "Root ha-bpmn-manager.php Version matches ({$phpHeaderVer})" );
			}

			// Root readme.txt (for GitHub Contents API compatibility)
			if ( file_exists( $this->rootDir . '/readme.txt' ) ) {
				$rootReadme = file_get_contents( $this->rootDir . '/readme.txt' );
				preg_match( '/Stable tag:\s*([0-9\.]+)/i', $rootReadme, $mRootR );
				$this->assertSame( $phpHeaderVer, $mRootR[1] ?? '', "Root readme.txt Stable tag matches ({$phpHeaderVer})" );
			}
		}

		private function testPhpSyntax(): void {
			echo "\n\033[33m[2/11] PHP Syntax Linting\033[0m\n";

			$files = glob( $this->pluginDir . '/*.php' );
			if ( file_exists( $this->rootDir . '/ha-bpmn-manager.php' ) ) {
				$files[] = $this->rootDir . '/ha-bpmn-manager.php';
			}
			$files = array_merge( $files, glob( $this->pluginDir . '/includes/*.php' ) );
			$files = array_merge( $files, glob( $this->pluginDir . '/templates/*.php' ) );

			foreach ( $files as $file ) {
				$output = [];
				$returnVar = 0;
				exec( 'php -l ' . escapeshellarg( $file ) . ' 2>&1', $output, $returnVar );
				$basename = basename( dirname( $file ) ) . '/' . basename( $file );
				$this->assertSame( 0, $returnVar, "PHP lint clean: {$basename}" );
			}
		}

		private function loadPluginCore(): void {
			// Require the plugin files now that stubs are defined
			require_once $this->pluginDir . '/ha-bpmn-manager.php';
		}

		private function testSettingsDefaults(): void {
			echo "\n\033[33m[3/10] Settings Defaults Completeness\033[0m\n";

			$defaults = \HA_BPMN\CPT::get_default_settings();

			$requiredKeys = [
				'enable_categories',
				'enable_tags',
				'module_simulation',
				'module_minimap',
				'module_linter',
				'module_properties',
				'module_quest',
				'module_templates',
				'module_handbook',
				'default_template_lang',
				'frontend_default_height',
				'frontend_allow_zoom',
				'frontend_allow_download',
				'frontend_token_sim',
				'enable_revisions',
				'cert_header_title',
				'cert_color_theme',
				'cert_id_prefix',
				'quest_editor_url',
				'delete_data_on_uninstall',
			];

			foreach ( $requiredKeys as $key ) {
				$this->assert( array_key_exists( $key, $defaults ), "Default settings contains key: '{$key}'" );
			}

			$this->assertSame( '1', $defaults['module_quest'], "module_quest defaults to enabled ('1') for backward compatibility" );
			$this->assertSame( '1', $defaults['module_simulation'], "module_simulation defaults to '1'" );
			$this->assertSame( '1', $defaults['module_minimap'], "module_minimap defaults to '1'" );
			$this->assertSame( '1', $defaults['module_linter'], "module_linter defaults to '1'" );
			$this->assertSame( '1', $defaults['module_properties'], "module_properties defaults to '1'" );
			$this->assertSame( '1', $defaults['module_templates'], "module_templates defaults to '1'" );
			$this->assertSame( '1', $defaults['module_handbook'], "module_handbook defaults to '1'" );
			$this->assertSame( '600', $defaults['frontend_default_height'], "frontend_default_height defaults to '600'" );
		}

		private function testSettingsSanitization(): void {
			echo "\n\033[33m[4/10] Settings Sanitization & Type Safety\033[0m\n";

			$cpt = \HA_BPMN\CPT::instance();

			// 1. Full input with active quest, templates, and unchecked handbook
			$input1 = [
				'module_quest'            => '1',
				'module_simulation'       => '1',
				'module_templates'        => '1',
				'module_handbook'         => '', // unchecked
				'module_minimap'          => '', // unchecked
				'frontend_default_height' => '750',
				'cert_id_prefix'          => '<b>CUSTOM-</b>',
				'quest_editor_url'        => 'https://example.com/studio/?quest=1',
			];

			$sanitized1 = $cpt->sanitize_plugin_settings( $input1 );
			$this->assertSame( '1', $sanitized1['module_quest'], "Sanitizes active module_quest to '1'" );
			$this->assertSame( '1', $sanitized1['module_simulation'], "Sanitizes module_simulation to '1'" );
			$this->assertSame( '1', $sanitized1['module_templates'], "Sanitizes active module_templates to '1'" );
			$this->assertSame( '0', $sanitized1['module_handbook'], "Sanitizes unchecked module_handbook to '0'" );
			$this->assertSame( '0', $sanitized1['module_minimap'], "Sanitizes unchecked module_minimap to '0'" );
			$this->assertSame( '750', $sanitized1['frontend_default_height'], "Preserves valid height '750'" );
			$this->assertSame( 'CUSTOM-', $sanitized1['cert_id_prefix'], "Strips HTML tags from cert_id_prefix" );
			$this->assertSame( 'https://example.com/studio/?quest=1', $sanitized1['quest_editor_url'], "Validates and preserves clean URL" );

			// 2. Out-of-bounds height clamp
			$input2 = [ 'frontend_default_height' => '50' ];
			$sanitized2 = $cpt->sanitize_plugin_settings( $input2 );
			$this->assertSame( '200', $sanitized2['frontend_default_height'], "Clamps lower height limit to 200px" );

			$input3 = [ 'frontend_default_height' => '5000' ];
			$sanitized3 = $cpt->sanitize_plugin_settings( $input3 );
			$this->assertSame( '2000', $sanitized3['frontend_default_height'], "Clamps upper height limit to 2000px" );

			// 3. Legacy option sync
			$legacy = get_option( 'bpmn_module_settings' );
			$this->assert( is_array( $legacy ) && isset( $legacy['simulation'] ), "Synchronizes legacy bpmn_module_settings option" );
		}

		private function testTutorialModuleToggle(): void {
			echo "\n\033[33m[5/10] Tutorial Module Toggle (Turn OFF and ON)\033[0m\n";

			$cpt = \HA_BPMN\CPT::instance();

			// Toggle OFF
			$disabledInput = $cpt->sanitize_plugin_settings( [
				'module_quest' => '0',
			] );
			update_option( 'ha_bpmn_settings', $disabledInput );

			$readSettings = \HA_BPMN\CPT::get_plugin_settings();
			$this->assertSame( '0', $readSettings['module_quest'], "module_quest correctly saved as '0' (disabled)" );

			// Toggle ON
			$enabledInput = $cpt->sanitize_plugin_settings( [
				'module_quest' => '1',
			] );
			update_option( 'ha_bpmn_settings', $enabledInput );

			$readSettings2 = \HA_BPMN\CPT::get_plugin_settings();
			$this->assertSame( '1', $readSettings2['module_quest'], "module_quest correctly restored to '1' (enabled)" );
		}

		private function testAssetsSettingsProvider(): void {
			echo "\n\033[33m[6/10] Assets Settings Provider Array Structure\033[0m\n";

			// 1. With quest, templates, and handbook active
			update_option( 'ha_bpmn_settings', [
				'module_quest'      => '1',
				'module_simulation' => '1',
				'module_templates'  => '1',
				'module_handbook'   => '1',
			] );
			$assetsSettings = \HA_BPMN\Assets::instance()->get_settings( true );

			$this->assert( isset( $assetsSettings['modules'] ), "Assets settings contains 'modules' array" );
			$this->assert( isset( $assetsSettings['modules']['quest'] ), "Modules array contains 'quest' boolean key" );
			$this->assert( isset( $assetsSettings['modules']['templates'] ), "Modules array contains 'templates' boolean key" );
			$this->assert( isset( $assetsSettings['modules']['handbook'] ), "Modules array contains 'handbook' boolean key" );
			$this->assertSame( true, $assetsSettings['modules']['quest'], "modules['quest'] is true when active" );
			$this->assertSame( true, $assetsSettings['modules']['templates'], "modules['templates'] is true when active" );
			$this->assertSame( true, $assetsSettings['modules']['handbook'], "modules['handbook'] is true when active" );

			// 2. With quest, templates, and handbook disabled
			update_option( 'ha_bpmn_settings', [
				'module_quest'      => '0',
				'module_simulation' => '1',
				'module_templates'  => '0',
				'module_handbook'   => '0',
			] );
			$assetsSettingsOff = \HA_BPMN\Assets::instance()->get_settings( true );
			$this->assertSame( false, $assetsSettingsOff['modules']['quest'], "modules['quest'] is false when inactive" );
			$this->assertSame( false, $assetsSettingsOff['modules']['templates'], "modules['templates'] is false when inactive" );
			$this->assertSame( false, $assetsSettingsOff['modules']['handbook'], "modules['handbook'] is false when inactive" );
		}

		private function testAchievementsIntegration(): void {
			echo "\n\033[33m[7/10] Achievements API Integration Guard\033[0m\n";

			// Reset filters
			$GLOBALS['wp_test_filters'] = [];

			// Case A: Quest DISABLED -> hooks must NOT be registered
			update_option( 'ha_bpmn_settings', [ 'module_quest' => '0' ] );
			\HA_BPMN\Achievements::init();
			$this->assert( ! has_filter( 'ha_achievement_registered_tasks' ), "ha_achievement_registered_tasks NOT registered when quest is disabled" );
			$this->assert( ! has_filter( 'ha_achievement_registered_sources' ), "ha_achievement_registered_sources NOT registered when quest is disabled" );

			// Case B: Quest ENABLED -> hooks MUST be registered
			$GLOBALS['wp_test_filters'] = [];
			update_option( 'ha_bpmn_settings', [ 'module_quest' => '1' ] );
			\HA_BPMN\Achievements::init();
			$this->assert( has_filter( 'ha_achievement_registered_tasks' ), "ha_achievement_registered_tasks registered when quest is enabled" );
			$this->assert( has_filter( 'ha_achievement_registered_sources' ), "ha_achievement_registered_sources registered when quest is enabled" );
		}

		private function testMetaboxToolbarOutput(): void {
			echo "\n\033[33m[8/10] Modeler Metabox Conditional Toolbar Output\033[0m\n";

			$cpt = \HA_BPMN\CPT::instance();
			$fakePost = (object) [
				'ID'           => 42,
				'post_title'   => 'Sample Workflow',
				'post_content' => '<bpmn:definitions></bpmn:definitions>',
			];

			// 1. When quest, templates, and handbook modules are ENABLED
			update_option( 'ha_bpmn_settings', [
				'module_quest'      => '1',
				'module_simulation' => '1',
				'module_templates'  => '1',
				'module_handbook'   => '1',
			] );
			ob_start();
			$cpt->render_metabox( $fakePost );
			$htmlEnabled = ob_get_clean();

			$this->assert( strpos( $htmlEnabled, 'ha-btn-quest' ) !== false, "Editor toolbar contains 'ha-btn-quest' when module_quest = 1" );
			$this->assert( strpos( $htmlEnabled, 'ha-quest-tag' ) !== false, "Editor toolbar contains 'ha-quest-tag' when module_quest = 1" );
			$this->assert( strpos( $htmlEnabled, 'ha-btn-templates' ) !== false, "Editor toolbar contains 'ha-btn-templates' when module_templates = 1" );
			$this->assert( strpos( $htmlEnabled, 'ha-btn-qm-handbook' ) !== false, "Editor toolbar contains 'ha-btn-qm-handbook' when module_handbook = 1" );

			// 2. When quest, templates, and handbook modules are DISABLED
			update_option( 'ha_bpmn_settings', [
				'module_quest'      => '0',
				'module_simulation' => '1',
				'module_templates'  => '0',
				'module_handbook'   => '0',
			] );
			ob_start();
			$cpt->render_metabox( $fakePost );
			$htmlDisabled = ob_get_clean();

			$this->assert( strpos( $htmlDisabled, 'ha-btn-quest' ) === false, "Editor toolbar does NOT contain 'ha-btn-quest' when module_quest = 0" );
			$this->assert( strpos( $htmlDisabled, 'ha-btn-templates' ) === false, "Editor toolbar does NOT contain 'ha-btn-templates' when module_templates = 0" );
			$this->assert( strpos( $htmlDisabled, 'ha-btn-qm-handbook' ) === false, "Editor toolbar does NOT contain 'ha-btn-qm-handbook' when module_handbook = 0" );
		}

		private function testRendererShortcode(): void {
			echo "\n\033[33m[9/10] Renderer Shortcode Parsing\033[0m\n";

			$renderer = \HA_BPMN\Renderer::instance();
			$shortcodeHtml = $renderer->render_shortcode( [
				'id'     => 42,
				'height' => '500px',
				'mode'   => 'interactive',
			] );

			$this->assert( strpos( $shortcodeHtml, 'ha-bpmn-viewer-wrap' ) !== false, "Renderer generates .ha-bpmn-viewer-wrap container" );
			$this->assert( strpos( $shortcodeHtml, 'data-diagram-id="42"' ) !== false, "Diagram ID 42 passed to container data attribute" );
			$this->assert( strpos( $shortcodeHtml, 'height: 500px' ) !== false, "Height style set to 500px" );
		}

		private function testLocalizationIntegrity(): void {
			echo "\n\033[33m[10/10] Localization Files & Translation Tables\033[0m\n";

			$l10nFiles = glob( $this->pluginDir . '/languages/*.l10n.php' );
			$this->assert( count( $l10nFiles ) >= 30, "Found " . count( $l10nFiles ) . " WordPress 6.5+ .l10n.php localization files" );

			$validArrays = 0;
			foreach ( $l10nFiles as $file ) {
				$data = require $file;
				if ( is_array( $data ) && isset( $data['messages'] ) ) {
					$validArrays++;
				}
			}
			$this->assertSame( count( $l10nFiles ), $validArrays, "All .l10n.php files return valid message arrays" );

			// Check POT template exists
			$this->assert( file_exists( $this->pluginDir . '/languages/ha-bpmn-manager.pot' ), "Base translation template ha-bpmn-manager.pot exists" );
		}

		private function testUpdaterAndContentsRewriting(): void {
			echo "\n\033[33m[11/11] Updater Configuration & GitHub Contents Rewriter\033[0m\n";

			require_once $this->pluginDir . '/includes/class-ha-bpmn-updater.php';

			$updater = \HA_BPMN\Updater::instance();
			$this->assert( $updater instanceof \HA_BPMN\Updater, "Updater singleton instance created" );
			$this->assertSame( 'alexhaio/ha-bpmn-manager', \HA_BPMN\Updater::GITHUB_REPO, "GitHub repo constant is alexhaio/ha-bpmn-manager" );

			// 1. Non-GitHub request passes through untouched
			$dummyArgs = [ 'headers' => [] ];
			$this->assertSame( false, $updater->filter_github_contents_request( false, $dummyArgs, 'https://example.com' ), "Non-GitHub URLs pass through unpreempted" );

			// 2. Already preempted request passes through untouched
			$this->assertSame( 'already_preempted', $updater->filter_github_contents_request( 'already_preempted', $dummyArgs, 'https://api.github.com/repos/alexhaio/ha-bpmn-manager/contents/ha-bpmn-manager.php' ), "Preempted request passes through" );

			// 3. GitHub contents request for root ha-bpmn-manager.php is rewritten to plugin/ha-bpmn-manager.php
			$GLOBALS['wp_test_remote_requests'] = [];
			$result = $updater->filter_github_contents_request( false, $dummyArgs, 'https://api.github.com/repos/alexhaio/ha-bpmn-manager/contents/ha-bpmn-manager.php?ref=main' );
			$this->assert( is_array( $result ), "GitHub contents request intercepted and returned response" );
			$lastReq = end( $GLOBALS['wp_test_remote_requests'] );
			$this->assert( strpos( $lastReq['url'], '/contents/plugin/ha-bpmn-manager.php' ) !== false, "URL rewritten to plugin/ha-bpmn-manager.php: {$lastReq['url']}" );

			// 4. GitHub contents request for root readme.txt is rewritten to plugin/readme.txt
			$resultReadme = $updater->filter_github_contents_request( false, $dummyArgs, 'https://api.github.com/repos/alexhaio/ha-bpmn-manager/contents/readme.txt?ref=main' );
			$this->assert( is_array( $resultReadme ), "GitHub readme contents request intercepted" );
			$lastReqReadme = end( $GLOBALS['wp_test_remote_requests'] );
			$this->assert( strpos( $lastReqReadme['url'], '/contents/plugin/readme.txt' ) !== false, "URL rewritten to plugin/readme.txt: {$lastReqReadme['url']}" );

			// 5. Plugin row meta filter adds "Nach Updates suchen" (Check for updates) link
			$meta1 = $updater->filter_plugin_row_meta( [], 'ha-bpmn-manager/ha-bpmn-manager.php' );
			$this->assert( count( $meta1 ) === 1, "Row meta filter added 1 item for root plugin path" );
			$this->assert( strpos( $meta1[0], 'puc_check_for_updates' ) !== false, "Row meta contains puc_check_for_updates link" );

			$meta2 = $updater->filter_plugin_row_meta( [], 'ha-bpmn-manager/plugin/ha-bpmn-manager.php' );
			$this->assert( count( $meta2 ) === 1, "Row meta filter added 1 item for subfolder plugin path" );
			$this->assert( strpos( $meta2[0], 'puc_check_for_updates' ) !== false, "Subfolder row meta contains puc_check_for_updates link" );

			// 6. Unrelated plugin row meta is NOT modified
			$metaUnrelated = $updater->filter_plugin_row_meta( [ 'existing_link' ], 'other-plugin/other.php' );
			$this->assertSame( [ 'existing_link' ], $metaUnrelated, "Unrelated plugin row meta is not modified" );

			// 7. No duplicate check link if already present
			$metaDupe = $updater->filter_plugin_row_meta( [ '<a href="?puc_check_for_updates=1">Check</a>' ], 'ha-bpmn-manager/ha-bpmn-manager.php' );
			$this->assert( count( $metaDupe ) === 1, "Does not duplicate update check link if already present" );

			// 8. Plugin action links filter prepends Settings link
			$actions = $updater->filter_plugin_action_links( [ 'deactivate' => 'Deactivate' ] );
			$this->assert( count( $actions ) === 2, "Action links filter prepended Settings link" );
			$this->assert( strpos( reset( $actions ), 'page=bpmnm_settings' ) !== false, "First action link points to settings page" );

			// 9. GitHub API release asset download requests set octet-stream header
			$assetArgs = $updater->filter_github_asset_download_args( [], 'https://api.github.com/repos/alexhaio/ha-bpmn-manager/releases/assets/12345' );
			$this->assert( isset( $assetArgs['headers']['Accept'] ) && 'application/octet-stream' === $assetArgs['headers']['Accept'], "Asset download requests specify application/octet-stream" );
		}
	}

	// Run test suite when invoked from CLI
	$suite = new TestSuite();
	exit( $suite->run() );
}
