<?php
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

$baseUrlRest = "https://api.tcgdex.net/v2/" . $lang . "/";

// Obtener datos del request original
$method = $_SERVER['REQUEST_METHOD'];
$endpoint = isset($_GET['endpoint']) ? $_GET['endpoint'] : '';

$targetUrl = "";

if ($method === 'GET' && !empty($endpoint)) {
    
    // Lista de endpoints permitidos directos
    $allowedEndpoints = ['cards', 'sets', 'types', 'rarities', 'series', 'hp', 'retreats', 'illustrators', 'categories', 'suffixes'];
    
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
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_HTTP_VERSION, CURL_HTTP_VERSION_1_1);

// Configurar Headers
$headers = [
    "User-Agent: PokedexApp/1.0"
];
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

// Ejecutar request
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error_msg = curl_error($ch);
curl_close($ch);

// Log errors
if ($response === false) {
    $errorMsg = "Proxy Error (cURL): " . $error_msg . " [Target: $targetUrl]";
    error_log($errorMsg);
    http_response_code(500);
    echo json_encode(["error" => $errorMsg]);
    exit;
}

if ($httpCode >= 400) {
    http_response_code($httpCode);
    echo $response;
    exit;
}

// Responder (sin caché)
header('Content-Type: application/json');
echo $response;
?>