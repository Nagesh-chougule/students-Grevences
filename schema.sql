-- ============================================================================
-- Student Grievance Redressal Management System (SGRMS)
-- Normalised relational schema — MySQL 8.0 / MariaDB 10.6+
-- InnoDB, utf8mb4. Every state change is written to grievance_action + audit_log.
-- ============================================================================
SET NAMES utf8mb4;
CREATE DATABASE IF NOT EXISTS sgrms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sgrms;

-- ---------------------------------------------------------------- organisation
CREATE TABLE department (
  dept_id        INT AUTO_INCREMENT PRIMARY KEY,
  code           VARCHAR(10)  NOT NULL UNIQUE,          -- ME, CSE, ENTC
  name           VARCHAR(120) NOT NULL,
  is_active      TINYINT(1)   NOT NULL DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE programme (
  programme_id   INT AUTO_INCREMENT PRIMARY KEY,
  dept_id        INT NOT NULL,
  code           VARCHAR(20)  NOT NULL,
  name           VARCHAR(120) NOT NULL,                 -- B.Tech Mechanical
  duration_years TINYINT      NOT NULL DEFAULT 4,
  UNIQUE KEY uq_prog (dept_id, code),
  CONSTRAINT fk_prog_dept FOREIGN KEY (dept_id) REFERENCES department(dept_id)
) ENGINE=InnoDB;

-- --------------------------------------------------------------- identity/RBAC
CREATE TABLE role (
  role_id        INT AUTO_INCREMENT PRIMARY KEY,
  code           VARCHAR(30) NOT NULL UNIQUE,           -- STUDENT, OFFICER, HOD, DEAN,
  name           VARCHAR(80) NOT NULL,                  -- COMMITTEE, APPELLATE, ADMIN
  ladder_level   TINYINT NULL,                          -- 1..5, NULL for STUDENT/ADMIN
  can_view_confidential TINYINT(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE permission (
  permission_id  INT AUTO_INCREMENT PRIMARY KEY,
  code           VARCHAR(60) NOT NULL UNIQUE,           -- grievance.resolve, report.export
  description    VARCHAR(200) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE role_permission (
  role_id        INT NOT NULL,
  permission_id  INT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES role(role_id) ON DELETE CASCADE,
  CONSTRAINT fk_rp_perm FOREIGN KEY (permission_id) REFERENCES permission(permission_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE app_user (
  user_id        BIGINT AUTO_INCREMENT PRIMARY KEY,
  login_id       VARCHAR(40)  NOT NULL UNIQUE,          -- enrolment no. or staff id
  full_name      VARCHAR(120) NOT NULL,
  email          VARCHAR(160) NOT NULL UNIQUE,
  mobile         VARCHAR(20)  NULL,
  password_hash  VARCHAR(255) NULL,                     -- argon2id / bcrypt; NULL when SSO-only
  auth_source    ENUM('LOCAL','LDAP','SSO') NOT NULL DEFAULT 'SSO',
  dept_id        INT NULL,                              -- NULL = institute-wide officer
  designation    VARCHAR(120) NULL,
  is_active      TINYINT(1) NOT NULL DEFAULT 1,
  mfa_enabled    TINYINT(1) NOT NULL DEFAULT 0,
  last_login_at  DATETIME NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_dept FOREIGN KEY (dept_id) REFERENCES department(dept_id)
) ENGINE=InnoDB;

CREATE TABLE user_role (
  user_id        BIGINT NOT NULL,
  role_id        INT    NOT NULL,
  dept_id        INT    NULL,                           -- scope of the role
  valid_from     DATE   NOT NULL DEFAULT (CURRENT_DATE),
  valid_to       DATE   NULL,
  PRIMARY KEY (user_id, role_id, valid_from),
  CONSTRAINT fk_ur_user FOREIGN KEY (user_id) REFERENCES app_user(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_ur_role FOREIGN KEY (role_id) REFERENCES role(role_id),
  CONSTRAINT fk_ur_dept FOREIGN KEY (dept_id) REFERENCES department(dept_id)
) ENGINE=InnoDB;

CREATE TABLE user_session (
  session_id     CHAR(64) PRIMARY KEY,                  -- opaque token hash
  user_id        BIGINT NOT NULL,
  ip_address     VARBINARY(16) NULL,
  user_agent     VARCHAR(255) NULL,
  issued_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at     DATETIME NOT NULL,
  revoked_at     DATETIME NULL,
  CONSTRAINT fk_sess_user FOREIGN KEY (user_id) REFERENCES app_user(user_id) ON DELETE CASCADE,
  INDEX ix_sess_user (user_id, expires_at)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------- students
CREATE TABLE student (
  student_id     BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id        BIGINT NOT NULL UNIQUE,
  enrolment_no   VARCHAR(30) NOT NULL UNIQUE,
  programme_id   INT NOT NULL,
  dept_id        INT NOT NULL,
  semester       TINYINT NOT NULL,
  division       VARCHAR(5) NULL,
  academic_year  VARCHAR(9) NOT NULL,                   -- 2026-27
  admission_year YEAR NULL,
  hostel_block   VARCHAR(60) NULL,
  hostel_room    VARCHAR(20) NULL,
  erp_sync_at    DATETIME NULL,                         -- last pull from college ERP
  CONSTRAINT fk_stu_user FOREIGN KEY (user_id) REFERENCES app_user(user_id),
  CONSTRAINT fk_stu_prog FOREIGN KEY (programme_id) REFERENCES programme(programme_id),
  CONSTRAINT fk_stu_dept FOREIGN KEY (dept_id) REFERENCES department(dept_id),
  INDEX ix_stu_dept_sem (dept_id, semester)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------- categories
CREATE TABLE grievance_category (
  category_id    INT AUTO_INCREMENT PRIMARY KEY,
  code           VARCHAR(15) NOT NULL UNIQUE,
  name           VARCHAR(100) NOT NULL,
  default_priority ENUM('Critical','High','Medium','Low') NOT NULL DEFAULT 'Medium',
  entry_level    TINYINT NOT NULL DEFAULT 1,            -- level at which cases enter
  always_confidential TINYINT(1) NOT NULL DEFAULT 0,    -- ragging, harassment
  sla_override_days SMALLINT NULL,                      -- statutory override
  is_active      TINYINT(1) NOT NULL DEFAULT 1,
  display_order  SMALLINT NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE grievance_subcategory (
  subcategory_id INT AUTO_INCREMENT PRIMARY KEY,
  category_id    INT NOT NULL,
  name           VARCHAR(120) NOT NULL,
  is_active      TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_sub (category_id, name),
  CONSTRAINT fk_sub_cat FOREIGN KEY (category_id) REFERENCES grievance_category(category_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------ authorities/SLA
CREATE TABLE authority (
  authority_id   INT AUTO_INCREMENT PRIMARY KEY,
  ladder_level   TINYINT NOT NULL,                      -- 1..5
  label          VARCHAR(120) NOT NULL,                 -- Department Grievance Officer
  dept_id        INT NULL,                              -- NULL = institute-wide
  user_id        BIGINT NOT NULL,                       -- current holder of the office
  effective_from DATE NOT NULL DEFAULT (CURRENT_DATE),
  effective_to   DATE NULL,
  CONSTRAINT fk_auth_dept FOREIGN KEY (dept_id) REFERENCES department(dept_id),
  CONSTRAINT fk_auth_user FOREIGN KEY (user_id) REFERENCES app_user(user_id),
  INDEX ix_auth_level (ladder_level, dept_id)
) ENGINE=InnoDB;

CREATE TABLE committee (
  committee_id   INT AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(140) NOT NULL,                 -- Anti-Ragging Committee, ICC
  statute_ref    VARCHAR(160) NULL,                     -- UGC Regulations, 2009
  is_active      TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE committee_member (
  committee_id   INT NOT NULL,
  user_id        BIGINT NOT NULL,
  member_role    VARCHAR(60) NOT NULL,                  -- Convener, Member, External
  PRIMARY KEY (committee_id, user_id),
  CONSTRAINT fk_cm_com FOREIGN KEY (committee_id) REFERENCES committee(committee_id),
  CONSTRAINT fk_cm_user FOREIGN KEY (user_id) REFERENCES app_user(user_id)
) ENGINE=InnoDB;

CREATE TABLE sla_rule (
  sla_rule_id    INT AUTO_INCREMENT PRIMARY KEY,
  ladder_level   TINYINT NOT NULL,
  category_id    INT NULL,                              -- NULL = applies to all
  priority       ENUM('Critical','High','Medium','Low') NULL,
  working_days   SMALLINT NOT NULL,
  reminder_before_days SMALLINT NOT NULL DEFAULT 1,
  is_active      TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_sla (ladder_level, category_id, priority),
  CONSTRAINT fk_sla_cat FOREIGN KEY (category_id) REFERENCES grievance_category(category_id)
) ENGINE=InnoDB;

CREATE TABLE holiday (
  holiday_date   DATE PRIMARY KEY,                      -- excluded from working-day maths
  description    VARCHAR(120) NOT NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------------ grievance
CREATE TABLE grievance (
  grievance_id   BIGINT AUTO_INCREMENT PRIMARY KEY,
  reference_no   VARCHAR(30) NOT NULL UNIQUE,           -- GRV/ME/2026/000125
  student_id     BIGINT NOT NULL,
  dept_id        INT NOT NULL,
  programme_id   INT NULL,
  semester       TINYINT NULL,
  academic_year  VARCHAR(9) NOT NULL,
  category_id    INT NOT NULL,
  subcategory_id INT NULL,
  title          VARCHAR(200) NOT NULL,
  description    MEDIUMTEXT NOT NULL,
  is_confidential TINYINT(1) NOT NULL DEFAULT 0,
  priority       ENUM('Critical','High','Medium','Low') NOT NULL DEFAULT 'Medium',
  status         ENUM('SUBMITTED','ASSIGNED','IN_REVIEW','CLARIFICATION','ESCALATED',
                      'RESOLVED','CLOSED','REOPENED','APPEALED') NOT NULL DEFAULT 'SUBMITTED',
  current_level  TINYINT NOT NULL DEFAULT 1,
  assigned_to    BIGINT NULL,                           -- current holding officer
  submitted_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  due_at         DATETIME NOT NULL,                     -- deadline at the current level
  first_response_at DATETIME NULL,
  resolved_at    DATETIME NULL,
  closed_at      DATETIME NULL,
  escalation_count SMALLINT NOT NULL DEFAULT 0,
  reopen_count   SMALLINT NOT NULL DEFAULT 0,
  ai_suggested_category_id INT NULL,                    -- advisory only
  ai_suggested_priority ENUM('Critical','High','Medium','Low') NULL,
  ai_sentiment   VARCHAR(30) NULL,
  ai_summary     VARCHAR(500) NULL,
  ai_duplicate_of BIGINT NULL,
  CONSTRAINT fk_g_student  FOREIGN KEY (student_id) REFERENCES student(student_id),
  CONSTRAINT fk_g_dept     FOREIGN KEY (dept_id) REFERENCES department(dept_id),
  CONSTRAINT fk_g_cat      FOREIGN KEY (category_id) REFERENCES grievance_category(category_id),
  CONSTRAINT fk_g_sub      FOREIGN KEY (subcategory_id) REFERENCES grievance_subcategory(subcategory_id),
  CONSTRAINT fk_g_assignee FOREIGN KEY (assigned_to) REFERENCES app_user(user_id),
  CONSTRAINT fk_g_dup      FOREIGN KEY (ai_duplicate_of) REFERENCES grievance(grievance_id),
  INDEX ix_g_status (status, due_at),
  INDEX ix_g_dept_cat (dept_id, category_id),
  INDEX ix_g_assignee (assigned_to, status),
  INDEX ix_g_student (student_id, submitted_at)
) ENGINE=InnoDB;

CREATE TABLE grievance_assignment (
  assignment_id  BIGINT AUTO_INCREMENT PRIMARY KEY,
  grievance_id   BIGINT NOT NULL,
  ladder_level   TINYINT NOT NULL,
  assigned_to    BIGINT NOT NULL,
  assigned_by    BIGINT NULL,                           -- NULL = routed by the system
  assigned_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  due_at         DATETIME NOT NULL,
  released_at    DATETIME NULL,                         -- when it left this desk
  outcome        VARCHAR(40) NULL,                      -- RESOLVED / ESCALATED / REFERRED
  CONSTRAINT fk_ga_g    FOREIGN KEY (grievance_id) REFERENCES grievance(grievance_id) ON DELETE CASCADE,
  CONSTRAINT fk_ga_to   FOREIGN KEY (assigned_to) REFERENCES app_user(user_id),
  CONSTRAINT fk_ga_by   FOREIGN KEY (assigned_by) REFERENCES app_user(user_id),
  INDEX ix_ga_g (grievance_id, assigned_at)
) ENGINE=InnoDB;

CREATE TABLE grievance_action (
  action_id      BIGINT AUTO_INCREMENT PRIMARY KEY,
  grievance_id   BIGINT NOT NULL,
  actor_user_id  BIGINT NULL,                           -- NULL = system
  action_type    ENUM('SUBMITTED','ASSIGNED','IN_REVIEW','NOTE','CLARIFICATION','REPLY',
                      'ESCALATED','RESOLVED','CLOSED','REOPENED','APPEALED','FEEDBACK') NOT NULL,
  ladder_level   TINYINT NOT NULL,
  remark         MEDIUMTEXT NULL,
  is_internal    TINYINT(1) NOT NULL DEFAULT 0,         -- internal notes hidden from student
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_act_g FOREIGN KEY (grievance_id) REFERENCES grievance(grievance_id) ON DELETE CASCADE,
  CONSTRAINT fk_act_u FOREIGN KEY (actor_user_id) REFERENCES app_user(user_id),
  INDEX ix_act_g (grievance_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE attachment (
  attachment_id  BIGINT AUTO_INCREMENT PRIMARY KEY,
  grievance_id   BIGINT NOT NULL,
  action_id      BIGINT NULL,
  uploaded_by    BIGINT NOT NULL,
  file_name      VARCHAR(255) NOT NULL,
  mime_type      VARCHAR(100) NOT NULL,
  size_bytes     BIGINT NOT NULL,
  storage_key    VARCHAR(255) NOT NULL,                 -- object-store key, not a public path
  checksum_sha256 CHAR(64) NOT NULL,
  is_encrypted   TINYINT(1) NOT NULL DEFAULT 1,
  uploaded_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_att_g FOREIGN KEY (grievance_id) REFERENCES grievance(grievance_id) ON DELETE CASCADE,
  CONSTRAINT fk_att_a FOREIGN KEY (action_id) REFERENCES grievance_action(action_id),
  CONSTRAINT fk_att_u FOREIGN KEY (uploaded_by) REFERENCES app_user(user_id)
) ENGINE=InnoDB;

CREATE TABLE escalation (
  escalation_id  BIGINT AUTO_INCREMENT PRIMARY KEY,
  grievance_id   BIGINT NOT NULL,
  from_level     TINYINT NOT NULL,
  to_level       TINYINT NOT NULL,
  from_user_id   BIGINT NULL,
  to_user_id     BIGINT NOT NULL,
  reason         ENUM('SLA_BREACH','CRITICAL_SEVERITY','MANUAL_REFERRAL','APPEAL') NOT NULL,
  remark         VARCHAR(400) NULL,
  escalated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_esc_g  FOREIGN KEY (grievance_id) REFERENCES grievance(grievance_id) ON DELETE CASCADE,
  CONSTRAINT fk_esc_to FOREIGN KEY (to_user_id) REFERENCES app_user(user_id),
  INDEX ix_esc_g (grievance_id, escalated_at)
) ENGINE=InnoDB;

CREATE TABLE resolution (
  resolution_id  BIGINT AUTO_INCREMENT PRIMARY KEY,
  grievance_id   BIGINT NOT NULL,
  resolved_by    BIGINT NOT NULL,
  ladder_level   TINYINT NOT NULL,
  findings       MEDIUMTEXT NOT NULL,
  action_taken   MEDIUMTEXT NOT NULL,
  corrective_measure MEDIUMTEXT NULL,
  communication  MEDIUMTEXT NOT NULL,                   -- text sent to the student
  resolved_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  within_sla     TINYINT(1) NOT NULL,
  CONSTRAINT fk_res_g FOREIGN KEY (grievance_id) REFERENCES grievance(grievance_id) ON DELETE CASCADE,
  CONSTRAINT fk_res_u FOREIGN KEY (resolved_by) REFERENCES app_user(user_id),
  INDEX ix_res_g (grievance_id)
) ENGINE=InnoDB;

CREATE TABLE appeal (
  appeal_id      BIGINT AUTO_INCREMENT PRIMARY KEY,
  grievance_id   BIGINT NOT NULL,
  raised_by      BIGINT NOT NULL,
  against_resolution_id BIGINT NULL,
  reason         MEDIUMTEXT NOT NULL,
  to_level       TINYINT NOT NULL,
  raised_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  due_at         DATETIME NOT NULL,
  decided_at     DATETIME NULL,
  decision       ENUM('UPHELD','MODIFIED','REJECTED') NULL,
  decision_note  MEDIUMTEXT NULL,
  CONSTRAINT fk_ap_g   FOREIGN KEY (grievance_id) REFERENCES grievance(grievance_id) ON DELETE CASCADE,
  CONSTRAINT fk_ap_u   FOREIGN KEY (raised_by) REFERENCES app_user(user_id),
  CONSTRAINT fk_ap_res FOREIGN KEY (against_resolution_id) REFERENCES resolution(resolution_id)
) ENGINE=InnoDB;

CREATE TABLE feedback (
  feedback_id    BIGINT AUTO_INCREMENT PRIMARY KEY,
  grievance_id   BIGINT NOT NULL,
  student_id     BIGINT NOT NULL,
  rating         TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  is_satisfied   TINYINT(1) NOT NULL,
  comments       MEDIUMTEXT NULL,
  submitted_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_fb (grievance_id, student_id),
  CONSTRAINT fk_fb_g FOREIGN KEY (grievance_id) REFERENCES grievance(grievance_id) ON DELETE CASCADE,
  CONSTRAINT fk_fb_s FOREIGN KEY (student_id) REFERENCES student(student_id)
) ENGINE=InnoDB;

-- --------------------------------------------------------------- notification
CREATE TABLE notification (
  notification_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  recipient_id   BIGINT NOT NULL,
  grievance_id   BIGINT NULL,
  event_type     VARCHAR(40) NOT NULL,                  -- SUBMITTED, ESCALATED, REMINDER...
  channel        ENUM('IN_APP','EMAIL','SMS','WHATSAPP') NOT NULL,
  subject        VARCHAR(200) NULL,
  body           TEXT NOT NULL,
  status         ENUM('QUEUED','SENT','FAILED','READ') NOT NULL DEFAULT 'QUEUED',
  provider_ref   VARCHAR(120) NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at        DATETIME NULL,
  read_at        DATETIME NULL,
  CONSTRAINT fk_nt_u FOREIGN KEY (recipient_id) REFERENCES app_user(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_nt_g FOREIGN KEY (grievance_id) REFERENCES grievance(grievance_id) ON DELETE CASCADE,
  INDEX ix_nt_user (recipient_id, status, created_at)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------ auditing
CREATE TABLE audit_log (
  audit_id       BIGINT AUTO_INCREMENT PRIMARY KEY,
  actor_user_id  BIGINT NULL,
  entity_type    VARCHAR(40) NOT NULL,                  -- GRIEVANCE, CATEGORY, SLA_RULE
  entity_id      VARCHAR(40) NOT NULL,
  action         VARCHAR(40) NOT NULL,                  -- CREATE, UPDATE, VIEW, EXPORT
  detail         VARCHAR(500) NULL,
  old_value      JSON NULL,
  new_value      JSON NULL,
  ip_address     VARBINARY(16) NULL,
  user_agent     VARCHAR(255) NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_al_u FOREIGN KEY (actor_user_id) REFERENCES app_user(user_id),
  INDEX ix_al_entity (entity_type, entity_id, created_at),
  INDEX ix_al_actor (actor_user_id, created_at)
) ENGINE=InnoDB;

-- Access to a confidential case is itself an auditable event.
CREATE TABLE confidential_access_log (
  access_id      BIGINT AUTO_INCREMENT PRIMARY KEY,
  grievance_id   BIGINT NOT NULL,
  user_id        BIGINT NOT NULL,
  was_granted    TINYINT(1) NOT NULL,
  reason         VARCHAR(200) NULL,
  accessed_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cal_g FOREIGN KEY (grievance_id) REFERENCES grievance(grievance_id) ON DELETE CASCADE,
  CONSTRAINT fk_cal_u FOREIGN KEY (user_id) REFERENCES app_user(user_id),
  INDEX ix_cal (grievance_id, accessed_at)
) ENGINE=InnoDB;

-- --------------------------------------------------------------- convenience
CREATE OR REPLACE VIEW v_open_grievance AS
SELECT g.grievance_id, g.reference_no, d.code AS dept, c.name AS category, g.priority,
       g.status, g.current_level, u.full_name AS holder, g.submitted_at, g.due_at,
       (g.due_at < NOW()) AS is_overdue
FROM grievance g
JOIN department d ON d.dept_id = g.dept_id
JOIN grievance_category c ON c.category_id = g.category_id
LEFT JOIN app_user u ON u.user_id = g.assigned_to
WHERE g.status NOT IN ('CLOSED');

CREATE OR REPLACE VIEW v_sla_compliance AS
SELECT d.code AS dept, c.name AS category,
       COUNT(*) AS resolved_cases,
       SUM(r.within_sla) AS within_sla,
       ROUND(100 * SUM(r.within_sla) / COUNT(*), 1) AS compliance_pct,
       ROUND(AVG(TIMESTAMPDIFF(DAY, g.submitted_at, r.resolved_at)), 1) AS avg_days
FROM resolution r
JOIN grievance g ON g.grievance_id = r.grievance_id
JOIN department d ON d.dept_id = g.dept_id
JOIN grievance_category c ON c.category_id = g.category_id
GROUP BY d.code, c.name;
