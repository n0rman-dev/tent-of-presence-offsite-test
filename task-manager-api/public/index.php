<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use App\Config\Database;
use App\Config\Env;
use App\Controllers\{
    AuthController,
    TaskController
};
use App\Middleware\AuthMiddleware;

// ── Bootstrap ────────────────────────────────────────────────
Env::load(__DIR__ . '/../.env');

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── Router ───────────────────────────────────────────────────
$method = $_SERVER['REQUEST_METHOD'];
$uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri    = rtrim($uri, '/');

$db         = Database::getInstance()->getConnection();
$auth       = new AuthController($db);
$middleware = new AuthMiddleware();
$tasks      = new TaskController($db);

try {
    match (true) {
        // ── Auth Routes ─────────────────────────────
        $method === 'POST' && $uri === '/api/auth/register' => $auth->register(),
        $method === 'POST' && $uri === '/api/auth/login'    => $auth->login(),
        $method === 'GET'  && $uri === '/api/auth/me'       => $auth->me($middleware->handle()),


        // ── Task Routes (Protected) ─────────────────
        $method === 'GET'  && $uri === '/api/tasks' => $tasks->index($middleware->handle()),
        $method === 'POST' && $uri === '/api/tasks' => $tasks->store($middleware->handle()),


        // ── Fallback ────────────────────────────────
        default => respond(404, ['message' => 'Route not found']),
    };
} catch (Throwable $e) {
    $status = (int) $e->getCode();
    respond($status >= 400 ? $status : 500, ['message' => $e->getMessage()]);
}

// ── Helper ───────────────────────────────────────────────────
function respond(int $status, array $data): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}
