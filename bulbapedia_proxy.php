<?php
/**
 * Bulbapedia & Pokémon Lore Proxy / Scraper
 * Multi-tier encyclopedic fetcher: Bulbapedia -> WikiDex -> Pokémon Wiki -> PokéAPI
 * Provides high-speed, reliable, CORS-free extra lore data for Pokémon, Moves, Abilities, Items, Locations, and Types.
 */

// Enable output compression if supported
if (!ob_start("ob_gzhandler")) {
    ob_start();
}

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=utf-8");

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$query = isset($_GET['query']) ? trim($_GET['query']) : '';
$type = isset($_GET['type']) ? strtolower(trim($_GET['type'])) : 'pokemon'; // pokemon, move, ability, type, item, location
$lang = isset($_GET['lang']) ? strtolower(trim($_GET['lang'])) : 'es';

if (empty($query)) {
    http_response_code(400);
    echo json_encode(["error" => "Missing query parameter"]);
    exit;
}

function sendProxyResponse(array $data): void {
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $etag = '"' . md5($json) . '"';
    header("ETag: " . $etag);
    header("Cache-Control: public, max-age=604800"); // 7 days HTTP cache
    if (isset($_SERVER['HTTP_IF_NONE_MATCH']) && trim($_SERVER['HTTP_IF_NONE_MATCH']) === $etag) {
        http_response_code(304);
        exit;
    }
    echo $json;
    exit;
}

function normalizeEntity(string $name, string $type): array {
    $clean = $name;
    if ($type === 'pokemon') {
        $suffixes = [
            '-normal', '-altered', '-origin', '-land', '-sky', '-standard', '-zen',
            '-incarnate', '-therian', '-ordinary', '-resolute', '-aria', '-pirouette',
            '-male', '-female', '-shield', '-blade', '-average', '-small', '-large',
            '-super', '-50', '-10', '-complete', '-baile', '-pom-pom', '-pau',
            '-sensu', '-midday', '-midnight', '-dusk', '-solo', '-school', '-red-meteor',
            '-disguised', '-busted', '-amped', '-low-key', '-ice', '-noice',
            '-full-belly', '-hangry', '-single-strike', '-rapid-strike',
            '-ice-rider', '-shadow-rider', '-hero', '-crowned'
        ];
        foreach ($suffixes as $s) {
            if (str_ends_with($clean, $s)) {
                $clean = substr($clean, 0, -strlen($s));
                break;
            }
        }
    }

    $formatted = str_replace(['-', '_'], ' ', $clean);
    $formatted = ucwords($formatted);

    $specials = [
        'Mr Mime' => 'Mr. Mime',
        'Mime Jr' => 'Mime Jr.',
        'Mr Rime' => 'Mr. Rime',
        'Type Null' => 'Type: Null',
        'Ho Oh' => 'Ho-Oh',
        'Porygon Z' => 'Porygon-Z',
        'Jangmo O' => 'Jangmo-o',
        'Hakamo O' => 'Hakamo-o',
        'Kommo O' => 'Kommo-o',
        'Wo Chien' => 'Wo-Chien',
        'Chien Pao' => 'Chien-Pao',
        'Ting Lu' => 'Ting-Lu',
        'Chi Yu' => 'Chi-Yu',
        'Flabebe' => 'Flabébé',
        'Farfetchd' => "Farfetch'd",
        'Sirfetchd' => "Sirfetch'd",
        'Nidoran F' => 'Nidoran♀',
        'Nidoran M' => 'Nidoran♂',
    ];
    if (isset($specials[$formatted])) {
        $formatted = $specials[$formatted];
    }

    return [
        'clean' => $clean,
        'title' => $formatted
    ];
}

function cleanHtmlToText(string $html): string {
    libxml_use_internal_errors(true);
    $dom = new DOMDocument();
    $dom->loadHTML('<?xml encoding="UTF-8">' . $html);
    $xpath = new DOMXPath($dom);

    $remove = $xpath->query('//script | //style | //aside | //table | //nav | //figure | //div[contains(@class, "toc")] | //div[contains(@class, "mw-empty-elt")] | //div[contains(@class, "tabber")]');
    foreach ($remove as $n) {
        if ($n->parentNode) $n->parentNode->removeChild($n);
    }

    $paras = [];
    foreach ($xpath->query('//p') as $p) {
        $t = trim(preg_replace('/\[\d+\]/', '', $p->textContent));
        $t = preg_replace('/\s+/', ' ', $t);
        if (strlen($t) > 20) {
            $paras[] = $t;
        }
    }
    return implode("\n\n", $paras);
}

function cleanHtmlToList(string $html, int $max = 10): array {
    libxml_use_internal_errors(true);
    $dom = new DOMDocument();
    $dom->loadHTML('<?xml encoding="UTF-8">' . $html);
    $xpath = new DOMXPath($dom);

    $items = [];
    foreach ($xpath->query('//ul/li') as $li) {
        $t = trim(preg_replace('/\[\d+\]/', '', $li->textContent));
        $t = preg_replace('/\s+/', ' ', $t);
        if (strlen($t) > 15) {
            $items[] = $t;
            if (count($items) >= $max) break;
        }
    }
    return $items;
}

// 1. Direct Bulbapedia scraper (if not blocked by Cloudflare)
function fetchBulbapediaDirect(string $title, string $type): ?array {
    $suffix = match ($type) {
        'pokemon' => '_(Pok%C3%A9mon)',
        'move' => '_(move)',
        'ability' => '_(Ability)',
        'type' => '_(type)',
        default => ''
    };
    $pageName = str_replace(' ', '_', $title) . $suffix;
    $url = "https://bulbapedia.bulbagarden.net/wiki/" . $pageName;

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 3);
    $html = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if ($code !== 200 || !$html || str_contains($html, 'challenges.cloudflare.com') || str_contains($html, 'Just a moment...')) {
        return null; // Blocked or unavailable
    }

    libxml_use_internal_errors(true);
    $dom = new DOMDocument();
    $dom->loadHTML('<?xml encoding="UTF-8">' . $html);
    $xpath = new DOMXPath($dom);

    $data = [
        "title" => $title,
        "url" => $url,
        "source" => "Bulbapedia",
        "sections" => [],
        "trivia" => []
    ];

    $targetSections = ['Biology', 'Effect', 'Description', 'Geography', 'Evolution'];
    foreach ($targetSections as $secId) {
        $header = $xpath->query("//h2[span[@id='$secId']] | //h2[@id='$secId']")->item(0);
        if ($header) {
            $content = "";
            $node = $header->nextSibling;
            while ($node && !($node->nodeType === XML_ELEMENT_NODE && $node->nodeName === 'h2')) {
                if ($node->nodeType === XML_ELEMENT_NODE && $node->nodeName === 'p') {
                    $text = trim(preg_replace('/\[\d+\]/', '', $node->textContent));
                    if (!empty($text)) $content .= $text . "\n\n";
                }
                $node = $node->nextSibling;
            }
            if (!empty(trim($content))) {
                $data['sections'][$secId] = trim($content);
            }
        }
    }

    $triviaHeader = $xpath->query("//h2[span[@id='Trivia']] | //h2[@id='Trivia']")->item(0);
    if ($triviaHeader) {
        $node = $triviaHeader->nextSibling;
        while ($node && !($node->nodeType === XML_ELEMENT_NODE && $node->nodeName === 'h2')) {
            if ($node instanceof DOMElement && $node->nodeName === 'ul') {
                foreach ($node->getElementsByTagName('li') as $li) {
                    $t = trim(preg_replace('/\[\d+\]/', '', $li->textContent));
                    if (strlen($t) > 15) {
                        $data['trivia'][] = $t;
                        if (count($data['trivia']) >= 10) break 2;
                    }
                }
            }
            $node = $node->nextSibling;
        }
    }

    return (!empty($data['sections']) || !empty($data['trivia'])) ? $data : null;
}

// 2. WikiDex Scraper (Spanish MediaWiki API)
function fetchWikiDex(string $title, string $type, string $cleanName): ?array {
    $searchTitle = $title;
    if ($type === 'type') {
        $spanishTypes = [
            'normal' => 'Tipo Normal',
            'fire' => 'Tipo Fuego',
            'water' => 'Tipo Agua',
            'grass' => 'Tipo Planta',
            'electric' => 'Tipo Eléctrico',
            'ice' => 'Tipo Hielo',
            'fighting' => 'Tipo Lucha',
            'poison' => 'Tipo Veneno',
            'ground' => 'Tipo Tierra',
            'flying' => 'Tipo Volador',
            'psychic' => 'Tipo Psíquico',
            'bug' => 'Tipo Bicho',
            'rock' => 'Tipo Roca',
            'ghost' => 'Tipo Fantasma',
            'dragon' => 'Tipo Dragón',
            'steel' => 'Tipo Acero',
            'dark' => 'Tipo Siniestro',
            'fairy' => 'Tipo Hada',
            'stellar' => 'Tipo Astral',
        ];
        $searchTitle = $spanishTypes[strtolower($cleanName)] ?? ('Tipo ' . $title);
    }

    $url = 'https://www.wikidex.net/api.php?action=parse&page=' . urlencode(str_replace(' ', '_', $searchTitle)) . '&redirects=1&prop=sections&format=json';
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_USERAGENT, 'PokedexApp/2.0 (Spanish Encyclopedia; contact: info@pokedex.local)');
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    $raw = curl_exec($ch);
    $json = json_decode($raw, true);

    if (!isset($json['parse']['sections'])) {
        return null;
    }

    $pageTitle = $json['parse']['title'];
    $sections = $json['parse']['sections'];
    $data = [
        'title' => $pageTitle,
        'url' => 'https://www.wikidex.net/wiki/' . urlencode(str_replace(' ', '_', $pageTitle)),
        'bulbapedia_url' => 'https://bulbapedia.bulbagarden.net/wiki/' . urlencode(str_replace(' ', '_', $title)),
        'source' => 'WikiDex (Enciclopedia Pokémon)',
        'sections' => [],
        'trivia' => []
    ];

    $targetSections = [
        'etimología' => 'Etimología',
        'biología' => 'Biología',
        'evolución' => 'Evolución',
        'efecto' => 'Efecto',
        'descripción' => 'Descripción',
        'en combate' => 'Efecto en Combate',
    ];

    foreach ($sections as $sec) {
        $cleanLine = strtolower(trim(strip_tags($sec['line'])));
        $secIndex = (int)$sec['index'];

        if ($cleanLine === 'curiosidades' && empty($data['trivia'])) {
            $secUrl = 'https://www.wikidex.net/api.php?action=parse&page=' . urlencode($pageTitle) . '&prop=text&section=' . $secIndex . '&format=json';
            curl_setopt($ch, CURLOPT_URL, $secUrl);
            $secRaw = curl_exec($ch);
            $secJson = json_decode($secRaw, true);
            if (isset($secJson['parse']['text']['*'])) {
                $data['trivia'] = cleanHtmlToList($secJson['parse']['text']['*']);
            }
        } elseif (isset($targetSections[$cleanLine]) && !isset($data['sections'][$targetSections[$cleanLine]])) {
            $canonicalKey = $targetSections[$cleanLine];
            $secUrl = 'https://www.wikidex.net/api.php?action=parse&page=' . urlencode($pageTitle) . '&prop=text&section=' . $secIndex . '&format=json';
            curl_setopt($ch, CURLOPT_URL, $secUrl);
            $secRaw = curl_exec($ch);
            $secJson = json_decode($secRaw, true);
            if (isset($secJson['parse']['text']['*'])) {
                $text = cleanHtmlToText($secJson['parse']['text']['*']);
                if (!empty($text)) {
                    $data['sections'][$canonicalKey] = $text;
                }
            }
        }
    }

    if (empty($data['sections'])) {
        $secUrl = 'https://www.wikidex.net/api.php?action=parse&page=' . urlencode($pageTitle) . '&prop=text&section=0&format=json';
        curl_setopt($ch, CURLOPT_URL, $secUrl);
        $secRaw = curl_exec($ch);
        $secJson = json_decode($secRaw, true);
        if (isset($secJson['parse']['text']['*'])) {
            $intro = cleanHtmlToText($secJson['parse']['text']['*']);
            if (!empty($intro)) {
                $data['sections']['Resumen'] = $intro;
            }
        }
    }

    return (!empty($data['sections']) || !empty($data['trivia'])) ? $data : null;
}

// 3. Pokémon Wiki (Fandom MediaWiki API - English counterpart)
function fetchFandom(string $title, string $type): ?array {
    $searchTitle = $title;
    if ($type === 'type') {
        $searchTitle = $title . ' type';
    }

    $url = 'https://pokemon.fandom.com/api.php?action=parse&page=' . urlencode(str_replace(' ', '_', $searchTitle)) . '&redirects=1&prop=sections&format=json';
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    $raw = curl_exec($ch);
    $json = json_decode($raw, true);

    if (!isset($json['parse']['sections'])) {
        if ($type === 'type') {
            $url = 'https://pokemon.fandom.com/api.php?action=parse&page=' . urlencode(str_replace(' ', '_', $title)) . '&redirects=1&prop=sections&format=json';
            curl_setopt($ch, CURLOPT_URL, $url);
            $raw = curl_exec($ch);
            $json = json_decode($raw, true);
        }
    }

    if (!isset($json['parse']['sections'])) {
        return null;
    }

    $pageTitle = $json['parse']['title'];
    $sections = $json['parse']['sections'];
    $data = [
        'title' => $pageTitle,
        'url' => 'https://bulbapedia.bulbagarden.net/wiki/' . urlencode(str_replace(' ', '_', $title)),
        'source' => 'Bulbapedia / Pokémon Wiki',
        'sections' => [],
        'trivia' => []
    ];

    $targetSections = [
        'biology' => 'Biology',
        'physiology' => 'Physiology',
        'behavior' => 'Behavior',
        'evolution' => 'Evolution',
        'effect' => 'Effect',
        'description' => 'Description',
        'geography' => 'Geography'
    ];

    foreach ($sections as $sec) {
        $cleanLine = strtolower(trim(strip_tags($sec['line'])));
        $secIndex = (int)$sec['index'];

        if ($cleanLine === 'trivia' && empty($data['trivia'])) {
            $secUrl = 'https://pokemon.fandom.com/api.php?action=parse&page=' . urlencode($pageTitle) . '&prop=text&section=' . $secIndex . '&format=json';
            curl_setopt($ch, CURLOPT_URL, $secUrl);
            $secRaw = curl_exec($ch);
            $secJson = json_decode($secRaw, true);
            if (isset($secJson['parse']['text']['*'])) {
                $data['trivia'] = cleanHtmlToList($secJson['parse']['text']['*']);
            }
        } elseif (isset($targetSections[$cleanLine]) && !isset($data['sections'][$targetSections[$cleanLine]])) {
            $canonicalKey = $targetSections[$cleanLine];
            $secUrl = 'https://pokemon.fandom.com/api.php?action=parse&page=' . urlencode($pageTitle) . '&prop=text&section=' . $secIndex . '&format=json';
            curl_setopt($ch, CURLOPT_URL, $secUrl);
            $secRaw = curl_exec($ch);
            $secJson = json_decode($secRaw, true);
            if (isset($secJson['parse']['text']['*'])) {
                $text = cleanHtmlToText($secJson['parse']['text']['*']);
                if (!empty($text)) {
                    $data['sections'][$canonicalKey] = $text;
                }
            }
        }
    }

    if (empty($data['sections'])) {
        $secUrl = 'https://pokemon.fandom.com/api.php?action=parse&page=' . urlencode($pageTitle) . '&prop=text&section=0&format=json';
        curl_setopt($ch, CURLOPT_URL, $secUrl);
        $secRaw = curl_exec($ch);
        $secJson = json_decode($secRaw, true);
        if (isset($secJson['parse']['text']['*'])) {
            $intro = cleanHtmlToText($secJson['parse']['text']['*']);
            if (!empty($intro)) {
                $data['sections']['Summary'] = $intro;
            }
        }
    }

    return (!empty($data['sections']) || !empty($data['trivia'])) ? $data : null;
}

// 4. Infallible PokéAPI Fallback
function fetchPokeApiFallback(string $name, string $type, string $lang): ?array {
    $endpoint = match ($type) {
        'pokemon' => 'pokemon-species',
        'move' => 'move',
        'ability' => 'ability',
        'item' => 'item',
        'location' => 'location',
        'type' => 'type',
        default => 'pokemon-species'
    };

    $cleanName = strtolower(trim(str_replace([' ', '_'], '-', $name)));
    $speciesName = explode('-', $cleanName)[0];

    $url = "https://pokeapi.co/api/v2/{$endpoint}/{$cleanName}";
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_USERAGENT, 'PokedexApp/2.0');
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    $raw = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if ($code !== 200 && $endpoint === 'pokemon-species' && $speciesName !== $cleanName) {
        curl_setopt($ch, CURLOPT_URL, "https://pokeapi.co/api/v2/{$endpoint}/{$speciesName}");
        $raw = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    }

    if ($code !== 200 || !$raw) return null;
    $d = json_decode($raw, true);
    if (!$d) return null;

    $title = ucwords(str_replace('-', ' ', $d['name'] ?? $name));
    $bulbUrl = "https://bulbapedia.bulbagarden.net/wiki/" . urlencode(str_replace(' ', '_', $title));
    $res = [
        'title' => $title,
        'url' => $bulbUrl,
        'source' => 'Archivo Oficial Pokémon (PokéAPI)',
        'sections' => [],
        'trivia' => []
    ];

    if (isset($d['flavor_text_entries'])) {
        $texts = [];
        $targetLangs = ($lang === 'es') ? ['es', 'en'] : ['en', 'es'];
        foreach ($targetLangs as $l) {
            foreach (array_reverse($d['flavor_text_entries']) as $entry) {
                if (($entry['language']['name'] ?? '') === $l) {
                    $clean = trim(preg_replace('/\s+/', ' ', str_replace(["\f", "\n"], ' ', $entry['flavor_text'])));
                    if (!in_array($clean, $texts)) {
                        $version = ucwords(str_replace('-', ' ', $entry['version']['name'] ?? ''));
                        $texts[] = ($version ? "• [{$version}]: " : "• ") . $clean;
                        if (count($texts) >= 5) break 2;
                    }
                }
            }
        }
        if (!empty($texts)) {
            $res['sections'][$lang === 'es' ? 'Descripciones Oficiales' : 'Official Descriptions'] = implode("\n\n", $texts);
        }
    }

    if (isset($d['effect_entries'])) {
        foreach ($d['effect_entries'] as $ee) {
            $l = $ee['language']['name'] ?? '';
            if ($l === $lang || ($l === 'en' && empty($res['sections']['Efecto']))) {
                $clean = trim(preg_replace('/\s+/', ' ', str_replace(["\f", "\n"], ' ', $ee['effect'])));
                $res['sections'][$lang === 'es' ? 'Efecto' : 'Effect'] = $clean;
                break;
            }
        }
    }

    if (isset($d['genera'])) {
        foreach ($d['genera'] as $g) {
            if (($g['language']['name'] ?? '') === $lang || ($g['language']['name'] ?? '') === 'en') {
                $res['trivia'][] = ($lang === 'es' ? "Categoría: " : "Category: ") . $g['genus'];
                break;
            }
        }
    }
    if (isset($d['is_legendary']) && $d['is_legendary']) {
        $res['trivia'][] = $lang === 'es' ? "Es un Pokémon Legendario." : "It is a Legendary Pokémon.";
    }
    if (isset($d['is_mythical']) && $d['is_mythical']) {
        $res['trivia'][] = $lang === 'es' ? "Es un Pokémon Mítico / Singular." : "It is a Mythical Pokémon.";
    }
    if (isset($d['habitat']['name'])) {
        $res['trivia'][] = ($lang === 'es' ? "Hábitat natural: " : "Natural Habitat: ") . ucwords(str_replace('-', ' ', $d['habitat']['name']));
    }

    return (!empty($res['sections']) || !empty($res['trivia'])) ? $res : null;
}

// EXECUTION PIPELINE
$entityInfo = normalizeEntity($query, $type);
$title = $entityInfo['title'];
$clean = $entityInfo['clean'];

// Priority 1: Direct Bulbapedia
$result = fetchBulbapediaDirect($title, $type);

// Priority 2: WikiDex (if language is Spanish, or as primary Spanish wiki)
if (!$result && ($lang === 'es' || $lang === 'es-es')) {
    $result = fetchWikiDex($title, $type, $clean);
}

// Priority 3: Pokémon Wiki (Fandom / Bulbapedia Mirror)
if (!$result) {
    $result = fetchFandom($title, $type);
}

// Priority 4: WikiDex if English was requested but Fandom had no content
if (!$result) {
    $result = fetchWikiDex($title, $type, $clean);
}

// Priority 5: PokéAPI Fallback
if (!$result) {
    $result = fetchPokeApiFallback($query, $type, $lang);
}

// Return result or fallback message
if ($result) {
    sendProxyResponse($result);
} else {
    // Return a valid JSON structure rather than throwing a 500 error
    sendProxyResponse([
        "title" => $title,
        "url" => "https://bulbapedia.bulbagarden.net/wiki/" . urlencode(str_replace(' ', '_', $title)),
        "source" => "Bulbapedia",
        "sections" => [
            ($lang === 'es' ? "Información" : "Information") => ($lang === 'es'
                ? "No se pudo recuperar información extendida para este elemento en la enciclopedia externa."
                : "Could not retrieve extended information for this entry from the external encyclopedia.")
        ],
        "trivia" => []
    ]);
}
