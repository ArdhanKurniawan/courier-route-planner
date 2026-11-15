CREATE TABLE `dummy_order_operations` (
	`operation_id` varchar(36) NOT NULL,
	`scenario_id` bigint NOT NULL,
	`operation_version` bigint NOT NULL,
	`active_scenario_id` bigint,
	`request_hash` varchar(64) NOT NULL,
	`before_hash` varchar(64) NOT NULL,
	`after_hash` varchar(64),
	`status` varchar(16) NOT NULL,
	`saved_count` int NOT NULL,
	`replaced_count` int NOT NULL,
	CONSTRAINT `dummy_order_operations_operation_id` PRIMARY KEY(`operation_id`),
	CONSTRAINT `dummy_order_ops_active_scenario_unique` UNIQUE(`active_scenario_id`),
	CONSTRAINT `dummy_order_ops_scenario_version_unique` UNIQUE(`scenario_id`,`operation_version`)
);
--> statement-breakpoint
ALTER TABLE `dummy_order_operations` ADD CONSTRAINT `dummy_order_operations_active_scenario_id_scenarios_id_fk` FOREIGN KEY (`active_scenario_id`) REFERENCES `scenarios`(`id`) ON DELETE restrict ON UPDATE restrict;