-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 19, 2024 at 06:10 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `tlts_system`
--

-- --------------------------------------------------------

--
-- Table structure for table `admins`
--

CREATE TABLE `admins` (
  `admin_id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admins`
--

INSERT INTO `admins` (`admin_id`, `email`, `name`, `password_hash`, `created_at`) VALUES
(1, 'magbitang@ceu.edu.ph', 'Michael Lino Magbitang', 'tltsGodz123', '2024-10-13 11:22:34');

-- --------------------------------------------------------

--
-- Table structure for table `admin_log`
--

CREATE TABLE `admin_log` (
  `log_id` int(11) NOT NULL,
  `request_id` int(11) NOT NULL,
  `requested` date DEFAULT NULL,
  `equipment_category_id` int(11) DEFAULT NULL,
  `quantity_requested` int(11) NOT NULL,
  `venue` varchar(255) DEFAULT NULL,
  `time_requested` time DEFAULT NULL,
  `first_name` varchar(255) NOT NULL,
  `last_name` varchar(255) NOT NULL,
  `department` varchar(255) DEFAULT NULL,
  `request_approved_by` varchar(255) NOT NULL,
  `mcl_pass_no` varchar(255) DEFAULT NULL,
  `time_borrowed` time DEFAULT NULL,
  `released_by` varchar(255) DEFAULT NULL,
  `time_returned` time DEFAULT NULL,
  `received_by` varchar(255) DEFAULT NULL,
  `remarks` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `equipment_categories`
--

CREATE TABLE `equipment_categories` (
  `category_id` int(11) NOT NULL,
  `category_name` varchar(255) NOT NULL,
  `quantity_available` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `equipment_categories`
--

INSERT INTO `equipment_categories` (`category_id`, `category_name`, `quantity_available`) VALUES
(1, 'DLP-LCD Projector', 10),
(2, 'Laptop', 15),
(3, 'Overhead Projector', 5),
(4, 'VHS Player', 3),
(5, 'Sound System', 7),
(6, 'DVD Player', 8),
(7, 'VCD Player', 4),
(8, 'CD Cassette Player', 6),
(9, 'Karaoke', 2),
(10, 'Microphone', 20),
(11, 'Document Camera', 4),
(12, 'Digital Video Camera', 5),
(13, 'Digital Still Camera', 6),
(14, 'Instructional Materials', 10),
(15, 'Others', 5);

-- --------------------------------------------------------

--
-- Table structure for table `requests`
--

CREATE TABLE `requests` (
  `request_id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `first_name` varchar(255) NOT NULL,
  `last_name` varchar(255) NOT NULL,
  `department` varchar(255) DEFAULT NULL,
  `nature_of_service` text DEFAULT NULL,
  `purpose` text DEFAULT NULL,
  `venue` varchar(255) DEFAULT NULL,
  `equipment_category_id` int(11) DEFAULT NULL,
  `quantity_requested` int(11) NOT NULL,
  `requested` date DEFAULT NULL,
  `time_requested` time DEFAULT NULL,
  `return_time` time DEFAULT NULL,
  `time_borrowed` timestamp NOT NULL DEFAULT current_timestamp(),
  `approved_at` timestamp NULL DEFAULT NULL,
  `status` enum('pending','approved','rejected','returned') DEFAULT 'pending',
  `admin_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `requests`
--

INSERT INTO `requests` (`request_id`, `email`, `first_name`, `last_name`, `department`, `nature_of_service`, `purpose`, `venue`, `equipment_category_id`, `quantity_requested`, `requested`, `time_requested`, `return_time`, `time_borrowed`, `approved_at`, `status`, `admin_id`) VALUES
(157, 'estrella2130511@mls.ceu.edu.ph', 'Daniel', 'Estrella', 'CAMT', 'Academic', 'Presentation', '303', 1, 0, '2024-10-19', '11:20:00', NULL, '2024-10-19 03:21:19', NULL, 'pending', NULL),
(158, 'estrella2130511@mls.ceu.edu.ph', 'John', 'Doe', 'IT', 'Technical Support', 'Setting up new computers', 'Room 101', 2, 5, '2023-10-01', '09:00:00', NULL, '2024-10-19 03:22:36', NULL, 'pending', NULL),
(159, 'estrella2130511@mls.ceu.edu.ph', 'John', 'Doe', 'IT', 'Technical Support', 'Setting up new computers', 'Room 101', 1, 2, '2023-10-01', '09:00:00', NULL, '2024-10-19 03:22:36', NULL, 'pending', NULL),
(160, 'estrella2130511@mls.ceu.edu.ph', 'John', 'Doe', 'IT', 'Technical Support', 'Setting up new computers', 'Room 101', 2, 5, '2023-10-01', '09:00:00', '10:00:00', '2024-10-19 04:03:31', NULL, 'pending', NULL),
(161, 'estrella2130511@mls.ceu.edu.ph', 'John', 'Doe', 'IT', 'Technical Support', 'Setting up new computers', 'Room 101', 1, 2, '2023-10-01', '09:00:00', '10:00:00', '2024-10-19 04:03:31', NULL, 'pending', NULL),
(162, 'estrella2130511@mls.ceu.edu.ph', 'Daniel', 'Estrella', 'CAMT', 'Academic', 'Presentation', '303', 1, 1, '2024-10-02', '12:04:00', '12:06:00', '2024-10-19 04:05:18', NULL, 'pending', NULL),
(163, 'estrella2130511@mls.ceu.edu.ph', 'Daniel', 'Estrella', 'CAMT', 'Academic', 'Presentation', '303', 3, 1, '2024-10-19', '15:05:00', '12:07:00', '2024-10-19 04:05:18', NULL, 'pending', NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admins`
--
ALTER TABLE `admins`
  ADD PRIMARY KEY (`admin_id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `admin_log`
--
ALTER TABLE `admin_log`
  ADD PRIMARY KEY (`log_id`),
  ADD KEY `request_id` (`request_id`),
  ADD KEY `equipment_category_id` (`equipment_category_id`);

--
-- Indexes for table `equipment_categories`
--
ALTER TABLE `equipment_categories`
  ADD PRIMARY KEY (`category_id`);

--
-- Indexes for table `requests`
--
ALTER TABLE `requests`
  ADD PRIMARY KEY (`request_id`),
  ADD KEY `equipment_category_id` (`equipment_category_id`),
  ADD KEY `admin_id` (`admin_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admins`
--
ALTER TABLE `admins`
  MODIFY `admin_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `admin_log`
--
ALTER TABLE `admin_log`
  MODIFY `log_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `equipment_categories`
--
ALTER TABLE `equipment_categories`
  MODIFY `category_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `requests`
--
ALTER TABLE `requests`
  MODIFY `request_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=164;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `admin_log`
--
ALTER TABLE `admin_log`
  ADD CONSTRAINT `admin_log_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `requests` (`request_id`),
  ADD CONSTRAINT `admin_log_ibfk_2` FOREIGN KEY (`equipment_category_id`) REFERENCES `equipment_categories` (`category_id`);

--
-- Constraints for table `requests`
--
ALTER TABLE `requests`
  ADD CONSTRAINT `requests_ibfk_1` FOREIGN KEY (`equipment_category_id`) REFERENCES `equipment_categories` (`category_id`),
  ADD CONSTRAINT `requests_ibfk_2` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`admin_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
