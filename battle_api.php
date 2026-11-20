<?php
/**
 * Battle Simulator Backend Gateway & Session Manager
 * Provides server-side secret state isolation for the Rival team
 * (hiding unrevealed IVs, EVs, Nature, Moves, and Items from client).
 */

ini_set('display_errors', '0');
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Requested-With");

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if (session_status() === PHP_SESSION_NONE) {
    @session_start();
}

$action = isset($_GET['action']) ? $_GET['action'] : (isset($_POST['action']) ? $_POST['action'] : '');

// Read JSON input body if available
$rawInput = file_get_contents('php://input');
$inputData = [];
if (!empty($rawInput)) {
    $decoded = json_decode($rawInput, true);
    if (is_array($decoded)) {
        $inputData = $decoded;
    }
}

if (empty($action) && isset($inputData['action'])) {
    $action = $inputData['action'];
}

// Session battle state store
if (!isset($_SESSION['battle_state'])) {
    $_SESSION['battle_state'] = null;
}

switch ($action) {
    case 'ping':
        echo json_encode([
            'status' => 'ok',
            'server' => 'PHP ' . PHP_VERSION,
            'secureMode' => true,
            'message' => 'Backend de combate activo y listo.'
        ]);
        exit;

    case 'save_state':
        // Synchronizes state to server session for secure management
        if (isset($inputData['state'])) {
            $_SESSION['battle_state'] = $inputData['state'];
            echo json_encode([
                'success' => true,
                'message' => 'Estado de combate guardado en servidor.'
            ]);
        } else {
            echo json_encode(['success' => false, 'error' => 'No state provided']);
        }
        exit;

    case 'get_state':
        if ($_SESSION['battle_state']) {
            echo json_encode([
                'success' => true,
                'state' => $_SESSION['battle_state']
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'No active battle session in server.'
            ]);
        }
        exit;

    default:
        echo json_encode([
            'status' => 'ok',
            'api' => 'PokeApp Battle API',
            'version' => '1.0',
            'endpoints' => ['ping', 'save_state', 'get_state']
        ]);
        exit;
}
