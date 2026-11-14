<?php
/**
 * REST API Controller for HA-BPMN-Manager.
 *
 * @package HA_BPMN_Manager
 */

namespace HA_BPMN;

defined( 'ABSPATH' ) || exit;

/**
 * Handles custom REST API routes for BPMN diagram retrieval.
 */
class Rest {

	/**
	 * Default fallback BPMN 2.0 XML string.
	 *
	 * @var string
	 */
	const DEFAULT_BPMN_XML = '<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  id="Definitions_1"
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="179" y="99" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>';

	/**
	 * Register the REST API route under the plugin namespace.
	 */
	public static function register_routes() {
		register_rest_route(
			'ha-bpmn/v1',
			'/diagram/(?P<id>\d+)',
			[
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => [ __CLASS__, 'get_diagram' ],
				'permission_callback' => [ __CLASS__, 'check_permission' ],
				'args'                => [
					'id' => [
						'validate_callback' => function( $param ) {
							return is_numeric( $param ) && (int) $param > 0;
						},
						'sanitize_callback' => 'absint',
					],
				],
			]
		);

		register_rest_route(
			'ha-bpmn/v1',
			'/diagrams',
			[
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => [ __CLASS__, 'get_diagrams_list' ],
				'permission_callback' => [ __CLASS__, 'check_list_permission' ],
			]
		);

		register_rest_route(
			'ha-bpmn/v1',
			'/diagram/(?P<id>\d+)/revisions',
			[
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => [ __CLASS__, 'get_diagram_revisions' ],
				'permission_callback' => [ __CLASS__, 'check_revisions_permission' ],
				'args'                => [
					'id' => [
						'validate_callback' => function( $param ) {
							return is_numeric( $param ) && (int) $param > 0;
						},
						'sanitize_callback' => 'absint',
					],
				],
			]
		);
	}

	/**
	 * Permission check for diagram access.
	 *
	 * @param \WP_REST_Request $request The REST request.
	 * @return bool|\WP_Error
	 */
	public static function check_permission( $request ) {
		$post_id = (int) $request['id'];
		$post    = get_post( $post_id );

		if ( ! $post || HA_BPMN_POST_TYPE !== $post->post_type ) {
			return new \WP_Error(
				'ha_bpmn_not_found',
				__( 'Diagram not found.', 'ha-bpmn-manager' ),
				[ 'status' => 404 ]
			);
		}

		// Check if password protected
		if ( post_password_required( $post ) ) {
			return new \WP_Error(
				'ha_bpmn_password_required',
				__( 'This diagram is password protected.', 'ha-bpmn-manager' ),
				[ 'status' => 403 ]
			);
		}

		// Publicly published diagrams are readable by everyone
		if ( 'publish' === $post->post_status ) {
			return true;
		}

		// Drafts and private diagrams require read/edit capability
		if ( current_user_can( 'read_post', $post_id ) || current_user_can( 'edit_post', $post_id ) ) {
			return true;
		}

		return new \WP_Error(
			'ha_bpmn_forbidden',
			__( 'You are not allowed to view this diagram.', 'ha-bpmn-manager' ),
			[ 'status' => 403 ]
		);
	}

	/**
	 * Returns diagram payload.
	 *
	 * @param \WP_REST_Request $request The REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function get_diagram( $request ) {
		$post_id = (int) $request['id'];
		$post    = get_post( $post_id );

		if ( ! $post ) {
			return new \WP_Error( 'ha_bpmn_not_found', __( 'Diagram not found.', 'ha-bpmn-manager' ), [ 'status' => 404 ] );
		}

		$content = json_decode( $post->post_content, true );

		if ( ! is_array( $content ) || empty( $content['xml'] ) ) {
			// If post_content is raw XML directly
			if ( ! empty( $post->post_content ) && false !== strpos( $post->post_content, '<bpmn:' ) ) {
				$raw_content = [
					'xml'      => $post->post_content,
					'overlays' => null,
				];
			} else {
				$raw_content = [
					'xml'      => self::DEFAULT_BPMN_XML,
					'overlays' => null,
				];
			}
		} else {
			$raw_content = $content;
		}

		return rest_ensure_response(
			[
				'id'          => $post->ID,
				'title'       => get_the_title( $post->ID ),
				'slug'        => $post->post_name,
				'status'      => $post->post_status,
				'raw_content' => $raw_content,
			]
		);
	}

	/**
	 * Permission check for diagram listing (Gutenberg block & dropdowns).
	 *
	 * @return bool
	 */
	public static function check_list_permission() {
		return current_user_can( 'edit_posts' );
	}

	/**
	 * Returns a list of diagrams for selection in Gutenberg or UI widgets.
	 *
	 * @return \WP_REST_Response
	 */
	public static function get_diagrams_list() {
		$posts = get_posts(
			[
				'post_type'      => HA_BPMN_POST_TYPE,
				'post_status'    => [ 'publish', 'draft', 'private' ],
				'posts_per_page' => 100,
				'orderby'        => 'title',
				'order'          => 'ASC',
			]
		);

		$diagrams = [];
		foreach ( $posts as $p ) {
			if ( 'publish' !== $p->post_status && ! current_user_can( 'edit_post', $p->ID ) && ! current_user_can( 'read_post', $p->ID ) ) {
				continue;
			}
			/* translators: %d: Diagram ID */
			$fallback_title = sprintf( __( 'Diagram #%d', 'ha-bpmn-manager' ), $p->ID );
			$diagrams[]     = [
				'id'     => $p->ID,
				'title'  => get_the_title( $p->ID ) ?: $fallback_title,
				'slug'   => $p->post_name,
				'status' => $p->post_status,
				'date'   => get_the_date( '', $p ),
			];
		}

		return rest_ensure_response( $diagrams );
	}

	/**
	 * Permission check for diagram revisions.
	 *
	 * @param \WP_REST_Request $request The REST request.
	 * @return bool|\WP_Error
	 */
	public static function check_revisions_permission( $request ) {
		$post_id = (int) $request['id'];
		$post    = get_post( $post_id );

		if ( ! $post || HA_BPMN_POST_TYPE !== $post->post_type ) {
			return new \WP_Error(
				'ha_bpmn_not_found',
				__( 'Diagram not found.', 'ha-bpmn-manager' ),
				[ 'status' => 404 ]
			);
		}

		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return new \WP_Error(
				'ha_bpmn_forbidden',
				__( 'You do not have permission to view revisions of this diagram.', 'ha-bpmn-manager' ),
				[ 'status' => 403 ]
			);
		}
		return true;
	}

	/**
	 * Returns revisions for a specific diagram with XML contents.
	 *
	 * @param \WP_REST_Request $request The REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function get_diagram_revisions( $request ) {
		$post_id = (int) $request['id'];
		$post    = get_post( $post_id );

		if ( ! $post || HA_BPMN_POST_TYPE !== $post->post_type ) {
			return new \WP_Error( 'ha_bpmn_not_found', __( 'Diagram not found.', 'ha-bpmn-manager' ), [ 'status' => 404 ] );
		}

		$revs    = wp_get_post_revisions( $post_id );

		$results = [];
		foreach ( $revs as $rev ) {
			$xml = '';
			$content = json_decode( $rev->post_content, true );
			if ( is_array( $content ) && ! empty( $content['xml'] ) ) {
				$xml = $content['xml'];
			} elseif ( ! empty( $rev->post_content ) && false !== strpos( $rev->post_content, '<bpmn:' ) ) {
				$xml = $rev->post_content;
			}

			$author = get_the_author_meta( 'display_name', $rev->post_author );

			$results[] = [
				'id'     => $rev->ID,
				'date'   => get_the_time( 'd.m.Y H:i', $rev ),
				'author' => $author ?: __( 'Unknown', 'ha-bpmn-manager' ),
				'xml'    => $xml,
			];
		}

		return rest_ensure_response( $results );
	}
}

