<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Models\UserModel;
use App\Utils\JwtHelper;
use PDO;

class AuthController
{
    private UserModel $userModel;

    public function __construct(PDO $db)
    {
        $this->userModel = new UserModel($db);
    }

    // ── POST /api/auth/register ───────────────────────────────
    public function register(): never
    {
        $body = $this->parseBody();

        $name     = trim($body['name'] ?? '');
        $email    = trim($body['email'] ?? '');
        $password = $body['password'] ?? '';

        // Validation
        $errors = [];
        if (empty($name))                         $errors['name']     = 'Name is required.';
        if (empty($email))                        $errors['email']    = 'Email is required.';
        elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors['email'] = 'Invalid email address.';
        if (strlen($password) < 8)                $errors['password'] = 'Password must be at least 8 characters.';

        if ($errors) {
            respond(422, ['message' => 'Validation failed', 'errors' => $errors]);
        }

        if ($this->userModel->emailExists($email)) {
            respond(409, ['message' => 'Email is already registered.']);
        }

        $hash   = password_hash($password, PASSWORD_BCRYPT);
        $userId = $this->userModel->create($name, $email, $hash);

        $token = JwtHelper::encode(['sub' => $userId]);

        respond(201, [
            'message' => 'User registered successfully.',
            'token'   => $token,
        ]);
    }

    // ── POST /api/auth/login ──────────────────────────────────
    public function login(): never
    {
        $body = $this->parseBody();

        $email    = trim($body['email'] ?? '');
        $password = $body['password'] ?? '';

        if (empty($email) || empty($password)) {
            respond(422, ['message' => 'Email and password are required.']);
        }

        $user = $this->userModel->findByEmail($email);

        // Verify credentials (constant-time compare via password_verify)
        if (!$user || !password_verify($password, $user['password_hash'])) {
            respond(401, ['message' => 'Invalid email or password.']);
        }

        $token = JwtHelper::encode(['sub' => $user['id']]);

        respond(200, [
            'message' => 'Login successful.',
            'token'   => $token,
        ]);
    }

    // ── GET /api/auth/me ──────────────────────────────────────
    public function me(string $userId): never
    {
        $user = $this->userModel->findById($userId);

        if (!$user) {
            respond(404, ['message' => 'User not found.']);
        }

        respond(200, [
            'message' => 'Found user profile successfully.',
            'user' => $this->sanitize($user),
        ]);
    }

    // ── Helpers ───────────────────────────────────────────────
    private function parseBody(): array
    {
        $body = json_decode(file_get_contents('php://input'), true);

        if (!is_array($body)) {
            respond(400, ['message' => 'Invalid JSON body.']);
        }

        return $body;
    }

    private function sanitize(array $user): array
    {
        unset($user['password_hash']);
        return $user;
    }
}
