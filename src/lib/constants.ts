
/**
 * @fileOverview Centralized constants for the RSU EOMS Framework.
 * Moving these here prevents circular dependencies between Pages and Components.
 */

export const TOTAL_REPORTS_PER_CYCLE = 6;
export const TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT = TOTAL_REPORTS_PER_CYCLE * 2; 

export const submissionTypes = [
  'SWOT Analysis',
  'Needs and Expectation of Interested Parties',
  'Operational Plan',
  'Quality Objectives Monitoring',
  'Risk and Opportunity Registry',
  'Risk and Opportunity Action Plan'
];
