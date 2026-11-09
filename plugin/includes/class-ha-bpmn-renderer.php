<?php
/**
 * Frontend and Shortcode Rendering for HA-BPMN-Manager.
 *
 * @package HA_BPMN_Manager
 */

namespace HA_BPMN;

defined( 'ABSPATH' ) || exit;

/**
 * Renders diagram containers for shortcodes and templates with multi-instance support.
 */
class Renderer {

	/**
	 * Unique counter for generating distinct instance IDs on a single page.
	 *
	 * @var int
	 */
	private static $instance_counter = 0;

	/**
	 * Instance of this class.
	 *
	 * @var Renderer|null
	 */
	private static $instance = null;

	/**
	 * Returns the singleton instance.
	 *
	 * @return Renderer
	 */
	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Constructor. Registers shortcodes and template filters.
	 */
	private function __construct() {
		add_shortcode( 'bpmnm', [ $this, 'render_shortcode' ] );
		add_shortcode( 'bpmn', [ $this, 'render_shortcode' ] );

		add_filter( 'single_template', [ $this, 'filter_single_template' ] );
	}

	/**
	 * Shortcode callback handler.
	 *
	 * @param array|string $atts Shortcode attributes.
	 * @return string HTML output.
	 */
	public function render_shortcode( $atts ) {
		$settings  = CPT::get_plugin_settings();
		$default_h = ! empty( $settings['frontend_default_height'] ) ? (int) $settings['frontend_default_height'] . 'px' : '600px';

		$parsed = shortcode_atts(
			[
				'id'         => 0,
				'height'     => $default_h,
				'fullscreen' => 'true',
				'mode'       => 'interactive',
				'active'     => '',
				'completed'  => '',
				'search'     => 'true',
				'drawer'     => 'true',
			],
			$atts,
			'bpmnm'
		);

		$diagram_id = (int) $parsed['id'];
		if ( ! $diagram_id ) {
			$diagram_id = get_the_ID();
		}

		if ( ! $diagram_id ) {
			return '<!-- HA-BPMN-Manager: No valid diagram ID provided -->';
		}

		$mode = strtolower( trim( $parsed['mode'] ) );
		$is_static = ( 'static' === $mode || 'svg' === $mode );

		// Only enqueue full JS bundle if interactive mode
		if ( ! $is_static ) {
			Assets::instance()->enqueue_frontend_assets( true );
		} else {
			// Enqueue lightweight frontend CSS only
			wp_enqueue_style( 'ha-bpmn-frontend', HA_BPMN_URL . 'assets/css/frontend.css', [], Assets::get_asset_version( 'assets/css/frontend.css' ) );
		}

		return $this->render_diagram(
			$diagram_id,
			$parsed['height'],
			'false' !== $parsed['fullscreen'],
			$mode,
			$parsed['active'],
			$parsed['completed'],
			'false' !== $parsed['search'],
			'false' !== $parsed['drawer']
		);
	}

	/**
	 * Callback handler for Gutenberg block rendering.
	 *
	 * @param array $attributes Block attributes.
	 * @return string HTML output.
	 */
	public function render_block( $attributes ) {
		$diagram_id = isset( $attributes['diagramId'] ) ? (int) $attributes['diagramId'] : 0;
		if ( ! $diagram_id ) {
			return '<div class="ha-bpmn-block-notice">' . esc_html__( 'Please select a BPMN diagram in the block sidebar.', 'ha-bpmn-manager' ) . '</div>';
		}

		$height     = ! empty( $attributes['height'] ) ? $attributes['height'] : '600px';
		$fullscreen = ! isset( $attributes['fullscreen'] ) || ! empty( $attributes['fullscreen'] );
		$mode       = ! empty( $attributes['mode'] ) ? $attributes['mode'] : 'interactive';
		$active     = ! empty( $attributes['activeSteps'] ) ? $attributes['activeSteps'] : '';
		$completed  = ! empty( $attributes['completedSteps'] ) ? $attributes['completedSteps'] : '';
		$search     = ! isset( $attributes['search'] ) || ! empty( $attributes['search'] );
		$drawer     = ! isset( $attributes['drawer'] ) || ! empty( $attributes['drawer'] );

		if ( 'static' !== $mode && 'svg' !== $mode ) {
			Assets::instance()->enqueue_frontend_assets( true );
		} else {
			wp_enqueue_style( 'ha-bpmn-frontend', HA_BPMN_URL . 'assets/css/frontend.css', [], Assets::get_asset_version( 'assets/css/frontend.css' ) );
		}

		return $this->render_diagram(
			$diagram_id,
			$height,
			$fullscreen,
			$mode,
			$active,
			$completed,
			$search,
			$drawer
		);
	}

	/**
	 * Render diagram container HTML with multi-instance support.
	 *
	 * @param int    $diagram_id  Diagram post ID.
	 * @param string $height      CSS height value (e.g. '600px').
	 * @param bool   $fullscreen  Whether to include fullscreen toggle button.
	 * @param string $mode        Render mode ('interactive' or 'static').
	 * @param string $active      Comma-separated list of active step IDs.
	 * @param string $completed   Comma-separated list of completed step IDs.
	 * @param bool   $search      Whether to include search toolbar.
	 * @param bool   $drawer      Whether interactive task drawer is enabled.
	 * @return string HTML output.
	 */
	public function render_diagram(
		$diagram_id,
		$height = '600px',
		$fullscreen = true,
		$mode = 'interactive',
		$active = '',
		$completed = '',
		$search = true,
		$drawer = true
	) {
		$post = get_post( $diagram_id );
		if ( ! $post ) {
			return '<!-- HA-BPMN-Manager: Diagram not found -->';
		}

		if ( post_password_required( $post ) ) {
			return get_the_password_form( $post );
		}

		self::$instance_counter++;
		$unique_id = 'ha-bpmn-' . (int) $diagram_id . '-' . self::$instance_counter;
		$endpoint  = rest_url( 'ha-bpmn/v1/diagram/' . (int) $diagram_id );
		$title     = get_the_title( $diagram_id );

		// Validate height string to prevent CSS injection (allow px, vh, rem, em, %)
		if ( preg_match( '/^(\d+(?:\.\d+)?)(px|vh|rem|em|%)?$/i', trim( $height ), $matches ) ) {
			$clean_height = $matches[1] . ( ! empty( $matches[2] ) ? strtolower( $matches[2] ) : 'px' );
		} else {
			$clean_height = '600px';
		}

		// Check Static SVG Mode
		if ( 'static' === $mode || 'svg' === $mode ) {
			$cached_svg = get_post_meta( $diagram_id, '_ha_bpmn_svg_cache', true );
			if ( ! empty( $cached_svg ) ) {
				ob_start();
				?>
				<div class="ha-bpmn-static-wrap"
					 id="<?php echo esc_attr( $unique_id ); ?>"
					 style="height: <?php echo esc_attr( $clean_height ); ?>; width: 100%; overflow: auto; display: flex; align-items: center; justify-content: center; background: #fafafa; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; box-sizing: border-box;">
					<?php echo $cached_svg; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
				</div>
				<?php
				return ob_get_clean();
			}
		}

		$settings       = CPT::get_plugin_settings();
		$allow_download = ! empty( $settings['frontend_allow_download'] );
		$allow_zoom     = ! empty( $settings['frontend_allow_zoom'] );

		ob_start();
		?>
		<div class="ha-bpmn-viewer-wrap"
			 id="<?php echo esc_attr( $unique_id ); ?>"
			 data-diagram-id="<?php echo esc_attr( $diagram_id ); ?>"
			 data-endpoint="<?php echo esc_url( $endpoint ); ?>"
			 data-is-admin="0"
			 data-title="<?php echo esc_attr( $title ); ?>"
			 data-active-steps="<?php echo esc_attr( $active ); ?>"
			 data-completed-steps="<?php echo esc_attr( $completed ); ?>"
			 data-drawer="<?php echo esc_attr( $drawer ? '1' : '0' ); ?>">

			<div class="ha-bpmn-canvas"
				 id="canvas-<?php echo esc_attr( $unique_id ); ?>"
				 style="height: <?php echo esc_attr( $clean_height ); ?>;">
			</div>

			<div class="ha-bpmn-viewer-controls">
				<?php if ( $allow_zoom ) : ?>
					<div class="btn-group nav-group">
						<button type="button" class="ha-bpmn-btn ha-btn-zoom-in" title="<?php esc_attr_e( 'Zoom in', 'ha-bpmn-manager' ); ?>">+</button>
						<button type="button" class="ha-bpmn-btn ha-btn-zoom-reset" title="<?php esc_attr_e( 'Fit to screen', 'ha-bpmn-manager' ); ?>">&#x2316;</button>
						<button type="button" class="ha-bpmn-btn ha-btn-zoom-out" title="<?php esc_attr_e( 'Zoom out', 'ha-bpmn-manager' ); ?>">-</button>
					</div>
				<?php endif; ?>
				<div class="btn-group action-group">
					<?php if ( $search ) : ?>
						<button type="button" class="ha-bpmn-btn ha-btn-search" title="<?php esc_attr_e( 'Search diagram', 'ha-bpmn-manager' ); ?>">🔍</button>
					<?php endif; ?>
					<?php if ( $allow_download ) : ?>
						<button type="button" class="ha-bpmn-btn ha-btn-download-svg" title="<?php esc_attr_e( 'Download SVG', 'ha-bpmn-manager' ); ?>">↓ SVG</button>
						<button type="button" class="ha-bpmn-btn ha-btn-download-png" title="<?php esc_attr_e( 'Download PNG', 'ha-bpmn-manager' ); ?>">↓ PNG</button>
						<button type="button" class="ha-bpmn-btn ha-btn-download-bpmn" title="<?php esc_attr_e( 'Download BPMN', 'ha-bpmn-manager' ); ?>">↓ BPMN</button>
					<?php endif; ?>
					<?php if ( $fullscreen ) : ?>
						<button type="button" class="ha-bpmn-btn ha-btn-fullscreen" title="<?php esc_attr_e( 'Fullscreen', 'ha-bpmn-manager' ); ?>">⛶</button>
					<?php endif; ?>
				</div>
			</div>
		</div>
		<?php
		return ob_get_clean();
	}

	/**
	 * Filters the single template to load the plugin template if theme does not override it.
	 *
	 * @param string $template Path to current template.
	 * @return string Filtered template path.
	 */
	public function filter_single_template( $template ) {
		if ( is_singular( HA_BPMN_POST_TYPE ) ) {
			// Check if theme has an override
			$theme_template = locate_template( [ 'single-bpmnm.php', 'single-' . HA_BPMN_POST_TYPE . '.php' ] );
			if ( ! empty( $theme_template ) ) {
				return $theme_template;
			}

			// Fallback to plugin template
			$plugin_template = HA_BPMN_PATH . 'templates/single-bpmnm.php';
			if ( file_exists( $plugin_template ) ) {
				return $plugin_template;
			}
		}

		return $template;
	}
}
