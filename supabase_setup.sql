-- Supabase Schema for V.V. Decorators CRM
-- Run this in your Supabase SQL Editor to initialize the database

CREATE TABLE IF NOT EXISTS bookings (
  id text PRIMARY KEY,
  "clientName" text NOT NULL,
  
  "eventType" text,
  "eventDate" text,
  "eventEndDate" text,
  "daysOverview" jsonb,
  
  "timingCategory" text,
  "startTime" text,
  "endTime" text,
  "customTiming" text,
  
  venue text,
  "primaryPhone" text,
  "alternativePhone" text,
  "guestCount" integer,
  
  "perPlateCost" numeric,
  "totalEventValue" numeric,
  "overrideTotalAmount" numeric,
  "multiDayExtraCharges" numeric,
  "advancePaid" numeric,
  "paymentMode" text,
  "chequeNumber" text,
  "balanceAmount" numeric,
  
  status text,
  "menuItems" jsonb,
  "mealMenus" jsonb,
  "dayMeals" jsonb,
  "multiDayPricing" jsonb,
  "invoiceType" text,
  notes text,
  "invoiceDescription" text,
  
  "roomsRequired" integer,
  "roomCost" numeric,
  "swimmingPool" boolean,
  "additionalServices" jsonb,
  
  "createdAt" text,
  "updatedAt" text,
  "trashedAt" text
);

-- Turn on RLS and create an open policy for the Anon Key to manage CRUD operations
-- In production, consider gating this behind actual auth rules.
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all ops for anon" 
ON bookings 
FOR ALL 
TO anon 
USING (true) 
WITH CHECK (true);
