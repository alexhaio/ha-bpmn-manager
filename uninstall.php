<?php
/**
 * Root uninstall entry point for repository-based installations.
 *
 * Forwards WordPress uninstall execution to plugin/uninstall.php.
 *
 * @package HA_BPMN_Manager
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

$plugin_uninstall = __DIR__ . '/plugin/uninstall.php';
if ( file_exists( $plugin_uninstall ) ) {
	require_once $plugin_uninstall;
}
