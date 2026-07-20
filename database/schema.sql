-- MySQL dump 10.13  Distrib 8.0.46, for Linux (x86_64)
--
-- Host: localhost    Database: db_myacademia
-- ------------------------------------------------------
-- Server version	8.0.46-0ubuntu0.22.04.3

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `academic_years`
--

DROP TABLE IF EXISTS `academic_years`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `academic_years` (
  `academic_year_id` int unsigned NOT NULL AUTO_INCREMENT,
  `year_label` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  PRIMARY KEY (`academic_year_id`),
  UNIQUE KEY `uq_year_label` (`year_label`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `academic_years`
--

LOCK TABLES `academic_years` WRITE;
/*!40000 ALTER TABLE `academic_years` DISABLE KEYS */;
INSERT INTO `academic_years` VALUES (1,'2022/2023',NULL,NULL),(2,'2025/2026',NULL,NULL);
/*!40000 ALTER TABLE `academic_years` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `accreditation_bodies`
--

DROP TABLE IF EXISTS `accreditation_bodies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `accreditation_bodies` (
  `accreditation_body_id` int unsigned NOT NULL AUTO_INCREMENT,
  `body_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`accreditation_body_id`),
  UNIQUE KEY `uq_body_name` (`body_name`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `accreditation_bodies`
--

LOCK TABLES `accreditation_bodies` WRITE;
/*!40000 ALTER TABLE `accreditation_bodies` DISABLE KEYS */;
INSERT INTO `accreditation_bodies` VALUES (3,'RP Kigali College'),(1,'RP Kigali College and BIWE'),(2,'RP Kigali College and MIGEPROF'),(4,'RP-KIGALI College');
/*!40000 ALTER TABLE `accreditation_bodies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `approvals`
--

DROP TABLE IF EXISTS `approvals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `approvals` (
  `approval_id` int unsigned NOT NULL AUTO_INCREMENT,
  `entity_type` enum('short_course','project') COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_id` int unsigned NOT NULL,
  `requested_by` int unsigned NOT NULL,
  `role_required` int unsigned NOT NULL,
  `reviewer_id` int unsigned DEFAULT NULL,
  `decision` enum('Pending','Approved','Rejected','Returned') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Pending',
  `comments` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `decision_date` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`approval_id`),
  KEY `fk_approval_requested_by` (`requested_by`),
  KEY `fk_approval_role` (`role_required`),
  KEY `fk_approval_reviewer` (`reviewer_id`),
  KEY `idx_approval_entity` (`entity_type`,`entity_id`),
  KEY `idx_approval_decision` (`decision`),
  CONSTRAINT `fk_approval_requested_by` FOREIGN KEY (`requested_by`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_approval_reviewer` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_approval_role` FOREIGN KEY (`role_required`) REFERENCES `roles` (`role_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `approvals`
--

LOCK TABLES `approvals` WRITE;
/*!40000 ALTER TABLE `approvals` DISABLE KEYS */;
/*!40000 ALTER TABLE `approvals` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_log`
--

DROP TABLE IF EXISTS `audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_log` (
  `log_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned DEFAULT NULL,
  `table_name` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `record_id` int unsigned NOT NULL,
  `action` enum('INSERT','UPDATE','DELETE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `action_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  KEY `fk_audit_user` (`user_id`),
  KEY `idx_audit_table_record` (`table_name`,`record_id`),
  CONSTRAINT `fk_audit_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_log`
--

LOCK TABLES `audit_log` WRITE;
/*!40000 ALTER TABLE `audit_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `audit_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `beneficiary_types`
--

DROP TABLE IF EXISTS `beneficiary_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `beneficiary_types` (
  `beneficiary_type_id` int unsigned NOT NULL AUTO_INCREMENT,
  `type_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`beneficiary_type_id`),
  UNIQUE KEY `uq_beneficiary_type` (`type_name`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `beneficiary_types`
--

LOCK TABLES `beneficiary_types` WRITE;
/*!40000 ALTER TABLE `beneficiary_types` DISABLE KEYS */;
INSERT INTO `beneficiary_types` VALUES (2,'Girls and Young Women'),(3,'Public'),(1,'Students / Staff');
/*!40000 ALTER TABLE `beneficiary_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `certification_types`
--

DROP TABLE IF EXISTS `certification_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `certification_types` (
  `certification_id` int unsigned NOT NULL AUTO_INCREMENT,
  `certification_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`certification_id`),
  UNIQUE KEY `uq_certification_name` (`certification_name`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `certification_types`
--

LOCK TABLES `certification_types` WRITE;
/*!40000 ALTER TABLE `certification_types` DISABLE KEYS */;
INSERT INTO `certification_types` VALUES (2,'Certificate of Competence'),(1,'Certificate of Completion');
/*!40000 ALTER TABLE `certification_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `course_categories`
--

DROP TABLE IF EXISTS `course_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `course_categories` (
  `category_id` int unsigned NOT NULL AUTO_INCREMENT,
  `category_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `uq_category_name` (`category_name`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `course_categories`
--

LOCK TABLES `course_categories` WRITE;
/*!40000 ALTER TABLE `course_categories` DISABLE KEYS */;
INSERT INTO `course_categories` VALUES (3,'Air Condition'),(1,'Automobile'),(6,'IT'),(4,'Manufacturing'),(2,'Mining Technology'),(5,'Plumbing Technology');
/*!40000 ALTER TABLE `course_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `delivery_modes`
--

DROP TABLE IF EXISTS `delivery_modes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `delivery_modes` (
  `delivery_mode_id` int unsigned NOT NULL AUTO_INCREMENT,
  `mode_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`delivery_mode_id`),
  UNIQUE KEY `uq_mode_name` (`mode_name`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `delivery_modes`
--

LOCK TABLES `delivery_modes` WRITE;
/*!40000 ALTER TABLE `delivery_modes` DISABLE KEYS */;
INSERT INTO `delivery_modes` VALUES (3,'Hybrid'),(1,'In-Person'),(2,'Online');
/*!40000 ALTER TABLE `delivery_modes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `departments`
--

DROP TABLE IF EXISTS `departments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `departments` (
  `department_id` int unsigned NOT NULL AUTO_INCREMENT,
  `department_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `department_code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`department_id`),
  UNIQUE KEY `uq_department_name` (`department_name`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `departments`
--

LOCK TABLES `departments` WRITE;
/*!40000 ALTER TABLE `departments` DISABLE KEYS */;
INSERT INTO `departments` VALUES (1,'Automobile Technology',NULL,1,'2026-07-16 12:55:09'),(2,'Mining Engineering',NULL,1,'2026-07-16 12:55:09'),(3,'Mechanical Engineering',NULL,1,'2026-07-16 12:55:09'),(4,'Civil Engineering',NULL,1,'2026-07-16 12:55:09'),(5,'ICT',NULL,1,'2026-07-16 12:55:09'),(6,'Transport and Logistics Department',NULL,1,'2026-07-16 12:55:09'),(7,'EEE',NULL,1,'2026-07-16 12:55:09'),(8,'Creative Art',NULL,1,'2026-07-16 12:55:09');
/*!40000 ALTER TABLE `departments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `donors`
--

DROP TABLE IF EXISTS `donors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `donors` (
  `donor_id` int unsigned NOT NULL AUTO_INCREMENT,
  `donor_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`donor_id`),
  UNIQUE KEY `uq_donor_name` (`donor_name`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `donors`
--

LOCK TABLES `donors` WRITE;
/*!40000 ALTER TABLE `donors` DISABLE KEYS */;
INSERT INTO `donors` VALUES (1,'ERASMUS'),(3,'ILO'),(2,'MIGEPROF');
/*!40000 ALTER TABLE `donors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `funding_types`
--

DROP TABLE IF EXISTS `funding_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `funding_types` (
  `funding_type_id` int unsigned NOT NULL AUTO_INCREMENT,
  `type_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`funding_type_id`),
  UNIQUE KEY `uq_funding_type` (`type_name`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `funding_types`
--

LOCK TABLES `funding_types` WRITE;
/*!40000 ALTER TABLE `funding_types` DISABLE KEYS */;
INSERT INTO `funding_types` VALUES (1,'Grant'),(3,'Loan'),(2,'MoU');
/*!40000 ALTER TABLE `funding_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `partner_organisations`
--

DROP TABLE IF EXISTS `partner_organisations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `partner_organisations` (
  `partner_id` int unsigned NOT NULL AUTO_INCREMENT,
  `partner_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`partner_id`),
  UNIQUE KEY `uq_partner_name` (`partner_name`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `partner_organisations`
--

LOCK TABLES `partner_organisations` WRITE;
/*!40000 ALTER TABLE `partner_organisations` DISABLE KEYS */;
INSERT INTO `partner_organisations` VALUES (1,'EAUR'),(5,'ICT Chamber'),(4,'MIGEPROGR'),(3,'MWSLiT'),(2,'UNIZA');
/*!40000 ALTER TABLE `partner_organisations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_resets`
--

DROP TABLE IF EXISTS `password_resets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_resets` (
  `reset_id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `token_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime NOT NULL,
  `used` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`reset_id`),
  KEY `idx_reset_token` (`token_hash`),
  KEY `idx_reset_user` (`user_id`),
  CONSTRAINT `fk_reset_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_resets`
--

LOCK TABLES `password_resets` WRITE;
/*!40000 ALTER TABLE `password_resets` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_resets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `project_departments`
--

DROP TABLE IF EXISTS `project_departments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_departments` (
  `project_id` int unsigned NOT NULL,
  `department_id` int unsigned NOT NULL,
  PRIMARY KEY (`project_id`,`department_id`),
  KEY `fk_pd_department` (`department_id`),
  CONSTRAINT `fk_pd_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_pd_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`project_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project_departments`
--

LOCK TABLES `project_departments` WRITE;
/*!40000 ALTER TABLE `project_departments` DISABLE KEYS */;
INSERT INTO `project_departments` VALUES (2,2),(3,3),(3,4),(3,5),(1,6),(3,7),(3,8);
/*!40000 ALTER TABLE `project_departments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `project_partners`
--

DROP TABLE IF EXISTS `project_partners`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_partners` (
  `project_id` int unsigned NOT NULL,
  `partner_id` int unsigned NOT NULL,
  PRIMARY KEY (`project_id`,`partner_id`),
  KEY `fk_pp_partner` (`partner_id`),
  CONSTRAINT `fk_pp_partner` FOREIGN KEY (`partner_id`) REFERENCES `partner_organisations` (`partner_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_pp_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`project_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project_partners`
--

LOCK TABLES `project_partners` WRITE;
/*!40000 ALTER TABLE `project_partners` DISABLE KEYS */;
INSERT INTO `project_partners` VALUES (1,1),(1,2),(1,3),(2,4),(3,5);
/*!40000 ALTER TABLE `project_partners` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `projects`
--

DROP TABLE IF EXISTS `projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `projects` (
  `project_id` int unsigned NOT NULL AUTO_INCREMENT,
  `sn` int unsigned DEFAULT NULL,
  `project_title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `donor_id` int unsigned DEFAULT NULL,
  `funding_type_id` int unsigned DEFAULT NULL,
  `sector_id` int unsigned DEFAULT NULL,
  `project_coordinator_id` int unsigned DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `duration_months` smallint unsigned GENERATED ALWAYS AS (timestampdiff(MONTH,`start_date`,`end_date`)) STORED,
  `total_budget_usd` decimal(16,2) DEFAULT NULL,
  `total_budget_rwf` decimal(18,2) DEFAULT NULL,
  `college_contribution_rwf` decimal(18,2) NOT NULL DEFAULT '0.00',
  `donor_contribution_usd` decimal(16,2) NOT NULL DEFAULT '0.00',
  `geographic_scope` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `beneficiary_type_id` int unsigned DEFAULT NULL,
  `no_direct_beneficiaries` int unsigned DEFAULT NULL,
  `key_performance_indicator` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `achievement_rate_pct` decimal(5,2) DEFAULT NULL,
  `remarks` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `overall_status` enum('Pipeline','Active','Completed','Suspended','Cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Pipeline',
  `academic_year_id` int unsigned DEFAULT NULL,
  `created_by` int unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`project_id`),
  KEY `fk_project_funding_type` (`funding_type_id`),
  KEY `fk_project_sector` (`sector_id`),
  KEY `fk_project_coordinator` (`project_coordinator_id`),
  KEY `fk_project_beneficiary_type` (`beneficiary_type_id`),
  KEY `fk_project_created_by` (`created_by`),
  KEY `idx_project_status` (`overall_status`),
  KEY `idx_project_donor` (`donor_id`),
  KEY `idx_project_year` (`academic_year_id`),
  CONSTRAINT `fk_project_academic_year` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`academic_year_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_project_beneficiary_type` FOREIGN KEY (`beneficiary_type_id`) REFERENCES `beneficiary_types` (`beneficiary_type_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_project_coordinator` FOREIGN KEY (`project_coordinator_id`) REFERENCES `staff` (`staff_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_project_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_project_donor` FOREIGN KEY (`donor_id`) REFERENCES `donors` (`donor_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_project_funding_type` FOREIGN KEY (`funding_type_id`) REFERENCES `funding_types` (`funding_type_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_project_sector` FOREIGN KEY (`sector_id`) REFERENCES `sectors` (`sector_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_project_dates` CHECK (((`end_date` is null) or (`start_date` is null) or (`end_date` >= `start_date`)))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `projects`
--

LOCK TABLES `projects` WRITE;
/*!40000 ALTER TABLE `projects` DISABLE KEYS */;
INSERT INTO `projects` (`project_id`, `sn`, `project_title`, `donor_id`, `funding_type_id`, `sector_id`, `project_coordinator_id`, `start_date`, `end_date`, `total_budget_usd`, `total_budget_rwf`, `college_contribution_rwf`, `donor_contribution_usd`, `geographic_scope`, `beneficiary_type_id`, `no_direct_beneficiaries`, `key_performance_indicator`, `achievement_rate_pct`, `remarks`, `overall_status`, `academic_year_id`, `created_by`, `created_at`, `updated_at`) VALUES (1,1,'DIGILOG',1,1,1,6,'2026-01-01','2028-12-31',94155.00,161436279.90,0.00,94155.00,'RP Kigali Campus',1,NULL,'Lab capacity (Digital logistics lab)',NULL,NULL,'Pipeline',2,NULL,'2026-07-16 12:55:09','2026-07-16 12:55:09'),(2,2,'Supporting Girls and Young Women to Acquire Skills and Knowledge in the Mining Sector',2,2,2,7,'2025-08-01','2026-06-30',99524.40,105505120.00,0.00,99524.40,'RP Kigali Campus',2,90,'Training completion rate',64.00,'Well progressing','Active',2,NULL,'2026-07-16 12:55:09','2026-07-16 12:55:09'),(3,3,'Kigali Smart Skills Hub for Youth Employment in Digital Transformation Economy',3,1,3,8,'2026-03-01','2026-12-31',50000.00,75000000.00,22000000.00,50000.00,'RP Kigali Campus',3,540,'Trainees\' employment',NULL,'It is progressing','Active',2,NULL,'2026-07-16 12:55:09','2026-07-16 12:55:09');
/*!40000 ALTER TABLE `projects` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `role_id` int unsigned NOT NULL AUTO_INCREMENT,
  `role_name` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `uq_role_name` (`role_name`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'Principal','Overall head of college. Final sign-off on courses and projects; full read access to all registries.'),(2,'Director of Planning','Owns institutional planning, budgets and KPI tracking; approves budget/KPI fields and views cross-department reports.'),(3,'HoD','Head of Department. Creates/edits short courses and projects for their own department only; submits for approval.'),(4,'CDSM','Career Development & Skills Management office. Coordinates short-course delivery and donor/partner project data entry and validation across departments.'),(5,'Coordinator','Course or Project Coordinator. Can enter/update records they are assigned to as coordinator.'),(6,'Administrator','System administrator. Manages users, roles and lookup/reference data.');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sectors`
--

DROP TABLE IF EXISTS `sectors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sectors` (
  `sector_id` int unsigned NOT NULL AUTO_INCREMENT,
  `sector_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`sector_id`),
  UNIQUE KEY `uq_sector_name` (`sector_name`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sectors`
--

LOCK TABLES `sectors` WRITE;
/*!40000 ALTER TABLE `sectors` DISABLE KEYS */;
INSERT INTO `sectors` VALUES (3,'ICT'),(2,'Mining Sector'),(1,'Transport and Logistics');
/*!40000 ALTER TABLE `sectors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `short_courses`
--

DROP TABLE IF EXISTS `short_courses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `short_courses` (
  `course_id` int unsigned NOT NULL AUTO_INCREMENT,
  `sn` int unsigned DEFAULT NULL,
  `course_title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `department_id` int unsigned NOT NULL,
  `category_id` int unsigned DEFAULT NULL,
  `duration_days` smallint unsigned DEFAULT NULL,
  `duration_hours` smallint unsigned DEFAULT NULL,
  `level` enum('Beginner','Intermediate','Advanced') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Intermediate',
  `delivery_mode_id` int unsigned DEFAULT NULL,
  `language` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_audience` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `prerequisites` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `coordinator_id` int unsigned DEFAULT NULL,
  `certification_id` int unsigned DEFAULT NULL,
  `accreditation_body_id` int unsigned DEFAULT NULL,
  `participants_female` smallint unsigned NOT NULL DEFAULT '0',
  `participants_male` smallint unsigned NOT NULL DEFAULT '0',
  `total_participants` smallint unsigned GENERATED ALWAYS AS ((`participants_female` + `participants_male`)) STORED,
  `total_certified` smallint unsigned NOT NULL DEFAULT '0',
  `fee_per_participant` decimal(14,2) NOT NULL DEFAULT '0.00',
  `expected_revenue` decimal(16,2) GENERATED ALWAYS AS (((`participants_female` + `participants_male`) * `fee_per_participant`)) STORED,
  `status` enum('Planning','Active','Completed','Cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Planning',
  `academic_year_id` int unsigned DEFAULT NULL,
  `created_by` int unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`course_id`),
  KEY `fk_course_category` (`category_id`),
  KEY `fk_course_delivery_mode` (`delivery_mode_id`),
  KEY `fk_course_coordinator` (`coordinator_id`),
  KEY `fk_course_certification` (`certification_id`),
  KEY `fk_course_accreditation` (`accreditation_body_id`),
  KEY `fk_course_created_by` (`created_by`),
  KEY `idx_course_department` (`department_id`),
  KEY `idx_course_status` (`status`),
  KEY `idx_course_year` (`academic_year_id`),
  CONSTRAINT `fk_course_academic_year` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`academic_year_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_course_accreditation` FOREIGN KEY (`accreditation_body_id`) REFERENCES `accreditation_bodies` (`accreditation_body_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_course_category` FOREIGN KEY (`category_id`) REFERENCES `course_categories` (`category_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_course_certification` FOREIGN KEY (`certification_id`) REFERENCES `certification_types` (`certification_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_course_coordinator` FOREIGN KEY (`coordinator_id`) REFERENCES `staff` (`staff_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_course_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_course_delivery_mode` FOREIGN KEY (`delivery_mode_id`) REFERENCES `delivery_modes` (`delivery_mode_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_course_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_course_certified_le_total` CHECK ((`total_certified` <= `total_participants`))
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `short_courses`
--

LOCK TABLES `short_courses` WRITE;
/*!40000 ALTER TABLE `short_courses` DISABLE KEYS */;
INSERT INTO `short_courses` (`course_id`, `sn`, `course_title`, `department_id`, `category_id`, `duration_days`, `duration_hours`, `level`, `delivery_mode_id`, `language`, `target_audience`, `prerequisites`, `coordinator_id`, `certification_id`, `accreditation_body_id`, `participants_female`, `participants_male`, `total_certified`, `fee_per_participant`, `status`, `academic_year_id`, `created_by`, `created_at`, `updated_at`) VALUES (1,1,'Dual Training in Automotive Technology',1,1,240,1680,'Intermediate',1,'English','Entrepreneurs, Youth',NULL,1,1,1,3,25,25,0.00,'Completed',1,NULL,'2026-07-16 12:55:09','2026-07-16 12:55:09'),(2,2,'Mining Skills',2,2,60,290,'Intermediate',1,'English/Kinyarwanda','Young Woman and Girls',NULL,2,1,2,30,0,30,300000.00,'Completed',1,NULL,'2026-07-16 12:55:09','2026-07-16 12:55:09'),(3,3,'Air Conditioning and Refrigeration',3,3,80,640,'Intermediate',1,'English/Kinyarwanda','Youth',NULL,3,1,3,4,16,20,0.00,'Completed',1,NULL,'2026-07-16 12:55:09','2026-07-16 12:55:09'),(4,4,'Industry Machinery',3,4,80,640,'Intermediate',1,'English/Kinyarwanda','Youth',NULL,3,1,3,3,22,25,0.00,'Completed',1,NULL,'2026-07-16 12:55:09','2026-07-16 12:55:09'),(5,5,'Short Course in Plumbing',4,5,180,720,'Intermediate',1,'English/Kinyarwanda','Youth',NULL,4,2,4,6,14,18,436500.00,'Completed',1,NULL,'2026-07-16 12:55:09','2026-07-16 12:55:09'),(6,6,'Short Course in ICT',5,6,80,640,'Intermediate',1,'English/Kinyarwanda','Youth',NULL,5,2,4,17,23,40,400000.00,'Completed',1,NULL,'2026-07-16 12:55:09','2026-07-16 12:55:09');
/*!40000 ALTER TABLE `short_courses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staff`
--

DROP TABLE IF EXISTS `staff`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `staff` (
  `staff_id` int unsigned NOT NULL AUTO_INCREMENT,
  `full_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `department_id` int unsigned DEFAULT NULL,
  `user_id` int unsigned DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`staff_id`),
  UNIQUE KEY `uq_staff_name_dept` (`full_name`,`department_id`),
  KEY `fk_staff_department` (`department_id`),
  KEY `fk_staff_user` (`user_id`),
  CONSTRAINT `fk_staff_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_staff_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff`
--

LOCK TABLES `staff` WRITE;
/*!40000 ALTER TABLE `staff` DISABLE KEYS */;
INSERT INTO `staff` VALUES (1,'Louis HABAGUSENGA',NULL,NULL,1,NULL,1),(2,'MUSIGWA Regis',NULL,NULL,2,NULL,1),(3,'HAKUZIMANA Joseph',NULL,NULL,3,NULL,1),(4,'Jean De Dieu IYAKARE',NULL,NULL,4,NULL,1),(5,'Donatien SABUSHIMIKE',NULL,NULL,5,NULL,1),(6,'Mr. Samuel Makuza',NULL,NULL,6,NULL,1),(7,'Dr. NDUKO Nyasetia Fred',NULL,NULL,2,NULL,1),(8,'MUNYANEZA Adolphe',NULL,NULL,5,NULL,1);
/*!40000 ALTER TABLE `staff` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `token_blacklist`
--

DROP TABLE IF EXISTS `token_blacklist`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `token_blacklist` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `jti` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_blacklist_jti` (`jti`),
  KEY `fk_blacklist_user` (`user_id`),
  KEY `idx_blacklist_expiry` (`expires_at`),
  CONSTRAINT `fk_blacklist_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `token_blacklist`
--

LOCK TABLES `token_blacklist` WRITE;
/*!40000 ALTER TABLE `token_blacklist` DISABLE KEYS */;
/*!40000 ALTER TABLE `token_blacklist` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int unsigned NOT NULL AUTO_INCREMENT,
  `full_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_id` int unsigned NOT NULL,
  `department_id` int unsigned DEFAULT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `last_login_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uq_user_email` (`email`),
  KEY `idx_users_role` (`role_id`),
  KEY `idx_users_department` (`department_id`),
  CONSTRAINT `fk_users_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Alice Ikuzwe','aikuzwe@rp.ac.rw','$2b$12$4PwJw1oCyAKxID/W2W3x2uBdJvZoL4WJZm/5bGmYtEKL5tzlOJtDW',1,NULL,NULL,1,NULL,'2026-07-16 12:55:09','2026-07-17 05:26:31'),(2,'Louis Habugusenga','planning@rp.ac.rw','$2b$12$4PwJw1oCyAKxID/W2W3x2uBdJvZoL4WJZm/5bGmYtEKL5tzlOJtDW',2,NULL,NULL,1,NULL,'2026-07-16 12:55:09','2026-07-17 05:26:31'),(3,'Jean Claude Ntiranta','hod.ict@rp.ac.rw','$2b$12$4PwJw1oCyAKxID/W2W3x2uBdJvZoL4WJZm/5bGmYtEKL5tzlOJtDW',3,5,NULL,1,NULL,'2026-07-16 12:55:09','2026-07-17 05:26:31'),(4,'Charles Gakomeye','cdsm@rp.ac.rw','$2b$12$4PwJw1oCyAKxID/W2W3x2uBdJvZoL4WJZm/5bGmYtEKL5tzlOJtDW',4,NULL,NULL,1,NULL,'2026-07-16 12:55:09','2026-07-17 05:26:31'),(5,'System Admin','admin@rp.ac.rw','$2b$12$4PwJw1oCyAKxID/W2W3x2uBdJvZoL4WJZm/5bGmYtEKL5tzlOJtDW',6,NULL,NULL,1,'2026-07-17 07:31:46','2026-07-16 12:55:09','2026-07-17 05:31:46');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `v_pending_approvals`
--

DROP TABLE IF EXISTS `v_pending_approvals`;
/*!50001 DROP VIEW IF EXISTS `v_pending_approvals`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_pending_approvals` AS SELECT 
 1 AS `approval_id`,
 1 AS `entity_type`,
 1 AS `entity_id`,
 1 AS `title`,
 1 AS `role_required`,
 1 AS `requested_by`,
 1 AS `created_at`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_projects_full`
--

DROP TABLE IF EXISTS `v_projects_full`;
/*!50001 DROP VIEW IF EXISTS `v_projects_full`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_projects_full` AS SELECT 
 1 AS `project_id`,
 1 AS `project_title`,
 1 AS `donor_name`,
 1 AS `funding_type`,
 1 AS `sector_name`,
 1 AS `coordinator_name`,
 1 AS `start_date`,
 1 AS `end_date`,
 1 AS `duration_months`,
 1 AS `total_budget_usd`,
 1 AS `total_budget_rwf`,
 1 AS `college_contribution_rwf`,
 1 AS `donor_contribution_usd`,
 1 AS `geographic_scope`,
 1 AS `beneficiary_type`,
 1 AS `no_direct_beneficiaries`,
 1 AS `key_performance_indicator`,
 1 AS `achievement_rate_pct`,
 1 AS `remarks`,
 1 AS `overall_status`,
 1 AS `academic_year`,
 1 AS `target_departments`,
 1 AS `partner_organisations`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_short_courses_full`
--

DROP TABLE IF EXISTS `v_short_courses_full`;
/*!50001 DROP VIEW IF EXISTS `v_short_courses_full`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_short_courses_full` AS SELECT 
 1 AS `course_id`,
 1 AS `course_title`,
 1 AS `department_name`,
 1 AS `category_name`,
 1 AS `duration_days`,
 1 AS `duration_hours`,
 1 AS `level`,
 1 AS `delivery_mode`,
 1 AS `language`,
 1 AS `target_audience`,
 1 AS `prerequisites`,
 1 AS `coordinator_name`,
 1 AS `certification_name`,
 1 AS `accreditation_body`,
 1 AS `participants_female`,
 1 AS `participants_male`,
 1 AS `total_participants`,
 1 AS `total_certified`,
 1 AS `fee_per_participant`,
 1 AS `expected_revenue`,
 1 AS `status`,
 1 AS `academic_year`*/;
SET character_set_client = @saved_cs_client;

--
-- Final view structure for view `v_pending_approvals`
--

/*!50001 DROP VIEW IF EXISTS `v_pending_approvals`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_pending_approvals` AS select `a`.`approval_id` AS `approval_id`,`a`.`entity_type` AS `entity_type`,`a`.`entity_id` AS `entity_id`,(case when (`a`.`entity_type` = 'short_course') then `sc`.`course_title` else `p`.`project_title` end) AS `title`,`r`.`role_name` AS `role_required`,`u`.`full_name` AS `requested_by`,`a`.`created_at` AS `created_at` from ((((`approvals` `a` join `roles` `r` on((`r`.`role_id` = `a`.`role_required`))) join `users` `u` on((`u`.`user_id` = `a`.`requested_by`))) left join `short_courses` `sc` on(((`a`.`entity_type` = 'short_course') and (`sc`.`course_id` = `a`.`entity_id`)))) left join `projects` `p` on(((`a`.`entity_type` = 'project') and (`p`.`project_id` = `a`.`entity_id`)))) where (`a`.`decision` = 'Pending') */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_projects_full`
--

/*!50001 DROP VIEW IF EXISTS `v_projects_full`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_projects_full` AS select `p`.`project_id` AS `project_id`,`p`.`project_title` AS `project_title`,any_value(`dn`.`donor_name`) AS `donor_name`,any_value(`ft`.`type_name`) AS `funding_type`,any_value(`sec`.`sector_name`) AS `sector_name`,any_value(`st`.`full_name`) AS `coordinator_name`,`p`.`start_date` AS `start_date`,`p`.`end_date` AS `end_date`,`p`.`duration_months` AS `duration_months`,`p`.`total_budget_usd` AS `total_budget_usd`,`p`.`total_budget_rwf` AS `total_budget_rwf`,`p`.`college_contribution_rwf` AS `college_contribution_rwf`,`p`.`donor_contribution_usd` AS `donor_contribution_usd`,`p`.`geographic_scope` AS `geographic_scope`,any_value(`bt`.`type_name`) AS `beneficiary_type`,`p`.`no_direct_beneficiaries` AS `no_direct_beneficiaries`,`p`.`key_performance_indicator` AS `key_performance_indicator`,`p`.`achievement_rate_pct` AS `achievement_rate_pct`,`p`.`remarks` AS `remarks`,`p`.`overall_status` AS `overall_status`,any_value(`ay`.`year_label`) AS `academic_year`,group_concat(distinct `dep`.`department_name` order by `dep`.`department_name` ASC separator ', ') AS `target_departments`,group_concat(distinct `po`.`partner_name` order by `po`.`partner_name` ASC separator ', ') AS `partner_organisations` from ((((((((((`projects` `p` left join `donors` `dn` on((`dn`.`donor_id` = `p`.`donor_id`))) left join `funding_types` `ft` on((`ft`.`funding_type_id` = `p`.`funding_type_id`))) left join `sectors` `sec` on((`sec`.`sector_id` = `p`.`sector_id`))) left join `staff` `st` on((`st`.`staff_id` = `p`.`project_coordinator_id`))) left join `beneficiary_types` `bt` on((`bt`.`beneficiary_type_id` = `p`.`beneficiary_type_id`))) left join `academic_years` `ay` on((`ay`.`academic_year_id` = `p`.`academic_year_id`))) left join `project_departments` `pdpt` on((`pdpt`.`project_id` = `p`.`project_id`))) left join `departments` `dep` on((`dep`.`department_id` = `pdpt`.`department_id`))) left join `project_partners` `ppar` on((`ppar`.`project_id` = `p`.`project_id`))) left join `partner_organisations` `po` on((`po`.`partner_id` = `ppar`.`partner_id`))) group by `p`.`project_id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_short_courses_full`
--

/*!50001 DROP VIEW IF EXISTS `v_short_courses_full`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_short_courses_full` AS select `sc`.`course_id` AS `course_id`,`sc`.`course_title` AS `course_title`,`d`.`department_name` AS `department_name`,`cc`.`category_name` AS `category_name`,`sc`.`duration_days` AS `duration_days`,`sc`.`duration_hours` AS `duration_hours`,`sc`.`level` AS `level`,`dm`.`mode_name` AS `delivery_mode`,`sc`.`language` AS `language`,`sc`.`target_audience` AS `target_audience`,`sc`.`prerequisites` AS `prerequisites`,`st`.`full_name` AS `coordinator_name`,`ct`.`certification_name` AS `certification_name`,`ab`.`body_name` AS `accreditation_body`,`sc`.`participants_female` AS `participants_female`,`sc`.`participants_male` AS `participants_male`,`sc`.`total_participants` AS `total_participants`,`sc`.`total_certified` AS `total_certified`,`sc`.`fee_per_participant` AS `fee_per_participant`,`sc`.`expected_revenue` AS `expected_revenue`,`sc`.`status` AS `status`,`ay`.`year_label` AS `academic_year` from (((((((`short_courses` `sc` left join `departments` `d` on((`d`.`department_id` = `sc`.`department_id`))) left join `course_categories` `cc` on((`cc`.`category_id` = `sc`.`category_id`))) left join `delivery_modes` `dm` on((`dm`.`delivery_mode_id` = `sc`.`delivery_mode_id`))) left join `staff` `st` on((`st`.`staff_id` = `sc`.`coordinator_id`))) left join `certification_types` `ct` on((`ct`.`certification_id` = `sc`.`certification_id`))) left join `accreditation_bodies` `ab` on((`ab`.`accreditation_body_id` = `sc`.`accreditation_body_id`))) left join `academic_years` `ay` on((`ay`.`academic_year_id` = `sc`.`academic_year_id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-19 18:01:40
