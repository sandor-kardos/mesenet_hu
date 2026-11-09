<?php
/**
 * Plugin Name: Mesenet API noindex
 * Description: Keeps api.mesenet.hu (headless WordPress) out of Google's index so the tales are
 *              only indexed on mesenet.hu. Sends X-Robots-Tag on every page and REST response and
 *              adds a robots meta tag to any theme-rendered page. Do NOT also Disallow the site in
 *              robots.txt: Google must be able to crawl a URL to see its noindex.
 *
 * Install: copy this file to wp-content/mu-plugins/ on api.mesenet.hu (create the folder if needed).
 * Must-use plugins load automatically, no activation step.
 */

if (!defined('ABSPATH')) {
    exit;
}

// Theme-rendered pages (front end, wp-login, etc.).
add_action('send_headers', function () {
    header('X-Robots-Tag: noindex, nofollow', true);
});

// REST API responses (/wp-json/...), which the React app and the prerender script use.
add_filter('rest_post_dispatch', function ($response) {
    if ($response instanceof WP_REST_Response) {
        $response->header('X-Robots-Tag', 'noindex, nofollow');
    }
    return $response;
});

// <meta name="robots"> for pages that do render a theme.
add_filter('wp_robots', function ($robots) {
    $robots['noindex']  = true;
    $robots['nofollow'] = true;
    unset($robots['max-image-preview']);
    return $robots;
});
