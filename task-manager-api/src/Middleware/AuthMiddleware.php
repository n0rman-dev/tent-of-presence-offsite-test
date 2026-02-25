<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Utils\JwtHelper;
use Firebase\JWT\ExpiredException;
use Firebase\JWT\SignatureInvalidException;

class AuthMiddleware
{
    /**
     * Validates the Authorization header and returns the authenticated user ID.
     */
    public function handle(): string
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';

        if (empty($header) || !str_starts_with($header, 'Bearer ')) {
            respond(401, ['message' => 'Authorization token not provided.']);
        }

        $token = substr($header, 7);

        try {
            $payload = JwtHelper::decode($token);
        } catch (ExpiredException) {
            respond(401, ['message' => 'Token has expired.']);
        } catch (SignatureInvalidException) {
            respond(401, ['message' => 'Token signature is invalid.']);
        } catch (\Throwable) {
            respond(401, ['message' => 'Invalid token.']);
        }

        if (empty($payload->sub)) {
            respond(401, ['message' => 'Invalid token payload.']);
        }

        return $payload->sub;
    }
}
