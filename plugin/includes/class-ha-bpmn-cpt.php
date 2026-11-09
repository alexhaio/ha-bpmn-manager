<?php
/**
 * Custom Post Type and Admin Management for HA-BPMN-Manager.
 *
 * @package HA_BPMN_Manager
 */

namespace HA_BPMN;

defined( 'ABSPATH' ) || exit;

/**
 * Registers the BPMN Custom Post Type, Metaboxes, Settings, and Taxonomies.
 */
class CPT {

	/**
	 * Instance of this class.
	 *
	 * @var CPT|null
	 */
	private static $instance = null;

	/**
	 * Returns the singleton instance.
	 *
	 * @return CPT
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
		add_action( 'init', [ $this, 'register_post_type' ] );
		add_action( 'add_meta_boxes', [ $this, 'register_metabox' ] );
		add_action( 'add_meta_boxes', [ $this, 'remove_unwanted_metaboxes' ], 99 );
		add_filter( 'wp_insert_post_data', [ $this, 'filter_post_data_before_save' ], 10, 2 );
		add_action( 'save_post_' . HA_BPMN_POST_TYPE, [ $this, 'save_diagram_meta' ], 10, 2 );

		// Force Author metabox to sidebar in user-saved meta-box-order
		add_filter( 'get_user_option_meta-box-order_' . HA_BPMN_POST_TYPE, [ $this, 'filter_meta_box_order' ] );

		// Disable Gutenberg Block Editor for BPMN CPT to provide full canvas experience
		add_filter( 'use_block_editor_for_post_type', [ $this, 'disable_gutenberg_for_bpmn' ], 10, 2 );

		// Submenu page (Settings)
		add_action( 'admin_menu', [ $this, 'register_submenus' ] );
		add_action( 'admin_init', [ $this, 'register_settings' ] );

		// AJAX Actions
		add_action( 'wp_ajax_bpmn_export', [ $this, 'handle_export' ] );
		add_action( 'wp_ajax_ha_bpmn_save_uninstall_setting', [ $this, 'ajax_save_uninstall_setting' ] );

		// Admin Post List Columns & Row Actions
		add_filter( 'manage_' . HA_BPMN_POST_TYPE . '_posts_columns', [ $this, 'add_custom_columns' ] );
		add_action( 'manage_' . HA_BPMN_POST_TYPE . '_posts_custom_column', [ $this, 'populate_custom_columns' ], 10, 2 );
		add_filter( 'post_row_actions', [ $this, 'add_row_actions' ], 10, 2 );
	}

	/**
	 * Default plugin configuration settings.
	 *
	 * @return array
	 */
	public static function get_default_settings() {
		return [
			'enable_categories'       => '1',
			'enable_tags'             => '0',
			'module_simulation'       => '1',
			'module_minimap'          => '1',
			'module_linter'           => '1',
			'module_properties'       => '1',
			'module_quest'            => '1',
			'module_templates'        => '1',
			'module_handbook'         => '1',
			'default_template_lang'   => 'auto',
			'frontend_default_height' => '600',
			'frontend_allow_zoom'     => '1',
			'frontend_allow_download' => '1',
			'frontend_token_sim'      => '1',
			'enable_revisions'        => '1',
			'cert_header_title'       => '',
			'cert_authority_text'     => 'HA-BPMN Guild Governance',
			'cert_title_mode'         => 'dynamic',
			'cert_custom_title'       => '',
			'cert_custom_subtitle'    => '',
			'cert_intro_text'         => '',
			'cert_custom_dedication'  => '',
			'cert_show_badges'        => '1',
			'cert_color_theme'        => 'honor_adaptive',
			'cert_custom_color'       => '#bf953f',
			'cert_seal_image'         => '',
			'cert_seal_text'          => '',
			'cert_signature_mode'     => 'single',
			'cert_signature_image'    => '',
			'cert_signer_name'        => '',
			'cert_signer_title'       => '',
			'cert_signature_image_2'  => '',
			'cert_signer_name_2'      => '',
			'cert_signer_title_2'     => '',
			'cert_watermark_image'    => '',
			'cert_id_prefix'          => 'HA-BPMN-',
			'quest_editor_url'        => '',
			'delete_data_on_uninstall'=> '0',
		];
	}

	/**
	 * Retrieve consolidated plugin settings with backward-compatibility for legacy bpmn_module_settings.
	 *
	 * @return array
	 */
	public static function get_plugin_settings() {
		$defaults = self::get_default_settings();
		$saved    = get_option( 'ha_bpmn_settings' );

		if ( ! is_array( $saved ) ) {
			$legacy = get_option( 'bpmn_module_settings', [] );
			$saved  = [];
			if ( is_array( $legacy ) && ! empty( $legacy ) ) {
				$saved['module_simulation'] = ! empty( $legacy['simulation'] ) ? '1' : '0';
				$saved['module_minimap']    = ! empty( $legacy['minimap'] ) ? '1' : '0';
				$saved['module_linter']     = ! empty( $legacy['linter'] ) ? '1' : '0';
				$saved['module_properties'] = ! empty( $legacy['properties'] ) ? '1' : '0';
			}
		}

		return wp_parse_args( $saved, $defaults );
	}

	/**
	 * Registers the Custom Post Type.
	 */
	public function register_post_type() {
		$settings = self::get_plugin_settings();

		$labels = [
			'name'               => __( 'BPMN Diagrams', 'ha-bpmn-manager' ),
			'singular_name'      => __( 'BPMN Diagram', 'ha-bpmn-manager' ),
			'add_new'            => __( 'Add New Diagram', 'ha-bpmn-manager' ),
			'add_new_item'       => __( 'Add New BPMN Diagram', 'ha-bpmn-manager' ),
			'edit_item'          => __( 'Edit BPMN Diagram', 'ha-bpmn-manager' ),
			'new_item'           => __( 'New BPMN Diagram', 'ha-bpmn-manager' ),
			'view_item'          => __( 'View Diagram', 'ha-bpmn-manager' ),
			'search_items'       => __( 'Search Diagrams', 'ha-bpmn-manager' ),
			'not_found'          => __( 'No diagrams found', 'ha-bpmn-manager' ),
			'not_found_in_trash' => __( 'No diagrams found in Trash', 'ha-bpmn-manager' ),
			'all_items'          => __( 'All BPMN Diagrams', 'ha-bpmn-manager' ),
			'menu_name'          => __( 'BPMN Diagrams', 'ha-bpmn-manager' ),
		];

		$supports = [ 'title', 'author' ];
		if ( ! empty( $settings['enable_revisions'] ) ) {
			$supports[] = 'revisions';
		}

		$taxonomies = [];
		if ( ! empty( $settings['enable_categories'] ) ) {
			$taxonomies[] = 'category';
		}
		if ( ! empty( $settings['enable_tags'] ) ) {
			$taxonomies[] = 'post_tag';
		}

		register_post_type(
			HA_BPMN_POST_TYPE,
			[
				'labels'              => $labels,
				'public'              => true,
				'show_ui'             => true,
				'show_in_menu'        => true,
				'show_in_rest'        => true,
				'rest_base'           => 'bpmnm-posts',
				'has_archive'         => false,
				'supports'            => $supports,
				'rewrite'             => [ 'slug' => 'bpmn-diagram' ],
				'capability_type'     => 'post',
				'taxonomies'          => $taxonomies,
				'menu_position'       => 21,
				'menu_icon'           => 'dashicons-randomize',
				'exclude_from_search' => false,
				'publicly_queryable'  => true,
			]
		);

		// Explicitly register taxonomies for object type to guarantee availability
		if ( ! empty( $settings['enable_categories'] ) ) {
			register_taxonomy_for_object_type( 'category', HA_BPMN_POST_TYPE );
		}
		if ( ! empty( $settings['enable_tags'] ) ) {
			register_taxonomy_for_object_type( 'post_tag', HA_BPMN_POST_TYPE );
		}
	}

	/**
	 * Disable Gutenberg for the BPMN CPT so the full-screen canvas editor displays cleanly.
	 *
	 * @param bool   $use_block_editor Current state.
	 * @param string $post_type       Current post type.
	 * @return bool
	 */
	public function disable_gutenberg_for_bpmn( $use_block_editor, $post_type ) {
		if ( HA_BPMN_POST_TYPE === $post_type ) {
			return false;
		}
		return $use_block_editor;
	}

	/**
	 * Register the editor metabox.
	 */
	public function register_metabox() {
		add_meta_box(
			'bpmn_editor',
			__( 'BPMN Modeler', 'ha-bpmn-manager' ),
			[ $this, 'render_metabox' ],
			HA_BPMN_POST_TYPE,
			'normal',
			'high'
		);
	}

	/**
	 * Remove irrelevant metaboxes for a clean canvas UI and respect taxonomy settings.
	 *
	 * @param string $post_type Current post type being edited.
	 */
	public function remove_unwanted_metaboxes( $post_type = '' ) {
		if ( ! empty( $post_type ) && HA_BPMN_POST_TYPE !== $post_type ) {
			return;
		}

		$target_type = HA_BPMN_POST_TYPE;
		$settings    = self::get_plugin_settings();

		// Remove WordPress core Custom Fields metabox (Individuelle Felder)
		remove_meta_box( 'postcustom', $target_type, 'normal' );
		remove_meta_box( 'postcustom', $target_type, 'advanced' );
		remove_meta_box( 'postcustom', $target_type, 'side' );

		// Remove Astra theme layout metaboxes if active
		remove_meta_box( 'astra_settings_meta_box', $target_type, 'side' );
		remove_meta_box( 'astra_settings_meta_box', $target_type, 'normal' );
		remove_meta_box( 'astra_settings_meta_box', $target_type, 'advanced' );

		// Remove comments and discussion boxes if present
		remove_meta_box( 'commentstatusdiv', $target_type, 'normal' );
		remove_meta_box( 'commentsdiv', $target_type, 'normal' );
		remove_meta_box( 'trackbacksdiv', $target_type, 'normal' );

		// Conditionally hide categories/tags metaboxes if disabled in settings
		if ( empty( $settings['enable_categories'] ) ) {
			remove_meta_box( 'categorydiv', $target_type, 'side' );
			remove_meta_box( 'categorydiv', $target_type, 'normal' );
			remove_meta_box( 'categorydiv', $target_type, 'advanced' );
		}
		if ( empty( $settings['enable_tags'] ) ) {
			remove_meta_box( 'tagsdiv-post_tag', $target_type, 'side' );
			remove_meta_box( 'tagsdiv-post_tag', $target_type, 'normal' );
			remove_meta_box( 'tagsdiv-post_tag', $target_type, 'advanced' );
		}

		// Move Author metabox to the right sidebar
		remove_meta_box( 'authordiv', $target_type, 'normal' );
		remove_meta_box( 'authordiv', $target_type, 'advanced' );
		add_meta_box(
			'authordiv',
			__( 'Author', 'ha-bpmn-manager' ),
			'post_author_meta_box',
			$target_type,
			'side',
			'default'
		);

		// Directly relocate authordiv in global $wp_meta_boxes if already registered
		global $wp_meta_boxes;
		if ( ! empty( $wp_meta_boxes[ $target_type ] ) ) {
			foreach ( [ 'normal', 'advanced' ] as $ctx ) {
				if ( isset( $wp_meta_boxes[ $target_type ][ $ctx ] ) ) {
					foreach ( [ 'high', 'core', 'default', 'low', 'sorted' ] as $prio ) {
						if ( isset( $wp_meta_boxes[ $target_type ][ $ctx ][ $prio ]['authordiv'] ) ) {
							$auth_box = $wp_meta_boxes[ $target_type ][ $ctx ][ $prio ]['authordiv'];
							unset( $wp_meta_boxes[ $target_type ][ $ctx ][ $prio ]['authordiv'] );
							$wp_meta_boxes[ $target_type ]['side']['default']['authordiv'] = $auth_box;
						}
					}
				}
			}
		}
	}

	/**
	 * Force the author metabox into the sidebar in user meta-box-order preferences.
	 *
	 * @param mixed $order User's saved metabox ordering.
	 * @return array Sanitized order array.
	 */
	public function filter_meta_box_order( $order ) {
		$settings     = self::get_plugin_settings();
		$default_side = 'submitdiv';
		if ( ! empty( $settings['enable_categories'] ) ) {
			$default_side .= ',categorydiv';
		}
		if ( ! empty( $settings['enable_tags'] ) ) {
			$default_side .= ',tagsdiv-post_tag';
		}
		$default_side .= ',authordiv';

		if ( ! is_array( $order ) ) {
			return [
				'side'     => $default_side,
				'normal'   => 'bpmn_editor',
				'advanced' => '',
			];
		}

		// Remove authordiv and unwanted boxes from normal and advanced contexts
		foreach ( [ 'normal', 'advanced' ] as $context ) {
			if ( ! empty( $order[ $context ] ) ) {
				$boxes = array_filter(
					array_map( 'trim', explode( ',', $order[ $context ] ) ),
					function( $box ) {
						return 'authordiv' !== $box && 'postcustom' !== $box && 'astra_settings_meta_box' !== $box;
					}
				);
				$order[ $context ] = implode( ',', $boxes );
			}
		}

		// Ensure authordiv is present in side context
		$side_boxes = ! empty( $order['side'] ) ? array_map( 'trim', explode( ',', $order['side'] ) ) : [];
		$side_boxes = array_filter(
			$side_boxes,
			function( $box ) {
				return 'postcustom' !== $box && 'astra_settings_meta_box' !== $box;
			}
		);
		if ( ! in_array( 'authordiv', $side_boxes, true ) ) {
			$side_boxes[] = 'authordiv';
		}
		$order['side'] = implode( ',', array_unique( $side_boxes ) );

		return $order;
	}

	/**
	 * Render the BPMN modeler editor container.
	 *
	 * @param \WP_Post $post Current post object.
	 */
	public function render_metabox( $post ) {
		wp_nonce_field( 'bpmn_save_action', 'bpmn_save_nonce' );

		$endpoint = rest_url( 'ha-bpmn/v1/diagram/' . $post->ID );

		// Pre-populate with existing XML if present
		$content      = json_decode( $post->post_content, true );
		$existing_xml = '';
		if ( is_array( $content ) && ! empty( $content['xml'] ) ) {
			$existing_xml = $content['xml'];
		} elseif ( ! empty( $post->post_content ) && false !== strpos( $post->post_content, '<bpmn:' ) ) {
			$existing_xml = $post->post_content;
		}

		$settings       = Assets::instance()->get_settings( true );
		$has_properties = ! empty( $settings['modules']['properties'] );
		?>
		<div class="ha-bpmn-editor-wrap"
			 id="ha-bpmn-editor-wrap-<?php echo esc_attr( $post->ID ); ?>"
			 data-diagram-id="<?php echo esc_attr( $post->ID ); ?>"
			 data-endpoint="<?php echo esc_url( $endpoint ); ?>"
			 data-is-admin="1"
			 data-title="<?php echo esc_attr( get_the_title( $post->ID ) ); ?>">

			<div class="ha-bpmn-controls-bar">
				<div class="btn-group history-controls">
					<button type="button" class="button ha-btn-undo" title="<?php esc_attr_e( 'Undo (Ctrl+Z)', 'ha-bpmn-manager' ); ?>" aria-label="<?php esc_attr_e( 'Undo', 'ha-bpmn-manager' ); ?>">
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
					</button>
					<button type="button" class="button ha-btn-redo" title="<?php esc_attr_e( 'Redo (Ctrl+Y)', 'ha-bpmn-manager' ); ?>" aria-label="<?php esc_attr_e( 'Redo', 'ha-bpmn-manager' ); ?>">
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/></svg>
					</button>
				</div>
				<div class="btn-group nav-controls">
					<button type="button" class="button ha-btn-zoom-out" title="<?php esc_attr_e( 'Zoom out', 'ha-bpmn-manager' ); ?>" aria-label="<?php esc_attr_e( 'Zoom out', 'ha-bpmn-manager' ); ?>">
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
					</button>
					<button type="button" class="button ha-btn-zoom-reset" title="<?php esc_attr_e( 'Fit to screen', 'ha-bpmn-manager' ); ?>" aria-label="<?php esc_attr_e( 'Fit to screen', 'ha-bpmn-manager' ); ?>">
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
					</button>
					<button type="button" class="button ha-btn-zoom-in" title="<?php esc_attr_e( 'Zoom in', 'ha-bpmn-manager' ); ?>" aria-label="<?php esc_attr_e( 'Zoom in', 'ha-bpmn-manager' ); ?>">
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
					</button>
				</div>
				<div class="btn-group tool-controls">
					<?php if ( ! empty( $settings['modules']['templates'] ) ) : ?>
					<button type="button" class="button ha-btn-templates" title="<?php esc_attr_e( 'Process Templates', 'ha-bpmn-manager' ); ?>" aria-label="<?php esc_attr_e( 'Templates', 'ha-bpmn-manager' ); ?>">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
						<span><?php esc_html_e( 'Templates', 'ha-bpmn-manager' ); ?></span>
					</button>
					<?php endif; ?>
					<?php if ( ! empty( $settings['modules']['quest'] ) ) : ?>
					<button type="button" class="button ha-btn-quest" title="<?php esc_attr_e( 'Interactive Guide & BPMN-Quest', 'ha-bpmn-manager' ); ?>" aria-label="<?php esc_attr_e( 'BPMN-Quest', 'ha-bpmn-manager' ); ?>">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="15" y1="13" x2="15.01" y2="13"/><line x1="18" y1="11" x2="18.01" y2="11"/><rect x="2" y="6" width="20" height="12" rx="2"/></svg>
						<span><?php esc_html_e( 'BPMN-Quest', 'ha-bpmn-manager' ); ?></span>
						<span class="ha-quest-tag"><?php esc_html_e( 'Tutorial', 'ha-bpmn-manager' ); ?></span>
					</button>
					<?php endif; ?>
					<div class="ha-lang-controls" title="<?php esc_attr_e( 'Benutzersprache manuell wählen (Standard: WordPress-Sprache)', 'ha-bpmn-manager' ); ?>">
						<select class="ha-select-user-lang">
							<option value=""><?php esc_html_e( '🌐 Automatisch (WP)', 'ha-bpmn-manager' ); ?></option>
							<option value="de">🇩🇪 DE</option>
							<option value="en">🇬🇧 EN</option>
							<option value="es">🇪🇸 ES</option>
							<option value="fr">🇫🇷 FR</option>
							<option value="it">🇮🇹 IT</option>
							<option value="pt">🇵🇹 PT</option>
							<option value="nl">🇳🇱 NL</option>
							<option value="pl">🇵🇱 PL</option>
							<option value="ru">🇷🇺 RU</option>
							<option value="ja">🇯🇵 JA</option>
							<option value="zh">🇨🇳 ZH</option>
							<option value="zh_TW">🇹🇼 TW</option>
							<option value="sv">🇸🇪 SV</option>
							<option value="da">🇩🇰 DA</option>
							<option value="nb">🇳🇴 NB</option>
							<option value="fi">🇫🇮 FI</option>
							<option value="cs">🇨🇿 CS</option>
							<option value="tr">🇹🇷 TR</option>
							<option value="el">🇬🇷 EL</option>
							<option value="hu">🇭🇺 HU</option>
							<option value="ro">🇷🇴 RO</option>
							<option value="uk">🇺🇦 UK</option>
							<option value="ar">🇸🇦 AR</option>
							<option value="id">🇮🇩 ID</option>
							<option value="ko">🇰🇷 KO</option>
							<option value="gd">🏴󠁧󠁢󠁳󠁣󠁴󠁿 GD</option>
							<option value="futhark">⚔️ ᚠᚢ</option>
							<option value="navi">🌿 Na'vi</option>
							<option value="sa">🕉️ SA</option>
							<option value="sux">🏛️ SUX</option>
							<option value="egy">🔺 EGY</option>
						</select>
					</div>
					<button type="button" class="button ha-btn-import" title="<?php esc_attr_e( 'Import BPMN XML (.bpmn, .xml)', 'ha-bpmn-manager' ); ?>" aria-label="<?php esc_attr_e( 'Import', 'ha-bpmn-manager' ); ?>">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
						<span><?php esc_html_e( 'Import', 'ha-bpmn-manager' ); ?></span>
					</button>
					<input type="file" class="ha-bpmn-import-file-input" accept=".bpmn,.xml" style="display: none;" />
					<button type="button" class="button ha-btn-autolayout" title="<?php esc_attr_e( 'Auto-Layout Diagram', 'ha-bpmn-manager' ); ?>" aria-label="<?php esc_attr_e( 'Auto-Layout', 'ha-bpmn-manager' ); ?>">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.21 1.21 0 0 0 1.72 0L21.64 5.36a1.21 1.21 0 0 0 0-1.72Z"/><path d="m14 7 3 3"/><path d="M5 6v4"/><path d="M19 14v4"/><path d="M10 2v2"/><path d="M7 8H3"/><path d="M21 16h-4"/><path d="M11 3H9"/></svg>
						<span><?php esc_html_e( 'Auto-Layout', 'ha-bpmn-manager' ); ?></span>
					</button>
					<button type="button" class="button ha-btn-search" title="<?php esc_attr_e( 'Search Diagram (Ctrl+F)', 'ha-bpmn-manager' ); ?>" aria-label="<?php esc_attr_e( 'Search', 'ha-bpmn-manager' ); ?>">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
					</button>
				</div>
				<div class="btn-group revision-controls">
					<button type="button" class="button ha-btn-revisions" title="<?php esc_attr_e( 'Revision History & Semantic Diff', 'ha-bpmn-manager' ); ?>">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
						<span><?php esc_html_e( 'History', 'ha-bpmn-manager' ); ?></span>
					</button>
					<?php if ( ! empty( $settings['modules']['handbook'] ) ) : ?>
					<button type="button" class="button ha-btn-qm-handbook" title="<?php esc_attr_e( 'Generate QM Process Handbook (Print/PDF)', 'ha-bpmn-manager' ); ?>">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
						<span><?php esc_html_e( 'QM Handbook', 'ha-bpmn-manager' ); ?></span>
					</button>
					<?php endif; ?>
				</div>
				<div class="btn-group view-controls">
					<button type="button" class="button ha-btn-fullscreen" title="<?php esc_attr_e( 'Fullscreen / Zen Mode', 'ha-bpmn-manager' ); ?>" aria-label="<?php esc_attr_e( 'Fullscreen', 'ha-bpmn-manager' ); ?>">
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
					</button>
				</div>
				<div class="btn-group action-controls">
					<button type="button" class="button ha-btn-download-bpmn" title="<?php esc_attr_e( 'Download BPMN XML', 'ha-bpmn-manager' ); ?>">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
						<span>BPMN</span>
					</button>
					<button type="button" class="button ha-btn-download-svg" title="<?php esc_attr_e( 'Download SVG', 'ha-bpmn-manager' ); ?>">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
						<span>SVG</span>
					</button>
					<button type="button" class="button ha-btn-download-png" title="<?php esc_attr_e( 'Download PNG Image', 'ha-bpmn-manager' ); ?>">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
						<span>PNG</span>
					</button>
					<?php if ( $has_properties ) : ?>
						<button type="button" class="button ha-btn-toggle-properties" title="<?php esc_attr_e( 'Toggle Properties Panel', 'ha-bpmn-manager' ); ?>">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
							<span><?php esc_html_e( 'Properties', 'ha-bpmn-manager' ); ?></span>
						</button>
					<?php endif; ?>
				</div>
			</div>

			<div class="ha-bpmn-canvas-parent">
				<div class="ha-bpmn-canvas" id="ha-bpmn-canvas-<?php echo esc_attr( $post->ID ); ?>"></div>

				<?php if ( $has_properties ) : ?>
					<div class="ha-bpmn-properties-panel-wrap collapsed" id="ha-bpmn-properties-<?php echo esc_attr( $post->ID ); ?>">
						<div class="properties-container" id="ha-bpmn-properties-container-<?php echo esc_attr( $post->ID ); ?>"></div>
					</div>
				<?php endif; ?>

				<div class="ha-bpmn-drop-overlay">
					<div class="ha-bpmn-drop-content">
						<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
						<h3><?php esc_html_e( 'Drop BPMN file here', 'ha-bpmn-manager' ); ?></h3>
						<p><?php esc_html_e( 'Release to import .bpmn or .xml directly into diagram', 'ha-bpmn-manager' ); ?></p>
					</div>
				</div>
			</div>

			<textarea id="bpmn_xml" name="bpmn_xml" style="display:none;" aria-hidden="true"><?php echo esc_textarea( $existing_xml ); ?></textarea>
			<textarea id="bpmn_svg_cache" name="bpmn_svg_cache" style="display:none;" aria-hidden="true"><?php echo esc_textarea( get_post_meta( $post->ID, '_ha_bpmn_svg_cache', true ) ); ?></textarea>
		</div>
		<?php
	}

	/**
	 * Intercept and update post_content with sanitized diagram XML before database insert.
	 *
	 * @param array $data    An array of slashed, sanitized, and processed post data.
	 * @param array $postarr An array of sanitized (and slashed) but otherwise unmodified post data.
	 * @return array Modified post data array.
	 */
	public function filter_post_data_before_save( $data, $postarr ) {
		if ( ! isset( $postarr['post_type'] ) || HA_BPMN_POST_TYPE !== $postarr['post_type'] ) {
			return $data;
		}

		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			return $data;
		}

		if ( ! isset( $_POST['bpmn_save_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['bpmn_save_nonce'] ) ), 'bpmn_save_action' ) ) {
			return $data;
		}

		$post_id = isset( $postarr['ID'] ) ? (int) $postarr['ID'] : 0;
		if ( $post_id && ! current_user_can( 'edit_post', $post_id ) ) {
			return $data;
		}

		$sanitized_xml = '';
		if ( isset( $_POST['bpmn_xml'] ) ) {
			$raw_xml       = wp_unslash( $_POST['bpmn_xml'] );
			$sanitized_xml = $this->validate_bpmn_xml( $raw_xml );
		}

		if ( ! empty( $sanitized_xml ) ) {
			$data_payload = [
				'xml'      => $sanitized_xml,
				'overlays' => null,
			];

			$data['post_content'] = wp_slash( wp_json_encode( $data_payload, JSON_UNESCAPED_UNICODE ) );
		} elseif ( $post_id ) {
			$existing_post = get_post( $post_id );
			if ( $existing_post && ! empty( $existing_post->post_content ) ) {
				$data['post_content'] = wp_slash( $existing_post->post_content );
			}
		}

		return $data;
	}

	/**
	 * Validates BPMN XML string with XXE protection.
	 *
	 * @param string $xml Raw XML string.
	 * @return string Validated XML or empty string on failure.
	 */
	private function validate_bpmn_xml( $xml ) {
		$xml = trim( (string) $xml );
		if ( empty( $xml ) ) {
			return '';
		}

		if ( false !== stripos( $xml, '<!ENTITY' ) || false !== stripos( $xml, '<!DOCTYPE' ) ) {
			return '';
		}

		if ( false === strpos( $xml, 'definitions' ) ) {
			return '';
		}

		$prev_entity_loader = null;
		if ( function_exists( 'libxml_disable_entity_loader' ) && PHP_VERSION_ID < 80000 ) {
			// phpcs:ignore Generic.PHP.DeprecatedFunctions.Deprecated
			$prev_entity_loader = libxml_disable_entity_loader( true );
		}

		libxml_use_internal_errors( true );
		$doc = simplexml_load_string( $xml, 'SimpleXMLElement', LIBXML_NONET );
		libxml_clear_errors();

		if ( null !== $prev_entity_loader && function_exists( 'libxml_disable_entity_loader' ) ) {
			// phpcs:ignore Generic.PHP.DeprecatedFunctions.Deprecated
			libxml_disable_entity_loader( $prev_entity_loader );
		}

		if ( false === $doc ) {
			return '';
		}

		return $xml;
	}

	/**
	 * Register Submenu Pages (Settings).
	 */
	public function register_submenus() {
		add_submenu_page(
			'edit.php?post_type=' . HA_BPMN_POST_TYPE,
			__( 'Settings', 'ha-bpmn-manager' ),
			__( 'Settings', 'ha-bpmn-manager' ),
			'manage_options',
			HA_BPMN_POST_TYPE . '_settings',
			[ $this, 'render_settings_page' ]
		);
	}

	/**
	 * Register plugin settings with sanitize callback.
	 */
	public function register_settings() {
		register_setting(
			'ha_bpmn_settings_group',
			'ha_bpmn_settings',
			[
				'type'              => 'array',
				'sanitize_callback' => [ $this, 'sanitize_plugin_settings' ],
				'default'           => self::get_default_settings(),
			]
		);
	}

	/**
	 * Sanitize plugin settings input and sync with legacy option.
	 *
	 * @param array $input Form input values.
	 * @return array Sanitized settings.
	 */
	public function sanitize_plugin_settings( $input ) {
		$sanitized = self::get_default_settings();
		$checkbox_keys = [
			'enable_categories',
			'enable_tags',
			'module_simulation',
			'module_minimap',
			'module_linter',
			'module_properties',
			'module_quest',
			'module_templates',
			'module_handbook',
			'frontend_allow_zoom',
			'frontend_allow_download',
			'frontend_token_sim',
			'enable_revisions',
			'cert_show_badges',
			'delete_data_on_uninstall',
		];

		foreach ( $checkbox_keys as $key ) {
			$sanitized[ $key ] = ! empty( $input[ $key ] ) ? '1' : '0';
		}

		$text_keys = [
			'default_template_lang',
			'cert_header_title',
			'cert_authority_text',
			'cert_title_mode',
			'cert_custom_title',
			'cert_custom_subtitle',
			'cert_intro_text',
			'cert_custom_dedication',
			'cert_color_theme',
			'cert_custom_color',
			'cert_seal_text',
			'cert_signature_mode',
			'cert_signer_name',
			'cert_signer_title',
			'cert_signer_name_2',
			'cert_signer_title_2',
			'cert_id_prefix',
		];

		foreach ( $text_keys as $t_key ) {
			if ( isset( $input[ $t_key ] ) ) {
				$sanitized[ $t_key ] = sanitize_text_field( $input[ $t_key ] );
			}
		}

		$url_keys = [
			'cert_seal_image',
			'cert_signature_image',
			'cert_signature_image_2',
			'cert_watermark_image',
			'quest_editor_url',
		];

		foreach ( $url_keys as $u_key ) {
			if ( isset( $input[ $u_key ] ) ) {
				$sanitized[ $u_key ] = esc_url_raw( $input[ $u_key ] );
			}
		}

		if ( isset( $input['frontend_default_height'] ) ) {
			$height = (int) $input['frontend_default_height'];
			if ( $height < 200 ) {
				$height = 200;
			} elseif ( $height > 2000 ) {
				$height = 2000;
			}
			$sanitized['frontend_default_height'] = (string) $height;
		}

		// Sync legacy bpmn_module_settings for backward compatibility
		update_option(
			'bpmn_module_settings',
			[
				'simulation' => $sanitized['module_simulation'],
				'minimap'    => $sanitized['module_minimap'],
				'linter'     => $sanitized['module_linter'],
				'properties' => $sanitized['module_properties'],
			]
		);

		return $sanitized;
	}

	/**
	 * Render the Modern Settings Dashboard.
	 */
	public function render_settings_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$settings = self::get_plugin_settings();
		$active_tab = isset( $_GET['tab'] ) ? sanitize_key( $_GET['tab'] ) : 'taxonomies';
		?>
		<div class="wrap ha-settings-dashboard">
			<!-- Header Banner -->
			<div class="ha-settings-header">
				<div class="ha-header-left">
					<div class="ha-header-icon">
						<span class="dashicons dashicons-randomize"></span>
					</div>
					<div>
						<h1 class="ha-header-title">
							<?php esc_html_e( 'HA-BPMN-Manager', 'ha-bpmn-manager' ); ?>
							<span class="ha-version-tag">v<?php echo esc_html( HA_BPMN_VERSION ); ?></span>
						</h1>
						<p class="ha-header-desc">
							<?php esc_html_e( 'Configure modeling tools, taxonomy integration, frontend embedding, and system options.', 'ha-bpmn-manager' ); ?>
						</p>
					</div>
				</div>
				<div class="ha-header-actions">
					<a href="<?php echo esc_url( admin_url( 'edit.php?post_type=' . HA_BPMN_POST_TYPE ) ); ?>" class="button button-secondary">
						<span class="dashicons dashicons-list-view"></span> <?php esc_html_e( 'All Diagrams', 'ha-bpmn-manager' ); ?>
					</a>
					<a href="<?php echo esc_url( admin_url( 'post-new.php?post_type=' . HA_BPMN_POST_TYPE ) ); ?>" class="button button-primary">
						<span class="dashicons dashicons-plus-alt2"></span> <?php esc_html_e( 'New Diagram', 'ha-bpmn-manager' ); ?>
					</a>
				</div>
			</div>

			<?php settings_errors(); ?>

			<!-- Tab Navigation -->
			<nav class="ha-settings-tabs" role="tablist">
				<button type="button" class="ha-tab-btn <?php echo ( 'taxonomies' === $active_tab ) ? 'active' : ''; ?>" data-tab="tab-taxonomies">
					<span class="dashicons dashicons-category"></span>
					<?php esc_html_e( 'Taxonomies & Structure', 'ha-bpmn-manager' ); ?>
				</button>
				<button type="button" class="ha-tab-btn <?php echo ( 'modeler' === $active_tab ) ? 'active' : ''; ?>" data-tab="tab-modeler">
					<span class="dashicons dashicons-admin-tools"></span>
					<?php esc_html_e( 'Modeler & Studio Tools', 'ha-bpmn-manager' ); ?>
				</button>
				<button type="button" class="ha-tab-btn <?php echo ( 'frontend' === $active_tab ) ? 'active' : ''; ?>" data-tab="tab-frontend">
					<span class="dashicons dashicons-visibility"></span>
					<?php esc_html_e( 'Frontend & Embedding', 'ha-bpmn-manager' ); ?>
				</button>
				<button type="button" class="ha-tab-btn <?php echo ( 'certificate' === $active_tab ) ? 'active' : ''; ?>" data-tab="tab-certificate">
					<span class="dashicons dashicons-awards"></span>
					<?php esc_html_e( 'Meister-Urkunde & Quest-Zertifikat', 'ha-bpmn-manager' ); ?>
				</button>
				<button type="button" class="ha-tab-btn <?php echo ( 'system' === $active_tab ) ? 'active' : ''; ?>" data-tab="tab-system">
					<span class="dashicons dashicons-info-outline"></span>
					<?php esc_html_e( 'System Status & Shortcode', 'ha-bpmn-manager' ); ?>
				</button>
			</nav>

			<form method="post" action="options.php" class="ha-settings-form">
				<?php settings_fields( 'ha_bpmn_settings_group' ); ?>

				<!-- Tab 1: Taxonomies & Structure -->
				<div class="ha-tab-content <?php echo ( 'taxonomies' === $active_tab ) ? 'active' : ''; ?>" id="tab-taxonomies">
					<div class="ha-card">
						<div class="ha-card-header">
							<h2><?php esc_html_e( 'WordPress Taxonomies & Organization', 'ha-bpmn-manager' ); ?></h2>
							<p><?php esc_html_e( 'Control whether standard WordPress categories and tags are enabled for organizing BPMN diagrams.', 'ha-bpmn-manager' ); ?></p>
						</div>
						<div class="ha-card-body">
							<div class="ha-setting-row">
								<div class="ha-setting-info">
									<label class="ha-setting-label" for="enable_categories">
										<?php esc_html_e( 'Standard WordPress Categories', 'ha-bpmn-manager' ); ?>
										<span class="ha-badge ha-badge-recommended"><?php esc_html_e( 'Recommended', 'ha-bpmn-manager' ); ?></span>
									</label>
									<p class="ha-setting-desc">
										<?php esc_html_e( 'Enable standard WordPress categories (category) for BPMN diagrams. Adds the category metabox, filter dropdowns, and category columns in the diagram list table.', 'ha-bpmn-manager' ); ?>
									</p>
								</div>
								<div class="ha-setting-control">
									<label class="ha-switch">
										<input type="checkbox" id="enable_categories" name="ha_bpmn_settings[enable_categories]" value="1" <?php checked( '1', $settings['enable_categories'] ); ?> />
										<span class="ha-slider"></span>
									</label>
								</div>
							</div>

							<div class="ha-setting-row">
								<div class="ha-setting-info">
									<label class="ha-setting-label" for="enable_tags">
										<?php esc_html_e( 'Standard WordPress Tags (Schlagwörter)', 'ha-bpmn-manager' ); ?>
									</label>
									<p class="ha-setting-desc">
										<?php esc_html_e( 'Enable standard WordPress tags (post_tag) for granular labeling, searchability, and keyword filtering of your BPMN processes.', 'ha-bpmn-manager' ); ?>
									</p>
								</div>
								<div class="ha-setting-control">
									<label class="ha-switch">
										<input type="checkbox" id="enable_tags" name="ha_bpmn_settings[enable_tags]" value="1" <?php checked( '1', $settings['enable_tags'] ); ?> />
										<span class="ha-slider"></span>
									</label>
								</div>
							</div>

							<div class="ha-setting-row">
								<div class="ha-setting-info">
									<label class="ha-setting-label" for="enable_revisions">
										<?php esc_html_e( 'Revision History & Version Comparison', 'ha-bpmn-manager' ); ?>
										<span class="ha-badge ha-badge-feature"><?php esc_html_e( 'Pro Feature', 'ha-bpmn-manager' ); ?></span>
									</label>
									<p class="ha-setting-desc">
										<?php esc_html_e( 'Tracks diagram version history on every save. Enables the "History" studio button with visual semantic comparison (added, modified, deleted BPMN elements) and one-click rollback.', 'ha-bpmn-manager' ); ?>
									</p>
								</div>
								<div class="ha-setting-control">
									<label class="ha-switch">
										<input type="checkbox" id="enable_revisions" name="ha_bpmn_settings[enable_revisions]" value="1" <?php checked( '1', $settings['enable_revisions'] ); ?> />
										<span class="ha-slider"></span>
									</label>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Tab 2: Modeler & Studio Tools -->
				<div class="ha-tab-content <?php echo ( 'modeler' === $active_tab ) ? 'active' : ''; ?>" id="tab-modeler">
					<div class="ha-card">
						<div class="ha-card-header">
							<h2><?php esc_html_e( 'BPMN Studio & Modeler Modules', 'ha-bpmn-manager' ); ?></h2>
							<p><?php esc_html_e( 'Turn editor features on or off depending on your team workflow and performance preferences.', 'ha-bpmn-manager' ); ?></p>
						</div>
						<div class="ha-card-body">
							<div class="ha-setting-row">
								<div class="ha-setting-info">
									<label class="ha-setting-label" for="module_simulation">
										<?php esc_html_e( 'Interactive Token Simulation', 'ha-bpmn-manager' ); ?>
									</label>
									<p class="ha-setting-desc">
										<?php esc_html_e( 'Provides dynamic token playback in the editor with play/pause, step controls, and speed regulator to test process flow logic interactively.', 'ha-bpmn-manager' ); ?>
									</p>
								</div>
								<div class="ha-setting-control">
									<label class="ha-switch">
										<input type="checkbox" id="module_simulation" name="ha_bpmn_settings[module_simulation]" value="1" <?php checked( '1', $settings['module_simulation'] ); ?> />
										<span class="ha-slider"></span>
									</label>
								</div>
							</div>

							<div class="ha-setting-row">
								<div class="ha-setting-info">
									<label class="ha-setting-label" for="module_minimap">
										<?php esc_html_e( 'Minimap Navigation', 'ha-bpmn-manager' ); ?>
									</label>
									<p class="ha-setting-desc">
										<?php esc_html_e( 'Shows a high-level mini-overview map in the top-right corner of the canvas with a collapsible toggle button for fast navigation across large workflows.', 'ha-bpmn-manager' ); ?>
									</p>
								</div>
								<div class="ha-setting-control">
									<label class="ha-switch">
										<input type="checkbox" id="module_minimap" name="ha_bpmn_settings[module_minimap]" value="1" <?php checked( '1', $settings['module_minimap'] ); ?> />
										<span class="ha-slider"></span>
									</label>
								</div>
							</div>

							<div class="ha-setting-row">
								<div class="ha-setting-info">
									<label class="ha-setting-label" for="module_linter">
										<?php esc_html_e( 'Real-time BPMN 2.0 Linter', 'ha-bpmn-manager' ); ?>
									</label>
									<p class="ha-setting-desc">
										<?php esc_html_e( 'Validates diagrams in real time against BPMN 2.0 best practices (unconnected elements, missing end events, invalid flows) and displays unobtrusive guidance.', 'ha-bpmn-manager' ); ?>
									</p>
								</div>
								<div class="ha-setting-control">
									<label class="ha-switch">
										<input type="checkbox" id="module_linter" name="ha_bpmn_settings[module_linter]" value="1" <?php checked( '1', $settings['module_linter'] ); ?> />
										<span class="ha-slider"></span>
									</label>
								</div>
							</div>

							<div class="ha-setting-row">
								<div class="ha-setting-info">
									<label class="ha-setting-label" for="module_properties">
										<?php esc_html_e( 'Camunda Properties Panel', 'ha-bpmn-manager' ); ?>
									</label>
									<p class="ha-setting-desc">
										<?php esc_html_e( 'Enables the collapsible right sidebar in the editor to inspect and configure element IDs, names, documentation, and technical execution properties.', 'ha-bpmn-manager' ); ?>
									</p>
								</div>
								<div class="ha-setting-control">
									<label class="ha-switch">
										<input type="checkbox" id="module_properties" name="ha_bpmn_settings[module_properties]" value="1" <?php checked( '1', $settings['module_properties'] ); ?> />
										<span class="ha-slider"></span>
									</label>
								</div>
							</div>

							<div class="ha-setting-row">
								<div class="ha-setting-info">
									<label class="ha-setting-label" for="module_quest">
										<?php esc_html_e( 'Interactive Guide & BPMN-Quest (Tutorial)', 'ha-bpmn-manager' ); ?>
									</label>
									<p class="ha-setting-desc">
										<?php esc_html_e( 'Enables the interactive tutorial button, gamified learning companion HUD, step-by-step walkthroughs, and linter challenges in the BPMN editor.', 'ha-bpmn-manager' ); ?>
									</p>
								</div>
								<div class="ha-setting-control">
									<label class="ha-switch">
										<input type="checkbox" id="module_quest" name="ha_bpmn_settings[module_quest]" value="1" <?php checked( '1', $settings['module_quest'] ); ?> />
										<span class="ha-slider"></span>
									</label>
								</div>
							</div>

							<div class="ha-setting-row">
								<div class="ha-setting-info">
									<label class="ha-setting-label" for="module_templates">
										<?php esc_html_e( 'Process Templates Library', 'ha-bpmn-manager' ); ?>
									</label>
									<p class="ha-setting-desc">
										<?php esc_html_e( 'Enables the pre-built business process templates modal and toolbar button (e.g. employee onboarding, invoice approval, change request) to quickly jump-start diagram modeling.', 'ha-bpmn-manager' ); ?>
									</p>
								</div>
								<div class="ha-setting-control">
									<label class="ha-switch">
										<input type="checkbox" id="module_templates" name="ha_bpmn_settings[module_templates]" value="1" <?php checked( '1', $settings['module_templates'] ); ?> />
										<span class="ha-slider"></span>
									</label>
								</div>
							</div>

							<div class="ha-setting-row">
								<div class="ha-setting-info">
									<label class="ha-setting-label" for="module_handbook">
										<?php esc_html_e( 'QM Process Handbook (Print/PDF)', 'ha-bpmn-manager' ); ?>
									</label>
									<p class="ha-setting-desc">
										<?php esc_html_e( 'Enables the QM Handbook generator button in the editor toolbar to export structured, audit-ready process documentation and step tables into a printable browser view.', 'ha-bpmn-manager' ); ?>
									</p>
								</div>
								<div class="ha-setting-control">
									<label class="ha-switch">
										<input type="checkbox" id="module_handbook" name="ha_bpmn_settings[module_handbook]" value="1" <?php checked( '1', $settings['module_handbook'] ); ?> />
										<span class="ha-slider"></span>
									</label>
								</div>
							</div>

							<div class="ha-setting-row">
								<div class="ha-setting-info">
									<label class="ha-setting-label" for="default_template_lang">
										<?php esc_html_e( 'Default Template Language', 'ha-bpmn-manager' ); ?>
									</label>
									<p class="ha-setting-desc">
										<?php esc_html_e( 'Choose the default language for process templates and the interactive guide. The user can also change this directly in the template modal.', 'ha-bpmn-manager' ); ?>
									</p>
								</div>
								<div class="ha-setting-control">
									<select id="default_template_lang" name="ha_bpmn_settings[default_template_lang]" class="regular-text">
										<option value="auto" <?php selected( 'auto', $settings['default_template_lang'] ); ?>><?php esc_html_e( '🌐 Automatic (WordPress Site Language)', 'ha-bpmn-manager' ); ?></option>
										<option value="de" <?php selected( 'de', $settings['default_template_lang'] ); ?>>🇩🇪 Deutsch (German)</option>
										<option value="en" <?php selected( 'en', $settings['default_template_lang'] ); ?>>🇬🇧 English</option>
										<option value="es" <?php selected( 'es', $settings['default_template_lang'] ); ?>>🇪🇸 Español (Spanish)</option>
										<option value="fr" <?php selected( 'fr', $settings['default_template_lang'] ); ?>>🇫🇷 Français (French)</option>
										<option value="it" <?php selected( 'it', $settings['default_template_lang'] ); ?>>🇮🇹 Italiano (Italian)</option>
										<option value="pt" <?php selected( 'pt', $settings['default_template_lang'] ); ?>>🇵🇹 Português (Portuguese)</option>
										<option value="nl" <?php selected( 'nl', $settings['default_template_lang'] ); ?>>🇳🇱 Nederlands (Dutch)</option>
										<option value="pl" <?php selected( 'pl', $settings['default_template_lang'] ); ?>>🇵🇱 Polski (Polish)</option>
										<option value="ru" <?php selected( 'ru', $settings['default_template_lang'] ); ?>>🇷🇺 Русский (Russian)</option>
										<option value="ja" <?php selected( 'ja', $settings['default_template_lang'] ); ?>>🇯🇵 日本語 (Japanese)</option>
										<option value="zh" <?php selected( 'zh', $settings['default_template_lang'] ); ?>>🇨🇳 简体中文 (Chinese Simp.)</option>
										<option value="zh_TW" <?php selected( 'zh_TW', $settings['default_template_lang'] ); ?>>🇹🇼 繁體中文 (Chinese Trad.)</option>
										<option value="sv" <?php selected( 'sv', $settings['default_template_lang'] ); ?>>🇸🇪 Svenska (Swedish)</option>
										<option value="da" <?php selected( 'da', $settings['default_template_lang'] ); ?>>🇩🇰 Dansk (Danish)</option>
										<option value="nb" <?php selected( 'nb', $settings['default_template_lang'] ); ?>>🇳🇴 Norsk Bokmål (Norwegian)</option>
										<option value="fi" <?php selected( 'fi', $settings['default_template_lang'] ); ?>>🇫🇮 Suomi (Finnish)</option>
										<option value="cs" <?php selected( 'cs', $settings['default_template_lang'] ); ?>>🇨🇿 Čeština (Czech)</option>
										<option value="tr" <?php selected( 'tr', $settings['default_template_lang'] ); ?>>🇹🇷 Türkçe (Turkish)</option>
										<option value="el" <?php selected( 'el', $settings['default_template_lang'] ); ?>>🇬🇷 Ελληνικά (Greek)</option>
										<option value="hu" <?php selected( 'hu', $settings['default_template_lang'] ); ?>>🇭🇺 Magyar (Hungarian)</option>
										<option value="ro" <?php selected( 'ro', $settings['default_template_lang'] ); ?>>🇷🇴 Română (Romanian)</option>
										<option value="uk" <?php selected( 'uk', $settings['default_template_lang'] ); ?>>🇺🇦 Українська (Ukrainian)</option>
										<option value="ar" <?php selected( 'ar', $settings['default_template_lang'] ); ?>>🇸🇦 العربية (Arabic)</option>
										<option value="id" <?php selected( 'id', $settings['default_template_lang'] ); ?>>🇮🇩 Bahasa Indonesia</option>
										<option value="ko" <?php selected( 'ko', $settings['default_template_lang'] ); ?>>🇰🇷 한국어 (Korean)</option>
										<option value="gd" <?php selected( 'gd', $settings['default_template_lang'] ); ?>>🏴󠁧󠁢󠁳󠁣󠁴󠁿 Gàidhlig (Scottish Gaelic)</option>
										<option value="futhark" <?php selected( 'futhark', $settings['default_template_lang'] ); ?>>⚔️ ᚠᚢᚦᚨᚱᚲ (Elder Futhark Runes)</option>
										<option value="navi" <?php selected( 'navi', $settings['default_template_lang'] ); ?>>🌿 Na'vi (Pandora / Avatar)</option>
										<option value="sa" <?php selected( 'sa', $settings['default_template_lang'] ); ?>>🕉️ संस्कृतम् (Sanskrit)</option>
										<option value="sux" <?php selected( 'sux', $settings['default_template_lang'] ); ?>>🏛️ 𒂗𒈠𒂗 (Sumerian Cuneiform)</option>
										<option value="egy" <?php selected( 'egy', $settings['default_template_lang'] ); ?>>🔺 𓂀𓃭𓇳 (Ancient Egyptian Hieroglyphs)</option>
									</select>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Tab 3: Frontend & Embedding -->
				<div class="ha-tab-content <?php echo ( 'frontend' === $active_tab ) ? 'active' : ''; ?>" id="tab-frontend">
					<div class="ha-card">
						<div class="ha-card-header">
							<h2><?php esc_html_e( 'Frontend Display & Viewer Experience', 'ha-bpmn-manager' ); ?></h2>
							<p><?php esc_html_e( 'Configure how diagrams appear when rendered via shortcodes [bpmnm id="..."] or embedded in posts and pages.', 'ha-bpmn-manager' ); ?></p>
						</div>
						<div class="ha-card-body">
							<div class="ha-setting-row">
								<div class="ha-setting-info">
									<label class="ha-setting-label" for="frontend_default_height">
										<?php esc_html_e( 'Default Viewer Height (px)', 'ha-bpmn-manager' ); ?>
									</label>
									<p class="ha-setting-desc">
										<?php esc_html_e( 'The default canvas height in pixels when no height attribute is passed to the shortcode (e.g., 600). Can always be overridden with [bpmnm height="750px"].', 'ha-bpmn-manager' ); ?>
									</p>
								</div>
								<div class="ha-setting-control">
									<input type="number" id="frontend_default_height" name="ha_bpmn_settings[frontend_default_height]" value="<?php echo esc_attr( $settings['frontend_default_height'] ); ?>" min="200" max="2000" step="50" class="small-text" /> px
								</div>
							</div>

							<div class="ha-setting-row">
								<div class="ha-setting-info">
									<label class="ha-setting-label" for="frontend_allow_zoom">
										<?php esc_html_e( 'Enable Zoom & Pan in Frontend', 'ha-bpmn-manager' ); ?>
									</label>
									<p class="ha-setting-desc">
										<?php esc_html_e( 'Allows website visitors to zoom in/out with mouse scroll or touch gestures and freely pan the diagram viewport.', 'ha-bpmn-manager' ); ?>
									</p>
								</div>
								<div class="ha-setting-control">
									<label class="ha-switch">
										<input type="checkbox" id="frontend_allow_zoom" name="ha_bpmn_settings[frontend_allow_zoom]" value="1" <?php checked( '1', $settings['frontend_allow_zoom'] ); ?> />
										<span class="ha-slider"></span>
									</label>
								</div>
							</div>

							<div class="ha-setting-row">
								<div class="ha-setting-info">
									<label class="ha-setting-label" for="frontend_allow_download">
										<?php esc_html_e( 'Allow Visitors to Download BPMN, SVG & PNG', 'ha-bpmn-manager' ); ?>
									</label>
									<p class="ha-setting-desc">
										<?php esc_html_e( 'Displays download buttons in the frontend viewer bar so users can export the raw BPMN 2.0 XML, SVG vector image, or high-resolution PNG.', 'ha-bpmn-manager' ); ?>
									</p>
								</div>
								<div class="ha-setting-control">
									<label class="ha-switch">
										<input type="checkbox" id="frontend_allow_download" name="ha_bpmn_settings[frontend_allow_download]" value="1" <?php checked( '1', $settings['frontend_allow_download'] ); ?> />
										<span class="ha-slider"></span>
									</label>
								</div>
							</div>

							<div class="ha-setting-row">
								<div class="ha-setting-info">
									<label class="ha-setting-label" for="frontend_token_sim">
										<?php esc_html_e( 'Interactive Token Simulation in Frontend', 'ha-bpmn-manager' ); ?>
									</label>
									<p class="ha-setting-desc">
										<?php esc_html_e( 'Allows visitors to run the interactive token simulation directly inside embedded diagrams on your site.', 'ha-bpmn-manager' ); ?>
									</p>
								</div>
								<div class="ha-setting-control">
									<label class="ha-switch">
										<input type="checkbox" id="frontend_token_sim" name="ha_bpmn_settings[frontend_token_sim]" value="1" <?php checked( '1', $settings['frontend_token_sim'] ); ?> />
										<span class="ha-slider"></span>
									</label>
								</div>
							</div>

							<div class="ha-setting-row">
								<div class="ha-setting-info">
									<label class="ha-setting-label" for="quest_editor_url">
										<?php esc_html_e( 'BPMN Quest / Learning Studio Target URL', 'ha-bpmn-manager' ); ?>
									</label>
									<p class="ha-setting-desc">
										<?php esc_html_e( 'Optional: Specify a custom frontend page URL containing the BPMN modeler where learners should be redirected to continue tasks (e.g. https://your-site.com/bpmn-studio/). If empty, the plugin automatically resolves the latest published BPMN diagram or WordPress editor.', 'ha-bpmn-manager' ); ?>
									</p>
								</div>
								<div class="ha-setting-control">
									<input type="url" id="quest_editor_url" name="ha_bpmn_settings[quest_editor_url]" value="<?php echo esc_url( $settings['quest_editor_url'] ?? '' ); ?>" class="regular-text" placeholder="https://..." style="max-width: 100%; width: 340px;" />
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Tab 4: System Status & Shortcode -->
				<div class="ha-tab-content <?php echo ( 'system' === $active_tab ) ? 'active' : ''; ?>" id="tab-system">
					<div class="ha-grid-2col">
						<div class="ha-card">
							<div class="ha-card-header">
								<h2><?php esc_html_e( 'System & Library Status', 'ha-bpmn-manager' ); ?></h2>
								<p><?php esc_html_e( 'Technical details and library versions powering your BPMN engine.', 'ha-bpmn-manager' ); ?></p>
							</div>
							<div class="ha-card-body">
								<table class="ha-status-table">
									<tbody>
										<tr>
											<th><?php esc_html_e( 'Plugin Version', 'ha-bpmn-manager' ); ?></th>
											<td>
												<span class="ha-badge ha-badge-success">v<?php echo esc_html( HA_BPMN_VERSION ); ?></span>
												<?php if ( current_user_can( 'update_plugins' ) ) : ?>
												<a href="<?php echo esc_url( wp_nonce_url( add_query_arg( [ 'puc_check_for_updates' => 1, 'puc_slug' => 'ha-bpmn-manager' ], self_admin_url( 'plugins.php' ) ), 'puc_check_for_updates' ) ); ?>" class="button button-secondary button-small" style="margin-left: 10px; display: inline-flex; align-items: center; gap: 4px; vertical-align: middle;">
													<span class="dashicons dashicons-update" style="font-size: 14px; width: 14px; height: 14px; line-height: 1;"></span>
													<span><?php esc_html_e( 'Nach Updates suchen', 'ha-bpmn-manager' ); ?></span>
												</a>
												<?php endif; ?>
											</td>
										</tr>
										<tr>
											<th><?php esc_html_e( 'BPMN Modeler Engine', 'ha-bpmn-manager' ); ?></th>
											<td><code>bpmn-js v18.1.1</code></td>
										</tr>
										<tr>
											<th><?php esc_html_e( 'Token Simulation Module', 'ha-bpmn-manager' ); ?></th>
											<td><code>bpmn-js-token-simulation v0.5.2</code></td>
										</tr>
										<tr>
											<th><?php esc_html_e( 'BPMN Lint Validator', 'ha-bpmn-manager' ); ?></th>
											<td><code>bpmnlint v11.6.0</code></td>
										</tr>
										<tr>
											<th><?php esc_html_e( 'REST API Endpoint', 'ha-bpmn-manager' ); ?></th>
											<td><code>/wp-json/ha-bpmn/v1/</code> <span class="ha-badge ha-badge-success"><?php esc_html_e( 'Active', 'ha-bpmn-manager' ); ?></span></td>
										</tr>
										<tr>
											<th><?php esc_html_e( 'WordPress Core', 'ha-bpmn-manager' ); ?></th>
											<td><code><?php echo esc_html( get_bloginfo( 'version' ) ); ?></code></td>
										</tr>
										<tr>
											<th><?php esc_html_e( 'PHP Environment', 'ha-bpmn-manager' ); ?></th>
											<td><code><?php echo esc_html( PHP_VERSION ); ?></code> (Limit: <?php echo esc_html( ini_get( 'memory_limit' ) ); ?>)</td>
										</tr>
									</tbody>
								</table>
							</div>
						</div>

						<div class="ha-card">
							<div class="ha-card-header">
								<h2><?php esc_html_e( 'Shortcode Quick Reference', 'ha-bpmn-manager' ); ?></h2>
								<p><?php esc_html_e( 'Copy & paste shortcodes to integrate your diagrams anywhere in WordPress.', 'ha-bpmn-manager' ); ?></p>
							</div>
							<div class="ha-card-body">
								<div class="ha-shortcode-example">
									<h4><?php esc_html_e( 'Standard Interactive Diagram', 'ha-bpmn-manager' ); ?></h4>
									<div class="ha-code-block">
										<code>[bpmnm id="123"]</code>
									</div>
								</div>
								<div class="ha-shortcode-example">
									<h4><?php esc_html_e( 'Custom Height & Fullscreen Disabled', 'ha-bpmn-manager' ); ?></h4>
									<div class="ha-code-block">
										<code>[bpmnm id="123" height="700px" fullscreen="false"]</code>
									</div>
								</div>
								<div class="ha-shortcode-example">
									<h4><?php esc_html_e( 'Lightweight Static SVG Mode (Instant Load)', 'ha-bpmn-manager' ); ?></h4>
									<div class="ha-code-block">
										<code>[bpmnm id="123" mode="static"]</code>
									</div>
								</div>
								<div class="ha-shortcode-example">
									<h4><?php esc_html_e( 'Active & Completed Step Highlighting', 'ha-bpmn-manager' ); ?></h4>
									<div class="ha-code-block">
										<code>[bpmnm id="123" active="Task_1" completed="StartEvent_1"]</code>
									</div>
								</div>
							</div>
						</div>
					</div>

					<!-- Danger Zone: Deinstallation & Datenbereinigung -->
					<div class="ha-card ha-card-danger" style="margin-top: 24px; border: 1px solid #fecaca; background: #ffffff; border-radius: 8px; overflow: hidden;">
						<div class="ha-card-header" style="border-bottom: 1px solid #fee2e2; background: #fef2f2; padding: 14px 20px;">
							<h2 style="color: #991b1b; display: flex; align-items: center; gap: 8px; margin: 0 0 4px; font-size: 15px;">
								<span class="dashicons dashicons-warning" style="font-size: 20px; width: 20px; height: 20px; line-height: 1; color: #dc2626;"></span>
								<?php esc_html_e( 'Gefahrenzone: Deinstallation & Datenbereinigung', 'ha-bpmn-manager' ); ?>
							</h2>
							<p style="color: #7f1d1d; margin: 0; font-size: 13px;">
								<?php esc_html_e( 'Bestimme, was mit deinen BPMN-Diagrammen und Einstellungen passiert, wenn das Plugin über WordPress gelöscht wird.', 'ha-bpmn-manager' ); ?>
							</p>
						</div>
						<div class="ha-card-body" style="padding: 16px 20px;">
							<div class="ha-setting-row" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 20px;">
								<div class="ha-setting-info" style="flex: 1;">
									<label class="ha-setting-label" for="delete_data_on_uninstall" style="font-weight: 700; color: #991b1b; display: block; margin-bottom: 6px;">
										<?php esc_html_e( 'Alle BPMN-Diagramme und Einstellungen beim Löschen des Plugins unwiderruflich entfernen', 'ha-bpmn-manager' ); ?>
									</label>
									<p class="ha-setting-desc" style="color: #475569; font-size: 13px; line-height: 1.5; margin: 0 0 8px;">
										<strong><?php esc_html_e( '🛡️ Standardmäßig sicher (Empfohlen):', 'ha-bpmn-manager' ); ?></strong>
										<?php esc_html_e( 'Ist dieser Schalter deaktiviert, bleiben alle Diagramme, XML-Modelle, Revisionen und Einstellungen in der WordPress-Datenbank erhalten. Du kannst das Plugin gefahrlos deaktivieren, aktualisieren oder neu installieren, ohne Daten zu verlieren.', 'ha-bpmn-manager' ); ?>
									</p>
									<p style="color: #b91c1c; font-size: 12.5px; line-height: 1.4; margin: 0;">
										<strong><?php esc_html_e( '⚠️ Nur bei endgültiger Entfernung (DSGVO):', 'ha-bpmn-manager' ); ?></strong>
										<?php esc_html_e( 'Aktiviere diese Option nur, wenn du das Plugin dauerhaft deinstallierst und die Datenbank restlos bereinigen möchtest.', 'ha-bpmn-manager' ); ?>
									</p>
								</div>
								<div class="ha-setting-control" style="padding-top: 4px;">
									<label class="ha-toggle-switch">
										<input type="checkbox" id="delete_data_on_uninstall" name="ha_bpmn_settings[delete_data_on_uninstall]" value="1" <?php checked( '1', $settings['delete_data_on_uninstall'] ?? '0' ); ?> />
										<span class="ha-toggle-slider"></span>
									</label>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Tab 5: Urkunde & Quest-Zertifikat -->
				<div class="ha-tab-content <?php echo ( 'certificate' === $active_tab ) ? 'active' : ''; ?>" id="tab-certificate">
					<!-- Top Action Bar: Live Preview Button -->
					<div class="ha-cert-live-preview-bar" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); padding: 16px 20px; border-radius: 10px; border: 1px solid #cbd5e1; box-shadow: 0 2px 6px rgba(15, 23, 42, 0.05); flex-wrap: wrap; gap: 12px;">
						<div>
							<h3 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 8px;">
								<span>📜</span>
								<?php esc_html_e( 'Live-Vorschau der Meister-Urkunde', 'ha-bpmn-manager' ); ?>
							</h3>
							<p style="margin: 0; font-size: 13px; color: #64748b;">
								<?php esc_html_e( 'Öffne die Urkunde mit deinen aktuell eingestellten Texten, Farben, Siegeln und Unterschriften in voller Auflösung (inkl. Druck, SVG- & 300 DPI PNG-Export).', 'ha-bpmn-manager' ); ?>
							</p>
						</div>
						<button type="button" class="button button-primary button-large ha-btn-preview-cert" style="display: inline-flex; align-items: center; gap: 8px; font-weight: 700; background: #2563eb; border-color: #1d4ed8; padding: 4px 18px; height: 40px; font-size: 14px;">
							<span class="dashicons dashicons-visibility" style="font-size: 20px; width: 20px; height: 20px; vertical-align: middle; line-height: 1;"></span>
							<?php esc_html_e( 'Urkunden-Vorschau öffnen', 'ha-bpmn-manager' ); ?>
						</button>
					</div>

					<?php if ( empty( $settings['module_quest'] ) ) : ?>
					<div class="ha-card" style="background: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; margin-bottom: 20px; padding: 14px 18px;">
						<p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.5;">
							<strong><?php esc_html_e( 'Notice:', 'ha-bpmn-manager' ); ?></strong>
							<?php esc_html_e( 'The Interactive Guide & BPMN-Quest (Tutorial) is currently disabled under „Modeler & Studio Tools“. Your certificate styling and signature settings remain safely saved and will be used as soon as the quest module is re-enabled.', 'ha-bpmn-manager' ); ?>
						</p>
					</div>
					<?php endif; ?>

					<!-- Card 1: Aussteller & Institution -->
					<div class="ha-card">
						<div class="ha-card-header">
							<h2><?php esc_html_e( 'Aussteller, Institution & Governance', 'ha-bpmn-manager' ); ?></h2>
							<p><?php esc_html_e( 'Konfiguriere den Namen der Akademie/Organisation sowie den offiziellen Governance-Schriftzug auf der Meister-Urkunde.', 'ha-bpmn-manager' ); ?></p>
						</div>
						<div class="ha-card-body">
							<div class="ha-setting-row">
								<div class="ha-setting-info">
									<label class="ha-setting-label" for="cert_header_title">
										<?php esc_html_e( 'Name der Organisation / Kopfzeile', 'ha-bpmn-manager' ); ?>
									</label>
									<p class="ha-setting-desc">
										<?php esc_html_e( 'Erscheint in Großbuchstaben ganz oben auf der Urkunde. Leer lassen für Standard („GILDE DER PROZESSMEISTER • QM & ISO-19510 GOVERNANCE“).', 'ha-bpmn-manager' ); ?>
									</p>
								</div>
								<div class="ha-setting-control">
									<input type="text" id="cert_header_title" name="ha_bpmn_settings[cert_header_title]" value="<?php echo esc_attr( $settings['cert_header_title'] ); ?>" class="regular-text" placeholder="<?php echo esc_attr__( 'e.g. ACME PROCESS ACADEMY • CENTER OF EXCELLENCE', 'ha-bpmn-manager' ); ?>" />
								</div>
							</div>

							<div class="ha-setting-row">
								<div class="ha-setting-info">
									<label class="ha-setting-label" for="cert_authority_text">
										<?php esc_html_e( 'Governance-Schriftzug / Prüfstelle', 'ha-bpmn-manager' ); ?>
									</label>
									<p class="ha-setting-desc">
										<?php esc_html_e( 'Schriftzug unter der Hauptunterschrift (z. B. „HA-BPMN Guild Governance“ oder „Enterprise Architecture Board“).', 'ha-bpmn-manager' ); ?>
									</p>
								</div>
								<div class="ha-setting-control">
									<input type="text" id="cert_authority_text" name="ha_bpmn_settings[cert_authority_text]" value="<?php echo esc_attr( $settings['cert_authority_text'] ); ?>" class="regular-text" placeholder="<?php echo esc_attr__( 'HA-BPMN Guild Governance', 'ha-bpmn-manager' ); ?>" />
								</div>
							</div>

							<div class="ha-setting-row">
								<div class="ha-setting-info">
									<label class="ha-setting-label" for="cert_id_prefix">
										<?php esc_html_e( 'Zertifikats-ID Präfix', 'ha-bpmn-manager' ); ?>
									</label>
									<p class="ha-setting-desc">
										<?php esc_html_e( 'Kürzel vor der generierten Verifikationsnummer (z. B. „HA-BPMN-“ oder „CORP-CERT-“).', 'ha-bpmn-manager' ); ?>
									</p>
								</div>
								<div class="ha-setting-control">
									<input type="text" id="cert_id_prefix" name="ha_bpmn_settings[cert_id_prefix]" value="<?php echo esc_attr( $settings['cert_id_prefix'] ); ?>" class="regular-text" placeholder="<?php echo esc_attr__( 'HA-BPMN-', 'ha-bpmn-manager' ); ?>" />
								</div>
							</div>
						</div>
					</div>

					<!-- Card 2: Titel, Untertitel & Widmung -->
					<div class="ha-card">
						<div class="ha-card-header">
							<h2><?php esc_html_e( 'Urkunden-Titel, Anrede & Widmungstext', 'ha-bpmn-manager' ); ?></h2>
							<p><?php esc_html_e( 'Passe den Haupttitel, die persönliche Widmung und die Darstellung der Leistungs-Badges an.', 'ha-bpmn-manager' ); ?></p>
						</div>
						<div class="ha-card-body">
							<div class="ha-setting-row">
								<div class="ha-setting-info">
									<label class="ha-setting-label" for="cert_title_mode">
										<?php esc_html_e( 'Titel-Modus', 'ha-bpmn-manager' ); ?>
									</label>
									<p class="ha-setting-desc">
										<?php esc_html_e( 'Wähle, ob der Urkundentitel dynamisch nach erreichter Quest-Ehrenstufe vergeben wird (gamifiziert) oder als fester Unternehmenstitel.', 'ha-bpmn-manager' ); ?>
									</p>
								</div>
								<div class="ha-setting-control">
									<select id="cert_title_mode" name="ha_bpmn_settings[cert_title_mode]" class="regular-text">
										<option value="dynamic" <?php selected( 'dynamic', $settings['cert_title_mode'] ); ?>><?php esc_html_e( '🏆 Dynamisch nach Ehrenstufe (Titanen-Großmeister, Meister-Architekt, etc.)', 'ha-bpmn-manager' ); ?></option>
										<option value="custom" <?php selected( 'custom', $settings['cert_title_mode'] ); ?>><?php esc_html_e( '🏢 Fester individueller Titel (z. B. Zertifikat für BPMN 2.0 Prozessmodellierung)', 'ha-bpmn-manager' ); ?></option>
									</select>
								</div>
							</div>

							<div class="ha-setting-row">
								<div class="ha-setting-info">
									<label class="ha-setting-label" for="cert_custom_title">
										<?php esc_html_e( 'Individueller Urkunden-Haupttitel', 'ha-bpmn-manager' ); ?>
									</label>
									<p class="ha-setting-desc">
										<?php esc_html_e( 'Gilt bei Titel-Modus „Fester individueller Titel“ oder überschreibt den Standardtitel.', 'ha-bpmn-manager' ); ?>
									</p>
								</div>
								<div class="ha-setting-control">
									<input type="text" id="cert_custom_title" name="ha_bpmn_settings[cert_custom_title]" value="<?php echo esc_attr( $settings['cert_custom_title'] ); ?>" class="regular-text" placeholder="<?php echo esc_attr__( 'e.g. CERTIFICATE OF PROCESS MODELING', 'ha-bpmn-manager' ); ?>" />
								</div>
							</div>

							<div class="ha-setting-row">
								<div class="ha-setting-info">
									<label class="ha-setting-label" for="cert_custom_subtitle">
										<?php esc_html_e( 'Individueller Untertitel', 'ha-bpmn-manager' ); ?>
									</label>
									<p class="ha-setting-desc">
										<?php esc_html_e( 'Optionaler Untertitel unter dem Haupttitel. Leer lassen für Standard (Prädikat & Gildenzeugnis).', 'ha-bpmn-manager' ); ?>
									</p>
								</div>
								<div class="ha-setting-control">
									<input type="text" id="cert_custom_subtitle" name="ha_bpmn_settings[cert_custom_subtitle]" value="<?php echo esc_attr( $settings['cert_custom_subtitle'] ); ?>" class="regular-text" placeholder="<?php echo esc_attr__( 'e.g. Verification of practical modeling competence compliant with ISO 19510', 'ha-bpmn-manager' ); ?>" />
								</div>
							</div>

							<div class="ha-setting-row">
								<div class="ha-setting-info">
									<label class="ha-setting-label" for="cert_intro_text">
										<?php esc_html_e( 'Einleitungs-Formel (Anrede)', 'ha-bpmn-manager' ); ?>
									</label>
									<p class="ha-setting-desc">
										<?php esc_html_e( 'Textzeile vor dem Namen des Empfängers (Standard: „Hiermit wird feierlich verliehen an:“).', 'ha-bpmn-manager' ); ?>
									</p>
								</div>
								<div class="ha-setting-control">
									<input type="text" id="cert_intro_text" name="ha_bpmn_settings[cert_intro_text]" value="<?php echo esc_attr( $settings['cert_intro_text'] ); ?>" class="regular-text" placeholder="<?php echo esc_attr__( 'This diploma is proudly conferred upon:', 'ha-bpmn-manager' ); ?>" />
								</div>
							</div>

							<div class="ha-setting-row">
								<div class="ha-setting-info">
									<label class="ha-setting-label" for="cert_custom_dedication">
										<?php esc_html_e( 'Benutzerdefinierte Würdigung (Laudatio)', 'ha-bpmn-manager' ); ?>
									</label>
									<p class="ha-setting-desc">
										<?php esc_html_e( 'Eigener Würdigungstext. Leer lassen, um die automatische Zusammenfassung der gelösten Aufgaben und Linter-Puzzles zu nutzen.', 'ha-bpmn-manager' ); ?>
									</p>
								</div>
								<div class="ha-setting-control">
									<textarea id="cert_custom_dedication" name="ha_bpmn_settings[cert_custom_dedication]" rows="3" class="regular-text" placeholder="<?php echo esc_attr__( 'In recognition of outstanding modeling competence and successful completion of all BPMN practical modules.', 'ha-bpmn-manager' ); ?>"><?php echo esc_textarea( $settings['cert_custom_dedication'] ); ?></textarea>
								</div>
							</div>

							<div class="ha-setting-row">
								<div class="ha-setting-info">
									<label class="ha-setting-label" for="cert_show_badges">
										<?php esc_html_e( 'Gamification-Badges anzeigen', 'ha-bpmn-manager' ); ?>
									</label>
									<p class="ha-setting-desc">
										<?php esc_html_e( 'Zeigt die 3 Leistungs-Pillen (🏛️ Kapitel, ⭐ XP-Score, 🧩 Linter-Rätsel) auf der Urkunde an. Deaktivieren für einen rein formellen Look.', 'ha-bpmn-manager' ); ?>
									</p>
								</div>
								<div class="ha-setting-control">
									<label class="ha-switch">
										<input type="checkbox" id="cert_show_badges" name="ha_bpmn_settings[cert_show_badges]" value="1" <?php checked( '1', $settings['cert_show_badges'] ); ?> />
										<span class="ha-slider"></span>
									</label>
								</div>
							</div>
						</div>
					</div>

					<!-- Card 3: Unterschriften -->
					<div class="ha-card">
						<div class="ha-card-header">
							<h2><?php esc_html_e( 'Unterschriften & Unterzeichner (Single / Dual Signature)', 'ha-bpmn-manager' ); ?></h2>
							<p><?php esc_html_e( 'Lade eigene Unterschriften-Bilder hoch (transparente PNGs oder SVGs) oder nutze die integrierten Vektor-Kalligraphien.', 'ha-bpmn-manager' ); ?></p>
						</div>
						<div class="ha-card-body">
							<div class="ha-setting-row">
								<div class="ha-setting-info">
									<label class="ha-setting-label" for="cert_signature_mode">
										<?php esc_html_e( 'Unterschriften-Modus', 'ha-bpmn-manager' ); ?>
									</label>
									<p class="ha-setting-desc">
										<?php esc_html_e( 'Wähle zwischen einer einzelnen Unterschrift (rechts) oder doppelter Unterschrift (links Prüfer/Trainer, rechts Leitung/Gildenmeister).', 'ha-bpmn-manager' ); ?>
									</p>
								</div>
								<div class="ha-setting-control">
									<select id="cert_signature_mode" name="ha_bpmn_settings[cert_signature_mode]" class="regular-text">
										<option value="single" <?php selected( 'single', $settings['cert_signature_mode'] ); ?>><?php esc_html_e( '✍️ Einzel-Unterschrift (Rechts, Standard)', 'ha-bpmn-manager' ); ?></option>
										<option value="dual" <?php selected( 'dual', $settings['cert_signature_mode'] ); ?>><?php esc_html_e( '✍️✍️ Doppel-Unterschrift (Links Prüfer/Trainer, Rechts Leitung)', 'ha-bpmn-manager' ); ?></option>
									</select>
								</div>
							</div>

							<!-- Unterzeichner 1 (Hauptunterzeichner / Rechts) -->
							<h4 style="margin-top: 16px; margin-bottom: 8px; color: #1e293b;"><?php esc_html_e( '1. Hauptunterzeichner (Rechts)', 'ha-bpmn-manager' ); ?></h4>

							<div class="ha-setting-row">
								<div class="ha-setting-info">
									<label class="ha-setting-label" for="cert_signature_image">
										<?php esc_html_e( 'Unterschrift 1 (Bilddatei)', 'ha-bpmn-manager' ); ?>
									</label>
									<p class="ha-setting-desc">
										<?php esc_html_e( 'Empfohlen: Transparente PNG- oder SVG-Grafik der handgeschriebenen Unterschrift. Leer lassen für elegante Vektor-Kalligraphie.', 'ha-bpmn-manager' ); ?>
									</p>
								</div>
								<div class="ha-setting-control" style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
									<input type="text" id="cert_signature_image" name="ha_bpmn_settings[cert_signature_image]" value="<?php echo esc_url( $settings['cert_signature_image'] ); ?>" class="regular-text ha-media-url-input" />
									<button type="button" class="button ha-btn-upload-media" data-target="cert_signature_image" data-preview="preview_cert_signature_image">
										<?php esc_html_e( 'Bild auswählen', 'ha-bpmn-manager' ); ?>
									</button>
									<button type="button" class="button ha-btn-remove-media" data-target="cert_signature_image" data-preview="preview_cert_signature_image">
										<?php esc_html_e( 'Entfernen', 'ha-bpmn-manager' ); ?>
									</button>
									<img id="preview_cert_signature_image" src="<?php echo esc_url( $settings['cert_signature_image'] ); ?>" style="max-height: 38px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px; background: #fff; <?php echo empty( $settings['cert_signature_image'] ) ? 'display:none;' : ''; ?>" alt="Preview" />
								</div>
							</div>

							<div class="ha-setting-row">
								<div class="ha-setting-info">
									<label class="ha-setting-label" for="cert_signer_name">
										<?php esc_html_e( 'Name des 1. Unterzeichners', 'ha-bpmn-manager' ); ?>
									</label>
									<p class="ha-setting-desc">
										<?php esc_html_e( 'Optionaler Name der unterzeichnenden Person (z. B. „Dr. Alexander Brand“).', 'ha-bpmn-manager' ); ?>
									</p>
								</div>
								<div class="ha-setting-control">
									<input type="text" id="cert_signer_name" name="ha_bpmn_settings[cert_signer_name]" value="<?php echo esc_attr( $settings['cert_signer_name'] ); ?>" class="regular-text" placeholder="<?php echo esc_attr__( 'e.g. Dr. Alexander Brand', 'ha-bpmn-manager' ); ?>" />
								</div>
							</div>

							<div class="ha-setting-row">
								<div class="ha-setting-info">
									<label class="ha-setting-label" for="cert_signer_title">
										<?php esc_html_e( 'Titel / Funktion des 1. Unterzeichners', 'ha-bpmn-manager' ); ?>
									</label>
									<p class="ha-setting-desc">
										<?php esc_html_e( 'Funktionsbezeichnung (Standard: „Der Gildenmeister“).', 'ha-bpmn-manager' ); ?>
									</p>
								</div>
								<div class="ha-setting-control">
									<input type="text" id="cert_signer_title" name="ha_bpmn_settings[cert_signer_title]" value="<?php echo esc_attr( $settings['cert_signer_title'] ); ?>" class="regular-text" placeholder="<?php echo esc_attr__( 'The Guild Master', 'ha-bpmn-manager' ); ?>" />
								</div>
							</div>

							<!-- Unterzeichner 2 (Zweitunterzeichner / Links für Dual-Modus) -->
							<h4 style="margin-top: 24px; margin-bottom: 8px; color: #1e293b;"><?php esc_html_e( '2. Zweitunterzeichner (Links bei Doppelunterschrift)', 'ha-bpmn-manager' ); ?></h4>

							<div class="ha-setting-row">
								<div class="ha-setting-info">
									<label class="ha-setting-label" for="cert_signature_image_2">
										<?php esc_html_e( 'Unterschrift 2 (Bilddatei)', 'ha-bpmn-manager' ); ?>
									</label>
									<p class="ha-setting-desc">
										<?php esc_html_e( 'Grafik der Zweitunterschrift (z. B. Trainer oder Prüfer).', 'ha-bpmn-manager' ); ?>
									</p>
								</div>
								<div class="ha-setting-control" style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
									<input type="text" id="cert_signature_image_2" name="ha_bpmn_settings[cert_signature_image_2]" value="<?php echo esc_url( $settings['cert_signature_image_2'] ); ?>" class="regular-text ha-media-url-input" />
									<button type="button" class="button ha-btn-upload-media" data-target="cert_signature_image_2" data-preview="preview_cert_signature_image_2">
										<?php esc_html_e( 'Bild auswählen', 'ha-bpmn-manager' ); ?>
									</button>
									<button type="button" class="button ha-btn-remove-media" data-target="cert_signature_image_2" data-preview="preview_cert_signature_image_2">
										<?php esc_html_e( 'Entfernen', 'ha-bpmn-manager' ); ?>
									</button>
									<img id="preview_cert_signature_image_2" src="<?php echo esc_url( $settings['cert_signature_image_2'] ); ?>" style="max-height: 38px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px; background: #fff; <?php echo empty( $settings['cert_signature_image_2'] ) ? 'display:none;' : ''; ?>" alt="Preview" />
								</div>
							</div>

							<div class="ha-setting-row">
								<div class="ha-setting-info">
									<label class="ha-setting-label" for="cert_signer_name_2">
										<?php esc_html_e( 'Name des 2. Unterzeichners', 'ha-bpmn-manager' ); ?>
									</label>
									<p class="ha-setting-desc">
										<?php esc_html_e( 'Name des Trainers / Zweitprüfers (z. B. „Prof. Dr. M. Weber“).', 'ha-bpmn-manager' ); ?>
									</p>
								</div>
								<div class="ha-setting-control">
									<input type="text" id="cert_signer_name_2" name="ha_bpmn_settings[cert_signer_name_2]" value="<?php echo esc_attr( $settings['cert_signer_name_2'] ); ?>" class="regular-text" placeholder="<?php echo esc_attr__( 'e.g. Prof. Dr. M. Weber', 'ha-bpmn-manager' ); ?>" />
								</div>
							</div>

							<div class="ha-setting-row">
								<div class="ha-setting-info">
									<label class="ha-setting-label" for="cert_signer_title_2">
										<?php esc_html_e( 'Titel / Funktion des 2. Unterzeichners', 'ha-bpmn-manager' ); ?>
									</label>
									<p class="ha-setting-desc">
										<?php esc_html_e( 'Funktion des Zweitprüfers (z. B. „Leitender BPMN-Trainer & Prüfer“).', 'ha-bpmn-manager' ); ?>
									</p>
								</div>
								<div class="ha-setting-control">
									<input type="text" id="cert_signer_title_2" name="ha_bpmn_settings[cert_signer_title_2]" value="<?php echo esc_attr( $settings['cert_signer_title_2'] ); ?>" class="regular-text" placeholder="<?php echo esc_attr__( 'BPMN Trainer & Examiner', 'ha-bpmn-manager' ); ?>" />
								</div>
							</div>
						</div>
					</div>

					<!-- Card 4: Siegel, Logo & Wasserzeichen -->
					<div class="ha-card">
						<div class="ha-card-header">
							<h2><?php esc_html_e( 'Offizielles Siegel, Stempel & Wasserzeichen', 'ha-bpmn-manager' ); ?></h2>
							<p><?php esc_html_e( 'Lade ein offizielles Firmen-Siegel, Akademie-Wappen oder ein zartes Hintergrund-Wasserzeichen hoch.', 'ha-bpmn-manager' ); ?></p>
						</div>
						<div class="ha-card-body">
							<div class="ha-setting-row">
								<div class="ha-setting-info">
									<label class="ha-setting-label" for="cert_seal_image">
										<?php esc_html_e( 'Offizielles Siegel / Stempel / Logo', 'ha-bpmn-manager' ); ?>
									</label>
									<p class="ha-setting-desc">
										<?php esc_html_e( 'Kreisrundes Firmen- oder Akademie-Siegel. Leer lassen für das dynamische Ehrenstufen-Medaillon mit BPMN-Prägung.', 'ha-bpmn-manager' ); ?>
									</p>
								</div>
								<div class="ha-setting-control" style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
									<input type="text" id="cert_seal_image" name="ha_bpmn_settings[cert_seal_image]" value="<?php echo esc_url( $settings['cert_seal_image'] ); ?>" class="regular-text ha-media-url-input" />
									<button type="button" class="button ha-btn-upload-media" data-target="cert_seal_image" data-preview="preview_cert_seal_image">
										<?php esc_html_e( 'Bild auswählen', 'ha-bpmn-manager' ); ?>
									</button>
									<button type="button" class="button ha-btn-remove-media" data-target="cert_seal_image" data-preview="preview_cert_seal_image">
										<?php esc_html_e( 'Entfernen', 'ha-bpmn-manager' ); ?>
									</button>
									<img id="preview_cert_seal_image" src="<?php echo esc_url( $settings['cert_seal_image'] ); ?>" style="max-height: 48px; border: 1px solid #cbd5e1; border-radius: 50%; padding: 2px; background: #fff; <?php echo empty( $settings['cert_seal_image'] ) ? 'display:none;' : ''; ?>" alt="Seal Preview" />
								</div>
							</div>

							<div class="ha-setting-row">
								<div class="ha-setting-info">
									<label class="ha-setting-label" for="cert_watermark_image">
										<?php esc_html_e( 'Hintergrund-Wasserzeichen (Optional)', 'ha-bpmn-manager' ); ?>
									</label>
									<p class="ha-setting-desc">
										<?php esc_html_e( 'Wird zentriert im Hintergrund der Urkunde mit dezenter Transparenz (ca. 5%) hinter dem Text platziert.', 'ha-bpmn-manager' ); ?>
									</p>
								</div>
								<div class="ha-setting-control" style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
									<input type="text" id="cert_watermark_image" name="ha_bpmn_settings[cert_watermark_image]" value="<?php echo esc_url( $settings['cert_watermark_image'] ); ?>" class="regular-text ha-media-url-input" />
									<button type="button" class="button ha-btn-upload-media" data-target="cert_watermark_image" data-preview="preview_cert_watermark_image">
										<?php esc_html_e( 'Bild auswählen', 'ha-bpmn-manager' ); ?>
									</button>
									<button type="button" class="button ha-btn-remove-media" data-target="cert_watermark_image" data-preview="preview_cert_watermark_image">
										<?php esc_html_e( 'Entfernen', 'ha-bpmn-manager' ); ?>
									</button>
									<img id="preview_cert_watermark_image" src="<?php echo esc_url( $settings['cert_watermark_image'] ); ?>" style="max-height: 48px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px; background: #fff; <?php echo empty( $settings['cert_watermark_image'] ) ? 'display:none;' : ''; ?>" alt="Watermark Preview" />
								</div>
							</div>
						</div>
					</div>

					<!-- Card 5: Farbwelt & Corporate Identity -->
					<div class="ha-card">
						<div class="ha-card-header">
							<h2><?php esc_html_e( 'Farbwelt & Corporate Identity (Themes)', 'ha-bpmn-manager' ); ?></h2>
							<p><?php esc_html_e( 'Passe Rahmen, Verläufe und Ornamente an dein Unternehmens-Farbschema an.', 'ha-bpmn-manager' ); ?></p>
						</div>
						<div class="ha-card-body">
							<div class="ha-setting-row">
								<div class="ha-setting-info">
									<label class="ha-setting-label" for="cert_color_theme">
										<?php esc_html_e( 'Farbschema / Theme', 'ha-bpmn-manager' ); ?>
									</label>
									<p class="ha-setting-desc">
										<?php esc_html_e( 'Wähle ein vordefiniertes Design-Farbschema oder definiere eine eigene Akzentfarbe.', 'ha-bpmn-manager' ); ?>
									</p>
								</div>
								<div class="ha-setting-control">
									<select id="cert_color_theme" name="ha_bpmn_settings[cert_color_theme]" class="regular-text">
										<option value="honor_adaptive" <?php selected( 'honor_adaptive', $settings['cert_color_theme'] ); ?>><?php esc_html_e( '👑 Ehrenstufen-Dynamisch (Titan-Violett, Rubinrot, Gold, Silber, Bronze)', 'ha-bpmn-manager' ); ?></option>
										<option value="classic_gold" <?php selected( 'classic_gold', $settings['cert_color_theme'] ); ?>><?php esc_html_e( '🌟 Zeitloses Gold & Preußischblau (Classic Navy & Gold)', 'ha-bpmn-manager' ); ?></option>
										<option value="corporate_navy" <?php selected( 'corporate_navy', $settings['cert_color_theme'] ); ?>><?php esc_html_e( '🏛️ Corporate Tiefblau & Silber (Modern Enterprise)', 'ha-bpmn-manager' ); ?></option>
										<option value="emerald_green" <?php selected( 'emerald_green', $settings['cert_color_theme'] ); ?>><?php esc_html_e( '🌿 Smaragdgrün & Messing (Excellence Emerald)', 'ha-bpmn-manager' ); ?></option>
										<option value="custom" <?php selected( 'custom', $settings['cert_color_theme'] ); ?>><?php esc_html_e( '🎨 Eigene Akzentfarbe (HEX-Farbwähler)', 'ha-bpmn-manager' ); ?></option>
									</select>
								</div>
							</div>

							<div class="ha-setting-row">
								<div class="ha-setting-info">
									<label class="ha-setting-label" for="cert_custom_color">
										<?php esc_html_e( 'Eigene Akzentfarbe (bei Modus Custom)', 'ha-bpmn-manager' ); ?>
									</label>
									<p class="ha-setting-desc">
										<?php esc_html_e( 'Wähle deinen Unternehmens-Farbcode (Hex-Wert) für den Urkundenrahmen und Akzentlinien.', 'ha-bpmn-manager' ); ?>
									</p>
								</div>
								<div class="ha-setting-control">
									<input type="text" id="cert_custom_color" name="ha_bpmn_settings[cert_custom_color]" value="<?php echo esc_attr( $settings['cert_custom_color'] ); ?>" class="ha-color-picker" data-default-color="#bf953f" />
								</div>
							</div>
						</div>
					</div>
				</div>

				<div class="ha-settings-footer" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
					<div>
						<?php submit_button( __( 'Save All Changes', 'ha-bpmn-manager' ), 'primary large', 'submit', false ); ?>
					</div>
					<div>
						<button type="button" class="button button-secondary button-large ha-btn-preview-cert" style="display: inline-flex; align-items: center; gap: 8px; font-weight: 600;">
							<span class="dashicons dashicons-visibility" style="font-size: 20px; width: 20px; height: 20px; vertical-align: middle; line-height: 1;"></span>
							<?php esc_html_e( 'Urkunden-Vorschau (Live)', 'ha-bpmn-manager' ); ?>
						</button>
					</div>
				</div>
			</form>
		</div>

		<script>
		document.addEventListener('DOMContentLoaded', function() {
			var tabButtons = document.querySelectorAll('.ha-tab-btn');
			var tabContents = document.querySelectorAll('.ha-tab-content');

			function switchTab(tabId) {
				tabButtons.forEach(function(btn) {
					btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
				});
				tabContents.forEach(function(content) {
					content.classList.toggle('active', content.id === tabId);
				});
				if (history.replaceState) {
					var cleanTab = tabId.replace('tab-', '');
					var newUrl = window.location.protocol + '//' + window.location.host + window.location.pathname + window.location.search.replace(/&tab=[^&]*/, '') + '&tab=' + cleanTab;
					history.replaceState(null, null, newUrl);
				}
			}

			tabButtons.forEach(function(btn) {
				btn.addEventListener('click', function() {
					var tabId = this.getAttribute('data-tab');
					switchTab(tabId);
				});
			});

			if (window.jQuery) {
				jQuery(document).ready(function($) {
					if (typeof wp !== 'undefined' && wp.media) {
						$(document).on('click', '.ha-btn-upload-media', function(e) {
							e.preventDefault();
							var btn = $(this);
							var targetInput = $('#' + btn.data('target'));
							var targetPreview = $('#' + btn.data('preview'));

							var frame = wp.media({
								title: 'Bild auswählen',
								button: { text: 'Verwenden' },
								multiple: false
							});

							frame.on('select', function() {
								var attachment = frame.state().get('selection').first().toJSON();
								targetInput.val(attachment.url);
								if (targetPreview.length) {
									targetPreview.attr('src', attachment.url).show();
								}
							});

							frame.open();
						});

						$(document).on('click', '.ha-btn-remove-media', function(e) {
							e.preventDefault();
							var btn = $(this);
							var targetInput = $('#' + btn.data('target'));
							var targetPreview = $('#' + btn.data('preview'));
							targetInput.val('');
							if (targetPreview.length) {
								targetPreview.attr('src', '').hide();
							}
						});
					}

					if ($.fn.wpColorPicker) {
						$('.ha-color-picker').wpColorPicker();
					}

					// Live Certificate Preview Handler
					$(document).on('click', '.ha-btn-preview-cert', function(e) {
						e.preventDefault();
						if (typeof window.haBpmnShowCertificate !== 'function') {
							alert('<?php echo esc_js( __( 'Zertifikats-Modul wird geladen... Bitte einen kurzen Moment warten.', 'ha-bpmn-manager' ) ); ?>');
							return;
						}

						var certConfig = {
							headerTitle: $('#cert_header_title').val() || '',
							authorityText: $('#cert_authority_text').val() || 'HA-BPMN Guild Governance',
							idPrefix: $('#cert_id_prefix').val() || 'HA-BPMN-',
							titleMode: $('#cert_title_mode').val() || 'dynamic',
							customTitle: $('#cert_custom_title').val() || '',
							customSubtitle: $('#cert_custom_subtitle').val() || '',
							introText: $('#cert_intro_text').val() || '',
							customDedication: $('#cert_custom_dedication').val() || '',
							showBadges: $('#cert_show_badges').is(':checked'),
							signatureMode: $('#cert_signature_mode').val() || 'single',
							signatureImage: $('#cert_signature_image').val() || '',
							signerName: $('#cert_signer_name').val() || '',
							signerTitle: $('#cert_signer_title').val() || '',
							signatureImage2: $('#cert_signature_image_2').val() || '',
							signerName2: $('#cert_signer_name_2').val() || '',
							signerTitle2: $('#cert_signer_title_2').val() || '',
							sealImage: $('#cert_seal_image').val() || '',
							watermarkImage: $('#cert_watermark_image').val() || '',
							colorTheme: $('#cert_color_theme').val() || 'honor_adaptive',
							customColor: $('#cert_custom_color').val() || '#bf953f'
						};

						window.haBpmnShowCertificate({
							userName: '<?php echo esc_js( wp_get_current_user()->display_name ?: 'Max Mustermann' ); ?>',
							xp: 2000,
							completedChaptersCount: 6,
							totalChaptersCount: 6,
							completedChallenges: [
								'challenge_orphan',
								'challenge_deadlock',
								'challenge_missing_end',
								'challenge_join_fork',
								'challenge_implicit_split',
								'challenge_duplicate_flows',
								'challenge_missing_start',
								'challenge_double_start'
							],
							totalChallengesCount: 8,
							certificate: certConfig,
							lang: '<?php echo esc_js( substr( get_user_locale(), 0, 2 ) ); ?>'
						});
					});
				});
			}
		});
		</script>
		<?php
	}

	/**
	 * Handle AJAX export of BPMN XML.
	 */
	public function handle_export() {
		$post_id = isset( $_GET['id'] ) ? (int) $_GET['id'] : 0;

		if ( ! $post_id ) {
			wp_die( esc_html__( 'Invalid diagram ID.', 'ha-bpmn-manager' ), 400 );
		}

		check_admin_referer( 'bpmn_export_nonce_' . $post_id );

		if ( ! current_user_can( 'read_post', $post_id ) ) {
			wp_die( esc_html__( 'Permission denied.', 'ha-bpmn-manager' ), 403 );
		}

		$post = get_post( $post_id );
		if ( ! $post || HA_BPMN_POST_TYPE !== $post->post_type ) {
			wp_die( esc_html__( 'Diagram not found.', 'ha-bpmn-manager' ), 404 );
		}

		$content = json_decode( $post->post_content, true );
		$xml     = is_array( $content ) && ! empty( $content['xml'] ) ? $content['xml'] : '';

		if ( empty( $xml ) && ! empty( $post->post_content ) && false !== strpos( $post->post_content, '<bpmn:' ) ) {
			$xml = $post->post_content;
		}

		if ( empty( $xml ) ) {
			$xml = Rest::DEFAULT_BPMN_XML;
		}

		$slug = ! empty( $post->post_name ) ? $post->post_name : 'diagram-' . $post_id;

		if ( ob_get_level() ) {
			ob_end_clean();
		}

		header( 'Content-Description: File Transfer' );
		header( 'Content-Type: application/xml; charset=utf-8' );
		header( 'Content-Disposition: attachment; filename="' . sanitize_file_name( $slug . '.bpmn' ) . '"' );
		header( 'Expires: 0' );
		header( 'Cache-Control: must-revalidate' );
		header( 'Pragma: public' );
		header( 'Content-Length: ' . strlen( $xml ) );

		echo $xml;
		exit;
	}

	/**
	 * AJAX endpoint to update delete_data_on_uninstall preference from deactivation dialog.
	 */
	public function ajax_save_uninstall_setting() {
		check_ajax_referer( 'ha_bpmn_deactivate_nonce', 'nonce' );

		if ( ! current_user_can( 'activate_plugins' ) ) {
			wp_send_json_error( [ 'message' => __( 'Permission denied.', 'ha-bpmn-manager' ) ], 403 );
		}

		$delete_data = ! empty( $_POST['delete_data'] ) ? '1' : '0';
		$settings = self::get_plugin_settings();
		$settings['delete_data_on_uninstall'] = $delete_data;
		update_option( 'ha_bpmn_settings', $settings );

		wp_send_json_success( [ 'saved' => $delete_data ] );
	}

	/**
	 * Add custom columns to admin list table.
	 *
	 * @param array $columns Existing columns.
	 * @return array
	 */
	public function add_custom_columns( $columns ) {
		$settings = self::get_plugin_settings();
		$new_columns = [];
		foreach ( $columns as $key => $title ) {
			$new_columns[ $key ] = $title;
			if ( 'title' === $key ) {
				$new_columns['bpmn_shortcode'] = __( 'Shortcode', 'ha-bpmn-manager' );
				if ( ! empty( $settings['enable_categories'] ) ) {
					$new_columns['bpmn_categories'] = __( 'Categories', 'ha-bpmn-manager' );
				}
				if ( ! empty( $settings['enable_tags'] ) ) {
					$new_columns['bpmn_tags'] = __( 'Tags', 'ha-bpmn-manager' );
				}
			}
		}
		return $new_columns;
	}

	/**
	 * Populate custom columns in admin list table.
	 *
	 * @param string $column  Column identifier.
	 * @param int    $post_id Post ID.
	 */
	public function populate_custom_columns( $column, $post_id ) {
		if ( 'bpmn_shortcode' === $column ) {
			echo '<code>[bpmnm id="' . (int) $post_id . '"]</code>';
		} elseif ( 'bpmn_categories' === $column ) {
			$terms = get_the_terms( $post_id, 'category' );
			if ( ! empty( $terms ) && ! is_wp_error( $terms ) ) {
				$links = [];
				foreach ( $terms as $term ) {
					$url = add_query_arg(
						[
							'post_type'     => HA_BPMN_POST_TYPE,
							'category_name' => $term->slug,
						],
						admin_url( 'edit.php' )
					);
					$links[] = '<a href="' . esc_url( $url ) . '">' . esc_html( $term->name ) . '</a>';
				}
				echo implode( ', ', $links );
			} else {
				echo '<span style="color: #a7aaad;">—</span>';
			}
		} elseif ( 'bpmn_tags' === $column ) {
			$terms = get_the_terms( $post_id, 'post_tag' );
			if ( ! empty( $terms ) && ! is_wp_error( $terms ) ) {
				$links = [];
				foreach ( $terms as $term ) {
					$url = add_query_arg(
						[
							'post_type' => HA_BPMN_POST_TYPE,
							'tag'       => $term->slug,
						],
						admin_url( 'edit.php' )
					);
					$links[] = '<a href="' . esc_url( $url ) . '">' . esc_html( $term->name ) . '</a>';
				}
				echo implode( ', ', $links );
			} else {
				echo '<span style="color: #a7aaad;">—</span>';
			}
		}
	}

	/**
	 * Add Export and View row actions in list table.
	 *
	 * @param array    $actions Existing row actions.
	 * @param \WP_Post $post    Current post object.
	 * @return array
	 */
	public function add_row_actions( $actions, $post ) {
		if ( HA_BPMN_POST_TYPE === $post->post_type ) {
			$export_url = add_query_arg(
				[
					'action'   => 'bpmn_export',
					'id'       => $post->ID,
					'_wpnonce' => wp_create_nonce( 'bpmn_export_nonce_' . $post->ID ),
				],
				admin_url( 'admin-ajax.php' )
			);

			$actions['export'] = '<a href="' . esc_url( $export_url ) . '">' . esc_html__( 'Export BPMN', 'ha-bpmn-manager' ) . '</a>';

			if ( 'publish' === $post->post_status ) {
				$actions['view'] = '<a href="' . esc_url( get_permalink( $post->ID ) ) . '" target="_blank">' . esc_html__( 'View in Frontend', 'ha-bpmn-manager' ) . '</a>';
			}
		}
		return $actions;
	}

	/**
	 * Saves cached SVG diagram representation and metadata on post save.
	 *
	 * @param int      $post_id Post ID.
	 * @param \WP_Post $post    Post object.
	 */
	public function save_diagram_meta( $post_id, $post ) {
		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			return;
		}

		if ( ! isset( $_POST['bpmn_save_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['bpmn_save_nonce'] ) ), 'bpmn_save_action' ) ) {
			return;
		}

		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}

		if ( isset( $_POST['bpmn_svg_cache'] ) ) {
			$raw_svg = wp_unslash( $_POST['bpmn_svg_cache'] );
			if ( false !== strpos( $raw_svg, '<svg' ) && false === stripos( $raw_svg, '<script' ) ) {
				update_post_meta( $post_id, '_ha_bpmn_svg_cache', $raw_svg );
			}
		}
	}
}
