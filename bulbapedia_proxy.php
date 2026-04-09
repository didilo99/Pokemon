<?php
/**
 * Bulbapedia Proxy & Scraper
 * Handles fetching and parsing data from Bulbapedia with local caching.
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");
header("Content-Type: application/json; charset=utf-8");

$query = isset($_GET['query']) ? trim($_GET['query']) : '';
$type = isset($_GET['type']) ? $_GET['type'] : 'pokemon'; // pokemon, move, ability, type, item, location

if (empty($query)) {
    http_response_code(400);
    echo json_encode(["error" => "Missing query parameter"]);
    exit;
}

// 1. Normalize query for Bulbapedia URLs
function normalizeBulbapediaName($name, $type) {
    // Replace hyphens with underscores, except for special cases
    $name = str_replace('-', '_', $name);
    // Capitalize each word (Bulbapedia style)
    $name = ucwords($name, '_');
    
    // Special cases for Pokémon names
    $specialPokes = [
        'Mr_Mime' => 'Mr._Mime',
        'Mime_Jr' => 'Mime_Jr.',
        'Mr_Rime' => 'Mr._Rime',
        'Porygon_Z' => 'Porygon-Z',
        'Type_Null' => 'Type:_Null',
        'Ho_Oh' => 'Ho-Oh',
        'Wo_Chien' => 'Wo-Chien',
        'Chien_Pao' => 'Chien-Pao',
        'Ting_Lu' => 'Ting-Lu',
        'Chi_Yu' => 'Chi-Yu',
        'Jangmo_O' => 'Jangmo-o',
        'Hakamo_O' => 'Hakamo-o',
        'Kommo_O' => 'Kommo-o',
    ];
    
    if (isset($specialPokes[$name])) {
        $name = $specialPokes[$name];
    }

    // Append suffixes based on type
    switch ($type) {
        case 'pokemon':
            return $name . '_(Pok%C3%A9mon)';
        case 'move':
            return $name . '_(move)';
        case 'ability':
            return $name . '_(Ability)';
        case 'type':
            return $name . '_(type)';
        case 'item':
            // Items usually don't have suffixes, but some might need "_(Item)"
            return $name;
        case 'location':
            return $name;
        default:
            return $name;
    }
}

$normalizedName = normalizeBulbapediaName($query, $type);
$cacheFile = __DIR__ . "/assets/cache/bulbapedia/" . md5($normalizedName) . ".json";
$cacheTime = 7 * 24 * 60 * 60; // 7 days

// 2. Check Cache
if (file_exists($cacheFile) && (time() - filemtime($cacheFile) < $cacheTime)) {
    echo file_get_contents($cacheFile);
    exit;
}

// 3. Rate Limiting (File-based lock for 5s delay as per robots.txt)
$lockFile = __DIR__ . "/assets/cache/bulbapedia/last_request.lock";
$now = microtime(true);
if (file_exists($lockFile)) {
    $lastRequest = (float)file_get_contents($lockFile);
    $wait = 5.0 - ($now - $lastRequest);
    if ($wait > 0) {
        usleep($wait * 1000000);
    }
}
file_put_contents($lockFile, microtime(true));

// 4. Fetch and Parse
$url = "https://bulbapedia.bulbagarden.net/wiki/" . $normalizedName;
$userAgent = "PokedexApp/1.0 (Educational Scraping; contact: diego@example.com)";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_USERAGENT, $userAgent);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
$html = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 200 || !$html) {
    http_response_code($httpCode === 404 ? 404 : 500);
    echo json_encode(["error" => "Could not fetch data from Bulbapedia", "url" => $url]);
    exit;
}

// 5. Extraction Logic
libxml_use_internal_errors(true);
$dom = new DOMDocument();
$dom->loadHTML('<?xml encoding="UTF-8">' . $html);
$xpath = new DOMXPath($dom);

$data = [
    "title" => $query,
    "url" => $url,
    "sections" => [],
    "images" => [],
    "trivia" => []
];

// Image extraction removed as per requirements


// Helper to extract text from a section
function extractSection($xpath, $id, &$data) {
    $header = $xpath->query("//h2[span[@id='$id']] | //h2[@id='$id']")->item(0);
    if ($header) {
        $content = "";
        $node = $header->nextSibling;
        while ($node && !($node->nodeType === XML_ELEMENT_NODE && $node->nodeName === 'h2')) {
            if ($node->nodeType === XML_ELEMENT_NODE) {
                if ($node->nodeName === 'p') {
                    $text = trim(preg_replace('/\[\d+\]/', '', $node->textContent)); // Remove references [1]
                    if (!empty($text)) $content .= $text . "\n\n";
                } elseif ($node->nodeName === 'ul' && $id === 'Trivia') {
                    foreach ($node->getElementsByTagName('li') as $li) {
                        $data['trivia'][] = trim(preg_replace('/\[\d+\]/', '', $li->textContent));
                    }
                }
            }
            $node = $node->nextSibling;
        }
        if (!empty(trim($content))) {
            $data['sections'][$id] = trim($content);
        }
    }
}

$targetSections = ['Biology', 'Effect', 'Description', 'Trivia', 'Geography', 'Evolution'];
foreach ($targetSections as $sec) {
    extractSection($xpath, $sec, $data);
}

// Extract introductory paragraph if Biology/Effect are missing
if (empty($data['sections'])) {
    $introP = $xpath->query("//div[@id='mw-content-text']/div/p[not(contains(@class, 'mw-empty-elt'))]")->item(0);
    if ($introP) {
        $data['sections']['Summary'] = trim(preg_replace('/\[\d+\]/', '', $introP->textContent));
    }
}

// 6. Save and Return
$json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
file_put_contents($cacheFile, $json);
echo $json;
