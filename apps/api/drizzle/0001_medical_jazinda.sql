ALTER TABLE `goals` DROP FOREIGN KEY `goals_habit_id_habits_id_fk`;--> statement-breakpoint
ALTER TABLE `habit_logs` DROP FOREIGN KEY `habit_logs_habit_id_habits_id_fk`;--> statement-breakpoint
ALTER TABLE `habit_schedule_days` DROP FOREIGN KEY `habit_schedule_days_schedule_id_habit_schedules_id_fk`;--> statement-breakpoint
ALTER TABLE `habit_schedules` DROP FOREIGN KEY `habit_schedules_habit_id_habits_id_fk`;--> statement-breakpoint
ALTER TABLE `habits` DROP FOREIGN KEY `habits_user_id_users_id_fk`;--> statement-breakpoint
ALTER TABLE `sessions` DROP FOREIGN KEY `sessions_user_id_users_id_fk`;--> statement-breakpoint
ALTER TABLE `goals` MODIFY COLUMN `id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `goals` MODIFY COLUMN `habit_id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `habit_logs` MODIFY COLUMN `id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `habit_logs` MODIFY COLUMN `habit_id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `habit_schedule_days` MODIFY COLUMN `schedule_id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `habit_schedules` MODIFY COLUMN `id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `habit_schedules` MODIFY COLUMN `habit_id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `habits` MODIFY COLUMN `id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `habits` MODIFY COLUMN `user_id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `sessions` MODIFY COLUMN `user_id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `goals` ADD CONSTRAINT `goals_habit_id_habits_id_fk` FOREIGN KEY (`habit_id`) REFERENCES `habits`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `habit_logs` ADD CONSTRAINT `habit_logs_habit_id_habits_id_fk` FOREIGN KEY (`habit_id`) REFERENCES `habits`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `habit_schedule_days` ADD CONSTRAINT `habit_schedule_days_schedule_id_habit_schedules_id_fk` FOREIGN KEY (`schedule_id`) REFERENCES `habit_schedules`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `habit_schedules` ADD CONSTRAINT `habit_schedules_habit_id_habits_id_fk` FOREIGN KEY (`habit_id`) REFERENCES `habits`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `habits` ADD CONSTRAINT `habits_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
