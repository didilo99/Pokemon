<?php
// Ocultar errores de PHP en el output para no corromper el JSON
ini_set('display_errors', '0');
error_reporting(E_ALL);

// Extender tiempo de ejecución para evitar 500 por timeout del engine
set_time_limit(120);

// Forzar respuesta JSON desde el inicio
header('Content-Type: application/json');

// Permitir requests desde cualquier origen (CORS)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Requested-With");

// Manejar preflight requests (OPTIONS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Configuración de la API TCGDex
$lang = isset($_GET['lang']) ? $_GET['lang'] : 'en';
// Validar idiomas permitidos por TCGDex
$allowedLangs = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'zh', 'zh-tw'];
if (!in_array($lang, $allowedLangs)) {
    $lang = 'en';
}

// Datos de respaldo estáticos por si falla la API externa
$staticFallbacks = [
    "rarities" => [
        "Amazing Rare", "Classic Collection", "Common", "Double Rare", "Hyper Rare", 
        "Illustration Rare", "LEGEND", "Promo", "Radiant Rare", "Rare", "Rare ACE", 
        "Rare BREAK", "Rare Holo", "Rare Holo EX", "Rare Holo GX", "Rare Holo LV.X", 
        "Rare Holo Star", "Rare Holo V", "Rare Holo VMAX", "Rare Holo VSTAR", 
        "Rare Prime", "Rare Prism Star", "Rare Rainbow", "Rare Secret", "Rare Shining", 
        "Rare Shiny", "Rare Shiny GX", "Rare Ultra", "Special Illustration Rare", 
        "Trainer Gallery Rare Holo", "Ultra Rare", "Uncommon"
    ],
    "types" => [
        "Colorless", "Darkness", "Dragon", "Fairy", "Fighting", "Fire", "Grass", 
        "Lightning", "Metal", "Psychic", "Water"
    ],
    "categories" => [
        "Energy", "Pokemon", "Trainer"
    ],
    "series" => [
        "base", "e-Card", "ex", "gym", "neo", "platinum", "heartgold_and_soulsilver", 
        "diamond_and_pearl", "black_and_white", "xy", "sun_and_moon", 
        "sword_and_shield", "scarlet_and_violet", "pop_series"
    ],
    "illustrators" => [],
    "hp" => ["30", "40", "50", "60", "70", "80", "90", "100", "110", "120", "130", "140", "150", "160", "170", "180", "190", "200", "210", "220", "230", "240", "250", "260", "270", "280", "300", "310", "320", "330", "340"],
    "suffixes" => ["EX", "GX", "V", "VMAX", "VSTAR", "Radiant", "Shiny", "Prism Star", "BREAK", "LEGEND", "ACE SPEC"],
    "retreats" => ["0", "1", "2", "3", "4", "5"]
];

$baseUrlRest = "https://api.tcgdex.net/v2/" . $lang . "/";

// Obtener datos del request original
$method = $_SERVER['REQUEST_METHOD'];
$endpoint = isset($_GET['endpoint']) ? $_GET['endpoint'] : '';

$targetUrl = "";

if ($method === 'GET' && !empty($endpoint)) {
    
// Lista de endpoints que tienen fallback estático (para fallback rápido)
$listEndpoints = ['types', 'rarities', 'series', 'hp', 'retreats', 'illustrators', 'categories', 'suffixes'];

$allowedEndpoints = array_merge(['sets', 'cards'], $listEndpoints);

if (in_array($endpoint, $allowedEndpoints)) {
        // Construir URL base
        $targetUrl = $baseUrlRest . $endpoint;
        
        // Reconstruir Query String
        $queryParams = $_GET;
        unset($queryParams['endpoint']);
        unset($queryParams['lang']);
        
        // Map 'page' to 'pagination:page' and 'pageSize' to 'pagination:itemsPerPage'
        if (isset($queryParams['page'])) {
            $queryParams['pagination:page'] = $queryParams['page'];
            unset($queryParams['page']);
        }
        if (isset($queryParams['pageSize'])) {
            $queryParams['pagination:itemsPerPage'] = $queryParams['pageSize'];
            unset($queryParams['pageSize']);
        }
        
        // Si hay parámetros restantes, los añadimos
        if (!empty($queryParams)) {
            $queryString = http_build_query($queryParams);
            $targetUrl .= "?" . $queryString;
        }
        
    } elseif ($endpoint === 'cardDetail') {
        // Endpoint especial interno para detalle de carta por ID
        $cardId = isset($_GET['id']) ? $_GET['id'] : '';
        if (empty($cardId)) {
            http_response_code(400);
            echo json_encode(["error" => "Missing card ID"]);
            exit;
        }
        $targetUrl = $baseUrlRest . "cards/" . rawurlencode($cardId);
    } elseif ($endpoint === 'set') {
        // Endpoint para detalle de un set por ID
        $setId = isset($_GET['id']) ? $_GET['id'] : '';
        if (empty($setId)) {
            http_response_code(400);
            echo json_encode(["error" => "Missing set ID"]);
            exit;
        }
        $targetUrl = $baseUrlRest . "sets/" . rawurlencode($setId);
    } else {
        http_response_code(400);
        echo json_encode(["error" => "Invalid endpoint"]);
        exit;
    }

} else {
    http_response_code(400);
    echo json_encode(["error" => "Invalid endpoint or method"]);
    exit;
}

// Iniciar cURL
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $targetUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

// Tiempo de espera dinámico: si tiene fallback, fallamos rápido (2s). Si no, normal (60s)
$timeout = in_array($endpoint, $listEndpoints) ? 2 : 60;
curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, min(10, $timeout));

curl_setopt($ch, CURLOPT_HTTP_VERSION, CURL_HTTP_VERSION_1_1);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);

// Configurar Headers
$headers = [
    "User-Agent: PokedexApp/1.0",
    "Accept: application/json"
];
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

// Ejecutar request
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error_msg = curl_error($ch);
curl_close($ch);

if ($httpCode >= 400 || $response === false) {
    // Verificar si hay un fallback estático para este endpoint
    if (isset($staticFallbacks[$endpoint])) {
        http_response_code(200);
        echo json_encode($staticFallbacks[$endpoint]);
        exit;
    }

    // Fallback genérico para otros endpoints de lista (evita el 500)
    if (in_array($endpoint, $listEndpoints)) {
        http_response_code(200);
        echo json_encode([]);
        exit;
    }

    if ($response === false) {
        $errorMsg = "Proxy Error (cURL): " . $error_msg . " [Target: $targetUrl]";
        error_log($errorMsg);
        http_response_code(500);
        echo json_encode(["error" => $errorMsg]);
        exit;
    }

    http_response_code($httpCode);
    
    // Si la respuesta es vacía o no es JSON válido, envolverla
    $isJson = is_string($response) && is_array(json_decode($response, true)) && (json_last_error() == JSON_ERROR_NONE);
    
    if (empty($response) || !$isJson) {
        echo json_encode([
            "error" => "External API Error",
            "status" => $httpCode,
            "target" => $targetUrl,
            "raw_response" => $response
        ]);
    } else {
        echo $response;
    }
    exit;
}

// Validar que la respuesta sea un JSON válido antes de enviarla
$isJsonValid = is_string($response) && (is_array(json_decode($response, true)) || is_object(json_decode($response))) && (json_last_error() == JSON_ERROR_NONE);

if (!$isJsonValid) {
    http_response_code(502);
    echo json_encode([
        "error" => "External API returned invalid JSON or empty response",
        "status" => 502,
        "target" => $targetUrl,
        "raw_preview" => mb_substr($response, 0, 500)
    ]);
    exit;
}

// Responder
echo $response;
?>