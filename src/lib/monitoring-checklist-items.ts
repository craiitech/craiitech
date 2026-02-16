
/**
 * Structured groupings for the Unit Monitoring Verification Checklist.
 * This organization helps monitors navigate the on-site visit more efficiently.
 */
export const monitoringGroups = [
  {
    category: "Core EOMS Documentation",
    items: [
      "Operational Plan",
      "Objectives Monitoring",
      "Risk and Opportunity Registry",
      "Risk and Opportunity Action Plan",
      "SWOT Analysis",
      "Needs and Expectation of Interested Parties",
      "Procedure Manual",
      "MR Report on File",
      "IQA / EQA Report on File",
      "CSM Report on File",
      "Forms Utilized by Units",
      "CSW Attachment / Evidences as per Process"
    ]
  },
  {
    category: "Official Postings & Transparency",
    items: [
      "ARTA Signages",
      "Mission/ Vision / Core Values / Quality Policy",
      "Citizen Charter",
      "DPO Seal",
      "Updated Organizational Structure",
      "Emergency Evacuation Posting",
      "Entrance / Exit Signages",
      "Warning Signs and Labels"
    ]
  },
  {
    category: "Logbooks & Compliance Records",
    items: [
      "Incoming Communication Logbook",
      "Outgoing Communication Logbook",
      "Visitor Logbook",
      "CSM DropBox / Online Platform",
      "CSC ID's of Employees"
    ]
  },
  {
    category: "Facilities, Maintenance & Safety",
    items: [
      "7S (Inside & Out)",
      "Document Control Center",
      "Fire Extinguisher (With Labels)",
      "Fire Exit Stairs Free from Obstructions",
      "Medicine Cabinet",
      "Clean Tables of Employees",
      "Files Documents Based on Pocess",
      "Certificate of Occupancy",
      "Sockets",
      "Switches",
      "Electric Fans",
      "Aircons",
      "Student chairs"
    ]
  }
];

/**
 * A flat array version of all checklist items for initial form state and legacy compatibility.
 */
export const monitoringChecklistItems = monitoringGroups.flatMap(group => group.items);
