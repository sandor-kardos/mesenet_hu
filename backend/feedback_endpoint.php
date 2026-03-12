<?php
/**
 * Mesenet.hu - Feedback REST API Endpoint
 * Add this to your child theme's functions.php or a custom plugin.
 */

add_action('rest_api_init', function () {
    register_rest_route('mesenet/v1', '/feedback', array(
        'methods' => 'POST',
        'callback' => 'handle_mesenet_feedback',
        'permission_callback' => '__return_true', // In production, add a nonce or auth check
    ));
});

function handle_mesenet_feedback($request) {
    $params = $request->get_json_params();
    
    $title  = sanitize_text_field($params['title']);
    $reason = sanitize_text_field($params['reason']);
    $id     = sanitize_text_field($params['id']);
    $to     = 'hello@sandorkardos.com';
    
    $subject = "Mesenet Feedback: Negative rating for '{$title}'";
    
    $message  = "A user sent negative feedback for a story.\n\n";
    $message .= "Story Title: " . $title . "\n";
    $message .= "Story ID/URL: " . $id . "\n";
    $message .= "Reason: " . $reason . "\n\n";
    $message .= "Sent from Mesenet PWA Feedback System.";
    
    $headers = array('Content-Type: text/plain; charset=UTF-8');
    
    $sent = wp_mail($to, $subject, $message, $headers);
    
    if ($sent) {
        return new WP_REST_Response(array('status' => 'success', 'message' => 'Email sent'), 200);
    } else {
        return new WP_REST_Response(array('status' => 'error', 'message' => 'Email failed'), 500);
    }
}
