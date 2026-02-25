CREATE SCHEMA IF NOT EXISTS task_manager;
USE task_manager;

CREATE TABLE IF NOT EXISTS users (
  id            CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
  id          CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  status      ENUM('todo', 'in_progress', 'done') NOT NULL DEFAULT 'todo',
  priority    ENUM('low', 'medium', 'high')        NOT NULL DEFAULT 'medium',
  due_date    DATETIME     NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  user_id     CHAR(36)     NOT NULL,
  CONSTRAINT fk_tasks_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE USER IF NOT EXISTS 'task_manager_user'@'localhost' IDENTIFIED BY 'strong_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON task_manager.* TO 'task_manager_user'@'localhost';