CREATE TABLE `distance_matrices` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`benchmark_case_id` bigint NOT NULL,
	`request_id` varchar(36) NOT NULL,
	`version` varchar(64) NOT NULL,
	`provider` varchar(16) NOT NULL,
	`profile` varchar(64) NOT NULL,
	`endpoint` text NOT NULL,
	`unit` varchar(16) NOT NULL,
	`directed` boolean NOT NULL,
	`input_hash` varchar(64) NOT NULL,
	`matrix_hash` varchar(64) NOT NULL,
	`point_count` int NOT NULL,
	`zero_pair_count` int NOT NULL,
	`generated_at` datetime(3) NOT NULL,
	`options_json` json NOT NULL,
	`node_order_json` json NOT NULL,
	`distance_matrix_json` json NOT NULL,
	`snapping_json` json NOT NULL,
	`provenance_json` json NOT NULL,
	CONSTRAINT `distance_matrices_id` PRIMARY KEY(`id`),
	CONSTRAINT `distance_matrices_case_request_unique` UNIQUE(`benchmark_case_id`,`request_id`)
);
--> statement-breakpoint
ALTER TABLE `distance_matrices` ADD CONSTRAINT `distance_matrices_benchmark_case_id_benchmark_cases_id_fk` FOREIGN KEY (`benchmark_case_id`) REFERENCES `benchmark_cases`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX `distance_matrices_case_id_idx` ON `distance_matrices` (`benchmark_case_id`,`id`);