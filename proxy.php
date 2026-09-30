<?php
// Ocultar errores de PHP en el output para no corromper el JSON
ini_set('display_errors', '0');
error_reporting(E_ALL);

// Extender tiempo de ejecución para evitar 500 por timeout del engine
set_time_limit(120);

// Habilitar compresión Gzip si está soportada
if (!ob_start("ob_gzhandler")) {
    ob_start();
}

// Forzar respuesta JSON desde el inicio
header('Content-Type: application/json; charset=utf-8');

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
    } elseif ($endpoint === 'githubCommits') {
        $targetUrl = "https://api.github.com/repos/PokeAPI/pokeapi/commits?per_page=1";
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

// TTL sugerido para cabeceras HTTP del navegador (en segundos)
if (in_array($endpoint, ['types', 'rarities', 'series', 'categories', 'suffixes', 'hp', 'retreats', 'illustrators'])) {
    $cacheTTL = 14 * 86400; // 14 días para listas estáticas
} elseif (in_array($endpoint, ['cardDetail', 'set'])) {
    $cacheTTL = 7 * 86400;  // 7 días para detalle de carta o set
} elseif (in_array($endpoint, ['sets', 'cards'])) {
    $cacheTTL = 6 * 3600;   // 6 horas para listados
} elseif ($endpoint === 'githubCommits') {
    $cacheTTL = 1800;       // 30 min para commits
} else {
    $cacheTTL = 3600;
}

// Helper para enviar respuesta con ETag y Cache-Control para el navegador
function sendResponseWithHeaders(string $content, int $ttl): void {
    $etag = '"' . md5($content) . '"';
    header("ETag: " . $etag);
    header("Cache-Control: public, max-age=" . min(86400, $ttl));
    
    if (isset($_SERVER['HTTP_IF_NONE_MATCH']) && trim($_SERVER['HTTP_IF_NONE_MATCH']) === $etag) {
        http_response_code(304);
        exit;
    }
    echo $content;
    exit;
}

// Iniciar cURL
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $targetUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

// Tiempo de espera dinámico
$timeout = in_array($endpoint, $listEndpoints) ? 3 : 20;
if ($endpoint === 'githubCommits') {
    $timeout = 5;
}
curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, min(6, $timeout));

curl_setopt($ch, CURLOPT_HTTP_VERSION, CURL_HTTP_VERSION_1_1);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);

// Configurar Headers
$headers = [
    "User-Agent: PokedexApp/1.0",
    "Accept: application/json"
];
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

// Ejecutar request con reintentos
$maxRetries = 2;
$attempt = 0;
$retryDelayMs = 500;

do {
    $attempt++;
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error_msg = curl_error($ch);
    
    // Si la petición fue exitosa o es un error cliente (ej. 404), salimos del bucle
    if ($response !== false && $httpCode < 500 && $httpCode != 429) {
        break;
    }
    
    // Esperar antes del siguiente intento si quedan más
    if ($attempt < $maxRetries) {
        usleep($retryDelayMs * 1000);
    }
} while ($attempt < $maxRetries);

// En PHP 8.0+ curl_init devuelve una instancia de CurlHandle que se libera automáticamente (curl_close queda deprecado en PHP 8.5)
unset($ch);

// Fallback automático a inglés ('en') si el recurso no existe en el idioma solicitado (404 en español, francés, etc.)
// o si el microservicio de ese idioma falla (500, 502, 503 "no available server").
// Esto ocurre frecuentemente con cartas promocionales (xyp-*) y expansiones antiguas (e-Card, etc.)
if (in_array($httpCode, [404, 500, 502, 503]) && $lang !== 'en' && strpos($targetUrl, "https://api.tcgdex.net/v2/{$lang}/") === 0) {
    $fallbackTargetUrl = str_replace("https://api.tcgdex.net/v2/{$lang}/", "https://api.tcgdex.net/v2/en/", $targetUrl);
    
    $chFallback = curl_init();
    curl_setopt($chFallback, CURLOPT_URL, $fallbackTargetUrl);
    curl_setopt($chFallback, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($chFallback, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($chFallback, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($chFallback, CURLOPT_TIMEOUT, $timeout);
    curl_setopt($chFallback, CURLOPT_CONNECTTIMEOUT, min(6, $timeout));
    curl_setopt($chFallback, CURLOPT_HTTP_VERSION, CURL_HTTP_VERSION_1_1);
    curl_setopt($chFallback, CURLOPT_SSL_VERIFYHOST, 0);
    curl_setopt($chFallback, CURLOPT_HTTPHEADER, $headers);
    
    // Reintentar fallback por si TCGDex tiene una pausa momentánea (503 "no available server")
    $fallbackAttempt = 0;
    do {
        $fallbackAttempt++;
        $fallbackResponse = curl_exec($chFallback);
        $fallbackHttpCode = curl_getinfo($chFallback, CURLINFO_HTTP_CODE);
        if ($fallbackResponse !== false && $fallbackHttpCode >= 200 && $fallbackHttpCode < 300) {
            break;
        }
        if ($fallbackAttempt < 2) {
            usleep(500 * 1000);
        }
    } while ($fallbackAttempt < 2);
    unset($chFallback);
    
    if ($fallbackResponse !== false && $fallbackHttpCode >= 200 && $fallbackHttpCode < 300) {
        $response = $fallbackResponse;
        $httpCode = $fallbackHttpCode;
        $targetUrl = $fallbackTargetUrl;
    }
}

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

    // Fallback seguro para cardDetail: responder 200 con payload informativo para evitar 503/404 en consola
    if ($endpoint === 'cardDetail') {
        http_response_code(200);
        echo json_encode([
            "error" => "Card details unavailable from external API",
            "id" => isset($_GET['id']) ? $_GET['id'] : '',
            "status" => $httpCode,
            "notFound" => true
        ]);
        exit;
    }

    // Fallback seguro para set: responder 200 con payload informativo
    if ($endpoint === 'set') {
        http_response_code(200);
        echo json_encode([
            "error" => "Set details unavailable from external API",
            "id" => isset($_GET['id']) ? $_GET['id'] : '',
            "status" => $httpCode,
            "notFound" => true
        ]);
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

// Responder con ETag y Cache-Control para el navegador (sin almacenar archivos locales)
sendResponseWithHeaders($response, $cacheTTL);
?>