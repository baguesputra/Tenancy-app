<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'perusahaan' => [
        'metadata' => env('SAML_METADATA_URL'),
        'sp_entityid' => env('SAML_SPENTITY_ID', env('SSO_REDIRECT_URI', 'http://localhost:8000/auth/sso/callback')),
        'sp_acs' => env('SAML_SP_ACS_URL', env('SSO_REDIRECT_URI', 'http://localhost:8000/auth/sso/callback')),
        'sp_sls' => env('SAML_SP_SLS_URL') ?: rtrim(env('APP_URL', 'http://localhost:8000'), '/').'/auth/sso/slo',
        'sp_name_id_format' => env('SAML_NAME_ID_FORMAT', 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent'),
        'sp_sign_assertions' => env('SAML_SP_SIGN_ASSERTIONS', false),
        'sp_certificate' => env('SAML_SP_CERT'),
        'sp_private_key' => env('SAML_SP_PRIVATE_KEY'),
        'sp_private_key_passphrase' => env('SAML_SP_PRIVATE_KEY_PASSPHRASE'),
        'validation' => [
            'clock_skew' => (int) env('SAML_CLOCK_SKEW', 600),
        ],
        'attribute_map' => [
            'email' => ['email', 'mail', 'userPrincipalName'],
            'name' => ['name', 'displayName', 'cn', 'givenName'],
        ],
    ],

    'gate' => [
        'base_url' => env('GATE_BASE_URL', 'https://gate.appdutamall.com'),
        'token' => env('GATE_TOKEN'),
        'timeout' => (float) env('GATE_TIMEOUT', 15),
    ],

];
