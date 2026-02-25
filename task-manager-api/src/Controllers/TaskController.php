<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Models\TaskModel;
use PDO;

class TaskController
{
    private TaskModel $taskModel;

    public function __construct(PDO $db)
    {
        $this->taskModel = new TaskModel($db);
    }

    // ── GET /api/tasks ──────────────────────────────────────
    public function index(string $userId): never
    {
        $query = $_GET;

        $page     = max(1, (int)($query['page'] ?? 1));
        $limit    = min(100, max(1, (int)($query['limit'] ?? 10)));
        $status   = $query['status'] ?? null;
        $search   = trim($query['search'] ?? '');

        $offset = ($page - 1) * $limit;

        $filters = [
            'status' => $status,
            'search' => $search
        ];

        $tasks = $this->taskModel->getUserTasks(
            $userId,
            $limit,
            $offset,
            $filters
        );

        $total = $this->taskModel->countUserTasks($userId, $filters);

        respond(200, [
            'message' => 'Tasks retrieved successfully.',
            'data' => $tasks,
            'meta' => [
                'page'  => $page,
                'limit' => $limit,
                'total' => $total,
                'pages' => ceil($total / $limit),
            ]
        ]);
    }

    // ── POST /api/tasks ─────────────────────────────────────
    public function store(string $userId): never
    {
        $body = $this->parseBody();

        $title          = trim($body['title'] ?? '');
        $description    = trim($body['description'] ?? '');
        $status         = $body['status'] ?? 'todo';
        $priority       = $body['priority'] ?? 'low';
        $due_date       = !empty($body['due_date']) ? $body['due_date'] : null;

        $errors = [];

        if (empty($title)) {
            $errors['title'] = 'Title is required.';
        }

        if (!in_array($status, ['todo', 'in_progress', 'done'], true)) {
            $errors['status'] = 'Invalid status value.';
        }

        if (!in_array($priority, ['low', 'medium', 'high'], true)) {
            $errors['priority'] = 'Invalid priority value.';
        }

        if ($errors) {
            respond(422, [
                'message' => 'Validation failed.',
                'errors'  => $errors
            ]);
        }

        $taskId = $this->taskModel->create(
            $userId,
            $title,
            $description,
            $status,
            $priority,
            $due_date
        );

        $task = $this->taskModel->findById($taskId);

        respond(201, [
            'message' => 'Task created successfully.',
            'data'    => $task
        ]);
    }

    // ── GET /api/tasks/:id ─────────────────────────────────
    public function show(string $userId, string $taskId): never
    {
        $task = $this->taskModel->findById($taskId);

        if (!$task || $task['user_id'] !== $userId) {
            respond(404, ['message' => 'Task not found.']);
        }

        respond(200, [
            'message' => 'Task retrieved successfully.',
            'data'    => $task
        ]);
    }

    // ── PATCH /api/tasks/:id ──────────────────────────────
    public function update(string $userId, string $taskId): never
    {
        $task = $this->taskModel->findById($taskId);

        if (!$task || $task['user_id'] !== $userId) {
            respond(404, ['message' => 'Task not found.']);
        }

        $body = $this->parseBody();

        $fields = [];
        $allowed = ['title', 'description', 'status', 'priority', 'due_date'];

        foreach ($allowed as $field) {
            if (isset($body[$field])) {
                $fields[$field] = $body[$field];
            }
        }

        if (isset($fields['status']) && !in_array($fields['status'], ['todo', 'in_progress', 'done'], true)) {
            respond(422, ['message' => 'Invalid status value.']);
        }

        if (isset($fields['priority']) && !in_array($fields['priority'], ['low', 'medium', 'high'], true)) {
            respond(422, ['message' => 'Invalid status value.']);
        }

        $this->taskModel->update($taskId, $fields);

        $updatedTask = $this->taskModel->findById($taskId);

        respond(200, [
            'message' => 'Task updated successfully.',
            'data'    => $updatedTask
        ]);
    }

    // ── DELETE /api/tasks/:id ──────────────────────────────
    public function destroy(string $userId, string $taskId): never
    {
        $task = $this->taskModel->findById($taskId);

        if (!$task || $task['user_id'] !== $userId) {
            respond(404, ['message' => 'Task not found.']);
        }

        $this->taskModel->delete($taskId);

        respond(200, ['message' => 'Task deleted successfully.']);
    }

    // ── Helpers ───────────────────────────────────────────
    private function parseBody(): array
    {
        $body = json_decode(file_get_contents('php://input'), true);

        if (!is_array($body)) {
            respond(400, ['message' => 'Invalid JSON body.']);
        }

        return $body;
    }
}