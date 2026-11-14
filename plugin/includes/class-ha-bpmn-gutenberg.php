<?php
/**
 * Gutenberg Block Integration for HA-BPMN-Manager.
 *
 * @package HA_BPMN_Manager
 */

namespace HA_BPMN;

defined( 'ABSPATH' ) || exit;

/**
 * Registers and manages the native Gutenberg block for embedding BPMN diagrams.
 */
class Gutenberg {

	/**
	 * Instance of this class.
	 *
	 * @var Gutenberg|null
	 */
	private static $instance = null;

	/**
	 * Returns the singleton instance.
	 *
	 * @return Gutenberg
	 */
	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Constructor. Registers hooks.
	 */
	private function __construct() {
		add_action( 'init', [ $this, 'register_block' ] );
	}

	/**
	 * Registers the block type and its editor script.
	 */
	public function register_block() {
		if ( ! function_exists( 'register_block_type' ) ) {
			return;
		}

		$script_rel  = 'assets/js/blocks/diagram-block.js';
		$script_path = HA_BPMN_PATH . $script_rel;
		$script_url  = HA_BPMN_URL . $script_rel;
		$version     = Assets::get_asset_version( $script_rel );

		wp_register_script(
			'ha-bpmn-gutenberg-block',
			$script_url,
			[ 'wp-blocks', 'wp-element', 'wp-components', 'wp-block-editor', 'wp-api-fetch' ],
			$version,
			true
		);

		// Pass localized data to block editor
		wp_localize_script(
			'ha-bpmn-gutenberg-block',
			'haBpmnBlockData',
			[
				'restUrl'   => rest_url( 'ha-bpmn/v1/diagrams' ),
				'restNonce' => wp_create_nonce( 'wp_rest' ),
				'i18n'      => [
					'title'          => __( 'BPMN Diagram', 'ha-bpmn-manager' ),
					'description'    => __( 'Embed an interactive or static BPMN 2.0 process diagram with simulation and step tracking.', 'ha-bpmn-manager' ),
					'selectDiagram'  => __( 'Select BPMN Diagram', 'ha-bpmn-manager' ),
					'choosePrompt'   => __( '-- Choose a diagram --', 'ha-bpmn-manager' ),
					'displayOptions' => __( 'Display Settings', 'ha-bpmn-manager' ),
					'height'         => __( 'Height (e.g. 600px)', 'ha-bpmn-manager' ),
					'mode'           => __( 'Display Mode', 'ha-bpmn-manager' ),
					'modeInteractive'=> __( 'Interactive (Full Modeler with Zoom & Simulation)', 'ha-bpmn-manager' ),
					'modeStatic'     => __( 'Static SVG (Zero-JS, Ultra-fast)', 'ha-bpmn-manager' ),
					'fullscreen'     => __( 'Enable Fullscreen Button', 'ha-bpmn-manager' ),
					'search'         => __( 'Enable Live Search', 'ha-bpmn-manager' ),
					'drawer'         => __( 'Enable Task Details Drawer', 'ha-bpmn-manager' ),
					'trackingHeader' => __( 'Process Step Tracking', 'ha-bpmn-manager' ),
					'activeSteps'       => __( 'Active Step IDs (comma-separated)', 'ha-bpmn-manager' ),
					'completedSteps'    => __( 'Completed Step IDs (comma-separated)', 'ha-bpmn-manager' ),
					'activeStepsHelp'   => __( 'e.g. Task_Review,Task_Approval', 'ha-bpmn-manager' ),
					'completedHelp'     => __( 'e.g. StartEvent_1,Task_CreateRequest', 'ha-bpmn-manager' ),
					'loadingDiagrams'   => __( 'Loading BPMN diagrams...', 'ha-bpmn-manager' ),
					'badgeStatic'       => __( 'Static (SVG)', 'ha-bpmn-manager' ),
					'badgeInteractive'  => __( 'Interactive', 'ha-bpmn-manager' ),
					'heightPrefix'      => __( 'Height', 'ha-bpmn-manager' ),
					'diagramIdPrefix'   => __( 'Diagram ID', 'ha-bpmn-manager' ),
					'shortcodeLabel'    => __( 'Shortcode', 'ha-bpmn-manager' ),
					'activePrefix'      => __( 'Active', 'ha-bpmn-manager' ),
					'previewNote'       => __( 'The interactive diagram view is rendered on the frontend.', 'ha-bpmn-manager' ),
					'noDiagrams'        => __( 'No BPMN diagrams found. Please create one first.', 'ha-bpmn-manager' ),
				],
			]
		);

		register_block_type(
			'ha-bpmn/viewer',
			[
				'editor_script'   => 'ha-bpmn-gutenberg-block',
				'render_callback' => [ Renderer::instance(), 'render_block' ],
				'attributes'      => [
					'diagramId'      => [
						'type'    => 'number',
						'default' => 0,
					],
					'height'         => [
						'type'    => 'string',
						'default' => '600px',
					],
					'fullscreen'     => [
						'type'    => 'boolean',
						'default' => true,
					],
					'mode'           => [
						'type'    => 'string',
						'default' => 'interactive',
					],
					'search'         => [
						'type'    => 'boolean',
						'default' => true,
					],
					'drawer'         => [
						'type'    => 'boolean',
						'default' => true,
					],
					'activeSteps'    => [
						'type'    => 'string',
						'default' => '',
					],
					'completedSteps' => [
						'type'    => 'string',
						'default' => '',
					],
				],
			]
		);
	}
}
