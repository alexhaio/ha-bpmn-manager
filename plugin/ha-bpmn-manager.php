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
 * Requires PHP: 8.2
 * License: GPLv2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 *
 * @package HA_BPMN_Manager
 * @author Alexander Hacker <alex@seo-hacker.de>
 * @copyright 2020-present Alexander Hacker
 * @license GPL-2.0-or-later
 */

namespace HA_BPMN;

defined( 'ABSPATH' ) || exit;

// Define plugin constants
define( 'HA_BPMN_VERSION', '4.8.4' );
define( 'HA_BPMN_FILE', __FILE__ );
define( 'HA_BPMN_PATH', plugin_dir_path( __FILE__ ) );
define( 'HA_BPMN_URL', plugin_dir_url( __FILE__ ) );
define( 'HA_BPMN_POST_TYPE', 'bpmnm' );

// Load classes
require_once HA_BPMN_PATH . 'includes/class-ha-bpmn-assets.php';
require_once HA_BPMN_PATH . 'includes/class-ha-bpmn-rest.php';
require_once HA_BPMN_PATH . 'includes/class-ha-bpmn-cpt.php';
require_once HA_BPMN_PATH . 'includes/class-ha-bpmn-renderer.php';
require_once HA_BPMN_PATH . 'includes/class-ha-bpmn-gutenberg.php';
require_once HA_BPMN_PATH . 'includes/class-ha-bpmn-updater.php';
require_once HA_BPMN_PATH . 'includes/class-ha-bpmn-achievements.php';
require_once HA_BPMN_PATH . 'includes/class-ha-bpmn-manager.php';

/**
 * Bootstrap the plugin.
 *
 * @return Manager
 */
function ha_bpmn_manager() {
	return Manager::instance();
}

/**
 * Plugin activation hook.
 */
register_activation_hook( HA_BPMN_FILE, function() {
	CPT::instance()->register_post_type();
	flush_rewrite_rules();
} );

/**
 * Plugin deactivation hook.
 */
register_deactivation_hook( HA_BPMN_FILE, function() {
	flush_rewrite_rules();
} );

// Initialize
ha_bpmn_manager();
