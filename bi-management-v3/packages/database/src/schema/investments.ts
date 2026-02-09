/**
 * نظام إدارة المحافظ والاستثمارات
 * Investment Portfolio Management System
 */
import { pgTable, text, timestamp, boolean, integer, jsonb, decimal } from "drizzle-orm/pg-core";
import { users } from "./users";
import { departments } from "./hr";
import { accounts } from "./accounts";

// المحافظ الاستثمارية
export const investmentPortfolios = pgTable("investment_portfolios", {
  id: text("id").primaryKey(),
  portfolioNumber: text("portfolio_number").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  
  portfolioType: text("portfolio_type").default("mixed"), // stocks, bonds, real_estate, mixed, venture_capital, private_equity
  riskProfile: text("risk_profile").default("moderate"), // conservative, moderate, aggressive
  investmentStrategy: text("investment_strategy"), // growth, income, balanced, value
  
  // القيم
  initialValue: decimal("initial_value").notNull(),
  currentValue: decimal("current_value"),
  totalInvested: decimal("total_invested").default("0"),
  totalWithdrawn: decimal("total_withdrawn").default("0"),
  unrealizedGain: decimal("unrealized_gain").default("0"),
  realizedGain: decimal("realized_gain").default("0"),
  currency: text("currency").default("IQD"),
  
  // الهدف
  targetValue: decimal("target_value"),
  targetDate: timestamp("target_date"),
  targetReturnRate: decimal("target_return_rate"), // النسبة المئوية المستهدفة
  
  // الحالة
  status: text("status").default("active"), // active, closed, suspended, under_review
  
  // التخصيص
  allocationStrategy: jsonb("allocation_strategy").$type<{
    assetClass: string;
    targetPercentage: number;
    minPercentage?: number;
    maxPercentage?: number;
  }[]>(),
  
  // المدير والمالك
  managerId: text("manager_id").references(() => users.id),
  ownerDepartmentId: text("owner_department_id").references(() => departments.id),
  custodianAccount: text("custodian_account"),
  
  // التواريخ
  inceptionDate: timestamp("inception_date").notNull(),
  lastRebalanceDate: timestamp("last_rebalance_date"),
  nextRebalanceDate: timestamp("next_rebalance_date"),
  lastValuationDate: timestamp("last_valuation_date"),
  
  // الإعدادات
  autoRebalance: boolean("auto_rebalance").default(false),
  rebalanceThreshold: decimal("rebalance_threshold"), // نسبة الانحراف قبل إعادة التوازن
  
  notes: text("notes"),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// الاستثمارات الفردية
export const investments = pgTable("investments", {
  id: text("id").primaryKey(),
  investmentNumber: text("investment_number").notNull().unique(),
  portfolioId: text("portfolio_id").references(() => investmentPortfolios.id).notNull(),
  
  name: text("name").notNull(),
  description: text("description"),
  
  investmentType: text("investment_type").default("stock"), // stock, bond, mutual_fund, etf, real_estate, commodity, forex, crypto, private_equity, other
  assetClass: text("asset_class").default("equity"), // equity, fixed_income, cash, real_estate, commodity, alternative
  
  // تفاصيل الأصل
  ticker: text("ticker"), // رمز التداول
  exchange: text("exchange"), // البورصة
  isin: text("isin"), // رقم التعريف الدولي
  sector: text("sector"), // القطاع
  country: text("country"), // البلد
  
  // الكمية والسعر
  quantity: decimal("quantity").notNull(),
  purchasePrice: decimal("purchase_price").notNull(),
  currentPrice: decimal("current_price"),
  currency: text("currency").default("IQD"),
  
  // القيم المحسوبة
  purchaseValue: decimal("purchase_value").notNull(), // quantity * purchasePrice
  currentValue: decimal("current_value"),
  unrealizedGain: decimal("unrealized_gain"),
  unrealizedGainPercent: decimal("unrealized_gain_percent"),
  
  // التواريخ
  purchaseDate: timestamp("purchase_date").notNull(),
  settlementDate: timestamp("settlement_date"),
  maturityDate: timestamp("maturity_date"), // للسندات
  
  // الحالة
  status: text("status").default("active"), // active, sold, matured, written_off
  
  // العوائد
  dividendYield: decimal("dividend_yield"),
  couponRate: decimal("coupon_rate"), // للسندات
  lastDividendDate: timestamp("last_dividend_date"),
  nextDividendDate: timestamp("next_dividend_date"),
  totalDividendsReceived: decimal("total_dividends_received").default("0"),
  
  // الوسيط والرسوم
  brokerId: text("broker_id"),
  brokerName: text("broker_name"),
  commission: decimal("commission"),
  fees: decimal("fees"),
  
  notes: text("notes"),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// المعاملات الاستثمارية
export const investmentTransactions = pgTable("investment_transactions", {
  id: text("id").primaryKey(),
  transactionNumber: text("transaction_number").notNull().unique(),
  portfolioId: text("portfolio_id").references(() => investmentPortfolios.id).notNull(),
  investmentId: text("investment_id").references(() => investments.id),
  
  transactionType: text("transaction_type").notNull(), // buy, sell, dividend, interest, deposit, withdrawal, transfer_in, transfer_out, fee, adjustment
  
  // التفاصيل
  quantity: decimal("quantity"),
  price: decimal("price"),
  amount: decimal("amount").notNull(),
  currency: text("currency").default("IQD"),
  
  // للبيع
  realizedGain: decimal("realized_gain"),
  costBasis: decimal("cost_basis"),
  
  // الرسوم
  commission: decimal("commission"),
  fees: decimal("fees"),
  tax: decimal("tax"),
  netAmount: decimal("net_amount"),
  
  // التواريخ
  transactionDate: timestamp("transaction_date").notNull(),
  settlementDate: timestamp("settlement_date"),
  
  // الحالة
  status: text("status").default("completed"), // pending, completed, cancelled, failed
  
  // المرجع
  referenceNumber: text("reference_number"),
  brokerConfirmation: text("broker_confirmation"),
  
  notes: text("notes"),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// تقييم المحافظ
export const portfolioValuations = pgTable("portfolio_valuations", {
  id: text("id").primaryKey(),
  portfolioId: text("portfolio_id").references(() => investmentPortfolios.id).notNull(),
  valuationDate: timestamp("valuation_date").notNull(),
  
  totalValue: decimal("total_value").notNull(),
  totalCost: decimal("total_cost"),
  unrealizedGain: decimal("unrealized_gain"),
  realizedGainYTD: decimal("realized_gain_ytd"),
  dividendsYTD: decimal("dividends_ytd"),
  
  // التخصيص الفعلي
  actualAllocation: jsonb("actual_allocation").$type<{
    assetClass: string;
    value: number;
    percentage: number;
  }[]>(),
  
  // الأداء
  dailyReturn: decimal("daily_return"),
  weeklyReturn: decimal("weekly_return"),
  monthlyReturn: decimal("monthly_return"),
  yearlyReturn: decimal("yearly_return"),
  totalReturn: decimal("total_return"),
  
  // المقارنة
  benchmarkReturn: decimal("benchmark_return"),
  alphaReturn: decimal("alpha_return"),
  
  valuedBy: text("valued_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// أهداف الاستثمار
export const investmentGoals = pgTable("investment_goals", {
  id: text("id").primaryKey(),
  portfolioId: text("portfolio_id").references(() => investmentPortfolios.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  
  goalType: text("goal_type").default("accumulation"), // accumulation, income, preservation, growth
  targetAmount: decimal("target_amount").notNull(),
  currentAmount: decimal("current_amount").default("0"),
  currency: text("currency").default("IQD"),
  
  targetDate: timestamp("target_date"),
  startDate: timestamp("start_date").notNull(),
  
  // المساهمات
  monthlyContribution: decimal("monthly_contribution"),
  contributionFrequency: text("contribution_frequency").default("monthly"), // weekly, monthly, quarterly, annually
  
  // الحالة
  status: text("status").default("active"), // active, achieved, cancelled, on_track, behind
  progressPercentage: decimal("progress_percentage"),
  
  priority: text("priority").default("medium"),
  
  notes: text("notes"),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// تقارير الأداء
export const performanceReports = pgTable("investment_performance_reports", {
  id: text("id").primaryKey(),
  portfolioId: text("portfolio_id").references(() => investmentPortfolios.id).notNull(),
  reportType: text("report_type").default("monthly"), // daily, weekly, monthly, quarterly, annual
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  
  // القيم
  openingValue: decimal("opening_value"),
  closingValue: decimal("closing_value"),
  netContributions: decimal("net_contributions"),
  
  // الأداء
  absoluteReturn: decimal("absolute_return"),
  percentageReturn: decimal("percentage_return"),
  timeWeightedReturn: decimal("time_weighted_return"),
  moneyWeightedReturn: decimal("money_weighted_return"),
  
  // المقارنة
  benchmarkName: text("benchmark_name"),
  benchmarkReturn: decimal("benchmark_return"),
  excessReturn: decimal("excess_return"),
  
  // المخاطر
  volatility: decimal("volatility"),
  sharpeRatio: decimal("sharpe_ratio"),
  maxDrawdown: decimal("max_drawdown"),
  
  // أفضل وأسوأ
  bestPerformer: text("best_performer"),
  bestPerformerReturn: decimal("best_performer_return"),
  worstPerformer: text("worst_performer"),
  worstPerformerReturn: decimal("worst_performer_return"),
  
  summary: text("summary"),
  
  generatedBy: text("generated_by").references(() => users.id),
  generatedAt: timestamp("generated_at").defaultNow(),
});

// تنبيهات الاستثمار
export const investmentAlerts = pgTable("investment_alerts", {
  id: text("id").primaryKey(),
  portfolioId: text("portfolio_id").references(() => investmentPortfolios.id),
  investmentId: text("investment_id").references(() => investments.id),
  
  alertType: text("alert_type").notNull(), // price_target, stop_loss, rebalance, dividend, maturity, goal_progress, risk_threshold
  
  // الشروط
  triggerCondition: text("trigger_condition"), // above, below, equals, deviation
  triggerValue: decimal("trigger_value"),
  currentValue: decimal("current_value"),
  
  message: text("message"),
  severity: text("severity").default("medium"),
  
  isTriggered: boolean("is_triggered").default(false),
  triggeredAt: timestamp("triggered_at"),
  
  isAcknowledged: boolean("is_acknowledged").default(false),
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgedBy: text("acknowledged_by").references(() => users.id),
  
  isActive: boolean("is_active").default(true),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});
