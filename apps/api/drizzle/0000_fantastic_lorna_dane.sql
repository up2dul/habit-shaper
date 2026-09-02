CREATE TABLE `goals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`habit_id` int NOT NULL,
	`target_successful_days` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `goals_id` PRIMARY KEY(`id`),
	CONSTRAINT `goals_target_successful_days_check` CHECK(`goals`.`target_successful_days` > 0)
);
--> statement-breakpoint
CREATE TABLE `habit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`habit_id` int NOT NULL,
	`date` date NOT NULL,
	`event_type` enum('COMPLETION','RELAPSE') NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `habit_logs_id` PRIMARY KEY(`id`),
	CONSTRAINT `habit_logs_habit_date_unique` UNIQUE(`habit_id`,`date`)
);
--> statement-breakpoint
CREATE TABLE `habit_schedule_days` (
	`schedule_id` int NOT NULL,
	`day_of_week` int NOT NULL,
	CONSTRAINT `habit_schedule_days_schedule_id_day_of_week_pk` PRIMARY KEY(`schedule_id`,`day_of_week`),
	CONSTRAINT `habit_schedule_days_day_of_week_check` CHECK(`habit_schedule_days`.`day_of_week` between 0 and 6)
);
--> statement-breakpoint
CREATE TABLE `habit_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`habit_id` int NOT NULL,
	`effective_from` date NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `habit_schedules_id` PRIMARY KEY(`id`),
	CONSTRAINT `habit_schedules_habit_effective_unique` UNIQUE(`habit_id`,`effective_from`)
);
--> statement-breakpoint
CREATE TABLE `habits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('BUILD','BREAK') NOT NULL,
	`start_date` date NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `habits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` varchar(128) NOT NULL,
	`user_id` int NOT NULL,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `goals` ADD CONSTRAINT `goals_habit_id_habits_id_fk` FOREIGN KEY (`habit_id`) REFERENCES `habits`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `habit_logs` ADD CONSTRAINT `habit_logs_habit_id_habits_id_fk` FOREIGN KEY (`habit_id`) REFERENCES `habits`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `habit_schedule_days` ADD CONSTRAINT `habit_schedule_days_schedule_id_habit_schedules_id_fk` FOREIGN KEY (`schedule_id`) REFERENCES `habit_schedules`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `habit_schedules` ADD CONSTRAINT `habit_schedules_habit_id_habits_id_fk` FOREIGN KEY (`habit_id`) REFERENCES `habits`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `habits` ADD CONSTRAINT `habits_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `goals_habit_id_idx` ON `goals` (`habit_id`);--> statement-breakpoint
CREATE INDEX `habits_user_id_idx` ON `habits` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expires_at_idx` ON `sessions` (`expires_at`);