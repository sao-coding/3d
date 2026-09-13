CREATE TABLE `brands` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `brands_name_unique` ON `brands` (`name`);--> statement-breakpoint
CREATE TABLE `filaments` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_id` text,
	`material_id` text NOT NULL,
	`color_name` text,
	`color` text,
	`purchase_price` integer NOT NULL,
	`weight_grams` integer DEFAULT 1000 NOT NULL,
	`cost_per_gram` real NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`purchased_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `filaments_brandId_idx` ON `filaments` (`brand_id`);--> statement-breakpoint
CREATE INDEX `filaments_materialId_idx` ON `filaments` (`material_id`);--> statement-breakpoint
CREATE TABLE `materials` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`pros` text NOT NULL,
	`cons` text NOT NULL,
	`good_for` text,
	`is_high_temp` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `materials_name_unique` ON `materials` (`name`);--> statement-breakpoint
CREATE TABLE `modeling_tiers` (
	`id` text PRIMARY KEY NOT NULL,
	`tier_name` text NOT NULL,
	`default_price` integer NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pricing_settings` (
	`id` text PRIMARY KEY DEFAULT 'default' NOT NULL,
	`failure_rate_percent` integer DEFAULT 12 NOT NULL,
	`depreciation_per_hour` integer DEFAULT 5 NOT NULL,
	`electricity_summer` real DEFAULT 6 NOT NULL,
	`electricity_offseason` real DEFAULT 4.8 NOT NULL,
	`slicing_fixed_fee` integer DEFAULT 30 NOT NULL,
	`cleanup_rate_per_minute` integer DEFAULT 3 NOT NULL,
	`revision_fee` integer DEFAULT 250 NOT NULL,
	`free_revision_count` integer DEFAULT 2 NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `quotes` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`recipient_name` text,
	`filament_id` text NOT NULL,
	`weight_grams` real,
	`print_hours` real,
	`season` text NOT NULL,
	`cleanup_minutes` integer DEFAULT 0 NOT NULL,
	`failure_rate_percent` integer NOT NULL,
	`needs_modeling` integer DEFAULT false NOT NULL,
	`modeling_tier_id` text,
	`modeling_custom_price` integer,
	`model_url` text,
	`notes` text,
	`revision_count` integer DEFAULT 0 NOT NULL,
	`material_cost` integer,
	`electricity_depreciation_cost` integer,
	`labor_cost` integer NOT NULL,
	`failure_buffer_cost` integer,
	`modeling_cost` integer NOT NULL,
	`revision_cost` integer NOT NULL,
	`total_price` integer,
	`rounded_price` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`filament_id`) REFERENCES `filaments`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`modeling_tier_id`) REFERENCES `modeling_tiers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `quotes_filamentId_idx` ON `quotes` (`filament_id`);--> statement-breakpoint
CREATE INDEX `quotes_status_idx` ON `quotes` (`status`);--> statement-breakpoint
CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`issuer` text NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_issuer_accountId_uidx` ON `account` (`issuer`,`account_id`);--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);