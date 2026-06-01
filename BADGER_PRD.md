# BADGER - Personal Money Management Application

## Project Overview

Badger is a modern personal finance application designed to make money management approachable, engaging, and non-intimidating.

Most finance apps feel like accounting software. Badger should feel like a helpful companion that helps users understand their finances without requiring accounting knowledge.

The primary goal is not bookkeeping.

The primary goal is helping users make better financial decisions through clarity, guidance, automation, visualization, and conversational interaction.

The application will initially be used by a single user but must be architected to support multiple users.

---

# Technology Stack

## Frontend

* Next.js 15 App Router
* React
* TypeScript
* Tailwind CSS
* shadcn/ui
* TanStack Query
* Recharts

## Backend

* Next.js Server Actions
* Next.js Route Handlers

## Database

* Neon PostgreSQL

## ORM

* Prisma

## Authentication

* Clerk

## AI Integration

* OpenAI SDK abstraction layer
* Ability to swap providers later

## Deployment

* Vercel
* Neon

---

# Design Philosophy

The application should:

* Feel friendly
* Feel lightweight
* Avoid accounting terminology where possible
* Be mobile-first
* Have excellent desktop support
* Prioritize ease of data entry
* Require minimal clicks

The application should never feel like a spreadsheet.

---

# Core Concepts

## Actual Cost

Money actually paid.

Example:

Internet Bill

₹4000 paid today.

---

## Effective Monthly Cost

Cost distributed across coverage period.

Example:

Internet Bill

₹4000

Coverage:
6 months

Effective Monthly Cost:
₹667/month

All reports should support both Actual Cost and Effective Monthly Cost.

---

# User Management

## User

Fields:

* id
* email
* name
* avatar
* currency
* timezone
* createdAt
* updatedAt

---

# Expense System

## Expense Entity

Fields:

* id
* userId
* date
* amount
* categoryId
* importanceLevelId
* notes
* paymentMethod
* mood
* createdAt
* updatedAt

---

# Expense Categories

Default categories:

* Food
* Transport
* Fuel
* Rent
* Utilities
* Internet
* Phone
* Entertainment
* Shopping
* Health
* Gym
* Education
* Travel
* Investment
* Insurance
* Miscellaneous

User can create custom categories.

---

# Importance Levels

Each expense must have an importance level.

Values:

* Essential
* Useful
* Luxury
* Investment

Examples:

Protein Powder
Category: Food
Importance: Investment

Pizza
Category: Food
Importance: Luxury

Internet
Category: Utilities
Importance: Essential

---

# Calendar Expense View

Monthly calendar view.

Each day displays:

* Total spending
* Number of expenses

Clicking a day opens detailed entries.

User can create expenses directly from calendar cells.

---

# Recurring Expenses

Support:

* Daily
* Weekly
* Monthly
* Quarterly
* Yearly
* Custom

Automatic future generation.

---

# Distributed Expenses

Purpose:

Handle expenses covering multiple months.

Examples:

* Internet
* Insurance
* Annual Software Licenses
* Gym Membership

Fields:

* Original Amount
* Start Date
* Coverage Months

System calculates:

Monthly Effective Cost

Reports must support:

* Actual Spending
* Effective Spending

---

# Subscription Management

Track subscriptions separately.

Fields:

* Name
* Cost
* Frequency
* Renewal Date
* Category

Examples:

Netflix
Spotify
Prime
ChatGPT

Dashboard should calculate total monthly subscription burden.

---

# Loan Management

## Loan Entity

Fields:

* id
* userId
* name
* lender
* principalAmount
* interestRate
* tenureMonths
* startDate
* emiAmount
* remainingPrincipal
* nextDueDate
* status

---

# Loan Features

Track:

* Total Loan Amount
* Paid Amount
* Remaining Amount
* EMI Amount
* Remaining Tenure

Visual Progress Bar

Display:

* Percentage Completed
* Remaining Months
* Total Interest

---

# EMI Analysis

Dashboard should display:

Monthly EMI Burden

Formula:

Total EMI / Monthly Income

Classification:

Excellent: <20%
Good: 20-30%
Moderate: 30-40%
High: 40-50%
Risky: >50%

---

# Budget Planning

User enters:

Monthly Income

Planned Expenses

Each planned expense receives priority:

* Must Have
* Should Have
* Nice To Have

System generates:

* Safe Budget
* Aggressive Savings Budget
* Emergency Budget

---

# Budget Health Score

Calculate score from:

* Savings Rate
* Investment Rate
* Debt Burden
* Luxury Spending
* Essential Spending

Score range:

0-100

Display explanations.

Never shame users.

---

# Goals System

Examples:

Emergency Fund

Gaming PC

Vacation

Vehicle Purchase

Fields:

* Name
* Target Amount
* Current Amount
* Target Date

Visual Progress Bar

---

# Financial Commitments

Create unified commitment engine.

Supported types:

* Loan
* Subscription
* Distributed Expense
* Insurance
* Membership

Every commitment must expose:

* Monthly Impact
* Next Due Date
* Status

Dashboard should aggregate all commitments.

---

# Dashboard

Main dashboard widgets:

* Current Month Spending
* Effective Monthly Spending
* Remaining Budget
* Savings Rate
* Investment Rate
* Monthly Commitments
* Upcoming Payments
* Goal Progress
* Budget Health Score

---

# Monthly Review

Generate monthly summary.

Include:

* Spending Breakdown
* Top Categories
* Luxury Spending
* Investment Spending
* Spending Trend
* Budget Performance

---

# Spending Personality

Generate profile:

* Planner
* Saver
* Investor
* Impulsive Buyer
* Balanced

Based on spending history.

---

# Gamification

Badges:

* First Expense
* First Budget
* 30 Day Tracking
* Goal Achiever
* Debt Crusher

Levels:

* Rookie
* Explorer
* Builder
* Wealth Builder
* Master

Streaks:

* Consecutive Days Logged

---

# AI Assistant

Name:

Badger AI

Purpose:

Primary interaction layer.

---

# AI Capabilities

## Help Center

Answer questions about app features.

Examples:

How do I add a loan?

Where is subscription management?

Explain effective monthly cost.

---

## Deep Link Navigation

Every screen must register metadata.

Example:

Path

Title

Description

AI can generate direct links.

Example:

Open Loan Creation Page

Open Budget Planner

Open Expense Calendar

---

## Financial Insights

Examples:

Can I afford a PS5?

Am I spending too much on food?

How much am I saving monthly?

---

## Natural Language Entry

Examples:

Spent 500 on fuel today

Paid 4000 internet bill valid for 6 months

Add Netflix subscription 649 monthly

Create a 200000 loan at 10% for 3 years

AI should convert statements into structured forms.

---

## Search

Examples:

Show all food expenses

Show internet expenses

Show subscriptions

Show loans

---

## Action Execution

AI can:

* Create expenses
* Create subscriptions
* Create distributed expenses
* Create loans
* Create goals

User must confirm before save.

---

# Import Export

Supported formats:

JSON
CSV
Excel

Export must include:

* Expenses
* Categories
* Budgets
* Goals
* Loans
* Subscriptions
* Commitments

Import should restore all data.

---

# Security

Use server-side validation.

Never trust client input.

Use Prisma transactions.

Apply ownership checks on all data.

---

# Performance

Use:

* Pagination
* Lazy Loading
* Optimistic Updates
* React Query Caching

---

# Deliverables

Generate:

1. Complete folder structure
2. Prisma schema
3. Database migrations
4. TypeScript types
5. Authentication setup
6. API routes
7. Server actions
8. Dashboard
9. Calendar module
10. Expense tracking
11. Subscription management
12. Loan management
13. Budget planner
14. Goal tracking
15. AI assistant
16. Import/export
17. Mobile responsive UI
18. Seed data
19. Environment variable template
20. Deployment guide

Generate production-quality code.
Do not generate placeholders.
Do not skip files.
Generate complete implementation.
