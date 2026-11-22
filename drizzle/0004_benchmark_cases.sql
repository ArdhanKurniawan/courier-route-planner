CREATE TABLE `benchmark_case_points` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`case_id` bigint NOT NULL,
	`node_index` int NOT NULL,
	`kind` varchar(8) NOT NULL,
	`source_id` bigint NOT NULL,
	`name` varchar(255) NOT NULL,
	`address` text,
	`latitude` double NOT NULL,
	`longitude` double NOT NULL,
	`order_code` varchar(64),
	`order_source` varchar(16),
	`depot_active` boolean,
	CONSTRAINT `benchmark_case_points_id` PRIMARY KEY(`id`),
	CONSTRAINT `benchmark_case_points_node_unique` UNIQUE(`case_id`,`node_index`),
	CONSTRAINT `benchmark_case_points_source_unique` UNIQUE(`case_id`,`kind`,`source_id`)
);
--> statement-breakpoint
CREATE TABLE `benchmark_cases` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`request_id` varchar(36) NOT NULL,
	`scenario_id` bigint NOT NULL,
	`scenario_snapshot` json NOT NULL,
	`configured_customer_count` int NOT NULL,
	`actual_order_count` int NOT NULL,
	`point_count` int NOT NULL,
	`input_version` varchar(64) NOT NULL,
	`input_hash` varchar(64) NOT NULL,
	`frozen_at` datetime(3) NOT NULL,
	`git_commit_sha` varchar(40),
	CONSTRAINT `benchmark_cases_id` PRIMARY KEY(`id`),
	CONSTRAINT `benchmark_cases_request_id_unique` UNIQUE(`request_id`)
);
--> statement-breakpoint
ALTER TABLE `benchmark_case_points` ADD CONSTRAINT `benchmark_case_points_case_id_benchmark_cases_id_fk` FOREIGN KEY (`case_id`) REFERENCES `benchmark_cases`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `benchmark_cases` ADD CONSTRAINT `benchmark_cases_scenario_id_scenarios_id_fk` FOREIGN KEY (`scenario_id`) REFERENCES `scenarios`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX `benchmark_cases_scenario_id_idx` ON `benchmark_cases` (`scenario_id`);