<?php
/**
 * Update Checker Integration for HA-BPMN-Manager.
 *
 * Facilitates automatic one-click updates via GitHub Releases or custom servers,
 * supporting the popular YahnisElsts/plugin-update-checker library.
 *
 * @package HA_BPMN_Manager
 */

namespace HA_BPMN;

defined( 'ABSPATH' ) || exit;

/**
 * Manages plugin update checking.
 */
class Updater {

	/**
	 * GitHub repository slug (format: username/repository).
	 *
	 * @var string
	 */
	const GITHUB_REPO = 'alexhaio/ha-bpmn-manager';

	/**
	 * Instance of this class.
	 *
	 * @var Updater|null
	 */
	private static $instance = null;

	/**
	 * Returns the singleton instance.
	 *
	 * @return Updater
	 */
	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Instance of the update checker.
	 *
	 * @var object|null
	 */
	private $update_checker = null;

	/**
	 * Constructor.
	 */
	private function __construct() {
		$this->maybe_init_puc();

		// Ensure "Nach Updates suchen" (Check for updates) is always present in plugins.php row meta
		add_filter( 'plugin_row_meta', [ $this, 'filter_plugin_row_meta' ], 20, 2 );

		// Add "Settings" link to plugin action links
		$base_file = plugin_basename( HA_BPMN_FILE );
		add_filter( 'plugin_action_links_' . $base_file, [ $this, 'filter_plugin_action_links' ] );

		$alt_file = ( false !== strpos( $base_file, 'plugin/' ) )
			? str_replace( 'plugin/', '', $base_file )
			: ( dirname( $base_file ) . '/plugin/' . basename( $base_file ) );

		if ( $alt_file !== $base_file ) {
			add_filter( 'plugin_action_links_' . $alt_file, [ $this, 'filter_plugin_action_links' ] );
		}
	}

	/**
	 * Initializes Plugin Update Checker if present or available.
	 */
	public function maybe_init_puc() {
		if ( null !== $this->update_checker ) {
			return;
		}

		// If Plugin Update Checker is bundled in vendor/
		$puc_path = HA_BPMN_PATH . 'vendor/plugin-update-checker/plugin-update-checker.php';
		if ( ! file_exists( $puc_path ) ) {
			$puc_path = HA_BPMN_PATH . 'vendor/yahnis-elsts/plugin-update-checker/plugin-update-checker.php';
		}

		if ( file_exists( $puc_path ) ) {
			require_once $puc_path;
		}

		if ( class_exists( '\YahnisElsts\PluginUpdateChecker\v5\PucFactory' ) ) {
			$update_checker = \YahnisElsts\PluginUpdateChecker\v5\PucFactory::buildUpdateChecker(
				'https://github.com/' . self::GITHUB_REPO . '/',
				HA_BPMN_FILE,
				'ha-bpmn-manager'
			);

			$update_checker->setBranch( 'main' );

			// Support both root ha-bpmn-manager.php and plugin/ha-bpmn-manager.php
			$base_file = plugin_basename( HA_BPMN_FILE );
			$alt_file  = ( false !== strpos( $base_file, 'plugin/' ) )
				? str_replace( 'plugin/', '', $base_file )
				: ( dirname( $base_file ) . '/plugin/' . basename( $base_file ) );

			$update_checker->muPluginFile = $alt_file;

			// Enable release assets so WordPress downloads the compiled ZIP package (e.g. ha-bpmn-manager.zip).
			$vcs_api = $update_checker->getVcsApi();
			if ( is_object( $vcs_api ) && method_exists( $vcs_api, 'enableReleaseAssets' ) ) {
				$vcs_api->enableReleaseAssets( '/^ha-bpmn-manager.*\.zip$/i' );
			}

			// Hook into pre_http_request to map repository root contents requests to plugin/ subfolder.
			add_filter( 'pre_http_request', [ $this, 'filter_github_contents_request' ], 10, 3 );

			// Ensure GitHub API release assets request octet-stream
			add_filter( 'http_request_args', [ $this, 'filter_github_asset_download_args' ], 10, 2 );

			// Strip Authorization header on external storage redirects (AWS S3 / Azure)
			$strip_redirect_auth = static function( &$location, &$headers = null ) {
				if ( is_string( $location ) && false === strpos( $location, 'api.github.com' ) && false === strpos( $location, 'github.com' ) ) {
					if ( is_array( $headers ) && isset( $headers['Authorization'] ) ) {
						unset( $headers['Authorization'] );
					}
				}
			};
			add_action( 'requests.before_redirect', $strip_redirect_auth, 10, 2 );
			add_action( 'requests-requests.before_redirect', $strip_redirect_auth, 10, 2 );

			$token = defined( 'HA_GITHUB_UPDATE_TOKEN' ) ? HA_GITHUB_UPDATE_TOKEN : '';
			if ( empty( $token ) && defined( 'GITHUB_ACCESS_TOKEN' ) ) {
				$token = GITHUB_ACCESS_TOKEN;
			}
			$token = apply_filters( 'ha_github_update_token', $token, 'ha-bpmn-manager' );

			if ( ! empty( $token ) ) {
				$update_checker->setAuthentication( $token );
			}

			$this->update_checker = $update_checker;
		}
	}

	/**
	 * Returns the update checker instance.
	 *
	 * @return object|null
	 */
	public function get_update_checker() {
		return $this->update_checker;
	}

	/**
	 * Filters HTTP request arguments when downloading release assets from GitHub API.
	 *
	 * @param array  $args Request arguments.
	 * @param string $url  Request URL.
	 * @return array
	 */
	public function filter_github_asset_download_args( $args, $url = '' ) {
		if ( is_string( $url ) && false !== strpos( $url, 'api.github.com' ) && false !== strpos( $url, '/releases/assets/' ) ) {
			if ( ! isset( $args['headers'] ) || ! is_array( $args['headers'] ) ) {
				$args['headers'] = [];
			}
			$args['headers']['Accept'] = 'application/octet-stream';
		}
		return $args;
	}

	/**
	 * Ensures the "Nach Updates suchen" (Check for updates) link is always present in plugins.php row meta.
	 *
	 * @param array  $plugin_meta An array of the plugin's metadata.
	 * @param string $plugin_file Path to the plugin file relative to the plugins directory.
	 * @return array
	 */
	public function filter_plugin_row_meta( $plugin_meta, $plugin_file ) {
		$base_file = plugin_basename( HA_BPMN_FILE );
		$alt_file  = ( false !== strpos( $base_file, 'plugin/' ) )
			? str_replace( 'plugin/', '', $base_file )
			: ( dirname( $base_file ) . '/plugin/' . basename( $base_file ) );

		$targets = array_unique( [
			$base_file,
			$alt_file,
			'ha-bpmn-manager/ha-bpmn-manager.php',
			'ha-bpmn-manager/plugin/ha-bpmn-manager.php',
		] );

		if ( in_array( $plugin_file, $targets, true ) ) {
			if ( ! is_array( $plugin_meta ) ) {
				$plugin_meta = [];
			}

			// Check if already added by PUC
			$has_check_link = false;
			foreach ( $plugin_meta as $item ) {
				if ( is_string( $item ) && false !== strpos( $item, 'puc_check_for_updates' ) ) {
					$has_check_link = true;
					break;
				}
			}

			if ( ! $has_check_link && current_user_can( 'update_plugins' ) ) {
				$check_url = wp_nonce_url(
					add_query_arg(
						[
							'puc_check_for_updates' => 1,
							'puc_slug'              => 'ha-bpmn-manager',
						],
						self_admin_url( 'plugins.php' )
					),
					'puc_check_for_updates'
				);

				$link_text = __( 'Check for updates', 'plugin-update-checker' );
				if ( 'Check for updates' === $link_text ) {
					$link_text = __( 'Nach Updates suchen', 'ha-bpmn-manager' );
				}

				$plugin_meta[] = sprintf(
					'<a href="%s">%s</a>',
					esc_url( $check_url ),
					esc_html( $link_text )
				);
			}
		}

		return $plugin_meta;
	}

	/**
	 * Adds settings link to plugin action links on plugins.php.
	 *
	 * @param array $actions Existing action links.
	 * @return array
	 */
	public function filter_plugin_action_links( $actions ) {
		if ( ! is_array( $actions ) ) {
			$actions = [];
		}

		$settings_url  = admin_url( 'edit.php?post_type=' . HA_BPMN_POST_TYPE . '&page=' . HA_BPMN_POST_TYPE . '_settings' );
		$settings_link = sprintf(
			'<a href="%s">%s</a>',
			esc_url( $settings_url ),
			esc_html__( 'Settings', 'ha-bpmn-manager' )
		);
		array_unshift( $actions, $settings_link );

		return $actions;
	}

	/**
	 * Rewrites GitHub Contents API requests when checking for plugin headers or readme.
	 *
	 * Because the plugin files in the Git repository are organized under the plugin/ directory,
	 * requests from PUC looking for ha-bpmn-manager.php or readme.txt at the repository root
	 * are routed to plugin/ha-bpmn-manager.php and plugin/readme.txt.
	 *
	 * @param false|array|\WP_Error $preempt     Whether to preempt an HTTP request's return value.
	 * @param array                $parsed_args HTTP request arguments.
	 * @param string               $url         The request URL.
	 * @return false|array|\WP_Error
	 */
	public function filter_github_contents_request( $preempt, $parsed_args, $url ) {
		if ( false !== $preempt || ! is_string( $url ) ) {
			return $preempt;
		}

		$repo_target = 'api.github.com/repos/' . self::GITHUB_REPO . '/contents/';
		if ( false === strpos( $url, $repo_target ) ) {
			return false;
		}

		$patterns = [
			'/contents/ha-bpmn-manager.php' => '/contents/plugin/ha-bpmn-manager.php',
			'/contents/readme.txt'          => '/contents/plugin/readme.txt',
		];

		foreach ( $patterns as $search => $replace ) {
			if ( false !== strpos( $url, $search ) ) {
				$new_url = str_replace( $search, $replace, $url );
				remove_filter( 'pre_http_request', [ $this, 'filter_github_contents_request' ], 10 );
				$response = wp_remote_get( $new_url, $parsed_args );
				add_filter( 'pre_http_request', [ $this, 'filter_github_contents_request' ], 10, 3 );
				return $response;
			}
		}

		return false;
	}
}

Updater::instance();
