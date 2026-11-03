-- MySQL dump 10.13  Distrib 8.4.8, for Win64 (x86_64)
--
-- Host: localhost    Database: olx_marketplace
-- ------------------------------------------------------
-- Server version	8.4.8

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
-- Current Database: `olx_marketplace`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `olx_marketplace` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `olx_marketplace`;

--
-- Table structure for table `ad_attribute_values`
--

DROP TABLE IF EXISTS `ad_attribute_values`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ad_attribute_values` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ad_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `attribute_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ad_attribute_values_ad_id_attribute_id_key` (`ad_id`,`attribute_id`),
  KEY `ad_attribute_values_attribute_id_idx` (`attribute_id`),
  CONSTRAINT `ad_attribute_values_ad_id_fkey` FOREIGN KEY (`ad_id`) REFERENCES `ads` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ad_attribute_values_attribute_id_fkey` FOREIGN KEY (`attribute_id`) REFERENCES `category_attributes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ad_attribute_values`
--

LOCK TABLES `ad_attribute_values` WRITE;
/*!40000 ALTER TABLE `ad_attribute_values` DISABLE KEYS */;
INSERT INTO `ad_attribute_values` VALUES ('05b5771d-bc13-455d-b3e4-397c1866cba0','cb132c6b-d480-4677-9c0b-de1a169a4f78','77cef779-c296-4614-b40e-e0a41c082c4e','Maruti Suzuki','2026-10-29 06:25:13.419'),('0ba3ebf6-aa17-4361-8481-abfe5d0402b6','8e3f5b77-339b-42b1-9a9d-77e3f55496ed','77cef779-c296-4614-b40e-e0a41c082c4e','Maruti Suzuki','2026-10-29 06:13:08.091'),('1010cdde-2eb3-4e33-ac55-1eb4cfcca40a','a5b69256-6084-4f4a-9bdf-8a8b9e9f67f3','2fd6ef33-53df-4598-a1d0-3d8cba327f33','Petrol','2026-10-29 06:41:23.400'),('10c40bed-ad71-4490-a8b4-2b4ddc3f9b40','77e39586-b269-4edc-b930-ee77c4cccc12','2fd6ef33-53df-4598-a1d0-3d8cba327f33','Petrol','2026-10-29 06:42:04.011'),('1372cacd-4e38-4fdd-8733-f51be1f1676e','14546635-8b20-4971-bdf5-61a4a9277a4b','2fd6ef33-53df-4598-a1d0-3d8cba327f33','Petrol','2026-10-29 06:34:54.511'),('1377c645-6477-45ea-8e29-00faa5be5409','01885cc7-9775-4034-aaaf-725ab215c8e9','1295bbe6-1e8a-4a98-b132-d717d37d1ee6','5000','2026-10-29 06:34:54.747'),('18768101-94f9-45b6-b1a2-dfc5f5676ee4','d2f88000-730e-4f7a-90af-8dad2bb6c119','2fd6ef33-53df-4598-a1d0-3d8cba327f33','Petrol','2026-10-29 06:33:35.387'),('1d7ebb14-0c7c-49af-9921-3ae82c066769','5b02a7a8-497e-4163-b61e-7ddcf1fccd5d','2fd6ef33-53df-4598-a1d0-3d8cba327f33','Petrol','2026-10-29 06:41:23.251'),('2282d863-9e2c-4932-a69b-a650dca48da3','14546635-8b20-4971-bdf5-61a4a9277a4b','04fe396a-6c05-4f76-81c2-4c3131b5bfb4','2022','2026-10-29 06:34:54.516'),('2c07cc6c-029f-4b2c-882c-a573457e5bda','aa211ce6-3cc3-4f1f-bd62-7dd3ab5703df','67224047-ebfc-410f-a2ef-b85cb52970c6','Manual','2026-10-29 06:24:56.399'),('3249272e-e546-4c7b-9272-15991906d134','36b758f1-1ec8-447d-957d-c67343a0239b','1295bbe6-1e8a-4a98-b132-d717d37d1ee6','18000','2026-10-26 01:59:51.172'),('326bbb69-ff99-4e11-a76b-d52cd86cf129','77e39586-b269-4edc-b930-ee77c4cccc12','04fe396a-6c05-4f76-81c2-4c3131b5bfb4','2022','2026-10-29 06:42:04.013'),('36836dae-29b8-4fe2-aee7-9dd365c02f31','05e57cfa-95ac-4992-985f-440418e35b17','77cef779-c296-4614-b40e-e0a41c082c4e','Maruti Suzuki','2026-10-29 06:42:04.163'),('36ef292b-2140-4900-8d71-67d345a18d7b','14546635-8b20-4971-bdf5-61a4a9277a4b','77cef779-c296-4614-b40e-e0a41c082c4e','Maruti Suzuki','2026-10-29 06:34:54.509'),('39101423-82b5-46bb-8876-6bb30f03005d','31380c3c-9871-414f-84cc-804ed104c105','67224047-ebfc-410f-a2ef-b85cb52970c6','Manual','2026-10-29 06:24:34.728'),('3b8080a2-e192-4167-a90b-51885f396e54','5b02a7a8-497e-4163-b61e-7ddcf1fccd5d','1295bbe6-1e8a-4a98-b132-d717d37d1ee6','28000','2026-10-29 06:41:23.249'),('3cac1120-0996-468d-b2b8-d502ce260332','cb132c6b-d480-4677-9c0b-de1a169a4f78','2fd6ef33-53df-4598-a1d0-3d8cba327f33','Petrol','2026-10-29 06:25:13.421'),('44e6fca0-8bb7-47cc-bf0f-f505b5204558','36b758f1-1ec8-447d-957d-c67343a0239b','77cef779-c296-4614-b40e-e0a41c082c4e','Hyundai','2026-10-26 01:59:51.178'),('4a7192f6-d5a8-4ab1-a860-3445052f14ba','5b02a7a8-497e-4163-b61e-7ddcf1fccd5d','67224047-ebfc-410f-a2ef-b85cb52970c6','Manual','2026-10-29 06:41:23.252'),('4af1d378-2c20-431a-acd6-c881d1aa5a40','e96d71ac-f937-4748-87d8-cd75e589306b','67224047-ebfc-410f-a2ef-b85cb52970c6','Manual','2026-10-29 06:33:35.554'),('4c5ebfd4-76a8-4077-a8d6-ddd9877fb06c','31380c3c-9871-414f-84cc-804ed104c105','1295bbe6-1e8a-4a98-b132-d717d37d1ee6','28000','2026-10-29 06:24:34.700'),('4caf4be1-7f29-40ab-bb7f-f05aed9b548d','aa211ce6-3cc3-4f1f-bd62-7dd3ab5703df','04fe396a-6c05-4f76-81c2-4c3131b5bfb4','2022','2026-10-29 06:24:56.401'),('53621767-38ee-4575-86fd-dbf358f235dd','77e39586-b269-4edc-b930-ee77c4cccc12','67224047-ebfc-410f-a2ef-b85cb52970c6','Manual','2026-10-29 06:42:04.012'),('54096dcc-f03a-4f1c-ae6e-8c1c66efcdda','3da7cc15-379d-44e6-947e-33434add3a54','2fd6ef33-53df-4598-a1d0-3d8cba327f33','Petrol','2026-10-29 06:24:35.019'),('58076926-eeda-4447-899f-4f8f35e37a6b','d2f88000-730e-4f7a-90af-8dad2bb6c119','04fe396a-6c05-4f76-81c2-4c3131b5bfb4','2022','2026-10-29 06:33:35.389'),('5a58b4c1-8c16-4789-9e3c-b6838f86ce60','36b758f1-1ec8-447d-957d-c67343a0239b','04fe396a-6c05-4f76-81c2-4c3131b5bfb4','2022','2026-10-26 01:59:51.173'),('5e854f0a-fc23-4960-9a49-7d23788d1f85','5b02a7a8-497e-4163-b61e-7ddcf1fccd5d','04fe396a-6c05-4f76-81c2-4c3131b5bfb4','2022','2026-10-29 06:41:23.253'),('60168928-91f8-4bda-82ae-596bde22d5b4','9119c067-8d01-41f7-9c10-049eb480cd8a','1295bbe6-1e8a-4a98-b132-d717d37d1ee6','28000','2026-10-29 06:29:20.145'),('6631383d-d992-40fd-b396-a94c9bc05c0e','31380c3c-9871-414f-84cc-804ed104c105','2fd6ef33-53df-4598-a1d0-3d8cba327f33','Petrol','2026-10-29 06:24:34.722'),('69098325-af55-475b-908f-cf9a6b9bcf7b','e96d71ac-f937-4748-87d8-cd75e589306b','04fe396a-6c05-4f76-81c2-4c3131b5bfb4','2024','2026-10-29 06:33:35.554'),('6bdd2991-ef01-49d5-b45f-1248f4c9929f','05e57cfa-95ac-4992-985f-440418e35b17','67224047-ebfc-410f-a2ef-b85cb52970c6','Manual','2026-10-29 06:42:04.165'),('6f0272f4-e9dc-4320-a1bc-a878d8b657bc','a5b69256-6084-4f4a-9bdf-8a8b9e9f67f3','67224047-ebfc-410f-a2ef-b85cb52970c6','Manual','2026-10-29 06:41:23.401'),('7328fd7a-8c6d-438b-83fd-ada8d6f6247f','36b758f1-1ec8-447d-957d-c67343a0239b','2fd6ef33-53df-4598-a1d0-3d8cba327f33','Petrol','2026-10-26 01:59:51.168'),('757e5c80-705a-4bea-baac-976ba82775db','01885cc7-9775-4034-aaaf-725ab215c8e9','2fd6ef33-53df-4598-a1d0-3d8cba327f33','Petrol','2026-10-29 06:34:54.751'),('770da7c5-e26d-4e6a-bd8b-388efa7b333c','3da7cc15-379d-44e6-947e-33434add3a54','77cef779-c296-4614-b40e-e0a41c082c4e','Maruti Suzuki','2026-10-29 06:24:35.017'),('7874d25b-21b7-4fa9-a3c3-8ef340f1bfd0','9119c067-8d01-41f7-9c10-049eb480cd8a','04fe396a-6c05-4f76-81c2-4c3131b5bfb4','2022','2026-10-29 06:29:20.161'),('7d373375-1605-4069-9e40-f02bfa0b0d48','31380c3c-9871-414f-84cc-804ed104c105','04fe396a-6c05-4f76-81c2-4c3131b5bfb4','2022','2026-10-29 06:24:34.739'),('83c8ff7c-d117-440a-be95-ae0cee666ae3','5b02a7a8-497e-4163-b61e-7ddcf1fccd5d','77cef779-c296-4614-b40e-e0a41c082c4e','Maruti Suzuki','2026-10-29 06:41:23.250'),('8483f993-25c4-401c-b45f-2e75cb210bc8','3da7cc15-379d-44e6-947e-33434add3a54','04fe396a-6c05-4f76-81c2-4c3131b5bfb4','2024','2026-10-29 06:24:35.026'),('852334f6-a74e-4e8a-a2aa-39ec1f1b92f0','a5b69256-6084-4f4a-9bdf-8a8b9e9f67f3','77cef779-c296-4614-b40e-e0a41c082c4e','Maruti Suzuki','2026-10-29 06:41:23.399'),('869440e1-1763-4a60-90e3-0b4bd47506d3','a5b69256-6084-4f4a-9bdf-8a8b9e9f67f3','04fe396a-6c05-4f76-81c2-4c3131b5bfb4','2024','2026-10-29 06:41:23.402'),('895d59ca-386b-40a0-8fcc-a7c983b164eb','6c9f908f-84c7-47fe-be4a-98e3d23cca0e','1295bbe6-1e8a-4a98-b132-d717d37d1ee6','28000','2026-10-29 06:25:13.185'),('89a41fd7-08dd-49eb-ba18-7677e73094d8','aa211ce6-3cc3-4f1f-bd62-7dd3ab5703df','1295bbe6-1e8a-4a98-b132-d717d37d1ee6','28000','2026-10-29 06:24:56.391'),('89c24d56-1108-4301-bd59-28562dc4051b','575adcc2-6fc4-4059-bde2-c80bd3cd8d0c','2fd6ef33-53df-4598-a1d0-3d8cba327f33','Petrol','2026-10-29 06:13:07.924'),('8ce1401d-10dd-4691-b5a6-fc296bc47ae2','05e57cfa-95ac-4992-985f-440418e35b17','04fe396a-6c05-4f76-81c2-4c3131b5bfb4','2024','2026-10-29 06:42:04.167'),('8ef6a984-c8f1-45eb-bfaa-31a31a89f8c9','aa211ce6-3cc3-4f1f-bd62-7dd3ab5703df','77cef779-c296-4614-b40e-e0a41c082c4e','Maruti Suzuki','2026-10-29 06:24:56.395'),('920fb163-4e67-4ff0-ac0c-25d88cf3b871','01885cc7-9775-4034-aaaf-725ab215c8e9','67224047-ebfc-410f-a2ef-b85cb52970c6','Manual','2026-10-29 06:34:54.753'),('948eefc9-e7c2-4685-b3d9-3dfe10d0f522','9119c067-8d01-41f7-9c10-049eb480cd8a','67224047-ebfc-410f-a2ef-b85cb52970c6','Manual','2026-10-29 06:29:20.157'),('94f331ee-69cb-4538-9f9d-06daecbbffae','8e3f5b77-339b-42b1-9a9d-77e3f55496ed','2fd6ef33-53df-4598-a1d0-3d8cba327f33','Petrol','2026-10-29 06:13:08.092'),('977ead3a-5576-4d0c-b799-7b51b1118d00','d2f88000-730e-4f7a-90af-8dad2bb6c119','77cef779-c296-4614-b40e-e0a41c082c4e','Maruti Suzuki','2026-10-29 06:33:35.386'),('996768fc-8653-4720-bf12-4c3788b2fe8d','575adcc2-6fc4-4059-bde2-c80bd3cd8d0c','77cef779-c296-4614-b40e-e0a41c082c4e','Maruti Suzuki','2026-10-29 06:13:07.922'),('9b0f7ef6-f5a8-4a5f-bb43-67386a3414df','05e57cfa-95ac-4992-985f-440418e35b17','2fd6ef33-53df-4598-a1d0-3d8cba327f33','Petrol','2026-10-29 06:42:04.164'),('9c2ab2db-be15-4b68-ae16-96ec26652b58','a5b69256-6084-4f4a-9bdf-8a8b9e9f67f3','1295bbe6-1e8a-4a98-b132-d717d37d1ee6','5000','2026-10-29 06:41:23.398'),('9db65a7f-f4c5-4231-adb0-27398ddcdb3d','01885cc7-9775-4034-aaaf-725ab215c8e9','77cef779-c296-4614-b40e-e0a41c082c4e','Maruti Suzuki','2026-10-29 06:34:54.749'),('a233e44a-5703-4c3f-a18f-694afc61a150','05e57cfa-95ac-4992-985f-440418e35b17','1295bbe6-1e8a-4a98-b132-d717d37d1ee6','5000','2026-10-29 06:42:04.162'),('a2d240a9-ef4e-4554-9009-c199d5b8c5bf','6c9f908f-84c7-47fe-be4a-98e3d23cca0e','67224047-ebfc-410f-a2ef-b85cb52970c6','Manual','2026-10-29 06:25:13.195'),('a3a7d085-a947-445a-9703-5095873bd491','e96d71ac-f937-4748-87d8-cd75e589306b','77cef779-c296-4614-b40e-e0a41c082c4e','Maruti Suzuki','2026-10-29 06:33:35.552'),('a70acb8d-edf1-4305-9c6b-8525bcaf30ff','36b758f1-1ec8-447d-957d-c67343a0239b','dda42216-b654-4e8c-b9c8-40721e2dcc0a','Comprehensive','2026-10-26 01:59:51.176'),('ab4a649a-bdc9-4865-8476-8e27cc0355ec','0bca61f1-e027-4c41-b74b-a4c2ae976d52','1295bbe6-1e8a-4a98-b132-d717d37d1ee6','5000','2026-10-29 06:29:20.419'),('b0849794-8cf8-4561-b754-7eb44f508ecd','31380c3c-9871-414f-84cc-804ed104c105','77cef779-c296-4614-b40e-e0a41c082c4e','Maruti Suzuki','2026-10-29 06:24:34.709'),('b151bd1c-7d91-4ed5-8092-76489e3481b2','e96d71ac-f937-4748-87d8-cd75e589306b','1295bbe6-1e8a-4a98-b132-d717d37d1ee6','5000','2026-10-29 06:33:35.549'),('b212864e-6f5b-4d76-9db1-f4625a28c9b1','8e3f5b77-339b-42b1-9a9d-77e3f55496ed','1295bbe6-1e8a-4a98-b132-d717d37d1ee6','5000','2026-10-29 06:13:08.090'),('b69a48cc-34f4-4641-8f71-625d13f5e1f8','3da7cc15-379d-44e6-947e-33434add3a54','67224047-ebfc-410f-a2ef-b85cb52970c6','Manual','2026-10-29 06:24:35.023'),('b7ff399b-3a1c-40ef-add1-d17f1f854c6b','0bca61f1-e027-4c41-b74b-a4c2ae976d52','77cef779-c296-4614-b40e-e0a41c082c4e','Maruti Suzuki','2026-10-29 06:29:20.424'),('bad4cf55-4600-46c7-9a64-621d99c0003d','6c9f908f-84c7-47fe-be4a-98e3d23cca0e','77cef779-c296-4614-b40e-e0a41c082c4e','Maruti Suzuki','2026-10-29 06:25:13.187'),('bc13fa16-f465-4da5-8916-c12f6bee0832','575adcc2-6fc4-4059-bde2-c80bd3cd8d0c','04fe396a-6c05-4f76-81c2-4c3131b5bfb4','2022','2026-10-29 06:13:07.929'),('c3cd0ee4-a5a4-477a-8157-41904f867f19','0bca61f1-e027-4c41-b74b-a4c2ae976d52','04fe396a-6c05-4f76-81c2-4c3131b5bfb4','2024','2026-10-29 06:29:20.431'),('c4de31f6-e63a-4a0f-b7b3-988495827125','0bca61f1-e027-4c41-b74b-a4c2ae976d52','67224047-ebfc-410f-a2ef-b85cb52970c6','Manual','2026-10-29 06:29:20.429'),('c6ef3da9-c2b6-491e-bfa0-47b11aa4098e','36b758f1-1ec8-447d-957d-c67343a0239b','67224047-ebfc-410f-a2ef-b85cb52970c6','Manual','2026-10-26 01:59:51.171'),('c8973cdc-09f7-425b-b7e9-741ee46be6d1','cb132c6b-d480-4677-9c0b-de1a169a4f78','1295bbe6-1e8a-4a98-b132-d717d37d1ee6','5000','2026-10-29 06:25:13.417'),('ca59f5b7-424a-495b-bcde-80cdd69dee11','36b758f1-1ec8-447d-957d-c67343a0239b','ec5d185c-ddaa-41ae-a461-7883b114be79','1st','2026-10-26 01:59:51.175'),('cf0dabcb-9ce2-4b72-9fb6-2f11c9cd3919','d2f88000-730e-4f7a-90af-8dad2bb6c119','67224047-ebfc-410f-a2ef-b85cb52970c6','Manual','2026-10-29 06:33:35.388'),('d1c1d2c9-68a6-47c9-982b-e085812e8914','575adcc2-6fc4-4059-bde2-c80bd3cd8d0c','1295bbe6-1e8a-4a98-b132-d717d37d1ee6','28000','2026-10-29 06:13:07.908'),('d6d26721-6ec5-4714-aea7-9c9cb3a90f4e','6c9f908f-84c7-47fe-be4a-98e3d23cca0e','04fe396a-6c05-4f76-81c2-4c3131b5bfb4','2022','2026-10-29 06:25:13.199'),('d725821b-d267-43a0-bda6-e80ab495d453','3da7cc15-379d-44e6-947e-33434add3a54','1295bbe6-1e8a-4a98-b132-d717d37d1ee6','5000','2026-10-29 06:24:35.015'),('db65fa42-78a3-42c4-9436-3462c8fd7790','8e3f5b77-339b-42b1-9a9d-77e3f55496ed','67224047-ebfc-410f-a2ef-b85cb52970c6','Manual','2026-10-29 06:13:08.094'),('e0543bdf-ae3c-4a54-9dc2-d79d27f5acd4','14546635-8b20-4971-bdf5-61a4a9277a4b','67224047-ebfc-410f-a2ef-b85cb52970c6','Manual','2026-10-29 06:34:54.514'),('e3a87519-4ebd-48e7-a838-7d202372b524','9119c067-8d01-41f7-9c10-049eb480cd8a','77cef779-c296-4614-b40e-e0a41c082c4e','Maruti Suzuki','2026-10-29 06:29:20.150'),('e46e8aa6-f798-4d7c-8c75-8a471cabf261','6c9f908f-84c7-47fe-be4a-98e3d23cca0e','2fd6ef33-53df-4598-a1d0-3d8cba327f33','Petrol','2026-10-29 06:25:13.190'),('e50a21da-581c-49a4-abb2-2a1113d6ca96','8e3f5b77-339b-42b1-9a9d-77e3f55496ed','04fe396a-6c05-4f76-81c2-4c3131b5bfb4','2024','2026-10-29 06:13:08.096'),('e98a3ad5-bde2-4d6f-bfe0-61701a83bb26','e96d71ac-f937-4748-87d8-cd75e589306b','2fd6ef33-53df-4598-a1d0-3d8cba327f33','Petrol','2026-10-29 06:33:35.553'),('ed166b9c-6137-4aec-913a-23576e65b833','cb132c6b-d480-4677-9c0b-de1a169a4f78','04fe396a-6c05-4f76-81c2-4c3131b5bfb4','2024','2026-10-29 06:25:13.428'),('eebc43f7-74fa-4e9e-b257-db68613e7b25','77e39586-b269-4edc-b930-ee77c4cccc12','77cef779-c296-4614-b40e-e0a41c082c4e','Maruti Suzuki','2026-10-29 06:42:04.010'),('efd51e21-73c1-4454-8f33-4d78bc044d64','01885cc7-9775-4034-aaaf-725ab215c8e9','04fe396a-6c05-4f76-81c2-4c3131b5bfb4','2024','2026-10-29 06:34:54.755'),('f08728be-cc5f-4939-9a78-f4b66b63fb4c','575adcc2-6fc4-4059-bde2-c80bd3cd8d0c','67224047-ebfc-410f-a2ef-b85cb52970c6','Manual','2026-10-29 06:13:07.926'),('f5269f6c-6ec2-45aa-b807-d66d88b2344d','aa211ce6-3cc3-4f1f-bd62-7dd3ab5703df','2fd6ef33-53df-4598-a1d0-3d8cba327f33','Petrol','2026-10-29 06:24:56.397'),('f661850e-d6c2-43ca-ab3a-20a7344f74dc','d2f88000-730e-4f7a-90af-8dad2bb6c119','1295bbe6-1e8a-4a98-b132-d717d37d1ee6','28000','2026-10-29 06:33:35.384'),('f7bf1888-3439-4cab-9d63-2c92fb96dcf5','77e39586-b269-4edc-b930-ee77c4cccc12','1295bbe6-1e8a-4a98-b132-d717d37d1ee6','28000','2026-10-29 06:42:04.007'),('f8385043-49a9-4cbc-9a97-a1e4cd3aba1e','14546635-8b20-4971-bdf5-61a4a9277a4b','1295bbe6-1e8a-4a98-b132-d717d37d1ee6','28000','2026-10-29 06:34:54.504'),('facdfb86-b934-4849-92ba-cf3207803f93','9119c067-8d01-41f7-9c10-049eb480cd8a','2fd6ef33-53df-4598-a1d0-3d8cba327f33','Petrol','2026-10-29 06:29:20.153'),('fd6f8241-72b7-4d4e-a2f9-d97860c1d10b','cb132c6b-d480-4677-9c0b-de1a169a4f78','67224047-ebfc-410f-a2ef-b85cb52970c6','Manual','2026-10-29 06:25:13.425'),('fdbda379-293b-434d-a632-f73e8b49a3e5','0bca61f1-e027-4c41-b74b-a4c2ae976d52','2fd6ef33-53df-4598-a1d0-3d8cba327f33','Petrol','2026-10-29 06:29:20.426');
/*!40000 ALTER TABLE `ad_attribute_values` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ad_images`
--

DROP TABLE IF EXISTS `ad_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ad_images` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ad_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `thumbnail_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `is_cover` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ad_images_ad_id_sort_order_idx` (`ad_id`,`sort_order`),
  CONSTRAINT `ad_images_ad_id_fkey` FOREIGN KEY (`ad_id`) REFERENCES `ads` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ad_images`
--

LOCK TABLES `ad_images` WRITE;
/*!40000 ALTER TABLE `ad_images` DISABLE KEYS */;
INSERT INTO `ad_images` VALUES ('023e89a5-fda2-4377-afc6-20657c0c4000','80e27410-4137-4c09-9ce1-7bff7422de9c','https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=300&auto=format&fit=crop&q=80',3,0,'2026-10-26 06:55:56.271'),('027fb574-6692-4690-8752-c7b139ea0510','31380c3c-9871-414f-84cc-804ed104c105','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000',0,1,'2026-10-29 06:24:34.690'),('06524684-b900-4b20-be70-f260dd229905','01885cc7-9775-4034-aaaf-725ab215c8e9','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000',0,1,'2026-10-29 06:34:54.745'),('0a058e58-3a08-4520-ad10-ccb54373c8db','aa211ce6-3cc3-4f1f-bd62-7dd3ab5703df','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000',0,1,'2026-10-29 06:24:56.388'),('0c7e6d1d-566b-4c81-88c3-4b1d5174a4be','17774804-368c-4b7d-af9f-d5a369933913','https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80',0,1,'2026-10-26 02:16:16.828'),('1e13e921-6334-463b-b6b6-6f51eb35bb5e','dc96eb06-2764-4384-a726-958bd97590fb','https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800&auto=format&fit=crop&q=80',0,1,'2026-10-26 06:12:54.128'),('2dc700ee-4bce-4fd3-a591-7f50ec12b55f','6c9f908f-84c7-47fe-be4a-98e3d23cca0e','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000',0,1,'2026-10-29 06:25:13.183'),('309a3769-7073-48fd-9b0b-73ef675da146','f8b47874-7aed-4741-900d-1864b263020a','https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80',0,1,'2026-10-26 06:12:54.101'),('309a4664-d278-40d0-8b69-4c75fd3eff18','80e27410-4137-4c09-9ce1-7bff7422de9c','https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=300&auto=format&fit=crop&q=80',1,0,'2026-10-26 06:55:56.252'),('330d864c-b66d-49f9-8269-8c4ed66bba4c','0bca61f1-e027-4c41-b74b-a4c2ae976d52','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000',0,1,'2026-10-29 06:29:20.415'),('3a94e7bd-d523-459e-89bf-8242720c905a','14546635-8b20-4971-bdf5-61a4a9277a4b','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000',0,1,'2026-10-29 06:34:54.500'),('3b37f620-fb79-4f88-a415-87a27b5f6cdd','36b758f1-1ec8-447d-957d-c67343a0239b','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80',0,1,'2026-10-26 01:59:51.163'),('3e4a400d-fdf9-4f4f-9b7e-08fe2ffaaf85','9aa7defc-ae31-4a37-ab83-38525b15537a','https://images.unsplash.com/photo-1617806118233-18e1de247200?w=800&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1617806118233-18e1de247200?w=800&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1617806118233-18e1de247200?w=800&auto=format&fit=crop&q=80',0,1,'2026-10-26 02:16:16.974'),('42e38b8d-c904-46fa-9b30-4a9057dbfae1','80e27410-4137-4c09-9ce1-7bff7422de9c','https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=300&auto=format&fit=crop&q=80',4,0,'2026-10-26 06:55:56.280'),('449813db-32fd-404b-a20c-e254ce0781c7','80e27410-4137-4c09-9ce1-7bff7422de9c','https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=1200&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=1200&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=300&auto=format&fit=crop&q=80',2,0,'2026-10-26 06:55:56.263'),('4e686027-c189-437e-bdae-6692f0b5a27a','8e3f5b77-339b-42b1-9a9d-77e3f55496ed','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000',0,1,'2026-10-29 06:13:08.090'),('4ea17cd1-3835-40f2-a6d6-4428d0f07473','05e57cfa-95ac-4992-985f-440418e35b17','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000',0,1,'2026-10-29 06:42:04.160'),('5cdd4e6b-1379-42d1-8494-e777e0b49753','a5b69256-6084-4f4a-9bdf-8a8b9e9f67f3','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000',0,1,'2026-10-29 06:41:23.398'),('6a8263d7-338c-4849-bf87-c2881056290a','cb132c6b-d480-4677-9c0b-de1a169a4f78','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000',0,1,'2026-10-29 06:25:13.414'),('6beca786-c952-47d6-baf5-ae0ad3abfd66','5b02a7a8-497e-4163-b61e-7ddcf1fccd5d','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000',0,1,'2026-10-29 06:41:23.248'),('7f5ebc65-cb52-4c0f-9500-1dc86a849aa9','c1603d89-0292-4369-9030-2e0097249057','https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800&auto=format&fit=crop&q=80',0,1,'2026-10-26 03:01:54.760'),('868b38c0-0d66-4ea0-9705-db561e78c3a4','80e27410-4137-4c09-9ce1-7bff7422de9c','https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=300&auto=format&fit=crop&q=80',0,1,'2026-10-26 06:55:56.231'),('8cc48f27-fa52-44c0-b8fa-716b586221b4','e3cfdd2a-44bf-4339-9f56-9bdbe59cfe1f','https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80',0,1,'2026-10-26 02:16:16.992'),('8fc52385-7ff9-4d40-860c-714aef73d21d','3da7cc15-379d-44e6-947e-33434add3a54','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000',0,1,'2026-10-29 06:24:35.013'),('98961252-d106-4104-aef7-50e4c516ec28','783068fd-1ad1-45be-95ae-d16913af78ac','/activa.jpg','/activa.jpg','/activa.jpg',0,1,'2026-10-26 06:12:54.057'),('9ecbfe6f-69ea-429e-86cf-4570c05a0303','77e39586-b269-4edc-b930-ee77c4cccc12','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000',0,1,'2026-10-29 06:42:04.005'),('af77aea7-f773-4067-a129-9fade59cfaf4','d2f88000-730e-4f7a-90af-8dad2bb6c119','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000',0,1,'2026-10-29 06:33:35.382'),('b00c65ec-0641-4f93-a9d3-b3b44fd63eda','9a95ce1b-f40b-4225-b2a1-16d223ee52a3','/iphone13.jpg','/iphone13.jpg','/iphone13.jpg',0,1,'2026-10-26 06:12:54.086'),('b0b9b5b7-1577-4162-bed7-3dd640f9a1af','e96d71ac-f937-4748-87d8-cd75e589306b','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000',0,1,'2026-10-29 06:33:35.547'),('c60fae59-4955-4231-8dbc-6d7ed8012785','575adcc2-6fc4-4059-bde2-c80bd3cd8d0c','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000',0,1,'2026-10-29 06:13:07.906'),('d1aa883e-6532-4546-85f7-548d695fc270','c32c53f5-9bfc-4fd0-9179-38e1f46532a5','https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop&q=80',0,1,'2026-10-26 02:16:16.949'),('e9b18875-8dc0-42e3-92cb-ec4deb7eda52','9119c067-8d01-41f7-9c10-049eb480cd8a','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000',0,1,'2026-10-29 06:29:20.142'),('f72df9a2-39f8-4888-9495-f7bcaa3b53aa','d6dd5147-cad7-45bb-9b85-9f2673b2e640','https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&auto=format&fit=crop&q=80',0,1,'2026-10-26 02:16:16.842');
/*!40000 ALTER TABLE `ad_images` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ads`
--

DROP TABLE IF EXISTS `ads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ads` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `location_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` decimal(12,2) NOT NULL,
  `is_negotiable` tinyint(1) NOT NULL DEFAULT '1',
  `status` enum('DRAFT','PENDING_REVIEW','ACTIVE','REJECTED','EXPIRED','SOLD','ARCHIVED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `rejection_reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `view_count` int NOT NULL DEFAULT '0',
  `chat_count` int NOT NULL DEFAULT '0',
  `favourite_count` int NOT NULL DEFAULT '0',
  `attributes_cache` json DEFAULT NULL,
  `contact_preference` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CHAT_AND_CALL',
  `latitude` double NOT NULL,
  `longitude` double NOT NULL,
  `expires_at` datetime(3) NOT NULL,
  `renewed_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ads_slug_key` (`slug`),
  KEY `ads_status_category_id_created_at_idx` (`status`,`category_id`,`created_at`),
  KEY `ads_status_location_id_created_at_idx` (`status`,`location_id`,`created_at`),
  KEY `ads_status_price_idx` (`status`,`price`),
  KEY `ads_user_id_status_idx` (`user_id`,`status`),
  KEY `ads_latitude_longitude_idx` (`latitude`,`longitude`),
  KEY `ads_category_id_fkey` (`category_id`),
  KEY `ads_location_id_fkey` (`location_id`),
  CONSTRAINT `ads_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `ads_location_id_fkey` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `ads_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ads`
--

LOCK TABLES `ads` WRITE;
/*!40000 ALTER TABLE `ads` DISABLE KEYS */;
INSERT INTO `ads` VALUES ('01885cc7-9775-4034-aaaf-725ab215c8e9','686dc494-cea3-4b59-9b75-5b05cd8599e6','6d0cea21-129a-48b8-bf11-477a2422a431','bbeda2b3-5450-422d-9d14-83e6b49a50dc','Brand New Maruti Swift 2024 Urgent Distress Sale','brand-new-maruti-swift-2024-urgent-distress-sale-1jayd7','Please send advance token money before delivery to reserve this car via western union.',150000.00,1,'ACTIVE',NULL,0,0,0,'{\"year\": 2024, \"brand\": \"Maruti Suzuki\", \"fuel_type\": \"Petrol\", \"kms_driven\": 5000, \"transmission\": \"Manual\"}','CHAT_AND_CALL',23.0225,72.5714,'2026-11-28 06:34:54.814','2026-10-29 06:34:54.814','2026-10-29 06:34:54.742','2026-10-29 06:34:54.816',NULL),('05e57cfa-95ac-4992-985f-440418e35b17','ccbf588a-7846-4786-987b-33e9fde9ae7e','6d0cea21-129a-48b8-bf11-477a2422a431','bbeda2b3-5450-422d-9d14-83e6b49a50dc','Brand New Maruti Swift 2024 Urgent Distress Sale','brand-new-maruti-swift-2024-urgent-distress-sale-vgs00k','Please send advance token money before delivery to reserve this car via western union.',150000.00,1,'ACTIVE',NULL,2,1,1,'{\"year\": 2024, \"brand\": \"Maruti Suzuki\", \"fuel_type\": \"Petrol\", \"kms_driven\": 5000, \"transmission\": \"Manual\"}','CHAT_AND_CALL',23.0225,72.5714,'2026-11-28 06:42:04.206','2026-10-29 06:42:04.206','2026-10-29 06:42:04.154','2026-11-02 19:18:33.384',NULL),('0bca61f1-e027-4c41-b74b-a4c2ae976d52','13206bdf-dcef-4200-818d-4f635d0d03e4','6d0cea21-129a-48b8-bf11-477a2422a431','bbeda2b3-5450-422d-9d14-83e6b49a50dc','Brand New Maruti Swift 2024 Urgent Distress Sale','brand-new-maruti-swift-2024-urgent-distress-sale-anhz14','Please send advance token money before delivery to reserve this car via western union.',150000.00,1,'ACTIVE',NULL,0,0,0,'{\"year\": 2024, \"brand\": \"Maruti Suzuki\", \"fuel_type\": \"Petrol\", \"kms_driven\": 5000, \"transmission\": \"Manual\"}','CHAT_AND_CALL',23.0225,72.5714,'2026-11-28 06:29:20.494','2026-10-29 06:29:20.494','2026-10-29 06:29:20.412','2026-10-29 06:29:20.495',NULL),('14546635-8b20-4971-bdf5-61a4a9277a4b','686dc494-cea3-4b59-9b75-5b05cd8599e6','6d0cea21-129a-48b8-bf11-477a2422a431','bbeda2b3-5450-422d-9d14-83e6b49a50dc','E2E Automated Test Listing - Maruti Swift 2022 VXI','e2e-automated-test-listing-maruti-swift-2022-vxi-jknlgb','Single-owner car in pristine condition, fully showroom serviced with comprehensive insurance.',620000.00,1,'ACTIVE',NULL,1,1,1,'{\"year\": 2022, \"brand\": \"Maruti Suzuki\", \"fuel_type\": \"Petrol\", \"kms_driven\": 28000, \"transmission\": \"Manual\"}','CHAT_AND_CALL',23.0225,72.5714,'2026-11-28 06:34:54.492',NULL,'2026-10-29 06:34:54.497','2026-10-29 06:34:54.611',NULL),('17774804-368c-4b7d-af9f-d5a369933913','af01e4c9-d050-44df-a329-32cad4c3894b','fffb6915-fd5f-4ae9-9024-9e57fc42ceb8','ef84e3aa-8dce-49ca-99cd-39ad93bb4b68','Apple iPhone 14 Pro Max 256GB Deep Purple (Battery 92%)','iphone-14-pro-max-256gb-deep-purple-blr01','Excellent condition iPhone 14 Pro Max with bill, original box, and braided cable. AppleCare valid till Dec 2026. No scratches or dents, always used with tempered glass and Spigen armor case.',78000.00,1,'ACTIVE',NULL,0,0,0,'{\"ram\": \"6 GB\", \"brand\": \"Apple\", \"color\": \"Deep Purple\", \"storage\": \"256 GB\", \"condition\": \"Like New\"}','CHAT_AND_CALL',12.9716,77.5946,'2026-11-25 02:16:16.824',NULL,'2026-10-11 06:26:18.804','2026-10-26 06:26:18.838',NULL),('31380c3c-9871-414f-84cc-804ed104c105','f46501f8-a4e4-4693-a0b9-09618a3de3ba','6d0cea21-129a-48b8-bf11-477a2422a431','bbeda2b3-5450-422d-9d14-83e6b49a50dc','E2E Automated Test Listing - Maruti Swift 2022 VXI','e2e-automated-test-listing-maruti-swift-2022-vxi-r0uxwj','Single-owner car in pristine condition, fully showroom serviced with comprehensive insurance.',620000.00,1,'ACTIVE',NULL,1,1,1,'{\"year\": 2022, \"brand\": \"Maruti Suzuki\", \"fuel_type\": \"Petrol\", \"kms_driven\": 28000, \"transmission\": \"Manual\"}','CHAT_AND_CALL',23.0225,72.5714,'2026-11-28 06:24:34.672',NULL,'2026-10-29 06:24:34.679','2026-10-29 06:24:34.874',NULL),('36b758f1-1ec8-447d-957d-c67343a0239b','af01e4c9-d050-44df-a329-32cad4c3894b','6d0cea21-129a-48b8-bf11-477a2422a431','bbeda2b3-5450-422d-9d14-83e6b49a50dc','Hyundai i20 Asta 2022 Petrol Manual','hyundai-i20-asta-2022-petrol-manual-p5b0pz','Single owner, showroom condition, comprehensive insurance valid till Nov 2026. Only 18,000 km driven.',720000.00,1,'ACTIVE',NULL,1,1,0,'{\"year\": 2022, \"brand\": \"Hyundai\", \"owners\": \"1st\", \"fuel_type\": \"Petrol\", \"insurance\": \"Comprehensive\", \"kms_driven\": 18000, \"transmission\": \"Manual\"}','CHAT_AND_CALL',23.0225,72.5714,'2026-11-25 01:59:51.151',NULL,'2026-10-11 06:26:18.804','2026-10-26 06:26:18.838',NULL),('3da7cc15-379d-44e6-947e-33434add3a54','f46501f8-a4e4-4693-a0b9-09618a3de3ba','6d0cea21-129a-48b8-bf11-477a2422a431','bbeda2b3-5450-422d-9d14-83e6b49a50dc','Brand New Maruti Swift 2024 Urgent Distress Sale','brand-new-maruti-swift-2024-urgent-distress-sale-rahp8k','Please send advance token money before delivery to reserve this car via western union.',150000.00,1,'PENDING_REVIEW','Contains prohibited keyword: \"western union\"; Detected potential advance payment / QR code phishing pattern',0,0,0,'{\"year\": 2024, \"brand\": \"Maruti Suzuki\", \"fuel_type\": \"Petrol\", \"kms_driven\": 5000, \"transmission\": \"Manual\"}','CHAT_AND_CALL',23.0225,72.5714,'2026-11-28 06:24:35.006',NULL,'2026-10-29 06:24:35.009','2026-10-29 06:24:35.009',NULL),('575adcc2-6fc4-4059-bde2-c80bd3cd8d0c','c7aac895-b00c-4133-b89f-1b39469fd3bd','6d0cea21-129a-48b8-bf11-477a2422a431','bbeda2b3-5450-422d-9d14-83e6b49a50dc','E2E Automated Test Listing - Maruti Swift 2022 VXI','e2e-automated-test-listing-maruti-swift-2022-vxi-84orwb','Single-owner car in pristine condition, fully showroom serviced with comprehensive insurance.',620000.00,1,'ACTIVE',NULL,1,1,1,'{\"year\": 2022, \"brand\": \"Maruti Suzuki\", \"fuel_type\": \"Petrol\", \"kms_driven\": 28000, \"transmission\": \"Manual\"}','CHAT_AND_CALL',23.0225,72.5714,'2026-11-28 06:13:07.895',NULL,'2026-10-29 06:13:07.901','2026-10-29 06:13:07.996',NULL),('5b02a7a8-497e-4163-b61e-7ddcf1fccd5d','4145fb0f-d60c-4e5d-9b36-72e73532d300','6d0cea21-129a-48b8-bf11-477a2422a431','bbeda2b3-5450-422d-9d14-83e6b49a50dc','E2E Automated Test Listing - Maruti Swift 2022 VXI','e2e-automated-test-listing-maruti-swift-2022-vxi-fpv9gs','Single-owner car in pristine condition, fully showroom serviced with comprehensive insurance.',620000.00,1,'ACTIVE',NULL,1,1,1,'{\"year\": 2022, \"brand\": \"Maruti Suzuki\", \"fuel_type\": \"Petrol\", \"kms_driven\": 28000, \"transmission\": \"Manual\"}','CHAT_AND_CALL',23.0225,72.5714,'2026-11-28 06:41:23.243',NULL,'2026-10-29 06:41:23.246','2026-10-29 06:41:23.306',NULL),('6c9f908f-84c7-47fe-be4a-98e3d23cca0e','faced429-b663-4d0b-8649-eb8d3f8f36d0','6d0cea21-129a-48b8-bf11-477a2422a431','bbeda2b3-5450-422d-9d14-83e6b49a50dc','E2E Automated Test Listing - Maruti Swift 2022 VXI','e2e-automated-test-listing-maruti-swift-2022-vxi-nkl76k','Single-owner car in pristine condition, fully showroom serviced with comprehensive insurance.',620000.00,1,'ACTIVE',NULL,1,1,1,'{\"year\": 2022, \"brand\": \"Maruti Suzuki\", \"fuel_type\": \"Petrol\", \"kms_driven\": 28000, \"transmission\": \"Manual\"}','CHAT_AND_CALL',23.0225,72.5714,'2026-11-28 06:25:13.176',NULL,'2026-10-29 06:25:13.179','2026-10-29 06:25:13.284',NULL),('77e39586-b269-4edc-b930-ee77c4cccc12','ccbf588a-7846-4786-987b-33e9fde9ae7e','6d0cea21-129a-48b8-bf11-477a2422a431','bbeda2b3-5450-422d-9d14-83e6b49a50dc','E2E Automated Test Listing - Maruti Swift 2022 VXI','e2e-automated-test-listing-maruti-swift-2022-vxi-fhzcez','Single-owner car in pristine condition, fully showroom serviced with comprehensive insurance.',620000.00,1,'ACTIVE',NULL,2,1,1,'{\"year\": 2022, \"brand\": \"Maruti Suzuki\", \"fuel_type\": \"Petrol\", \"kms_driven\": 28000, \"transmission\": \"Manual\"}','CHAT_AND_CALL',23.0225,72.5714,'2026-11-28 06:42:04.001',NULL,'2026-10-29 06:42:04.003','2026-11-01 15:54:36.614',NULL),('783068fd-1ad1-45be-95ae-d16913af78ac','af01e4c9-d050-44df-a329-32cad4c3894b','f114255e-b443-406a-af82-df837a056a9f','d9ed3d56-38fa-47eb-97a9-952d16641455','Honda Activa 6G','honda-activa-6g-ranchi-ref01','Honda Activa 6G in excellent condition, single owner, driven 12,000 km, all original documents and valid insurance available.',58000.00,1,'ACTIVE',NULL,5,0,1,'{\"year\": 2022, \"brand\": \"Honda\", \"fuel_type\": \"Petrol\", \"kms_driven\": 12000}','CHAT_AND_CALL',23.3441,85.3096,'2026-11-25 06:12:54.055',NULL,'2026-10-24 04:26:18.804','2026-10-29 07:24:30.582',NULL),('80e27410-4137-4c09-9ce1-7bff7422de9c','af01e4c9-d050-44df-a329-32cad4c3894b','e462ed90-72f2-45af-979a-ea1623555fb5','ef84e3aa-8dce-49ca-99cd-39ad93bb4b68','3 BHK Luxury Apartment in Whitefield, Bengaluru','3-bhk-luxury-apartment-whitefield-bengaluru-prop03','Gated Community with Clubhouse\n\nSpacious 1850 sq.ft 3 BHK flat with east-facing balconies overlooking the landscaped garden. Italian marble flooring, modular kitchen with chimney, 2 covered car parks, and 100% power backup. OC received.',8800000.00,1,'ACTIVE',NULL,3,0,0,'{\"bhk\": \"3 BHK\", \"bathrooms\": 3, \"furnishing\": \"Semi-Furnished\", \"carpet_area\": \"1850 sqft\", \"property_type\": \"Apartment\"}','CHAT_AND_CALL',12.9698,77.7499,'2026-11-25 02:16:16.869',NULL,'2026-10-11 06:26:18.804','2026-10-26 06:57:15.396',NULL),('8e3f5b77-339b-42b1-9a9d-77e3f55496ed','c7aac895-b00c-4133-b89f-1b39469fd3bd','6d0cea21-129a-48b8-bf11-477a2422a431','bbeda2b3-5450-422d-9d14-83e6b49a50dc','Brand New Maruti Swift 2024 Urgent Distress Sale','brand-new-maruti-swift-2024-urgent-distress-sale-vzcv4w','Please send advance token money before delivery to reserve this car via western union.',150000.00,1,'ACTIVE',NULL,0,0,0,'{\"year\": 2024, \"brand\": \"Maruti Suzuki\", \"fuel_type\": \"Petrol\", \"kms_driven\": 5000, \"transmission\": \"Manual\"}','CHAT_AND_CALL',23.0225,72.5714,'2026-11-28 06:13:08.114','2026-10-29 06:13:08.114','2026-10-29 06:13:08.088','2026-10-29 06:13:08.115',NULL),('9119c067-8d01-41f7-9c10-049eb480cd8a','13206bdf-dcef-4200-818d-4f635d0d03e4','6d0cea21-129a-48b8-bf11-477a2422a431','bbeda2b3-5450-422d-9d14-83e6b49a50dc','E2E Automated Test Listing - Maruti Swift 2022 VXI','e2e-automated-test-listing-maruti-swift-2022-vxi-8im5ds','Single-owner car in pristine condition, fully showroom serviced with comprehensive insurance.',620000.00,1,'ACTIVE',NULL,1,1,1,'{\"year\": 2022, \"brand\": \"Maruti Suzuki\", \"fuel_type\": \"Petrol\", \"kms_driven\": 28000, \"transmission\": \"Manual\"}','CHAT_AND_CALL',23.0225,72.5714,'2026-11-28 06:29:20.126',NULL,'2026-10-29 06:29:20.133','2026-10-29 06:29:20.289',NULL),('9a95ce1b-f40b-4225-b2a1-16d223ee52a3','af01e4c9-d050-44df-a329-32cad4c3894b','fffb6915-fd5f-4ae9-9024-9e57fc42ceb8','d9ed3d56-38fa-47eb-97a9-952d16641455','iPhone 13','iphone-13-blue-128gb-ranchi-ref02','Apple iPhone 13 128GB in stylish Blue color. Battery health 89%, pristine condition with box and charging cable. Face ID and TrueTone 100% working.',32000.00,0,'ACTIVE',NULL,2,2,0,'{\"brand\": \"Apple\", \"color\": \"Blue\", \"storage\": \"128 GB\"}','CHAT_AND_CALL',23.3441,85.3096,'2026-11-25 06:12:54.085',NULL,'2026-10-23 02:26:18.804','2026-10-30 11:55:07.944',NULL),('9aa7defc-ae31-4a37-ab83-38525b15537a','af01e4c9-d050-44df-a329-32cad4c3894b','bef0a97f-27d0-4990-8671-384d7d959f2f','bbeda2b3-5450-422d-9d14-83e6b49a50dc','Solid Sheesham Wood 6 Seater Dining Table with Cushioned Chairs','solid-sheesham-wood-6-seater-dining-table-furn05','Crafted from pure seasoned Sheesham wood with natural teak finish. Includes 6 heavy wooden chairs with high-density foam cushions and 8mm beveled glass top. Extremely sturdy and premium look.',24500.00,0,'ACTIVE',NULL,0,0,0,'{\"material\": \"Solid Wood (Sheesham)\", \"condition\": \"Excellent\", \"seating_capacity\": \"6 Seater\"}','CHAT_AND_CALL',23.0225,72.5714,'2026-11-25 02:16:16.973',NULL,'2026-10-11 06:26:18.804','2026-10-26 06:26:18.838',NULL),('a5b69256-6084-4f4a-9bdf-8a8b9e9f67f3','4145fb0f-d60c-4e5d-9b36-72e73532d300','6d0cea21-129a-48b8-bf11-477a2422a431','bbeda2b3-5450-422d-9d14-83e6b49a50dc','Brand New Maruti Swift 2024 Urgent Distress Sale','brand-new-maruti-swift-2024-urgent-distress-sale-9if1ly','Please send advance token money before delivery to reserve this car via western union.',150000.00,1,'ACTIVE',NULL,0,0,0,'{\"year\": 2024, \"brand\": \"Maruti Suzuki\", \"fuel_type\": \"Petrol\", \"kms_driven\": 5000, \"transmission\": \"Manual\"}','CHAT_AND_CALL',23.0225,72.5714,'2026-11-28 06:41:23.436','2026-10-29 06:41:23.436','2026-10-29 06:41:23.397','2026-10-29 06:41:23.437',NULL),('aa211ce6-3cc3-4f1f-bd62-7dd3ab5703df','37c9d82d-f727-4836-8c8d-dacc713b40ac','6d0cea21-129a-48b8-bf11-477a2422a431','bbeda2b3-5450-422d-9d14-83e6b49a50dc','E2E Automated Test Listing - Maruti Swift 2022 VXI','e2e-automated-test-listing-maruti-swift-2022-vxi-eaix00','Single-owner car in pristine condition, fully showroom serviced with comprehensive insurance.',620000.00,1,'ACTIVE',NULL,1,1,1,'{\"year\": 2022, \"brand\": \"Maruti Suzuki\", \"fuel_type\": \"Petrol\", \"kms_driven\": 28000, \"transmission\": \"Manual\"}','CHAT_AND_CALL',23.0225,72.5714,'2026-11-28 06:24:56.381',NULL,'2026-10-29 06:24:56.384','2026-10-29 06:24:56.479',NULL),('c1603d89-0292-4369-9030-2e0097249057','af01e4c9-d050-44df-a329-32cad4c3894b','33fe5f37-2914-4342-a1d5-fd222d0b6b56','33c6ec7b-7d97-4717-afec-0d3f17884b22','Sony PlayStation 5 Disc Edition + 2 DualSense Controllers','playstation-5-disc-edition-bundle-pending01','Brand new sealed pack PS5 with God of War Ragnarok and extra controller. Full Indian warranty with bill.',36000.00,1,'PENDING_REVIEW','Flagged for moderation: High-demand console listed below market price threshold',0,0,0,NULL,'CHAT_AND_CALL',28.6139,77.209,'2026-11-25 03:01:54.756',NULL,'2026-10-11 06:26:18.804','2026-10-26 06:26:18.838',NULL),('c32c53f5-9bfc-4fd0-9179-38e1f46532a5','af01e4c9-d050-44df-a329-32cad4c3894b','33fe5f37-2914-4342-a1d5-fd222d0b6b56','7e53dfde-c7ab-47ba-8cfa-e4d61855211b','Sony Bravia 55 inch 4K Ultra HD Smart OLED Google TV','sony-bravia-55-inch-4k-oled-tv-mum04','XR Cognitive Processor, Dolby Vision Atmos, 120Hz refresh rate perfect for PS5 and movies. Mint condition, only 10 months old with original wall mount and voice remote. Selling due to relocation.',54000.00,1,'ACTIVE',NULL,1,0,0,'{\"brand\": \"Sony\", \"warranty\": \"2 Months Remaining\", \"resolution\": \"4K OLED\", \"screen_size\": \"55 inch\"}','CHAT_AND_CALL',19.076,72.8777,'2026-11-25 02:16:16.947',NULL,'2026-10-11 06:26:18.804','2026-10-26 06:26:18.838',NULL),('cb132c6b-d480-4677-9c0b-de1a169a4f78','faced429-b663-4d0b-8649-eb8d3f8f36d0','6d0cea21-129a-48b8-bf11-477a2422a431','bbeda2b3-5450-422d-9d14-83e6b49a50dc','Brand New Maruti Swift 2024 Urgent Distress Sale','brand-new-maruti-swift-2024-urgent-distress-sale-jv2vbb','Please send advance token money before delivery to reserve this car via western union.',150000.00,1,'ACTIVE',NULL,0,0,0,'{\"year\": 2024, \"brand\": \"Maruti Suzuki\", \"fuel_type\": \"Petrol\", \"kms_driven\": 5000, \"transmission\": \"Manual\"}','CHAT_AND_CALL',23.0225,72.5714,'2026-11-28 06:25:13.501','2026-10-29 06:25:13.501','2026-10-29 06:25:13.411','2026-10-29 06:25:13.503',NULL),('d2f88000-730e-4f7a-90af-8dad2bb6c119','9bac6b71-0008-41ea-be6d-02faf96598ce','6d0cea21-129a-48b8-bf11-477a2422a431','bbeda2b3-5450-422d-9d14-83e6b49a50dc','E2E Automated Test Listing - Maruti Swift 2022 VXI','e2e-automated-test-listing-maruti-swift-2022-vxi-0ol6gh','Single-owner car in pristine condition, fully showroom serviced with comprehensive insurance.',620000.00,1,'ACTIVE',NULL,1,1,1,'{\"year\": 2022, \"brand\": \"Maruti Suzuki\", \"fuel_type\": \"Petrol\", \"kms_driven\": 28000, \"transmission\": \"Manual\"}','CHAT_AND_CALL',23.0225,72.5714,'2026-11-28 06:33:35.377',NULL,'2026-10-29 06:33:35.379','2026-10-29 06:33:35.463',NULL),('d6dd5147-cad7-45bb-9b85-9f2673b2e640','af01e4c9-d050-44df-a329-32cad4c3894b','f114255e-b443-406a-af82-df837a056a9f','33c6ec7b-7d97-4717-afec-0d3f17884b22','Royal Enfield Classic 350 Reborn - Stealth Black 2023','royal-enfield-classic-350-stealth-black-del02','First owner Royal Enfield Classic 350 Dual-channel ABS in Stealth Black. Only 7,400 KM driven. Full service record from authorized RE service center. Extra touring seat and crash guard installed.',155000.00,1,'ACTIVE',NULL,1,0,0,'{\"year\": 2023, \"brand\": \"Royal Enfield\", \"owners\": \"1st\", \"fuel_type\": \"Petrol\", \"kms_driven\": 7400}','CHAT_AND_CALL',28.6139,77.209,'2026-11-25 02:16:16.841',NULL,'2026-10-11 06:26:18.804','2026-10-29 07:24:55.996',NULL),('dc96eb06-2764-4384-a726-958bd97590fb','af01e4c9-d050-44df-a329-32cad4c3894b','bef0a97f-27d0-4990-8671-384d7d959f2f','d9ed3d56-38fa-47eb-97a9-952d16641455','Wooden Study Desk','wooden-study-desk-ranchi-ref04','Solid engineered wood study/office desk with dual drawers and cable management. Very sturdy and minimal scratch, perfect for work from home or students.',3500.00,1,'ACTIVE',NULL,0,0,0,'{\"material\": \"Solid Wood\", \"condition\": \"Like New\"}','CHAT_AND_CALL',23.3441,85.3096,'2026-11-25 06:12:54.127',NULL,'2026-10-20 03:26:18.804','2026-10-26 06:26:18.911',NULL),('e3cfdd2a-44bf-4339-9f56-9bdbe59cfe1f','af01e4c9-d050-44df-a329-32cad4c3894b','33fe5f37-2914-4342-a1d5-fd222d0b6b56','48409ef8-6229-4e70-9304-903ca97810ad','Apple MacBook Pro 14 M2 Pro (16GB RAM, 512GB SSD) Space Grey','apple-macbook-pro-14-m2-pro-space-grey-hyd06','MacBook Pro 14-inch with 10-core CPU and 16-core GPU M2 Pro chip. Battery cycle count only 48 (98% battery health). Includes original 67W MagSafe charger and Indian bill. Pristine condition.',118000.00,1,'ACTIVE',NULL,4,1,0,'{\"ram\": \"16 GB\", \"brand\": \"Apple\", \"storage\": \"512 GB SSD\", \"processor\": \"M2 Pro\"}','CHAT_AND_CALL',17.385,78.4867,'2026-11-25 02:16:16.990',NULL,'2026-10-11 06:26:18.804','2026-10-26 06:26:18.838',NULL),('e96d71ac-f937-4748-87d8-cd75e589306b','9bac6b71-0008-41ea-be6d-02faf96598ce','6d0cea21-129a-48b8-bf11-477a2422a431','bbeda2b3-5450-422d-9d14-83e6b49a50dc','Brand New Maruti Swift 2024 Urgent Distress Sale','brand-new-maruti-swift-2024-urgent-distress-sale-4oncdc','Please send advance token money before delivery to reserve this car via western union.',150000.00,1,'ACTIVE',NULL,0,0,0,'{\"year\": 2024, \"brand\": \"Maruti Suzuki\", \"fuel_type\": \"Petrol\", \"kms_driven\": 5000, \"transmission\": \"Manual\"}','CHAT_AND_CALL',23.0225,72.5714,'2026-11-28 06:33:35.595','2026-10-29 06:33:35.595','2026-10-29 06:33:35.546','2026-10-29 06:33:35.596',NULL),('f8b47874-7aed-4741-900d-1864b263020a','af01e4c9-d050-44df-a329-32cad4c3894b','e462ed90-72f2-45af-979a-ea1623555fb5','d9ed3d56-38fa-47eb-97a9-952d16641455','2 BHK Apartment','2-bhk-apartment-ranchi-ref03','Ready to move 2 BHK modern apartment in prime residential society. Spacious modular kitchen, reserved car parking, 24/7 power backup and security.',4800000.00,1,'ACTIVE',NULL,1,0,0,'{\"bhk\": \"2 BHK\", \"furnishing\": \"Semi-Furnished\", \"carpet_area\": \"1150 sqft\"}','CHAT_AND_CALL',23.3441,85.3096,'2026-11-25 06:12:54.100',NULL,'2026-10-21 05:26:18.804','2026-10-26 07:19:15.062',NULL);
/*!40000 ALTER TABLE `ads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `old_data` json DEFAULT NULL,
  `new_data` json DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `audit_logs_entity_type_entity_id_idx` (`entity_type`,`entity_id`),
  KEY `audit_logs_action_created_at_idx` (`action`,`created_at`),
  KEY `audit_logs_user_id_fkey` (`user_id`),
  CONSTRAINT `audit_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES ('01764277-2896-4615-a91f-7601976b0ff1','2c08498a-74b9-4ba0-bd84-adbf2eb20eea','ADMIN_CHANGE_PASSWORD','USER','2c08498a-74b9-4ba0-bd84-adbf2eb20eea',NULL,NULL,'::1','node','2026-11-02 19:32:13.789'),('02b91b67-8db8-4d1d-9768-c4eeab97ae93','af01e4c9-d050-44df-a329-32cad4c3894b','ADMIN_LOGIN','USER','af01e4c9-d050-44df-a329-32cad4c3894b',NULL,NULL,'::1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-IN) WindowsPowerShell/5.1.26100.9711','2026-10-29 06:41:23.427'),('041de992-05f7-4ea4-9a67-3fd5bae58e1e','af01e4c9-d050-44df-a329-32cad4c3894b','MODERATION_APPROVE_AD','AD','e96d71ac-f937-4748-87d8-cd75e589306b','{\"status\": \"PENDING_REVIEW\"}','{\"status\": \"ACTIVE\", \"rejectionReason\": null}','::1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-IN) WindowsPowerShell/5.1.26100.9711','2026-10-29 06:33:35.608'),('104f6f1e-afe3-4c07-b641-9f3016abf1ea','af01e4c9-d050-44df-a329-32cad4c3894b','ADMIN_LOGIN','USER','af01e4c9-d050-44df-a329-32cad4c3894b',NULL,NULL,'::1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-IN) WindowsPowerShell/5.1.26100.9711','2026-10-29 06:41:15.931'),('1a3d0ff3-463f-46ed-bcc4-198fd6e1db1c','af01e4c9-d050-44df-a329-32cad4c3894b','ADMIN_LOGIN','USER','af01e4c9-d050-44df-a329-32cad4c3894b',NULL,NULL,'::1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-IN) WindowsPowerShell/5.1.26100.9711','2026-10-29 06:25:13.479'),('1bdd5ed5-cc04-44f1-8c7e-bd1aec7f131b','af01e4c9-d050-44df-a329-32cad4c3894b','LOGOUT','USER','af01e4c9-d050-44df-a329-32cad4c3894b',NULL,NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36','2026-10-29 07:39:54.353'),('1f9a0332-87d9-4534-886f-c2a5e33adf4b','af01e4c9-d050-44df-a329-32cad4c3894b','ADMIN_LOGIN','USER','af01e4c9-d050-44df-a329-32cad4c3894b',NULL,NULL,'::1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-IN) WindowsPowerShell/5.1.26100.9711','2026-10-29 06:41:12.677'),('3a27c4ea-6f6c-4f66-b959-f0b3016c1140','cafd6b30-93c1-4df0-b79c-d3367943bfc6','LOGOUT','USER','cafd6b30-93c1-4df0-b79c-d3367943bfc6',NULL,NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36','2026-10-29 07:43:48.548'),('3c470a23-08e9-457f-afdc-1b627f9f63c1','6e8bcea0-cb96-4f9b-bcb9-b1bd882b1407','AUTHORIZATION_DENIED','ROUTE','GET /api/v1/moderation/pending',NULL,'{\"actualRole\": \"USER\", \"requiredRoles\": [\"ADMIN\", \"MODERATOR\"]}','::1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-IN) WindowsPowerShell/5.1.26100.9711','2026-10-29 06:25:18.101'),('3f0c0d25-a5e7-40bd-b6d4-3157c6515781','af01e4c9-d050-44df-a329-32cad4c3894b','ADMIN_LOGIN','USER','af01e4c9-d050-44df-a329-32cad4c3894b',NULL,NULL,'::1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-IN) WindowsPowerShell/5.1.26100.9711','2026-10-29 06:42:04.196'),('40be67e2-b1b6-4249-9633-26f9fba9527b','af01e4c9-d050-44df-a329-32cad4c3894b','ADMIN_LOGIN','USER','af01e4c9-d050-44df-a329-32cad4c3894b',NULL,NULL,'::1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-IN) WindowsPowerShell/5.1.26100.9711','2026-10-29 06:34:54.798'),('40c8fbbd-1078-48df-a03b-1630027fa31e','af01e4c9-d050-44df-a329-32cad4c3894b','ADMIN_LOGIN','USER','af01e4c9-d050-44df-a329-32cad4c3894b',NULL,NULL,'::1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-IN) WindowsPowerShell/5.1.26100.9711','2026-10-29 06:29:20.473'),('48428885-692f-467e-8e1f-34c533ad77c6','af01e4c9-d050-44df-a329-32cad4c3894b','ADMIN_LOGIN','USER','af01e4c9-d050-44df-a329-32cad4c3894b',NULL,NULL,'::1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-IN) WindowsPowerShell/5.1.26100.9711','2026-10-29 06:41:20.274'),('4c256996-4ab6-4e4f-b1cc-1df5542433cd','af01e4c9-d050-44df-a329-32cad4c3894b','ADMIN_UPDATE_CATEGORY','CATEGORY','6d0cea21-129a-48b8-bf11-477a2422a431',NULL,'{\"id\": \"6d0cea21-129a-48b8-bf11-477a2422a431\", \"name\": \"awesh laptop\", \"slug\": \"laptops\", \"iconUrl\": \"laptops\", \"isActive\": true, \"parentId\": null, \"createdAt\": \"2026-10-25T17:57:00.462Z\", \"updatedAt\": \"2026-11-02T19:22:29.975Z\", \"description\": \"testing laptop seen\", \"displayOrder\": 5}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36','2026-11-02 19:22:29.990'),('541f9e5d-788a-4f5e-9447-5f06f3f99624','af01e4c9-d050-44df-a329-32cad4c3894b','MODERATION_APPROVE_AD','AD','01885cc7-9775-4034-aaaf-725ab215c8e9','{\"status\": \"PENDING_REVIEW\"}','{\"status\": \"ACTIVE\", \"rejectionReason\": null}','::1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-IN) WindowsPowerShell/5.1.26100.9711','2026-10-29 06:34:54.829'),('56b63cc3-d0b3-49f3-8efb-1afa3dc6bef1','2c08498a-74b9-4ba0-bd84-adbf2eb20eea','ADMIN_LOGIN','USER','2c08498a-74b9-4ba0-bd84-adbf2eb20eea',NULL,NULL,'::1','node','2026-11-02 19:32:13.607'),('664d9509-32b2-4e0a-9a99-aab66b3af27b','af01e4c9-d050-44df-a329-32cad4c3894b','MODERATION_APPROVE_AD','AD','05e57cfa-95ac-4992-985f-440418e35b17','{\"status\": \"PENDING_REVIEW\"}','{\"status\": \"ACTIVE\", \"rejectionReason\": null}','::1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-IN) WindowsPowerShell/5.1.26100.9711','2026-10-29 06:42:04.216'),('67305332-53aa-47f4-80a8-3890016169bb','af01e4c9-d050-44df-a329-32cad4c3894b','ADMIN_LOGIN','USER','af01e4c9-d050-44df-a329-32cad4c3894b',NULL,NULL,'::1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-IN) WindowsPowerShell/5.1.26100.9711','2026-10-29 06:29:34.144'),('69fe5245-231b-4eb5-9873-b652ac1aa885','af01e4c9-d050-44df-a329-32cad4c3894b','ADMIN_LOGIN','USER','af01e4c9-d050-44df-a329-32cad4c3894b',NULL,NULL,'::1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-IN) WindowsPowerShell/5.1.26100.9711','2026-10-29 06:30:04.741'),('6ce93b8d-0569-4523-a562-0da5fbf27189',NULL,'ADMIN_LOGIN_FAILED','AUTH','admin',NULL,'{\"reason\": \"invalid_credentials\"}','::1','node','2026-11-02 19:31:31.945'),('70bf7394-dda0-4a2a-9beb-8f15d8c3c3c3','af01e4c9-d050-44df-a329-32cad4c3894b','ADMIN_UPDATE_CATEGORY','CATEGORY','6d0cea21-129a-48b8-bf11-477a2422a431',NULL,'{\"id\": \"6d0cea21-129a-48b8-bf11-477a2422a431\", \"name\": \"Cars\", \"slug\": \"cars\", \"iconUrl\": \"car\", \"isActive\": false, \"parentId\": null, \"createdAt\": \"2026-10-25T17:57:00.462Z\", \"updatedAt\": \"2026-11-02T19:21:27.474Z\", \"description\": null, \"displayOrder\": 1}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36','2026-11-02 19:21:27.490'),('74414750-7424-4634-a1ab-391e7f955f98','af01e4c9-d050-44df-a329-32cad4c3894b','ADMIN_LOGIN','USER','af01e4c9-d050-44df-a329-32cad4c3894b',NULL,NULL,'::1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-IN) WindowsPowerShell/5.1.26100.9711','2026-10-29 06:29:30.529'),('75ee8d9a-dedd-434c-8f02-7d13f4dae315','f46501f8-a4e4-4693-a0b9-09618a3de3ba','AUTHORIZATION_DENIED','ROUTE','PATCH /api/v1/moderation/ads/3da7cc15-379d-44e6-94',NULL,'{\"actualRole\": \"USER\", \"requiredRoles\": [\"ADMIN\", \"MODERATOR\"]}','::1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-IN) WindowsPowerShell/5.1.26100.9711','2026-10-29 06:24:35.054'),('7ad5a3bc-504c-4806-8935-14ce50b61177','2c08498a-74b9-4ba0-bd84-adbf2eb20eea','ADMIN_CREATE_CATEGORY','CATEGORY','7c1727c0-76a6-417a-918a-160403089d87',NULL,'{\"id\": \"7c1727c0-76a6-417a-918a-160403089d87\", \"name\": \"Asus 1\", \"slug\": \"asus-1\", \"iconUrl\": null, \"isActive\": true, \"parentId\": \"6d0cea21-129a-48b8-bf11-477a2422a431\", \"createdAt\": \"2026-11-02T20:14:07.655Z\", \"updatedAt\": \"2026-11-02T20:14:07.655Z\", \"description\": null, \"displayOrder\": 0}','::1','node','2026-11-02 20:14:07.677'),('8e6a830a-2c00-4462-89eb-a9290b9f5f6e','af01e4c9-d050-44df-a329-32cad4c3894b','ADMIN_CREATE_CATEGORY','CATEGORY','d1b050b4-cb1b-467e-9aca-30ba8586f0b1',NULL,'{\"id\": \"d1b050b4-cb1b-467e-9aca-30ba8586f0b1\", \"name\": \"bn intelhub\", \"slug\": \"none\", \"iconUrl\": \"test\", \"isActive\": true, \"parentId\": null, \"createdAt\": \"2026-10-30T11:57:06.557Z\", \"updatedAt\": \"2026-10-30T11:57:06.557Z\", \"description\": \"testing 0001\", \"displayOrder\": 12}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36','2026-10-30 11:57:06.573'),('91e607cd-b219-4b95-b012-94db3a2df26e','af01e4c9-d050-44df-a329-32cad4c3894b','ADMIN_LOGIN','USER','af01e4c9-d050-44df-a329-32cad4c3894b',NULL,NULL,'::1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-IN) WindowsPowerShell/5.1.26100.9711','2026-10-29 06:30:00.772'),('9e8c58eb-9b60-43e4-aecb-2512efd6ffbf','2c08498a-74b9-4ba0-bd84-adbf2eb20eea','ADMIN_UPDATE_PROFILE','USER','2c08498a-74b9-4ba0-bd84-adbf2eb20eea',NULL,'{\"bio\": \"Chief Marketplace Administrator\", \"name\": \"Rahul Sharma\"}','::1','node','2026-11-02 19:32:03.700'),('a2e538be-75e7-4705-ae55-f274de32f811','af01e4c9-d050-44df-a329-32cad4c3894b','ADMIN_LOGIN','USER','af01e4c9-d050-44df-a329-32cad4c3894b',NULL,NULL,'::1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-IN) WindowsPowerShell/5.1.26100.9711','2026-10-29 06:33:35.581'),('a4030c35-fc6a-435d-8065-1b84095cd6cc','af01e4c9-d050-44df-a329-32cad4c3894b','ADMIN_LOGIN','USER','af01e4c9-d050-44df-a329-32cad4c3894b',NULL,NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36','2026-10-29 07:28:42.011'),('cb6b5733-2593-4edd-81ed-de9a0879f832','af01e4c9-d050-44df-a329-32cad4c3894b','LOGOUT','USER','af01e4c9-d050-44df-a329-32cad4c3894b',NULL,NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36','2026-10-30 11:54:54.042'),('dba7b495-5d7a-4b86-a9c2-0072d57bba44','af01e4c9-d050-44df-a329-32cad4c3894b','MODERATION_APPROVE_AD','AD','a5b69256-6084-4f4a-9bdf-8a8b9e9f67f3','{\"status\": \"PENDING_REVIEW\"}','{\"status\": \"ACTIVE\", \"rejectionReason\": null}','::1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-IN) WindowsPowerShell/5.1.26100.9711','2026-10-29 06:41:23.446'),('e443db29-0365-46f7-aa77-8a1f4672f5ed','af01e4c9-d050-44df-a329-32cad4c3894b','ADMIN_UPDATE_CATEGORY','CATEGORY','6d0cea21-129a-48b8-bf11-477a2422a431',NULL,'{\"id\": \"6d0cea21-129a-48b8-bf11-477a2422a431\", \"name\": \"Cars\", \"slug\": \"cars\", \"iconUrl\": \"car\", \"isActive\": true, \"parentId\": null, \"createdAt\": \"2026-10-25T17:57:00.462Z\", \"updatedAt\": \"2026-11-02T19:21:36.960Z\", \"description\": null, \"displayOrder\": 1}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36','2026-11-02 19:21:36.978'),('e7dec7fc-bd7f-49cb-a334-6cb403610f87','af01e4c9-d050-44df-a329-32cad4c3894b','ADMIN_LOGIN','USER','af01e4c9-d050-44df-a329-32cad4c3894b',NULL,NULL,'::1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-IN) WindowsPowerShell/5.1.26100.9711','2026-10-29 06:30:10.901'),('e8d01a0a-27d0-4562-ba3c-693b85f8cb55','af01e4c9-d050-44df-a329-32cad4c3894b','ADMIN_LOGIN','USER','af01e4c9-d050-44df-a329-32cad4c3894b',NULL,NULL,'::1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-IN) WindowsPowerShell/5.1.26100.9711','2026-10-29 06:29:56.308'),('e9aa331f-f7a4-4dff-9bff-78565060b458','af01e4c9-d050-44df-a329-32cad4c3894b','ADMIN_LOGIN','USER','af01e4c9-d050-44df-a329-32cad4c3894b',NULL,NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36','2026-10-30 11:56:41.735'),('ea6fb6c8-946d-4e1f-bfc0-4157f1e0de30','2c08498a-74b9-4ba0-bd84-adbf2eb20eea','ADMIN_LOGIN','USER','2c08498a-74b9-4ba0-bd84-adbf2eb20eea',NULL,NULL,'::1','node','2026-11-02 19:32:03.614');
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `banners`
--

DROP TABLE IF EXISTS `banners`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `banners` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `position` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'HOME_HERO',
  `city_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `display_order` int NOT NULL DEFAULT '0',
  `starts_at` datetime(3) NOT NULL,
  `ends_at` datetime(3) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `banners_is_active_position_display_order_idx` (`is_active`,`position`,`display_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `banners`
--

LOCK TABLES `banners` WRITE;
/*!40000 ALTER TABLE `banners` DISABLE KEYS */;
/*!40000 ALTER TABLE `banners` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `blocks`
--

DROP TABLE IF EXISTS `blocks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `blocks` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `blocker_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `blocked_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `blocks_blocker_id_blocked_id_key` (`blocker_id`,`blocked_id`),
  KEY `blocks_blocked_id_fkey` (`blocked_id`),
  CONSTRAINT `blocks_blocked_id_fkey` FOREIGN KEY (`blocked_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `blocks_blocker_id_fkey` FOREIGN KEY (`blocker_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `blocks`
--

LOCK TABLES `blocks` WRITE;
/*!40000 ALTER TABLE `blocks` DISABLE KEYS */;
/*!40000 ALTER TABLE `blocks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `icon_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `parent_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `categories_slug_key` (`slug`),
  KEY `categories_parent_id_is_active_display_order_idx` (`parent_id`,`is_active`,`display_order`),
  CONSTRAINT `categories_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES ('06653edc-a689-434d-9eb8-4620513bad5e','Commercial Trucks & Pickups','commercial-trucks',NULL,NULL,'86d45d89-2801-4dab-9428-3848275ac9a0',1,1,'2026-10-25 18:35:10.916','2026-10-25 18:35:10.916'),('09eee6c9-4149-4708-9850-0a737a407e70','Delivery & Logistics','delivery-jobs',NULL,NULL,'4b4129b4-f3ae-4158-afbf-18d0d25add55',4,1,'2026-10-25 18:35:11.180','2026-10-25 18:35:11.180'),('0cb14949-3374-4041-ae71-8f3290281ede','Sports Equipment','sports-equipment',NULL,NULL,'b97c1e69-c583-4742-a21c-a0f335f41214',4,1,'2026-10-25 18:35:11.020','2026-10-25 18:35:11.020'),('0cfd4314-6555-47e9-b2ff-988caa8ac4cf','BPO & Telecalling','bpo-telecaller-jobs',NULL,NULL,'4b4129b4-f3ae-4158-afbf-18d0d25add55',3,1,'2026-10-25 18:35:11.173','2026-10-25 18:35:11.173'),('19383048-6c6c-44dc-b89d-f017917be131','For Sale: Houses & Apartments','houses-apartments-for-sale',NULL,NULL,'e462ed90-72f2-45af-979a-ea1623555fb5',1,1,'2026-10-25 18:35:10.690','2026-10-25 18:35:10.690'),('19f9b20b-f3e8-4bba-828b-8ab302b4ee61','For Rent: Shops & Offices','commercial-property-rent',NULL,NULL,'e462ed90-72f2-45af-979a-ea1623555fb5',5,1,'2026-10-25 18:35:10.735','2026-10-25 18:35:10.735'),('1ba838de-d772-417d-bc1a-140dd5c14618','Tablets & iPads','tablets',NULL,NULL,'fffb6915-fd5f-4ae9-9024-9e57fc42ceb8',2,1,'2026-10-25 18:35:10.536','2026-10-25 18:35:10.536'),('1c66517f-b66e-46b5-9107-9fa49aa54d7d','Kids Fashion','kids-fashion',NULL,NULL,'1de99f0c-134f-4dac-989a-cedd1115a4a8',3,1,'2026-10-25 18:35:10.972','2026-10-25 18:35:10.972'),('1dd569aa-70b7-4e33-8b67-7d12bab161ab','Air Conditioners & Coolers','air-conditioners',NULL,NULL,'33fe5f37-2914-4342-a1d5-fd222d0b6b56',5,1,'2026-10-25 18:35:10.826','2026-10-25 18:35:10.826'),('1de99f0c-134f-4dac-989a-cedd1115a4a8','Fashion','fashion',NULL,'shirt',NULL,9,1,'2026-10-25 17:57:01.251','2026-11-02 19:51:05.676'),('248808ee-39ea-419f-aa67-9652c3e63169','Women Clothing & Handbags','women-fashion',NULL,NULL,'1de99f0c-134f-4dac-989a-cedd1115a4a8',2,1,'2026-10-25 18:35:10.964','2026-10-25 18:35:10.964'),('2d62d7b6-da0a-4b96-89ba-80f7374bb00d','Cleaning & Pest Control','cleaning-services',NULL,NULL,'6b822de7-238a-4ae1-84f1-097e1767a8d2',4,1,'2026-10-25 18:35:11.091','2026-10-25 18:35:11.091'),('33fe5f37-2914-4342-a1d5-fd222d0b6b56','Electronics & Appliances','electronics',NULL,'tv',NULL,6,1,'2026-10-25 17:57:01.110','2026-11-02 19:51:05.649'),('3594018f-bafa-4cb8-a7d0-4fc2519a010f','Pet Food & Accessories','pet-food-accessories',NULL,NULL,'ff8e0515-475d-4d48-86aa-94d165e08a8b',2,1,'2026-10-25 18:35:11.044','2026-10-25 18:35:11.044'),('3a9cd87e-f91d-42c0-8e17-fea6b520c84e','Office & Study Tables','office-furniture',NULL,NULL,'bef0a97f-27d0-4990-8671-384d7d959f2f',5,1,'2026-10-25 18:35:10.895','2026-10-25 18:35:10.895'),('3b8d95a3-0717-43ed-bbdf-eaa48c1e9e4b','Used Cars','used-cars',NULL,NULL,'6d0cea21-129a-48b8-bf11-477a2422a431',1,1,'2026-10-25 18:35:10.452','2026-10-25 18:35:10.452'),('3c550df4-efc0-4c7a-a2dd-7550ab4ba021','Office Assistant & Receptionist','office-assistant-jobs',NULL,NULL,'4b4129b4-f3ae-4158-afbf-18d0d25add55',6,1,'2026-10-25 18:35:11.195','2026-10-25 18:35:11.195'),('3d7b0201-ac54-4a2f-851a-174f67b06c2d','For Rent: Houses & Apartments','houses-apartments-for-rent',NULL,NULL,'e462ed90-72f2-45af-979a-ea1623555fb5',2,1,'2026-10-25 18:35:10.699','2026-10-25 18:35:10.699'),('40b22d68-b291-4241-bb66-e84ab130658e','Bicycles','bicycles',NULL,NULL,'f114255e-b443-406a-af82-df837a056a9f',4,1,'2026-10-25 18:35:10.623','2026-10-25 18:35:10.623'),('429f8746-c2fe-40b9-8cdf-8a48852ac377','Scooters & Activa','scooters',NULL,NULL,'f114255e-b443-406a-af82-df837a056a9f',2,1,'2026-10-25 18:35:10.605','2026-10-25 18:35:10.605'),('44706174-34af-4a68-bb16-5f0631a8c970','Mobile Phones','mobile-phones',NULL,NULL,'fffb6915-fd5f-4ae9-9024-9e57fc42ceb8',1,1,'2026-10-25 18:35:10.529','2026-10-25 18:35:10.529'),('459a1f28-aa72-4ea3-ac51-ad7b171104f4','Men Clothing & Footwear','men-fashion',NULL,NULL,'1de99f0c-134f-4dac-989a-cedd1115a4a8',1,1,'2026-10-25 18:35:10.954','2026-10-25 18:35:10.954'),('47eba90e-511f-4338-99d8-c090073296f2','Packers & Movers','packers-movers',NULL,NULL,'6b822de7-238a-4ae1-84f1-097e1767a8d2',2,1,'2026-10-25 18:35:11.075','2026-10-25 18:35:11.075'),('4b4129b4-f3ae-4158-afbf-18d0d25add55','Jobs','jobs',NULL,'briefcase',NULL,4,1,'2026-10-25 17:57:01.298','2026-11-02 19:51:05.625'),('4bf8cbab-7a0a-4392-8ad1-5bf08c383c9e','TVs, Video & Audio','tvs-audio',NULL,NULL,'33fe5f37-2914-4342-a1d5-fd222d0b6b56',1,1,'2026-10-25 18:35:10.764','2026-10-25 18:35:10.764'),('4ea5e77d-aa8d-46f9-a4af-1f89fd4726ab','Beds & Wardrobes','beds-wardrobes',NULL,NULL,'bef0a97f-27d0-4990-8671-384d7d959f2f',2,1,'2026-10-25 18:35:10.866','2026-10-25 18:35:10.866'),('516db3ea-99ca-4071-abc3-dcd1c2a27c84','Other Pet Supplies','other-pet-supplies',NULL,NULL,'ff8e0515-475d-4d48-86aa-94d165e08a8b',3,1,'2026-10-25 18:35:11.051','2026-10-25 18:35:11.051'),('546558ff-0be3-476c-93a0-b673c65b3ad5','Gym & Fitness Equipment','gym-fitness',NULL,NULL,'b97c1e69-c583-4742-a21c-a0f335f41214',2,1,'2026-10-25 18:35:11.004','2026-10-25 18:35:11.004'),('670a37c6-9d2b-4d44-9ec5-ad12ad837fab','Home Decor & Garden','home-decor',NULL,NULL,'bef0a97f-27d0-4990-8671-384d7d959f2f',3,1,'2026-10-25 18:35:10.876','2026-10-25 18:35:10.876'),('69ccd6f9-83d0-4651-bfbc-db28c6c72728','Smart Watches & Wearables','smart-watches',NULL,NULL,'fffb6915-fd5f-4ae9-9024-9e57fc42ceb8',3,1,'2026-10-25 18:35:10.543','2026-10-25 18:35:10.543'),('6b822de7-238a-4ae1-84f1-097e1767a8d2','Services','services',NULL,'wrench',NULL,12,1,'2026-10-25 17:57:01.289','2026-11-02 19:51:05.701'),('6d0cea21-129a-48b8-bf11-477a2422a431','Cars','cars','Buy and sell used and new cars','laptops',NULL,1,1,'2026-10-25 17:57:00.462','2026-11-02 19:51:05.596'),('6e923a3b-1507-41d9-b9dd-2534d578b7f2','Accessories & Chargers','mobile-accessories',NULL,NULL,'fffb6915-fd5f-4ae9-9024-9e57fc42ceb8',4,1,'2026-10-25 18:35:10.551','2026-10-25 18:35:10.551'),('76c95c96-43be-4282-9ed2-01ee1511459f','Auto Rickshaws & E-Rickshaws','auto-rickshaws',NULL,NULL,'86d45d89-2801-4dab-9428-3848275ac9a0',2,1,'2026-10-25 18:35:10.926','2026-10-25 18:35:10.926'),('78526326-de35-4643-a154-27ac26744c4c','Musical Instruments (Guitars, Keyboards)','musical-instruments',NULL,NULL,'b97c1e69-c583-4742-a21c-a0f335f41214',3,1,'2026-10-25 18:35:11.013','2026-10-25 18:35:11.013'),('7c1727c0-76a6-417a-918a-160403089d87','Asus 1','asus-1',NULL,NULL,'6d0cea21-129a-48b8-bf11-477a2422a431',0,1,'2026-11-02 20:14:07.655','2026-11-02 20:14:07.655'),('7f5e3fc7-b6ce-42f6-bc64-734856486c90','Buses & Vans','buses-vans',NULL,NULL,'86d45d89-2801-4dab-9428-3848275ac9a0',3,1,'2026-10-25 18:35:10.934','2026-10-25 18:35:10.934'),('84596e37-4394-4d70-b032-41d98fecbe53','Books & Study Materials','books',NULL,NULL,'b97c1e69-c583-4742-a21c-a0f335f41214',1,1,'2026-10-25 18:35:10.996','2026-10-25 18:35:10.996'),('864eb344-b105-4526-bde0-42fb703c285c','Home Renovation & Painting','home-renovation',NULL,NULL,'6b822de7-238a-4ae1-84f1-097e1767a8d2',3,1,'2026-10-25 18:35:11.083','2026-10-25 18:35:11.083'),('86d45d89-2801-4dab-9428-3848275ac9a0','Commercial Vehicles & Spares','commercial-vehicles',NULL,'truck',NULL,7,1,'2026-10-25 17:57:01.139','2026-11-02 19:51:05.658'),('89ef945c-d96d-4e38-a564-b64a1d53b7da','Driver & Chauffeur','driver-jobs',NULL,NULL,'4b4129b4-f3ae-4158-afbf-18d0d25add55',5,1,'2026-10-25 18:35:11.188','2026-10-25 18:35:11.188'),('8e5d2e17-fe6d-4ef8-aa00-c6fe6a39c905','Data Entry & Back Office','data-entry-jobs',NULL,NULL,'4b4129b4-f3ae-4158-afbf-18d0d25add55',1,1,'2026-10-25 18:35:11.151','2026-10-25 18:35:11.151'),('916866c0-8079-4949-aab0-6c7ad94721f2','Electric Two-Wheelers','electric-bikes',NULL,NULL,'f114255e-b443-406a-af82-df837a056a9f',3,1,'2026-10-25 18:35:10.615','2026-10-25 18:35:10.615'),('973cc1fe-7c9e-4401-a7a1-be3d63305e69','Fishes & Aquariums','fishes-aquarium',NULL,NULL,'ff8e0515-475d-4d48-86aa-94d165e08a8b',1,1,'2026-10-25 18:35:11.036','2026-10-25 18:35:11.036'),('9e24870c-bbe8-42e9-92bf-e2edf88e7de6','Motorcycles','motorcycles',NULL,NULL,'f114255e-b443-406a-af82-df837a056a9f',1,1,'2026-10-25 18:35:10.594','2026-10-25 18:35:10.594'),('a4c514a9-ee1f-4fad-989a-9283200d6344','Electronics & Appliance Repair','electronics-repair',NULL,NULL,'6b822de7-238a-4ae1-84f1-097e1767a8d2',1,1,'2026-10-25 18:35:11.068','2026-10-25 18:35:11.068'),('ad0fe9cc-f6b5-415a-ae49-1a65a88d8aed','Refrigerators & Washing Machines','refrigerators-washing-machines',NULL,NULL,'33fe5f37-2914-4342-a1d5-fd222d0b6b56',6,1,'2026-10-25 18:35:10.835','2026-10-25 18:35:10.835'),('b20b7f8a-957c-462d-a818-df6c00a8d253','Kids Furniture','kids-furniture',NULL,NULL,'bef0a97f-27d0-4990-8671-384d7d959f2f',4,1,'2026-10-25 18:35:10.885','2026-10-25 18:35:10.885'),('b97c1e69-c583-4742-a21c-a0f335f41214','Books, Sports & Hobbies','books-sports-hobbies',NULL,'book-open',NULL,10,1,'2026-10-25 17:57:01.261','2026-11-02 19:51:05.684'),('bd522018-67cb-4364-a6d9-f3fee7d8f4ed','Lands & Plots','lands-plots',NULL,NULL,'e462ed90-72f2-45af-979a-ea1623555fb5',3,1,'2026-10-25 18:35:10.710','2026-10-25 18:35:10.710'),('bef0a97f-27d0-4990-8671-384d7d959f2f','Furniture','furniture',NULL,'armchair',NULL,8,1,'2026-10-25 17:57:01.148','2026-11-02 19:51:05.667'),('cab5495e-4b24-4fe1-b07e-aa06b75283da','Car Spare Parts & Accessories','car-spares',NULL,NULL,'6d0cea21-129a-48b8-bf11-477a2422a431',3,1,'2026-10-25 18:35:10.469','2026-10-25 18:35:10.469'),('d18d89d4-d9a1-48f8-9eff-e5c65c5e868f','Commercial & Other Vehicles','commercial-cars',NULL,NULL,'6d0cea21-129a-48b8-bf11-477a2422a431',2,1,'2026-10-25 18:35:10.460','2026-10-25 18:35:10.460'),('d1b050b4-cb1b-467e-9aca-30ba8586f0b1','bn intelhub','none','testing 0001','test',NULL,12,1,'2026-10-30 11:57:06.557','2026-10-30 11:57:06.557'),('d4688f76-a421-413a-8352-3500188df0f0','PG & Guest Houses','pg-guest-houses',NULL,NULL,'e462ed90-72f2-45af-979a-ea1623555fb5',4,1,'2026-10-25 18:35:10.719','2026-10-25 18:35:10.719'),('d697a598-b4c1-4782-8fb7-9242b64059b1','Computers & Laptops','computers-laptops',NULL,NULL,'33fe5f37-2914-4342-a1d5-fd222d0b6b56',3,1,'2026-10-25 18:35:10.798','2026-10-25 18:35:10.798'),('d72173b9-1764-4093-bb43-184521f8b8f9','Kitchen & Home Appliances','kitchen-appliances',NULL,NULL,'33fe5f37-2914-4342-a1d5-fd222d0b6b56',2,1,'2026-10-25 18:35:10.775','2026-10-25 18:35:10.775'),('db1ea516-8baf-4f78-a1b1-29c09a6090db','Car & Bike Services','vehicle-repair-services',NULL,NULL,'6b822de7-238a-4ae1-84f1-097e1767a8d2',5,1,'2026-10-25 18:35:11.099','2026-10-25 18:35:11.099'),('e283ffe8-5608-42f0-8ac0-aaac265dc52a','Sales & Marketing','sales-marketing-jobs',NULL,NULL,'4b4129b4-f3ae-4158-afbf-18d0d25add55',2,1,'2026-10-25 18:35:11.159','2026-10-25 18:35:11.159'),('e2bd9bc1-3a7b-4956-b348-59cc5c44edbc','Spare Parts & Helmets','bike-spare-parts',NULL,NULL,'f114255e-b443-406a-af82-df837a056a9f',5,1,'2026-10-25 18:35:10.631','2026-10-25 18:35:10.631'),('e462ed90-72f2-45af-979a-ea1623555fb5','Properties','properties',NULL,'home',NULL,2,1,'2026-10-25 17:57:00.929','2026-11-02 19:51:05.609'),('ebae8b29-c6c0-4cfc-92e1-a5ffaf8a3e85','Watches & Jewelry','watches-jewelry',NULL,NULL,'1de99f0c-134f-4dac-989a-cedd1115a4a8',4,1,'2026-10-25 18:35:10.980','2026-10-25 18:35:10.980'),('f114255e-b443-406a-af82-df837a056a9f','Bikes','bikes',NULL,'bike',NULL,5,1,'2026-10-25 17:57:00.828','2026-11-02 19:51:05.639'),('f2ad9274-6597-4d1f-a38d-87e7ac3e95b5','Cameras & Lenses','cameras-lenses',NULL,NULL,'33fe5f37-2914-4342-a1d5-fd222d0b6b56',4,1,'2026-10-25 18:35:10.811','2026-10-25 18:35:10.811'),('faccf51d-cbaf-44a0-a0a4-202d5a6432bb','Cook & Hospitality','cook-hospitality-jobs',NULL,NULL,'4b4129b4-f3ae-4158-afbf-18d0d25add55',7,1,'2026-10-25 18:35:11.202','2026-10-25 18:35:11.202'),('fc4c6f03-aec4-4ffe-af2f-02de17d3d0d0','Sofa & Dining Sets','sofa-dining',NULL,NULL,'bef0a97f-27d0-4990-8671-384d7d959f2f',1,1,'2026-10-25 18:35:10.856','2026-10-25 18:35:10.856'),('ff8e0515-475d-4d48-86aa-94d165e08a8b','Pets','pets',NULL,'paw-print',NULL,11,1,'2026-10-25 17:57:01.276','2026-11-02 19:51:05.692'),('fffb6915-fd5f-4ae9-9024-9e57fc42ceb8','Mobiles','mobiles',NULL,'smartphone',NULL,3,1,'2026-10-25 17:57:00.692','2026-11-02 19:51:05.617');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `category_attributes`
--

DROP TABLE IF EXISTS `category_attributes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `category_attributes` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `key` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('TEXT','NUMBER','BOOLEAN','SELECT','MULTI_SELECT','DATE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `options` json DEFAULT NULL,
  `is_required` tinyint(1) NOT NULL DEFAULT '0',
  `is_filterable` tinyint(1) NOT NULL DEFAULT '1',
  `unit` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `display_label` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `validation_rules` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `category_attributes_category_id_key_key` (`category_id`,`key`),
  KEY `category_attributes_category_id_is_filterable_idx` (`category_id`,`is_filterable`),
  CONSTRAINT `category_attributes_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `category_attributes`
--

LOCK TABLES `category_attributes` WRITE;
/*!40000 ALTER TABLE `category_attributes` DISABLE KEYS */;
INSERT INTO `category_attributes` VALUES ('04fe396a-6c05-4f76-81c2-4c3131b5bfb4','6d0cea21-129a-48b8-bf11-477a2422a431','Year of Manufacture','year','NUMBER',NULL,1,1,NULL,2,'2026-10-25 17:57:00.579','2026-10-25 18:35:10.395',NULL,NULL),('0dc99f27-d6d7-49e7-8fe1-b2bce21d3671','33fe5f37-2914-4342-a1d5-fd222d0b6b56','Device Condition','condition','SELECT','[\"Brand New\", \"Like New\", \"Used - Normal\"]',1,1,NULL,1,'2026-10-25 17:57:01.130','2026-10-25 18:35:10.754',NULL,NULL),('0fb8c109-a30e-4b96-a5a5-6dbd465ae58e','f114255e-b443-406a-af82-df837a056a9f','Year of Registration','year','NUMBER',NULL,1,1,NULL,2,'2026-10-25 17:57:00.866','2026-10-25 18:35:10.576',NULL,NULL),('0ff70841-5ca9-45de-b583-9b93a807c53e','fffb6915-fd5f-4ae9-9024-9e57fc42ceb8','Original Bill & Box Available','bill_box','BOOLEAN',NULL,0,1,NULL,5,'2026-10-25 18:35:10.521','2026-10-25 18:35:10.521',NULL,NULL),('10fe8de2-3a6e-4ecc-846b-f7fcbd5fab2f','bef0a97f-27d0-4990-8671-384d7d959f2f','Type','furniture_type','SELECT','[\"Sofa & Dining\", \"Beds & Wardrobes\", \"Home Decor & Garden\", \"Office Furniture\"]',1,1,NULL,1,'2026-10-25 17:57:01.180','2026-10-25 17:57:01.180',NULL,NULL),('1295bbe6-1e8a-4a98-b132-d717d37d1ee6','6d0cea21-129a-48b8-bf11-477a2422a431','KM Driven','kms_driven','NUMBER',NULL,1,1,'KM',5,'2026-10-25 17:57:00.659','2026-10-25 18:35:10.428',NULL,NULL),('2515e025-c7c5-4825-aa13-c7a28668839c','e462ed90-72f2-45af-979a-ea1623555fb5','Super Builtup Area','sqft','NUMBER',NULL,0,1,'Sq.Ft',3,'2026-10-25 17:57:01.090','2026-10-25 18:35:10.672',NULL,NULL),('2fd6ef33-53df-4598-a1d0-3d8cba327f33','6d0cea21-129a-48b8-bf11-477a2422a431','Fuel Type','fuel_type','SELECT','[\"Petrol\", \"Diesel\", \"CNG\", \"Electric\", \"Hybrid\"]',1,1,NULL,3,'2026-10-25 17:57:00.614','2026-10-25 18:35:10.403',NULL,NULL),('49551fef-da6d-48fc-a416-7e441d7674cc','33fe5f37-2914-4342-a1d5-fd222d0b6b56','Type','device_type','SELECT','[\"Laptops & Computers\", \"TVs, Video & Audio\", \"Kitchen Appliances\", \"Cameras & Lenses\", \"ACs & Coolers\"]',1,1,NULL,1,'2026-10-25 17:57:01.121','2026-10-25 17:57:01.121',NULL,NULL),('5c3a51a4-fa33-42c1-bda9-f3fdbbef7ebb','4b4129b4-f3ae-4158-afbf-18d0d25add55','Salary Period','salary_period','SELECT','[\"Hourly\", \"Monthly\", \"Yearly\"]',1,1,NULL,1,'2026-10-25 18:35:11.117','2026-10-25 18:35:11.117',NULL,NULL),('5cfd8e13-b79d-4e34-9319-c59e2c57bd83','e462ed90-72f2-45af-979a-ea1623555fb5','Bedrooms (BHK)','bhk','SELECT','[\"1 RK / Studio\", \"1 BHK\", \"2 BHK\", \"3 BHK\", \"4+ BHK\"]',0,1,NULL,1,'2026-10-25 17:57:00.959','2026-10-25 18:35:10.651',NULL,NULL),('65e6c25b-c29b-4faf-b711-ad52da8044db','fffb6915-fd5f-4ae9-9024-9e57fc42ceb8','RAM Capacity','ram','SELECT','[\"3 GB\", \"4 GB\", \"6 GB\", \"8 GB\", \"12 GB\", \"16 GB\"]',0,1,NULL,3,'2026-10-25 17:57:00.804','2026-10-25 18:35:10.505',NULL,NULL),('67224047-ebfc-410f-a2ef-b85cb52970c6','6d0cea21-129a-48b8-bf11-477a2422a431','Transmission','transmission','SELECT','[\"Manual\", \"Automatic\"]',1,1,NULL,4,'2026-10-25 17:57:00.644','2026-10-25 18:35:10.418',NULL,NULL),('6cafe576-e142-4891-82d1-8e8fa6d7ce4b','f114255e-b443-406a-af82-df837a056a9f','Brand','brand','SELECT','[\"Hero\", \"Bajaj\", \"Honda\", \"Royal Enfield\", \"TVS\", \"Yamaha\", \"KTM\", \"Suzuki\", \"Ather\", \"Ola Electric\"]',1,1,NULL,1,'2026-10-25 17:57:00.848','2026-10-25 18:35:10.568',NULL,NULL),('6cfc21ea-cd70-467b-93de-c698daa3db92','f114255e-b443-406a-af82-df837a056a9f','Type','bike_type','SELECT','[\"Motorcycles\", \"Scooters\", \"Electric Bikes\", \"Bicycles\"]',1,1,NULL,1,'2026-10-25 17:57:00.840','2026-10-25 17:57:00.840',NULL,NULL),('77cef779-c296-4614-b40e-e0a41c082c4e','6d0cea21-129a-48b8-bf11-477a2422a431','Brand','brand','SELECT','[\"Maruti Suzuki\", \"Hyundai\", \"Tata\", \"Mahindra\", \"Honda\", \"Toyota\", \"Kia\", \"Volkswagen\", \"Skoda\", \"MG\", \"BMW\", \"Mercedes-Benz\"]',1,1,NULL,1,'2026-10-25 17:57:00.528','2026-10-25 18:35:10.383',NULL,NULL),('7b83c20e-cf1c-41d9-9498-6f1ed6659a00','4b4129b4-f3ae-4158-afbf-18d0d25add55','Salary From (₹)','salary_from','NUMBER',NULL,0,1,'INR',3,'2026-10-25 18:35:11.135','2026-10-25 18:35:11.135',NULL,NULL),('818e63a8-9b92-4577-bc38-916a7324fc71','f114255e-b443-406a-af82-df837a056a9f','KM Driven','kms_driven','NUMBER',NULL,1,1,'KM',3,'2026-10-25 17:57:00.897','2026-10-25 18:35:10.584',NULL,NULL),('81e5cb85-3833-4c9a-ba49-ba7efd622a64','4b4129b4-f3ae-4158-afbf-18d0d25add55','Position Type','position_type','SELECT','[\"Full-time\", \"Part-time\", \"Contract\", \"Temporary\"]',1,1,NULL,2,'2026-10-25 18:35:11.126','2026-10-25 18:35:11.126',NULL,NULL),('9441d301-711b-479c-b84a-faf8fea142e1','fffb6915-fd5f-4ae9-9024-9e57fc42ceb8','Battery Health Percentage','battery_health_pct','NUMBER',NULL,0,1,'%',6,'2026-10-25 18:42:15.021','2026-10-25 18:42:15.021',NULL,NULL),('a2d78f72-9191-486a-81bc-4a23dc09f78a','fffb6915-fd5f-4ae9-9024-9e57fc42ceb8','Internal Storage','storage','SELECT','[\"32 GB\", \"64 GB\", \"128 GB\", \"256 GB\", \"512 GB\", \"1 TB\"]',1,1,NULL,2,'2026-10-25 17:57:00.732','2026-10-25 18:35:10.497',NULL,NULL),('a6118151-6dea-4261-9f4f-4c5836db93da','fffb6915-fd5f-4ae9-9024-9e57fc42ceb8','Physical Condition','condition','SELECT','[\"Brand New (Unopened)\", \"Like New\", \"Used - Excellent\", \"Used - Good\", \"Used - Fair\"]',1,1,NULL,4,'2026-10-25 17:57:00.817','2026-10-25 18:35:10.513',NULL,NULL),('af8c25b5-4761-467d-897e-debcb6b7b5a9','e462ed90-72f2-45af-979a-ea1623555fb5','Type','property_type','SELECT','[\"For Sale: Houses & Apartments\", \"For Rent: Houses & Apartments\", \"Lands & Plots\", \"PG & Guest Houses\"]',1,1,NULL,1,'2026-10-25 17:57:00.943','2026-10-25 17:57:00.943',NULL,NULL),('b66b395b-5754-49bc-a4e3-5d8fa64fa180','e462ed90-72f2-45af-979a-ea1623555fb5','Car Parking Available','car_parking','BOOLEAN',NULL,0,1,NULL,4,'2026-10-25 18:35:10.682','2026-10-25 18:35:10.682',NULL,NULL),('b8ab2054-7983-4c0f-bca8-8c10ef617f29','e462ed90-72f2-45af-979a-ea1623555fb5','Furnishing State','furnishing','SELECT','[\"Fully Furnished\", \"Semi-Furnished\", \"Unfurnished\"]',0,1,NULL,2,'2026-10-25 17:57:00.969','2026-10-25 18:35:10.663',NULL,NULL),('bcb80363-2fa8-4bd0-96a8-c2896075b13b','4b4129b4-f3ae-4158-afbf-18d0d25add55','Salary To (₹)','salary_to','NUMBER',NULL,0,1,'INR',4,'2026-10-25 18:35:11.144','2026-10-25 18:35:11.144',NULL,NULL),('c4637a61-5a18-472f-9b51-296996b01dda','fffb6915-fd5f-4ae9-9024-9e57fc42ceb8','Brand','brand','SELECT','[\"Apple\", \"Samsung\", \"Xiaomi\", \"OnePlus\", \"Vivo\", \"Oppo\", \"Realme\", \"Google\", \"Motorola\", \"Nothing\"]',1,1,NULL,1,'2026-10-25 17:57:00.716','2026-10-25 18:35:10.487',NULL,NULL),('dda42216-b654-4e8c-b9c8-40721e2dcc0a','6d0cea21-129a-48b8-bf11-477a2422a431','Insurance Validity','insurance','SELECT','[\"Comprehensive\", \"Third Party\", \"Expired\"]',0,0,NULL,7,'2026-10-25 18:35:10.444','2026-10-25 18:35:10.444',NULL,NULL),('ec5d185c-ddaa-41ae-a461-7883b114be79','6d0cea21-129a-48b8-bf11-477a2422a431','No. of Owners','owners','SELECT','[\"1st\", \"2nd\", \"3rd\", \"4th+\"]',0,1,NULL,6,'2026-10-25 17:57:00.679','2026-10-25 18:35:10.436',NULL,NULL);
/*!40000 ALTER TABLE `category_attributes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `conversations`
--

DROP TABLE IF EXISTS `conversations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `conversations` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ad_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `buyer_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `seller_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_message_text` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_message_at` datetime(3) DEFAULT NULL,
  `buyer_unread_count` int NOT NULL DEFAULT '0',
  `seller_unread_count` int NOT NULL DEFAULT '0',
  `is_blocked` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `conversations_ad_id_buyer_id_seller_id_key` (`ad_id`,`buyer_id`,`seller_id`),
  KEY `conversations_buyer_id_last_message_at_idx` (`buyer_id`,`last_message_at`),
  KEY `conversations_seller_id_last_message_at_idx` (`seller_id`,`last_message_at`),
  CONSTRAINT `conversations_ad_id_fkey` FOREIGN KEY (`ad_id`) REFERENCES `ads` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `conversations_buyer_id_fkey` FOREIGN KEY (`buyer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `conversations_seller_id_fkey` FOREIGN KEY (`seller_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `conversations`
--

LOCK TABLES `conversations` WRITE;
/*!40000 ALTER TABLE `conversations` DISABLE KEYS */;
INSERT INTO `conversations` VALUES ('15a63f1b-f7ab-4f55-94a6-abbe5f49681d','d6dd5147-cad7-45bb-9b85-9f2673b2e640','90127e9a-2353-4686-8d25-8785682c2407','af01e4c9-d050-44df-a329-32cad4c3894b','What is your final price?','2026-10-29 07:38:08.858',0,0,0,'2026-10-29 07:24:57.124','2026-11-01 15:51:45.831'),('1c96cbeb-bc59-4b21-b86c-4c41fdf1106e','783068fd-1ad1-45be-95ae-d16913af78ac','90127e9a-2353-4686-8d25-8785682c2407','af01e4c9-d050-44df-a329-32cad4c3894b','Hi, is this still available?','2026-10-29 07:24:32.402',0,0,0,'2026-10-29 07:24:32.404','2026-11-01 15:51:44.418'),('2c9ff18b-80e8-4b2c-8443-2b9414ca67dc','aa211ce6-3cc3-4f1f-bd62-7dd3ab5703df','b354d4aa-dbf3-4504-9840-eaa1ee692c73','37c9d82d-f727-4836-8c8d-dacc713b40ac','Hello! Is this Maruti Swift still available for test drive?','2026-10-29 06:24:56.555',0,1,0,'2026-10-29 06:24:56.557','2026-10-29 06:24:56.557'),('380ff19b-1cff-49fb-b011-6936136185c5','31380c3c-9871-414f-84cc-804ed104c105','2a06ff30-e301-494c-aef2-6aa0e67ab2b5','f46501f8-a4e4-4693-a0b9-09618a3de3ba','Hello! Is this Maruti Swift still available for test drive?','2026-10-29 06:24:34.977',0,1,0,'2026-10-29 06:24:34.978','2026-10-29 06:24:34.978'),('8696e870-4640-4e80-97d1-f60d2a4904d5','6c9f908f-84c7-47fe-be4a-98e3d23cca0e','ddca74e3-46f6-42b0-89f3-77a9aeec16fe','faced429-b663-4d0b-8649-eb8d3f8f36d0','Hello! Is this Maruti Swift still available for test drive?','2026-10-29 06:25:13.380',0,1,0,'2026-10-29 06:25:13.382','2026-10-29 06:25:13.382'),('8cd56173-276a-4dd9-af2e-a01fe71ef8b9','77e39586-b269-4edc-b930-ee77c4cccc12','84f517c6-645b-4e53-be8d-850d58077143','ccbf588a-7846-4786-987b-33e9fde9ae7e','Hello! Is this Maruti Swift still available for test drive?','2026-10-29 06:42:04.131',0,1,0,'2026-10-29 06:42:04.133','2026-10-29 06:42:04.133'),('94a8552e-e634-40ea-a52f-bfd5ca2e2574','d2f88000-730e-4f7a-90af-8dad2bb6c119','8676dee0-87ee-4747-b49e-5a7ddecc4104','9bac6b71-0008-41ea-be6d-02faf96598ce','Hello! Is this Maruti Swift still available for test drive?','2026-10-29 06:33:35.526',0,1,0,'2026-10-29 06:33:35.526','2026-10-29 06:33:35.526'),('a10048b5-a9b1-45ee-a7fb-4b1977f97b96','575adcc2-6fc4-4059-bde2-c80bd3cd8d0c','a32b726c-20d5-42b9-a222-5fd6c86e2b11','c7aac895-b00c-4133-b89f-1b39469fd3bd','Hello! Is this Maruti Swift still available for test drive?','2026-10-29 06:13:08.057',0,1,0,'2026-10-29 06:13:08.059','2026-10-29 06:13:08.059'),('a73854f5-fd3d-4899-893a-ae41c4a3c345','14546635-8b20-4971-bdf5-61a4a9277a4b','ee82356b-a62b-4d79-8d65-3af7a0e1457a','686dc494-cea3-4b59-9b75-5b05cd8599e6','Hello! Is this Maruti Swift still available for test drive?','2026-10-29 06:34:54.706',0,1,0,'2026-10-29 06:34:54.708','2026-10-29 06:34:54.708'),('cfbc69bd-dcdf-49b3-9624-365ab3fd662a','e3cfdd2a-44bf-4339-9f56-9bdbe59cfe1f','de8ac6ff-6a99-46bc-b975-8676d2702328','af01e4c9-d050-44df-a329-32cad4c3894b','hiii','2026-10-29 07:37:49.520',1,0,0,'2026-10-26 02:45:34.426','2026-11-01 15:51:43.067'),('e4607095-1c55-4015-9514-11939a8b3b4c','9119c067-8d01-41f7-9c10-049eb480cd8a','b1dea116-c719-43ea-a516-3d4aa94a4592','13206bdf-dcef-4200-818d-4f635d0d03e4','Hello! Is this Maruti Swift still available for test drive?','2026-10-29 06:29:20.380',0,1,0,'2026-10-29 06:29:20.382','2026-10-29 06:29:20.382'),('efdc0167-6dee-487c-98d5-b2461bb86291','5b02a7a8-497e-4163-b61e-7ddcf1fccd5d','3322e8a6-3250-40ac-8c5c-b7522581680b','4145fb0f-d60c-4e5d-9b36-72e73532d300','Hello! Is this Maruti Swift still available for test drive?','2026-10-29 06:41:23.371',0,1,0,'2026-10-29 06:41:23.373','2026-10-29 06:41:23.373');
/*!40000 ALTER TABLE `conversations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `favourites`
--

DROP TABLE IF EXISTS `favourites`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `favourites` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ad_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `favourites_user_id_ad_id_key` (`user_id`,`ad_id`),
  KEY `favourites_user_id_created_at_idx` (`user_id`,`created_at`),
  KEY `favourites_ad_id_fkey` (`ad_id`),
  CONSTRAINT `favourites_ad_id_fkey` FOREIGN KEY (`ad_id`) REFERENCES `ads` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `favourites_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `favourites`
--

LOCK TABLES `favourites` WRITE;
/*!40000 ALTER TABLE `favourites` DISABLE KEYS */;
INSERT INTO `favourites` VALUES ('2938f34f-38dd-45d7-8a0c-b29b3b21250e','faced429-b663-4d0b-8649-eb8d3f8f36d0','6c9f908f-84c7-47fe-be4a-98e3d23cca0e','2026-10-29 06:25:13.274'),('316e551b-4f8a-4ceb-bf44-ae93ca8961f4','90127e9a-2353-4686-8d25-8785682c2407','783068fd-1ad1-45be-95ae-d16913af78ac','2026-10-29 07:24:30.566'),('44c19337-6362-40dd-981e-42143de5f832','13206bdf-dcef-4200-818d-4f635d0d03e4','9119c067-8d01-41f7-9c10-049eb480cd8a','2026-10-29 06:29:20.279'),('5bcc3ba7-f4b6-4eac-96cf-e2aab027f407','9bac6b71-0008-41ea-be6d-02faf96598ce','d2f88000-730e-4f7a-90af-8dad2bb6c119','2026-10-29 06:33:35.453'),('6f783bc9-43a1-430b-a33f-bc55cc9a7a08','c7aac895-b00c-4133-b89f-1b39469fd3bd','575adcc2-6fc4-4059-bde2-c80bd3cd8d0c','2026-10-29 06:13:07.988'),('879fdc87-0336-4aac-b326-bb9018b26f1e','f46501f8-a4e4-4693-a0b9-09618a3de3ba','31380c3c-9871-414f-84cc-804ed104c105','2026-10-29 06:24:34.862'),('89c3536b-7527-4f02-bbfa-bf7097240756','37c9d82d-f727-4836-8c8d-dacc713b40ac','aa211ce6-3cc3-4f1f-bd62-7dd3ab5703df','2026-10-29 06:24:56.470'),('db28ea18-4fdc-4ec7-8d7a-9260db760434','686dc494-cea3-4b59-9b75-5b05cd8599e6','14546635-8b20-4971-bdf5-61a4a9277a4b','2026-10-29 06:34:54.600'),('ddb531f4-c968-4d27-8589-d2e12a35f3ba','90127e9a-2353-4686-8d25-8785682c2407','05e57cfa-95ac-4992-985f-440418e35b17','2026-10-29 07:24:22.694'),('e03783ab-4aed-4c9a-a8cc-5bdee26c4176','4145fb0f-d60c-4e5d-9b36-72e73532d300','5b02a7a8-497e-4163-b61e-7ddcf1fccd5d','2026-10-29 06:41:23.299'),('faf63fe9-8b50-48cf-a783-72580d477e86','ccbf588a-7846-4786-987b-33e9fde9ae7e','77e39586-b269-4edc-b930-ee77c4cccc12','2026-10-29 06:42:04.060');
/*!40000 ALTER TABLE `favourites` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `featured_ads`
--

DROP TABLE IF EXISTS `featured_ads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `featured_ads` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ad_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('FEATURED','URGENT','HOME_SPOTLIGHT') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'FEATURED',
  `status` enum('PENDING','ACTIVE','EXPIRED','CANCELLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `starts_at` datetime(3) NOT NULL,
  `ends_at` datetime(3) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `featured_ads_ad_id_status_ends_at_idx` (`ad_id`,`status`,`ends_at`),
  CONSTRAINT `featured_ads_ad_id_fkey` FOREIGN KEY (`ad_id`) REFERENCES `ads` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `featured_ads`
--

LOCK TABLES `featured_ads` WRITE;
/*!40000 ALTER TABLE `featured_ads` DISABLE KEYS */;
/*!40000 ALTER TABLE `featured_ads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `locations`
--

DROP TABLE IF EXISTS `locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `locations` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `parent_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `latitude` double NOT NULL,
  `longitude` double NOT NULL,
  `pincode` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `locations_slug_parent_id_key` (`slug`,`parent_id`),
  KEY `locations_type_parent_id_idx` (`type`,`parent_id`),
  KEY `locations_latitude_longitude_idx` (`latitude`,`longitude`),
  KEY `locations_parent_id_fkey` (`parent_id`),
  CONSTRAINT `locations_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `locations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `locations`
--

LOCK TABLES `locations` WRITE;
/*!40000 ALTER TABLE `locations` DISABLE KEYS */;
INSERT INTO `locations` VALUES ('30f223bf-c750-4834-a824-a42f145e7cbc','Chennai','chennai',NULL,'CITY',13.0827,80.2707,NULL,'2026-10-25 17:57:00.350','2026-10-25 17:57:00.350',1),('32105324-cb51-410a-a055-7249508ad483','Indore','indore',NULL,'CITY',22.7196,75.8577,NULL,'2026-10-25 17:57:00.426','2026-10-25 17:57:00.426',1),('33c6ec7b-7d97-4717-afec-0d3f17884b22','Delhi NCR','delhi',NULL,'CITY',28.7041,77.1025,NULL,'2026-10-25 17:57:00.301','2026-10-25 17:57:00.301',1),('48409ef8-6229-4e70-9304-903ca97810ad','Hyderabad','hyderabad',NULL,'CITY',17.385,78.4867,NULL,'2026-10-25 17:57:00.326','2026-10-25 17:57:00.326',1),('4c5f278f-9e2c-4a55-85c2-c4477fefa6a1','Kolkata','kolkata',NULL,'CITY',22.5726,88.3639,NULL,'2026-10-25 17:57:00.369','2026-10-25 17:57:00.369',1),('4cfac405-71bc-4c2d-abff-a63594647438','Chandigarh','chandigarh',NULL,'CITY',30.7333,76.7794,NULL,'2026-10-25 18:35:10.317','2026-10-25 18:35:10.317',1),('796a65c0-aca5-4b2a-86db-6cb3014be4a1','Lucknow','lucknow',NULL,'CITY',26.8467,80.9462,NULL,'2026-10-25 18:35:10.361','2026-10-25 18:35:10.361',1),('7e53dfde-c7ab-47ba-8cfa-e4d61855211b','Mumbai','mumbai',NULL,'CITY',19.076,72.8777,NULL,'2026-10-25 17:57:00.283','2026-10-25 17:57:00.283',1),('8d94b77c-9de5-4c86-9224-6c4170ca10af','Pune','pune',NULL,'CITY',18.5204,73.8567,NULL,'2026-10-25 17:57:00.385','2026-10-25 17:57:00.385',1),('bbeda2b3-5450-422d-9d14-83e6b49a50dc','Ahmedabad','ahmedabad',NULL,'CITY',23.0225,72.5714,NULL,'2026-10-25 17:57:00.405','2026-10-25 17:57:00.405',1),('c6b5df13-3fa6-424c-a37a-12676bbc2ac7','Jaipur','jaipur',NULL,'CITY',26.9124,75.7873,NULL,'2026-10-25 17:57:00.416','2026-10-25 17:57:00.416',1),('d9ed3d56-38fa-47eb-97a9-952d16641455','Ranchi, Jharkhand','ranchi',NULL,'CITY',23.3441,85.3096,NULL,'2026-10-26 06:12:54.009','2026-10-26 06:12:54.009',1),('ef84e3aa-8dce-49ca-99cd-39ad93bb4b68','Bengaluru','bengaluru',NULL,'CITY',12.9716,77.5946,NULL,'2026-10-25 17:57:00.269','2026-10-25 17:57:00.269',1);
/*!40000 ALTER TABLE `locations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `messages`
--

DROP TABLE IF EXISTS `messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `messages` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `conversation_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sender_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('TEXT','IMAGE','LOCATION','SYSTEM_NOTICE') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'TEXT',
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `attachment_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('SENT','DELIVERED','READ') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'SENT',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `messages_conversation_id_created_at_idx` (`conversation_id`,`created_at`),
  KEY `messages_sender_id_fkey` (`sender_id`),
  CONSTRAINT `messages_conversation_id_fkey` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `messages_sender_id_fkey` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `messages`
--

LOCK TABLES `messages` WRITE;
/*!40000 ALTER TABLE `messages` DISABLE KEYS */;
INSERT INTO `messages` VALUES ('0336dee3-c546-495f-8bff-0f4b86b11cb7','a73854f5-fd3d-4899-893a-ae41c4a3c345','ee82356b-a62b-4d79-8d65-3af7a0e1457a','TEXT','Hello! Is this Maruti Swift still available for test drive?',NULL,'SENT','2026-10-29 06:34:54.708'),('061d1924-6ea5-4f94-8598-5f7b0c7172d5','94a8552e-e634-40ea-a52f-bfd5ca2e2574','8676dee0-87ee-4747-b49e-5a7ddecc4104','TEXT','Hello! Is this Maruti Swift still available for test drive?',NULL,'SENT','2026-10-29 06:33:35.526'),('26a5d326-6b5c-425b-bbbe-fafa9ffd7744','15a63f1b-f7ab-4f55-94a6-abbe5f49681d','af01e4c9-d050-44df-a329-32cad4c3894b','TEXT','What is your final price?',NULL,'READ','2026-10-29 07:38:04.084'),('4f38c425-95ed-4ea8-a919-0ca8951c9bfa','e4607095-1c55-4015-9514-11939a8b3b4c','b1dea116-c719-43ea-a516-3d4aa94a4592','TEXT','Hello! Is this Maruti Swift still available for test drive?',NULL,'SENT','2026-10-29 06:29:20.382'),('52c85d86-494a-438e-9ca1-d22fe952da91','15a63f1b-f7ab-4f55-94a6-abbe5f49681d','af01e4c9-d050-44df-a329-32cad4c3894b','TEXT','What is your final price?',NULL,'READ','2026-10-29 07:38:08.535'),('5a1d6d9d-7dd2-4392-963c-01ad41cde3f0','15a63f1b-f7ab-4f55-94a6-abbe5f49681d','af01e4c9-d050-44df-a329-32cad4c3894b','TEXT','What is your final price?',NULL,'READ','2026-10-29 07:38:02.315'),('5b976aac-f721-42b0-b08c-ebfa9c10878e','cfbc69bd-dcdf-49b3-9624-365ab3fd662a','af01e4c9-d050-44df-a329-32cad4c3894b','TEXT','hiii',NULL,'SENT','2026-10-29 07:37:48.755'),('70c77b58-67a4-4682-bef5-7ccd24a5a5c1','1c96cbeb-bc59-4b21-b86c-4c41fdf1106e','90127e9a-2353-4686-8d25-8785682c2407','TEXT','Hi, is this still available?',NULL,'READ','2026-10-29 07:24:32.404'),('7b717143-7520-44ba-b68a-b809ab3d8cfb','8696e870-4640-4e80-97d1-f60d2a4904d5','ddca74e3-46f6-42b0-89f3-77a9aeec16fe','TEXT','Hello! Is this Maruti Swift still available for test drive?',NULL,'SENT','2026-10-29 06:25:13.382'),('8a7d1292-65f4-46d2-aff7-d5b80ec4b407','15a63f1b-f7ab-4f55-94a6-abbe5f49681d','90127e9a-2353-4686-8d25-8785682c2407','TEXT','Hi, is this still available?',NULL,'READ','2026-10-29 07:24:57.124'),('8bebc621-cca3-4876-a7c7-7e56e362b729','2c9ff18b-80e8-4b2c-8443-2b9414ca67dc','b354d4aa-dbf3-4504-9840-eaa1ee692c73','TEXT','Hello! Is this Maruti Swift still available for test drive?',NULL,'SENT','2026-10-29 06:24:56.557'),('b0c339eb-3b0e-4da4-86c0-cf1f1855198f','cfbc69bd-dcdf-49b3-9624-365ab3fd662a','de8ac6ff-6a99-46bc-b975-8676d2702328','TEXT','Yes, can we meet in Bengaluru for inspection?',NULL,'READ','2026-10-26 02:45:34.444'),('cf9270f0-a467-4cd9-ab63-0e00880d22d8','15a63f1b-f7ab-4f55-94a6-abbe5f49681d','af01e4c9-d050-44df-a329-32cad4c3894b','TEXT','What is your final price?',NULL,'READ','2026-10-29 07:37:58.408'),('d4b00724-077c-4f66-8758-06530d3f62f6','efdc0167-6dee-487c-98d5-b2461bb86291','3322e8a6-3250-40ac-8c5c-b7522581680b','TEXT','Hello! Is this Maruti Swift still available for test drive?',NULL,'SENT','2026-10-29 06:41:23.373'),('d5d0583d-2dc1-4819-a938-10384f01872d','a10048b5-a9b1-45ee-a7fb-4b1977f97b96','a32b726c-20d5-42b9-a222-5fd6c86e2b11','TEXT','Hello! Is this Maruti Swift still available for test drive?',NULL,'SENT','2026-10-29 06:13:08.059'),('eea1e866-a708-44ea-8029-177417830d9e','380ff19b-1cff-49fb-b011-6936136185c5','2a06ff30-e301-494c-aef2-6aa0e67ab2b5','TEXT','Hello! Is this Maruti Swift still available for test drive?',NULL,'SENT','2026-10-29 06:24:34.978'),('f46392be-fa9f-430b-9904-2dc4d3c959ee','8cd56173-276a-4dd9-af2e-a01fe71ef8b9','84f517c6-645b-4e53-be8d-850d58077143','TEXT','Hello! Is this Maruti Swift still available for test drive?',NULL,'SENT','2026-10-29 06:42:04.133'),('fcd044f3-8b11-47db-a96c-985cd6fd14fa','cfbc69bd-dcdf-49b3-9624-365ab3fd662a','de8ac6ff-6a99-46bc-b975-8676d2702328','TEXT','Hi, is this item still available?',NULL,'READ','2026-10-26 02:45:34.426');
/*!40000 ALTER TABLE `messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('CHAT_MESSAGE','AD_APPROVED','AD_REJECTED','AD_EXPIRING_SOON','PRICE_DROP','SAVED_SEARCH_MATCH','SYSTEM_ALERT') COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `body` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `data` json DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `notifications_user_id_is_read_created_at_idx` (`user_id`,`is_read`,`created_at`),
  CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES ('604e471f-fe74-414c-89c0-01850fb8e915','686dc494-cea3-4b59-9b75-5b05cd8599e6','AD_APPROVED','Listing approved','Your listing \"Brand New Maruti Swift 2024 Urgent Distress Sale\" is now live.','{\"adId\": \"01885cc7-9775-4034-aaaf-725ab215c8e9\", \"status\": \"ACTIVE\"}',0,'2026-10-29 06:34:54.839'),('7e833e46-7618-49bf-9afc-3c347a2fb0d0','4145fb0f-d60c-4e5d-9b36-72e73532d300','AD_APPROVED','Listing approved','Your listing \"Brand New Maruti Swift 2024 Urgent Distress Sale\" is now live.','{\"adId\": \"a5b69256-6084-4f4a-9bdf-8a8b9e9f67f3\", \"status\": \"ACTIVE\"}',0,'2026-10-29 06:41:23.453'),('b8113fcc-bd38-463b-8d13-7627bf7ee82d','ccbf588a-7846-4786-987b-33e9fde9ae7e','AD_APPROVED','Listing approved','Your listing \"Brand New Maruti Swift 2024 Urgent Distress Sale\" is now live.','{\"adId\": \"05e57cfa-95ac-4992-985f-440418e35b17\", \"status\": \"ACTIVE\"}',0,'2026-10-29 06:42:04.225'),('c00e2f94-cf80-4ae6-b3f4-849ebd81593c','9bac6b71-0008-41ea-be6d-02faf96598ce','AD_APPROVED','Listing approved','Your listing \"Brand New Maruti Swift 2024 Urgent Distress Sale\" is now live.','{\"adId\": \"e96d71ac-f937-4748-87d8-cd75e589306b\", \"status\": \"ACTIVE\"}',0,'2026-10-29 06:33:35.616');
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `otp_sessions`
--

DROP TABLE IF EXISTS `otp_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `otp_sessions` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone_number` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `otp_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `purpose` enum('LOGIN','REGISTER','PHONE_UPDATE','TRANSACTION_VERIFY') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'LOGIN',
  `attempts` int NOT NULL DEFAULT '0',
  `is_used` tinyint(1) NOT NULL DEFAULT '0',
  `expires_at` datetime(3) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `otp_sessions_phone_number_is_used_expires_at_idx` (`phone_number`,`is_used`,`expires_at`),
  KEY `otp_sessions_user_id_fkey` (`user_id`),
  CONSTRAINT `otp_sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `otp_sessions`
--

LOCK TABLES `otp_sessions` WRITE;
/*!40000 ALTER TABLE `otp_sessions` DISABLE KEYS */;
INSERT INTO `otp_sessions` VALUES ('02197a50-a583-4cd1-8786-f966d9f1b181',NULL,'+919247108109','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-29 06:39:54.634','2026-10-29 06:34:54.636'),('071a5645-f67c-476a-979b-8e8396c1c551',NULL,'+919159830143','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-29 06:29:56.216','2026-10-29 06:24:56.217'),('11eb1ddb-55dc-44a7-a16e-d492e4532de5',NULL,'+919261118376','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-29 06:18:08.009','2026-10-29 06:13:08.010'),('15c69d14-7fb6-46cb-8e99-29c032a542c4',NULL,'+919243750456','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-29 06:38:35.477','2026-10-29 06:33:35.478'),('1d09b127-d133-40f1-af96-4ccaa4d721bf',NULL,'+919147715182','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-29 06:30:13.017','2026-10-29 06:25:13.019'),('1e4c1b8d-8cae-4d1a-b1bf-f7aff9c1e68e',NULL,'+919232248686','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-29 06:29:34.897','2026-10-29 06:24:34.898'),('2048e552-2939-4989-80f0-7a0254d65a76',NULL,'+919148360244','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-29 06:18:07.748','2026-10-29 06:13:07.749'),('2c273fe8-39a7-46ba-a2e6-ca20ac4ddd38',NULL,'+919168135439','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-29 06:47:03.880','2026-10-29 06:42:03.881'),('31c1b677-0801-41d8-b572-6ca5f5fead0f',NULL,'+919285619140','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-26 05:54:20.675','2026-10-26 05:49:20.676'),('3eb46cb8-7865-4754-8969-04631052dcf9',NULL,'+919304203985','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-26 07:24:06.234','2026-10-26 07:19:06.244'),('40e6a7a0-ca34-437a-920b-6c1ba21e58fd',NULL,'+919110326493','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-26 05:13:54.647','2026-10-26 05:08:54.649'),('489402eb-8712-4c54-a6de-d0d9262c07a9',NULL,'+919833445566','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-26 02:53:19.355','2026-10-26 02:48:19.355'),('4a50dc7e-342b-47bd-80bb-1572f650e66e',NULL,'+919232645871','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-26 05:01:06.978','2026-10-26 04:56:06.979'),('506c0da1-c9bb-4b8c-8274-1253df8f0621',NULL,'+919178891702','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-29 06:34:19.889','2026-10-29 06:29:19.890'),('537c88a6-570c-4796-b2eb-01fd61bcef18',NULL,'+919270808692','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-26 05:13:54.952','2026-10-26 05:08:54.953'),('57d02d45-04c3-407f-a375-0be080c07498',NULL,'+919876543210','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,0,'2026-10-26 04:52:40.262','2026-10-26 04:47:40.264'),('5b0365e6-4c69-401a-8ea5-9afb4b312ee2',NULL,'+919277992538','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-29 06:30:13.308','2026-10-29 06:25:13.310'),('5dbf10a2-50a9-405d-b134-65d567c23e2d',NULL,'+919876543210','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-29 07:49:23.502','2026-10-29 07:44:23.504'),('63094175-d82b-4f92-9c80-1a178150019c',NULL,'+919194361791','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-26 05:01:06.688','2026-10-26 04:56:06.689'),('638c37e8-c368-4054-98f0-5457c06096fe',NULL,'+919123456789','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-26 02:13:42.301','2026-10-26 02:08:42.340'),('649a2502-76f2-4bba-963c-5dd3e28516c4',NULL,'+919320123645','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-29 07:45:02.955','2026-10-29 07:40:02.962'),('66554d44-446e-4225-a9e9-0fdb977d026e',NULL,'+919876543210','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',1,1,'2026-11-02 19:16:35.449','2026-11-02 19:11:35.451'),('6ee90497-d009-470e-b1f4-949123bdce5b',NULL,'+919115986250','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-26 04:59:05.487','2026-10-26 04:54:05.489'),('78a51f85-6176-4173-89b5-cfbdb6762e3c',NULL,'+919128491003','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-29 06:39:54.341','2026-10-29 06:34:54.343'),('827610c6-156f-4aad-9bfb-c1c95005335c',NULL,'+919262222918','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-26 05:01:37.395','2026-10-26 04:56:37.396'),('8282ddb1-017d-4466-8094-9ef0ac9467c5',NULL,'+919277827087','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-29 06:46:23.320','2026-10-29 06:41:23.322'),('82f48766-7226-4168-ac19-8dd862a273a0',NULL,'+919136503449','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-29 06:46:23.144','2026-10-29 06:41:23.146'),('85de51c3-434e-4273-9a6b-bf942b263326',NULL,'+919289805007','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-29 06:29:56.496','2026-10-29 06:24:56.498'),('8a344b24-847f-4490-91d0-f4fd314ac641',NULL,'+919126339520','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-26 05:54:20.444','2026-10-26 05:49:20.445'),('8d5f4830-34ab-4fc2-9af0-d09ff3d82dc8',NULL,'+919154777223','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-29 06:29:34.463','2026-10-29 06:24:34.464'),('8ec9fb12-71be-453a-b5ec-f75d452f4719',NULL,'+919387100771','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-29 06:30:17.992','2026-10-29 06:25:17.994'),('8efe8cfd-7234-416e-946b-a3a84c8e9a4e',NULL,'+919876543210','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-25 18:05:25.563','2026-10-25 18:00:25.564'),('9444e8bb-be01-4936-8234-0e4a9c9401e9',NULL,'+919199119896','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-26 04:57:55.157','2026-10-26 04:52:55.158'),('9b4f2b1f-2c69-4f11-9aac-46f78187741a',NULL,'+919304203985','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-29 07:29:10.084','2026-10-29 07:24:10.087'),('9e90e7d5-5e3b-4df7-888b-747a257721fc',NULL,'+919876543210','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-30 11:51:50.504','2026-10-30 11:46:50.506'),('a453fd3b-c665-4a7a-93e9-98d2fe3f6120',NULL,'+919304203985','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-31 12:48:44.337','2026-10-31 12:43:44.339'),('b10b7281-d20c-4a13-810f-9ea661162bf9',NULL,'+919876543210','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-26 02:04:51.024','2026-10-26 01:59:51.025'),('b39493bb-5563-4623-b0f3-226ac68b1146',NULL,'+919876543210','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-11-01 15:53:16.607','2026-11-01 15:48:16.608'),('b520f7eb-a091-4302-b119-35929ccbf1d2',NULL,'+919111222333','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-26 04:53:33.041','2026-10-26 04:48:33.042'),('bd9f461d-324d-4e08-929f-c150464c7d2c',NULL,'+919159019821','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-26 05:01:37.105','2026-10-26 04:56:37.106'),('c3a4a7fb-f72c-4c8e-b4c5-864417756e2b',NULL,'+919304203985','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-25 18:37:24.441','2026-10-25 18:32:24.444'),('c4c35dca-699e-4cf1-8db3-e10ee3c7a97a',NULL,'+919988776655','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-26 04:56:58.247','2026-10-26 04:51:58.249'),('cbea1ef1-27bb-4eee-b759-f0c21479013e',NULL,'+919999988888','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-25 18:47:14.924','2026-10-25 18:42:14.925'),('ccc1f1f4-c1db-4d2b-926b-956f655726a0',NULL,'+919272214306','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-29 06:47:04.081','2026-10-29 06:42:04.082'),('cf2db2f3-bb52-4dcd-99c1-7b65d9d9f943',NULL,'+919833445566','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-26 02:50:34.316','2026-10-26 02:45:34.318'),('cfb4e16b-2bf5-4709-b6a6-cfe139d585d2',NULL,'+919198765432','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-26 05:36:25.494','2026-10-26 05:31:25.496'),('d6109411-cbfe-427e-aadf-192107e268e4',NULL,'+919191827383','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-29 06:38:35.227','2026-10-29 06:33:35.228'),('de12792a-5b1a-4118-bd96-49fc37403e14',NULL,'+919988776655','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,0,'2026-10-26 02:49:31.809','2026-10-26 02:44:31.811'),('e696fe59-7cfd-4e38-9f8a-57883438d7bd',NULL,'+919123456789','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-26 02:05:14.792','2026-10-26 02:00:14.793'),('f600a911-0de9-4dd1-90ff-de1406c7e1c7',NULL,'+919237157415','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-29 06:34:20.311','2026-10-29 06:29:20.312'),('f66012e7-dc3d-451e-8b3c-4c9c683ca408',NULL,'+919153925544','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-26 04:58:31.126','2026-10-26 04:53:31.128'),('fdd8dbac-0e7f-477a-82b8-8a3ea41749db',NULL,'+919811223344','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','LOGIN',0,1,'2026-10-26 02:50:09.995','2026-10-26 02:45:09.997');
/*!40000 ALTER TABLE `otp_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `platform_settings`
--

DROP TABLE IF EXISTS `platform_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `platform_settings` (
  `key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` json NOT NULL,
  `updated_by` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `platform_settings`
--

LOCK TABLES `platform_settings` WRITE;
/*!40000 ALTER TABLE `platform_settings` DISABLE KEYS */;
/*!40000 ALTER TABLE `platform_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `profiles`
--

DROP TABLE IF EXISTS `profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `profiles` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `avatar_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bio` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rating_average` decimal(3,2) NOT NULL DEFAULT '0.00',
  `rating_count` int NOT NULL DEFAULT '0',
  `is_identity_verified` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `account_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'INDIVIDUAL',
  `business_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `profiles_user_id_key` (`user_id`),
  KEY `profiles_location_id_fkey` (`location_id`),
  CONSTRAINT `profiles_location_id_fkey` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `profiles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `profiles`
--

LOCK TABLES `profiles` WRITE;
/*!40000 ALTER TABLE `profiles` DISABLE KEYS */;
INSERT INTO `profiles` VALUES ('0741a0da-6a86-490b-80d0-b34b0f6e088b','b354d4aa-dbf3-4504-9840-eaa1ee692c73','User 5007',NULL,NULL,NULL,0.00,0,0,'2026-10-29 06:24:56.524','2026-10-29 06:24:56.524','INDIVIDUAL',NULL),('0791f4f9-2e73-48fd-ade6-b3dba91792bc','d3f98d4a-e901-4f1c-9a96-4424f3605bba','User 6250',NULL,NULL,NULL,0.00,0,0,'2026-10-26 04:54:05.541','2026-10-26 04:54:05.541','INDIVIDUAL',NULL),('0a2e2235-df51-4af0-a0ef-99eaf91ea86f','8aa19fbd-2a1a-4945-a8e0-74f21fcd1825','User 2918',NULL,NULL,NULL,0.00,0,0,'2026-10-26 04:56:37.420','2026-10-26 04:56:37.420','INDIVIDUAL',NULL),('0c2e3d71-efd3-43c2-90be-d1090f501f68','90d4a634-2012-4aa5-b123-61df1c9b205f','User 9520',NULL,NULL,NULL,0.00,0,0,'2026-10-26 05:49:20.478','2026-10-26 05:49:20.478','INDIVIDUAL',NULL),('12932802-d7b5-4073-ac75-9ef65caaacad','84f517c6-645b-4e53-be8d-850d58077143','User 4306',NULL,NULL,NULL,0.00,0,0,'2026-10-29 06:42:04.099','2026-10-29 06:42:04.099','INDIVIDUAL',NULL),('147eeff1-f2b2-480c-b1aa-5036324a073b','5d1306f9-a2b9-4a2c-8fdb-554d896060db','User 2333',NULL,NULL,NULL,0.00,0,0,'2026-10-26 04:48:33.189','2026-10-26 04:48:33.189','INDIVIDUAL',NULL),('29ada8c5-6e5a-4aa2-99c9-e8b23068ae7a','ee82356b-a62b-4d79-8d65-3af7a0e1457a','User 8109',NULL,NULL,NULL,0.00,0,0,'2026-10-29 06:34:54.666','2026-10-29 06:34:54.666','INDIVIDUAL',NULL),('2af15135-60ac-4759-a1e8-ed2948b4b2af','8676dee0-87ee-4747-b49e-5a7ddecc4104','User 0456',NULL,NULL,NULL,0.00,0,0,'2026-10-29 06:33:35.497','2026-10-29 06:33:35.497','INDIVIDUAL',NULL),('2fbba521-25bb-47f9-a12b-c0de15d74cae','f46501f8-a4e4-4693-a0b9-09618a3de3ba','User 7223',NULL,NULL,NULL,0.00,0,0,'2026-10-29 06:24:34.523','2026-10-29 06:24:34.523','INDIVIDUAL',NULL),('41c3e767-0399-4d58-84f7-ce7c9d436cea','4145fb0f-d60c-4e5d-9b36-72e73532d300','User 3449',NULL,NULL,NULL,0.00,0,0,'2026-10-29 06:41:23.175','2026-10-29 06:41:23.175','INDIVIDUAL',NULL),('4d21ff72-e357-46ae-b96e-09b7e3580437','3322e8a6-3250-40ac-8c5c-b7522581680b','User 7087',NULL,NULL,NULL,0.00,0,0,'2026-10-29 06:41:23.341','2026-10-29 06:41:23.341','INDIVIDUAL',NULL),('519e6c06-15ac-464a-95c9-4913afaa0e53','faced429-b663-4d0b-8649-eb8d3f8f36d0','User 5182',NULL,NULL,NULL,0.00,0,0,'2026-10-29 06:25:13.073','2026-10-29 06:25:13.073','INDIVIDUAL',NULL),('5f5451e6-0aac-4d80-8c5d-fcc42889043f','c79e89af-d915-41db-ae24-885d745f0918','User 9140',NULL,NULL,NULL,0.00,0,0,'2026-10-26 05:49:20.697','2026-10-26 05:49:20.697','INDIVIDUAL',NULL),('63d998bf-af9d-448e-a95d-217d975744fe','ddca74e3-46f6-42b0-89f3-77a9aeec16fe','User 2538',NULL,NULL,NULL,0.00,0,0,'2026-10-29 06:25:13.342','2026-10-29 06:25:13.342','INDIVIDUAL',NULL),('64e85915-a15b-48f2-a4a6-06c68441fed9','e73881be-9821-424b-b8a5-7818c083edf8','User 3344',NULL,NULL,NULL,0.00,0,0,'2026-10-26 02:45:10.078','2026-10-26 02:45:10.078','INDIVIDUAL',NULL),('6561dd0a-1143-45c3-b92c-e3baa04e8904','de8ac6ff-6a99-46bc-b975-8676d2702328','User 5566',NULL,NULL,NULL,0.00,0,0,'2026-10-26 02:45:34.373','2026-10-26 02:45:34.373','INDIVIDUAL',NULL),('69549908-7864-416c-a466-4cc8670fbe03','686dc494-cea3-4b59-9b75-5b05cd8599e6','User 1003',NULL,NULL,NULL,0.00,0,0,'2026-10-29 06:34:54.390','2026-10-29 06:34:54.390','INDIVIDUAL',NULL),('6964dcc0-3345-4346-99f9-ad5823930cb0','b1dea116-c719-43ea-a516-3d4aa94a4592','User 7415',NULL,NULL,NULL,0.00,0,0,'2026-10-29 06:29:20.342','2026-10-29 06:29:20.342','INDIVIDUAL',NULL),('70ca57e8-e07a-43e1-ab36-7bcac7562cda','927b4a29-4be7-4fa1-aca5-ed9f1b2ee40f','User 5871',NULL,NULL,NULL,0.00,0,0,'2026-10-26 04:56:07.004','2026-10-26 04:56:07.004','INDIVIDUAL',NULL),('7882c9c6-9729-4f98-ada4-01fd0e73039c','9b9a496c-1864-41e4-ab85-3c8ddcb22539','User 6493',NULL,NULL,NULL,0.00,0,0,'2026-10-26 05:08:54.692','2026-10-26 05:08:54.692','INDIVIDUAL',NULL),('797e5910-1f66-4bfe-8662-e91bfd586b8b','6739116c-6045-40c1-a88d-233ba19c9ac9','User 6789',NULL,NULL,NULL,0.00,0,0,'2026-10-26 02:00:14.881','2026-10-26 02:00:14.881','INDIVIDUAL',NULL),('7ab35c10-4de7-4721-85a1-df76be7e274b','8b53db5f-c763-4b51-bf93-16fc9bb7f622','User 1791',NULL,NULL,NULL,0.00,0,0,'2026-10-26 04:56:06.731','2026-10-26 04:56:06.731','INDIVIDUAL',NULL),('8823126c-a09e-4a8d-b92e-cea39e743f41','ccbf588a-7846-4786-987b-33e9fde9ae7e','User 5439',NULL,NULL,NULL,0.00,0,0,'2026-10-29 06:42:03.915','2026-10-29 06:42:03.915','INDIVIDUAL',NULL),('8c3391cf-37ff-4b2d-9083-9c2369abf5bd','9bac6b71-0008-41ea-be6d-02faf96598ce','User 7383',NULL,NULL,NULL,0.00,0,0,'2026-10-29 06:33:35.262','2026-10-29 06:33:35.262','INDIVIDUAL',NULL),('944c7093-f888-491b-80b3-e324daa56cc1','af01e4c9-d050-44df-a329-32cad4c3894b','Rahul Sharma',NULL,'Verified buyer & seller on BharatMarket',NULL,4.90,18,1,'2026-10-25 17:57:01.370','2026-10-25 17:57:01.370','INDIVIDUAL',NULL),('971dc191-af64-407a-8e66-5d82ec6b428f','96c11f0f-9255-4a90-b627-539a2bc5809f','User 6655',NULL,NULL,NULL,0.00,0,0,'2026-10-26 04:51:58.290','2026-10-26 04:51:58.290','INDIVIDUAL',NULL),('98730e7a-b483-44f2-8be9-671c6e1572f2','c7aac895-b00c-4133-b89f-1b39469fd3bd','User 0244',NULL,NULL,NULL,0.00,0,0,'2026-10-29 06:13:07.803','2026-10-29 06:13:07.803','INDIVIDUAL',NULL),('a8dfe62e-5341-4751-9c81-bc49b7139fe6','39faa549-e4fd-4881-991d-4d6f064db315','User 9821',NULL,NULL,NULL,0.00,0,0,'2026-10-26 04:56:37.149','2026-10-26 04:56:37.149','INDIVIDUAL',NULL),('b0c725a2-9e65-4686-bb59-d1db579f0810','3b7a504f-b13f-4330-b6f1-9807e5b7137a','User 5432',NULL,NULL,NULL,0.00,0,0,'2026-10-26 05:31:30.091','2026-10-26 05:31:30.091','INDIVIDUAL',NULL),('b0e8e389-ac1e-4c7e-a098-a9f484265a98','eec4c5e6-c918-4a7f-b09a-8cb7a9f86186','User 9896',NULL,NULL,NULL,0.00,0,0,'2026-10-26 04:52:55.223','2026-10-26 04:52:55.223','INDIVIDUAL',NULL),('b77a0c43-c649-4dc6-9666-560ff2140c40','cafd6b30-93c1-4df0-b79c-d3367943bfc6','User 3645',NULL,NULL,NULL,0.00,0,0,'2026-10-29 07:40:06.741','2026-10-29 07:40:06.741','INDIVIDUAL',NULL),('b89e5971-1a89-41f3-b47c-d8bcc41d1304','37c9d82d-f727-4836-8c8d-dacc713b40ac','User 0143',NULL,NULL,NULL,0.00,0,0,'2026-10-29 06:24:56.253','2026-10-29 06:24:56.253','INDIVIDUAL',NULL),('b9deb259-e8b9-4a31-a27e-c50c479ddf82','13206bdf-dcef-4200-818d-4f635d0d03e4','User 1702',NULL,NULL,NULL,0.00,0,0,'2026-10-29 06:29:19.934','2026-10-29 06:29:19.934','INDIVIDUAL',NULL),('ba82259c-8e5f-481b-9727-f180dfaa036c','90127e9a-2353-4686-8d25-8785682c2407','User 3985',NULL,NULL,NULL,0.00,0,0,'2026-10-25 18:32:27.274','2026-10-25 18:32:27.274','INDIVIDUAL',NULL),('d8ce9fb8-6a65-4c96-bf66-2f0369a8101a','c2a6b3a1-fbfb-4d38-ac7f-08d5d5b079cb','User 8692',NULL,NULL,NULL,0.00,0,0,'2026-10-26 05:08:54.979','2026-10-26 05:08:54.979','INDIVIDUAL',NULL),('ddc40863-ef2e-4607-8bad-a3b738205930','2c08498a-74b9-4ba0-bd84-adbf2eb20eea','Rahul Sharma',NULL,'Chief Marketplace Administrator',NULL,0.00,0,1,'2026-10-25 18:35:11.212','2026-11-02 19:32:03.682','INDIVIDUAL',NULL),('e43e01bc-f70f-4d0b-99f9-7f95f4b2e4f2','a32b726c-20d5-42b9-a222-5fd6c86e2b11','User 8376',NULL,NULL,NULL,0.00,0,0,'2026-10-29 06:13:08.034','2026-10-29 06:13:08.034','INDIVIDUAL',NULL),('ed7382c6-9648-4ba9-9e0b-b686b1405eab','54701f63-208a-4dc2-8de8-71f9ce19ec56','User 5544',NULL,NULL,NULL,0.00,0,0,'2026-10-26 04:53:31.188','2026-10-26 04:53:31.188','INDIVIDUAL',NULL),('f37015a2-fbac-415b-8c31-93b89a96aff8','6e8bcea0-cb96-4f9b-bcb9-b1bd882b1407','User 0771',NULL,NULL,NULL,0.00,0,0,'2026-10-29 06:25:18.052','2026-10-29 06:25:18.052','INDIVIDUAL',NULL),('fd4e9a36-1e04-4e8f-a252-9a897477083b','2a06ff30-e301-494c-aef2-6aa0e67ab2b5','User 8686',NULL,NULL,NULL,0.00,0,0,'2026-10-29 06:24:34.928','2026-10-29 06:24:34.928','INDIVIDUAL',NULL);
/*!40000 ALTER TABLE `profiles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reports`
--

DROP TABLE IF EXISTS `reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reports` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reporter_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reported_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ad_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reason` enum('SPAM_OR_FRAUD','INAPPROPRIATE_CONTENT','PROHIBITED_ITEM','MISLEADING_PRICE','DUPLICATE_LISTING','ALREADY_SOLD','OTHER') COLLATE utf8mb4_unicode_ci NOT NULL,
  `details` text COLLATE utf8mb4_unicode_ci,
  `status` enum('PENDING','UNDER_REVIEW','RESOLVED','DISMISSED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `admin_note` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `assigned_to_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `conversation_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `message_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resolution_reason` text COLLATE utf8mb4_unicode_ci,
  `resolved_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `reports_status_created_at_idx` (`status`,`created_at`),
  KEY `reports_reporter_id_fkey` (`reporter_id`),
  KEY `reports_reported_id_fkey` (`reported_id`),
  KEY `reports_ad_id_fkey` (`ad_id`),
  KEY `reports_assigned_to_id_status_idx` (`assigned_to_id`,`status`),
  KEY `reports_conversation_id_idx` (`conversation_id`),
  KEY `reports_message_id_idx` (`message_id`),
  CONSTRAINT `reports_ad_id_fkey` FOREIGN KEY (`ad_id`) REFERENCES `ads` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `reports_assigned_to_id_fkey` FOREIGN KEY (`assigned_to_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `reports_conversation_id_fkey` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `reports_message_id_fkey` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `reports_reported_id_fkey` FOREIGN KEY (`reported_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `reports_reporter_id_fkey` FOREIGN KEY (`reporter_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reports`
--

LOCK TABLES `reports` WRITE;
/*!40000 ALTER TABLE `reports` DISABLE KEYS */;
INSERT INTO `reports` VALUES ('32d721ca-65e6-4288-b246-641923bc3596','de8ac6ff-6a99-46bc-b975-8676d2702328','af01e4c9-d050-44df-a329-32cad4c3894b','c32c53f5-9bfc-4fd0-9179-38e1f46532a5','MISLEADING_PRICE','Seller initially agreed to price on chat but asked for token money in private.','PENDING',NULL,'2026-10-26 03:01:54.800','2026-10-26 03:01:54.800',NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `reports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reviews`
--

DROP TABLE IF EXISTS `reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reviews` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `author_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rating` smallint NOT NULL,
  `comment` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `reviews_author_id_target_id_key` (`author_id`,`target_id`),
  KEY `reviews_target_id_rating_idx` (`target_id`,`rating`),
  CONSTRAINT `reviews_author_id_fkey` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `reviews_target_id_fkey` FOREIGN KEY (`target_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reviews`
--

LOCK TABLES `reviews` WRITE;
/*!40000 ALTER TABLE `reviews` DISABLE KEYS */;
/*!40000 ALTER TABLE `reviews` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `saved_searches`
--

DROP TABLE IF EXISTS `saved_searches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `saved_searches` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `query_criteria` json NOT NULL,
  `notify_email` tinyint(1) NOT NULL DEFAULT '0',
  `notify_push` tinyint(1) NOT NULL DEFAULT '1',
  `last_notified_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `saved_searches_user_id_idx` (`user_id`),
  CONSTRAINT `saved_searches_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `saved_searches`
--

LOCK TABLES `saved_searches` WRITE;
/*!40000 ALTER TABLE `saved_searches` DISABLE KEYS */;
/*!40000 ALTER TABLE `saved_searches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `support_ticket_entries`
--

DROP TABLE IF EXISTS `support_ticket_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `support_ticket_entries` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ticket_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `author_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `body` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_internal` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `support_ticket_entries_ticket_id_created_at_idx` (`ticket_id`,`created_at`),
  KEY `support_ticket_entries_author_id_fkey` (`author_id`),
  CONSTRAINT `support_ticket_entries_author_id_fkey` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `support_ticket_entries_ticket_id_fkey` FOREIGN KEY (`ticket_id`) REFERENCES `support_tickets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `support_ticket_entries`
--

LOCK TABLES `support_ticket_entries` WRITE;
/*!40000 ALTER TABLE `support_ticket_entries` DISABLE KEYS */;
/*!40000 ALTER TABLE `support_ticket_entries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `support_tickets`
--

DROP TABLE IF EXISTS `support_tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `support_tickets` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `requester_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subject` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `priority` enum('LOW','NORMAL','HIGH','URGENT') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NORMAL',
  `status` enum('OPEN','IN_PROGRESS','WAITING_ON_CUSTOMER','RESOLVED','CLOSED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'OPEN',
  `assigned_to_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sla_target_at` datetime(3) DEFAULT NULL,
  `resolved_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `support_tickets_status_priority_created_at_idx` (`status`,`priority`,`created_at`),
  KEY `support_tickets_assigned_to_id_status_idx` (`assigned_to_id`,`status`),
  KEY `support_tickets_requester_id_fkey` (`requester_id`),
  CONSTRAINT `support_tickets_assigned_to_id_fkey` FOREIGN KEY (`assigned_to_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `support_tickets_requester_id_fkey` FOREIGN KEY (`requester_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `support_tickets`
--

LOCK TABLES `support_tickets` WRITE;
/*!40000 ALTER TABLE `support_tickets` DISABLE KEYS */;
/*!40000 ALTER TABLE `support_tickets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone_number` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_phone_verified` tinyint(1) NOT NULL DEFAULT '0',
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_email_verified` tinyint(1) NOT NULL DEFAULT '0',
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `google_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('GUEST','USER','MODERATOR','ADMIN') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USER',
  `status` enum('ACTIVE','SUSPENDED','BANNED','DELETED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `refresh_token_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_login_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_phone_number_key` (`phone_number`),
  UNIQUE KEY `users_email_key` (`email`),
  UNIQUE KEY `users_google_id_key` (`google_id`),
  KEY `users_phone_number_idx` (`phone_number`),
  KEY `users_email_idx` (`email`),
  KEY `users_role_status_idx` (`role`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES ('13206bdf-dcef-4200-818d-4f635d0d03e4','+919178891702',1,NULL,0,NULL,NULL,'USER','ACTIVE','32654f860af490733a6630628952cebbf2b0f869c2f007130c847ff43e6b1766','2026-10-29 06:29:19.953','2026-10-29 06:29:19.934','2026-10-29 06:29:19.955',NULL),('2a06ff30-e301-494c-aef2-6aa0e67ab2b5','+919232248686',1,NULL,0,NULL,NULL,'USER','ACTIVE','09923a99058551de8f0712c5da9466e378d05c80e5410b415b02bbacffaeb733','2026-10-29 06:24:34.943','2026-10-29 06:24:34.928','2026-10-29 06:24:34.945',NULL),('2c08498a-74b9-4ba0-bd84-adbf2eb20eea','+919999988888',1,NULL,0,'$2b$10$635HWHBt8xdkxtYAKLxPR.5YCPH9YKgGpUKGqf.6i8FquOb5pYwAO',NULL,'ADMIN','ACTIVE','8dc1dd9fb432d272aafe733442ada6a2039fdd6f9d022d2bf0bbb57bd78c9e1f','2026-10-25 18:42:14.989','2026-10-25 18:35:11.212','2026-11-02 19:32:13.776',NULL),('3322e8a6-3250-40ac-8c5c-b7522581680b','+919277827087',1,NULL,0,NULL,NULL,'USER','ACTIVE','b702cdee65f8668707e7ef28cae28359d3feb7cf38f353beef7a0078e64ced89','2026-10-29 06:41:23.352','2026-10-29 06:41:23.341','2026-10-29 06:41:23.354',NULL),('37c9d82d-f727-4836-8c8d-dacc713b40ac','+919159830143',1,NULL,0,NULL,NULL,'USER','ACTIVE','91f8d60ae86f8b21fcf0a58765654d78d3c27814dcb9956b4c2eb231a417e62c','2026-10-29 06:24:56.265','2026-10-29 06:24:56.253','2026-10-29 06:24:56.267',NULL),('39faa549-e4fd-4881-991d-4d6f064db315','+919159019821',1,NULL,0,NULL,NULL,'USER','ACTIVE','a666137aa8dcb39ef97ae41513eba10f2023bb56ff4a458b7008cc8ed866d657','2026-10-26 04:56:37.162','2026-10-26 04:56:37.149','2026-10-26 04:56:37.163',NULL),('3b7a504f-b13f-4330-b6f1-9807e5b7137a','+919198765432',1,NULL,0,NULL,NULL,'USER','ACTIVE','ddf2966623523b73052d08065b6af80f97ea43bcf522c7a824c74a6da11ff365','2026-10-26 05:31:30.115','2026-10-26 05:31:30.091','2026-10-26 05:31:30.116',NULL),('4145fb0f-d60c-4e5d-9b36-72e73532d300','+919136503449',1,NULL,0,NULL,NULL,'USER','ACTIVE','5474c9d50affb1b9ea8e9a75bfd5d16147d73e18f47c87d66198cc91ee5a6517','2026-10-29 06:41:23.183','2026-10-29 06:41:23.175','2026-10-29 06:41:23.184',NULL),('54701f63-208a-4dc2-8de8-71f9ce19ec56','+919153925544',1,NULL,0,NULL,NULL,'USER','ACTIVE','dc7f3dd1bc44167abafe3be6ab6d7cc514c65ef042057f888a048168b7c419de','2026-10-26 04:53:31.203','2026-10-26 04:53:31.188','2026-10-26 04:53:31.204',NULL),('5d1306f9-a2b9-4a2c-8fdb-554d896060db','+919111222333',1,NULL,0,NULL,NULL,'USER','ACTIVE','005b67708ab8c165e29b757ee71645057e09eb176cee205b81a9fe18a261b2cf','2026-10-26 04:48:33.206','2026-10-26 04:48:33.189','2026-10-26 04:48:33.208',NULL),('6739116c-6045-40c1-a88d-233ba19c9ac9','+919123456789',1,NULL,0,NULL,NULL,'USER','ACTIVE','9752ff843ce4c177269d311dd3156fb0ada91bd6a8c188582c803264d2062dd1','2026-10-26 02:09:07.812','2026-10-26 02:00:14.881','2026-10-26 02:09:07.813',NULL),('686dc494-cea3-4b59-9b75-5b05cd8599e6','+919128491003',1,NULL,0,NULL,NULL,'USER','ACTIVE','c7dcdc9b1c958b3832da6e0d059f237483743e5597eb4b4ff7289d626acaf425','2026-10-29 06:34:54.406','2026-10-29 06:34:54.390','2026-10-29 06:34:54.408',NULL),('6e8bcea0-cb96-4f9b-bcb9-b1bd882b1407','+919387100771',1,NULL,0,NULL,NULL,'USER','ACTIVE','2bc69cbde89edeff366e7f0cc47ab931cae9feebbe5515d454a8c8e2ad72e39b','2026-10-29 06:25:18.068','2026-10-29 06:25:18.052','2026-10-29 06:25:18.070',NULL),('84f517c6-645b-4e53-be8d-850d58077143','+919272214306',1,NULL,0,NULL,NULL,'USER','ACTIVE','0f93629e0189b82366414293d2b14769fdb76af7e7147a73eb4009a416c4b561','2026-10-29 06:42:04.109','2026-10-29 06:42:04.099','2026-10-29 06:42:04.110',NULL),('8676dee0-87ee-4747-b49e-5a7ddecc4104','+919243750456',1,NULL,0,NULL,NULL,'USER','ACTIVE','fb3fcc0cd6240d2c95ca8ecea0ae4abea4a40d88f5a352a7db6b932f2d782023','2026-10-29 06:33:35.508','2026-10-29 06:33:35.497','2026-10-29 06:33:35.509',NULL),('8aa19fbd-2a1a-4945-a8e0-74f21fcd1825','+919262222918',1,NULL,0,NULL,NULL,'USER','ACTIVE','034f6f9979fa990caef17758cc23e90d500490563b62eb5071dbd6dd352dc69a','2026-10-26 04:56:37.432','2026-10-26 04:56:37.420','2026-10-26 04:56:37.434',NULL),('8b53db5f-c763-4b51-bf93-16fc9bb7f622','+919194361791',1,NULL,0,NULL,NULL,'USER','ACTIVE','f1dec8ae8a4b0684ccfe3090dcc32a5f39bb002d52cbc9c9dc3929f753de219e','2026-10-26 04:56:06.743','2026-10-26 04:56:06.731','2026-10-26 04:56:06.744',NULL),('90127e9a-2353-4686-8d25-8785682c2407','+919304203985',1,NULL,0,NULL,NULL,'USER','ACTIVE','9da842c5c300929313a9d2005ac8d66fa4d49d7a112b108f8754f3ce8bf31a4e','2026-10-31 12:43:47.371','2026-10-25 18:32:27.274','2026-10-31 12:43:47.373',NULL),('90d4a634-2012-4aa5-b123-61df1c9b205f','+919126339520',1,NULL,0,NULL,NULL,'USER','ACTIVE','2ecd6d705311d2f9172da29c9ce2b959b9bcd7015a405ca455b98a03968668d2','2026-10-26 05:49:20.489','2026-10-26 05:49:20.478','2026-10-26 05:49:20.489',NULL),('927b4a29-4be7-4fa1-aca5-ed9f1b2ee40f','+919232645871',1,NULL,0,NULL,NULL,'USER','ACTIVE','d8ae66eaa3bed97f50c423e465e421d48d1f821a2857d7312f1c0fb89f05ce9c','2026-10-26 04:56:07.016','2026-10-26 04:56:07.004','2026-10-26 04:56:07.017',NULL),('96c11f0f-9255-4a90-b627-539a2bc5809f','+919988776655',1,NULL,0,NULL,NULL,'USER','ACTIVE','93237fcb16d1082ac7cd8fc48f4c1592ff972cc597c72c86c5924eaa4d18dcde','2026-10-26 04:51:58.302','2026-10-26 04:51:58.290','2026-10-26 04:51:58.304',NULL),('9b9a496c-1864-41e4-ab85-3c8ddcb22539','+919110326493',1,NULL,0,NULL,NULL,'USER','ACTIVE','2e4bb1fa3c312f0512dbe130afbba5eacce9f616e974d5aa92c5f0aea4c9a5c0','2026-10-26 05:08:54.712','2026-10-26 05:08:54.692','2026-10-26 05:08:54.713',NULL),('9bac6b71-0008-41ea-be6d-02faf96598ce','+919191827383',1,NULL,0,NULL,NULL,'USER','ACTIVE','a4ebffb5d8a44a671b5906c2d7ee21796581ed553c32023e17ff7885d642a674','2026-10-29 06:33:35.274','2026-10-29 06:33:35.262','2026-10-29 06:33:35.275',NULL),('a32b726c-20d5-42b9-a222-5fd6c86e2b11','+919261118376',1,NULL,0,NULL,NULL,'USER','ACTIVE','3da91c8236c2554a0033c83a2322f4fbcb07513eaf2b7e01054d7a0353cddeb5','2026-10-29 06:13:08.041','2026-10-29 06:13:08.034','2026-10-29 06:13:08.042',NULL),('af01e4c9-d050-44df-a329-32cad4c3894b','+919876543210',1,NULL,0,NULL,NULL,'ADMIN','ACTIVE','df45335a80d609d08ee543e489b98b8a7bcd0f364821cedfba02277f01a399f9','2026-11-02 19:11:41.831','2026-10-25 17:57:01.370','2026-11-02 19:51:44.791',NULL),('b1dea116-c719-43ea-a516-3d4aa94a4592','+919237157415',1,NULL,0,NULL,NULL,'USER','ACTIVE','8db1e32aa3d62d6660542846f26c1d6fa24e9fe362e03f188d6bcc3ed98648c9','2026-10-29 06:29:20.355','2026-10-29 06:29:20.342','2026-10-29 06:29:20.356',NULL),('b354d4aa-dbf3-4504-9840-eaa1ee692c73','+919289805007',1,NULL,0,NULL,NULL,'USER','ACTIVE','0c4db9388f8d6ae06534580619788d525b469b094e41d51686bbd6fd33a2faa6','2026-10-29 06:24:56.533','2026-10-29 06:24:56.524','2026-10-29 06:24:56.535',NULL),('c2a6b3a1-fbfb-4d38-ac7f-08d5d5b079cb','+919270808692',1,NULL,0,NULL,NULL,'USER','ACTIVE','67248455e596622ec25371316f78448f3f5929445ef7ddc94c029b86dce54715','2026-10-26 05:08:54.997','2026-10-26 05:08:54.979','2026-10-26 05:08:54.998',NULL),('c79e89af-d915-41db-ae24-885d745f0918','+919285619140',1,NULL,0,NULL,NULL,'USER','ACTIVE','7082bedd172dba42d67c5bd8f4013809a1bfd82f96d7d9df1679aa730ccc3dfb','2026-10-26 05:49:20.708','2026-10-26 05:49:20.697','2026-10-26 05:49:20.709',NULL),('c7aac895-b00c-4133-b89f-1b39469fd3bd','+919148360244',1,NULL,0,NULL,NULL,'USER','ACTIVE','70469f55bde7361b657284d38d2848cd3b039381b533e67e6f322a9b773240aa','2026-10-29 06:13:07.818','2026-10-29 06:13:07.803','2026-10-29 06:13:07.819',NULL),('cafd6b30-93c1-4df0-b79c-d3367943bfc6','+919320123645',1,NULL,0,NULL,NULL,'USER','ACTIVE',NULL,'2026-10-29 07:40:07.469','2026-10-29 07:40:06.741','2026-10-29 07:43:48.523',NULL),('ccbf588a-7846-4786-987b-33e9fde9ae7e','+919168135439',1,NULL,0,NULL,NULL,'USER','ACTIVE','defe785118f3f651e9dfb717cdc32a6ffa23f0d7006d56c981a5d214101f08c8','2026-10-29 06:42:03.926','2026-10-29 06:42:03.915','2026-10-29 06:42:03.927',NULL),('d3f98d4a-e901-4f1c-9a96-4424f3605bba','+919115986250',1,NULL,0,NULL,NULL,'USER','ACTIVE','30684c67081d7bb007aa433150df2219a1adaf6273491ccca74c2848788185e8','2026-10-26 04:54:05.555','2026-10-26 04:54:05.541','2026-10-26 04:54:05.558',NULL),('ddca74e3-46f6-42b0-89f3-77a9aeec16fe','+919277992538',1,NULL,0,NULL,NULL,'USER','ACTIVE','c88e8427bc8fa0c265ddefb73d3dc50d1cdbf4cda8be53378b078913e43005ba','2026-10-29 06:25:13.355','2026-10-29 06:25:13.342','2026-10-29 06:25:13.357',NULL),('de8ac6ff-6a99-46bc-b975-8676d2702328','+919833445566',1,NULL,0,NULL,NULL,'USER','ACTIVE','3f327ba7c905de0ee4a753bc9f89be3d9fccf3d5116a676b4e2bcf6ac987018b','2026-10-26 02:48:52.509','2026-10-26 02:45:34.373','2026-10-26 02:48:52.510',NULL),('e73881be-9821-424b-b8a5-7818c083edf8','+919811223344',1,NULL,0,NULL,NULL,'USER','ACTIVE','d6852a61fcea8c6986cc102f77dadfa2f4d511e7ec8d58f67a669568a8a2fd12','2026-10-26 02:45:10.094','2026-10-26 02:45:10.078','2026-10-26 02:45:10.097',NULL),('ee82356b-a62b-4d79-8d65-3af7a0e1457a','+919247108109',1,NULL,0,NULL,NULL,'USER','ACTIVE','16eaf4dbde12b6bf7576f6516d0ac4b6a8f63fdf512822945ed4951761ec24e6','2026-10-29 06:34:54.677','2026-10-29 06:34:54.666','2026-10-29 06:34:54.679',NULL),('eec4c5e6-c918-4a7f-b09a-8cb7a9f86186','+919199119896',1,NULL,0,NULL,NULL,'USER','ACTIVE','65fd889244e5f4ed1f41568951fbf2c5356f2c867b6ecc32d505ce3d661d1e21','2026-10-26 04:52:55.237','2026-10-26 04:52:55.223','2026-10-26 04:52:55.238',NULL),('f46501f8-a4e4-4693-a0b9-09618a3de3ba','+919154777223',1,NULL,0,NULL,NULL,'USER','ACTIVE','5bb6aeed00bdacb5cfffb980b69106d12dabb5eb98b62b952d7d3cfbc092d8a4','2026-10-29 06:24:34.546','2026-10-29 06:24:34.523','2026-10-29 06:24:34.547',NULL),('faced429-b663-4d0b-8649-eb8d3f8f36d0','+919147715182',1,NULL,0,NULL,NULL,'USER','ACTIVE','321104076512f346342a6419031e95abc1d2f7c0d4865d43a53e8511457a4f16','2026-10-29 06:25:13.089','2026-10-29 06:25:13.073','2026-10-29 06:25:13.091',NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'olx_marketplace'
--

--
-- Dumping routines for database 'olx_marketplace'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-03 15:14:23
