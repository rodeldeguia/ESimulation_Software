/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: activity_logs
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `activity_logs` (
  `log_id` int NOT NULL AUTO_INCREMENT,
  `actor_type` enum('teacher', 'student') NOT NULL,
  `actor_id` int NOT NULL,
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(50) NOT NULL,
  `entity_id` int DEFAULT NULL,
  `details` json DEFAULT NULL,
  `ip_address` varchar(50) DEFAULT NULL,
  `user_agent` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`)
) ENGINE = InnoDB AUTO_INCREMENT = 18 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: clause_quiz
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `clause_quiz` (
  `question_id` int NOT NULL AUTO_INCREMENT,
  `quiz_id` int NOT NULL,
  `question_text` varchar(500) NOT NULL,
  `instructions` text,
  `points` int DEFAULT '1',
  `hint` text,
  `sentence` longtext NOT NULL,
  `clause_text` longtext NOT NULL,
  `clause_type` varchar(50) NOT NULL,
  `options` json NOT NULL,
  `correct_option_index` int NOT NULL,
  `explanation` text,
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`question_id`),
  KEY `quiz_id` (`quiz_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `clause_quiz_ibfk_1` FOREIGN KEY (`quiz_id`) REFERENCES `quizzes` (`quiz_id`) ON DELETE CASCADE,
  CONSTRAINT `clause_quiz_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `teachers` (`teacher_id`) ON DELETE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 24 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: collective_nouns_dictionary
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `collective_nouns_dictionary` (
  `id` int NOT NULL AUTO_INCREMENT,
  `noun` varchar(50) NOT NULL,
  `is_approved` tinyint(1) DEFAULT '1',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `noun` (`noun`)
) ENGINE = InnoDB AUTO_INCREMENT = 16 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: embedded_quizzes
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `embedded_quizzes` (
  `embed_quiz_id` int NOT NULL AUTO_INCREMENT,
  `lesson_id` int NOT NULL,
  `question_text` text NOT NULL,
  `options` json NOT NULL,
  `correct_option_index` int NOT NULL,
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`embed_quiz_id`),
  KEY `lesson_id` (`lesson_id`),
  CONSTRAINT `embedded_quizzes_ibfk_1` FOREIGN KEY (`lesson_id`) REFERENCES `lessons` (`lesson_id`) ON DELETE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 41 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: grammar_suggestions
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `grammar_suggestions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `word` varchar(50) NOT NULL,
  `type` enum('verb', 'collective_noun') NOT NULL,
  `suggested_by` int NOT NULL,
  `status` enum('pending', 'approved', 'rejected') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: irregular_verb_quiz
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `irregular_verb_quiz` (
  `question_id` int NOT NULL AUTO_INCREMENT,
  `quiz_id` int NOT NULL,
  `question_text` varchar(500) NOT NULL,
  `instructions` text,
  `points` int DEFAULT '1',
  `hint` text,
  `present_form` varchar(50) NOT NULL,
  `past_form` varchar(50) NOT NULL,
  `future_form` varchar(50) NOT NULL,
  `past_participle` varchar(50) NOT NULL,
  `alternative_answers` json DEFAULT NULL,
  `explanation` text,
  `example_sentence` text,
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `blank_fields` json NOT NULL,
  PRIMARY KEY (`question_id`),
  KEY `quiz_id` (`quiz_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `irregular_verb_quiz_ibfk_1` FOREIGN KEY (`quiz_id`) REFERENCES `quizzes` (`quiz_id`) ON DELETE CASCADE,
  CONSTRAINT `irregular_verb_quiz_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `teachers` (`teacher_id`) ON DELETE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 9 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: lessons
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `lessons` (
  `lesson_id` int NOT NULL AUTO_INCREMENT,
  `teacher_id` int NOT NULL,
  `lesson_order` int NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text,
  `discussion_content` longtext NOT NULL,
  `grade_level` json NOT NULL,
  `prerequisite_lesson_id` int DEFAULT NULL,
  `passing_score` decimal(5, 2) DEFAULT '70.00',
  `max_quiz_attempts` int DEFAULT '3',
  `word_count` int DEFAULT '0',
  `reading_time_estimate` int DEFAULT '0',
  `is_published` tinyint(1) DEFAULT '1',
  `published_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`lesson_id`),
  KEY `teacher_id` (`teacher_id`),
  KEY `prerequisite_lesson_id` (`prerequisite_lesson_id`),
  CONSTRAINT `lessons_ibfk_1` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`teacher_id`) ON DELETE CASCADE,
  CONSTRAINT `lessons_ibfk_2` FOREIGN KEY (`prerequisite_lesson_id`) REFERENCES `lessons` (`lesson_id`) ON DELETE
  SET
  NULL
) ENGINE = InnoDB AUTO_INCREMENT = 55 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: phrasal_verb_quiz
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `phrasal_verb_quiz` (
  `question_id` int NOT NULL AUTO_INCREMENT,
  `quiz_id` int NOT NULL,
  `instruction` varchar(500) NOT NULL,
  `points` int DEFAULT '2',
  `hint` text,
  `alternative_verbs` json DEFAULT NULL,
  `min_sentence_length` int DEFAULT '5',
  `max_sentence_length` int DEFAULT '50',
  `example_sentence` text,
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`question_id`),
  KEY `quiz_id` (`quiz_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `phrasal_verb_quiz_ibfk_1` FOREIGN KEY (`quiz_id`) REFERENCES `quizzes` (`quiz_id`) ON DELETE CASCADE,
  CONSTRAINT `phrasal_verb_quiz_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `teachers` (`teacher_id`) ON DELETE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 20 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: preposition_quiz
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `preposition_quiz` (
  `question_id` int NOT NULL AUTO_INCREMENT,
  `quiz_id` int NOT NULL,
  `question_text` varchar(500) NOT NULL,
  `instructions` text,
  `points` int DEFAULT '1',
  `hint` text,
  `correct_answer` varchar(20) NOT NULL,
  `options` json NOT NULL,
  `correct_option_index` int NOT NULL,
  `explanation` text,
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`question_id`),
  KEY `quiz_id` (`quiz_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `preposition_quiz_ibfk_1` FOREIGN KEY (`quiz_id`) REFERENCES `quizzes` (`quiz_id`) ON DELETE CASCADE,
  CONSTRAINT `preposition_quiz_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `teachers` (`teacher_id`) ON DELETE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 77 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: quizzes
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `quizzes` (
  `quiz_id` int NOT NULL AUTO_INCREMENT,
  `lesson_id` int NOT NULL,
  `teacher_id` int NOT NULL,
  `quiz_type` enum(
  'irregular_verb',
  'preposition',
  'clause',
  'phrasal_verb',
  'sva',
  'sentence_pattern'
  ) NOT NULL,
  `quiz_purpose` enum('review', 'final', 'pretest') NOT NULL DEFAULT 'final',
  `title` varchar(200) NOT NULL,
  `description` text,
  `passing_score` decimal(5, 2) DEFAULT '70.00',
  `time_limit` int DEFAULT NULL,
  `questions_per_quiz` int DEFAULT '10',
  `is_published` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `max_quiz_attempts` int DEFAULT '3',
  PRIMARY KEY (`quiz_id`),
  KEY `lesson_id` (`lesson_id`),
  KEY `teacher_id` (`teacher_id`),
  CONSTRAINT `quizzes_ibfk_1` FOREIGN KEY (`lesson_id`) REFERENCES `lessons` (`lesson_id`) ON DELETE CASCADE,
  CONSTRAINT `quizzes_ibfk_2` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`teacher_id`) ON DELETE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 74 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: sentence_pattern_quiz
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `sentence_pattern_quiz` (
  `question_id` int NOT NULL AUTO_INCREMENT,
  `quiz_id` int NOT NULL,
  `instruction` varchar(500) NOT NULL,
  `points` int DEFAULT '2',
  `hint` text,
  `allowed_patterns` json NOT NULL,
  `min_sentence_length` int DEFAULT '3',
  `max_sentence_length` int DEFAULT '30',
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`question_id`),
  KEY `quiz_id` (`quiz_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `sentence_pattern_quiz_ibfk_1` FOREIGN KEY (`quiz_id`) REFERENCES `quizzes` (`quiz_id`) ON DELETE CASCADE,
  CONSTRAINT `sentence_pattern_quiz_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `teachers` (`teacher_id`) ON DELETE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 16 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: student_answers
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `student_answers` (
  `answer_id` int NOT NULL AUTO_INCREMENT,
  `session_id` int NOT NULL,
  `student_id` int NOT NULL,
  `quiz_id` int NOT NULL,
  `lesson_id` int NOT NULL,
  `answer_type` enum('review', 'final', 'pretest') NOT NULL DEFAULT 'final',
  `question_type` enum(
  'irregular_verb',
  'preposition',
  'clause',
  'phrasal_verb',
  'sva',
  'sentence_pattern'
  ) NOT NULL,
  `question_id` int NOT NULL,
  `student_answer` json NOT NULL,
  `is_correct` tinyint(1) DEFAULT '0',
  `score_earned` decimal(5, 2) DEFAULT '0.00',
  `time_taken` int DEFAULT '0',
  `answered_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `system_detected_answer` json DEFAULT NULL,
  PRIMARY KEY (`answer_id`),
  KEY `session_id` (`session_id`),
  KEY `student_id` (`student_id`),
  KEY `quiz_id` (`quiz_id`),
  CONSTRAINT `student_answers_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `student_quiz_sessions` (`session_id`) ON DELETE CASCADE,
  CONSTRAINT `student_answers_ibfk_2` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE,
  CONSTRAINT `student_answers_ibfk_3` FOREIGN KEY (`quiz_id`) REFERENCES `quizzes` (`quiz_id`) ON DELETE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 452 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: student_lesson_progress
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `student_lesson_progress` (
  `progress_id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `lesson_id` int NOT NULL,
  `reading_status` enum('not_started', 'in_progress', 'completed') DEFAULT 'not_started',
  `reading_progress` decimal(5, 2) DEFAULT '0.00',
  `reading_started_at` timestamp NULL DEFAULT NULL,
  `reading_completed_at` timestamp NULL DEFAULT NULL,
  `reading_time_spent` int DEFAULT '0',
  `final_quiz_status` enum(
  'locked',
  'available',
  'in_progress',
  'completed',
  'failed',
  'max_attempts_reached'
  ) DEFAULT 'locked',
  `final_quiz_attempts` int DEFAULT '0',
  `best_quiz_score` decimal(5, 2) DEFAULT NULL,
  `last_quiz_score` decimal(5, 2) DEFAULT NULL,
  `final_quiz_started_at` timestamp NULL DEFAULT NULL,
  `final_quiz_completed_at` timestamp NULL DEFAULT NULL,
  `final_quiz_time_spent` int DEFAULT '0',
  `lesson_status` enum(
  'locked',
  'reading_required',
  'final_available',
  'final_in_progress',
  'passed',
  'failed',
  'max_attempts_reached'
  ) DEFAULT 'locked',
  `unlocked_at` timestamp NULL DEFAULT NULL,
  `passed_at` timestamp NULL DEFAULT NULL,
  `failed_at` timestamp NULL DEFAULT NULL,
  `failed_attempts` int DEFAULT '0',
  `last_activity` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`progress_id`),
  UNIQUE KEY `unique_student_lesson` (`student_id`, `lesson_id`),
  KEY `lesson_id` (`lesson_id`),
  CONSTRAINT `student_lesson_progress_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE,
  CONSTRAINT `student_lesson_progress_ibfk_2` FOREIGN KEY (`lesson_id`) REFERENCES `lessons` (`lesson_id`) ON DELETE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 44 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: student_quiz_sessions
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `student_quiz_sessions` (
  `session_id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `quiz_id` int NOT NULL,
  `lesson_id` int NOT NULL,
  `session_type` enum('review', 'final', 'pretest') NOT NULL DEFAULT 'final',
  `session_code` varchar(100) NOT NULL,
  `started_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` timestamp NULL DEFAULT NULL,
  `time_taken` int DEFAULT '0',
  `selected_questions` json DEFAULT NULL,
  `total_questions` int DEFAULT '10',
  `answered_questions` int DEFAULT '0',
  `score` decimal(5, 2) DEFAULT '0.00',
  `is_passed` tinyint(1) DEFAULT '0',
  `attempt_number` int DEFAULT '1',
  PRIMARY KEY (`session_id`),
  UNIQUE KEY `session_code` (`session_code`),
  KEY `student_id` (`student_id`),
  KEY `quiz_id` (`quiz_id`),
  KEY `lesson_id` (`lesson_id`),
  CONSTRAINT `student_quiz_sessions_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE,
  CONSTRAINT `student_quiz_sessions_ibfk_2` FOREIGN KEY (`quiz_id`) REFERENCES `quizzes` (`quiz_id`) ON DELETE CASCADE,
  CONSTRAINT `student_quiz_sessions_ibfk_3` FOREIGN KEY (`lesson_id`) REFERENCES `lessons` (`lesson_id`) ON DELETE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 253 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: students
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `students` (
  `student_id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `profile_picture` varchar(500) DEFAULT NULL,
  `grade_level` enum('7', '8', '9', '10') NOT NULL,
  `birth_date` date DEFAULT NULL,
  `LRN` varchar(50) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`student_id`),
  UNIQUE KEY `username` (`username`)
) ENGINE = InnoDB AUTO_INCREMENT = 13 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: sva_quiz
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `sva_quiz` (
  `question_id` int NOT NULL AUTO_INCREMENT,
  `quiz_id` int NOT NULL,
  `instruction` varchar(500) NOT NULL,
  `points` int DEFAULT '2',
  `hint` text,
  `subject_type` enum('singular', 'plural', 'collective', 'compound') NOT NULL,
  `verb_type` enum('singular', 'plural') NOT NULL,
  `context` text,
  `min_sentence_length` int DEFAULT '5',
  `max_sentence_length` int DEFAULT '50',
  `example_sentence` text,
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`question_id`),
  KEY `quiz_id` (`quiz_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `sva_quiz_ibfk_1` FOREIGN KEY (`quiz_id`) REFERENCES `quizzes` (`quiz_id`) ON DELETE CASCADE,
  CONSTRAINT `sva_quiz_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `teachers` (`teacher_id`) ON DELETE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 13 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: teachers
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `teachers` (
  `teacher_id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `profile_picture` varchar(500) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `specialization` varchar(100) DEFAULT NULL,
  `contact_number` varchar(20) DEFAULT NULL,
  `role` enum('teacher', 'admin') NOT NULL DEFAULT 'teacher',
  `is_active` tinyint(1) DEFAULT '1',
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`teacher_id`),
  UNIQUE KEY `username` (`username`)
) ENGINE = InnoDB AUTO_INCREMENT = 9 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: verbs_dictionary
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `verbs_dictionary` (
  `id` int NOT NULL AUTO_INCREMENT,
  `base_form` varchar(50) NOT NULL,
  `is_approved` tinyint(1) DEFAULT '1',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `base_form` (`base_form`)
) ENGINE = InnoDB AUTO_INCREMENT = 87 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: activity_logs
# ------------------------------------------------------------

INSERT INTO
  `activity_logs` (
    `log_id`,
    `actor_type`,
    `actor_id`,
    `action`,
    `entity_type`,
    `entity_id`,
    `details`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    2,
    'teacher',
    1,
    'lesson.create',
    'lesson',
    99,
    '{\"title\": \"Test lesson\"}',
    NULL,
    NULL,
    '2026-11-01 12:12:36'
  );
INSERT INTO
  `activity_logs` (
    `log_id`,
    `actor_type`,
    `actor_id`,
    `action`,
    `entity_type`,
    `entity_id`,
    `details`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    3,
    'teacher',
    8,
    'lesson.approve',
    'lesson',
    6,
    NULL,
    '::1',
    'EchoapiRuntime/1.1.0',
    '2026-11-01 14:55:42'
  );
INSERT INTO
  `activity_logs` (
    `log_id`,
    `actor_type`,
    `actor_id`,
    `action`,
    `entity_type`,
    `entity_id`,
    `details`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    4,
    'teacher',
    8,
    'lesson.approve',
    'lesson',
    6,
    NULL,
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.144.0 Chrome/150.0.7871.250 Electron/43.8.3 Safari/537.36',
    '2026-11-01 15:45:00'
  );
INSERT INTO
  `activity_logs` (
    `log_id`,
    `actor_type`,
    `actor_id`,
    `action`,
    `entity_type`,
    `entity_id`,
    `details`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    5,
    'teacher',
    8,
    'user.toggle_active',
    'student',
    10,
    '{\"is_active\": false}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.144.0 Chrome/150.0.7871.250 Electron/43.8.3 Safari/537.36',
    '2026-11-01 15:51:32'
  );
INSERT INTO
  `activity_logs` (
    `log_id`,
    `actor_type`,
    `actor_id`,
    `action`,
    `entity_type`,
    `entity_id`,
    `details`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    6,
    'teacher',
    8,
    'user.toggle_active',
    'student',
    10,
    '{\"is_active\": true}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.144.0 Chrome/150.0.7871.250 Electron/43.8.3 Safari/537.36',
    '2026-11-01 15:52:06'
  );
INSERT INTO
  `activity_logs` (
    `log_id`,
    `actor_type`,
    `actor_id`,
    `action`,
    `entity_type`,
    `entity_id`,
    `details`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    7,
    'teacher',
    8,
    'user.toggle_active',
    'teacher',
    8,
    '{\"is_active\": false}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.144.0 Chrome/150.0.7871.250 Electron/43.8.3 Safari/537.36',
    '2026-11-01 15:52:18'
  );
INSERT INTO
  `activity_logs` (
    `log_id`,
    `actor_type`,
    `actor_id`,
    `action`,
    `entity_type`,
    `entity_id`,
    `details`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    8,
    'teacher',
    8,
    'user.toggle_active',
    'teacher',
    8,
    '{\"is_active\": true}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.144.0 Chrome/150.0.7871.250 Electron/43.8.3 Safari/537.36',
    '2026-11-01 15:52:21'
  );
INSERT INTO
  `activity_logs` (
    `log_id`,
    `actor_type`,
    `actor_id`,
    `action`,
    `entity_type`,
    `entity_id`,
    `details`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    9,
    'teacher',
    8,
    'user.toggle_active',
    'teacher',
    7,
    '{\"is_active\": false}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.144.0 Chrome/150.0.7871.250 Electron/43.8.3 Safari/537.36',
    '2026-11-01 15:52:39'
  );
INSERT INTO
  `activity_logs` (
    `log_id`,
    `actor_type`,
    `actor_id`,
    `action`,
    `entity_type`,
    `entity_id`,
    `details`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    10,
    'teacher',
    8,
    'lesson.approve',
    'lesson',
    7,
    NULL,
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.144.0 Chrome/150.0.7871.250 Electron/43.8.3 Safari/537.36',
    '2026-11-01 18:26:28'
  );
INSERT INTO
  `activity_logs` (
    `log_id`,
    `actor_type`,
    `actor_id`,
    `action`,
    `entity_type`,
    `entity_id`,
    `details`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    11,
    'teacher',
    8,
    'lesson.approve',
    'lesson',
    11,
    NULL,
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.144.1 Chrome/150.0.7871.250 Electron/43.8.3 Safari/537.36',
    '2026-11-04 16:26:20'
  );
INSERT INTO
  `activity_logs` (
    `log_id`,
    `actor_type`,
    `actor_id`,
    `action`,
    `entity_type`,
    `entity_id`,
    `details`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    12,
    'teacher',
    8,
    'lesson.approve',
    'lesson',
    14,
    NULL,
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.144.1 Chrome/150.0.7871.250 Electron/43.8.3 Safari/537.36',
    '2026-11-04 22:50:18'
  );
INSERT INTO
  `activity_logs` (
    `log_id`,
    `actor_type`,
    `actor_id`,
    `action`,
    `entity_type`,
    `entity_id`,
    `details`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    13,
    'teacher',
    8,
    'lesson.approve',
    'lesson',
    12,
    NULL,
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.144.1 Chrome/150.0.7871.250 Electron/43.8.3 Safari/537.36',
    '2026-11-04 22:50:55'
  );
INSERT INTO
  `activity_logs` (
    `log_id`,
    `actor_type`,
    `actor_id`,
    `action`,
    `entity_type`,
    `entity_id`,
    `details`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    14,
    'teacher',
    8,
    'lesson.approve',
    'lesson',
    17,
    NULL,
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.144.1 Chrome/150.0.7871.250 Electron/43.8.3 Safari/537.36',
    '2026-11-04 23:43:18'
  );
INSERT INTO
  `activity_logs` (
    `log_id`,
    `actor_type`,
    `actor_id`,
    `action`,
    `entity_type`,
    `entity_id`,
    `details`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    15,
    'teacher',
    8,
    'lesson.reject',
    'lesson',
    16,
    NULL,
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.145.0 Chrome/150.0.7871.250 Electron/43.8.3 Safari/537.36',
    '2026-11-05 08:30:41'
  );
INSERT INTO
  `activity_logs` (
    `log_id`,
    `actor_type`,
    `actor_id`,
    `action`,
    `entity_type`,
    `entity_id`,
    `details`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    16,
    'teacher',
    8,
    'lesson.approve',
    'lesson',
    18,
    NULL,
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.145.0 Chrome/150.0.7871.250 Electron/43.8.3 Safari/537.36',
    '2026-11-05 08:30:48'
  );
INSERT INTO
  `activity_logs` (
    `log_id`,
    `actor_type`,
    `actor_id`,
    `action`,
    `entity_type`,
    `entity_id`,
    `details`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    17,
    'teacher',
    8,
    'lesson.approve',
    'lesson',
    21,
    NULL,
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.145.0 Chrome/150.0.7871.250 Electron/43.8.3 Safari/537.36',
    '2026-11-05 08:58:58'
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: clause_quiz
# ------------------------------------------------------------

INSERT INTO
  `clause_quiz` (
    `question_id`,
    `quiz_id`,
    `question_text`,
    `instructions`,
    `points`,
    `hint`,
    `sentence`,
    `clause_text`,
    `clause_type`,
    `options`,
    `correct_option_index`,
    `explanation`,
    `is_active`,
    `created_by`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    22,
    70,
    'Which part of the sentence is a clause?',
    NULL,
    2,
    NULL,
    'We stayed inside because it was raining heavily.',
    'because it was raining heavily',
    'Dependent',
    '[\"because it was raining heavily\", \"aining heavily\", \"We stayed inside\"]',
    0,
    NULL,
    1,
    7,
    '2026-11-13 22:02:46',
    '2026-11-13 22:02:46'
  );
INSERT INTO
  `clause_quiz` (
    `question_id`,
    `quiz_id`,
    `question_text`,
    `instructions`,
    `points`,
    `hint`,
    `sentence`,
    `clause_text`,
    `clause_type`,
    `options`,
    `correct_option_index`,
    `explanation`,
    `is_active`,
    `created_by`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    23,
    70,
    'Which part of the sentence is a clause?',
    NULL,
    2,
    NULL,
    'The dog barked loudly when the mailman arrived.',
    'mailman arrived',
    'Independent',
    '[\"when the mailman arrived\", \"The dog barked loudly\", \"mailman arrived\"]',
    2,
    NULL,
    1,
    7,
    '2026-11-13 22:03:39',
    '2026-11-13 22:03:39'
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: collective_nouns_dictionary
# ------------------------------------------------------------

INSERT INTO
  `collective_nouns_dictionary` (
    `id`,
    `noun`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (1, 'team', 1, NULL, '2026-11-13 14:15:52');
INSERT INTO
  `collective_nouns_dictionary` (
    `id`,
    `noun`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (2, 'family', 1, NULL, '2026-11-13 14:15:52');
INSERT INTO
  `collective_nouns_dictionary` (
    `id`,
    `noun`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (3, 'class', 1, NULL, '2026-11-13 14:15:52');
INSERT INTO
  `collective_nouns_dictionary` (
    `id`,
    `noun`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (4, 'group', 1, NULL, '2026-11-13 14:15:52');
INSERT INTO
  `collective_nouns_dictionary` (
    `id`,
    `noun`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (5, 'committee', 1, NULL, '2026-11-13 14:15:52');
INSERT INTO
  `collective_nouns_dictionary` (
    `id`,
    `noun`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (6, 'crowd', 1, NULL, '2026-11-13 14:15:52');
INSERT INTO
  `collective_nouns_dictionary` (
    `id`,
    `noun`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (7, 'audience', 1, NULL, '2026-11-13 14:15:52');
INSERT INTO
  `collective_nouns_dictionary` (
    `id`,
    `noun`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (8, 'staff', 1, NULL, '2026-11-13 14:15:52');
INSERT INTO
  `collective_nouns_dictionary` (
    `id`,
    `noun`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (9, 'band', 1, NULL, '2026-11-13 14:15:52');
INSERT INTO
  `collective_nouns_dictionary` (
    `id`,
    `noun`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (10, 'crew', 1, NULL, '2026-11-13 14:15:52');
INSERT INTO
  `collective_nouns_dictionary` (
    `id`,
    `noun`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (11, 'public', 1, NULL, '2026-11-13 14:15:52');
INSERT INTO
  `collective_nouns_dictionary` (
    `id`,
    `noun`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (12, 'government', 1, NULL, '2026-11-13 14:15:52');
INSERT INTO
  `collective_nouns_dictionary` (
    `id`,
    `noun`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (13, 'jury', 1, NULL, '2026-11-13 14:15:52');
INSERT INTO
  `collective_nouns_dictionary` (
    `id`,
    `noun`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (14, 'panel', 1, NULL, '2026-11-13 14:15:52');
INSERT INTO
  `collective_nouns_dictionary` (
    `id`,
    `noun`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (15, 'board', 1, NULL, '2026-11-13 14:15:52');

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: embedded_quizzes
# ------------------------------------------------------------

INSERT INTO
  `embedded_quizzes` (
    `embed_quiz_id`,
    `lesson_id`,
    `question_text`,
    `options`,
    `correct_option_index`,
    `created_by`,
    `created_at`
  )
VALUES
  (
    36,
    47,
    'sdfsfs',
    '[\"at\", \"in\", \"on\", \"for\"]',
    0,
    7,
    '2026-11-12 03:15:33'
  );
INSERT INTO
  `embedded_quizzes` (
    `embed_quiz_id`,
    `lesson_id`,
    `question_text`,
    `options`,
    `correct_option_index`,
    `created_by`,
    `created_at`
  )
VALUES
  (
    38,
    47,
    'sdfsfs',
    '[\"at\", \"in\", \"on\", \"for\"]',
    0,
    7,
    '2026-11-13 02:36:40'
  );
INSERT INTO
  `embedded_quizzes` (
    `embed_quiz_id`,
    `lesson_id`,
    `question_text`,
    `options`,
    `correct_option_index`,
    `created_by`,
    `created_at`
  )
VALUES
  (
    39,
    54,
    'answer at',
    '[\"at\", \"in\", \"on\", \"for\"]',
    0,
    7,
    '2026-11-15 08:47:08'
  );
INSERT INTO
  `embedded_quizzes` (
    `embed_quiz_id`,
    `lesson_id`,
    `question_text`,
    `options`,
    `correct_option_index`,
    `created_by`,
    `created_at`
  )
VALUES
  (
    40,
    54,
    'answer in',
    '[\"at\", \"in\", \"on\", \"for\"]',
    1,
    7,
    '2026-11-15 08:47:08'
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: grammar_suggestions
# ------------------------------------------------------------


# ------------------------------------------------------------
# DATA DUMP FOR TABLE: irregular_verb_quiz
# ------------------------------------------------------------

INSERT INTO
  `irregular_verb_quiz` (
    `question_id`,
    `quiz_id`,
    `question_text`,
    `instructions`,
    `points`,
    `hint`,
    `present_form`,
    `past_form`,
    `future_form`,
    `past_participle`,
    `alternative_answers`,
    `explanation`,
    `example_sentence`,
    `is_active`,
    `created_by`,
    `created_at`,
    `updated_at`,
    `blank_fields`
  )
VALUES
  (
    7,
    62,
    'fill the missing tenses',
    NULL,
    2,
    NULL,
    'Begin',
    'Began',
    'Will begin',
    'Begun',
    NULL,
    NULL,
    NULL,
    1,
    7,
    '2026-11-11 20:45:51',
    '2026-11-11 20:45:51',
    '[\"past\", \"future\"]'
  );
INSERT INTO
  `irregular_verb_quiz` (
    `question_id`,
    `quiz_id`,
    `question_text`,
    `instructions`,
    `points`,
    `hint`,
    `present_form`,
    `past_form`,
    `future_form`,
    `past_participle`,
    `alternative_answers`,
    `explanation`,
    `example_sentence`,
    `is_active`,
    `created_by`,
    `created_at`,
    `updated_at`,
    `blank_fields`
  )
VALUES
  (
    8,
    62,
    'Fill in the missing tense forms',
    NULL,
    2,
    NULL,
    'Break',
    'Broke',
    'Will break',
    'Broken',
    NULL,
    NULL,
    NULL,
    1,
    7,
    '2026-11-11 20:48:41',
    '2026-11-11 20:48:41',
    '[\"present\", \"future\", \"past_participle\"]'
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: lessons
# ------------------------------------------------------------

INSERT INTO
  `lessons` (
    `lesson_id`,
    `teacher_id`,
    `lesson_order`,
    `title`,
    `description`,
    `discussion_content`,
    `grade_level`,
    `prerequisite_lesson_id`,
    `passing_score`,
    `max_quiz_attempts`,
    `word_count`,
    `reading_time_estimate`,
    `is_published`,
    `published_at`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    44,
    7,
    999,
    'Irregular verb',
    NULL,
    '<h2 id=\"vs\">Regular vs. irregular verbs</h2>\n<p>Verbs can be categorized as either regular or irregular.</p>\n<p><strong>Regular verbs</strong> follow standard conjugation rules. The <span class=\"highlight-green\">simple past tense</span> and <span class=\"highlight-purple\"><a href=\"https://www.scribbr.com/verbs/past-participles/\" data-wpel-link=\"internal\">past participles</a></span> of regular verbs are formed by adding the suffix &ldquo;-ed.&rdquo;</p>\n<p></p>\n<div class=\"info-box-blue\">\n<h3><span>Examples: Regular verbs</span></h3>\n<p><span>I </span><strong><span class=\"highlight-green\">played</span></strong><span> football with my friends.</span></p>\n<p>Adria has <span class=\"highlight-purple\" style=\"background-color: rgb(45, 194, 107);\">played</span> tennis since she was a child.</p>\n</div>\n<p><span>In contrast to regular verbs, </span><strong>irregular verbs</strong><span> do not follow a specific pattern and their<span style=\"color: rgb(241, 196, 15);\"> </span></span><span style=\"color: rgb(241, 196, 15);\"><strong><span class=\"highlight-green\">simple past tense</span></strong></span><span><span style=\"color: rgb(241, 196, 15);\"> </span>and </span><span style=\"color: rgb(22, 145, 121);\"><strong><span class=\"highlight-purple\">past participle</span></strong></span><span><span style=\"color: rgb(22, 145, 121);\"> </span>can be formed in various ways. Additionally, their simple past tense and past participle forms may differ.</span><span></span></p>\n<div class=\"tip-box-green\">\n<h3><span>Examples: Irregular verbs</span></h3>\n<p><span>We </span><span class=\"highlight-green\">ate</span><span> at a nearby restaurant.</span></p>\n<p>Ken has <span class=\"highlight-purple\">eaten</span> takeout every night this week.</p>\n</div>\n<table class=\"kb-table bordered vertical-borders\"><caption>Irregular verbs</caption>\n<thead>\n<tr>\n<th><strong>Infinitive</strong></th>\n<th><strong>Simple past</strong></th>\n<th><strong>Past participle</strong></th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td>be</td>\n<td>was/were</td>\n<td>been</td>\n</tr>\n<tr>\n<td>do</td>\n<td>did</td>\n<td>done</td>\n</tr>\n<tr>\n<td>have</td>\n<td>had</td>\n<td>had</td>\n</tr>\n<tr>\n<td>say</td>\n<td>said</td>\n<td>said</td>\n</tr>\n<tr>\n<td>know</td>\n<td>knew</td>\n<td>known</td>\n</tr>\n<tr>\n<td>get</td>\n<td>got</td>\n<td>got</td>\n</tr>\n<tr>\n<td>see</td>\n<td>saw</td>\n<td>seen</td>\n</tr>\n<tr>\n<td>think</td>\n<td>thought</td>\n<td>thought</td>\n</tr>\n<tr>\n<td>go</td>\n<td>went</td>\n<td>gone</td>\n</tr>\n<tr>\n<td>take</td>\n<td>took</td>\n<td>taken</td>\n</tr>\n</tbody>\n</table>',
    '[7]',
    NULL,
    70.00,
    3,
    0,
    0,
    1,
    '2026-11-11 20:14:26',
    '2026-11-11 20:14:26',
    '2026-11-11 23:02:00'
  );
INSERT INTO
  `lessons` (
    `lesson_id`,
    `teacher_id`,
    `lesson_order`,
    `title`,
    `description`,
    `discussion_content`,
    `grade_level`,
    `prerequisite_lesson_id`,
    `passing_score`,
    `max_quiz_attempts`,
    `word_count`,
    `reading_time_estimate`,
    `is_published`,
    `published_at`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    47,
    7,
    999,
    'pharsal verb',
    NULL,
    '<div class=\"info-box-blue\">\n<h3>? Information</h3>\n<p>Your information text goes here...</p>\n</div>\n<div class=\"embedded-quiz\" data-quiz-id=\"38\"></div>\n<p></p>\n<p>&nbsp;</p>',
    '[\"7\"]',
    NULL,
    70.00,
    3,
    0,
    0,
    1,
    '2026-11-12 03:15:33',
    '2026-11-12 03:15:33',
    '2026-11-13 02:36:40'
  );
INSERT INTO
  `lessons` (
    `lesson_id`,
    `teacher_id`,
    `lesson_order`,
    `title`,
    `description`,
    `discussion_content`,
    `grade_level`,
    `prerequisite_lesson_id`,
    `passing_score`,
    `max_quiz_attempts`,
    `word_count`,
    `reading_time_estimate`,
    `is_published`,
    `published_at`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    49,
    7,
    999,
    'preposition',
    NULL,
    '<div class=\"tip-box-green\">\n<h3>✅ Pro Tip</h3>\n<p>Your helpful tip goes here...</p>\n</div>\n<div class=\"important-box-red\">\n<h3>? Important</h3>\n<p>Your important information goes here...</p>\n</div>\n<p></p>',
    '\"7\"',
    NULL,
    70.00,
    3,
    0,
    0,
    1,
    '2026-11-13 02:24:43',
    '2026-11-13 02:24:43',
    '2026-11-13 02:27:09'
  );
INSERT INTO
  `lessons` (
    `lesson_id`,
    `teacher_id`,
    `lesson_order`,
    `title`,
    `description`,
    `discussion_content`,
    `grade_level`,
    `prerequisite_lesson_id`,
    `passing_score`,
    `max_quiz_attempts`,
    `word_count`,
    `reading_time_estimate`,
    `is_published`,
    `published_at`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    50,
    7,
    999,
    'clause',
    NULL,
    '<div class=\"important-box-red\">\n<h3>? Important</h3>\n<p>Your important information goes here...</p>\n</div>\n<div class=\"warning-box-yellow\">\n<h3>⚠️ Warning</h3>\n<p>Your warning message goes here...</p>\n</div>\n<p></p>',
    '\"7\"',
    NULL,
    70.00,
    3,
    0,
    0,
    1,
    '2026-11-13 02:29:54',
    '2026-11-13 02:29:54',
    '2026-11-13 02:33:55'
  );
INSERT INTO
  `lessons` (
    `lesson_id`,
    `teacher_id`,
    `lesson_order`,
    `title`,
    `description`,
    `discussion_content`,
    `grade_level`,
    `prerequisite_lesson_id`,
    `passing_score`,
    `max_quiz_attempts`,
    `word_count`,
    `reading_time_estimate`,
    `is_published`,
    `published_at`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    51,
    7,
    999,
    'subject verb agreement',
    NULL,
    '<div class=\"info-box-blue\">\n<h3>? Information</h3>\n<p>Your information text goes here...</p>\n</div>\n<div class=\"important-box-red\">\n<h3>? Important</h3>\n<p>Your important information goes here...</p>\n</div>\n<p></p>',
    '\"7\"',
    NULL,
    70.00,
    3,
    0,
    0,
    1,
    '2026-11-13 02:37:28',
    '2026-11-13 02:37:28',
    '2026-11-13 02:49:22'
  );
INSERT INTO
  `lessons` (
    `lesson_id`,
    `teacher_id`,
    `lesson_order`,
    `title`,
    `description`,
    `discussion_content`,
    `grade_level`,
    `prerequisite_lesson_id`,
    `passing_score`,
    `max_quiz_attempts`,
    `word_count`,
    `reading_time_estimate`,
    `is_published`,
    `published_at`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    52,
    7,
    999,
    'sentence pattern',
    NULL,
    '<div class=\"info-box-blue\">\n<h3>? Information</h3>\n<p>Your information text goes here...</p>\n</div>\n<div class=\"grammar-example\">\n<h3>? Example</h3>\n<p><strong>✅ Correct:</strong> Your correct example here.</p>\n<p><strong>❌ Incorrect:</strong> Your incorrect example here.</p>\n<div class=\"explanation\">? Explanation: Why this is correct/incorrect.</div>\n</div>\n<p></p>',
    '\"7\"',
    NULL,
    70.00,
    3,
    0,
    0,
    1,
    '2026-11-13 14:30:35',
    '2026-11-13 14:30:35',
    '2026-11-13 15:06:41'
  );
INSERT INTO
  `lessons` (
    `lesson_id`,
    `teacher_id`,
    `lesson_order`,
    `title`,
    `description`,
    `discussion_content`,
    `grade_level`,
    `prerequisite_lesson_id`,
    `passing_score`,
    `max_quiz_attempts`,
    `word_count`,
    `reading_time_estimate`,
    `is_published`,
    `published_at`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    53,
    7,
    999,
    'testing sa admiin',
    NULL,
    '<div class=\"info-box-blue\">\n<h3>? Information</h3>\n<p>Your information text goes here...</p>\n</div>\n<p></p>',
    '\"7\"',
    NULL,
    70.00,
    3,
    0,
    0,
    0,
    '2026-11-14 21:32:51',
    '2026-11-14 21:32:51',
    '2026-11-14 21:32:51'
  );
INSERT INTO
  `lessons` (
    `lesson_id`,
    `teacher_id`,
    `lesson_order`,
    `title`,
    `description`,
    `discussion_content`,
    `grade_level`,
    `prerequisite_lesson_id`,
    `passing_score`,
    `max_quiz_attempts`,
    `word_count`,
    `reading_time_estimate`,
    `is_published`,
    `published_at`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    54,
    7,
    999,
    'testi9ng the embed quiz',
    NULL,
    '<div class=\"tip-box-green\">\n<h3>✅ Pro Tip</h3>\n<p>Your helpful tip goes here...</p>\n</div>\n<div class=\"embedded-quiz\" data-quiz-id=\"39\"></div>\n<p></p>\n<p>&nbsp;</p>\n<div class=\"embedded-quiz\" data-quiz-id=\"40\"></div>\n<p></p>\n<p>&nbsp;</p>',
    '\"7\"',
    NULL,
    70.00,
    3,
    0,
    0,
    0,
    '2026-11-15 08:47:08',
    '2026-11-15 08:47:08',
    '2026-11-15 08:47:08'
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: phrasal_verb_quiz
# ------------------------------------------------------------

INSERT INTO
  `phrasal_verb_quiz` (
    `question_id`,
    `quiz_id`,
    `instruction`,
    `points`,
    `hint`,
    `alternative_verbs`,
    `min_sentence_length`,
    `max_sentence_length`,
    `example_sentence`,
    `is_active`,
    `created_by`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    15,
    71,
    'Write a sentence using any phrasal verb you have learned.',
    2,
    NULL,
    NULL,
    5,
    15,
    NULL,
    1,
    7,
    '2026-11-13 02:39:21',
    '2026-11-13 02:39:21'
  );
INSERT INTO
  `phrasal_verb_quiz` (
    `question_id`,
    `quiz_id`,
    `instruction`,
    `points`,
    `hint`,
    `alternative_verbs`,
    `min_sentence_length`,
    `max_sentence_length`,
    `example_sentence`,
    `is_active`,
    `created_by`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    16,
    71,
    'Write a sentence using any phrasal verb you have learned.',
    2,
    NULL,
    NULL,
    5,
    15,
    NULL,
    1,
    7,
    '2026-11-13 02:39:23',
    '2026-11-13 02:39:23'
  );
INSERT INTO
  `phrasal_verb_quiz` (
    `question_id`,
    `quiz_id`,
    `instruction`,
    `points`,
    `hint`,
    `alternative_verbs`,
    `min_sentence_length`,
    `max_sentence_length`,
    `example_sentence`,
    `is_active`,
    `created_by`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    17,
    71,
    'Write a sentence using any phrasal verb you have learned.',
    2,
    NULL,
    NULL,
    5,
    15,
    NULL,
    1,
    7,
    '2026-11-13 02:39:26',
    '2026-11-13 02:39:26'
  );
INSERT INTO
  `phrasal_verb_quiz` (
    `question_id`,
    `quiz_id`,
    `instruction`,
    `points`,
    `hint`,
    `alternative_verbs`,
    `min_sentence_length`,
    `max_sentence_length`,
    `example_sentence`,
    `is_active`,
    `created_by`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    18,
    71,
    'Write a sentence using any phrasal verb you have learned.',
    2,
    NULL,
    NULL,
    5,
    15,
    NULL,
    1,
    7,
    '2026-11-13 21:35:47',
    '2026-11-13 21:35:47'
  );
INSERT INTO
  `phrasal_verb_quiz` (
    `question_id`,
    `quiz_id`,
    `instruction`,
    `points`,
    `hint`,
    `alternative_verbs`,
    `min_sentence_length`,
    `max_sentence_length`,
    `example_sentence`,
    `is_active`,
    `created_by`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    19,
    71,
    'Write a sentence using any phrasal verb you have learned.',
    2,
    NULL,
    NULL,
    5,
    15,
    NULL,
    1,
    7,
    '2026-11-13 21:36:19',
    '2026-11-13 21:36:19'
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: preposition_quiz
# ------------------------------------------------------------

INSERT INTO
  `preposition_quiz` (
    `question_id`,
    `quiz_id`,
    `question_text`,
    `instructions`,
    `points`,
    `hint`,
    `correct_answer`,
    `options`,
    `correct_option_index`,
    `explanation`,
    `is_active`,
    `created_by`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    63,
    61,
    'answer on',
    NULL,
    1,
    NULL,
    'on',
    '[\"in\", \"on\", \"been\", \"when\"]',
    1,
    NULL,
    1,
    7,
    '2026-11-11 20:15:32',
    '2026-11-11 20:15:32'
  );
INSERT INTO
  `preposition_quiz` (
    `question_id`,
    `quiz_id`,
    `question_text`,
    `instructions`,
    `points`,
    `hint`,
    `correct_answer`,
    `options`,
    `correct_option_index`,
    `explanation`,
    `is_active`,
    `created_by`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    64,
    61,
    'answer is at',
    NULL,
    1,
    NULL,
    'at',
    '[\"at\", \"in\", \"when\", \"whre\"]',
    0,
    NULL,
    1,
    7,
    '2026-11-11 20:15:32',
    '2026-11-11 20:15:32'
  );
INSERT INTO
  `preposition_quiz` (
    `question_id`,
    `quiz_id`,
    `question_text`,
    `instructions`,
    `points`,
    `hint`,
    `correct_answer`,
    `options`,
    `correct_option_index`,
    `explanation`,
    `is_active`,
    `created_by`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    65,
    61,
    'new question',
    NULL,
    2,
    NULL,
    'at',
    '[\"at\", \"in\", \"whehn\"]',
    0,
    NULL,
    1,
    7,
    '2026-11-11 20:16:52',
    '2026-11-11 20:16:52'
  );
INSERT INTO
  `preposition_quiz` (
    `question_id`,
    `quiz_id`,
    `question_text`,
    `instructions`,
    `points`,
    `hint`,
    `correct_answer`,
    `options`,
    `correct_option_index`,
    `explanation`,
    `is_active`,
    `created_by`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    72,
    68,
    'at',
    NULL,
    1,
    NULL,
    'a',
    '[\"a\", \"b\", \"c\"]',
    0,
    NULL,
    1,
    7,
    '2026-11-13 02:24:43',
    '2026-11-13 02:24:43'
  );
INSERT INTO
  `preposition_quiz` (
    `question_id`,
    `quiz_id`,
    `question_text`,
    `instructions`,
    `points`,
    `hint`,
    `correct_answer`,
    `options`,
    `correct_option_index`,
    `explanation`,
    `is_active`,
    `created_by`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    73,
    69,
    'answer is at',
    NULL,
    2,
    NULL,
    'at',
    '[\"at\", \"in\", \"when\"]',
    0,
    NULL,
    1,
    7,
    '2026-11-13 02:25:44',
    '2026-11-13 02:25:44'
  );
INSERT INTO
  `preposition_quiz` (
    `question_id`,
    `quiz_id`,
    `question_text`,
    `instructions`,
    `points`,
    `hint`,
    `correct_answer`,
    `options`,
    `correct_option_index`,
    `explanation`,
    `is_active`,
    `created_by`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    74,
    69,
    'in',
    NULL,
    2,
    NULL,
    'at',
    '[\"at\", \"when\", \"where\"]',
    0,
    NULL,
    1,
    7,
    '2026-11-13 02:26:09',
    '2026-11-13 02:26:09'
  );
INSERT INTO
  `preposition_quiz` (
    `question_id`,
    `quiz_id`,
    `question_text`,
    `instructions`,
    `points`,
    `hint`,
    `correct_answer`,
    `options`,
    `correct_option_index`,
    `explanation`,
    `is_active`,
    `created_by`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    75,
    69,
    'shesh',
    NULL,
    2,
    NULL,
    'at',
    '[\"agat\", \"at\", \"in\"]',
    1,
    NULL,
    1,
    7,
    '2026-11-13 02:26:28',
    '2026-11-13 02:26:28'
  );
INSERT INTO
  `preposition_quiz` (
    `question_id`,
    `quiz_id`,
    `question_text`,
    `instructions`,
    `points`,
    `hint`,
    `correct_answer`,
    `options`,
    `correct_option_index`,
    `explanation`,
    `is_active`,
    `created_by`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    76,
    65,
    'ajshajhsa',
    NULL,
    1,
    NULL,
    'a',
    '[\"a\", \"d\", \"b\"]',
    0,
    NULL,
    1,
    7,
    '2026-11-13 02:36:40',
    '2026-11-13 02:36:40'
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: quizzes
# ------------------------------------------------------------

INSERT INTO
  `quizzes` (
    `quiz_id`,
    `lesson_id`,
    `teacher_id`,
    `quiz_type`,
    `quiz_purpose`,
    `title`,
    `description`,
    `passing_score`,
    `time_limit`,
    `questions_per_quiz`,
    `is_published`,
    `created_at`,
    `updated_at`,
    `max_quiz_attempts`
  )
VALUES
  (
    61,
    44,
    7,
    'preposition',
    'pretest',
    'Lesson Pre-Test',
    NULL,
    70.00,
    NULL,
    10,
    1,
    '2026-11-11 20:15:32',
    '2026-11-11 20:15:32',
    3
  );
INSERT INTO
  `quizzes` (
    `quiz_id`,
    `lesson_id`,
    `teacher_id`,
    `quiz_type`,
    `quiz_purpose`,
    `title`,
    `description`,
    `passing_score`,
    `time_limit`,
    `questions_per_quiz`,
    `is_published`,
    `created_at`,
    `updated_at`,
    `max_quiz_attempts`
  )
VALUES
  (
    62,
    44,
    7,
    'irregular_verb',
    'final',
    'fill in the black ( supply th emissing irregular verb',
    NULL,
    70.00,
    20,
    10,
    1,
    '2026-11-11 20:42:15',
    '2026-11-11 20:49:09',
    3
  );
INSERT INTO
  `quizzes` (
    `quiz_id`,
    `lesson_id`,
    `teacher_id`,
    `quiz_type`,
    `quiz_purpose`,
    `title`,
    `description`,
    `passing_score`,
    `time_limit`,
    `questions_per_quiz`,
    `is_published`,
    `created_at`,
    `updated_at`,
    `max_quiz_attempts`
  )
VALUES
  (
    65,
    47,
    7,
    'preposition',
    'pretest',
    'Lesson Pre-Test',
    NULL,
    70.00,
    NULL,
    10,
    1,
    '2026-11-12 03:15:33',
    '2026-11-12 03:15:33',
    3
  );
INSERT INTO
  `quizzes` (
    `quiz_id`,
    `lesson_id`,
    `teacher_id`,
    `quiz_type`,
    `quiz_purpose`,
    `title`,
    `description`,
    `passing_score`,
    `time_limit`,
    `questions_per_quiz`,
    `is_published`,
    `created_at`,
    `updated_at`,
    `max_quiz_attempts`
  )
VALUES
  (
    68,
    49,
    7,
    'preposition',
    'pretest',
    'Lesson Pre-Test',
    NULL,
    70.00,
    NULL,
    10,
    1,
    '2026-11-13 02:24:43',
    '2026-11-13 02:24:43',
    3
  );
INSERT INTO
  `quizzes` (
    `quiz_id`,
    `lesson_id`,
    `teacher_id`,
    `quiz_type`,
    `quiz_purpose`,
    `title`,
    `description`,
    `passing_score`,
    `time_limit`,
    `questions_per_quiz`,
    `is_published`,
    `created_at`,
    `updated_at`,
    `max_quiz_attempts`
  )
VALUES
  (
    69,
    49,
    7,
    'preposition',
    'final',
    'multiple choices',
    NULL,
    70.00,
    10,
    10,
    1,
    '2026-11-13 02:25:20',
    '2026-11-13 02:26:32',
    3
  );
INSERT INTO
  `quizzes` (
    `quiz_id`,
    `lesson_id`,
    `teacher_id`,
    `quiz_type`,
    `quiz_purpose`,
    `title`,
    `description`,
    `passing_score`,
    `time_limit`,
    `questions_per_quiz`,
    `is_published`,
    `created_at`,
    `updated_at`,
    `max_quiz_attempts`
  )
VALUES
  (
    70,
    50,
    7,
    'clause',
    'final',
    'clause quiz',
    NULL,
    70.00,
    10,
    10,
    1,
    '2026-11-13 02:30:11',
    '2026-11-13 02:33:37',
    3
  );
INSERT INTO
  `quizzes` (
    `quiz_id`,
    `lesson_id`,
    `teacher_id`,
    `quiz_type`,
    `quiz_purpose`,
    `title`,
    `description`,
    `passing_score`,
    `time_limit`,
    `questions_per_quiz`,
    `is_published`,
    `created_at`,
    `updated_at`,
    `max_quiz_attempts`
  )
VALUES
  (
    71,
    47,
    7,
    'phrasal_verb',
    'final',
    'pharsal verhbg',
    NULL,
    70.00,
    10,
    10,
    1,
    '2026-11-13 02:39:15',
    '2026-11-13 02:39:33',
    3
  );
INSERT INTO
  `quizzes` (
    `quiz_id`,
    `lesson_id`,
    `teacher_id`,
    `quiz_type`,
    `quiz_purpose`,
    `title`,
    `description`,
    `passing_score`,
    `time_limit`,
    `questions_per_quiz`,
    `is_published`,
    `created_at`,
    `updated_at`,
    `max_quiz_attempts`
  )
VALUES
  (
    72,
    51,
    7,
    'sva',
    'final',
    'subject verb',
    NULL,
    70.00,
    10,
    10,
    1,
    '2026-11-13 02:40:44',
    '2026-11-13 02:49:02',
    3
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: sentence_pattern_quiz
# ------------------------------------------------------------


# ------------------------------------------------------------
# DATA DUMP FOR TABLE: student_answers
# ------------------------------------------------------------

INSERT INTO
  `student_answers` (
    `answer_id`,
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `answer_type`,
    `question_type`,
    `question_id`,
    `student_answer`,
    `is_correct`,
    `score_earned`,
    `time_taken`,
    `answered_at`,
    `system_detected_answer`
  )
VALUES
  (
    304,
    188,
    11,
    61,
    44,
    'pretest',
    'preposition',
    63,
    '\"{\\\"selected_index\\\":1}\"',
    1,
    1.00,
    0,
    '2026-11-11 20:52:47',
    NULL
  );
INSERT INTO
  `student_answers` (
    `answer_id`,
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `answer_type`,
    `question_type`,
    `question_id`,
    `student_answer`,
    `is_correct`,
    `score_earned`,
    `time_taken`,
    `answered_at`,
    `system_detected_answer`
  )
VALUES
  (
    305,
    188,
    11,
    61,
    44,
    'pretest',
    'preposition',
    65,
    '\"{\\\"selected_index\\\":0}\"',
    1,
    2.00,
    0,
    '2026-11-11 20:52:47',
    NULL
  );
INSERT INTO
  `student_answers` (
    `answer_id`,
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `answer_type`,
    `question_type`,
    `question_id`,
    `student_answer`,
    `is_correct`,
    `score_earned`,
    `time_taken`,
    `answered_at`,
    `system_detected_answer`
  )
VALUES
  (
    306,
    188,
    11,
    61,
    44,
    'pretest',
    'preposition',
    64,
    '\"{\\\"selected_index\\\":0}\"',
    1,
    1.00,
    0,
    '2026-11-11 20:52:47',
    NULL
  );
INSERT INTO
  `student_answers` (
    `answer_id`,
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `answer_type`,
    `question_type`,
    `question_id`,
    `student_answer`,
    `is_correct`,
    `score_earned`,
    `time_taken`,
    `answered_at`,
    `system_detected_answer`
  )
VALUES
  (
    307,
    189,
    11,
    62,
    44,
    'final',
    'irregular_verb',
    7,
    '\"{\\\"data\\\":{\\\"past\\\":\\\"begun\\\",\\\"future\\\":\\\"will begin\\\"}}\"',
    0,
    0.00,
    0,
    '2026-11-11 20:55:21',
    NULL
  );
INSERT INTO
  `student_answers` (
    `answer_id`,
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `answer_type`,
    `question_type`,
    `question_id`,
    `student_answer`,
    `is_correct`,
    `score_earned`,
    `time_taken`,
    `answered_at`,
    `system_detected_answer`
  )
VALUES
  (
    308,
    189,
    11,
    62,
    44,
    'final',
    'irregular_verb',
    8,
    '\"{\\\"data\\\":{\\\"present\\\":\\\"break\\\",\\\"future\\\":\\\"will break\\\",\\\"past_participle\\\":\\\"broken\\\"}}\"',
    1,
    2.00,
    0,
    '2026-11-11 20:55:21',
    NULL
  );
INSERT INTO
  `student_answers` (
    `answer_id`,
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `answer_type`,
    `question_type`,
    `question_id`,
    `student_answer`,
    `is_correct`,
    `score_earned`,
    `time_taken`,
    `answered_at`,
    `system_detected_answer`
  )
VALUES
  (
    309,
    190,
    11,
    61,
    44,
    'pretest',
    'preposition',
    65,
    '\"{\\\"selected_index\\\":0}\"',
    1,
    2.00,
    0,
    '2026-11-11 21:02:00',
    NULL
  );
INSERT INTO
  `student_answers` (
    `answer_id`,
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `answer_type`,
    `question_type`,
    `question_id`,
    `student_answer`,
    `is_correct`,
    `score_earned`,
    `time_taken`,
    `answered_at`,
    `system_detected_answer`
  )
VALUES
  (
    310,
    190,
    11,
    61,
    44,
    'pretest',
    'preposition',
    63,
    '\"{\\\"selected_index\\\":1}\"',
    1,
    1.00,
    0,
    '2026-11-11 21:02:00',
    NULL
  );
INSERT INTO
  `student_answers` (
    `answer_id`,
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `answer_type`,
    `question_type`,
    `question_id`,
    `student_answer`,
    `is_correct`,
    `score_earned`,
    `time_taken`,
    `answered_at`,
    `system_detected_answer`
  )
VALUES
  (
    311,
    190,
    11,
    61,
    44,
    'pretest',
    'preposition',
    64,
    '\"{\\\"selected_index\\\":0}\"',
    1,
    1.00,
    0,
    '2026-11-11 21:02:00',
    NULL
  );
INSERT INTO
  `student_answers` (
    `answer_id`,
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `answer_type`,
    `question_type`,
    `question_id`,
    `student_answer`,
    `is_correct`,
    `score_earned`,
    `time_taken`,
    `answered_at`,
    `system_detected_answer`
  )
VALUES
  (
    312,
    191,
    11,
    62,
    44,
    'final',
    'irregular_verb',
    8,
    '\"{\\\"data\\\":{\\\"present\\\":\\\"ghkjgh\\\",\\\"future\\\":\\\"tyjty\\\",\\\"past_participle\\\":\\\"tkit\\\"}}\"',
    0,
    0.00,
    0,
    '2026-11-11 21:02:14',
    NULL
  );
INSERT INTO
  `student_answers` (
    `answer_id`,
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `answer_type`,
    `question_type`,
    `question_id`,
    `student_answer`,
    `is_correct`,
    `score_earned`,
    `time_taken`,
    `answered_at`,
    `system_detected_answer`
  )
VALUES
  (
    313,
    191,
    11,
    62,
    44,
    'final',
    'irregular_verb',
    7,
    '\"{\\\"data\\\":{\\\"past\\\":\\\"tkit\\\",\\\"future\\\":\\\"tkit\\\"}}\"',
    0,
    0.00,
    0,
    '2026-11-11 21:02:14',
    NULL
  );
INSERT INTO
  `student_answers` (
    `answer_id`,
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `answer_type`,
    `question_type`,
    `question_id`,
    `student_answer`,
    `is_correct`,
    `score_earned`,
    `time_taken`,
    `answered_at`,
    `system_detected_answer`
  )
VALUES
  (
    314,
    193,
    11,
    61,
    44,
    'pretest',
    'preposition',
    64,
    '\"{\\\"selected_index\\\":3}\"',
    0,
    0.00,
    0,
    '2026-11-12 21:07:28',
    NULL
  );
INSERT INTO
  `student_answers` (
    `answer_id`,
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `answer_type`,
    `question_type`,
    `question_id`,
    `student_answer`,
    `is_correct`,
    `score_earned`,
    `time_taken`,
    `answered_at`,
    `system_detected_answer`
  )
VALUES
  (
    315,
    193,
    11,
    61,
    44,
    'pretest',
    'preposition',
    63,
    '\"{\\\"selected_index\\\":0}\"',
    0,
    0.00,
    0,
    '2026-11-12 21:07:28',
    NULL
  );
INSERT INTO
  `student_answers` (
    `answer_id`,
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `answer_type`,
    `question_type`,
    `question_id`,
    `student_answer`,
    `is_correct`,
    `score_earned`,
    `time_taken`,
    `answered_at`,
    `system_detected_answer`
  )
VALUES
  (
    316,
    193,
    11,
    61,
    44,
    'pretest',
    'preposition',
    65,
    '\"{\\\"selected_index\\\":2}\"',
    0,
    0.00,
    0,
    '2026-11-12 21:07:28',
    NULL
  );
INSERT INTO
  `student_answers` (
    `answer_id`,
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `answer_type`,
    `question_type`,
    `question_id`,
    `student_answer`,
    `is_correct`,
    `score_earned`,
    `time_taken`,
    `answered_at`,
    `system_detected_answer`
  )
VALUES
  (
    317,
    194,
    11,
    62,
    44,
    'final',
    'irregular_verb',
    8,
    '\"{\\\"data\\\":{\\\"present\\\":\\\"beoken\\\"}}\"',
    0,
    0.00,
    0,
    '2026-11-12 22:34:09',
    NULL
  );
INSERT INTO
  `student_answers` (
    `answer_id`,
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `answer_type`,
    `question_type`,
    `question_id`,
    `student_answer`,
    `is_correct`,
    `score_earned`,
    `time_taken`,
    `answered_at`,
    `system_detected_answer`
  )
VALUES
  (
    318,
    194,
    11,
    62,
    44,
    'final',
    'irregular_verb',
    7,
    '\"{\\\"data\\\":{},\\\"reason\\\":\\\"No answers provided\\\"}\"',
    0,
    0.00,
    0,
    '2026-11-12 22:34:09',
    NULL
  );
INSERT INTO
  `student_answers` (
    `answer_id`,
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `answer_type`,
    `question_type`,
    `question_id`,
    `student_answer`,
    `is_correct`,
    `score_earned`,
    `time_taken`,
    `answered_at`,
    `system_detected_answer`
  )
VALUES
  (
    321,
    196,
    11,
    61,
    44,
    'pretest',
    'preposition',
    63,
    '\"{\\\"selected_index\\\":1}\"',
    1,
    1.00,
    0,
    '2026-11-12 23:03:59',
    NULL
  );
INSERT INTO
  `student_answers` (
    `answer_id`,
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `answer_type`,
    `question_type`,
    `question_id`,
    `student_answer`,
    `is_correct`,
    `score_earned`,
    `time_taken`,
    `answered_at`,
    `system_detected_answer`
  )
VALUES
  (
    322,
    196,
    11,
    61,
    44,
    'pretest',
    'preposition',
    65,
    '\"{\\\"selected_index\\\":0}\"',
    1,
    2.00,
    0,
    '2026-11-12 23:03:59',
    NULL
  );
INSERT INTO
  `student_answers` (
    `answer_id`,
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `answer_type`,
    `question_type`,
    `question_id`,
    `student_answer`,
    `is_correct`,
    `score_earned`,
    `time_taken`,
    `answered_at`,
    `system_detected_answer`
  )
VALUES
  (
    323,
    196,
    11,
    61,
    44,
    'pretest',
    'preposition',
    64,
    '\"{\\\"selected_index\\\":1}\"',
    0,
    0.00,
    0,
    '2026-11-12 23:03:59',
    NULL
  );
INSERT INTO
  `student_answers` (
    `answer_id`,
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `answer_type`,
    `question_type`,
    `question_id`,
    `student_answer`,
    `is_correct`,
    `score_earned`,
    `time_taken`,
    `answered_at`,
    `system_detected_answer`
  )
VALUES
  (
    326,
    198,
    11,
    65,
    47,
    'pretest',
    'preposition',
    69,
    '\"{\\\"selected_index\\\":0}\"',
    1,
    1.00,
    0,
    '2026-11-12 23:17:33',
    NULL
  );
INSERT INTO
  `student_answers` (
    `answer_id`,
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `answer_type`,
    `question_type`,
    `question_id`,
    `student_answer`,
    `is_correct`,
    `score_earned`,
    `time_taken`,
    `answered_at`,
    `system_detected_answer`
  )
VALUES
  (
    381,
    230,
    11,
    65,
    47,
    'pretest',
    'preposition',
    69,
    '\"{\\\"selected_index\\\":0}\"',
    1,
    1.00,
    0,
    '2026-11-13 01:18:19',
    NULL
  );
INSERT INTO
  `student_answers` (
    `answer_id`,
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `answer_type`,
    `question_type`,
    `question_id`,
    `student_answer`,
    `is_correct`,
    `score_earned`,
    `time_taken`,
    `answered_at`,
    `system_detected_answer`
  )
VALUES
  (
    397,
    238,
    11,
    68,
    49,
    'pretest',
    'preposition',
    72,
    '\"{\\\"selected_index\\\":0}\"',
    1,
    1.00,
    0,
    '2026-11-13 02:28:43',
    NULL
  );
INSERT INTO
  `student_answers` (
    `answer_id`,
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `answer_type`,
    `question_type`,
    `question_id`,
    `student_answer`,
    `is_correct`,
    `score_earned`,
    `time_taken`,
    `answered_at`,
    `system_detected_answer`
  )
VALUES
  (
    398,
    239,
    11,
    69,
    49,
    'final',
    'preposition',
    75,
    '\"{\\\"selected_index\\\":0}\"',
    0,
    0.00,
    0,
    '2026-11-13 02:28:58',
    NULL
  );
INSERT INTO
  `student_answers` (
    `answer_id`,
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `answer_type`,
    `question_type`,
    `question_id`,
    `student_answer`,
    `is_correct`,
    `score_earned`,
    `time_taken`,
    `answered_at`,
    `system_detected_answer`
  )
VALUES
  (
    399,
    239,
    11,
    69,
    49,
    'final',
    'preposition',
    73,
    '\"{\\\"selected_index\\\":0}\"',
    1,
    2.00,
    0,
    '2026-11-13 02:28:59',
    NULL
  );
INSERT INTO
  `student_answers` (
    `answer_id`,
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `answer_type`,
    `question_type`,
    `question_id`,
    `student_answer`,
    `is_correct`,
    `score_earned`,
    `time_taken`,
    `answered_at`,
    `system_detected_answer`
  )
VALUES
  (
    400,
    239,
    11,
    69,
    49,
    'final',
    'preposition',
    74,
    '\"{\\\"selected_index\\\":0}\"',
    1,
    2.00,
    0,
    '2026-11-13 02:28:59',
    NULL
  );
INSERT INTO
  `student_answers` (
    `answer_id`,
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `answer_type`,
    `question_type`,
    `question_id`,
    `student_answer`,
    `is_correct`,
    `score_earned`,
    `time_taken`,
    `answered_at`,
    `system_detected_answer`
  )
VALUES
  (
    401,
    240,
    11,
    70,
    50,
    'final',
    'clause',
    20,
    '\"{\\\"selected_index\\\":1,\\\"selected_type\\\":\\\"Independent\\\"}\"',
    1,
    2.00,
    0,
    '2026-11-13 02:34:47',
    NULL
  );
INSERT INTO
  `student_answers` (
    `answer_id`,
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `answer_type`,
    `question_type`,
    `question_id`,
    `student_answer`,
    `is_correct`,
    `score_earned`,
    `time_taken`,
    `answered_at`,
    `system_detected_answer`
  )
VALUES
  (
    402,
    240,
    11,
    70,
    50,
    'final',
    'clause',
    21,
    '\"{\\\"selected_index\\\":1,\\\"selected_type\\\":\\\"Independent\\\"}\"',
    0,
    0.00,
    0,
    '2026-11-13 02:34:47',
    NULL
  );
INSERT INTO
  `student_answers` (
    `answer_id`,
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `answer_type`,
    `question_type`,
    `question_id`,
    `student_answer`,
    `is_correct`,
    `score_earned`,
    `time_taken`,
    `answered_at`,
    `system_detected_answer`
  )
VALUES
  (
    403,
    241,
    11,
    70,
    50,
    'final',
    'clause',
    21,
    '\"{\\\"selected_index\\\":0,\\\"selected_type\\\":\\\"Dependent\\\"}\"',
    1,
    2.00,
    0,
    '2026-11-13 02:35:09',
    NULL
  );
INSERT INTO
  `student_answers` (
    `answer_id`,
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `answer_type`,
    `question_type`,
    `question_id`,
    `student_answer`,
    `is_correct`,
    `score_earned`,
    `time_taken`,
    `answered_at`,
    `system_detected_answer`
  )
VALUES
  (
    404,
    241,
    11,
    70,
    50,
    'final',
    'clause',
    20,
    '\"{\\\"selected_index\\\":1,\\\"selected_type\\\":\\\"Independent\\\"}\"',
    1,
    2.00,
    0,
    '2026-11-13 02:35:09',
    NULL
  );
INSERT INTO
  `student_answers` (
    `answer_id`,
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `answer_type`,
    `question_type`,
    `question_id`,
    `student_answer`,
    `is_correct`,
    `score_earned`,
    `time_taken`,
    `answered_at`,
    `system_detected_answer`
  )
VALUES
  (
    405,
    242,
    11,
    72,
    51,
    'final',
    'sva',
    8,
    '\"{\\\"text\\\":\\\"The dogs bark at the stranger\\\",\\\"reason\\\":\\\"No verb found in the sentence\\\"}\"',
    0,
    0.00,
    0,
    '2026-11-13 02:51:21',
    NULL
  );
INSERT INTO
  `student_answers` (
    `answer_id`,
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `answer_type`,
    `question_type`,
    `question_id`,
    `student_answer`,
    `is_correct`,
    `score_earned`,
    `time_taken`,
    `answered_at`,
    `system_detected_answer`
  )
VALUES
  (
    406,
    242,
    11,
    72,
    51,
    'final',
    'sva',
    7,
    '\"{\\\"text\\\":\\\"The dog barks at the stranger.\\\",\\\"reason\\\":null}\"',
    1,
    2.00,
    0,
    '2026-11-13 02:51:21',
    NULL
  );
INSERT INTO
  `student_answers` (
    `answer_id`,
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `answer_type`,
    `question_type`,
    `question_id`,
    `student_answer`,
    `is_correct`,
    `score_earned`,
    `time_taken`,
    `answered_at`,
    `system_detected_answer`
  )
VALUES
  (
    407,
    242,
    11,
    72,
    51,
    'final',
    'sva',
    10,
    '\"{\\\"text\\\":\\\"The jury are arguing among themselves about the verdict\\\",\\\"reason\\\":\\\"Expected a collective noun, but got \\\\\\\"jury\\\\\\\"\\\"}\"',
    0,
    0.00,
    0,
    '2026-11-13 02:51:21',
    NULL
  );
INSERT INTO
  `student_answers` (
    `answer_id`,
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `answer_type`,
    `question_type`,
    `question_id`,
    `student_answer`,
    `is_correct`,
    `score_earned`,
    `time_taken`,
    `answered_at`,
    `system_detected_answer`
  )
VALUES
  (
    408,
    242,
    11,
    72,
    51,
    'final',
    'sva',
    9,
    '\"{\\\"text\\\":\\\"The family travels to Cebu every summer\\\",\\\"reason\\\":null}\"',
    1,
    2.00,
    0,
    '2026-11-13 02:51:21',
    NULL
  );
INSERT INTO
  `student_answers` (
    `answer_id`,
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `answer_type`,
    `question_type`,
    `question_id`,
    `student_answer`,
    `is_correct`,
    `score_earned`,
    `time_taken`,
    `answered_at`,
    `system_detected_answer`
  )
VALUES
  (
    409,
    243,
    11,
    72,
    51,
    'final',
    'sva',
    8,
    '\"{\\\"text\\\":\\\"The dogs bark at the strange\\\",\\\"reason\\\":null}\"',
    1,
    2.00,
    0,
    '2026-11-13 14:24:17',
    NULL
  );
INSERT INTO
  `student_answers` (
    `answer_id`,
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `answer_type`,
    `question_type`,
    `question_id`,
    `student_answer`,
    `is_correct`,
    `score_earned`,
    `time_taken`,
    `answered_at`,
    `system_detected_answer`
  )
VALUES
  (
    410,
    243,
    11,
    72,
    51,
    'final',
    'sva',
    9,
    '\"{\\\"text\\\":\\\"The family travels to Cebu every summer\\\",\\\"reason\\\":null}\"',
    1,
    2.00,
    0,
    '2026-11-13 14:24:17',
    NULL
  );
INSERT INTO
  `student_answers` (
    `answer_id`,
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `answer_type`,
    `question_type`,
    `question_id`,
    `student_answer`,
    `is_correct`,
    `score_earned`,
    `time_taken`,
    `answered_at`,
    `system_detected_answer`
  )
VALUES
  (
    411,
    243,
    11,
    72,
    51,
    'final',
    'sva',
    7,
    '\"{\\\"text\\\":\\\"The dog barks at the stranger.\\\",\\\"reason\\\":null}\"',
    1,
    2.00,
    0,
    '2026-11-13 14:24:17',
    NULL
  );
INSERT INTO
  `student_answers` (
    `answer_id`,
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `answer_type`,
    `question_type`,
    `question_id`,
    `student_answer`,
    `is_correct`,
    `score_earned`,
    `time_taken`,
    `answered_at`,
    `system_detected_answer`
  )
VALUES
  (
    412,
    243,
    11,
    72,
    51,
    'final',
    'sva',
    10,
    '\"{\\\"text\\\":\\\"The jury are arguing among themselves about the verdict.\\\",\\\"reason\\\":null}\"',
    1,
    2.00,
    0,
    '2026-11-13 14:24:17',
    NULL
  );
INSERT INTO
  `student_answers` (
    `answer_id`,
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `answer_type`,
    `question_type`,
    `question_id`,
    `student_answer`,
    `is_correct`,
    `score_earned`,
    `time_taken`,
    `answered_at`,
    `system_detected_answer`
  )
VALUES
  (
    413,
    244,
    11,
    72,
    51,
    'final',
    'sva',
    8,
    '\"{\\\"text\\\":\\\"The birds sing outside my window every morning.\\\",\\\"reason\\\":null}\"',
    1,
    2.00,
    0,
    '2026-11-13 14:25:32',
    NULL
  );
INSERT INTO
  `student_answers` (
    `answer_id`,
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `answer_type`,
    `question_type`,
    `question_id`,
    `student_answer`,
    `is_correct`,
    `score_earned`,
    `time_taken`,
    `answered_at`,
    `system_detected_answer`
  )
VALUES
  (
    414,
    244,
    11,
    72,
    51,
    'final',
    'sva',
    7,
    '\"{\\\"text\\\":\\\"\\\",\\\"reason\\\":\\\"Empty sentence\\\"}\"',
    0,
    0.00,
    0,
    '2026-11-13 14:25:32',
    NULL
  );
INSERT INTO
  `student_answers` (
    `answer_id`,
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `answer_type`,
    `question_type`,
    `question_id`,
    `student_answer`,
    `is_correct`,
    `score_earned`,
    `time_taken`,
    `answered_at`,
    `system_detected_answer`
  )
VALUES
  (
    415,
    244,
    11,
    72,
    51,
    'final',
    'sva',
    9,
    '\"{\\\"text\\\":\\\"The team are putting on their individual jerseys before the match.\\\",\\\"reason\\\":\\\"Collective noun \\\\\\\"team\\\\\\\" should take a singular verb\\\"}\"',
    0,
    0.00,
    0,
    '2026-11-13 14:25:32',
    NULL
  );
INSERT INTO
  `student_answers` (
    `answer_id`,
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `answer_type`,
    `question_type`,
    `question_id`,
    `student_answer`,
    `is_correct`,
    `score_earned`,
    `time_taken`,
    `answered_at`,
    `system_detected_answer`
  )
VALUES
  (
    416,
    244,
    11,
    72,
    51,
    'final',
    'sva',
    10,
    '\"{\\\"text\\\":\\\"Our family have different opinions about where to go on vacation.\\\",\\\"reason\\\":null}\"',
    1,
    2.00,
    0,
    '2026-11-13 14:25:32',
    NULL
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: student_lesson_progress
# ------------------------------------------------------------

INSERT INTO
  `student_lesson_progress` (
    `progress_id`,
    `student_id`,
    `lesson_id`,
    `reading_status`,
    `reading_progress`,
    `reading_started_at`,
    `reading_completed_at`,
    `reading_time_spent`,
    `final_quiz_status`,
    `final_quiz_attempts`,
    `best_quiz_score`,
    `last_quiz_score`,
    `final_quiz_started_at`,
    `final_quiz_completed_at`,
    `final_quiz_time_spent`,
    `lesson_status`,
    `unlocked_at`,
    `passed_at`,
    `failed_at`,
    `failed_attempts`,
    `last_activity`
  )
VALUES
  (
    36,
    11,
    44,
    'in_progress',
    0.00,
    NULL,
    NULL,
    0,
    'completed',
    7,
    100.00,
    66.67,
    NULL,
    NULL,
    0,
    'passed',
    '2026-11-11 20:50:06',
    '2026-11-11 21:02:00',
    NULL,
    5,
    '2026-11-12 23:03:59'
  );
INSERT INTO
  `student_lesson_progress` (
    `progress_id`,
    `student_id`,
    `lesson_id`,
    `reading_status`,
    `reading_progress`,
    `reading_started_at`,
    `reading_completed_at`,
    `reading_time_spent`,
    `final_quiz_status`,
    `final_quiz_attempts`,
    `best_quiz_score`,
    `last_quiz_score`,
    `final_quiz_started_at`,
    `final_quiz_completed_at`,
    `final_quiz_time_spent`,
    `lesson_status`,
    `unlocked_at`,
    `passed_at`,
    `failed_at`,
    `failed_attempts`,
    `last_activity`
  )
VALUES
  (
    39,
    11,
    47,
    'in_progress',
    0.00,
    NULL,
    NULL,
    0,
    'completed',
    25,
    100.00,
    33.33,
    NULL,
    NULL,
    0,
    'passed',
    '2026-11-12 23:17:30',
    '2026-11-13 01:18:19',
    NULL,
    20,
    '2026-11-13 02:19:54'
  );
INSERT INTO
  `student_lesson_progress` (
    `progress_id`,
    `student_id`,
    `lesson_id`,
    `reading_status`,
    `reading_progress`,
    `reading_started_at`,
    `reading_completed_at`,
    `reading_time_spent`,
    `final_quiz_status`,
    `final_quiz_attempts`,
    `best_quiz_score`,
    `last_quiz_score`,
    `final_quiz_started_at`,
    `final_quiz_completed_at`,
    `final_quiz_time_spent`,
    `lesson_status`,
    `unlocked_at`,
    `passed_at`,
    `failed_at`,
    `failed_attempts`,
    `last_activity`
  )
VALUES
  (
    40,
    11,
    49,
    'in_progress',
    0.00,
    NULL,
    NULL,
    0,
    'completed',
    2,
    100.00,
    66.67,
    NULL,
    NULL,
    0,
    'passed',
    '2026-11-13 02:28:40',
    '2026-11-13 02:28:43',
    NULL,
    1,
    '2026-11-13 02:28:59'
  );
INSERT INTO
  `student_lesson_progress` (
    `progress_id`,
    `student_id`,
    `lesson_id`,
    `reading_status`,
    `reading_progress`,
    `reading_started_at`,
    `reading_completed_at`,
    `reading_time_spent`,
    `final_quiz_status`,
    `final_quiz_attempts`,
    `best_quiz_score`,
    `last_quiz_score`,
    `final_quiz_started_at`,
    `final_quiz_completed_at`,
    `final_quiz_time_spent`,
    `lesson_status`,
    `unlocked_at`,
    `passed_at`,
    `failed_at`,
    `failed_attempts`,
    `last_activity`
  )
VALUES
  (
    41,
    11,
    50,
    'in_progress',
    0.00,
    NULL,
    NULL,
    0,
    'completed',
    2,
    100.00,
    100.00,
    NULL,
    NULL,
    0,
    'passed',
    '2026-11-13 02:34:16',
    '2026-11-13 02:35:09',
    NULL,
    1,
    '2026-11-13 02:35:09'
  );
INSERT INTO
  `student_lesson_progress` (
    `progress_id`,
    `student_id`,
    `lesson_id`,
    `reading_status`,
    `reading_progress`,
    `reading_started_at`,
    `reading_completed_at`,
    `reading_time_spent`,
    `final_quiz_status`,
    `final_quiz_attempts`,
    `best_quiz_score`,
    `last_quiz_score`,
    `final_quiz_started_at`,
    `final_quiz_completed_at`,
    `final_quiz_time_spent`,
    `lesson_status`,
    `unlocked_at`,
    `passed_at`,
    `failed_at`,
    `failed_attempts`,
    `last_activity`
  )
VALUES
  (
    42,
    11,
    51,
    'in_progress',
    0.00,
    NULL,
    NULL,
    0,
    'completed',
    3,
    100.00,
    50.00,
    NULL,
    NULL,
    0,
    'passed',
    '2026-11-13 02:49:47',
    '2026-11-13 14:24:17',
    NULL,
    2,
    '2026-11-13 14:25:32'
  );
INSERT INTO
  `student_lesson_progress` (
    `progress_id`,
    `student_id`,
    `lesson_id`,
    `reading_status`,
    `reading_progress`,
    `reading_started_at`,
    `reading_completed_at`,
    `reading_time_spent`,
    `final_quiz_status`,
    `final_quiz_attempts`,
    `best_quiz_score`,
    `last_quiz_score`,
    `final_quiz_started_at`,
    `final_quiz_completed_at`,
    `final_quiz_time_spent`,
    `lesson_status`,
    `unlocked_at`,
    `passed_at`,
    `failed_at`,
    `failed_attempts`,
    `last_activity`
  )
VALUES
  (
    43,
    11,
    52,
    'in_progress',
    0.00,
    NULL,
    NULL,
    0,
    'completed',
    7,
    100.00,
    100.00,
    NULL,
    NULL,
    0,
    'passed',
    '2026-11-13 15:07:38',
    '2026-11-13 16:34:43',
    NULL,
    5,
    '2026-11-13 16:34:43'
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: student_quiz_sessions
# ------------------------------------------------------------

INSERT INTO
  `student_quiz_sessions` (
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `session_type`,
    `session_code`,
    `started_at`,
    `completed_at`,
    `time_taken`,
    `selected_questions`,
    `total_questions`,
    `answered_questions`,
    `score`,
    `is_passed`,
    `attempt_number`
  )
VALUES
  (
    188,
    11,
    61,
    44,
    'pretest',
    'SES-1794401406666-ebf4d9ec',
    '2026-11-11 20:50:06',
    '2026-11-11 20:52:47',
    160,
    '[63, 65, 64]',
    3,
    3,
    100.00,
    1,
    1
  );
INSERT INTO
  `student_quiz_sessions` (
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `session_type`,
    `session_code`,
    `started_at`,
    `completed_at`,
    `time_taken`,
    `selected_questions`,
    `total_questions`,
    `answered_questions`,
    `score`,
    `is_passed`,
    `attempt_number`
  )
VALUES
  (
    189,
    11,
    62,
    44,
    'final',
    'SES-1794401585731-d1cde7e4',
    '2026-11-11 20:53:05',
    '2026-11-11 20:55:21',
    136,
    '[7, 8]',
    2,
    2,
    50.00,
    0,
    1
  );
INSERT INTO
  `student_quiz_sessions` (
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `session_type`,
    `session_code`,
    `started_at`,
    `completed_at`,
    `time_taken`,
    `selected_questions`,
    `total_questions`,
    `answered_questions`,
    `score`,
    `is_passed`,
    `attempt_number`
  )
VALUES
  (
    190,
    11,
    61,
    44,
    'pretest',
    'SES-1794402032230-41833877',
    '2026-11-11 21:00:32',
    '2026-11-11 21:02:00',
    88,
    '[65, 63, 64]',
    3,
    3,
    100.00,
    1,
    2
  );
INSERT INTO
  `student_quiz_sessions` (
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `session_type`,
    `session_code`,
    `started_at`,
    `completed_at`,
    `time_taken`,
    `selected_questions`,
    `total_questions`,
    `answered_questions`,
    `score`,
    `is_passed`,
    `attempt_number`
  )
VALUES
  (
    191,
    11,
    62,
    44,
    'final',
    'SES-1794402127162-b5771a7e',
    '2026-11-11 21:02:07',
    '2026-11-11 21:02:14',
    7,
    '[8, 7]',
    2,
    2,
    0.00,
    0,
    2
  );
INSERT INTO
  `student_quiz_sessions` (
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `session_type`,
    `session_code`,
    `started_at`,
    `completed_at`,
    `time_taken`,
    `selected_questions`,
    `total_questions`,
    `answered_questions`,
    `score`,
    `is_passed`,
    `attempt_number`
  )
VALUES
  (
    192,
    11,
    62,
    44,
    'final',
    'SES-1794417365301-54808b3a',
    '2026-11-12 01:16:05',
    NULL,
    0,
    '[8, 7]',
    2,
    0,
    0.00,
    0,
    3
  );
INSERT INTO
  `student_quiz_sessions` (
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `session_type`,
    `session_code`,
    `started_at`,
    `completed_at`,
    `time_taken`,
    `selected_questions`,
    `total_questions`,
    `answered_questions`,
    `score`,
    `is_passed`,
    `attempt_number`
  )
VALUES
  (
    193,
    11,
    61,
    44,
    'pretest',
    'SES-1794488840545-b6453ed2',
    '2026-11-12 21:07:20',
    '2026-11-12 21:07:28',
    7,
    '[64, 63, 65]',
    3,
    3,
    0.00,
    0,
    3
  );
INSERT INTO
  `student_quiz_sessions` (
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `session_type`,
    `session_code`,
    `started_at`,
    `completed_at`,
    `time_taken`,
    `selected_questions`,
    `total_questions`,
    `answered_questions`,
    `score`,
    `is_passed`,
    `attempt_number`
  )
VALUES
  (
    194,
    11,
    62,
    44,
    'final',
    'SES-1794494037124-5dac13b5',
    '2026-11-12 22:33:57',
    '2026-11-12 22:34:09',
    12,
    '[8, 7]',
    2,
    2,
    0.00,
    0,
    4
  );
INSERT INTO
  `student_quiz_sessions` (
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `session_type`,
    `session_code`,
    `started_at`,
    `completed_at`,
    `time_taken`,
    `selected_questions`,
    `total_questions`,
    `answered_questions`,
    `score`,
    `is_passed`,
    `attempt_number`
  )
VALUES
  (
    196,
    11,
    61,
    44,
    'pretest',
    'SES-1794495830036-9fcb3753',
    '2026-11-12 23:03:50',
    '2026-11-12 23:03:59',
    8,
    '[63, 65, 64]',
    3,
    3,
    66.67,
    0,
    4
  );
INSERT INTO
  `student_quiz_sessions` (
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `session_type`,
    `session_code`,
    `started_at`,
    `completed_at`,
    `time_taken`,
    `selected_questions`,
    `total_questions`,
    `answered_questions`,
    `score`,
    `is_passed`,
    `attempt_number`
  )
VALUES
  (
    198,
    11,
    65,
    47,
    'pretest',
    'SES-1794496651024-efcfa921',
    '2026-11-12 23:17:31',
    '2026-11-12 23:17:33',
    2,
    '[69]',
    1,
    1,
    100.00,
    1,
    1
  );
INSERT INTO
  `student_quiz_sessions` (
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `session_type`,
    `session_code`,
    `started_at`,
    `completed_at`,
    `time_taken`,
    `selected_questions`,
    `total_questions`,
    `answered_questions`,
    `score`,
    `is_passed`,
    `attempt_number`
  )
VALUES
  (
    230,
    11,
    65,
    47,
    'pretest',
    'SES-1794503872610-688f5939',
    '2026-11-13 01:17:52',
    '2026-11-13 01:18:19',
    5,
    '[69]',
    1,
    1,
    100.00,
    1,
    2
  );
INSERT INTO
  `student_quiz_sessions` (
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `session_type`,
    `session_code`,
    `started_at`,
    `completed_at`,
    `time_taken`,
    `selected_questions`,
    `total_questions`,
    `answered_questions`,
    `score`,
    `is_passed`,
    `attempt_number`
  )
VALUES
  (
    238,
    11,
    68,
    49,
    'pretest',
    'SES-1794508120725-e7ebfccd',
    '2026-11-13 02:28:40',
    '2026-11-13 02:28:43',
    2,
    '[72]',
    1,
    1,
    100.00,
    1,
    1
  );
INSERT INTO
  `student_quiz_sessions` (
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `session_type`,
    `session_code`,
    `started_at`,
    `completed_at`,
    `time_taken`,
    `selected_questions`,
    `total_questions`,
    `answered_questions`,
    `score`,
    `is_passed`,
    `attempt_number`
  )
VALUES
  (
    239,
    11,
    69,
    49,
    'final',
    'SES-1794508131783-88512185',
    '2026-11-13 02:28:51',
    '2026-11-13 02:28:59',
    6,
    '[75, 73, 74]',
    3,
    3,
    66.67,
    0,
    1
  );
INSERT INTO
  `student_quiz_sessions` (
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `session_type`,
    `session_code`,
    `started_at`,
    `completed_at`,
    `time_taken`,
    `selected_questions`,
    `total_questions`,
    `answered_questions`,
    `score`,
    `is_passed`,
    `attempt_number`
  )
VALUES
  (
    240,
    11,
    70,
    50,
    'final',
    'SES-1794508459719-603d9237',
    '2026-11-13 02:34:19',
    '2026-11-13 02:34:47',
    27,
    '[20, 21]',
    2,
    2,
    50.00,
    0,
    1
  );
INSERT INTO
  `student_quiz_sessions` (
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `session_type`,
    `session_code`,
    `started_at`,
    `completed_at`,
    `time_taken`,
    `selected_questions`,
    `total_questions`,
    `answered_questions`,
    `score`,
    `is_passed`,
    `attempt_number`
  )
VALUES
  (
    241,
    11,
    70,
    50,
    'final',
    'SES-1794508493682-bf9040b9',
    '2026-11-13 02:34:53',
    '2026-11-13 02:35:09',
    15,
    '[21, 20]',
    2,
    2,
    100.00,
    1,
    2
  );
INSERT INTO
  `student_quiz_sessions` (
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `session_type`,
    `session_code`,
    `started_at`,
    `completed_at`,
    `time_taken`,
    `selected_questions`,
    `total_questions`,
    `answered_questions`,
    `score`,
    `is_passed`,
    `attempt_number`
  )
VALUES
  (
    242,
    11,
    72,
    51,
    'final',
    'SES-1794509390884-51fdf94e',
    '2026-11-13 02:49:50',
    '2026-11-13 02:51:21',
    90,
    '[8, 7, 10, 9]',
    4,
    4,
    50.00,
    0,
    1
  );
INSERT INTO
  `student_quiz_sessions` (
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `session_type`,
    `session_code`,
    `started_at`,
    `completed_at`,
    `time_taken`,
    `selected_questions`,
    `total_questions`,
    `answered_questions`,
    `score`,
    `is_passed`,
    `attempt_number`
  )
VALUES
  (
    243,
    11,
    72,
    51,
    'final',
    'SES-1794550967027-7763703b',
    '2026-11-13 14:22:47',
    '2026-11-13 14:24:17',
    90,
    '[8, 9, 7, 10]',
    4,
    4,
    100.00,
    1,
    2
  );
INSERT INTO
  `student_quiz_sessions` (
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `session_type`,
    `session_code`,
    `started_at`,
    `completed_at`,
    `time_taken`,
    `selected_questions`,
    `total_questions`,
    `answered_questions`,
    `score`,
    `is_passed`,
    `attempt_number`
  )
VALUES
  (
    244,
    11,
    72,
    51,
    'final',
    'SES-1794551099938-272b34c6',
    '2026-11-13 14:24:59',
    '2026-11-13 14:25:32',
    32,
    '[8, 7, 9, 10]',
    4,
    3,
    50.00,
    0,
    3
  );
INSERT INTO
  `student_quiz_sessions` (
    `session_id`,
    `student_id`,
    `quiz_id`,
    `lesson_id`,
    `session_type`,
    `session_code`,
    `started_at`,
    `completed_at`,
    `time_taken`,
    `selected_questions`,
    `total_questions`,
    `answered_questions`,
    `score`,
    `is_passed`,
    `attempt_number`
  )
VALUES
  (
    252,
    11,
    61,
    44,
    'pretest',
    'SES-1794584428513-97d6a951',
    '2026-11-13 23:40:28',
    NULL,
    0,
    '[64, 65, 63]',
    3,
    0,
    0.00,
    0,
    5
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: students
# ------------------------------------------------------------

INSERT INTO
  `students` (
    `student_id`,
    `username`,
    `password_hash`,
    `full_name`,
    `profile_picture`,
    `grade_level`,
    `birth_date`,
    `LRN`,
    `is_active`,
    `last_login`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    5,
    'bebe',
    '$2b$10$4rm3B5ddtyTAr2gDV6dYWesGKrUgxAo1/SCsrYfidYs1uGr3AbVsq',
    'rodel dg',
    NULL,
    '10',
    NULL,
    NULL,
    1,
    NULL,
    '2026-10-14 16:49:26',
    '2026-10-14 16:49:26'
  );
INSERT INTO
  `students` (
    `student_id`,
    `username`,
    `password_hash`,
    `full_name`,
    `profile_picture`,
    `grade_level`,
    `birth_date`,
    `LRN`,
    `is_active`,
    `last_login`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    7,
    'mr.loverboy',
    '$2b$10$Ha5UdZVlAAhsd8NCc1I53.3w86u1oRQ/H82JnNxNWGOxrnqBk.Ida',
    'rodel',
    NULL,
    '9',
    NULL,
    NULL,
    1,
    NULL,
    '2026-10-17 14:11:18',
    '2026-10-17 14:11:18'
  );
INSERT INTO
  `students` (
    `student_id`,
    `username`,
    `password_hash`,
    `full_name`,
    `profile_picture`,
    `grade_level`,
    `birth_date`,
    `LRN`,
    `is_active`,
    `last_login`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    10,
    'naruto',
    '$2b$10$B/XCgpQwJ1KU.J8ekSlhIuyTBQxS0Zg1YPuivs1vDvDFCEaOu06bm',
    'rodel',
    NULL,
    '7',
    NULL,
    NULL,
    1,
    NULL,
    '2026-10-19 15:22:31',
    '2026-11-01 15:52:06'
  );
INSERT INTO
  `students` (
    `student_id`,
    `username`,
    `password_hash`,
    `full_name`,
    `profile_picture`,
    `grade_level`,
    `birth_date`,
    `LRN`,
    `is_active`,
    `last_login`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    11,
    'bamby',
    '$2b$10$XarzL6eeKBPXSBLxQOQiZulEFPRfkrJ8.O0GKTHolY5S0XY4Z5yJq',
    'rodel de',
    NULL,
    '7',
    NULL,
    NULL,
    1,
    NULL,
    '2026-11-01 07:43:48',
    '2026-11-01 07:43:48'
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: sva_quiz
# ------------------------------------------------------------

INSERT INTO
  `sva_quiz` (
    `question_id`,
    `quiz_id`,
    `instruction`,
    `points`,
    `hint`,
    `subject_type`,
    `verb_type`,
    `context`,
    `min_sentence_length`,
    `max_sentence_length`,
    `example_sentence`,
    `is_active`,
    `created_by`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    7,
    72,
    'singular singular',
    2,
    NULL,
    'singular',
    'singular',
    NULL,
    5,
    15,
    'non',
    1,
    7,
    '2026-11-13 02:45:00',
    '2026-11-13 02:45:00'
  );
INSERT INTO
  `sva_quiz` (
    `question_id`,
    `quiz_id`,
    `instruction`,
    `points`,
    `hint`,
    `subject_type`,
    `verb_type`,
    `context`,
    `min_sentence_length`,
    `max_sentence_length`,
    `example_sentence`,
    `is_active`,
    `created_by`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    8,
    72,
    'p p',
    2,
    NULL,
    'plural',
    'plural',
    NULL,
    5,
    15,
    'non',
    1,
    7,
    '2026-11-13 02:48:22',
    '2026-11-13 02:48:22'
  );
INSERT INTO
  `sva_quiz` (
    `question_id`,
    `quiz_id`,
    `instruction`,
    `points`,
    `hint`,
    `subject_type`,
    `verb_type`,
    `context`,
    `min_sentence_length`,
    `max_sentence_length`,
    `example_sentence`,
    `is_active`,
    `created_by`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    9,
    72,
    'c s',
    2,
    NULL,
    'collective',
    'singular',
    NULL,
    5,
    15,
    'non',
    1,
    7,
    '2026-11-13 02:48:40',
    '2026-11-13 02:48:40'
  );
INSERT INTO
  `sva_quiz` (
    `question_id`,
    `quiz_id`,
    `instruction`,
    `points`,
    `hint`,
    `subject_type`,
    `verb_type`,
    `context`,
    `min_sentence_length`,
    `max_sentence_length`,
    `example_sentence`,
    `is_active`,
    `created_by`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    11,
    72,
    'add',
    2,
    NULL,
    'singular',
    'singular',
    NULL,
    5,
    15,
    'add',
    1,
    7,
    '2026-11-13 21:32:58',
    '2026-11-13 21:32:58'
  );
INSERT INTO
  `sva_quiz` (
    `question_id`,
    `quiz_id`,
    `instruction`,
    `points`,
    `hint`,
    `subject_type`,
    `verb_type`,
    `context`,
    `min_sentence_length`,
    `max_sentence_length`,
    `example_sentence`,
    `is_active`,
    `created_by`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    12,
    72,
    'add',
    2,
    NULL,
    'singular',
    'singular',
    NULL,
    5,
    15,
    'shgeshc  sg sd',
    1,
    7,
    '2026-11-13 21:33:32',
    '2026-11-13 21:33:32'
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: teachers
# ------------------------------------------------------------

INSERT INTO
  `teachers` (
    `teacher_id`,
    `username`,
    `password_hash`,
    `full_name`,
    `profile_picture`,
    `department`,
    `specialization`,
    `contact_number`,
    `role`,
    `is_active`,
    `last_login`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    7,
    'mr.pogi',
    '$2b$10$ov7g7kmYgNzJ1BpHeoh/sOaqNN8TyWCVn.wasogeUkzsNjwA2K2GK',
    'rodel',
    '/uploads/profiles/user-7-1794709190601.jpg',
    'science',
    '',
    NULL,
    'teacher',
    0,
    NULL,
    '2026-10-18 08:59:41',
    '2026-11-15 10:19:50'
  );
INSERT INTO
  `teachers` (
    `teacher_id`,
    `username`,
    `password_hash`,
    `full_name`,
    `profile_picture`,
    `department`,
    `specialization`,
    `contact_number`,
    `role`,
    `is_active`,
    `last_login`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    8,
    'admin',
    '$2b$10$DO8ZCCtLvFYLciy9MHu3ku.4Opk9pXYq6Lf39dwOmQiPh9o1w.HOe',
    'teacher-admin',
    '/uploads/profiles/user-8-1794719435577.png',
    'English',
    '',
    '',
    'admin',
    1,
    NULL,
    '2026-11-01 09:51:12',
    '2026-11-15 21:31:41'
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: verbs_dictionary
# ------------------------------------------------------------

INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (1, 'run', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (2, 'walk', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (3, 'study', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (4, 'read', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (5, 'cook', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (6, 'play', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (7, 'work', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (8, 'eat', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (9, 'sleep', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (10, 'talk', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (11, 'sing', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (12, 'dance', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (13, 'swim', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (14, 'write', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (15, 'draw', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (16, 'paint', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (17, 'teach', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (18, 'learn', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (19, 'help', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (20, 'call', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (21, 'ask', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (22, 'answer', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (23, 'travel', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (24, 'fly', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (25, 'drive', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (26, 'clean', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (27, 'fix', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (28, 'build', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (29, 'make', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (30, 'think', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (31, 'know', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (32, 'see', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (33, 'hear', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (34, 'watch', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (35, 'look', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (36, 'give', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (37, 'take', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (38, 'bring', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (39, 'send', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (40, 'open', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (41, 'close', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (42, 'start', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (43, 'stop', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (44, 'love', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (45, 'like', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (46, 'want', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (47, 'need', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (48, 'have', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (49, 'do', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (50, 'go', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (51, 'come', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (52, 'live', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (53, 'stay', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (54, 'feel', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (55, 'seem', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (56, 'become', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (57, 'begin', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (58, 'end', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (59, 'try', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (60, 'use', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (61, 'find', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (62, 'lose', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (63, 'win', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (64, 'buy', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (65, 'sell', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (66, 'pay', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (67, 'cost', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (68, 'laugh', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (69, 'cry', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (70, 'smile', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (71, 'jump', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (72, 'climb', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (73, 'carry', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (74, 'push', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (75, 'pull', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (76, 'hold', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (77, 'throw', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (78, 'catch', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (79, 'meet', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (80, 'join', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (81, 'leave', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (82, 'enter', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (83, 'arrive', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (84, 'bark', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (85, 'meow', 1, NULL, '2026-11-13 14:15:48');
INSERT INTO
  `verbs_dictionary` (
    `id`,
    `base_form`,
    `is_approved`,
    `created_by`,
    `created_at`
  )
VALUES
  (86, 'argue', 1, NULL, '2026-11-13 14:15:48');

/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
