<?php

declare(strict_types=1);

namespace App\Utils;

use App\Config\Env;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class JwtHelper
{
    private static string $algorithm = 'HS256';

    public static function encode(array $payload): string
    {
        $expiry = (int) Env::get('JWT_EXPIRY', '3600');

        $payload = array_merge($payload, [
            'iat' => time(),
            'exp' => time() + $expiry,
        ]);

        return JWT::encode($payload, self::secret(), self::$algorithm);
    }

    public static function decode(string $token): object
    {
        return JWT::decode($token, new Key(self::secret(), self::$algorithm));
    }

    private static function secret(): string
    {
        $secret = Env::get('JWT_SECRET');

        if (empty($secret)) {
            throw new \RuntimeException('JWT_SECRET is not set', 500);
        }

        return $secret;
    }
}
