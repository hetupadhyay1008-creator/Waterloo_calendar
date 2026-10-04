CREATE TABLE `calendar` (
	`id` integer PRIMARY KEY NOT NULL,
	`feed` text NOT NULL,
	`events` text DEFAULT '[]' NOT NULL,
	`changes` text DEFAULT '[]' NOT NULL,
	`synced_at` text,
	`error` text
);
