<?php
/**
 * Asset management class for HA-BPMN-Manager.
 *
 * @package HA_BPMN_Manager
 */

namespace HA_BPMN;

defined( 'ABSPATH' ) || exit;

/**
 * Handles enqueuing of CSS stylesheets and JavaScript bundles.
 */
class Assets {

	/**
	 * Instance of this class.
	 *
	 * @var Assets|null
	 */
	private static $instance = null;

	/**
	 * Whether shared assets have already been registered in this request.
	 *
	 * @var bool
	 */
	private $assets_registered = false;

	/**
	 * Returns the singleton instance.
	 *
	 * @return Assets
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
		add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_frontend_assets' ] );
		add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_admin_assets' ] );
	}

	/**
	 * Retrieve consolidated BPMN module settings and user locale.
	 *
	 * @param bool $is_admin Whether the settings are for an admin view.
	 * @return array
	 */
	public function get_settings( $is_admin = false ) {
		$user_locale = get_user_locale();
		$plugin_settings = CPT::get_plugin_settings();

		// Determine preferred template and UI language from backend setting or WP user locale
		$has_custom_default = ( ! empty( $plugin_settings['default_template_lang'] ) && 'auto' !== $plugin_settings['default_template_lang'] );
		$clean_locale       = strtolower( str_replace( '-', '_', (string) $user_locale ) );
		if ( false !== strpos( $clean_locale, 'tw' ) || false !== strpos( $clean_locale, 'hk' ) || false !== strpos( $clean_locale, 'hant' ) ) {
			$locale_lang = 'zh_TW';
		} else {
			$locale_lang = substr( $clean_locale, 0, 2 );
		}
		$template_lang      = $has_custom_default ? $plugin_settings['default_template_lang'] : $locale_lang;
		$language           = $has_custom_default ? $plugin_settings['default_template_lang'] : ( ( 0 === strpos( $clean_locale, 'de' ) ) ? 'de' : 'en' );
		$current_user_name  = '';
		if ( function_exists( 'is_user_logged_in' ) && is_user_logged_in() && function_exists( 'wp_get_current_user' ) ) {
			$user_obj          = wp_get_current_user();
			$current_user_name = ! empty( $user_obj->display_name ) ? (string) $user_obj->display_name : '';
		}

		return [
			'admin'           => (bool) $is_admin,
			'language'        => $language,
			'siteLanguage'    => $template_lang,
			'defaultLanguage' => ! empty( $plugin_settings['default_template_lang'] ) ? $plugin_settings['default_template_lang'] : 'auto',
			'currentUser'     => $current_user_name,
			'rest_nonce'      => wp_create_nonce( 'wp_rest' ),
			'rest_base'    => rest_url( 'ha-bpmn/v1/' ),
			'modules'      => [
				'simulation' => ! empty( $plugin_settings['module_simulation'] ),
				'minimap'    => ! empty( $plugin_settings['module_minimap'] ),
				'linter'     => ! empty( $plugin_settings['module_linter'] ),
				'properties' => ! empty( $plugin_settings['module_properties'] ),
				'quest'      => ! empty( $plugin_settings['module_quest'] ),
				'templates'  => ! empty( $plugin_settings['module_templates'] ),
				'handbook'   => ! empty( $plugin_settings['module_handbook'] ),
			],
			'frontend'     => [
				'defaultHeight' => (int) $plugin_settings['frontend_default_height'],
				'allowZoom'     => ! empty( $plugin_settings['frontend_allow_zoom'] ),
				'allowDownload' => ! empty( $plugin_settings['frontend_allow_download'] ),
				'tokenSim'      => ! empty( $plugin_settings['frontend_token_sim'] ),
			],
			'certificate'  => [
				'headerTitle'       => ! empty( $plugin_settings['cert_header_title'] ) ? $plugin_settings['cert_header_title'] : '',
				'authorityText'     => ! empty( $plugin_settings['cert_authority_text'] ) ? $plugin_settings['cert_authority_text'] : 'HA-BPMN Guild Governance',
				'titleMode'         => ! empty( $plugin_settings['cert_title_mode'] ) ? $plugin_settings['cert_title_mode'] : 'dynamic',
				'customTitle'       => ! empty( $plugin_settings['cert_custom_title'] ) ? $plugin_settings['cert_custom_title'] : '',
				'customSubtitle'    => ! empty( $plugin_settings['cert_custom_subtitle'] ) ? $plugin_settings['cert_custom_subtitle'] : '',
				'introText'         => ! empty( $plugin_settings['cert_intro_text'] ) ? $plugin_settings['cert_intro_text'] : '',
				'customDedication'  => ! empty( $plugin_settings['cert_custom_dedication'] ) ? $plugin_settings['cert_custom_dedication'] : '',
				'showBadges'        => '0' !== ( $plugin_settings['cert_show_badges'] ?? '1' ),
				'colorTheme'        => ! empty( $plugin_settings['cert_color_theme'] ) ? $plugin_settings['cert_color_theme'] : 'honor_adaptive',
				'customColor'       => ! empty( $plugin_settings['cert_custom_color'] ) ? $plugin_settings['cert_custom_color'] : '#bf953f',
				'sealImage'         => ! empty( $plugin_settings['cert_seal_image'] ) ? esc_url_raw( $plugin_settings['cert_seal_image'] ) : '',
				'sealText'          => ! empty( $plugin_settings['cert_seal_text'] ) ? $plugin_settings['cert_seal_text'] : '',
				'signatureMode'     => ! empty( $plugin_settings['cert_signature_mode'] ) ? $plugin_settings['cert_signature_mode'] : 'single',
				'signatureImage'    => ! empty( $plugin_settings['cert_signature_image'] ) ? esc_url_raw( $plugin_settings['cert_signature_image'] ) : '',
				'signerName'        => ! empty( $plugin_settings['cert_signer_name'] ) ? $plugin_settings['cert_signer_name'] : '',
				'signerTitle'       => ! empty( $plugin_settings['cert_signer_title'] ) ? $plugin_settings['cert_signer_title'] : '',
				'signatureImage2'   => ! empty( $plugin_settings['cert_signature_image_2'] ) ? esc_url_raw( $plugin_settings['cert_signature_image_2'] ) : '',
				'signerName2'       => ! empty( $plugin_settings['cert_signer_name_2'] ) ? $plugin_settings['cert_signer_name_2'] : '',
				'signerTitle2'      => ! empty( $plugin_settings['cert_signer_title_2'] ) ? $plugin_settings['cert_signer_title_2'] : '',
				'watermarkImage'    => ! empty( $plugin_settings['cert_watermark_image'] ) ? esc_url_raw( $plugin_settings['cert_watermark_image'] ) : '',
				'idPrefix'          => ! empty( $plugin_settings['cert_id_prefix'] ) ? $plugin_settings['cert_id_prefix'] : 'HA-BPMN-',
			],
			'achievementApi' => [
				'available' => class_exists( '\HA_Achievement\API' ),
				'restUrl'   => esc_url_raw( rest_url( 'ha-achievement/v1/' ) ),
				'nonce'     => wp_create_nonce( 'wp_rest' ),
				'userId'    => get_current_user_id(),
			],
			'i18n'         => [
				'zoomIn'             => __( 'Zoom in', 'ha-bpmn-manager' ),
				'zoomOut'            => __( 'Zoom out', 'ha-bpmn-manager' ),
				'fitViewport'        => __( 'Fit to screen', 'ha-bpmn-manager' ),
				'downloadSvg'        => __( 'Download SVG', 'ha-bpmn-manager' ),
				'downloadPng'        => __( 'Download PNG', 'ha-bpmn-manager' ),
				'downloadBpmn'       => __( 'Download BPMN', 'ha-bpmn-manager' ),
				'toggleFullscreen'   => __( 'Fullscreen', 'ha-bpmn-manager' ),
				'unsavedWarning'     => __( 'You have unsaved changes in your BPMN diagram. Do you really want to leave?', 'ha-bpmn-manager' ),
				'dropFilePrompt'     => __( 'Drop BPMN file here to import', 'ha-bpmn-manager' ),
				'dropFileSubtitle'   => __( 'Release to import .bpmn or .xml directly into diagram', 'ha-bpmn-manager' ),
				'import'             => __( 'Import', 'ha-bpmn-manager' ),
				'importError'        => __( 'Failed to import BPMN diagram.', 'ha-bpmn-manager' ),
				'importSuccess'      => __( 'Diagram imported successfully.', 'ha-bpmn-manager' ),
				'invalidXml'         => __( 'The selected file is not a valid BPMN 2.0 XML document.', 'ha-bpmn-manager' ),
				'invalidFileType'    => __( 'Invalid file format. Please upload a .bpmn or .xml file.', 'ha-bpmn-manager' ),
				'fileReadError'      => __( 'Error reading the file.', 'ha-bpmn-manager' ),
				'autoLayout'         => __( 'Auto-Layout', 'ha-bpmn-manager' ),
				'autoLayoutError'    => __( 'Error during automatic layout calculation.', 'ha-bpmn-manager' ),
				'templates'          => __( 'Templates', 'ha-bpmn-manager' ),
				'selectTemplate'     => __( 'Select Process Template', 'ha-bpmn-manager' ),
				'selectTemplateIntro'=> __( 'Choose a ready-made template as a starting point for your BPMN 2.0 process:', 'ha-bpmn-manager' ),
				'useTemplate'        => __( 'Use template', 'ha-bpmn-manager' ),
				'unsavedConfirm'     => __( 'Unsaved changes will be lost. Do you really want to proceed?', 'ha-bpmn-manager' ),
				'history'            => __( 'Revision History', 'ha-bpmn-manager' ),
				'loadingRevisions'   => __( 'Loading revisions...', 'ha-bpmn-manager' ),
				'restore'            => __( 'Restore', 'ha-bpmn-manager' ),
				'compare'            => __( 'Compare', 'ha-bpmn-manager' ),
				'added'              => __( 'Added', 'ha-bpmn-manager' ),
				'modified'           => __( 'Modified', 'ha-bpmn-manager' ),
				'deleted'            => __( 'Deleted', 'ha-bpmn-manager' ),
				'noChanges'          => __( 'No structural changes detected between these versions.', 'ha-bpmn-manager' ),
				'restoreConfirm'     => __( 'Do you really want to restore this revision? Current unsaved changes will be overwritten.', 'ha-bpmn-manager' ),
				'qmHandbook'         => __( 'QM Handbook', 'ha-bpmn-manager' ),
				'processHandbook'    => __( 'Process Documentation & QM Handbook', 'ha-bpmn-manager' ),
				'processSteps'       => __( 'Process Steps Overview', 'ha-bpmn-manager' ),
				'stepNumber'         => __( 'Step', 'ha-bpmn-manager' ),
				'stepName'           => __( 'Name / Action', 'ha-bpmn-manager' ),
				'printHandbook'      => __( 'Print Handbook', 'ha-bpmn-manager' ),
				'search'             => __( 'Search', 'ha-bpmn-manager' ),
				'searchPlaceholder'  => __( 'Search diagram...', 'ha-bpmn-manager' ),
				'noMatches'          => __( 'No matches found', 'ha-bpmn-manager' ),
				'previousMatch'      => __( 'Previous match', 'ha-bpmn-manager' ),
				'nextMatch'          => __( 'Next match', 'ha-bpmn-manager' ),
				'closeSearch'        => __( 'Close search', 'ha-bpmn-manager' ),
				'taskDetails'        => __( 'Process Step Details', 'ha-bpmn-manager' ),
				'stepType'           => __( 'Step Type', 'ha-bpmn-manager' ),
				'assignedRole'       => __( 'Assigned Role / Lane', 'ha-bpmn-manager' ),
				'documentation'      => __( 'QM Instructions & Documentation', 'ha-bpmn-manager' ),
				'noDocumentation'    => __( 'No additional instructions provided for this step.', 'ha-bpmn-manager' ),
				'technicalId'        => __( 'Technical ID', 'ha-bpmn-manager' ),
				'close'              => __( 'Close', 'ha-bpmn-manager' ),
				'properties'         => __( 'Properties', 'ha-bpmn-manager' ),
				// Color Presets
				'colorStandard'      => __( 'Standard / Success (Green)', 'ha-bpmn-manager' ),
				'colorError'         => __( 'Error / Escalation (Red)', 'ha-bpmn-manager' ),
				'colorReview'        => __( 'Review / Approval (Yellow)', 'ha-bpmn-manager' ),
				'colorSystem'        => __( 'System / Information (Blue)', 'ha-bpmn-manager' ),
				'colorReset'         => __( 'Reset Color', 'ha-bpmn-manager' ),
				'colorSelectPrompt'  => __( 'Please select at least one element in the diagram to assign a color.', 'ha-bpmn-manager' ),
				// Revisions
				'savedVersions'      => __( 'Saved Versions', 'ha-bpmn-manager' ),
				'diffAnalysis'       => __( 'Diff Analysis vs Current Version', 'ha-bpmn-manager' ),
				'selectRevisionHelp' => __( 'Select a revision on the left to semantically analyze changes.', 'ha-bpmn-manager' ),
				'noXmlInRevision'    => __( 'No BPMN definition is stored in this revision.', 'ha-bpmn-manager' ),
				'elementAdded'       => __( 'Element added:', 'ha-bpmn-manager' ),
				'elementChanged'     => __( 'Element content changed:', 'ha-bpmn-manager' ),
				'layoutChanged'      => __( 'Position/layout changed:', 'ha-bpmn-manager' ),
				'elementDeleted'     => __( 'Element deleted:', 'ha-bpmn-manager' ),
				'identicalRevision'  => __( 'This revision is identical to the current editor state.', 'ha-bpmn-manager' ),
				'restoreError'       => __( 'Error restoring revision:', 'ha-bpmn-manager' ),
				// QM Handbook
				'allowPopups'        => __( 'Please allow popups to open the QM Handbook.', 'ha-bpmn-manager' ),
				'qmHandbookTitle'    => __( 'Quality Management Handbook', 'ha-bpmn-manager' ),
				'qmHandbookSubtitle' => __( 'Standard process documentation compliant with BPMN 2.0 specification', 'ha-bpmn-manager' ),
				'dateLabel'          => __( 'Date:', 'ha-bpmn-manager' ),
				'statusLabel'        => __( 'Status:', 'ha-bpmn-manager' ),
				'statusValue'        => __( 'Approved / Production', 'ha-bpmn-manager' ),
				'overviewHeading'    => __( '1. Process Overview & Flow Diagram', 'ha-bpmn-manager' ),
				'stepsHeading'       => __( '2. Process Steps & Operating Procedures', 'ha-bpmn-manager' ),
				'colStep'            => __( 'Process Step', 'ha-bpmn-manager' ),
				'colType'            => __( 'Type', 'ha-bpmn-manager' ),
				'colRole'            => __( 'Responsible', 'ha-bpmn-manager' ),
				'colDoc'             => __( 'Operating Procedure & Description', 'ha-bpmn-manager' ),
				'colNext'            => __( 'Next Step', 'ha-bpmn-manager' ),
				'noDoc'              => __( 'No special operating procedure', 'ha-bpmn-manager' ),
				'noSvg'              => __( 'No SVG graphic available.', 'ha-bpmn-manager' ),
				'printPdf'           => __( 'Print / Save as PDF', 'ha-bpmn-manager' ),
				// Task Drawer
				'unnamedActivity'    => __( 'Unnamed Activity', 'ha-bpmn-manager' ),
				'activity'           => __( 'Activity', 'ha-bpmn-manager' ),
				'task'               => __( 'Task', 'ha-bpmn-manager' ),
				'userTask'           => __( 'User Task', 'ha-bpmn-manager' ),
				'serviceTask'        => __( 'Service Task', 'ha-bpmn-manager' ),
				'sendTask'           => __( 'Send Task', 'ha-bpmn-manager' ),
				'receiveTask'        => __( 'Receive Task', 'ha-bpmn-manager' ),
				'manualTask'         => __( 'Manual Task', 'ha-bpmn-manager' ),
				'businessRuleTask'   => __( 'Business Rule Task', 'ha-bpmn-manager' ),
				'scriptTask'         => __( 'Script Task', 'ha-bpmn-manager' ),
				'subProcess'         => __( 'Sub-Process', 'ha-bpmn-manager' ),
				'callActivity'       => __( 'Call Activity', 'ha-bpmn-manager' ),
				// Handbook element type labels & Step Tracker
				'startEvent'         => __( 'Start Event', 'ha-bpmn-manager' ),
				'endEvent'           => __( 'End Event', 'ha-bpmn-manager' ),
				'intermediateEvent'  => __( 'Intermediate Event', 'ha-bpmn-manager' ),
				'exclusiveGateway'   => __( 'Exclusive Gateway (XOR)', 'ha-bpmn-manager' ),
				'parallelGateway'    => __( 'Parallel Gateway (AND)', 'ha-bpmn-manager' ),
				'inclusiveGateway'   => __( 'Inclusive Gateway (OR)', 'ha-bpmn-manager' ),
				'unnamedStep'        => __( '(Unnamed)', 'ha-bpmn-manager' ),
				'stepCompleted'      => __( 'Completed', 'ha-bpmn-manager' ),
				'stepActive'         => __( 'In Progress', 'ha-bpmn-manager' ),
			],
		];
	}

	/**
	 * Retrieve the standardized asset version string.
	 *
	 * Uses HA_BPMN_VERSION as the single source of truth across all scripts and styles.
	 * If SCRIPT_DEBUG is active, appends the file modification timestamp for real-time development cache-busting.
	 *
	 * @param string $rel_path Optional relative file path to check filemtime in SCRIPT_DEBUG mode.
	 * @return string Asset version string.
	 */
	public static function get_asset_version( $rel_path = '' ) {
		if ( defined( 'SCRIPT_DEBUG' ) && SCRIPT_DEBUG && ! empty( $rel_path ) && file_exists( HA_BPMN_PATH . $rel_path ) ) {
			return HA_BPMN_VERSION . '.' . filemtime( HA_BPMN_PATH . $rel_path );
		}
		return HA_BPMN_VERSION;
	}

	/**
	 * Register and enqueue shared core assets (JS bundle, CSS).
	 *
	 * @param bool $is_admin Whether in admin context.
	 */
	private function register_shared_assets( $is_admin = false ) {
		if ( $this->assets_registered ) {
			return;
		}
		$this->assets_registered = true;

		// Bundle JS
		$js_file = 'assets/js/bpmn-bundle.min.js';
		$js_ver  = self::get_asset_version( $js_file );

		wp_register_script(
			'ha-bpmn-bundle',
			HA_BPMN_URL . $js_file,
			[],
			$js_ver,
			true
		);

		// Pass settings via standard wp_localize_script
		wp_localize_script(
			'ha-bpmn-bundle',
			'bpmnSettings',
			$this->get_settings( $is_admin )
		);

		// Core Bundle CSS (or individual CSS files if bundle not built yet)
		$bundle_css = 'assets/css/bpmn-bundle.min.css';
		if ( file_exists( HA_BPMN_PATH . $bundle_css ) ) {
			wp_enqueue_style(
				'ha-bpmn-bundle-css',
				HA_BPMN_URL . $bundle_css,
				[],
				self::get_asset_version( $bundle_css )
			);
		} else {
			// Fallback to separate stylesheets if bundle isn't compiled yet
			$fallback_styles = [
				'bpmn-js'                  => 'assets/css/bpmn-js.css',
				'diagram-js'               => 'assets/css/diagram-js.css',
				'bpmn'                     => 'assets/css/bpmn.css',
				'bpmn-js-token-simulation' => 'assets/css/bpmn-js-token-simulation.css',
			];

			foreach ( $fallback_styles as $handle => $rel_path ) {
				if ( file_exists( HA_BPMN_PATH . $rel_path ) ) {
					wp_enqueue_style(
						'ha-' . $handle,
						HA_BPMN_URL . $rel_path,
						[],
						self::get_asset_version( $rel_path )
					);
				}
			}
		}

		// Always load the Layout Collision Fix CSS
		$layout_fix_css = 'assets/css/bpmn-layout-fix.css';
		if ( file_exists( HA_BPMN_PATH . $layout_fix_css ) ) {
			wp_enqueue_style(
				'ha-bpmn-layout-fix',
				HA_BPMN_URL . $layout_fix_css,
				[],
				self::get_asset_version( $layout_fix_css )
			);
		}
	}

	/**
	 * Enqueue assets for the WordPress Admin.
	 *
	 * @param string $hook_suffix Current admin page hook.
	 */
	public function enqueue_admin_assets( $hook_suffix ) {
		// Intercept deactivation on plugins.php to prompt for data retention choice
		if ( 'plugins.php' === $hook_suffix ) {
			$this->enqueue_deactivation_dialog();
			return;
		}

		global $post_type, $typenow;

		$current_cpt    = ! empty( $typenow ) ? $typenow : $post_type;
		$is_bpmn_screen = ( HA_BPMN_POST_TYPE === $current_cpt || false !== strpos( $hook_suffix, HA_BPMN_POST_TYPE ) );

		if ( ! $is_bpmn_screen ) {
			return;
		}

		// Admin CSS
		$admin_css = 'assets/css/admin.css';
		if ( file_exists( HA_BPMN_PATH . $admin_css ) ) {
			wp_enqueue_style(
				'ha-bpmn-admin',
				HA_BPMN_URL . $admin_css,
				[],
				self::get_asset_version( $admin_css )
			);
		}

		// Enqueue media uploader, color picker & bundle on settings page
		if ( false !== strpos( $hook_suffix, HA_BPMN_POST_TYPE . '_settings' ) ) {
			wp_enqueue_media();
			wp_enqueue_style( 'wp-color-picker' );
			wp_enqueue_script( 'wp-color-picker' );
			$this->register_shared_assets( true );
			wp_enqueue_script( 'ha-bpmn-bundle' );
		}

		// Only enqueue the heavy editor bundle on post editor screens
		if ( in_array( $hook_suffix, [ 'post.php', 'post-new.php' ], true ) && HA_BPMN_POST_TYPE === $current_cpt ) {
			$this->register_shared_assets( true );
			wp_enqueue_script( 'ha-bpmn-bundle' );
		}
	}

	/**
	 * Enqueue assets for the Frontend.
	 *
	 * @param bool $force Force enqueue regardless of post content check.
	 */
	public function enqueue_frontend_assets( $force = false ) {
		global $post;

		$is_single_bpmn = is_singular( HA_BPMN_POST_TYPE );
		$has_shortcode  = is_a( $post, 'WP_Post' ) && (
			has_shortcode( $post->post_content, 'bpmnm' ) ||
			has_shortcode( $post->post_content, 'bpmn' )
		);

		if ( $force || $is_single_bpmn || $has_shortcode ) {
			$this->register_shared_assets( false );
			wp_enqueue_script( 'ha-bpmn-bundle' );

			// Frontend CSS
			$frontend_css = 'assets/css/frontend.css';
			if ( file_exists( HA_BPMN_PATH . $frontend_css ) ) {
				wp_enqueue_style(
					'ha-bpmn-frontend',
					HA_BPMN_URL . $frontend_css,
					[],
					self::get_asset_version( $frontend_css )
				);
			}
		}
	}

	/**
	 * Enqueue deactivation confirmation dialog on plugins.php.
	 */
	private function enqueue_deactivation_dialog() {
		$css_file = 'assets/css/deactivation-dialog.css';
		$js_file  = 'assets/js/deactivation-dialog.js';

		if ( file_exists( HA_BPMN_PATH . $css_file ) ) {
			wp_enqueue_style(
				'ha-bpmn-deactivate-dialog',
				HA_BPMN_URL . $css_file,
				[],
				self::get_asset_version( $css_file )
			);
		}

		if ( file_exists( HA_BPMN_PATH . $js_file ) ) {
			wp_enqueue_script(
				'ha-bpmn-deactivate-dialog',
				HA_BPMN_URL . $js_file,
				[],
				self::get_asset_version( $js_file ),
				true
			);

			$settings = CPT::get_plugin_settings();

			wp_localize_script(
				'ha-bpmn-deactivate-dialog',
				'haBpmnDeactivateConfig',
				[
					'slug'           => 'ha-bpmn-manager',
					'pluginFile'     => plugin_basename( HA_BPMN_FILE ),
					'currentSetting' => ! empty( $settings['delete_data_on_uninstall'] ) ? '1' : '0',
					'ajaxUrl'        => admin_url( 'admin-ajax.php' ),
					'nonce'          => wp_create_nonce( 'ha_bpmn_deactivate_nonce' ),
					'action'         => 'ha_bpmn_save_uninstall_setting',
					'i18n'           => [
						'modalTitle'       => __( 'HA-BPMN-Manager: Deactivation & Data', 'ha-bpmn-manager' ),
						'closeBtn'         => __( 'Close', 'ha-bpmn-manager' ),
						'introText'        => __( 'You are about to deactivate <strong>HA-BPMN-Manager</strong>. Please choose what should happen to your diagrams and data if the plugin is later uninstalled:', 'ha-bpmn-manager' ),
						'keepTitle'        => __( 'Keep data in database', 'ha-bpmn-manager' ),
						'recommendedBadge' => __( 'Recommended', 'ha-bpmn-manager' ),
						'keepDesc'         => __( 'All BPMN diagrams, XML models, revisions, and settings remain safely stored in the database. Everything will be restored immediately if the plugin is reactivated.', 'ha-bpmn-manager' ),
						'deleteTitle'      => __( 'Remove all data upon uninstallation', 'ha-bpmn-manager' ),
						'dangerBadge'      => __( 'GDPR / Danger', 'ha-bpmn-manager' ),
						'deleteDesc'       => __( 'Warning: If you delete the plugin via WordPress after deactivation, all diagrams and settings will be permanently destroyed.', 'ha-bpmn-manager' ),
						'hintText'         => __( '💡 <strong>Note:</strong> You can also change this preference at any time in the <em>System Status</em> tab of the plugin settings.', 'ha-bpmn-manager' ),
						'cancelBtn'        => __( 'Cancel', 'ha-bpmn-manager' ),
						'confirmBtn'       => __( 'Save & Deactivate', 'ha-bpmn-manager' ),
						'savingText'       => __( 'Saving & deactivating…', 'ha-bpmn-manager' ),
					],
				]
			);
		}
	}
}
