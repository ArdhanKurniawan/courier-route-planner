CREATE TABLE `orders` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`scenario_id` bigint NOT NULL,
	`order_code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
	`customer_name` varchar(255) NOT NULL,
	`address` text,
	`latitude` double NOT NULL,
	`longitude` double NOT NULL,
	`source` varchar(16) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_scenario_code_unique` UNIQUE(`scenario_id`,`order_code`)
);
--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_scenario_id_scenarios_id_fk` FOREIGN KEY (`scenario_id`) REFERENCES `scenarios`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX `orders_scenario_id_id_idx` ON `orders` (`scenario_id`,`id`);