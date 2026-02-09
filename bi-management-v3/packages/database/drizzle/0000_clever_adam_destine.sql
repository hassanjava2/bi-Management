CREATE TABLE IF NOT EXISTS "approval_delegations" (
	"id" text PRIMARY KEY NOT NULL,
	"delegator_id" text,
	"delegatee_id" text,
	"entity_types" jsonb,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"reason" text,
	"is_active" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "approvals" (
	"id" text PRIMARY KEY NOT NULL,
	"approval_number" text,
	"type" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"requested_by" text NOT NULL,
	"request_reason" text NOT NULL,
	"request_data" text,
	"status" text DEFAULT 'pending',
	"decided_by" text,
	"decision_reason" text,
	"decided_at" timestamp,
	"priority" text DEFAULT 'normal',
	"expires_at" timestamp,
	"notification_sent" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "approvals_approval_number_unique" UNIQUE("approval_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"event_category" text NOT NULL,
	"severity" text DEFAULT 'info',
	"user_id" text,
	"user_name" text,
	"user_role" text,
	"ip_address" text,
	"user_agent" text,
	"device_fingerprint" text,
	"entity_type" text,
	"entity_id" text,
	"entity_name" text,
	"old_value" text,
	"new_value" text,
	"changes" text,
	"request_id" text,
	"session_id" text,
	"module" text,
	"action" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "backup_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"file_name" text NOT NULL,
	"file_size" text,
	"location" text,
	"type" text DEFAULT 'full',
	"status" text DEFAULT 'pending',
	"started_at" timestamp,
	"completed_at" timestamp,
	"error" text,
	"initiated_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "backup_settings" (
	"id" text PRIMARY KEY DEFAULT 'main' NOT NULL,
	"auto_backup_enabled" integer DEFAULT 1,
	"backup_frequency" text DEFAULT 'daily',
	"backup_time" text DEFAULT '03:00',
	"backup_retention_days" integer DEFAULT 30,
	"backup_location" text DEFAULT 'local',
	"cloud_provider" text,
	"cloud_bucket" text,
	"cloud_access_key" text,
	"cloud_secret_key" text,
	"last_backup_at" timestamp,
	"last_backup_size" text,
	"last_backup_status" text,
	"updated_by" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "budget_expenses" (
	"id" text PRIMARY KEY NOT NULL,
	"budget_id" text NOT NULL,
	"budget_item_id" text,
	"description" text NOT NULL,
	"amount" text NOT NULL,
	"expense_date" timestamp NOT NULL,
	"reference_type" text,
	"reference_id" text,
	"reference_number" text,
	"attachments" jsonb,
	"status" text DEFAULT 'recorded',
	"recorded_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "budget_items" (
	"id" text PRIMARY KEY NOT NULL,
	"budget_id" text NOT NULL,
	"category" text NOT NULL,
	"subcategory" text,
	"account_id" text,
	"name" text NOT NULL,
	"description" text,
	"budgeted_amount" text NOT NULL,
	"allocated_amount" text DEFAULT '0',
	"spent_amount" text DEFAULT '0',
	"monthly_breakdown" jsonb,
	"priority" text DEFAULT 'medium',
	"is_required" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "budget_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"warning_threshold" integer DEFAULT 80,
	"critical_threshold" integer DEFAULT 95,
	"require_approval_above" text,
	"approval_levels" jsonb,
	"notify_on_threshold" boolean DEFAULT true,
	"notify_emails" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "budgets" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"fiscal_year" integer NOT NULL,
	"period" text DEFAULT 'yearly',
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"scope" text DEFAULT 'company',
	"branch_id" text,
	"department_id" text,
	"total_budget" text NOT NULL,
	"total_allocated" text DEFAULT '0',
	"total_spent" text DEFAULT '0',
	"status" text DEFAULT 'draft',
	"approved_by" text,
	"approved_at" timestamp,
	"notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bundle_items" (
	"id" text PRIMARY KEY NOT NULL,
	"bundle_id" text NOT NULL,
	"product_id" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"sort_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "company_info" (
	"id" text PRIMARY KEY DEFAULT 'main' NOT NULL,
	"name" text NOT NULL,
	"name_ar" text,
	"full_name" text,
	"tagline" text,
	"logo" text,
	"favicon" text,
	"phone" text,
	"phone2" text,
	"whatsapp" text,
	"email" text,
	"website" text,
	"country" text,
	"city" text,
	"address" text,
	"address_ar" text,
	"map_url" text,
	"tax_number" text,
	"commercial_register" text,
	"license_number" text,
	"facebook" text,
	"instagram" text,
	"twitter" text,
	"youtube" text,
	"tiktok" text,
	"founded_year" integer,
	"employees_count" integer,
	"description" text,
	"description_ar" text,
	"owner_name" text,
	"owner_phone" text,
	"updated_by" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customer_pricing" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text,
	"customer_group" text,
	"product_id" text,
	"category_id" text,
	"price_type" text NOT NULL,
	"price_value" text NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"is_active" boolean DEFAULT true,
	"created_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invoice_settings" (
	"id" text PRIMARY KEY DEFAULT 'main' NOT NULL,
	"invoice_prefix" text DEFAULT 'INV',
	"invoice_number_length" integer DEFAULT 6,
	"invoice_start_number" integer DEFAULT 1,
	"tax_enabled" integer DEFAULT 0,
	"tax_rate" real DEFAULT 0,
	"tax_name" text,
	"tax_number" text,
	"print_header" text,
	"print_footer" text,
	"show_logo" integer DEFAULT 1,
	"show_qr_code" integer DEFAULT 1,
	"paper_size" text DEFAULT 'A4',
	"terms_and_conditions" text,
	"return_policy" text,
	"warranty_terms" text,
	"currency" text DEFAULT 'IQD',
	"currency_symbol" text DEFAULT 'د.ع',
	"currency_position" text DEFAULT 'after',
	"updated_by" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"notification_type" text NOT NULL,
	"email_enabled" integer DEFAULT 1,
	"app_enabled" integer DEFAULT 1,
	"sms_enabled" integer DEFAULT 0,
	"quiet_hours_start" text,
	"quiet_hours_end" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_settings" (
	"id" text PRIMARY KEY DEFAULT 'main' NOT NULL,
	"email_enabled" integer DEFAULT 0,
	"smtp_host" text,
	"smtp_port" integer,
	"smtp_user" text,
	"smtp_password" text,
	"email_from" text,
	"email_from_name" text,
	"sms_enabled" integer DEFAULT 0,
	"sms_provider" text,
	"sms_api_key" text,
	"sms_sender_id" text,
	"whatsapp_enabled" integer DEFAULT 0,
	"whatsapp_api_key" text,
	"whatsapp_number" text,
	"telegram_enabled" integer DEFAULT 0,
	"telegram_bot_token" text,
	"telegram_chat_id" text,
	"updated_by" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_bundles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"original_price" text,
	"bundle_price" text NOT NULL,
	"savings_amount" text,
	"savings_percentage" text,
	"start_date" timestamp,
	"end_date" timestamp,
	"is_active" boolean DEFAULT true,
	"stock_limit" integer,
	"sold_count" integer DEFAULT 0,
	"image" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "promotion_usages" (
	"id" text PRIMARY KEY NOT NULL,
	"promotion_id" text,
	"discount_code_id" text,
	"invoice_id" text,
	"invoice_number" text,
	"customer_id" text,
	"discount_amount" text NOT NULL,
	"order_amount" text,
	"branch_id" text,
	"applied_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "promotions" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text,
	"name" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"discount_value" text,
	"max_discount_amount" text,
	"buy_quantity" integer,
	"get_quantity" integer,
	"get_free_product" text,
	"minimum_order_amount" text,
	"minimum_quantity" integer,
	"applies_to" text DEFAULT 'all',
	"applicable_products" jsonb,
	"applicable_categories" jsonb,
	"applicable_customers" jsonb,
	"excluded_products" jsonb,
	"applicable_branches" jsonb,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"usage_limit" integer,
	"usage_limit_per_customer" integer,
	"current_usage_count" integer DEFAULT 0,
	"status" text DEFAULT 'draft',
	"is_automatic" boolean DEFAULT false,
	"priority" integer DEFAULT 0,
	"stackable" boolean DEFAULT false,
	"banner_image" text,
	"badge_text" text,
	"badge_color" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "promotions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "return_reasons" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text,
	"category" text,
	"requires_inspection" integer DEFAULT 0,
	"default_classification" text,
	"is_active" integer DEFAULT 1,
	"sort_order" integer DEFAULT 0,
	CONSTRAINT "return_reasons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "settings" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text,
	"type" text DEFAULT 'string',
	"category" text,
	"description" text,
	"is_system" integer DEFAULT 0,
	"updated_by" text,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "system_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"key" text NOT NULL,
	"value" text,
	"value_json" jsonb,
	"value_type" text DEFAULT 'string',
	"label" text,
	"label_ar" text,
	"description" text,
	"is_public" integer DEFAULT 0,
	"is_editable" integer DEFAULT 1,
	"updated_by" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "warranty_settings" (
	"id" text PRIMARY KEY DEFAULT 'main' NOT NULL,
	"default_warranty_months" integer DEFAULT 12,
	"extended_warranty_months" integer DEFAULT 24,
	"warranty_covers" text,
	"warranty_excludes" text,
	"warranty_process" text,
	"notify_before_expiry" integer DEFAULT 30,
	"updated_by" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workflow_approvals" (
	"id" text PRIMARY KEY NOT NULL,
	"instance_id" text,
	"step_index" integer NOT NULL,
	"step_name" text,
	"assigned_to" text,
	"assigned_role" text,
	"status" text DEFAULT 'pending',
	"action_by" text,
	"action_at" timestamp,
	"comments" text,
	"delegated_to" text,
	"escalated_to" text,
	"due_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workflow_instances" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text,
	"template_id" text,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"current_step" integer DEFAULT 0,
	"status" text DEFAULT 'pending',
	"priority" text DEFAULT 'normal',
	"requested_by" text,
	"requested_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"completed_by" text,
	"metadata" jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "workflow_instances_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workflow_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text,
	"name" text NOT NULL,
	"name_ar" text,
	"description" text,
	"entity_type" text NOT NULL,
	"steps" jsonb,
	"is_active" integer DEFAULT 1,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "workflow_templates_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "permissions" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text,
	"module" text NOT NULL,
	"feature" text NOT NULL,
	"action" text NOT NULL,
	"description" text,
	"is_sensitive" integer DEFAULT 0,
	"requires_2fa" integer DEFAULT 0,
	"requires_approval" integer DEFAULT 0,
	"security_level" integer DEFAULT 1,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "permissions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "role_permissions" (
	"role_id" text NOT NULL,
	"permission_id" text NOT NULL,
	"granted_at" timestamp DEFAULT now(),
	"granted_by" text,
	CONSTRAINT "role_permissions_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_ar" text,
	"description" text,
	"security_level" integer DEFAULT 1,
	"is_system" integer DEFAULT 0,
	"is_active" integer DEFAULT 1,
	"color" text DEFAULT '#3B82F6',
	"icon" text DEFAULT 'Shield',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"email" text,
	"password_hash" text NOT NULL,
	"full_name" text NOT NULL,
	"phone" text,
	"avatar_url" text,
	"role_id" text,
	"role" text DEFAULT 'viewer',
	"is_active" integer DEFAULT 1,
	"is_locked" integer DEFAULT 0,
	"security_level" integer DEFAULT 1,
	"last_login_at" timestamp,
	"last_login_ip" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" text,
	"is_deleted" integer DEFAULT 0,
	"deleted_at" timestamp,
	"deleted_by" text,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "branches" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"name_ar" text,
	"address" text,
	"city" text,
	"phone" text,
	"email" text,
	"manager_id" text,
	"is_main" integer DEFAULT 0,
	"is_active" integer DEFAULT 1,
	"settings" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "branches_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"parent_id" text,
	"code" text,
	"name" text NOT NULL,
	"name_ar" text,
	"slug" text,
	"description" text,
	"icon" text,
	"image_url" text,
	"sort_order" integer DEFAULT 0,
	"is_active" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "categories_code_unique" UNIQUE("code"),
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "products" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text,
	"sku" text,
	"barcode" text,
	"name" text NOT NULL,
	"name_ar" text,
	"description" text,
	"category_id" text,
	"brand" text,
	"model" text,
	"specs" text,
	"cost_price" real,
	"cost_price_encrypted" text,
	"selling_price" real,
	"wholesale_price" real,
	"min_price" real,
	"track_by_serial" integer DEFAULT 0,
	"quantity" integer DEFAULT 0,
	"min_quantity" integer DEFAULT 0,
	"max_quantity" integer,
	"unit" text DEFAULT 'piece',
	"warranty_months" integer DEFAULT 0,
	"is_active" integer DEFAULT 1,
	"is_featured" integer DEFAULT 0,
	"is_archived" integer DEFAULT 0,
	"images" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" text,
	"is_deleted" integer DEFAULT 0,
	"deleted_at" timestamp,
	CONSTRAINT "products_code_unique" UNIQUE("code"),
	CONSTRAINT "products_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "warehouses" (
	"id" text PRIMARY KEY NOT NULL,
	"branch_id" text,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"name_ar" text,
	"type" text NOT NULL,
	"is_active" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "warehouses_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "serial_numbers" (
	"id" text PRIMARY KEY NOT NULL,
	"serial_number" text NOT NULL,
	"product_id" text NOT NULL,
	"purchase_cost" real,
	"purchase_cost_encrypted" text,
	"selling_price" real,
	"status" text DEFAULT 'available' NOT NULL,
	"warehouse_id" text,
	"location_id" text,
	"custody_user_id" text,
	"custody_since" timestamp,
	"custody_reason" text,
	"supplier_id" text,
	"purchase_invoice_id" text,
	"purchase_date" timestamp,
	"sale_invoice_id" text,
	"sale_date" timestamp,
	"customer_id" text,
	"warranty_months" integer,
	"warranty_start" timestamp,
	"warranty_end" timestamp,
	"supplier_warranty_end" timestamp,
	"condition" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" text,
	CONSTRAINT "serial_numbers_serial_number_unique" UNIQUE("serial_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "warehouse_locations" (
	"id" text PRIMARY KEY NOT NULL,
	"warehouse_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text,
	"area" text,
	"shelf" text,
	"row" text,
	"is_active" integer DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "serial_movements" (
	"id" text PRIMARY KEY NOT NULL,
	"serial_id" text NOT NULL,
	"movement_type" text NOT NULL,
	"from_warehouse_id" text,
	"to_warehouse_id" text,
	"from_status" text,
	"to_status" text,
	"reference_type" text,
	"reference_id" text,
	"performed_by" text,
	"performed_at" timestamp DEFAULT now(),
	"notes" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "suppliers" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text,
	"name" text NOT NULL,
	"name_ar" text,
	"type" text DEFAULT 'company',
	"contact_person" text,
	"phone" text,
	"phone2" text,
	"email" text,
	"website" text,
	"address" text,
	"city" text,
	"country" text,
	"default_warranty_months" integer DEFAULT 0,
	"warranty_terms" text,
	"balance" real DEFAULT 0,
	"credit_limit" real DEFAULT 0,
	"payment_terms" text,
	"tax_number" text,
	"rating" real DEFAULT 0,
	"total_purchases" real DEFAULT 0,
	"notes" text,
	"tags" text,
	"is_active" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"is_deleted" integer DEFAULT 0,
	"deleted_at" timestamp,
	CONSTRAINT "suppliers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customer_contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"position" text,
	"is_primary" integer DEFAULT 0,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text,
	"name" text NOT NULL,
	"type" text DEFAULT 'retail',
	"phone" text NOT NULL,
	"phone2" text,
	"email" text,
	"addresses" text DEFAULT '[]',
	"default_address_index" integer DEFAULT 0,
	"balance" real DEFAULT 0,
	"credit_limit" real DEFAULT 0,
	"loyalty_points" integer DEFAULT 0,
	"loyalty_level" text DEFAULT 'bronze',
	"total_purchases" real DEFAULT 0,
	"purchase_count" integer DEFAULT 0,
	"last_purchase_at" timestamp,
	"customer_score" real DEFAULT 0,
	"payment_score" real DEFAULT 0,
	"notes" text,
	"tags" text,
	"is_active" integer DEFAULT 1,
	"is_blocked" integer DEFAULT 0,
	"blocked_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" text,
	"is_deleted" integer DEFAULT 0,
	"deleted_at" timestamp,
	CONSTRAINT "customers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inventory" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"location_id" text,
	"quantity" integer DEFAULT 0,
	"reserved_quantity" integer DEFAULT 0,
	"min_quantity" integer DEFAULT 0,
	"max_quantity" integer,
	"reorder_point" integer,
	"last_count_date" timestamp,
	"last_count_quantity" integer,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inventory_movements" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"movement_type" text NOT NULL,
	"quantity" integer NOT NULL,
	"before_quantity" integer,
	"after_quantity" integer,
	"unit_cost" text,
	"total_cost" text,
	"reference_type" text,
	"reference_id" text,
	"notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "installment_schedules" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"installment_number" integer NOT NULL,
	"amount" real NOT NULL,
	"due_date" text NOT NULL,
	"status" text DEFAULT 'pending',
	"paid_amount" real DEFAULT 0,
	"paid_date" timestamp,
	"paid_by" text,
	"late_fee" real DEFAULT 0,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invoice_items" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"product_id" text,
	"serial_id" text,
	"description" text,
	"quantity" integer DEFAULT 1,
	"unit_price" real NOT NULL,
	"cost_price" real,
	"discount" real DEFAULT 0,
	"discount_percent" real DEFAULT 0,
	"tax" real DEFAULT 0,
	"total" real NOT NULL,
	"warranty_months" integer,
	"warranty_start" timestamp,
	"warranty_end" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invoice_payments" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"amount" real NOT NULL,
	"payment_method" text NOT NULL,
	"reference_number" text,
	"bank_name" text,
	"check_number" text,
	"check_date" timestamp,
	"received_by" text,
	"received_at" timestamp DEFAULT now(),
	"notes" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_number" text NOT NULL,
	"type" text NOT NULL,
	"payment_type" text,
	"customer_id" text,
	"supplier_id" text,
	"branch_id" text,
	"warehouse_id" text,
	"subtotal" real DEFAULT 0,
	"discount_amount" real DEFAULT 0,
	"discount_percent" real DEFAULT 0,
	"tax_amount" real DEFAULT 0,
	"shipping_cost" real DEFAULT 0,
	"total" real DEFAULT 0,
	"installment_platform" text,
	"platform_fee" real DEFAULT 0,
	"platform_fee_percent" real DEFAULT 0,
	"down_payment" real DEFAULT 0,
	"installment_months" integer,
	"monthly_payment" real,
	"total_with_fees" real,
	"payment_method" text,
	"payment_status" text DEFAULT 'pending',
	"paid_amount" real DEFAULT 0,
	"remaining_amount" real DEFAULT 0,
	"due_date" timestamp,
	"status" text DEFAULT 'draft',
	"requires_approval" integer DEFAULT 0,
	"approved_by" text,
	"approved_at" timestamp,
	"delivery_required" integer DEFAULT 0,
	"delivery_company" text,
	"delivery_tracking" text,
	"delivery_status" text,
	"delivery_date" timestamp,
	"delivery_address" text,
	"notes" text,
	"internal_notes" text,
	"related_invoice_id" text,
	"journal_entry_id" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"is_deleted" integer DEFAULT 0,
	"deleted_at" timestamp,
	"voided_at" timestamp,
	"voided_by" text,
	"void_reason" text,
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "return_alert_settings" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"yellow_days" integer DEFAULT 7,
	"orange_days" integer DEFAULT 14,
	"red_days" integer DEFAULT 30,
	"enable_email_alerts" boolean DEFAULT true,
	"enable_sms_alerts" boolean DEFAULT false,
	"enable_whatsapp_alerts" boolean DEFAULT false,
	"enable_system_alerts" boolean DEFAULT true,
	"alert_recipients" jsonb,
	"reminder_interval_days" integer DEFAULT 3,
	"max_reminders" integer DEFAULT 5,
	"auto_report_enabled" boolean DEFAULT false,
	"auto_report_frequency" varchar(20) DEFAULT 'weekly',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "return_history" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"return_request_id" varchar(36) NOT NULL,
	"return_item_id" varchar(36),
	"event_type" varchar(50) NOT NULL,
	"from_status" varchar(50),
	"to_status" varchar(50),
	"details" text,
	"metadata" jsonb,
	"performed_by" varchar(36),
	"performed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "return_items" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"return_request_id" varchar(36) NOT NULL,
	"product_id" varchar(36),
	"product_name" varchar(255),
	"product_model" varchar(255),
	"serial_id" varchar(36),
	"serial_number" varchar(100),
	"quantity" integer DEFAULT 1,
	"return_reason" varchar(100),
	"reason_details" text,
	"item_status" varchar(50) DEFAULT 'pending',
	"resolution" varchar(50),
	"resolution_notes" text,
	"resolved_at" timestamp,
	"replacement_serial_id" varchar(36),
	"replacement_serial_number" varchar(100),
	"photos" jsonb,
	"repair_cost" numeric(12, 2),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "return_message_templates" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"template_type" varchar(50) NOT NULL,
	"channel" varchar(50) NOT NULL,
	"language" varchar(10) DEFAULT 'ar',
	"subject" varchar(255),
	"content" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "return_requests" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"return_number" varchar(50) NOT NULL,
	"supplier_id" varchar(36),
	"supplier_name" varchar(255),
	"return_type" varchar(50) DEFAULT 'defective',
	"status" varchar(50) DEFAULT 'pending',
	"color_code" varchar(20) DEFAULT 'green',
	"created_at" timestamp DEFAULT now(),
	"sent_at" timestamp,
	"received_at" timestamp,
	"resolved_at" timestamp,
	"created_by" varchar(36),
	"notes" text,
	"internal_notes" text,
	"photos_before" jsonb,
	"shipping_method" varchar(100),
	"tracking_number" varchar(100),
	"shipping_cost" numeric(12, 2),
	"total_items" integer DEFAULT 0,
	"last_reminder_at" timestamp,
	"reminder_count" integer DEFAULT 0,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "return_requests_return_number_unique" UNIQUE("return_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "returns" (
	"id" text PRIMARY KEY NOT NULL,
	"return_number" text,
	"customer_id" text,
	"invoice_id" text,
	"return_date" timestamp DEFAULT now(),
	"status" text DEFAULT 'pending',
	"total_amount" numeric(12, 2),
	"notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "returns_return_number_unique" UNIQUE("return_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "maintenance_history" (
	"id" text PRIMARY KEY NOT NULL,
	"maintenance_order_id" text NOT NULL,
	"action" text NOT NULL,
	"action_details" text,
	"old_status" text,
	"new_status" text,
	"performed_by" text,
	"performed_at" timestamp DEFAULT now(),
	"notes" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "maintenance_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"order_number" text NOT NULL,
	"type" text NOT NULL,
	"serial_id" text,
	"customer_id" text,
	"supplier_id" text,
	"issue_description" text NOT NULL,
	"issue_category" text,
	"issue_images" text,
	"diagnosis" text,
	"diagnosed_by" text,
	"diagnosed_at" timestamp,
	"status" text DEFAULT 'received',
	"assigned_to" text,
	"assigned_at" timestamp,
	"is_warranty" integer DEFAULT 0,
	"warranty_claim_id" text,
	"estimated_cost" real DEFAULT 0,
	"parts_cost" real DEFAULT 0,
	"labor_cost" real DEFAULT 0,
	"total_cost" real DEFAULT 0,
	"paid_amount" real DEFAULT 0,
	"payment_status" text DEFAULT 'pending',
	"expected_completion" timestamp,
	"completed_at" timestamp,
	"delivered_at" timestamp,
	"notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "maintenance_orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "maintenance_parts" (
	"id" text PRIMARY KEY NOT NULL,
	"maintenance_order_id" text NOT NULL,
	"part_name" text NOT NULL,
	"part_number" text,
	"product_id" text,
	"serial_id" text,
	"quantity" integer DEFAULT 1,
	"unit_cost" real DEFAULT 0,
	"total_cost" real DEFAULT 0,
	"source" text,
	"notes" text,
	"added_by" text,
	"added_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"name_ar" text,
	"parent_id" text,
	"type" text NOT NULL,
	"nature" text,
	"balance" real DEFAULT 0,
	"is_system" integer DEFAULT 0,
	"is_active" integer DEFAULT 1,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "accounts_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "journal_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"entry_number" text NOT NULL,
	"entry_date" text NOT NULL,
	"description" text,
	"reference_type" text,
	"reference_id" text,
	"total_debit" real DEFAULT 0,
	"total_credit" real DEFAULT 0,
	"status" text DEFAULT 'draft',
	"posted_by" text,
	"posted_at" timestamp,
	"is_reversal" integer DEFAULT 0,
	"reversed_entry_id" text,
	"reversal_date" timestamp,
	"reversal_reason" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "journal_entries_entry_number_unique" UNIQUE("entry_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "journal_entry_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"journal_entry_id" text NOT NULL,
	"account_id" text NOT NULL,
	"debit" real DEFAULT 0,
	"credit" real DEFAULT 0,
	"description" text,
	"cost_center" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bank_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_number" text NOT NULL,
	"bank_name" text NOT NULL,
	"account_name" text,
	"branch_name" text,
	"balance" real DEFAULT 0,
	"currency" text DEFAULT 'IQD',
	"iban" text,
	"swift_code" text,
	"is_active" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "bank_accounts_account_number_unique" UNIQUE("account_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bank_reconciliations" (
	"id" text PRIMARY KEY NOT NULL,
	"bank_account_id" text NOT NULL,
	"statement_date" text NOT NULL,
	"statement_balance" real NOT NULL,
	"book_balance" real,
	"difference" real,
	"notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cash_registers" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"branch_id" text,
	"responsible_user_id" text,
	"balance" real DEFAULT 0,
	"currency" text DEFAULT 'IQD',
	"is_active" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "cash_registers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cash_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"cash_register_id" text NOT NULL,
	"type" text NOT NULL,
	"amount" real NOT NULL,
	"balance_before" real,
	"balance_after" real,
	"reference_type" text,
	"reference_id" text,
	"description" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "checks" (
	"id" text PRIMARY KEY NOT NULL,
	"check_number" text NOT NULL,
	"type" text NOT NULL,
	"bank_account_id" text,
	"amount" real NOT NULL,
	"customer_id" text,
	"supplier_id" text,
	"payee_name" text,
	"check_date" text NOT NULL,
	"due_date" text,
	"status" text DEFAULT 'pending',
	"deposited_at" timestamp,
	"cleared_at" timestamp,
	"bounced_at" timestamp,
	"bounce_reason" text,
	"notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vouchers" (
	"id" text PRIMARY KEY NOT NULL,
	"voucher_number" text NOT NULL,
	"type" text NOT NULL,
	"amount" real NOT NULL,
	"currency" text DEFAULT 'IQD',
	"customer_id" text,
	"supplier_id" text,
	"employee_id" text,
	"from_account_id" text,
	"to_account_id" text,
	"reference_type" text,
	"reference_id" text,
	"payment_method" text,
	"check_id" text,
	"bank_account_id" text,
	"cash_register_id" text,
	"description" text,
	"notes" text,
	"journal_entry_id" text,
	"status" text DEFAULT 'posted',
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"is_deleted" integer DEFAULT 0,
	"deleted_at" timestamp,
	CONSTRAINT "vouchers_voucher_number_unique" UNIQUE("voucher_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "attendance" (
	"id" text PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"date" text NOT NULL,
	"check_in" text,
	"check_out" text,
	"check_in_location" text,
	"check_out_location" text,
	"work_hours" real,
	"overtime_hours" real DEFAULT 0,
	"status" text DEFAULT 'present',
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "departments" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text,
	"name" text NOT NULL,
	"name_ar" text,
	"parent_id" text,
	"manager_id" text,
	"is_active" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "departments_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employees" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"employee_code" text,
	"department_id" text,
	"position_id" text,
	"manager_id" text,
	"work_start_time" text,
	"work_end_time" text,
	"work_days" text,
	"salary" real,
	"salary_encrypted" text,
	"salary_type" text,
	"allowances" text,
	"bank_account" text,
	"bank_name" text,
	"hire_date" text,
	"contract_end_date" text,
	"contract_type" text,
	"emergency_contact" text,
	"emergency_phone" text,
	"documents" text,
	"is_active" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "employees_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "employees_employee_code_unique" UNIQUE("employee_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "leaves" (
	"id" text PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"type" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"days" integer NOT NULL,
	"reason" text,
	"status" text DEFAULT 'pending',
	"approved_by" text,
	"approved_at" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "positions" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text,
	"name" text NOT NULL,
	"name_ar" text,
	"department_id" text,
	"level" integer DEFAULT 1,
	"is_active" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "positions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "salaries" (
	"id" text PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"period_start" text NOT NULL,
	"period_end" text NOT NULL,
	"basic_salary" real NOT NULL,
	"allowances" real DEFAULT 0,
	"overtime" real DEFAULT 0,
	"bonuses" real DEFAULT 0,
	"deductions" real DEFAULT 0,
	"advances_deducted" real DEFAULT 0,
	"loans_deducted" real DEFAULT 0,
	"net_salary" real NOT NULL,
	"status" text DEFAULT 'draft',
	"approved_by" text,
	"approved_at" timestamp,
	"paid_at" timestamp,
	"payment_method" text,
	"payment_reference" text,
	"notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "salary_advances" (
	"id" text PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"amount" real NOT NULL,
	"reason" text,
	"deduction_type" text DEFAULT 'installments',
	"installment_amount" real,
	"installment_count" integer,
	"remaining_amount" real,
	"status" text DEFAULT 'pending',
	"approved_by" text,
	"approved_at" timestamp,
	"rejection_reason" text,
	"disbursed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "delivery_collections" (
	"id" text PRIMARY KEY NOT NULL,
	"collection_number" text,
	"delivery_company_id" text NOT NULL,
	"expected_amount" real NOT NULL,
	"received_amount" real NOT NULL,
	"difference" real DEFAULT 0,
	"payment_method" text,
	"reference_number" text,
	"bank_name" text,
	"shipments_count" integer DEFAULT 0,
	"shipment_ids" text,
	"notes" text,
	"received_by" text,
	"received_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "delivery_collections_collection_number_unique" UNIQUE("collection_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "delivery_companies" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text,
	"name" text NOT NULL,
	"name_ar" text,
	"type" text DEFAULT 'company' NOT NULL,
	"phone" text,
	"phone2" text,
	"email" text,
	"address" text,
	"contact_person" text,
	"balance" real DEFAULT 0,
	"pending_orders" integer DEFAULT 0,
	"fee_type" text DEFAULT 'fixed',
	"fee_amount" real DEFAULT 0,
	"requires_video" integer DEFAULT 1,
	"auto_track" integer DEFAULT 0,
	"api_endpoint" text,
	"api_key" text,
	"notes" text,
	"is_active" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "delivery_companies_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "delivery_zones" (
	"id" text PRIMARY KEY NOT NULL,
	"delivery_company_id" text NOT NULL,
	"zone_name" text NOT NULL,
	"zone_name_ar" text,
	"cities" text,
	"fee" real NOT NULL,
	"estimated_days" integer DEFAULT 1,
	"is_active" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shipment_items" (
	"id" text PRIMARY KEY NOT NULL,
	"shipment_id" text NOT NULL,
	"invoice_item_id" text,
	"serial_number" text,
	"product_name" text,
	"quantity" integer DEFAULT 1,
	"status" text DEFAULT 'included',
	"return_reason" text,
	"return_condition" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shipment_tracking" (
	"id" text PRIMARY KEY NOT NULL,
	"shipment_id" text NOT NULL,
	"status" text NOT NULL,
	"status_ar" text,
	"location" text,
	"description" text,
	"source" text DEFAULT 'manual',
	"external_id" text,
	"recorded_by" text,
	"recorded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shipments" (
	"id" text PRIMARY KEY NOT NULL,
	"shipment_number" text NOT NULL,
	"invoice_id" text NOT NULL,
	"delivery_company_id" text NOT NULL,
	"customer_id" text,
	"status" text DEFAULT 'preparing' NOT NULL,
	"tracking_number" text,
	"external_tracking_url" text,
	"recipient_name" text,
	"recipient_phone" text,
	"recipient_phone2" text,
	"delivery_address" text,
	"city" text,
	"area" text,
	"notes" text,
	"cod_amount" real DEFAULT 0,
	"delivery_fee" real DEFAULT 0,
	"collected_amount" real DEFAULT 0,
	"prepared_at" timestamp,
	"handed_over_at" timestamp,
	"delivered_at" timestamp,
	"returned_at" timestamp,
	"expected_delivery_date" timestamp,
	"prepared_by" text,
	"handed_over_by" text,
	"packaging_video_url" text,
	"packaging_photos" text,
	"delivery_proof_photo" text,
	"internal_notes" text,
	"delivery_notes" text,
	"return_reason" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "shipments_shipment_number_unique" UNIQUE("shipment_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dividend_details" (
	"id" text PRIMARY KEY NOT NULL,
	"dividend_id" text NOT NULL,
	"shareholder_id" text NOT NULL,
	"share_percentage" real NOT NULL,
	"amount" real NOT NULL,
	"paid" integer DEFAULT 0,
	"paid_at" timestamp,
	"payment_method" text,
	"payment_reference" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dividends" (
	"id" text PRIMARY KEY NOT NULL,
	"period_start" text NOT NULL,
	"period_end" text NOT NULL,
	"total_profit" real NOT NULL,
	"distributed_amount" real NOT NULL,
	"retained_amount" real DEFAULT 0,
	"distribution_date" text,
	"status" text DEFAULT 'draft',
	"approved_by" text,
	"approved_at" timestamp,
	"created_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "share_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"from_shareholder_id" text,
	"to_shareholder_id" text,
	"share_percentage" real NOT NULL,
	"amount" real NOT NULL,
	"transaction_date" text NOT NULL,
	"notes" text,
	"documents" text,
	"approved_by" text,
	"approved_at" timestamp,
	"created_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shareholders" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"address" text,
	"share_percentage" real NOT NULL,
	"share_value" real,
	"join_date" text,
	"bank_account" text,
	"bank_name" text,
	"is_active" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "shareholders_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_delivery_log" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"notification_id" text,
	"channel" varchar(50) NOT NULL,
	"recipient" varchar(255),
	"status" varchar(50) DEFAULT 'pending',
	"provider_response" jsonb,
	"attempts" integer DEFAULT 0,
	"last_attempt_at" timestamp,
	"error_message" text,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_subscriptions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"subscriber_type" varchar(50) NOT NULL,
	"subscriber_id" varchar(36) NOT NULL,
	"notification_type" varchar(100) NOT NULL,
	"channels" jsonb DEFAULT '["in_app"]'::jsonb,
	"filters" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_templates" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"type" varchar(100) NOT NULL,
	"category" varchar(50) DEFAULT 'general',
	"title_template" text NOT NULL,
	"message_template" text NOT NULL,
	"action_url_template" text,
	"default_priority" varchar(20) DEFAULT 'normal',
	"default_channels" jsonb DEFAULT '["in_app"]'::jsonb,
	"icon" varchar(50),
	"color" varchar(20),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "notification_templates_type_unique" UNIQUE("type")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"recipient_id" text,
	"recipient_type" text DEFAULT 'user',
	"type" text NOT NULL,
	"category" varchar(50) DEFAULT 'general',
	"priority" text DEFAULT 'normal',
	"title" text NOT NULL,
	"message" text,
	"entity_type" text,
	"entity_id" text,
	"action_url" text,
	"is_read" integer DEFAULT 0,
	"read_at" timestamp,
	"channels" text DEFAULT '["in_app"]',
	"sent_channels" text DEFAULT '{}',
	"metadata" jsonb,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scheduled_notifications" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"type" varchar(100) NOT NULL,
	"recipient_ids" jsonb,
	"recipient_query" text,
	"data" jsonb,
	"scheduled_for" timestamp NOT NULL,
	"recurrence" varchar(50),
	"status" varchar(50) DEFAULT 'pending',
	"sent_at" timestamp,
	"created_by" varchar(36),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_notification_preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"notification_type" text NOT NULL,
	"in_app" integer DEFAULT 1,
	"push" integer DEFAULT 1,
	"email" integer DEFAULT 0,
	"sms" integer DEFAULT 0,
	"whatsapp" integer DEFAULT 0,
	"quiet_hours_start" text,
	"quiet_hours_end" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "campaign_members" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"lead_id" text,
	"customer_id" text,
	"status" text DEFAULT 'sent',
	"responded_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "campaigns" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text,
	"name" text NOT NULL,
	"type" text,
	"status" text DEFAULT 'draft',
	"budget" real,
	"actual_cost" real,
	"start_date" text,
	"end_date" text,
	"target_audience" text,
	"description" text,
	"goals" text,
	"leads_generated" integer DEFAULT 0,
	"conversions" integer DEFAULT 0,
	"revenue" real DEFAULT 0,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "campaigns_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lead_activities" (
	"id" text PRIMARY KEY NOT NULL,
	"lead_id" text NOT NULL,
	"type" text NOT NULL,
	"subject" text,
	"description" text,
	"outcome" text,
	"scheduled_at" timestamp,
	"completed_at" timestamp,
	"created_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "leads" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text,
	"name" text NOT NULL,
	"company" text,
	"email" text,
	"phone" text,
	"source" text,
	"status" text DEFAULT 'new',
	"priority" text DEFAULT 'medium',
	"estimated_value" real,
	"notes" text,
	"assigned_to" text,
	"converted_customer_id" text,
	"converted_at" timestamp,
	"last_contact_date" timestamp,
	"next_follow_up" timestamp,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "leads_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "opportunities" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text,
	"title" text NOT NULL,
	"customer_id" text,
	"lead_id" text,
	"stage" text DEFAULT 'prospecting',
	"probability" integer DEFAULT 10,
	"expected_value" real,
	"actual_value" real,
	"expected_close_date" text,
	"actual_close_date" text,
	"source" text,
	"notes" text,
	"lost_reason" text,
	"assigned_to" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "opportunities_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "opportunity_activities" (
	"id" text PRIMARY KEY NOT NULL,
	"opportunity_id" text NOT NULL,
	"type" text NOT NULL,
	"subject" text,
	"description" text,
	"outcome" text,
	"scheduled_at" timestamp,
	"completed_at" timestamp,
	"created_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "asset_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text,
	"name" text NOT NULL,
	"name_ar" text,
	"parent_id" text,
	"depreciation_method" text DEFAULT 'straight_line',
	"useful_life_years" integer,
	"salvage_value_percent" real DEFAULT 0,
	"asset_account_id" text,
	"depreciation_account_id" text,
	"accumulated_dep_account_id" text,
	"is_active" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "asset_categories_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "asset_maintenance" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text,
	"asset_id" text,
	"maintenance_type" text,
	"description" text,
	"scheduled_date" date,
	"completed_date" date,
	"estimated_cost" real,
	"actual_cost" real,
	"status" text DEFAULT 'scheduled',
	"vendor_id" text,
	"technician_name" text,
	"work_performed" text,
	"parts_replaced" text,
	"next_maintenance_date" date,
	"notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "asset_maintenance_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "asset_revaluations" (
	"id" text PRIMARY KEY NOT NULL,
	"asset_id" text,
	"revaluation_date" date,
	"previous_value" real,
	"new_value" real,
	"reason" text,
	"appraiser_id" text,
	"appraiser_name" text,
	"journal_entry_id" text,
	"notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "asset_transfers" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text,
	"asset_id" text,
	"from_branch_id" text,
	"from_department_id" text,
	"from_location" text,
	"from_assignee" text,
	"to_branch_id" text,
	"to_department_id" text,
	"to_location" text,
	"to_assignee" text,
	"transfer_date" date,
	"reason" text,
	"status" text DEFAULT 'pending',
	"approved_by" text,
	"approved_at" timestamp,
	"notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "asset_transfers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "depreciation_records" (
	"id" text PRIMARY KEY NOT NULL,
	"asset_id" text,
	"period_start" date,
	"period_end" date,
	"opening_value" real,
	"depreciation_amount" real,
	"closing_value" real,
	"accumulated_depreciation" real,
	"journal_entry_id" text,
	"status" text DEFAULT 'calculated',
	"posted_at" timestamp,
	"posted_by" text,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fixed_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text,
	"name" text NOT NULL,
	"name_ar" text,
	"description" text,
	"category_id" text,
	"branch_id" text,
	"department_id" text,
	"location" text,
	"acquisition_date" date,
	"acquisition_cost" real NOT NULL,
	"purchase_invoice_id" text,
	"supplier_id" text,
	"serial_number" text,
	"model" text,
	"manufacturer" text,
	"warranty_expiry" date,
	"depreciation_method" text DEFAULT 'straight_line',
	"useful_life_years" integer,
	"useful_life_months" integer,
	"salvage_value" real DEFAULT 0,
	"depreciation_start_date" date,
	"current_value" real,
	"accumulated_depreciation" real DEFAULT 0,
	"last_depreciation_date" date,
	"status" text DEFAULT 'active',
	"disposal_date" date,
	"disposal_method" text,
	"disposal_value" real,
	"disposal_notes" text,
	"assigned_to" text,
	"barcode" text,
	"qr_code" text,
	"image_url" text,
	"notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "fixed_assets_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pos_cash_movements" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text,
	"movement_type" text NOT NULL,
	"amount" real NOT NULL,
	"reason" text,
	"reference" text,
	"performed_by" text,
	"approved_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pos_quick_products" (
	"id" text PRIMARY KEY NOT NULL,
	"terminal_id" text,
	"product_id" text,
	"display_name" text,
	"display_order" integer DEFAULT 0,
	"color" text,
	"category_group" text,
	"is_active" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pos_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text,
	"terminal_id" text,
	"branch_id" text,
	"cashier_id" text,
	"opened_at" timestamp DEFAULT now(),
	"opening_cash" real DEFAULT 0,
	"closed_at" timestamp,
	"closing_cash" real,
	"expected_cash" real,
	"cash_difference" real,
	"total_sales" real DEFAULT 0,
	"total_returns" real DEFAULT 0,
	"total_discount" real DEFAULT 0,
	"transaction_count" integer DEFAULT 0,
	"cash_payments" real DEFAULT 0,
	"card_payments" real DEFAULT 0,
	"status" text DEFAULT 'open',
	"closing_notes" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "pos_sessions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pos_terminals" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text,
	"name" text NOT NULL,
	"branch_id" text,
	"receipt_header" text,
	"receipt_footer" text,
	"cash_enabled" integer DEFAULT 1,
	"card_enabled" integer DEFAULT 1,
	"status" text DEFAULT 'active',
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "pos_terminals_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pos_transaction_items" (
	"id" text PRIMARY KEY NOT NULL,
	"transaction_id" text,
	"product_id" text,
	"product_name" text NOT NULL,
	"product_code" text,
	"barcode" text,
	"quantity" real DEFAULT 1,
	"unit_price" real NOT NULL,
	"discount_amount" real DEFAULT 0,
	"discount_percent" real,
	"tax_amount" real DEFAULT 0,
	"total" real NOT NULL,
	"returned_quantity" real DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pos_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text,
	"session_id" text,
	"terminal_id" text,
	"branch_id" text,
	"cashier_id" text,
	"customer_id" text,
	"transaction_type" text DEFAULT 'sale',
	"subtotal" real DEFAULT 0,
	"discount_amount" real DEFAULT 0,
	"discount_percent" real,
	"tax_amount" real DEFAULT 0,
	"total" real DEFAULT 0,
	"payment_method" text DEFAULT 'cash',
	"cash_received" real,
	"change_amount" real,
	"card_amount" real,
	"card_reference" text,
	"status" text DEFAULT 'completed',
	"voided_at" timestamp,
	"voided_by" text,
	"void_reason" text,
	"invoice_id" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "pos_transactions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "demand_forecasts" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text,
	"warehouse_id" text,
	"forecast_period" text,
	"period_start" date,
	"period_end" date,
	"forecasted_quantity" real,
	"actual_quantity" real,
	"accuracy" real,
	"method" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "goods_receipt_items" (
	"id" text PRIMARY KEY NOT NULL,
	"receipt_id" text,
	"product_id" text,
	"ordered_quantity" real,
	"received_quantity" real NOT NULL,
	"accepted_quantity" real,
	"rejected_quantity" real DEFAULT 0,
	"rejection_reason" text,
	"batch_number" text,
	"expiry_date" date,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "goods_receipts" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text,
	"purchase_order_id" text,
	"supplier_id" text,
	"warehouse_id" text,
	"receipt_date" date,
	"status" text DEFAULT 'pending',
	"delivery_note" text,
	"inspected_by" text,
	"inspected_at" timestamp,
	"notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "goods_receipts_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "purchase_order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text,
	"product_id" text,
	"description" text,
	"quantity" real NOT NULL,
	"unit_price" real NOT NULL,
	"received_quantity" real DEFAULT 0,
	"total" real NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "purchase_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text,
	"requisition_id" text,
	"supplier_id" text,
	"warehouse_id" text,
	"status" text DEFAULT 'draft',
	"order_date" date,
	"expected_date" date,
	"subtotal" real DEFAULT 0,
	"discount_amount" real DEFAULT 0,
	"tax_amount" real DEFAULT 0,
	"shipping_cost" real DEFAULT 0,
	"total" real DEFAULT 0,
	"payment_terms" text,
	"delivery_terms" text,
	"notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "purchase_orders_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "purchase_requisitions" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text,
	"requested_by" text,
	"department_id" text,
	"status" text DEFAULT 'draft',
	"priority" text DEFAULT 'normal',
	"required_date" date,
	"purpose" text,
	"notes" text,
	"approved_by" text,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "purchase_requisitions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reorder_points" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text,
	"warehouse_id" text,
	"minimum_stock" real NOT NULL,
	"reorder_point" real NOT NULL,
	"maximum_stock" real,
	"reorder_quantity" real,
	"lead_time_days" integer,
	"is_active" integer DEFAULT 1,
	"last_alert_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "requisition_items" (
	"id" text PRIMARY KEY NOT NULL,
	"requisition_id" text,
	"product_id" text,
	"description" text,
	"quantity" real NOT NULL,
	"estimated_price" real,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_expenses" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text,
	"category" text,
	"description" text,
	"amount" real NOT NULL,
	"date" date,
	"receipt" text,
	"is_billable" integer DEFAULT 1,
	"status" text DEFAULT 'pending',
	"submitted_by" text,
	"approved_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_members" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text,
	"user_id" text,
	"role" text,
	"hourly_rate" real,
	"start_date" date,
	"end_date" date,
	"is_active" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_milestones" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text,
	"name" text NOT NULL,
	"description" text,
	"due_date" date,
	"completed_at" timestamp,
	"status" text DEFAULT 'pending',
	"is_billing_milestone" integer DEFAULT 0,
	"invoice_amount" real,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text,
	"project_id" text,
	"parent_task_id" text,
	"name" text NOT NULL,
	"description" text,
	"assignee_id" text,
	"status" text DEFAULT 'todo',
	"priority" text DEFAULT 'normal',
	"start_date" date,
	"due_date" date,
	"completed_at" timestamp,
	"estimated_hours" real,
	"actual_hours" real DEFAULT 0,
	"sort_order" integer DEFAULT 0,
	"notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "project_tasks_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text,
	"name" text NOT NULL,
	"name_ar" text,
	"description" text,
	"customer_id" text,
	"manager_id" text,
	"status" text DEFAULT 'planning',
	"priority" text DEFAULT 'normal',
	"project_type" text,
	"start_date" date,
	"end_date" date,
	"actual_start_date" date,
	"actual_end_date" date,
	"estimated_budget" real,
	"actual_cost" real DEFAULT 0,
	"progress" real DEFAULT 0,
	"completed_tasks" integer DEFAULT 0,
	"total_tasks" integer DEFAULT 0,
	"is_billable" integer DEFAULT 1,
	"hourly_rate" real,
	"notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "projects_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "time_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text,
	"task_id" text,
	"user_id" text,
	"date" date,
	"hours" real NOT NULL,
	"description" text,
	"is_billable" integer DEFAULT 1,
	"hourly_rate" real,
	"status" text DEFAULT 'draft',
	"approved_by" text,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bill_of_materials" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text,
	"product_id" text,
	"name" text NOT NULL,
	"version" text DEFAULT '1.0',
	"status" text DEFAULT 'draft',
	"quantity" real DEFAULT 1,
	"unit_cost" real,
	"total_cost" real,
	"labor_hours" real,
	"machine_hours" real,
	"lead_time_days" integer,
	"notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "bill_of_materials_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bom_items" (
	"id" text PRIMARY KEY NOT NULL,
	"bom_id" text,
	"product_id" text,
	"item_type" text DEFAULT 'material',
	"quantity" real NOT NULL,
	"unit_cost" real,
	"waste_percent" real DEFAULT 0,
	"notes" text,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "material_consumption" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text,
	"operation_id" text,
	"product_id" text,
	"warehouse_id" text,
	"planned_quantity" real,
	"actual_quantity" real NOT NULL,
	"consumed_at" timestamp DEFAULT now(),
	"consumed_by" text,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "production_operations" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text,
	"work_center_id" text,
	"operation_name" text NOT NULL,
	"sequence_number" integer DEFAULT 1,
	"status" text DEFAULT 'pending',
	"planned_hours" real,
	"actual_hours" real DEFAULT 0,
	"input_quantity" real,
	"output_quantity" real,
	"scrap_quantity" real DEFAULT 0,
	"started_at" timestamp,
	"completed_at" timestamp,
	"operator_id" text,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "production_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text,
	"bom_id" text,
	"product_id" text,
	"warehouse_id" text,
	"status" text DEFAULT 'planned',
	"priority" text DEFAULT 'normal',
	"planned_quantity" real NOT NULL,
	"produced_quantity" real DEFAULT 0,
	"scrap_quantity" real DEFAULT 0,
	"planned_start_date" date,
	"planned_end_date" date,
	"actual_start_date" date,
	"actual_end_date" date,
	"estimated_cost" real,
	"actual_cost" real DEFAULT 0,
	"notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "production_orders_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quality_checks" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text,
	"operation_id" text,
	"check_name" text NOT NULL,
	"check_type" text,
	"specification" text,
	"actual_result" text,
	"status" text DEFAULT 'pending',
	"checked_by" text,
	"checked_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "work_centers" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text,
	"name" text NOT NULL,
	"description" text,
	"capacity_per_hour" real,
	"efficiency" real DEFAULT 100,
	"hourly_rate" real,
	"overhead_rate" real,
	"is_active" integer DEFAULT 1,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "work_centers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cart_items" (
	"id" text PRIMARY KEY NOT NULL,
	"cart_id" text,
	"product_id" text,
	"quantity" integer DEFAULT 1,
	"unit_price" real NOT NULL,
	"total" real NOT NULL,
	"added_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "discount_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text,
	"discount_type" text DEFAULT 'percentage',
	"discount_value" real NOT NULL,
	"min_order_amount" real,
	"max_discount" real,
	"usage_limit" integer,
	"used_count" integer DEFAULT 0,
	"valid_from" timestamp,
	"valid_until" timestamp,
	"is_active" integer DEFAULT 1,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "discount_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "online_order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text,
	"product_id" text,
	"product_name" text NOT NULL,
	"product_code" text,
	"quantity" integer DEFAULT 1,
	"unit_price" real NOT NULL,
	"discount_amount" real DEFAULT 0,
	"total" real NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "online_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"order_number" text,
	"customer_id" text,
	"status" text DEFAULT 'pending',
	"subtotal" real DEFAULT 0,
	"discount_amount" real DEFAULT 0,
	"discount_code" text,
	"tax_amount" real DEFAULT 0,
	"shipping_cost" real DEFAULT 0,
	"total" real DEFAULT 0,
	"shipping_method" text,
	"shipping_address" jsonb,
	"billing_address" jsonb,
	"payment_method" text,
	"payment_status" text DEFAULT 'pending',
	"paid_at" timestamp,
	"payment_reference" text,
	"estimated_delivery" timestamp,
	"delivered_at" timestamp,
	"tracking_number" text,
	"customer_notes" text,
	"internal_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "online_orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text,
	"customer_id" text,
	"order_id" text,
	"rating" integer NOT NULL,
	"title" text,
	"comment" text,
	"status" text DEFAULT 'pending',
	"is_verified_purchase" integer DEFAULT 0,
	"helpful_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shopping_carts" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text,
	"session_id" text,
	"status" text DEFAULT 'active',
	"items_count" integer DEFAULT 0,
	"subtotal" real DEFAULT 0,
	"last_activity_at" timestamp DEFAULT now(),
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "store_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"store_name" text NOT NULL,
	"store_name_ar" text,
	"logo" text,
	"currency" text DEFAULT 'IQD',
	"tax_rate" real DEFAULT 0,
	"shipping_enabled" integer DEFAULT 1,
	"default_shipping_cost" real DEFAULT 0,
	"min_order_amount" real,
	"max_order_amount" real,
	"is_active" integer DEFAULT 1,
	"maintenance_mode" integer DEFAULT 0,
	"email" text,
	"phone" text,
	"address" text,
	"facebook" text,
	"instagram" text,
	"whatsapp" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wishlists" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text,
	"product_id" text,
	"added_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"key_hash" text NOT NULL,
	"key_prefix" text,
	"permissions" jsonb,
	"rate_limit" integer DEFAULT 1000,
	"is_active" integer DEFAULT 1,
	"last_used_at" timestamp,
	"expires_at" timestamp,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"api_key_id" text,
	"method" text NOT NULL,
	"endpoint" text NOT NULL,
	"request_body" jsonb,
	"status_code" integer,
	"response_time" integer,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "external_integrations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"provider" text,
	"config" jsonb,
	"is_active" integer DEFAULT 0,
	"is_configured" integer DEFAULT 0,
	"last_sync_at" timestamp,
	"sync_success_count" integer DEFAULT 0,
	"sync_failure_count" integer DEFAULT 0,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sync_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"integration_id" text,
	"sync_type" text,
	"direction" text,
	"entity_type" text,
	"records_processed" integer DEFAULT 0,
	"records_created" integer DEFAULT 0,
	"records_updated" integer DEFAULT 0,
	"records_failed" integer DEFAULT 0,
	"status" text DEFAULT 'running',
	"error_message" text,
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "webhook_deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"webhook_id" text,
	"event" text NOT NULL,
	"payload" jsonb,
	"status_code" integer,
	"response_body" text,
	"response_time" integer,
	"status" text DEFAULT 'pending',
	"attempt_count" integer DEFAULT 0,
	"next_retry_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "webhooks" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"secret" text,
	"events" jsonb,
	"is_active" integer DEFAULT 1,
	"retry_count" integer DEFAULT 3,
	"timeout_seconds" integer DEFAULT 30,
	"success_count" integer DEFAULT 0,
	"failure_count" integer DEFAULT 0,
	"last_triggered_at" timestamp,
	"last_success_at" timestamp,
	"last_failure_at" timestamp,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "purchase_batch_devices" (
	"id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"batch_item_id" text,
	"serial_number" text NOT NULL,
	"product_id" text,
	"actual_specs" text,
	"purchase_cost" real,
	"selling_price" real,
	"inspection_status" text DEFAULT 'pending',
	"inspection_notes" text,
	"defects" text,
	"specs_variance" text,
	"inspection_photos" text,
	"inspected_by" text,
	"inspected_at" timestamp,
	"warehouse_id" text,
	"location_code" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "purchase_batch_devices_serial_number_unique" UNIQUE("serial_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "purchase_batch_items" (
	"id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"product_id" text,
	"product_name" text,
	"brand" text,
	"model" text,
	"specs" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"received_quantity" integer DEFAULT 0,
	"unit_cost" real,
	"total_cost" real,
	"suggested_selling_price" real,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "purchase_batches" (
	"id" text PRIMARY KEY NOT NULL,
	"batch_number" text NOT NULL,
	"supplier_id" text NOT NULL,
	"status" text DEFAULT 'awaiting_prices' NOT NULL,
	"total_cost" real DEFAULT 0,
	"total_items" integer DEFAULT 0,
	"received_items" integer DEFAULT 0,
	"warehouse_id" text,
	"notes" text,
	"internal_notes" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"prices_added_by" text,
	"prices_added_at" timestamp,
	"received_by" text,
	"received_at" timestamp,
	"selling_prices_added_by" text,
	"selling_prices_added_at" timestamp,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "purchase_batches_batch_number_unique" UNIQUE("batch_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "serial_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"prefix" text DEFAULT 'BI' NOT NULL,
	"year_format" text DEFAULT 'YYYY',
	"separator" text DEFAULT '-',
	"digit_count" integer DEFAULT 6,
	"current_sequence" integer DEFAULT 0,
	"reset_yearly" integer DEFAULT 1,
	"current_year" integer,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "installation_prices" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"part_type_id" varchar(36) NOT NULL,
	"action" varchar(50) NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "installed_parts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"serial_id" varchar(36) NOT NULL,
	"part_id" varchar(36),
	"part_type_id" varchar(36),
	"part_name" varchar(255),
	"part_specifications" jsonb,
	"is_original" boolean DEFAULT false,
	"is_upgrade" boolean DEFAULT true,
	"upgrade_order_id" varchar(36),
	"installed_at" timestamp DEFAULT now(),
	"installed_by" varchar(36),
	"removed_at" timestamp,
	"removed_by" varchar(36),
	"removal_reason" text,
	"status" varchar(50) DEFAULT 'active',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "part_types" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"name_ar" varchar(100) NOT NULL,
	"category" varchar(50) DEFAULT 'internal',
	"icon" varchar(50),
	"requires_compatibility" boolean DEFAULT true,
	"specifications" jsonb,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "parts_inventory" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"part_type_id" varchar(36) NOT NULL,
	"name" varchar(255) NOT NULL,
	"brand" varchar(100),
	"model" varchar(100),
	"sku" varchar(100),
	"barcode" varchar(100),
	"specifications" jsonb,
	"compatible_with" jsonb,
	"warehouse_id" varchar(36),
	"quantity" integer DEFAULT 0,
	"min_quantity" integer DEFAULT 5,
	"cost_price" numeric(12, 2),
	"sell_price" numeric(12, 2),
	"installation_fee" numeric(12, 2) DEFAULT '0',
	"condition" varchar(50) DEFAULT 'new',
	"notes" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "parts_movements" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"part_id" varchar(36) NOT NULL,
	"movement_type" varchar(50) NOT NULL,
	"quantity" integer NOT NULL,
	"reference_type" varchar(50),
	"reference_id" varchar(36),
	"quantity_before" integer,
	"quantity_after" integer,
	"unit_price" numeric(12, 2),
	"notes" text,
	"performed_by" varchar(36),
	"performed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "upgrade_items" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"upgrade_order_id" varchar(36) NOT NULL,
	"part_id" varchar(36),
	"part_name" varchar(255),
	"part_specifications" jsonb,
	"action" varchar(50) NOT NULL,
	"quantity" integer DEFAULT 1,
	"unit_price" numeric(12, 2),
	"installation_fee" numeric(12, 2),
	"subtotal" numeric(12, 2),
	"removed_part_id" varchar(36),
	"removed_part_name" varchar(255),
	"removed_part_value" numeric(12, 2),
	"returned_to_inventory" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "upgrade_orders" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"order_number" varchar(50) NOT NULL,
	"serial_id" varchar(36),
	"serial_number" varchar(100),
	"product_id" varchar(36),
	"product_name" varchar(255),
	"invoice_id" varchar(36),
	"upgrade_type" varchar(50) DEFAULT 'add',
	"status" varchar(50) DEFAULT 'pending',
	"parts_cost" numeric(12, 2) DEFAULT '0',
	"installation_fee" numeric(12, 2) DEFAULT '0',
	"total_cost" numeric(12, 2) DEFAULT '0',
	"notes" text,
	"customer_notes" text,
	"requested_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"requested_by" varchar(36),
	"completed_by" varchar(36),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "upgrade_orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "custom_dashboards" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"user_id" varchar(36),
	"is_public" boolean DEFAULT false,
	"is_default" boolean DEFAULT false,
	"layout" jsonb,
	"refresh_interval" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kpi_definitions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"name_ar" varchar(255),
	"category" varchar(50) NOT NULL,
	"description" text,
	"formula" text NOT NULL,
	"value_type" varchar(20) DEFAULT 'number',
	"unit" varchar(20),
	"target_value" integer,
	"warning_threshold" integer,
	"critical_threshold" integer,
	"better_direction" varchar(10) DEFAULT 'higher',
	"icon" varchar(50),
	"color" varchar(20),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "report_executions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"report_id" varchar(36),
	"template_id" varchar(36),
	"user_id" varchar(36),
	"filters" jsonb,
	"row_count" integer,
	"execution_time_ms" integer,
	"status" varchar(20) DEFAULT 'completed',
	"error_message" text,
	"export_format" varchar(10),
	"export_url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "report_templates" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"name_ar" varchar(255),
	"description" text,
	"category" varchar(50) NOT NULL,
	"report_type" varchar(50) DEFAULT 'table',
	"data_source" varchar(100) NOT NULL,
	"available_columns" jsonb,
	"default_columns" jsonb,
	"available_filters" jsonb,
	"default_filters" jsonb,
	"default_sort" jsonb,
	"group_by_options" jsonb,
	"chart_config" jsonb,
	"icon" varchar(50),
	"is_active" boolean DEFAULT true,
	"is_system" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "saved_reports" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"template_id" varchar(36),
	"name" varchar(255) NOT NULL,
	"description" text,
	"user_id" varchar(36),
	"is_public" boolean DEFAULT false,
	"configuration" jsonb,
	"schedule" jsonb,
	"last_run_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ticket_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"description" text,
	"parent_id" text,
	"default_priority" text DEFAULT 'medium',
	"default_assignee" text,
	"sla_hours" integer DEFAULT 24,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ticket_history" (
	"id" text PRIMARY KEY NOT NULL,
	"ticket_id" text NOT NULL,
	"field" text NOT NULL,
	"old_value" text,
	"new_value" text,
	"changed_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ticket_replies" (
	"id" text PRIMARY KEY NOT NULL,
	"ticket_id" text NOT NULL,
	"content" text NOT NULL,
	"reply_type" text DEFAULT 'reply',
	"is_internal" boolean DEFAULT false,
	"attachments" jsonb,
	"created_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"ticket_number" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'technical',
	"sub_category" text,
	"priority" text DEFAULT 'medium',
	"status" text DEFAULT 'open',
	"source" text DEFAULT 'internal',
	"branch_id" text,
	"department_id" text,
	"created_by" text,
	"assigned_to" text,
	"due_date" timestamp,
	"first_response_at" timestamp,
	"resolved_at" timestamp,
	"closed_at" timestamp,
	"time_spent_minutes" integer DEFAULT 0,
	"satisfaction_rating" integer,
	"satisfaction_comment" text,
	"attachments" jsonb,
	"tags" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "tickets_ticket_number_unique" UNIQUE("ticket_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quotation_activities" (
	"id" text PRIMARY KEY NOT NULL,
	"quotation_id" text NOT NULL,
	"activity_type" text NOT NULL,
	"description" text,
	"performed_by" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quotation_items" (
	"id" text PRIMARY KEY NOT NULL,
	"quotation_id" text NOT NULL,
	"product_id" text,
	"product_name" text NOT NULL,
	"product_sku" text,
	"description" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" text NOT NULL,
	"discount_type" text,
	"discount_value" text DEFAULT '0',
	"discount_amount" text DEFAULT '0',
	"line_total" text NOT NULL,
	"sort_order" integer DEFAULT 0,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quotation_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"default_terms" text,
	"default_notes" text,
	"validity_days" integer DEFAULT 30,
	"default_items" jsonb,
	"header_html" text,
	"footer_html" text,
	"is_active" boolean DEFAULT true,
	"is_default" boolean DEFAULT false,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quotations" (
	"id" text PRIMARY KEY NOT NULL,
	"quotation_number" text NOT NULL,
	"customer_id" text,
	"customer_name" text,
	"customer_phone" text,
	"customer_email" text,
	"customer_address" text,
	"branch_id" text,
	"created_by" text,
	"assigned_to" text,
	"quotation_date" timestamp DEFAULT now(),
	"valid_until" timestamp,
	"status" text DEFAULT 'draft',
	"subtotal" text DEFAULT '0',
	"discount_type" text,
	"discount_value" text DEFAULT '0',
	"discount_amount" text DEFAULT '0',
	"tax_rate" text DEFAULT '0',
	"tax_amount" text DEFAULT '0',
	"total_amount" text DEFAULT '0',
	"currency" text DEFAULT 'IQD',
	"terms" text,
	"notes" text,
	"internal_notes" text,
	"converted_to_invoice" boolean DEFAULT false,
	"invoice_id" text,
	"converted_at" timestamp,
	"follow_up_date" timestamp,
	"last_contacted_at" timestamp,
	"contact_attempts" integer DEFAULT 0,
	"attachments" jsonb,
	"custom_fields" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "quotations_quotation_number_unique" UNIQUE("quotation_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_warranties" (
	"id" text PRIMARY KEY NOT NULL,
	"warranty_number" text NOT NULL,
	"product_id" text,
	"serial_number_id" text,
	"serial_number" text,
	"customer_id" text,
	"customer_name" text,
	"customer_phone" text,
	"customer_email" text,
	"invoice_id" text,
	"invoice_number" text,
	"policy_id" text,
	"purchase_date" timestamp NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"status" text DEFAULT 'active',
	"claims_count" integer DEFAULT 0,
	"max_claims" integer,
	"notes" text,
	"registered_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "product_warranties_warranty_number_unique" UNIQUE("warranty_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "warranty_activities" (
	"id" text PRIMARY KEY NOT NULL,
	"warranty_id" text,
	"claim_id" text,
	"activity_type" text NOT NULL,
	"description" text,
	"performed_by" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "warranty_claims" (
	"id" text PRIMARY KEY NOT NULL,
	"claim_number" text NOT NULL,
	"warranty_id" text NOT NULL,
	"issue_type" text NOT NULL,
	"issue_description" text NOT NULL,
	"status" text DEFAULT 'pending',
	"diagnosis_notes" text,
	"is_under_warranty" boolean,
	"rejection_reason" text,
	"repair_type" text,
	"repair_notes" text,
	"repair_cost" text DEFAULT '0',
	"customer_pays" boolean DEFAULT false,
	"claim_date" timestamp DEFAULT now(),
	"approved_at" timestamp,
	"completed_at" timestamp,
	"attachments" jsonb,
	"submitted_by" text,
	"reviewed_by" text,
	"repaired_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "warranty_claims_claim_number_unique" UNIQUE("claim_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "warranty_policies" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"duration_months" integer DEFAULT 12 NOT NULL,
	"coverage_type" text DEFAULT 'standard',
	"covers_hardware" boolean DEFAULT true,
	"covers_software" boolean DEFAULT false,
	"covers_accidental_damage" boolean DEFAULT false,
	"covers_water_damage" boolean DEFAULT false,
	"exclusions" jsonb,
	"terms" text,
	"applies_to" text,
	"applies_to_id" text,
	"is_active" boolean DEFAULT true,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contract_activities" (
	"id" text PRIMARY KEY NOT NULL,
	"contract_id" text NOT NULL,
	"activity_type" text NOT NULL,
	"description" text,
	"performed_by" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contract_invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"contract_id" text NOT NULL,
	"invoice_number" text,
	"invoice_id" text,
	"period_start" timestamp,
	"period_end" timestamp,
	"amount" text NOT NULL,
	"status" text DEFAULT 'pending',
	"due_date" timestamp,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contract_items" (
	"id" text PRIMARY KEY NOT NULL,
	"contract_id" text NOT NULL,
	"product_id" text,
	"product_name" text NOT NULL,
	"serial_number" text,
	"description" text,
	"location" text,
	"coverage_type" text DEFAULT 'full',
	"item_value" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contract_service_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"contract_id" text NOT NULL,
	"contract_service_id" text,
	"service_type" text NOT NULL,
	"description" text,
	"service_date" timestamp NOT NULL,
	"completed_at" timestamp,
	"technician_id" text,
	"technician_name" text,
	"status" text DEFAULT 'scheduled',
	"is_covered" boolean DEFAULT true,
	"additional_cost" text DEFAULT '0',
	"report_notes" text,
	"customer_signature" text,
	"attachments" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contract_services" (
	"id" text PRIMARY KEY NOT NULL,
	"contract_id" text NOT NULL,
	"service_name" text NOT NULL,
	"description" text,
	"frequency" text,
	"included_quantity" integer,
	"used_quantity" integer DEFAULT 0,
	"extra_cost_per_unit" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contract_types" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"default_duration_months" integer DEFAULT 12,
	"billing_type" text DEFAULT 'monthly',
	"included_services" jsonb,
	"terms_template" text,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contracts" (
	"id" text PRIMARY KEY NOT NULL,
	"contract_number" text NOT NULL,
	"contract_type_id" text,
	"contract_type_name" text,
	"customer_id" text,
	"customer_name" text NOT NULL,
	"customer_phone" text,
	"customer_email" text,
	"customer_address" text,
	"branch_id" text,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"status" text DEFAULT 'draft',
	"total_value" text NOT NULL,
	"billing_type" text DEFAULT 'monthly',
	"billing_amount" text,
	"paid_amount" text DEFAULT '0',
	"next_billing_date" timestamp,
	"auto_renew" boolean DEFAULT false,
	"renewal_notification_days" integer DEFAULT 30,
	"renewal_notified" boolean DEFAULT false,
	"terms" text,
	"special_conditions" text,
	"response_time_hours" integer,
	"resolution_time_hours" integer,
	"signed_at" timestamp,
	"signed_by" text,
	"signature_url" text,
	"attachments" jsonb,
	"notes" text,
	"internal_notes" text,
	"created_by" text,
	"approved_by" text,
	"account_manager" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "contracts_contract_number_unique" UNIQUE("contract_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customer_loyalty_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"program_id" text NOT NULL,
	"current_points" integer DEFAULT 0,
	"total_earned_points" integer DEFAULT 0,
	"total_redeemed_points" integer DEFAULT 0,
	"total_expired_points" integer DEFAULT 0,
	"tier_id" text,
	"tier_achieved_at" timestamp,
	"total_spend" text DEFAULT '0',
	"last_earned_at" timestamp,
	"last_redeemed_at" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "loyalty_bonus_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"program_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"rule_type" text NOT NULL,
	"bonus_points" integer NOT NULL,
	"bonus_multiplier" text,
	"conditions" jsonb,
	"start_date" timestamp,
	"end_date" timestamp,
	"is_active" boolean DEFAULT true,
	"is_one_time" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "loyalty_programs" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"is_default" boolean DEFAULT false,
	"points_per_amount" integer DEFAULT 1,
	"amount_per_point" text DEFAULT '1000',
	"multiplier_categories" jsonb,
	"multiplier_products" jsonb,
	"point_value" text DEFAULT '100',
	"min_redeem_points" integer DEFAULT 100,
	"max_redeem_percentage" integer DEFAULT 50,
	"points_expiry_months" integer,
	"start_date" timestamp,
	"end_date" timestamp,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "loyalty_rewards" (
	"id" text PRIMARY KEY NOT NULL,
	"program_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"reward_type" text NOT NULL,
	"points_cost" integer NOT NULL,
	"discount_value" text,
	"discount_type" text,
	"product_id" text,
	"voucher_value" text,
	"stock_limit" integer,
	"redeemed_count" integer DEFAULT 0,
	"per_customer_limit" integer,
	"min_tier_id" text,
	"min_order_amount" text,
	"start_date" timestamp,
	"end_date" timestamp,
	"is_active" boolean DEFAULT true,
	"image" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "loyalty_tiers" (
	"id" text PRIMARY KEY NOT NULL,
	"program_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"min_points" integer NOT NULL,
	"min_spend" text,
	"points_multiplier" text DEFAULT '1',
	"discount_percentage" text,
	"free_shipping" boolean DEFAULT false,
	"priority_support" boolean DEFAULT false,
	"benefits" jsonb,
	"color" text,
	"icon" text,
	"badge_image" text,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "loyalty_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"transaction_type" text NOT NULL,
	"points" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"source_type" text,
	"source_id" text,
	"description" text,
	"amount_spent" text,
	"amount_redeemed" text,
	"expires_at" timestamp,
	"processed_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reward_redemptions" (
	"id" text PRIMARY KEY NOT NULL,
	"reward_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"account_id" text NOT NULL,
	"points_used" integer NOT NULL,
	"status" text DEFAULT 'pending',
	"used_at" timestamp,
	"invoice_id" text,
	"redemption_code" text,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "task_activities" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"activity_type" text NOT NULL,
	"description" text,
	"old_value" text,
	"new_value" text,
	"performed_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "task_checklists" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"title" text NOT NULL,
	"is_completed" boolean DEFAULT false,
	"completed_at" timestamp,
	"completed_by" text,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "task_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"user_id" text,
	"user_name" text,
	"content" text NOT NULL,
	"attachments" jsonb,
	"is_internal" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "task_reminders" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"user_id" text,
	"reminder_at" timestamp NOT NULL,
	"reminder_type" text DEFAULT 'notification',
	"message" text,
	"is_sent" boolean DEFAULT false,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "task_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"default_title" text,
	"default_description" text,
	"default_task_type" text,
	"default_priority" text,
	"default_estimated_minutes" integer,
	"default_checklist" jsonb,
	"default_assign_to" text,
	"default_department_id" text,
	"is_active" boolean DEFAULT true,
	"usage_count" integer DEFAULT 0,
	"created_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "task_time_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"user_id" text,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"duration_minutes" integer,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"task_number" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"task_type" text DEFAULT 'general',
	"category" text,
	"tags" jsonb,
	"priority" text DEFAULT 'medium',
	"status" text DEFAULT 'pending',
	"assigned_to" text,
	"assigned_by" text,
	"department_id" text,
	"due_date" timestamp,
	"start_date" timestamp,
	"completed_at" timestamp,
	"estimated_minutes" integer,
	"actual_minutes" integer,
	"related_type" text,
	"related_id" text,
	"related_title" text,
	"is_recurring" boolean DEFAULT false,
	"recurring_pattern" text,
	"recurring_end_date" timestamp,
	"parent_task_id" text,
	"progress_percentage" integer DEFAULT 0,
	"attachments" jsonb,
	"notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "tasks_task_number_unique" UNIQUE("task_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reservation_activities" (
	"id" text PRIMARY KEY NOT NULL,
	"reservation_id" text NOT NULL,
	"activity_type" text NOT NULL,
	"description" text,
	"performed_by" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reservation_items" (
	"id" text PRIMARY KEY NOT NULL,
	"reservation_id" text NOT NULL,
	"product_id" text,
	"product_name" text NOT NULL,
	"product_sku" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" text NOT NULL,
	"total_price" text NOT NULL,
	"reserved_serials" jsonb,
	"status" text DEFAULT 'reserved',
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reservation_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"branch_id" text,
	"default_expiry_days" integer DEFAULT 7,
	"deposit_required" boolean DEFAULT false,
	"deposit_percentage" integer DEFAULT 10,
	"min_deposit_amount" text,
	"send_expiry_reminder" boolean DEFAULT true,
	"reminder_days_before" integer DEFAULT 2,
	"auto_cancel" boolean DEFAULT true,
	"auto_cancel_after_days" integer DEFAULT 1,
	"max_reservations_per_customer" integer,
	"allow_partial_pickup" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reservations" (
	"id" text PRIMARY KEY NOT NULL,
	"reservation_number" text NOT NULL,
	"customer_id" text,
	"customer_name" text NOT NULL,
	"customer_phone" text,
	"customer_email" text,
	"branch_id" text,
	"status" text DEFAULT 'pending',
	"reservation_date" timestamp DEFAULT now(),
	"expires_at" timestamp,
	"confirmed_at" timestamp,
	"completed_at" timestamp,
	"cancelled_at" timestamp,
	"total_amount" text DEFAULT '0',
	"deposit_amount" text DEFAULT '0',
	"deposit_paid" boolean DEFAULT false,
	"deposit_paid_at" timestamp,
	"notes" text,
	"internal_notes" text,
	"cancellation_reason" text,
	"converted_to_invoice" boolean DEFAULT false,
	"invoice_id" text,
	"created_by" text,
	"confirmed_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "reservations_reservation_number_unique" UNIQUE("reservation_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "note_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"content" text NOT NULL,
	"category" text,
	"entity_type" text,
	"is_active" boolean DEFAULT true,
	"usage_count" integer DEFAULT 0,
	"created_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notes" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text,
	"content" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"entity_name" text,
	"note_type" text DEFAULT 'general',
	"is_pinned" boolean DEFAULT false,
	"is_private" boolean DEFAULT false,
	"color" text,
	"reminder_at" timestamp,
	"reminder_sent" boolean DEFAULT false,
	"attachments" jsonb,
	"mentions" jsonb,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quick_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"content" text NOT NULL,
	"color" text,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "appointment_types" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_ar" text,
	"duration" integer DEFAULT 30,
	"color" text,
	"requires_approval" boolean DEFAULT false,
	"allow_online_booking" boolean DEFAULT true,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "appointments" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"appointment_type" text DEFAULT 'meeting',
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"all_day" boolean DEFAULT false,
	"status" text DEFAULT 'scheduled',
	"customer_id" text,
	"customer_name" text,
	"customer_phone" text,
	"branch_id" text,
	"location" text,
	"meeting_url" text,
	"assigned_to" text,
	"attendees" jsonb,
	"reminder_minutes" integer DEFAULT 30,
	"reminder_sent" boolean DEFAULT false,
	"color" text,
	"related_type" text,
	"related_id" text,
	"is_recurring" boolean DEFAULT false,
	"recurring_pattern" jsonb,
	"parent_appointment_id" text,
	"notes" text,
	"internal_notes" text,
	"cancellation_reason" text,
	"attachments" jsonb,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "availability_slots" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"branch_id" text,
	"day_of_week" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "blocked_times" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"branch_id" text,
	"title" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"block_type" text DEFAULT 'holiday',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_activities" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"activity_type" text NOT NULL,
	"description" text,
	"metadata" jsonb,
	"performed_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_contracts" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"contract_number" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"terms" jsonb,
	"commission_structure" jsonb,
	"status" text DEFAULT 'active',
	"document_url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"order_number" text NOT NULL,
	"agent_id" text NOT NULL,
	"items" jsonb,
	"subtotal" text NOT NULL,
	"discount_amount" text DEFAULT '0',
	"total_amount" text NOT NULL,
	"commission_amount" text DEFAULT '0',
	"status" text DEFAULT 'pending',
	"shipping_address" text,
	"tracking_number" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "agent_orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_sales" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"period" text NOT NULL,
	"total_sales" text DEFAULT '0',
	"total_commission" text DEFAULT '0',
	"total_orders" integer DEFAULT 0,
	"sales_breakdown" jsonb,
	"commission_paid" boolean DEFAULT false,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agents" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_number" text NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"agent_type" text DEFAULT 'distributor',
	"contact_person" text,
	"phone" text,
	"mobile" text,
	"email" text,
	"website" text,
	"country" text,
	"city" text,
	"address" text,
	"region" text,
	"territories" jsonb,
	"commission_rate" text,
	"discount_rate" text,
	"credit_limit" text,
	"payment_terms" text,
	"allowed_categories" jsonb,
	"allowed_brands" jsonb,
	"monthly_target" text,
	"quarterly_target" text,
	"annual_target" text,
	"status" text DEFAULT 'active',
	"contract_start_date" timestamp,
	"contract_end_date" timestamp,
	"tier" text DEFAULT 'bronze',
	"rating" integer DEFAULT 3,
	"documents" jsonb,
	"notes" text,
	"linked_branch_id" text,
	"account_manager_id" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "agents_agent_number_unique" UNIQUE("agent_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "review_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"review_id" text NOT NULL,
	"reporter_id" text,
	"reporter_type" text,
	"reason" text NOT NULL,
	"details" text,
	"status" text DEFAULT 'pending',
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "review_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text,
	"customer_email" text NOT NULL,
	"customer_name" text,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"entity_name" text,
	"order_id" text,
	"sent_at" timestamp,
	"opened_at" timestamp,
	"completed_at" timestamp,
	"review_id" text,
	"reminder_count" integer DEFAULT 0,
	"last_reminder_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "review_stats" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"total_reviews" integer DEFAULT 0,
	"average_rating" text DEFAULT '0',
	"rating_5_count" integer DEFAULT 0,
	"rating_4_count" integer DEFAULT 0,
	"rating_3_count" integer DEFAULT 0,
	"rating_2_count" integer DEFAULT 0,
	"rating_1_count" integer DEFAULT 0,
	"last_review_at" timestamp,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "review_votes" (
	"id" text PRIMARY KEY NOT NULL,
	"review_id" text NOT NULL,
	"voter_id" text,
	"voter_type" text,
	"vote_type" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"entity_name" text,
	"customer_id" text,
	"customer_name" text NOT NULL,
	"customer_email" text,
	"is_verified_purchase" boolean DEFAULT false,
	"rating" integer NOT NULL,
	"title" text,
	"content" text,
	"pros" jsonb,
	"cons" jsonb,
	"images" jsonb,
	"status" text DEFAULT 'pending',
	"rejection_reason" text,
	"helpful_count" integer DEFAULT 0,
	"not_helpful_count" integer DEFAULT 0,
	"moderated_by" text,
	"moderated_at" timestamp,
	"reply_content" text,
	"replied_by" text,
	"replied_at" timestamp,
	"source" text DEFAULT 'website',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscription_activities" (
	"id" text PRIMARY KEY NOT NULL,
	"subscription_id" text NOT NULL,
	"activity_type" text NOT NULL,
	"description" text,
	"metadata" jsonb,
	"performed_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscription_invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_number" text NOT NULL,
	"subscription_id" text NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"subtotal" text NOT NULL,
	"discount" text DEFAULT '0',
	"tax" text DEFAULT '0',
	"total" text NOT NULL,
	"status" text DEFAULT 'draft',
	"due_date" timestamp,
	"paid_at" timestamp,
	"payment_method" text,
	"payment_reference" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "subscription_invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscription_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_ar" text,
	"description" text,
	"price" text NOT NULL,
	"currency" text DEFAULT 'IQD',
	"billing_cycle" text DEFAULT 'monthly',
	"billing_interval" integer DEFAULT 1,
	"features" jsonb,
	"limits" jsonb,
	"trial_days" integer DEFAULT 0,
	"setup_fee" text,
	"is_active" boolean DEFAULT true,
	"is_public" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscription_reminders" (
	"id" text PRIMARY KEY NOT NULL,
	"subscription_id" text NOT NULL,
	"reminder_type" text NOT NULL,
	"scheduled_for" timestamp NOT NULL,
	"sent_at" timestamp,
	"channel" text DEFAULT 'email',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"subscription_number" text NOT NULL,
	"customer_id" text,
	"customer_name" text NOT NULL,
	"customer_email" text,
	"customer_phone" text,
	"plan_id" text,
	"plan_name" text NOT NULL,
	"price" text NOT NULL,
	"currency" text DEFAULT 'IQD',
	"status" text DEFAULT 'pending',
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"trial_ends_at" timestamp,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancelled_at" timestamp,
	"paused_at" timestamp,
	"next_billing_date" timestamp,
	"last_billing_date" timestamp,
	"billing_cycle" text DEFAULT 'monthly',
	"cancellation_reason" text,
	"cancel_at_period_end" boolean DEFAULT false,
	"auto_renew" boolean DEFAULT true,
	"notes" text,
	"internal_notes" text,
	"metadata" jsonb,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "subscriptions_subscription_number_unique" UNIQUE("subscription_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "file_downloads" (
	"id" text PRIMARY KEY NOT NULL,
	"file_id" text NOT NULL,
	"downloaded_by" text,
	"ip_address" text,
	"user_agent" text,
	"share_id" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "file_shares" (
	"id" text PRIMARY KEY NOT NULL,
	"file_id" text NOT NULL,
	"share_type" text DEFAULT 'link',
	"shared_with_user_id" text,
	"shared_with_role" text,
	"share_token" text,
	"share_url" text,
	"permissions" text DEFAULT 'view',
	"expires_at" timestamp,
	"max_downloads" integer,
	"download_count" integer DEFAULT 0,
	"password" text,
	"shared_by" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "file_shares_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "files" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"original_name" text NOT NULL,
	"folder_id" text,
	"path" text NOT NULL,
	"url" text NOT NULL,
	"mime_type" text NOT NULL,
	"extension" text,
	"size" bigint NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"description" text,
	"tags" jsonb,
	"category" text,
	"metadata" jsonb,
	"is_public" boolean DEFAULT false,
	"is_archived" boolean DEFAULT false,
	"download_count" integer DEFAULT 0,
	"last_downloaded_at" timestamp,
	"version" integer DEFAULT 1,
	"previous_version_id" text,
	"uploaded_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "folders" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"parent_id" text,
	"path" text NOT NULL,
	"folder_type" text DEFAULT 'general',
	"is_public" boolean DEFAULT false,
	"allowed_roles" jsonb,
	"color" text,
	"icon" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "storage_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"max_file_size" bigint DEFAULT 52428800,
	"max_storage_per_user" bigint,
	"allowed_mime_types" jsonb,
	"blocked_extensions" jsonb,
	"storage_provider" text DEFAULT 'local',
	"storage_config" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "call_campaigns" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"campaign_type" text DEFAULT 'outbound',
	"target_list" jsonb,
	"total_contacts" integer DEFAULT 0,
	"completed_calls" integer DEFAULT 0,
	"successful_calls" integer DEFAULT 0,
	"status" text DEFAULT 'draft',
	"start_date" timestamp,
	"end_date" timestamp,
	"script_id" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "call_scripts" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"script_type" text DEFAULT 'sales',
	"content" text NOT NULL,
	"sections" jsonb,
	"faqs" jsonb,
	"is_active" boolean DEFAULT true,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "call_stats" (
	"id" text PRIMARY KEY NOT NULL,
	"date" timestamp NOT NULL,
	"user_id" text,
	"total_calls" integer DEFAULT 0,
	"inbound_calls" integer DEFAULT 0,
	"outbound_calls" integer DEFAULT 0,
	"missed_calls" integer DEFAULT 0,
	"total_duration" integer DEFAULT 0,
	"average_duration" integer DEFAULT 0,
	"successful_calls" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "calls" (
	"id" text PRIMARY KEY NOT NULL,
	"call_type" text DEFAULT 'outbound',
	"call_purpose" text DEFAULT 'general',
	"caller_name" text,
	"caller_phone" text NOT NULL,
	"receiver_name" text,
	"receiver_phone" text,
	"customer_id" text,
	"lead_id" text,
	"user_id" text,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"duration" integer,
	"status" text DEFAULT 'completed',
	"recording_url" text,
	"recording_duration" integer,
	"notes" text,
	"summary" text,
	"sentiment" text,
	"outcome" text,
	"follow_up_required" boolean DEFAULT false,
	"follow_up_date" timestamp,
	"follow_up_notes" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "competitor_activities" (
	"id" text PRIMARY KEY NOT NULL,
	"competitor_id" text NOT NULL,
	"activity_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"importance" text DEFAULT 'medium',
	"source" text,
	"source_url" text,
	"activity_date" timestamp,
	"attachments" jsonb,
	"recorded_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "competitor_prices" (
	"id" text PRIMARY KEY NOT NULL,
	"competitor_id" text NOT NULL,
	"product_id" text,
	"product_name" text NOT NULL,
	"price" text NOT NULL,
	"currency" text DEFAULT 'IQD',
	"source" text,
	"source_url" text,
	"recorded_at" timestamp DEFAULT now(),
	"recorded_by" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "competitor_products" (
	"id" text PRIMARY KEY NOT NULL,
	"competitor_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"price" text,
	"price_range" text,
	"our_product_id" text,
	"comparison_notes" text,
	"features" jsonb,
	"quality_rating" integer,
	"image_url" text,
	"product_url" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "competitors" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"logo" text,
	"website" text,
	"description" text,
	"category" text DEFAULT 'direct',
	"industry" text,
	"phone" text,
	"email" text,
	"address" text,
	"country" text,
	"city" text,
	"regions" jsonb,
	"company_size" text,
	"market_share" text,
	"annual_revenue" text,
	"employee_count" integer,
	"strengths" jsonb,
	"weaknesses" jsonb,
	"opportunities" jsonb,
	"threats" jsonb,
	"threat_level" text DEFAULT 'medium',
	"rating" integer DEFAULT 3,
	"is_active" boolean DEFAULT true,
	"monitoring_enabled" boolean DEFAULT true,
	"notes" text,
	"social_links" jsonb,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_comparisons" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"our_product_id" text,
	"our_product_name" text NOT NULL,
	"compared_products" jsonb,
	"criteria" jsonb,
	"summary" text,
	"recommendation" text,
	"is_public" boolean DEFAULT false,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "goal_updates" (
	"id" text PRIMARY KEY NOT NULL,
	"goal_id" text NOT NULL,
	"previous_value" text,
	"new_value" text NOT NULL,
	"progress_percentage" integer,
	"previous_status" text,
	"new_status" text,
	"notes" text,
	"updated_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "goals" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"kpi_id" text,
	"scope" text DEFAULT 'company',
	"branch_id" text,
	"department_id" text,
	"user_id" text,
	"period" text DEFAULT 'monthly',
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"target_value" text NOT NULL,
	"current_value" text DEFAULT '0',
	"starting_value" text DEFAULT '0',
	"min_threshold" text,
	"stretch_target" text,
	"progress_percentage" integer DEFAULT 0,
	"status" text DEFAULT 'on_track',
	"priority" text DEFAULT 'medium',
	"notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kpi_dashboards" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"widgets" jsonb,
	"is_public" boolean DEFAULT false,
	"allowed_roles" jsonb,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kpi_values" (
	"id" text PRIMARY KEY NOT NULL,
	"kpi_id" text NOT NULL,
	"branch_id" text,
	"department_id" text,
	"user_id" text,
	"value" text NOT NULL,
	"previous_value" text,
	"change_percentage" text,
	"period_type" text DEFAULT 'daily',
	"period_date" timestamp NOT NULL,
	"breakdown" jsonb,
	"calculated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kpis" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"description" text,
	"category" text DEFAULT 'sales',
	"kpi_type" text DEFAULT 'value',
	"unit" text,
	"calculation_method" text,
	"formula" text,
	"data_source" text,
	"direction" text DEFAULT 'higher_is_better',
	"is_active" boolean DEFAULT true,
	"update_frequency" text DEFAULT 'daily',
	"last_calculated_at" timestamp,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "archive_log" (
	"id" text PRIMARY KEY NOT NULL,
	"operation" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"item_count" integer DEFAULT 1,
	"status" text DEFAULT 'success',
	"details" text,
	"error_message" text,
	"performed_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "archived_items" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"original_data" jsonb,
	"category" text,
	"tags" jsonb,
	"archive_period" text,
	"archive_reason" text,
	"retention_period" integer,
	"expires_at" timestamp,
	"search_text" text,
	"is_locked" boolean DEFAULT false,
	"is_expired" boolean DEFAULT false,
	"archived_by" text,
	"archived_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "backups" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"backup_type" text DEFAULT 'full',
	"scope" text DEFAULT 'all',
	"included_tables" jsonb,
	"size" text,
	"location" text,
	"storage_type" text DEFAULT 'local',
	"status" text DEFAULT 'pending',
	"progress" integer DEFAULT 0,
	"started_at" timestamp,
	"completed_at" timestamp,
	"error_message" text,
	"last_restored_at" timestamp,
	"restore_count" integer DEFAULT 0,
	"created_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "retention_policies" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"entity_type" text NOT NULL,
	"retention_period" integer NOT NULL,
	"action" text DEFAULT 'archive',
	"conditions" jsonb,
	"run_frequency" text DEFAULT 'monthly',
	"last_run_at" timestamp,
	"next_run_at" timestamp,
	"is_active" boolean DEFAULT true,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "document_access" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text,
	"folder_id" text,
	"user_id" text,
	"department_id" text,
	"can_view" boolean DEFAULT true,
	"can_edit" boolean DEFAULT false,
	"can_delete" boolean DEFAULT false,
	"can_share" boolean DEFAULT false,
	"can_sign" boolean DEFAULT false,
	"granted_by" text,
	"granted_at" timestamp DEFAULT now(),
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "document_folders" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"parent_id" text,
	"path" text,
	"color" text,
	"icon" text,
	"is_shared" boolean DEFAULT false,
	"access_level" text DEFAULT 'standard',
	"branch_id" text,
	"department_id" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "document_views" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"viewer_id" text,
	"viewed_at" timestamp DEFAULT now(),
	"duration" integer,
	"ip_address" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "documents" (
	"id" text PRIMARY KEY NOT NULL,
	"document_number" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"document_type" text DEFAULT 'general',
	"category" text,
	"file_name" text,
	"file_url" text,
	"file_type" text,
	"file_size" integer,
	"version" integer DEFAULT 1,
	"is_latest_version" boolean DEFAULT true,
	"parent_document_id" text,
	"status" text DEFAULT 'draft',
	"requires_signature" boolean DEFAULT false,
	"signature_status" text,
	"signed_at" timestamp,
	"is_public" boolean DEFAULT false,
	"is_confidential" boolean DEFAULT false,
	"access_level" text DEFAULT 'standard',
	"branch_id" text,
	"department_id" text,
	"effective_date" timestamp,
	"expiry_date" timestamp,
	"tags" jsonb,
	"metadata" jsonb,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "documents_document_number_unique" UNIQUE("document_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "signatures" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"signer_id" text,
	"signer_name" text NOT NULL,
	"signer_email" text,
	"signer_role" text,
	"signature_type" text DEFAULT 'electronic',
	"signature_data" text,
	"signature_position" jsonb,
	"status" text DEFAULT 'pending',
	"ip_address" text,
	"user_agent" text,
	"verification_code" text,
	"is_verified" boolean DEFAULT false,
	"sign_order" integer DEFAULT 1,
	"requested_at" timestamp DEFAULT now(),
	"signed_at" timestamp,
	"expires_at" timestamp,
	"declined_at" timestamp,
	"decline_reason" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conversation_members" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member',
	"is_muted" boolean DEFAULT false,
	"muted_until" timestamp,
	"notification_level" text DEFAULT 'all',
	"last_read_at" timestamp,
	"unread_count" integer DEFAULT 0,
	"joined_at" timestamp DEFAULT now(),
	"left_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conversation_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"sender_id" text,
	"content" text NOT NULL,
	"content_type" text DEFAULT 'text',
	"attachments" jsonb,
	"reply_to_id" text,
	"reactions" jsonb,
	"is_edited" boolean DEFAULT false,
	"edited_at" timestamp,
	"is_deleted" boolean DEFAULT false,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"description" text,
	"conversation_type" text DEFAULT 'private',
	"is_active" boolean DEFAULT true,
	"avatar" text,
	"last_message_id" text,
	"last_message_at" timestamp,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "message_recipients" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"recipient_id" text,
	"recipient_type" text DEFAULT 'user',
	"department_id" text,
	"is_read" boolean DEFAULT false,
	"read_at" timestamp,
	"folder" text DEFAULT 'inbox',
	"is_starred" boolean DEFAULT false,
	"is_deleted" boolean DEFAULT false,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "message_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"subject" text,
	"content" text NOT NULL,
	"variables" jsonb,
	"category" text,
	"is_active" boolean DEFAULT true,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"message_type" text DEFAULT 'direct',
	"subject" text,
	"content" text NOT NULL,
	"content_type" text DEFAULT 'text',
	"sender_id" text,
	"priority" text DEFAULT 'normal',
	"attachments" jsonb,
	"reply_to_id" text,
	"thread_id" text,
	"is_deleted" boolean DEFAULT false,
	"deleted_at" timestamp,
	"is_announcement" boolean DEFAULT false,
	"is_pinned" boolean DEFAULT false,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "partner_activities" (
	"id" text PRIMARY KEY NOT NULL,
	"partner_id" text NOT NULL,
	"activity_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"scheduled_at" timestamp,
	"completed_at" timestamp,
	"status" text DEFAULT 'scheduled',
	"outcome" text,
	"next_steps" text,
	"participants" jsonb,
	"created_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "partner_agreements" (
	"id" text PRIMARY KEY NOT NULL,
	"partner_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"agreement_type" text DEFAULT 'partnership',
	"start_date" timestamp,
	"end_date" timestamp,
	"value" numeric,
	"currency" text DEFAULT 'IQD',
	"status" text DEFAULT 'draft',
	"document_url" text,
	"terms" jsonb,
	"signed_by_partner" boolean DEFAULT false,
	"signed_by_us" boolean DEFAULT false,
	"signed_at" timestamp,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "partner_commissions" (
	"id" text PRIMARY KEY NOT NULL,
	"partner_id" text NOT NULL,
	"transaction_type" text,
	"transaction_id" text,
	"transaction_value" numeric,
	"commission_rate" numeric,
	"commission_amount" numeric,
	"currency" text DEFAULT 'IQD',
	"status" text DEFAULT 'pending',
	"paid_at" timestamp,
	"payment_reference" text,
	"period_start" timestamp,
	"period_end" timestamp,
	"notes" text,
	"approved_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "partner_contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"partner_id" text NOT NULL,
	"name" text NOT NULL,
	"position" text,
	"department" text,
	"email" text,
	"phone" text,
	"mobile" text,
	"is_primary" boolean DEFAULT false,
	"preferred_contact_method" text DEFAULT 'email',
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "partner_portal_users" (
	"id" text PRIMARY KEY NOT NULL,
	"partner_id" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"name" text NOT NULL,
	"role" text DEFAULT 'viewer',
	"is_active" boolean DEFAULT true,
	"last_login_at" timestamp,
	"permissions" jsonb,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "partner_portal_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "partners" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"type" text DEFAULT 'business',
	"contact_person" text,
	"email" text,
	"phone" text,
	"website" text,
	"country" text,
	"city" text,
	"address" text,
	"industry" text,
	"company_size" text,
	"registration_number" text,
	"tax_number" text,
	"status" text DEFAULT 'prospect',
	"partnership_level" text DEFAULT 'standard',
	"contract_start_date" timestamp,
	"contract_end_date" timestamp,
	"contract_value" numeric,
	"rating" integer,
	"total_revenue" numeric DEFAULT '0',
	"total_transactions" integer DEFAULT 0,
	"notes" text,
	"tags" jsonb,
	"logo" text,
	"assigned_to" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "certificates" (
	"id" text PRIMARY KEY NOT NULL,
	"certificate_number" text NOT NULL,
	"title" text NOT NULL,
	"user_id" text NOT NULL,
	"user_name" text NOT NULL,
	"course_id" text,
	"course_name" text,
	"issue_date" timestamp NOT NULL,
	"expiry_date" timestamp,
	"status" text DEFAULT 'valid',
	"verification_code" text,
	"certificate_url" text,
	"signed_by" text,
	"signature_url" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "certificates_certificate_number_unique" UNIQUE("certificate_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "courses" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"title_en" text,
	"description" text,
	"category" text DEFAULT 'general',
	"level" text DEFAULT 'beginner',
	"instructor_id" text,
	"instructor_name" text,
	"instructor_external" boolean DEFAULT false,
	"duration_hours" integer,
	"duration_days" integer,
	"course_type" text DEFAULT 'classroom',
	"cost" numeric,
	"currency" text DEFAULT 'IQD',
	"materials" jsonb,
	"syllabus" jsonb,
	"prerequisites" jsonb,
	"target_audience" text,
	"max_participants" integer,
	"status" text DEFAULT 'draft',
	"is_active" boolean DEFAULT true,
	"thumbnail" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "development_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"start_date" timestamp,
	"target_date" timestamp,
	"goals" jsonb,
	"target_skills" jsonb,
	"status" text DEFAULT 'active',
	"progress" integer DEFAULT 0,
	"supervisor_id" text,
	"notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skill_assessments" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"skill_name" text NOT NULL,
	"skill_category" text,
	"current_level" integer,
	"target_level" integer,
	"assessed_at" timestamp DEFAULT now(),
	"next_assessment_at" timestamp,
	"assessed_by" text,
	"assessment_type" text DEFAULT 'self',
	"notes" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "training_enrollments" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'enrolled',
	"attendance_percentage" integer DEFAULT 0,
	"attended_sessions" integer DEFAULT 0,
	"score" integer,
	"grade" text,
	"certificate_issued" boolean DEFAULT false,
	"certificate_url" text,
	"feedback" text,
	"rating" integer,
	"enrolled_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "training_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"title" text,
	"description" text,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"location_type" text DEFAULT 'onsite',
	"location" text,
	"online_link" text,
	"max_participants" integer,
	"current_participants" integer DEFAULT 0,
	"status" text DEFAULT 'scheduled',
	"instructor_id" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "criteria_scores" (
	"id" text PRIMARY KEY NOT NULL,
	"review_id" text NOT NULL,
	"criteria_id" text NOT NULL,
	"score" integer,
	"weight" integer,
	"weighted_score" numeric,
	"comment" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "evaluation_criteria" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"description" text,
	"category" text DEFAULT 'competency',
	"weight" integer DEFAULT 1,
	"max_score" integer DEFAULT 5,
	"department_id" text,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "evaluation_cycles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"cycle_type" text DEFAULT 'annual',
	"year" integer,
	"quarter" integer,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"review_deadline" timestamp,
	"status" text DEFAULT 'draft',
	"self_review_enabled" boolean DEFAULT true,
	"manager_review_enabled" boolean DEFAULT true,
	"peer_review_enabled" boolean DEFAULT false,
	"goals_weight" integer DEFAULT 50,
	"competencies_weight" integer DEFAULT 50,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "performance_goals" (
	"id" text PRIMARY KEY NOT NULL,
	"cycle_id" text,
	"employee_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"measure_type" text DEFAULT 'quantitative',
	"target_value" numeric,
	"current_value" numeric,
	"unit" text,
	"weight" integer DEFAULT 1,
	"start_date" timestamp,
	"due_date" timestamp,
	"status" text DEFAULT 'not_started',
	"progress" integer DEFAULT 0,
	"achievement_percentage" integer,
	"final_score" numeric,
	"manager_rating" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "performance_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"note_type" text DEFAULT 'general',
	"content" text NOT NULL,
	"is_private" boolean DEFAULT false,
	"visible_to_employee" boolean DEFAULT false,
	"related_goal_id" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "performance_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"cycle_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"reviewer_id" text,
	"review_type" text DEFAULT 'manager',
	"status" text DEFAULT 'pending',
	"overall_score" numeric,
	"goals_score" numeric,
	"competencies_score" numeric,
	"rating" text,
	"strengths" text,
	"areas_for_improvement" text,
	"manager_comments" text,
	"employee_comments" text,
	"next_period_goals" jsonb,
	"development_plan" text,
	"employee_signed_at" timestamp,
	"reviewer_signed_at" timestamp,
	"submitted_at" timestamp,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rating_scales" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"value" integer NOT NULL,
	"description" text,
	"description_en" text,
	"color" text,
	"is_default" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "risk_assessments" (
	"id" text PRIMARY KEY NOT NULL,
	"risk_id" text NOT NULL,
	"probability" integer NOT NULL,
	"impact" integer NOT NULL,
	"score" integer NOT NULL,
	"level" text,
	"justification" text,
	"assumptions" text,
	"assessed_by" text,
	"assessed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "risk_incidents" (
	"id" text PRIMARY KEY NOT NULL,
	"risk_id" text,
	"title" text NOT NULL,
	"description" text,
	"severity" text DEFAULT 'medium',
	"financial_impact" numeric,
	"operational_impact" text,
	"occurred_at" timestamp NOT NULL,
	"reported_at" timestamp DEFAULT now(),
	"resolved_at" timestamp,
	"status" text DEFAULT 'reported',
	"root_cause" text,
	"lessons_learned" text,
	"preventive_measures" text,
	"reported_by" text,
	"assigned_to" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "risk_matrix" (
	"id" text PRIMARY KEY NOT NULL,
	"probability_level" integer NOT NULL,
	"impact_level" integer NOT NULL,
	"probability_label" text,
	"impact_label" text,
	"risk_level" text NOT NULL,
	"color" text,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "risk_register" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"year" integer,
	"quarter" integer,
	"branch_id" text,
	"department_id" text,
	"total_risks" integer DEFAULT 0,
	"high_risks" integer DEFAULT 0,
	"mitigated_risks" integer DEFAULT 0,
	"status" text DEFAULT 'draft',
	"approved_by" text,
	"approved_at" timestamp,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "risk_treatments" (
	"id" text PRIMARY KEY NOT NULL,
	"risk_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"treatment_type" text DEFAULT 'mitigate',
	"estimated_cost" numeric,
	"actual_cost" numeric,
	"status" text DEFAULT 'planned',
	"priority" text DEFAULT 'medium',
	"start_date" timestamp,
	"due_date" timestamp,
	"completed_at" timestamp,
	"effectiveness" integer,
	"effectiveness_notes" text,
	"assigned_to" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "risks" (
	"id" text PRIMARY KEY NOT NULL,
	"risk_number" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'operational',
	"subcategory" text,
	"probability" integer,
	"impact" integer,
	"risk_score" integer,
	"risk_level" text,
	"residual_probability" integer,
	"residual_impact" integer,
	"residual_score" integer,
	"status" text DEFAULT 'identified',
	"branch_id" text,
	"department_id" text,
	"owner_id" text,
	"identified_at" timestamp DEFAULT now(),
	"review_date" timestamp,
	"closed_at" timestamp,
	"notes" text,
	"tags" jsonb,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "risks_risk_number_unique" UNIQUE("risk_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "corrective_actions" (
	"id" text PRIMARY KEY NOT NULL,
	"ca_number" text NOT NULL,
	"non_conformance_id" text,
	"title" text NOT NULL,
	"description" text,
	"action_type" text DEFAULT 'corrective',
	"steps" jsonb,
	"status" text DEFAULT 'planned',
	"priority" text DEFAULT 'medium',
	"start_date" timestamp,
	"target_date" timestamp,
	"completed_at" timestamp,
	"verified_at" timestamp,
	"verification_method" text,
	"verification_result" text,
	"effectiveness" integer,
	"assigned_to" text,
	"verified_by" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "corrective_actions_ca_number_unique" UNIQUE("ca_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "non_conformances" (
	"id" text PRIMARY KEY NOT NULL,
	"nc_number" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"source_type" text DEFAULT 'inspection',
	"source_id" text,
	"inspection_id" text,
	"category" text,
	"severity" text DEFAULT 'minor',
	"product_id" text,
	"affected_quantity" integer,
	"status" text DEFAULT 'open',
	"root_cause" text,
	"containment_action" text,
	"corrective_action" text,
	"preventive_action" text,
	"detected_at" timestamp DEFAULT now(),
	"due_date" timestamp,
	"closed_at" timestamp,
	"reported_by" text,
	"assigned_to" text,
	"cost_impact" numeric,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "non_conformances_nc_number_unique" UNIQUE("nc_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quality_audits" (
	"id" text PRIMARY KEY NOT NULL,
	"audit_number" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"audit_type" text DEFAULT 'internal',
	"scope" text,
	"department_id" text,
	"branch_id" text,
	"planned_date" timestamp,
	"start_date" timestamp,
	"end_date" timestamp,
	"lead_auditor_id" text,
	"audit_team" jsonb,
	"status" text DEFAULT 'planned',
	"overall_rating" text,
	"findings" jsonb,
	"strengths" text,
	"weaknesses" text,
	"opportunities" text,
	"report_url" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "quality_audits_audit_number_unique" UNIQUE("audit_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quality_inspections" (
	"id" text PRIMARY KEY NOT NULL,
	"inspection_number" text NOT NULL,
	"inspection_type" text DEFAULT 'routine',
	"target_type" text DEFAULT 'product',
	"target_id" text,
	"product_id" text,
	"standard_id" text,
	"scheduled_at" timestamp,
	"inspected_at" timestamp,
	"result" text,
	"score" integer,
	"measurements" jsonb,
	"findings" text,
	"recommendations" text,
	"status" text DEFAULT 'scheduled',
	"inspector_id" text,
	"attachments" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "quality_inspections_inspection_number_unique" UNIQUE("inspection_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quality_standards" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"description" text,
	"category" text DEFAULT 'product',
	"type" text DEFAULT 'internal',
	"requirements" jsonb,
	"min_value" numeric,
	"max_value" numeric,
	"target_value" numeric,
	"unit" text,
	"is_active" boolean DEFAULT true,
	"effective_date" timestamp,
	"expiry_date" timestamp,
	"department_id" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "quality_standards_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "custom_metrics" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"description" text,
	"formula" text,
	"data_source" text,
	"aggregation_type" text DEFAULT 'sum',
	"unit" text,
	"format" text,
	"decimals" integer DEFAULT 2,
	"target_value" numeric,
	"warning_threshold" numeric,
	"critical_threshold" numeric,
	"direction" text DEFAULT 'higher_is_better',
	"category" text,
	"department_id" text,
	"is_active" boolean DEFAULT true,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "custom_metrics_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dashboard_widgets" (
	"id" text PRIMARY KEY NOT NULL,
	"dashboard_id" text NOT NULL,
	"title" text NOT NULL,
	"widget_type" text NOT NULL,
	"position_x" integer DEFAULT 0,
	"position_y" integer DEFAULT 0,
	"width" integer DEFAULT 1,
	"height" integer DEFAULT 1,
	"data_source" text,
	"data_config" jsonb,
	"chart_type" text,
	"colors" jsonb,
	"display_options" jsonb,
	"filters" jsonb,
	"auto_refresh" boolean DEFAULT false,
	"refresh_interval" integer,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dashboards" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"dashboard_type" text DEFAULT 'custom',
	"layout" jsonb,
	"theme" text DEFAULT 'light',
	"refresh_interval" integer,
	"is_public" boolean DEFAULT false,
	"is_default" boolean DEFAULT false,
	"department_id" text,
	"branch_id" text,
	"is_active" boolean DEFAULT true,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "metric_values" (
	"id" text PRIMARY KEY NOT NULL,
	"metric_id" text NOT NULL,
	"value" numeric NOT NULL,
	"previous_value" numeric,
	"change_percentage" numeric,
	"period_type" text DEFAULT 'daily',
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"branch_id" text,
	"department_id" text,
	"calculated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "report_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"scheduled_report_id" text,
	"report_name" text NOT NULL,
	"report_type" text,
	"status" text DEFAULT 'pending',
	"started_at" timestamp,
	"completed_at" timestamp,
	"duration" integer,
	"record_count" integer,
	"file_url" text,
	"file_size" integer,
	"error_message" text,
	"generated_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scheduled_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"report_type" text NOT NULL,
	"report_config" jsonb,
	"frequency" text DEFAULT 'daily',
	"schedule_time" text,
	"day_of_week" integer,
	"day_of_month" integer,
	"delivery_method" text DEFAULT 'email',
	"recipients" jsonb,
	"format" text DEFAULT 'pdf',
	"is_active" boolean DEFAULT true,
	"last_run_at" timestamp,
	"next_run_at" timestamp,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "smart_alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"condition_type" text DEFAULT 'threshold',
	"metric_id" text,
	"operator" text,
	"threshold_value" numeric,
	"comparison_period" text,
	"comparison_percentage" numeric,
	"alert_level" text DEFAULT 'warning',
	"notification_channels" jsonb,
	"recipients" jsonb,
	"is_active" boolean DEFAULT true,
	"last_triggered_at" timestamp,
	"trigger_count" integer DEFAULT 0,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cash_advances" (
	"id" text PRIMARY KEY NOT NULL,
	"advance_number" text NOT NULL,
	"employee_id" text NOT NULL,
	"purpose" text NOT NULL,
	"description" text,
	"amount" numeric NOT NULL,
	"currency" text DEFAULT 'IQD',
	"status" text DEFAULT 'pending',
	"settled_amount" numeric,
	"remaining_amount" numeric,
	"settlement_deadline" timestamp,
	"settled_at" timestamp,
	"approved_by" text,
	"approved_at" timestamp,
	"disbursed_by" text,
	"disbursed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "cash_advances_advance_number_unique" UNIQUE("advance_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "expense_approvals" (
	"id" text PRIMARY KEY NOT NULL,
	"expense_id" text NOT NULL,
	"approver_id" text NOT NULL,
	"approval_level" integer NOT NULL,
	"decision" text NOT NULL,
	"comments" text,
	"decided_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "expense_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"description" text,
	"parent_id" text,
	"monthly_limit" numeric,
	"requires_approval" boolean DEFAULT true,
	"approval_threshold" numeric,
	"account_code" text,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "expense_policies" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"department_id" text,
	"rules" jsonb,
	"approval_levels" jsonb,
	"is_active" boolean DEFAULT true,
	"effective_from" timestamp,
	"effective_to" timestamp,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "expense_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"report_number" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"period_start" timestamp,
	"period_end" timestamp,
	"department_id" text,
	"branch_id" text,
	"total_amount" numeric,
	"expense_count" integer,
	"by_category" jsonb,
	"by_department" jsonb,
	"status" text DEFAULT 'draft',
	"generated_by" text,
	"generated_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "expense_reports_report_number_unique" UNIQUE("report_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "expense_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"request_number" text NOT NULL,
	"requester_id" text NOT NULL,
	"department_id" text,
	"branch_id" text,
	"title" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'operational',
	"amount" numeric NOT NULL,
	"currency" text DEFAULT 'IQD',
	"expense_date" timestamp,
	"vendor_name" text,
	"vendor_invoice" text,
	"receipts" jsonb,
	"status" text DEFAULT 'draft',
	"approval_level" integer DEFAULT 0,
	"current_approver_id" text,
	"payment_method" text,
	"paid_at" timestamp,
	"payment_reference" text,
	"rejection_reason" text,
	"submitted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "expense_requests_request_number_unique" UNIQUE("request_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "decision_follow_ups" (
	"id" text PRIMARY KEY NOT NULL,
	"decision_id" text NOT NULL,
	"update_text" text NOT NULL,
	"progress" integer,
	"attachments" jsonb,
	"created_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meeting_action_items" (
	"id" text PRIMARY KEY NOT NULL,
	"meeting_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"assigned_to" text,
	"due_date" timestamp,
	"priority" text DEFAULT 'medium',
	"status" text DEFAULT 'pending',
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meeting_attendees" (
	"id" text PRIMARY KEY NOT NULL,
	"meeting_id" text NOT NULL,
	"user_id" text,
	"external_name" text,
	"external_email" text,
	"role" text DEFAULT 'attendee',
	"invite_status" text DEFAULT 'pending',
	"attendance_status" text,
	"checked_in_at" timestamp,
	"notes" text,
	"invited_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meeting_decisions" (
	"id" text PRIMARY KEY NOT NULL,
	"meeting_id" text NOT NULL,
	"decision_number" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'general',
	"priority" text DEFAULT 'medium',
	"assigned_to" text,
	"deadline" timestamp,
	"status" text DEFAULT 'pending',
	"implementation_notes" text,
	"completed_at" timestamp,
	"votes_for" integer,
	"votes_against" integer,
	"votes_abstain" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meeting_rooms" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"branch_id" text,
	"floor" text,
	"building" text,
	"capacity" integer,
	"facilities" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meetings" (
	"id" text PRIMARY KEY NOT NULL,
	"meeting_number" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"meeting_type" text DEFAULT 'regular',
	"scheduled_at" timestamp NOT NULL,
	"started_at" timestamp,
	"ended_at" timestamp,
	"duration" integer,
	"location_type" text DEFAULT 'physical',
	"location" text,
	"meeting_link" text,
	"organizer_id" text NOT NULL,
	"department_id" text,
	"branch_id" text,
	"status" text DEFAULT 'scheduled',
	"agenda" jsonb,
	"minutes_text" text,
	"minutes_approved" boolean DEFAULT false,
	"minutes_approved_by" text,
	"minutes_approved_at" timestamp,
	"attachments" jsonb,
	"is_recurring" boolean DEFAULT false,
	"recurring_pattern" text,
	"notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "meetings_meeting_number_unique" UNIQUE("meeting_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "room_bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"meeting_id" text,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"booked_by" text NOT NULL,
	"status" text DEFAULT 'confirmed',
	"purpose" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "drivers" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"license_number" text NOT NULL,
	"license_type" text,
	"license_expiry" timestamp,
	"status" text DEFAULT 'active',
	"rating" numeric,
	"total_trips" integer DEFAULT 0,
	"assigned_vehicle_id" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fuel_records" (
	"id" text PRIMARY KEY NOT NULL,
	"vehicle_id" text NOT NULL,
	"fuel_type" text,
	"quantity" numeric NOT NULL,
	"price_per_unit" numeric,
	"total_cost" numeric NOT NULL,
	"station" text,
	"location" text,
	"mileage" integer,
	"filled_by" text,
	"filled_at" timestamp DEFAULT now(),
	"notes" text,
	"receipt_image" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "traffic_violations" (
	"id" text PRIMARY KEY NOT NULL,
	"vehicle_id" text NOT NULL,
	"driver_id" text,
	"violation_type" text,
	"description" text,
	"location" text,
	"fine_amount" numeric,
	"is_paid" boolean DEFAULT false,
	"paid_at" timestamp,
	"paid_by" text,
	"violation_date" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vehicle_maintenance" (
	"id" text PRIMARY KEY NOT NULL,
	"maintenance_number" text NOT NULL,
	"vehicle_id" text NOT NULL,
	"maintenance_type" text DEFAULT 'routine',
	"description" text NOT NULL,
	"items" jsonb,
	"labor_cost" numeric,
	"parts_cost" numeric,
	"total_cost" numeric,
	"vendor" text,
	"invoice_number" text,
	"mileage_at_service" integer,
	"next_service_mileage" integer,
	"next_service_date" timestamp,
	"scheduled_date" timestamp,
	"start_date" timestamp,
	"completed_date" timestamp,
	"status" text DEFAULT 'scheduled',
	"performed_by" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "vehicle_maintenance_maintenance_number_unique" UNIQUE("maintenance_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vehicle_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"request_number" text NOT NULL,
	"requester_id" text NOT NULL,
	"department_id" text,
	"vehicle_id" text,
	"preferred_vehicle_type" text,
	"purpose" text NOT NULL,
	"destination" text,
	"passengers" integer,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"actual_start_date" timestamp,
	"actual_end_date" timestamp,
	"status" text DEFAULT 'pending',
	"approved_by" text,
	"approved_at" timestamp,
	"rejection_reason" text,
	"driver_id" text,
	"start_mileage" integer,
	"end_mileage" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "vehicle_requests_request_number_unique" UNIQUE("request_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vehicle_tracking" (
	"id" text PRIMARY KEY NOT NULL,
	"vehicle_id" text NOT NULL,
	"latitude" numeric,
	"longitude" numeric,
	"address" text,
	"speed" numeric,
	"engine_status" text,
	"recorded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vehicles" (
	"id" text PRIMARY KEY NOT NULL,
	"vehicle_number" text NOT NULL,
	"plate_number" text NOT NULL,
	"brand" text NOT NULL,
	"model" text NOT NULL,
	"year" integer,
	"color" text,
	"vehicle_type" text DEFAULT 'sedan',
	"fuel_type" text DEFAULT 'gasoline',
	"engine_number" text,
	"chassis_number" text,
	"capacity" integer,
	"load_capacity" numeric,
	"ownership_type" text DEFAULT 'owned',
	"purchase_date" timestamp,
	"purchase_price" numeric,
	"assigned_to" text,
	"department_id" text,
	"branch_id" text,
	"status" text DEFAULT 'available',
	"current_mileage" integer DEFAULT 0,
	"registration_expiry" timestamp,
	"insurance_expiry" timestamp,
	"inspection_expiry" timestamp,
	"images" jsonb,
	"notes" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "vehicles_vehicle_number_unique" UNIQUE("vehicle_number"),
	CONSTRAINT "vehicles_plate_number_unique" UNIQUE("plate_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "complaint_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"parent_id" text,
	"sla_hours" integer DEFAULT 48,
	"default_department_id" text,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "complaint_history" (
	"id" text PRIMARY KEY NOT NULL,
	"complaint_id" text NOT NULL,
	"action" text NOT NULL,
	"from_value" text,
	"to_value" text,
	"performed_by" text,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "complaint_replies" (
	"id" text PRIMARY KEY NOT NULL,
	"complaint_id" text NOT NULL,
	"user_id" text,
	"is_customer_reply" boolean DEFAULT false,
	"message" text NOT NULL,
	"attachments" jsonb,
	"is_internal" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "complaints" (
	"id" text PRIMARY KEY NOT NULL,
	"complaint_number" text NOT NULL,
	"submitter_type" text DEFAULT 'customer',
	"customer_id" text,
	"employee_id" text,
	"external_name" text,
	"external_phone" text,
	"external_email" text,
	"category" text DEFAULT 'service',
	"subcategory" text,
	"subject" text NOT NULL,
	"description" text NOT NULL,
	"priority" text DEFAULT 'medium',
	"related_type" text,
	"related_id" text,
	"department_id" text,
	"branch_id" text,
	"assigned_to" text,
	"status" text DEFAULT 'new',
	"escalation_level" integer DEFAULT 0,
	"escalated_to" text,
	"escalated_at" timestamp,
	"escalation_reason" text,
	"resolution" text,
	"resolved_by" text,
	"resolved_at" timestamp,
	"satisfaction_rating" integer,
	"satisfaction_comment" text,
	"attachments" jsonb,
	"sla_deadline" timestamp,
	"is_sla_breach" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "complaints_complaint_number_unique" UNIQUE("complaint_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "satisfaction_surveys" (
	"id" text PRIMARY KEY NOT NULL,
	"complaint_id" text,
	"customer_id" text,
	"overall_rating" integer,
	"response_time_rating" integer,
	"solution_quality_rating" integer,
	"staff_professionalism_rating" integer,
	"comment" text,
	"would_recommend" boolean,
	"needs_follow_up" boolean DEFAULT false,
	"submitted_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "suggestions" (
	"id" text PRIMARY KEY NOT NULL,
	"suggestion_number" text NOT NULL,
	"submitter_type" text DEFAULT 'customer',
	"customer_id" text,
	"employee_id" text,
	"external_name" text,
	"external_email" text,
	"category" text DEFAULT 'general',
	"title" text NOT NULL,
	"description" text NOT NULL,
	"expected_benefit" text,
	"status" text DEFAULT 'submitted',
	"feasibility" text,
	"impact" text,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"review_notes" text,
	"implemented_by" text,
	"implemented_at" timestamp,
	"implementation_notes" text,
	"reward_given" boolean DEFAULT false,
	"reward_details" text,
	"upvotes" integer DEFAULT 0,
	"downvotes" integer DEFAULT 0,
	"attachments" jsonb,
	"is_public" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "suggestions_suggestion_number_unique" UNIQUE("suggestion_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lease_contracts" (
	"id" text PRIMARY KEY NOT NULL,
	"contract_number" text NOT NULL,
	"property_id" text NOT NULL,
	"unit_id" text,
	"tenant_id" text NOT NULL,
	"tenant_type" text DEFAULT 'individual',
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"monthly_rent" numeric NOT NULL,
	"annual_rent" numeric,
	"payment_frequency" text DEFAULT 'monthly',
	"security_deposit" numeric,
	"deposit_paid" boolean DEFAULT false,
	"terms" text,
	"special_conditions" text,
	"status" text DEFAULT 'active',
	"auto_renew" boolean DEFAULT false,
	"renewal_terms" text,
	"documents" jsonb,
	"signed_at" timestamp,
	"signed_by" text,
	"terminated_at" timestamp,
	"termination_reason" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "lease_contracts_contract_number_unique" UNIQUE("contract_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "properties" (
	"id" text PRIMARY KEY NOT NULL,
	"property_number" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"property_type" text DEFAULT 'commercial',
	"address" text NOT NULL,
	"city" text,
	"region" text,
	"postal_code" text,
	"coordinates" jsonb,
	"total_area" numeric,
	"usable_area" numeric,
	"floors" integer,
	"ownership_type" text DEFAULT 'owned',
	"purchase_date" timestamp,
	"purchase_price" numeric,
	"current_value" numeric,
	"status" text DEFAULT 'available',
	"features" jsonb,
	"images" jsonb,
	"documents" jsonb,
	"managed_by" text,
	"branch_id" text,
	"notes" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "properties_property_number_unique" UNIQUE("property_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "property_inspections" (
	"id" text PRIMARY KEY NOT NULL,
	"property_id" text NOT NULL,
	"unit_id" text,
	"contract_id" text,
	"inspection_type" text DEFAULT 'routine',
	"scheduled_at" timestamp,
	"completed_at" timestamp,
	"inspector_id" text,
	"overall_condition" text,
	"findings" jsonb,
	"images" jsonb,
	"status" text DEFAULT 'scheduled',
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "property_maintenance" (
	"id" text PRIMARY KEY NOT NULL,
	"maintenance_number" text NOT NULL,
	"property_id" text NOT NULL,
	"unit_id" text,
	"maintenance_type" text DEFAULT 'repair',
	"title" text NOT NULL,
	"description" text,
	"priority" text DEFAULT 'medium',
	"estimated_cost" numeric,
	"actual_cost" numeric,
	"paid_by" text,
	"scheduled_date" timestamp,
	"completed_date" timestamp,
	"vendor" text,
	"vendor_contact" text,
	"status" text DEFAULT 'pending',
	"reported_by" text,
	"assigned_to" text,
	"images" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "property_maintenance_maintenance_number_unique" UNIQUE("maintenance_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "property_units" (
	"id" text PRIMARY KEY NOT NULL,
	"unit_number" text NOT NULL,
	"property_id" text NOT NULL,
	"name" text,
	"floor" integer,
	"unit_type" text DEFAULT 'office',
	"area" numeric,
	"monthly_rent" numeric,
	"annual_rent" numeric,
	"status" text DEFAULT 'vacant',
	"current_tenant_id" text,
	"features" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rent_payments" (
	"id" text PRIMARY KEY NOT NULL,
	"payment_number" text NOT NULL,
	"contract_id" text NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"amount" numeric NOT NULL,
	"late_fee" numeric DEFAULT '0',
	"total_amount" numeric NOT NULL,
	"due_date" timestamp NOT NULL,
	"status" text DEFAULT 'pending',
	"paid_amount" numeric DEFAULT '0',
	"paid_at" timestamp,
	"payment_method" text,
	"payment_reference" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "rent_payments_payment_number_unique" UNIQUE("payment_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "article_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"article_id" text NOT NULL,
	"user_id" text,
	"guest_name" text,
	"content" text NOT NULL,
	"parent_id" text,
	"status" text DEFAULT 'pending',
	"is_internal" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "article_ratings" (
	"id" text PRIMARY KEY NOT NULL,
	"article_id" text NOT NULL,
	"user_id" text,
	"is_helpful" boolean NOT NULL,
	"feedback" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "article_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"article_id" text NOT NULL,
	"version" integer NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"change_notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "faqs" (
	"id" text PRIMARY KEY NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"category_id" text,
	"audience" text DEFAULT 'all',
	"sort_order" integer DEFAULT 0,
	"view_count" integer DEFAULT 0,
	"helpful_count" integer DEFAULT 0,
	"is_published" boolean DEFAULT true,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "knowledge_articles" (
	"id" text PRIMARY KEY NOT NULL,
	"article_number" text NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"summary" text,
	"content" text NOT NULL,
	"category_id" text,
	"tags" jsonb,
	"article_type" text DEFAULT 'article',
	"audience" text DEFAULT 'internal',
	"department_id" text,
	"status" text DEFAULT 'draft',
	"version" integer DEFAULT 1,
	"meta_title" text,
	"meta_description" text,
	"attachments" jsonb,
	"view_count" integer DEFAULT 0,
	"helpful_count" integer DEFAULT 0,
	"not_helpful_count" integer DEFAULT 0,
	"author_id" text NOT NULL,
	"reviewer_id" text,
	"published_at" timestamp,
	"last_reviewed_at" timestamp,
	"expires_at" timestamp,
	"is_featured" boolean DEFAULT false,
	"is_pinned" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "knowledge_articles_article_number_unique" UNIQUE("article_number"),
	CONSTRAINT "knowledge_articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "knowledge_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"slug" text NOT NULL,
	"description" text,
	"parent_id" text,
	"icon" text,
	"color" text,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "knowledge_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "knowledge_search_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"query" text NOT NULL,
	"results_count" integer DEFAULT 0,
	"user_id" text,
	"clicked_article_id" text,
	"searched_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "related_articles" (
	"id" text PRIMARY KEY NOT NULL,
	"article_id" text NOT NULL,
	"related_article_id" text NOT NULL,
	"relation_type" text DEFAULT 'related',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_bookmarks" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"article_id" text NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "event_expenses" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"category" text DEFAULT 'other',
	"description" text NOT NULL,
	"amount" numeric NOT NULL,
	"currency" text DEFAULT 'IQD',
	"vendor" text,
	"invoice_number" text,
	"status" text DEFAULT 'pending',
	"approved_by" text,
	"approved_at" timestamp,
	"paid_at" timestamp,
	"receipt" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "event_feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"registration_id" text,
	"overall_rating" integer,
	"content_rating" integer,
	"organization_rating" integer,
	"venue_rating" integer,
	"speakers_rating" integer,
	"likes" text,
	"improvements" text,
	"comments" text,
	"would_recommend" boolean,
	"interested_in_future" boolean,
	"is_anonymous" boolean DEFAULT false,
	"submitted_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "event_registrations" (
	"id" text PRIMARY KEY NOT NULL,
	"registration_number" text NOT NULL,
	"event_id" text NOT NULL,
	"registration_type" text DEFAULT 'employee',
	"user_id" text,
	"customer_id" text,
	"external_name" text,
	"external_email" text,
	"external_phone" text,
	"external_company" text,
	"status" text DEFAULT 'pending',
	"payment_status" text DEFAULT 'not_required',
	"payment_amount" numeric,
	"paid_at" timestamp,
	"payment_reference" text,
	"checked_in_at" timestamp,
	"checked_in_by" text,
	"special_requirements" text,
	"notes" text,
	"ticket_code" text,
	"qr_code" text,
	"registered_at" timestamp DEFAULT now(),
	"confirmed_at" timestamp,
	CONSTRAINT "event_registrations_registration_number_unique" UNIQUE("registration_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "event_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"room" text,
	"speaker_name" text,
	"speaker_title" text,
	"max_attendees" integer,
	"session_type" text DEFAULT 'presentation',
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "event_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"assigned_to" text,
	"due_date" timestamp,
	"priority" text DEFAULT 'medium',
	"status" text DEFAULT 'pending',
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "events" (
	"id" text PRIMARY KEY NOT NULL,
	"event_number" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"event_type" text DEFAULT 'conference',
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"all_day" boolean DEFAULT false,
	"timezone" text DEFAULT 'Asia/Baghdad',
	"location_type" text DEFAULT 'physical',
	"venue" text,
	"address" text,
	"city" text,
	"virtual_link" text,
	"max_attendees" integer,
	"current_attendees" integer DEFAULT 0,
	"registration_required" boolean DEFAULT true,
	"registration_deadline" timestamp,
	"registration_fee" numeric,
	"currency" text DEFAULT 'IQD',
	"status" text DEFAULT 'draft',
	"organizer_id" text,
	"department_id" text,
	"branch_id" text,
	"audience" text DEFAULT 'internal',
	"is_public" boolean DEFAULT false,
	"banner_image" text,
	"gallery" jsonb,
	"attachments" jsonb,
	"agenda" jsonb,
	"speakers" jsonb,
	"sponsors" jsonb,
	"estimated_budget" numeric,
	"actual_cost" numeric,
	"feedback_enabled" boolean DEFAULT true,
	"tags" jsonb,
	"notes" text,
	"published_at" timestamp,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "events_event_number_unique" UNIQUE("event_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "budget_actuals" (
	"id" text PRIMARY KEY NOT NULL,
	"budget_id" text NOT NULL,
	"line_item_id" text,
	"description" text NOT NULL,
	"amount" numeric NOT NULL,
	"transaction_date" timestamp NOT NULL,
	"reference_type" text,
	"reference_id" text,
	"vendor" text,
	"recorded_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "budget_alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"budget_id" text NOT NULL,
	"line_item_id" text,
	"alert_type" text DEFAULT 'threshold',
	"message" text NOT NULL,
	"threshold" integer,
	"current_value" numeric,
	"status" text DEFAULT 'active',
	"acknowledged_by" text,
	"acknowledged_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "budget_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"category_type" text DEFAULT 'expense',
	"parent_id" text,
	"account_id" text,
	"icon" text,
	"color" text,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "budget_line_items" (
	"id" text PRIMARY KEY NOT NULL,
	"budget_id" text NOT NULL,
	"category_id" text,
	"account_id" text,
	"name" text NOT NULL,
	"description" text,
	"budgeted_amount" numeric NOT NULL,
	"allocated_amount" numeric DEFAULT '0',
	"spent_amount" numeric DEFAULT '0',
	"monthly_allocation" jsonb,
	"priority" text DEFAULT 'medium',
	"notes" text,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "budget_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"budget_number" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"budget_type" text DEFAULT 'annual',
	"fiscal_year" integer NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"department_id" text,
	"branch_id" text,
	"project_id" text,
	"total_budget" numeric NOT NULL,
	"allocated_amount" numeric DEFAULT '0',
	"spent_amount" numeric DEFAULT '0',
	"remaining_amount" numeric,
	"currency" text DEFAULT 'IQD',
	"status" text DEFAULT 'draft',
	"approval_level" integer DEFAULT 0,
	"approved_by" text,
	"approved_at" timestamp,
	"allow_overspend" boolean DEFAULT false,
	"overspend_limit" numeric,
	"alert_threshold" integer DEFAULT 80,
	"notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "budget_plans_budget_number_unique" UNIQUE("budget_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "budget_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"budget_id" text,
	"report_type" text DEFAULT 'variance',
	"period_type" text DEFAULT 'monthly',
	"period_start" timestamp,
	"period_end" timestamp,
	"report_data" jsonb,
	"total_budgeted" numeric,
	"total_actual" numeric,
	"variance" numeric,
	"variance_percentage" numeric,
	"generated_by" text,
	"generated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "budget_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"request_number" text NOT NULL,
	"budget_id" text NOT NULL,
	"line_item_id" text,
	"request_type" text DEFAULT 'increase',
	"current_amount" numeric,
	"requested_amount" numeric NOT NULL,
	"justification" text NOT NULL,
	"attachments" jsonb,
	"status" text DEFAULT 'pending',
	"requested_by" text,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"review_notes" text,
	"approved_by" text,
	"approved_at" timestamp,
	"approved_amount" numeric,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "budget_requests_request_number_unique" UNIQUE("request_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "budget_transfers" (
	"id" text PRIMARY KEY NOT NULL,
	"transfer_number" text NOT NULL,
	"from_budget_id" text NOT NULL,
	"from_line_item_id" text,
	"to_budget_id" text NOT NULL,
	"to_line_item_id" text,
	"amount" numeric NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'pending',
	"requested_by" text,
	"approved_by" text,
	"approved_at" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "budget_transfers_transfer_number_unique" UNIQUE("transfer_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reception_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"branch_id" text,
	"working_hours_start" text,
	"working_hours_end" text,
	"require_id_verification" boolean DEFAULT true,
	"require_photo" boolean DEFAULT false,
	"require_nda" boolean DEFAULT false,
	"notify_host_on_arrival" boolean DEFAULT true,
	"notify_security_on_arrival" boolean DEFAULT false,
	"badge_prefix" text DEFAULT 'V',
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recurring_visits" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"purpose" text,
	"visit_type" text DEFAULT 'client',
	"visitor_name" text NOT NULL,
	"visitor_company" text,
	"host_id" text,
	"department_id" text,
	"frequency" text DEFAULT 'weekly',
	"day_of_week" integer,
	"day_of_month" integer,
	"start_time" text,
	"end_time" text,
	"start_date" timestamp,
	"end_date" timestamp,
	"is_active" boolean DEFAULT true,
	"created_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "visit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"visit_id" text NOT NULL,
	"member_id" text,
	"action" text NOT NULL,
	"details" text,
	"recorded_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "visit_members" (
	"id" text PRIMARY KEY NOT NULL,
	"visit_id" text NOT NULL,
	"name" text NOT NULL,
	"title" text,
	"company" text,
	"phone" text,
	"email" text,
	"id_number" text,
	"checked_in" boolean DEFAULT false,
	"checked_in_at" timestamp,
	"checked_out" boolean DEFAULT false,
	"checked_out_at" timestamp,
	"badge_number" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "visitor_blacklist" (
	"id" text PRIMARY KEY NOT NULL,
	"visitor_name" text NOT NULL,
	"visitor_id_number" text,
	"visitor_company" text,
	"reason" text NOT NULL,
	"start_date" timestamp DEFAULT now(),
	"end_date" timestamp,
	"is_permanent" boolean DEFAULT false,
	"added_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "visits" (
	"id" text PRIMARY KEY NOT NULL,
	"visit_number" text NOT NULL,
	"title" text NOT NULL,
	"purpose" text NOT NULL,
	"visit_type" text DEFAULT 'client',
	"visitor_type" text DEFAULT 'external',
	"visitor_name" text NOT NULL,
	"visitor_company" text,
	"visitor_title" text,
	"visitor_phone" text,
	"visitor_email" text,
	"visitor_id_number" text,
	"visitors_count" integer DEFAULT 1,
	"host_id" text,
	"department_id" text,
	"branch_id" text,
	"scheduled_date" timestamp NOT NULL,
	"scheduled_start_time" text,
	"scheduled_end_time" text,
	"actual_arrival" timestamp,
	"actual_departure" timestamp,
	"meeting_room" text,
	"status" text DEFAULT 'scheduled',
	"requires_approval" boolean DEFAULT false,
	"approved_by" text,
	"approved_at" timestamp,
	"badge_number" text,
	"badge_issued" boolean DEFAULT false,
	"escort_required" boolean DEFAULT false,
	"escort_id" text,
	"equipment_needed" jsonb,
	"refreshments_needed" boolean DEFAULT false,
	"parking_needed" boolean DEFAULT false,
	"notes" text,
	"internal_notes" text,
	"feedback_rating" integer,
	"feedback_comment" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "visits_visit_number_unique" UNIQUE("visit_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bid_evaluations" (
	"id" text PRIMARY KEY NOT NULL,
	"bid_id" text NOT NULL,
	"evaluator_id" text NOT NULL,
	"criterion_id" text,
	"criterion_name" text,
	"score" numeric,
	"max_score" numeric,
	"weight" numeric,
	"weighted_score" numeric,
	"comments" text,
	"evaluated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bids" (
	"id" text PRIMARY KEY NOT NULL,
	"bid_number" text NOT NULL,
	"tender_id" text NOT NULL,
	"supplier_id" text NOT NULL,
	"total_value" numeric NOT NULL,
	"currency" text DEFAULT 'IQD',
	"technical_proposal" text,
	"financial_proposal" text,
	"line_items" jsonb,
	"documents" jsonb,
	"bid_bond_submitted" boolean DEFAULT false,
	"bid_bond_amount" numeric,
	"bid_bond_expiry" timestamp,
	"status" text DEFAULT 'submitted',
	"technical_score" numeric,
	"financial_score" numeric,
	"total_score" numeric,
	"evaluation_notes" text,
	"disqualified" boolean DEFAULT false,
	"disqualification_reason" text,
	"submitted_at" timestamp DEFAULT now(),
	"evaluated_at" timestamp,
	"evaluated_by" text,
	CONSTRAINT "bids_bid_number_unique" UNIQUE("bid_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tender_clarifications" (
	"id" text PRIMARY KEY NOT NULL,
	"tender_id" text NOT NULL,
	"supplier_id" text,
	"question" text NOT NULL,
	"submitted_at" timestamp DEFAULT now(),
	"answer" text,
	"answered_by" text,
	"answered_at" timestamp,
	"is_public" boolean DEFAULT true,
	"published_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tender_committees" (
	"id" text PRIMARY KEY NOT NULL,
	"tender_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member',
	"can_evaluate" boolean DEFAULT true,
	"can_vote" boolean DEFAULT true,
	"assigned_at" timestamp DEFAULT now(),
	"assigned_by" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tender_history" (
	"id" text PRIMARY KEY NOT NULL,
	"tender_id" text NOT NULL,
	"action" text NOT NULL,
	"from_status" text,
	"to_status" text,
	"details" text,
	"performed_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tender_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"description" text,
	"requirements" jsonb,
	"evaluation_criteria" jsonb,
	"terms" text,
	"is_active" boolean DEFAULT true,
	"created_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tenders" (
	"id" text PRIMARY KEY NOT NULL,
	"tender_number" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"tender_type" text DEFAULT 'open',
	"category" text DEFAULT 'goods',
	"department_id" text,
	"branch_id" text,
	"project_id" text,
	"estimated_value" numeric,
	"currency" text DEFAULT 'IQD',
	"budget_allocated" boolean DEFAULT false,
	"publish_date" timestamp,
	"clarification_deadline" timestamp,
	"submission_deadline" timestamp NOT NULL,
	"opening_date" timestamp,
	"award_date" timestamp,
	"contract_start_date" timestamp,
	"contract_end_date" timestamp,
	"status" text DEFAULT 'draft',
	"requirements" jsonb,
	"evaluation_criteria" jsonb,
	"documents" jsonb,
	"participation_fee" numeric,
	"bid_bond_required" boolean DEFAULT false,
	"bid_bond_percentage" numeric,
	"allow_partial_bids" boolean DEFAULT false,
	"allow_alternative_bids" boolean DEFAULT false,
	"winner_id" text,
	"winner_bid_id" text,
	"award_value" numeric,
	"award_justification" text,
	"notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "tenders_tender_number_unique" UNIQUE("tender_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "correspondence_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"correspondence_id" text NOT NULL,
	"correspondence_direction" text NOT NULL,
	"comment" text NOT NULL,
	"is_internal" boolean DEFAULT true,
	"parent_comment_id" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "correspondence_numbering" (
	"id" text PRIMARY KEY NOT NULL,
	"direction" text NOT NULL,
	"department_id" text,
	"branch_id" text,
	"prefix" text,
	"suffix" text,
	"current_number" integer DEFAULT 1,
	"yearly_reset" boolean DEFAULT true,
	"last_reset_date" timestamp,
	"format" text DEFAULT '{prefix}/{year}/{number}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "correspondence_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"correspondence_type" text NOT NULL,
	"category" text,
	"subject" text,
	"content" text,
	"header_template" text,
	"footer_template" text,
	"variables" jsonb,
	"department_id" text,
	"is_active" boolean DEFAULT true,
	"is_default" boolean DEFAULT false,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "correspondence_tracking" (
	"id" text PRIMARY KEY NOT NULL,
	"correspondence_id" text NOT NULL,
	"correspondence_direction" text NOT NULL,
	"action" text NOT NULL,
	"from_status" text,
	"to_status" text,
	"details" text,
	"performed_by" text,
	"performed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "incoming_correspondence" (
	"id" text PRIMARY KEY NOT NULL,
	"reference_number" text NOT NULL,
	"external_reference_number" text,
	"subject" text NOT NULL,
	"content" text,
	"correspondence_type" text DEFAULT 'letter',
	"category" text DEFAULT 'general',
	"priority" text DEFAULT 'normal',
	"sender_type" text DEFAULT 'external',
	"sender_name" text NOT NULL,
	"sender_organization" text,
	"sender_department" text,
	"sender_address" text,
	"sender_email" text,
	"sender_phone" text,
	"customer_id" text,
	"supplier_id" text,
	"received_date" timestamp NOT NULL,
	"received_by" text,
	"received_at_branch_id" text,
	"assigned_to" text,
	"assigned_department_id" text,
	"assigned_at" timestamp,
	"assigned_by" text,
	"requires_action" boolean DEFAULT false,
	"action_required" text,
	"action_deadline" timestamp,
	"action_taken_date" timestamp,
	"action_taken" text,
	"status" text DEFAULT 'received',
	"attachments" jsonb,
	"is_archived" boolean DEFAULT false,
	"archive_number" text,
	"archive_location" text,
	"archived_at" timestamp,
	"archived_by" text,
	"response_correspondence_id" text,
	"related_correspondence_id" text,
	"thread_id" text,
	"notes" text,
	"tags" jsonb,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "incoming_correspondence_reference_number_unique" UNIQUE("reference_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "outgoing_correspondence" (
	"id" text PRIMARY KEY NOT NULL,
	"reference_number" text NOT NULL,
	"subject" text NOT NULL,
	"content" text,
	"correspondence_type" text DEFAULT 'letter',
	"category" text DEFAULT 'general',
	"priority" text DEFAULT 'normal',
	"sender_id" text,
	"sender_department_id" text,
	"sender_branch_id" text,
	"recipient_type" text DEFAULT 'external',
	"recipient_name" text,
	"recipient_organization" text,
	"recipient_department" text,
	"recipient_address" text,
	"recipient_email" text,
	"recipient_phone" text,
	"customer_id" text,
	"supplier_id" text,
	"internal_recipient_id" text,
	"internal_department_id" text,
	"cc_recipients" jsonb,
	"issue_date" timestamp NOT NULL,
	"due_date" timestamp,
	"sent_date" timestamp,
	"delivery_date" timestamp,
	"status" text DEFAULT 'draft',
	"requires_approval" boolean DEFAULT false,
	"approval_chain" jsonb,
	"approved_by" text,
	"approved_at" timestamp,
	"signed_by" text,
	"signed_at" timestamp,
	"signature_image" text,
	"attachments" jsonb,
	"is_archived" boolean DEFAULT false,
	"archive_number" text,
	"archive_location" text,
	"archived_at" timestamp,
	"archived_by" text,
	"retention_period" integer,
	"destruction_date" timestamp,
	"related_correspondence_id" text,
	"parent_correspondence_id" text,
	"thread_id" text,
	"delivery_method" text DEFAULT 'email',
	"tracking_number" text,
	"notes" text,
	"tags" jsonb,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "outgoing_correspondence_reference_number_unique" UNIQUE("reference_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "acknowledgment_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"policy_id" text NOT NULL,
	"requested_by" text,
	"target_type" text DEFAULT 'all',
	"target_department_id" text,
	"target_branch_id" text,
	"target_user_ids" jsonb,
	"deadline" timestamp,
	"message" text,
	"reminder_sent" boolean DEFAULT false,
	"last_reminder_at" timestamp,
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "policies" (
	"id" text PRIMARY KEY NOT NULL,
	"policy_number" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"content" text,
	"summary" text,
	"policy_type" text DEFAULT 'policy',
	"category" text DEFAULT 'general',
	"subcategory" text,
	"scope" text DEFAULT 'organization',
	"applicable_departments" jsonb,
	"applicable_branches" jsonb,
	"applicable_roles" jsonb,
	"version" text DEFAULT '1.0',
	"previous_version_id" text,
	"change_log" text,
	"effective_date" timestamp NOT NULL,
	"expiration_date" timestamp,
	"review_date" timestamp,
	"last_reviewed_at" timestamp,
	"last_reviewed_by" text,
	"status" text DEFAULT 'draft',
	"requires_approval" boolean DEFAULT true,
	"approval_workflow" jsonb,
	"approved_by" text,
	"approved_at" timestamp,
	"owner_id" text,
	"owner_department_id" text,
	"custodian_id" text,
	"priority" text DEFAULT 'medium',
	"compliance_level" text DEFAULT 'mandatory',
	"attachments" jsonb,
	"related_policies" jsonb,
	"references" jsonb,
	"keywords" jsonb,
	"tags" jsonb,
	"view_count" integer DEFAULT 0,
	"download_count" integer DEFAULT 0,
	"notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "policies_policy_number_unique" UNIQUE("policy_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "policy_acknowledgments" (
	"id" text PRIMARY KEY NOT NULL,
	"policy_id" text NOT NULL,
	"user_id" text NOT NULL,
	"acknowledged_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"method" text DEFAULT 'digital',
	"signature_url" text,
	"notes" text,
	"version" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "policy_change_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"request_number" text NOT NULL,
	"policy_id" text NOT NULL,
	"change_type" text DEFAULT 'amendment',
	"title" text NOT NULL,
	"description" text,
	"proposed_changes" text,
	"justification" text,
	"impact_analysis" text,
	"priority" text DEFAULT 'normal',
	"requested_by" text,
	"requested_at" timestamp DEFAULT now(),
	"status" text DEFAULT 'submitted',
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"review_comments" text,
	"implemented_at" timestamp,
	"attachments" jsonb,
	CONSTRAINT "policy_change_requests_request_number_unique" UNIQUE("request_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "policy_faqs" (
	"id" text PRIMARY KEY NOT NULL,
	"policy_id" text NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"order_index" integer DEFAULT 0,
	"is_published" boolean DEFAULT true,
	"view_count" integer DEFAULT 0,
	"helpful_count" integer DEFAULT 0,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "policy_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"policy_id" text NOT NULL,
	"review_type" text DEFAULT 'scheduled',
	"review_date" timestamp NOT NULL,
	"reviewer_id" text,
	"findings" text,
	"recommendations" text,
	"outcome" text DEFAULT 'no_change',
	"next_review_date" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "policy_sections" (
	"id" text PRIMARY KEY NOT NULL,
	"policy_id" text NOT NULL,
	"section_number" text NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"order_index" integer DEFAULT 0,
	"parent_section_id" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "policy_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"policy_type" text NOT NULL,
	"category" text,
	"structure" jsonb,
	"default_content" text,
	"is_active" boolean DEFAULT true,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "policy_violations" (
	"id" text PRIMARY KEY NOT NULL,
	"violation_number" text NOT NULL,
	"policy_id" text NOT NULL,
	"violator_id" text,
	"violator_name" text,
	"department_id" text,
	"branch_id" text,
	"violation_date" timestamp NOT NULL,
	"description" text NOT NULL,
	"severity" text DEFAULT 'minor',
	"evidence" jsonb,
	"reported_by" text,
	"reported_at" timestamp DEFAULT now(),
	"investigated_by" text,
	"investigation_started_at" timestamp,
	"investigation_completed_at" timestamp,
	"investigation_findings" text,
	"corrective_action" text,
	"corrective_action_deadline" timestamp,
	"corrective_action_completed_at" timestamp,
	"status" text DEFAULT 'reported',
	"penalty_applied" text,
	"notes" text,
	CONSTRAINT "policy_violations_violation_number_unique" UNIQUE("violation_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "license_alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"license_id" text NOT NULL,
	"alert_type" text NOT NULL,
	"alert_date" timestamp NOT NULL,
	"message" text,
	"severity" text DEFAULT 'medium',
	"is_read" boolean DEFAULT false,
	"read_at" timestamp,
	"read_by" text,
	"is_resolved" boolean DEFAULT false,
	"resolved_at" timestamp,
	"resolved_by" text,
	"resolution_notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "license_applications" (
	"id" text PRIMARY KEY NOT NULL,
	"application_number" text NOT NULL,
	"license_id" text,
	"application_type" text DEFAULT 'new',
	"license_type" text,
	"title" text NOT NULL,
	"description" text,
	"issuing_authority" text,
	"application_date" timestamp NOT NULL,
	"submission_date" timestamp,
	"expected_issue_date" timestamp,
	"actual_issue_date" timestamp,
	"status" text DEFAULT 'draft',
	"submitted_documents" jsonb,
	"application_fee" numeric,
	"fees_paid" boolean DEFAULT false,
	"payment_date" timestamp,
	"payment_reference" text,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"review_notes" text,
	"rejection_reason" text,
	"applicant_id" text,
	"applicant_department_id" text,
	"branch_id" text,
	"notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "license_applications_application_number_unique" UNIQUE("application_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "license_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"parent_category_id" text,
	"required_documents" jsonb,
	"default_renewal_period" integer DEFAULT 12,
	"default_reminder_days" integer DEFAULT 60,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "license_compliance_checks" (
	"id" text PRIMARY KEY NOT NULL,
	"license_id" text NOT NULL,
	"check_date" timestamp NOT NULL,
	"check_type" text DEFAULT 'routine',
	"conducted_by" text,
	"checklist" jsonb,
	"overall_status" text DEFAULT 'compliant',
	"findings" text,
	"recommendations" text,
	"corrective_actions" text,
	"follow_up_date" timestamp,
	"attachments" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "license_history" (
	"id" text PRIMARY KEY NOT NULL,
	"license_id" text NOT NULL,
	"action" text NOT NULL,
	"from_status" text,
	"to_status" text,
	"details" text,
	"performed_by" text,
	"performed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "license_renewals" (
	"id" text PRIMARY KEY NOT NULL,
	"license_id" text NOT NULL,
	"application_id" text,
	"renewal_number" text NOT NULL,
	"previous_expiry_date" timestamp NOT NULL,
	"new_expiry_date" timestamp NOT NULL,
	"renewal_date" timestamp NOT NULL,
	"renewal_fee" numeric,
	"fees_paid" boolean DEFAULT false,
	"payment_date" timestamp,
	"payment_reference" text,
	"status" text DEFAULT 'completed',
	"processed_by" text,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "licenses" (
	"id" text PRIMARY KEY NOT NULL,
	"license_number" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"license_type" text DEFAULT 'commercial',
	"category" text DEFAULT 'general',
	"issuing_authority" text NOT NULL,
	"authority_contact" text,
	"authority_phone" text,
	"authority_email" text,
	"authority_website" text,
	"external_license_number" text,
	"issue_date" timestamp NOT NULL,
	"expiry_date" timestamp NOT NULL,
	"effective_date" timestamp,
	"license_fee" numeric,
	"renewal_fee" numeric,
	"currency" text DEFAULT 'IQD',
	"status" text DEFAULT 'active',
	"scope" text DEFAULT 'organization',
	"applicable_branch_ids" jsonb,
	"applicable_department_ids" jsonb,
	"responsible_user_id" text,
	"responsible_department_id" text,
	"renewal_period_months" integer DEFAULT 12,
	"auto_renewal" boolean DEFAULT false,
	"renewal_reminder_days" integer DEFAULT 60,
	"last_renewal_date" timestamp,
	"renewal_count" integer DEFAULT 0,
	"requirements" jsonb,
	"conditions" jsonb,
	"attachments" jsonb,
	"related_license_ids" jsonb,
	"notes" text,
	"tags" jsonb,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "licenses_license_number_unique" UNIQUE("license_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "investment_alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"portfolio_id" text,
	"investment_id" text,
	"alert_type" text NOT NULL,
	"trigger_condition" text,
	"trigger_value" numeric,
	"current_value" numeric,
	"message" text,
	"severity" text DEFAULT 'medium',
	"is_triggered" boolean DEFAULT false,
	"triggered_at" timestamp,
	"is_acknowledged" boolean DEFAULT false,
	"acknowledged_at" timestamp,
	"acknowledged_by" text,
	"is_active" boolean DEFAULT true,
	"created_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "investment_goals" (
	"id" text PRIMARY KEY NOT NULL,
	"portfolio_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"goal_type" text DEFAULT 'accumulation',
	"target_amount" numeric NOT NULL,
	"current_amount" numeric DEFAULT '0',
	"currency" text DEFAULT 'IQD',
	"target_date" timestamp,
	"start_date" timestamp NOT NULL,
	"monthly_contribution" numeric,
	"contribution_frequency" text DEFAULT 'monthly',
	"status" text DEFAULT 'active',
	"progress_percentage" numeric,
	"priority" text DEFAULT 'medium',
	"notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "investment_portfolios" (
	"id" text PRIMARY KEY NOT NULL,
	"portfolio_number" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"portfolio_type" text DEFAULT 'mixed',
	"risk_profile" text DEFAULT 'moderate',
	"investment_strategy" text,
	"initial_value" numeric NOT NULL,
	"current_value" numeric,
	"total_invested" numeric DEFAULT '0',
	"total_withdrawn" numeric DEFAULT '0',
	"unrealized_gain" numeric DEFAULT '0',
	"realized_gain" numeric DEFAULT '0',
	"currency" text DEFAULT 'IQD',
	"target_value" numeric,
	"target_date" timestamp,
	"target_return_rate" numeric,
	"status" text DEFAULT 'active',
	"allocation_strategy" jsonb,
	"manager_id" text,
	"owner_department_id" text,
	"custodian_account" text,
	"inception_date" timestamp NOT NULL,
	"last_rebalance_date" timestamp,
	"next_rebalance_date" timestamp,
	"last_valuation_date" timestamp,
	"auto_rebalance" boolean DEFAULT false,
	"rebalance_threshold" numeric,
	"notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "investment_portfolios_portfolio_number_unique" UNIQUE("portfolio_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "investment_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"transaction_number" text NOT NULL,
	"portfolio_id" text NOT NULL,
	"investment_id" text,
	"transaction_type" text NOT NULL,
	"quantity" numeric,
	"price" numeric,
	"amount" numeric NOT NULL,
	"currency" text DEFAULT 'IQD',
	"realized_gain" numeric,
	"cost_basis" numeric,
	"commission" numeric,
	"fees" numeric,
	"tax" numeric,
	"net_amount" numeric,
	"transaction_date" timestamp NOT NULL,
	"settlement_date" timestamp,
	"status" text DEFAULT 'completed',
	"reference_number" text,
	"broker_confirmation" text,
	"notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "investment_transactions_transaction_number_unique" UNIQUE("transaction_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "investments" (
	"id" text PRIMARY KEY NOT NULL,
	"investment_number" text NOT NULL,
	"portfolio_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"investment_type" text DEFAULT 'stock',
	"asset_class" text DEFAULT 'equity',
	"ticker" text,
	"exchange" text,
	"isin" text,
	"sector" text,
	"country" text,
	"quantity" numeric NOT NULL,
	"purchase_price" numeric NOT NULL,
	"current_price" numeric,
	"currency" text DEFAULT 'IQD',
	"purchase_value" numeric NOT NULL,
	"current_value" numeric,
	"unrealized_gain" numeric,
	"unrealized_gain_percent" numeric,
	"purchase_date" timestamp NOT NULL,
	"settlement_date" timestamp,
	"maturity_date" timestamp,
	"status" text DEFAULT 'active',
	"dividend_yield" numeric,
	"coupon_rate" numeric,
	"last_dividend_date" timestamp,
	"next_dividend_date" timestamp,
	"total_dividends_received" numeric DEFAULT '0',
	"broker_id" text,
	"broker_name" text,
	"commission" numeric,
	"fees" numeric,
	"notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "investments_investment_number_unique" UNIQUE("investment_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "investment_performance_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"portfolio_id" text NOT NULL,
	"report_type" text DEFAULT 'monthly',
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"opening_value" numeric,
	"closing_value" numeric,
	"net_contributions" numeric,
	"absolute_return" numeric,
	"percentage_return" numeric,
	"time_weighted_return" numeric,
	"money_weighted_return" numeric,
	"benchmark_name" text,
	"benchmark_return" numeric,
	"excess_return" numeric,
	"volatility" numeric,
	"sharpe_ratio" numeric,
	"max_drawdown" numeric,
	"best_performer" text,
	"best_performer_return" numeric,
	"worst_performer" text,
	"worst_performer_return" numeric,
	"summary" text,
	"generated_by" text,
	"generated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portfolio_valuations" (
	"id" text PRIMARY KEY NOT NULL,
	"portfolio_id" text NOT NULL,
	"valuation_date" timestamp NOT NULL,
	"total_value" numeric NOT NULL,
	"total_cost" numeric,
	"unrealized_gain" numeric,
	"realized_gain_ytd" numeric,
	"dividends_ytd" numeric,
	"actual_allocation" jsonb,
	"daily_return" numeric,
	"weekly_return" numeric,
	"monthly_return" numeric,
	"yearly_return" numeric,
	"total_return" numeric,
	"benchmark_return" numeric,
	"alpha_return" numeric,
	"valued_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "approval_delegations" ADD CONSTRAINT "approval_delegations_delegator_id_users_id_fk" FOREIGN KEY ("delegator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "approval_delegations" ADD CONSTRAINT "approval_delegations_delegatee_id_users_id_fk" FOREIGN KEY ("delegatee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "approvals" ADD CONSTRAINT "approvals_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "approvals" ADD CONSTRAINT "approvals_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "backup_logs" ADD CONSTRAINT "backup_logs_initiated_by_users_id_fk" FOREIGN KEY ("initiated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "backup_settings" ADD CONSTRAINT "backup_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "budget_expenses" ADD CONSTRAINT "budget_expenses_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "budget_expenses" ADD CONSTRAINT "budget_expenses_budget_item_id_budget_items_id_fk" FOREIGN KEY ("budget_item_id") REFERENCES "public"."budget_items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "budget_expenses" ADD CONSTRAINT "budget_expenses_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "budgets" ADD CONSTRAINT "budgets_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "budgets" ADD CONSTRAINT "budgets_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "budgets" ADD CONSTRAINT "budgets_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "budgets" ADD CONSTRAINT "budgets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bundle_items" ADD CONSTRAINT "bundle_items_bundle_id_product_bundles_id_fk" FOREIGN KEY ("bundle_id") REFERENCES "public"."product_bundles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bundle_items" ADD CONSTRAINT "bundle_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "company_info" ADD CONSTRAINT "company_info_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customer_pricing" ADD CONSTRAINT "customer_pricing_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customer_pricing" ADD CONSTRAINT "customer_pricing_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customer_pricing" ADD CONSTRAINT "customer_pricing_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customer_pricing" ADD CONSTRAINT "customer_pricing_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoice_settings" ADD CONSTRAINT "invoice_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_bundles" ADD CONSTRAINT "product_bundles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "promotion_usages" ADD CONSTRAINT "promotion_usages_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "promotion_usages" ADD CONSTRAINT "promotion_usages_discount_code_id_discount_codes_id_fk" FOREIGN KEY ("discount_code_id") REFERENCES "public"."discount_codes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "promotion_usages" ADD CONSTRAINT "promotion_usages_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "promotion_usages" ADD CONSTRAINT "promotion_usages_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "promotion_usages" ADD CONSTRAINT "promotion_usages_applied_by_users_id_fk" FOREIGN KEY ("applied_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "promotions" ADD CONSTRAINT "promotions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "settings" ADD CONSTRAINT "settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "warranty_settings" ADD CONSTRAINT "warranty_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workflow_approvals" ADD CONSTRAINT "workflow_approvals_instance_id_workflow_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."workflow_instances"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workflow_approvals" ADD CONSTRAINT "workflow_approvals_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workflow_approvals" ADD CONSTRAINT "workflow_approvals_action_by_users_id_fk" FOREIGN KEY ("action_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workflow_approvals" ADD CONSTRAINT "workflow_approvals_delegated_to_users_id_fk" FOREIGN KEY ("delegated_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workflow_approvals" ADD CONSTRAINT "workflow_approvals_escalated_to_users_id_fk" FOREIGN KEY ("escalated_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_template_id_workflow_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."workflow_templates"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workflow_templates" ADD CONSTRAINT "workflow_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "serial_numbers" ADD CONSTRAINT "serial_numbers_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "serial_numbers" ADD CONSTRAINT "serial_numbers_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "warehouse_locations" ADD CONSTRAINT "warehouse_locations_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "serial_movements" ADD CONSTRAINT "serial_movements_serial_id_serial_numbers_id_fk" FOREIGN KEY ("serial_id") REFERENCES "public"."serial_numbers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "serial_movements" ADD CONSTRAINT "serial_movements_from_warehouse_id_warehouses_id_fk" FOREIGN KEY ("from_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "serial_movements" ADD CONSTRAINT "serial_movements_to_warehouse_id_warehouses_id_fk" FOREIGN KEY ("to_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "serial_movements" ADD CONSTRAINT "serial_movements_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customer_contacts" ADD CONSTRAINT "customer_contacts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customers" ADD CONSTRAINT "customers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory" ADD CONSTRAINT "inventory_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory" ADD CONSTRAINT "inventory_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "installment_schedules" ADD CONSTRAINT "installment_schedules_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "installment_schedules" ADD CONSTRAINT "installment_schedules_paid_by_users_id_fk" FOREIGN KEY ("paid_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_serial_id_serial_numbers_id_fk" FOREIGN KEY ("serial_id") REFERENCES "public"."serial_numbers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_received_by_users_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoices" ADD CONSTRAINT "invoices_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoices" ADD CONSTRAINT "invoices_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoices" ADD CONSTRAINT "invoices_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoices" ADD CONSTRAINT "invoices_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "return_history" ADD CONSTRAINT "return_history_return_request_id_return_requests_id_fk" FOREIGN KEY ("return_request_id") REFERENCES "public"."return_requests"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "return_history" ADD CONSTRAINT "return_history_return_item_id_return_items_id_fk" FOREIGN KEY ("return_item_id") REFERENCES "public"."return_items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "return_history" ADD CONSTRAINT "return_history_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "return_items" ADD CONSTRAINT "return_items_return_request_id_return_requests_id_fk" FOREIGN KEY ("return_request_id") REFERENCES "public"."return_requests"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "return_items" ADD CONSTRAINT "return_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "return_items" ADD CONSTRAINT "return_items_serial_id_serial_numbers_id_fk" FOREIGN KEY ("serial_id") REFERENCES "public"."serial_numbers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "maintenance_history" ADD CONSTRAINT "maintenance_history_maintenance_order_id_maintenance_orders_id_fk" FOREIGN KEY ("maintenance_order_id") REFERENCES "public"."maintenance_orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "maintenance_history" ADD CONSTRAINT "maintenance_history_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "maintenance_orders" ADD CONSTRAINT "maintenance_orders_serial_id_serial_numbers_id_fk" FOREIGN KEY ("serial_id") REFERENCES "public"."serial_numbers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "maintenance_orders" ADD CONSTRAINT "maintenance_orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "maintenance_orders" ADD CONSTRAINT "maintenance_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "maintenance_orders" ADD CONSTRAINT "maintenance_orders_diagnosed_by_users_id_fk" FOREIGN KEY ("diagnosed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "maintenance_orders" ADD CONSTRAINT "maintenance_orders_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "maintenance_orders" ADD CONSTRAINT "maintenance_orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "maintenance_parts" ADD CONSTRAINT "maintenance_parts_maintenance_order_id_maintenance_orders_id_fk" FOREIGN KEY ("maintenance_order_id") REFERENCES "public"."maintenance_orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "maintenance_parts" ADD CONSTRAINT "maintenance_parts_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "maintenance_parts" ADD CONSTRAINT "maintenance_parts_serial_id_serial_numbers_id_fk" FOREIGN KEY ("serial_id") REFERENCES "public"."serial_numbers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "maintenance_parts" ADD CONSTRAINT "maintenance_parts_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_responsible_user_id_users_id_fk" FOREIGN KEY ("responsible_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_cash_register_id_cash_registers_id_fk" FOREIGN KEY ("cash_register_id") REFERENCES "public"."cash_registers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "checks" ADD CONSTRAINT "checks_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "checks" ADD CONSTRAINT "checks_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "checks" ADD CONSTRAINT "checks_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "checks" ADD CONSTRAINT "checks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_from_account_id_accounts_id_fk" FOREIGN KEY ("from_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_to_account_id_accounts_id_fk" FOREIGN KEY ("to_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_check_id_checks_id_fk" FOREIGN KEY ("check_id") REFERENCES "public"."checks"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_cash_register_id_cash_registers_id_fk" FOREIGN KEY ("cash_register_id") REFERENCES "public"."cash_registers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attendance" ADD CONSTRAINT "attendance_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "departments" ADD CONSTRAINT "departments_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "employees" ADD CONSTRAINT "employees_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leaves" ADD CONSTRAINT "leaves_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leaves" ADD CONSTRAINT "leaves_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "positions" ADD CONSTRAINT "positions_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "salaries" ADD CONSTRAINT "salaries_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "salaries" ADD CONSTRAINT "salaries_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "salaries" ADD CONSTRAINT "salaries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "salary_advances" ADD CONSTRAINT "salary_advances_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "salary_advances" ADD CONSTRAINT "salary_advances_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "delivery_collections" ADD CONSTRAINT "delivery_collections_delivery_company_id_delivery_companies_id_fk" FOREIGN KEY ("delivery_company_id") REFERENCES "public"."delivery_companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "delivery_collections" ADD CONSTRAINT "delivery_collections_received_by_users_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "delivery_zones" ADD CONSTRAINT "delivery_zones_delivery_company_id_delivery_companies_id_fk" FOREIGN KEY ("delivery_company_id") REFERENCES "public"."delivery_companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shipment_tracking" ADD CONSTRAINT "shipment_tracking_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shipment_tracking" ADD CONSTRAINT "shipment_tracking_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shipments" ADD CONSTRAINT "shipments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shipments" ADD CONSTRAINT "shipments_delivery_company_id_delivery_companies_id_fk" FOREIGN KEY ("delivery_company_id") REFERENCES "public"."delivery_companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shipments" ADD CONSTRAINT "shipments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shipments" ADD CONSTRAINT "shipments_prepared_by_users_id_fk" FOREIGN KEY ("prepared_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shipments" ADD CONSTRAINT "shipments_handed_over_by_users_id_fk" FOREIGN KEY ("handed_over_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shipments" ADD CONSTRAINT "shipments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dividend_details" ADD CONSTRAINT "dividend_details_dividend_id_dividends_id_fk" FOREIGN KEY ("dividend_id") REFERENCES "public"."dividends"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dividend_details" ADD CONSTRAINT "dividend_details_shareholder_id_shareholders_id_fk" FOREIGN KEY ("shareholder_id") REFERENCES "public"."shareholders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dividends" ADD CONSTRAINT "dividends_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dividends" ADD CONSTRAINT "dividends_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "share_transactions" ADD CONSTRAINT "share_transactions_from_shareholder_id_shareholders_id_fk" FOREIGN KEY ("from_shareholder_id") REFERENCES "public"."shareholders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "share_transactions" ADD CONSTRAINT "share_transactions_to_shareholder_id_shareholders_id_fk" FOREIGN KEY ("to_shareholder_id") REFERENCES "public"."shareholders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "share_transactions" ADD CONSTRAINT "share_transactions_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "share_transactions" ADD CONSTRAINT "share_transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_delivery_log" ADD CONSTRAINT "notification_delivery_log_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scheduled_notifications" ADD CONSTRAINT "scheduled_notifications_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_notification_preferences" ADD CONSTRAINT "user_notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "campaign_members" ADD CONSTRAINT "campaign_members_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "campaign_members" ADD CONSTRAINT "campaign_members_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "campaign_members" ADD CONSTRAINT "campaign_members_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leads" ADD CONSTRAINT "leads_converted_customer_id_customers_id_fk" FOREIGN KEY ("converted_customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leads" ADD CONSTRAINT "leads_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "opportunity_activities" ADD CONSTRAINT "opportunity_activities_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "opportunity_activities" ADD CONSTRAINT "opportunity_activities_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "asset_maintenance" ADD CONSTRAINT "asset_maintenance_asset_id_fixed_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."fixed_assets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "asset_maintenance" ADD CONSTRAINT "asset_maintenance_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "asset_revaluations" ADD CONSTRAINT "asset_revaluations_asset_id_fixed_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."fixed_assets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "asset_revaluations" ADD CONSTRAINT "asset_revaluations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_asset_id_fixed_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."fixed_assets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_from_branch_id_branches_id_fk" FOREIGN KEY ("from_branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_from_department_id_departments_id_fk" FOREIGN KEY ("from_department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_from_assignee_users_id_fk" FOREIGN KEY ("from_assignee") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_to_branch_id_branches_id_fk" FOREIGN KEY ("to_branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_to_department_id_departments_id_fk" FOREIGN KEY ("to_department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_to_assignee_users_id_fk" FOREIGN KEY ("to_assignee") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "depreciation_records" ADD CONSTRAINT "depreciation_records_asset_id_fixed_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."fixed_assets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "depreciation_records" ADD CONSTRAINT "depreciation_records_posted_by_users_id_fk" FOREIGN KEY ("posted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_category_id_asset_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."asset_categories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_cash_movements" ADD CONSTRAINT "pos_cash_movements_session_id_pos_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."pos_sessions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_cash_movements" ADD CONSTRAINT "pos_cash_movements_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_cash_movements" ADD CONSTRAINT "pos_cash_movements_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_quick_products" ADD CONSTRAINT "pos_quick_products_terminal_id_pos_terminals_id_fk" FOREIGN KEY ("terminal_id") REFERENCES "public"."pos_terminals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_quick_products" ADD CONSTRAINT "pos_quick_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_terminal_id_pos_terminals_id_fk" FOREIGN KEY ("terminal_id") REFERENCES "public"."pos_terminals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_cashier_id_users_id_fk" FOREIGN KEY ("cashier_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_terminals" ADD CONSTRAINT "pos_terminals_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_transaction_items" ADD CONSTRAINT "pos_transaction_items_transaction_id_pos_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."pos_transactions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_transaction_items" ADD CONSTRAINT "pos_transaction_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_transactions" ADD CONSTRAINT "pos_transactions_session_id_pos_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."pos_sessions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_transactions" ADD CONSTRAINT "pos_transactions_terminal_id_pos_terminals_id_fk" FOREIGN KEY ("terminal_id") REFERENCES "public"."pos_terminals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_transactions" ADD CONSTRAINT "pos_transactions_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_transactions" ADD CONSTRAINT "pos_transactions_cashier_id_users_id_fk" FOREIGN KEY ("cashier_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_transactions" ADD CONSTRAINT "pos_transactions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_transactions" ADD CONSTRAINT "pos_transactions_voided_by_users_id_fk" FOREIGN KEY ("voided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "demand_forecasts" ADD CONSTRAINT "demand_forecasts_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "demand_forecasts" ADD CONSTRAINT "demand_forecasts_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "demand_forecasts" ADD CONSTRAINT "demand_forecasts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_receipt_id_goods_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."goods_receipts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_inspected_by_users_id_fk" FOREIGN KEY ("inspected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_order_id_purchase_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_requisition_id_purchase_requisitions_id_fk" FOREIGN KEY ("requisition_id") REFERENCES "public"."purchase_requisitions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_requisitions" ADD CONSTRAINT "purchase_requisitions_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_requisitions" ADD CONSTRAINT "purchase_requisitions_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reorder_points" ADD CONSTRAINT "reorder_points_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reorder_points" ADD CONSTRAINT "reorder_points_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "requisition_items" ADD CONSTRAINT "requisition_items_requisition_id_purchase_requisitions_id_fk" FOREIGN KEY ("requisition_id") REFERENCES "public"."purchase_requisitions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "requisition_items" ADD CONSTRAINT "requisition_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_expenses" ADD CONSTRAINT "project_expenses_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_expenses" ADD CONSTRAINT "project_expenses_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_expenses" ADD CONSTRAINT "project_expenses_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "projects" ADD CONSTRAINT "projects_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "projects" ADD CONSTRAINT "projects_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_task_id_project_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."project_tasks"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bill_of_materials" ADD CONSTRAINT "bill_of_materials_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bill_of_materials" ADD CONSTRAINT "bill_of_materials_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bom_items" ADD CONSTRAINT "bom_items_bom_id_bill_of_materials_id_fk" FOREIGN KEY ("bom_id") REFERENCES "public"."bill_of_materials"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bom_items" ADD CONSTRAINT "bom_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "material_consumption" ADD CONSTRAINT "material_consumption_order_id_production_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."production_orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "material_consumption" ADD CONSTRAINT "material_consumption_operation_id_production_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."production_operations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "material_consumption" ADD CONSTRAINT "material_consumption_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "material_consumption" ADD CONSTRAINT "material_consumption_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "material_consumption" ADD CONSTRAINT "material_consumption_consumed_by_users_id_fk" FOREIGN KEY ("consumed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "production_operations" ADD CONSTRAINT "production_operations_order_id_production_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."production_orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "production_operations" ADD CONSTRAINT "production_operations_work_center_id_work_centers_id_fk" FOREIGN KEY ("work_center_id") REFERENCES "public"."work_centers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "production_operations" ADD CONSTRAINT "production_operations_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_bom_id_bill_of_materials_id_fk" FOREIGN KEY ("bom_id") REFERENCES "public"."bill_of_materials"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quality_checks" ADD CONSTRAINT "quality_checks_order_id_production_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."production_orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quality_checks" ADD CONSTRAINT "quality_checks_operation_id_production_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."production_operations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quality_checks" ADD CONSTRAINT "quality_checks_checked_by_users_id_fk" FOREIGN KEY ("checked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_shopping_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."shopping_carts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "discount_codes" ADD CONSTRAINT "discount_codes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "online_order_items" ADD CONSTRAINT "online_order_items_order_id_online_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."online_orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "online_order_items" ADD CONSTRAINT "online_order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "online_orders" ADD CONSTRAINT "online_orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_order_id_online_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."online_orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shopping_carts" ADD CONSTRAINT "shopping_carts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "api_logs" ADD CONSTRAINT "api_logs_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "external_integrations" ADD CONSTRAINT "external_integrations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sync_logs" ADD CONSTRAINT "sync_logs_integration_id_external_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."external_integrations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_webhook_id_webhooks_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhooks"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_batch_devices" ADD CONSTRAINT "purchase_batch_devices_batch_id_purchase_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."purchase_batches"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_batch_devices" ADD CONSTRAINT "purchase_batch_devices_batch_item_id_purchase_batch_items_id_fk" FOREIGN KEY ("batch_item_id") REFERENCES "public"."purchase_batch_items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_batch_devices" ADD CONSTRAINT "purchase_batch_devices_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_batch_devices" ADD CONSTRAINT "purchase_batch_devices_inspected_by_users_id_fk" FOREIGN KEY ("inspected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_batch_devices" ADD CONSTRAINT "purchase_batch_devices_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_batch_items" ADD CONSTRAINT "purchase_batch_items_batch_id_purchase_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."purchase_batches"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_batch_items" ADD CONSTRAINT "purchase_batch_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_batches" ADD CONSTRAINT "purchase_batches_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_batches" ADD CONSTRAINT "purchase_batches_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_batches" ADD CONSTRAINT "purchase_batches_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_batches" ADD CONSTRAINT "purchase_batches_prices_added_by_users_id_fk" FOREIGN KEY ("prices_added_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_batches" ADD CONSTRAINT "purchase_batches_received_by_users_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_batches" ADD CONSTRAINT "purchase_batches_selling_prices_added_by_users_id_fk" FOREIGN KEY ("selling_prices_added_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "installation_prices" ADD CONSTRAINT "installation_prices_part_type_id_part_types_id_fk" FOREIGN KEY ("part_type_id") REFERENCES "public"."part_types"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "installed_parts" ADD CONSTRAINT "installed_parts_serial_id_serial_numbers_id_fk" FOREIGN KEY ("serial_id") REFERENCES "public"."serial_numbers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "installed_parts" ADD CONSTRAINT "installed_parts_part_id_parts_inventory_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts_inventory"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "installed_parts" ADD CONSTRAINT "installed_parts_part_type_id_part_types_id_fk" FOREIGN KEY ("part_type_id") REFERENCES "public"."part_types"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "installed_parts" ADD CONSTRAINT "installed_parts_upgrade_order_id_upgrade_orders_id_fk" FOREIGN KEY ("upgrade_order_id") REFERENCES "public"."upgrade_orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "installed_parts" ADD CONSTRAINT "installed_parts_installed_by_users_id_fk" FOREIGN KEY ("installed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "parts_inventory" ADD CONSTRAINT "parts_inventory_part_type_id_part_types_id_fk" FOREIGN KEY ("part_type_id") REFERENCES "public"."part_types"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "parts_inventory" ADD CONSTRAINT "parts_inventory_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "parts_movements" ADD CONSTRAINT "parts_movements_part_id_parts_inventory_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts_inventory"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "parts_movements" ADD CONSTRAINT "parts_movements_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "upgrade_items" ADD CONSTRAINT "upgrade_items_upgrade_order_id_upgrade_orders_id_fk" FOREIGN KEY ("upgrade_order_id") REFERENCES "public"."upgrade_orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "upgrade_items" ADD CONSTRAINT "upgrade_items_part_id_parts_inventory_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts_inventory"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "upgrade_orders" ADD CONSTRAINT "upgrade_orders_serial_id_serial_numbers_id_fk" FOREIGN KEY ("serial_id") REFERENCES "public"."serial_numbers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "upgrade_orders" ADD CONSTRAINT "upgrade_orders_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "upgrade_orders" ADD CONSTRAINT "upgrade_orders_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "upgrade_orders" ADD CONSTRAINT "upgrade_orders_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "upgrade_orders" ADD CONSTRAINT "upgrade_orders_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_dashboards" ADD CONSTRAINT "custom_dashboards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "report_executions" ADD CONSTRAINT "report_executions_report_id_saved_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."saved_reports"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "report_executions" ADD CONSTRAINT "report_executions_template_id_report_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."report_templates"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "report_executions" ADD CONSTRAINT "report_executions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "saved_reports" ADD CONSTRAINT "saved_reports_template_id_report_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."report_templates"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "saved_reports" ADD CONSTRAINT "saved_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ticket_categories" ADD CONSTRAINT "ticket_categories_default_assignee_users_id_fk" FOREIGN KEY ("default_assignee") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ticket_history" ADD CONSTRAINT "ticket_history_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ticket_history" ADD CONSTRAINT "ticket_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ticket_replies" ADD CONSTRAINT "ticket_replies_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ticket_replies" ADD CONSTRAINT "ticket_replies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tickets" ADD CONSTRAINT "tickets_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tickets" ADD CONSTRAINT "tickets_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tickets" ADD CONSTRAINT "tickets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quotation_activities" ADD CONSTRAINT "quotation_activities_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quotation_activities" ADD CONSTRAINT "quotation_activities_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quotation_templates" ADD CONSTRAINT "quotation_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quotations" ADD CONSTRAINT "quotations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quotations" ADD CONSTRAINT "quotations_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quotations" ADD CONSTRAINT "quotations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quotations" ADD CONSTRAINT "quotations_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_warranties" ADD CONSTRAINT "product_warranties_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_warranties" ADD CONSTRAINT "product_warranties_serial_number_id_serial_numbers_id_fk" FOREIGN KEY ("serial_number_id") REFERENCES "public"."serial_numbers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_warranties" ADD CONSTRAINT "product_warranties_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_warranties" ADD CONSTRAINT "product_warranties_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_warranties" ADD CONSTRAINT "product_warranties_policy_id_warranty_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."warranty_policies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_warranties" ADD CONSTRAINT "product_warranties_registered_by_users_id_fk" FOREIGN KEY ("registered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "warranty_activities" ADD CONSTRAINT "warranty_activities_warranty_id_product_warranties_id_fk" FOREIGN KEY ("warranty_id") REFERENCES "public"."product_warranties"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "warranty_activities" ADD CONSTRAINT "warranty_activities_claim_id_warranty_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."warranty_claims"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "warranty_activities" ADD CONSTRAINT "warranty_activities_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_warranty_id_product_warranties_id_fk" FOREIGN KEY ("warranty_id") REFERENCES "public"."product_warranties"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_repaired_by_users_id_fk" FOREIGN KEY ("repaired_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contract_activities" ADD CONSTRAINT "contract_activities_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contract_activities" ADD CONSTRAINT "contract_activities_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contract_invoices" ADD CONSTRAINT "contract_invoices_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contract_items" ADD CONSTRAINT "contract_items_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contract_items" ADD CONSTRAINT "contract_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contract_service_logs" ADD CONSTRAINT "contract_service_logs_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contract_service_logs" ADD CONSTRAINT "contract_service_logs_contract_service_id_contract_services_id_fk" FOREIGN KEY ("contract_service_id") REFERENCES "public"."contract_services"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contract_service_logs" ADD CONSTRAINT "contract_service_logs_technician_id_users_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contract_services" ADD CONSTRAINT "contract_services_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contracts" ADD CONSTRAINT "contracts_contract_type_id_contract_types_id_fk" FOREIGN KEY ("contract_type_id") REFERENCES "public"."contract_types"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contracts" ADD CONSTRAINT "contracts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contracts" ADD CONSTRAINT "contracts_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contracts" ADD CONSTRAINT "contracts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contracts" ADD CONSTRAINT "contracts_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contracts" ADD CONSTRAINT "contracts_account_manager_users_id_fk" FOREIGN KEY ("account_manager") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customer_loyalty_accounts" ADD CONSTRAINT "customer_loyalty_accounts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customer_loyalty_accounts" ADD CONSTRAINT "customer_loyalty_accounts_program_id_loyalty_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."loyalty_programs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customer_loyalty_accounts" ADD CONSTRAINT "customer_loyalty_accounts_tier_id_loyalty_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."loyalty_tiers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loyalty_bonus_rules" ADD CONSTRAINT "loyalty_bonus_rules_program_id_loyalty_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."loyalty_programs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loyalty_programs" ADD CONSTRAINT "loyalty_programs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loyalty_rewards" ADD CONSTRAINT "loyalty_rewards_program_id_loyalty_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."loyalty_programs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loyalty_rewards" ADD CONSTRAINT "loyalty_rewards_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loyalty_rewards" ADD CONSTRAINT "loyalty_rewards_min_tier_id_loyalty_tiers_id_fk" FOREIGN KEY ("min_tier_id") REFERENCES "public"."loyalty_tiers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loyalty_tiers" ADD CONSTRAINT "loyalty_tiers_program_id_loyalty_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."loyalty_programs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_account_id_customer_loyalty_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."customer_loyalty_accounts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_reward_id_loyalty_rewards_id_fk" FOREIGN KEY ("reward_id") REFERENCES "public"."loyalty_rewards"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_account_id_customer_loyalty_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."customer_loyalty_accounts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "task_activities" ADD CONSTRAINT "task_activities_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "task_activities" ADD CONSTRAINT "task_activities_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "task_checklists" ADD CONSTRAINT "task_checklists_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "task_checklists" ADD CONSTRAINT "task_checklists_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "task_reminders" ADD CONSTRAINT "task_reminders_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "task_reminders" ADD CONSTRAINT "task_reminders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_default_assign_to_users_id_fk" FOREIGN KEY ("default_assign_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_default_department_id_departments_id_fk" FOREIGN KEY ("default_department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "task_time_entries" ADD CONSTRAINT "task_time_entries_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "task_time_entries" ADD CONSTRAINT "task_time_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tasks" ADD CONSTRAINT "tasks_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reservation_activities" ADD CONSTRAINT "reservation_activities_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reservation_activities" ADD CONSTRAINT "reservation_activities_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reservation_items" ADD CONSTRAINT "reservation_items_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reservation_items" ADD CONSTRAINT "reservation_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reservation_settings" ADD CONSTRAINT "reservation_settings_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reservations" ADD CONSTRAINT "reservations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reservations" ADD CONSTRAINT "reservations_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reservations" ADD CONSTRAINT "reservations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reservations" ADD CONSTRAINT "reservations_confirmed_by_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "note_templates" ADD CONSTRAINT "note_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notes" ADD CONSTRAINT "notes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quick_notes" ADD CONSTRAINT "quick_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "blocked_times" ADD CONSTRAINT "blocked_times_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "blocked_times" ADD CONSTRAINT "blocked_times_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_activities" ADD CONSTRAINT "agent_activities_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_activities" ADD CONSTRAINT "agent_activities_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_contracts" ADD CONSTRAINT "agent_contracts_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_orders" ADD CONSTRAINT "agent_orders_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_sales" ADD CONSTRAINT "agent_sales_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agents" ADD CONSTRAINT "agents_linked_branch_id_branches_id_fk" FOREIGN KEY ("linked_branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agents" ADD CONSTRAINT "agents_account_manager_id_users_id_fk" FOREIGN KEY ("account_manager_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agents" ADD CONSTRAINT "agents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "review_reports" ADD CONSTRAINT "review_reports_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "review_reports" ADD CONSTRAINT "review_reports_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "review_requests" ADD CONSTRAINT "review_requests_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "review_requests" ADD CONSTRAINT "review_requests_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "review_votes" ADD CONSTRAINT "review_votes_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reviews" ADD CONSTRAINT "reviews_moderated_by_users_id_fk" FOREIGN KEY ("moderated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reviews" ADD CONSTRAINT "reviews_replied_by_users_id_fk" FOREIGN KEY ("replied_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscription_activities" ADD CONSTRAINT "subscription_activities_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscription_activities" ADD CONSTRAINT "subscription_activities_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscription_reminders" ADD CONSTRAINT "subscription_reminders_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "file_downloads" ADD CONSTRAINT "file_downloads_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "file_downloads" ADD CONSTRAINT "file_downloads_downloaded_by_users_id_fk" FOREIGN KEY ("downloaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "file_downloads" ADD CONSTRAINT "file_downloads_share_id_file_shares_id_fk" FOREIGN KEY ("share_id") REFERENCES "public"."file_shares"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "file_shares" ADD CONSTRAINT "file_shares_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "file_shares" ADD CONSTRAINT "file_shares_shared_with_user_id_users_id_fk" FOREIGN KEY ("shared_with_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "file_shares" ADD CONSTRAINT "file_shares_shared_by_users_id_fk" FOREIGN KEY ("shared_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "files" ADD CONSTRAINT "files_folder_id_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "folders" ADD CONSTRAINT "folders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "call_campaigns" ADD CONSTRAINT "call_campaigns_script_id_call_scripts_id_fk" FOREIGN KEY ("script_id") REFERENCES "public"."call_scripts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "call_campaigns" ADD CONSTRAINT "call_campaigns_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "call_scripts" ADD CONSTRAINT "call_scripts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "call_stats" ADD CONSTRAINT "call_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "calls" ADD CONSTRAINT "calls_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "calls" ADD CONSTRAINT "calls_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "calls" ADD CONSTRAINT "calls_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competitor_activities" ADD CONSTRAINT "competitor_activities_competitor_id_competitors_id_fk" FOREIGN KEY ("competitor_id") REFERENCES "public"."competitors"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competitor_activities" ADD CONSTRAINT "competitor_activities_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competitor_prices" ADD CONSTRAINT "competitor_prices_competitor_id_competitors_id_fk" FOREIGN KEY ("competitor_id") REFERENCES "public"."competitors"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competitor_prices" ADD CONSTRAINT "competitor_prices_product_id_competitor_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."competitor_products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competitor_prices" ADD CONSTRAINT "competitor_prices_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competitor_products" ADD CONSTRAINT "competitor_products_competitor_id_competitors_id_fk" FOREIGN KEY ("competitor_id") REFERENCES "public"."competitors"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competitors" ADD CONSTRAINT "competitors_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_comparisons" ADD CONSTRAINT "product_comparisons_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "goal_updates" ADD CONSTRAINT "goal_updates_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "goal_updates" ADD CONSTRAINT "goal_updates_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "goals" ADD CONSTRAINT "goals_kpi_id_kpis_id_fk" FOREIGN KEY ("kpi_id") REFERENCES "public"."kpis"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "goals" ADD CONSTRAINT "goals_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "goals" ADD CONSTRAINT "goals_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "goals" ADD CONSTRAINT "goals_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kpi_dashboards" ADD CONSTRAINT "kpi_dashboards_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kpi_values" ADD CONSTRAINT "kpi_values_kpi_id_kpis_id_fk" FOREIGN KEY ("kpi_id") REFERENCES "public"."kpis"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kpi_values" ADD CONSTRAINT "kpi_values_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kpi_values" ADD CONSTRAINT "kpi_values_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kpi_values" ADD CONSTRAINT "kpi_values_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kpis" ADD CONSTRAINT "kpis_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "archive_log" ADD CONSTRAINT "archive_log_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "archived_items" ADD CONSTRAINT "archived_items_archived_by_users_id_fk" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "backups" ADD CONSTRAINT "backups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "retention_policies" ADD CONSTRAINT "retention_policies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document_access" ADD CONSTRAINT "document_access_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document_access" ADD CONSTRAINT "document_access_folder_id_document_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."document_folders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document_access" ADD CONSTRAINT "document_access_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document_access" ADD CONSTRAINT "document_access_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document_access" ADD CONSTRAINT "document_access_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document_folders" ADD CONSTRAINT "document_folders_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document_folders" ADD CONSTRAINT "document_folders_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document_folders" ADD CONSTRAINT "document_folders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document_views" ADD CONSTRAINT "document_views_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document_views" ADD CONSTRAINT "document_views_viewer_id_users_id_fk" FOREIGN KEY ("viewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documents" ADD CONSTRAINT "documents_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documents" ADD CONSTRAINT "documents_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documents" ADD CONSTRAINT "documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documents" ADD CONSTRAINT "documents_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "signatures" ADD CONSTRAINT "signatures_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "signatures" ADD CONSTRAINT "signatures_signer_id_users_id_fk" FOREIGN KEY ("signer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conversations" ADD CONSTRAINT "conversations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "message_recipients" ADD CONSTRAINT "message_recipients_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "message_recipients" ADD CONSTRAINT "message_recipients_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "message_recipients" ADD CONSTRAINT "message_recipients_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "partner_activities" ADD CONSTRAINT "partner_activities_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "partner_activities" ADD CONSTRAINT "partner_activities_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "partner_agreements" ADD CONSTRAINT "partner_agreements_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "partner_agreements" ADD CONSTRAINT "partner_agreements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "partner_commissions" ADD CONSTRAINT "partner_commissions_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "partner_commissions" ADD CONSTRAINT "partner_commissions_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "partner_contacts" ADD CONSTRAINT "partner_contacts_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "partner_portal_users" ADD CONSTRAINT "partner_portal_users_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "partners" ADD CONSTRAINT "partners_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "partners" ADD CONSTRAINT "partners_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "certificates" ADD CONSTRAINT "certificates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "certificates" ADD CONSTRAINT "certificates_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "courses" ADD CONSTRAINT "courses_instructor_id_users_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "courses" ADD CONSTRAINT "courses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "development_plans" ADD CONSTRAINT "development_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "development_plans" ADD CONSTRAINT "development_plans_supervisor_id_users_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "development_plans" ADD CONSTRAINT "development_plans_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "skill_assessments" ADD CONSTRAINT "skill_assessments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "skill_assessments" ADD CONSTRAINT "skill_assessments_assessed_by_users_id_fk" FOREIGN KEY ("assessed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "training_enrollments" ADD CONSTRAINT "training_enrollments_session_id_training_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."training_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "training_enrollments" ADD CONSTRAINT "training_enrollments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_instructor_id_users_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "criteria_scores" ADD CONSTRAINT "criteria_scores_review_id_performance_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."performance_reviews"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "criteria_scores" ADD CONSTRAINT "criteria_scores_criteria_id_evaluation_criteria_id_fk" FOREIGN KEY ("criteria_id") REFERENCES "public"."evaluation_criteria"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "evaluation_criteria" ADD CONSTRAINT "evaluation_criteria_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "evaluation_cycles" ADD CONSTRAINT "evaluation_cycles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "performance_goals" ADD CONSTRAINT "performance_goals_cycle_id_evaluation_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."evaluation_cycles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "performance_goals" ADD CONSTRAINT "performance_goals_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "performance_goals" ADD CONSTRAINT "performance_goals_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "performance_notes" ADD CONSTRAINT "performance_notes_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "performance_notes" ADD CONSTRAINT "performance_notes_related_goal_id_performance_goals_id_fk" FOREIGN KEY ("related_goal_id") REFERENCES "public"."performance_goals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "performance_notes" ADD CONSTRAINT "performance_notes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_cycle_id_evaluation_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."evaluation_cycles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_risk_id_risks_id_fk" FOREIGN KEY ("risk_id") REFERENCES "public"."risks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_assessed_by_users_id_fk" FOREIGN KEY ("assessed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "risk_incidents" ADD CONSTRAINT "risk_incidents_risk_id_risks_id_fk" FOREIGN KEY ("risk_id") REFERENCES "public"."risks"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "risk_incidents" ADD CONSTRAINT "risk_incidents_reported_by_users_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "risk_incidents" ADD CONSTRAINT "risk_incidents_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "risk_register" ADD CONSTRAINT "risk_register_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "risk_register" ADD CONSTRAINT "risk_register_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "risk_register" ADD CONSTRAINT "risk_register_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "risk_register" ADD CONSTRAINT "risk_register_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "risk_treatments" ADD CONSTRAINT "risk_treatments_risk_id_risks_id_fk" FOREIGN KEY ("risk_id") REFERENCES "public"."risks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "risk_treatments" ADD CONSTRAINT "risk_treatments_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "risk_treatments" ADD CONSTRAINT "risk_treatments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "risks" ADD CONSTRAINT "risks_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "risks" ADD CONSTRAINT "risks_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "risks" ADD CONSTRAINT "risks_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "risks" ADD CONSTRAINT "risks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "corrective_actions" ADD CONSTRAINT "corrective_actions_non_conformance_id_non_conformances_id_fk" FOREIGN KEY ("non_conformance_id") REFERENCES "public"."non_conformances"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "corrective_actions" ADD CONSTRAINT "corrective_actions_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "corrective_actions" ADD CONSTRAINT "corrective_actions_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "corrective_actions" ADD CONSTRAINT "corrective_actions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "non_conformances" ADD CONSTRAINT "non_conformances_inspection_id_quality_inspections_id_fk" FOREIGN KEY ("inspection_id") REFERENCES "public"."quality_inspections"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "non_conformances" ADD CONSTRAINT "non_conformances_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "non_conformances" ADD CONSTRAINT "non_conformances_reported_by_users_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "non_conformances" ADD CONSTRAINT "non_conformances_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quality_audits" ADD CONSTRAINT "quality_audits_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quality_audits" ADD CONSTRAINT "quality_audits_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quality_audits" ADD CONSTRAINT "quality_audits_lead_auditor_id_users_id_fk" FOREIGN KEY ("lead_auditor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quality_audits" ADD CONSTRAINT "quality_audits_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quality_inspections" ADD CONSTRAINT "quality_inspections_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quality_inspections" ADD CONSTRAINT "quality_inspections_standard_id_quality_standards_id_fk" FOREIGN KEY ("standard_id") REFERENCES "public"."quality_standards"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quality_inspections" ADD CONSTRAINT "quality_inspections_inspector_id_users_id_fk" FOREIGN KEY ("inspector_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quality_standards" ADD CONSTRAINT "quality_standards_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quality_standards" ADD CONSTRAINT "quality_standards_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_metrics" ADD CONSTRAINT "custom_metrics_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_metrics" ADD CONSTRAINT "custom_metrics_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "dashboard_widgets_dashboard_id_dashboards_id_fk" FOREIGN KEY ("dashboard_id") REFERENCES "public"."dashboards"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dashboards" ADD CONSTRAINT "dashboards_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dashboards" ADD CONSTRAINT "dashboards_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dashboards" ADD CONSTRAINT "dashboards_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "metric_values" ADD CONSTRAINT "metric_values_metric_id_custom_metrics_id_fk" FOREIGN KEY ("metric_id") REFERENCES "public"."custom_metrics"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "metric_values" ADD CONSTRAINT "metric_values_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "metric_values" ADD CONSTRAINT "metric_values_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "report_logs" ADD CONSTRAINT "report_logs_scheduled_report_id_scheduled_reports_id_fk" FOREIGN KEY ("scheduled_report_id") REFERENCES "public"."scheduled_reports"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "report_logs" ADD CONSTRAINT "report_logs_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scheduled_reports" ADD CONSTRAINT "scheduled_reports_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "smart_alerts" ADD CONSTRAINT "smart_alerts_metric_id_custom_metrics_id_fk" FOREIGN KEY ("metric_id") REFERENCES "public"."custom_metrics"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "smart_alerts" ADD CONSTRAINT "smart_alerts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cash_advances" ADD CONSTRAINT "cash_advances_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cash_advances" ADD CONSTRAINT "cash_advances_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cash_advances" ADD CONSTRAINT "cash_advances_disbursed_by_users_id_fk" FOREIGN KEY ("disbursed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expense_approvals" ADD CONSTRAINT "expense_approvals_expense_id_expense_requests_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expense_requests"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expense_approvals" ADD CONSTRAINT "expense_approvals_approver_id_users_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expense_policies" ADD CONSTRAINT "expense_policies_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expense_policies" ADD CONSTRAINT "expense_policies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expense_reports" ADD CONSTRAINT "expense_reports_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expense_reports" ADD CONSTRAINT "expense_reports_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expense_reports" ADD CONSTRAINT "expense_reports_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expense_requests" ADD CONSTRAINT "expense_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expense_requests" ADD CONSTRAINT "expense_requests_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expense_requests" ADD CONSTRAINT "expense_requests_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expense_requests" ADD CONSTRAINT "expense_requests_current_approver_id_users_id_fk" FOREIGN KEY ("current_approver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "decision_follow_ups" ADD CONSTRAINT "decision_follow_ups_decision_id_meeting_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."meeting_decisions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "decision_follow_ups" ADD CONSTRAINT "decision_follow_ups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meeting_action_items" ADD CONSTRAINT "meeting_action_items_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meeting_action_items" ADD CONSTRAINT "meeting_action_items_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meeting_attendees" ADD CONSTRAINT "meeting_attendees_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meeting_attendees" ADD CONSTRAINT "meeting_attendees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meeting_decisions" ADD CONSTRAINT "meeting_decisions_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meeting_decisions" ADD CONSTRAINT "meeting_decisions_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meeting_rooms" ADD CONSTRAINT "meeting_rooms_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meetings" ADD CONSTRAINT "meetings_organizer_id_users_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meetings" ADD CONSTRAINT "meetings_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meetings" ADD CONSTRAINT "meetings_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meetings" ADD CONSTRAINT "meetings_minutes_approved_by_users_id_fk" FOREIGN KEY ("minutes_approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meetings" ADD CONSTRAINT "meetings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "room_bookings" ADD CONSTRAINT "room_bookings_room_id_meeting_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."meeting_rooms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "room_bookings" ADD CONSTRAINT "room_bookings_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "room_bookings" ADD CONSTRAINT "room_bookings_booked_by_users_id_fk" FOREIGN KEY ("booked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "drivers" ADD CONSTRAINT "drivers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "drivers" ADD CONSTRAINT "drivers_assigned_vehicle_id_vehicles_id_fk" FOREIGN KEY ("assigned_vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fuel_records" ADD CONSTRAINT "fuel_records_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fuel_records" ADD CONSTRAINT "fuel_records_filled_by_users_id_fk" FOREIGN KEY ("filled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "traffic_violations" ADD CONSTRAINT "traffic_violations_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "traffic_violations" ADD CONSTRAINT "traffic_violations_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "traffic_violations" ADD CONSTRAINT "traffic_violations_paid_by_users_id_fk" FOREIGN KEY ("paid_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vehicle_maintenance" ADD CONSTRAINT "vehicle_maintenance_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vehicle_requests" ADD CONSTRAINT "vehicle_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vehicle_requests" ADD CONSTRAINT "vehicle_requests_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vehicle_requests" ADD CONSTRAINT "vehicle_requests_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vehicle_requests" ADD CONSTRAINT "vehicle_requests_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vehicle_requests" ADD CONSTRAINT "vehicle_requests_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vehicle_tracking" ADD CONSTRAINT "vehicle_tracking_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "complaint_categories" ADD CONSTRAINT "complaint_categories_default_department_id_departments_id_fk" FOREIGN KEY ("default_department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "complaint_history" ADD CONSTRAINT "complaint_history_complaint_id_complaints_id_fk" FOREIGN KEY ("complaint_id") REFERENCES "public"."complaints"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "complaint_history" ADD CONSTRAINT "complaint_history_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "complaint_replies" ADD CONSTRAINT "complaint_replies_complaint_id_complaints_id_fk" FOREIGN KEY ("complaint_id") REFERENCES "public"."complaints"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "complaint_replies" ADD CONSTRAINT "complaint_replies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "complaints" ADD CONSTRAINT "complaints_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "complaints" ADD CONSTRAINT "complaints_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "complaints" ADD CONSTRAINT "complaints_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "complaints" ADD CONSTRAINT "complaints_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "complaints" ADD CONSTRAINT "complaints_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "complaints" ADD CONSTRAINT "complaints_escalated_to_users_id_fk" FOREIGN KEY ("escalated_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "complaints" ADD CONSTRAINT "complaints_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "satisfaction_surveys" ADD CONSTRAINT "satisfaction_surveys_complaint_id_complaints_id_fk" FOREIGN KEY ("complaint_id") REFERENCES "public"."complaints"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "satisfaction_surveys" ADD CONSTRAINT "satisfaction_surveys_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_implemented_by_users_id_fk" FOREIGN KEY ("implemented_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lease_contracts" ADD CONSTRAINT "lease_contracts_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lease_contracts" ADD CONSTRAINT "lease_contracts_unit_id_property_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."property_units"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lease_contracts" ADD CONSTRAINT "lease_contracts_tenant_id_customers_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lease_contracts" ADD CONSTRAINT "lease_contracts_signed_by_users_id_fk" FOREIGN KEY ("signed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lease_contracts" ADD CONSTRAINT "lease_contracts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "properties" ADD CONSTRAINT "properties_managed_by_users_id_fk" FOREIGN KEY ("managed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "properties" ADD CONSTRAINT "properties_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "property_inspections" ADD CONSTRAINT "property_inspections_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "property_inspections" ADD CONSTRAINT "property_inspections_unit_id_property_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."property_units"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "property_inspections" ADD CONSTRAINT "property_inspections_contract_id_lease_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."lease_contracts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "property_inspections" ADD CONSTRAINT "property_inspections_inspector_id_users_id_fk" FOREIGN KEY ("inspector_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "property_maintenance" ADD CONSTRAINT "property_maintenance_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "property_maintenance" ADD CONSTRAINT "property_maintenance_unit_id_property_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."property_units"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "property_maintenance" ADD CONSTRAINT "property_maintenance_reported_by_users_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "property_maintenance" ADD CONSTRAINT "property_maintenance_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "property_units" ADD CONSTRAINT "property_units_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "property_units" ADD CONSTRAINT "property_units_current_tenant_id_customers_id_fk" FOREIGN KEY ("current_tenant_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rent_payments" ADD CONSTRAINT "rent_payments_contract_id_lease_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."lease_contracts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "article_comments" ADD CONSTRAINT "article_comments_article_id_knowledge_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."knowledge_articles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "article_comments" ADD CONSTRAINT "article_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "article_ratings" ADD CONSTRAINT "article_ratings_article_id_knowledge_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."knowledge_articles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "article_ratings" ADD CONSTRAINT "article_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "article_versions" ADD CONSTRAINT "article_versions_article_id_knowledge_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."knowledge_articles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "article_versions" ADD CONSTRAINT "article_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "faqs" ADD CONSTRAINT "faqs_category_id_knowledge_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."knowledge_categories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "faqs" ADD CONSTRAINT "faqs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "knowledge_articles" ADD CONSTRAINT "knowledge_articles_category_id_knowledge_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."knowledge_categories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "knowledge_articles" ADD CONSTRAINT "knowledge_articles_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "knowledge_articles" ADD CONSTRAINT "knowledge_articles_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "knowledge_articles" ADD CONSTRAINT "knowledge_articles_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "knowledge_search_logs" ADD CONSTRAINT "knowledge_search_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "knowledge_search_logs" ADD CONSTRAINT "knowledge_search_logs_clicked_article_id_knowledge_articles_id_fk" FOREIGN KEY ("clicked_article_id") REFERENCES "public"."knowledge_articles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "related_articles" ADD CONSTRAINT "related_articles_article_id_knowledge_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."knowledge_articles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "related_articles" ADD CONSTRAINT "related_articles_related_article_id_knowledge_articles_id_fk" FOREIGN KEY ("related_article_id") REFERENCES "public"."knowledge_articles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_bookmarks" ADD CONSTRAINT "user_bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_bookmarks" ADD CONSTRAINT "user_bookmarks_article_id_knowledge_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."knowledge_articles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "event_expenses" ADD CONSTRAINT "event_expenses_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "event_expenses" ADD CONSTRAINT "event_expenses_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "event_expenses" ADD CONSTRAINT "event_expenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "event_feedback" ADD CONSTRAINT "event_feedback_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "event_feedback" ADD CONSTRAINT "event_feedback_registration_id_event_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."event_registrations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_checked_in_by_users_id_fk" FOREIGN KEY ("checked_in_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "event_sessions" ADD CONSTRAINT "event_sessions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "event_tasks" ADD CONSTRAINT "event_tasks_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "event_tasks" ADD CONSTRAINT "event_tasks_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_organizer_id_users_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "budget_actuals" ADD CONSTRAINT "budget_actuals_budget_id_budget_plans_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budget_plans"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "budget_actuals" ADD CONSTRAINT "budget_actuals_line_item_id_budget_line_items_id_fk" FOREIGN KEY ("line_item_id") REFERENCES "public"."budget_line_items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "budget_actuals" ADD CONSTRAINT "budget_actuals_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "budget_alerts" ADD CONSTRAINT "budget_alerts_budget_id_budget_plans_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budget_plans"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "budget_alerts" ADD CONSTRAINT "budget_alerts_line_item_id_budget_line_items_id_fk" FOREIGN KEY ("line_item_id") REFERENCES "public"."budget_line_items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "budget_alerts" ADD CONSTRAINT "budget_alerts_acknowledged_by_users_id_fk" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "budget_categories" ADD CONSTRAINT "budget_categories_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "budget_line_items" ADD CONSTRAINT "budget_line_items_budget_id_budget_plans_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budget_plans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "budget_line_items" ADD CONSTRAINT "budget_line_items_category_id_budget_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."budget_categories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "budget_line_items" ADD CONSTRAINT "budget_line_items_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "budget_plans" ADD CONSTRAINT "budget_plans_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "budget_plans" ADD CONSTRAINT "budget_plans_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "budget_plans" ADD CONSTRAINT "budget_plans_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "budget_plans" ADD CONSTRAINT "budget_plans_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "budget_reports" ADD CONSTRAINT "budget_reports_budget_id_budget_plans_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budget_plans"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "budget_reports" ADD CONSTRAINT "budget_reports_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "budget_requests" ADD CONSTRAINT "budget_requests_budget_id_budget_plans_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budget_plans"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "budget_requests" ADD CONSTRAINT "budget_requests_line_item_id_budget_line_items_id_fk" FOREIGN KEY ("line_item_id") REFERENCES "public"."budget_line_items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "budget_requests" ADD CONSTRAINT "budget_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "budget_requests" ADD CONSTRAINT "budget_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "budget_requests" ADD CONSTRAINT "budget_requests_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "budget_transfers" ADD CONSTRAINT "budget_transfers_from_budget_id_budget_plans_id_fk" FOREIGN KEY ("from_budget_id") REFERENCES "public"."budget_plans"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "budget_transfers" ADD CONSTRAINT "budget_transfers_from_line_item_id_budget_line_items_id_fk" FOREIGN KEY ("from_line_item_id") REFERENCES "public"."budget_line_items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "budget_transfers" ADD CONSTRAINT "budget_transfers_to_budget_id_budget_plans_id_fk" FOREIGN KEY ("to_budget_id") REFERENCES "public"."budget_plans"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "budget_transfers" ADD CONSTRAINT "budget_transfers_to_line_item_id_budget_line_items_id_fk" FOREIGN KEY ("to_line_item_id") REFERENCES "public"."budget_line_items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "budget_transfers" ADD CONSTRAINT "budget_transfers_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "budget_transfers" ADD CONSTRAINT "budget_transfers_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reception_settings" ADD CONSTRAINT "reception_settings_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recurring_visits" ADD CONSTRAINT "recurring_visits_host_id_users_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recurring_visits" ADD CONSTRAINT "recurring_visits_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recurring_visits" ADD CONSTRAINT "recurring_visits_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visit_logs" ADD CONSTRAINT "visit_logs_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visit_logs" ADD CONSTRAINT "visit_logs_member_id_visit_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."visit_members"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visit_logs" ADD CONSTRAINT "visit_logs_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visit_members" ADD CONSTRAINT "visit_members_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visitor_blacklist" ADD CONSTRAINT "visitor_blacklist_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visits" ADD CONSTRAINT "visits_host_id_users_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visits" ADD CONSTRAINT "visits_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visits" ADD CONSTRAINT "visits_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visits" ADD CONSTRAINT "visits_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visits" ADD CONSTRAINT "visits_escort_id_users_id_fk" FOREIGN KEY ("escort_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visits" ADD CONSTRAINT "visits_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bid_evaluations" ADD CONSTRAINT "bid_evaluations_bid_id_bids_id_fk" FOREIGN KEY ("bid_id") REFERENCES "public"."bids"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bid_evaluations" ADD CONSTRAINT "bid_evaluations_evaluator_id_users_id_fk" FOREIGN KEY ("evaluator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bids" ADD CONSTRAINT "bids_tender_id_tenders_id_fk" FOREIGN KEY ("tender_id") REFERENCES "public"."tenders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bids" ADD CONSTRAINT "bids_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bids" ADD CONSTRAINT "bids_evaluated_by_users_id_fk" FOREIGN KEY ("evaluated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tender_clarifications" ADD CONSTRAINT "tender_clarifications_tender_id_tenders_id_fk" FOREIGN KEY ("tender_id") REFERENCES "public"."tenders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tender_clarifications" ADD CONSTRAINT "tender_clarifications_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tender_clarifications" ADD CONSTRAINT "tender_clarifications_answered_by_users_id_fk" FOREIGN KEY ("answered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tender_committees" ADD CONSTRAINT "tender_committees_tender_id_tenders_id_fk" FOREIGN KEY ("tender_id") REFERENCES "public"."tenders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tender_committees" ADD CONSTRAINT "tender_committees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tender_committees" ADD CONSTRAINT "tender_committees_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tender_history" ADD CONSTRAINT "tender_history_tender_id_tenders_id_fk" FOREIGN KEY ("tender_id") REFERENCES "public"."tenders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tender_history" ADD CONSTRAINT "tender_history_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tender_templates" ADD CONSTRAINT "tender_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tenders" ADD CONSTRAINT "tenders_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tenders" ADD CONSTRAINT "tenders_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tenders" ADD CONSTRAINT "tenders_winner_id_suppliers_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tenders" ADD CONSTRAINT "tenders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "correspondence_comments" ADD CONSTRAINT "correspondence_comments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "correspondence_numbering" ADD CONSTRAINT "correspondence_numbering_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "correspondence_numbering" ADD CONSTRAINT "correspondence_numbering_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "correspondence_templates" ADD CONSTRAINT "correspondence_templates_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "correspondence_templates" ADD CONSTRAINT "correspondence_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "correspondence_tracking" ADD CONSTRAINT "correspondence_tracking_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "incoming_correspondence" ADD CONSTRAINT "incoming_correspondence_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "incoming_correspondence" ADD CONSTRAINT "incoming_correspondence_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "incoming_correspondence" ADD CONSTRAINT "incoming_correspondence_received_by_users_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "incoming_correspondence" ADD CONSTRAINT "incoming_correspondence_received_at_branch_id_branches_id_fk" FOREIGN KEY ("received_at_branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "incoming_correspondence" ADD CONSTRAINT "incoming_correspondence_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "incoming_correspondence" ADD CONSTRAINT "incoming_correspondence_assigned_department_id_departments_id_fk" FOREIGN KEY ("assigned_department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "incoming_correspondence" ADD CONSTRAINT "incoming_correspondence_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "incoming_correspondence" ADD CONSTRAINT "incoming_correspondence_archived_by_users_id_fk" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "incoming_correspondence" ADD CONSTRAINT "incoming_correspondence_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "outgoing_correspondence" ADD CONSTRAINT "outgoing_correspondence_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "outgoing_correspondence" ADD CONSTRAINT "outgoing_correspondence_sender_department_id_departments_id_fk" FOREIGN KEY ("sender_department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "outgoing_correspondence" ADD CONSTRAINT "outgoing_correspondence_sender_branch_id_branches_id_fk" FOREIGN KEY ("sender_branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "outgoing_correspondence" ADD CONSTRAINT "outgoing_correspondence_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "outgoing_correspondence" ADD CONSTRAINT "outgoing_correspondence_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "outgoing_correspondence" ADD CONSTRAINT "outgoing_correspondence_internal_recipient_id_users_id_fk" FOREIGN KEY ("internal_recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "outgoing_correspondence" ADD CONSTRAINT "outgoing_correspondence_internal_department_id_departments_id_fk" FOREIGN KEY ("internal_department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "outgoing_correspondence" ADD CONSTRAINT "outgoing_correspondence_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "outgoing_correspondence" ADD CONSTRAINT "outgoing_correspondence_signed_by_users_id_fk" FOREIGN KEY ("signed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "outgoing_correspondence" ADD CONSTRAINT "outgoing_correspondence_archived_by_users_id_fk" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "outgoing_correspondence" ADD CONSTRAINT "outgoing_correspondence_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "acknowledgment_requests" ADD CONSTRAINT "acknowledgment_requests_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "acknowledgment_requests" ADD CONSTRAINT "acknowledgment_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "acknowledgment_requests" ADD CONSTRAINT "acknowledgment_requests_target_department_id_departments_id_fk" FOREIGN KEY ("target_department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "acknowledgment_requests" ADD CONSTRAINT "acknowledgment_requests_target_branch_id_branches_id_fk" FOREIGN KEY ("target_branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "policies" ADD CONSTRAINT "policies_last_reviewed_by_users_id_fk" FOREIGN KEY ("last_reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "policies" ADD CONSTRAINT "policies_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "policies" ADD CONSTRAINT "policies_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "policies" ADD CONSTRAINT "policies_owner_department_id_departments_id_fk" FOREIGN KEY ("owner_department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "policies" ADD CONSTRAINT "policies_custodian_id_users_id_fk" FOREIGN KEY ("custodian_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "policies" ADD CONSTRAINT "policies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "policy_acknowledgments" ADD CONSTRAINT "policy_acknowledgments_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "policy_acknowledgments" ADD CONSTRAINT "policy_acknowledgments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "policy_change_requests" ADD CONSTRAINT "policy_change_requests_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "policy_change_requests" ADD CONSTRAINT "policy_change_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "policy_change_requests" ADD CONSTRAINT "policy_change_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "policy_faqs" ADD CONSTRAINT "policy_faqs_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "policy_faqs" ADD CONSTRAINT "policy_faqs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "policy_reviews" ADD CONSTRAINT "policy_reviews_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "policy_reviews" ADD CONSTRAINT "policy_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "policy_sections" ADD CONSTRAINT "policy_sections_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "policy_templates" ADD CONSTRAINT "policy_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "policy_violations" ADD CONSTRAINT "policy_violations_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "policy_violations" ADD CONSTRAINT "policy_violations_violator_id_users_id_fk" FOREIGN KEY ("violator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "policy_violations" ADD CONSTRAINT "policy_violations_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "policy_violations" ADD CONSTRAINT "policy_violations_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "policy_violations" ADD CONSTRAINT "policy_violations_reported_by_users_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "policy_violations" ADD CONSTRAINT "policy_violations_investigated_by_users_id_fk" FOREIGN KEY ("investigated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "license_alerts" ADD CONSTRAINT "license_alerts_license_id_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."licenses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "license_alerts" ADD CONSTRAINT "license_alerts_read_by_users_id_fk" FOREIGN KEY ("read_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "license_alerts" ADD CONSTRAINT "license_alerts_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "license_applications" ADD CONSTRAINT "license_applications_license_id_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."licenses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "license_applications" ADD CONSTRAINT "license_applications_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "license_applications" ADD CONSTRAINT "license_applications_applicant_id_users_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "license_applications" ADD CONSTRAINT "license_applications_applicant_department_id_departments_id_fk" FOREIGN KEY ("applicant_department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "license_applications" ADD CONSTRAINT "license_applications_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "license_applications" ADD CONSTRAINT "license_applications_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "license_compliance_checks" ADD CONSTRAINT "license_compliance_checks_license_id_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."licenses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "license_compliance_checks" ADD CONSTRAINT "license_compliance_checks_conducted_by_users_id_fk" FOREIGN KEY ("conducted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "license_history" ADD CONSTRAINT "license_history_license_id_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."licenses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "license_history" ADD CONSTRAINT "license_history_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "license_renewals" ADD CONSTRAINT "license_renewals_license_id_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."licenses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "license_renewals" ADD CONSTRAINT "license_renewals_application_id_license_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."license_applications"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "license_renewals" ADD CONSTRAINT "license_renewals_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "licenses" ADD CONSTRAINT "licenses_responsible_user_id_users_id_fk" FOREIGN KEY ("responsible_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "licenses" ADD CONSTRAINT "licenses_responsible_department_id_departments_id_fk" FOREIGN KEY ("responsible_department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "licenses" ADD CONSTRAINT "licenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "investment_alerts" ADD CONSTRAINT "investment_alerts_portfolio_id_investment_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."investment_portfolios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "investment_alerts" ADD CONSTRAINT "investment_alerts_investment_id_investments_id_fk" FOREIGN KEY ("investment_id") REFERENCES "public"."investments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "investment_alerts" ADD CONSTRAINT "investment_alerts_acknowledged_by_users_id_fk" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "investment_alerts" ADD CONSTRAINT "investment_alerts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "investment_goals" ADD CONSTRAINT "investment_goals_portfolio_id_investment_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."investment_portfolios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "investment_goals" ADD CONSTRAINT "investment_goals_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "investment_portfolios" ADD CONSTRAINT "investment_portfolios_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "investment_portfolios" ADD CONSTRAINT "investment_portfolios_owner_department_id_departments_id_fk" FOREIGN KEY ("owner_department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "investment_portfolios" ADD CONSTRAINT "investment_portfolios_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "investment_transactions" ADD CONSTRAINT "investment_transactions_portfolio_id_investment_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."investment_portfolios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "investment_transactions" ADD CONSTRAINT "investment_transactions_investment_id_investments_id_fk" FOREIGN KEY ("investment_id") REFERENCES "public"."investments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "investment_transactions" ADD CONSTRAINT "investment_transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "investments" ADD CONSTRAINT "investments_portfolio_id_investment_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."investment_portfolios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "investments" ADD CONSTRAINT "investments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "investment_performance_reports" ADD CONSTRAINT "investment_performance_reports_portfolio_id_investment_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."investment_portfolios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "investment_performance_reports" ADD CONSTRAINT "investment_performance_reports_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portfolio_valuations" ADD CONSTRAINT "portfolio_valuations_portfolio_id_investment_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."investment_portfolios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portfolio_valuations" ADD CONSTRAINT "portfolio_valuations_valued_by_users_id_fk" FOREIGN KEY ("valued_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_role_id_idx" ON "users" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_created_by_idx" ON "users" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_is_active_idx" ON "users" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_is_locked_idx" ON "users" USING btree ("is_locked");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_is_deleted_idx" ON "users" USING btree ("is_deleted");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_created_at_idx" ON "users" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_last_login_at_idx" ON "users" USING btree ("last_login_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "branches_is_active_idx" ON "branches" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "branches_created_at_idx" ON "branches" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "categories_parent_id_idx" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "categories_is_active_idx" ON "categories" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "categories_created_at_idx" ON "categories" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_category_id_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_created_by_idx" ON "products" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_is_active_idx" ON "products" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_is_archived_idx" ON "products" USING btree ("is_archived");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_is_deleted_idx" ON "products" USING btree ("is_deleted");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_created_at_idx" ON "products" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "warehouses_branch_id_idx" ON "warehouses" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "warehouses_is_active_idx" ON "warehouses" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "warehouses_type_idx" ON "warehouses" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "warehouses_created_at_idx" ON "warehouses" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "suppliers_is_active_idx" ON "suppliers" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "suppliers_is_deleted_idx" ON "suppliers" USING btree ("is_deleted");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "suppliers_created_at_idx" ON "suppliers" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customer_contacts_customer_id_idx" ON "customer_contacts" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customer_contacts_created_at_idx" ON "customer_contacts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customers_created_by_idx" ON "customers" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customers_is_active_idx" ON "customers" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customers_is_blocked_idx" ON "customers" USING btree ("is_blocked");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customers_is_deleted_idx" ON "customers" USING btree ("is_deleted");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customers_created_at_idx" ON "customers" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customers_last_purchase_at_idx" ON "customers" USING btree ("last_purchase_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_product_id_idx" ON "inventory" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_warehouse_id_idx" ON "inventory" USING btree ("warehouse_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_movements_product_id_idx" ON "inventory_movements" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_movements_warehouse_id_idx" ON "inventory_movements" USING btree ("warehouse_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_movements_movement_type_idx" ON "inventory_movements" USING btree ("movement_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_movements_reference_type_idx" ON "inventory_movements" USING btree ("reference_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_movements_reference_id_idx" ON "inventory_movements" USING btree ("reference_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_movements_created_at_idx" ON "inventory_movements" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "installment_schedules_invoice_id_idx" ON "installment_schedules" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "installment_schedules_paid_by_idx" ON "installment_schedules" USING btree ("paid_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "installment_schedules_status_idx" ON "installment_schedules" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "installment_schedules_paid_date_idx" ON "installment_schedules" USING btree ("paid_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoice_payments_invoice_id_idx" ON "invoice_payments" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoice_payments_received_by_idx" ON "invoice_payments" USING btree ("received_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoice_payments_received_at_idx" ON "invoice_payments" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_customer_id_idx" ON "invoices" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_supplier_id_idx" ON "invoices" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_branch_id_idx" ON "invoices" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_warehouse_id_idx" ON "invoices" USING btree ("warehouse_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_approved_by_idx" ON "invoices" USING btree ("approved_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_created_by_idx" ON "invoices" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_payment_status_idx" ON "invoices" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_status_idx" ON "invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_delivery_status_idx" ON "invoices" USING btree ("delivery_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_created_at_idx" ON "invoices" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_due_date_idx" ON "invoices" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_delivery_date_idx" ON "invoices" USING btree ("delivery_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_is_deleted_idx" ON "invoices" USING btree ("is_deleted");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "return_history_return_request_id_idx" ON "return_history" USING btree ("return_request_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "return_history_return_item_id_idx" ON "return_history" USING btree ("return_item_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "return_history_performed_by_idx" ON "return_history" USING btree ("performed_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "return_history_event_type_idx" ON "return_history" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "return_history_performed_at_idx" ON "return_history" USING btree ("performed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "return_items_return_request_id_idx" ON "return_items" USING btree ("return_request_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "return_items_product_id_idx" ON "return_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "return_items_serial_id_idx" ON "return_items" USING btree ("serial_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "return_items_item_status_idx" ON "return_items" USING btree ("item_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "return_items_return_reason_idx" ON "return_items" USING btree ("return_reason");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "return_items_created_at_idx" ON "return_items" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "return_message_templates_template_type_idx" ON "return_message_templates" USING btree ("template_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "return_message_templates_channel_idx" ON "return_message_templates" USING btree ("channel");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "return_message_templates_is_active_idx" ON "return_message_templates" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "return_requests_supplier_id_idx" ON "return_requests" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "return_requests_created_by_idx" ON "return_requests" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "return_requests_status_idx" ON "return_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "return_requests_return_type_idx" ON "return_requests" USING btree ("return_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "return_requests_color_code_idx" ON "return_requests" USING btree ("color_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "return_requests_created_at_idx" ON "return_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "return_requests_sent_at_idx" ON "return_requests" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "return_requests_received_at_idx" ON "return_requests" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "return_requests_resolved_at_idx" ON "return_requests" USING btree ("resolved_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "returns_customer_id_idx" ON "returns" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "returns_invoice_id_idx" ON "returns" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "returns_status_idx" ON "returns" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "returns_created_at_idx" ON "returns" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "returns_return_date_idx" ON "returns" USING btree ("return_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_batch_devices_batch_id_idx" ON "purchase_batch_devices" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_batch_devices_batch_item_id_idx" ON "purchase_batch_devices" USING btree ("batch_item_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_batch_devices_product_id_idx" ON "purchase_batch_devices" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_batch_devices_inspected_by_idx" ON "purchase_batch_devices" USING btree ("inspected_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_batch_devices_warehouse_id_idx" ON "purchase_batch_devices" USING btree ("warehouse_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_batch_devices_inspection_status_idx" ON "purchase_batch_devices" USING btree ("inspection_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_batch_devices_created_at_idx" ON "purchase_batch_devices" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_batch_devices_inspected_at_idx" ON "purchase_batch_devices" USING btree ("inspected_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_batch_items_batch_id_idx" ON "purchase_batch_items" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_batch_items_product_id_idx" ON "purchase_batch_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_batch_items_created_at_idx" ON "purchase_batch_items" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_batches_supplier_id_idx" ON "purchase_batches" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_batches_warehouse_id_idx" ON "purchase_batches" USING btree ("warehouse_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_batches_created_by_idx" ON "purchase_batches" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_batches_prices_added_by_idx" ON "purchase_batches" USING btree ("prices_added_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_batches_received_by_idx" ON "purchase_batches" USING btree ("received_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_batches_selling_prices_added_by_idx" ON "purchase_batches" USING btree ("selling_prices_added_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_batches_status_idx" ON "purchase_batches" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_batches_created_at_idx" ON "purchase_batches" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_batches_received_at_idx" ON "purchase_batches" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ticket_history_ticket_id_idx" ON "ticket_history" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ticket_history_changed_by_idx" ON "ticket_history" USING btree ("changed_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ticket_history_created_at_idx" ON "ticket_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ticket_replies_ticket_id_idx" ON "ticket_replies" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ticket_replies_created_by_idx" ON "ticket_replies" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ticket_replies_created_at_idx" ON "ticket_replies" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tickets_branch_id_idx" ON "tickets" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tickets_department_id_idx" ON "tickets" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tickets_created_by_idx" ON "tickets" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tickets_assigned_to_idx" ON "tickets" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tickets_status_idx" ON "tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tickets_priority_idx" ON "tickets" USING btree ("priority");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tickets_created_at_idx" ON "tickets" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tickets_due_date_idx" ON "tickets" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tickets_resolved_at_idx" ON "tickets" USING btree ("resolved_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quotation_activities_quotation_id_idx" ON "quotation_activities" USING btree ("quotation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quotation_activities_performed_by_idx" ON "quotation_activities" USING btree ("performed_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quotation_activities_activity_type_idx" ON "quotation_activities" USING btree ("activity_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quotation_activities_created_at_idx" ON "quotation_activities" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quotation_items_quotation_id_idx" ON "quotation_items" USING btree ("quotation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quotation_items_product_id_idx" ON "quotation_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quotation_items_created_at_idx" ON "quotation_items" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quotation_templates_created_by_idx" ON "quotation_templates" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quotation_templates_is_active_idx" ON "quotation_templates" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quotation_templates_is_default_idx" ON "quotation_templates" USING btree ("is_default");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quotations_customer_id_idx" ON "quotations" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quotations_branch_id_idx" ON "quotations" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quotations_created_by_idx" ON "quotations" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quotations_assigned_to_idx" ON "quotations" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quotations_status_idx" ON "quotations" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quotations_created_at_idx" ON "quotations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quotations_quotation_date_idx" ON "quotations" USING btree ("quotation_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quotations_valid_until_idx" ON "quotations" USING btree ("valid_until");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quotations_follow_up_date_idx" ON "quotations" USING btree ("follow_up_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quotations_converted_to_invoice_idx" ON "quotations" USING btree ("converted_to_invoice");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quotations_invoice_id_idx" ON "quotations" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_activities_task_id_idx" ON "task_activities" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_activities_performed_by_idx" ON "task_activities" USING btree ("performed_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_activities_created_at_idx" ON "task_activities" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_checklists_task_id_idx" ON "task_checklists" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_checklists_completed_by_idx" ON "task_checklists" USING btree ("completed_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_checklists_is_completed_idx" ON "task_checklists" USING btree ("is_completed");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_reminders_task_id_idx" ON "task_reminders" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_reminders_user_id_idx" ON "task_reminders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_reminders_reminder_at_idx" ON "task_reminders" USING btree ("reminder_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_reminders_is_sent_idx" ON "task_reminders" USING btree ("is_sent");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_templates_default_assign_to_idx" ON "task_templates" USING btree ("default_assign_to");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_templates_default_department_id_idx" ON "task_templates" USING btree ("default_department_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_templates_is_active_idx" ON "task_templates" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_templates_created_by_idx" ON "task_templates" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_time_entries_task_id_idx" ON "task_time_entries" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_time_entries_user_id_idx" ON "task_time_entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_time_entries_start_time_idx" ON "task_time_entries" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_assigned_to_idx" ON "tasks" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_assigned_by_idx" ON "tasks" USING btree ("assigned_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_department_id_idx" ON "tasks" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_created_by_idx" ON "tasks" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_status_idx" ON "tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_priority_idx" ON "tasks" USING btree ("priority");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_created_at_idx" ON "tasks" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_due_date_idx" ON "tasks" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_start_date_idx" ON "tasks" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_completed_at_idx" ON "tasks" USING btree ("completed_at");