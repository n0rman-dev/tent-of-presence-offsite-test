<?php

declare(strict_types=1);

namespace App\Models;

use PDO;

class TaskModel
{
    public function __construct(private PDO $db) {}

    public function getUserTasks(
        string $userId,
        int $limit,
        int $offset,
        array $filters
    ): array {
        $sql = "SELECT * FROM tasks WHERE user_id = :user_id";
        $params = ['user_id' => $userId];

        if (!empty($filters['status'])) {
            $sql .= " AND status = :status";
            $params['status'] = $filters['status'];
        }

        if (!empty($filters['search'])) {
            $sql .= " AND title LIKE :search";
            $params['search'] = '%' . $filters['search'] . '%';
        }

        $sql .= " ORDER BY created_at DESC LIMIT :limit OFFSET :offset";

        $stmt = $this->db->prepare($sql);

        foreach ($params as $key => $value) {
            $stmt->bindValue(":$key", $value);
        }

        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function countUserTasks(string $userId, array $filters): int
    {
        $sql = "SELECT COUNT(*) FROM tasks WHERE user_id = :user_id";
        $params = ['user_id' => $userId];

        if (!empty($filters['status'])) {
            $sql .= " AND status = :status";
            $params['status'] = $filters['status'];
        }

        if (!empty($filters['search'])) {
            $sql .= " AND title LIKE :search";
            $params['search'] = '%' . $filters['search'] . '%';
        }

        $stmt = $this->db->prepare($sql);

        foreach ($params as $key => $value) {
            $stmt->bindValue(":$key", $value);
        }

        $stmt->execute();

        return (int) $stmt->fetchColumn();
    }

    public function create(
        string $userId,
        string $title,
        string $description,
        string $status,
        string $priority,
        string $due_date
    ): string {
        $stmt = $this->db->prepare("
            INSERT INTO tasks (user_id, title, description, status, priority, due_date, created_at)
            VALUES (:user_id, :title, :description, :status, :priority, :due_date, NOW())
        ");

        $stmt->execute([
            'user_id'       => $userId,
            'title'         => $title,
            'description'   => $description,
            'status'        => $status,
            'priority'      => $priority,
            'due_date'      => $due_date
        ]);

        // Retrieve the UUID MySQL generated
        $row = $this->db->query("SELECT id FROM tasks WHERE user_id = " . $this->db->quote($userId) . " AND title = " . $this->db->quote($title) . " ORDER BY created_at DESC LIMIT 1")->fetch();
        return $row['id'];
    }

    public function findById(string $id): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM tasks WHERE id = :id");
        $stmt->execute(['id' => $id]);

        $task = $stmt->fetch();

        return $task ?: null;
    }

    // Update a task
    public function update(string $taskId, array $fields): void
    {
        $set = [];
        $params = ['id' => $taskId];

        foreach ($fields as $key => $value) {
            $set[] = "$key = :$key";
            $params[$key] = $value;
        }

        $sql = "UPDATE tasks SET " . implode(', ', $set) . " WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
    }

    // Delete a task
    public function delete(string $taskId): void
    {
        $stmt = $this->db->prepare("DELETE FROM tasks WHERE id = :id");
        $stmt->execute(['id' => $taskId]);
    }
}