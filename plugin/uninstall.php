<?php
/**
 * Uninstallation routine for HA-BPMN-Manager.
 *
 * Fired when the plugin is uninstalled via WordPress admin.
 *
 * SICHERHEIT: Standardmäßig sicher!
 * Alle BPMN-Diagramme, XML-Quelltexte, Revisionen und Einstellungen
 * bleiben standardmäßig in der Datenbank erhalten.
 * Nur wenn der Administrator dies vorab in den Plugin-Einstellungen unter
 * „Gefahrenzone: Deinstallation & Datenbereinigung“ explizit aktiviert hat,
 * werden Daten gelöscht.
 *
 * @package HA_BPMN_Manager
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

// Einstellungen abfragen
$settings = get_option( 'ha_bpmn_settings' );

// SICHERHEITSPRÜFUNG: Standardmäßig sicher!
// Daten werden NUR gelöscht, wenn der Administrator dies zuvor explizit aktiviert hat.
if ( empty( $settings ) || ! is_array( $settings ) || empty( $settings['delete_data_on_uninstall'] ) || '1' !== (string) $settings['delete_data_on_uninstall'] ) {
	return;
}

// 1. Plugin-Optionen löschen
delete_option( 'ha_bpmn_settings' );
delete_option( 'bpmn_module_settings' );
delete_option( 'ha_bpmn_version' );

// 2. Transients löschen
delete_transient( 'ha_bpmn_admin_notices' );

// 3. Diagramm-Posts und Revisionen löschen (nur bei explizit gewünschter Vollbereinigung)
$post_type = defined( 'HA_BPMN_POST_TYPE' ) ? HA_BPMN_POST_TYPE : 'bpmnm';
$diagram_posts = get_posts( [
	'post_type'   => $post_type,
	'post_status' => 'any',
	'numberposts' => -1,
	'fields'      => 'ids',
] );

if ( ! empty( $diagram_posts ) ) {
	foreach ( $diagram_posts as $post_id ) {
		wp_delete_post( $post_id, true );
	}
}
