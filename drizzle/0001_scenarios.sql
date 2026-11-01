CREATE TABLE `scenarios` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`depot_id` bigint NOT NULL,
	`name` varchar(255) NOT NULL,
	`distribution_pattern` varchar(32) NOT NULL,
	`customer_count` int NOT NULL,
	`radius_min_m` int,
	`radius_max_m` int,
	`generation_seed` bigint,
	`status` varchar(32) NOT NULL DEFAULT 'draft',
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `scenarios_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `scenarios` ADD CONSTRAINT `scenarios_depot_id_depots_id_fk` FOREIGN KEY (`depot_id`) REFERENCES `depots`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX `scenarios_depot_id_idx` ON `scenarios` (`depot_id`);