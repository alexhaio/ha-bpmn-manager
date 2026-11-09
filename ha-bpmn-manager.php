<?php
/**
 * Plugin Name: HA-BPMN-Manager
 * Plugin URI: https://seo-hacker.de
 * Description: A professional, easy-to-use WordPress plugin to design, model, and embed BPMN 2.0 workflows based on bpmn-js.
 * Version: 4.8.4
 * Author: Alexander Hacker
 * Author URI: https://seo-hacker.de
 * Text Domain: ha-bpmn-manager
 * Domain Path: /languages
 * Requires at least: 5.8
 * Requires PHP: 7.4
 * License: GPLv2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 *
 * @package HA_BPMN_Manager
 * @author Alexander Hacker <alex@seo-hacker.de>
 * @copyright 2020-present Alexander Hacker
 * @license GPL-2.0-or-later
 */

defined( 'ABSPATH' ) || exit;

// Forward to the actual plugin entry point inside plugin/
$plugin_entry = __DIR__ . '/plugin/ha-bpmn-manager.php';
if ( file_exists( $plugin_entry ) ) {
	require_once $plugin_entry;
}
