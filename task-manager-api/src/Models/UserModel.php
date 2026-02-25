<?php

declare(strict_types=1);

namespace App\Models;

use PDO;

class UserModel
{
    public function __construct(private PDO $db) {}

    public function findByEmail(string $email): array|false
    {
        $stmt = $this->db->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        return $stmt->fetch();
    }

    public function findById(string $id): array|false
    {
        $stmt = $this->db->prepare(
            'SELECT id, name, email, created_at, updated_at FROM users WHERE id = ? LIMIT 1'
        );
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function create(string $name, string $email, string $passwordHash): string
    {
        $stmt = $this->db->prepare(
            'INSERT INTO users (id, name, email, password_hash) VALUES (UUID(), ?, ?, ?)'
        );
        $stmt->execute([$name, $email, $passwordHash]);

        // Retrieve the UUID MySQL generated
        $row = $this->db->query("SELECT id FROM users WHERE email = " . $this->db->quote($email))->fetch();
        return $row['id'];
    }

    public function emailExists(string $email): bool
    {
        $stmt = $this->db->prepare('SELECT 1 FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        return (bool) $stmt->fetchColumn();
    }
}
