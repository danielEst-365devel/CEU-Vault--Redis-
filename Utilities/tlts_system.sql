-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 11, 2024 at 02:20 PM
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
(1, 'magbitang@ceu.edu.ph', 'Michael Lino Magbitang', '$2a$10$YXCyvSxs5h9UBXxJSWG15.FnNIauoNYBPJYmR2qPL53wUx./.k2cO', '2024-10-21 02:32:53');

-- --------------------------------------------------------

--
-- Table structure for table `admin_log`
--

CREATE TABLE `admin_log` (
  `log_id` int(11) NOT NULL,
  `request_id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `first_name` varchar(255) NOT NULL,
  `last_name` varchar(255) NOT NULL,
  `department` varchar(255) DEFAULT NULL,
  `nature_of_service` text NOT NULL,
  `purpose` text NOT NULL,
  `venue` varchar(255) DEFAULT NULL,
  `equipment_category_id` int(11) DEFAULT NULL,
  `quantity_requested` int(11) NOT NULL,
  `requested` date DEFAULT NULL,
  `time_requested` time DEFAULT NULL,
  `return_time` time DEFAULT NULL,
  `time_borrowed` time DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `status` enum('pending','approved','ongoing','cancelled','returned') NOT NULL,
  `status_updated_at` timestamp NULL DEFAULT NULL,
  `admin_id` int(11) NOT NULL,
  `batch_id` int(11) NOT NULL,
  `request_approved_by` varchar(255) NOT NULL,
  `mcl_pass_no` varchar(255) DEFAULT NULL,
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
(1, 'DLP-LCD Projector', 100),
(2, 'Laptop', 100),
(3, 'Overhead Projector', 100),
(4, 'VHS Player', 100),
(5, 'Sound System', 100),
(6, 'DVD Player', 100),
(7, 'VCD Player', 100),
(8, 'CD Cassette Player', 100),
(9, 'Karaoke', 100),
(10, 'Microphone', 100),
(11, 'Document Camera', 100),
(12, 'Digital Video Camera', 100),
(13, 'Digital Still Camera', 100),
(14, 'Audio Voltage Regulator', 100),
(15, 'Amplifier', 100),
(16, 'Audio Mixer', 100),
(17, 'Stereo Graphic Equalizer', 100),
(18, 'Globe Map', 100),
(19, 'Television Set', 100),
(20, 'Tripod', 100),
(21, 'Microphone Stand', 100),
(22, 'Wireless Microphone', 100),
(23, 'Lapel Microphone', 100),
(24, 'Radio Cassette', 100),
(25, 'Projector Screen', 100),
(26, 'External Hard Drive', 100);

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
  `status` enum('pending','approved','ongoing','cancelled','returned') DEFAULT 'pending',
  `status_updated_at` timestamp NULL DEFAULT NULL,
  `admin_id` int(11) DEFAULT NULL,
  `batch_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `request_history`
--

CREATE TABLE `request_history` (
  `batch_id` int(11) NOT NULL,
  `requisitioner_form_receipt` blob NOT NULL,
  `approved_requests_receipt` blob DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
  ADD UNIQUE KEY `request_id` (`request_id`),
  ADD KEY `equipment_category_id` (`equipment_category_id`),
  ADD KEY `admin_log_ibfk_3` (`batch_id`);

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
  ADD KEY `admin_id` (`admin_id`),
  ADD KEY `history_id` (`batch_id`);

--
-- Indexes for table `request_history`
--
ALTER TABLE `request_history`
  ADD PRIMARY KEY (`batch_id`);

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
  MODIFY `category_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `requests`
--
ALTER TABLE `requests`
  MODIFY `request_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `request_history`
--
ALTER TABLE `request_history`
  MODIFY `batch_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `admin_log`
--
ALTER TABLE `admin_log`
  ADD CONSTRAINT `admin_log_ibfk_2` FOREIGN KEY (`equipment_category_id`) REFERENCES `equipment_categories` (`category_id`),
  ADD CONSTRAINT `admin_log_ibfk_3` FOREIGN KEY (`batch_id`) REFERENCES `request_history` (`batch_id`);

--
-- Constraints for table `requests`
--
ALTER TABLE `requests`
  ADD CONSTRAINT `requests_ibfk_1` FOREIGN KEY (`equipment_category_id`) REFERENCES `equipment_categories` (`category_id`),
  ADD CONSTRAINT `requests_ibfk_2` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`admin_id`),
  ADD CONSTRAINT `requests_ibfk_3` FOREIGN KEY (`batch_id`) REFERENCES `request_history` (`batch_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
