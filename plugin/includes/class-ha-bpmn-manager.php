<?php
/**
 * Main Plugin Orchestrator for HA-BPMN-Manager.
 *
 * @package HA_BPMN_Manager
 */

namespace HA_BPMN;

defined( 'ABSPATH' ) || exit;

/**
 * Main plugin singleton orchestrating all modules and components.
 */
class Manager {

	/**
	 * Instance of this class.
	 *
	 * @var Manager|null
	 */
	private static $instance = null;

	/**
	 * Returns the singleton instance.
	 *
	 * @return Manager
	 */
	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Constructor. Initializes modules and core hooks.
	 */
	private function __construct() {
		// Internationalization
		add_action( 'init', [ $this, 'load_textdomain' ] );

		// REST API Routes
		add_action( 'rest_api_init', [ '\HA_BPMN\Rest', 'register_routes' ] );

		// Initialize sub-controllers
		Assets::instance();
		CPT::instance();
		Renderer::instance();
		Gutenberg::instance();
		Updater::instance();
		Achievements::init();
	}

	/**
	 * Load plugin textdomain for i18n.
	 */
	public function load_textdomain() {
		$rel_path = dirname( plugin_basename( HA_BPMN_FILE ) ) . '/languages';
		if ( defined( 'WP_PLUGIN_DIR' ) && ! is_dir( WP_PLUGIN_DIR . '/' . $rel_path ) && is_dir( HA_BPMN_PATH . 'languages' ) ) {
			$rel_path = dirname( plugin_basename( HA_BPMN_PATH . 'ha-bpmn-manager.php' ) ) . '/languages';
		}

		load_plugin_textdomain(
			'ha-bpmn-manager',
			false,
			$rel_path
		);
	}
}
