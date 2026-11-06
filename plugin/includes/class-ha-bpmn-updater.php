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
}

Updater::instance();
