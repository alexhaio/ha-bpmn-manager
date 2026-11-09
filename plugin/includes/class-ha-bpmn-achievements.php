<?php
/**
 * Achievement- und Lernfortschritts-Integration für HA-BPMN-Manager
 *
 * Injiziert Quellen-Metadaten (Name, Icon, Farb-Branding) sowie direkte
 * Ziel-URLs für das Fortsetzen des Lernfortschritts im BPMN-Studio.
 *
 * @package HA_BPMN_Manager
 */

namespace HA_BPMN;

defined( 'ABSPATH' ) || exit;

class Achievements {

	/**
	 * Initialisiert Hooks zur Anbindung an ha-achievement-api.
	 */
	public static function init() {
		$settings = CPT::get_plugin_settings();
		if ( empty( $settings['module_quest'] ) ) {
			return;
		}

		// Filtert den Aufgabenkatalog und reichert alle BPMN-Aufgaben mit Quell- und Aktionsdaten an
		add_filter( 'ha_achievement_registered_tasks', [ __CLASS__, 'filter_registered_tasks' ] );
		add_filter( 'ha_achievement_registered_sources', [ __CLASS__, 'filter_registered_sources' ] );
	}

	/**
	 * Ermittelt die ideale Ziel-URL, auf die der Lernende klicken muss, um den Fortschritt fortzusetzen.
	 *
	 * @param string $task_key    Aufgaben-Schlüssel (z. B. 'c1_toggle_sim')
	 * @param string $chapter_key Kapitel-Schlüssel (z. B. 'chapter1')
	 * @return string Ziel-URL zum BPMN-Studio
	 */
	public static function get_editor_url( string $task_key = '', string $chapter_key = '' ): string {
		$settings = CPT::get_plugin_settings();

		// 1. Priorität: Eine explizit konfigurierte Frontend-Studio-URL in den Plugin-Einstellungen
		if ( ! empty( $settings['quest_editor_url'] ) ) {
			$url = esc_url_raw( $settings['quest_editor_url'] );
			return add_query_arg( array_filter( [
				'quest'   => '1',
				'chapter' => $chapter_key,
				'task'    => $task_key,
			] ), $url );
		}

		// 2. Priorität: Das zuletzt veröffentlichte BPMN-Diagramm im Frontend
		$latest_bpmn = get_posts( [
			'post_type'      => HA_BPMN_POST_TYPE,
			'post_status'    => 'publish',
			'numberposts'    => 1,
			'fields'         => 'ids',
			'orderby'        => 'date',
			'order'          => 'DESC',
		] );

		if ( ! empty( $latest_bpmn ) ) {
			$permalink = get_permalink( $latest_bpmn[0] );
			if ( $permalink ) {
				return add_query_arg( array_filter( [
					'quest'   => '1',
					'chapter' => $chapter_key,
					'task'    => $task_key,
				] ), $permalink );
			}
		}

		// 3. Priorität: Im WP-Admin, falls der Benutzer Modellierungs-Rechte hat
		if ( current_user_can( 'edit_posts' ) ) {
			if ( ! empty( $latest_bpmn ) ) {
				return admin_url( 'post.php?post=' . $latest_bpmn[0] . '&action=edit&quest=1' . ( $task_key ? '&task=' . $task_key : '' ) );
			}
			return admin_url( 'post-new.php?post_type=' . HA_BPMN_POST_TYPE . '&quest=1' . ( $task_key ? '&task=' . $task_key : '' ) );
		}

		// Fallback: Startseite mit Query-Param
		return home_url( '/?post_type=' . HA_BPMN_POST_TYPE . '&quest=1' );
	}

	/**
	 * Injiziert detaillierte BPMN-Quell- und Aktionsmetadaten in alle registrierten Aufgaben.
	 *
	 * @param array $catalog Aufgabenkatalog
	 * @return array
	 */
	public static function filter_registered_tasks( $catalog ) {
		if ( ! is_array( $catalog ) ) {
			return $catalog;
		}

		// Falls ha-bpmn-manager als Quelle existiert
		if ( isset( $catalog['ha-bpmn-manager'] ) && is_array( $catalog['ha-bpmn-manager'] ) ) {
			foreach ( $catalog['ha-bpmn-manager'] as $task_key => &$task ) {
				$chap_key = $task['chapter_key'] ?? 'chapter1';
				$task['source']       = 'ha-bpmn-manager';
				$task['source_name']  = 'HA-BPMN-Manager';
				$task['source_label'] = 'BPMN 2.0 Prozess-Studio';
				$task['source_icon']  = '📐';
				$task['source_color'] = '#1d4ed8';
				$task['source_bg']    = '#eff6ff';
				$task['action_label'] = __( 'Continue in BPMN Studio ▶', 'ha-bpmn-manager' );
				$task['action_url']   = self::get_editor_url( $task_key, $chap_key );
			}
		}

		return $catalog;
	}

	/**
	 * Registriert ha-bpmn-manager im Quellenverzeichnis von ha-achievement-api.
	 *
	 * @param array $sources Quellenverzeichnis
	 * @return array
	 */
	public static function filter_registered_sources( $sources ) {
		if ( ! is_array( $sources ) ) {
			$sources = [];
		}

		$sources['ha-bpmn-manager'] = [
			'id'           => 'ha-bpmn-manager',
			'name'         => 'HA-BPMN-Manager',
			'label'        => 'BPMN 2.0 Prozess-Studio',
			'icon'         => '📐',
			'color'        => '#1d4ed8',
			'bg'           => '#eff6ff',
			'editor_url'   => self::get_editor_url(),
			'action_label' => __( 'Open BPMN Studio 🚀', 'ha-bpmn-manager' ),
			'description'  => __( 'Interactive modeling studio for ISO 19510 business processes with token simulation.', 'ha-bpmn-manager' ),
		];

		return $sources;
	}
}
