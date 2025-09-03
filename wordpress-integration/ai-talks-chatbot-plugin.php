<?php
/**
 * Plugin Name: AI Talks Chatbot
 * Plugin URI: https://aitalks.hu
 * Description: AI Talks konferencia chatbot integráció WordPress oldalakhoz
 * Version: 1.0.0
 * Author: AI Talks Team
 * License: GPL v2 or later
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class AITalksChatbotPlugin {
    
    public function __construct() {
        add_action('init', array($this, 'init'));
    }
    
    public function init() {
        // Add admin menu
        add_action('admin_menu', array($this, 'add_admin_menu'));
        
        // Add settings
        add_action('admin_init', array($this, 'settings_init'));
        
        // Add chatbot to frontend
        add_action('wp_footer', array($this, 'add_chatbot_to_frontend'));
        
        // Add admin styles
        add_action('admin_enqueue_scripts', array($this, 'admin_styles'));
    }
    
    public function add_admin_menu() {
        add_options_page(
            'AI Talks Chatbot',
            'AI Talks Chatbot',
            'manage_options',
            'ai-talks-chatbot',
            array($this, 'admin_page')
        );
    }
    
    public function settings_init() {
        register_setting('ai_talks_chatbot_settings', 'ai_talks_chatbot_options');
        
        add_settings_section(
            'ai_talks_chatbot_section',
            'Chatbot Beállítások',
            null,
            'ai_talks_chatbot_settings'
        );
        
        add_settings_field(
            'enabled',
            'Chatbot engedélyezése',
            array($this, 'enabled_field'),
            'ai_talks_chatbot_settings',
            'ai_talks_chatbot_section'
        );
        
        add_settings_field(
            'position',
            'Pozíció',
            array($this, 'position_field'),
            'ai_talks_chatbot_settings',
            'ai_talks_chatbot_section'
        );
        
        add_settings_field(
            'primary_color',
            'Elsődleges szín',
            array($this, 'primary_color_field'),
            'ai_talks_chatbot_settings',
            'ai_talks_chatbot_section'
        );
        
        add_settings_field(
            'pages',
            'Megjelenítés oldalakon',
            array($this, 'pages_field'),
            'ai_talks_chatbot_settings',
            'ai_talks_chatbot_section'
        );
    }
    
    public function enabled_field() {
        $options = get_option('ai_talks_chatbot_options');
        $enabled = isset($options['enabled']) ? $options['enabled'] : 'yes';
        ?>
        <input type="checkbox" name="ai_talks_chatbot_options[enabled]" value="yes" <?php checked($enabled, 'yes'); ?> />
        <label>Engedélyezi a chatbot megjelenítését az oldalon</label>
        <?php
    }
    
    public function position_field() {
        $options = get_option('ai_talks_chatbot_options');
        $position = isset($options['position']) ? $options['position'] : 'bottom-right';
        ?>
        <select name="ai_talks_chatbot_options[position]">
            <option value="bottom-right" <?php selected($position, 'bottom-right'); ?>>Jobb alsó</option>
            <option value="bottom-left" <?php selected($position, 'bottom-left'); ?>>Bal alsó</option>
            <option value="top-right" <?php selected($position, 'top-right'); ?>>Jobb felső</option>
            <option value="top-left" <?php selected($position, 'top-left'); ?>>Bal felső</option>
        </select>
        <?php
    }
    
    public function primary_color_field() {
        $options = get_option('ai_talks_chatbot_options');
        $color = isset($options['primary_color']) ? $options['primary_color'] : '#2563eb';
        ?>
        <input type="color" name="ai_talks_chatbot_options[primary_color]" value="<?php echo esc_attr($color); ?>" />
        <p class="description">Válaszd ki a chatbot elsődleges színét</p>
        <?php
    }
    
    public function pages_field() {
        $options = get_option('ai_talks_chatbot_options');
        $pages = isset($options['pages']) ? $options['pages'] : 'all';
        ?>
        <label>
            <input type="radio" name="ai_talks_chatbot_options[pages]" value="all" <?php checked($pages, 'all'); ?> />
            Minden oldalon
        </label><br>
        <label>
            <input type="radio" name="ai_talks_chatbot_options[pages]" value="front" <?php checked($pages, 'front'); ?> />
            Csak a főoldalon
        </label><br>
        <label>
            <input type="radio" name="ai_talks_chatbot_options[pages]" value="specific" <?php checked($pages, 'specific'); ?> />
            Csak megadott oldalakon
        </label>
        <?php if ($pages === 'specific'): ?>
        <br>
        <textarea name="ai_talks_chatbot_options[specific_pages]" rows="3" cols="50" placeholder="Oldal slug-ok, vesszővel elválasztva (pl: about, contact, services)"><?php echo esc_textarea(isset($options['specific_pages']) ? $options['specific_pages'] : ''); ?></textarea>
        <?php endif; ?>
        <?php
    }
    
    public function admin_page() {
        ?>
        <div class="wrap">
            <h1>AI Talks Chatbot</h1>
            <div class="ai-talks-admin-container">
                <div class="ai-talks-admin-main">
                    <form action="options.php" method="post">
                        <?php
                        settings_fields('ai_talks_chatbot_settings');
                        do_settings_sections('ai_talks_chatbot_settings');
                        submit_button('Beállítások mentése');
                        ?>
                    </form>
                </div>
                <div class="ai-talks-admin-sidebar">
                    <div class="ai-talks-info-box">
                        <h3>AI Talks Konferencia</h3>
                        <p>November 20, 2024 - Budapest</p>
                        <p>A mesterséges intelligencia gyakorlati alkalmazása a vállalkozásokban.</p>
                        <a href="https://aitalks.hu" target="_blank" class="button button-primary">Jegyvásárlás</a>
                    </div>
                    <div class="ai-talks-info-box">
                        <h3>Segítség</h3>
                        <p>Ha problémád van a chatbot használatával:</p>
                        <ul>
                            <li>Ellenőrizd a beállításokat</li>
                            <li>Nézd meg a böngésző konzolt</li>
                            <li>Írj nekünk: support@aitalks.hu</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
        <?php
    }
    
    public function admin_styles() {
        ?>
        <style>
        .ai-talks-admin-container {
            display: flex;
            gap: 20px;
            margin-top: 20px;
        }
        .ai-talks-admin-main {
            flex: 2;
        }
        .ai-talks-admin-sidebar {
            flex: 1;
            max-width: 300px;
        }
        .ai-talks-info-box {
            background: #fff;
            border: 1px solid #ccd0d4;
            border-radius: 4px;
            padding: 15px;
            margin-bottom: 20px;
        }
        .ai-talks-info-box h3 {
            margin-top: 0;
            color: #2563eb;
        }
        .ai-talks-info-box ul {
            margin: 10px 0;
            padding-left: 20px;
        }
        </style>
        <?php
    }
    
    public function add_chatbot_to_frontend() {
        $options = get_option('ai_talks_chatbot_options');
        
        // Check if enabled
        if (!isset($options['enabled']) || $options['enabled'] !== 'yes') {
            return;
        }
        
        // Check page conditions
        $pages = isset($options['pages']) ? $options['pages'] : 'all';
        if ($pages === 'front' && !is_front_page()) {
            return;
        }
        if ($pages === 'specific') {
            $specific_pages = isset($options['specific_pages']) ? $options['specific_pages'] : '';
            $page_slugs = array_map('trim', explode(',', $specific_pages));
            $current_slug = get_post_field('post_name', get_post());
            if (!in_array($current_slug, $page_slugs)) {
                return;
            }
        }
        
        $position = isset($options['position']) ? $options['position'] : 'bottom-right';
        $color = isset($options['primary_color']) ? $options['primary_color'] : '#2563eb';
        
        ?>
        <!-- AI Talks Chatbot -->
        <script>
            console.log('AI Talks Chatbot: Loading chatbot on page', window.location.href);
        </script>
        
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Lydiagyenes/aitalks-guidebot@main/dist-widget/ai-talks-chatbot.css" onload="console.log('AI Talks Chatbot: CSS loaded')" onerror="console.error('AI Talks Chatbot: CSS failed to load')">
        <script src="https://cdn.jsdelivr.net/gh/Lydiagyenes/aitalks-guidebot@main/dist-widget/ai-talks-chatbot.umd.js" onload="console.log('AI Talks Chatbot: JS loaded')" onerror="console.error('AI Talks Chatbot: JS failed to load')"></script>
        <script>
        document.addEventListener('DOMContentLoaded', function() {
            console.log('AI Talks Chatbot: DOM loaded, checking for function...');
            
            // Timeout for better debugging
            setTimeout(function() {
                if (typeof window.initAITalksChatbot === 'function') {
                    console.log('AI Talks Chatbot: Initializing with config:', {
                        position: '<?php echo esc_js($position); ?>',
                        primaryColor: '<?php echo esc_js($color); ?>'
                    });
                    
                    try {
                        window.initAITalksChatbot({
                            position: '<?php echo esc_js($position); ?>',
                            primaryColor: '<?php echo esc_js($color); ?>',
                            containerClass: 'wp-ai-talks-chatbot'
                        });
                        console.log('AI Talks Chatbot: Successfully initialized');
                    } catch (error) {
                        console.error('AI Talks Chatbot: Initialization error:', error);
                    }
                } else {
                    console.error('AI Talks Chatbot: initAITalksChatbot function not found. Available functions:', Object.keys(window).filter(k => k.includes('AI')));
                }
            }, 100);
        });
        </script>
        <?php
    }
}

// Initialize the plugin
new AITalksChatbotPlugin();

// Activation hook
register_activation_hook(__FILE__, function() {
    add_option('ai_talks_chatbot_options', array(
        'enabled' => 'yes',
        'position' => 'bottom-right',
        'primary_color' => '#2563eb',
        'pages' => 'all'
    ));
});

// Deactivation hook
register_deactivation_hook(__FILE__, function() {
    // Clean up if needed
});
?>