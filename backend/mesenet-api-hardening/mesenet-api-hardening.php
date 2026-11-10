<?php
/**
 * Plugin Name: Mesenet API hardening
 * Description: Hides WordPress user enumeration on the headless API (api.mesenet.hu): the public
 *              /wp-json/wp/v2/users endpoints and the ?author=N redirect. Logged-in users and
 *              Application Password requests (the publishing pipeline) are not affected.
 * Version: 1.0.0
 *
 * Install (no SSH needed): zip the folder `mesenet-api-hardening` and upload it in
 * wp-admin > Plugins > Add Plugin > Upload Plugin, then Activate.
 */

if (!defined('ABSPATH')) {
    exit;
}

// 1) Remove the public users listing from the REST API for anonymous requests.
add_filter('rest_endpoints', function ($endpoints) {
    if (!is_user_logged_in()) {
        unset($endpoints['/wp/v2/users']);
        unset($endpoints['/wp/v2/users/(?P<id>[\d]+)']);
    }
    return $endpoints;
});

// 2) Block /?author=1 style probing (it redirects to /author/<login-slug>/ and leaks the slug).
add_action('parse_request', function ($wp) {
    if (!is_user_logged_in() && isset($_GET['author']) && !is_admin()) {
        status_header(404);
        nocache_headers();
        exit;
    }
});
