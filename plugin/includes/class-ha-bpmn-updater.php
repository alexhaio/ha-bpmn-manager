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
	 * Constructor.
	 */
	private function __construct() {
		add_action( 'init', [ $this, 'maybe_init_puc' ] );
	}

	/**
	 * Initializes Plugin Update Checker if present or available.
	 */
	public function maybe_init_puc() {
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

			// Enable release assets so WordPress downloads the compiled ZIP package (e.g. ha-bpmn-manager.zip).
			$vcs_api = $update_checker->getVcsApi();
			if ( is_object( $vcs_api ) && method_exists( $vcs_api, 'enableReleaseAssets' ) ) {
				$vcs_api->enableReleaseAssets( '/^ha-bpmn-manager.*\.zip$/i' );
			}

			// Hook into pre_http_request to map repository root contents requests to plugin/ subfolder.
			add_filter( 'pre_http_request', [ $this, 'filter_github_contents_request' ], 10, 3 );

			$token = defined( 'HA_GITHUB_UPDATE_TOKEN' ) ? HA_GITHUB_UPDATE_TOKEN : '';
			if ( empty( $token ) && defined( 'GITHUB_ACCESS_TOKEN' ) ) {
				$token = GITHUB_ACCESS_TOKEN;
			}
			$token = apply_filters( 'ha_github_update_token', $token, 'ha-bpmn-manager' );

			if ( ! empty( $token ) ) {
				$update_checker->setAuthentication( $token );
			}
		}
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
